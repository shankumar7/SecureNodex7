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
    <aside className="w-64 border-r border-gray-800 bg-gray-950/40 p-4 flex flex-col justify-between shrink-0">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
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
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-semibold"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-900/60"
              }`}
            >
              <span className={isActive ? "text-white" : "text-gray-400"}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="p-3.5 rounded-xl bg-gray-900/50 border border-gray-800/80 text-[11px] text-gray-400 space-y-1">
        <div className="flex items-center justify-between text-gray-300 font-medium">
          <span>Cluster Security</span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </div>
        <p className="text-[10px] text-gray-500">P-256 ECDSA + AES-256-GCM + HRW Quorum</p>
      </div>
    </aside>
  );
};
