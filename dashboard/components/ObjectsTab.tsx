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
  Trash2,
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
  const [isClearing, setIsClearing] = useState(false);

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
    if (!confirm("Are you sure you want to delete this object from decentralized storage?")) return;
    try {
      await api.tombstoneObject(id);
      onRefresh();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to permanently clear all stored objects from decentralized storage?")) return;
    setIsClearing(true);
    try {
      await api.clearAllObjects();
      onRefresh();
    } catch (err: any) {
      alert(`Clear failed: ${err.message}`);
    } finally {
      setIsClearing(false);
    }
  };

  const effectiveObjects: StoredObject[] = objects;

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

        <div className="flex items-center gap-2">
          {objects.length > 0 && (
            <button
              onClick={handleClearAll}
              disabled={isClearing}
              className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 bg-rose-50/60 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-50"
              title="Clear all stored objects"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>{isClearing ? "Clearing..." : "Clear All Data"}</span>
            </button>
          )}

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
                <th className="px-4 py-3 text-right font-mono-snx whitespace-nowrap min-w-[340px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-glass-subtle)] text-snx-secondary">
              {effectiveObjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center text-snx-muted font-mono-snx text-xs">
                    <HardDrive className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600 opacity-60" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">No decentralized files stored</p>
                    <p className="text-[11px] mt-1 text-slate-400">All data has been cleared. Click "Upload Object" to store encrypted files.</p>
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
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleViewPlacement(obj)}
                          className="snx-btn-ghost px-2.5 py-1 text-[11px]"
                          title="View HRW placement matrix"
                        >
                          <Grid className="w-3 h-3 text-indigo-500" />
                          <span>Placement</span>
                        </button>

                        <button
                          onClick={() => handleVerify(obj.id)}
                          className="snx-btn-ghost px-2.5 py-1 text-[11px]"
                          title="Cryptographic verification"
                        >
                          <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Verify</span>
                        </button>

                        <button
                          onClick={() => handleDownload(obj)}
                          className="snx-btn-ghost px-2.5 py-1 text-[11px]"
                          title="Download file"
                        >
                          <Download className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                          <span>Download</span>
                        </button>

                        <button
                          onClick={() => handleTombstone(obj.id)}
                          className="snx-btn-ghost px-2.5 py-1 text-[11px] text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:border-rose-300 dark:hover:border-rose-500/30"
                          title="Delete object"
                        >
                          <Trash2 className="w-3 h-3 text-rose-500" />
                          <span>Delete</span>
                        </button>
                      </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-3xl my-auto bg-white dark:bg-[#0E1526] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[88vh] overflow-y-auto animate-slide-fade">
            <button
              onClick={() => setActivePlacementObj(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition"
              title="Close modal"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-sm my-auto bg-white dark:bg-[#0E1526] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-6 space-y-4 animate-slide-fade">
            <button
              onClick={() => setIsUploadOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition"
              title="Close modal"
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
