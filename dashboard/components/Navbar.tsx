"use client";

import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { LogOut, LogIn, ChevronDown, X, AlertCircle, Sun, Moon, Check, Shield } from "lucide-react";

interface NavbarProps {
  wsConnected: boolean;
}

const DEMO_PRESETS = [
  { role: "ADMIN",    label: "Admin",     user: "admin",    pass: "Admin123!",   desc: "Full cluster management & PKI" },
  { role: "MANAGER",  label: "Fleet Mgr", user: "manager",  pass: "Manager123!", desc: "Device enrollment & telemetry" },
  { role: "AUDITOR",  label: "Auditor",   user: "auditor",  pass: "Auditor123!", desc: "Audit chain & proof inspection" },
  { role: "OPERATOR", label: "Operator",  user: "operator", pass: "Operator123!",desc: "Storage nodes & cluster health" },
  { role: "USER",     label: "Analyst",   user: "user1",    pass: "User123!",    desc: "Decentralized file storage" },
];

export const Navbar: React.FC<NavbarProps> = ({ wsConnected }) => {
  const { user, login, demoLogin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
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
      <header className="h-[48px] px-4 sm:px-6 bg-white/70 dark:bg-[#070B14]/70 backdrop-blur-md border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between sticky top-0 z-40 transition-colors duration-200">
        
        {/* Left: Minimal Brand */}
        <div className="flex items-center space-x-2.5">
          <div className="h-6 w-6 rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center font-mono-snx text-[11px] font-bold tracking-tight shadow-xs">
            SX
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[13px] font-semibold text-slate-900 dark:text-white tracking-tight">
              SecureNode<span className="text-indigo-600 dark:text-indigo-400">X</span>
            </span>
            <span className="text-slate-300 dark:text-slate-700 text-xs font-light">/</span>
            <span className="text-[11px] font-mono-snx text-slate-500 dark:text-slate-400">
              control plane
            </span>
          </div>
        </div>

        {/* Center: Sleek Telemetry Status (No chunky bubbles) */}
        <div className="hidden lg:flex items-center space-x-3 text-[11px] font-mono-snx text-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Chain 20260 (QBFT)</span>
          </span>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <span className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                wsConnected ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            <span>{wsConnected ? "mTLS active" : "mTLS connecting"}</span>
          </span>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
            <Shield className="w-3 h-3 text-slate-400" />
            <span>Quorum N=4 R=3 W=2</span>
          </span>
        </div>

        {/* Right: Minimal Actions */}
        <div className="flex items-center space-x-2">
          
          {/* Role Dropdown Selector */}
          <div className="relative">
            <button
              onClick={() => {
                setRoleDropdownOpen(!roleDropdownOpen);
                setDropdownOpen(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200/80 dark:border-white/10 transition"
              title="Switch role"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              <span>{currentPreset?.label || currentRole}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {roleDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-44 rounded-xl bg-white dark:bg-[#0E1526] border border-slate-200 dark:border-white/10 shadow-lg p-1 z-50 animate-slide-fade">
                <div className="px-2.5 py-1 text-[10px] font-mono-snx text-slate-400 uppercase font-semibold">
                  Select Role
                </div>
                {DEMO_PRESETS.map((p) => {
                  const active = currentRole === p.role;
                  return (
                    <button
                      key={p.role}
                      onClick={() => {
                        demoLogin(p.role);
                        setRoleDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition ${
                        active
                          ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                      }`}
                    >
                      <span>{p.label}</span>
                      {active && <Check className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} theme`}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition"
            aria-label="Toggle Theme"
          >
            {theme === "dark" ? (
              <Sun className="w-3.5 h-3.5" />
            ) : (
              <Moon className="w-3.5 h-3.5" />
            )}
          </button>

          {/* User Profile */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => {
                  setDropdownOpen(!dropdownOpen);
                  setRoleDropdownOpen(false);
                }}
                className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-md text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition"
              >
                <div className="h-5 w-5 rounded-full bg-slate-900 dark:bg-white/10 text-white dark:text-slate-200 flex items-center justify-center font-mono-snx text-[10px] font-bold">
                  {user.username?.slice(0, 1).toUpperCase() || "A"}
                </div>
                <span className="hidden sm:inline text-xs">{user.username}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-white dark:bg-[#0E1526] border border-slate-200 dark:border-white/10 shadow-lg p-1.5 z-50 animate-slide-fade">
                  <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-white/5 mb-1">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{user.username}</p>
                    <p className="text-[10px] font-mono-snx text-slate-400 mt-0.5">
                      Role: {currentPreset?.label || currentRole}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setDropdownOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition font-medium"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Disconnect</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="px-2.5 py-1 rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium hover:opacity-90 transition"
            >
              <LogIn className="w-3 h-3 inline mr-1" />
              <span>Connect</span>
            </button>
          )}

        </div>
      </header>

      {/* Login Modal */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-slide-fade">
          <div className="bg-white dark:bg-[#0E1526] border border-slate-200 dark:border-white/10 rounded-2xl p-5 w-full max-w-sm space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Authenticate Principal</h3>
              <button
                onClick={() => setIsLoginModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter cluster credentials to authorize your session.
            </p>

            {loginError && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleFormLogin} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-mono-snx text-slate-500 dark:text-slate-400 mb-1">Username</label>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white text-xs font-mono-snx focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono-snx text-slate-500 dark:text-slate-400 mb-1">Password</label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white text-xs font-mono-snx focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium text-xs hover:opacity-90 transition"
                >
                  {isSubmitting ? "Authenticating..." : "Sign In"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
