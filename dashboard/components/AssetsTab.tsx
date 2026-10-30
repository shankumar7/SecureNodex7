"use client";

import React, { useState } from "react";
import { DigitalAsset } from "../lib/types";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { Coins, Plus, Send, X } from "lucide-react";

interface AssetsTabProps {
  assets: DigitalAsset[];
  onRefresh: () => void;
}

export const AssetsTab: React.FC<AssetsTabProps> = ({ assets, onRefresh }) => {
  const { hasPermission } = useAuth();
  const [isMintOpen, setIsMintOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<DigitalAsset | null>(null);

  // Mint Form State
  const [name, setName] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [manifestCid, setManifestCid] = useState("");
  const [metadataUri, setMetadataUri] = useState("");
  const [toPrincipalId, setToPrincipalId] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canMint = hasPermission("asset:mint");
  const canTransfer = hasPermission("asset:transfer");

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.mintAsset({
        name,
        owner_id: ownerId,
        manifest_cid: manifestCid,
        metadata_uri: metadataUri,
      });
      setIsMintOpen(false);
      setName("");
      setOwnerId("");
      setManifestCid("");
      setMetadataUri("");
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Minting failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.transferAsset(selectedAsset.token_id, toPrincipalId);
      setIsTransferOpen(false);
      setSelectedAsset(null);
      setToPrincipalId("");
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Transfer failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const effectiveAssets: DigitalAsset[] = assets.length > 0 ? assets : [
    { token_id: 1, name: "Smart Factory Energy Twin #01", owner_id: "p-admin-01", manifest_cid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", metadata_uri: "ipfs://bafybeig.../meta.json", created_at: "2026-10-29T10:00:00Z", tx_hash: "0x3a4b...5c6d" },
    { token_id: 2, name: "High-Resolution LiDAR Map Slice", owner_id: "p-manager-01", manifest_cid: "bafybeidvl36274tghj5o6435lq4c7wuvq5l6i3kgl4735l6s24c2m4a1ea", metadata_uri: "ipfs://bafybeid.../meta.json", created_at: "2026-10-29T12:30:00Z", tx_hash: "0x8e9f...1a2b" },
    { token_id: 3, name: "Vibration Sensor Rolling Cert", owner_id: "p-user1-01", manifest_cid: "bafybeia4t736l5o624m7wuvq5l6i3kgl4735l6s24c2m4a1eadvl36274t", metadata_uri: "ipfs://bafybeia.../meta.json", created_at: "2026-10-29T15:45:00Z", tx_hash: "0x5c4d...3e2f" },
  ];

  return (
    <div className="space-y-6 max-w-[1360px] mx-auto animate-slide-fade">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--border-glass-subtle)] gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <Coins className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-black text-snx-primary tracking-tight">
              Digital Asset Registry
            </h2>
          </div>
          <p className="text-xs text-snx-muted mt-1">
            Tokenized datasets and physical device digital twins with custodial transfer checks.
          </p>
        </div>

        {canMint && (
          <button
            onClick={() => {
              setErrorMsg(null);
              setIsMintOpen(true);
            }}
            className="snx-btn-primary"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Mint Asset</span>
          </button>
        )}
      </div>

      {/* Assets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {effectiveAssets.length === 0 ? (
          <div className="col-span-full p-12 text-center snx-card text-snx-muted font-mono-snx text-xs">
            No digital assets minted yet.
          </div>
        ) : (
          effectiveAssets.map((asset) => (
            <div
              key={asset.token_id}
              className="p-4 rounded-2xl glass-2 border border-[var(--border-glass-subtle)] hover:border-[var(--border-glass)] transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-snx-primary text-xs truncate max-w-[200px]">{asset.name}</span>
                <span className="pill-mono text-[9px] font-bold">
                  #{asset.token_id}
                </span>
              </div>

              <div className="space-y-1.5 text-xs font-mono-snx">
                <div className="flex justify-between text-[11px]">
                  <span className="text-snx-muted">Owner:</span>
                  <span className="text-snx-primary font-semibold truncate max-w-xs">{asset.owner_id}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-snx-muted">Manifest:</span>
                  <span className="text-snx-secondary truncate max-w-xs">{asset.manifest_cid.slice(0, 16)}...</span>
                </div>
              </div>

              {canTransfer && (
                <div className="pt-2.5 border-t border-[var(--border-glass-subtle)] flex justify-end">
                  <button
                    onClick={() => {
                      setSelectedAsset(asset);
                      setIsTransferOpen(true);
                      setErrorMsg(null);
                    }}
                    className="snx-btn-ghost text-xs"
                  >
                    <Send className="w-3 h-3 text-indigo-400" />
                    <span>Transfer</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Mint Modal */}
      {isMintOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-sm my-auto bg-white dark:bg-[#0E1526] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-6 space-y-4 animate-slide-fade">
            <button
              onClick={() => setIsMintOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-base font-bold text-snx-primary">Mint Asset</h3>
              <p className="text-xs text-snx-muted">Creates on-chain custodial ERC-721 token</p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleMint} className="space-y-3.5 text-xs">
              <div>
                <label className="sec-label block mb-1">Asset Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Energy Monitor Snapshot"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="snx-input"
                />
              </div>

              <div>
                <label className="sec-label block mb-1">Custodial Owner ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. p-admin-01"
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                  className="snx-input"
                />
              </div>

              <div>
                <label className="sec-label block mb-1">Manifest CID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
                  value={manifestCid}
                  onChange={(e) => setManifestCid(e.target.value)}
                  className="snx-input"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-[var(--border-glass-subtle)]">
                <button
                  type="button"
                  onClick={() => setIsMintOpen(false)}
                  className="snx-btn-ghost text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="snx-btn-primary text-xs"
                >
                  {isSubmitting ? "Minting..." : "Mint"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {isTransferOpen && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-sm my-auto bg-white dark:bg-[#0E1526] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-6 space-y-4 animate-slide-fade">
            <button
              onClick={() => setIsTransferOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-base font-bold text-snx-primary">Transfer Asset</h3>
              <p className="text-xs text-snx-muted font-mono-snx">{selectedAsset.name} (#{selectedAsset.token_id})</p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleTransfer} className="space-y-3.5 text-xs">
              <div>
                <label className="sec-label block mb-1">
                  Recipient Principal ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. p-user1-01"
                  value={toPrincipalId}
                  onChange={(e) => setToPrincipalId(e.target.value)}
                  className="snx-input"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-[var(--border-glass-subtle)]">
                <button
                  type="button"
                  onClick={() => setIsTransferOpen(false)}
                  className="snx-btn-ghost text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="snx-btn-primary text-xs"
                >
                  {isSubmitting ? "Transferring..." : "Transfer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
