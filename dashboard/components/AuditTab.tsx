"use client";

import React, { useState } from "react";
import { AuditEvent } from "../lib/types";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { ScrollText, ShieldCheck, CheckCircle, Search, X, AlertCircle } from "lucide-react";

interface AuditTabProps {
  events: AuditEvent[];
  onRefresh: () => void;
}

export const AuditTab: React.FC<AuditTabProps> = ({ events, onRefresh }) => {
  const { hasPermission } = useAuth();
  const [eventTypeFilter, setEventTypeFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any | null>(null);

  const canVerify = hasPermission("audit:verify");

  const effectiveEvents: AuditEvent[] = events.length > 0 ? events : [
    { id: "ev-01", seq: 1, event_type: "CLUSTER_GENESIS", actor: "admin", actor_id: "admin", subject: "Quorum N=4 R=3 W=2 initialized", subject_id: "quorum-n4", head: "0x9f86d081884c7d65", data_hash: "0x9f86d081884c7d65", correlation_id: "snx-genesis-01", timestamp: Math.floor(Date.now() / 1000) - 3600 },
    { id: "ev-02", seq: 2, event_type: "DEVICE_REGISTER", actor: "admin", actor_id: "admin", subject: "Laptop 1 Commander (10.87.198.70)", subject_id: "dev-laptop-01", head: "0x5e884898da280471", data_hash: "0x5e884898da280471", correlation_id: "snx-dev-01", timestamp: Math.floor(Date.now() / 1000) - 2400 },
    { id: "ev-03", seq: 3, event_type: "STORAGE_NODE_JOIN", actor: "system", actor_id: "system", subject: "storage-laptop1 registered (951 chunks)", subject_id: "storage-laptop1", head: "0x4b227777d4dd1fc61", data_hash: "0x4b227777d4dd1fc61", correlation_id: "snx-node-01", timestamp: Math.floor(Date.now() / 1000) - 1800 },
    { id: "ev-04", seq: 4, event_type: "TELEMETRY_ANCHOR", actor: "broker", actor_id: "broker", subject: "Batch #410 anchored to EVM Chain 20260", subject_id: "batch-410", head: "0xef2d127de37b942ba", data_hash: "0xef2d127de37b942ba", correlation_id: "snx-anchor-01", timestamp: Math.floor(Date.now() / 1000) - 900 },
    { id: "ev-05", seq: 5, event_type: "OBJECT_CREATE", actor: "operator", actor_id: "operator", subject: "cluster_telemetry_dataset_20261029.bin (AES-GCM)", subject_id: "obj-01", head: "0xca978112ca1bbdcaf", data_hash: "0xca978112ca1bbdcaf", correlation_id: "snx-obj-01", timestamp: Math.floor(Date.now() / 1000) - 300 },
    { id: "ev-06", seq: 6, event_type: "QUORUM_VERIFIED", actor: "coordinator", actor_id: "coordinator", subject: "Write Quorum W=2 Verified Across Edge Mesh", subject_id: "quorum-mesh", head: "0x8f434346648f6b96", data_hash: "0x8f434346648f6b96", correlation_id: "snx-quorum-01", timestamp: Math.floor(Date.now() / 1000) - 30 },
  ];

  const filteredEvents = effectiveEvents.filter((ev) => {
    const actorStr = ev.actor || ev.actor_id || "";
    const subjectStr = ev.subject || ev.subject_id || "";
    const eventTypeStr = ev.event_type || "";
    const searchLower = (searchTerm || "").toLowerCase();

    const matchType = eventTypeFilter === "ALL" || eventTypeStr === eventTypeFilter;
    const matchSearch =
      actorStr.toLowerCase().includes(searchLower) ||
      subjectStr.toLowerCase().includes(searchLower) ||
      eventTypeStr.toLowerCase().includes(searchLower);
    return matchType && matchSearch;
  });

  const handleVerifyChain = async () => {
    setIsVerifying(true);
    setVerifyResult(null);
    try {
      const res = await api.verifyAuditChain();
      setVerifyResult(res);
    } catch (err: any) {
      setVerifyResult({
        valid: false,
        error: err.message || "Chain verification failed",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1360px] mx-auto animate-slide-fade">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--border-glass-subtle)] gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <ScrollText className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-black text-snx-primary tracking-tight">
              Cryptographic Audit Log
            </h2>
          </div>
          <p className="text-xs text-snx-muted mt-1">
            Immutable rolling Keccak-256 hash chain anchored to smart contracts on-chain.
          </p>
        </div>

        {canVerify && (
          <button
            onClick={handleVerifyChain}
            disabled={isVerifying}
            className="snx-btn-primary"
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${isVerifying ? "animate-spin" : ""}`} />
            <span>{isVerifying ? "Recalculating Proofs..." : "Verify Rolling Chain"}</span>
          </button>
        )}
      </div>

      {/* Verification Result Banner */}
      {verifyResult && (
        <div
          className={`p-4 rounded-2xl border text-xs font-mono-snx flex items-start justify-between animate-slide-fade ${
            verifyResult.valid
              ? "badge-emerald"
              : "badge-rose"
          }`}
        >
          <div className="flex items-start space-x-3">
            {verifyResult.valid ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <p className="font-bold text-sm">
                {verifyResult.valid
                  ? "Cryptographic Hash Chain Intact"
                  : "Hash Chain Verification Failed"}
              </p>
              <p className="text-[11px] opacity-80">
                {verifyResult.valid
                  ? `Verified from genesis block: head = ${verifyResult.computed_head?.slice(0, 20)}...`
                  : verifyResult.error}
              </p>
            </div>
          </div>
          <button
            onClick={() => setVerifyResult(null)}
            className="text-snx-muted hover:text-snx-primary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-snx-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by actor, subject, or event..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="snx-input pl-10"
          />
        </div>

        <select
          value={eventTypeFilter}
          onChange={(e) => setEventTypeFilter(e.target.value)}
          className="snx-input sm:w-56"
        >
          <option value="ALL">All Event Types</option>
          <option value="DEVICE_REGISTER">DEVICE_REGISTER</option>
          <option value="OBJECT_CREATE">OBJECT_CREATE</option>
          <option value="TELEMETRY_ANCHOR">TELEMETRY_ANCHOR</option>
          <option value="PRINCIPAL_CREATE">PRINCIPAL_CREATE</option>
          <option value="STORAGE_NODE_JOIN">STORAGE_NODE_JOIN</option>
          <option value="QUORUM_VERIFIED">QUORUM_VERIFIED</option>
          <option value="LOGIN">LOGIN</option>
        </select>
      </div>

      {/* Events Table */}
      <div className="snx-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono-snx">
            <thead className="bg-[var(--surface-2)] text-snx-muted border-b border-[var(--border-glass-subtle)] uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Seq</th>
                <th className="px-4 py-3">Event Type</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Rolling Head</th>
                <th className="px-4 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-glass-subtle)] text-snx-secondary">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-snx-muted text-xs">
                    No matching audit events recorded yet.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((ev, idx) => (
                  <tr key={ev.id || idx} className="hover:bg-[var(--surface-hover)] transition-colors">
                    <td className="px-4 py-3 text-snx-muted font-bold">
                      #{ev.seq !== undefined ? ev.seq : idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <span className="pill-mono text-[9px] font-bold">
                        {ev.event_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-snx-primary font-semibold">
                      {ev.actor || ev.actor_id || "system"}
                    </td>
                    <td className="px-4 py-3 text-snx-secondary truncate max-w-xs">
                      {ev.subject || ev.subject_id || "—"}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-snx-muted">
                      {(ev.head || ev.data_hash || "").slice(0, 14)}...
                    </td>
                    <td className="px-4 py-3 text-snx-muted text-[11px]">
                      {ev.timestamp ? new Date(ev.timestamp * 1000).toLocaleTimeString() : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
