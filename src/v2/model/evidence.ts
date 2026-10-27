import type { ContextLog, ExecutionLog, StateCheckIn } from '../../types';

/**
 * Evidence levels in plain words. Every conclusion card says (a) how credible it is,
 * (b) how much data it has vs needs, (c) exactly what is missing. No global "day N" lock:
 * each card unlocks on its own data.
 *
 * e0 还没有结论 · e1 仅观察 · e2 可能有关联 · e3 较稳定 · prior 通用建议 · sample 示例
 * Association is never causation: relation cards always carry the `association` flag.
 */
export type EvidenceLevel = 'e0' | 'e1' | 'e2' | 'e3';

export type EvidenceCard = {
  id: string;
  kind: 'state_trend' | 'sleep_state' | 'action_baseline';
  /** subject shown to the user, e.g. "状态变化", "睡眠 × 精力", "卧推" */
  subject: string;
  level: EvidenceLevel;
  have: number;
  need: number;
  unit: '天' | '对' | '次';
  /** exact missing text, Chinese plain words */
  missing: string | null;
  /** relation cards: "关联不等于因果" */
  association: boolean;
  /** sleep × state pairs are only counted within one unit (never mixing minutes with 1–3 self-ratings) */
  unitNote?: string;
};

function dayOf(iso: string | undefined, fallback?: string): string | null {
  if (fallback) return fallback;
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const deleted = (x: { dataProvenance?: { deleted?: boolean } }) => !!x.dataProvenance?.deleted;

export function buildEvidenceCards(input: {
  stateCheckIns: StateCheckIn[];
  contextLogs: ContextLog[];
  executionLogs: ExecutionLog[];
  skillNames?: Record<string, string>;
}): EvidenceCard[] {
  const cards: EvidenceCard[] = [];

  // 1) state trend: distinct days with a state check-in
  const stateDays = new Set(input.stateCheckIns.filter((s) => !deleted(s)).map((s) => dayOf(s.timestamp ?? s.createdAt, s.date)).filter(Boolean) as string[]);
  const sd = stateDays.size;
  cards.push({
    id: 'state_trend', kind: 'state_trend', subject: '状态变化',
    level: sd >= 14 ? 'e3' : sd >= 3 ? 'e1' : 'e0',
    have: sd, need: sd >= 3 ? 14 : 3, unit: '天', association: false,
    missing: sd >= 14 ? null : sd >= 3 ? `再记 ${14 - sd} 天状态，才能说你的状态基线比较稳定` : `再记 ${3 - sd} 天状态，就能看到变化`,
  });

  // 2) sleep × state: days with BOTH a numeric sleep context and a state check-in, per unit
  const sleepByUnit = new Map<string, Set<string>>();
  input.contextLogs.filter((c) => c.type === 'sleep' && !deleted(c) && typeof c.value === 'number' && Number.isFinite(c.value)).forEach((c) => {
    const d = dayOf(c.createdAt, c.date);
    if (!d) return;
    const unit = c.unit ?? '未标注单位';
    if (!sleepByUnit.has(unit)) sleepByUnit.set(unit, new Set());
    sleepByUnit.get(unit)!.add(d);
  });
  let bestUnit = '';
  let pairs = 0;
  sleepByUnit.forEach((days, unit) => {
    const p = [...days].filter((d) => stateDays.has(d)).length;
    if (p > pairs) { pairs = p; bestUnit = unit; }
  });
  cards.push({
    id: 'sleep_state', kind: 'sleep_state', subject: '睡眠 × 精力',
    level: pairs >= 21 ? 'e3' : pairs >= 7 ? 'e2' : pairs >= 3 ? 'e1' : 'e0',
    have: pairs, need: pairs >= 7 ? 21 : 7, unit: '对', association: true,
    missing: pairs >= 21 ? null : pairs >= 7 ? `再凑 ${21 - pairs} 天同时有睡眠和状态的记录，关联才更稳` : `已有 ${pairs}/7 天同时有睡眠和状态，还差 ${7 - pairs} 天`,
    unitNote: bestUnit ? `按「${bestUnit}」计算，不与其他单位混用` : undefined,
  });

  // 3) per-action baseline: never mix actions, only actual durations > 0
  const byAction = new Map<string, number>();
  input.executionLogs.filter((l) => !deleted(l) && (l.durationMinutes ?? 0) > 0).forEach((l) => {
    const key = l.linkedSkillId ? (input.skillNames?.[l.linkedSkillId] ?? l.title ?? l.linkedSkillId) : (l.title ?? '');
    if (!key) return;
    byAction.set(key, (byAction.get(key) ?? 0) + 1);
  });
  [...byAction.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).forEach(([name, n]) => {
    cards.push({
      id: `baseline:${name}`, kind: 'action_baseline', subject: name,
      level: n >= 8 ? 'e3' : n >= 3 ? 'e1' : 'e0',
      have: n, need: n >= 3 ? 8 : 3, unit: '次', association: false,
      missing: n >= 8 ? null : n >= 3 ? `再记 ${8 - n} 次「${name}」，才能说有个人节奏` : `再记 ${3 - n} 次「${name}」（带时长），才能看你的节奏`,
    });
  });
  return cards;
}

/** The single "come back tomorrow" hook: the card that is closest to its next level. */
export function unlockHint(cards: EvidenceCard[]): string | null {
  const open = cards.filter((c) => c.missing && c.have < c.need);
  if (open.length === 0) return null;
  open.sort((a, b) => (a.need - a.have) - (b.need - b.have));
  return open[0].missing;
}
