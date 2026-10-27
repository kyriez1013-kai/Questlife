/**
 * v2 copy. Chinese first; English covers the core path and falls back to Chinese per key.
 * Tone rules: plain words, no internal jargon (no "S0/S2", "evidence stage", "terminal"); say what is missing.
 */
export type V2Lang = 'zh' | 'en';

const zh = {
  // tabs
  'tab.today': '今天', 'tab.schedule': '日程', 'tab.insights': '洞察', 'tab.me': '我的',

  // first use
  'fu.welcome.title': '记一句话，\n知道下一步该做什么。',
  'fu.welcome.body': '不用先建目标。回答 3 个小问题，马上得到今天的第一个建议。',
  'fu.welcome.start': '开始（约 30 秒）',
  'fu.welcome.sample': '先看看示例',
  'fu.welcome.privacy': '数据先存在这台设备里。云端 AI 默认关闭，不会悄悄上传。',
  'fu.q.title': '先说说今天',
  'fu.q.sleep': '昨晚睡得怎么样？',
  'fu.q.energy': '现在精力如何？',
  'fu.q.focus': '今天最想推进什么？',
  'fu.sleep.bad': '很差', 'fu.sleep.ok': '一般', 'fu.sleep.good': '不错',
  'fu.energy.low': '偏低', 'fu.energy.mid': '一般', 'fu.energy.high': '充足',
  'fu.focus.training': '训练', 'fu.focus.study': '学习', 'fu.focus.work': '工作', 'fu.focus.chores': '家务', 'fu.focus.recover': '恢复', 'fu.focus.other': '其他',
  'fu.q.submit': '看今天的建议',
  'fu.q.remaining': '还差 {n} 个回答',
  'fu.result.kicker': '今天的起点',
  'fu.result.basis': '依据：你刚才回答的 3 件事。还没有你的历史数据，所以这是通用建议，不是你的个人规律。',
  'fu.result.cta': '好，进入今天',
  'fu.result.saving': '正在保存…',
  'fu.result.saveFailed': '没保存成功。你的回答还在，再试一次。',
  'fu.result.retry': '重试',
  'fu.result.next': '之后：做完回来写一句话，今天页会更新。',
  'fu.back': '返回',
  'fu.skip': '先跳过',
  'fu.later.health': '想接入健康数据或日历，之后在「我的」里再选，不用现在决定。',

  // sample tour
  'sample.band': '示例数据 · 不是你的记录',
  'sample.exit': '退出示例，记录我自己的',
  'sample.today.title': '示例：第 7 天的「今天」',
  'sample.note': '下面的数字、结论都是虚构的，只用来演示 7 天后你会看到什么。',

  // today
  'today.title': '今天',
  'today.state.ask': '此刻感觉怎样？',
  'today.state.none': '今天还没记录状态',
  'today.state.logged': '今天状态',
  'today.state.update': '更新',
  'today.state.saved': '状态已保存到本机',
  'state.1': '很差', 'state.2': '较差', 'state.3': '一般', 'state.4': '不错', 'state.5': '极佳',
  'today.next.kicker': '下一步',
  'today.next.reason.default': '没有明确计划时，先记录一句真实发生的事。',
  'action.start': '开始', 'action.log': '记一笔', 'action.rescue': '先做 2 分钟', 'action.review_feedback': '看看刚才的记录',
  'action.finish_pending_capture': '完成待确认记录', 'action.create_goal': '写下今天要做的事',
  'today.done.log': '做完了，记一下',
  'composer.placeholder': '一句话记录：练了什么、读了什么、感觉如何',
  'composer.send': '记录',
  'composer.quick': '常记',
  'today.records': '今天的记录',
  'today.records.empty': '今天还没有记录。在上面写一句就行。',
  'today.actual': '实际',
  'today.missing': '未记录',
  'today.evidence.title': '你的数据能说明什么',
  'today.plan': '今日计划',
  'today.persist.failed': '有记录没保存成功',
  'today.persist.retry': '重试',

  // capture
  'cap.title': '确认这条记录',
  'cap.parsing': '正在理解这句话…',
  'cap.source.ai': '云端 AI 解析',
  'cap.source.local': '本地解析 · 请核对',
  'cap.source.manual': '手动填写',
  'cap.entry.action': '行动', 'cap.entry.state': '状态', 'cap.entry.note': '一句话',
  'cap.field.name': '动作', 'cap.field.minutes': '时长（分钟）', 'cap.field.weight': '重量 kg', 'cap.field.sets': '组数', 'cap.field.reps': '每组次数', 'cap.field.state': '状态',
  'cap.field.empty': '未填',
  'cap.field.emptyHint': '没填就是没记录，不会当作 0。',
  'cap.matched': '已归到：{name}',
  'cap.unmatched': '没有对应的动作，会作为一条独立记录保存。',
  'cap.save': '保存',
  'cap.saveN': '保存 {n} 条',
  'cap.saving': '正在保存…',
  'cap.cancel': '取消',
  'cap.saved': '已保存到本机',
  'cap.banner.offline': '当前离线：用本地解析。联网后可重新解析。',
  'cap.banner.aiOff': '云端 AI 未开启：用本地解析，请核对。',
  'cap.err.parse.title': '没能自动理解这句话',
  'cap.err.parse.body': '原文已经保存，不会丢。',
  'cap.err.parse.manual': '手动补全', 'cap.err.parse.retry': '再试一次', 'cap.err.parse.keep': '只保存原文',
  'cap.err.save.title': '没保存成功',
  'cap.err.save.body': '内容还在这里，没有丢。',
  'cap.err.save.retry': '重试', 'cap.err.save.copy': '复制文字', 'cap.err.save.later': '稍后处理',
  'cap.copied': '已复制',
  'cap.nothing': '没识别出可记录的内容。可以补一个动作名，或按原样保存。',
  'cap.add': '补一个动作',
  'cap.raw': '你写的',

  // badges
  'sync.saved': '已保存到本机', 'sync.pending': '正在保存…', 'sync.failed': '没保存成功',
  'ev.e0': '还没有结论', 'ev.e1': '仅观察', 'ev.e2': '可能有关联', 'ev.e3': '较稳定', 'ev.prior': '通用建议', 'ev.sample': '示例',
  'ev.association': '关联不等于因果',

  // insights / me skeleton
  'ins.title': '洞察',
  'ins.intro': '每条结论都标明可信程度，数据不够会直接告诉你还差什么。',
  'ins.advanced': '高级分析（原洞察终端）',
  'me.title': '我的',
  'me.goals': '目标与技能',
  'me.account': '账号与云端 AI',
  'me.language': '语言',
  'me.theme': '外观',
  'me.old': '切回旧版界面',
  'me.health': '健康数据与日历（以后再接）',
  'sched.title': '日程',
  'sched.empty': '今天没有日程。需要时再添加，不影响记录。',
  'sched.open': '打开完整日程',
};

