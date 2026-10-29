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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white flex items-center space-x-2">
          <Users className="w-5 h-5 text-blue-400" />
          <span>Principals & Role-Based Access Control</span>
        </h2>
        <p className="text-xs text-gray-400">
          Cryptographically authenticated users with bitmask role matrix matching docs/05_RBAC.md.
        </p>
      </div>

      {/* Principals Table */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/40 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-950/80 text-gray-400 border-b border-gray-800 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Principal ID</th>
                <th className="px-4 py-3">Username & Name</th>
                <th className="px-4 py-3">Roles</th>
                <th className="px-4 py-3">Role Mask</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 text-gray-300">
              {principals.map((p) => (
                <tr key={p.id} className="hover:bg-gray-800/30 transition">
                  <td className="px-4 py-3 font-mono text-blue-400 font-semibold">{p.id}</td>
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-semibold text-white">{p.username}</span>
                      <p className="text-[10px] text-gray-500">{p.display_name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.roles?.map((r) => (
                        <span
                          key={r}
                          className="px-2 py-0.5 rounded text-[9px] font-mono font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-400 text-[11px]">
                    0x{p.role_mask.toString(16).padStart(2, "0")} ({p.role_mask})
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canManageRoles && (
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-[11px] transition inline-flex items-center space-x-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit Roles</span>
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Manage Roles: {selectedUser.username}</h3>
                <p className="text-xs text-gray-400">{selectedUser.id}</p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-950/50 border border-red-800/50 text-red-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveRoles} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-300">Assign Roles (IntFlag bitmask)</label>
                <div className="grid grid-cols-2 gap-2">
                  {allRoles.map((role) => {
                    const isChecked = selectedRoles.includes(role);
                    return (
                      <button
                        type="button"
                        key={role}
                        onClick={() => handleToggleRole(role)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-mono transition flex items-center justify-between ${
                          isChecked
                            ? "bg-blue-600/20 border-blue-500/60 text-blue-300"
                            : "bg-gray-950/60 border-gray-800 text-gray-400 hover:border-gray-700"
                        }`}
                      >
                        <span>{role}</span>
                        {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition disabled:opacity-50"
                >
                  {isUpdating ? "Updating..." : "Save Role Mask"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
