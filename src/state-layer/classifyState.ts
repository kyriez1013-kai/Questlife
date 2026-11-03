import type { StateCheckIn } from '../types';
import { bandOf, scaleBaseline } from './baseline';
import { bodyAccountOf, type PassiveSignals } from './signals';
import {
  STATE_RULE_VERSION,
  type OpenLoops,
  type Pull,
  type Scale5,
  type SignalId,
  type StateClassification,
  type StateTypeOrUnclear,
} from './types';

export type ClassifyInput = {
  energy: Scale5;
  tension: Scale5;
  openLoops?: OpenLoops;
  pull?: Pull;
  signals: PassiveSignals;
  /** Prior state-layer check-ins (kind 'check_in'), excluding the one being classified. */
  history: Pick<StateCheckIn, 'energy' | 'stateLayer'>[];
};

/** Prior answers used for the personal baseline. Legacy rows are excluded: their stress defaulted to 3. */
export function baselineHistory(rows: StateCheckIn[], excludeId?: string): StateCheckIn[] {
  return rows.filter((r) => r.id !== excludeId && r.stateLayer?.kind === 'check_in' && !r.dataProvenance?.deleted);
}

/** Transparent ordered rules; see docs/state-layer/02_状态模型.md (B2). First match wins. */
export function classifyState(input: ClassifyInput): StateClassification {
  const energyBase = scaleBaseline(input.history.map((r) => r.energy).filter((v): v is number => typeof v === 'number'));
  const tensionBase = scaleBaseline(input.history.map((r) => r.stateLayer?.tension).filter((v): v is Scale5 => typeof v === 'number'));
  const E = bandOf(input.energy, energyBase);
  const T = bandOf(input.tension, tensionBase);
  const body = bodyAccountOf(input.signals);
  const { openLoops, pull } = input;

  const rule = (): [StateTypeOrUnclear, string] => {
    if (E === 'low' && T === 'high') return ['overload', 'overload.low_e_high_t'];
    if (openLoops === 'many' && T !== 'low') return ['overload', 'overload.many_loops'];
    if (E === 'low') {
      if (body === 'low') return ['low_fuel', 'low_fuel.body_low'];
      if (body === 'normal') {
        return pull === 'want_cant' ? ['unclear', 'unclear.conflict_pull_body'] : ['low_arousal', 'low_arousal.body_ok'];
      }
      if (pull === 'can_dont_want') return ['low_arousal', 'low_arousal.pull'];
      if (pull === 'want_cant') return ['low_fuel', 'low_fuel.pull'];
      return ['unclear', 'unclear.missing_body'];
    }
    if (E !== 'high' && pull === 'can_dont_want') return ['low_arousal', 'low_arousal.pull_mid'];
    if (E === 'high') {
      if (T === 'high') return ['tense_energy', 'tense_energy'];
      if (T === 'low') return ['calm_energy', 'calm_energy'];
      return input.tension > tensionBase.median ? ['tense_energy', 'tense_energy.mid'] : ['calm_energy', 'calm_energy.mid'];
    }
    // E === 'mid'
    if (T === 'high') {
      if (openLoops === 'few') return ['overload', 'overload.mid_e'];
      if (openLoops === 'none') return ['tense_energy', 'tense_energy.mid_e'];
      return ['unclear', 'unclear.mid_e_high_t'];
    }
    if (body === 'low') return ['low_fuel', 'low_fuel.mid_e_body_low'];
    return ['unclear', 'unclear.in_range'];
  };
  const [type, ruleId] = rule();

  const used: SignalId[] = ['energy', 'tension'];
  const missing: SignalId[] = [...input.signals.missing];
  if (openLoops) used.push('open_loops'); else missing.push('open_loops');
  if (pull) used.push('pull'); else missing.push('pull');
  if (input.signals.sleep) used.push('sleep');
  if (input.signals.sleepSelfRating) used.push('sleep_self_rating');
  if (input.signals.restingHr) used.push('resting_hr');
  if (input.signals.hrv) used.push('hrv');
  if (input.signals.training) used.push('training');
  if (input.signals.scheduleLoadHours !== undefined) used.push('schedule_load');

  return {
    type,
    ruleId,
    ruleVersion: STATE_RULE_VERSION,
    baseline: energyBase.personal && tensionBase.personal ? 'personal' : 'scale_midpoint',
    baselineN: Math.min(energyBase.n, tensionBase.n),
    energyBand: E,
    tensionBand: T,
    body,
    used,
    missing,
  };
}

/** The type the person ended up with: their correction wins over the rule. */
export function effectiveType(row: Pick<StateCheckIn, 'stateLayer'>): StateTypeOrUnclear | undefined {
  return row.stateLayer?.correction?.type ?? row.stateLayer?.classification?.type;
}
