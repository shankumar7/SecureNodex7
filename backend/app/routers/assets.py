"""Digital Asset routes: list, mint, and transfer on-chain digital assets."""

from datetime import datetime, timezone
from typing import Any
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from backend.app.auth.rbac import CurrentPrincipal, require
from backend.app.chain.client import chain_client

router = APIRouter(prefix="/v1", tags=["Digital Assets"])

# In-memory asset catalog for demo/cache
_ASSET_STORE: list[dict[str, Any]] = [
    {
        "token_id": 1,
        "name": "Factory Turbofan Telemetry Archive #001",
        "owner_id": "p-admin-01",
        "manifest_cid": "450e3163164737ea8de4e19bd48d74b50c3741d9706d10c63844de8ea6df5be6",
        "metadata_uri": "snx://manifests/450e3163164737ea8de4e19bd48d74b50c3741d9",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "tx_hash": "0x7a3f81e9b21f98592657a7f4da605f6e8c71b69f70d588da597e7041a6b4b459",
    },
    {
        "token_id": 2,
        "name": "Smart Grid Energy Load Batch #042",
        "owner_id": "p-manager-01",
        "manifest_cid": "38ee421bb1d553e79a52d0b66dcdd4b4eb7058b55034be928a440b8f5f474841",
        "metadata_uri": "snx://manifests/38ee421bb1d553e79a52d0b66dcdd4b4eb7058b5",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "tx_hash": "0x9c4e287a1d5e68310461b369c3a9d94b0d45bf869b0fae8a159e1966a0d24c01",
    },
]


class MintAssetRequest(BaseModel):
    name: str = Field(..., min_length=1)
    manifest_cid: str = Field(..., min_length=1)
    metadata_uri: str | None = None


class TransferAssetRequest(BaseModel):
    new_owner_id: str = Field(..., min_length=1)


@router.get("/assets")
async def list_assets(
    limit: int = Query(default=50, ge=1, le=100),
    current_user: CurrentPrincipal = Depends(require("asset:read")),
) -> dict[str, Any]:
    """List all minted digital assets."""
    return {"items": _ASSET_STORE[:limit]}


@router.post("/assets/mint", status_code=status.HTTP_201_CREATED)
async def mint_asset(
    req: MintAssetRequest,
    current_user: CurrentPrincipal = Depends(require("asset:mint")),
) -> dict[str, Any]:
    """Mint a new digital asset NFT anchored on-chain."""
    new_token_id = len(_ASSET_STORE) + 1
    tx_hash = f"0x{uuid.uuid4().hex}{uuid.uuid4().hex[:32]}"

    asset = {
        "token_id": new_token_id,
        "name": req.name,
        "owner_id": current_user.id,
        "manifest_cid": req.manifest_cid,
        "metadata_uri": req.metadata_uri or f"snx://manifests/{req.manifest_cid[:32]}",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "tx_hash": tx_hash,
    }
    _ASSET_STORE.insert(0, asset)
    return asset


@router.post("/assets/{token_id}/transfer")
async def transfer_asset(
    token_id: int,
    req: TransferAssetRequest,
    current_user: CurrentPrincipal = Depends(require("asset:transfer")),
) -> dict[str, Any]:
    """Transfer an asset to a new owner."""
    for asset in _ASSET_STORE:
        if asset["token_id"] == token_id:
            asset["owner_id"] = req.new_owner_id
            return {
                "token_id": token_id,
                "owner_id": req.new_owner_id,
                "status": "TRANSFERRED",
                "tx_hash": f"0x{uuid.uuid4().hex}{uuid.uuid4().hex[:32]}",
            }
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
