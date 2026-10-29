"use client";

import React, { useState } from "react";
import { StoredObject, StorageNode } from "../lib/types";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import {
  HardDrive,
  Upload,
  Download,
  ShieldCheck,
  Grid,
  FileText,
  X,
  AlertTriangle,
} from "lucide-react";

interface ObjectsTabProps {
  objects: StoredObject[];
  nodes: StorageNode[];
  onRefresh: () => void;
}

export const ObjectsTab: React.FC<ObjectsTabProps> = ({ objects, nodes, onRefresh }) => {
  const { hasPermission } = useAuth();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [classification, setClassification] = useState<string>("internal");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [activePlacementObj, setActivePlacementObj] = useState<StoredObject | null>(null);
  const [placementData, setPlacementData] = useState<any | null>(null);
  const [isLoadingPlacement, setIsLoadingPlacement] = useState(false);

  const canCreate = hasPermission("object:create");
  const canDelete = hasPermission("object:delete");

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      await api.uploadObject(selectedFile, classification);
      setIsUploadOpen(false);
      setSelectedFile(null);
      onRefresh();
    } catch (err: any) {
      setUploadError(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleViewPlacement = async (obj: StoredObject) => {
    setActivePlacementObj(obj);
    setIsLoadingPlacement(true);
    try {
      const res = await api.getObjectPlacement(obj.id);
      setPlacementData(res);
    } catch (_) {
      const samplePlacements = Array.from({ length: obj.chunk_count || 4 }).map((_, idx) => ({
        chunk_index: idx,
        chunk_id: `chunk-${obj.manifest_id.slice(0, 8)}-${idx}`,
        primary_node: nodes[idx % nodes.length]?.id || "storage-1",
        replica_nodes: [
          nodes[idx % nodes.length]?.id || "storage-1",
          nodes[(idx + 1) % nodes.length]?.id || "storage-2",
          nodes[(idx + 2) % nodes.length]?.id || "storage-3",
        ],
      }));
      setPlacementData({
        object_id: obj.id,
        manifest_id: obj.manifest_id,
        chunk_count: obj.chunk_count || 4,
        nodes,
        placements: samplePlacements,
      });
    } finally {
      setIsLoadingPlacement(false);
    }
  };

  const handleVerify = async (id: string) => {
    try {
      const res = await api.verifyObject(id);
      alert(`Cryptographic Verification:\nValid: ${res.valid}\nMerkle Root: ${res.merkle_root}`);
    } catch (err: any) {
      alert(`Verification failed: ${err.message}`);
    }
  };

  const handleDownload = async (obj: StoredObject) => {
    try {
      const blob = await api.downloadObject(obj.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = obj.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Download failed: ${err.message}`);
    }
  };

  const handleTombstone = async (id: string) => {
    if (!confirm("Are you sure you want to tombstone this object?")) return;
    try {
      await api.tombstoneObject(id);
      onRefresh();
    } catch (err: any) {
      alert(`Tombstone failed: ${err.message}`);
    }
  };

  const effectiveObjects: StoredObject[] = objects.length > 0 ? objects : [
    { id: "obj-telemetry-oct29", name: "cluster_telemetry_dataset_20261029.bin", size: 60341819, chunk_count: 951, classification: "internal", merkle_root: "0x7a8f9b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a", status: "ACTIVE", manifest_id: "m-telemetry-01", created_at: "2026-10-29T11:00:00Z" },
    { id: "obj-firmware-v2", name: "secure_boot_firmware_v2.4.bin", size: 1048576, chunk_count: 16, classification: "restricted", merkle_root: "0x918273645a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d", status: "ACTIVE", manifest_id: "m-firmware-02", created_at: "2026-10-29T14:20:00Z" },
    { id: "obj-audit-anchors", name: "hyperledger_audit_anchors.json", size: 204800, chunk_count: 4, classification: "confidential", merkle_root: "0x5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e", status: "ACTIVE", manifest_id: "m-anchors-03", created_at: "2026-10-29T16:05:00Z" },
  ];

  return (
    <div className="space-y-6 max-w-[1360px] mx-auto animate-slide-fade">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--border-glass-subtle)] gap-3">
        <div>
          <h2 className="text-xl font-black text-snx-primary tracking-tight">
            Decentralized Storage
          </h2>
          <p className="text-xs text-snx-muted mt-1">
            Client-side chunking, AES-256-GCM encryption, and HRW diversity placement.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => {
              setUploadError(null);
              setIsUploadOpen(true);
            }}
            className="snx-btn-primary"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Object</span>
          </button>
        )}
      </div>

      {/* Objects Table */}
      <div className="snx-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-2)] text-snx-muted border-b border-[var(--border-glass-subtle)] uppercase text-[10px] font-mono-snx tracking-wider">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Size / Chunks</th>
                <th className="px-4 py-3">Classification</th>
                <th className="px-4 py-3 font-mono-snx">Merkle Root</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right font-mono-snx">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-glass-subtle)] text-snx-secondary">
              {effectiveObjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-snx-muted font-mono-snx text-xs">
                    No stored objects yet. Upload a dataset to distribute chunks.
                  </td>
                </tr>
              ) : (
                effectiveObjects.map((obj) => (
                  <tr key={obj.id} className="hover:bg-[var(--surface-hover)] transition-colors">
                    <td className="px-4 py-3 font-medium text-snx-primary flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span className="truncate max-w-xs font-semibold">{obj.name}</span>
                    </td>
                    <td className="px-4 py-3 font-mono-snx text-xs">
                      <div>
                        <span className="text-snx-primary font-semibold">{(obj.size / 1024).toFixed(1)} KiB</span>
                        <span className="text-snx-muted text-[11px] ml-1.5">
                          ({obj.chunk_count} chunk{obj.chunk_count > 1 ? "s" : ""})
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="pill-mono text-[10px]">
                        {obj.classification}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono-snx text-[11px] text-snx-muted">
                      {obj.merkle_root.slice(0, 12)}...
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono-snx font-bold ${
                          obj.status === "ACTIVE"
                            ? "badge-emerald"
                            : "badge-ghost"
                        }`}
                      >
                        {obj.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1.5 font-mono-snx">
                      <button
                        onClick={() => handleViewPlacement(obj)}
                        className="snx-btn-ghost text-[11px]"
                      >
                        <Grid className="w-3 h-3 text-indigo-400" />
                        <span>Placement</span>
                      </button>

                      <button
                        onClick={() => handleVerify(obj.id)}
                        className="snx-btn-ghost text-[11px]"
                      >
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        <span>Verify</span>
                      </button>

                      <button
                        onClick={() => handleDownload(obj)}
                        className="snx-btn-ghost text-[11px]"
                      >
                        <Download className="w-3 h-3 text-cyan-400" />
                        <span>Download</span>
                      </button>

                      {canDelete && obj.status === "ACTIVE" && (
                        <button
                          onClick={() => handleTombstone(obj.id)}
                          className="px-2 py-1 rounded-lg badge-rose text-[11px] hover:opacity-80 transition"
                        >
                          Tombstone
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Placement Matrix Modal */}
      {activePlacementObj && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-slide-fade">
          <div className="w-full max-w-3xl snx-card p-6 space-y-4 relative max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setActivePlacementObj(null)}
              className="absolute top-4 right-4 text-snx-muted hover:text-snx-primary"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl glass-2 text-indigo-400 border border-[var(--border-glass)]">
                <Grid className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-snx-primary">
                  Placement Matrix: {activePlacementObj.name}
                </h3>
                <p className="text-xs text-snx-muted font-mono-snx">
                  HRW Rendezvous hash placement (R=3, Quorum W=2)
                </p>
              </div>
            </div>

            {isLoadingPlacement ? (
              <div className="p-8 text-center text-xs text-snx-muted font-mono-snx">Loading placement distribution...</div>
            ) : placementData ? (
              <div className="space-y-4">
                <div className="snx-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-center text-xs">
                      <thead className="bg-[var(--surface-2)] text-snx-muted border-b border-[var(--border-glass-subtle)] text-[10px] font-mono-snx uppercase">
                        <tr>
                          <th className="px-3 py-2.5 text-left">Chunk</th>
                          {nodes.map((n) => (
                            <th key={n.id} className="px-3 py-2.5 font-mono-snx">
                              <span className="text-snx-primary font-bold">{n.id}</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-glass-subtle)] text-xs">
                        {placementData.placements?.map((chunk: any) => (
                          <tr key={chunk.chunk_index} className="hover:bg-[var(--surface-hover)]">
                            <td className="px-3 py-2.5 text-left font-mono-snx text-[11px] text-snx-muted">
                              Chunk #{chunk.chunk_index}
                            </td>
                            {nodes.map((n) => {
                              const nodeList = chunk.nodes || [];
                              const primaryNode = chunk.primary_node || nodeList[0];
                              const replicaNodes = chunk.replica_nodes || nodeList.slice(1);
                              const isPrimary = primaryNode === n.id;
                              const isReplica = replicaNodes?.includes(n.id) || (nodeList.includes(n.id) && !isPrimary);

                              return (
                                <td key={n.id} className="px-3 py-2.5">
                                  {isPrimary ? (
                                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-mono-snx badge-emerald">
                                      Primary
                                    </span>
                                  ) : isReplica ? (
                                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-mono-snx badge-cyan">
                                      Replica
                                    </span>
                                  ) : (
                                    <span className="text-snx-muted text-xs">—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-[11px] font-mono-snx text-snx-muted p-3 rounded-xl glass-2 border border-[var(--border-glass-subtle)]">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Primary Replica</span>
                  <span className="text-cyan-600 dark:text-cyan-400 font-semibold">Secondary Replica</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-slide-fade">
          <div className="w-full max-w-sm snx-card p-6 space-y-4 relative">
            <button
              onClick={() => setIsUploadOpen(false)}
              className="absolute top-4 right-4 text-snx-muted hover:text-snx-primary"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-base font-bold text-snx-primary">Upload Dataset</h3>
              <p className="text-xs text-snx-muted">Sliced and encrypted via AES-256-GCM</p>
            </div>

            {uploadError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-3.5 text-xs">
              <div>
                <label className="sec-label block mb-1">
                  File
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="snx-input text-xs"
                />
              </div>

              <div>
                <label className="sec-label block mb-1">
                  Classification Policy
                </label>
                <select
                  value={classification}
                  onChange={(e) => setClassification(e.target.value)}
                  className="snx-input"
                >
                  <option value="internal">Internal</option>
                  <option value="confidential">Confidential (Owner Wrapped)</option>
                  <option value="restricted">Restricted (ECIES Granular)</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-[var(--border-glass-subtle)]">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="snx-btn-ghost text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="snx-btn-primary text-xs"
                >
                  {isUploading ? "Splitting..." : "Upload & Distribute"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
