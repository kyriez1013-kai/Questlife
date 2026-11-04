/**
 * Deterministic local parser for one line of Chinese/English text.
 * Used when cloud AI is off/offline. Output is always a *candidate* the user must confirm.
 * Principles: never invent a number; a missing value stays null (never 0).
 */
export type V2ActionEntry = {
  kind: 'action';
  title: string;
  skillId: string | null;
  durationMinutes: number | null;
  weightKg: number | null;
  sets: number | null;
  reps: number | null;
};
export type V2StateEntry = { kind: 'state'; overall: 1 | 2 | 3 | 4 | 5 };
export type V2NoteEntry = { kind: 'note'; title: string };
export type V2Entry = V2ActionEntry | V2StateEntry | V2NoteEntry;

export type SkillRef = { id: string; name: string };

const EXERCISES = ['卧推', '深蹲', '硬拉', '推举', '划船', '引体', '俯卧撑', '跑步', '慢跑', '游泳', '骑行', '瑜伽', '拉伸', '快走', '散步', '阅读', '读书', '背单词', '学习', '复习', '写作', '编程', '做饭', '打扫', '冥想', 'SQL', 'Python', 'bench', 'squat', 'deadlift', 'run'];

const CN_NUM: Record<string, number> = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

function num(s: string): number {
  return CN_NUM[s] ?? Number(s);
}

export function parseDurationMinutes(text: string): number | null {
  if (/半\s*(个)?\s*小时/.test(text)) return 30;
  const h = text.match(/(\d+(?:\.\d+)?|[一二两三四五六七八九十])\s*(?:个)?\s*(?:小时|h\b|hr\b|hours?)/i);
  const m = text.match(/(\d+(?:\.\d+)?)\s*(?:分钟|分(?!数)|min\b|mins\b|minutes?)/i);
  let total = 0;
  let found = false;
  if (h) { const v = num(h[1]); if (Number.isFinite(v)) { total += v * 60; found = true; } }
  if (m) { const v = Number(m[1]); if (Number.isFinite(v)) { total += v; found = true; } }
  return found && total > 0 ? Math.round(total) : null;
}

export function parseStrength(text: string): { weightKg: number | null; sets: number | null; reps: number | null } {
  const w = text.match(/(\d+(?:\.\d+)?)\s*(?:kg|公斤|千克)/i);
  const sr = text.match(/(\d+)\s*[x×*]\s*(\d+)/i) ?? text.match(/(\d+)\s*组\D{0,4}?(\d+)\s*(?:次|个|下)/);
  const sets = text.match(/(\d+)\s*(?:组|sets?\b)/i);
  const reps = text.match(/(\d+)\s*(?:次|下|reps?\b)/i);
  return {
    weightKg: w ? Number(w[1]) : null,
    sets: sets ? Number(sets[1]) : sr ? Number(sr[1]) : null,
    reps: reps ? Number(reps[1]) : sr ? Number(sr[2]) : null,
  };
}

const STATE_WORDS: Array<[RegExp, 1 | 2 | 3 | 4 | 5]> = [
  [/(极佳|超好|爆棚|满状态|状态拉满|特别好)/, 5],
  [/(不错|挺好|很好|良好|状态好|感觉好|精神)/, 4],
  [/(一般|还行|凑合|普通|正常)/, 3],
  [/(较差|不太好|有点累|偏低|困|疲惫|没精神)/, 2],
  [/(很差|糟糕|很累|太累|累死|崩溃|撑不住)/, 1],
];

export function parseState(text: string): 1 | 2 | 3 | 4 | 5 | null {
  const numeric = text.match(/(?:状态|精力|感觉)\s*[:：]?\s*([1-5])\s*(?:\/\s*5|分)?(?!\d)/);
  if (numeric) return Number(numeric[1]) as 1 | 2 | 3 | 4 | 5;
  const cue = /(状态|精力|感觉|心情|觉得|累|困)/.test(text);
  if (!cue) return null;
  // The word the person wrote first wins ("感觉不错，状态还行" → 4). Negated forms like "不太好"
  // are listed under 较差, and the positive list only matches "状态好/感觉好", so they never collide.
  let best: { idx: number; level: 1 | 2 | 3 | 4 | 5 } | null = null;
  for (const [re, level] of STATE_WORDS) {
    const m = re.exec(text);
    if (m && (best === null || m.index < best.idx)) best = { idx: m.index, level };
  }
  return best ? best.level : null;
}

function matchSkill(text: string, skills: SkillRef[]): SkillRef | null {
  const lower = text.toLowerCase();
  const sorted = skills.slice().sort((a, b) => b.name.length - a.name.length);
  return sorted.find((s) => s.name.length >= 2 && lower.includes(s.name.toLowerCase())) ?? null;
}

function findExercise(text: string): string | null {
  const lower = text.toLowerCase();
  return EXERCISES.find((e) => lower.includes(e.toLowerCase())) ?? null;
}

export function parseLocal(rawText: string, skills: SkillRef[] = []): V2Entry[] {
  const text = rawText.trim();
  if (!text) return [];
  const entries: V2Entry[] = [];
  const duration = parseDurationMinutes(text);
  const strength = parseStrength(text);
  const skill = matchSkill(text, skills);
  const exercise = skill ? null : findExercise(text);
  const hasMetrics = duration != null || strength.weightKg != null || strength.sets != null;

  if (skill || exercise || hasMetrics) {
    entries.push({
      kind: 'action',
      title: skill?.name ?? exercise ?? text.slice(0, 24),
      skillId: skill?.id ?? null,
      durationMinutes: duration,
      weightKg: strength.weightKg,
      sets: strength.sets,
      reps: strength.reps,
    });
  }
  const state = parseState(text);
  if (state != null) entries.push({ kind: 'state', overall: state });
  if (entries.length === 0) entries.push({ kind: 'note', title: text });
  return entries;
}
