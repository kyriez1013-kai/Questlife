import {
  Category,
  DomainRecordingField,
  DomainTemplate,
  DomainTemplateDomain,
  DomainTemplateSkill,
  GoalType,
  ProgressType,
  Skill,
  TaskType,
} from './types';

const strengthFields: DomainRecordingField[] = [
  { key: 'weight', label: 'Weight', labelZh: '重量', type: 'number', unit: 'kg', appliesToEffortRawKey: 'weight' },
  { key: 'sets', label: 'Sets', labelZh: '组数', type: 'number', appliesToEffortRawKey: 'sets' },
  { key: 'reps', label: 'Reps', labelZh: '次数', type: 'number', appliesToEffortRawKey: 'reps' },
  { key: 'rpe', label: 'RPE', labelZh: 'RPE', type: 'rating', appliesToEffortRawKey: 'rpe' },
  { key: 'quality', label: 'Quality', labelZh: '质量', type: 'rating', appliesToEffortRawKey: 'qualityRating' },
  { key: 'physicalCost', label: 'Physical Cost', labelZh: '体力消耗', type: 'rating', appliesToEffortRawKey: 'physicalCost' },
  { key: 'note', label: 'Note', labelZh: '备注', type: 'text' },
];

const studyFields: DomainRecordingField[] = [
  { key: 'durationMinutes', label: 'Duration', labelZh: '投入分钟', type: 'duration', appliesToEffortRawKey: 'durationMinutes' },
  { key: 'topic', label: 'Topic', labelZh: '主题', type: 'text' },
  { key: 'chapter', label: 'Chapter', labelZh: '章节', type: 'text' },
  { key: 'completedItems', label: 'Completed Items', labelZh: '完成项', type: 'number', appliesToEffortRawKey: 'completedItems' },
  { key: 'questionCount', label: 'Question Count', labelZh: '题目数', type: 'number', appliesToEffortRawKey: 'count' },
  { key: 'correctCount', label: 'Correct Count', labelZh: '正确数', type: 'number', appliesToEffortRawKey: 'score' },
  { key: 'understanding', label: 'Understanding', labelZh: '理解度', type: 'rating', appliesToEffortRawKey: 'qualityRating' },
  { key: 'difficulty', label: 'Difficulty', labelZh: '难度', type: 'rating', appliesToEffortRawKey: 'difficultyRating' },
  { key: 'mentalCost', label: 'Mental Cost', labelZh: '精神消耗', type: 'rating', appliesToEffortRawKey: 'mentalCost' },
  { key: 'note', label: 'Note', labelZh: '备注', type: 'text' },
];

const writingFields: DomainRecordingField[] = [
  { key: 'durationMinutes', label: 'Duration', labelZh: '投入分钟', type: 'duration', appliesToEffortRawKey: 'durationMinutes' },
  { key: 'section', label: 'Section', labelZh: '段落', type: 'select', options: [
    { value: 'intro', label: 'Intro', labelZh: '引言' },
    { value: 'body', label: 'Body', labelZh: '正文' },
    { value: 'conclusion', label: 'Conclusion', labelZh: '结论' },
    { value: 'references', label: 'References', labelZh: '引用' },
    { value: 'other', label: 'Other', labelZh: '其他' },
  ] },
  { key: 'wordCount', label: 'Word Count', labelZh: '字数', type: 'number', appliesToEffortRawKey: 'count' },
  { key: 'draftStage', label: 'Draft Stage', labelZh: '草稿阶段', type: 'select', options: [
    { value: 'outline', label: 'Outline', labelZh: '大纲' },
    { value: 'first_draft', label: 'First Draft', labelZh: '初稿' },
    { value: 'revision', label: 'Revision', labelZh: '修改' },
    { value: 'final', label: 'Final', labelZh: '定稿' },
  ] },
  { key: 'quality', label: 'Quality', labelZh: '质量', type: 'rating', appliesToEffortRawKey: 'qualityRating' },
  { key: 'difficulty', label: 'Difficulty', labelZh: '难度', type: 'rating', appliesToEffortRawKey: 'difficultyRating' },
  { key: 'mentalCost', label: 'Mental Cost', labelZh: '精神消耗', type: 'rating', appliesToEffortRawKey: 'mentalCost' },
  { key: 'note', label: 'Note', labelZh: '备注', type: 'text' },
];

