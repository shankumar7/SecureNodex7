"use client";

import React from "react";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard, Cpu, Radio, HardDrive,
  Coins, ScrollText, Users, Server, Network, Wifi,
} from "lucide-react";

export type TabKey =
  | "overview" | "devices" | "telemetry" | "objects"
  | "storage" | "assets" | "audit" | "principals";

interface SidebarProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
}

const sections: {
  title: string;
  items: { key: TabKey; label: string; icon: React.ReactNode; badge?: string; iconGrad: string; iconGlow: string; permission?: string; }[];
}[] = [
  {
    title: "Core Platform",
    items: [
      { key: "overview",  label: "Cluster Overview", icon: <LayoutDashboard className="w-3.5 h-3.5" />, iconGrad: "from-indigo-500 to-violet-600",   iconGlow: "shadow-indigo-500/40" },
      { key: "telemetry", label: "Live Telemetry",   icon: <Radio className="w-3.5 h-3.5" />,           badge: "Live", iconGrad: "from-emerald-500 to-teal-600",   iconGlow: "shadow-emerald-500/40" },
      { key: "storage",   label: "Storage & Nodes",  icon: <Server className="w-3.5 h-3.5" />,          badge: "N=4",  iconGrad: "from-cyan-500 to-sky-600",       iconGlow: "shadow-cyan-500/40",   permission: "storage:health_read" },
      { key: "audit",     label: "Audit Ledger",     icon: <ScrollText className="w-3.5 h-3.5" />,                    iconGrad: "from-amber-500 to-orange-600",    iconGlow: "shadow-amber-500/40",  permission: "audit:read" },
    ],
  },
  {
    title: "Security & Ops",
    items: [
      { key: "devices",    label: "Devices & PKI",     icon: <Cpu className="w-3.5 h-3.5" />,      iconGrad: "from-blue-500 to-indigo-600",   iconGlow: "shadow-blue-500/40",   permission: "device:read" },
      { key: "objects",    label: "Decentralized Data", icon: <HardDrive className="w-3.5 h-3.5" />, iconGrad: "from-violet-500 to-purple-600", iconGlow: "shadow-violet-500/40", permission: "object:read_metadata" },
      { key: "assets",     label: "Digital Assets",    icon: <Coins className="w-3.5 h-3.5" />,     iconGrad: "from-amber-400 to-orange-500",  iconGlow: "shadow-amber-400/40",  permission: "asset:read" },
      { key: "principals", label: "Access & RBAC",     icon: <Users className="w-3.5 h-3.5" />,     iconGrad: "from-slate-400 to-slate-600",   iconGlow: "shadow-slate-400/30",  permission: "principal:read" },
    ],
  },
];

const NODES = [
  { name: "Laptop 1", role: "Commander", ip: "10.87.198.70",  live: true },
  { name: "Laptop 2", role: "Storage",   ip: "10.87.198.135", live: false },
  { name: "Laptop 3", role: "Storage",   ip: "10.87.198.171", live: false },
  { name: "Pi 4B",    role: "Edge",      ip: "172.31.6.75",   live: false },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const { hasPermission } = useAuth();

  return (
    <aside className="w-62 border-r border-white/[0.09] glass-1 flex flex-col justify-between shrink-0" style={{width: '248px'}}>
      <div className="p-3 space-y-5 flex-1 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="sec-label px-2 mb-2">{section.title}</p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => onSelectTab(item.key)}
                    className={`w-full flex items-center justify-between px-2.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 group ${
                      isActive ? "nav-active" : "text-white/42 hover:text-white/80 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {/* Gradient icon housing */}
                      <div className={`h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                        isActive
                          ? `bg-gradient-to-br ${item.iconGrad} text-white shadow-lg ${item.iconGlow}`
                          : "bg-white/[0.07] text-white/45 group-hover:bg-white/[0.10] group-hover:text-white/70"
                      }`}>
                        {item.icon}
                      </div>
                      <span className={`font-semibold ${isActive ? "text-white" : ""}`}>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[9px] font-mono-snx px-1.5 py-0.5 rounded-full font-bold ${
                        isActive
                          ? "bg-white/15 text-white"
                          : item.badge === "Live"
                          ? "badge-emerald rounded-full px-2"
                          : "badge-ghost rounded-full px-2"
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── Edge Cluster Mesh Card ── */}
      <div className="p-3">
        <div className="p-3.5 rounded-2xl glass-2 border border-white/[0.09] space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-white/80 font-bold text-[11px]">
              <div className="h-5 w-5 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/40">
                <Network className="w-2.5 h-2.5 text-white" />
              </div>
              Edge Cluster Mesh
            </div>
            <span className="badge-emerald text-[9px] font-mono-snx px-2 py-0.5 rounded-full">N=4</span>
          </div>

          {/* Node list */}
          <div className="space-y-1.5">
            {NODES.map((node) => (
              <div key={node.ip} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${node.live ? "bg-emerald-400 dot-live text-emerald-400" : "bg-white/18"}`} />
                  <div>
                    <span className={`font-mono-snx text-[10px] font-semibold ${node.live ? "text-white/85" : "text-white/45"}`}>{node.name}</span>
                    <span className="font-mono-snx text-[9px] text-white/25 ml-1.5">{node.role}</span>
                  </div>
                </div>
                <span className="font-mono-snx text-[9px] text-white/25">{node.ip}</span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-white/[0.07] pt-2 flex items-center justify-between">
            <span className="font-mono-snx text-[9px] text-white/28">Quorum W=2 · R=3 · HRW</span>
            <span className="badge-emerald text-[9px] font-mono-snx px-2 py-0.5 rounded-full">Active</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
