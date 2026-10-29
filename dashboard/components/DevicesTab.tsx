"use client";

import React, { useState } from "react";
import { Device } from "../lib/types";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import {
  Cpu,
  Plus,
  RotateCw,
  Ban,
  Download,
  Key,
  CheckCircle2,
  AlertTriangle,
  Search,
  X,
} from "lucide-react";

interface DevicesTabProps {
  devices: Device[];
  onRefresh: () => void;
}

export const DevicesTab: React.FC<DevicesTabProps> = ({ devices, onRefresh }) => {
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [enrollLabel, setEnrollLabel] = useState("");
  const [enrollType, setEnrollType] = useState("esp32-sensor");
  const [enrollResult, setEnrollResult] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const canEnroll = hasPermission("device:enroll");
  const canRevoke = hasPermission("device:revoke");
  const canRotate = hasPermission("device:rotate");

  const filteredDevices = devices.filter((d) => {
    const idStr = d.id || "";
    const labelStr = d.label || "";
    const searchLower = (searchTerm || "").toLowerCase();
    const matchSearch =
      idStr.toLowerCase().includes(searchLower) ||
      labelStr.toLowerCase().includes(searchLower);
    const matchStatus = statusFilter === "ALL" || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollLabel.trim()) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      const res = await api.enrollDevice(enrollLabel.trim(), enrollType);
      setEnrollResult(res);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || "Failed to enroll device");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!window.confirm(`Are you sure you want to revoke device ${id}? This action is permanent and propagates to the broker in <= 5s.`)) {
      return;
    }
    try {
      await api.revokeDevice(id);
      onRefresh();
    } catch (err: any) {
      alert(`Revocation failed: ${err.message}`);
    }
  };

  const handleDownloadBundle = (result: any) => {
    const bundleData = {
      device_id: result.device_id,
      label: result.label,
      enrollment_token: result.enrollment_token,
      instructions: "Keep enrollment token secret. Use provision-device.py to generate P-256 keys.",
      timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(bundleData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bundle-${result.device_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-blue-600" />
            <span>Device PKI & Identity Management</span>
          </h2>
          <p className="text-xs text-slate-600 font-medium">
            NIST P-256 hardware device identities registered on-chain in IdentityRegistry.
          </p>
        </div>

        {canEnroll && (
          <button
            onClick={() => {
              setEnrollResult(null);
              setActionError(null);
              setIsEnrollOpen(true);
            }}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Enroll New Device</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by device ID (d-...) or label..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 shadow-2xs transition font-medium"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 font-semibold focus:outline-none focus:border-blue-600 shadow-2xs"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="PENDING">PENDING</option>
          <option value="SUSPENDED">SUSPENDED</option>
          <option value="REVOKED">REVOKED</option>
        </select>
      </div>

      {/* Devices Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="px-4 py-3">Device ID</th>
                <th className="px-4 py-3">Label & Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">SPKI Fingerprint</th>
                <th className="px-4 py-3">Cert Serial</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500 font-medium">
                    No matching devices found.
                  </td>
                </tr>
              ) : (
                filteredDevices.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-mono font-bold text-blue-700">{d.id}</td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-bold text-slate-900">{d.label}</span>
                        <p className="text-[10px] text-slate-500 font-medium">{d.type}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border shadow-2xs ${
                          d.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : d.status === "PENDING"
                            ? "bg-amber-100 text-amber-800 border-amber-300"
                            : "bg-red-100 text-red-800 border-red-300"
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600 font-semibold">
                      {d.spki_fingerprint ? `${d.spki_fingerprint.slice(0, 12)}...` : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600 font-semibold">
                      {d.cert_serial ? d.cert_serial.slice(0, 10) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {d.status === "ACTIVE" && canRevoke && (
                        <button
                          onClick={() => handleRevoke(d.id)}
                          className="px-2.5 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-800 border border-red-300 text-[11px] font-bold transition shadow-2xs"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enroll Device Modal */}
      {isEnrollOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xl relative text-slate-900">
            <button
              onClick={() => setIsEnrollOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Enroll Device Identity</h3>
                <p className="text-xs text-slate-600 font-medium">Generates one-time enrollment token</p>
              </div>
            </div>

            {actionError && (
              <div className="p-3 rounded-lg bg-red-100 border border-red-200 text-red-800 text-xs font-semibold">
                {actionError}
              </div>
            )}

            {!enrollResult ? (
              <form onSubmit={handleEnroll} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Device Label
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ESP32-Temp-Sensor-01"
                    value={enrollLabel}
                    onChange={(e) => setEnrollLabel(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Device Type
                  </label>
                  <select
                    value={enrollType}
                    onChange={(e) => setEnrollType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-600"
                  >
                    <option value="esp32-sensor">ESP32 Hardware Sensor</option>
                    <option value="virtual-simulator">Virtual Simulator Device</option>
                    <option value="gateway-edge">Edge Gateway</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsEnrollOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 font-semibold border border-slate-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-sm transition disabled:opacity-50"
                  >
                    {isSubmitting ? "Enrolling..." : "Enroll Device"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Device Enrolled Successfully</span>
                  </div>
                  <div className="text-[11px] text-slate-800 space-y-1 font-mono font-medium">
                    <p>ID: {enrollResult.device_id}</p>
                    <p className="truncate">Token: {enrollResult.enrollment_token}</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  Download the provisioning bundle now. The enrollment token is shown only once and expires in 24 hours.
                </p>

                <button
                  onClick={() => handleDownloadBundle(enrollResult)}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-md shadow-blue-500/20 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Provisioning Bundle (.json)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
