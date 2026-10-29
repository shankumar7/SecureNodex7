"use client";

import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Shield,
  Radio,
  Key,
  User,
  LogOut,
  LogIn,
  ChevronDown,
  X,
  Lock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface NavbarProps {
  wsConnected: boolean;
}

const DEMO_PRESETS = [
  { role: "ADMIN", label: "Admin", user: "admin", pass: "Admin123!", desc: "Full cluster management & PKI" },
  { role: "MANAGER", label: "Fleet Manager", user: "manager", pass: "Manager123!", desc: "Device enrollment & telemetry" },
  { role: "AUDITOR", label: "Auditor", user: "auditor", pass: "Auditor123!", desc: "Audit chain & proof inspection" },
  { role: "OPERATOR", label: "Operator", user: "operator", pass: "Operator123!", desc: "Storage nodes & cluster health" },
  { role: "USER", label: "User / Analyst", user: "user1", pass: "User123!", desc: "Decentralized file storage" },
];

export const Navbar: React.FC<NavbarProps> = ({ wsConnected }) => {
  const { user, login, demoLogin, logout } = useAuth();
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
      setLoginError(err.message || "Invalid username or password");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = (presetUser: string, presetPass: string) => {
    setUsernameInput(presetUser);
    setPasswordInput(presetPass);
    setLoginError(null);
  };

  return (
    <>
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

        {/* Authentication Section */}
        <div className="flex items-center space-x-3">
          {!user ? (
            <button
              onClick={() => {
                setLoginError(null);
                setIsLoginModalOpen(true);
              }}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs shadow-lg shadow-blue-500/25 border border-blue-400/20 transition active:scale-95"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          ) : (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-gray-900/90 border border-gray-800 hover:border-gray-700 text-xs text-gray-200 transition"
              >
                <div className="h-6 w-6 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-semibold text-xs border border-blue-500/20">
                  {user.username?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="font-semibold text-white leading-none">{user.username}</p>
                  <span className="text-[10px] text-blue-400 font-mono uppercase">
                    {user.roles?.[0] || "USER"}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-gray-900 border border-gray-800 shadow-2xl p-1.5 z-50 text-xs">
                  <div className="px-3 py-2 border-b border-gray-800">
                    <p className="text-gray-400 text-[10px] uppercase font-semibold">Active Principal</p>
                    <p className="text-white font-medium truncate">{user.display_name || user.username}</p>
                    <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono text-[9px] border border-blue-500/20">
                      ID: {user.id}
                    </span>
                  </div>

                  <div className="px-3 py-1.5 text-gray-400 font-medium text-[11px]">
                    Switch Demo Persona:
                  </div>

                  {DEMO_PRESETS.map((p) => (
                    <button
                      key={p.role}
                      onClick={() => {
                        demoLogin(p.role);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg flex items-center justify-between hover:bg-gray-800 transition ${
                        user.roles?.[0] === p.role ? "text-blue-400 font-semibold bg-blue-500/10" : "text-gray-300"
                      }`}
                    >
                      <span>{p.label}</span>
                      {user.roles?.[0] === p.role && (
                        <span className="text-[10px] text-blue-400">Active</span>
                      )}
                    </button>
                  ))}

                  <div className="border-t border-gray-800 mt-1.5 pt-1.5 space-y-1">
                    <button
                      onClick={() => {
                        setIsLoginModalOpen(true);
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-gray-300 hover:bg-gray-800 flex items-center space-x-2 transition"
                    >
                      <Key className="w-3.5 h-3.5 text-gray-400" />
                      <span>Custom Sign In</span>
                    </button>

                    <button
                      onClick={() => {
                        logout();
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-500/10 flex items-center space-x-2 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Modern Login Modal */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Sign In to SecureNodeX</h2>
                  <p className="text-xs text-gray-400">Argon2id Hash + ES256 Elliptic Curve JWT</p>
                </div>
              </div>
              <button
                onClick={() => setIsLoginModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Banner */}
            {loginError && (
              <div className="mt-4 p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleFormLogin} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Username</label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="e.g. admin"
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Password</label>
                <div className="relative">
                  <Key className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter password"
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition font-mono"
                  />
                </div>
              </div>

              {/* Quick Fill Preset Buttons */}
              <div className="pt-2">
                <p className="text-[11px] font-medium text-gray-400 mb-2">Quick Demo Accounts (Click to Fill):</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {DEMO_PRESETS.map((p) => (
                    <button
                      type="button"
                      key={p.role}
                      onClick={() => handleQuickFill(p.user, p.pass)}
                      className={`px-2.5 py-1.5 rounded-lg border text-left transition flex items-center justify-between ${
                        usernameInput === p.user
                          ? "bg-blue-600/10 border-blue-500/40 text-blue-300 font-medium"
                          : "bg-gray-950/60 border-gray-800/80 text-gray-300 hover:bg-gray-800"
                      }`}
                    >
                      <span className="font-semibold">{p.label}</span>
                      <span className="text-[10px] text-gray-500 font-mono">{p.user}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-gray-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs shadow-lg shadow-blue-500/25 transition disabled:opacity-50 flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Authenticate</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
