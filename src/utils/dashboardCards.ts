import {
  DashboardCardPreference,
  DashboardCardSize,
  DashboardPreferences,
  DashboardPresetId,
  DashboardSurface,
} from '../types';

export type DashboardDomainTag =
  | 'core'
  | 'learning'
  | 'fitness'
  | 'recovery'
  | 'advanced'
  | 'context'
  | 'state'
  | 'execution';

export type DashboardCardMeta = {
  id: string;
  surface: DashboardSurface | 'both';
  titleKey: string;
  descriptionKey: string;
  domainTags: DashboardDomainTag[];
  defaultSize: DashboardCardSize;
  allowedSizes: DashboardCardSize[];
  defaultVisible: boolean;
  priority: number;
};

export const DASHBOARD_CARDS: DashboardCardMeta[] = [
  { id: 'smart_capture', surface: 'today', titleKey: 'smartCapture', descriptionKey: 'smartCaptureDashboardDescription', domainTags: ['core', 'execution'], defaultSize: 'medium', allowedSizes: ['small', 'medium', 'large'], defaultVisible: true, priority: 10 },
  { id: 'daily_operating_brief', surface: 'today', titleKey: 'dailyOperatingBrief', descriptionKey: 'dailyBriefDashboardDescription', domainTags: ['core', 'context', 'state'], defaultSize: 'medium', allowedSizes: ['small', 'medium', 'large'], defaultVisible: true, priority: 20 },
  { id: 'body_context', surface: 'both', titleKey: 'bodyContext', descriptionKey: 'bodyContextDashboardDescription', domainTags: ['context', 'recovery', 'fitness'], defaultSize: 'medium', allowedSizes: ['small', 'medium', 'large'], defaultVisible: true, priority: 30 },
  { id: 'recent_feedback', surface: 'today', titleKey: 'recentFeedback', descriptionKey: 'recentFeedbackDashboardDescription', domainTags: ['execution', 'learning', 'fitness'], defaultSize: 'small', allowedSizes: ['small', 'medium'], defaultVisible: true, priority: 40 },
  { id: 'state_checkin', surface: 'today', titleKey: 'currentState', descriptionKey: 'stateCheckinDashboardDescription', domainTags: ['state', 'recovery'], defaultSize: 'medium', allowedSizes: ['small', 'medium', 'large'], defaultVisible: true, priority: 50 },
  { id: 'today_plan', surface: 'today', titleKey: 'todayPlan', descriptionKey: 'todayPlanDashboardDescription', domainTags: ['execution', 'core'], defaultSize: 'medium', allowedSizes: ['small', 'medium', 'large'], defaultVisible: true, priority: 60 },
  { id: 'today_records', surface: 'today', titleKey: 'todayLogs', descriptionKey: 'todayRecordsDashboardDescription', domainTags: ['execution'], defaultSize: 'medium', allowedSizes: ['small', 'medium', 'large'], defaultVisible: true, priority: 70 },
  { id: 'rescue_strip', surface: 'today', titleKey: 'cantStartCompactTitle', descriptionKey: 'rescueStripDashboardDescription', domainTags: ['recovery', 'state'], defaultSize: 'small', allowedSizes: ['small', 'medium'], defaultVisible: true, priority: 80 },
  { id: 'detailed_data', surface: 'today', titleKey: 'detailedData', descriptionKey: 'detailedDataDashboardDescription', domainTags: ['advanced', 'execution'], defaultSize: 'large', allowedSizes: ['medium', 'large'], defaultVisible: true, priority: 90 },

  { id: 'main_judgement', surface: 'insights', titleKey: 'todayCoreJudgement', descriptionKey: 'mainJudgementDashboardDescription', domainTags: ['core', 'state'], defaultSize: 'medium', allowedSizes: ['small', 'medium', 'large'], defaultVisible: true, priority: 10 },
  { id: 'key_evidence', surface: 'insights', titleKey: 'keyEvidence', descriptionKey: 'keyEvidenceDashboardDescription', domainTags: ['core', 'state', 'context'], defaultSize: 'medium', allowedSizes: ['small', 'medium', 'large'], defaultVisible: true, priority: 20 },
  { id: 'state_change', surface: 'insights', titleKey: 'stateTrend', descriptionKey: 'stateChangeDashboardDescription', domainTags: ['state'], defaultSize: 'medium', allowedSizes: ['small', 'medium'], defaultVisible: true, priority: 30 },
  { id: 'state_patterns', surface: 'insights', titleKey: 'statePatterns', descriptionKey: 'statePatternsDashboardDescription', domainTags: ['state', 'advanced'], defaultSize: 'medium', allowedSizes: ['small', 'medium', 'large'], defaultVisible: true, priority: 40 },
  { id: 'behavior_links', surface: 'insights', titleKey: 'behaviorLinks', descriptionKey: 'behaviorLinksDashboardDescription', domainTags: ['execution', 'advanced'], defaultSize: 'medium', allowedSizes: ['medium', 'large'], defaultVisible: true, priority: 50 },
  { id: 'advanced_signals', surface: 'insights', titleKey: 'advancedAnalysis', descriptionKey: 'advancedSignalsDashboardDescription', domainTags: ['advanced'], defaultSize: 'large', allowedSizes: ['medium', 'large'], defaultVisible: true, priority: 60 },
  { id: 'ability_map', surface: 'insights', titleKey: 'abilityMap', descriptionKey: 'abilityMapDashboardDescription', domainTags: ['advanced', 'execution'], defaultSize: 'medium', allowedSizes: ['medium', 'large'], defaultVisible: true, priority: 70 },
  { id: 'allocations', surface: 'insights', titleKey: 'dashboardSummary', descriptionKey: 'allocationsDashboardDescription', domainTags: ['execution', 'advanced'], defaultSize: 'medium', allowedSizes: ['small', 'medium', 'large'], defaultVisible: true, priority: 80 },
  { id: 'prediction_growth', surface: 'insights', titleKey: 'selfKnowledgeAccuracy', descriptionKey: 'predictionGrowthDashboardDescription', domainTags: ['advanced'], defaultSize: 'medium', allowedSizes: ['medium', 'large'], defaultVisible: true, priority: 90 },
];

