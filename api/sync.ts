/**
 * /api/sync — uploads locally persisted QuestLife records (AsyncStorage blob
 * slices) into Supabase so the server has a durable copy of execution /
 * context / state / decision / pattern data.
 *
 * Upserts are idempotent: every table is keyed by (anonymous_user_id, id),
 * so the client can safely re-send the same records on every sync.
 */
import { z } from 'zod';
import type { ServerDeletionResult } from '../src/services/syncDeletionOutboxCore';

declare const process: any;

const MAX_BODY_BYTES = 900_000;
const MAX_RECORDS_PER_COLLECTION = 500;

const RecordSchema = z
  .object({ id: z.string().min(1).max(200) })
  .passthrough();

const RecordListSchema = z.array(RecordSchema).max(MAX_RECORDS_PER_COLLECTION);
const DeletionIdListSchema = z.array(z.string().min(1).max(200)).max(MAX_RECORDS_PER_COLLECTION);

const DeletionsSchema = z.object({
  executionLogs: DeletionIdListSchema.optional(),
  contextLogs: DeletionIdListSchema.optional(),
  stateCheckIns: DeletionIdListSchema.optional(),
  decisionResults: DeletionIdListSchema.optional(),
  patternMemory: DeletionIdListSchema.optional(),
}).strict();

const SyncBodySchema = z.object({
  anonymousUserId: z.string().min(1).max(200),
  collections: z.object({
    executionLogs: RecordListSchema.optional(),
    contextLogs: RecordListSchema.optional(),
    stateCheckIns: RecordListSchema.optional(),
    decisionResults: RecordListSchema.optional(),
    patternMemory: RecordListSchema.optional(),
  }).strict(),
  deletions: DeletionsSchema.optional(),
}).strict();

type SyncRecord = z.infer<typeof RecordSchema>;

function send(res: any, status: number, body: Record<string, unknown>) {
  res.status(status).json(body);
}

function isoOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function textOrNull(value: unknown, limit = 120): string | null {
  return typeof value === 'string' && value ? value.slice(0, limit) : null;
}

type TableMapping = {
  table: string;
  toRow: (record: SyncRecord, userId: string) => Record<string, unknown>;
};

const MAPPINGS: Record<string, TableMapping> = {
  executionLogs: {
    table: 'execution_logs',
    toRow: (record, userId) => ({
      anonymous_user_id: userId,
      id: record.id,
      date: textOrNull(record.date),
      created_at: isoOrNull(record.createdAt),
      payload: record,
    }),
  },
  contextLogs: {
    table: 'context_logs',
    toRow: (record, userId) => ({
      anonymous_user_id: userId,
      id: record.id,
      date: textOrNull(record.date),
      type: textOrNull(record.type),
      created_at: isoOrNull(record.createdAt),
      payload: record,
    }),
  },
  stateCheckIns: {
    table: 'state_checkins',
    toRow: (record, userId) => ({
      anonymous_user_id: userId,
      id: record.id,
      date: textOrNull(record.date),
      created_at: isoOrNull(record.createdAt ?? record.timestamp),
      payload: record,
    }),
  },
  decisionResults: {
    table: 'decision_results',
    toRow: (record, userId) => ({
      anonymous_user_id: userId,
      id: record.id,
      created_at: isoOrNull(record.createdAt),
      mode: textOrNull(record.mode),
      source: textOrNull(record.source),
      payload: record,
    }),
  },
  patternMemory: {
    table: 'pattern_memory',
    toRow: (record, userId) => ({
      anonymous_user_id: userId,
      id: record.id,
      status: textOrNull(record.status),
      updated_at: isoOrNull(record.updatedAt),
      payload: record,
    }),
  },
};

async function upsertRows(supabaseUrl: string, serviceRoleKey: string, table: string, rows: Array<Record<string, unknown>>) {
  const response = await fetch(
    `${supabaseUrl.replace(/\/$/, '')}/rest/v1/${table}?on_conflict=anonymous_user_id,id`,
    {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(rows),
    }
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`upsert ${table} failed: HTTP ${response.status} ${text.slice(0, 300)}`);
  }
}

async function deleteExactRow(
  supabaseUrl: string,
  serviceRoleKey: string,
  table: string,
  anonymousUserId: string,
  id: string,
) {
  const url = new URL(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/${table}`);
  url.searchParams.set('anonymous_user_id', `eq.${anonymousUserId}`);
  url.searchParams.set('id', `eq.${id}`);
  url.searchParams.set('select', 'id');
  const response = await fetch(url.toString(), {
    method: 'DELETE',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: 'return=representation',
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`delete ${table} failed: HTTP ${response.status} ${text.slice(0, 300)}`);
  }
  const text = await response.text();
  if (!text) return 0;
  const rows = JSON.parse(text);
  if (!Array.isArray(rows)) throw new Error(`delete ${table} returned an invalid response`);
  return rows.length;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }

  try {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
    if (raw.length > MAX_BODY_BYTES) return send(res, 413, { ok: false, error: 'payload_too_large' });
    const json = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    const parsed = SyncBodySchema.safeParse(json);
    if (!parsed.success) {
      return send(res, 400, {
        ok: false,
        error: 'invalid_input',
        issues: parsed.error.issues.slice(0, 10).map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      console.warn('[sync] Supabase env missing');
      return send(res, 503, { ok: false, error: 'sync_not_configured' });
    }

    const { anonymousUserId, collections, deletions } = parsed.data;
    const counts: Record<string, number> = {};
    for (const [key, mapping] of Object.entries(MAPPINGS)) {
      const records = (collections as Record<string, SyncRecord[] | undefined>)[key];
      if (!records || records.length === 0) continue;
      const rows = records.map((record) => mapping.toRow(record, anonymousUserId));
      await upsertRows(supabaseUrl, serviceRoleKey, mapping.table, rows);
      counts[key] = rows.length;
    }

    const deletionResults: ServerDeletionResult = {};
    for (const [key, mapping] of Object.entries(MAPPINGS)) {
      const requestedIds = deletions?.[key as keyof typeof deletions];
      if (!requestedIds || requestedIds.length === 0) continue;
      const ids = Array.from(new Set(requestedIds));
      let deleted = 0;
      for (const id of ids) {
        deleted += await deleteExactRow(
          supabaseUrl,
          serviceRoleKey,
          mapping.table,
          anonymousUserId,
          id,
        );
      }
      deletionResults[key as keyof ServerDeletionResult] = {
        requested: ids.length,
        deleted,
        alreadyAbsent: Math.max(0, ids.length - deleted),
        acknowledgedIds: ids,
      };
    }

    if (Object.keys(deletionResults).length > 0) {
      console.info('[sync] deletion completed', Object.fromEntries(
        Object.entries(deletionResults).map(([key, result]) => [key, {
          requested: result?.requested ?? 0,
          deleted: result?.deleted ?? 0,
          alreadyAbsent: result?.alreadyAbsent ?? 0,
        }]),
      ));
    }

    return send(res, 200, { ok: true, upserted: counts, deletions: deletionResults });
  } catch (error: any) {
    console.error('[sync] failed', error?.message || error);
    return send(res, 500, { ok: false, error: 'sync_failed' });
  }
}
