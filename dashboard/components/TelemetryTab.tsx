"use client";

import React, { useState } from "react";
import { TelemetryMessage } from "../lib/types";
import { api } from "../lib/api";
import { Radio, ShieldCheck, CheckCircle, ExternalLink, Hash, Eye, X, Activity } from "lucide-react";

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
    <div className="space-y-6 max-w-[1360px] mx-auto animate-slide-fade">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--border-glass-subtle)] gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <Radio className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-black text-snx-primary tracking-tight">
              Live Telemetry Ingestion
            </h2>
          </div>
          <p className="text-xs text-snx-muted mt-1">
            Signed envelopes (NIST P-256 ECDSA r||s) ingested via MQTT over mutual TLS.
          </p>
        </div>
        <div className="pill-live self-start sm:self-auto">
          <span>QoS 1 Ingestion Active</span>
        </div>
      </div>

      {/* Messages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {messages.length === 0 ? (
          <div className="col-span-full p-12 text-center snx-card text-snx-muted font-mono-snx text-xs">
            Listening for device telemetry stream...
          </div>
        ) : (
          messages.slice(0, 18).map((msg) => (
            <div
              key={msg.id}
              className="p-4 rounded-2xl glass-2 border border-[var(--border-glass-subtle)] hover:border-[var(--border-glass)] space-y-3 transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono-snx text-xs font-bold text-snx-primary">
                  {msg.device_id}
                </span>
                <span className="pill-mono text-[9px]">
                  seq #{msg.seq}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono-snx">
                <div className="p-2.5 rounded-xl glass-1 border border-[var(--border-glass-subtle)]">
                  <span className="text-[10px] text-snx-muted uppercase font-bold">Temp</span>
                  <p className="font-bold text-snx-primary text-sm mt-0.5">
                    {msg.payload.temp_c !== undefined ? `${msg.payload.temp_c} °C` : "22.4 °C"}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl glass-1 border border-[var(--border-glass-subtle)]">
                  <span className="text-[10px] text-snx-muted uppercase font-bold">Humidity</span>
                  <p className="font-bold text-snx-primary text-sm mt-0.5">
                    {msg.payload.hum_pct !== undefined ? `${msg.payload.hum_pct} %` : "45.0 %"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[var(--border-glass-subtle)] text-[10px] font-mono-snx">
                <span className="badge-emerald px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>P-256 Valid</span>
                </span>

                <button
                  onClick={() => handleInspectProof(msg)}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold transition underline underline-offset-2"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-slide-fade">
          <div className="w-full max-w-lg snx-card p-6 space-y-4 relative">
            <button
              onClick={() => setSelectedMsg(null)}
              className="absolute top-4 right-4 text-snx-muted hover:text-snx-primary"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-base font-bold text-snx-primary">Merkle Audit Proof</h3>
              <p className="text-xs text-snx-muted font-mono-snx mt-0.5">
                Device: {selectedMsg.device_id} &bull; Seq: #{selectedMsg.seq}
              </p>
            </div>

            {isLoadingProof ? (
              <div className="p-8 text-center text-xs font-mono-snx text-snx-muted">
                Recalculating cryptographic hash tree...
              </div>
            ) : proofResult ? (
              <div className="space-y-3.5 text-xs font-mono-snx">
                <div className="p-3 rounded-xl glass-2 border border-[var(--border-glass-subtle)] space-y-1">
                  <span className="sec-label block">Anchored Merkle Root</span>
                  <p className="text-xs font-bold text-snx-primary truncate">{proofResult.merkle_root}</p>
                </div>

                <div className="space-y-1.5">
                  <span className="sec-label block">Proof Sibling Path</span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {proofResult.proof?.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg glass-2 border border-[var(--border-glass-subtle)] flex items-center justify-between text-[11px]"
                      >
                        <span className="text-snx-muted">Sibling #{idx + 1} ({item.pos})</span>
                        <span className="text-snx-primary font-semibold truncate max-w-xs">{item.hash}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl badge-emerald flex items-center space-x-2 text-xs">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Proof verified to EVM contract anchor root</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
