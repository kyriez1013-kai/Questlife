// State layer v0 — data shapes. Everything new lives in StateCheckIn.stateLayer (synced as-is by
// SyncV2's passthrough schema) so no table or migration is needed. Missing optional answers stay
// undefined; nothing is filled with a default.

export const STATE_LAYER_VERSION = 'questlife.state-layer.v0' as const;
export const STATE_RULE_VERSION = 'state-rules.v0' as const;

export type StateType = 'calm_energy' | 'tense_energy' | 'low_fuel' | 'overload' | 'low_arousal';
export type StateTypeOrUnclear = StateType | 'unclear';
export const STATE_TYPES: StateType[] = ['calm_energy', 'tense_energy', 'low_fuel', 'overload', 'low_arousal'];

export type Scale5 = 1 | 2 | 3 | 4 | 5;
export type OpenLoops = 'none' | 'few' | 'many';
export type Pull = 'want_cant' | 'can_dont_want' | 'unsure';
export type Band = 'low' | 'mid' | 'high';
export type BodyAccount = 'low' | 'normal' | 'unknown';

export type StateActionId =
  | 'hardest_first'
  | 'protect_time'
  | 'checklist_defer_decisions'
  | 'brisk_walk_10'
  | 'downgrade_recover'
  | 'rest_20'
  | 'brain_dump'
  | 'probe_5'
  | 'switch_env'
  | 'follow_today'
  | 'check_again';

export type SignalId = 'energy' | 'tension' | 'open_loops' | 'pull' | 'sleep' | 'sleep_self_rating' | 'resting_hr' | 'hrv' | 'training' | 'schedule_load' | 'time_block';

export type StateClassification = {
  type: StateTypeOrUnclear;
  ruleId: string;
  ruleVersion: typeof STATE_RULE_VERSION;
  baseline: 'personal' | 'scale_midpoint';
  baselineN: number;
  energyBand: Band;
  tensionBand: Band;
  body: BodyAccount;
  used: SignalId[];
  missing: SignalId[];
};

export type StateLayerPayload = {
  v: typeof STATE_LAYER_VERSION;
  kind: 'check_in' | 'follow_up';
  tension: Scale5;
  overallFrom: 'energy';
  openLoops?: OpenLoops;
  pull?: Pull;
  classification?: StateClassification;
  correction?: { type: StateType; at: string };
  /** Choosing the original plan suppresses only this task on this check-in date. */
  originalPlanChoices?: { taskId: string; at: string }[];
  source?: 'phone' | 'watch_shortcut';
  choice?: {
    actionId: StateActionId;
    slot: 'primary' | 'alternate';
    randomized: boolean;
    at: string;
    followUpDismissedAt?: string;
    /** V5 quick follow-up asks energy only; no tension value is fabricated. */
    energyFollowUp?: { energy: Scale5; at: string };
  };
  followUpOf?: string;
  nextDone?: boolean;
};

export type Demand = 'deep' | 'shallow' | 'physical' | 'recovery' | 'social';
export const DEMANDS: Demand[] = ['deep', 'shallow', 'physical', 'recovery', 'social'];

export type BrainDumpChoice = 'now' | 'schedule' | 'drop';
export type BrainDumpItem = { text: string; choice: BrainDumpChoice; time?: string; minutes?: number; scheduleBlockId?: string };
export type BrainDumpRecord = { v: typeof STATE_LAYER_VERSION; checkInId?: string; items: BrainDumpItem[] };
