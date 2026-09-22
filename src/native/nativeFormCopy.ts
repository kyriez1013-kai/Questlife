const copy = {
  zh: {
    saveFailed: '尚未保存到本机。内容仍保留，请重试；不要关闭应用。',
    saving: '正在保存',
    retrySave: '重试保存',
    validNumber: '请输入有效数字，或留空未记录的数值。',
    pending: '正在保存本机修改',
    failed: '本机修改尚未保存',
    failedBody: '请保留应用开启并重试。已保存的离线记录会在联网后同步。',
  },
  en: {
    saveFailed: 'Not saved on this device yet. Your changes are retained. Retry and keep the app open.',
    saving: 'Saving',
    retrySave: 'Retry save',
    validNumber: 'Enter a valid number, or leave an unrecorded value empty.',
    pending: 'Saving device changes',
    failed: 'Device changes are not saved yet',
    failedBody: 'Keep the app open and retry. Saved offline records will sync when connected.',
  },
} as const;
export const nativeFormCopy = (lang: 'zh' | 'en', key: keyof typeof copy.en) => copy[lang][key];
