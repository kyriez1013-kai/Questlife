import type { Lang } from '../i18n';

const zh = {
  capture: '随手记一句…', state: '现在怎么样？', check: '记一下', supplement: '补充',
  now: '现在做什么', next: '接下来', suggest: '建议先做', recommend: '现在建议', running: '进行中',
  start: '开始', finish: '完成', log: '记录实际执行', more: '更多',
  evidence: '判断依据', update: '不是这样', recheck: '现在呢？', rule: '规则判断', records: '你的记录',
  plan: '后续安排', fullPlan: '完整日程', recent: '最近执行', history: '全部记录',
  noPlan: '今天还没有安排', noRecord: '记录一次真实执行，之后在这里回看。',
  adjust: '按建议调整', original: '照原计划', recover: '先恢复，再开始', dump: '先清空脑子 10 分钟',
  probe: '先做 5 分钟', confirmPlan: '调整只在你确认后应用', originalSaved: '已选择照原计划',
  saving: '保存中…', failed: '尚未保存成功，请重试', retry: '重试', cancel: '取消', close: '关闭',
  saved: '已保存到本机', minutes: '分钟', items: '项', done: '已做',
  alertness: '清醒度', cognitive: '认知负荷', emotional: '情绪压力', recovery: '身体恢复',
  sufficient: '依据充分', limited: '依据不足', missing: '没有数据', proxy: '目标切换是代理指标，不是直接测量',
  switches: '过去 3 小时的不同目标', used: '用到的信号', unused: '未用到的信号',
  originalReason: '规则原判保留；后续统计采用你的改正。', time: '签到时间',
  easier: '轻松', same: '差不多', harder: '更难', difficulty: '比预想', actualMinutes: '实际分钟', note: '可选一句备注',
  fields: '展开完整字段', required: '需要的状态', unknown: '未标注', deep_focus: '深度', light: '轻量', physical: '体力', recoveryDemand: '恢复', social: '社交',
  nextPlan: '下一次计划', criteria: '完成条件', weekly: '本周投入', project: '项目方向', ongoing: '持续方向',
  all: '全部方向', active: '进行中', completed: '已完成', search: '搜索', add: '添加',
  library: '技能库', modules: '模块与技能', criterionOpen: '未完成', criterionDone: '已完成',
  requiredHint: '给技能标上需要的状态，今日页才能判断现在适不适合做', dismiss: '知道了',
  shortcuts: '快捷指令', shortcutHealth: '通过 iOS 快捷指令同步（睡眠、步数、静息心率、HRV）',
  shortcutCalendar: '通过快捷指令同步日历', interpretation: '解读',
  adjustment: '调整建议', calibration: '预估与实际', calibrationNeed: '至少 10 条完整执行比较后显示描述',
  firstAction:'先记下一件事', firstReason:'从一条真实记录开始', record:'记下一句',
};
const en: Record<keyof typeof zh,string> = {
  firstAction:'Record one thing', firstReason:'Begin with one real observation', record:'Write a note',
  capture:'Write a quick note…',state:'How are you now?',check:'Check in',supplement:'Add context',
  now:'What to do now',next:'Up next',suggest:'Try this first',recommend:'Now suggested',running:'In progress',
  start:'Start',finish:'Finish',log:'Log actual work',more:'More',evidence:'Evidence',update:'Not quite',recheck:'And now?',rule:'Rule-based',records:'Your records',
  plan:'Later today',fullPlan:'Full schedule',recent:'Recent execution',history:'All records',noPlan:'Nothing scheduled today',noRecord:'Log real work to see it here.',
  adjust:'Review adjustment',original:'Keep original plan',recover:'Recover, then begin',dump:'Clear your mind for 10 min',probe:'Start with 5 minutes',
  confirmPlan:'Changes require your confirmation',originalSaved:'Original plan selected',saving:'Saving…',failed:'Not saved yet. Please retry.',retry:'Retry',cancel:'Cancel',close:'Close',saved:'Saved locally',minutes:'min',items:'items',done:'done',
  alertness:'Alertness',cognitive:'Cognitive load',emotional:'Emotional pressure',recovery:'Physical recovery',sufficient:'Supported inputs',limited:'Limited inputs',missing:'No data',proxy:'Goal switches are a proxy, not a direct measure',switches:'Distinct goals in the last 3 hours',used:'Inputs used',unused:'Inputs not used',originalReason:'The original rule is retained; summaries use your correction.',time:'Checked in',
  easier:'Easier',same:'As expected',harder:'Harder',difficulty:'Compared with expected',actualMinutes:'Actual minutes',note:'Optional note',fields:'Show all fields',required:'Required state',unknown:'Not tagged',deep_focus:'Deep focus',light:'Light',physical:'Physical',recoveryDemand:'Recovery',social:'Social',nextPlan:'Next scheduled',criteria:'Completion criteria',weekly:'This week',project:'Project',ongoing:'Ongoing',all:'All directions',active:'In progress',completed:'Completed',search:'Search',add:'Add',library:'Skill library',modules:'Modules and skills',criterionOpen:'Incomplete',criterionDone:'Completed',requiredHint:'Tag the state a skill needs so Today can check its fit.',dismiss:'Got it',shortcuts:'Shortcuts',shortcutHealth:'Sync with iOS Shortcuts (sleep, steps, resting heart rate, HRV)',shortcutCalendar:'Sync Calendar with Shortcuts',interpretation:'Interpretation',adjustment:'Adjustment suggestions',calibration:'Expected vs actual',calibrationNeed:'Descriptions appear after 10 complete execution comparisons',
};
export function v5t(lang: Lang, key: keyof typeof zh) { return (lang === 'en' ? en : zh)[key]; }
export function demandLabel(lang: Lang, key?: string) { return v5t(lang, key === 'recovery' ? 'recoveryDemand' : key && key in zh ? key as keyof typeof zh : 'unknown'); }
