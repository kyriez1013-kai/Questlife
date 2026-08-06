import type { AppData, ExecutionLog, RawCapture } from '../types';
// Node's built-in TypeScript runner requires the extension; Expo typecheck does not.
// @ts-expect-error Test-only Node TypeScript entry.
import { rebaseAppDataWrite, shouldPersistStoreMutation } from './persistenceConsistency.ts';

function equal(actual: unknown, expected: unknown, name: string) {
  if (actual !== expected) throw new Error(`${name}: expected ${String(expected)}, received ${String(actual)}`);
}

function ids(rows: { id: string }[]) {
  return rows.map((row) => row.id).sort().join(',');
}

function data(patch: Partial<AppData> = {}): AppData {
  return {
    goals: [],
    categories: [],
    modules: [],
    moduleSkillLinks: [],
    skills: [],
    actions: [],
    executionLogs: [],
    effortUnits: [],
    contributionLinks: [],
    rescueLogs: [],
    stateCheckIns: [],
    contextLogs: [],
    decisionResults: [],
    patternMemory: [],
    scheduleBlocks: [],
    rawCaptures: [],
    settings: { selectedThemeId: 'cleanFocus' },
    ...patch,
  };
}

function log(id: string, sourceCaptureId?: string): ExecutionLog {
  return {
    id,
    date: '2026-08-07',
    durationMinutes: 20,
    source: 'manual',
    createdAt: '2026-08-07T09:00:00.000Z',
    structuredData: sourceCaptureId ? { sourceCaptureId } : undefined,
  };
}

function capture(id: string): RawCapture {
  return {
    id,
    text: 'test-only',
    createdAt: '2026-08-07T09:00:00.000Z',
    parseStatus: 'done',
  };
}

export function runPersistenceConsistencyTests() {
  const base = data();
  const v11Log = log('v11-log');
  const currentWithV11 = data({ executionLogs: [v11Log] });
  const legacySettingsWrite = data({ settings: { ...base.settings, selectedThemeId: 'deepWork' } });

  const settingsMerged = rebaseAppDataWrite(base, legacySettingsWrite, currentWithV11);
  equal(ids(settingsMerged.executionLogs), 'v11-log', 'legacy settings write preserves newer V11 record');
  equal(settingsMerged.settings.selectedThemeId, 'deepWork', 'legacy settings delta is applied');

  const currentWithLegacy = data({ executionLogs: [log('legacy-log')] });
  const v11Write = data({ executionLogs: [v11Log] });
  const bothRoutes = rebaseAppDataWrite(base, v11Write, currentWithLegacy);
  equal(ids(bothRoutes.executionLogs), 'legacy-log,v11-log', 'V11 write preserves newer legacy record');

  equal(shouldPersistStoreMutation(false), false, 'hydration cannot persist defaults');
  equal(shouldPersistStoreMutation(true), true, 'hydrated mutations may persist');

  const captureRow = capture('capture-1');
  const linkedLog = log('capture-capture-1-0', captureRow.id);
  const linkedCurrent = data({ rawCaptures: [captureRow], executionLogs: [linkedLog] });
  const routeOnlyWrite = data({ settings: { ...base.settings, language: 'en' } });
  const linkedMerged = rebaseAppDataWrite(base, routeOnlyWrite, linkedCurrent);
  equal(ids(linkedMerged.rawCaptures), 'capture-1', 'linked capture survives route switch');
  equal(ids(linkedMerged.executionLogs), 'capture-capture-1-0', 'linked log survives route switch');

  const deleteBase = data({ executionLogs: [log('delete-me'), log('keep-me')] });
  const deleteNext = data({ executionLogs: [log('keep-me')] });
  const deleteCurrent = data({ executionLogs: [log('delete-me'), log('keep-me'), log('concurrent')] });
  const deleted = rebaseAppDataWrite(deleteBase, deleteNext, deleteCurrent);
  equal(ids(deleted.executionLogs), 'concurrent,keep-me', 'intentional deletion removes exact record only');

  const cleanupBase = data({ executionLogs: [log('valid'), log('invalid')] });
  const cleanupNext = data({ executionLogs: [log('valid')] });
  const cleanupCurrent = data({ executionLogs: [log('valid'), log('invalid'), log('new-valid')] });
  const cleaned = rebaseAppDataWrite(cleanupBase, cleanupNext, cleanupCurrent);
  equal(ids(cleaned.executionLogs), 'new-valid,valid', 'cleanup preserves concurrently added valid records');

  const unchangedRollback = rebaseAppDataWrite(base, base, currentWithV11);
  equal(ids(unchangedRollback.executionLogs), 'v11-log', 'feature-flag rollback without mutation does not change data');

  const staleWithCapture = data({ rawCaptures: [captureRow], executionLogs: [linkedLog] });
  const staleSettings = data({ settings: { ...base.settings, language: 'zh' } });
  const staleMerged = rebaseAppDataWrite(base, staleSettings, staleWithCapture);
  equal(ids(staleMerged.rawCaptures), 'capture-1', 'stale snapshot merge preserves capture');
  equal(ids(staleMerged.executionLogs), 'capture-capture-1-0', 'stale snapshot merge preserves execution log');
}

runPersistenceConsistencyTests();
