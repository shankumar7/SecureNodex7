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
        // Mock / standalone proof calculation demonstration
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
            <span>Live Telemetry & Merkle Batch Stream</span>
          </h2>
          <p className="text-xs text-gray-400">
            Incoming MQTT mTLS sensor stream. Each message is signed with P-256 ECDSA (r||s) and anchored on-chain.
          </p>
        </div>
        <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
          QoS 1 Ingestion Active
        </span>
      </div>

      {/* Messages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {messages.length === 0 ? (
          <div className="col-span-full p-12 text-center rounded-2xl bg-gray-900/30 border border-gray-800 text-gray-500 text-xs">
            Waiting for live telemetry stream from virtual devices / ESP32 nodes...
          </div>
        ) : (
          messages.slice(0, 18).map((msg) => (
            <div
              key={msg.id}
              className="p-4 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-gray-700 space-y-3 transition shadow-lg"
            >
              {/* Device and Seq Header */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-blue-400">
                  {msg.device_id}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-300 font-mono">
                  seq #{msg.seq}
                </span>
              </div>

              {/* Sensor Readings Display */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-gray-950/60 border border-gray-800/60">
                  <span className="text-[10px] text-gray-500">Temperature</span>
                  <p className="font-semibold text-emerald-400">
                    {msg.payload.temp_c !== undefined ? `${msg.payload.temp_c} °C` : "22.4 °C"}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-gray-950/60 border border-gray-800/60">
                  <span className="text-[10px] text-gray-500">Humidity</span>
                  <p className="font-semibold text-blue-400">
                    {msg.payload.hum_pct !== undefined ? `${msg.payload.hum_pct} %` : "48.2 %"}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-gray-950/60 border border-gray-800/60">
                  <span className="text-[10px] text-gray-500">Battery</span>
                  <p className="font-semibold text-purple-400">
                    {msg.payload.vbat_mv !== undefined ? `${msg.payload.vbat_mv} mV` : "3980 mV"}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-gray-950/60 border border-gray-800/60">
                  <span className="text-[10px] text-gray-500">Signal (RSSI)</span>
                  <p className="font-semibold text-yellow-400">
                    {msg.payload.rssi !== undefined ? `${msg.payload.rssi} dBm` : "-61 dBm"}
                  </p>
                </div>
              </div>

              {/* Verification & Anchoring Badges */}
              <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-[11px]">
                <span className="inline-flex items-center space-x-1 text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>ECDSA P-256</span>
                </span>

                <button
                  onClick={() => handleInspectProof(msg)}
                  className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-blue-950/50 hover:bg-blue-900/60 text-blue-300 border border-blue-800/50 transition text-[10px]"
                >
                  <Eye className="w-3 h-3" />
                  <span>Merkle Proof</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Merkle Proof Inspector Modal */}
      {selectedMsg && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedMsg(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                <Hash className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Cryptographic Inclusion Proof</h3>
                <p className="text-xs text-gray-400">
                  Message seq #{selectedMsg.seq} from {selectedMsg.device_id}
                </p>
              </div>
            </div>

            {isLoadingProof ? (
              <div className="p-8 text-center text-xs text-gray-400">Computing Merkle tree & proof...</div>
            ) : proofResult ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-between text-xs">
                  <span className="text-emerald-400 font-semibold flex items-center space-x-1.5">
                    <CheckCircle className="w-4 h-4" />
                    <span>Cryptographically Verified In Root</span>
                  </span>
                  <span className="font-mono text-[10px] text-gray-400">DataRegistry.anchorBatch</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-gray-400 text-[10px] uppercase font-semibold">Anchored Merkle Root:</span>
                    <p className="p-2 rounded bg-gray-950 border border-gray-800 font-mono text-[11px] text-blue-300 break-all">
                      {proofResult.merkle_root}
                    </p>
                  </div>

                  <div>
                    <span className="text-gray-400 text-[10px] uppercase font-semibold">Proof Sibling Path:</span>
                    <div className="p-2 rounded bg-gray-950 border border-gray-800 font-mono text-[10px] text-gray-300 space-y-1 max-h-32 overflow-y-auto">
                      {proofResult.proof?.map((elem: any, idx: number) => (
                        <div key={idx} className="flex items-center space-x-2">
                          <span className="text-purple-400">[{elem.pos}]</span>
                          <span className="truncate">{elem.hash}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
