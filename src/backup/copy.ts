const copy = {
  title: ['备份与恢复', 'Backup and restore'],
  scope: ['备份包含应用记录与账号归属，不包含登录凭据、系统权限、健康原始库或设备同步日志。恢复不会改变当前外观设置。', 'Backups include app records and account ownership, not credentials, system permissions, the raw Health repository or device sync journal. Restore preserves current appearance settings.'],
  save: ['保存可恢复备份', 'Save restorable backup'],
  restore: ['选择备份并恢复', 'Choose backup to restore'],
  limit: ['仅可在未登录、从未绑定账号且没有记录的本机恢复。已有账号请登录后同步恢复，避免覆盖新记录或复活已删除记录。', 'File restore requires a signed-out, never-bound local replica with no records. For an existing account, sign in to recover through sync instead of overwriting newer records or reviving deletions.'],
  confirmSave: ['这是未加密的私人数据文件。请选择可信的位置；接收应用可能上传内容。保存备份？', 'This is an unencrypted private data file. Choose a trusted destination; the receiving app may upload it. Save backup?'],
  confirmRestore: ['仅恢复这份备份中的原始记录和账号归属，不填入默认观察、不写入系统健康或日历。恢复后，账号备份只能连接原账号。继续？', 'Restore the original records and account binding only. No default observations or system Health/Calendar writes. An account backup can reconnect only to its original account. Continue?'],
  ready: ['文件已交给系统保存，请确认接收位置已保存。', 'The file was handed to the system. Confirm that your destination saved it.'],
  restored: ['记录已在本机恢复。云端恢复仍需登录原账号并完成同步。', 'Records restored locally. Cloud recovery still requires signing into the original account and completing sync.'],
  failed: ['操作未完成。请使用本版本生成的备份，检查本机是否为空、已退出账号以及文件是否完整；现有记录未被覆盖。', 'Operation did not complete. Use a backup from this version, check that this replica is empty and signed out, and that the file is intact. Existing records were not overwritten.'],
  cancel: ['取消', 'Cancel'],
} as const;
export const backupCopy = (lang: 'zh' | 'en', key: keyof typeof copy) => copy[key][lang === 'zh' ? 0 : 1];
