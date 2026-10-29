/**
 * SecureNodeX Dashboard Type Definitions
 */

export interface Principal {
  id: string;
  username: string;
  display_name: string;
  roles: string[];
  role_mask: number;
  status: string;
  spki_fingerprint?: string | null;
  metadata_uri?: string;
  created_at: string;
  updated_at?: string;
}

export interface Device {
  id: string;
  label: string;
  type: string;
  status: "ACTIVE" | "PENDING" | "SUSPENDED" | "REVOKED";
  spki_fingerprint?: string | null;
  cert_serial?: string | null;
  cert_expires_at?: string | null;
  last_seen_at?: string | null;
  tx_hash?: string | null;
  created_at: string;
}

export interface StoredChunk {
  i: number;
  id: string;
  len: number;
  nonce: string;
}

export interface ChunkPlacement {
  chunk_id: string;
  chunk_index: number;
  primary_node: string;
  replica_nodes: string[];
  all_stored_nodes: string[];
}

export interface StoredObject {
  id: string;
  manifest_id: string;
  name: string;
  size: number;
  chunk_count: number;
  merkle_root: string;
  classification: "internal" | "confidential" | "restricted";
  status: "ACTIVE" | "TOMBSTONED";
  created_at: string;
  placements?: ChunkPlacement[];
}

export interface StorageNode {
  id: string;
  endpoint: string;
  state: "UP" | "SUSPECT" | "DOWN" | "SYNCING";
  free_bytes: number;
  used_bytes: number;
  chunk_count: number;
  last_heartbeat: string;
  fingerprint?: string | null;
  draining: boolean;
}

export interface ClusterHealth {
  status: "HEALTHY" | "DEGRADED" | "CRITICAL";
  total_nodes: number;
  live_nodes: number;
  dead_nodes: number;
  draining_nodes: number;
  total_chunks: number;
  under_replicated_chunks: number;
  replication_factor: number;
  write_quorum: number;
  total_capacity_bytes: number;
  used_capacity_bytes: number;
}

export interface DigitalAsset {
  token_id: number;
  name: string;
  owner_id: string;
  manifest_cid: string;
  metadata_uri: string;
  created_at: string;
  tx_hash?: string | null;
}

export interface AuditEvent {
  id: string;
  seq?: number;
  event_type: string;
  actor_id: string;
  subject_id: string;
  data_hash: string;
  correlation_id: string;
  timestamp: number;
  tx_hash?: string | null;
  head?: string | null;
  details?: Record<string, any> | null;
}

export interface BatchRecord {
  id: string;
  batch_root: string;
  manifest_id: string;
  message_count: number;
  from_ts: number;
  to_ts: number;
  tx_hash?: string | null;
  created_at: string;
}

export interface MerkleProofElement {
  pos: "left" | "right";
  hash: string;
}

export interface InclusionProofResponse {
  batch_id: string;
  seq: number;
  message: Record<string, any>;
  proof: MerkleProofElement[];
  merkle_root: string;
  verified: boolean;
}

export interface TelemetryMessage {
  id: string;
  topic: string;
  device_id: string;
  seq: number;
  timestamp: number;
  type: string;
  payload: {
    temp_c?: number;
    hum_pct?: number;
    vbat_mv?: number;
    rssi?: number;
    [key: string]: any;
  };
  signature_verified: boolean;
  batch_id?: string;
  batch_root?: string;
  tx_hash?: string;
  received_at: string;
}
