"use client";

import React, { useState } from "react";
import { ClusterHealth, StorageNode } from "../lib/types";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { Activity, Wrench, ShieldAlert, CheckCircle, Database, Server, RefreshCw, Plus, X, Cpu, AlertCircle } from "lucide-react";

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
  const [nodeEndpointInput, setNodeEndpointInput] = useState("http://192.168.1.50:7443");
  const [nodeCapacityGbInput, setNodeCapacityGbInput] = useState(32);
  const [isSubmittingNode, setIsSubmittingNode] = useState(false);
  const [addNodeError, setAddNodeError] = useState<string | null>(null);

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
      setRepairMsg(`Node ${nodeIdInput} registered successfully! Heartbeat active.`);
      onRefresh();
    } catch (err: any) {
      setAddNodeError(err.message || "Failed to register storage node");
    } finally {
      setIsSubmittingNode(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Activity className="w-5 h-5 text-emerald-600" />
            <span>Storage Cluster Health & Self-Healing</span>
          </h2>
          <p className="text-xs text-slate-600 font-medium">
            Node heartbeat monitoring, under-replicated chunk recovery, and capacity distribution.
          </p>
        </div>

        {canManageNodes && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setAddNodeError(null);
                setIsAddNodeModalOpen(true);
              }}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Connect Remote Node (Pi)</span>
            </button>

            <button
              onClick={handleTriggerRepair}
              disabled={isRepairing}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-300 transition shadow-xs disabled:opacity-50"
            >
              <Wrench className={`w-4 h-4 text-slate-600 ${isRepairing ? "animate-spin" : ""}`} />
              <span>{isRepairing ? "Repairing..." : "Trigger Repair Scan"}</span>
            </button>
          </div>
        )}
      </div>

      {repairMsg && (
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold flex items-center space-x-2 shadow-xs">
          <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{repairMsg}</span>
        </div>
      )}

      {/* Cluster Health Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cluster Status</span>
          <p className="text-2xl font-black text-emerald-700">
            {health?.status || "HEALTHY"}
          </p>
          <span className="text-xs font-medium text-slate-600">
            {health?.live_nodes || nodes.filter((n) => n.state === "UP").length} / {nodes.length} nodes active
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Under-Replicated Chunks</span>
          <p
            className={`text-2xl font-black ${
              (health?.under_replicated_chunks || 0) > 0 ? "text-amber-700" : "text-emerald-700"
            }`}
          >
            {health?.under_replicated_chunks || 0}
          </p>
          <span className="text-xs font-medium text-slate-600">Target redundancy R=3</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Write Quorum Target</span>
          <p className="text-2xl font-black text-purple-700">W = 2 ACKs</p>
          <span className="text-xs font-medium text-slate-600">Strict consistency</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Draining Nodes</span>
          <p className="text-2xl font-black text-slate-800">
            {nodes.filter((n) => n.draining).length}
          </p>
          <span className="text-xs font-medium text-slate-600">Excluded from placements</span>
        </div>
      </div>

      {/* Storage Nodes List */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Registered Storage Nodes</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {nodes.map((node) => (
            <div
              key={node.id}
              className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 space-y-3 shadow-xs transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Server className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-slate-900 text-xs">{node.id}</span>
                </div>
                <span
                  className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border shadow-2xs ${
                    node.state === "UP"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : "bg-red-100 text-red-800 border-red-300"
                  }`}
                >
                  {node.state}
                </span>
              </div>

              <div className="space-y-1 text-xs text-slate-700 font-medium">
                <p className="text-[11px] text-slate-500 font-mono truncate">{node.endpoint}</p>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Stored Chunks:</span>
                  <span className="font-bold text-slate-900">{node.chunk_count}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Used Capacity:</span>
                  <span className="font-bold text-slate-900">{(node.used_bytes / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
              </div>

              {canManageNodes && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                  <button
                    onClick={() => handleDrain(node.id)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs text-slate-800 font-bold transition shadow-2xs"
                  >
                    {node.draining ? "Undrain" : "Drain Node"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Connect Remote Node (Raspberry Pi) Modal */}
      {isAddNodeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 overflow-hidden text-slate-900">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Connect Remote Storage Node</h3>
                  <p className="text-xs text-slate-600 font-medium">Add Raspberry Pi ARM64 or external hardware</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddNodeModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Banner */}
            {addNodeError && (
              <div className="mt-4 p-3 rounded-xl bg-red-100 border border-red-200 text-red-800 text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{addNodeError}</span>
              </div>
            )}

            {/* Quick Setup Hint */}
            <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700 space-y-1">
              <span className="font-bold text-slate-900 flex items-center space-x-1">
                <span>Raspberry Pi Command:</span>
              </span>
              <p className="font-mono text-[10px] text-blue-700 bg-white p-2 rounded-lg border border-slate-200 overflow-x-auto font-semibold">
                uvicorn storage.app.main:app --host 0.0.0.0 --port 7443
              </p>
            </div>

            <form onSubmit={handleRegisterNode} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Node ID</label>
                <input
                  type="text"
                  required
                  value={nodeIdInput}
                  onChange={(e) => setNodeIdInput(e.target.value)}
                  placeholder="e.g. storage-pi or storage-3"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 font-mono font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Endpoint URL (LAN IP)</label>
                <input
                  type="url"
                  required
                  value={nodeEndpointInput}
                  onChange={(e) => setNodeEndpointInput(e.target.value)}
                  placeholder="http://192.168.1.50:7443"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 font-mono font-medium"
                />
                <p className="text-[10px] text-slate-500 mt-1 font-medium">
                  Replace with your Raspberry Pi&apos;s Wi-Fi / Ethernet IP address.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Capacity (GB)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={nodeCapacityGbInput}
                  onChange={(e) => setNodeCapacityGbInput(+e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 font-mono font-medium"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddNodeModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNode}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/20 transition disabled:opacity-50"
                >
                  {isSubmittingNode ? "Registering..." : "Connect Node"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
