import type { PatternMemory, StateCheckIn } from '../types';
import type { TodayDecisionPatternReference } from '../utils/todayDecisionPresentation';
// Node's built-in TypeScript runner requires the extension; Expo's project
// typecheck does not enable allowImportingTsExtensions.
// @ts-expect-error Test-only Node TypeScript entry.
import { deriveV11EvidenceStage } from './todayPresentation.ts';

const today = '2026-07-31';

function state(id: string, date = today, overall = 3): StateCheckIn {
  return {
    id,
    date,
    timestamp: `${date}T09:00:00.000Z`,
    overall,
    createdAt: `${date}T09:00:00.000Z`,
  };
}

function pattern(
  id: string,
  patch: Partial<PatternMemory> = {},
): PatternMemory {
  return {
    id,
    createdAt: '2026-07-01T09:00:00.000Z',
    updatedAt: '2026-07-20T09:00:00.000Z',
    status: 'accepted',
    label: id,
    description: id,
    patternType: 'action_state_effect',
    evidenceBasis: 'personal_pattern',
    confidence: 0.8,
    sampleN: 2,
    support: [{
      sourceType: 'state',
      sourceId: 'state-1',
      summary: 'Recorded support',
    }],
    ...patch,
  };
}

function reference(
  patternId: string,
  patch: Partial<TodayDecisionPatternReference> = {},
): TodayDecisionPatternReference {
  return {
    pattern_id: patternId,
    label: patternId,
    status: 'accepted',
    used_as: 'primary_evidence',
    ...patch,
  };
}

function equal(actual: unknown, expected: unknown, name: string) {
  if (actual !== expected) {
    throw new Error(`${name}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

export function runV11TodayPresentationTests() {
  equal(deriveV11EvidenceStage({
    today,
    stateCheckIns: [],
    patternMemory: [pattern('unrelated')],
    patternReferences: [reference('unrelated')],
  }), 'S0', 'S0 wins without a current-day state');

  equal(deriveV11EvidenceStage({
    today,
    stateCheckIns: [state('one')],
    patternMemory: [pattern('unrelated')],
    patternReferences: [],
  }), 'S1', 'unrelated accepted pattern does not promote');

  equal(deriveV11EvidenceStage({
    today,
    stateCheckIns: [state('current'), state('prior', '2026-07-30')],
    patternMemory: [],
    patternReferences: [],
  }), 'S2', 'comparable overall observations promote to S2');

  equal(deriveV11EvidenceStage({
    today,
    stateCheckIns: [state('one')],
    patternMemory: [pattern('accepted-no-support', { support: [] })],
    patternReferences: [reference('accepted-no-support')],
  }), 'S2', 'accepted reference without support lowers to S2');

  equal(deriveV11EvidenceStage({
    today,
    stateCheckIns: [state('one')],
    patternMemory: [pattern('accepted-supported')],
    patternReferences: [reference('accepted-supported')],
  }), 'S3', 'explicit accepted supported reference promotes to S3');

  equal(deriveV11EvidenceStage({
    today,
    stateCheckIns: [state('one')],
    patternMemory: [pattern('caution-only')],
    patternReferences: [reference('caution-only', { used_as: 'caution' })],
  }), 'S1', 'caution reference does not promote');

  equal(deriveV11EvidenceStage({
    today,
    stateCheckIns: [state('one')],
    patternMemory: [pattern('stored-id')],
    patternReferences: [reference('different-id')],
  }), 'S1', 'missing pattern relationship does not promote');
}

runV11TodayPresentationTests();
