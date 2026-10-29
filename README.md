# 🛡️ SecureNodeX

> **Decentralized, ECC-Secured Zero-Trust Platform for Device Identity, Role-Based Access Control (RBAC), Digital Asset Management, Tamper-Evident Blockchain Auditing, and Autonomous Replicated Edge Storage.**

[![Solidity](https://img.shields.io/badge/Solidity-0.8.24%20Cancun-363636?logo=solidity)](https://soliditylang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2%20App%20Router-black?logo=next.js)](https://nextjs.org/)
[![EVM](https://img.shields.io/badge/Blockchain-EVM%20QBFT%20%2F%20Hardhat-627EEA?logo=ethereum&logoColor=white)](https://besu.hyperledger.org/)
[![Docker](https://img.shields.io/badge/Deployment-Docker%20Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 📌 Executive Summary

Modern edge computing and critical IoT infrastructure (defense logistics, industrial grids, smart healthcare) face grave vulnerabilities from **centralized cloud dependencies**, **silent payload tampering**, and **rogue insider attacks**. 

**SecureNodeX** eliminates single points of failure and blind trust by unifying **Zero-Trust Public Key Infrastructure (PKI)**, **Private Permissioned EVM Blockchain Consensus**, and **Decentralized Replicated Object Storage** directly across physical edge devices (Raspberry Pis) and peer nodes.

Every payload is client-side encrypted, sliced into content-addressed chunks, replicated across independent nodes using Quorum Consensus, and anchored to an immutable smart contract hash chain.

---

## 🏛️ System Architecture

```text
 ┌────────────────────────────────────────────────────────────────────────┐
 │                         SecureNodeX Platform                          │
 └────────────────────────────────────────────────────────────────────────┘
          │                                              │
          ▼                                              ▼
 ┌─────────────────────────┐                   ┌──────────────────────────┐
 │  Next.js 14 Dashboard   │ (Role-Based UI)   │ Edge IoT / Hardware Node │ (X.509 + ECC)
 │  http://localhost:3000  │                   │  Raspberry Pi / ESP32    │
 └─────────────────────────┘                   └──────────────────────────┘
          │ (JWT ES256 / REST / WS)                      │ (mTLS / Signed Envelopes)
          ▼                                              ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │           Core Gateway & API Services (FastAPI / Python 3.12)          │
 │   - Authenticated AES-256-GCM + ECIES Envelope Encryption              │
 │   - Highest Random Weight (HRW) Rendezvous Chunk Slicing               │
 └────────────────────────────────────────────────────────────────────────┘
          │                                              │
          ├──────────────────────────────┐               │
          ▼                              ▼               ▼
 ┌─────────────────────────┐  ┌────────────────────┐  ┌───────────────────┐
 │   Decentralized Store   │  │ Private Blockchain │  │ Autonomous Healer │
 │   (snx-storage cluster) │  │  (EVM Chain 20260) │  │  (Scrubber Daemon)│
 │                         │  │                    │  │                   │
 │ - Physical Raspberry Pi │  │ - IdentityRegistry │  │ - 8-sec scrubbing │
 │ - Multi-Laptop Cluster  │  │ - DataRegistry     │  │ - Peer chunk sync │
 │ - Quorum R=2, W=2, N=3  │  │ - AuditLog (Hash)  │  │ - 100% self-heal  │
 └─────────────────────────┘  └────────────────────┘  └───────────────────┘
```

---

## 🚀 Key Technological Pillars

### 1. 🔐 Cryptographic Foundation & Zero-Trust PKI
* **Device Authentication:** Elliptic Curve Cryptography (**NIST P-256 / secp256r1**) with device hardware private keys and X.509 certificates issued by our Private Root CA.
* **Mutual TLS (mTLS):** Enforced end-to-end on all node-to-node and device-to-gateway transport channels.
* **User Authentication:** Asymmetric JWTs signed using **ES256 ECDSA** (zero shared symmetric secrets).
* **Double-Layer Authenticity:** Channel integrity via mTLS + payload non-repudiation via per-message ECDSA digital signatures.

### 2. ⛓️ Private Permissioned EVM Blockchain
* **Consensus Engine:** Hyperledger Besu with **QBFT (Quorum Byzantine Fault Tolerance)** / Hardhat EVM for low-latency testing.
* **Chain ID:** `20260` with deterministic, instant block finality (zero forks, zero reorgs).
* **Zero-Gas Enterprise Model:** Gas price set to 0 to enable continuous high-frequency IoT logging without cryptocurrency token friction.
* **Smart Contracts (Solidity 0.8.24 Cancun):**
  * `IdentityRegistry.sol`: On-chain identity enrollment, role masking, and terminal certificate revocation.
  * `DataRegistry.sol`: Off-chain chunk Merkle root anchoring and access permission grants.
  * `StorageNodeRegistry.sol`: Dynamic storage node topology and health status tracking.
  * `AuditLog.sol`: Append-only, Keccak-256 rolling hash chain providing permanent audit receipts.
  * `AssetRegistry.sol`: Custodial digital asset minting and transfer enforcement.

### 3. 💾 Decentralized Split & Replicated Storage
* **Off-Chain Data, On-Chain Proofs:** Heavy encrypted payloads are stored across edge nodes; only lightweight 32-byte cryptographic Merkle roots are anchored to the blockchain.
* **Client-Side Encryption:** Payload encrypted with symmetric **AES-256-GCM**; Data Encryption Key (DEK) wrapped using **ECIES**.
* **Content Addressing:** Files are split into chunks hashed with **SHA-256**, distributed via Highest Random Weight (HRW) Rendezvous placement.
* **High Availability Quorum:** Tuned for $N=3$ replication, $W=2$ write quorum, and $R=2$ read quorum.
* **Autonomous Self-Healing:** The background scrubber daemon (`tools/auto_healer_daemon.py`) detects missing or wiped chunks within 8 seconds and copies surviving replicas back to restore 100% redundancy.

### 4. 🖥️ Modern Web Dashboard
* **High-Contrast Professional Light Theme:** Built with Next.js 14, Tailwind CSS, and Lucide icons.
* **Role-Based Persona Views:** Dedicated workflows for **Admin**, **Manager**, **Auditor**, and **Standard User**.
* **Live Cluster Map:** Real-time visual monitoring of connected storage nodes (Raspberry Pi & Laptops).
* **Interactive Cryptographic Verification:** One-click Merkle root and Keccak-256 audit chain verification directly in the browser.

---

## 📂 Repository Structure

```text
SecureNodeX7/
├── backend/                  # FastAPI Core (API server, gateway pipeline, chain client)
│   ├── app/
│   │   ├── auth/             # ES256 JWT auth and RBAC middleware
│   │   ├── chain/            # Web3.py client and contract ABI bindings
│   │   ├── storage/          # Coordinator, crypto (AES/ECIES), repair & placement
│   │   └── routers/          # REST API endpoints (/objects, /devices, /audit, etc.)
├── contracts/                # Solidity 0.8.24 Smart Contracts & Hardhat suite
│   ├── contracts/            # IdentityRegistry, DataRegistry, AuditLog, etc.
│   └── test/                 # 24 unit, integration, and fuzzing tests
├── dashboard/                # Next.js 14 Web Application (High-Contrast Light Theme)
│   ├── components/           # Modular tab views (Storage, Audit, Nodes, PKI, etc.)
│   └── context/              # Authentication and Persona State Context
├── storage/                  # Lightweight Decentralized Storage Node Daemon (snx-storage)
├── pki/                      # Private Root CA, certificate authority scripts, and profiles
├── tools/                    # Operational and live demonstration CLI tools
│   ├── demo_mine_actions.py  # Interactive on-chain block mining controller
│   ├── show_block.py         # Human-readable EVM block inspector
│   ├── auto_healer_daemon.py # Continuous autonomous storage repair daemon
│   ├── resync_node.py        # Active storage node scrubber and resync tool
│   ├── register_node.py      # Dynamic storage node cluster registration
│   └── chaos/                # Red-team attack scripts (tamper.py, corrupt_chunk.sh)
└── docs/                     # Full architectural specifications and runbooks
```

---

## ⚡ Quick Start & Local Setup

### Prerequisites
* **Docker & Docker Compose** (v20+)
* **Python 3.11+**
* **Node.js 18+** & `npm`

### 1. Clone & Setup Environment
```bash
git clone https://github.com/shankumar7/SecureNodex7.git
cd SecureNodex7
```

### 2. Launch Core Cluster via Docker
```bash
# Starts Postgres, Mosquitto MQTT, Core API, Gateway, and Storage Nodes
docker compose -f deploy/docker-compose.yml up -d
```

### 3. Start Local EVM Blockchain Node & Deploy Contracts
```bash
# Terminal 1: Launch EVM RPC Node (Chain ID: 20260)
npx hardhat node --hostname 0.0.0.0

# Terminal 2: Compile & Run Comprehensive Security Tests
cd contracts
npx hardhat test

# Deploy Smart Contracts to local node
npx hardhat run scripts/deploy.ts --network localhost
```

### 4. Launch the Web Dashboard
```bash
cd dashboard
npm install
npm run dev
# Open http://localhost:3000 in your browser
```

---

## 🎯 Live Demonstration Workflows

SecureNodeX includes dedicated CLI tools designed for live jury presentations:

### 1. Live Block Mining Controller
Demonstrate real-time state transitions and block mining without waiting for passive transactions:
```bash
# Interactive menu:
python3 tools/demo_mine_actions.py

# Direct triggers:
python3 tools/demo_mine_actions.py upload   # Anchors Merkle Root to DataRegistry
python3 tools/demo_mine_actions.py device   # Registers new device in IdentityRegistry
python3 tools/demo_mine_actions.py audit    # Records immutable event to AuditLog
```

### 2. Independent Blockchain Auditor Query
Run from an independent auditor machine to query raw consensus blocks over JSON-RPC:
```bash
RPC_URL=http://<CONTROLLER_IP>:8545 python3 tools/show_block.py
```

### 3. Red Team Tamper Attack (Chaos Engineering)
Simulate an active man-in-the-middle transit modification:
```bash
python3 tools/chaos/tamper.py
# Result: Gateway validates signature and raises SIGNATURE_INVALID
```

### 4. Autonomous Storage Self-Healing
Verify zero-downtime recovery when an edge device disk is wiped:
```bash
# 1. On Raspberry Pi: Wipe stored chunks
rm -rf /tmp/snx_storage_data/*

# 2. Watch background daemon (tools/auto_healer_daemon.py) detect loss,
#    fetch surviving replicas from peer laptops, and restore chunks in <10s!
```

---

## 👥 Contributors & Team

This project was engineered with passion by **Team CodeCommit**:

<div align="center">

| Avatar | Name | Role | GitHub Profile |
| :---: | :--- | :--- | :---: |
| <img src="https://github.com/shankumar7.png" width="60" style="border-radius:50%"/> | **Shashank Kumar** | Team Lead & Core System Architecture | [@shankumar7](https://github.com/shankumar7) |
| <img src="https://github.com/DheerajPusuluri.png" width="60" style="border-radius:50%"/> | **Dheeraj Pusuluri** | Smart Contracts & Blockchain Consensus | [@DheerajPusuluri](https://github.com/DheerajPusuluri) |
| <img src="https://github.com/Dinesh2006kumar.png" width="60" style="border-radius:50%"/> | **Dinesh Kumar** | Edge Node Firmware & Storage Daemon | [@Dinesh2006kumar](https://github.com/Dinesh2006kumar) |
| <img src="https://github.com/ezazali-14.png" width="60" style="border-radius:50%"/> | **Ezaz Ali** | Backend APIs & PKI Infrastructure | [@ezazali-14](https://github.com/ezazali-14) |
| <img src="https://github.com/rithwikd-07.png" width="60" style="border-radius:50%"/> | **D Rithwik** | Frontend Engineering & Dashboard UI | [@rithwikd-07](https://github.com/rithwikd-07) |
| <img src="https://github.com/shruthi-peddapuram.png" width="60" style="border-radius:50%"/> | **Shruthi Peddapuram** | QA, Chaos Testing & Cryptographic Verification | [@shruthi-peddapuram](https://github.com/shruthi-peddapuram) |

</div>

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