const codingFields: DomainRecordingField[] = [
  { key: 'durationMinutes', label: 'Duration', labelZh: '投入分钟', type: 'duration', appliesToEffortRawKey: 'durationMinutes' },
  { key: 'workType', label: 'Work Type', labelZh: '工作类型', type: 'select', options: [
    { value: 'feature', label: 'Feature', labelZh: '功能' },
    { value: 'bug', label: 'Bug', labelZh: '修 bug' },
    { value: 'refactor', label: 'Refactor', labelZh: '重构' },
    { value: 'ui', label: 'UI', labelZh: '界面' },
    { value: 'backend', label: 'Backend', labelZh: '后端' },
    { value: 'data', label: 'Data', labelZh: '数据' },
    { value: 'testing', label: 'Testing', labelZh: '测试' },
    { value: 'deploy', label: 'Deploy', labelZh: '部署' },
    { value: 'docs', label: 'Docs', labelZh: '文档' },
  ] },
  { key: 'outputCount', label: 'Output Count', labelZh: '产出数量', type: 'number', appliesToEffortRawKey: 'count' },
  { key: 'completedFeature', label: 'Completed Feature', labelZh: '完成内容', type: 'text' },
  { key: 'quality', label: 'Quality', labelZh: '质量', type: 'rating', appliesToEffortRawKey: 'qualityRating' },
  { key: 'difficulty', label: 'Difficulty', labelZh: '难度', type: 'rating', appliesToEffortRawKey: 'difficultyRating' },
  { key: 'mentalCost', label: 'Mental Cost', labelZh: '精神消耗', type: 'rating', appliesToEffortRawKey: 'mentalCost' },
  { key: 'note', label: 'Note', labelZh: '备注', type: 'text' },
];

const lifeFields: DomainRecordingField[] = [
  { key: 'durationMinutes', label: 'Duration', labelZh: '投入分钟', type: 'duration', appliesToEffortRawKey: 'durationMinutes' },
  { key: 'taskCount', label: 'Task Count', labelZh: '任务数', type: 'number', appliesToEffortRawKey: 'count' },
  { key: 'completed', label: 'Completed', labelZh: '已完成', type: 'boolean' },
  { key: 'energyCost', label: 'Energy Cost', labelZh: '能量消耗', type: 'rating', appliesToEffortRawKey: 'mentalCost' },
  { key: 'quality', label: 'Quality', labelZh: '质量', type: 'rating', appliesToEffortRawKey: 'qualityRating' },
  { key: 'note', label: 'Note', labelZh: '备注', type: 'text' },
];

const recoveryFields: DomainRecordingField[] = [
  { key: 'durationMinutes', label: 'Duration', labelZh: '投入分钟', type: 'duration', appliesToEffortRawKey: 'durationMinutes' },
  { key: 'beforeState', label: 'Before State', labelZh: '前状态', type: 'rating' },
  { key: 'afterState', label: 'After State', labelZh: '后状态', type: 'rating', appliesToEffortRawKey: 'score' },
  { key: 'recoveryEffect', label: 'Recovery Effect', labelZh: '恢复效果', type: 'rating', appliesToEffortRawKey: 'qualityRating' },
  { key: 'fatigue', label: 'Fatigue', labelZh: '疲劳', type: 'rating', appliesToEffortRawKey: 'difficultyRating' },
  { key: 'physicalCost', label: 'Physical Cost', labelZh: '体力消耗', type: 'rating', appliesToEffortRawKey: 'physicalCost' },
  { key: 'note', label: 'Note', labelZh: '备注', type: 'text' },
];