export type V2Key = keyof typeof zh;

const en: Partial<Record<V2Key, string>> = {
  'tab.today': 'Today', 'tab.schedule': 'Schedule', 'tab.insights': 'Insights', 'tab.me': 'Me',
  'fu.welcome.title': 'Write one line.\nKnow what to do next.',
  'fu.welcome.body': 'No goals to set up first. Answer 3 quick questions and get a first suggestion for today.',
  'fu.welcome.start': 'Start (about 30 seconds)', 'fu.welcome.sample': 'See an example first',
  'fu.welcome.privacy': 'Data stays on this device. Cloud AI is off by default.',
  'fu.q.title': 'About today', 'fu.q.sleep': 'How did you sleep?', 'fu.q.energy': 'Energy right now?', 'fu.q.focus': 'What do you most want to move forward?',
  'fu.sleep.bad': 'Poor', 'fu.sleep.ok': 'OK', 'fu.sleep.good': 'Good', 'fu.energy.low': 'Low', 'fu.energy.mid': 'Medium', 'fu.energy.high': 'High',
  'fu.focus.training': 'Training', 'fu.focus.study': 'Study', 'fu.focus.work': 'Work', 'fu.focus.chores': 'Chores', 'fu.focus.recover': 'Recover', 'fu.focus.other': 'Other',
  'fu.q.submit': 'See today’s suggestion', 'fu.q.remaining': '{n} left to answer',
  'fu.result.kicker': 'Where to start today',
  'fu.result.basis': 'Based on your 3 answers. There is no history of yours yet, so this is general advice, not your personal pattern.',
  'fu.result.cta': 'Go to Today', 'fu.result.saving': 'Saving…', 'fu.result.saveFailed': 'Not saved. Your answers are still here — try again.', 'fu.result.retry': 'Retry',
  'fu.result.next': 'Afterwards, come back and write one line; Today will update.', 'fu.back': 'Back',
  'sample.band': 'Example data · not your records', 'sample.exit': 'Leave the example, record my own',
  'today.title': 'Today', 'today.state.ask': 'How do you feel right now?', 'today.state.none': 'No state logged today', 'today.state.logged': 'State today', 'today.state.update': 'Update',
  'state.1': 'Very low', 'state.2': 'Low', 'state.3': 'OK', 'state.4': 'Good', 'state.5': 'Great',
  'today.next.kicker': 'Next step',
  'action.start': 'Start', 'action.log': 'Log it', 'action.rescue': 'Do 2 minutes', 'action.review_feedback': 'See the last record', 'action.finish_pending_capture': 'Finish pending record', 'action.create_goal': 'Write down what to do today',
  'today.done.log': 'Done — log it',
  'composer.placeholder': 'One line: what you did, read, or how you feel', 'composer.send': 'Log', 'composer.quick': 'Frequent',
  'today.records': 'Today’s records', 'today.records.empty': 'Nothing logged yet today. One line above is enough.', 'today.missing': 'not recorded',
  'cap.title': 'Confirm this record', 'cap.parsing': 'Reading your line…', 'cap.source.ai': 'Cloud AI parse', 'cap.source.local': 'Local parse · please check', 'cap.source.manual': 'Manual',
  'cap.save': 'Save', 'cap.saving': 'Saving…', 'cap.cancel': 'Cancel', 'cap.saved': 'Saved on this device',
  'cap.err.save.title': 'Not saved', 'cap.err.save.body': 'Your text is still here.', 'cap.err.save.retry': 'Retry', 'cap.err.save.copy': 'Copy text', 'cap.err.save.later': 'Later',
  'sync.saved': 'Saved on this device', 'sync.pending': 'Saving…', 'sync.failed': 'Not saved',
  'ev.e0': 'No conclusion yet', 'ev.e1': 'Observation only', 'ev.e2': 'Possible link', 'ev.e3': 'Fairly stable', 'ev.prior': 'General advice', 'ev.sample': 'Example',
};

export function v2t(lang: V2Lang, key: V2Key, vars?: Record<string, string | number>): string {
  let s = (lang === 'en' ? en[key] : undefined) ?? zh[key] ?? key;
  if (vars) Object.entries(vars).forEach(([k, v]) => { s = s.replace(`{${k}}`, String(v)); });
  return s;
}
