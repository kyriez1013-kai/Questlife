import type { ParsedEntry } from '../types';
// @ts-expect-error Test-only Node TypeScript entry.
import * as provenance from './dataProvenance.ts';

const {
  buildConfirmedCaptureProvenance,
  buildExecutionLogProvenance,
  buildRawCaptureProvenance,
  buildStateCheckInProvenance,
  captureCandidateCorrections,
  withDecisionFeedbackProvenance,
} = provenance;

let assertions = 0;

function equal(actual: unknown, expected: unknown, name: string) {
  assertions += 1;
  if (actual !== expected) throw new Error(`${name}: expected ${String(expected)}, received ${String(actual)}`);
}

const recordedAt = '2026-08-20T08:00:00.000Z';

const candidate: ParsedEntry = {
  skillName: 'Bench press',
  matchedSkillId: 'skill-bench',
  goalType: 'fitness',
  progressType: 'performance_log',
  fields: {
    durationMinutes: 30,
    sets: [{ weight: 80, reps: 5 }],
    note: 'private candidate note',
  },
  qualityRating: 3,
};

const confirmed: ParsedEntry = {
  ...candidate,
  skillName: 'Paused bench press',
  fields: {
    ...candidate.fields,
    durationMinutes: 35,
    note: 'private corrected note',
  },
  qualityRating: 4,
};

function runDataProvenanceTests() {
  const raw = buildRawCaptureProvenance(recordedAt);
  equal(raw.origin, 'OWNER_OBSERVED', 'raw capture is owner-originated');
  equal(raw.confirmation, 'UNCONFIRMED', 'raw parse candidate is not observed truth');
  equal(raw.fieldOrigins?.text, 'owner_entered', 'raw text origin is explicit');

  const manual = buildExecutionLogProvenance({
    source: 'manual',
    createdAt: recordedAt,
    date: '2026-08-20',
    hasExplicitDuration: true,
  });
  equal(manual.fieldOrigins?.durationMinutes, 'owner_entered', 'manual explicit duration is owner-entered');

  const scheduled = buildExecutionLogProvenance({
    source: 'schedule_log',
    createdAt: recordedAt,
    date: '2026-08-20',
    hasExplicitDuration: false,
  });
  equal(scheduled.fieldOrigins?.durationMinutes, 'ui_default_or_owner_confirmed', 'schedule duration remains ambiguous');
  equal(scheduled.limitations?.includes('DURATION_EXPLICIT_TOUCH_UNKNOWN'), true, 'schedule ambiguity is explicit');

  const state = buildStateCheckInProvenance({
    timestamp: recordedAt,
    createdAt: recordedAt,
    overall: 4,
    energy: 3,
    focus: 3,
    mood: 3,
  });
  equal(state.fieldOrigins?.overall, 'owner_entered', 'primary state is owner-entered');
  equal(state.fieldOrigins?.energy, 'ui_default_or_owner_confirmed', 'detailed state touch remains unknown');

  const corrections = captureCandidateCorrections(candidate, confirmed);
  equal(corrections.some((row) => row.field === 'title'), true, 'title correction is tracked');
  equal(corrections.some((row) => row.field === 'fields.durationMinutes'), true, 'duration correction is tracked');
  const noteCorrection = corrections.find((row) => row.field === 'fields.note');
  equal(noteCorrection?.valuesRedacted, true, 'private note correction values are redacted');
  equal(JSON.stringify(corrections).includes('private candidate note'), false, 'candidate note content is absent');
  equal(JSON.stringify(corrections).includes('private corrected note'), false, 'corrected note content is absent');

  const accepted = buildConfirmedCaptureProvenance({
    rawCaptureId: 'raw-1',
    entryIndex: 0,
    parser: { provider: 'deepseek', version: 'parser-v1' },
    corrections,
    fieldOrigins: {
      title: 'owner_corrected',
      durationMinutes: 'owner_corrected',
    },
    recordedAt,
  });
  equal(accepted.origin, 'OWNER_CONFIRMED_AI_PARSE', 'confirmed candidate has explicit AI origin');
  equal(accepted.confirmation, 'USER_CORRECTED', 'corrected candidate is not labeled unchanged');
  equal(accepted.candidate?.rawCaptureId, 'raw-1', 'candidate lineage is retained');
  equal(accepted.parser?.version, 'parser-v1', 'parser version is retained without prompt payload');

  const decisionFeedback = withDecisionFeedbackProvenance(undefined, recordedAt);
  equal(decisionFeedback.origin, 'DERIVED', 'DecisionResult remains derived');
  equal(decisionFeedback.fieldOrigins?.['userFeedback.rating'], 'owner_entered', 'feedback field remains owner input');

  console.log(`dataProvenance: ${assertions} assertions passed`);
}

runDataProvenanceTests();
