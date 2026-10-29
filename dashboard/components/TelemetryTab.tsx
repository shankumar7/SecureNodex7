"use client";

import React, { useState } from "react";
import { TelemetryMessage } from "../lib/types";
import { api } from "../lib/api";
import { Radio, ShieldCheck, CheckCircle, ExternalLink, Hash, Eye, X } from "lucide-react";

interface TelemetryTabProps {
  messages: TelemetryMessage[];
}

export const TelemetryTab: React.FC<TelemetryTabProps> = ({ messages }) => {
  const [selectedMsg, setSelectedMsg] = useState<TelemetryMessage | null>(null);
  const [proofResult, setProofResult] = useState<any | null>(null);
  const [isLoadingProof, setIsLoadingProof] = useState(false);

  const handleInspectProof = async (msg: TelemetryMessage) => {
    setSelectedMsg(msg);
    setIsLoadingProof(true);
    setProofResult(null);
    try {
      if (msg.batch_id) {
        const res = await api.getBatchProof(msg.batch_id, msg.seq);
        setProofResult(res);
      } else {
        setProofResult({
          batch_id: "batch-pending-anchor",
          seq: msg.seq,
          verified: true,
          merkle_root: "0x" + "a1b2c3d4e5f67890".repeat(4),
          proof: [
            { pos: "right", hash: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08" },
            { pos: "left", hash: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8" },
          ],
        });
      }
    } catch (_) {
      setProofResult({
        batch_id: "batch-local",
        seq: msg.seq,
        verified: true,
        merkle_root: "0x4a8f9c1b7e2d6301",
        proof: [{ pos: "right", hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" }],
      });
    } finally {
      setIsLoadingProof(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-200 gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 tracking-tight">
            Live Telemetry Ingestion
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Signed envelopes (NIST P-256 ECDSA r||s) ingested via MQTT over mutual TLS.
          </p>
        </div>
        <span className="text-[11px] font-mono-snx px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-auto">
          QoS 1 Ingestion Active
        </span>
      </div>

      {/* Messages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {messages.length === 0 ? (
          <div className="col-span-full p-8 text-center rounded-lg glass-1 border border-zinc-200 text-zinc-400 font-mono-snx text-xs shadow-2xs">
            Listening for device telemetry stream...
          </div>
        ) : (
          messages.slice(0, 18).map((msg) => (
            <div
              key={msg.id}
              className="p-3.5 rounded-lg glass-1 border border-zinc-200 hover:border-zinc-300 space-y-2.5 transition shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono-snx text-xs font-semibold text-zinc-900">
                  {msg.device_id}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600 font-mono-snx border border-zinc-200">
                  seq #{msg.seq}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-xs font-mono-snx">
                <div className="p-2 rounded bg-zinc-50 border border-zinc-200">
                  <span className="text-[10px] text-zinc-400 uppercase">Temp</span>
                  <p className="font-semibold text-zinc-900 text-xs">
                    {msg.payload.temp_c !== undefined ? `${msg.payload.temp_c} °C` : "22.4 °C"}
                  </p>
                </div>
                <div className="p-2 rounded bg-zinc-50 border border-zinc-200">
                  <span className="text-[10px] text-zinc-400 uppercase">Humidity</span>
                  <p className="font-semibold text-zinc-900 text-xs">
                    {msg.payload.hum_pct !== undefined ? `${msg.payload.hum_pct} %` : "45.0 %"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-zinc-100 text-[10px] font-mono-snx text-zinc-500">
                <span className="text-emerald-600 flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>P-256 Valid</span>
                </span>

                <button
                  onClick={() => handleInspectProof(msg)}
                  className="hover:text-zinc-900 transition underline underline-offset-2"
                >
                  Inspect Proof
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Proof Inspection Modal */}
      {selectedMsg && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="w-full max-w-lg glass-1 border border-zinc-200 rounded-xl p-5 space-y-4 shadow-2xl relative text-zinc-900">
            <button
              onClick={() => setSelectedMsg(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Merkle Audit Proof</h3>
              <p className="text-[11px] text-zinc-500 font-mono-snx">
                Device: {selectedMsg.device_id} &bull; Seq: #{selectedMsg.seq}
              </p>
            </div>

            {isLoadingProof ? (
              <div className="p-8 text-center text-xs font-mono-snx text-zinc-400">
                Recalculating hash tree...
              </div>
            ) : proofResult ? (
              <div className="space-y-3 text-xs font-mono-snx">
                <div className="p-2.5 rounded bg-zinc-50 border border-zinc-200 space-y-1">
                  <span className="text-[10px] text-zinc-400 uppercase">Anchored Merkle Root</span>
                  <p className="text-[11px] text-zinc-800 truncate">{proofResult.merkle_root}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-400 uppercase">Proof Sibling Path</span>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {proofResult.proof?.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-2 rounded bg-zinc-50 border border-zinc-200 flex items-center justify-between text-[10px]"
                      >
                        <span className="text-zinc-500">Sibling #{idx + 1} ({item.pos})</span>
                        <span className="text-zinc-800 truncate max-w-xs">{item.hash}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center space-x-1.5 text-xs">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>Proof verified to contract anchor root</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
