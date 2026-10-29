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
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="pb-4 border-b border-zinc-200">
        <h2 className="text-base font-semibold text-zinc-900 tracking-tight">
          Principals & Access Control (RBAC)
        </h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Asymmetric JWT-authenticated users evaluated against bitmask role matrices.
        </p>
      </div>

      {/* Principals Table */}
      <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono-snx">
            <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-3.5 py-2.5">ID</th>
                <th className="px-3.5 py-2.5">Username / Name</th>
                <th className="px-3.5 py-2.5">Roles</th>
                <th className="px-3.5 py-2.5">Mask</th>
                <th className="px-3.5 py-2.5">Status</th>
                <th className="px-3.5 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {principals.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50/70 transition">
                  <td className="px-3.5 py-2.5 text-zinc-500">{p.id}</td>
                  <td className="px-3.5 py-2.5">
                    <div>
                      <span className="font-semibold text-zinc-900">{p.username}</span>
                      <p className="text-[10px] text-zinc-500 font-sans">{p.display_name}</p>
                    </div>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {p.roles?.map((r) => (
                        <span
                          key={r}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-100 text-zinc-700 border border-zinc-200 font-medium"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3.5 py-2.5 text-zinc-500 text-[11px]">
                    0x{p.role_mask?.toString(16) || "0"}
                  </td>
                  <td className="px-3.5 py-2.5">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${
                        p.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-zinc-100 text-zinc-500 border border-zinc-200"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 text-right">
                    {canManageRoles && (
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="px-2 py-1 rounded bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 text-[11px] transition shadow-2xs inline-flex items-center space-x-1"
                      >
                        <Edit2 className="w-3 h-3 text-zinc-400" />
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
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="w-full max-w-sm glass-1 border border-zinc-200 rounded-xl p-5 space-y-4 shadow-2xl relative text-zinc-900">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Configure Roles</h3>
              <p className="text-[11px] text-zinc-500 font-mono-snx">{selectedUser.username}</p>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveRoles} className="space-y-3">
              <div className="space-y-1.5">
                {allRoles.map((role) => {
                  const isChecked = selectedRoles.includes(role);
                  return (
                    <label
                      key={role}
                      onClick={() => handleToggleRole(role)}
                      className={`flex items-center justify-between p-2 rounded-md border cursor-pointer transition text-xs font-mono-snx ${
                        isChecked
                          ? "bg-zinc-100 border-zinc-300 text-zinc-900 font-medium"
                          : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:border-zinc-300"
                      }`}
                    >
                      <span>{role}</span>
                      <span className={`h-1.5 w-1.5 rounded-full ${isChecked ? "bg-emerald-500" : "bg-transparent"}`} />
                    </label>
                  );
                })}
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-3 py-1.5 rounded-md text-xs text-zinc-500 hover:text-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition disabled:opacity-50 shadow-xs"
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
