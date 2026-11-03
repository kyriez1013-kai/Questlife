import type { ScienceRefId } from './actions';
import type { Band, Demand, OpenLoops, Pull, SignalId, StateActionId, StateTypeOrUnclear } from './types';

export type Lang = 'zh' | 'en';

const zh = {
  title: '现在怎么样？',
  energy: '精力', tension: '紧绷',
  energyLow: '没电', energyHigh: '很足', tensionLow: '很松', tensionHigh: '很紧',
  optional: '补充两项（可选）', optionalHint: '跳过也可以，跳过就记为没填',
  openLoopsQ: '脑子里挂着的事', pullQ: '对眼前这件事',
  saving: '保存中…', saveFailed: '没保存上', retry: '重试',
  stateNow: '现在的状态', ruleTag: '规则判断', generalTag: '通用依据', personalTag: '你的记录',
  notThis: '不是这样', pickType: '你觉得更像哪种？', corrected: '已按你的改正',
  alternate: '备选', reorder: '重排今天', recheck: '重新签到', coinFlip: '随机选一个',
  coinFlipNote: '随机分配，用来比较两种做法对你的效果',
  chosen: '已选', chosenRandom: '随机选中',
  noBaseline: '还没有你的基线（{n}/7 次）',
  personalBaseline: '按你过去 {n} 次的常态判断',
  notUsed: '没用到（没有数据）：{list}',
  personalCount: '做过 {n} 次', personalSummary: '对你来说：做过 {n} 次，其中 {up} 次精力回升、{down} 次紧绷下降',
  randomCount: '其中 {n} 次是随机分配',
  followUpTitle: '刚才「{action}」之后，现在怎么样？', followUpDismiss: '忽略', nextDoneQ: '下一件事做了吗？', yes: '做了', no: '没做',
  followUpSaved: '已记下，这次结果会算进「你的记录」',
  compactNote: '先完成上面这件事，状态建议之后再看',
  // brain dump
  bdTitle: '清空脑子', bdPrompt: '把挂着的事写下来，一行一件', bdPlaceholder: '比如：\n回老王邮件\n周报\n买猫粮',
  bdSplit: '下一步：逐条决定', bdNow: '现在做', bdSchedule: '排时间', bdDrop: '放下',
  bdPickTime: '什么时候？', bdCustomTime: '自己填 HH:MM', bdInvalidTime: '时间格式是 HH:MM，且要在现在之后',
  bdDone: '完成', bdSaved: '已记下 {n} 件：现在做 {now}，排时间 {schedule}，放下 {drop}',
  bdNeedsChoice: '每件都选一下再完成', bdPreviewSchedule: '确认把这些放进今天的日程', bdNoSlot: '今天没有空档了，改成自己填时间', bdScheduled: '已放进今天的日程：{n} 件',
  // reorder
  rpTitle: '重排今天（预览）', rpNothing: '今天剩下的安排已经是这个顺序，不用动',
  rpCantFit: '今天排不开，没有重排', rpConfirm: '确认重排', rpCancel: '先不改', rpApplied: '已重排',
  rpUndo: '撤销', rpUndone: '已撤销，恢复成原来的顺序', rpUndoFailed: '撤销失败：{reason}',
  rpInferred: '推断', rpFixedKept: '固定的安排不动', rpApplyFailed: '没改成：{reason}',
  rpOrderBasis: '按「{type}」的顺序：{order}',
  close: '关闭', cancel: '取消',
  // insights
  insTitle: '状态', insRange30: '30 天', insRange90: '90 天',
  insSummary: '过去 {days} 天：{parts}，记录了 {logged} 天', insNone: '这段时间还没有状态签到',
  insOutcomes: '动作结果（对你来说）', insOutcomesEmpty: '选过动作并回访后，这里会出现计数',
  insLag: '睡眠低于常态的次日', insLagLine: '睡眠低于常态的 {lowN} 个次日里，{lowFuel} 天是燃料不足；其余 {normN} 个次日里，{normFuel} 天',
  insLagNeedMore: '需要至少 10 组「前一晚睡眠 + 次日状态」才显示（现在 {n} 组）',
  insNoPredict: '这里只描述过去，不预测低谷。',
  coinFlipSetting: '状态层：抛硬币模式', coinFlipSettingHint: '首选和备选都合理时，允许随机选一个，并记录为随机分配。默认关闭。',
};

