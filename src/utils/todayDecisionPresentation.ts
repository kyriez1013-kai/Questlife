import { DailyOperatingBrief, DailyOperatingBriefConfidence } from './dailyOperatingBrief';
import { DecisionQualityEvaluation } from './decisionQuality';
import { DecisionBriefResult, DecisionEvidenceBasis, DecisionReadinessBand } from './decisionTypes';
import { ScheduleProposal } from './scheduleProposal';
import { TodayCommand } from './todayCommand';

export type TodayDecisionCopy =
  | { kind: 'i18n'; key: string; values?: Record<string, string | number> }
  | { kind: 'text'; text: string };

type TodayDecisionTextCopy = Extract<TodayDecisionCopy, { kind: 'text' }>;

export type TodayDecisionPresentationStatus =
  | 'loading'
  | 'ready'
  | 'fallback'
  | 'weak'
  | 'error';

export type TodayDecisionPresentationSource =
  | 'ai'
  | 'legacy_fallback'
  | 'ai_failed_fallback'
  | 'operating_brief';

export type TodayDecisionEvidenceItem = {
  id: string;
  type: 'readiness_driver' | DailyOperatingBrief['evidence'][number]['type'];
  copy: TodayDecisionCopy;
  confidence?: DailyOperatingBriefConfidence;
};

export type TodayDecisionPatternReference = NonNullable<DecisionBriefResult['pattern_references']>[number];

export type TodayDecisionPresentation = {
  status: TodayDecisionPresentationStatus;
  source: TodayDecisionPresentationSource;
  judgement: TodayDecisionCopy;
  executableCommand: TodayCommand;
  actionLabel: TodayDecisionCopy;
  actionReason: TodayDecisionCopy;
  readiness: {
    band: DecisionReadinessBand;
    score: number | null;
  };
  details: {
    evidence: TodayDecisionEvidenceItem[];
    confidence: {
      value: number | null;
      label: DailyOperatingBriefConfidence;
      basis?: DecisionEvidenceBasis;
    };
    patternReferences: TodayDecisionPatternReference[];
    dataGaps: string[];
    feedback: {
      enabled: boolean;
      decisionResultId?: string;
      value: 'useful' | 'not_useful' | null;
    };
    scheduleProposals: ScheduleProposal[];
  };
};

type BuildTodayDecisionPresentationInput = {
  todayCommand: TodayCommand;
  dailyOperatingBrief: DailyOperatingBrief;
  dailyDecisionBrief?: DecisionBriefResult | null;
  loading?: boolean;
  error?: string;
  source?: Exclude<TodayDecisionPresentationSource, 'operating_brief'>;
  quality?: DecisionQualityEvaluation | null;
  decisionResultId?: string;
  feedback?: 'useful' | 'not_useful' | null;
  scheduleProposals?: ScheduleProposal[];
};

function textCopy(value?: string): TodayDecisionTextCopy | undefined {
  const text = value?.trim();
  return text ? { kind: 'text', text } : undefined;
}

function operatingBriefCopy(
  key: string,
  values?: Record<string, string | number>,
): TodayDecisionCopy {
  return { kind: 'i18n', key, values };
}

function confidenceLabel(value: number | null, fallback: DailyOperatingBriefConfidence) {
  if (value == null) return fallback;
  if (value >= 0.75) return 'high';
  if (value >= 0.45) return 'medium';
  return 'low';
}

function clampConfidence(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(1, value));
}

function presentationStatus({
  dailyDecisionBrief,
  loading,
  error,
  source,
  quality,
}: Pick<
  BuildTodayDecisionPresentationInput,
  'dailyDecisionBrief' | 'loading' | 'error' | 'source' | 'quality'
>): TodayDecisionPresentationStatus {
  if (loading && !dailyDecisionBrief) return 'loading';
  if (error && !dailyDecisionBrief) return 'error';
  if (quality?.grade === 'weak' || quality?.grade === 'bad') return 'weak';
  if (!dailyDecisionBrief || source === 'legacy_fallback' || source === 'ai_failed_fallback') return 'fallback';
  return 'ready';
}

