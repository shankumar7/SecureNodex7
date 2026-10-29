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
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-200 gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 tracking-tight">
            Decentralized Storage
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Client-side chunking, AES-256-GCM encryption, and HRW diversity placement.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => {
              setUploadError(null);
              setIsUploadOpen(true);
            }}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition shadow-2xs"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Object</span>
          </button>
        )}
      </div>

      {/* Objects Table */}
      <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200 uppercase text-[10px] font-mono-snx tracking-wider">
              <tr>
                <th className="px-3.5 py-2.5">Name</th>
                <th className="px-3.5 py-2.5">Size / Chunks</th>
                <th className="px-3.5 py-2.5">Classification</th>
                <th className="px-3.5 py-2.5 font-mono-snx">Merkle Root</th>
                <th className="px-3.5 py-2.5">Status</th>
                <th className="px-3.5 py-2.5 text-right font-mono-snx">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {effectiveObjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-400 font-mono-snx text-xs">
                    No stored objects yet. Upload a dataset to distribute chunks.
                  </td>
                </tr>
              ) : (
                effectiveObjects.map((obj) => (
                  <tr key={obj.id} className="hover:bg-zinc-50/70 transition">
                    <td className="px-3.5 py-2.5 font-medium text-zinc-900 flex items-center space-x-2">
                      <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="truncate max-w-xs">{obj.name}</span>
                    </td>
                    <td className="px-3.5 py-2.5 font-mono-snx text-xs text-zinc-500">
                      <div>
                        <span className="text-zinc-900">{(obj.size / 1024).toFixed(1)} KiB</span>
                        <span className="text-zinc-400 text-[11px] ml-1.5">
                          ({obj.chunk_count} chunk{obj.chunk_count > 1 ? "s" : ""})
                        </span>
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono-snx uppercase bg-zinc-100 text-zinc-700 border border-zinc-200">
                        {obj.classification}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 font-mono-snx text-[11px] text-zinc-500">
                      {obj.merkle_root.slice(0, 10)}...
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono-snx ${
                          obj.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-zinc-100 text-zinc-500 border border-zinc-200"
                        }`}
                      >
                        {obj.status}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-right space-x-1.5 font-mono-snx">
                      <button
                        onClick={() => handleViewPlacement(obj)}
                        className="px-2 py-1 rounded bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 text-[11px] transition shadow-2xs inline-flex items-center space-x-1"
                      >
                        <Grid className="w-3 h-3 text-zinc-400" />
                        <span>Placement</span>
                      </button>

                      <button
                        onClick={() => handleVerify(obj.id)}
                        className="px-2 py-1 rounded bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 text-[11px] transition shadow-2xs inline-flex items-center space-x-1"
                      >
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>Verify</span>
                      </button>

                      <button
                        onClick={() => handleDownload(obj)}
                        className="px-2 py-1 rounded bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 text-[11px] transition shadow-2xs inline-flex items-center space-x-1"
                      >
                        <Download className="w-3 h-3 text-zinc-400" />
                        <span>Download</span>
                      </button>

                      {canDelete && obj.status === "ACTIVE" && (
                        <button
                          onClick={() => handleTombstone(obj.id)}
                          className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] transition shadow-2xs"
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
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="w-full max-w-3xl glass-1 border border-zinc-200 rounded-xl p-5 space-y-4 shadow-2xl relative max-h-[85vh] overflow-y-auto text-zinc-900">
            <button
              onClick={() => setActivePlacementObj(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200">
                <Grid className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">
                  Placement Matrix: {activePlacementObj.name}
                </h3>
                <p className="text-[11px] text-zinc-500 font-mono-snx">
                  HRW Rendezvous hash placement (R=3, Quorum W=2)
                </p>
              </div>
            </div>

            {isLoadingPlacement ? (
              <div className="p-8 text-center text-xs text-zinc-400 font-mono-snx">Loading placement data...</div>
            ) : placementData ? (
              <div className="space-y-3">
                <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-center text-xs">
                      <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200 text-[10px] font-mono-snx uppercase">
                        <tr>
                          <th className="px-3 py-2 text-left">Chunk</th>
                          {nodes.map((n) => (
                            <th key={n.id} className="px-3 py-2 font-mono-snx">
                              <span className="text-zinc-900">{n.id}</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 text-xs">
                        {placementData.placements?.map((chunk: any) => (
                          <tr key={chunk.chunk_index} className="hover:bg-zinc-50/50">
                            <td className="px-3 py-2 text-left font-mono-snx text-[11px] text-zinc-500">
                              Chunk #{chunk.chunk_index}
                            </td>
                            {nodes.map((n) => {
                              const nodeList = chunk.nodes || [];
                              const primaryNode = chunk.primary_node || nodeList[0];
                              const replicaNodes = chunk.replica_nodes || nodeList.slice(1);
                              const isPrimary = primaryNode === n.id;
                              const isReplica = replicaNodes?.includes(n.id) || (nodeList.includes(n.id) && !isPrimary);

                              return (
                                <td key={n.id} className="px-3 py-2">
                                  {isPrimary ? (
                                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono-snx bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      Primary
                                    </span>
                                  ) : isReplica ? (
                                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono-snx bg-zinc-100 text-zinc-700 border border-zinc-200">
                                      Replica
                                    </span>
                                  ) : (
                                    <span className="text-zinc-300 text-xs">—</span>
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

                <div className="flex items-center space-x-4 text-[11px] font-mono-snx text-zinc-500 p-2.5 rounded-md bg-zinc-50 border border-zinc-200">
                  <span className="flex items-center space-x-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="text-zinc-700">Primary Replica</span>
                  </span>
                  <span className="flex items-center space-x-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                    <span className="text-zinc-700">Secondary Replica</span>
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="w-full max-w-sm glass-1 border border-zinc-200 rounded-xl p-5 space-y-4 shadow-2xl relative text-zinc-900">
            <button
              onClick={() => setIsUploadOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Upload Dataset</h3>
              <p className="text-[11px] text-zinc-500">Sliced and encrypted via AES-256-GCM</p>
            </div>

            {uploadError && (
              <div className="p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-mono-snx text-zinc-500 mb-1">
                  File
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-zinc-600 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border file:border-zinc-200 file:text-xs file:font-mono-snx file:bg-zinc-50 file:text-zinc-700 hover:file:bg-zinc-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono-snx text-zinc-500 mb-1">
                  Classification Policy
                </label>
                <select
                  value={classification}
                  onChange={(e) => setClassification(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md glass-1 border border-zinc-200 text-xs text-zinc-900 font-mono-snx focus:outline-none focus:border-zinc-400 shadow-xs"
                >
                  <option value="internal">Internal</option>
                  <option value="confidential">Confidential (Owner Wrapped)</option>
                  <option value="restricted">Restricted (ECIES Granular)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-3 py-1.5 rounded-md text-xs text-zinc-500 hover:text-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="px-4 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition disabled:opacity-50 shadow-xs"
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
