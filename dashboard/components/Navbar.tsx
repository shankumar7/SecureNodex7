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
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur px-6 py-3.5 flex items-center justify-between sticky top-0 z-50 shadow-xs">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-black tracking-tight text-slate-900">SecureNodeX</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300 font-mono font-bold shadow-2xs">
                v1.0.0
              </span>
            </div>
            <p className="text-[11px] text-slate-600 font-semibold">Decentralised IoT Trust & Split Storage</p>
          </div>
        </div>

        {/* Center Status Indicators */}
        <div className="hidden md:flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-300 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-slate-800 font-mono font-bold">Chain ID: 20260 (Besu QBFT)</span>
          </div>

          <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-300 shadow-2xs">
            <span className={`h-2.5 w-2.5 rounded-full ${wsConnected ? "bg-emerald-600" : "bg-red-600"}`} />
            <span className="text-slate-800 font-bold">
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
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition active:scale-95"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          ) : (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-300 hover:bg-slate-200 text-xs text-slate-800 font-bold shadow-2xs transition"
              >
                <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-black text-xs border border-blue-300">
                  {user.username?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="font-bold text-slate-900 leading-none">{user.username}</p>
                  <span className="text-[10px] text-blue-700 font-mono font-bold uppercase">
                    {user.roles?.[0] || "USER"}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-slate-200 shadow-2xl p-1.5 z-50 text-xs text-slate-800">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-slate-500 text-[10px] uppercase font-bold">Active Principal</p>
                    <p className="text-slate-900 font-bold truncate">{user.display_name || user.username}</p>
                    <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[9px] font-bold border border-blue-300">
                      ID: {user.id}
                    </span>
                  </div>

                  <div className="px-3 py-1.5 text-slate-500 font-bold text-[11px]">
                    Switch Demo Persona:
                  </div>

                  {DEMO_PRESETS.map((p) => (
                    <button
                      key={p.role}
                      onClick={() => {
                        demoLogin(p.role);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg flex items-center justify-between hover:bg-slate-100 transition ${
                        user.roles?.[0] === p.role ? "text-blue-700 font-bold bg-blue-50" : "text-slate-700 font-medium"
                      }`}
                    >
                      <span>{p.label}</span>
                      {user.roles?.[0] === p.role && (
                        <span className="text-[10px] text-blue-700 font-bold">Active</span>
                      )}
                    </button>
                  ))}

                  <div className="border-t border-slate-100 mt-1.5 pt-1.5 space-y-1">
                    <button
                      onClick={() => {
                        setIsLoginModalOpen(true);
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-slate-700 hover:bg-slate-100 font-medium flex items-center space-x-2 transition"
                    >
                      <Key className="w-3.5 h-3.5 text-slate-500" />
                      <span>Custom Sign In</span>
                    </button>

                    <button
                      onClick={() => {
                        logout();
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-red-700 hover:bg-red-50 font-bold flex items-center space-x-2 transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 overflow-hidden text-slate-900">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Sign In to SecureNodeX</h2>
                  <p className="text-xs text-slate-600 font-medium">Argon2id Hash + ES256 Elliptic Curve JWT</p>
                </div>
              </div>
              <button
                onClick={() => setIsLoginModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Banner */}
            {loginError && (
              <div className="mt-4 p-3 rounded-xl bg-red-100 border border-red-200 text-red-800 text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleFormLogin} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Username</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="e.g. admin"
                    className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition font-mono font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Password</label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter password"
                    className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition font-mono font-medium"
                  />
                </div>
              </div>

              {/* Quick Fill Preset Buttons */}
              <div className="pt-2">
                <p className="text-[11px] font-bold text-slate-600 mb-2">Quick Demo Accounts (Click to Fill):</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {DEMO_PRESETS.map((p) => (
                    <button
                      type="button"
                      key={p.role}
                      onClick={() => handleQuickFill(p.user, p.pass)}
                      className={`px-3 py-2 rounded-xl border text-left transition flex items-center justify-between shadow-2xs ${
                        usernameInput === p.user
                          ? "bg-blue-50 border-blue-400 text-blue-900 font-bold"
                          : "bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100 font-medium"
                      }`}
                    >
                      <span className="font-bold">{p.label}</span>
                      <span className="text-[10px] text-slate-500 font-mono font-medium">{p.user}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition disabled:opacity-50 flex items-center space-x-2"
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
