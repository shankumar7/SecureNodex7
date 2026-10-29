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
      return "bg-red-100 text-red-800 border-red-300 font-bold shadow-2xs";
    }
    if (type.includes("REGISTER") || type.includes("ANCHOR") || type.includes("MINT")) {
      return "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold shadow-2xs";
    }
    return "bg-blue-100 text-blue-800 border-blue-300 font-bold shadow-2xs";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <ScrollText className="w-5 h-5 text-amber-600" />
            <span>Cryptographic Audit Log & Hash Chain</span>
          </h2>
          <p className="text-xs text-slate-600 font-medium">
            Immutable rolling hash chain (keccak256) anchored to the AuditLog smart contract.
          </p>
        </div>

        {canVerify && (
          <button
            onClick={handleVerifyChain}
            disabled={isVerifying}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
          >
            <ShieldCheck className={`w-4 h-4 ${isVerifying ? "animate-spin" : ""}`} />
            <span>{isVerifying ? "Recomputing Genesis Chain..." : "Verify Hash Chain"}</span>
          </button>
        )}
      </div>

      {/* Verification Result Banner */}
      {verifyResult && (
        <div
          className={`p-4 rounded-2xl border flex items-start justify-between shadow-xs ${
            verifyResult.valid
              ? "bg-emerald-50 border-emerald-200 text-emerald-900 font-bold"
              : "bg-red-50 border-red-200 text-red-900 font-bold"
          }`}
        >
          <div className="flex items-start space-x-3">
            {verifyResult.valid ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1 text-xs">
              <p className="font-black text-sm">
                {verifyResult.valid
                  ? `Cryptographic Audit Chain Intact: ${verifyResult.checked} events verified from genesis.`
                  : `Tamper Detected! Chain mismatch at index ${verifyResult.tampered_index ?? "unknown"}.`}
              </p>
              {verifyResult.calculated_head && (
                <p className="font-mono text-[11px] text-slate-700 font-semibold break-all">
                  Calculated Head: {verifyResult.calculated_head}
                </p>
              )}
            </div>
          </div>
          <button onClick={() => setVerifyResult(null)} className="text-slate-400 hover:text-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by actor, subject, or event..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 font-medium shadow-2xs transition"
          />
        </div>

        <select
          value={eventTypeFilter}
          onChange={(e) => setEventTypeFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-600 shadow-2xs"
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
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="px-4 py-3">Seq</th>
                <th className="px-4 py-3">Event Type</th>
                <th className="px-4 py-3">Actor & Subject</th>
                <th className="px-4 py-3">Rolling Hash Head</th>
                <th className="px-4 py-3">Correlation ID</th>
                <th className="px-4 py-3 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500 font-medium">
                    No matching audit events recorded yet.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-600">
                      #{ev.seq || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getEventBadgeClass(
                          ev.event_type
                        )}`}
                      >
                        {ev.event_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px]">
                      <div className="truncate max-w-xs font-semibold">
                        <span className="text-slate-900 font-bold">{ev.actor || ev.actor_id || "system"}</span>
                        <span className="text-slate-400"> → </span>
                        <span className="text-blue-700 font-bold">{ev.subject || ev.subject_id || "cluster"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-amber-800 font-bold">
                      {ev.head ? `${ev.head.slice(0, 12)}...` : "0x00000000..."}
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px] text-slate-500 font-medium">
                      {ev.correlation_id}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 font-bold text-[11px]">
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
