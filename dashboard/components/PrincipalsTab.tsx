"use client";

import React, { useState } from "react";
import { Principal } from "../lib/types";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { Users, Shield, Edit2, CheckCircle2, X } from "lucide-react";

interface PrincipalsTabProps {
  principals: Principal[];
  onRefresh: () => void;
}

export const PrincipalsTab: React.FC<PrincipalsTabProps> = ({ principals, onRefresh }) => {
  const { hasPermission } = useAuth();
  const [selectedUser, setSelectedUser] = useState<Principal | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canManageRoles = hasPermission("principal:set-roles");

  const allRoles = ["ADMIN", "MANAGER", "AUDITOR", "USER", "DEVICE", "STORAGE_NODE"];

  const handleOpenEdit = (p: Principal) => {
    setSelectedUser(p);
    setSelectedRoles(p.roles || ["USER"]);
    setErrorMsg(null);
  };

  const handleToggleRole = (role: string) => {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter((r) => r !== role));
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  const handleSaveRoles = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsUpdating(true);
    setErrorMsg(null);
    try {
      await api.updatePrincipalRoles(selectedUser.id, selectedRoles);
      setSelectedUser(null);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update roles");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1360px] mx-auto animate-slide-fade">
      {/* Header */}
      <div className="pb-4 border-b border-[var(--border-glass-subtle)]">
        <div className="flex items-center gap-2.5">
          <Users className="w-5 h-5 text-indigo-400" />
          <h2 className="text-xl font-black text-snx-primary tracking-tight">
            Principals & Access Control (RBAC)
          </h2>
        </div>
        <p className="text-xs text-snx-muted mt-1">
          Asymmetric JWT-authenticated users evaluated against bitmask role matrices.
        </p>
      </div>

      {/* Principals Table */}
      <div className="snx-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono-snx">
            <thead className="bg-[var(--surface-2)] text-snx-muted border-b border-[var(--border-glass-subtle)] uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Username / Name</th>
                <th className="px-4 py-3">Roles</th>
                <th className="px-4 py-3">Mask</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-glass-subtle)] text-snx-secondary">
              {principals.map((p) => (
                <tr key={p.id} className="hover:bg-[var(--surface-hover)] transition-colors">
                  <td className="px-4 py-3 text-snx-muted font-bold">{p.id}</td>
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-bold text-snx-primary">{p.username}</span>
                      <p className="text-[10px] text-snx-muted font-sans">{p.display_name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.roles?.map((r) => (
                        <span
                          key={r}
                          className="pill-mono text-[9px] font-bold"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-snx-muted text-[11px]">
                    0x{p.role_mask?.toString(16) || "0"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.status === "ACTIVE"
                          ? "badge-emerald"
                          : "badge-ghost"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canManageRoles && (
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="snx-btn-ghost text-xs inline-flex items-center space-x-1"
                      >
                        <Edit2 className="w-3 h-3 text-snx-muted" />
                        <span>Edit</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Roles Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-sm my-auto bg-white dark:bg-[#0E1526] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-6 space-y-4 animate-slide-fade">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-base font-bold text-snx-primary">Configure Roles</h3>
              <p className="text-xs text-snx-muted font-mono-snx">{selectedUser.username}</p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveRoles} className="space-y-3.5">
              <div className="space-y-1.5">
                {allRoles.map((role) => {
                  const isChecked = selectedRoles.includes(role);
                  return (
                    <label
                      key={role}
                      onClick={() => handleToggleRole(role)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition text-xs font-mono-snx ${
                        isChecked
                          ? "badge-indigo font-bold"
                          : "glass-2 border-[var(--border-glass-subtle)] text-snx-secondary hover:border-[var(--border-glass)]"
                      }`}
                    >
                      <span>{role}</span>
                      <span className={`h-2 w-2 rounded-full ${isChecked ? "bg-indigo-400" : "bg-transparent"}`} />
                    </label>
                  );
                })}
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-[var(--border-glass-subtle)]">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="snx-btn-ghost text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="snx-btn-primary text-xs"
                >
                  {isUpdating ? "Saving..." : "Save Roles"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
