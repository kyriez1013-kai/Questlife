import type { Lang } from '../../i18n';
import { HEALTH_METRICS, type HealthMetric, type QuickActionIntent } from '../../platform/contracts';
import { nativeCopy } from '../../platform/nativeI18n';
import { instrumentLabel } from '../../insights-v3/insightsV3Presentation';

export type InsightsRecordKind = 'state' | 'activity';
export type InsightsNavigation = { navigate: (name: string, params?: { screen: string }) => void };
export type InsightsEntrances = {
  onOpenSources: () => void;
  onCreateRecord: (kind: InsightsRecordKind) => void;
};

// Source metadata only, never an empty Quant bundle or an availability judgment.
const healthUnits: Record<HealthMetric, string> = {
  sleep: 'min', steps: 'count', heart_rate: 'bpm', resting_heart_rate: 'bpm',
  hrv: 'ms', exercise: 'min', active_energy: 'kcal', distance: 'm',
};
export type InsightsCatalogEntry = {
  id: string; label: string; unit: string; source: 'health' | 'state' | 'activity';
};
export function insightsSourceCatalog(lang: Lang): InsightsCatalogEntry[] {
  return [
    ...HEALTH_METRICS.map(metric => ({ id: `health:${metric}`, label: nativeCopy(lang, metric), unit: healthUnits[metric], source: 'health' as const })),
    { id: 'state:focus', label: instrumentLabel(lang, { labelKey: 'focus_state' }), unit: '/5', source: 'state' },
    { id: 'activity:duration', label: instrumentLabel(lang, { labelKey: 'execution_duration' }), unit: 'min', source: 'activity' },
    { id: 'activity:quality', label: instrumentLabel(lang, { labelKey: 'execution_quality' }), unit: '/5', source: 'activity' },
  ];
}
export function filterInsightsCatalog(rows: InsightsCatalogEntry[], query: string) {
  const needle = query.trim().toLocaleLowerCase();
  return rows.filter(row => `${row.label} ${row.id} ${row.unit}`.toLocaleLowerCase().includes(needle));
}
export function createInsightsEntrances(navigation: InsightsNavigation, deliver: (intent: QuickActionIntent) => void): InsightsEntrances {
  return {
    onOpenSources: () => navigation.navigate('Settings', { screen: 'NativeSettings' }),
    onCreateRecord: kind => {
      navigation.navigate('Today');
      deliver({ action: 'OPEN', kind: kind === 'state' ? 'morning_state' : 'quick_capture', notificationId: `insights:${kind}` });
    },
  };
}