const financeFields: DomainRecordingField[] = [
  { key: 'amount', label: 'Amount', labelZh: '金额', type: 'number', appliesToEffortRawKey: 'amount' },
  { key: 'category', label: 'Category', labelZh: '类别', type: 'select', options: [
    { value: 'income', label: 'Income', labelZh: '收入' },
    { value: 'expense', label: 'Expense', labelZh: '支出' },
    { value: 'saving', label: 'Saving', labelZh: '储蓄' },
    { value: 'investment', label: 'Investment', labelZh: '投资' },
    { value: 'budget', label: 'Budget', labelZh: '预算' },
  ] },
  { key: 'durationMinutes', label: 'Duration', labelZh: '投入分钟', type: 'duration', appliesToEffortRawKey: 'durationMinutes' },
  { key: 'decisionQuality', label: 'Decision Quality', labelZh: '决策质量', type: 'rating', appliesToEffortRawKey: 'qualityRating' },
  { key: 'note', label: 'Note', labelZh: '备注', type: 'text' },
];

function skill(
  id: string,
  moduleTemplateId: string,
  name: string,
  nameZh: string,
  taskType: TaskType,
  metricType: ProgressType,
  recordingFieldKeys: string[],
  defaultDurationMinutes = 30,
  unit?: string,
): DomainTemplateSkill {
  return { id, moduleTemplateId, name, nameZh, taskType, progressType: metricType, metricType, defaultDurationMinutes, unit, recordingFieldKeys };
}

