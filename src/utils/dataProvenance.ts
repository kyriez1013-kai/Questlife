import type {
  DataCandidateCorrection,
  DataCaptureMethod,
  DataConfirmationProvenance,
  DataFieldOrigin,
  DataParserMetadata,
  DataRecordOrigin,
  DataRecordProvenance,
  ExecutionLog,
  ParsedEntry,
  StateCheckIn,
} from '../types';

export const DATA_PROVENANCE_VERSION = 'questlife.data.provenance.v1' as const;
export const EXECUTION_INSTRUMENT_VERSION = 'questlife-execution-v1';
export const STATE_INSTRUMENT_VERSION = 'questlife-state-v1';
export const CONTEXT_INSTRUMENT_VERSION = 'questlife-context-v1';

type ProvenanceInput = {
  origin: DataRecordOrigin;
  confirmation: DataConfirmationProvenance;
  captureMethod: DataCaptureMethod;
  recordedAt?: string;
  availableAt?: string;
  eventStartAt?: string;
  eventEndAt?: string;
  timezone?: string;
  protocolVersion?: string;
  instrumentVersion?: string;
  parser?: DataParserMetadata;
  candidate?: DataRecordProvenance['candidate'];
  corrections?: DataCandidateCorrection[];
  fieldOrigins?: Record<string, DataFieldOrigin>;
  sourceIds?: string[];
  limitations?: string[];
  retryOfRecordId?: string;
};

function validIso(value?: string): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export function currentDataTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

export function buildDataProvenance(input: ProvenanceInput): DataRecordProvenance {
  const recordedAt = validIso(input.recordedAt) ?? new Date().toISOString();
  const availableAt = validIso(input.availableAt) ?? recordedAt;
  const corrections = (input.corrections || []).filter((row) => !!row.field);
  return {
    schemaVersion: DATA_PROVENANCE_VERSION,
    origin: input.origin,
    confirmation: input.confirmation,
    captureMethod: input.captureMethod,
    recordedAt,
    availableAt,
    eventStartAt: validIso(input.eventStartAt),
    eventEndAt: validIso(input.eventEndAt),
    timezone: input.timezone ?? currentDataTimezone(),
    protocolVersion: input.protocolVersion,
    instrumentVersion: input.instrumentVersion,
    parser: input.parser,
    candidate: input.candidate,
    corrections: corrections.length > 0 ? corrections : undefined,
    correctedFields: corrections.length > 0 ? corrections.map((row) => row.field) : undefined,
    fieldOrigins: input.fieldOrigins,
    sourceIds: input.sourceIds?.filter(Boolean),
    limitations: input.limitations?.filter(Boolean),
    retryOfRecordId: input.retryOfRecordId,
  };
}

