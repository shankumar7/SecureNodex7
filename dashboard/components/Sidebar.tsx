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
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    permission?: string;
  }[];
}[] = [
  {
    title: "Platform",
    items: [
      {
        key: "overview",
        label: "Cluster Overview",
        icon: LayoutDashboard,
      },
      {
        key: "telemetry",
        label: "Live Telemetry",
        icon: Radio,
        badge: "Live",
      },
      {
        key: "storage",
        label: "Storage & Nodes",
        icon: Server,
        badge: "N=4",
        permission: "storage:health_read",
      },
      {
        key: "audit",
        label: "Audit Ledger",
        icon: ScrollText,
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
        icon: Cpu,
        permission: "device:read",
      },
      {
        key: "objects",
        label: "Decentralized Data",
        icon: HardDrive,
        permission: "object:read_metadata",
      },
      {
        key: "assets",
        label: "Digital Assets",
        icon: Coins,
        permission: "asset:read",
      },
      {
        key: "principals",
        label: "Access & RBAC",
        icon: Users,
        permission: "principal:read",
      },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const { hasPermission } = useAuth();

  return (
    <aside
      className="w-56 shrink-0 bg-white/70 dark:bg-[#070B14]/70 backdrop-blur-md border-r border-slate-200/80 dark:border-white/[0.08] flex flex-col justify-between select-none transition-colors duration-200 z-20"
    >
      {/* Nav Sections */}
      <div className="p-3 space-y-5 flex-1 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.title}>
            <div className="px-2.5 mb-1.5 text-[10px] font-mono-snx font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = activeTab === item.key;
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => onSelectTab(item.key)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors duration-150 group ${
                      isActive
                        ? "bg-slate-100 dark:bg-white/[0.08] text-slate-900 dark:text-white font-medium"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive
                            ? "text-indigo-600 dark:text-indigo-400"
                            : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[10px] font-mono-snx px-1.5 py-0.2 rounded font-medium ${
                          item.badge === "Live"
                            ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10"
                            : "text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5"
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

      {/* Minimal Footer Status Row (Replacing bulky card) */}
      <div className="p-3 border-t border-slate-200/70 dark:border-white/[0.08] flex items-center justify-between text-[11px] font-mono-snx text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>Mesh Active</span>
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 font-medium">
          4 Nodes
        </span>
      </div>
    </aside>
  );
};
