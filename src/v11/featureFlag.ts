import { Platform } from 'react-native';
import type { V11EvidenceStage } from './tokens';
import type {
  QuantV041LifecycleId,
  QuantV042LifecycleId,
} from '../v11-insights/personal-terminal/personalTerminalPresentation';

function query() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
  return new URLSearchParams(window.location.search);
}

export function isV11TodayEnabled() {
  return query()?.get('questlife_v11_ui') === 'stage2';
}

export function isV11InsightsEnabled() {
  const route = query()?.get('questlife_v11_ui');
  return route === 'stage3-insights' || route === 'stage3-quant-terminal' || route === 'stage3-personal-terminal';
}

export function isV11PersonalTerminalEnabled() {
  return query()?.get('questlife_v11_ui') === 'stage3-personal-terminal';
}

export function getV11PersonalTerminalFixture(): 'forming' | 'mature' | 'portfolio' | 'skill' | 'volatile' | 'historical' | null {
  if (!isV11PersonalTerminalEnabled()) return null;
  const value = query()?.get('quantFixture');
  return value === 'forming' || value === 'mature' || value === 'portfolio' || value === 'skill' || value === 'volatile' || value === 'historical'
    ? value
    : null;
}

export function getV11QuantV041Lifecycle(): QuantV041LifecycleId | null {
  if (!isV11PersonalTerminalEnabled()) return null;
  if (query()?.get('quantVersion') !== 'v041' && getV11QuantV042Lifecycle()) return null;
  const value = query()?.get('quantLifecycle');
  return value === 'no-data'
    || value === 'steps-only'
    || value === 'sleep-only'
    || value === 'rich-passive'
    || value === 'day7'
    || value === 'day30'
    || value === 'day90'
    || value === 'day180'
    || value === 'goal'
    || value === 'skill'
    ? value
    : null;
}

export function getV11QuantV042Lifecycle(): QuantV042LifecycleId | null {
  if (!isV11PersonalTerminalEnabled() || query()?.get('quantVersion') === 'v041') return null;
  const value = query()?.get('quantLifecycle');
  if (value === 'no-data') return 'no_data';
  return value === 'market_steps_only'
    || value === 'market_rich_passive'
    || value === 'market_questlife_only'
    || value === 'market_mixed_mature'
    || value === 'focus_1_observation'
    || value === 'focus_2_observations'
    || value === 'focus_3_observations'
    || value === 'focus_5_observations'
    || value === 'focus_10_observations'
    || value === 'execution_3_observations'
    || value === 'execution_7_observations'
    || value === 'day30'
    || value === 'day90'
    || value === 'day180'
    || value === 'goal'
    || value === 'skill'
    || value === 'no_data'
    ? value
    : null;
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
