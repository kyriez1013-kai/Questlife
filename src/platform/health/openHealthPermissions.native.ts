import { Linking, Platform } from 'react-native';

export async function openHealthPermissions(): Promise<void> {
  if (Platform.OS === 'android') {
    const { openHealthConnectSettings } = require('react-native-health-connect') as typeof import('react-native-health-connect');
    openHealthConnectSettings();
    return;
  }
  if (Platform.OS === 'ios') {
    await Linking.openSettings();
    return;
  }
  throw new Error('health_settings_unavailable');
}
