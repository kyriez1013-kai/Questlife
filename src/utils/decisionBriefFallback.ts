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
  const zh = input.locale === 'zh';
  const sleep = typeof input.today_context.latest_sleep_minutes === 'number' ? input.today_context.latest_sleep_minutes : undefined;
  const stateScore = latestStateScore(input);
  const drivers: string[] = [];
  const dataGaps: string[] = [];
  let score = 55;
  let band: DecisionBriefResult['readiness']['band'] = 'unknown';
  let headline = zh ? '先用保守启动，顺便补一条状态或睡眠信号。' : 'Use a conservative first step and collect one more signal.';
  let firstStep = zh ? '做一个 5-15 分钟低阻力任务。' : 'Do one 5-15 minute low-friction task.';
  let firstWhy = zh ? '当前个人信号还不够，先小步启动更稳。' : 'There is not enough personal signal yet, so the safest prescription is to start small.';
  const doNot: string[] = [zh ? '不要同时堆太多大任务。' : 'Do not stack too many large tasks at once.'];

  if (sleep == null) dataGaps.push('recent_sleep');
  if (stateScore == null) dataGaps.push('latest_state_checkin');

  if (typeof sleep === 'number') {
    drivers.push(`sleep_minutes:${sleep}`);
    if (sleep < 360) {
      score -= 20;
      band = 'red';
      headline = zh ? '今天先以恢复和保护专注为主。' : 'Recovery and focus protection should lead today.';
      firstStep = zh ? '先做一个 5-15 分钟低阻力任务。' : 'Start with a 5-15 minute low-friction task.';
      firstWhy = zh ? '最近睡眠偏短，直接开启长时间高认知任务风险更高。' : 'Recent sleep is short, so long high-cognitive blocks are a poor first move.';
      doNot.unshift(zh ? '不要把长时间深度任务放在第一步。' : 'Avoid a long deep-work block as the first task.');
    } else if (sleep < 420) {
      score -= 10;
      band = 'yellow';
      headline = zh ? '今天更适合降低任务粒度，而不是硬冲完整强度。' : 'Use reduced granularity rather than forcing a full push.';
      firstStep = zh ? '选一个清晰的 15-25 分钟任务。' : 'Choose one clear 15-25 minute task.';
      firstWhy = zh ? '睡眠略短，把任务边界缩小会更稳。' : 'Sleep is slightly short, so a smaller task boundary is safer.';
      doNot.unshift(zh ? '避免高负荷任务堆叠。' : 'Avoid heavy task stacking.');
    } else if (sleep <= 540) {
      score += 12;
      band = 'green';
      headline = zh ? '如果主观状态跟得上，今天可以正常推进。' : 'Normal progress is reasonable if subjective state agrees.';
      firstStep = zh ? '继续推进最清晰的计划任务。' : 'Continue the clearest planned task.';
      firstWhy = zh ? '睡眠时长在正常范围内，目前没有明显恢复警报。' : 'Sleep duration is in a normal range and there is no obvious recovery warning.';
    }
  }

  if (typeof stateScore === 'number') {
    drivers.push(`state_score:${stateScore.toFixed(1)}`);
    if (stateScore <= 2) {
      score -= 18;
      band = band === 'green' ? 'yellow' : 'red';
      headline = zh ? '当前主观状态偏低，先重新启动节奏，再考虑推进。' : 'Subjective state is low, so restart before pushing.';
      firstStep = zh ? '做一个最低可行启动任务。' : 'Do a minimum viable starter task.';
      firstWhy = zh ? '状态偏低时，先降低启动阻力，再判断真实容量。' : 'A low check-in is a practical reason to lower friction before judging capacity.';
      doNot.unshift(zh ? '不要把慢启动理解成失败。' : 'Do not interpret a slow start as failure.');
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
      interpretation: zh ? '回退模式只提示明显差异，不做强因果判断。' : 'Fallback mode only flags obvious mismatches; no strong perception-gap claim is made.',
      test_action: zh ? '完成第一步前后各记录一次状态。' : 'Log state before and after the first action.',
    },
    deep_analysis: zh ? '当前使用规则回退：只结合近期睡眠和最新状态，不做医学判断。' : 'Rule-based fallback used. It combines recent sleep and latest state without making medical claims.',
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
