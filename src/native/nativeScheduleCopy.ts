const copy = {
  actions: ['日程操作', 'Block actions'],
  move: ['移动安排', 'Move block'],
  moveReview: ['移动前请检查目标日期的空档与冲突。', 'Review the destination date and conflicts before saving.'],
  locked: ['固定或已锁定安排，不参与快捷移动。', 'Fixed or locked placement. Quick move is unavailable.'],
  historical: ['已完成或已跳过的安排保留原日期、时间和状态。', 'Completed or skipped blocks keep their date, time and status.'],
  generated: ['技能规则生成的安排，尚未单独保存。', 'Generated from a skill rule; not a separately saved block.'],
  external: ['外部日历约束，只读', 'External calendar constraint, read-only'],
  free: ['未安排时间', 'Unscheduled time'],
  longest: ['最长连续空档', 'Longest free window'],
  window: ['统计时段', 'Planning window'],
  conflicts: ['时间冲突', 'Time conflicts'],
  noConflicts: ['当前已载入安排中无时间冲突', 'No conflicts in loaded blocks'],
  calendarCoverage: ['外部日历按已导入的事件检查；未导入的日期或事件不在此范围内。', 'Calendar checks cover imported events only; unimported dates or events are not included.'],
  saveFailed: ['未能确认保存，请重试。表单内容已保留。', 'Could not confirm the save. Your draft is still here; retry.'],
  logRetry: ['重试保存记录', 'Retry saving record'],
  logPending: ['记录待确认，请重试原记录；不会重复创建。', 'Record confirmation is pending. Retry the same record without creating a duplicate.'],
  reviewAgain: ['安排或冲突已变化，请重新检查并保存。', 'The plan or conflicts changed. Review and save again.'],
  retry: ['重试保存', 'Retry save'],
  lastImport: ['上次导入', 'Last import'],
  unavailablePlan: ['此安排已不存在；未提交新的日历写入。', 'This block no longer exists. No new calendar write was submitted.'],
} as const;

export function scheduleCopy(lang: 'zh' | 'en', key: keyof typeof copy) {
  return copy[key][lang === 'zh' ? 0 : 1];
}
