/**
 * insightsEngine.ts — 分析引擎（纯函数，零 React / RN 依赖）
 *
 * 所有类型直接从 8085 的 types.ts 引入，不重新定义。
 * 时间维度一律用 new Date(x.createdAt).getHours() 取本地小时。
 * stateSnapshot.health 是 string，不当数字用。
 */

import { ExecutionLog, StateCheckIn, Skill } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────────────────────────────────────

export type InsightStatus = 'insufficient' | 'ok';
export type ConfidenceLevel = 'low' | 'medium' | 'high';

// ─────────────────────────────────────────────────────────────────────────────
// Local date helper (no UTC)
// ─────────────────────────────────────────────────────────────────────────────

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 0. Utility — Pearson correlation
// ─────────────────────────────────────────────────────────────────────────────

export function pearsonCorrelation(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 3) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom === 0 ? 0 : Math.max(-1, Math.min(1, num / denom));
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. State × Quality Correlation
// ─────────────────────────────────────────────────────────────────────────────

export interface StateQualityResult {
  status: InsightStatus;
  energyCorr: number;
  focusCorr: number;
  strongestFactor: 'energy' | 'focus' | 'none';
  conclusion: {
    metricKey: 'ieStateQuality';
    values: { energyCorr: number; focusCorr: number; strongestFactor: string };
    sampleSize: number;
    confidence: ConfidenceLevel;
  };
}

