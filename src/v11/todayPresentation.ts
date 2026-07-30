import type { PatternMemory, StateCheckIn } from '../types';
import type {
  TodayDecisionPatternReference,
  TodayDecisionPresentation,
} from '../utils/todayDecisionPresentation';
import type { V11EvidenceStage } from './tokens';

export type V11TodayReading = {
  kind: 'empty' | 'state';
  value: number | null;
  unitKey: 'stateOutOfFive' | null;
  source: 'recorded' | 'none';
  recordedAt?: string;
};

export type V11TodayPresentation = {
  evidenceStage: V11EvidenceStage;
  reading: V11TodayReading;
  judgement: TodayDecisionPresentation['judgement'];
  actionLabel: TodayDecisionPresentation['actionLabel'];
  actionReason: TodayDecisionPresentation['actionReason'];
  executableCommand: TodayDecisionPresentation['executableCommand'];
  evidence: TodayDecisionPresentation['details']['evidence'];
  patternReferences: TodayDecisionPresentation['details']['patternReferences'];
  provenance: Array<{
    patternId: string;
    lastSeenAt?: string;
    updatedAt: string;
  }>;
};

export type DeriveV11EvidenceStageInput = {
  today: string;
  stateCheckIns: StateCheckIn[];
  patternMemory: PatternMemory[];
  patternReferences: TodayDecisionPatternReference[];
};

function isValidStateObservation(
  row: StateCheckIn,
): row is StateCheckIn & { overall: number } {
  return Number.isFinite(row.overall) && row.overall >= 1 && row.overall <= 5;
}

function currentDayStates(today: string, rows: StateCheckIn[]) {
  return (rows || [])
    .filter((row) => row.date === today && isValidStateObservation(row))
    .slice()
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

function isJudgementEvidenceReference(reference: TodayDecisionPatternReference) {
  return reference.used_as === 'primary_evidence'
    || reference.used_as === 'supporting_evidence';
}

function referencedPattern(
  reference: TodayDecisionPatternReference,
  patterns: PatternMemory[],
) {
  if (!reference.pattern_id || !isJudgementEvidenceReference(reference)) {
    return undefined;
  }
  return patterns.find((pattern) => pattern.id === reference.pattern_id);
}

function hasStoredPatternEvidence(pattern: PatternMemory) {
  return Number.isFinite(pattern.sampleN)
    && pattern.sampleN > 0
    && Array.isArray(pattern.support)
    && pattern.support.length > 0;
}

/**
 * Presentation-only evidence stage for the current Today reading/judgement.
 *
 * It deliberately does not infer freshness from timestamps. lastSeenAt and
 * updatedAt remain provenance metadata unless an existing repository rule is
 * introduced elsewhere.
 */
export function deriveV11EvidenceStage({
  today,
  stateCheckIns,
  patternMemory,
  patternReferences,
}: DeriveV11EvidenceStageInput): V11EvidenceStage {
  const todayStates = currentDayStates(today, stateCheckIns);
  if (todayStates.length === 0) return 'S0';

  const relevantReferences = (patternReferences || [])
    .filter(isJudgementEvidenceReference);

  const hasAcceptedSupportedReference = relevantReferences.some((reference) => {
    if (reference.status !== 'accepted') return false;
    const pattern = referencedPattern(reference, patternMemory || []);
    return pattern?.status === 'accepted' && hasStoredPatternEvidence(pattern);
  });
  if (hasAcceptedSupportedReference) return 'S3';

  const hasExplicitPatternReference = relevantReferences.some((reference) => (
    !!referencedPattern(reference, patternMemory || [])
  ));
  const comparableStateEvidence = (stateCheckIns || [])
    .filter(isValidStateObservation)
    .length >= 2;

  if (hasExplicitPatternReference || comparableStateEvidence) return 'S2';
  return 'S1';
}

export type BuildV11TodayPresentationInput = DeriveV11EvidenceStageInput & {
  decision: TodayDecisionPresentation;
};

export function buildV11TodayPresentation({
  decision,
  ...evidenceInput
}: BuildV11TodayPresentationInput): V11TodayPresentation {
  const todayStates = currentDayStates(
    evidenceInput.today,
    evidenceInput.stateCheckIns,
  );
  const latest = todayStates[0];
  const evidenceStage = deriveV11EvidenceStage(evidenceInput);
  const provenance = (decision.details.patternReferences || [])
    .map((reference) => referencedPattern(reference, evidenceInput.patternMemory))
    .filter((pattern): pattern is PatternMemory => !!pattern)
    .map((pattern) => ({
      patternId: pattern.id,
      lastSeenAt: pattern.lastSeenAt,
      updatedAt: pattern.updatedAt,
    }));

  return {
    evidenceStage,
    reading: latest
      ? {
          kind: 'state',
          value: latest.overall,
          unitKey: 'stateOutOfFive',
          source: 'recorded',
          recordedAt: latest.timestamp,
        }
      : {
          kind: 'empty',
          value: null,
          unitKey: null,
          source: 'none',
        },
    judgement: decision.judgement,
    actionLabel: decision.actionLabel,
    actionReason: decision.actionReason,
    executableCommand: decision.executableCommand,
    evidence: decision.details.evidence,
    patternReferences: decision.details.patternReferences,
    provenance,
  };
}