function localEventInterval(
  date?: string,
  startTime?: string,
  endTime?: string,
): { eventStartAt?: string; eventEndAt?: string; limitation?: string } {
  if (!date || !startTime || !endTime) return {};
  const start = new Date(`${date}T${startTime}:00`);
  const end = new Date(`${date}T${endTime}:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { limitation: 'EVENT_TIME_INVALID' };
  }
  if (end.getTime() <= start.getTime()) {
    return { limitation: 'CROSS_MIDNIGHT_OR_ORDER_UNRESOLVED' };
  }
  return { eventStartAt: start.toISOString(), eventEndAt: end.toISOString() };
}

function executionCaptureMethod(source: ExecutionLog['source'] | undefined): DataCaptureMethod {
  if (source === 'timer' || source === 'today_start') return 'timer';
  if (source === 'one_tap' || source === 'one_tap_done') return 'one_tap';
  if (source === 'schedule_block' || source === 'schedule_log') return 'schedule';
  return 'manual_form';
}

export function buildExecutionLogProvenance(input: {
  source?: ExecutionLog['source'];
  createdAt?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  hasExplicitDuration: boolean;
  structuredData?: Record<string, unknown>;
}): DataRecordProvenance {
  const captureMethod = executionCaptureMethod(input.source);
  const interval = localEventInterval(input.date, input.startTime, input.endTime);
  const durationOrigin: DataFieldOrigin = captureMethod === 'timer'
    ? 'rule_derived'
    : captureMethod === 'schedule' || captureMethod === 'one_tap' || !input.hasExplicitDuration
      ? 'ui_default_or_owner_confirmed'
      : 'owner_entered';
  const fieldOrigins: Record<string, DataFieldOrigin> = {
    durationMinutes: durationOrigin,
  };
  for (const field of ['weight', 'sets', 'reps', 'rpe']) {
    if (input.structuredData?.[field] != null) fieldOrigins[`structuredData.${field}`] = 'owner_entered';
  }
  return buildDataProvenance({
    origin: 'OWNER_OBSERVED',
    confirmation: 'USER_ENTERED',
    captureMethod,
    recordedAt: input.createdAt,
    eventStartAt: interval.eventStartAt,
    eventEndAt: interval.eventEndAt,
    instrumentVersion: EXECUTION_INSTRUMENT_VERSION,
    protocolVersion: 'questlife-execution-capture-v1',
    fieldOrigins,
    limitations: [
      ...(interval.limitation ? [interval.limitation] : []),
      ...(durationOrigin === 'ui_default_or_owner_confirmed' ? ['DURATION_EXPLICIT_TOUCH_UNKNOWN'] : []),
    ],
  });
}

export function buildStateCheckInProvenance(
  input: Pick<StateCheckIn, 'timestamp' | 'createdAt' | 'overall' | 'energy' | 'focus' | 'mood' | 'physical' | 'stress' | 'context'>,
): DataRecordProvenance {
  const fieldOrigins: Record<string, DataFieldOrigin> = { overall: 'owner_entered' };
  for (const field of ['energy', 'focus', 'mood', 'physical', 'stress'] as const) {
    if (input[field] != null) fieldOrigins[field] = 'ui_default_or_owner_confirmed';
  }
  if (input.context) {
    Object.keys(input.context).forEach((field) => {
      fieldOrigins[`context.${field}`] = 'owner_entered';
    });
  }
  return buildDataProvenance({
    origin: 'OWNER_OBSERVED',
    confirmation: 'USER_ENTERED',
    captureMethod: 'state_checkin',
    recordedAt: input.createdAt,
    eventStartAt: input.timestamp,
    eventEndAt: input.timestamp,
    instrumentVersion: STATE_INSTRUMENT_VERSION,
    protocolVersion: 'questlife-state-checkin-v1',
    fieldOrigins,
    limitations: Object.values(fieldOrigins).includes('ui_default_or_owner_confirmed')
      ? ['DETAILED_STATE_EXPLICIT_TOUCH_NOT_TRACKED']
      : undefined,
  });
}

export function buildRawCaptureProvenance(recordedAt?: string): DataRecordProvenance {
  return buildDataProvenance({
    origin: 'OWNER_OBSERVED',
    confirmation: 'UNCONFIRMED',
    captureMethod: 'smart_capture_text',
    recordedAt,
    protocolVersion: 'questlife-smart-capture-v1',
    fieldOrigins: { text: 'owner_entered' },
    limitations: ['PARSE_CANDIDATE_NOT_CONFIRMED'],
  });
}

export function buildRuleParsedContextProvenance(input: {
  recordedAt?: string;
  eventStartAt?: string;
  eventEndAt?: string;
  field: string;
}): DataRecordProvenance {
  return buildDataProvenance({
    origin: 'OWNER_OBSERVED',
    confirmation: 'USER_CONFIRMED',
    captureMethod: 'context_rule_parser',
    recordedAt: input.recordedAt,
    eventStartAt: input.eventStartAt,
    eventEndAt: input.eventEndAt,
    instrumentVersion: CONTEXT_INSTRUMENT_VERSION,
    protocolVersion: 'questlife-context-rule-parser-v1',
    fieldOrigins: { [input.field]: 'rule_derived' },
    limitations: input.eventStartAt ? undefined : ['EVENT_TIME_PRECISION_UNAVAILABLE'],
  });
}

export function buildDerivedProvenance(input: {
  captureMethod: 'decision_engine' | 'pattern_engine';
  recordedAt?: string;
  sourceIds?: string[];
  fieldOrigins?: Record<string, DataFieldOrigin>;
}): DataRecordProvenance {
  return buildDataProvenance({
    origin: 'DERIVED',
    confirmation: 'NOT_REQUIRED',
    captureMethod: input.captureMethod,
    recordedAt: input.recordedAt,
    instrumentVersion: input.captureMethod === 'decision_engine'
      ? 'questlife-decision-result-v1'
      : 'questlife-pattern-memory-v1',
    protocolVersion: input.captureMethod === 'decision_engine'
      ? 'questlife-decision-engine-v1'
      : 'questlife-pattern-engine-v1',
    sourceIds: input.sourceIds,
    fieldOrigins: input.fieldOrigins,
  });
}

function comparableScalar(value: unknown): string | number | boolean | null | undefined {
  if (value == null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value as string | number | boolean | null | undefined;
  }
  return undefined;
}

function addCorrection(
  rows: DataCandidateCorrection[],
  field: string,
  proposed: unknown,
  confirmed: unknown,
  redactValues = false,
) {
  if (JSON.stringify(proposed) === JSON.stringify(confirmed)) return;
  const proposedValue = comparableScalar(proposed);
  const confirmedValue = comparableScalar(confirmed);
  rows.push({
    field,
    ...(redactValues ? { valuesRedacted: true } : { proposed: proposedValue, confirmed: confirmedValue }),
  });
}

export function captureCandidateCorrections(
  proposed: ParsedEntry,
  confirmed: ParsedEntry,
): DataCandidateCorrection[] {
  const rows: DataCandidateCorrection[] = [];
  addCorrection(rows, 'title', proposed.skillName, confirmed.skillName);
  addCorrection(rows, 'linkedSkillId', proposed.matchedSkillId, confirmed.matchedSkillId);
  addCorrection(rows, 'qualityRating', proposed.qualityRating, confirmed.qualityRating);
  const fieldKeys = new Set([...Object.keys(proposed.fields || {}), ...Object.keys(confirmed.fields || {})]);
  fieldKeys.forEach((field) => {
    const redactValues = field === 'note' || field === 'scope' || typeof proposed.fields?.[field] === 'object';
    addCorrection(rows, `fields.${field}`, proposed.fields?.[field], confirmed.fields?.[field], redactValues);
  });
  return rows;
}

export function buildConfirmedCaptureProvenance(input: {
  rawCaptureId: string;
  entryIndex: number;
  entryKey?: string;
  parser?: DataParserMetadata;
  corrections?: DataCandidateCorrection[];
  recordedAt?: string;
  fieldOrigins: Record<string, DataFieldOrigin>;
}): DataRecordProvenance {
  const corrections = input.corrections || [];
  return buildDataProvenance({
    origin: 'OWNER_CONFIRMED_AI_PARSE',
    confirmation: corrections.length > 0 ? 'USER_CORRECTED' : 'USER_CONFIRMED',
    captureMethod: 'smart_capture_text',
    recordedAt: input.recordedAt,
    instrumentVersion: EXECUTION_INSTRUMENT_VERSION,
    protocolVersion: 'questlife-smart-capture-confirmation-v1',
    parser: input.parser,
    candidate: {
      rawCaptureId: input.rawCaptureId,
      entryIndex: input.entryIndex,
      entryKey: input.entryKey,
    },
    corrections,
    fieldOrigins: input.fieldOrigins,
    limitations: ['EVENT_TIME_PRECISION_DAY_ONLY'],
  });
}

export function withDecisionFeedbackProvenance(
  provenance: DataRecordProvenance | undefined,
  recordedAt: string,
): DataRecordProvenance {
  const base = provenance ?? buildDerivedProvenance({ captureMethod: 'decision_engine', recordedAt });
  return {
    ...base,
    fieldOrigins: {
      ...(base.fieldOrigins || {}),
      'userFeedback.rating': 'owner_entered',
      'userFeedback.ts': 'owner_entered',
    },
  };
}