export const DOMAIN_TEMPLATES: DomainTemplate[] = [
  {
    id: 'tpl-fitness-strength-v1',
    name: 'Strength Training',
    nameZh: '力量训练',
    description: 'Build strength with comparable lifts and volume.',
    descriptionZh: '用动作、重量、组数、次数和容量追踪力量进步。',
    domain: 'fitness_strength',
    goalTypes: ['fitness'],
    defaultModules: [
      { id: 'push', name: 'Push', nameZh: '推力', iconKey: 'dumbbell' },
      { id: 'pull', name: 'Pull', nameZh: '拉力', iconKey: 'activity' },
      { id: 'legs', name: 'Legs', nameZh: '腿部', iconKey: 'dumbbell' },
      { id: 'recovery', name: 'Recovery', nameZh: '恢复', iconKey: 'leaf' },
    ],
    defaultSkills: [
      skill('bench_press', 'push', 'Bench Press', '卧推', 'strength_training', 'performance_log', ['weight', 'sets', 'reps', 'rpe', 'quality', 'physicalCost', 'note'], 60, 'kg'),
      skill('overhead_press', 'push', 'Overhead Press', '推举', 'strength_training', 'performance_log', ['weight', 'sets', 'reps', 'rpe', 'quality', 'physicalCost', 'note'], 45, 'kg'),
      skill('row', 'pull', 'Row', '划船', 'strength_training', 'performance_log', ['weight', 'sets', 'reps', 'rpe', 'quality', 'physicalCost', 'note'], 45, 'kg'),
      skill('deadlift', 'pull', 'Deadlift', '硬拉', 'strength_training', 'performance_log', ['weight', 'sets', 'reps', 'rpe', 'quality', 'physicalCost', 'note'], 60, 'kg'),
      skill('squat', 'legs', 'Squat', '深蹲', 'strength_training', 'performance_log', ['weight', 'sets', 'reps', 'rpe', 'quality', 'physicalCost', 'note'], 60, 'kg'),
      skill('recovery', 'recovery', 'Recovery', '恢复', 'cardio_recovery', 'state_based', ['durationMinutes', 'beforeState', 'afterState', 'recoveryEffect', 'fatigue', 'note'], 20),
    ],
    defaultProgressModel: 'goal_criteria_weighted',
    defaultScheduleHint: { frequencyPerWeek: 4, suggestedSessionMinutes: 60, preferredCadence: 'weekly', restDaysRecommended: true },
    defaultOutcomeCriteria: [
      { id: 'main_lift', label: 'Main lift target', labelZh: '主项目标', metricType: 'performance_log', weight: 60 },
      { id: 'consistency', label: 'Training consistency', labelZh: '训练稳定性', metricType: 'frequency', targetValue: 4, unit: 'times/week', weight: 40 },
    ],
    effortMapping: { defaultEffortType: 'strength_training', defaultMetricFamily: 'strength', comparableStrategy: 'same_exercise' },
    recordingSchema: strengthFields,
    contributionHints: { directTargets: ['skill', 'module', 'goal'], indirectTargets: ['module', 'goal'], supportingTargets: ['push', 'pull', 'legs'] },
    version: 1,
  },
  {
    id: 'tpl-fitness-physique-v1',
    name: 'Physique Building',
    nameZh: '体型塑造',
    description: 'Track muscle groups, nutrition consistency, and recovery.',
    descriptionZh: '围绕部位训练、营养稳定和恢复追踪体型变化。',
    domain: 'fitness_physique',
    goalTypes: ['fitness', 'health'],
    defaultModules: ['Chest|胸部', 'Back|背部', 'Shoulders|肩部', 'Arms|手臂', 'Legs|腿部', 'Nutrition|营养', 'Recovery|恢复'].map((row) => {
      const [name, nameZh] = row.split('|');
      return { id: name.toLowerCase(), name, nameZh };
    }),
    defaultSkills: [
      skill('chest_training', 'chest', 'Chest Training', '胸部训练', 'strength_training', 'performance_log', ['durationMinutes', 'exerciseName', 'sets', 'reps', 'pump', 'quality', 'physicalCost', 'nutritionQuality', 'bodyweight'], 50),
      skill('back_training', 'back', 'Back Training', '背部训练', 'strength_training', 'performance_log', ['durationMinutes', 'exerciseName', 'sets', 'reps', 'pump', 'quality', 'physicalCost'], 50),
      skill('nutrition_consistency', 'nutrition', 'Nutrition Consistency', '营养稳定', 'life_maintenance', 'frequency', ['quality', 'nutritionQuality', 'bodyweight', 'note'], 10),
      skill('sleep_recovery', 'recovery', 'Sleep / Recovery', '睡眠 / 恢复', 'cardio_recovery', 'state_based', ['durationMinutes', 'beforeState', 'afterState', 'recoveryEffect', 'fatigue'], 20),
    ],
    defaultProgressModel: 'module_average',
    effortMapping: { defaultEffortType: 'strength_training', defaultMetricFamily: 'volume', comparableStrategy: 'same_skill' },
    recordingSchema: [...strengthFields, { key: 'pump', label: 'Pump', labelZh: '泵感', type: 'rating' }, { key: 'nutritionQuality', label: 'Nutrition Quality', labelZh: '营养质量', type: 'rating' }, { key: 'bodyweight', label: 'Bodyweight', labelZh: '体重', type: 'number', unit: 'kg' }],
    contributionHints: { directTargets: ['skill', 'module'], indirectTargets: ['goal'] },
    version: 1,
  },
  {
    id: 'tpl-study-course-v1',
    name: 'Course Study',
    nameZh: '课程学习',
    description: 'Study concepts, practice, review, and application.',
    descriptionZh: '按概念、练习、复习和应用搭建学习路径。',
    domain: 'study_course',
    goalTypes: ['study', 'career'],
    defaultModules: ['Concepts|概念', 'Practice|练习', 'Review|复习', 'Application|应用'].map((row) => {
      const [name, nameZh] = row.split('|');
      return { id: name.toLowerCase(), name, nameZh };
    }),
    defaultSkills: [
      skill('lecture_study', 'concepts', 'Lecture Study', '课程学习', 'deep_study', 'time_based', ['durationMinutes', 'topic', 'chapter', 'understanding', 'quality', 'difficulty', 'mentalCost', 'note'], 45),
      skill('reading', 'concepts', 'Reading', '阅读', 'deep_study', 'time_based', ['durationMinutes', 'topic', 'chapter', 'understanding', 'quality', 'note'], 45),
      skill('practice_questions', 'practice', 'Practice Questions', '练习题', 'deep_study', 'checklist', ['durationMinutes', 'topic', 'questionCount', 'correctCount', 'understanding', 'difficulty', 'note'], 40),
      skill('notes', 'review', 'Notes', '笔记', 'light_review', 'time_based', ['durationMinutes', 'topic', 'chapter', 'completedItems', 'quality'], 25),
      skill('mini_project', 'application', 'Mini Project', '小项目', 'creative_building', 'checklist', ['durationMinutes', 'topic', 'completedItems', 'quality', 'difficulty'], 60),
    ],
    defaultProgressModel: 'module_average',
    effortMapping: { defaultEffortType: 'study_session', defaultMetricFamily: 'time', comparableStrategy: 'same_topic' },
    recordingSchema: studyFields,
    contributionHints: { directTargets: ['skill', 'module'], indirectTargets: ['goal'] },
    version: 1,
  },
  {
    id: 'tpl-exam-prep-v1',
    name: 'Exam Prep',
    nameZh: '考试准备',
    description: 'Cover topics, practice questions, mock exams, and weak areas.',
    descriptionZh: '覆盖知识点、做题、错题复盘、模拟考试和薄弱点。',
    domain: 'exam_prep',
    goalTypes: ['exam', 'study'],
    defaultModules: ['Topic Coverage|知识点覆盖', 'Practice|做题', 'Mistake Review|错题复盘', 'Mock Exam|模拟考试', 'Memory|记忆'].map((row) => {
      const [name, nameZh] = row.split('|');
      return { id: name.toLowerCase().replace(/\s+/g, '_'), name, nameZh };
    }),
    defaultSkills: [
      skill('topic_review', 'topic_coverage', 'Topic Review', '知识点复习', 'deep_study', 'time_based', ['durationMinutes', 'topic', 'confidence', 'quality', 'difficulty', 'mentalCost'], 45),
      skill('practice_questions', 'practice', 'Practice Questions', '练习题', 'deep_study', 'checklist', ['durationMinutes', 'topic', 'questionCount', 'correctCount', 'weakArea', 'confidence', 'difficulty'], 45),
      skill('wrong_questions', 'mistake_review', 'Wrong Questions', '错题复盘', 'light_review', 'checklist', ['durationMinutes', 'topic', 'questionCount', 'weakArea', 'confidence'], 30),
      skill('mock_exam', 'mock_exam', 'Mock Exam', '模拟考试', 'deep_study', 'target_value', ['durationMinutes', 'topic', 'mockScore', 'confidence', 'quality'], 90),
    ],
    defaultProgressModel: 'goal_criteria_weighted',
    effortMapping: { defaultEffortType: 'practice_reps', defaultMetricFamily: 'score', comparableStrategy: 'same_topic' },
    recordingSchema: [...studyFields, { key: 'mockScore', label: 'Mock Score', labelZh: '模拟分数', type: 'number', appliesToEffortRawKey: 'score' }, { key: 'weakArea', label: 'Weak Area', labelZh: '薄弱点', type: 'text' }, { key: 'confidence', label: 'Confidence', labelZh: '信心', type: 'rating' }],
    contributionHints: { directTargets: ['skill', 'module', 'goal'], indirectTargets: ['goal'] },
    version: 1,
  },
  {
    id: 'tpl-writing-assignment-v1',
    name: 'Writing Assignment',
    nameZh: '写作作业',
    description: 'Move from research to outline, draft, revision, and finalisation.',
    descriptionZh: '从资料、大纲、初稿、修改到定稿推进写作任务。',
    domain: 'writing_assignment',
    goalTypes: ['study', 'project'],
    defaultModules: ['Research|资料', 'Outline|大纲', 'Draft|初稿', 'Revision|修改', 'Finalisation|定稿'].map((row) => {
      const [name, nameZh] = row.split('|');
      return { id: name.toLowerCase(), name, nameZh };
    }),
    defaultSkills: [
      skill('research_notes', 'research', 'Research Notes', '资料笔记', 'deep_study', 'time_based', ['durationMinutes', 'section', 'quality', 'mentalCost', 'note'], 40),
      skill('argument_building', 'outline', 'Argument Building', '论点搭建', 'creative_building', 'checklist', ['durationMinutes', 'section', 'completedItems', 'quality', 'difficulty'], 40),
      skill('writing', 'draft', 'Writing', '写作', 'creative_building', 'target_value', ['durationMinutes', 'section', 'wordCount', 'draftStage', 'quality', 'difficulty'], 50),
      skill('editing', 'revision', 'Editing', '修改', 'light_review', 'checklist', ['durationMinutes', 'section', 'wordCount', 'draftStage', 'quality'], 35),
    ],
    defaultProgressModel: 'module_average',
    effortMapping: { defaultEffortType: 'project_progress', defaultMetricFamily: 'items', comparableStrategy: 'same_section' },
    recordingSchema: writingFields,
    contributionHints: { directTargets: ['skill', 'module'], indirectTargets: ['goal'] },
    version: 1,
  },
  {
    id: 'tpl-coding-project-v1',
    name: 'Coding Project',
    nameZh: '编程项目',
    description: 'Ship a project through planning, implementation, testing, and deployment.',
    descriptionZh: '围绕规划、前端、后端、数据、测试和部署推进项目。',
    domain: 'coding_project',
    goalTypes: ['project', 'career', 'study'],
    defaultModules: ['Planning|规划', 'Frontend|前端', 'Backend|后端', 'Data|数据', 'Testing|测试', 'Deployment|部署'].map((row) => {
      const [name, nameZh] = row.split('|');
      return { id: name.toLowerCase(), name, nameZh };
    }),
    defaultSkills: [
      skill('feature_building', 'frontend', 'Feature Building', '功能开发', 'creative_building', 'time_based', ['durationMinutes', 'workType', 'outputCount', 'completedFeature', 'quality', 'difficulty', 'mentalCost'], 60),
      skill('bug_fixing', 'testing', 'Bug Fixing', '修复 Bug', 'creative_building', 'checklist', ['durationMinutes', 'workType', 'outputCount', 'quality', 'difficulty'], 40),
      skill('data_model', 'data', 'Data Model', '数据模型', 'creative_building', 'checklist', ['durationMinutes', 'workType', 'completedFeature', 'quality', 'difficulty'], 50),
      skill('deployment', 'deployment', 'Deployment', '发布部署', 'admin', 'binary', ['durationMinutes', 'workType', 'completedFeature', 'quality'], 30),
    ],
    defaultProgressModel: 'module_average',
    effortMapping: { defaultEffortType: 'project_progress', defaultMetricFamily: 'time', comparableStrategy: 'same_project_area' },
    recordingSchema: codingFields,
    contributionHints: { directTargets: ['skill', 'module'], indirectTargets: ['goal'] },
    version: 1,
  },
  {
    id: 'tpl-life-maintenance-v1',
    name: 'Life Maintenance',
    nameZh: '生活维护',
    description: 'Keep life stable through small recurring maintenance actions.',
    descriptionZh: '用小而稳定的生活动作维持秩序。',
    domain: 'life_maintenance',
    goalTypes: ['health', 'custom'],
    defaultModules: ['Cleaning|清洁', 'Admin|行政', 'Errands|杂事', 'Organisation|整理', 'Routine|生活节奏'].map((row) => {
      const [name, nameZh] = row.split('|');
      return { id: name.toLowerCase(), name, nameZh };
    }),
    defaultSkills: [
      skill('cleaning', 'cleaning', 'Cleaning', '清洁', 'life_maintenance', 'frequency', ['durationMinutes', 'taskCount', 'completed', 'energyCost', 'quality'], 20),
      skill('laundry', 'routine', 'Laundry', '洗衣', 'life_maintenance', 'frequency', ['durationMinutes', 'completed', 'energyCost'], 20),
      skill('admin_tasks', 'admin', 'Admin Tasks', '行政事务', 'admin', 'checklist', ['durationMinutes', 'taskCount', 'completed', 'energyCost', 'quality'], 25),
      skill('planning', 'organisation', 'Planning', '计划整理', 'admin', 'time_based', ['durationMinutes', 'taskCount', 'quality'], 20),
    ],
    defaultProgressModel: 'module_average',
    effortMapping: { defaultEffortType: 'life_maintenance', defaultMetricFamily: 'frequency', comparableStrategy: 'same_skill' },
    recordingSchema: lifeFields,
    contributionHints: { directTargets: ['skill', 'module'], indirectTargets: ['goal'] },
    version: 1,
  },
  {
    id: 'tpl-recovery-health-v1',
    name: 'Recovery Health',
    nameZh: '恢复健康',
    description: 'Track sleep, low stimulation rest, light movement, and state shifts.',
    descriptionZh: '追踪睡眠、轻运动、低刺激休息和状态变化。',
    domain: 'recovery_health',
    goalTypes: ['health', 'fitness'],
    defaultModules: ['Sleep|睡眠', 'Light Movement|轻运动', 'Stress Regulation|压力调节', 'Nutrition|营养', 'Rest|休息'].map((row) => {
      const [name, nameZh] = row.split('|');
      return { id: name.toLowerCase().replace(/\s+/g, '_'), name, nameZh };
    }),
    defaultSkills: [
      skill('sleep', 'sleep', 'Sleep', '睡眠', 'cardio_recovery', 'state_based', ['durationMinutes', 'beforeState', 'afterState', 'recoveryEffect', 'fatigue'], 480),
      skill('walk', 'light_movement', 'Walk', '散步', 'cardio_recovery', 'frequency', ['durationMinutes', 'beforeState', 'afterState', 'recoveryEffect', 'physicalCost'], 20),
      skill('breathing', 'stress_regulation', 'Breathing', '呼吸练习', 'cardio_recovery', 'frequency', ['durationMinutes', 'beforeState', 'afterState', 'recoveryEffect'], 5),
      skill('low_stimulation_rest', 'rest', 'Low Stimulation Rest', '低刺激休息', 'cardio_recovery', 'state_based', ['durationMinutes', 'beforeState', 'afterState', 'recoveryEffect', 'fatigue'], 20),
    ],
    defaultProgressModel: 'module_average',
    effortMapping: { defaultEffortType: 'recovery_action', defaultMetricFamily: 'state_shift', comparableStrategy: 'same_skill' },
    recordingSchema: recoveryFields,
    contributionHints: { directTargets: ['skill'], indirectTargets: ['module', 'goal'] },
    version: 1,
  },
  {
    id: 'tpl-finance-tracking-v1',
    name: 'Finance Tracking',
    nameZh: '财务追踪',
    description: 'Track income, spending, saving, investing, and budget reviews.',
    descriptionZh: '追踪收入、支出、储蓄、投资和预算复盘。',
    domain: 'finance_tracking',
    goalTypes: ['finance'],
    defaultModules: ['Income|收入', 'Spending|支出', 'Saving|储蓄', 'Investing|投资', 'Budget Review|预算复盘'].map((row) => {
      const [name, nameZh] = row.split('|');
      return { id: name.toLowerCase().replace(/\s+/g, '_'), name, nameZh };
    }),
    defaultSkills: [
      skill('income_tracking', 'income', 'Income Tracking', '收入追踪', 'admin', 'money_based', ['amount', 'category', 'decisionQuality', 'note'], 10),
      skill('expense_tracking', 'spending', 'Expense Tracking', '支出追踪', 'admin', 'money_based', ['amount', 'category', 'decisionQuality', 'note'], 10),
      skill('saving_deposit', 'saving', 'Saving Deposit', '储蓄存入', 'admin', 'money_based', ['amount', 'category', 'decisionQuality'], 10),
      skill('budget_review', 'budget_review', 'Budget Review', '预算复盘', 'deep_study', 'time_based', ['durationMinutes', 'category', 'decisionQuality', 'note'], 25),
    ],
    defaultProgressModel: 'module_average',
    effortMapping: { defaultEffortType: 'project_progress', defaultMetricFamily: 'money', comparableStrategy: 'same_skill' },
    recordingSchema: financeFields,
    contributionHints: { directTargets: ['skill', 'module'], indirectTargets: ['goal'] },
    version: 1,
  },
];

