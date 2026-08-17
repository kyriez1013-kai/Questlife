import type { CompletionSchema, ParsedEntry } from '../types';

export type UniversalCaptureDomain = 'learning' | 'work' | 'exercise' | 'state' | 'generic';

type CaptureLanguage = 'zh' | 'en';

const WORK_KEYWORDS = [
  'work', 'task', 'pipeline', 'proxy', 'feature', 'bug', 'project', 'meeting',
  '工作', '任务', '项目', '会议', '卡在', '调试', '开发',
];

const STATE_KEYWORDS = [
  'tired', 'stress', 'mood', 'energy', 'focus', 'slow',
  '累', '疲惫', '焦虑', '心情', '状态', '精神', '脑子很慢',
];

function normalized(value?: string): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^\w\u4e00-\u9fff+]/g, '');
}

function includesAny(value: string, keywords: string[]): boolean {
  const text = normalized(value);
  return keywords.some((keyword) => text.includes(normalized(keyword)));
}

export function deriveUniversalCaptureDomain({
  captureText,
  completionSchema,
  entry,
}: {
  captureText: string;
  completionSchema?: CompletionSchema;
  entry: ParsedEntry;
}): UniversalCaptureDomain {
  if (completionSchema?.domain === 'fitness' || entry.goalType === 'fitness' || entry.progressType === 'performance_log') {
    return 'exercise';
  }
  if (completionSchema?.domain === 'state') {
    return 'state';
  }
  if (
    entry.goalType === 'project'
    || entry.goalType === 'career'
    || includesAny(`${captureText} ${entry.skillName} ${entry.fields?.note ?? ''}`, WORK_KEYWORDS)
  ) {
    return 'work';
  }
  if (
    completionSchema?.domain === 'learning'
    || entry.goalType === 'study'
    || entry.goalType === 'exam'
    || entry.progressType === 'time_based'
  ) {
    return 'learning';
  }
  if (includesAny(`${captureText} ${entry.fields?.note ?? ''}`, STATE_KEYWORDS)) {
    return 'state';
  }
  return 'generic';
}

type ActionTranslation = {
  aliases: string[];
  zh: string;
  en: string;
};

const ACTION_TRANSLATIONS: ActionTranslation[] = [
  { aliases: ['bench press', '卧推'], zh: '卧推', en: 'Bench press' },
  { aliases: ['incline bench press', 'incline press', '上斜卧推'], zh: '上斜卧推', en: 'Incline bench press' },
  { aliases: ['decline bench press', '下斜卧推'], zh: '下斜卧推', en: 'Decline bench press' },
  { aliases: ['chest press', '器械推胸', '夹胸'], zh: '器械推胸', en: 'Chest press' },
  { aliases: ['chest fly', 'fly', '飞鸟'], zh: '飞鸟', en: 'Chest fly' },
  { aliases: ['dips', 'dip', '双杠臂屈伸', '双杠撑臂'], zh: '双杠臂屈伸', en: 'Dips' },
  { aliases: ['push-up', 'push up', 'pushup', '俯卧撑'], zh: '俯卧撑', en: 'Push-up' },
  { aliases: ['pull-up', 'pull up', 'pullup', '引体向上'], zh: '引体向上', en: 'Pull-up' },
  { aliases: ['lat pulldown', '高位下拉', '宽距高位下拉'], zh: '高位下拉', en: 'Lat pulldown' },
  { aliases: ['seated row', '坐姿划船'], zh: '坐姿划船', en: 'Seated row' },
  { aliases: ['row', 'rows', '划船'], zh: '划船', en: 'Row' },
  { aliases: ['face pull', '面拉'], zh: '面拉', en: 'Face pull' },
  { aliases: ['deadlift', '硬拉'], zh: '硬拉', en: 'Deadlift' },
  { aliases: ['shoulder press', 'overhead press', '肩上推举', '推举'], zh: '肩上推举', en: 'Shoulder press' },
  { aliases: ['lateral raise', '侧平举'], zh: '侧平举', en: 'Lateral raise' },
  { aliases: ['front raise', '前平举'], zh: '前平举', en: 'Front raise' },
  { aliases: ['rear delt fly', '俯身飞鸟', '后束飞鸟'], zh: '俯身飞鸟', en: 'Rear delt fly' },
  { aliases: ['arnold press', '阿诺德推举'], zh: '阿诺德推举', en: 'Arnold press' },
  { aliases: ['squat', '深蹲'], zh: '深蹲', en: 'Squat' },
  { aliases: ['romanian deadlift', '罗马尼亚硬拉'], zh: '罗马尼亚硬拉', en: 'Romanian deadlift' },
  { aliases: ['leg press', '腿举'], zh: '腿举', en: 'Leg press' },
  { aliases: ['practice', '练习', '刷题', '练习/刷题'], zh: '练习 / 刷题', en: 'Practice' },
  { aliases: ['project', '项目实战'], zh: '项目实战', en: 'Project work' },
  { aliases: ['debug', '调试'], zh: '调试', en: 'Debug' },
  { aliases: ['course', '课程学习'], zh: '课程学习', en: 'Course' },
  { aliases: ['review', '复习', '复盘', '复习/复盘'], zh: '复习 / 复盘', en: 'Review' },
  { aliases: ['read docs', '阅读文档'], zh: '阅读文档', en: 'Read docs' },
  { aliases: ['notes', '做笔记'], zh: '做笔记', en: 'Take notes' },
];

