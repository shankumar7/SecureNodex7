"use client";

import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Shield, LogOut, LogIn, ChevronDown, X, AlertCircle, Sun, Moon } from "lucide-react";

interface NavbarProps {
  wsConnected: boolean;
}

const DEMO_PRESETS = [
  { role: "ADMIN",    label: "Admin",     user: "admin",    pass: "Admin123!",   icon: "👑", desc: "Full cluster management & PKI" },
  { role: "MANAGER",  label: "Fleet Mgr", user: "manager",  pass: "Manager123!", icon: "⚡", desc: "Device enrollment & telemetry" },
  { role: "AUDITOR",  label: "Auditor",   user: "auditor",  pass: "Auditor123!", icon: "🔍", desc: "Audit chain & proof inspection" },
  { role: "OPERATOR", label: "Operator",  user: "operator", pass: "Operator123!",icon: "⚙️", desc: "Storage nodes & cluster health" },
  { role: "USER",     label: "Analyst",   user: "user1",    pass: "User123!",    icon: "👤", desc: "Decentralized file storage" },
];

export const Navbar: React.FC<NavbarProps> = ({ wsConnected }) => {
  const { user, login, demoLogin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [usernameInput, setUsernameInput] = useState("admin");
  const [passwordInput, setPasswordInput] = useState("Admin123!");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFormLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsSubmitting(true);
    try {
      await login(usernameInput.trim(), passwordInput);
      setIsLoginModalOpen(false);
      setUsernameInput("");
      setPasswordInput("");
    } catch (err: any) {
      setLoginError(err.message || "Invalid credentials");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentRole = user?.roles?.[0] || "GUEST";
  const currentPreset = DEMO_PRESETS.find((p) => p.role === currentRole);

  return (
    <>
      <header className="snx-chrome border-b h-[62px] px-5 sm:px-7 flex items-center justify-between sticky top-0 z-40 transition-colors duration-300">
        {/* Brand */}
        <div className="flex items-center space-x-3.5">
          <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 flex items-center justify-center font-mono-snx text-xs font-black text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/20">
            <span>SX</span>
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-[var(--canvas)] pulse-beacon" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-base font-black tracking-tight text-snx-primary leading-none">
                SecureNode<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-violet-500">X</span>
              </span>
              <span className="pill-mono text-[9px] py-0.5 px-1.5 hidden sm:inline-block">v2.4</span>
            </div>
            <span className="text-[10px] font-mono-snx text-snx-muted uppercase tracking-[0.14em] font-semibold mt-0.5">
              Control Plane & Telemetry
            </span>
          </div>
        </div>

        {/* Center: Cluster Telemetry Status Pills */}
        <div className="hidden lg:flex items-center space-x-2 font-mono-snx text-[11px]">
          {/* Chain Pill */}
          <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full glass-2 text-snx-secondary">
            <span className="h-2 w-2 rounded-full bg-emerald-500 pulse-beacon" />
            <span className="font-medium">Chain 20260 (QBFT)</span>
          </div>

          {/* mTLS Active */}
          <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full glass-2 text-snx-secondary">
            <span
              className={`h-2 w-2 rounded-full ${
                wsConnected ? "bg-emerald-500 pulse-beacon" : "bg-amber-400 animate-pulse"
              }`}
            />
            <span className="font-medium">{wsConnected ? "mTLS Active" : "mTLS Connecting"}</span>
          </div>

          {/* HRW Quorum Pill */}
          <div className="pill-live">
            <Shield className="w-3 h-3" />
            <span>Quorum: N=4 · R=3 · W=2</span>
          </div>
        </div>

        {/* Right Actions: Role Selector + Theme Toggle + User Profile */}
        <div className="flex items-center space-x-2.5">
          {/* Role Switcher */}
          <div className="hidden md:flex items-center p-1 rounded-xl glass-2 text-[11px] gap-1">
            {DEMO_PRESETS.map((p) => {
              const active = currentRole === p.role;
              return (
                <button
                  key={p.role}
                  onClick={() => demoLogin(p.role)}
                  title={p.desc}
                  className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                    active
                      ? "bg-gradient-to-r from-indigo-500/20 to-violet-500/20 text-indigo-400 border border-indigo-500/30 shadow-sm"
                      : "text-snx-muted hover:text-snx-primary hover:bg-white/[0.04]"
                  }`}
                >
                  <span className="text-xs">{p.icon}</span>
                  <span className="hidden xl:inline">{p.label}</span>
                </button>
              );
            })}
          </div>

          {/* Theme Toggle (Dark Obsidian / Light Frost) */}
          <button
            onClick={toggleTheme}
            title={`Switch to ${theme === "dark" ? "Light Frost" : "Dark Obsidian"} theme`}
            className="h-9 w-9 rounded-xl glass-2 flex items-center justify-center text-snx-secondary hover:text-snx-primary transition-all duration-200 hover:scale-105"
            aria-label="Toggle Theme"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform duration-300" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600 hover:-rotate-12 transition-transform duration-300" />
            )}
          </button>

          {/* User Profile / Login */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-2.5 py-1.5 px-3 rounded-xl glass-2 hover:border-white/20 transition-all duration-200 text-left"
              >
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-mono-snx text-xs font-bold text-white shadow-sm">
                  {user.sub?.slice(0, 1).toUpperCase() || "A"}
                </div>
                <div className="hidden sm:flex flex-col">
                  <span className="text-xs font-bold text-snx-primary leading-tight">{user.sub}</span>
                  <span className="text-[9px] font-mono-snx font-bold text-indigo-400 uppercase leading-none">
                    {currentPreset?.label || currentRole}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-snx-muted" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-2xl glass-1 border p-1.5 shadow-xl z-50 animate-slide-fade">
                  <div className="px-3 py-2 border-b border-[var(--border-glass-subtle)] mb-1">
                    <p className="text-xs font-bold text-snx-primary">{user.sub}</p>
                    <p className="text-[10px] font-mono-snx text-snx-muted mt-0.5">
                      Roles: {user.roles?.join(", ") || "None"}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setDropdownOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 transition-colors font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Disconnect Session</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="snx-btn-primary text-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Connect</span>
            </button>
          )}
        </div>
      </header>

      {/* Login Modal */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="snx-card p-6 w-full max-w-sm space-y-4 animate-slide-fade">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-snx-primary">Cluster Node Authentication</h3>
              <button
                onClick={() => setIsLoginModalOpen(false)}
                className="text-snx-muted hover:text-snx-primary p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-snx-muted">
              Authenticate via cryptographic role credentials.
            </p>

            {loginError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleFormLogin} className="space-y-3">
              <div>
                <label className="sec-label block mb-1">Username / Identity</label>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="snx-input"
                  required
                />
              </div>
              <div>
                <label className="sec-label block mb-1">Password</label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="snx-input"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(false)}
                  className="snx-btn-ghost text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="snx-btn-primary text-xs"
                >
                  {isSubmitting ? "Authenticating..." : "Authorize"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
