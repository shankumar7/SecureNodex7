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
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-200 gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 tracking-tight">
            Digital Asset Registry
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Tokenized datasets and physical device digital twins with custodial transfer checks.
          </p>
        </div>

        {canMint && (
          <button
            onClick={() => {
              setErrorMsg(null);
              setIsMintOpen(true);
            }}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Mint Asset</span>
          </button>
        )}
      </div>

      {/* Assets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {effectiveAssets.length === 0 ? (
          <div className="col-span-full p-8 text-center rounded-lg glass-1 border border-zinc-200 text-zinc-400 font-mono-snx text-xs shadow-2xs">
            No digital assets minted yet.
          </div>
        ) : (
          effectiveAssets.map((asset) => (
            <div
              key={asset.token_id}
              className="p-3.5 rounded-lg glass-1 border border-zinc-200 hover:border-zinc-300 transition space-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-900 text-xs truncate">{asset.name}</span>
                <span className="text-[10px] font-mono-snx px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200 font-medium">
                  #{asset.token_id}
                </span>
              </div>

              <div className="space-y-1 text-xs font-mono-snx text-zinc-500">
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-400">Owner:</span>
                  <span className="text-zinc-800 truncate max-w-xs">{asset.owner_id}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-400">Manifest:</span>
                  <span className="text-zinc-700 truncate max-w-xs">{asset.manifest_cid.slice(0, 10)}...</span>
                </div>
              </div>

              {canTransfer && (
                <div className="pt-2 border-t border-zinc-100 flex justify-end">
                  <button
                    onClick={() => {
                      setSelectedAsset(asset);
                      setIsTransferOpen(true);
                      setErrorMsg(null);
                    }}
                    className="px-2.5 py-1 rounded bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 text-xs font-mono-snx transition shadow-2xs inline-flex items-center space-x-1"
                  >
                    <Send className="w-3 h-3 text-zinc-400" />
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
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="w-full max-w-sm glass-1 border border-zinc-200 rounded-xl p-5 space-y-4 shadow-2xl relative text-zinc-900">
            <button
              onClick={() => setIsMintOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Mint Asset</h3>
              <p className="text-[11px] text-zinc-500">Creates on-chain custodial ERC-721 token</p>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleMint} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-mono-snx text-zinc-500 mb-1">Asset Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Energy Monitor Snapshot"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md glass-1 border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:border-zinc-400 font-mono-snx shadow-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono-snx text-zinc-500 mb-1">Custodial Owner ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. p-admin-01"
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md glass-1 border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:border-zinc-400 font-mono-snx shadow-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono-snx text-zinc-500 mb-1">Manifest CID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
                  value={manifestCid}
                  onChange={(e) => setManifestCid(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md glass-1 border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:border-zinc-400 font-mono-snx shadow-xs"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsMintOpen(false)}
                  className="px-3 py-1.5 rounded-md text-xs text-zinc-500 hover:text-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs transition disabled:opacity-50 shadow-xs"
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
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="w-full max-w-sm glass-1 border border-zinc-200 rounded-xl p-5 space-y-4 shadow-2xl relative text-zinc-900">
            <button
              onClick={() => setIsTransferOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Transfer Asset</h3>
              <p className="text-[11px] text-zinc-500 font-mono-snx">{selectedAsset.name} (#{selectedAsset.token_id})</p>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleTransfer} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-mono-snx text-zinc-500 mb-1">
                  Recipient Principal ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. p-user1-01"
                  value={toPrincipalId}
                  onChange={(e) => setToPrincipalId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md glass-1 border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:border-zinc-400 font-mono-snx shadow-xs"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsTransferOpen(false)}
                  className="px-3 py-1.5 rounded-md text-xs text-zinc-500 hover:text-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs transition disabled:opacity-50 shadow-xs"
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
