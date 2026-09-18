export const APP_ENTITY_TYPES = [
  "goals",
  "categories",
  "modules",
  "moduleSkillLinks",
  "skills",
  "actions",
  "executionLogs",
  "effortUnits",
  "contributionLinks",
  "rescueLogs",
  "stateCheckIns",
  "contextLogs",
  "decisionResults",
  "patternMemory",
  "scheduleBlocks",
  "rawCaptures",
] as const;
export const ENTITY_TYPES = [
  ...APP_ENTITY_TYPES,
  "healthObservations",
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];
export type Payload = Record<string, unknown> & { id: string };
export type Origin =
  | "local_user"
  | "local_system"
  | "remote_sync"
  | "import"
  | "health"
  | "calendar";
export type Entity = {
  entityType: EntityType;
  entityId: string;
  payload: Payload;
};
export type Mutation = {
  mutationId: string;
  deviceId: string;
  entityType: EntityType;
  entityId: string;
  operation: "upsert" | "delete";
  payload?: Payload;
  schemaVersion: 1;
  baseRevision: number;
  createdAt: string;
  attemptCount: number;
  lastAttemptAt?: string;
  lastError?: string;
};
export type RemoteRow = {
  user_id: string;
  entity_type: EntityType;
  entity_id: string;
  payload: Payload | null;
  schema_version: number;
  revision: number;
  change_seq: number;
  origin_device_id: string;
  client_mutated_at: string;
  server_updated_at: string;
  deleted_at: string | null;
};
export type PushResult = {
  mutationId: string;
  status: "applied" | "conflict" | "rejected";
  remote?: RemoteRow;
  error?: string;
};
export type Conflict = {
  id: string;
  entityType: EntityType;
  entityId: string;
  local: Mutation[];
  remote: RemoteRow;
  deviceId: string;
  createdAt: string;
  resolution: "pending" | "remote" | "local";
};
export type Projection = {
  entityType: EntityType;
  entityId: string;
  payload: Payload | null;
};
export type SyncState = {
  version: 2;
  ownerId: string | null;
  cursor: number;
  hydrated: boolean;
  healthConsent: boolean;
  outbox: Mutation[];
  versions: Record<string, number>;
  conflicts: Conflict[];
  quarantine: { key: string; sequence?: number; reason: string }[];
  pendingApply: Projection[];
  lastSuccessAt?: string;
  healthSeen?: Record<string, string>;
};
export const emptySyncState = (): SyncState => ({
  version: 2,
  ownerId: null,
  cursor: 0,
  hydrated: false,
  healthConsent: false,
  outbox: [],
  versions: {},
  conflicts: [],
  quarantine: [],
  pendingApply: [],
});
export const entityKey = (type: string, id: string) =>
  JSON.stringify([type, id]);
export interface SyncDisk {
  exclusive?<T>(job: () => Promise<T>): Promise<T>;
  read(): Promise<SyncState>;
  write(state: SyncState): Promise<void>;
  /** Idempotent projection. Invoked again after crash before any new transaction. */
  apply(changes: Projection[]): Promise<void>;
}
export interface SyncTransport {
  push(userId: string, mutations: Mutation[]): Promise<PushResult[]>;
  pull(userId: string, cursor: number, limit: number): Promise<RemoteRow[]>;
}
