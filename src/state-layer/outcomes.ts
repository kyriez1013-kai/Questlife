import type { StateCheckIn } from '../types';
import { effectiveType } from './classifyState';
import type { StateActionId, StateTypeOrUnclear } from './types';

export const MIN_OUTCOME_N = 5;

export type OutcomeCell = {
  type: StateTypeOrUnclear;
  actionId: StateActionId;
  /** Picks that have a follow-up answer. */
  n: number;
  randomizedN: number;
  energyUp: number; energySame: number; energyDown: number;
  tensionDown: number; tensionSame: number; tensionUp: number;
  nextDone: number; nextNotDone: number; nextUnanswered: number;
  /** Picks with no follow-up yet (or dismissed): counted, never treated as an outcome. */
  pendingOrDismissed: number;
};

/** Counts per (corrected type × action). Below MIN_OUTCOME_N the UI shows only n. No rates, no causal words. */
export function summarizeOutcomes(rows: StateCheckIn[]): OutcomeCell[] {
  const live = rows.filter((r) => !r.dataProvenance?.deleted);
  const followUps = new Map<string, StateCheckIn>();
  for (const r of live) {
    const of = r.stateLayer?.kind === 'follow_up' ? r.stateLayer.followUpOf : undefined;
    if (!of) continue;
    const prev = followUps.get(of);
    if (!prev || r.timestamp < prev.timestamp) followUps.set(of, r); // first answer counts
  }
  const cells = new Map<string, OutcomeCell>();
  for (const r of live) {
    const choice = r.stateLayer?.choice;
    const type = effectiveType(r);
    if (!choice || !type) continue;
    const key = `${type}|${choice.actionId}`;
    const cell = cells.get(key) ?? {
      type, actionId: choice.actionId, n: 0, randomizedN: 0,
      energyUp: 0, energySame: 0, energyDown: 0, tensionDown: 0, tensionSame: 0, tensionUp: 0,
      nextDone: 0, nextNotDone: 0, nextUnanswered: 0, pendingOrDismissed: 0,
    };
    const fu = followUps.get(r.id);
    const e0 = r.energy; const t0 = r.stateLayer?.tension;
    const e1 = fu?.energy; const t1 = fu?.stateLayer?.tension;
    if (!fu || e0 === undefined || t0 === undefined || e1 === undefined || t1 === undefined) {
      cell.pendingOrDismissed += 1;
    } else {
      cell.n += 1;
      if (choice.randomized) cell.randomizedN += 1;
      if (e1 > e0) cell.energyUp += 1; else if (e1 < e0) cell.energyDown += 1; else cell.energySame += 1;
      if (t1 < t0) cell.tensionDown += 1; else if (t1 > t0) cell.tensionUp += 1; else cell.tensionSame += 1;
      if (fu.stateLayer?.nextDone === true) cell.nextDone += 1;
      else if (fu.stateLayer?.nextDone === false) cell.nextNotDone += 1;
      else cell.nextUnanswered += 1;
    }
    cells.set(key, cell);
  }
  return [...cells.values()].sort((a, b) => b.n - a.n || a.type.localeCompare(b.type) || a.actionId.localeCompare(b.actionId));
}

export function outcomeFor(cells: OutcomeCell[], type: StateTypeOrUnclear, actionId: StateActionId): OutcomeCell | undefined {
  return cells.find((c) => c.type === type && c.actionId === actionId);
}

/** The pick whose follow-up is still open today (latest first), if any. */
export function pendingFollowUp(rows: StateCheckIn[], now: Date, isDue: (at: string, now: Date) => boolean): StateCheckIn | undefined {
  const answered = new Set(rows.map((r) => (r.stateLayer?.kind === 'follow_up' ? r.stateLayer.followUpOf : undefined)).filter(Boolean));
  return rows
    .filter((r) => !r.dataProvenance?.deleted && r.stateLayer?.choice && !r.stateLayer.choice.followUpDismissedAt && !answered.has(r.id))
    .filter((r) => isDue(r.stateLayer!.choice!.at, now))
    .sort((a, b) => b.stateLayer!.choice!.at.localeCompare(a.stateLayer!.choice!.at))[0];
}