const en: typeof zh = {
  title: 'How are you right now?',
  energy: 'Energy', tension: 'Tension',
  energyLow: 'Drained', energyHigh: 'Full', tensionLow: 'Loose', tensionHigh: 'Tight',
  optional: 'Two more (optional)', optionalHint: 'Skipping is fine; skipped means not answered',
  openLoopsQ: 'Things on your mind', pullQ: 'About the task in front of you',
  saving: 'Saving…', saveFailed: 'Not saved', retry: 'Retry',
  stateNow: 'Your state now', ruleTag: 'Rule', generalTag: 'General evidence', personalTag: 'Your records',
  notThis: 'Not quite', pickType: 'Which fits better?', corrected: 'Using your correction',
  alternate: 'Or', reorder: 'Re-order today', recheck: 'Check in again', coinFlip: 'Pick one at random',
  coinFlipNote: 'Randomly assigned, to compare the two options for you',
  chosen: 'Picked', chosenRandom: 'Picked at random',
  noBaseline: 'No baseline of yours yet ({n}/7)',
  personalBaseline: 'Compared with your usual over {n} check-ins',
  notUsed: 'Not used (no data): {list}',
  personalCount: 'Done {n} times', personalSummary: 'For you: done {n} times; energy rose {up} times, tension fell {down} times',
  randomCount: '{n} of them randomly assigned',
  followUpTitle: 'After “{action}”, how are you now?', followUpDismiss: 'Dismiss', nextDoneQ: 'Did the next thing get done?', yes: 'Yes', no: 'No',
  followUpSaved: 'Saved; this counts toward “your records”',
  compactNote: 'Finish the item above first; state suggestions can wait',
  bdTitle: 'Clear your head', bdPrompt: 'Write down what is on your mind, one per line', bdPlaceholder: 'e.g.\nReply to Sam\nWeekly report\nBuy cat food',
  bdSplit: 'Next: decide each', bdNow: 'Do now', bdSchedule: 'Schedule', bdDrop: 'Drop',
  bdPickTime: 'When?', bdCustomTime: 'Type HH:MM', bdInvalidTime: 'Use HH:MM, later than now',
  bdDone: 'Done', bdSaved: 'Saved {n}: now {now}, scheduled {schedule}, dropped {drop}',
  bdNeedsChoice: 'Choose for each item first', bdPreviewSchedule: 'Confirm adding these to today', bdNoSlot: 'No free slots left today; type a time', bdScheduled: 'Added to today: {n}',
  rpTitle: 'Re-order today (preview)', rpNothing: 'The rest of today is already in this order',
  rpCantFit: 'Today does not fit; nothing re-ordered', rpConfirm: 'Confirm', rpCancel: 'Not now', rpApplied: 'Re-ordered',
  rpUndo: 'Undo', rpUndone: 'Undone; original order restored', rpUndoFailed: 'Undo failed: {reason}',
  rpInferred: 'inferred', rpFixedKept: 'Fixed items stay put', rpApplyFailed: 'Not changed: {reason}',
  rpOrderBasis: 'Order for “{type}”: {order}',
  close: 'Close', cancel: 'Cancel',
  insTitle: 'State', insRange30: '30 days', insRange90: '90 days',
  insSummary: 'Last {days} days: {parts}; logged {logged} days', insNone: 'No state check-ins in this period',
  insOutcomes: 'Action results (for you)', insOutcomesEmpty: 'Counts appear after you pick actions and answer follow-ups',
  insLag: 'Day after short sleep', insLagLine: 'Of {lowN} days after short sleep, {lowFuel} were low fuel; of the other {normN}, {normFuel}',
  insLagNeedMore: 'Needs at least 10 “night sleep + next-day state” pairs ({n} so far)',
  insNoPredict: 'This describes the past only; it does not predict dips.',
  coinFlipSetting: 'State layer: coin-flip mode', coinFlipSettingHint: 'When both options are reasonable, allow a random pick and record it as random. Off by default.',
};

