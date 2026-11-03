import type { Lang } from './copy';
import { SIGNAL_NAME, TYPE_NAME, sl } from './copy';
import type { PassiveSignals } from './signals';
import type { OpenLoops, Pull, Scale5, StateClassification } from './types';

const hours = (min: number) => (min / 60).toFixed(1);

function bodyParts(s: PassiveSignals, lang: Lang): string[] {
  const zh = lang === 'zh';
  const parts: string[] = [];
  if (s.sleep) {
    const h = hours(s.sleep.recentAvgMin);
    const span = s.sleep.nights === 2 ? (zh ? '近两晚平均' : 'last two nights averaged') : (zh ? '昨晚睡了' : 'last night was');
    if (s.sleep.basis === 'personal') {
      const usual = hours(s.sleep.baselineMedianMin!);
      parts.push(zh
        ? `${span} ${h} 小时，${s.sleep.low ? `低于你的常态（通常 ${usual} 小时）` : '在你的常态范围内'}`
        : `${span} ${h}h, ${s.sleep.low ? `below your usual (${usual}h)` : 'within your usual range'}`);
    } else {
      parts.push(zh
        ? `${span} ${h} 小时${s.sleep.low ? '，少于 6 小时' : ''}`
        : `${span} ${h}h${s.sleep.low ? ', under 6h' : ''}`);
    }
  } else if (s.sleepSelfRating) {
    const word = zh ? ['', '差', '一般', '好'][s.sleepSelfRating.value] : ['', 'poor', 'ok', 'good'][s.sleepSelfRating.value];
    parts.push(zh ? `睡眠自评：${word}` : `sleep self-rating: ${word}`);
  }
  if (s.training) {
    parts.push(zh
      ? `昨天训练 ${s.training.yesterdayMin} 分钟${s.training.heavy ? '，偏多' : ''}`
      : `${s.training.yesterdayMin} min training yesterday${s.training.heavy ? ', on the heavy side' : ''}`);
  }
  if (s.restingHr) {
    parts.push(zh
      ? `静息心率 ${Math.round(s.restingHr.latest)}${s.restingHr.high ? `，高于你的常态 ${Math.round(s.restingHr.baselineMedian)}` : '，在常态内'}`
      : `resting HR ${Math.round(s.restingHr.latest)}${s.restingHr.high ? `, above your usual ${Math.round(s.restingHr.baselineMedian)}` : ', usual'}`);
  }
  if (s.hrv) {
    parts.push(zh
      ? `HRV ${Math.round(s.hrv.latest)}${s.hrv.low ? `，低于你的常态 ${Math.round(s.hrv.baselineMedian)}` : '，在常态内'}`
      : `HRV ${Math.round(s.hrv.latest)}${s.hrv.low ? `, below your usual ${Math.round(s.hrv.baselineMedian)}` : ', usual'}`);
  }
  return parts;
}

const LOOPS: Record<Lang, Record<OpenLoops, string>> = {
  zh: { none: '没什么挂着的事', few: '挂着一两件事', many: '挂着很多事' },
  en: { none: 'nothing on your mind', few: 'one or two things on your mind', many: 'lots on your mind' },
};
const PULL: Record<Lang, Record<Pull, string>> = {
  zh: { want_cant: '想做但做不动', can_dont_want: '做得动但不想做', unsure: '对眼前这件事说不清' },
  en: { want_cant: 'want to but can’t', can_dont_want: 'can but don’t want to', unsure: 'unsure about the task' },
};

const UNCLEAR_WHY: Record<Lang, Record<string, string>> = {
  zh: {
    'unclear.conflict_pull_body': '「想做但做不动」和身体信号对不上',
    'unclear.missing_body': '没有身体信号，分不清是真累还是不想做',
    'unclear.mid_e_high_t': '紧绷偏高但精力居中，补一下「挂着的事」就能分清',
    'unclear.in_range': '都在你的常态范围内，没有明显信号',
  },
  en: {
    'unclear.conflict_pull_body': '“want to but can’t” does not match your body signals',
    'unclear.missing_body': 'no body signals, so real tiredness vs not wanting to can’t be told apart',
    'unclear.mid_e_high_t': 'tension is high but energy is mid; adding “things on your mind” would tell',
    'unclear.in_range': 'everything is within your usual range',
  },
};

function contrast(c: StateClassification, lang: Lang): string {
  const zh = lang === 'zh';
  if (c.type === 'overload' && c.body === 'normal') return zh ? '，不是没睡够' : ', not lack of sleep';
  if (c.type === 'low_arousal' && c.body === 'normal') return zh ? '，不是燃料耗尽' : ', not an empty tank';
  if (c.type === 'low_fuel' && c.body === 'low') return zh ? '，身体账户偏低' : '; body signals are low';
  return '';
}

/** One line: the signals used and the conclusion. Never says "because" or "diagnosis". */
export function reasonLine(input: { energy: Scale5; tension: Scale5; openLoops?: OpenLoops; pull?: Pull; signals: PassiveSignals; classification: StateClassification }, lang: Lang): string {
  const zh = lang === 'zh';
  const c = input.classification;
  const head = [zh ? `精力 ${input.energy}、紧绷 ${input.tension}` : `Energy ${input.energy}, tension ${input.tension}`];
  if (input.openLoops) head.push(LOOPS[lang][input.openLoops]);
  if (input.pull) head.push(PULL[lang][input.pull]);
  const body = bodyParts(input.signals, lang);
  const facts = [head.join(zh ? '，' : ', '), ...(body.length ? [body.join(zh ? '，' : ', ')] : [])].join(zh ? '；' : '; ');
  if (c.type === 'unclear') {
    return zh ? `${facts} → 说不准：${UNCLEAR_WHY.zh[c.ruleId]}。` : `${facts} → unclear: ${UNCLEAR_WHY.en[c.ruleId]}.`;
  }
  return zh
    ? `${facts} → 更像${TYPE_NAME.zh[c.type]}${contrast(c, lang)}。`
    : `${facts} → more like ${TYPE_NAME.en[c.type].toLowerCase()}${contrast(c, lang)}.`;
}

/** Signals that were not used, listed so the person knows what the call did NOT see. */
export function notUsedLine(c: StateClassification, lang: Lang): string | undefined {
  const passive = c.missing.filter((id) => id !== 'open_loops' && id !== 'pull' && id !== 'schedule_load');
  if (!passive.length) return undefined;
  return sl(lang, 'notUsed', { list: passive.map((id) => SIGNAL_NAME[lang][id]).join(lang === 'zh' ? '、' : ', ') });
}

export function baselineLine(c: StateClassification, lang: Lang): string {
  return c.baseline === 'personal' ? sl(lang, 'personalBaseline', { n: c.baselineN }) : sl(lang, 'noBaseline', { n: c.baselineN });
}
