import { Platform } from 'react-native';

/** State layer v0 is on by default; `?state_layer=0` hides it on Web (rollback + before/after shots). */
export function isStateLayerEnabled(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return true;
  return new URLSearchParams(window.location.search).get('state_layer') !== '0';
}
