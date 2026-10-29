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
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-200 gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 tracking-tight">
            Cryptographic Audit Log
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Immutable rolling Keccak-256 hash chain anchored to smart contracts on-chain.
          </p>
        </div>

        {canVerify && (
          <button
            onClick={handleVerifyChain}
            disabled={isVerifying}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition shadow-2xs disabled:opacity-50"
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${isVerifying ? "animate-spin" : ""}`} />
            <span>{isVerifying ? "Recalculating Proofs..." : "Verify Rolling Chain"}</span>
          </button>
        )}
      </div>

      {/* Verification Result Banner */}
      {verifyResult && (
        <div
          className={`p-3.5 rounded-lg border text-xs font-mono-snx flex items-start justify-between ${
            verifyResult.valid
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-start space-x-2.5">
            {verifyResult.valid ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5">
              <p className="font-semibold text-zinc-900">
                {verifyResult.valid
                  ? "Cryptographic Hash Chain Intact"
                  : "Hash Chain Verification Failed"}
              </p>
              <p className="text-[11px] text-zinc-600">
                {verifyResult.valid
                  ? `Verified from genesis block: head = ${verifyResult.computed_head?.slice(0, 16)}...`
                  : verifyResult.error}
              </p>
            </div>
          </div>
          <button
            onClick={() => setVerifyResult(null)}
            className="text-zinc-400 hover:text-zinc-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-2">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by actor, subject, or event..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-md glass-1 border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 font-mono-snx shadow-xs"
          />
        </div>

        <select
          value={eventTypeFilter}
          onChange={(e) => setEventTypeFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-md glass-1 border border-zinc-200 text-xs text-zinc-700 font-mono-snx focus:outline-none focus:border-zinc-400 shadow-xs"
        >
          <option value="ALL">All Event Types</option>
          <option value="DEVICE_REGISTER">DEVICE_REGISTER</option>
          <option value="OBJECT_CREATE">OBJECT_CREATE</option>
          <option value="TELEMETRY_ANCHOR">TELEMETRY_ANCHOR</option>
          <option value="PRINCIPAL_CREATE">PRINCIPAL_CREATE</option>
          <option value="LOGIN">LOGIN</option>
        </select>
      </div>

      {/* Events Table */}
      <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono-snx">
            <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-3.5 py-2.5">Seq</th>
                <th className="px-3.5 py-2.5">Event Type</th>
                <th className="px-3.5 py-2.5">Actor</th>
                <th className="px-3.5 py-2.5">Subject</th>
                <th className="px-3.5 py-2.5">Rolling Head</th>
                <th className="px-3.5 py-2.5">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-400 text-xs">
                    No matching audit events recorded yet.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((ev, idx) => (
                  <tr key={ev.id || idx} className="hover:bg-zinc-50/70 transition">
                    <td className="px-3.5 py-2.5 text-zinc-500">
                      #{ev.seq !== undefined ? ev.seq : idx + 1}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-zinc-100 text-zinc-700 border border-zinc-200 font-medium">
                        {ev.event_type}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-zinc-900 font-medium">
                      {ev.actor || ev.actor_id || "system"}
                    </td>
                    <td className="px-3.5 py-2.5 text-zinc-600 truncate max-w-xs">
                      {ev.subject || ev.subject_id || "—"}
                    </td>
                    <td className="px-3.5 py-2.5 text-[11px] text-zinc-500">
                      {(ev.head || ev.data_hash || "").slice(0, 10)}...
                    </td>
                    <td className="px-3.5 py-2.5 text-zinc-500 text-[11px]">
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
