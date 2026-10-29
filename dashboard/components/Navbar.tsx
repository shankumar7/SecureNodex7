"use client";

import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Shield, LogOut, LogIn, ChevronDown, X, AlertCircle, Activity } from "lucide-react";

interface NavbarProps { wsConnected: boolean; }

const DEMO_PRESETS = [
  { role: "ADMIN",    label: "Admin",     user: "admin",    pass: "Admin123!",   icon: "👑", color: "text-violet-300",  desc: "Full cluster management & PKI" },
  { role: "MANAGER",  label: "Fleet Mgr", user: "manager",  pass: "Manager123!", icon: "⚡", color: "text-cyan-300",    desc: "Device enrollment & telemetry" },
  { role: "AUDITOR",  label: "Auditor",   user: "auditor",  pass: "Auditor123!", icon: "🔍", color: "text-amber-300",   desc: "Audit chain & proof inspection" },
  { role: "OPERATOR", label: "Operator",  user: "operator", pass: "Operator123!",icon: "⚙️", color: "text-emerald-300", desc: "Storage nodes & cluster health" },
  { role: "USER",     label: "Analyst",   user: "user1",    pass: "User123!",    icon: "👤", color: "text-indigo-300",  desc: "Decentralized file storage" },
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
      setUsernameInput(""); setPasswordInput("");
    } catch (err: any) {
      setLoginError(err.message || "Invalid credentials");
    } finally { setIsSubmitting(false); }
  };

  const currentRole = user?.roles?.[0] || "GUEST";
  const currentPreset = DEMO_PRESETS.find(p => p.role === currentRole);

  return (
    <>
      {/* ── Top Bar ── */}
      <header className="glass-1 border-b border-white/[0.12] px-6 h-[58px] flex items-center justify-between sticky top-0 z-50">

        {/* Brand */}
        <div className="flex items-center space-x-3.5">
          <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center font-mono-snx text-xs font-black text-white shadow-xl shadow-indigo-600/40 ring-2 ring-white/15">
            <span className="relative z-10">SX</span>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/20 to-transparent" />
          </div>
          <div className="flex flex-col">
            <span className="text-[15px] font-black tracking-tight text-white leading-none">
              SecureNode<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">X</span>
            </span>
            <span className="text-[9px] font-mono-snx text-white/35 uppercase tracking-[0.12em] leading-tight font-semibold">Control Plane</span>
          </div>
        </div>

        {/* Center: telemetry status strip */}
        <div className="hidden lg:flex items-center space-x-1.5 font-mono-snx text-[11px]">
          {/* Chain */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full glass-2 text-white/60 border-white/[0.10]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 dot-live text-emerald-400" />
            <span>Chain 20260 (QBFT)</span>
          </div>

          {/* mTLS */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full glass-2 text-white/60">
            <span className={`h-1.5 w-1.5 rounded-full ${wsConnected ? "bg-emerald-400 dot-live text-emerald-400" : "bg-amber-400 animate-pulse"}`} />
            <span>{wsConnected ? "mTLS Active" : "mTLS Connecting"}</span>
          </div>

          {/* Quorum pill */}
          <div className="pill-live">
            <Shield className="w-2.5 h-2.5" />
            N=4 · R=3 · W=2
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center space-x-2">
          {/* Role switcher */}
          <div className="hidden md:flex items-center p-[3px] rounded-xl glass-2 text-[10px] gap-0.5">
            {DEMO_PRESETS.map((p) => {
              const active = currentRole === p.role;
              return (
                <button
                  key={p.role}
                  onClick={() => demoLogin(p.role)}
                  title={p.desc}
                  className={`relative px-3 py-1.5 rounded-lg font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                    active
                      ? "bg-white/[0.13] text-white shadow-md shadow-black/30 ring-1 ring-white/18"
                      : "text-white/40 hover:text-white/70 hover:bg-white/[0.06]"
                  }`}
                >
                  <span>{p.icon}</span>
                  <span className={active ? p.color : ""}>{p.label}</span>
                  {active && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/60" />}
                </button>
              );
            })}
          </div>

          {!user ? (
            <button
              onClick={() => { setLoginError(null); setIsLoginModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500/30 to-violet-500/25 hover:from-indigo-500/45 hover:to-violet-500/40 border border-indigo-400/35 text-indigo-200 font-semibold text-xs transition-all duration-200 shadow-lg shadow-indigo-500/15"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign in
            </button>
          ) : (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl glass-2 border-white/[0.12] hover:border-white/[0.22] text-xs transition-all duration-200 group"
              >
                <div className="relative h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-mono-snx text-[12px] text-white font-black uppercase shadow-lg shadow-indigo-500/40">
                  {user.username?.[0] || "A"}
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-[2px] border-[#06091A] bg-emerald-400" />
                </div>
                <div className="text-left hidden sm:block">
                  <div className="font-bold text-white/92 text-[12px] leading-tight">{user.username}</div>
                  <div className="text-[9px] font-mono-snx leading-none" style={{color: currentPreset?.color.replace('text-','') || '#A5B4FC'}}>{user.roles?.[0]}</div>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-white/30 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-68 rounded-2xl glass-1 shadow-2xl shadow-black/50 p-2.5 z-50 text-xs border border-white/[0.14]">
                  {/* Session info */}
                  <div className="px-3 py-2.5 glass-3 rounded-xl mb-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-mono-snx text-sm text-white font-black uppercase flex-shrink-0">
                        {user.username?.[0] || "A"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white/90 font-bold truncate">{user.display_name || user.username}</p>
                        <p className="font-mono-snx text-[9px] text-white/35 truncate">{user.id}</p>
                      </div>
                    </div>
                    <div className="px-0 pt-1">
                      <span className="badge-indigo px-2 py-0.5 rounded-md text-[10px] font-mono-snx">
                        Role: {user.roles?.[0]} · Mask 0x{user.role_mask?.toString(16)}
                      </span>
                    </div>
                  </div>

                  <p className="sec-label px-1 mb-1.5">Switch Persona</p>
                  <div className="space-y-0.5 mb-2">
                    {DEMO_PRESETS.map((p) => {
                      const isCurrent = user.roles?.[0] === p.role;
                      return (
                        <button
                          key={p.role}
                          onClick={() => { demoLogin(p.role); setDropdownOpen(false); }}
                          className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-all duration-150 ${
                            isCurrent ? "bg-white/[0.09] text-white/92 font-semibold" : "text-white/45 hover:text-white/80 hover:bg-white/[0.05]"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base leading-none">{p.icon}</span>
                            <div>
                              <span className={`font-semibold ${isCurrent ? p.color : ""}`}>{p.label}</span>
                              <p className="text-[9px] font-mono-snx text-white/30 leading-tight mt-0.5">{p.desc}</p>
                            </div>
                          </div>
                          {isCurrent && <span className="h-2 w-2 rounded-full bg-emerald-400 flex-shrink-0 shadow-sm shadow-emerald-400/50" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="border-t border-white/[0.07] pt-2">
                    <button
                      onClick={() => { logout(); setDropdownOpen(false); }}
                      className="w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all duration-150 font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign out of session
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── Auth Modal ── */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#06091A]/70 backdrop-blur-xl">
          <div className="relative w-full max-w-sm glass-1 rounded-2xl shadow-2xl p-7 text-white overflow-hidden">
            {/* Corner glow */}
            <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full bg-violet-500/15 blur-3xl pointer-events-none" />

            <div className="relative">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="text-base font-black text-white tracking-tight">Sign in</h3>
                  <p className="text-[11px] text-white/40 mt-0.5 font-mono-snx">Zero-trust ES256 asymmetric session</p>
                </div>
                <button onClick={() => setIsLoginModalOpen(false)} className="text-white/25 hover:text-white/70 p-1.5 rounded-lg glass-3 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {loginError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/12 border border-rose-400/28 text-rose-300 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {loginError}
                </div>
              )}

              <form onSubmit={handleFormLogin} className="space-y-4">
                <div>
                  <label className="block sec-label mb-1.5">Username</label>
                  <input type="text" required value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} className="snx-input" placeholder="username" />
                </div>
                <div>
                  <label className="block sec-label mb-1.5">Password</label>
                  <input type="password" required value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="snx-input" placeholder="••••••••" />
                </div>

                <div className="pt-1 border-t border-white/[0.07]">
                  <p className="sec-label mb-2">Quick fill</p>
                  <div className="flex flex-wrap gap-1.5">
                    {DEMO_PRESETS.map((p) => (
                      <button
                        key={p.role} type="button"
                        onClick={() => { setUsernameInput(p.user); setPasswordInput(p.pass); setLoginError(null); }}
                        className="px-2.5 py-1.5 rounded-lg glass-3 border border-white/[0.09] text-[10px] font-mono-snx text-white/55 hover:text-white/80 hover:bg-white/[0.08] transition-all flex items-center gap-1.5"
                      >
                        <span>{p.icon}</span>{p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={() => setIsLoginModalOpen(false)} className="px-4 py-2 rounded-xl text-xs text-white/38 hover:text-white/65 transition">Cancel</button>
                  <button
                    type="submit" disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500/35 to-violet-500/30 hover:from-indigo-500/55 hover:to-violet-500/50 border border-indigo-400/35 text-indigo-200 font-bold text-xs transition-all duration-200 disabled:opacity-40 shadow-lg shadow-indigo-500/20"
                  >
                    {isSubmitting ? "Authenticating…" : "Continue →"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
