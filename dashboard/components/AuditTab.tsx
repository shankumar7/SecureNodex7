"use client";

import React, { useState } from "react";
import { AuditEvent } from "../lib/types";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { ScrollText, ShieldCheck, ShieldAlert, CheckCircle, Search, RefreshCw, X } from "lucide-react";

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

  const filteredEvents = events.filter((ev) => {
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

  const getEventBadgeClass = (type: string) => {
    if (type.includes("REVOKE") || type.includes("DENIED") || type.includes("TOMBSTONE")) {
      return "bg-red-500/10 text-red-400 border-red-500/30";
    }
    if (type.includes("REGISTER") || type.includes("ANCHOR") || type.includes("MINT")) {
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    }
    return "bg-blue-500/10 text-blue-400 border-blue-500/30";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <ScrollText className="w-5 h-5 text-yellow-400" />
            <span>Cryptographic Audit Log & Hash Chain</span>
          </h2>
          <p className="text-xs text-gray-400">
            Immutable rolling hash chain (keccak256) anchored to the AuditLog smart contract.
          </p>
        </div>

        {canVerify && (
          <button
            onClick={handleVerifyChain}
            disabled={isVerifying}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition disabled:opacity-50"
          >
            <ShieldCheck className={`w-4 h-4 ${isVerifying ? "animate-spin" : ""}`} />
            <span>{isVerifying ? "Recomputing Genesis Chain..." : "Verify Hash Chain"}</span>
          </button>
        )}
      </div>

      {/* Verification Result Banner */}
      {verifyResult && (
        <div
          className={`p-4 rounded-xl border flex items-start justify-between shadow-xl ${
            verifyResult.valid
              ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
              : "bg-red-950/40 border-red-800/60 text-red-300"
          }`}
        >
          <div className="flex items-start space-x-3">
            {verifyResult.valid ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1 text-xs">
              <p className="font-bold">
                {verifyResult.valid
                  ? `Cryptographic Audit Chain Intact: ${verifyResult.checked} events verified from genesis.`
                  : `Tamper Detected! Chain mismatch at index ${verifyResult.tampered_index ?? "unknown"}.`}
              </p>
              {verifyResult.calculated_head && (
                <p className="font-mono text-[11px] text-gray-300 break-all">
                  Calculated Head: {verifyResult.calculated_head}
                </p>
              )}
            </div>
          </div>
          <button onClick={() => setVerifyResult(null)} className="text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by actor, subject, or event..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-900 border border-gray-800 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <select
          value={eventTypeFilter}
          onChange={(e) => setEventTypeFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 text-xs text-gray-300 focus:outline-none focus:border-blue-500"
        >
          <option value="ALL">All Event Types</option>
          <option value="DEVICE_REGISTERED">DEVICE_REGISTERED</option>
          <option value="DEVICE_REVOKED">DEVICE_REVOKED</option>
          <option value="BATCH_ANCHORED">BATCH_ANCHORED</option>
          <option value="OBJECT_STORED">OBJECT_STORED</option>
          <option value="ASSET_MINTED">ASSET_MINTED</option>
          <option value="ACCESS_DENIED">ACCESS_DENIED</option>
        </select>
      </div>

      {/* Timeline List */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/40 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-950/80 text-gray-400 border-b border-gray-800 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Seq</th>
                <th className="px-4 py-3">Event Type</th>
                <th className="px-4 py-3">Actor & Subject</th>
                <th className="px-4 py-3">Rolling Hash Head</th>
                <th className="px-4 py-3">Correlation ID</th>
                <th className="px-4 py-3 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 text-gray-300">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No matching audit events recorded yet.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-gray-800/30 transition">
                    <td className="px-4 py-3 font-mono font-bold text-gray-400">
                      #{ev.seq || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${getEventBadgeClass(
                          ev.event_type
                        )}`}
                      >
                        {ev.event_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px]">
                      <div className="truncate max-w-xs">
                        <span className="text-white">{ev.actor || ev.actor_id || "system"}</span>
                        <span className="text-gray-500"> → </span>
                        <span className="text-blue-400">{ev.subject || ev.subject_id || "cluster"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-yellow-400/90">
                      {ev.head ? `${ev.head.slice(0, 12)}...` : "0x00000000..."}
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px] text-gray-500">
                      {ev.correlation_id}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 text-[11px]">
                      {new Date(ev.timestamp * 1000).toLocaleTimeString()}
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
