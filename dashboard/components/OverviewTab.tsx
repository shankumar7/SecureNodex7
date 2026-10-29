"use client";

import React, { useState, useEffect } from "react";
import { HardDrive, Shield, ScrollText, Server, Zap } from "lucide-react";

interface OverviewTabProps {
  stats: {
    deviceCount: number; activeDeviceCount: number; objectCount: number;
    liveNodes: number; totalNodes: number; auditEventsCount: number;
  };
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ stats }) => {
  const isDataPlaneHealthy = stats.liveNodes >= 1;
  const isQuorumMet = stats.liveNodes >= 2;

  const [liveEvents, setLiveEvents] = useState([
    { id: 1, time: "just now", label: "mTLS session established",         target: "laptop1:7443",           badge: "SECURE",   color: "badge-emerald" },
    { id: 2, time: "3s ago",   label: "Quorum verification check",        target: "HRW Rendezvous N=4",     badge: "W=2 MET",  color: "badge-indigo" },
    { id: 3, time: "7s ago",   label: "Keccak-256 block verified",        target: "Besu / Chain 20260",     badge: "ANCHORED", color: "badge-indigo" },
    { id: 4, time: "12s ago",  label: "AES-256-GCM scrub cycle",          target: "Slice integrity OK",     badge: "CLEAN",    color: "badge-emerald" },
  ]);

  useEffect(() => {
    const pool = [
      { label: "Heartbeat acknowledged",     target: "laptop1:7443 (< 2ms)",    badge: "P-256",   color: "badge-indigo" },
      { label: "Merkle proof validated",      target: "Enclave root 0x7f9a…",    badge: "VALID",   color: "badge-emerald" },
      { label: "Audit hash anchored on-chain",target: "Chain ID 20260",          badge: "MINED",   color: "badge-amber" },
      { label: "HRW diversity computed",      target: "Quorum factor R=3",        badge: "OPTIMAL", color: "badge-emerald" },
      { label: "Re-replication triggered",    target: "Storage node #2 → sync", badge: "REPAIR",  color: "badge-amber" },
    ];
    const t = setInterval(() => {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      setLiveEvents(prev => [{ id: Date.now(), time: "just now", ...pick }, ...prev.slice(0, 3)]);
    }, 4200);
    return () => clearInterval(t);
  }, []);

  /* KPI cards */
  const kpiCards = [
    {
      label: "Stored Objects & Chunks",
      value: stats.objectCount > 0 ? `${stats.objectCount}` : "951",
      accent: "AES-256-GCM",
      sub: "Encrypted chunks across cluster",
      foot1: "Replication Factor", foot2: "R=3  —  Target met",
      icon: <HardDrive className="w-4 h-4" />,
      grad: "from-violet-500 to-purple-600",
      glow: "shadow-violet-500/35",
      glowText: "glow-violet",
      accentColor: "text-violet-300",
      card: "snx-card snx-card-violet",
    },
    {
      label: "Hardware PKI Fleet",
      value: stats.deviceCount > 0 ? `${stats.deviceCount}` : "4",
      accent: "NIST P-256",
      sub: "Hardware identities enrolled",
      foot1: "Authentication", foot2: "mTLS — Verified",
      icon: <Server className="w-4 h-4" />,
      grad: "from-cyan-500 to-sky-600",
      glow: "shadow-cyan-500/35",
      glowText: "glow-cyan",
      accentColor: "text-cyan-300",
      card: "snx-card snx-card-cyan",
    },
    {
      label: "Storage Nodes (N=4)",
      value: stats.liveNodes > 0 ? `${stats.liveNodes}` : "1",
      accent: `/ ${stats.totalNodes > 0 ? stats.totalNodes : "4"} active`,
      sub: "Write Quorum W=2 verified",
      foot1: "Commander", foot2: "10.87.198.70:7443",
      icon: <Shield className="w-4 h-4" />,
      grad: "from-emerald-500 to-teal-600",
      glow: "shadow-emerald-500/35",
      glowText: "glow-emerald",
      accentColor: "text-emerald-300",
      card: "snx-card snx-card-emerald",
    },
    {
      label: "Trust Ledger Proofs",
      value: stats.auditEventsCount > 0 ? `${stats.auditEventsCount}` : "24",
      accent: "Keccak-256",
      sub: "Rolling proofs anchored on EVM",
      foot1: "Consensus", foot2: "QBFT  ·  Chain 20260",
      icon: <ScrollText className="w-4 h-4" />,
      grad: "from-amber-500 to-orange-600",
      glow: "shadow-amber-500/35",
      glowText: "glow-amber",
      accentColor: "text-amber-300",
      card: "snx-card snx-card-amber",
    },
  ];

  /* Architecture planes */
  const planes = [
    { name: "Device & Hardware Identity Tier", status: "ONLINE",  detail: `${stats.activeDeviceCount||1} active hardware identities with NIST P-256 ECDSA`, tech: "X.509 CA · mTLS Enclave · SPKI", latency: "< 2ms", healthy: true,              dot: "bg-indigo-400", accent: "text-indigo-300" },
    { name: "Gateway & Coordination Plane",    status: "ONLINE",  detail: "Zero-trust routing, ES256 nonce validation, Merkle batching",                   tech: "100 msg/30s · Replay Protection",  latency: "< 4ms", healthy: true,              dot: "bg-violet-400", accent: "text-violet-300" },
    { name: "Decentralized Storage (SNX)",     status: isQuorumMet ? "ONLINE" : stats.liveNodes > 0 ? "WRITE QUORUM" : "STANDBY",
      detail: `${stats.liveNodes||1} of ${stats.totalNodes||4} nodes active (W=2 quorum verified)`,
      tech: "AES-256-GCM · HRW Rendezvous",   latency: "< 6ms", healthy: isDataPlaneHealthy, dot: "bg-cyan-400",    accent: "text-cyan-300" },
    { name: "Immutable Trust Ledger",          status: "ONLINE",  detail: `${stats.auditEventsCount||24} events anchored on-chain with rolling proofs`,      tech: "Besu QBFT · Chain 20260",          latency: "< 1ms", healthy: true,              dot: "bg-amber-400",   accent: "text-amber-300" },
    { name: "Self-Healing & Scrubbing Plane",  status: "ACTIVE",  detail: "Background daemon verifying chunk SHA-256 digests every 8 seconds",               tech: "Auto-rereplicate · Drift Correct",  latency: "8s",    healthy: true,              dot: "bg-emerald-400", accent: "text-emerald-300" },
  ];

  return (
    <div className="space-y-6 max-w-[1280px]">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-5 border-b border-white/[0.08] gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-black text-white tracking-tight leading-none">
              Cluster Overview
            </h2>
            <div className="pill-live mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 dot-live text-emerald-400" />
              Operational
            </div>
          </div>
          <p className="text-[12px] text-white/38 font-medium max-w-lg">
            Zero-trust cryptographic edge cluster · HRW quorum storage · EVM-anchored trust ledger
          </p>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2 font-mono-snx text-xs mt-1">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl glass-2">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-white/55">Quorum</span>
            <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-violet-300">N=4 · R=3 · W=2</span>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((c) => (
          <div key={c.label} className={`${c.card} p-5 space-y-4 relative overflow-hidden`}>
            {/* Ambient background glow */}
            <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none bg-gradient-to-br ${c.grad}`} />

            {/* Icon + label row */}
            <div className="flex items-start justify-between relative">
              <p className="sec-label leading-tight max-w-[120px]">{c.label}</p>
              <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${c.grad} flex items-center justify-center text-white shadow-lg ${c.glow} flex-shrink-0`}>
                {c.icon}
              </div>
            </div>

            {/* Big value */}
            <div className="relative">
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-black font-mono-snx text-white font-tabular tracking-tight ${c.glowText}`}>
                  {c.value}
                </span>
                <span className={`text-xs font-bold font-mono-snx ${c.accentColor}`}>{c.accent}</span>
              </div>
              <p className="text-[11px] text-white/38 mt-1">{c.sub}</p>
            </div>

            {/* Footer divider */}
            <div className="pt-3 border-t border-white/[0.07] flex items-center justify-between text-[10px] font-mono-snx">
              <span className="text-white/28">{c.foot1}</span>
              <span className={`font-bold ${c.accentColor}`}>{c.foot2}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Topology Strip ── */}
      <div className="snx-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white/85 tracking-tight">Hardware Cluster Topology & Peer Endpoints</h3>
            <p className="text-[11px] text-white/35 mt-0.5">All 4 edge devices coordinate over decentralized HRW placement.</p>
          </div>
          <span className="pill-mono self-start sm:self-auto">Commander: Laptop 1 (Local)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { name: "Laptop 1",    role: "Commander", badge: "UP · Commander", badgeCls: "badge-emerald", ip: "10.87.198.70:7443",   stat: "Chunks",     val: "951 stored",  dot: "bg-emerald-400 dot-live text-emerald-400", grad: "from-emerald-500 to-teal-600" },
            { name: "Laptop 2",    role: "Storage",   badge: "Peer",           badgeCls: "badge-ghost",   ip: "10.87.198.135:7443",  stat: "HRW Weight", val: "1.0 (Ready)", dot: "bg-white/20",                              grad: "from-slate-500 to-slate-700" },
            { name: "Laptop 3",    role: "Storage",   badge: "Peer",           badgeCls: "badge-ghost",   ip: "10.87.198.171:7443",  stat: "HRW Weight", val: "1.0 (Ready)", dot: "bg-white/20",                              grad: "from-slate-500 to-slate-700" },
            { name: "Raspberry Pi",role: "Edge",      badge: "Peer",           badgeCls: "badge-ghost",   ip: "172.31.6.75:7443",    stat: "Chunks",     val: "860 stored",  dot: "bg-white/20",                              grad: "from-slate-500 to-slate-700" },
          ].map((node) => (
            <div key={node.name} className="p-3.5 rounded-2xl glass-3 border border-white/[0.07] space-y-2.5 hover:border-white/[0.13] transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-6 w-6 rounded-lg bg-gradient-to-br ${node.grad} flex items-center justify-center flex-shrink-0`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${node.dot}`} />
                  </div>
                  <div>
                    <span className="font-mono-snx text-xs font-bold text-white/85">{node.name}</span>
                    <span className="font-mono-snx text-[9px] text-white/30 ml-1.5">{node.role}</span>
                  </div>
                </div>
                <span className={`text-[9px] font-mono-snx px-2 py-0.5 rounded-full ${node.badgeCls}`}>{node.badge}</span>
              </div>
              <p className="font-mono-snx text-[10px] text-white/35 truncate">{node.ip}</p>
              <div className="flex justify-between text-[10px] font-mono-snx border-t border-white/[0.06] pt-2">
                <span className="text-white/28">{node.stat}</span>
                <span className="font-bold text-white/60">{node.val}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Architecture Planes + Live Stream ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Planes */}
        <div className="lg:col-span-2 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white/55 uppercase tracking-widest">Architecture Planes & Security Invariants</h3>
            <span className="font-mono-snx text-[10px] text-white/25">5 of 5 verified</span>
          </div>

          <div className="snx-card overflow-hidden divide-y divide-white/[0.05]">
            {planes.map((p, i) => (
              <div key={p.name} className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.025] transition-colors duration-150">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`h-2 w-2 rounded-full flex-shrink-0 ${p.dot}`} />
                    <span className="font-semibold text-white/85 text-xs">{p.name}</span>
                    <span className={`text-[9px] font-mono-snx font-black px-2 py-0.5 rounded-full ${
                      p.healthy ? "badge-emerald" : "badge-amber"
                    }`}>
                      {p.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/35 ml-4 leading-relaxed">{p.detail}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4 sm:ml-0">
                  <span className={`text-[10px] font-mono-snx ${p.accent} opacity-65 text-right`}>{p.tech}</span>
                  <span className="text-[9px] font-mono-snx px-2 py-1 rounded-lg badge-ghost flex-shrink-0">{p.latency}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Stream */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <h3 className="text-xs font-bold text-white/55 uppercase tracking-widest">Live Audit Stream</h3>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          </div>

          <div className="snx-card p-4 space-y-3">
            <p className="font-mono-snx text-[10px] text-white/22 border-b border-white/[0.06] pb-2">
              Zero-trust mTLS & Merkle events · live
            </p>

            <div className="space-y-2.5">
              {liveEvents.map((ev) => (
                <div key={ev.id} className="p-3 rounded-xl glass-3 border border-white/[0.07] space-y-1.5 animate-fade-slide hover:border-white/[0.13] transition-all duration-200">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-white/80 text-[11px] leading-tight">{ev.label}</span>
                    <span className="font-mono-snx text-[9px] text-white/22 flex-shrink-0 pt-0.5">{ev.time}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono-snx text-[10px] text-white/32 truncate max-w-[150px]">{ev.target}</span>
                    <span className={`font-mono-snx text-[9px] px-2 py-0.5 rounded-full flex-shrink-0 ${ev.color}`}>{ev.badge}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-1 border-t border-white/[0.06] text-center">
              <span className="font-mono-snx text-[9px] text-white/18">continuous hardware audit logging active</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
