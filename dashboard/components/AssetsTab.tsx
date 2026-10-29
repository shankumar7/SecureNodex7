"use client";

import React, { useState } from "react";
import { DigitalAsset } from "../lib/types";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { Coins, Plus, Send, ExternalLink, ShieldAlert, CheckCircle, X } from "lucide-react";

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Coins className="w-5 h-5 text-amber-600" />
            <span>Digital Asset Registry (ERC-721 Restricted)</span>
          </h2>
          <p className="text-xs text-slate-600 font-medium">
            Tokenized datasets and physical device digital twins with transfer-restricted policy rules.
          </p>
        </div>

        {canMint && (
          <button
            onClick={() => {
              setErrorMsg(null);
              setIsMintOpen(true);
            }}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Mint Digital Asset</span>
          </button>
        )}
      </div>

      {/* Assets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assets.length === 0 ? (
          <div className="col-span-full p-12 text-center rounded-2xl bg-white border border-slate-200 text-slate-500 font-medium text-xs shadow-xs">
            No digital assets minted yet.
          </div>
        ) : (
          assets.map((asset) => (
            <div
              key={asset.token_id}
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 space-y-3 transition shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-amber-800 font-black">
                  Asset #{asset.token_id}
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                  ERC-721
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900">{asset.name}</h3>
                <p className="text-[11px] text-slate-500 font-mono truncate font-medium">
                  Owner: {asset.owner_id}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-[11px] font-medium">
                <div className="flex justify-between text-slate-600">
                  <span>Manifest CID:</span>
                  <span className="font-mono text-slate-900 font-bold truncate max-w-[140px]">
                    {asset.manifest_cid}
                  </span>
                </div>
                {asset.tx_hash && (
                  <div className="flex justify-between text-slate-600">
                    <span>Tx Hash:</span>
                    <span className="font-mono text-blue-700 font-bold truncate max-w-[140px]">
                      {asset.tx_hash.slice(0, 10)}...
                    </span>
                  </div>
                )}
              </div>

              {canTransfer && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                  <button
                    onClick={() => {
                      setSelectedAsset(asset);
                      setErrorMsg(null);
                      setIsTransferOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold flex items-center space-x-1.5 transition shadow-2xs"
                  >
                    <Send className="w-3.5 h-3.5 text-slate-600" />
                    <span>Transfer Asset</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Mint Asset Modal */}
      {isMintOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xl relative text-slate-900">
            <button
              onClick={() => setIsMintOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Mint Restricted Asset</h3>
                <p className="text-xs text-slate-600 font-medium">Registers ERC-721 token in AssetRegistry</p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-100 border border-red-200 text-red-800 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleMint} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Asset Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flight Telemetry Log #402"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Owner Principal ID</label>
                <input
                  type="text"
                  required
                  placeholder="did:snx:user1"
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Manifest CID</label>
                <input
                  type="text"
                  required
                  placeholder="SHA-256 manifest hash"
                  value={manifestCid}
                  onChange={(e) => setManifestCid(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-600 font-medium font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsMintOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 font-semibold border border-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-xs font-bold text-white shadow-md shadow-amber-600/20 transition disabled:opacity-50"
                >
                  {isSubmitting ? "Minting on Chain..." : "Mint Asset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {isTransferOpen && selectedAsset && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xl relative text-slate-900">
            <button
              onClick={() => setIsTransferOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Transfer Asset #{selectedAsset.token_id}</h3>
                <p className="text-xs text-slate-600 font-medium">{selectedAsset.name}</p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-100 border border-red-200 text-red-800 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Recipient Principal ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="did:snx:auditor1"
                  value={toPrincipalId}
                  onChange={(e) => setToPrincipalId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-600 font-medium font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsTransferOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 font-semibold border border-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-xs font-bold text-white shadow-md shadow-amber-600/20 transition disabled:opacity-50"
                >
                  {isSubmitting ? "Transferring..." : "Execute Transfer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