type PresetConfig = {
  id: DashboardPresetId;
  titleKey: string;
  descriptionKey: string;
  todayOrder: string[];
  insightsOrder: string[];
  visibleTags?: DashboardDomainTag[];
  hiddenCardIds?: string[];
  largeCardIds?: string[];
};

export const DASHBOARD_PRESETS: PresetConfig[] = [
  {
    id: 'default',
    titleKey: 'defaultPreset',
    descriptionKey: 'defaultPresetDescription',
    todayOrder: ['smart_capture', 'daily_operating_brief', 'body_context', 'recent_feedback', 'state_checkin', 'today_plan', 'today_records', 'rescue_strip', 'detailed_data'],
    insightsOrder: ['main_judgement', 'key_evidence', 'state_change', 'state_patterns', 'body_context', 'behavior_links', 'advanced_signals', 'ability_map', 'allocations', 'prediction_growth'],
  },
  {
    id: 'learning',
    titleKey: 'learningPreset',
    descriptionKey: 'learningPresetDescription',
    todayOrder: ['smart_capture', 'daily_operating_brief', 'recent_feedback', 'state_checkin', 'today_plan', 'body_context', 'today_records', 'rescue_strip', 'detailed_data'],
    insightsOrder: ['main_judgement', 'key_evidence', 'behavior_links', 'state_patterns', 'advanced_signals', 'allocations', 'prediction_growth', 'body_context', 'state_change', 'ability_map'],
    visibleTags: ['core', 'learning', 'execution', 'state', 'advanced'],
  },
  {
    id: 'fitness',
    titleKey: 'fitnessPreset',
    descriptionKey: 'fitnessPresetDescription',
    todayOrder: ['body_context', 'daily_operating_brief', 'recent_feedback', 'state_checkin', 'today_plan', 'smart_capture', 'rescue_strip', 'today_records', 'detailed_data'],
    insightsOrder: ['main_judgement', 'body_context', 'state_patterns', 'behavior_links', 'key_evidence', 'state_change', 'allocations', 'ability_map', 'advanced_signals', 'prediction_growth'],
    visibleTags: ['core', 'fitness', 'recovery', 'execution', 'state', 'context'],
  },
  {
    id: 'recovery',
    titleKey: 'recoveryPreset',
    descriptionKey: 'recoveryPresetDescription',
    todayOrder: ['daily_operating_brief', 'body_context', 'state_checkin', 'rescue_strip', 'smart_capture', 'today_plan', 'recent_feedback', 'today_records', 'detailed_data'],
    insightsOrder: ['main_judgement', 'key_evidence', 'body_context', 'state_change', 'state_patterns', 'behavior_links', 'advanced_signals', 'allocations', 'ability_map', 'prediction_growth'],
    visibleTags: ['core', 'recovery', 'state', 'context'],
    hiddenCardIds: ['detailed_data', 'advanced_signals', 'ability_map', 'prediction_growth'],
  },
  {
    id: 'advanced',
    titleKey: 'advancedPreset',
    descriptionKey: 'advancedPresetDescription',
    todayOrder: ['smart_capture', 'daily_operating_brief', 'body_context', 'today_plan', 'today_records', 'recent_feedback', 'state_checkin', 'detailed_data', 'rescue_strip'],
    insightsOrder: ['main_judgement', 'key_evidence', 'advanced_signals', 'ability_map', 'allocations', 'prediction_growth', 'behavior_links', 'state_patterns', 'body_context', 'state_change'],
    visibleTags: ['core', 'advanced', 'execution', 'state', 'context', 'learning', 'fitness', 'recovery'],
    largeCardIds: ['advanced_signals', 'detailed_data'],
  },
];

function cardsForSurface(surface: DashboardSurface) {
  return DASHBOARD_CARDS.filter((card) => card.surface === surface || card.surface === 'both');
}

