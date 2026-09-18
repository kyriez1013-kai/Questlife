import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
export type SyncDevice = { id: string; platform: string; appVersion: string; lastSeenAt: string; name?: string };
let pending: Promise<SyncDevice> | undefined;
export function getSyncDevice(): Promise<SyncDevice> {
  if (!pending) pending = (async () => {
    const key = 'questlife.sync.v2.device';
    const raw = await AsyncStorage.getItem(key);
    const device: SyncDevice = raw ? JSON.parse(raw) : { id: `${Platform.OS}:${randomUUID()}`, platform: Platform.OS, appVersion: Constants.expoConfig?.version ?? '1.0.0', lastSeenAt: new Date().toISOString() };
    if (!device.id || !['web', 'ios', 'android'].includes(device.platform)) throw new Error('device_identity_invalid');
    await AsyncStorage.setItem(key, JSON.stringify(device));
    return device;
  })().catch(error => { pending = undefined; throw error; });
  return pending;
}
