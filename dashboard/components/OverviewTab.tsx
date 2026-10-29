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
    { name: "Device Plane", status: "ONLINE", desc: `${stats.activeDeviceCount}/${stats.deviceCount} ESP32 / Virtual Nodes (mTLS P-256)`, badge: "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold" },
    { name: "Gateway Plane", status: "ONLINE", desc: "snx-broker & snx-gateway (100 msg/30s batching)", badge: "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold" },
    { name: "Control Plane", status: "ONLINE", desc: "snx-api, snx-worker, snx-ca, PostgreSQL", badge: "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold" },
    {
      name: "Data Plane",
      status: !isDataPlaneHealthy ? "CRITICAL" : isAllNodesUp ? "ONLINE" : "DEGRADED",
      desc: `SNX-Store (${stats.liveNodes}/${stats.totalNodes} nodes, W=2 Quorum ${isDataPlaneHealthy ? "met" : "failed"})`,
      badge: !isDataPlaneHealthy
        ? "bg-red-100 text-red-800 border-red-300 font-bold"
        : isAllNodesUp
        ? "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold"
        : "bg-amber-100 text-amber-800 border-amber-300 font-bold",
    },
    { name: "Trust Plane", status: "ONLINE", desc: "Besu / Hardhat (ID: 20260) & Rolling Hash Chain", badge: "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 shadow-xs relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-100 border border-blue-300 text-blue-800 text-xs font-bold">
            <Shield className="w-3.5 h-3.5 text-blue-700" />
            <span>Zero-Trust Decentralized IoT Architecture</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            SecureNodeX Control & Trust Dashboard
          </h2>
          <p className="text-xs text-slate-700 max-w-3xl leading-relaxed font-medium">
            NIST P-256 ECC identity layer, AES-256-GCM split and replicated object storage with ECIES key-wrapping,
            and tamper-evident rolling audit hash chain anchored to smart contracts.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Provisioned Devices</span>
            <Cpu className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{stats.deviceCount}</p>
          <span className="text-[11px] font-bold text-emerald-700 flex items-center space-x-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>{stats.activeDeviceCount} active identities</span>
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Decentralized Objects</span>
            <HardDrive className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{stats.objectCount}</p>
          <span className="text-[11px] text-slate-600 font-semibold">R=3 HRW rendezvous placement</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Storage Nodes</span>
            <Database className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">
            {stats.liveNodes} / {stats.totalNodes}
          </p>
          <span
            className={`text-[11px] font-bold flex items-center space-x-1 ${
              stats.liveNodes >= 2 ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {stats.liveNodes >= 2 ? (
              <span>Quorum W=2 satisfied</span>
            ) : (
              <span>QUORUM VIOLATED (W=2 degraded)</span>
            )}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Audit Chain Events</span>
            <Shield className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{stats.auditEventsCount}</p>
          <span className="text-[11px] text-amber-800 font-bold">Keccak-256 rolling chain</span>
        </div>
      </div>

      {/* Planes Overview */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">5-Plane Architecture Status</h3>
          <span
            className={`text-xs font-mono font-black ${
              isClusterHealthy
                ? "text-emerald-700"
                : !isDataPlaneHealthy
                ? "text-red-700 animate-pulse"
                : "text-amber-700"
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
            <div key={p.name} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">{p.name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border shadow-2xs ${p.badge}`}>{p.status}</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-tight font-medium">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
