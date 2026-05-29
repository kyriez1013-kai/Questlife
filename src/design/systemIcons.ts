import { GoalType, ProgressType, TaskType } from '../types';
import { QuestIconName } from '../components/ui/QuestIcon';

export function iconForGoalType(goalType?: GoalType): QuestIconName {
  switch (goalType) {
    case 'fitness': return 'dumbbell';
    case 'career': return 'target';
    case 'study':
    case 'exam': return 'book';
    case 'finance': return 'wallet';
    case 'health': return 'heartPulse';
    case 'project': return 'code';
    default: return 'target';
  }
}

export function iconForTaskType(taskType?: TaskType): QuestIconName {
  switch (taskType) {
    case 'deep_study':
    case 'light_review': return 'book';
    case 'strength_training':
    case 'cardio_recovery': return 'dumbbell';
    case 'admin': return 'folder';
    case 'life_maintenance': return 'heartPulse';
    case 'creative_building': return 'code';
    default: return 'brain';
  }
}

export function iconForMetricType(metricType?: ProgressType | string): QuestIconName {
  switch (metricType) {
    case 'time_based': return 'activity';
    case 'target_value': return 'target';
    case 'frequency': return 'calendar';
    case 'checklist':
    case 'curriculum':
    case 'binary': return 'check';
    case 'performance_log': return 'barChart';
    case 'quality_score': return 'brain';
    case 'state_based': return 'heartPulse';
    case 'money_based': return 'wallet';
    case 'qualitative': return 'book';
    default: return 'activity';
  }
}

export const systemIcons = {
  today: 'home',
  quest: 'target',
  schedule: 'calendar',
  insights: 'barChart',
  settings: 'settings',
  goal: 'target',
  module: 'folder',
  skill: 'brain',
  skillLibrary: 'library',
  rescue: 'lifeBuoy',
  state: 'activity',
  energyBudget: 'activity',
  execution: 'play',
  progress: 'barChart',
  suggestedModules: 'tree',
} satisfies Record<string, QuestIconName>;
