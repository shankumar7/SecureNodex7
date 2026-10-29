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
  Shield,
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
    <div className="space-y-6 max-w-[1360px] mx-auto animate-slide-fade">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--border-glass-subtle)] gap-3">
        <div>
          <h2 className="text-xl font-black text-snx-primary tracking-tight">
            Device Registry & Hardware PKI
          </h2>
          <p className="text-xs text-snx-muted mt-1">
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
            className="snx-btn-primary"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Enroll Device</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-snx-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by device ID or hardware label..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="snx-input pl-10"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="snx-input sm:w-48"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="PENDING">PENDING</option>
          <option value="SUSPENDED">SUSPENDED</option>
          <option value="REVOKED">REVOKED</option>
        </select>
      </div>

      {/* Devices Table */}
      <div className="snx-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-2)] text-snx-muted border-b border-[var(--border-glass-subtle)] uppercase text-[10px] font-mono-snx tracking-wider">
              <tr>
                <th className="px-4 py-3 font-mono-snx">Device ID</th>
                <th className="px-4 py-3">Label / Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 font-mono-snx">SPKI Fingerprint</th>
                <th className="px-4 py-3 font-mono-snx">Cert Serial</th>
                <th className="px-4 py-3 text-right font-mono-snx">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-glass-subtle)] text-snx-secondary">
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-snx-muted font-mono-snx text-xs">
                    No devices registered. Click Enroll Device to provision an identity.
                  </td>
                </tr>
              ) : (
                filteredDevices.map((d) => (
                  <tr key={d.id} className="hover:bg-[var(--surface-hover)] transition-colors">
                    <td className="px-4 py-3 font-mono-snx text-snx-primary font-semibold">{d.id}</td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-snx-primary font-semibold">{d.label}</span>
                        <p className="text-[10px] text-snx-muted font-mono-snx">{d.type}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono-snx ${
                          d.status === "ACTIVE"
                            ? "badge-emerald"
                            : d.status === "PENDING"
                            ? "badge-amber"
                            : "badge-rose"
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono-snx text-[11px] text-snx-muted">
                      {d.spki_fingerprint ? `${d.spki_fingerprint.slice(0, 16)}...` : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono-snx text-[11px] text-snx-muted">
                      {d.cert_serial ? d.cert_serial.slice(0, 12) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono-snx">
                      {d.status === "ACTIVE" && canRevoke && (
                        <button
                          onClick={() => handleRevoke(d.id)}
                          className="px-2.5 py-1 rounded-lg badge-rose text-[11px] hover:opacity-80 transition"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-slide-fade">
          <div className="w-full max-w-sm snx-card p-6 space-y-4 relative">
            <button
              onClick={() => setIsEnrollOpen(false)}
              className="absolute top-4 right-4 text-snx-muted hover:text-snx-primary"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-base font-bold text-snx-primary">Enroll Device Identity</h3>
              <p className="text-xs text-snx-muted">Generates cryptographic one-time enrollment token</p>
            </div>

            {actionError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {actionError}
              </div>
            )}

            {!enrollResult ? (
              <form onSubmit={handleEnroll} className="space-y-3.5 text-xs">
                <div>
                  <label className="sec-label block mb-1">
                    Device Label
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ESP32-Sensor-01"
                    value={enrollLabel}
                    onChange={(e) => setEnrollLabel(e.target.value)}
                    className="snx-input"
                  />
                </div>

                <div>
                  <label className="sec-label block mb-1">
                    Device Type
                  </label>
                  <select
                    value={enrollType}
                    onChange={(e) => setEnrollType(e.target.value)}
                    className="snx-input"
                  >
                    <option value="esp32-sensor">ESP32 Hardware Sensor</option>
                    <option value="virtual-simulator">Virtual Simulator Device</option>
                    <option value="gateway-edge">Edge Gateway</option>
                  </select>
                </div>

                <div className="pt-3 flex items-center justify-end space-x-2 border-t border-[var(--border-glass-subtle)]">
                  <button
                    type="button"
                    onClick={() => setIsEnrollOpen(false)}
                    className="snx-btn-ghost text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="snx-btn-primary text-xs"
                  >
                    {isSubmitting ? "Enrolling..." : "Enroll Device"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-xl glass-2 border border-[var(--border-glass-subtle)] space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-400 font-mono-snx text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Identity Registered</span>
                  </div>
                  <div className="text-[11px] font-mono-snx text-snx-secondary space-y-1">
                    <p>ID: {enrollResult.device_id}</p>
                    <p className="truncate text-snx-muted">Token: {enrollResult.enrollment_token}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleDownloadBundle(enrollResult)}
                  className="w-full snx-btn-primary"
                >
                  <Download className="w-4 h-4" />
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
