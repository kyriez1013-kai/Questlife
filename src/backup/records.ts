import type { AppData } from '../types';
import { APP_ENTITY_TYPES, type Projection, type Payload } from '../sync-v2/contracts';
import { contaminated, utf8Bytes, validEntity } from '../sync-v2/registry';

const validateAppData: (value: unknown) => boolean = require('./validateAppData.cjs');
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;
const FORMAT = 'questlife.records.backup.v1';
const ENVELOPE_KEYS = new Set(['format', 'ownerId', 'exportedAt', 'data']);
const DATA_KEYS = new Set<string>([...APP_ENTITY_TYPES, 'settings']);
const CONFIDENTIAL_KEYS = new Set([
  'accesstoken', 'refreshtoken', 'idtoken', 'authtoken', 'apikey', 'password',
  'clientsecret', 'servicerolekey', 'privatekey', 'authorization', 'credentials',
  'session', 'syncjournal', 'devicerepository', 'healthobservations', 'healthdeletions', 'healthconsent',
]);
export type RecordBackup = { format: typeof FORMAT; ownerId: string | null; exportedAt: string; data: AppData };

export const hasRecords = (data: AppData) => APP_ENTITY_TYPES.some(type => data[type].length > 0);

export function createRecordBackup(data: AppData, ownerId: string | null): RecordBackup {
  return parseRecordBackup(JSON.stringify({ format: FORMAT, ownerId, exportedAt: new Date().toISOString(), data }));
}

export function parseRecordBackup(text: string): RecordBackup {
  if (text.length > MAX_BACKUP_BYTES || utf8Bytes(text) > MAX_BACKUP_BYTES) throw new Error('backup_too_large');
  const value = JSON.parse(text);
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.format !== FORMAT || !Object.hasOwn(value, 'ownerId')
    || (value.ownerId !== null && (typeof value.ownerId !== 'string' || !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(value.ownerId)))
    || typeof value.exportedAt !== 'string' || !Number.isFinite(Date.parse(value.exportedAt))) throw new Error('backup_format');
  if (Object.keys(value).some(key => !ENVELOPE_KEYS.has(key))
    || (value.data && typeof value.data === 'object' && Object.keys(value.data).some(key => !DATA_KEYS.has(key)))) throw new Error('backup_scope');
  // Protect recursive schema validation from pathological input; never coerce,
  // fill defaults, synthesize IDs/observations, or remove unknown source fields.
  const visit = (node: unknown, depth = 0): void => {
    if (depth > 30) throw new Error('backup_depth');
    if (node && typeof node === 'object') for (const [key, child] of Object.entries(node)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('backup_unsafe_key');
      // Unknown record extensions stay exact, but must not carry runtime credentials or device state.
      if (CONFIDENTIAL_KEYS.has(key.replace(/[_-]/g, '').toLowerCase())) throw new Error('backup_confidential_field');
      visit(child, depth + 1);
    }
  };
  visit(value.data);
  if (!validateAppData(value.data) || contaminated(value.data)) throw new Error('backup_invalid_records');
  for (const type of APP_ENTITY_TYPES) {
    const seen = new Set<string>();
    for (const row of value.data[type]) {
      if (!row.id || seen.has(row.id) || /(^|:|-)(fixture|synthetic|qa|debug|demo)(:|-|$)/i.test(row.id)) throw new Error('backup_duplicate_or_test_id');
      if (type !== 'rawCaptures' && !validEntity(type, row.id, row)) throw new Error('backup_entity_invalid');
      seen.add(row.id);
    }
  }
  return value as RecordBackup;
}

export function backupProjections(backup: RecordBackup): Projection[] {
  return APP_ENTITY_TYPES.flatMap(entityType => backup.data[entityType].map(row => ({
    entityType, entityId: row.id, payload: row as unknown as Payload,
  })));
}
