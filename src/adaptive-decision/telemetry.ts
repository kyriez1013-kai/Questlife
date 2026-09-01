export type AdaptiveDecisionTelemetryEventName =
  | 'decision_flow_opened'
  | 'decision_context_assembled'
  | 'decision_missing_questions_shown'
  | 'decision_proposals_ready'
  | 'decision_proposal_selected'
  | 'decision_plan_applied'
  | 'decision_undo_used'
  | 'decision_follow_up_due'
  | 'decision_follow_up_completed';

export type AdaptiveDecisionTelemetryEvent = {
  name: AdaptiveDecisionTelemetryEventName;
  at: string;
  questionType?: string;
  contextFactCount?: number;
  missingQuestionCount?: number;
  proposalCount?: number;
  operationCount?: number;
  elapsedMs?: number;
  usefulness?: string;
  fixtureOnly: boolean;
};

const SESSION_KEY = 'questlife_adaptive_decision_telemetry_v1';

function readEvents(): AdaptiveDecisionTelemetryEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(SESSION_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordAdaptiveDecisionTelemetry(
  event: Omit<AdaptiveDecisionTelemetryEvent, 'at'>,
): void {
  if (typeof window === 'undefined') return;
  try {
    const events = [...readEvents(), { ...event, at: new Date().toISOString() }].slice(-100);
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(events));
  } catch {
    // Telemetry is best-effort and must never affect the decision flow.
  }
}

export function getAdaptiveDecisionTelemetry(): AdaptiveDecisionTelemetryEvent[] {
  return readEvents();
}

export function clearAdaptiveDecisionTelemetry(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Session storage can be unavailable in hardened browser contexts.
  }
}
