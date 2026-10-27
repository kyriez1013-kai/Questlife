/**
 * First-use: three taps about today → one suggestion. Works with zero history and without AI/login/permissions.
 * The suggestion is a deterministic rule table, labelled "通用建议" (population prior) — never presented as a personal pattern.
 */
export type SleepAnswer = 'bad' | 'ok' | 'good';
export type EnergyAnswer = 'low' | 'mid' | 'high';
export type FocusAnswer = 'training' | 'study' | 'work' | 'chores' | 'recover' | 'other';

export type FirstUseAnswers = { sleep: SleepAnswer; energy: EnergyAnswer; focus: FocusAnswer };
export type FirstUsePartial = Partial<FirstUseAnswers>;

export type FirstSuggestion = {
  title: string;
  body: string;
  minutes: number;
  intensity: 'light' | 'normal' | 'focus';
  basis: 'prior';
};

export function remainingAnswers(a: FirstUsePartial): number {
  return (['sleep', 'energy', 'focus'] as const).filter((k) => a[k] == null).length;
}

const LIGHT: Record<FocusAnswer, string> = {
  training: '今天只做轻量活动：快走或拉伸 10 分钟，不加重量。',
  study: '读 10 分钟，只挑最容易的一页，读完就算完成。',
  work: '先处理最小的一件事，10 分钟后再决定要不要继续。',
  chores: '只做一件 10 分钟的家务，做完就停。',
  recover: '今天以恢复为主：早点收工，晚上记一句睡前状态。',
  other: '挑一件 10 分钟能做完的事，做完就算数。',
};
const NORMAL: Record<FocusAnswer, string> = {
  training: '按平时的量训练 20 分钟，做完回来记下重量和组数。',
  study: '专注学 20 分钟，结束时写一句学到了什么。',
  work: '做 20 分钟最重要的一件事，再回来记一句。',
  chores: '做完一件拖了几天的家务，限时 20 分钟。',
  recover: '今天适合轻松活动 15 分钟，然后好好休息。',
  other: '用 20 分钟推进它，做完回来记一句。',
};
const FOCUS: Record<FocusAnswer, string> = {
  training: '状态不错，可以正常训练：做完记下重量、组数和次数。',
  study: '状态不错，专注学 25 分钟，不看手机。',
  work: '状态不错，先做最重要的一件，专注 25 分钟。',
  chores: '状态不错，一口气把家务清完，限时 25 分钟。',
  recover: '状态不错，也别硬冲：安排一次 20 分钟的主动恢复。',
  other: '状态不错，专注推进 25 分钟。',
};

export function buildFirstSuggestion(a: FirstUseAnswers): FirstSuggestion {
  const drained = a.energy === 'low' || (a.sleep === 'bad' && a.energy !== 'high');
  if (drained) {
    return { title: '先做一件 10 分钟的小事', body: LIGHT[a.focus], minutes: 10, intensity: 'light', basis: 'prior' };
  }
  if (a.energy === 'high' && a.sleep !== 'bad') {
    return { title: '状态不错，做最重要的一件', body: FOCUS[a.focus], minutes: 25, intensity: 'focus', basis: 'prior' };
  }
  return { title: '按计划做 20 分钟', body: NORMAL[a.focus], minutes: 20, intensity: 'normal', basis: 'prior' };
}

/** Energy → StateCheckIn.overall (1–5). Low/mid/high map to 2/3/4: coarse by design; the person can refine on Today. */
export function energyToOverall(e: EnergyAnswer): 2 | 3 | 4 {
  return e === 'low' ? 2 : e === 'mid' ? 3 : 4;
}
/** Sleep self-rating is stored with its own unit and is never merged with measured minutes. */
export const SLEEP_SELF_RATING_UNIT = '睡眠自评1-3';
export function sleepToValue(s: SleepAnswer): 1 | 2 | 3 {
  return s === 'bad' ? 1 : s === 'ok' ? 2 : 3;
}

export const FIRST_USE_STORAGE_KEY = 'questlife.v2.firstUse.v1';
export type FirstUseRecord = { version: 1; completedAt: string; answers: FirstUseAnswers; suggestion: FirstSuggestion; date: string };