export type CopyKey = keyof typeof zh;

export function sl(lang: Lang, key: CopyKey, vars?: Record<string, string | number>): string {
  let text = (lang === 'en' ? en : zh)[key];
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.split(`{${k}}`).join(String(v));
  return text;
}

export const TYPE_NAME: Record<Lang, Record<StateTypeOrUnclear, string>> = {
  zh: { calm_energy: '平静有劲', tense_energy: '紧绷有劲', low_fuel: '燃料不足', overload: '过载', low_arousal: '低唤醒 / 回避', unclear: '说不准' },
  en: { calm_energy: 'Calm energy', tense_energy: 'Tense energy', low_fuel: 'Low fuel', overload: 'Overloaded', low_arousal: 'Low arousal / avoiding', unclear: 'Unclear' },
};

export const TYPE_MEANING: Record<Lang, Record<StateTypeOrUnclear, string>> = {
  zh: {
    calm_energy: '深度工作窗口',
    tense_energy: '能推进，但容易冲；适合清单式执行，不适合做重大决定',
    low_fuel: '身体需要恢复',
    overload: '不是没电，是同时开了太多线程',
    low_arousal: '疲惫感是真的，但更可能在提示「这件事不值 / 不想做」，不是燃料耗尽',
    unclear: '信号不够或互相矛盾，不硬分类',
  },
  en: {
    calm_energy: 'A deep-work window',
    tense_energy: 'You can push, but may rush; good for checklists, not big decisions',
    low_fuel: 'Your body needs recovery',
    overload: 'Not out of energy — too many threads open at once',
    low_arousal: 'The tiredness is real, but more likely signals “not worth it / don’t want to”, not empty fuel',
    unclear: 'Not enough or conflicting signals; no forced label',
  },
};

export const ACTION_COPY: Record<Lang, Record<StateActionId, { title: string; body: string }>> = {
  zh: {
    hardest_first: { title: '把今天最难的事提前到现在', body: '先看重排预览，确认后才会改' },
    protect_time: { title: '保护这段时间', body: '接下来 25 分钟不切换、不看消息' },
    checklist_defer_decisions: { title: '做清单式任务，重大决定推迟', body: '先清一步能做完的事，拍板留到平静时' },
    brisk_walk_10: { title: '10 分钟快走', body: '出去走 10 分钟，回来再决定下一件' },
    downgrade_recover: { title: '降级任务，安排恢复', body: '难的往后放，今晚早睡；先看重排预览' },
    rest_20: { title: '休息 20 分钟以内', body: '躺下或闭眼，定 20 分钟闹钟' },
    brain_dump: { title: '清空脑子', body: '逐件选：现在做、排时间或放下' },
    probe_5: { title: '5 分钟试探', body: '只做 5 分钟，到点再决定继续还是换' },
    switch_env: { title: '换个环境，或换一件更想做的事', body: '换地方、换姿势，或先做更愿意做的' },
    follow_today: { title: '先做 Today 上那一步', body: '10 分钟后再看一次状态' },
    check_again: { title: '再签一次', body: '补充两项可选信息，可能就能分清' },
  },
  en: {
    hardest_first: { title: 'Move today’s hardest thing to now', body: 'Check the re-order preview; nothing changes until you confirm' },
    protect_time: { title: 'Protect this time', body: 'Next 25 minutes: no switching, no messages' },
    checklist_defer_decisions: { title: 'Do checklist tasks; postpone big decisions', body: 'Clear one-step items; leave decisions for a calmer state' },
    brisk_walk_10: { title: '10-minute brisk walk', body: 'Walk for 10 minutes, then decide what’s next' },
    downgrade_recover: { title: 'Downgrade tasks; plan recovery', body: 'Push hard items later, sleep earlier; see the re-order preview' },
    rest_20: { title: 'Rest up to 20 minutes', body: 'Lie down or close your eyes; set a 20-minute alarm' },
    brain_dump: { title: 'Clear your head', body: 'List what’s on your mind; for each choose: now / schedule / drop' },
    probe_5: { title: '5-minute probe', body: 'Do just 5 minutes, then decide to continue or switch' },
    switch_env: { title: 'Change place, or switch to something you want more', body: 'Move, change posture, or start something you’d rather do' },
    follow_today: { title: 'Do the next step on Today', body: 'Check your state again in 10 minutes' },
    check_again: { title: 'Check in again', body: 'Two optional answers may make it clearer' },
  },
};

