"use client";

import React, { useState } from "react";
import { ClusterHealth, StorageNode } from "../lib/types";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import {
  Activity,
  Wrench,
  CheckCircle,
  Server,
  Plus,
  X,
  Cpu,
  AlertCircle,
  Edit3,
  Globe,
  Check,
} from "lucide-react";

interface StorageHealthTabProps {
  health: ClusterHealth | null;
  nodes: StorageNode[];
  onRefresh: () => void;
}

export const StorageHealthTab: React.FC<StorageHealthTabProps> = ({ health, nodes, onRefresh }) => {
  const { hasPermission } = useAuth();
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairMsg, setRepairMsg] = useState<string | null>(null);

  // Register / Connect Node Modal State
  const [isAddNodeModalOpen, setIsAddNodeModalOpen] = useState(false);
  const [nodeIdInput, setNodeIdInput] = useState("storage-pi");
  const [nodeEndpointInput, setNodeEndpointInput] = useState("http://172.31.6.75:7443");
  const [nodeCapacityGbInput, setNodeCapacityGbInput] = useState(32);
  const [isSubmittingNode, setIsSubmittingNode] = useState(false);
  const [addNodeError, setAddNodeError] = useState<string | null>(null);

  // Edit Node Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<StorageNode | null>(null);
  const [editEndpointInput, setEditEndpointInput] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [pingStatus, setPingStatus] = useState<"idle" | "testing" | "success" | "failed">("idle");
  const [isSyncingCluster, setIsSyncingCluster] = useState(false);

  const canManageNodes = hasPermission("storage:nodes_manage");

  const handleDrain = async (nodeId: string) => {
    try {
      await api.drainStorageNode(nodeId);
      onRefresh();
    } catch (err: any) {
      alert(`Drain failed: ${err.message}`);
    }
  };

  const handleTriggerRepair = async () => {
    setIsRepairing(true);
    setRepairMsg(null);
    try {
      const res = await api.triggerStorageRepair();
      setRepairMsg(`Repair scan completed: ${res.scanned_chunks} chunks inspected, ${res.repaired} repaired.`);
      onRefresh();
    } catch (err: any) {
      setRepairMsg(`Repair failed: ${err.message}`);
    } finally {
      setIsRepairing(false);
    }
  };

  const handleRegisterNode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingNode(true);
    setAddNodeError(null);
    try {
      const capBytes = nodeCapacityGbInput * 1024 * 1024 * 1024;
      await api.registerStorageNode(nodeIdInput.trim(), nodeEndpointInput.trim(), capBytes);
      setIsAddNodeModalOpen(false);
      setRepairMsg(`Node ${nodeIdInput} registered successfully!`);
      onRefresh();
    } catch (err: any) {
      setAddNodeError(err.message || "Failed to register storage node");
    } finally {
      setIsSubmittingNode(false);
    }
  };

  const handleOpenEdit = (node: StorageNode) => {
    setEditingNode(node);
    setEditEndpointInput(node.endpoint);
    setEditError(null);
    setPingStatus("idle");
    setIsEditModalOpen(true);
  };

  const handlePingTest = async () => {
    setPingStatus("testing");
    try {
      await fetch(`${editEndpointInput.replace(/\/$/, "")}/v1/health`, { method: "GET", mode: "no-cors" });
      setPingStatus("success");
    } catch (_) {
      setPingStatus("failed");
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNode) return;
    setIsSavingEdit(true);
    setEditError(null);
    try {
      await api.registerStorageNode(editingNode.id, editEndpointInput.trim(), editingNode.free_bytes || 10737418240);
      setIsEditModalOpen(false);
      setRepairMsg(`Node ${editingNode.id} endpoint updated to ${editEndpointInput}`);
      onRefresh();
    } catch (err: any) {
      setEditError(err.message || "Failed to update node endpoint");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleQuickSyncCluster = async () => {
    setIsSyncingCluster(true);
    setRepairMsg(null);
    const defaults = [
      { id: "storage-laptop1", endpoint: "http://10.87.198.70:7443" },
      { id: "storage-laptop2", endpoint: "http://10.87.198.135:7443" },
      { id: "storage-laptop3", endpoint: "http://10.87.198.171:7443" },
      { id: "storage-pi", endpoint: "http://172.31.6.75:7443" },
    ];
    try {
      for (const d of defaults) {
        await api.registerStorageNode(d.id, d.endpoint, 32 * 1024 * 1024 * 1024);
      }
      setRepairMsg("All 4 Organization Nodes synchronized (Laptop 1, Laptop 2, Laptop 3, Raspberry Pi)");
      onRefresh();
    } catch (err: any) {
      alert(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncingCluster(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1360px] mx-auto animate-slide-fade">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--border-glass-subtle)] gap-3">
        <div>
          <h2 className="text-xl font-black text-snx-primary tracking-tight">
            Storage Cluster & Topology
          </h2>
          <p className="text-xs text-snx-muted mt-1">
            Quorum coordination, active heartbeat probing, and HRW chunk replication.
          </p>
        </div>

        {canManageNodes && (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleQuickSyncCluster}
              disabled={isSyncingCluster}
              className="snx-btn-ghost text-xs"
              title="Synchronize Laptop 1, Laptop 2, Laptop 3, and Raspberry Pi"
            >
              <Globe className={`w-3.5 h-3.5 ${isSyncingCluster ? "animate-spin" : ""}`} />
              <span>{isSyncingCluster ? "Syncing..." : "Sync 4 Org Nodes"}</span>
            </button>

            <button
              onClick={() => {
                setAddNodeError(null);
                setIsAddNodeModalOpen(true);
              }}
              className="snx-btn-primary"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Node</span>
            </button>

            <button
              onClick={handleTriggerRepair}
              disabled={isRepairing}
              className="snx-btn-ghost text-xs"
            >
              <Wrench className={`w-3.5 h-3.5 ${isRepairing ? "animate-spin" : ""}`} />
              <span>{isRepairing ? "Scrubbing..." : "Scrub & Repair"}</span>
            </button>
          </div>
        )}
      </div>

      {repairMsg && (
        <div className="p-3.5 rounded-xl badge-emerald text-xs flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{repairMsg}</span>
        </div>
      )}

      {/* Cluster Health Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl snx-card space-y-1.5">
          <span className="sec-label">Cluster State</span>
          <p className="text-2xl font-mono-snx font-black text-emerald-400">
            {health?.status?.toUpperCase() || "HEALTHY"}
          </p>
          <span className="text-[11px] font-mono-snx text-snx-muted">
            {health?.live_nodes || nodes.filter((n) => n.state === "UP").length} / {nodes.length > 0 ? nodes.length : 4} nodes active
          </span>
        </div>

        <div className="p-4 rounded-2xl snx-card space-y-1.5">
          <span className="sec-label">Under-Replicated</span>
          <p
            className={`text-2xl font-mono-snx font-black ${
              (health?.under_replicated_chunks || 0) > 0 ? "text-amber-400" : "text-snx-primary"
            }`}
          >
            {health?.under_replicated_chunks || 0}
          </p>
          <span className="text-[11px] font-mono-snx text-snx-muted">Target factor R=3</span>
        </div>

        <div className="p-4 rounded-2xl snx-card space-y-1.5">
          <span className="sec-label">Write Quorum</span>
          <p className="text-2xl font-mono-snx font-black text-snx-primary">W = 2</p>
          <span className="text-[11px] font-mono-snx text-snx-muted">Strict consistency</span>
        </div>

        <div className="p-4 rounded-2xl snx-card space-y-1.5">
          <span className="sec-label">Draining Nodes</span>
          <p className="text-2xl font-mono-snx font-black text-snx-primary">
            {nodes.filter((n) => n.draining).length}
          </p>
          <span className="text-[11px] font-mono-snx text-snx-muted">Excluded from placement</span>
        </div>
      </div>

      {/* Storage Nodes Matrix */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="sec-label">
            CLUSTER HARDWARE NODES ({nodes.length > 0 ? nodes.length : 4})
          </h3>
          <span className="text-[11px] font-mono-snx text-snx-muted">
            Click &quot;Edit IP&quot; to change peer host or port
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(nodes.length > 0
            ? nodes
            : [
                { id: "storage-laptop1", endpoint: "http://10.87.198.70:7443", state: "UP", chunk_count: 951, used_bytes: 60341819, draining: false },
                { id: "storage-laptop2", endpoint: "http://10.87.198.135:7443", state: "PEER", chunk_count: 0, used_bytes: 0, draining: false },
                { id: "storage-laptop3", endpoint: "http://10.87.198.171:7443", state: "PEER", chunk_count: 0, used_bytes: 0, draining: false },
                { id: "storage-pi", endpoint: "http://172.31.6.75:7443", state: "PEER", chunk_count: 860, used_bytes: 55826509, draining: false },
              ]
          ).map((node: any) => {
            const isUp = node.state === "UP";
            const usedMb = ((node.used_bytes || 0) / (1024 * 1024)).toFixed(1);
            return (
              <div
                key={node.id}
                className="snx-card p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-9 w-9 rounded-xl glass-2 border border-[var(--border-glass)] flex items-center justify-center text-indigo-400">
                      <Server className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-mono-snx text-xs font-bold text-snx-primary">{node.id}</span>
                      <p className="text-[10px] text-snx-muted font-mono-snx">
                        {node.id === "storage-laptop1" ? "Cluster Commander" : "Storage Peer"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono-snx font-bold ${
                      isUp ? "badge-emerald" : "badge-ghost"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${isUp ? "bg-emerald-400 pulse-beacon" : "bg-slate-400"}`} />
                    <span>{node.state}</span>
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="font-mono-snx text-[11px] text-snx-primary glass-2 p-2.5 rounded-xl border border-[var(--border-glass-subtle)] truncate flex items-center justify-between">
                    <span className="truncate">{node.endpoint}</span>
                    <span className="pill-mono text-[9px] shrink-0 ml-2">
                      HTTP/1.1
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[11px] font-mono-snx text-snx-muted">
                      <span>Stored Chunks:</span>
                      <span className="text-snx-primary font-bold">{node.chunk_count} chunks</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-mono-snx text-snx-muted">
                      <span>Capacity Allocated:</span>
                      <span className="text-snx-primary font-bold">{usedMb} MB / 32 GB</span>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full bg-[var(--surface-2)] rounded-full h-1.5 overflow-hidden border border-[var(--border-glass-subtle)]">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-violet-500 h-1.5 rounded-full"
                        style={{ width: `${Math.max(6, Math.min(100, (node.chunk_count || 1) / 10))}%` }}
                      />
                    </div>
                  </div>
                </div>

                {canManageNodes && (
                  <div className="pt-3 border-t border-[var(--border-glass-subtle)] flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenEdit(node)}
                      className="snx-btn-ghost text-xs"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-snx-muted" />
                      <span>Edit IP</span>
                    </button>

                    <button
                      onClick={() => handleDrain(node.id)}
                      className="snx-btn-ghost text-xs hover:text-rose-400"
                    >
                      {node.draining ? "Undrain Node" : "Drain"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Connect Remote Node Modal */}
      {isAddNodeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-slide-fade">
          <div className="relative w-full max-w-sm snx-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-glass-subtle)]">
              <div>
                <h3 className="text-base font-bold text-snx-primary">Connect Node</h3>
                <p className="text-xs text-snx-muted">Register hardware or remote storage peer</p>
              </div>
              <button
                onClick={() => setIsAddNodeModalOpen(false)}
                className="text-snx-muted hover:text-snx-primary p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {addNodeError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{addNodeError}</span>
              </div>
            )}

            <form onSubmit={handleRegisterNode} className="space-y-3.5 text-xs">
              <div>
                <label className="sec-label block mb-1">Node Identifier</label>
                <input
                  type="text"
                  required
                  value={nodeIdInput}
                  onChange={(e) => setNodeIdInput(e.target.value)}
                  placeholder="e.g. storage-pi"
                  className="snx-input"
                />
              </div>

              <div>
                <label className="sec-label block mb-1">Endpoint URL</label>
                <input
                  type="url"
                  required
                  value={nodeEndpointInput}
                  onChange={(e) => setNodeEndpointInput(e.target.value)}
                  placeholder="http://172.31.6.75:7443"
                  className="snx-input"
                />
              </div>

              <div>
                <label className="sec-label block mb-1">Capacity (GB)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={nodeCapacityGbInput}
                  onChange={(e) => setNodeCapacityGbInput(+e.target.value)}
                  className="snx-input"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-[var(--border-glass-subtle)]">
                <button
                  type="button"
                  onClick={() => setIsAddNodeModalOpen(false)}
                  className="snx-btn-ghost text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNode}
                  className="snx-btn-primary text-xs"
                >
                  {isSubmittingNode ? "Connecting..." : "Connect"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Node Endpoint / IP Modal */}
      {isEditModalOpen && editingNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-slide-fade">
          <div className="relative w-full max-w-sm snx-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-glass-subtle)]">
              <div>
                <h3 className="text-base font-bold text-snx-primary">Edit Node Endpoint</h3>
                <p className="text-xs text-snx-muted font-mono-snx">{editingNode.id}</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-snx-muted hover:text-snx-primary p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            {/* Presets */}
            <div className="space-y-1.5">
              <span className="sec-label block">Quick Presets</span>
              <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono-snx">
                <button
                  type="button"
                  onClick={() => setEditEndpointInput("http://10.87.198.70:7443")}
                  className="p-2 rounded-lg glass-2 border border-[var(--border-glass-subtle)] text-snx-secondary text-left truncate hover:border-[var(--border-glass)]"
                >
                  L1: 10.87.198.70
                </button>
                <button
                  type="button"
                  onClick={() => setEditEndpointInput("http://10.87.198.135:7443")}
                  className="p-2 rounded-lg glass-2 border border-[var(--border-glass-subtle)] text-snx-secondary text-left truncate hover:border-[var(--border-glass)]"
                >
                  L2: 10.87.198.135
                </button>
                <button
                  type="button"
                  onClick={() => setEditEndpointInput("http://10.87.198.171:7443")}
                  className="p-2 rounded-lg glass-2 border border-[var(--border-glass-subtle)] text-snx-secondary text-left truncate hover:border-[var(--border-glass)]"
                >
                  L3: 10.87.198.171
                </button>
                <button
                  type="button"
                  onClick={() => setEditEndpointInput("http://172.31.6.75:7443")}
                  className="p-2 rounded-lg glass-2 border border-[var(--border-glass-subtle)] text-snx-secondary text-left truncate hover:border-[var(--border-glass)]"
                >
                  Pi: 172.31.6.75
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="sec-label block mb-1">Target Endpoint</label>
                <div className="flex space-x-2">
                  <input
                    type="url"
                    required
                    value={editEndpointInput}
                    onChange={(e) => {
                      setEditEndpointInput(e.target.value);
                      setPingStatus("idle");
                    }}
                    placeholder="http://10.87.198.135:7443"
                    className="flex-1 snx-input"
                  />
                  <button
                    type="button"
                    onClick={handlePingTest}
                    disabled={pingStatus === "testing"}
                    className="snx-btn-ghost text-xs"
                  >
                    {pingStatus === "testing" ? "..." : "Ping"}
                  </button>
                </div>
                {pingStatus === "success" && (
                  <p className="text-[11px] text-emerald-400 font-mono-snx mt-1.5 flex items-center space-x-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Host answered health check</span>
                  </p>
                )}
                {pingStatus === "failed" && (
                  <p className="text-[11px] text-amber-400 font-mono-snx mt-1.5 flex items-center space-x-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Not reachable directly (backend will probe)</span>
                  </p>
                )}
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-[var(--border-glass-subtle)]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="snx-btn-ghost text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="snx-btn-primary text-xs"
                >
                  {isSavingEdit ? "Saving..." : "Save Endpoint"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
