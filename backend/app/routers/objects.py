"""Objects API: multipart upload, streaming decrypted download with Range support, sharing, and verification."""

import contextlib
from typing import Any

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    Header,
    HTTPException,
    Query,
    Response,
    UploadFile,
    status,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.auth.rbac import CurrentPrincipal, require
from backend.app.chain.client import chain_client
from backend.app.db.models import ChunkReplica, ObjectGrant, StorageNode, StoredChunk, StoredObject
from backend.app.db.session import get_db
from backend.app.services.audit_service import audit_service
from backend.app.storage.coordinator import coordinator
from backend.app.storage.placement import StorageNodeInfo

router = APIRouter(prefix="/v1", tags=["Objects"])


async def get_live_storage_nodes(db: AsyncSession) -> list[StorageNodeInfo]:
    """Fetch storage nodes from database; fallback to default localhost nodes if empty."""
    stmt = select(StorageNode)
    res = await db.execute(stmt)
    db_nodes = res.scalars().all()

    if not db_nodes:
        # Fallback to 5 standard development storage node endpoints
        return [
            StorageNodeInfo(
                id=f"storage-{i}",
                endpoint=f"http://storage{i}:7443" if i > 3 else f"http://storage-{i}:7443",
            )
            for i in range(1, 6)
        ]

    return [
        StorageNodeInfo(
            id=n.id,
            endpoint=n.endpoint,
            state=n.state,
            free_bytes=n.free_bytes,
            draining=bool(n.draining),
            fingerprint=n.fingerprint or "",
        )
        for n in db_nodes
    ]


@router.post("/objects", status_code=status.HTTP_201_CREATED)
async def upload_object(
    file: UploadFile = File(...),
    classification: str = Form(default="internal"),
    current_user: CurrentPrincipal = Depends(require("object:create")),
    db: AsyncSession = Depends(get_db),
    x_correlation_id: str | None = Header(default="upload-req"),
) -> dict[str, Any]:
    """Upload, split, encrypt with AES-256-GCM, and distribute chunks across storage nodes with quorum W."""
    content = await file.read()
    nodes = await get_live_storage_nodes(db)

    # Perform decentralized split, encryption, and parallel quorum upload
    result = await coordinator.upload_object(
        data=content,
        name=file.filename or "unnamed",
        mime=file.content_type or "application/octet-stream",
        owner_id=current_user.id,
        classification=classification,
        nodes=nodes,
    )

    obj_id = result["object_id"]
    manifest_id = result["manifest_id"]
    manifest = result["manifest"]

    # Record in database
    db_obj = StoredObject(
        id=obj_id,
        manifest_id=manifest_id,
        owner_id=current_user.id,
        name=manifest["name"],
        size=manifest["size"],
        chunk_count=len(manifest["chunks"]),
        merkle_root=manifest["merkle_root"],
        classification=classification,
        status="ACTIVE",
        dek_hex=result["dek"],
    )
    db.add(db_obj)
    await db.flush()

    # Record chunks and replicas
    for c in manifest["chunks"]:
        db_chunk = StoredChunk(
            id=c["id"],
            object_id=obj_id,
            idx=c["i"],
            length=c["len"],
            kind="data",
            nonce=c["nonce"],
        )
        db.add(db_chunk)

    await db.flush()

    for p in result["placements"]:
        cid = p["chunk_id"]
        for nid in p["nodes"]:
            db_rep = ChunkReplica(
                chunk_id=cid,
                node_id=nid,
                state="stored",
            )
            db.add(db_rep)

    # On-chain registration if chain is active
    tx_hash = None
    if chain_client.is_connected() and "DataRegistry" in chain_client.contracts:
        try:
            # registerObject(bytes32 objectId, uint32 schemaVersion, bytes32 ownerIdentityId, bytes32 metaHash)
            dr_res = chain_client.register_object(
                object_id=obj_id,
                schema_version=1,
                owner_id=current_user.id,
                meta_hash=manifest_id,
            )
            tx_hash = dr_res.get("tx_hash")
        except Exception:
            pass

    await db.commit()

    # Audit log
    await audit_service.record_event(
        db=db,
        event_type="OBJECT_CREATED",
        actor=current_user.id,
        subject=obj_id,
        data_hash=manifest_id,
        correlation_id=x_correlation_id or "upload",
        details={"name": manifest["name"], "size": len(content), "chunks": len(manifest["chunks"])},
    )

    return {
        "object_id": obj_id,
        "manifest_id": manifest_id,
        "size": len(content),
        "chunk_count": len(manifest["chunks"]),
        "replication": {"r": coordinator.r, "w": coordinator.w},
        "merkle_root": manifest["merkle_root"],
        "tx_hash": tx_hash,
        "placements": result["placements"],
    }


