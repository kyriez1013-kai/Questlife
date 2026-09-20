import type { ShortcutRoute } from './intent';
const copy: Record<ShortcutRoute, { zh: string; en: string }> = {
  capture: { zh: '记录一句话', en: 'Capture a note' },
  state: { zh: '记录当前状态', en: 'Check in' },
  history: { zh: '活动历史', en: 'Activity history' },
  decision: { zh: '查看今日行动', en: 'Today action' },
  plan: { zh: '查看当前计划', en: 'Current plan' },
};
export const shortcutLabel = (lang: string, route: ShortcutRoute) => copy[route][lang === 'zh' ? 'zh' : 'en'];
