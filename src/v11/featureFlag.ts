import { Platform } from 'react-native';
import type { V11EvidenceStage } from './tokens';

function query() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
  return new URLSearchParams(window.location.search);
}

export function isV11TodayEnabled() {
  return query()?.get('questlife_v11_ui') === 'stage2';
}

export function isV11InsightsEnabled() {
  const route = query()?.get('questlife_v11_ui');
  return route === 'stage3-insights' || route === 'stage3-quant-terminal';
}

export function isV11QuantTerminalEnabled() {
  return query()?.get('questlife_v11_ui') === 'stage3-quant-terminal';
}

export function getV11QuantTerminalFixture(): 'empty' | 'forming' | 'signal' | 'mature' | null {
  if (!isV11QuantTerminalEnabled()) return null;
  const value = query()?.get('quantFixture');
  return value === 'empty' || value === 'forming' || value === 'signal' || value === 'mature' ? value : null;
}

export function getV11InsightsDebugLanguage(): 'zh' | 'en' | null {
  if (!isV11InsightsEnabled()) return null;
  const value = query()?.get('debugLanguage');
  return value === 'zh' || value === 'en' ? value : null;
}

export function getV11InsightsDebugTheme(): 'dark' | 'light' | null {
  if (!isV11InsightsEnabled()) return null;
  const value = query()?.get('debugTheme');
  return value === 'dark' || value === 'light' ? value : null;
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

export function getV11DebugStateValue(debugAllowed: boolean): number | null {
  if (!debugAllowed) return null;
  const raw = query()?.get('debugState');
  const value = raw == null ? Number.NaN : Number(raw);
  return Number.isInteger(value) && value >= 1 && value <= 5
    ? value
    : null;
}

export function getV11DebugReducedMotion(debugAllowed: boolean): boolean {
  return debugAllowed && query()?.get('debugReducedMotion') === '1';
}

export function getV11DebugPerformance(debugAllowed: boolean): boolean {
  return debugAllowed && query()?.get('debugPerformance') === '1';
}
