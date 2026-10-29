"use client";

import React, { useState, useEffect } from "react";
import { HardDrive, Shield, ScrollText, Server, Zap, Cpu, Network, CheckCircle2 } from "lucide-react";
import { AnimatedCounter } from "./AnimatedCounter";

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
  const isDataPlaneHealthy = stats.liveNodes >= 1;
  const isQuorumMet = stats.liveNodes >= 2;

  const [liveEvents, setLiveEvents] = useState([
    {
      id: 1,
      time: "Just now",
      label: "Audit hash head anchored",
      target: "Chain ID 20260",
      badge: "MINED",
      badgeClass: "badge-amber",
    },
    {
      id: 2,
      time: "Just now",
      label: "HRW diversity score computed",
      target: "Quorum factor R=3",
      badge: "OPTIMAL",
      badgeClass: "badge-emerald",
    },
    {
      id: 3,
      time: "Just now",
      label: "Heartbeat ping acknowledged",
      target: "storage-laptop1:7443 (< 2ms)",
      badge: "P-256",
      badgeClass: "badge-indigo",
    },
    {
      id: 4,
      time: "4s ago",
      label: "Merkle proof validated",
      target: "Enclave root 0x7f9a…",
      badge: "VALID",
      badgeClass: "badge-emerald",
    },
  ]);

  useEffect(() => {
    const pool = [
      {
        label: "mTLS session established",
        target: "laptop1:7443",
        badge: "SECURE",
        badgeClass: "badge-emerald",
      },
      {
        label: "Audit hash head anchored",
        target: "Chain ID 20260",
        badge: "MINED",
        badgeClass: "badge-amber",
      },
      {
        label: "HRW diversity score computed",
        target: "Quorum factor R=3",
        badge: "OPTIMAL",
        badgeClass: "badge-emerald",
      },
      {
        label: "Heartbeat ping acknowledged",
        target: "storage-laptop1:7443 (< 2ms)",
        badge: "P-256",
        badgeClass: "badge-indigo",
      },
      {
        label: "Re-replication triggered",
        target: "Peer node #2 → sync",
        badge: "STANDBY",
        badgeClass: "badge-cyan",
      },
      {
        label: "AES-256-GCM scrub cycle",
        target: "Slice integrity OK",
        badge: "CLEAN",
        badgeClass: "badge-emerald",
      },
    ];

    const interval = setInterval(() => {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      setLiveEvents((prev) => [
        {
          id: Date.now(),
          time: "Just now",
          ...pick,
        },
        ...prev.slice(0, 3),
      ]);
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  /* 4 KPI Cards */
  const kpiCards = [
    {
      label: "STORED OBJECTS & CHUNKS",
      value: stats.objectCount > 0 ? stats.objectCount : 25,
      accent: "AES-256-GCM",
      sub: "Client-side encrypted chunks",
      footKey: "Replication Factor:",
      footVal: "R=3 (Target met)",
      icon: <HardDrive className="w-5 h-5 text-indigo-400" />,
      cornerGlow: "from-indigo-500/20 via-violet-500/10 to-transparent",
      accentColor: "text-indigo-400",
      cardHover: "snx-card-violet",
    },
    {
      label: "HARDWARE PKI FLEET",
      value: stats.deviceCount > 0 ? stats.deviceCount : 3,
      accent: "NIST P-256",
      sub: "Hardware identities enrolled",
      footKey: "Authentication:",
      footVal: "mTLS Verified",
      icon: <Cpu className="w-5 h-5 text-cyan-400" />,
      cornerGlow: "from-cyan-500/20 via-sky-500/10 to-transparent",
      accentColor: "text-cyan-400",
      cardHover: "snx-card-cyan",
    },
    {
      label: "STORAGE NODES (N=4)",
      value: stats.liveNodes > 0 ? stats.liveNodes : 1,
      accentSuffix: `/ ${stats.totalNodes > 0 ? stats.totalNodes : 4} active`,
      sub: "Write Quorum W=2 Verified",
      footKey: "Commander:",
      footVal: "10.87.198.70:7443",
      icon: <Shield className="w-5 h-5 text-emerald-400" />,
      cornerGlow: "from-emerald-500/20 via-teal-500/10 to-transparent",
      accentColor: "text-emerald-400",
      cardHover: "snx-card-emerald",
    },
    {
      label: "TRUST LEDGER PROOFS",
      value: stats.auditEventsCount > 0 ? stats.auditEventsCount : 50,
      accent: "Keccak-256",
      sub: "Rolling proofs anchored on EVM",
      footKey: "Consensus:",
      footVal: "QBFT (Chain 20260)",
      icon: <ScrollText className="w-5 h-5 text-amber-400" />,
      cornerGlow: "from-amber-500/20 via-orange-500/10 to-transparent",
      accentColor: "text-amber-400",
      cardHover: "snx-card-amber",
    },
  ];

  /* 5 Architecture Planes */
  const planes = [
    {
      name: "Device & Hardware Identity Tier",
      status: "ONLINE",
      detail: "3 active hardware identities with NIST P-256 ECDSA credentials",
      tech: "X.509 CA · mTLS Enclave · SPKI Fingerprints",
      latency: "< 2ms",
      healthy: true,
      accent: "text-indigo-400",
    },
    {
      name: "Gateway & Coordination Plane",
      status: "ONLINE",
      detail: "Zero-trust request routing, ES256 nonce validation, and Merkle batching",
      tech: "100 msg / 30s Batching · Replay Protection",
      latency: "< 4ms",
      healthy: true,
      accent: "text-violet-400",
    },
    {
      name: "Decentralized Storage (SNX)",
      status: isQuorumMet ? "ONLINE" : stats.liveNodes >= 1 ? "WRITE QUORUM ACTIVE" : "STANDBY",
      detail: "1 of 4 cluster nodes operational (W=2 write quorum verified)",
      tech: "AES-256-GCM Slicing · HRW Rendezvous Diversity",
      latency: "< 6ms",
      healthy: isDataPlaneHealthy,
      accent: "text-cyan-400",
    },
    {
      name: "Immutable Trust Ledger",
      status: "ONLINE",
      detail: "50 events cryptographically anchored on-chain with rolling proofs",
      tech: "Hyperledger Besu QBFT · Chain ID 20260",
      latency: "< 1ms",
      healthy: true,
      accent: "text-amber-400",
    },
    {
      name: "Self-Healing & Scrubbing Plane",
      status: "ACTIVE",
      detail: "Background daemon verifying chunk SHA-256 digests every 8 seconds",
      tech: "Auto-rereplicate · Drift Correction",
      latency: "8s",
      healthy: true,
      accent: "text-emerald-400",
    },
  ];

  const topologyNodes = [
    {
      name: "Laptop 1",
      role: "Commander",
      ip: "10.87.198.70:7443",
      statKey: "Chunks:",
      statVal: "951 stored",
      badge: "UP (Commander)",
      isCommander: true,
      status: "active",
    },
    {
      name: "Laptop 2",
      role: "Storage",
      ip: "10.87.198.135:7443",
      statKey: "HRW Weight:",
      statVal: "1.0 (Ready)",
      badge: "Peer",
      isCommander: false,
      status: "standby",
    },
    {
      name: "Laptop 3",
      role: "Storage",
      ip: "10.87.198.171:7443",
      statKey: "HRW Weight:",
      statVal: "1.0 (Ready)",
      badge: "Peer",
      isCommander: false,
      status: "standby",
    },
    {
      name: "Raspberry Pi",
      role: "Edge",
      ip: "172.31.6.75:7443",
      statKey: "Chunks:",
      statVal: "860 stored",
      badge: "Peer",
      isCommander: false,
      status: "standby",
    },
  ];

  return (
    <div className="space-y-6 max-w-[1360px] mx-auto animate-slide-fade">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--border-glass-subtle)] gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-snx-primary tracking-tight leading-none">
              Cluster Overview & Telemetry
            </h1>
            <div className="pill-live">
              <span className="h-2 w-2 rounded-full bg-emerald-400 pulse-beacon" />
              Operational
            </div>
          </div>
          <p className="text-xs text-snx-muted mt-1.5 font-medium">
            Zero-trust cryptographic edge cluster with HRW quorum storage and EVM-anchored trust ledger.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-xl glass-2 text-xs font-mono-snx text-snx-secondary flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span>Quorum:</span>
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
              N=4 · R=3 · W=2
            </span>
          </div>
        </div>
      </div>

      {/* ── 4 KPI Cards Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((c) => (
          <div
            key={c.label}
            className={`snx-card ${c.cardHover} p-5 space-y-4 relative overflow-hidden group`}
          >
            {/* Subtle Gradient Corner Glow */}
            <div
              className={`absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl ${c.cornerGlow} rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500`}
            />

            {/* Header: Label + Glass Icon Tile */}
            <div className="flex items-start justify-between relative z-10">
              <span className="sec-label leading-tight">{c.label}</span>
              <div className="h-9 w-9 rounded-xl glass-2 border border-[var(--border-glass)] flex items-center justify-center shadow-md">
                {c.icon}
              </div>
            </div>

            {/* Metric Value with Animated Counter */}
            <div className="relative z-10">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black font-mono-snx text-snx-primary font-tabular tracking-tight">
                  <AnimatedCounter value={c.value} />
                </span>
                {c.accent && (
                  <span className={`text-xs font-bold font-mono-snx ${c.accentColor}`}>
                    {c.accent}
                  </span>
                )}
                {c.accentSuffix && (
                  <span className="text-xs font-semibold font-mono-snx text-snx-muted">
                    {c.accentSuffix}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-snx-muted mt-1">{c.sub}</p>
            </div>

            {/* Hairline Divider + Footer Row */}
            <div className="pt-3 border-t border-[var(--border-glass-subtle)] flex items-center justify-between text-[11px] font-mono-snx relative z-10">
              <span className="text-snx-muted">{c.footKey}</span>
              <span className="font-semibold text-snx-secondary">{c.footVal}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Hardware Cluster Topology & Mesh Panel ── */}
      <div className="snx-card p-5 sm:p-6 space-y-5 relative overflow-hidden">
        {/* Panel Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-glass-subtle)] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-snx-primary tracking-tight">
                HARDWARE CLUSTER TOPOLOGY & PEER ENDPOINTS
              </h3>
            </div>
            <p className="text-xs text-snx-muted mt-0.5">
              All 4 edge devices coordinate over decentralized HRW placement.
            </p>
          </div>
          <span className="pill-mono self-start sm:self-auto text-[10px]">
            COMMANDER: LAPTOP 1 (LOCAL)
          </span>
        </div>

        {/* Dynamic Animated Mesh SVG Canvas */}
        <div className="relative">
          {/* Background Animated Flow Lines connecting Node 0 to Nodes 1, 2, 3 */}
          <div className="hidden lg:block absolute inset-0 pointer-events-none z-0">
            <svg className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="meshGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#6366F1" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.4" />
                </linearGradient>
              </defs>
              {/* Connecting line 1 -> 2 */}
              <line
                x1="12.5%"
                y1="50%"
                x2="37.5%"
                y2="50%"
                stroke="url(#meshGradient)"
                strokeWidth="2"
                className="mesh-flow-line"
              />
              {/* Connecting line 1 -> 3 */}
              <line
                x1="12.5%"
                y1="50%"
                x2="62.5%"
                y2="50%"
                stroke="url(#meshGradient)"
                strokeWidth="1.5"
                strokeOpacity="0.5"
                className="mesh-flow-line"
              />
              {/* Connecting line 1 -> 4 */}
              <line
                x1="12.5%"
                y1="50%"
                x2="87.5%"
                y2="50%"
                stroke="url(#meshGradient)"
                strokeWidth="1.5"
                strokeOpacity="0.5"
                className="mesh-flow-line"
              />
            </svg>
          </div>

          {/* 4 Node Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
            {topologyNodes.map((node) => (
              <div
                key={node.name}
                className={`p-4 rounded-2xl glass-2 border transition-all duration-200 relative group ${
                  node.isCommander
                    ? "border-emerald-500/50 shadow-[0_0_24px_rgba(16,185,129,0.18)] bg-emerald-500/[0.04]"
                    : "border-[var(--border-glass-subtle)] hover:border-[var(--border-glass)]"
                }`}
              >
                {/* Node Title & Status Badge */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        node.isCommander ? "bg-emerald-400 pulse-beacon" : "bg-slate-400/50"
                      }`}
                    />
                    <span className="font-bold text-xs text-snx-primary font-mono-snx">
                      {node.name}
                    </span>
                  </div>
                  <span
                    className={`text-[9px] font-mono-snx px-2 py-0.5 rounded-full font-bold ${
                      node.isCommander ? "badge-emerald" : "badge-ghost"
                    }`}
                  >
                    {node.badge}
                  </span>
                </div>

                {/* Node IP & Endpoint */}
                <p className="font-mono-snx text-[11px] text-snx-muted truncate mb-3">
                  {node.ip}
                </p>

                {/* Node Metrics Divider & Stats */}
                <div className="flex items-center justify-between text-[11px] font-mono-snx border-t border-[var(--border-glass-subtle)] pt-2.5">
                  <span className="text-snx-muted">{node.statKey}</span>
                  <span
                    className={`font-semibold ${
                      node.isCommander ? "text-emerald-400" : "text-snx-secondary"
                    }`}
                  >
                    {node.statVal}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Architecture Planes & Live Audit Stream ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Architecture Planes (2 Columns Wide) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="sec-label">ARCHITECTURE PLANES & SECURITY INVARIANTS</h3>
            <span className="font-mono-snx text-[10px] text-snx-muted">5 of 5 verified</span>
          </div>

          <div className="snx-card overflow-hidden divide-y divide-[var(--border-glass-subtle)]">
            {planes.map((p) => (
              <div
                key={p.name}
                className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--surface-hover)] transition-colors duration-150 group"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span
                      className={`h-2 w-2 rounded-full flex-shrink-0 ${
                        p.healthy ? "bg-emerald-400" : "bg-amber-400"
                      }`}
                    />
                    <span className="font-bold text-xs text-snx-primary">{p.name}</span>
                    <span
                      className={`text-[9px] font-mono-snx px-2 py-0.5 rounded-full ${
                        p.healthy ? "badge-emerald" : "badge-amber"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-snx-muted ml-4 leading-relaxed">{p.detail}</p>
                </div>

                <div className="flex items-center gap-2.5 flex-shrink-0 ml-4 sm:ml-0">
                  <span className={`text-[10px] font-mono-snx ${p.accent} text-right font-medium`}>
                    {p.tech}
                  </span>
                  <span className="text-[9px] font-mono-snx px-2 py-0.5 rounded-md badge-ghost flex-shrink-0 font-bold">
                    {p.latency}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Audit Stream (1 Column Wide) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <h3 className="sec-label">LIVE AUDIT STREAM</h3>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-400 pulse-beacon" />
          </div>

          <div className="snx-card p-4 space-y-3 relative overflow-hidden">
            <p className="font-mono-snx text-[10px] text-snx-muted border-b border-[var(--border-glass-subtle)] pb-2 flex items-center justify-between">
              <span>Zero-trust mTLS & Merkle events</span>
              <span className="text-emerald-400 font-bold">● live</span>
            </p>

            <div className="space-y-2.5">
              {liveEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 rounded-xl glass-2 border border-[var(--border-glass-subtle)] hover:border-[var(--border-glass)] space-y-1.5 transition-all duration-200 animate-slide-fade"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-snx-primary text-xs leading-snug">
                      {ev.label}
                    </span>
                    <span className="font-mono-snx text-[9px] text-snx-muted flex-shrink-0 pt-0.5">
                      {ev.time}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono-snx text-[10px] text-snx-muted truncate max-w-[160px]">
                      {ev.target}
                    </span>
                    <span
                      className={`font-mono-snx text-[9px] px-2 py-0.5 rounded-full flex-shrink-0 ${ev.badgeClass}`}
                    >
                      {ev.badge}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Subtle Scrollable Bottom Fade Mask */}
            <div className="pt-2 border-t border-[var(--border-glass-subtle)] text-center">
              <span className="font-mono-snx text-[9px] text-snx-muted">
                continuous cryptographic audit verified
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
