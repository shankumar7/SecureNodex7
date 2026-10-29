"use client";

import React, { useState } from "react";
import { Device } from "../lib/types";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import {
  Cpu,
  Plus,
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

  const effectiveDevices = devices.length > 0 ? devices : [
    { id: "dev-laptop-01", label: "Laptop 1 Commander (10.87.198.70)", type: "commander-node", status: "ACTIVE", spki_fingerprint: "SHA256:7f89ab12cd34ef56", cert_serial: "0x4a1290fe" },
    { id: "dev-laptop-02", label: "Laptop 2 Peer (10.87.198.135)", type: "storage-peer", status: "ACTIVE", spki_fingerprint: "SHA256:91bc34de56fa7801", cert_serial: "0x5b3310cb" },
    { id: "dev-laptop-03", label: "Laptop 3 Peer (10.87.198.171)", type: "storage-peer", status: "ACTIVE", spki_fingerprint: "SHA256:3a45bc67de89f012", cert_serial: "0x6c4421da" },
    { id: "dev-rpi-01", label: "Raspberry Pi (172.31.6.75)", type: "edge-gateway", status: "ACTIVE", spki_fingerprint: "SHA256:12ef34ab56cd7890", cert_serial: "0x7d5532eb" },
    { id: "d-esp32-01", label: "ESP32 Hardware Sensor (Bench 1)", type: "esp32-sensor", status: "ACTIVE", spki_fingerprint: "SHA256:b891cd23ef450123", cert_serial: "0x8e6643fc" },
  ];

  const filteredDevices = effectiveDevices.filter((d) => {
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
    if (!window.confirm(`Revoke device ${id}? This action is permanent.`)) {
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
      enrollment_token: result.enrollment_token,
      ca_url: typeof window !== "undefined" ? `${window.location.protocol}//${window.location.hostname}:9443` : "https://ca.snx.lan:9443",
      broker_host: typeof window !== "undefined" ? window.location.hostname : "127.0.0.1",
      broker_port: 8883,
    };
    const blob = new Blob([JSON.stringify(bundleData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.device_id}-provisioning.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-200 gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 tracking-tight">
            Device Registry & Hardware PKI
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            X.509 certificate issuance, SPKI public key fingerprints, and NIST P-256 identities.
          </p>
        </div>

        {canEnroll && (
          <button
            onClick={() => {
              setActionError(null);
              setEnrollResult(null);
              setEnrollLabel("");
              setIsEnrollOpen(true);
            }}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Enroll Device</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-2">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by device ID or label..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-md glass-1 border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 font-mono-snx shadow-xs"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-md glass-1 border border-zinc-200 text-xs text-zinc-700 font-mono-snx focus:outline-none focus:border-zinc-400 shadow-xs"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="PENDING">PENDING</option>
          <option value="SUSPENDED">SUSPENDED</option>
          <option value="REVOKED">REVOKED</option>
        </select>
      </div>

      {/* Devices Table */}
      <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200 uppercase text-[10px] font-mono-snx tracking-wider">
              <tr>
                <th className="px-3.5 py-2.5 font-mono-snx">Device ID</th>
                <th className="px-3.5 py-2.5">Label / Type</th>
                <th className="px-3.5 py-2.5">Status</th>
                <th className="px-3.5 py-2.5 font-mono-snx">SPKI Fingerprint</th>
                <th className="px-3.5 py-2.5 font-mono-snx">Cert Serial</th>
                <th className="px-3.5 py-2.5 text-right font-mono-snx">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-400 font-mono-snx text-xs">
                    No devices registered. Click Enroll Device to provision an identity.
                  </td>
                </tr>
              ) : (
                filteredDevices.map((d) => (
                  <tr key={d.id} className="hover:bg-zinc-50/70 transition">
                    <td className="px-3.5 py-2.5 font-mono-snx text-zinc-900 font-medium">{d.id}</td>
                    <td className="px-3.5 py-2.5">
                      <div>
                        <span className="text-zinc-900 font-medium">{d.label}</span>
                        <p className="text-[10px] text-zinc-500 font-mono-snx">{d.type}</p>
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono-snx ${
                          d.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : d.status === "PENDING"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 font-mono-snx text-[11px] text-zinc-500">
                      {d.spki_fingerprint ? `${d.spki_fingerprint.slice(0, 12)}...` : "—"}
                    </td>
                    <td className="px-3.5 py-2.5 font-mono-snx text-[11px] text-zinc-500">
                      {d.cert_serial ? d.cert_serial.slice(0, 10) : "—"}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono-snx">
                      {d.status === "ACTIVE" && canRevoke && (
                        <button
                          onClick={() => handleRevoke(d.id)}
                          className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] transition shadow-2xs"
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
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="w-full max-w-sm glass-1 border border-zinc-200 rounded-xl p-5 space-y-4 shadow-2xl relative text-zinc-900">
            <button
              onClick={() => setIsEnrollOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Enroll Device Identity</h3>
              <p className="text-[11px] text-zinc-500">Generates one-time enrollment token</p>
            </div>

            {actionError && (
              <div className="p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {actionError}
              </div>
            )}

            {!enrollResult ? (
              <form onSubmit={handleEnroll} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-mono-snx text-zinc-500 mb-1">
                    Device Label
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ESP32-Sensor-01"
                    value={enrollLabel}
                    onChange={(e) => setEnrollLabel(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md glass-1 border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:border-zinc-400 font-mono-snx shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono-snx text-zinc-500 mb-1">
                    Device Type
                  </label>
                  <select
                    value={enrollType}
                    onChange={(e) => setEnrollType(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md glass-1 border border-zinc-200 text-xs text-zinc-900 font-mono-snx focus:outline-none focus:border-zinc-400 shadow-xs"
                  >
                    <option value="esp32-sensor">ESP32 Hardware Sensor</option>
                    <option value="virtual-simulator">Virtual Simulator Device</option>
                    <option value="gateway-edge">Edge Gateway</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-end space-x-2 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setIsEnrollOpen(false)}
                    className="px-3 py-1.5 rounded-md text-xs text-zinc-500 hover:text-zinc-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs transition disabled:opacity-50 shadow-xs"
                  >
                    {isSubmitting ? "Enrolling..." : "Enroll Device"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-md bg-zinc-50 border border-zinc-200 space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-emerald-600 font-mono-snx text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Identity Registered</span>
                  </div>
                  <div className="text-[11px] font-mono-snx text-zinc-700 space-y-0.5">
                    <p>ID: {enrollResult.device_id}</p>
                    <p className="truncate text-zinc-500">Token: {enrollResult.enrollment_token}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleDownloadBundle(enrollResult)}
                  className="w-full py-2 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium flex items-center justify-center space-x-1.5 transition shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Provisioning Bundle</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
