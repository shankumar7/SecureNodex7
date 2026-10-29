"use client";

import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Shield, Radio, Key, User, LogOut, ChevronDown } from "lucide-react";

interface NavbarProps {
  wsConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ wsConnected }) => {
  const { user, demoLogin, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const roles = ["ADMIN", "MANAGER", "AUDITOR", "USER"];

  return (
    <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur px-6 py-3.5 flex items-center justify-between sticky top-0 z-50">
      {/* Brand */}
      <div className="flex items-center space-x-3">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/25">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-bold tracking-tight text-white">SecureNodeX</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 font-mono">
              v1.0.0
            </span>
          </div>
          <p className="text-[11px] text-gray-400">Decentralised IoT Trust & Split Storage</p>
        </div>
      </div>

      {/* Center Status Indicators */}
      <div className="hidden md:flex items-center space-x-3 text-xs">
        <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-gray-900 border border-gray-800">
          <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-gray-300 font-mono">Chain ID: 20260 (Besu QBFT)</span>
        </div>

        <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-gray-900 border border-gray-800">
          <span className={`h-2 w-2 rounded-full ${wsConnected ? "bg-emerald-400" : "bg-red-400"}`} />
          <span className="text-gray-300">
            {wsConnected ? "Live Stream (mTLS / WS)" : "Stream Disconnected"}
          </span>
        </div>
      </div>

      {/* User Info & Role Switcher */}
      <div className="flex items-center space-x-3">
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-2.5 px-3 py-1.5 rounded-lg bg-gray-900/90 border border-gray-800 hover:border-gray-700 text-xs text-gray-200 transition"
          >
            <div className="h-5 w-5 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-semibold text-[10px]">
              {user?.username?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="text-left hidden sm:block">
              <p className="font-medium text-white leading-none">{user?.username || "Guest"}</p>
              <span className="text-[10px] text-blue-400 font-mono">
                {user?.roles?.[0] || "USER"}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl bg-gray-900 border border-gray-800 shadow-2xl p-1 z-50 text-xs">
              <div className="px-3 py-2 border-b border-gray-800 text-gray-400 font-medium">
                Switch Demo Persona:
              </div>
              {roles.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    demoLogin(r);
                    setDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between hover:bg-gray-800 transition ${
                    user?.roles?.[0] === r ? "text-blue-400 font-semibold bg-blue-500/10" : "text-gray-300"
                  }`}
                >
                  <span>{r}</span>
                  {user?.roles?.[0] === r && <span className="text-[10px]">Active</span>}
                </button>
              ))}
              <div className="border-t border-gray-800 mt-1 pt-1">
                <button
                  onClick={() => {
                    logout();
                    setDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 flex items-center space-x-2 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
