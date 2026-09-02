import { Platform } from 'react-native';

export function isAdaptiveDecisionLoopOwnerEnabled(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('adaptive_decision_loop') === '1';
}

export function isQuestLifeCoreV1Enabled(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('questlife_core_v1') === '1';
}
