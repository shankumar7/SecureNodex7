"use client";

import React, { useState } from "react";
import { ClusterHealth, StorageNode } from "../lib/types";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { Activity, Wrench, ShieldAlert, CheckCircle, Database, Server, RefreshCw } from "lucide-react";

interface StorageHealthTabProps {
  health: ClusterHealth | null;
  nodes: StorageNode[];
  onRefresh: () => void;
}

export const StorageHealthTab: React.FC<StorageHealthTabProps> = ({ health, nodes, onRefresh }) => {
  const { hasPermission } = useAuth();
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairMsg, setRepairMsg] = useState<string | null>(null);

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
          <button
            onClick={handleTriggerRepair}
            disabled={isRepairing}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition disabled:opacity-50"
          >
            <Wrench className={`w-4 h-4 ${isRepairing ? "animate-spin" : ""}`} />
            <span>{isRepairing ? "Scanning & Repairing..." : "Trigger Repair Scan"}</span>
          </button>
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
    </div>
  );
};
