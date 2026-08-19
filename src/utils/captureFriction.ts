export const CAPTURE_FRICTION_CONTRACT_VERSION = 'questlife.capture.friction.v1' as const;

export type CaptureFrictionMethod = 'text' | 'tap' | 'recent';
export type CaptureFrictionDomain = 'learning' | 'work' | 'exercise' | 'state' | 'context' | 'other' | 'unknown';
export type CaptureFrictionEventType =
  | 'capture_started'
  | 'parser_started'
  | 'parser_succeeded'
  | 'parser_failed'
  | 'candidate_presented'
  | 'candidate_corrected'
  | 'capture_confirmed'
  | 'capture_abandoned';

export type CaptureFrictionEvent = {
  contractVersion: typeof CAPTURE_FRICTION_CONTRACT_VERSION;
  eventId: string;
  flowId: string;
  eventType: CaptureFrictionEventType;
  occurredAt: string;
  method: CaptureFrictionMethod;
  domain: CaptureFrictionDomain;
  candidateCount?: number;
  fieldsPresent?: string[];
  correctedFields?: string[];
  correctionCount?: number;
  tapCount?: number;
  scrollRequired?: boolean;
  elapsedMs?: number;
  failureCode?: 'network' | 'timeout' | 'http' | 'parse' | 'unknown';
};

export type CaptureFrictionSummary = {
  contractVersion: typeof CAPTURE_FRICTION_CONTRACT_VERSION;
  source: 'local_ephemeral_metadata';
  eventCount: number;
  startedCount: number;
  parserSuccessCount: number;
  parserFailureCount: number;
  confirmedCount: number;
  abandonedCount: number;
  correctionRate?: number;
  confirmationRate?: number;
  medianTimeToConfirmMs?: number;
  byDomain: Record<string, {
    started: number;
    confirmed: number;
    corrected: number;
    parserFailures: number;
  }>;
};

type FlowState = {
  flowId: string;
  method: CaptureFrictionMethod;
  startedAt: number;
  domain: CaptureFrictionDomain;
  taps: number;
};

const MAX_EVENTS = 500;
const events: CaptureFrictionEvent[] = [];
const flows = new Map<string, FlowState>();
let eventSequence = 0;

function eventId() {
  eventSequence += 1;
  return `capture-friction-${Date.now()}-${eventSequence}`;
}

function boundedCount(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.round(value));
}

function safeFields(values?: string[]): string[] | undefined {
  if (!Array.isArray(values)) return undefined;
  const safe = Array.from(new Set(values
    .filter((value) => /^[a-zA-Z0-9_.-]{1,80}$/.test(value))
    .slice(0, 40)));
  return safe.length > 0 ? safe : undefined;
}

function append(event: CaptureFrictionEvent) {
  events.push(event);
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
  return event;
}

export function startCaptureFriction(
  captureId: string,
  method: CaptureFrictionMethod,
  now = Date.now(),
): CaptureFrictionEvent {
  const flow: FlowState = {
    flowId: `flow-${now}-${Math.random().toString(36).slice(2, 9)}`,
    method,
    startedAt: now,
    domain: 'unknown',
    taps: 1,
  };
  flows.set(captureId, flow);
  return append({
    contractVersion: CAPTURE_FRICTION_CONTRACT_VERSION,
    eventId: eventId(),
    flowId: flow.flowId,
    eventType: 'capture_started',
    occurredAt: new Date(now).toISOString(),
    method,
    domain: 'unknown',
    tapCount: 1,
  });
}

