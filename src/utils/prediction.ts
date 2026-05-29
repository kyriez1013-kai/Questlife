import { ProgressType, Skill } from '../types';
import { progressTypeForSkill } from '../progress';

export type PredictionSchemaKind =
  | 'time_based'
  | 'target_value'
  | 'strength_training'
  | 'frequency'
  | 'checklist'
  | 'performance_log'
  | 'quality_score'
  | 'state_based'
  | 'money_based'
  | 'binary'
  | 'qualitative'
  | 'none';

export type PredictionSchema = {
  kind: PredictionSchemaKind;
  metricType: ProgressType;
  showDuration: boolean;
  showQuality: boolean;
  showTargetValue: boolean;
  showStrength: boolean;
  showPerformance: boolean;
  showCount: boolean;
  showChecklist: boolean;
  showMoney: boolean;
  showState: boolean;
  showReflection: boolean;
};

export function isStrengthPredictionSkill(skill?: Skill) {
  if (!skill) return false;
  const metricType = progressTypeForSkill(skill);
  return skill.taskType === 'strength_training'
    || skill.metricConfig?.performanceType === 'strength'
    || (metricType === 'performance_log' && /卧推|硬拉|深蹲|bench|deadlift|squat|press/i.test(skill.name));
}

export function getPredictionSchemaForSkill(skill?: Skill): PredictionSchema {
  const metricType = skill ? progressTypeForSkill(skill) : 'none';
  if (isStrengthPredictionSkill(skill)) {
    return {
      kind: 'strength_training',
      metricType,
      showDuration: true,
      showQuality: true,
      showTargetValue: false,
      showStrength: true,
      showPerformance: false,
      showCount: false,
      showChecklist: false,
      showMoney: false,
      showState: false,
      showReflection: false,
    };
  }
  const base = {
    metricType,
    showQuality: metricType !== 'none',
    showTargetValue: false,
    showStrength: false,
    showPerformance: false,
    showCount: false,
    showChecklist: false,
    showMoney: false,
    showState: false,
    showReflection: false,
  };
  if (metricType === 'time_based') return { ...base, kind: 'time_based', showDuration: true };
  if (metricType === 'target_value') return { ...base, kind: 'target_value', showDuration: false, showTargetValue: true };
  if (metricType === 'frequency') return { ...base, kind: 'frequency', showDuration: false, showCount: true };
  if (metricType === 'checklist' || metricType === 'curriculum') return { ...base, kind: 'checklist', showDuration: false, showChecklist: true };
  if (metricType === 'performance_log') return { ...base, kind: 'performance_log', showDuration: true, showPerformance: true };
  if (metricType === 'quality_score') return { ...base, kind: 'quality_score', showDuration: false };
  if (metricType === 'state_based') return { ...base, kind: 'state_based', showDuration: false, showState: true };
  if (metricType === 'money_based') return { ...base, kind: 'money_based', showDuration: false, showMoney: true };
  if (metricType === 'binary') return { ...base, kind: 'binary', showDuration: false };
  if (metricType === 'qualitative') return { ...base, kind: 'qualitative', showDuration: false, showQuality: true, showReflection: true };
  return { ...base, kind: 'none', showDuration: false, showQuality: false };
}

export function strengthVolume(weight?: number, reps?: number, sets?: number) {
  if (weight == null || reps == null || sets == null) return undefined;
  const volume = weight * reps * sets;
  return Number.isFinite(volume) ? volume : undefined;
}

export function formatStrengthSetLine(
  data: { weight?: number; reps?: number; sets?: number; rpe?: number },
  unit = 'kg'
) {
  const pieces = [];
  if (data.weight != null) pieces.push(`${data.weight}${unit}`);
  if (data.reps != null) pieces.push(`× ${data.reps}`);
  if (data.sets != null) pieces.push(`× ${data.sets}`);
  const main = pieces.join(' ');
  return `${main || '--'}${data.rpe != null ? ` · RPE ${data.rpe}` : ''}`;
}
