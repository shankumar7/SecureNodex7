import React from "react";

export default function DashboardHome() {
  const planes = [
    { name: "Device Plane", status: "ONLINE", desc: "ESP32 Nodes (mTLS P-256)", badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    { name: "Gateway Plane", status: "ONLINE", desc: "snx-broker & snx-gateway", badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    { name: "Control Plane", status: "ONLINE", desc: "snx-api, snx-worker, snx-ca, DB", badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    { name: "Data Plane", status: "ONLINE", desc: "SNX-Store (R=3, W=2 Quorum)", badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    { name: "Trust Plane", status: "ONLINE", desc: "Besu / Hardhat (ID 20260) & PKI", badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top Navbar */}
      <header className="border-b border-gray-800 bg-gray-900/60 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/30">
            SX
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">SecureNodeX</h1>
            <p className="text-xs text-gray-400">Decentralised IoT Trust & Split Storage Platform</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-900/40 text-blue-300 border border-blue-700/50">
            Chain ID: 20260
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-900/40 text-emerald-300 border border-emerald-700/50">
            All Systems Operational
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-8">
        {/* Architecture Planes Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Architecture Planes</h2>
            <span className="text-xs text-gray-400">5/5 Connected</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {planes.map((p) => (
              <div key={p.name} className="p-4 rounded-xl bg-gray-900/40 border border-gray-800 space-y-2 hover:border-gray-700 transition">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-200">{p.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${p.badge}`}>{p.status}</span>
                </div>
                <p className="text-xs text-gray-400">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Storage & Security Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="p-6 rounded-xl bg-gray-900/40 border border-gray-800 space-y-4">
            <h3 className="text-lg font-semibold text-white">Storage Parameters (SNX-Store)</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 rounded-lg bg-gray-950/60 border border-gray-800/80">
                <span className="text-xs text-gray-400">Chunk Size</span>
                <p className="text-lg font-bold text-blue-400">64 KiB</p>
                <span className="text-[10px] text-gray-500">AES-256-GCM</span>
              </div>
              <div className="p-3 rounded-lg bg-gray-950/60 border border-gray-800/80">
                <span className="text-xs text-gray-400">Replication (R)</span>
                <p className="text-lg font-bold text-emerald-400">3 Replicas</p>
                <span className="text-[10px] text-gray-500">HRW Rendezvous</span>
              </div>
              <div className="p-3 rounded-lg bg-gray-950/60 border border-gray-800/80">
                <span className="text-xs text-gray-400">Write Quorum (W)</span>
                <p className="text-lg font-bold text-purple-400">2 ACKs</p>
                <span className="text-[10px] text-gray-500">Strict Quorum</span>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              Content-addressed chunks indexed by SHA-256 ciphertext hash. Replicated across independent nodes with self-healing background repair.
            </p>
          </section>

          <section className="p-6 rounded-xl bg-gray-900/40 border border-gray-800 space-y-4">
            <h3 className="text-lg font-semibold text-white">Cryptographic Standards</h3>
            <ul className="space-y-2 text-xs text-gray-300">
              <li className="flex items-center justify-between p-2 rounded bg-gray-950/40 border border-gray-800/60">
                <span>Identity & Transport</span>
                <span className="font-mono text-blue-400">NIST P-256 ECDSA / mTLS</span>
              </li>
              <li className="flex items-center justify-between p-2 rounded bg-gray-950/40 border border-gray-800/60">
                <span>Payload Integrity & Signing</span>
                <span className="font-mono text-emerald-400">SHA-256 + ECDSA (r||s)</span>
              </li>
              <li className="flex items-center justify-between p-2 rounded bg-gray-950/40 border border-gray-800/60">
                <span>Data Confidentiality & Key Wrap</span>
                <span className="font-mono text-purple-400">AES-256-GCM + ECIES P-256</span>
              </li>
              <li className="flex items-center justify-between p-2 rounded bg-gray-950/40 border border-gray-800/60">
                <span>Blockchain Operators</span>
                <span className="font-mono text-yellow-400">secp256k1 (Besu QBFT)</span>
              </li>
            </ul>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-4 px-6 text-center text-xs text-gray-500">
        SecureNodeX Platform &copy; 2026 | Team CodeCommit | Smart India Hackathon
      </footer>
    </div>
  );
}
