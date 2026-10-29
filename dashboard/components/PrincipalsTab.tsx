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
        <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
          <Users className="w-5 h-5 text-blue-600" />
          <span>Principals & Role-Based Access Control</span>
        </h2>
        <p className="text-xs text-slate-600 font-medium">
          Cryptographically authenticated users with bitmask role matrix matching docs/05_RBAC.md.
        </p>
      </div>

      {/* Principals Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="px-4 py-3">Principal ID</th>
                <th className="px-4 py-3">Username & Name</th>
                <th className="px-4 py-3">Roles</th>
                <th className="px-4 py-3">Role Mask</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {principals.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-4 py-3 font-mono text-blue-700 font-bold">{p.id}</td>
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-bold text-slate-900">{p.username}</span>
                      <p className="text-[10px] text-slate-500 font-medium">{p.display_name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {p.roles?.map((r) => (
                        <span
                          key={r}
                          className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-100 text-blue-800 border border-blue-300 shadow-2xs"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600 font-bold text-[11px]">
                    0x{p.role_mask.toString(16).padStart(2, "0")} ({p.role_mask})
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canManageRoles && (
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-[11px] font-bold transition inline-flex items-center space-x-1 shadow-2xs"
                      >
                        <Edit2 className="w-3 h-3 text-slate-600" />
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xl relative text-slate-900">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Manage Roles: {selectedUser.username}</h3>
                <p className="text-xs text-slate-600 font-medium">{selectedUser.id}</p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-100 border border-red-200 text-red-800 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveRoles} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Assign Roles (IntFlag bitmask)</label>
                <div className="grid grid-cols-2 gap-2">
                  {allRoles.map((role) => {
                    const isChecked = selectedRoles.includes(role);
                    return (
                      <button
                        type="button"
                        key={role}
                        onClick={() => handleToggleRole(role)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-mono transition flex items-center justify-between shadow-2xs ${
                          isChecked
                            ? "bg-blue-50 border-blue-400 text-blue-900 font-bold"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-medium"
                        }`}
                      >
                        <span>{role}</span>
                        {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-blue-700" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 font-semibold border border-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition disabled:opacity-50"
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