export function getDomainTemplateByDomain(domain?: DomainTemplateDomain) {
  return DOMAIN_TEMPLATES.find((template) => template.domain === domain);
}

export function getDomainTemplatesByGoalType(goalType?: GoalType | string) {
  return DOMAIN_TEMPLATES.filter((template) => template.goalTypes.includes(goalType || 'custom'));
}

export function getDefaultTemplateForGoalType(goalType?: GoalType | string) {
  const direct = getDomainTemplatesByGoalType(goalType)[0];
  if (direct) return direct;
  if (goalType === 'project') return getDomainTemplateByDomain('coding_project');
  if (goalType === 'health') return getDomainTemplateByDomain('recovery_health');
  return getDomainTemplateByDomain('custom');
}

export function getRecordingFieldsForSkill(skill?: Pick<Skill, 'domainTemplateId' | 'recordingFieldKeys'>) {
  if (!skill?.domainTemplateId || !skill.recordingFieldKeys?.length) return [];
  const template = DOMAIN_TEMPLATES.find((item) => item.id === skill.domainTemplateId);
  if (!template) return [];
  const wanted = new Set(skill.recordingFieldKeys);
  return template.recordingSchema.filter((field) => wanted.has(field.key));
}

export function templateProgressModel(template: DomainTemplate) {
  if (template.defaultProgressModel === 'goal_criteria_weighted') return 'criteria_weighted' as const;
  return template.defaultProgressModel;
}

