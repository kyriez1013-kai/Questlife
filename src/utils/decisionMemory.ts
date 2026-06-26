import type { DecisionResult } from '../types';
import type { DecisionQualityEvaluation } from './decisionQuality';
import type { DecisionPayloadAudit } from './decisionRealityAudit';
import type { DecisionBriefResult, DecisionMode, DecisionTrigger } from './decisionTypes';
import type { DecisionServiceMeta } from '../services/decisionService';

export type DecisionMemorySummary = {
  recent_count_7d: number;
  useful_count_7d: number;
  not_useful_count_7d: number;
  weak_or_bad_quality_count_7d: number;
  repeated_failed_checks: string[];
  recent_headline_summaries: string[];
  modes_seen: DecisionMode[];
  last_useful_insight?: string;
  last_not_useful_insight?: string;
};

type CreateDecisionResultArgs = {
  id: string;
  result: DecisionBriefResult;
  mode: DecisionMode;
  trigger: DecisionTrigger;
  source: DecisionResult['source'];
  quality?: DecisionQualityEvaluation | null;
  meta?: DecisionServiceMeta | null;
  payloadAudit?: DecisionPayloadAudit | null;
  createdAt?: string;
};

const MAX_DECISION_RESULTS = 100;

function shortText(value: unknown, limit = 220) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function safeNumber(value: unknown, min = 0, max = 100) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.max(min, Math.min(max, value));
}

export function createDecisionResultRecord({
  id,
  result,
  mode,
  trigger,
  source,
  quality,
  meta,
  payloadAudit,
  createdAt,
}: CreateDecisionResultArgs): DecisionResult {
  const firstStep = result.prescription?.do_first;
  const failedCheckIds = (quality?.checks || []).filter((check) => !check.passed).map((check) => check.id).slice(0, 12);
  return {
    id,
    createdAt: createdAt || result.generated_at || new Date().toISOString(),
    mode,
    trigger,
    source,
    schemaVersion: result.schema_version || '1.0',
    headlineInsight: shortText(result.headline_insight),
    readinessBand: result.readiness?.band,
    readinessScore: safeNumber(result.readiness?.score),
    firstStep: firstStep?.step ? {
      step: shortText(firstStep.step, 160),
      why: firstStep.why ? shortText(firstStep.why, 220) : undefined,
      durationMin: safeNumber(firstStep.duration_min, 0, 360),
    } : undefined,
    doNot: (result.prescription?.do_not || []).map((item) => shortText(item, 140)).filter(Boolean).slice(0, 4),
    perceptionGapDetected: result.perception_gap?.detected === true,
    evidenceBasis: result.evidence_basis,
    confidence: safeNumber(result.confidence, 0, 1),
    quality: quality ? {
      score: quality.score,
      grade: quality.grade,
      failedCheckIds,
      flags: {
        generic: quality.flags.generic || undefined,
        missingEvidence: quality.flags.missingEvidence || undefined,
        missingFirstStep: quality.flags.missingFirstStep || undefined,
        overclaiming: quality.flags.overclaiming || undefined,
        medicalRisk: quality.flags.medicalRisk || undefined,
        tooVerbose: quality.flags.tooVerbose || undefined,
        tooVague: quality.flags.tooVague || undefined,
        ignoredAcceptedPatterns: quality.flags.ignoredAcceptedPatterns || undefined,
        candidateMisuse: quality.flags.candidateMisuse || undefined,
        acceptedPatternGrounded: quality.flags.acceptedPatternGrounded || undefined,
      },
    } : undefined,
    meta: {
      model: meta?.model ? shortText(meta.model, 80) : undefined,
      finishReason: meta?.finishReason ? shortText(meta.finishReason, 80) : undefined,
      evidenceRichness: payloadAudit?.evidenceRichness,
      endpointOk: meta?.endpointOk,
    },
  };
}

export function compactDecisionResults(results: DecisionResult[], limit = MAX_DECISION_RESULTS) {
  return (results || [])
    .slice()
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, limit);
}

function withinDays(createdAt: string, now: Date, days: number) {
  const ts = new Date(createdAt).getTime();
  if (!Number.isFinite(ts)) return false;
  return now.getTime() - ts <= days * 24 * 60 * 60 * 1000;
}

export function buildDecisionMemorySummary(results: DecisionResult[] = [], now = new Date()): DecisionMemorySummary {
  const recent = compactDecisionResults(results).filter((result) => withinDays(result.createdAt, now, 7));
  const failedCounts = new Map<string, number>();
  recent.forEach((result) => {
    (result.quality?.failedCheckIds || []).forEach((id) => failedCounts.set(id, (failedCounts.get(id) || 0) + 1));
  });
  const repeated_failed_checks = Array.from(failedCounts.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)
    .slice(0, 6);
  const useful = recent.filter((result) => result.userFeedback?.rating === 'useful');
  const notUseful = recent.filter((result) => result.userFeedback?.rating === 'not_useful');
  const modes = Array.from(new Set(recent.map((result) => result.mode))) as DecisionMode[];
  return {
    recent_count_7d: recent.length,
    useful_count_7d: useful.length,
    not_useful_count_7d: notUseful.length,
    weak_or_bad_quality_count_7d: recent.filter((result) => result.quality?.grade === 'weak' || result.quality?.grade === 'bad').length,
    repeated_failed_checks,
    recent_headline_summaries: recent.map((result) => shortText(result.headlineInsight, 120)).filter(Boolean).slice(0, 3),
    modes_seen: modes,
    last_useful_insight: useful[0]?.headlineInsight ? shortText(useful[0].headlineInsight, 120) : undefined,
    last_not_useful_insight: notUseful[0]?.headlineInsight ? shortText(notUseful[0].headlineInsight, 120) : undefined,
  };
}