export function localizeCaptureActionLabel(value: string, lang: CaptureLanguage): string {
  const key = normalized(value);
  const translation = ACTION_TRANSLATIONS.find((item) => item.aliases.some((alias) => normalized(alias) === key));
  return translation?.[lang] ?? value;
}

export type CompactStrengthValues = {
  weight?: number;
  sets?: number;
  reps?: number;
  rpe?: number;
};

export function compactStrengthValues(entry: ParsedEntry): CompactStrengthValues {
  const fields: Record<string, any> = entry.fields ?? {};
  const baseWeight = Number.isFinite(Number(fields.weight))
    ? Number(fields.weight)
    : Number.isFinite(Number(fields.value))
      ? Number(fields.value)
      : Number.isFinite(Number(fields.extraWeight))
        ? Number(fields.extraWeight)
        : undefined;
  const rawSets: any = fields.sets;

  if (Array.isArray(rawSets) && rawSets.length > 0) {
    const first = rawSets[0] ?? {};
    const sameWeight = rawSets.every((set) => Number(set?.weight ?? baseWeight) === Number(first?.weight ?? baseWeight));
    const sameReps = rawSets.every((set) => Number(set?.reps) === Number(first?.reps));
    return {
      weight: sameWeight && Number.isFinite(Number(first?.weight ?? baseWeight)) ? Number(first?.weight ?? baseWeight) : baseWeight,
      sets: rawSets.reduce((sum, set) => sum + Math.max(1, Math.round(Number(set?.sets ?? set?.count ?? 1))), 0),
      reps: sameReps && Number.isFinite(Number(first?.reps)) ? Number(first.reps) : undefined,
      rpe: Number.isFinite(Number(first?.rpe ?? fields.rpe)) ? Number(first?.rpe ?? fields.rpe) : undefined,
    };
  }

  const compactMatch = typeof rawSets === 'string' ? rawSets.match(/(\d+)\s*[x×]\s*(\d+)/i) : null;
  return {
    weight: baseWeight,
    sets: Number.isFinite(Number(fields.sets)) ? Number(fields.sets) : compactMatch ? Number(compactMatch[1]) : undefined,
    reps: Number.isFinite(Number(fields.reps)) ? Number(fields.reps) : compactMatch ? Number(compactMatch[2]) : undefined,
    rpe: Number.isFinite(Number(fields.rpe)) ? Number(fields.rpe) : undefined,
  };
}

export function isConcreteExercise(entry: ParsedEntry, captureText: string): boolean {
  const generic = [
    '练胸', '练背', '练肩', '练腿', '练臂', '练臀', '健身', '训练',
    'workout', 'chest', 'back', 'shoulder', 'legs', 'arms', 'fitness',
  ];
  const name = normalized(entry.skillName);
  const isGenericName = generic.some((item) => normalized(item) === name);
  if (!isGenericName) return true;
  const strength = compactStrengthValues(entry);
  return strength.weight != null || strength.sets != null || strength.reps != null
    ? !includesAny(captureText, generic)
    : false;
}

export function uniqueLocalizedActions(actions: string[], lang: CaptureLanguage): Array<{ id: string; label: string; value: string }> {
  const seen = new Set<string>();
  return actions.flatMap((action) => {
    const label = localizeCaptureActionLabel(action, lang).trim();
    const key = normalized(label);
    if (!key || seen.has(key)) return [];
    seen.add(key);
    return [{ id: key, label, value: action.trim() }];
  });
}