export function createGoalStructureFromTemplate(template: DomainTemplate, goalInput: { id: string; language?: 'zh' | 'en' }) {
  const moduleIdFor = (moduleTemplateId: string) => `module-${goalInput.id}-${template.id}-${moduleTemplateId}`;
  const skillIdFor = (skillTemplateId: string) => `skill-${goalInput.id}-${template.id}-${skillTemplateId}`;
  return {
    modules: template.defaultModules.map((module, index) => ({
      id: moduleIdFor(module.id),
      goalId: goalInput.id,
      name: goalInput.language === 'en' ? module.name : module.nameZh,
      icon: module.iconKey,
      description: goalInput.language === 'en' ? module.description : module.descriptionZh,
      order: index,
      createdFromTemplateId: template.id,
      moduleTemplateId: module.id,
    })),
    skills: template.defaultSkills.map((item) => ({
      id: skillIdFor(item.id),
      name: goalInput.language === 'en' ? item.name : item.nameZh,
      icon: item.iconKey,
      color: '#38bdf8',
      dailyTargetMinutes: item.defaultDurationMinutes ?? template.defaultScheduleHint?.suggestedSessionMinutes ?? 30,
      categoryId: goalInput.id,
      goalId: goalInput.id,
      linkedGoalIds: [goalInput.id],
      taskType: item.taskType as TaskType | undefined,
      progressType: (item.progressType ?? item.metricType ?? 'time_based') as ProgressType,
      metricConfig: {
        metricType: (item.metricType ?? item.progressType ?? 'time_based') as ProgressType,
        targetValue: item.targetValue,
        unit: item.unit,
        performanceType: item.taskType === 'strength_training' ? 'strength' : undefined,
        primaryMetric: item.taskType === 'strength_training' ? 'weight' : undefined,
      },
      defaultDurationMinutes: item.defaultDurationMinutes ?? template.defaultScheduleHint?.suggestedSessionMinutes ?? 30,
      unit: item.unit,
      targetValue: item.targetValue,
      scheduleEnabled: false,
      scheduleType: 'manual_only' as const,
      domainTemplateId: template.id,
      createdFromTemplateId: template.id,
      skillTemplateId: item.id,
      recordingFieldKeys: item.recordingFieldKeys,
      moduleTemplateId: item.moduleTemplateId,
    })),
    links: template.defaultSkills.map((item, index) => ({
      id: `link-${goalInput.id}-${template.id}-${item.moduleTemplateId ?? 'default'}-${item.id}`,
      goalId: goalInput.id,
      moduleId: moduleIdFor(item.moduleTemplateId ?? template.defaultModules[0]?.id ?? 'default'),
      skillId: skillIdFor(item.id),
      role: 'primary' as const,
      order: index,
    })),
  };
}
