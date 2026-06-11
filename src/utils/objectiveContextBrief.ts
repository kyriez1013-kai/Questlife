import { ContextLog } from '../types';

export type ObjectiveContextBrief = {
  status: 'empty' | 'ok';
  recoveryStatus: 'unknown' | 'low' | 'moderate' | 'good';
  cognitiveLoadSuggestionKey: string;
  recommendedActionKey: string;
  avoidKeys: string[];
  confidence: 'low' | 'medium' | 'high';
  metrics: {
    sleepMinutes?: number;
    deepSleepMinutes?: number;
    remMinutes?: number;
    restingHeartRate?: number;
    hrv?: number;
    steps?: number;
    workoutMinutes?: number;
    caffeineCount?: number;
  };
};

function newestNumber(logs: ContextLog[], label: string) {
  const row = logs
    .filter((log) => log.label === label && typeof log.value === 'number')
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))[0];
  return typeof row?.value === 'number' ? row.value : undefined;
}

function recentContextLogs(contextLogs: ContextLog[], now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 2);
  return (contextLogs || []).filter((log) => {
    const time = new Date(log.createdAt ?? log.date ?? 0);
    return Number.isFinite(time.getTime()) && time >= cutoff;
  });
}

export function buildObjectiveContextBrief(contextLogs: ContextLog[] = [], now = new Date()): ObjectiveContextBrief {
  const recent = recentContextLogs(contextLogs, now);
  if (recent.length === 0) {
    return {
      status: 'empty',
      recoveryStatus: 'unknown',
      cognitiveLoadSuggestionKey: 'contextNoDataSuggestion',
      recommendedActionKey: 'contextNoDataAction',
      avoidKeys: [],
      confidence: 'low',
      metrics: {},
    };
  }

  const metrics = {
    sleepMinutes: newestNumber(recent, 'sleep_duration'),
    deepSleepMinutes: newestNumber(recent, 'deep_sleep'),
    remMinutes: newestNumber(recent, 'rem_sleep'),
    restingHeartRate: newestNumber(recent, 'resting_heart_rate'),
    hrv: newestNumber(recent, 'hrv'),
    steps: newestNumber(recent, 'steps'),
    workoutMinutes: newestNumber(recent, 'workout_minutes'),
    caffeineCount: newestNumber(recent, 'caffeine'),
  };

  const lowSignals = [
    metrics.sleepMinutes != null && metrics.sleepMinutes < 390,
    metrics.deepSleepMinutes != null && metrics.deepSleepMinutes < 45,
    metrics.hrv != null && metrics.hrv < 40,
    metrics.restingHeartRate != null && metrics.restingHeartRate >= 72,
    metrics.workoutMinutes != null && metrics.workoutMinutes >= 75,
  ].filter(Boolean).length;
  const goodSignals = [
    metrics.sleepMinutes != null && metrics.sleepMinutes >= 420,
    metrics.hrv != null && metrics.hrv >= 45,
    metrics.restingHeartRate != null && metrics.restingHeartRate <= 65,
    metrics.steps != null && metrics.steps >= 6000,
  ].filter(Boolean).length;

  const recoveryStatus: ObjectiveContextBrief['recoveryStatus'] = lowSignals >= 2
    ? 'low'
    : lowSignals === 1
      ? 'moderate'
      : goodSignals >= 2
        ? 'good'
        : 'moderate';
  const confidence: ObjectiveContextBrief['confidence'] = recent.length >= 5 ? 'high' : recent.length >= 3 ? 'medium' : 'low';

  if (recoveryStatus === 'low') {
    return {
      status: 'ok',
      recoveryStatus,
      cognitiveLoadSuggestionKey: 'contextLowRecoverySuggestion',
      recommendedActionKey: 'contextLowRecoveryAction',
      avoidKeys: ['avoidHighIntensity', 'avoidDeepWorkStack'],
      confidence,
      metrics,
    };
  }

  if (recoveryStatus === 'good') {
    return {
      status: 'ok',
      recoveryStatus,
      cognitiveLoadSuggestionKey: 'contextGoodRecoverySuggestion',
      recommendedActionKey: 'contextGoodRecoveryAction',
      avoidKeys: metrics.caffeineCount && metrics.caffeineCount >= 2 ? ['avoidLateCaffeine'] : [],
      confidence,
      metrics,
    };
  }

  return {
    status: 'ok',
    recoveryStatus,
    cognitiveLoadSuggestionKey: 'contextModerateRecoverySuggestion',
    recommendedActionKey: 'contextModerateRecoveryAction',
    avoidKeys: metrics.workoutMinutes && metrics.workoutMinutes >= 45 ? ['avoidHighIntensity'] : [],
    confidence,
    metrics,
  };
}
