import { Platform } from 'react-native';
import type { V11EvidenceStage } from './tokens';

function query() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
  return new URLSearchParams(window.location.search);
}

export function isV11TodayEnabled() {
  return query()?.get('questlife_v11_ui') === 'stage2';
}

export function getV11DebugEvidenceStage(
  debugAllowed: boolean,
): V11EvidenceStage | null {
  if (!debugAllowed) return null;
  const value = query()?.get('debugEvidenceStage')?.toUpperCase();
  return value === 'S0' || value === 'S1' || value === 'S2' || value === 'S3'
    ? value
    : null;
}
