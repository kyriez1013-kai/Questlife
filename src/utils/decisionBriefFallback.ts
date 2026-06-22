import { DecisionBriefInput, DecisionBriefResult } from './decisionTypes';

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function latestStateScore(input: DecisionBriefInput) {
  const state = input.current_state || {};
  const candidates = ['overall', 'energy', 'focus', 'mood']
    .map((key) => typeof state[key] === 'number' ? Number(state[key]) : undefined)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (candidates.length === 0) return undefined;
  return candidates.reduce((sum, value) => sum + value, 0) / candidates.length;
}

export function buildLegacyDecisionBrief(input: DecisionBriefInput): DecisionBriefResult {
  const now = new Date().toISOString();
  const sleep = typeof input.today_context.latest_sleep_minutes === 'number' ? input.today_context.latest_sleep_minutes : undefined;
  const stateScore = latestStateScore(input);
  const drivers: string[] = [];
  const dataGaps: string[] = [];
  let score = 55;
  let band: DecisionBriefResult['readiness']['band'] = 'unknown';
  let headline = 'Use a conservative first step and collect one more signal.';
  let firstStep = 'Do one 5-15 minute low-friction task.';
  let firstWhy = 'There is not enough personal signal yet, so the safest prescription is to start small.';
  const doNot: string[] = ['Do not stack too many large tasks at once.'];

  if (sleep == null) dataGaps.push('recent_sleep');
  if (stateScore == null) dataGaps.push('latest_state_checkin');

  if (typeof sleep === 'number') {
    drivers.push(`sleep_minutes:${sleep}`);
    if (sleep < 360) {
      score -= 20;
      band = 'red';
      headline = 'Recovery and focus protection should lead today.';
      firstStep = 'Start with a 5-15 minute low-friction task.';
      firstWhy = 'Recent sleep is short, so long high-cognitive blocks are a poor first move.';
      doNot.unshift('Avoid a long deep-work block as the first task.');
    } else if (sleep < 420) {
      score -= 10;
      band = 'yellow';
      headline = 'Use reduced granularity rather than forcing a full push.';
      firstStep = 'Choose one clear 15-25 minute task.';
      firstWhy = 'Sleep is slightly short, so a smaller task boundary is safer.';
      doNot.unshift('Avoid heavy task stacking.');
    } else if (sleep <= 540) {
      score += 12;
      band = 'green';
      headline = 'Normal progress is reasonable if subjective state agrees.';
      firstStep = 'Continue the clearest planned task.';
      firstWhy = 'Sleep duration is in a normal range and there is no obvious recovery warning.';
    }
  }

  if (typeof stateScore === 'number') {
    drivers.push(`state_score:${stateScore.toFixed(1)}`);
    if (stateScore <= 2) {
      score -= 18;
      band = band === 'green' ? 'yellow' : 'red';
      headline = 'Subjective state is low, so restart before pushing.';
      firstStep = 'Do a minimum viable starter task.';
      firstWhy = 'A low check-in is a practical reason to lower friction before judging capacity.';
      doNot.unshift('Do not interpret a slow start as failure.');
    } else if (stateScore >= 4 && band !== 'red') {
      score += 8;
      band = band === 'unknown' ? 'green' : band;
    }
  }

  if (band === 'unknown') band = score >= 66 ? 'green' : score >= 42 ? 'yellow' : 'red';

  return {
    schema_version: '1.0',
    generated_at: now,
    readiness: {
      score: clampScore(score),
      band,
      vs_baseline: 'unknown',
      drivers,
    },
    headline_insight: headline,
    perception_gap: {
      detected: false,
      subjective: typeof stateScore === 'number' ? `state_score:${stateScore.toFixed(1)}` : 'unknown',
      objective: typeof sleep === 'number' ? `sleep_minutes:${sleep}` : 'unknown',
      interpretation: 'Fallback mode only flags obvious mismatches; no strong perception-gap claim is made.',
      test_action: 'Log state before and after the first action.',
    },
    deep_analysis: 'Rule-based fallback used. It combines recent sleep and latest state without making medical claims.',
    prescription: {
      do_first: {
        step: firstStep,
        why: firstWhy,
        duration_min: band === 'red' ? 10 : 20,
      },
      schedule_adjustments: [],
      do_not: doNot.slice(0, 3),
    },
    patterns_surfaced: input.profile.confirmed_patterns.map((pattern) => String(pattern.type ?? pattern.title ?? 'pattern')).slice(0, 5),
    confidence: dataGaps.length >= 2 ? 0.25 : dataGaps.length === 1 ? 0.45 : 0.62,
    evidence_basis: input.profile.confirmed_patterns.length > 0 ? 'mixed' : 'population_prior',
    data_gaps: dataGaps,
    tone: dataGaps.length > 0 ? 'tentative' : 'assertive',
  };
}