export function recordCaptureFriction(
  captureId: string,
  eventType: Exclude<CaptureFrictionEventType, 'capture_started'>,
  metadata: Partial<Pick<
    CaptureFrictionEvent,
    'domain' | 'candidateCount' | 'fieldsPresent' | 'correctedFields' | 'tapCount' | 'scrollRequired' | 'failureCode'
  >> = {},
  now = Date.now(),
): CaptureFrictionEvent | undefined {
  const flow = flows.get(captureId);
  if (!flow) return undefined;
  const domain = metadata.domain ?? flow.domain;
  if (flow.domain === 'unknown' && domain !== 'unknown') {
    events.forEach((event) => {
      if (event.flowId === flow.flowId && event.domain === 'unknown') event.domain = domain;
    });
  }
  flow.domain = domain;
  flow.taps += boundedCount(metadata.tapCount) ?? 0;
  const correctedFields = safeFields(metadata.correctedFields);
  const event = append({
    contractVersion: CAPTURE_FRICTION_CONTRACT_VERSION,
    eventId: eventId(),
    flowId: flow.flowId,
    eventType,
    occurredAt: new Date(now).toISOString(),
    method: flow.method,
    domain,
    candidateCount: boundedCount(metadata.candidateCount),
    fieldsPresent: safeFields(metadata.fieldsPresent),
    correctedFields,
    correctionCount: correctedFields?.length,
    tapCount: flow.taps,
    scrollRequired: metadata.scrollRequired === true ? true : undefined,
    elapsedMs: eventType === 'capture_confirmed' || eventType === 'capture_abandoned'
      ? Math.max(0, now - flow.startedAt)
      : undefined,
    failureCode: metadata.failureCode,
  });
  if (eventType === 'capture_confirmed' || eventType === 'capture_abandoned') flows.delete(captureId);
  return event;
}

export function getCaptureFrictionEvents(): CaptureFrictionEvent[] {
  return events.map((event) => ({
    ...event,
    fieldsPresent: event.fieldsPresent?.slice(),
    correctedFields: event.correctedFields?.slice(),
  }));
}

function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const ordered = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 0
    ? Math.round(((ordered[middle - 1] ?? 0) + (ordered[middle] ?? 0)) / 2)
    : ordered[middle];
}

export function buildCaptureFrictionSummary(): CaptureFrictionSummary {
  const byDomain: CaptureFrictionSummary['byDomain'] = {};
  const ensureDomain = (domain: string) => {
    byDomain[domain] ??= { started: 0, confirmed: 0, corrected: 0, parserFailures: 0 };
    return byDomain[domain];
  };
  events.forEach((event) => {
    const bucket = ensureDomain(event.domain);
    if (event.eventType === 'capture_started') bucket.started += 1;
    if (event.eventType === 'capture_confirmed') bucket.confirmed += 1;
    if (event.eventType === 'candidate_corrected') bucket.corrected += 1;
    if (event.eventType === 'parser_failed') bucket.parserFailures += 1;
  });
  const startedCount = events.filter((event) => event.eventType === 'capture_started').length;
  const confirmed = events.filter((event) => event.eventType === 'capture_confirmed');
  const correctedFlowIds = new Set(events
    .filter((event) => event.eventType === 'candidate_corrected' && (event.correctionCount || 0) > 0)
    .map((event) => event.flowId));
  return {
    contractVersion: CAPTURE_FRICTION_CONTRACT_VERSION,
    source: 'local_ephemeral_metadata',
    eventCount: events.length,
    startedCount,
    parserSuccessCount: events.filter((event) => event.eventType === 'parser_succeeded').length,
    parserFailureCount: events.filter((event) => event.eventType === 'parser_failed').length,
    confirmedCount: confirmed.length,
    abandonedCount: events.filter((event) => event.eventType === 'capture_abandoned').length,
    correctionRate: confirmed.length > 0 ? correctedFlowIds.size / confirmed.length : undefined,
    confirmationRate: startedCount > 0 ? confirmed.length / startedCount : undefined,
    medianTimeToConfirmMs: median(confirmed.flatMap((event) => event.elapsedMs == null ? [] : [event.elapsedMs])),
    byDomain,
  };
}

export function resetCaptureFrictionForTests() {
  events.splice(0, events.length);
  flows.clear();
  eventSequence = 0;
}
