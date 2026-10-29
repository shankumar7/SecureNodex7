/**
 * SecureNodeX REST API Client
 */

import {
  AuditEvent,
  ClusterHealth,
  Device,
  DigitalAsset,
  InclusionProofResponse,
  Principal,
  StorageNode,
  StoredObject,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8443";

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem("snx_token", token);
      } else {
        localStorage.removeItem("snx_token");
      }
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== "undefined") {
      this.token = localStorage.getItem("snx_token");
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    if (!headers["Content-Type"] && !(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errorDetail = res.statusText;
      try {
        const errJson = await res.json();
        errorDetail = errJson.detail || errJson.title || JSON.stringify(errJson);
      } catch (_) {}
      throw new Error(`[${res.status}] ${errorDetail}`);
    }

    if (res.headers.get("Content-Type")?.includes("application/octet-stream")) {
      return (await res.blob()) as unknown as T;
    }

    return res.json();
  }

  // --- Auth ---
  async login(username: string, password: string) {
    const data = await this.request<{
      access_token: string;
      token_type: string;
      principal: Principal;
    }>("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    this.setToken(data.access_token);
    return data;
  }

  async getMe(): Promise<Principal> {
    return this.request<Principal>("/v1/auth/me");
  }

  // --- Principals ---
  async listPrincipals(): Promise<{ items: Principal[] }> {
    return this.request<{ items: Principal[] }>("/v1/principals");
  }

  async updatePrincipalRoles(id: string, roles: string[]): Promise<Principal> {
    return this.request<Principal>(`/v1/principals/${id}/roles`, {
      method: "POST",
      body: JSON.stringify({ roles }),
    });
  }

  // --- Devices ---
  async listDevices(): Promise<{ items: Device[] }> {
    return this.request<{ items: Device[] }>("/v1/devices");
  }

  async enrollDevice(label: string, deviceType: string = "sensor") {
    return this.request<{
      device_id: string;
      label: string;
      enrollment_token: string;
      status: string;
    }>("/v1/devices/enroll", {
      method: "POST",
      body: JSON.stringify({ label, device_type: deviceType }),
    });
  }

  async revokeDevice(id: string) {
    return this.request<{
      id: string;
      status: string;
      tx_hash?: string;
    }>(`/v1/devices/${id}/revoke`, {
      method: "POST",
    });
  }

  async rotateDevice(id: string, newCsrPem: string) {
    return this.request<{
      device_id: string;
      certificate_pem: string;
      chain_pem: string;
      fingerprint: string;
    }>(`/v1/devices/${id}/rotate`, {
      method: "POST",
      body: JSON.stringify({ csr_pem: newCsrPem }),
    });
  }

  // --- Objects & Placement ---
  async listObjects(): Promise<{ items: StoredObject[] }> {
    return this.request<{ items: StoredObject[] }>("/v1/objects");
  }

  async uploadObject(file: File, classification: string = "internal") {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("classification", classification);

    return this.request<{
      object_id: string;
      manifest_id: string;
      name: string;
      size: number;
      chunk_count: number;
      merkle_root: string;
      status: string;
    }>("/v1/objects", {
      method: "POST",
      body: formData,
    });
  }

  async getObjectPlacement(id: string) {
    return this.request<{
      object_id: string;
      manifest_id: string;
      merkle_root: string;
      chunk_count: number;
      nodes: StorageNode[];
      placements: {
        chunk_index: number;
        chunk_id: string;
        primary_node: string;
        replica_nodes: string[];
      }[];
    }>(`/v1/objects/${id}/placement`);
  }

  async verifyObject(id: string) {
    return this.request<{
      object_id: string;
      valid: boolean;
      merkle_root: string;
      total_chunks: number;
      verified_chunks: number;
    }>(`/v1/objects/${id}/verify`);
  }

  async downloadObject(id: string): Promise<Blob> {
    return this.request<Blob>(`/v1/objects/${id}/download`, {
      headers: { Accept: "application/octet-stream" },
    });
  }

  async tombstoneObject(id: string) {
    return this.request<{
      object_id: string;
      status: string;
    }>(`/v1/objects/${id}`, {
      method: "DELETE",
    });
  }

  // --- Storage Health & Nodes ---
  async getStorageHealth(): Promise<ClusterHealth> {
    return this.request<ClusterHealth>("/v1/storage/health");
  }

  async listStorageNodes(): Promise<{ nodes: StorageNode[] }> {
    return this.request<{ nodes: StorageNode[] }>("/v1/storage/nodes");
  }

  async drainStorageNode(id: string) {
    return this.request<{ status: string; node_id: string }>(
      `/v1/storage/nodes/${id}/drain`,
      { method: "POST" }
    );
  }

  async triggerStorageRepair() {
    return this.request<{ status: string; scanned_chunks: number; repaired: number }>(
      "/v1/storage/repair",
      { method: "POST" }
    );
  }

  // --- Assets ---
  async listAssets(): Promise<{ items: DigitalAsset[] }> {
    return this.request<{ items: DigitalAsset[] }>("/v1/assets");
  }

  async mintAsset(data: { name: string; owner_id: string; manifest_cid: string; metadata_uri: string }) {
    return this.request<DigitalAsset>("/v1/assets/mint", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async transferAsset(tokenId: number, toPrincipalId: string) {
    return this.request<{
      token_id: number;
      from: string;
      to: string;
      tx_hash: string;
    }>(`/v1/assets/${tokenId}/transfer`, {
      method: "POST",
      body: JSON.stringify({ to_principal_id: toPrincipalId }),
    });
  }

  // --- Batches & Proofs ---
  async listBatches(): Promise<{ batches: any[] }> {
    return this.request<{ batches: any[] }>("/v1/batches");
  }

  async getBatchProof(batchId: string, seq: number): Promise<InclusionProofResponse> {
    return this.request<InclusionProofResponse>(`/v1/batches/${batchId}/proof/${seq}`);
  }

  async verifyProof(envelope: any, proof: any[], expectedRoot: string) {
    return this.request<{ valid: boolean; merkle_root: string }>("/v1/batches/verify-proof", {
      method: "POST",
      body: JSON.stringify({
        envelope,
        proof,
        expected_root: expectedRoot,
      }),
    });
  }

  // --- Audit ---
  async listAuditEvents(params?: { event_type?: string; actor?: string; subject?: string }): Promise<{ items: AuditEvent[] }> {
    const query = new URLSearchParams();
    if (params?.event_type) query.append("event_type", params.event_type);
    if (params?.actor) query.append("actor", params.actor);
    if (params?.subject) query.append("subject", params.subject);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return this.request<{ items: AuditEvent[] }>(`/v1/audit${qs}`);
  }

  async verifyAuditChain(): Promise<{
    valid: boolean;
    checked: number;
    calculated_head: string;
    on_chain_head?: string | null;
    tampered_index?: number | null;
  }> {
    return this.request("/v1/audit/verify");
  }
}

export const api = new ApiClient();
