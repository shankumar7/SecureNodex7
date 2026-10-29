"use client";

import React from "react";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  Cpu,
  Radio,
  HardDrive,
  Coins,
  ScrollText,
  Users,
  Server,
  Shield,
} from "lucide-react";

export type TabKey =
  | "overview"
  | "devices"
  | "telemetry"
  | "objects"
  | "storage"
  | "assets"
  | "audit"
  | "principals";

interface SidebarProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
}

const sections: {
  title: string;
  items: {
    key: TabKey;
    label: string;
    icon: React.ReactNode;
    badge?: string;
    iconGrad: string;
    iconGlow: string;
    permission?: string;
  }[];
}[] = [
  {
    title: "Core Platform",
    items: [
      {
        key: "overview",
        label: "Cluster Overview",
        icon: <LayoutDashboard className="w-4 h-4" />,
        iconGrad: "from-indigo-500 to-violet-600",
        iconGlow: "shadow-indigo-500/30",
      },
      {
        key: "telemetry",
        label: "Live Telemetry",
        icon: <Radio className="w-4 h-4" />,
        badge: "Live",
        iconGrad: "from-emerald-500 to-teal-600",
        iconGlow: "shadow-emerald-500/30",
      },
      {
        key: "storage",
        label: "Storage & Nodes",
        icon: <Server className="w-4 h-4" />,
        badge: "N=4",
        iconGrad: "from-cyan-500 to-sky-600",
        iconGlow: "shadow-cyan-500/30",
        permission: "storage:health_read",
      },
      {
        key: "audit",
        label: "Audit Ledger",
        icon: <ScrollText className="w-4 h-4" />,
        iconGrad: "from-amber-500 to-orange-600",
        iconGlow: "shadow-amber-500/30",
        permission: "audit:read",
      },
    ],
  },
  {
    title: "Security & Operations",
    items: [
      {
        key: "devices",
        label: "Devices & PKI",
        icon: <Cpu className="w-4 h-4" />,
        iconGrad: "from-blue-500 to-indigo-600",
        iconGlow: "shadow-blue-500/30",
        permission: "device:read",
      },
      {
        key: "objects",
        label: "Decentralized Data",
        icon: <HardDrive className="w-4 h-4" />,
        iconGrad: "from-violet-500 to-purple-600",
        iconGlow: "shadow-violet-500/30",
        permission: "object:read_metadata",
      },
      {
        key: "assets",
        label: "Digital Assets",
        icon: <Coins className="w-4 h-4" />,
        iconGrad: "from-amber-400 to-orange-500",
        iconGlow: "shadow-amber-400/30",
        permission: "asset:read",
      },
      {
        key: "principals",
        label: "Access & RBAC",
        icon: <Users className="w-4 h-4" />,
        iconGrad: "from-slate-400 to-slate-600",
        iconGlow: "shadow-slate-400/20",
        permission: "principal:read",
      },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const { hasPermission } = useAuth();

  return (
    <aside
      className="border-r snx-chrome flex flex-col justify-between shrink-0 transition-all duration-300 z-20"
      style={{ width: "256px" }}
    >
      <div className="p-3.5 space-y-6 flex-1 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="sec-label px-2.5 mb-2.5">{section.title}</p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => onSelectTab(item.key)}
                    className={`w-full relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 group ${
                      isActive
                        ? "sidebar-active-item"
                        : "text-snx-secondary hover:text-snx-primary hover:bg-white/[0.04]"
                    }`}
                  >
                    {/* Vertical Glow Bar for Active Item */}
                    {isActive && <div className="sidebar-active-bar" />}

                    <div className="flex items-center gap-3">
                      {/* Gradient icon badge */}
                      <div
                        className={`h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                          isActive
                            ? `bg-gradient-to-br ${item.iconGrad} text-white shadow-md ${item.iconGlow}`
                            : "bg-[var(--surface-2)] text-snx-muted group-hover:text-snx-primary group-hover:bg-[var(--surface-hover)]"
                        }`}
                      >
                        {item.icon}
                      </div>
                      <span className={`font-semibold ${isActive ? "text-snx-primary" : ""}`}>
                        {item.label}
                      </span>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[9px] font-mono-snx px-2 py-0.5 rounded-full font-bold ${
                          isActive
                            ? "bg-white/20 text-white"
                            : item.badge === "Live"
                            ? "badge-emerald"
                            : "badge-ghost"
                        }`}
                      >
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

      {/* Edge Cluster Mini Status Widget */}
      <div className="p-3.5 border-t border-[var(--border-glass-subtle)]">
        <div className="p-3 rounded-2xl glass-2 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[11px] font-bold text-snx-primary">Edge Mesh</span>
            </div>
            <span className="badge-emerald text-[9px] px-2 py-0.5 rounded-full">N=4</span>
          </div>

          <div className="space-y-1 text-[10px] font-mono-snx text-snx-muted pt-1 border-t border-[var(--border-glass-subtle)]">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-snx-secondary">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-beacon" />
                Laptop 1 (Cmdr)
              </span>
              <span className="text-emerald-400 font-bold">UP</span>
            </div>
            <div className="flex items-center justify-between opacity-70">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400/50" />
                3 Storage Peers
              </span>
              <span>STANDBY</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
