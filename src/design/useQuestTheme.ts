import { useColorScheme } from 'react-native';
import { getQuestTheme } from './tokens';

export function useQuestTheme(preference?: string) {
  const systemColorScheme = useColorScheme();
  return getQuestTheme(preference, systemColorScheme);
}
