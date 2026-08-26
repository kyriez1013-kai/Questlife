import React, { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { Lang, t } from '../../i18n';
import { QuestTheme } from '../../design/tokens';
import { QuestCompactRow, QuestGroupedSurface, QuestSectionHeader } from '../ui/QuestPrimitives';
import QuestButton from '../ui/QuestButton';
import { requestQuestLifeInstall, useInstallableShell } from '../../utils/installableShell';

type Props = {
  lang: Lang;
  questTheme: QuestTheme;
};

export default function InstallQuestLifeSection({ lang, questTheme }: Props) {
  const shell = useInstallableShell();
  const [requesting, setRequesting] = useState(false);

  if (Platform.OS !== 'web' || shell.installed || shell.standalone) return null;

  const instructions = shell.platform === 'ios'
    ? t(lang, 'installQuestLifeIosInstructions')
    : shell.canPrompt
      ? t(lang, 'installQuestLifeDescription')
      : t(lang, 'installQuestLifeBrowserInstructions');
  const resultText = shell.outcome === 'dismissed'
    ? t(lang, 'installQuestLifeDismissed')
    : shell.outcome === 'error' || shell.outcome === 'unavailable'
      ? t(lang, 'installQuestLifeError')
      : '';

  return (
    <View>
      <QuestSectionHeader
        questTheme={questTheme}
        title={t(lang, 'questLifeApp')}
        subtitle={t(lang, 'questLifeAppDescription')}
      />
      <QuestGroupedSurface questTheme={questTheme}>
        <QuestCompactRow
          questTheme={questTheme}
          title={t(lang, 'installQuestLife')}
          body={instructions}
          trailing={shell.canPrompt ? (
            <QuestButton
              questTheme={questTheme}
              variant="secondary"
              icon="plus"
              label={t(lang, 'install')}
              loading={requesting}
              onPress={async () => {
                setRequesting(true);
                await requestQuestLifeInstall();
                setRequesting(false);
              }}
            />
          ) : undefined}
        />
        {resultText ? (
          <Text style={{
            color: shell.outcome === 'error' ? questTheme.colors.danger : questTheme.colors.textMuted,
            fontSize: questTheme.typography.metaSize,
            lineHeight: questTheme.typography.metaLineHeight,
            paddingHorizontal: questTheme.spacing.md,
            paddingBottom: questTheme.spacing.sm,
          }}>
            {resultText}
          </Text>
        ) : null}
      </QuestGroupedSurface>
    </View>
  );
}