function evidenceItems(
  dailyOperatingBrief: DailyOperatingBrief,
  dailyDecisionBrief?: DecisionBriefResult | null,
): TodayDecisionEvidenceItem[] {
  const items: TodayDecisionEvidenceItem[] = [];
  const seen = new Set<string>();

  (dailyDecisionBrief?.readiness?.drivers || []).forEach((driver, index) => {
    const copy = textCopy(driver);
    if (!copy) return;
    const identity = `text:${copy.text}`;
    if (seen.has(identity)) return;
    seen.add(identity);
    items.push({
      id: `readiness-driver-${index}`,
      type: 'readiness_driver',
      copy,
    });
  });

  dailyOperatingBrief.evidence.forEach((item, index) => {
    const identity = `i18n:${item.labelKey}:${JSON.stringify(item.labelValues || {})}`;
    if (seen.has(identity)) return;
    seen.add(identity);
    items.push({
      id: `operating-evidence-${item.type}-${index}`,
      type: item.type,
      copy: operatingBriefCopy(item.labelKey, item.labelValues),
      confidence: item.confidence,
    });
  });

  return items.slice(0, 4);
}

/**
 * Converts existing decision outputs into a UI-ready model.
 * It never changes command priority: executableCommand is always todayCommand.
 */
export function buildTodayDecisionPresentation({
  todayCommand,
  dailyOperatingBrief,
  dailyDecisionBrief,
  loading = false,
  error = '',
  source,
  quality,
  decisionResultId,
  feedback = null,
  scheduleProposals = [],
}: BuildTodayDecisionPresentationInput): TodayDecisionPresentation {
  const status = presentationStatus({ dailyDecisionBrief, loading, error, source, quality });
  const canUseDecisionHeadline = !!dailyDecisionBrief && quality?.grade !== 'bad';
  const judgement = status === 'loading'
    ? operatingBriefCopy('generatingDailyBrief')
    : canUseDecisionHeadline
      ? textCopy(dailyDecisionBrief.headline_insight)
        ?? operatingBriefCopy(dailyOperatingBrief.mainJudgementKey, dailyOperatingBrief.mainJudgementValues)
      : operatingBriefCopy(dailyOperatingBrief.mainJudgementKey, dailyOperatingBrief.mainJudgementValues);
  const confidenceValue = clampConfidence(dailyDecisionBrief?.confidence);

  return {
    status,
    source: dailyDecisionBrief ? (source ?? 'legacy_fallback') : 'operating_brief',
    judgement,
    executableCommand: todayCommand,
    actionLabel: operatingBriefCopy(todayCommand.titleKey, todayCommand.titleValues),
    actionReason: operatingBriefCopy(todayCommand.reasonKey, todayCommand.reasonValues),
    readiness: {
      band: dailyDecisionBrief?.readiness?.band ?? 'unknown',
      score: dailyDecisionBrief?.readiness?.score ?? null,
    },
    details: {
      evidence: evidenceItems(dailyOperatingBrief, dailyDecisionBrief),
      confidence: {
        value: confidenceValue,
        label: confidenceLabel(confidenceValue, dailyOperatingBrief.confidence),
        basis: dailyDecisionBrief?.evidence_basis,
      },
      patternReferences: (dailyDecisionBrief?.pattern_references || []).map((reference) => ({ ...reference })),
      dataGaps: (dailyDecisionBrief?.data_gaps || []).filter(Boolean),
      feedback: {
        enabled: !!decisionResultId,
        decisionResultId: decisionResultId || undefined,
        value: feedback,
      },
      scheduleProposals: scheduleProposals.map((proposal) => ({ ...proposal })),
    },
  };
}