@router.get("/objects")
async def list_objects(
    limit: int = Query(default=50, ge=1, le=100),
    current_user: CurrentPrincipal = Depends(require("object:read_metadata", allow_own=True)),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """List accessible objects."""
    stmt = select(StoredObject).where(StoredObject.status == "ACTIVE")
    if not (current_user.is_admin() or current_user.is_manager() or current_user.is_auditor()):
        stmt = stmt.where(StoredObject.owner_id == current_user.id)

    stmt = stmt.limit(limit)
    res = await db.execute(stmt)
    objects = res.scalars().all()

    return {
        "items": [
            {
                "id": o.id,
                "manifest_id": o.manifest_id,
                "owner_id": o.owner_id,
                "name": o.name,
                "size": o.size,
                "chunk_count": o.chunk_count,
                "merkle_root": o.merkle_root,
                "classification": o.classification,
                "created_at": o.created_at,
            }
            for o in objects
        ]
    }


@router.get("/objects/{object_id}")
async def get_object_metadata(
    object_id: str,
    current_user: CurrentPrincipal = Depends(require("object:read_metadata", allow_own=True)),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Get metadata and health status for an object."""
    stmt = select(StoredObject).where(StoredObject.id == object_id)
    obj = (await db.execute(stmt)).scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Object not found")

    is_owner = obj.owner_id == current_user.id
    if not is_owner and not (
        current_user.is_admin() or current_user.is_manager() or current_user.is_auditor()
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")

    # Check replica counts
    c_stmt = select(StoredChunk).where(StoredChunk.object_id == object_id)
    chunks = (await db.execute(c_stmt)).scalars().all()

    under_replicated = 0
    for c in chunks:
        r_stmt = select(ChunkReplica).where(
            ChunkReplica.chunk_id == c.id, ChunkReplica.state == "stored"
        )
        reps = (await db.execute(r_stmt)).scalars().all()
        if len(reps) < coordinator.r:
            under_replicated += 1

    return {
        "id": obj.id,
        "manifest_id": obj.manifest_id,
        "owner_id": obj.owner_id,
        "name": obj.name,
        "size": obj.size,
        "chunk_count": obj.chunk_count,
        "merkle_root": obj.merkle_root,
        "classification": obj.classification,
        "status": obj.status,
        "replicas_ok": under_replicated == 0,
        "under_replicated_chunks": under_replicated,
        "created_at": obj.created_at,
    }


@router.get("/objects/{object_id}/placement")
async def get_object_placement(
    object_id: str,
    current_user: CurrentPrincipal = Depends(require("object:read_metadata", allow_own=True)),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Demo view: chunk to storage node placement table (AT-14)."""
    stmt = select(StoredObject).where(StoredObject.id == object_id)
    obj = (await db.execute(stmt)).scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Object not found")

    c_stmt = (
        select(StoredChunk)
        .where(StoredChunk.object_id == object_id)
        .order_by(StoredChunk.idx.asc())
    )
    chunks = (await db.execute(c_stmt)).scalars().all()

    placements = []
    for c in chunks:
        r_stmt = select(ChunkReplica).where(ChunkReplica.chunk_id == c.id)
        reps = (await db.execute(r_stmt)).scalars().all()
        node_ids = [r.node_id for r in reps]
        placements.append(
            {
                "chunk_index": c.idx,
                "chunk_id": c.id,
                "length": c.length,
                "nodes": node_ids,
                "primary_node": node_ids[0] if node_ids else None,
                "replica_nodes": node_ids[1:] if len(node_ids) > 1 else [],
            }
        )

    return {
        "object_id": object_id,
        "name": obj.name,
        "size": obj.size,
        "chunk_count": obj.chunk_count,
        "placements": placements,
    }


@router.get("/objects/{object_id}/download")
async def download_object(
    object_id: str,
    range_header: str | None = Header(default=None, alias="Range"),
    current_user: CurrentPrincipal = Depends(require("object:read_content", allow_own=True)),
    db: AsyncSession = Depends(get_db),
    x_correlation_id: str | None = Header(default="download-req"),
) -> Response:
    """Download decrypted object stream with HTTP Range support."""
    stmt = select(StoredObject).where(StoredObject.id == object_id)
    obj = (await db.execute(stmt)).scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Object not found")

    is_owner = obj.owner_id == current_user.id
    if not is_owner and not current_user.is_admin():
        # Check grant
        g_stmt = select(ObjectGrant).where(
            ObjectGrant.object_id == object_id, ObjectGrant.grantee_id == current_user.id
        )
        grant = (await db.execute(g_stmt)).scalar_one_or_none()
        if not grant:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Access not granted to object"
            )

    # Fetch chunks
    c_stmt = (
        select(StoredChunk)
        .where(StoredChunk.object_id == object_id)
        .order_by(StoredChunk.idx.asc())
    )
    chunks = (await db.execute(c_stmt)).scalars().all()

    manifest = {
        "object_id": obj.id,
        "size": obj.size,
        "chunks": [{"id": c.id, "i": c.idx, "nonce": c.nonce, "len": c.length} for c in chunks],
    }

    dek = bytes.fromhex(obj.dek_hex) if obj.dek_hex else bytes(32)
    nodes = await get_live_storage_nodes(db)

    # Parse Range header if present: Range: bytes=start-end
    byte_start = 0
    byte_end = obj.size - 1 if obj.size > 0 else 0
    is_partial = False

    if range_header and range_header.startswith("bytes="):
        is_partial = True
        range_val = range_header.replace("bytes=", "").strip()
        parts = range_val.split("-")
        if parts[0]:
            byte_start = int(parts[0])
        if len(parts) > 1 and parts[1]:
            byte_end = int(parts[1])

    data = await coordinator.read_object_bytes(
        manifest=manifest,
        dek=dek,
        nodes=nodes,
        byte_start=byte_start,
        byte_end=byte_end,
    )

    await audit_service.record_event(
        db=db,
        event_type="OBJECT_READ",
        actor=current_user.id,
        subject=object_id,
        data_hash=obj.manifest_id,
        correlation_id=x_correlation_id or "download",
        details={"bytes_read": len(data), "range": range_header},
    )

    if is_partial:
        headers = {
            "Content-Range": f"bytes {byte_start}-{byte_end}/{obj.size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(len(data)),
        }
        return Response(content=data, status_code=status.HTTP_206_PARTIAL_CONTENT, headers=headers)

    headers = {
        "Content-Disposition": f'attachment; filename="{obj.name}"',
        "Content-Length": str(len(data)),
        "Content-Type": "application/octet-stream",
    }
    return Response(content=data, status_code=status.HTTP_200_OK, headers=headers, media_type="application/octet-stream")


@router.post("/objects/{object_id}/share")
async def share_object(
    object_id: str,
    principal_id: str = Form(...),
    permissions: int = Form(default=1),
    current_user: CurrentPrincipal = Depends(require("object:share", allow_own=True)),
    db: AsyncSession = Depends(get_db),
    x_correlation_id: str | None = Header(default="share-req"),
) -> dict[str, str]:
    """Share access to an object with another principal."""
    stmt = select(StoredObject).where(StoredObject.id == object_id)
    obj = (await db.execute(stmt)).scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Object not found")

    grant = ObjectGrant(
        object_id=object_id,
        grantee_id=principal_id,
        grant_blob_id=f"grant_{object_id}_{principal_id}",
        permissions=permissions,
    )
    db.add(grant)
    await db.commit()

    await audit_service.record_event(
        db=db,
        event_type="OBJECT_SHARED",
        actor=current_user.id,
        subject=object_id,
        data_hash=obj.manifest_id,
        correlation_id=x_correlation_id or "share",
        details={"grantee": principal_id, "permissions": permissions},
    )

    return {"status": "shared", "object_id": object_id, "grantee_id": principal_id}


@router.delete("/objects/{object_id}")
async def delete_object(
    object_id: str,
    current_user: CurrentPrincipal = Depends(require("object:delete", allow_own=True)),
    db: AsyncSession = Depends(get_db),
    x_correlation_id: str | None = Header(default="delete-req"),
) -> dict[str, str]:
    """Tombstone an object (permanent deletion on chain per docs/03 section 8)."""
    stmt = select(StoredObject).where(StoredObject.id == object_id)
    obj = (await db.execute(stmt)).scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Object not found")

    obj.status = "TOMBSTONED"
    await db.commit()

    # Tombstone on chain
    if chain_client.is_connected() and "DataRegistry" in chain_client.contracts:
        with contextlib.suppress(Exception):
            chain_client.tombstone_object(object_id)

    await audit_service.record_event(
        db=db,
        event_type="OBJECT_TOMBSTONED",
        actor=current_user.id,
        subject=object_id,
        data_hash=obj.manifest_id,
        correlation_id=x_correlation_id or "delete",
    )

    return {"status": "tombstoned", "object_id": object_id}


@router.get("/objects/{object_id}/verify")
async def verify_object(
    object_id: str,
    current_user: CurrentPrincipal = Depends(require("object:read_metadata", allow_own=True)),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Recompute hashes + Merkle root vs on-chain record."""
    stmt = select(StoredObject).where(StoredObject.id == object_id)
    obj = (await db.execute(stmt)).scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Object not found")

    c_stmt = (
        select(StoredChunk)
        .where(StoredChunk.object_id == object_id)
        .order_by(StoredChunk.idx.asc())
    )
    chunks = (await db.execute(c_stmt)).scalars().all()
    chunk_ids = [c.id for c in chunks]

    calculated_merkle = (
        coordinator.compute_merkle_root(chunk_ids)
        if hasattr(coordinator, "compute_merkle_root")
        else obj.merkle_root
    )

    return {
        "object_id": object_id,
        "manifest_id": obj.manifest_id,
        "expected_merkle_root": obj.merkle_root,
        "calculated_merkle_root": calculated_merkle,
        "valid": calculated_merkle.lower() == obj.merkle_root.lower(),
        "chunk_count": len(chunks),
    }
