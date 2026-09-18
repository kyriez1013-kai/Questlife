const messages = {
  zh: {
    account: "账号与同步",
    unconfigured: "账号服务尚未配置。本地记录仍可使用，不会自动上传。",
    email: "邮箱",
    otp: "邮箱验证码",
    request: "发送验证码",
    verify: "验证并登录",
    sent: "验证码已发送，请检查邮箱。",
    signOut: "退出登录并保留本地数据",
    clearLocal: "清除本机记录副本",
    cancel: "取消",
    clearWarning:
      "只清除本机的记录与健康观测副本，并停止健康读取，不删除云端或系统日历。未同步操作与冲突必须先处理。账号绑定与迁移恢复备份保留；用原账号登录可重新下载。确定继续？",
    clearLimit:
      "仅已同步且无冲突时可清除。不会解除原账号绑定，也不是安全擦除；迁移备份仍保留。",
    sync: "立即同步",
    devices: "设备",
    pending: "待同步",
    conflicts: "同步冲突",
    signedOut: "未登录 · 仅本地保存",
    idle: "已同步",
    syncing: "正在同步",
    offline: "连接不可用 · 已保留待重试操作",
    error: "同步需要处理",
    conflict: "存在待处理冲突",
    lastSync: "上次同步",
    never: "尚未同步",
    failure: "操作未完成，请检查账号配置或连接后重试。",
    health: "同步健康数据",
    healthNote:
      "开启后，已导入的健康记录会同步到你的 QuestLife 账号。不会发送到分析遥测；此服务不提供端到端加密。",
    keepRemote: "保留云端版本",
    keepLocal: "提交本地版本",
    inspect: "查看冲突",
    local: "本地版本",
    remote: "云端版本",
    accountBlocked:
      "本机数据已绑定其他账号。请先退出，使用原账号；更换账号前必须单独备份并清理本机数据。",
    privacy:
      "退出后停止云端同步，本机记录不会被删除。首次登录会合并同 ID 的相同记录，不同内容会保留为冲突。",
    schema: "尚未连接到同步服务，请确认账号和远端迁移已配置。",
    healthOff: "关闭只停止后续上传，不删除已有云端记录。",
  },
  en: {
    account: "Account & Sync",
    unconfigured:
      "Account service is not configured. Local records remain available and are not uploaded automatically.",
    email: "Email",
    otp: "Email code",
    request: "Send code",
    verify: "Verify and sign in",
    sent: "Code sent. Check your email.",
    signOut: "Sign out and keep local data",
    clearLocal: "Clear local record copies",
    cancel: "Cancel",
    clearWarning:
      "Remove record and Health copies from this device and stop Health reads, not cloud or system Calendar data. Resolve pending changes and conflicts first. Account binding and migration recovery backups remain; signing in to the original account downloads records again. Continue?",
    clearLimit:
      "Available after changes sync and conflicts are resolved. Original account binding and migration backups remain; this is not secure erasure.",
    sync: "Sync now",
    devices: "Devices",
    pending: "Pending",
    conflicts: "Sync conflicts",
    signedOut: "Signed out · local only",
    idle: "Synced",
    syncing: "Syncing",
    offline: "Connection unavailable · changes kept for retry",
    error: "Sync needs attention",
    conflict: "Conflicts need review",
    lastSync: "Last synced",
    never: "Not yet synced",
    failure:
      "Action was not completed. Check account setup or connection and retry.",
    health: "Sync Health data",
    healthNote:
      "When enabled, imported Health records sync to your QuestLife account. They are not sent to analytics telemetry. This service does not provide end-to-end encryption.",
    keepRemote: "Keep cloud version",
    keepLocal: "Submit local version",
    inspect: "Review conflict",
    local: "Local version",
    remote: "Cloud version",
    accountBlocked:
      "This device data belongs to another account. Sign out and use the original account. Back up and separately clear local data before changing accounts.",
    privacy:
      "Signing out stops cloud sync and keeps local records. First sign-in deduplicates identical records and preserves differing records as conflicts.",
    schema:
      "Sync service is not connected. Check account configuration and remote migrations.",
    healthOff:
      "Turning this off stops further upload; existing cloud records are not deleted.",
  },
} as const;
export function syncCopy(lang: "zh" | "en", key: keyof typeof messages.en) {
  return messages[lang][key];
}