export const SCIENCE_LINE: Record<Lang, Record<ScienceRefId, string>> = {
  zh: {
    thayer1987: 'Thayer 1987：10 分钟快走后，2 小时内自评精力更高、紧张更低（18 人，组内比较）',
    masicampo2011: 'Masicampo & Baumeister 2011：给没做完的事写出具体何时做，能减少它反复冒出来',
    kurzban2013: 'Kurzban 等 2013：费力感更像「机会成本」信号，不等于能量耗尽',
    marcora2009: 'Marcora 等 2009：心理疲劳主要改变的是主观费力感，生理指标无差异',
    loy2013: 'Loy 等 2013（元分析）：单次运动能提升精力感，但疲劳感平均没变；低强度休整更稳妥',
  },
  en: {
    thayer1987: 'Thayer 1987: after a 10-minute brisk walk, self-rated energy was higher and tension lower over 2 hours (n=18, within-person)',
    masicampo2011: 'Masicampo & Baumeister 2011: a specific when-plan for an unfinished task reduces intrusive thoughts',
    kurzban2013: 'Kurzban et al. 2013: felt effort works like an opportunity-cost signal, not an empty tank',
    marcora2009: 'Marcora et al. 2009: mental fatigue mainly changes perceived effort; physiology did not differ',
    loy2013: 'Loy et al. 2013 (meta-analysis): one bout of exercise lifts energy, but fatigue is unchanged on average; light recovery is safer',
  },
};

export const SIGNAL_NAME: Record<Lang, Record<SignalId, string>> = {
  zh: { energy: '精力', tension: '紧绷', open_loops: '挂着的事', pull: '对眼前这件事', sleep: '睡眠', sleep_self_rating: '睡眠自评', resting_hr: '静息心率', hrv: 'HRV', training: '昨天训练', schedule_load: '今天日程', time_block: '时段' },
  en: { energy: 'energy', tension: 'tension', open_loops: 'things on your mind', pull: 'the task in front of you', sleep: 'sleep', sleep_self_rating: 'sleep self-rating', resting_hr: 'resting HR', hrv: 'HRV', training: 'yesterday’s training', schedule_load: 'today’s schedule', time_block: 'time of day' },
};

export const OPEN_LOOPS_LABEL: Record<Lang, Record<OpenLoops, string>> = {
  zh: { none: '没有', few: '一两件', many: '很多、一团乱' },
  en: { none: 'None', few: 'One or two', many: 'Lots, a mess' },
};
export const PULL_LABEL: Record<Lang, Record<Pull, string>> = {
  zh: { want_cant: '想做但做不动', can_dont_want: '做得动但不想做', unsure: '说不清' },
  en: { want_cant: 'Want to, can’t', can_dont_want: 'Can, don’t want to', unsure: 'Not sure' },
};
export const DEMAND_LABEL: Record<Lang, Record<Demand, string>> = {
  zh: { deep: '深度', shallow: '浅', physical: '体力', recovery: '恢复', social: '社交' },
  en: { deep: 'Deep', shallow: 'Shallow', physical: 'Physical', recovery: 'Recovery', social: 'Social' },
};
export const BAND_WORD: Record<Lang, Record<Band, string>> = {
  zh: { low: '偏低', mid: '居中', high: '偏高' },
  en: { low: 'low', mid: 'mid', high: 'high' },
};

export const ENERGY_SCALE: Record<Lang, string[]> = {
  zh: ['没电', '偏少', '一般', '还行', '很足'],
  en: ['Drained', 'Low', 'OK', 'Good', 'Full'],
};
export const TENSION_SCALE: Record<Lang, string[]> = {
  zh: ['很松', '较松', '一般', '较紧', '很紧'],
  en: ['Loose', 'Easy', 'OK', 'Tight', 'Very tight'],
};
