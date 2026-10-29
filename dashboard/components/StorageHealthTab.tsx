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
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <span>Storage Cluster Health & Self-Healing</span>
          </h2>
          <p className="text-xs text-gray-400">
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
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/25 border border-blue-400/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Connect Remote Node (Pi)</span>
            </button>

            <button
              onClick={handleTriggerRepair}
              disabled={isRepairing}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold border border-gray-700 transition disabled:opacity-50"
            >
              <Wrench className={`w-4 h-4 ${isRepairing ? "animate-spin" : ""}`} />
              <span>{isRepairing ? "Repairing..." : "Trigger Repair Scan"}</span>
            </button>
          </div>
        )}
      </div>

      {repairMsg && (
        <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-800/40 text-blue-300 text-xs flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-blue-400 shrink-0" />
          <span>{repairMsg}</span>
        </div>
      )}

      {/* Cluster Health Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-800 space-y-1">
          <span className="text-xs text-gray-400">Cluster Status</span>
          <p className="text-xl font-bold text-emerald-400">
            {health?.status || "HEALTHY"}
          </p>
          <span className="text-[11px] text-gray-500">
            {health?.live_nodes || nodes.filter((n) => n.state === "UP").length} / {nodes.length} nodes active
          </span>
        </div>

        <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-800 space-y-1">
          <span className="text-xs text-gray-400">Under-Replicated Chunks</span>
          <p
            className={`text-xl font-bold ${
              (health?.under_replicated_chunks || 0) > 0 ? "text-yellow-400" : "text-emerald-400"
            }`}
          >
            {health?.under_replicated_chunks || 0}
          </p>
          <span className="text-[11px] text-gray-500">Target redundancy R=3</span>
        </div>

        <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-800 space-y-1">
          <span className="text-xs text-gray-400">Write Quorum Target</span>
          <p className="text-xl font-bold text-purple-400">W = 2 ACKs</p>
          <span className="text-[11px] text-gray-500">Strict consistency</span>
        </div>

        <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-800 space-y-1">
          <span className="text-xs text-gray-400">Draining Nodes</span>
          <p className="text-xl font-bold text-gray-300">
            {nodes.filter((n) => n.draining).length}
          </p>
          <span className="text-[11px] text-gray-500">Excluded from placements</span>
        </div>
      </div>

      {/* Storage Nodes List */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white">Registered Storage Nodes</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {nodes.map((node) => (
            <div
              key={node.id}
              className="p-4 rounded-xl bg-gray-900/40 border border-gray-800 hover:border-gray-700 space-y-3 transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Server className="w-4 h-4 text-blue-400" />
                  <span className="font-semibold text-white text-xs">{node.id}</span>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    node.state === "UP"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-red-500/10 text-red-400 border-red-500/30"
                  }`}
                >
                  {node.state}
                </span>
              </div>

              <div className="space-y-1 text-xs text-gray-300">
                <p className="text-[11px] text-gray-500 font-mono truncate">{node.endpoint}</p>
                <div className="flex justify-between text-[11px]">
                  <span className="text-gray-500">Stored Chunks:</span>
                  <span className="font-semibold">{node.chunk_count}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-gray-500">Used Capacity:</span>
                  <span>{(node.used_bytes / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
              </div>

              {canManageNodes && (
                <div className="pt-2 border-t border-gray-800 flex items-center justify-end">
                  <button
                    onClick={() => handleDrain(node.id)}
                    className="px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Connect Remote Storage Node</h3>
                  <p className="text-xs text-gray-400">Add Raspberry Pi ARM64 or external hardware</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddNodeModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Banner */}
            {addNodeError && (
              <div className="mt-4 p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{addNodeError}</span>
              </div>
            )}

            {/* Quick Setup Hint */}
            <div className="mt-4 p-3 rounded-xl bg-gray-950/80 border border-gray-800/80 text-[11px] text-gray-400 space-y-1">
              <span className="font-semibold text-gray-200 flex items-center space-x-1">
                <span>Raspberry Pi Command:</span>
              </span>
              <p className="font-mono text-[10px] text-blue-400 bg-gray-900 p-1.5 rounded border border-gray-800 overflow-x-auto">
                uvicorn storage.app.main:app --host 0.0.0.0 --port 7443
              </p>
            </div>

            <form onSubmit={handleRegisterNode} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-gray-300 mb-1.5">Node ID</label>
                <input
                  type="text"
                  required
                  value={nodeIdInput}
                  onChange={(e) => setNodeIdInput(e.target.value)}
                  placeholder="e.g. storage-pi or storage-3"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-300 mb-1.5">Endpoint URL (LAN IP)</label>
                <input
                  type="url"
                  required
                  value={nodeEndpointInput}
                  onChange={(e) => setNodeEndpointInput(e.target.value)}
                  placeholder="http://192.168.1.50:7443"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Replace with your Raspberry Pi&apos;s Wi-Fi / Ethernet IP address.
                </p>
              </div>

              <div>
                <label className="block font-medium text-gray-300 mb-1.5">Capacity (GB)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={nodeCapacityGbInput}
                  onChange={(e) => setNodeCapacityGbInput(+e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsAddNodeModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNode}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium shadow-lg shadow-blue-500/25 transition disabled:opacity-50"
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
