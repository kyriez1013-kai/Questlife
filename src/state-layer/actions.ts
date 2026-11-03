import type { StateActionId, StateTypeOrUnclear } from './types';

export type EvidenceKind = 'rule' | 'general' | 'personal';
export type ScienceRefId = 'thayer1987' | 'masicampo2011' | 'kurzban2013' | 'marcora2009' | 'loy2013';

export type StateAction = {
  id: StateActionId;
  /** Opens a flow instead of only being recorded. */
  opens?: 'reorder' | 'brain_dump' | 'recheck';
  /** Shown as 「通用依据」 with a one-line source; absent → 「规则判断」. */
  science?: ScienceRefId;
};

const A = (id: StateActionId, extra: Partial<StateAction> = {}): StateAction => ({ id, ...extra });

export const ACTIONS_BY_TYPE: Record<StateTypeOrUnclear, { primary: StateAction; alternate: StateAction }> = {
  calm_energy: { primary: A('hardest_first', { opens: 'reorder' }), alternate: A('protect_time') },
  tense_energy: { primary: A('checklist_defer_decisions', { science: 'thayer1987' }), alternate: A('brisk_walk_10', { science: 'thayer1987' }) },
  low_fuel: { primary: A('downgrade_recover', { opens: 'reorder' }), alternate: A('rest_20', { science: 'loy2013' }) },
  overload: { primary: A('brain_dump', { opens: 'brain_dump', science: 'masicampo2011' }), alternate: A('brisk_walk_10', { science: 'thayer1987' }) },
  low_arousal: { primary: A('probe_5', { science: 'kurzban2013' }), alternate: A('switch_env', { science: 'marcora2009' }) },
  unclear: { primary: A('follow_today'), alternate: A('check_again', { opens: 'recheck' }) },
};

/** Types where both options are reasonable enough to offer a random pick (coin-flip mode). */
export function coinFlipEligible(type: StateTypeOrUnclear): boolean {
  return type !== 'unclear';
}

/** Follow-up opens 20 minutes after an action is picked and stays open for the rest of that day. */
export const FOLLOW_UP_DELAY_MIN = 20;

export function followUpDue(choiceAt: string, now: Date): boolean {
  const at = new Date(choiceAt);
  if (!Number.isFinite(at.getTime())) return false;
  const sameDay = at.toDateString() === now.toDateString();
  return sameDay && now.getTime() - at.getTime() >= FOLLOW_UP_DELAY_MIN * 60_000;
}