function preferenceForCard(card: DashboardCardMeta, order: number, preset?: PresetConfig): DashboardCardPreference {
  const visibleByTag = preset?.visibleTags
    ? card.domainTags.some((tag) => preset.visibleTags?.includes(tag))
    : card.defaultVisible;
  const visible = preset?.hiddenCardIds?.includes(card.id) ? false : visibleByTag;
  const size = preset?.largeCardIds?.includes(card.id) && card.allowedSizes.includes('large')
    ? 'large'
    : card.defaultSize;
  return { cardId: card.id, visible, order, size };
}

export function buildDashboardPreferencesForPreset(presetId: DashboardPresetId): DashboardPreferences {
  const preset = DASHBOARD_PRESETS.find((item) => item.id === presetId) ?? DASHBOARD_PRESETS[0];
  const build = (surface: DashboardSurface, orderList: string[]) => cardsForSurface(surface)
    .map((card) => {
      const explicitOrder = orderList.indexOf(card.id);
      return preferenceForCard(card, explicitOrder >= 0 ? explicitOrder + 1 : card.priority + 100, preset);
    })
    .sort((a, b) => a.order - b.order);
  return {
    activePreset: preset.id,
    todayCards: build('today', preset.todayOrder),
    insightsCards: build('insights', preset.insightsOrder),
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeDashboardPreferences(input?: DashboardPreferences): DashboardPreferences {
  const fallback = buildDashboardPreferencesForPreset(input?.activePreset ?? 'default');
  const mergeSurface = (surface: DashboardSurface, prefs: DashboardCardPreference[] | undefined) => {
    const existing = new Map((prefs || []).map((pref) => [pref.cardId, pref]));
    return cardsForSurface(surface)
      .map((card) => {
        const pref = existing.get(card.id);
        if (!pref) return fallback[surface === 'today' ? 'todayCards' : 'insightsCards'].find((item) => item.cardId === card.id)!;
        return {
          cardId: card.id,
          visible: pref.visible ?? card.defaultVisible,
          order: Number.isFinite(pref.order) ? pref.order : card.priority,
          size: card.allowedSizes.includes(pref.size) ? pref.size : card.defaultSize,
        };
      })
      .sort((a, b) => a.order - b.order);
  };
  return {
    activePreset: input?.activePreset ?? fallback.activePreset,
    todayCards: mergeSurface('today', input?.todayCards),
    insightsCards: mergeSurface('insights', input?.insightsCards),
    updatedAt: input?.updatedAt ?? fallback.updatedAt,
  };
}

export function getDashboardCardsForSurface(surface: DashboardSurface) {
  return cardsForSurface(surface).sort((a, b) => a.priority - b.priority);
}

export function getDashboardPreference(preferences: DashboardPreferences | undefined, surface: DashboardSurface, cardId: string) {
  const normalized = normalizeDashboardPreferences(preferences);
  const list = surface === 'today' ? normalized.todayCards : normalized.insightsCards;
  return list.find((pref) => pref.cardId === cardId);
}

export function getNextDashboardCardSize(card: DashboardCardMeta, currentSize: DashboardCardSize): DashboardCardSize {
  const sizes = card.allowedSizes.length > 0 ? card.allowedSizes : [card.defaultSize];
  const index = sizes.indexOf(currentSize);
  return sizes[(index >= 0 ? index + 1 : 0) % sizes.length];
}

export function reorderDashboardCard(
  preferences: DashboardPreferences | undefined,
  surface: DashboardSurface,
  movingCardId: string,
  targetCardId: string
): DashboardPreferences {
  const normalized = normalizeDashboardPreferences(preferences);
  const key = surface === 'today' ? 'todayCards' : 'insightsCards';
  if (movingCardId === targetCardId) return normalized;

  const list = [...normalized[key]].sort((a, b) => a.order - b.order);
  const moving = list.find((item) => item.cardId === movingCardId);
  const targetIndex = list.findIndex((item) => item.cardId === targetCardId);
  if (!moving || targetIndex < 0) return normalized;

  const withoutMoving = list.filter((item) => item.cardId !== movingCardId);
  const adjustedTargetIndex = withoutMoving.findIndex((item) => item.cardId === targetCardId);
  const insertIndex = adjustedTargetIndex >= 0 ? adjustedTargetIndex : targetIndex;
  withoutMoving.splice(insertIndex, 0, moving);

  return {
    ...normalized,
    [key]: withoutMoving.map((item, index) => ({ ...item, order: index + 1 })),
    updatedAt: new Date().toISOString(),
  };
}

export function addDashboardCardAtEnd(
  preferences: DashboardPreferences | undefined,
  surface: DashboardSurface,
  cardId: string
): DashboardPreferences {
  const normalized = normalizeDashboardPreferences(preferences);
  const key = surface === 'today' ? 'todayCards' : 'insightsCards';
  const maxOrder = Math.max(0, ...normalized[key].map((item) => item.order || 0));
  return {
    ...normalized,
    [key]: normalized[key].map((item) => (
      item.cardId === cardId ? { ...item, visible: true, order: maxOrder + 1 } : item
    )),
    updatedAt: new Date().toISOString(),
  };
}
