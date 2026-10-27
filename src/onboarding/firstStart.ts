/**
 * "怎么开始": three taps about today → one suggestion. Works with zero history, no AI, no login, no permissions.
 * Deterministic rule table; always labelled general advice (population prior), never a personal pattern.
 */
export type SleepAnswer = 'bad' | 'ok' | 'good';
export type StateAnswer = 'low' | 'mid' | 'high';
export type FocusAnswer = 'training' | 'study' | 'work' | 'chores' | 'recover' | 'other';
export type FirstStartAnswers = { sleep: SleepAnswer; state: StateAnswer; focus: FocusAnswer };
export type FirstStartPartial = Partial<FirstStartAnswers>;
type Lang = 'zh' | 'en';
export type FirstSuggestion = { title: string; body: string; minutes: number; intensity: 'light' | 'normal' | 'focus'; basis: 'prior' };

export function remainingAnswers(a: FirstStartPartial): number {
  return (['sleep', 'state', 'focus'] as const).filter((k) => a[k] == null).length;
}

const LIGHT: Record<Lang, Record<FocusAnswer, string>> = {
  zh: {
    training: '今天只做轻量活动：快走或拉伸，先做 2 分钟，感觉还行再延到 10 分钟，不加重量。',
    study: '只挑最容易的一页，先读 2 分钟；顺了再读到 10 分钟。',
    work: '先处理最小的一件事 2 分钟，再决定要不要继续。',
    chores: '只做一件家务的第一步，2 分钟；顺手就做到 10 分钟。',
    recover: '今天以恢复为主：先静 2 分钟，早点收工，晚上记一句睡前状态。',
    other: '挑一件小事，先做 2 分钟；顺了再延长。',
  },
  en: {
    training: 'Keep it light today: a brisk walk or stretching. Start with 2 minutes; extend to 10 if it feels fine. No weights.',
    study: 'Pick the easiest page and read for 2 minutes; keep going to 10 if it flows.',
    work: 'Do the smallest task for 2 minutes, then decide whether to continue.',
    chores: 'Just do the first step of one chore for 2 minutes; carry on to 10 if easy.',
    recover: 'Recovery day: sit quietly for 2 minutes, finish early, note how you feel tonight.',
    other: 'Pick one small thing and do 2 minutes; extend if it flows.',
  },
};
const NORMAL: Record<Lang, Record<FocusAnswer, string>> = {
  zh: {
    training: '按平时的量训练 20 分钟，做完回来记下重量和组数。',
    study: '专注学 20 分钟，结束时写一句学到了什么。',
    work: '做 20 分钟最重要的一件事，再回来记一句。',
    chores: '做完一件拖了几天的家务，限时 20 分钟。',
    recover: '今天适合轻松活动 15 分钟，然后好好休息。',
    other: '用 20 分钟推进它，做完回来记一句。',
  },
  en: {
    training: 'Train as usual for 20 minutes, then log weight and sets.',
    study: 'Study with focus for 20 minutes, then write one line on what you learned.',
    work: 'Spend 20 minutes on the single most important task, then log a line.',
    chores: 'Finish one chore you have been putting off, capped at 20 minutes.',
    recover: 'Easy activity for 15 minutes, then rest properly.',
    other: 'Give it 20 minutes, then come back and log a line.',
  },
};
const FOCUS: Record<Lang, Record<FocusAnswer, string>> = {
  zh: {
    training: '状态不错，可以正常训练：做完记下重量、组数和次数。',
    study: '状态不错，专注学 25 分钟，不看手机。',
    work: '状态不错，先做最重要的一件，专注 25 分钟。',
    chores: '状态不错，一口气把家务清完，限时 25 分钟。',
    recover: '状态不错，也别硬冲：安排一次 20 分钟的主动恢复。',
    other: '状态不错，专注推进 25 分钟。',
  },
  en: {
    training: 'You feel good: train normally and log weight, sets and reps afterwards.',
    study: 'You feel good: study 25 focused minutes, phone away.',
    work: 'You feel good: do the most important task first, 25 focused minutes.',
    chores: 'You feel good: clear the chores in one go, capped at 25 minutes.',
    recover: 'You feel good, but do not push: schedule 20 minutes of active recovery.',
    other: 'You feel good: push it forward for 25 focused minutes.',
  },
};
const TITLES: Record<Lang, { light: string; normal: string; focus: string }> = {
  zh: { light: '先从 2 分钟开始', normal: '按计划做 20 分钟', focus: '状态不错，做最重要的一件' },
  en: { light: 'Start with 2 minutes', normal: 'Do 20 minutes as planned', focus: 'Good state — do the one that matters' },
};

export function buildFirstSuggestion(a: FirstStartAnswers, lang: Lang = 'zh'): FirstSuggestion {
  const drained = a.state === 'low' || (a.sleep === 'bad' && a.state !== 'high');
  if (drained) return { title: TITLES[lang].light, body: LIGHT[lang][a.focus], minutes: 2, intensity: 'light', basis: 'prior' };
  if (a.state === 'high' && a.sleep !== 'bad') return { title: TITLES[lang].focus, body: FOCUS[lang][a.focus], minutes: 25, intensity: 'focus', basis: 'prior' };
  return { title: TITLES[lang].normal, body: NORMAL[lang][a.focus], minutes: 20, intensity: 'normal', basis: 'prior' };
}

/** State answer → StateCheckIn.overall (1–5): low/mid/high = 2/3/4, coarse by design; refine later on Today. */
export function stateToOverall(s: StateAnswer): 2 | 3 | 4 { return s === 'low' ? 2 : s === 'mid' ? 3 : 4; }
/** Sleep self-rating keeps its own unit; it is never merged with measured sleep minutes. */
export const SLEEP_SELF_RATING_UNIT = '睡眠自评1-3';
export function sleepToValue(s: SleepAnswer): 1 | 2 | 3 { return s === 'bad' ? 1 : s === 'ok' ? 2 : 3; }
