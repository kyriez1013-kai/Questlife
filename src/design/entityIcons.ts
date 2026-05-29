import { Category, GoalType, QuestModule, Skill, TaskType } from '../types';
import { QuestIconName } from '../components/ui/QuestIcon';
import { iconForGoalType, iconForTaskType } from './systemIcons';

function lower(value?: string) {
  return (value ?? '').toLowerCase();
}

export function getGoalSemanticIcon(goal?: Pick<Category, 'goalType' | 'name'>): QuestIconName {
  return iconForGoalType(goal?.goalType as GoalType | undefined);
}

export function getSkillSemanticIcon(skill?: Pick<Skill, 'taskType' | 'name' | 'metricConfig' | 'progressType'>): QuestIconName {
  const name = lower(skill?.name);
  if (/python|sql|code|coding|program|terminal|编程|代码/.test(name)) return 'code';
  if (/write|writing|essay|blog|写作|文章/.test(name)) return 'book';
  if (/save|saving|money|finance|收入|储蓄|投资|财务/.test(name)) return 'wallet';
  if (/sleep|睡眠|recovery|恢复|health|健康/.test(name)) return 'heartPulse';
  if (/bench|deadlift|squat|gym|卧推|硬拉|深蹲|健身|训练/.test(name)) return 'dumbbell';
  if (/project|build|design|portfolio|项目|搭建|作品/.test(name)) return 'code';
  return iconForTaskType(skill?.taskType as TaskType | undefined);
}

export function getModuleSemanticIcon(module?: Pick<QuestModule, 'name'>): QuestIconName {
  const name = lower(module?.name);
  if (/push|chest|推|胸/.test(name)) return 'dumbbell';
  if (/pull|back|拉|背/.test(name)) return 'dumbbell';
  if (/leg|腿/.test(name)) return 'dumbbell';
  if (/shoulder|肩/.test(name)) return 'dumbbell';
  if (/recover|恢复/.test(name)) return 'heartPulse';
  if (/nutrition|diet|营养|饮食/.test(name)) return 'heartPulse';
  if (/fundamental|基础|lecture|知识/.test(name)) return 'book';
  if (/practice|练习|question|题/.test(name)) return 'check';
  if (/review|复习/.test(name)) return 'activity';
  if (/project|作业|项目|build|搭建/.test(name)) return 'code';
  return 'folder';
}
