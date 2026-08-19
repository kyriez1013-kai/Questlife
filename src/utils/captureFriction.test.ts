// @ts-expect-error Test-only Node TypeScript entry.
import * as captureFriction from './captureFriction.ts';

const {
  buildCaptureFrictionSummary,
  getCaptureFrictionEvents,
  recordCaptureFriction,
  resetCaptureFrictionForTests,
  startCaptureFriction,
} = captureFriction;

let assertions = 0;

function equal(actual: unknown, expected: unknown, name: string) {
  assertions += 1;
  if (actual !== expected) throw new Error(`${name}: expected ${String(expected)}, received ${String(actual)}`);
}

function runCaptureFrictionTests() {
  resetCaptureFrictionForTests();
  startCaptureFriction('private-record-id', 'text', 1_000);
  recordCaptureFriction('private-record-id', 'parser_started', {}, 1_100);
  recordCaptureFriction('private-record-id', 'parser_succeeded', {
    domain: 'exercise',
    candidateCount: 1,
    fieldsPresent: ['skillName', 'fields.durationMinutes', 'raw text must fail'],
    // Runtime callers cannot smuggle arbitrary private keys into the contract.
    ...({ rawText: 'private workout text', note: 'private note' } as any),
  }, 1_200);
  recordCaptureFriction('private-record-id', 'candidate_corrected', {
    domain: 'exercise',
    correctedFields: ['title', 'fields.durationMinutes'],
    tapCount: 2,
  }, 1_500);
  recordCaptureFriction('private-record-id', 'capture_confirmed', {
    domain: 'exercise',
    candidateCount: 1,
    correctedFields: ['title', 'fields.durationMinutes'],
    tapCount: 1,
  }, 2_000);

  const rows = getCaptureFrictionEvents();
  const serialized = JSON.stringify(rows);
  equal(serialized.includes('private workout text'), false, 'raw capture text is not retained');
  equal(serialized.includes('private note'), false, 'notes are not retained');
  equal(serialized.includes('private-record-id'), false, 'persisted entity id is not exposed in events');
  equal(rows.find((row) => row.eventType === 'parser_succeeded')?.fieldsPresent?.includes('raw text must fail'), false, 'unsafe field labels fail closed');

  const summary = buildCaptureFrictionSummary();
  equal(summary.source, 'local_ephemeral_metadata', 'telemetry remains local and ephemeral');
  equal(summary.startedCount, 1, 'capture start is counted');
  equal(summary.confirmedCount, 1, 'confirmation is counted');
  equal(summary.parserFailureCount, 0, 'successful parser is not marked failed');
  equal(summary.correctionRate, 1, 'correction rate derives from metadata events');
  equal(summary.medianTimeToConfirmMs, 1_000, 'time to confirm is measured');
  equal(summary.byDomain.exercise?.started, 1, 'resolved domain updates the flow summary');

  startCaptureFriction('abandoned-record', 'recent', 3_000);
  recordCaptureFriction('abandoned-record', 'capture_abandoned', { domain: 'learning' }, 3_100);
  equal(buildCaptureFrictionSummary().abandonedCount, 1, 'abandonment is represented separately');

  console.log(`captureFriction: ${assertions} assertions passed`);
}

runCaptureFrictionTests();
