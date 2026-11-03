import type { StateCheckIn } from '../types';
import { baselineHistory, classifyState } from './classifyState';
import type { PassiveSignals } from './signals';
import { STATE_LAYER_VERSION, type OpenLoops, type Pull, type Scale5, type StateLayerPayload } from './types';

export type StateAnswers = { energy: Scale5; tension: Scale5; openLoops?: OpenLoops; pull?: Pull };

/**
 * Builds the StateCheckIn fields for a state-layer answer. energy→energy, tension→stress (and
 * stateLayer.tension); overall mirrors energy because SyncV2 requires it (stateLayer.overallFrom
 * records that). focus/mood are not asked, so they are not written.
 */
export function buildStateCheckIn(input: {
  answers: StateAnswers;
  kind: StateLayerPayload['kind'];
  followUpOf?: string;
  nextDone?: boolean;
  now: Date;
  date: string;
  signals: PassiveSignals;
  allCheckIns: StateCheckIn[];
  excludeId?: string;
}): Omit<StateCheckIn, 'id' | 'createdAt'> {
  const { answers } = input;
  const classification = classifyState({
    energy: answers.energy,
    tension: answers.tension,
    openLoops: answers.openLoops,
    pull: answers.pull,
    signals: input.signals,
    history: baselineHistory(input.allCheckIns, input.excludeId),
  });
  const stateLayer: StateLayerPayload = {
    v: STATE_LAYER_VERSION,
    kind: input.kind,
    tension: answers.tension,
    overallFrom: 'energy',
    ...(answers.openLoops ? { openLoops: answers.openLoops } : {}),
    ...(answers.pull ? { pull: answers.pull } : {}),
    classification,
    ...(input.followUpOf ? { followUpOf: input.followUpOf } : {}),
    ...(input.nextDone !== undefined ? { nextDone: input.nextDone } : {}),
  };
  return {
    date: input.date,
    timestamp: input.now.toISOString(),
    timeBlock: input.signals.timeBlock,
    overall: answers.energy,
    energy: answers.energy,
    stress: answers.tension,
    stateLayer,
  };
}

/** Latest state-layer row of the day (check-in or follow-up), the one Today's state card shows. */
export function latestStateLayerRow(rows: StateCheckIn[], date: string): StateCheckIn | undefined {
  return rows
    .filter((r) => r.date === date && r.stateLayer && !r.dataProvenance?.deleted)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
}
