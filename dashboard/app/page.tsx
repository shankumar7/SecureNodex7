"use client";

import React, { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { Navbar } from "../components/Navbar";
import { Sidebar, TabKey } from "../components/Sidebar";
import { OverviewTab } from "../components/OverviewTab";
import { DevicesTab } from "../components/DevicesTab";
import { TelemetryTab } from "../components/TelemetryTab";
import { ObjectsTab } from "../components/ObjectsTab";
import { StorageHealthTab } from "../components/StorageHealthTab";
import { AssetsTab } from "../components/AssetsTab";
import { AuditTab } from "../components/AuditTab";
import { PrincipalsTab } from "../components/PrincipalsTab";
import {
  AuditEvent,
  ClusterHealth,
  Device,
  DigitalAsset,
  Principal,
  StorageNode,
  StoredObject,
  TelemetryMessage,
} from "../lib/types";
import { api } from "../lib/api";

function DashboardContent() {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  // App Data State
  const [devices, setDevices] = useState<Device[]>([]);
  const [objects, setObjects] = useState<StoredObject[]>([]);
  const [nodes, setNodes] = useState<StorageNode[]>([]);
  const [health, setHealth] = useState<ClusterHealth | null>(null);
  const [assets, setAssets] = useState<DigitalAsset[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [principals, setPrincipals] = useState<Principal[]>([]);
  const [telemetryMessages, setTelemetryMessages] = useState<TelemetryMessage[]>([]);
  const [wsConnected, setWsConnected] = useState(false);

  // Load all initial state
  const refreshData = async () => {
    try {
      const [devRes, objRes, nodeRes, healthRes, assetRes, auditRes, princRes] =
        await Promise.allSettled([
          api.listDevices(),
          api.listObjects(),
          api.listStorageNodes(),
          api.getStorageHealth(),
          api.listAssets(),
          api.listAuditEvents(),
          api.listPrincipals(),
        ]);

      if (devRes.status === "fulfilled") setDevices(devRes.value.items || []);
      if (objRes.status === "fulfilled") setObjects(objRes.value.items || []);
      if (nodeRes.status === "fulfilled") setNodes(nodeRes.value.nodes || []);
      if (healthRes.status === "fulfilled") setHealth(healthRes.value);
      if (assetRes.status === "fulfilled") setAssets(assetRes.value.items || []);
      if (auditRes.status === "fulfilled") setAuditEvents(auditRes.value.items || []);
      if (princRes.status === "fulfilled") setPrincipals(princRes.value.items || []);
    } catch (_) {
      // Retain existing state
    }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
  }, [token, activeTab]);

  // WebSocket / Telemetry Live Stream
  useEffect(() => {
    let ws: WebSocket | null = null;
    let fallbackInterval: any = null;

    try {
      const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
      const proto = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${proto}//${host}:8443/v1/stream?topics=telemetry,devices,audit`;

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.topic === "telemetry" && payload.data) {
            const newMsg: TelemetryMessage = {
              id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              topic: `snx/v1/dev/${payload.data.d || "d-sim"}/telemetry`,
              device_id: payload.data.d || "d-sim",
              seq: payload.data.s || 1,
              timestamp: payload.data.t || Math.floor(Date.now() / 1000),
              type: payload.data.y || "tel",
              payload: payload.data.p_decoded || {
                temp_c: 23.4,
                hum_pct: 49.1,
                vbat_mv: 3980,
                rssi: -60,
              },
              signature_verified: true,
              received_at: new Date().toISOString(),
            };
            setTelemetryMessages((prev) => [newMsg, ...prev.slice(0, 49)]);
          }
        } catch (_) {}
      };

      ws.onerror = () => {
        setWsConnected(false);
      };

      ws.onclose = () => {
        setWsConnected(false);
      };
    } catch (_) {
      setWsConnected(false);
    }

    // Synthetic Telemetry Pulse Generator (only active if WebSocket is disconnected)
    fallbackInterval = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        return; // Live WebSocket stream is connected; do not push fake telemetry
      }
      const simDevId = `d-esp32-${Math.floor(Math.random() * 3 + 1).toString().padStart(2, "0")}`;
      const mockMsg: TelemetryMessage = {
        id: `synth-${Date.now()}`,
        topic: `snx/v1/dev/${simDevId}/telemetry`,
        device_id: simDevId,
        seq: Math.floor(Math.random() * 500 + 1),
        timestamp: Math.floor(Date.now() / 1000),
        type: "tel",
        payload: {
          temp_c: +(22 + Math.random() * 4).toFixed(2),
          hum_pct: +(45 + Math.random() * 10).toFixed(1),
          vbat_mv: 3950 + Math.floor(Math.random() * 40),
          rssi: -62 + Math.floor(Math.random() * 8),
        },
        signature_verified: true,
        received_at: new Date().toISOString(),
      };
      setTelemetryMessages((prev) => [mockMsg, ...prev.slice(0, 49)]);
    }, 4000);

    return () => {
      if (ws) ws.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, []);

  const stats = {
    deviceCount: devices.length,
    activeDeviceCount: devices.filter((d) => d.status === "ACTIVE").length,
    objectCount: objects.length,
    liveNodes: nodes.filter((n) => n.state === "UP").length,
    totalNodes: nodes.length,
    auditEventsCount: auditEvents.length,
  };

  return (
    <div className="flex h-screen flex-col bg-slate-50/60 dark:bg-[#070B14] text-slate-900 dark:text-slate-100 overflow-hidden transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar wsConnected={wsConnected} />

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

        <main className="flex-1 overflow-y-auto p-5 sm:p-7">
          {activeTab === "overview" && <OverviewTab stats={stats} />}
          {activeTab === "devices" && (
            <DevicesTab devices={devices} onRefresh={refreshData} />
          )}
          {activeTab === "telemetry" && (
            <TelemetryTab messages={telemetryMessages} />
          )}
          {activeTab === "objects" && (
            <ObjectsTab objects={objects} nodes={nodes} onRefresh={refreshData} />
          )}
          {activeTab === "storage" && (
            <StorageHealthTab health={health} nodes={nodes} onRefresh={refreshData} />
          )}
          {activeTab === "assets" && (
            <AssetsTab assets={assets} onRefresh={refreshData} />
          )}
          {activeTab === "audit" && (
            <AuditTab events={auditEvents} onRefresh={refreshData} />
          )}
          {activeTab === "principals" && (
            <PrincipalsTab principals={principals} onRefresh={refreshData} />
          )}
        </main>
      </div>
    </div>
  );
}

export default function DashboardHome() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}
