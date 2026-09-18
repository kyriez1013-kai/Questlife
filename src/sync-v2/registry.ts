import { z } from 'zod';
import type { AppData } from '../types';
import { APP_ENTITY_TYPES, ENTITY_TYPES, type Entity, type EntityType, type Payload } from './contracts';

const text = z.string();
const number = z.number().finite();
const stamp = z.union([number, text.refine(v => Number.isFinite(Date.parse(v)))]);
const date = text.regex(/^\d{4}-\d{2}-\d{2}$/);
const base = z.object({ id: text.min(1).max(512) }).passthrough();
const schemas: Record<EntityType, z.ZodType> = {
  goals: base.extend({ title: text, skillIds: z.array(text), createdAt: stamp }),
  categories: base.extend({ name: text, createdAt: stamp }),
  modules: base.extend({ goalId: text, name: text, createdAt: stamp }),
  moduleSkillLinks: base.extend({ goalId: text, moduleId: text, skillId: text, createdAt: stamp }),
  skills: base.extend({ name: text, totalXP: number }),
  actions: base.extend({ skillIds: z.array(text), minutes: number.nonnegative(), date }),
  executionLogs: base.extend({ date, createdAt: stamp, durationMinutes: number.nonnegative().optional() }),
  effortUnits: base.extend({ createdAt: stamp }),
  contributionLinks: base.extend({ targetId: text, targetType: text }),
  rescueLogs: base.extend({ startedAt: stamp, date }),
  stateCheckIns: base.extend({ overall: number.min(1).max(5), date, timestamp: stamp }),
  contextLogs: base.extend({ type: text, label: text, date, createdAt: stamp }),
  decisionResults: base.extend({ mode: z.enum(['instant_micro','daily_brief']), headlineInsight: text, createdAt: stamp }),
  patternMemory: base.extend({ status: z.enum(['candidate','accepted','rejected','archived']), label: text, support: z.array(z.object({ sourceType: text, summary: text }).passthrough()), sampleN: number.nonnegative() }),
  scheduleBlocks: base.extend({ title: text, date, startTime: text.regex(/^\d{2}:\d{2}$/), endTime: text.regex(/^\d{2}:\d{2}$/), plannedMinutes: number.nonnegative(), status: z.enum(['planned','adjusted','completed','skipped']) }),
  rawCaptures: base.extend({ text, createdAt: stamp, parseStatus: z.literal('done'), parsed: z.object({ entriesDismissed: z.literal(true) }).passthrough() }),
  healthObservations: base.extend({ schemaVersion: z.literal('questlife.health.observation.v1'), metric: z.enum(['sleep','steps','heart_rate','resting_heart_rate','hrv','exercise','active_energy','distance']), value: number.nonnegative(), unit: z.enum(['min','count','bpm','ms','kcal','m']), eventStartAt: stamp, eventEndAt: stamp, availableAt: stamp, importedAt: stamp, externalId: text.min(1), sourcePlatform: z.enum(['healthkit','health_connect']), provenance: z.object({ origin: z.literal('PASSIVE_IMPORTED') }).passthrough(), limitations: z.array(text) }),
};

export function contaminated(value: unknown, depth = 0): boolean {
  if (depth > 30) return true;
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, v]) =>
    (key === 'origin' && ['SYNTHETIC','QA_TEST','DEBUG_FIXTURE','QA','DEBUG','TEST','FIXTURE'].includes(String(v))) ||
    (['syntheticOnly','isFixture','isSynthetic','isQA','debugOnly'].includes(key) && v === true) ||
    (key === 'trigger' && v === 'debug') ||
    (key === 'fixture' && v != null && v !== false) || contaminated(v, depth + 1));
}
export function validEntity(type: string, id: string, payload: unknown): payload is Payload {
  if (!(ENTITY_TYPES as readonly string[]).includes(type) || /(^|:|-)(fixture|synthetic|qa|debug|demo)(:|-|$)/i.test(id) || contaminated(payload)) return false;
  if (!payload || typeof payload !== 'object' || (payload as Payload).id !== id) return false;
  if (JSON.stringify(payload).length > 131072) return false;
  return schemas[type as EntityType].safeParse(payload).success;
}
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value);
}
export function appEntities(data: AppData): Entity[] {
  const confirmedIds = new Set(data.executionLogs.map(log => log.dataProvenance?.candidate?.rawCaptureId).filter(Boolean));
  return APP_ENTITY_TYPES.flatMap(entityType => (data[entityType] ?? []).flatMap(row => {
    if (entityType === 'rawCaptures' && !confirmedIds.has(row.id)) return [];
    return validEntity(entityType, row.id, row) ? [{ entityType, entityId: row.id, payload: row as unknown as Payload }] : [];
  }));
}
