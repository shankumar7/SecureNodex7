"use client";

import React from "react";
import { Cpu, HardDrive, Radio, Shield, Coins, CheckCircle, Database } from "lucide-react";

interface OverviewTabProps {
  stats: {
    deviceCount: number;
    activeDeviceCount: number;
    objectCount: number;
    liveNodes: number;
    totalNodes: number;
    auditEventsCount: number;
  };
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ stats }) => {
  const isDataPlaneHealthy = stats.liveNodes >= 2;
  const isAllNodesUp = stats.liveNodes === stats.totalNodes && stats.totalNodes > 0;
  const isClusterHealthy = isDataPlaneHealthy && isAllNodesUp;

  const planes = [
    { name: "Device Plane", status: "ONLINE", desc: `${stats.activeDeviceCount}/${stats.deviceCount} ESP32 / Virtual Nodes (mTLS P-256)`, badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    { name: "Gateway Plane", status: "ONLINE", desc: "snx-broker & snx-gateway (100 msg/30s batching)", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    { name: "Control Plane", status: "ONLINE", desc: "snx-api, snx-worker, snx-ca, PostgreSQL", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    {
      name: "Data Plane",
      status: !isDataPlaneHealthy ? "CRITICAL" : isAllNodesUp ? "ONLINE" : "DEGRADED",
      desc: `SNX-Store (${stats.liveNodes}/${stats.totalNodes} nodes, W=2 Quorum ${isDataPlaneHealthy ? "met" : "failed"})`,
      badge: !isDataPlaneHealthy
        ? "bg-red-500/10 text-red-400 border-red-500/20"
        : isAllNodesUp
        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    },
    { name: "Trust Plane", status: "ONLINE", desc: "Besu / Hardhat (ID: 20260) & Rolling Hash Chain", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-900/30 via-indigo-900/20 to-purple-900/30 border border-blue-800/40 relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-medium">
            <Shield className="w-3.5 h-3.5" />
            <span>Zero-Trust Decentralized IoT Architecture</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            SecureNodeX Control & Trust Dashboard
          </h2>
          <p className="text-xs text-gray-300 max-w-3xl leading-relaxed">
            NIST P-256 ECC identity layer, AES-256-GCM split and replicated object storage with ECIES key-wrapping,
            and tamper-evident rolling audit hash chain anchored to smart contracts.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-800 space-y-1">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>Provisioned Devices</span>
            <Cpu className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.deviceCount}</p>
          <span className="text-[11px] text-emerald-400 flex items-center space-x-1">
            <CheckCircle className="w-3 h-3" />
            <span>{stats.activeDeviceCount} active identities</span>
          </span>
        </div>

        <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-800 space-y-1">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>Decentralized Objects</span>
            <HardDrive className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.objectCount}</p>
          <span className="text-[11px] text-gray-400">R=3 HRW rendezvous placement</span>
        </div>

        <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-800 space-y-1">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>Storage Nodes</span>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {stats.liveNodes} / {stats.totalNodes}
          </p>
          <span
            className={`text-[11px] font-medium flex items-center space-x-1 ${
              stats.liveNodes >= 2 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {stats.liveNodes >= 2 ? (
              <span>Quorum W=2 satisfied</span>
            ) : (
              <span>QUORUM VIOLATED (W=2 degraded)</span>
            )}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-800 space-y-1">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>Audit Chain Events</span>
            <Shield className="w-4 h-4 text-yellow-400" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.auditEventsCount}</p>
          <span className="text-[11px] text-yellow-400">Keccak-256 rolling chain</span>
        </div>
      </div>

      {/* Planes Overview */}
      <div className="p-5 rounded-xl bg-gray-900/40 border border-gray-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">5-Plane Architecture Status</h3>
          <span
            className={`text-xs font-mono font-medium ${
              isClusterHealthy
                ? "text-emerald-400"
                : !isDataPlaneHealthy
                ? "text-red-400 animate-pulse"
                : "text-yellow-400"
            }`}
          >
            {isClusterHealthy
              ? "100% OPERATIONAL"
              : !isDataPlaneHealthy
              ? "QUORUM FAILED"
              : "DEGRADED (FAILOVER ACTIVE)"}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {planes.map((p) => (
            <div key={p.name} className="p-3.5 rounded-xl bg-gray-950/60 border border-gray-800/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-200">{p.name}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${p.badge}`}>{p.status}</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-tight">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
