import { ObjectiveContextBrief } from './objectiveContextBrief';
import type { DecisionMemorySummary } from './decisionMemory';
import type { PatternMemorySummary } from './patternMemory';

export type DecisionMode = 'instant_micro' | 'daily_brief';
export type DecisionTrigger = 'morning_push' | 'state_checkin' | 'manual' | 'debug';

export type DecisionReadinessBand = 'green' | 'yellow' | 'red' | 'unknown';
export type DecisionEvidenceBasis = 'population_prior' | 'personal_pattern' | 'mixed';
export type DecisionTone = 'assertive' | 'tentative';

export type DecisionBriefInput = {
  mode: DecisionMode;
  trigger: DecisionTrigger;
  now: string;
  locale?: 'zh' | 'en';
  current_state: Record<string, unknown> | null;
  today_context: {
    objective_context_brief?: ObjectiveContextBrief;
    recent_context_logs: Array<Record<string, unknown>>;
    context_summary?: Record<string, unknown>;
    latest_sleep_minutes?: number;
    hrv?: number;
    resting_heart_rate?: number;
    steps?: number;
    workout_minutes?: number;
    caffeine_count?: number;
  };
  profile: {
    active_goals: Array<Record<string, unknown>>;
    modules: Array<Record<string, unknown>>;
    skills: Array<Record<string, unknown>>;
    known_baselines: Record<string, unknown>;
    confirmed_patterns: Array<Record<string, unknown>>;
    inferred_patterns_v0?: Array<Record<string, unknown>>;
    pattern_candidates?: Array<Record<string, unknown>>;
    pattern_memory_summary?: PatternMemorySummary;
    chronotype: 'unknown' | 'morning' | 'evening' | 'mixed';
  };
  history_index: {
    last_7_days: Array<Record<string, unknown>>;
    last_28_days: Record<string, unknown>;
  };
  state_summary?: Record<string, unknown>;
  after_state_summary?: Record<string, unknown>;
  schedule_today: Array<Record<string, unknown>>;
  decision_memory_summary?: DecisionMemorySummary;
};

export type DecisionBriefResult = {
  schema_version: '1.0';
  generated_at: string;
  readiness: {
    score: number | null;
    band: DecisionReadinessBand;
    vs_baseline: 'above' | 'at' | 'below' | 'unknown';
    drivers: string[];
  };
  headline_insight: string;
  perception_gap: {
    detected: boolean;
    subjective: string;
    objective: string;
    interpretation: string;
    test_action: string;
  };
  deep_analysis: string;
  prescription: {
    do_first: {
      step: string;
      why: string;
      duration_min: number | null;
    };
    schedule_adjustments: Array<Record<string, unknown>>;
    do_not: string[];
  };
  patterns_surfaced: string[];
  confidence: number;
  evidence_basis: DecisionEvidenceBasis;
  data_gaps: string[];
  tone: DecisionTone;
};

export type DecisionService = {
  buildBrief(input: DecisionBriefInput): Promise<DecisionBriefResult>;
};
