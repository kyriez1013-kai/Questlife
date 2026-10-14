import { Linking, Platform } from 'react-native';

export async function openHealthPermissions(): Promise<void> {
  if (Platform.OS === 'ios') {
    await Linking.openSettings();
    return;
  }
  throw new Error('health_settings_unavailable');
}
