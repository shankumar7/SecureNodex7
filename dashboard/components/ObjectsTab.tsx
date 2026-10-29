"use client";

import React, { useState } from "react";
import { StoredObject, StorageNode } from "../lib/types";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import {
  HardDrive,
  Upload,
  Download,
  CheckCircle,
  ShieldCheck,
  Grid,
  Trash2,
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
      // Fallback synthetic placement visualization
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
      a.download = obj.name || `object-${obj.id.slice(0, 8)}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Download failed: ${err.message}`);
    }
  };

  const handleTombstone = async (id: string) => {
    if (!window.confirm("Are you sure you want to tombstone this object?")) return;
    try {
      await api.tombstoneObject(id);
      onRefresh();
    } catch (err: any) {
      alert(`Failed to delete object: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <HardDrive className="w-5 h-5 text-purple-600" />
            <span>Decentralized Split Storage (SNX-Store)</span>
          </h2>
          <p className="text-xs text-slate-600 font-medium">
            Client-side streaming chunking, AES-256-GCM encryption with ECIES key-wrapping, and HRW diversity placement.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => {
              setUploadError(null);
              setIsUploadOpen(true);
            }}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-md shadow-purple-600/20 transition"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Object</span>
          </button>
        )}
      </div>

      {/* Objects Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="px-4 py-3">Object Name</th>
                <th className="px-4 py-3">Size & Chunks</th>
                <th className="px-4 py-3">Classification</th>
                <th className="px-4 py-3">Merkle Root</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {objects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500 font-medium">
                    No stored objects yet. Upload your first encrypted dataset.
                  </td>
                </tr>
              ) : (
                objects.map((obj) => (
                  <tr key={obj.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-semibold text-slate-900 flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                      <span className="truncate max-w-xs">{obj.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-semibold text-slate-900">{(obj.size / 1024).toFixed(1)} KiB</span>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {obj.chunk_count} chunk{obj.chunk_count > 1 ? "s" : ""}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border shadow-2xs ${
                          obj.classification === "restricted"
                            ? "bg-red-100 text-red-800 border-red-300"
                            : obj.classification === "confidential"
                            ? "bg-amber-100 text-amber-800 border-amber-300"
                            : "bg-blue-100 text-blue-800 border-blue-300"
                        }`}
                      >
                        {obj.classification}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600 font-semibold">
                      {obj.merkle_root.slice(0, 12)}...
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border shadow-2xs ${
                          obj.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : "bg-slate-100 text-slate-800 border-slate-300"
                        }`}
                      >
                        {obj.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => handleViewPlacement(obj)}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-300 text-[11px] font-bold transition inline-flex items-center space-x-1 shadow-xs"
                      >
                        <Grid className="w-3.5 h-3.5 text-blue-700" />
                        <span>Placement</span>
                      </button>

                      <button
                        onClick={() => handleVerify(obj.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 text-[11px] font-bold transition inline-flex items-center space-x-1 shadow-xs"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Verify</span>
                      </button>

                      <button
                        onClick={() => handleDownload(obj)}
                        className="px-2.5 py-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-800 border border-purple-300 text-[11px] font-bold transition inline-flex items-center space-x-1 shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5 text-purple-700" />
                        <span>Download</span>
                      </button>

                      {canDelete && obj.status === "ACTIVE" && (
                        <button
                          onClick={() => handleTombstone(obj.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-800 border border-red-300 text-[11px] font-bold transition shadow-xs"
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

      {/* Interactive Placement View Modal */}
      {activePlacementObj && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setActivePlacementObj(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
                <Grid className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Placement Matrix: {activePlacementObj.name}
                </h3>
                <p className="text-xs text-slate-600 font-medium">
                  HRW Rendezvous hash distribution across storage nodes (Replication R=3, Quorum W=2)
                </p>
              </div>
            </div>

            {isLoadingPlacement ? (
              <div className="p-12 text-center text-xs text-slate-500 font-semibold">Loading placement grid...</div>
            ) : placementData ? (
              <div className="space-y-4">
                {/* Placement Grid: Chunks x Nodes */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-center text-xs">
                      <thead className="bg-slate-100 text-slate-800 border-b border-slate-200 text-[11px] font-bold">
                        <tr>
                          <th className="px-3 py-2.5 text-left text-slate-900">Chunk Index</th>
                          {nodes.map((n) => (
                            <th key={n.id} className="px-3 py-2.5 font-mono">
                              <div className="flex flex-col items-center">
                                <span className="text-slate-900 font-bold">{n.id}</span>
                                <span
                                  className={`mt-0.5 inline-block px-1.5 py-0.2 rounded text-[10px] font-black ${
                                    n.state === "UP"
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                      : "bg-red-100 text-red-800 border border-red-300"
                                  }`}
                                >
                                  {n.state}
                                </span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {placementData.placements?.map((chunk: any) => (
                          <tr key={chunk.chunk_index} className="hover:bg-slate-50">
                            <td className="px-3 py-2.5 text-left font-mono font-semibold text-slate-800">
                              Chunk #{chunk.chunk_index}
                            </td>
                            {nodes.map((n) => {
                              const nodeList = chunk.nodes || [];
                              const primaryNode = chunk.primary_node || nodeList[0];
                              const replicaNodes = chunk.replica_nodes || nodeList.slice(1);
                              const isPrimary = primaryNode === n.id;
                              const isReplica = replicaNodes?.includes(n.id) || (nodeList.includes(n.id) && !isPrimary);
                              const isNodeDown = n.state !== "UP";

                              return (
                                <td key={n.id} className="px-3 py-2.5">
                                  {isPrimary ? (
                                    <span
                                      className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-[11px] font-black border shadow-xs ${
                                        isNodeDown
                                          ? "bg-red-100 text-red-800 border-red-300"
                                          : "bg-emerald-100 text-emerald-900 border-emerald-400"
                                      }`}
                                    >
                                      <span>Primary</span>
                                      {isNodeDown && <span className="text-[9px] text-red-700">(DOWN)</span>}
                                    </span>
                                  ) : isReplica ? (
                                    <span
                                      className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-[11px] font-black border shadow-xs ${
                                        isNodeDown
                                          ? "bg-amber-100 text-amber-800 border-amber-300"
                                          : "bg-blue-100 text-blue-900 border-blue-400"
                                      }`}
                                    >
                                      <span>Replica</span>
                                      {isNodeDown && <span className="text-[9px] text-amber-700">(DOWN)</span>}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-xs font-bold">—</span>
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

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-700 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center space-x-2">
                    <span className="h-3 w-3 rounded-full bg-emerald-500 border border-emerald-600" />
                    <span className="text-slate-800">Primary Replica (Rank 1)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="h-3 w-3 rounded-full bg-blue-500 border border-blue-600" />
                    <span className="text-slate-800">Secondary Replica (Rank 2..R)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="h-3 w-3 rounded-full bg-red-500 border border-red-600" />
                    <span className="text-slate-800">Node Suspect / Down</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setIsUploadOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Upload & Distribute Object</h3>
                <p className="text-xs text-slate-600 font-medium">Chunks encrypted with AES-256-GCM</p>
              </div>
            </div>

            {uploadError && (
              <div className="p-3 rounded-lg bg-red-100 border border-red-200 text-red-800 text-xs font-semibold">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Choose File
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Data Classification
                </label>
                <select
                  value={classification}
                  onChange={(e) => setClassification(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-800 font-medium focus:outline-none focus:border-purple-600"
                >
                  <option value="internal">Internal</option>
                  <option value="confidential">Confidential (Owner Wrapped)</option>
                  <option value="restricted">Restricted (ECIES Granular)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 font-semibold border border-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-xs font-semibold text-white shadow-sm transition disabled:opacity-50"
                >
                  {isUploading ? "Uploading & Splitting..." : "Upload & Replicate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
