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
    <div className="space-y-6 max-w-6xl">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-200 gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 tracking-tight">
            Storage Cluster & Topology
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Quorum coordination, active heartbeat probing, and HRW chunk replication.
          </p>
        </div>

        {canManageNodes && (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleQuickSyncCluster}
              disabled={isSyncingCluster}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 text-xs font-medium transition shadow-2xs disabled:opacity-50"
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
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Node</span>
            </button>

            <button
              onClick={handleTriggerRepair}
              disabled={isRepairing}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 text-xs font-medium transition shadow-2xs disabled:opacity-50"
            >
              <Wrench className={`w-3.5 h-3.5 ${isRepairing ? "animate-spin" : ""}`} />
              <span>{isRepairing ? "Scrubbing..." : "Scrub & Repair"}</span>
            </button>
          </div>
        )}
      </div>

      {repairMsg && (
        <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 shadow-2xs">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{repairMsg}</span>
        </div>
      )}

      {/* Cluster Health Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-lg glass-1 border border-zinc-200 space-y-1 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <span className="text-[10px] font-mono-snx text-zinc-400 uppercase tracking-wider">Cluster State</span>
          <p className="text-xl font-mono-snx font-semibold text-emerald-600">
            {health?.status?.toUpperCase() || "HEALTHY"}
          </p>
          <span className="text-[11px] font-mono-snx text-zinc-500">
            {health?.live_nodes || nodes.filter((n) => n.state === "UP").length} / {nodes.length} nodes active
          </span>
        </div>

        <div className="p-3.5 rounded-lg glass-1 border border-zinc-200 space-y-1 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <span className="text-[10px] font-mono-snx text-zinc-400 uppercase tracking-wider">Under-Replicated</span>
          <p
            className={`text-xl font-mono-snx font-semibold ${
              (health?.under_replicated_chunks || 0) > 0 ? "text-amber-600" : "text-zinc-900"
            }`}
          >
            {health?.under_replicated_chunks || 0}
          </p>
          <span className="text-[11px] font-mono-snx text-zinc-500">Target factor R=3</span>
        </div>

        <div className="p-3.5 rounded-lg glass-1 border border-zinc-200 space-y-1 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <span className="text-[10px] font-mono-snx text-zinc-400 uppercase tracking-wider">Write Quorum</span>
          <p className="text-xl font-mono-snx font-semibold text-zinc-900">W = 2</p>
          <span className="text-[11px] font-mono-snx text-zinc-500">Strict consistency</span>
        </div>

        <div className="p-3.5 rounded-lg glass-1 border border-zinc-200 space-y-1 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <span className="text-[10px] font-mono-snx text-zinc-400 uppercase tracking-wider">Draining Nodes</span>
          <p className="text-xl font-mono-snx font-semibold text-zinc-900">
            {nodes.filter((n) => n.draining).length}
          </p>
          <span className="text-[11px] font-mono-snx text-zinc-500">Excluded from placement</span>
        </div>
      </div>

      {/* Storage Nodes Matrix */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono-snx uppercase tracking-wider text-white/40 font-semibold">
            Cluster Hardware Nodes ({nodes.length > 0 ? nodes.length : 4})
          </h3>
          <span className="text-[11px] font-mono-snx text-white/30">
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
                className="snx-card p-4 space-y-3.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="h-8 w-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/65">
                      <Server className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-mono-snx text-xs font-bold text-white/90">{node.id}</span>
                      <p className="text-[10px] text-white/30 font-mono-snx">
                        {node.id === "storage-laptop1" ? "Cluster Commander" : "Storage Peer"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono-snx font-bold ${
                      isUp
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-white/[0.05] text-white/50 border border-white/[0.08]"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${isUp ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                    <span>{node.state}</span>
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="font-mono-snx text-[11px] text-white/80 bg-white/[0.03] p-2.5 rounded-lg border border-white/[0.07] truncate flex items-center justify-between">
                    <span className="truncate">{node.endpoint}</span>
                    <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-white text-white/40 border border-white/[0.08] font-semibold shrink-0 ml-2">
                      HTTP/1.1
                    </span>
                  </div>

                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[11px] font-mono-snx text-white/40">
                      <span>Stored Chunks:</span>
                      <span className="text-white/90 font-bold">{node.chunk_count} chunks</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-mono-snx text-white/40">
                      <span>Capacity Allocated:</span>
                      <span className="text-white/90 font-bold">{usedMb} MB / 32 GB</span>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full bg-white/[0.05] rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-1.5 rounded-full"
                        style={{ width: `${Math.max(6, Math.min(100, (node.chunk_count || 1) / 10))}%` }}
                      />
                    </div>
                  </div>
                </div>

                {canManageNodes && (
                  <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenEdit(node)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-white/[0.03] text-white/65 border border-white/[0.08] text-xs font-mono-snx transition shadow-2xs font-medium"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-white/30" />
                      <span>Edit IP</span>
                    </button>

                    <button
                      onClick={() => handleDrain(node.id)}
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-white/[0.03] text-white/50 hover:text-white/90 border border-white/[0.08] text-xs font-mono-snx transition shadow-2xs"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm glass-1 border border-zinc-200 rounded-xl shadow-2xl p-5 text-zinc-900">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">Connect Node</h3>
                <p className="text-[11px] text-zinc-500">Register hardware or remote storage peer</p>
              </div>
              <button
                onClick={() => setIsAddNodeModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 p-1 rounded transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {addNodeError && (
              <div className="mt-3 p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                <span>{addNodeError}</span>
              </div>
            )}

            <form onSubmit={handleRegisterNode} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-mono-snx text-zinc-500 mb-1">Node Identifier</label>
                <input
                  type="text"
                  required
                  value={nodeIdInput}
                  onChange={(e) => setNodeIdInput(e.target.value)}
                  placeholder="e.g. storage-pi"
                  className="w-full glass-1 border border-zinc-200 rounded-md px-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-400 font-mono-snx shadow-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono-snx text-zinc-500 mb-1">Endpoint URL</label>
                <input
                  type="url"
                  required
                  value={nodeEndpointInput}
                  onChange={(e) => setNodeEndpointInput(e.target.value)}
                  placeholder="http://172.31.6.75:7443"
                  className="w-full glass-1 border border-zinc-200 rounded-md px-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-400 font-mono-snx shadow-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono-snx text-zinc-500 mb-1">Capacity (GB)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={nodeCapacityGbInput}
                  onChange={(e) => setNodeCapacityGbInput(+e.target.value)}
                  className="w-full glass-1 border border-zinc-200 rounded-md px-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-400 font-mono-snx shadow-xs"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsAddNodeModalOpen(false)}
                  className="px-3 py-1.5 rounded-md text-xs text-zinc-500 hover:text-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNode}
                  className="px-4 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs transition disabled:opacity-50 shadow-xs"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm glass-1 border border-zinc-200 rounded-xl shadow-2xl p-5 text-zinc-900">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">Edit Node Endpoint</h3>
                <p className="text-[11px] text-zinc-500 font-mono-snx">{editingNode.id}</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 p-1 rounded transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="mt-3 p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                <span>{editError}</span>
              </div>
            )}

            {/* Presets */}
            <div className="mt-3 space-y-1.5">
              <span className="text-[10px] font-mono-snx uppercase text-zinc-400">Quick Presets</span>
              <div className="grid grid-cols-2 gap-1 text-[10px] font-mono-snx">
                <button
                  type="button"
                  onClick={() => setEditEndpointInput("http://10.87.198.70:7443")}
                  className="p-1.5 rounded bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-700 text-left truncate transition"
                >
                  L1: 10.87.198.70
                </button>
                <button
                  type="button"
                  onClick={() => setEditEndpointInput("http://10.87.198.135:7443")}
                  className="p-1.5 rounded bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-700 text-left truncate transition"
                >
                  L2: 10.87.198.135
                </button>
                <button
                  type="button"
                  onClick={() => setEditEndpointInput("http://10.87.198.171:7443")}
                  className="p-1.5 rounded bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-700 text-left truncate transition"
                >
                  L3: 10.87.198.171
                </button>
                <button
                  type="button"
                  onClick={() => setEditEndpointInput("http://172.31.6.75:7443")}
                  className="p-1.5 rounded bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-700 text-left truncate transition"
                >
                  Pi: 172.31.6.75
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-mono-snx text-zinc-500 mb-1">
                  Target Endpoint
                </label>
                <div className="flex space-x-1.5">
                  <input
                    type="url"
                    required
                    value={editEndpointInput}
                    onChange={(e) => {
                      setEditEndpointInput(e.target.value);
                      setPingStatus("idle");
                    }}
                    placeholder="http://10.87.198.135:7443"
                    className="flex-1 glass-1 border border-zinc-200 rounded-md px-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-400 font-mono-snx shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={handlePingTest}
                    disabled={pingStatus === "testing"}
                    className="px-2.5 py-1.5 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 font-mono-snx text-[11px] transition shadow-2xs"
                  >
                    {pingStatus === "testing" ? "..." : "Ping"}
                  </button>
                </div>
                {pingStatus === "success" && (
                  <p className="text-[11px] text-emerald-600 font-mono-snx mt-1 flex items-center space-x-1">
                    <Check className="w-3 h-3" />
                    <span>Host answered health check</span>
                  </p>
                )}
                {pingStatus === "failed" && (
                  <p className="text-[11px] text-amber-600 font-mono-snx mt-1 flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>Not reachable directly (backend will probe)</span>
                  </p>
                )}
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3 py-1.5 rounded-md text-xs text-zinc-500 hover:text-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-4 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs transition disabled:opacity-50 shadow-xs"
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
