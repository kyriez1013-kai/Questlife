const DISPLAY_NAME_MAP: Record<string, { zh: string; en: string }> = {
  bench_press: { zh: '卧推', en: 'Bench Press' },
  flat_bench: { zh: '卧推', en: 'Flat Bench' },
  incline_bench_press: { zh: '上斜卧推', en: 'Incline Bench Press' },
  incline_bench: { zh: '上斜卧推', en: 'Incline Bench' },
  dips: { zh: '双杠臂屈伸', en: 'Dips' },
  dip: { zh: '双杠臂屈伸', en: 'Dips' },
  sql: { zh: 'SQL', en: 'SQL' },
  python: { zh: 'Python', en: 'Python' },
};

export function displayEntityName(value: string | undefined, lang: 'zh' | 'en' = 'zh') {
  const raw = String(value ?? '').trim();
  if (!raw) return raw;
  const key = raw.toLowerCase().replace(/[\s-]+/g, '_');
  const mapped = DISPLAY_NAME_MAP[key];
  return mapped ? mapped[lang] : raw;
}
