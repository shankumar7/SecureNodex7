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
    const matchSearch =
      d.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.label.toLowerCase().includes(searchTerm.toLowerCase());
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
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-blue-400" />
            <span>Device PKI & Identity Management</span>
          </h2>
          <p className="text-xs text-gray-400">
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
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Enroll New Device</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by device ID (d-...) or label..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-900 border border-gray-800 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 text-xs text-gray-300 focus:outline-none focus:border-blue-500"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="PENDING">PENDING</option>
          <option value="SUSPENDED">SUSPENDED</option>
          <option value="REVOKED">REVOKED</option>
        </select>
      </div>

      {/* Devices Table */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/40 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-950/80 text-gray-400 border-b border-gray-800 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Device ID</th>
                <th className="px-4 py-3">Label & Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">SPKI Fingerprint</th>
                <th className="px-4 py-3">Cert Serial</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 text-gray-300">
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No matching devices found.
                  </td>
                </tr>
              ) : (
                filteredDevices.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-800/30 transition">
                    <td className="px-4 py-3 font-mono font-medium text-blue-400">{d.id}</td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-semibold text-white">{d.label}</span>
                        <p className="text-[10px] text-gray-500">{d.type}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          d.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : d.status === "PENDING"
                            ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                            : "bg-red-500/10 text-red-400 border-red-500/30"
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-400">
                      {d.spki_fingerprint ? `${d.spki_fingerprint.slice(0, 12)}...` : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-400">
                      {d.cert_serial ? d.cert_serial.slice(0, 10) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {d.status === "ACTIVE" && canRevoke && (
                        <button
                          onClick={() => handleRevoke(d.id)}
                          className="px-2.5 py-1 rounded bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/40 text-[11px] transition"
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setIsEnrollOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Enroll Device Identity</h3>
                <p className="text-xs text-gray-400">Generates one-time enrollment token</p>
              </div>
            </div>

            {actionError && (
              <div className="p-3 rounded-lg bg-red-950/50 border border-red-800/50 text-red-300 text-xs">
                {actionError}
              </div>
            )}

            {!enrollResult ? (
              <form onSubmit={handleEnroll} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Device Label
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ESP32-Temp-Sensor-01"
                    value={enrollLabel}
                    onChange={(e) => setEnrollLabel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-800 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Device Type
                  </label>
                  <select
                    value={enrollType}
                    onChange={(e) => setEnrollType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-800 text-xs text-white focus:outline-none focus:border-blue-500"
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
                    className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition disabled:opacity-50"
                  >
                    {isSubmitting ? "Enrolling..." : "Enroll Device"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Device Enrolled Successfully</span>
                  </div>
                  <div className="text-[11px] text-gray-300 space-y-1 font-mono">
                    <p>ID: {enrollResult.device_id}</p>
                    <p className="truncate">Token: {enrollResult.enrollment_token}</p>
                  </div>
                </div>

                <p className="text-xs text-gray-400 leading-relaxed">
                  Download the provisioning bundle now. The enrollment token is shown only once and expires in 24 hours.
                </p>

                <button
                  onClick={() => handleDownloadBundle(enrollResult)}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center space-x-2 transition"
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
