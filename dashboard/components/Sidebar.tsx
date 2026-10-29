"use client";

import React from "react";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  Cpu,
  Radio,
  HardDrive,
  Activity,
  Coins,
  ScrollText,
  Users,
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

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const { hasPermission } = useAuth();

  const navItems: { key: TabKey; label: string; icon: React.ReactNode; permission?: string }[] = [
    { key: "overview", label: "Overview", icon: <LayoutDashboard className="w-4 h-4" /> },
    { key: "devices", label: "Devices (PKI)", icon: <Cpu className="w-4 h-4" />, permission: "device:read" },
    { key: "telemetry", label: "Live Telemetry", icon: <Radio className="w-4 h-4" /> },
    { key: "objects", label: "Decentralized Data", icon: <HardDrive className="w-4 h-4" />, permission: "object:read_metadata" },
    { key: "storage", label: "Storage Health", icon: <Activity className="w-4 h-4" />, permission: "storage:health_read" },
    { key: "assets", label: "Digital Assets", icon: <Coins className="w-4 h-4" />, permission: "asset:read" },
    { key: "audit", label: "Audit Timeline", icon: <ScrollText className="w-4 h-4" />, permission: "audit:read" },
    { key: "principals", label: "Principals & RBAC", icon: <Users className="w-4 h-4" />, permission: "principal:read" },
  ];

  return (
    <aside className="w-64 border-r border-slate-200 bg-white p-4 flex flex-col justify-between shrink-0 shadow-xs">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-black tracking-wider text-slate-400 uppercase">
          Navigation
        </div>
        {navItems.map((item) => {
          // Check role permissions (UI hides forbidden actions)
          if (item.permission && !hasPermission(item.permission)) {
            return null;
          }

          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onSelectTab(item.key)}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs transition ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 font-bold"
                  : "text-slate-700 hover:text-slate-950 hover:bg-slate-100 font-semibold"
              }`}
            >
              <span className={isActive ? "text-white" : "text-slate-500"}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700 space-y-1 shadow-2xs">
        <div className="flex items-center justify-between text-slate-900 font-bold">
          <span>Cluster Security</span>
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <p className="text-[10px] text-slate-500 font-medium">P-256 ECDSA + AES-256-GCM + HRW Quorum</p>
      </div>
    </aside>
  );
};