export function analyzeStateQualityCorrelation(logs: ExecutionLog[]): StateQualityResult {
  const rated = logs.filter(
    (l) => l.qualityRating != null && l.stateSnapshot?.energy != null,
  );
  if (rated.length < 5) {
    return {
      status: 'insufficient', energyCorr: 0, focusCorr: 0, strongestFactor: 'none',
      conclusion: { metricKey: 'ieStateQuality', values: { energyCorr: 0, focusCorr: 0, strongestFactor: 'none' }, sampleSize: rated.length, confidence: 'low' },
    };
  }

  const qualities = rated.map((l) => l.qualityRating!);
  const energies = rated.map((l) => l.stateSnapshot!.energy!);
  const focusRated = rated.filter((l) => l.stateSnapshot?.focus != null);
  const foci = focusRated.map((l) => l.stateSnapshot!.focus!);
  const qualForFocus = focusRated.map((l) => l.qualityRating!);

  const energyCorr = pearsonCorrelation(energies, qualities);
  const focusCorr = foci.length >= 3 ? pearsonCorrelation(foci, qualForFocus) : 0;
  const strongestFactor: 'energy' | 'focus' | 'none' =
    Math.abs(energyCorr) >= 0.15 || Math.abs(focusCorr) >= 0.15
      ? Math.abs(energyCorr) >= Math.abs(focusCorr) ? 'energy' : 'focus'
      : 'none';
  const confidence: ConfidenceLevel = rated.length >= 20 ? 'high' : rated.length >= 10 ? 'medium' : 'low';

  return {
    status: 'ok', energyCorr, focusCorr, strongestFactor,
    conclusion: { metricKey: 'ieStateQuality', values: { energyCorr, focusCorr, strongestFactor }, sampleSize: rated.length, confidence },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Best Time of Day
// ─────────────────────────────────────────────────────────────────────────────

export interface TimeSlotData { slot: string; avgQuality: number; count: number; }

export interface BestTimeResult {
  status: InsightStatus;
  slots: TimeSlotData[];
  bestSlot: string;
  conclusion: {
    metricKey: 'ieBestTime';
    values: { bestSlot: string; bestAvgQuality: number };
    sampleSize: number;
    confidence: ConfidenceLevel;
  };
}

export function analyzeBestTimeOfDay(logs: ExecutionLog[]): BestTimeResult {
  const rated = logs.filter((l) => l.qualityRating != null);
  const bySlot: Record<string, number[]> = { morning: [], afternoon: [], evening: [], night: [] };

  for (const l of rated) {
    // LOCAL hour — fix for timezone bug
    const h = new Date(l.createdAt).getHours();
    let slot = 'night';
    if (h >= 5 && h < 12) slot = 'morning';
    else if (h >= 12 && h < 17) slot = 'afternoon';
    else if (h >= 17 && h < 22) slot = 'evening';
    bySlot[slot].push(l.qualityRating!);
  }

  const slots: TimeSlotData[] = Object.entries(bySlot)
    .map(([slot, qs]) => ({ slot, avgQuality: qs.length > 0 ? qs.reduce((a, b) => a + b, 0) / qs.length : 0, count: qs.length }))
    .filter((s) => s.count > 0);

  if (slots.length === 0 || rated.length < 5) {
    return {
      status: 'insufficient', slots: [], bestSlot: 'morning',
      conclusion: { metricKey: 'ieBestTime', values: { bestSlot: 'morning', bestAvgQuality: 0 }, sampleSize: rated.length, confidence: 'low' },
    };
  }

  const best = slots.reduce((a, b) => a.avgQuality > b.avgQuality ? a : b);
  const confidence: ConfidenceLevel = rated.length >= 20 ? 'high' : rated.length >= 10 ? 'medium' : 'low';

  return {
    status: 'ok', slots, bestSlot: best.slot,
    conclusion: { metricKey: 'ieBestTime', values: { bestSlot: best.slot, bestAvgQuality: best.avgQuality }, sampleSize: rated.length, confidence },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Weekly Pattern (by day-of-week)
// ─────────────────────────────────────────────────────────────────────────────

export interface DayPatternData { dow: number; avgMinutes: number; avgQuality: number; count: number; }

export interface WeeklyPatternResult {
  status: InsightStatus;
  days: DayPatternData[];
  bestDow: number;
  worstDow: number;
  conclusion: {
    metricKey: 'ieWeeklyPattern';
    values: { bestDow: number; worstDow: number };
    sampleSize: number;
    confidence: ConfidenceLevel;
  };
}

export function analyzeWeeklyPattern(logs: ExecutionLog[]): WeeklyPatternResult {
  const byDow: Record<number, { minutes: number[]; qualities: number[] }> = {};
  for (let d = 0; d < 7; d++) byDow[d] = { minutes: [], qualities: [] };

  for (const l of logs) {
    // Parse date string as local date to get correct DOW
    const dow = new Date(l.date + 'T00:00:00').getDay();
    byDow[dow].minutes.push(l.durationMinutes);
    if (l.qualityRating != null) byDow[dow].qualities.push(l.qualityRating);
  }

  const days: DayPatternData[] = Array.from({ length: 7 }, (_, dow) => {
    const d = byDow[dow];
    return {
      dow,
      avgMinutes: d.minutes.length > 0 ? d.minutes.reduce((a, b) => a + b, 0) / d.minutes.length : 0,
      avgQuality: d.qualities.length > 0 ? d.qualities.reduce((a, b) => a + b, 0) / d.qualities.length : 0,
      count: d.minutes.length,
    };
  });

  const active = days.filter((d) => d.count >= 2);
  if (active.length < 3) {
    return { status: 'insufficient', days, bestDow: 1, worstDow: 0, conclusion: { metricKey: 'ieWeeklyPattern', values: { bestDow: 1, worstDow: 0 }, sampleSize: logs.length, confidence: 'low' } };
  }

  const bestDow = active.reduce((a, b) => a.avgMinutes > b.avgMinutes ? a : b).dow;
  const worstDow = active.reduce((a, b) => a.avgMinutes < b.avgMinutes ? a : b).dow;
  const confidence: ConfidenceLevel = logs.length >= 28 ? 'high' : logs.length >= 14 ? 'medium' : 'low';

  return { status: 'ok', days, bestDow, worstDow, conclusion: { metricKey: 'ieWeeklyPattern', values: { bestDow, worstDow }, sampleSize: logs.length, confidence } };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Consistency
// ─────────────────────────────────────────────────────────────────────────────

export interface ConsistencyResult {
  status: InsightStatus;
  score: number;        // 0–1
  activeDays30: number;
  avgGapDays: number;
  conclusion: {
    metricKey: 'ieConsistency';
    values: { score: number; activeDays30: number; avgGapDays: number };
    sampleSize: number;
    confidence: ConfidenceLevel;
  };
}

export function analyzeConsistency(logs: ExecutionLog[]): ConsistencyResult {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const cutoff = new Date(now); cutoff.setDate(now.getDate() - 30);
  const cutoffStr = fmtDate(cutoff);
  const recent = logs.filter((l) => l.date >= cutoffStr);
  const activeDays30 = new Set(recent.map((l) => l.date)).size;
  const score = Math.min(1, activeDays30 / 30);

  const allDates = [...new Set(logs.map((l) => l.date))].sort();
  let totalGap = 0, gapCount = 0;
  for (let i = 1; i < allDates.length; i++) {
    const gap = (new Date(allDates[i] + 'T00:00:00').getTime() - new Date(allDates[i - 1] + 'T00:00:00').getTime()) / 86_400_000;
    if (gap > 1) { totalGap += gap; gapCount++; }
  }
  const avgGapDays = gapCount > 0 ? Math.round(totalGap / gapCount * 10) / 10 : 0;
  const confidence: ConfidenceLevel = activeDays30 >= 15 ? 'high' : activeDays30 >= 7 ? 'medium' : 'low';

  return {
    status: activeDays30 >= 5 ? 'ok' : 'insufficient',
    score, activeDays30, avgGapDays,
    conclusion: { metricKey: 'ieConsistency', values: { score, activeDays30, avgGapDays }, sampleSize: activeDays30, confidence },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Prediction Accuracy
//    趋势标签只在 ≥4 条时给，避免心流级 + 需要注意同时出现的矛盾
// ─────────────────────────────────────────────────────────────────────────────

export type PredAccuracyTier = 'iePredNovice' | 'iePredCalibrating' | 'iePredPrecise' | 'iePredFlow';

export interface PredAccuracyResult {
  status: InsightStatus;
  avgDurationError: number;
  avgQualityError: number | null;
  tier: PredAccuracyTier;
  hasTrend: boolean;
  improving: boolean;
  conclusion: {
    metricKey: 'iePredAccuracy';
    values: { avgDurationError: number; tier: string; hasTrend: boolean; improving: boolean };
    sampleSize: number;
    confidence: ConfidenceLevel;
  };
}

export function analyzePredictionAccuracy(logs: ExecutionLog[]): PredAccuracyResult {
  const predicted = logs.filter(
    (l) => l.predictedDurationMinutes != null && l.durationMinutes != null,
  );
  if (predicted.length < 3) {
    return {
      status: 'insufficient', avgDurationError: 0, avgQualityError: null, tier: 'iePredNovice', hasTrend: false, improving: false,
      conclusion: { metricKey: 'iePredAccuracy', values: { avgDurationError: 0, tier: 'iePredNovice', hasTrend: false, improving: false }, sampleSize: predicted.length, confidence: 'low' },
    };
  }

  const avgDurationError = predicted.reduce((s, l) => s + Math.abs(l.durationMinutes - l.predictedDurationMinutes!), 0) / predicted.length;
  const qualLogs = logs.filter((l) => l.predictedQualityRating != null && l.qualityRating != null);
  const avgQualityError = qualLogs.length > 0
    ? qualLogs.reduce((s, l) => s + Math.abs(l.qualityRating! - l.predictedQualityRating!), 0) / qualLogs.length
    : null;

  const tier: PredAccuracyTier = avgDurationError > 30 ? 'iePredNovice'
    : avgDurationError > 15 ? 'iePredCalibrating'
    : avgDurationError > 8  ? 'iePredPrecise'
    : 'iePredFlow';

  const hasTrend = predicted.length >= 4;
  let improving = false;
  if (hasTrend) {
    const mid = Math.floor(predicted.length / 2);
    const firstErr = predicted.slice(0, mid).reduce((s, l) => s + Math.abs(l.durationMinutes - l.predictedDurationMinutes!), 0) / mid;
    const lastErr  = predicted.slice(mid).reduce((s, l) => s + Math.abs(l.durationMinutes - l.predictedDurationMinutes!), 0) / (predicted.length - mid);
    improving = lastErr < firstErr;
  }

  const confidence: ConfidenceLevel = predicted.length >= 15 ? 'high' : predicted.length >= 7 ? 'medium' : 'low';
  return {
    status: 'ok', avgDurationError, avgQualityError, tier, hasTrend, improving,
    conclusion: { metricKey: 'iePredAccuracy', values: { avgDurationError, tier, hasTrend, improving }, sampleSize: predicted.length, confidence },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Cognitive Fatigue (duration buckets × quality)
// ─────────────────────────────────────────────────────────────────────────────

export interface FatigueBucket { label: string; avgQuality: number; count: number; }

export interface CognitiveFatigueResult {
  status: InsightStatus;
  fatigueThresholdMinutes: number;
  buckets: FatigueBucket[];
  conclusion: {
    metricKey: 'ieCognitiveFatigue';
    values: { fatigueThresholdMinutes: number };
    sampleSize: number;
    confidence: ConfidenceLevel;
  };
}

export function detectCognitiveFatigue(logs: ExecutionLog[], _checkIns: StateCheckIn[]): CognitiveFatigueResult {
  const rated = logs.filter((l) => l.qualityRating != null && l.durationMinutes > 0);
  const ranges = [
    { label: '0–30', min: 0, max: 30 },
    { label: '31–60', min: 31, max: 60 },
    { label: '61–90', min: 61, max: 90 },
    { label: '91+', min: 91, max: Infinity },
  ];
  const buckets: FatigueBucket[] = ranges.map((r) => {
    const b = rated.filter((l) => l.durationMinutes >= r.min && l.durationMinutes <= r.max);
    return { label: r.label, avgQuality: b.length > 0 ? b.reduce((s, l) => s + l.qualityRating!, 0) / b.length : 0, count: b.length };
  });

  if (rated.length < 8) {
    return { status: 'insufficient', fatigueThresholdMinutes: 60, buckets, conclusion: { metricKey: 'ieCognitiveFatigue', values: { fatigueThresholdMinutes: 60 }, sampleSize: rated.length, confidence: 'low' } };
  }

  let fatigueThresholdMinutes = 90;
  const active = buckets.filter((b) => b.count >= 2);
  if (active.length >= 2) {
    let prevQ = active[0].avgQuality;
    for (const b of active.slice(1)) {
      if (b.avgQuality < prevQ - 0.3) {
        fatigueThresholdMinutes = b.label === '31–60' ? 30 : b.label === '61–90' ? 60 : 90;
        break;
      }
      prevQ = b.avgQuality;
    }
  }

  const confidence: ConfidenceLevel = rated.length >= 20 ? 'high' : rated.length >= 10 ? 'medium' : 'low';
  return { status: 'ok', fatigueThresholdMinutes, buckets, conclusion: { metricKey: 'ieCognitiveFatigue', values: { fatigueThresholdMinutes }, sampleSize: rated.length, confidence } };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Recovery Pattern (from StateCheckIn — not StateAssessment)
// ─────────────────────────────────────────────────────────────────────────────

export interface RecoveryPatternResult {
  status: InsightStatus;
  avgRecoveryDays: number;
  warningStreakDays: number;
  conclusion: {
    metricKey: 'ieRecovery';
    values: { avgRecoveryDays: number; warningStreakDays: number };
    sampleSize: number;
    confidence: ConfidenceLevel;
  };
}

export function analyzeRecoveryPattern(checkIns: StateCheckIn[]): RecoveryPatternResult {
  if (checkIns.length < 7) {
    return { status: 'insufficient', avgRecoveryDays: 2, warningStreakDays: 3, conclusion: { metricKey: 'ieRecovery', values: { avgRecoveryDays: 2, warningStreakDays: 3 }, sampleSize: checkIns.length, confidence: 'low' } };
  }

  // Group by date, take max energy/overall per day
  const byDate = new Map<string, number>();
  for (const c of checkIns) {
    const val = c.energy ?? c.overall;
    byDate.set(c.date, Math.max(byDate.get(c.date) ?? 0, val));
  }
  const dates = [...byDate.keys()].sort();

  let highStreakCount = 0, totalRecovery = 0;
  let streak = 0;
  for (const d of dates) {
    if ((byDate.get(d) ?? 0) >= 4) {
      streak++;
    } else {
      if (streak >= 2) {
        highStreakCount++;
        totalRecovery += 1;
      }
      streak = 0;
    }
  }

  const avgRecoveryDays = highStreakCount > 0 ? Math.max(1, Math.round(totalRecovery / highStreakCount) + 1) : 2;
  const warningStreakDays = 3;
  const confidence: ConfidenceLevel = checkIns.length >= 30 ? 'high' : checkIns.length >= 14 ? 'medium' : 'low';

  return { status: 'ok', avgRecoveryDays, warningStreakDays, conclusion: { metricKey: 'ieRecovery', values: { avgRecoveryDays, warningStreakDays }, sampleSize: checkIns.length, confidence } };
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Hourly Time Patterns (LOCAL hour — no UTC)
// ─────────────────────────────────────────────────────────────────────────────

export interface HourlyBucket { hour: number; avgQuality: number; count: number; }

export interface TimePatternsResult {
  status: InsightStatus;
  hourlyBuckets: HourlyBucket[];
  peakHour: number;
  conclusion: {
    metricKey: 'ieTimePatterns';
    values: { peakHour: number };
    sampleSize: number;
    confidence: ConfidenceLevel;
  };
}

export function analyzeTimePatterns(logs: ExecutionLog[]): TimePatternsResult {
  const byHour: number[][] = Array.from({ length: 24 }, () => []);

  for (const l of logs) {
    if (l.qualityRating == null) continue;
    const h = new Date(l.createdAt).getHours(); // LOCAL hour
    if (h >= 0 && h < 24) byHour[h].push(l.qualityRating);
  }

  const hourlyBuckets: HourlyBucket[] = byHour.map((qs, hour) => ({
    hour,
    avgQuality: qs.length > 0 ? qs.reduce((a, b) => a + b, 0) / qs.length : 0,
    count: qs.length,
  }));

  const active = hourlyBuckets.filter((h) => h.count >= 2);
  if (active.length === 0) {
    return { status: 'insufficient', hourlyBuckets, peakHour: 9, conclusion: { metricKey: 'ieTimePatterns', values: { peakHour: 9 }, sampleSize: logs.length, confidence: 'low' } };
  }

  const peak = active.reduce((a, b) => a.avgQuality > b.avgQuality ? a : b);
  const confidence: ConfidenceLevel = logs.length >= 20 ? 'high' : logs.length >= 10 ? 'medium' : 'low';

  return { status: 'ok', hourlyBuckets, peakHour: peak.hour, conclusion: { metricKey: 'ieTimePatterns', values: { peakHour: peak.hour }, sampleSize: logs.length, confidence } };
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Combination Effect (energy × focus × quality)
// ─────────────────────────────────────────────────────────────────────────────

export interface ComboBucket { label: string; avgQuality: number; count: number; highEnergy: boolean; highFocus: boolean; }

export interface CombinationResult {
  status: InsightStatus;
  buckets: ComboBucket[];
  bestCombo: ComboBucket | null;
  worstCombo: ComboBucket | null;
  conclusion: {
    metricKey: 'ieCombination';
    values: { bestComboLabel: string | null; worstComboLabel: string | null };
    sampleSize: number;
    confidence: ConfidenceLevel;
  };
}

export function analyzeCombinationEffect(logs: ExecutionLog[]): CombinationResult {
  const rated = logs.filter((l) => l.qualityRating != null && l.stateSnapshot?.energy != null);

  type ComboEntry = { qualities: number[]; highEnergy: boolean; highFocus: boolean };
  const combos: Record<string, ComboEntry> = {
    'HE+HF': { qualities: [], highEnergy: true,  highFocus: true  },
    'HE+LF': { qualities: [], highEnergy: true,  highFocus: false },
    'LE+HF': { qualities: [], highEnergy: false, highFocus: true  },
    'LE+LF': { qualities: [], highEnergy: false, highFocus: false },
  };

  for (const l of rated) {
    const he = (l.stateSnapshot!.energy ?? 3) >= 3;
    const hf = (l.stateSnapshot?.focus ?? 3) >= 3;
    combos[`${he ? 'HE' : 'LE'}+${hf ? 'HF' : 'LF'}`].qualities.push(l.qualityRating!);
  }

  const buckets: ComboBucket[] = Object.entries(combos)
    .map(([label, v]) => ({
      label,
      avgQuality: v.qualities.length > 0 ? v.qualities.reduce((a, b) => a + b, 0) / v.qualities.length : 0,
      count: v.qualities.length,
      highEnergy: v.highEnergy,
      highFocus: v.highFocus,
    }))
    .filter((b) => b.count >= 2);

  if (buckets.length < 2 || rated.length < 8) {
    return { status: 'insufficient', buckets: [], bestCombo: null, worstCombo: null, conclusion: { metricKey: 'ieCombination', values: { bestComboLabel: null, worstComboLabel: null }, sampleSize: rated.length, confidence: 'low' } };
  }

  const bestCombo  = buckets.reduce((a, b) => a.avgQuality > b.avgQuality ? a : b);
  const worstCombo = buckets.reduce((a, b) => a.avgQuality < b.avgQuality ? a : b);
  const confidence: ConfidenceLevel = rated.length >= 20 ? 'high' : rated.length >= 10 ? 'medium' : 'low';

  return {
    status: 'ok', buckets, bestCombo, worstCombo,
    conclusion: { metricKey: 'ieCombination', values: { bestComboLabel: bestCombo.label, worstComboLabel: worstCombo.label }, sampleSize: rated.length, confidence },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. Monthly Longitudinal Trend
// ─────────────────────────────────────────────────────────────────────────────

export interface MonthData { month: string; totalHours: number; avgQuality: number; consistencyRate: number; }

export interface MonthlyTrendResult {
  status: InsightStatus;
  months: MonthData[];  // most-recent first, up to 3
  improvements: string[];   // i18n key suffixes
  regressions: string[];
  conclusion: {
    metricKey: 'ieMonthlyTrend';
    values: { months: MonthData[]; improvements: string[]; regressions: string[] };
    sampleSize: number;
    confidence: ConfidenceLevel;
  };
}

export function analyzeMonthlyTrend(logs: ExecutionLog[]): MonthlyTrendResult {
  const byMonth = new Map<string, ExecutionLog[]>();
  for (const l of logs) {
    const m = l.date.slice(0, 7);
    if (!byMonth.has(m)) byMonth.set(m, []);
    byMonth.get(m)!.push(l);
  }

  const sortedMonths = [...byMonth.keys()].sort().reverse().slice(0, 3);
  if (sortedMonths.length < 2) {
    return { status: 'insufficient', months: [], improvements: [], regressions: [], conclusion: { metricKey: 'ieMonthlyTrend', values: { months: [], improvements: [], regressions: [] }, sampleSize: logs.length, confidence: 'low' } };
  }

  const months: MonthData[] = sortedMonths.map((m) => {
    const ml = byMonth.get(m)!;
    const [yr, mo] = m.split('-').map(Number);
    const daysInMonth = new Date(yr, mo, 0).getDate();
    const activeDays = new Set(ml.map((l) => l.date)).size;
    const rated = ml.filter((l) => l.qualityRating != null);
    return {
      month: m,
      totalHours: Math.round(ml.reduce((s, l) => s + l.durationMinutes, 0) / 6) / 10,
      avgQuality: rated.length > 0 ? Math.round(rated.reduce((s, l) => s + l.qualityRating!, 0) / rated.length * 10) / 10 : 0,
      consistencyRate: Math.round(activeDays / daysInMonth * 100) / 100,
    };
  });

  const cur = months[0], prev = months[1];
  const improvements: string[] = [];
  const regressions: string[] = [];
  if (cur.totalHours > prev.totalHours + 0.5)      improvements.push('ieMonthHours');
  else if (cur.totalHours < prev.totalHours - 0.5)  regressions.push('ieMonthHours');
  if (cur.avgQuality > 0 && prev.avgQuality > 0) {
    if (cur.avgQuality > prev.avgQuality + 0.2)     improvements.push('ieMonthQuality');
    else if (cur.avgQuality < prev.avgQuality - 0.2) regressions.push('ieMonthQuality');
  }
  if (cur.consistencyRate > prev.consistencyRate + 0.05)     improvements.push('ieMonthConsistency');
  else if (cur.consistencyRate < prev.consistencyRate - 0.05) regressions.push('ieMonthConsistency');

  const confidence: ConfidenceLevel = logs.length >= 30 ? 'high' : logs.length >= 15 ? 'medium' : 'low';
  return { status: 'ok', months, improvements, regressions, conclusion: { metricKey: 'ieMonthlyTrend', values: { months, improvements, regressions }, sampleSize: logs.length, confidence } };
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. Anomaly Detection
// ─────────────────────────────────────────────────────────────────────────────

export type AnomalyType = 'qualityDrop' | 'longGap' | 'overload';

export interface Anomaly {
  type: AnomalyType;
  severity: 'medium' | 'high';
  descKey: string;
  descValues: Record<string, string>;
}

export interface AnomalyResult {
  status: InsightStatus;
  anomalies: Anomaly[];
}

export function detectAnomalies(logs: ExecutionLog[]): AnomalyResult {
  if (logs.length < 5) return { status: 'insufficient', anomalies: [] };

  const anomalies: Anomaly[] = [];

  // Quality drop: recent 3 vs overall
  const rated = logs.filter((l) => l.qualityRating != null);
  if (rated.length >= 5) {
    const overallAvg = rated.reduce((s, l) => s + l.qualityRating!, 0) / rated.length;
    const recent3 = rated.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
    if (recent3.length >= 2) {
      const recentAvg = recent3.reduce((s, l) => s + l.qualityRating!, 0) / recent3.length;
      const pct = ((overallAvg - recentAvg) / overallAvg) * 100;
      if (pct >= 20) {
        anomalies.push({ type: 'qualityDrop', severity: pct >= 35 ? 'high' : 'medium', descKey: 'ieAnomalyQualityDrop', descValues: { pct: pct.toFixed(0) } });
      }
    }
  }

  // Long gap since last log
  const allDates = [...new Set(logs.map((l) => l.date))].sort();
  if (allDates.length >= 3) {
    const avgGap = allDates.slice(1).reduce((sum, d, i) => {
      return sum + (new Date(d + 'T00:00:00').getTime() - new Date(allDates[i] + 'T00:00:00').getTime()) / 86_400_000;
    }, 0) / (allDates.length - 1);
    const lastDate = new Date(allDates[allDates.length - 1] + 'T00:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const daysSinceLast = (today.getTime() - lastDate.getTime()) / 86_400_000;
    if (daysSinceLast > avgGap * 2 && daysSinceLast >= 3) {
      anomalies.push({ type: 'longGap', severity: daysSinceLast >= 7 ? 'high' : 'medium', descKey: 'ieAnomalyGap', descValues: { days: Math.round(daysSinceLast).toString() } });
    }
  }

  // Overload: consecutive days ≥90 min
  const dailyMins = new Map<string, number>();
  for (const l of logs) dailyMins.set(l.date, (dailyMins.get(l.date) ?? 0) + l.durationMinutes);
  const sortedDays = [...dailyMins.keys()].sort().reverse();
  let streak = 0;
  for (const d of sortedDays) {
    if ((dailyMins.get(d) ?? 0) >= 90) streak++;
    else break;
  }
  if (streak >= 3) {
    anomalies.push({ type: 'overload', severity: streak >= 5 ? 'high' : 'medium', descKey: 'ieAnomalyOverload', descValues: { days: streak.toString() } });
  }

  return { status: 'ok', anomalies };
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. Tomorrow State Prediction (from StateCheckIn)
// ─────────────────────────────────────────────────────────────────────────────

export interface TomorrowPrediction {
  status: InsightStatus;
  energy: number;    // 1–5
  focus: number;     // 1–5
  confidence: number; // 0–1
  conclusion: {
    metricKey: 'ieTomorrowPredict';
    values: { energy: number; focus: number; confidence: number };
    sampleSize: number;
  };
}

export function predictTomorrowState(checkIns: StateCheckIn[]): TomorrowPrediction {
  if (checkIns.length < 5) {
    return { status: 'insufficient', energy: 3, focus: 3, confidence: 0.3, conclusion: { metricKey: 'ieTomorrowPredict', values: { energy: 3, focus: 3, confidence: 0.3 }, sampleSize: checkIns.length } };
  }

  // Take last 7 check-ins sorted by timestamp descending
  const recent = checkIns.slice().sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 7);
  const avgEnergy = recent.reduce((s, c) => s + (c.energy ?? c.overall), 0) / recent.length;
  const avgFocus  = recent.reduce((s, c) => s + (c.focus  ?? c.overall), 0) / recent.length;

  const predEnergy = Math.round(Math.max(1, Math.min(5, avgEnergy)));
  const predFocus  = Math.round(Math.max(1, Math.min(5, avgFocus)));
  const confidence = Math.min(0.85, 0.4 + checkIns.length * 0.02);

  return { status: 'ok', energy: predEnergy, focus: predFocus, confidence, conclusion: { metricKey: 'ieTomorrowPredict', values: { energy: predEnergy, focus: predFocus, confidence }, sampleSize: checkIns.length } };
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. Ability Radar (5 dimensions, 0–1 each)
// ─────────────────────────────────────────────────────────────────────────────

export interface RadarDimension { key: string; score: number; isBaseline: boolean; }

export interface AbilityRadarResult {
  status: InsightStatus;
  dimensions: RadarDimension[];
  conclusion: {
    metricKey: 'ieAbilityRadar';
    values: { dimensions: RadarDimension[] };
    sampleSize: number;
    confidence: ConfidenceLevel;
  };
}

export function computeAbilityRadar(logs: ExecutionLog[], _skills: Skill[]): AbilityRadarResult {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const cutoff = new Date(now); cutoff.setDate(now.getDate() - 30);
  const cutoffStr = fmtDate(cutoff);
  const recent30 = logs.filter((l) => l.date >= cutoffStr);

  const BASELINE: RadarDimension[] = [
    { key: 'ieRadarExecution',   score: 0.5, isBaseline: true },
    { key: 'ieRadarConsistency', score: 0.5, isBaseline: true },
    { key: 'ieRadarQuality',     score: 0.5, isBaseline: true },
    { key: 'ieRadarSelfAware',   score: 0.5, isBaseline: true },
    { key: 'ieRadarResilience',  score: 0.5, isBaseline: true },
  ];

  if (recent30.length < 5) {
    return { status: 'insufficient', dimensions: BASELINE, conclusion: { metricKey: 'ieAbilityRadar', values: { dimensions: BASELINE }, sampleSize: recent30.length, confidence: 'low' } };
  }

  const activeDays30  = new Set(recent30.map((l) => l.date)).size;
  const totalMins30   = recent30.reduce((s, l) => s + l.durationMinutes, 0);

  // Execution: avg daily mins vs 45-min baseline
  const executionScore = Math.min(1, totalMins30 / (30 * 45));

  // Consistency
  const consistencyScore = Math.min(1, activeDays30 / 30);

  // Quality (rated logs avg / 5)
  const rated = recent30.filter((l) => l.qualityRating != null);
  const qualityScore    = rated.length >= 3 ? rated.reduce((s, l) => s + l.qualityRating!, 0) / rated.length / 5 : 0.5;
  const qualIsBaseline  = rated.length < 3;

  // Self-awareness (inverse of normalised prediction error)
  const pred = logs.filter((l) => l.predictedDurationMinutes != null && l.durationMinutes != null);
  let selfAwareScore = 0.5, selfAwareIsBaseline = true;
  if (pred.length >= 3) {
    const avgErr = pred.reduce((s, l) => s + Math.abs(l.durationMinutes - l.predictedDurationMinutes!), 0) / pred.length;
    selfAwareScore = Math.max(0, Math.min(1, 1 - avgErr / 60));
    selfAwareIsBaseline = false;
  }

  // Resilience: fraction of gaps ≥2d that recovered within 3d
  const allDates = [...new Set(recent30.map((l) => l.date))].sort();
  let gaps = 0, quickRecovery = 0;
  for (let i = 1; i < allDates.length; i++) {
    const gap = (new Date(allDates[i] + 'T00:00:00').getTime() - new Date(allDates[i - 1] + 'T00:00:00').getTime()) / 86_400_000;
    if (gap >= 2) { gaps++; if (gap <= 3) quickRecovery++; }
  }
  const resilienceScore = gaps > 0 ? quickRecovery / gaps : 0.7;
  const resIsBaseline   = gaps === 0;

  const round = (v: number) => Math.round(v * 100) / 100;
  const dimensions: RadarDimension[] = [
    { key: 'ieRadarExecution',   score: round(executionScore),   isBaseline: false },
    { key: 'ieRadarConsistency', score: round(consistencyScore), isBaseline: false },
    { key: 'ieRadarQuality',     score: round(qualityScore),     isBaseline: qualIsBaseline },
    { key: 'ieRadarSelfAware',   score: round(selfAwareScore),   isBaseline: selfAwareIsBaseline },
    { key: 'ieRadarResilience',  score: round(resilienceScore),  isBaseline: resIsBaseline },
  ];

  const confidence: ConfidenceLevel = activeDays30 >= 15 ? 'high' : activeDays30 >= 7 ? 'medium' : 'low';
  return { status: 'ok', dimensions, conclusion: { metricKey: 'ieAbilityRadar', values: { dimensions }, sampleSize: recent30.length, confidence } };
}

// ─────────────────────────────────────────────────────────────────────────────
// 14. Growth Curve (8-week weekly totals)
// ─────────────────────────────────────────────────────────────────────────────

export interface WeekPoint { weekLabel: string; totalMins: number; avgQuality: number | null; }

export interface GrowthCurveResult {
  status: InsightStatus;
  weeks: WeekPoint[];        // oldest first, 8 entries
  monthRatePct: number | null;
  accelerating: boolean;
  conclusion: {
    metricKey: 'ieGrowthCurve';
    values: { monthRatePct: number | null; accelerating: boolean };
    sampleSize: number;
    confidence: ConfidenceLevel;
  };
}

export function computeGrowthCurve(logs: ExecutionLog[]): GrowthCurveResult {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  // Start of current ISO week (Monday)
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));

  const weeks: WeekPoint[] = [];
  for (let w = 7; w >= 0; w--) {
    const wStart = new Date(monday); wStart.setDate(monday.getDate() - w * 7);
    const wEnd   = new Date(wStart); wEnd.setDate(wStart.getDate() + 6);
    const wStartStr = fmtDate(wStart), wEndStr = fmtDate(wEnd);
    const wLogs = logs.filter((l) => l.date >= wStartStr && l.date <= wEndStr);
    const totalMins = wLogs.reduce((s, l) => s + l.durationMinutes, 0);
    const ratedW = wLogs.filter((l) => l.qualityRating != null);
    weeks.push({
      weekLabel: `${wStart.getMonth() + 1}/${wStart.getDate()}`,
      totalMins,
      avgQuality: ratedW.length > 0 ? ratedW.reduce((s, l) => s + l.qualityRating!, 0) / ratedW.length : null,
    });
  }

  const weeksWithData = weeks.filter((w) => w.totalMins > 0);
  if (weeksWithData.length < 3) {
    return { status: 'insufficient', weeks, monthRatePct: null, accelerating: false, conclusion: { metricKey: 'ieGrowthCurve', values: { monthRatePct: null, accelerating: false }, sampleSize: weeksWithData.length, confidence: 'low' } };
  }

  // Month rate: recent 4 vs previous 4 (8-week window)
  const recentHalf = weeks.slice(4).reduce((s, w) => s + w.totalMins, 0) / 4;
  const prevHalf   = weeks.slice(0, 4).reduce((s, w) => s + w.totalMins, 0) / 4;
  const monthRatePct = prevHalf > 0 ? Math.round((recentHalf - prevHalf) / prevHalf * 100) : null;

  // Acceleration: last 2 vs 2 before them
  const recent2 = weeks.slice(-2).reduce((s, w) => s + w.totalMins, 0) / 2;
  const prev2   = weeks.slice(-4, -2).reduce((s, w) => s + w.totalMins, 0) / 2;
  const accelerating = recent2 > prev2 * 1.1;

  const confidence: ConfidenceLevel = weeksWithData.length >= 6 ? 'high' : weeksWithData.length >= 4 ? 'medium' : 'low';
  return { status: 'ok', weeks, monthRatePct, accelerating, conclusion: { metricKey: 'ieGrowthCurve', values: { monthRatePct, accelerating }, sampleSize: weeksWithData.length, confidence } };
}

// ─────────────────────────────────────────────────────────────────────────────
// 15. Insights Summary (aggregates all results — LLM-ready structure)
// ─────────────────────────────────────────────────────────────────────────────

export interface InsightsSummaryResult {
  stateQuality: StateQualityResult;
  bestTime: BestTimeResult;
  weeklyPattern: WeeklyPatternResult;
  consistency: ConsistencyResult;
  predAccuracy: PredAccuracyResult;
  cognitiveFatigue: CognitiveFatigueResult;
  recovery: RecoveryPatternResult;
  timePatterns: TimePatternsResult;
  combination: CombinationResult;
  monthlyTrend: MonthlyTrendResult;
  anomalies: AnomalyResult;
  tomorrowPrediction: TomorrowPrediction;
  abilityRadar: AbilityRadarResult;
  growthCurve: GrowthCurveResult;
}

export function generateInsightsSummary(
  logs: ExecutionLog[],
  checkIns: StateCheckIn[],
  skills: Skill[],
): InsightsSummaryResult {
  return {
    stateQuality:      analyzeStateQualityCorrelation(logs),
    bestTime:          analyzeBestTimeOfDay(logs),
    weeklyPattern:     analyzeWeeklyPattern(logs),
    consistency:       analyzeConsistency(logs),
    predAccuracy:      analyzePredictionAccuracy(logs),
    cognitiveFatigue:  detectCognitiveFatigue(logs, checkIns),
    recovery:          analyzeRecoveryPattern(checkIns),
    timePatterns:      analyzeTimePatterns(logs),
    combination:       analyzeCombinationEffect(logs),
    monthlyTrend:      analyzeMonthlyTrend(logs),
    anomalies:         detectAnomalies(logs),
    tomorrowPrediction: predictTomorrowState(checkIns),
    abilityRadar:      computeAbilityRadar(logs, skills),
    growthCurve:       computeGrowthCurve(logs),
  };
}
