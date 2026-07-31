import React from 'react';
import {
  Pressable,
  Text,
  View,
} from 'react-native';
import { t, type Lang } from '../i18n';
import {
  getV11ThemeTokens,
  type V11ThemeMode,
} from '../v11/tokens';
import { V11GlassSheet, V11Pill } from '../v11/components/V11Material';
import V11RebaselineIcon from './V11RebaselineIcon';

const WebView = View as any;
const WebPressable = Pressable as any;

export type RebaselineSheet =
  | 'capture'
  | 'state'
  | 'decision'
  | 'history'
  | 'record'
  | null;

type Props = {
  feedback: 'useful' | 'not_useful' | null;
  language: Lang;
  onClose: () => void;
  onFeedback: (value: 'useful' | 'not_useful') => void;
  onState: (value: number) => void;
  sheet: RebaselineSheet;
  themeMode: V11ThemeMode;
};

function titleKey(sheet: Exclude<RebaselineSheet, null>) {
  if (sheet === 'capture') return 'rebaselineCaptureTitle';
  if (sheet === 'state') return 'rebaselineStateTitle';
  if (sheet === 'decision') return 'rebaselineDecisionTitle';
  if (sheet === 'history') return 'rebaselineHistoryTitle';
  return 'rebaselineRecordTitle';
}

export default function V11Stage2RebaselineSheet({
  feedback,
  language,
  onClose,
  onFeedback,
  onState,
  sheet,
  themeMode,
}: Props) {
  const theme = getV11ThemeTokens(themeMode);
  if (!sheet) return null;

  return (
    <WebView
      dataSet={{ 'v11-rebaseline-role': 'overlay' }}
      onStartShouldSetResponder={() => true}
    >
      <WebPressable
        accessibilityLabel={t(language, 'close')}
        accessibilityRole="button"
        dataSet={{ 'v11-rebaseline-role': 'scrim' }}
        onPress={onClose}
      />
      <V11GlassSheet
        accessibilityLabel={t(language, titleKey(sheet))}
        contentStyle={{
          paddingHorizontal: 20,
          paddingTop: 14,
          paddingBottom: 24,
          gap: 16,
        }}
        minHeight={sheet === 'capture' || sheet === 'state' ? 360 : 430}
        reducedMotion={false}
        stage="S2"
        style={{ width: '100%' }}
        theme={theme}
      >
        <WebView dataSet={{ 'v11-rebaseline-role': 'sheet-handle' }} />
        <WebView dataSet={{ 'v11-rebaseline-role': 'sheet-header' }}>
          <Text style={{ color: theme.text.primary, fontSize: 20, lineHeight: 27, fontWeight: '500' }}>
            {t(language, titleKey(sheet))}
          </Text>
          <WebPressable
            accessibilityLabel={t(language, 'close')}
            accessibilityRole="button"
            dataSet={{ 'v11-rebaseline-role': 'icon-button' }}
            onPress={onClose}
          >
            <V11RebaselineIcon name="close" size={19} color={theme.text.secondary} />
          </WebPressable>
        </WebView>

        {sheet === 'capture' ? (
          <>
            <WebView dataSet={{ 'v11-rebaseline-role': 'capture-field' }}>
              <Text style={{ color: theme.text.metadata, fontSize: 11, lineHeight: 16 }}>
                {t(language, 'rebaselineCapturePlaceholder')}
              </Text>
            </WebView>
            <Text style={{ color: theme.text.secondary, fontSize: 13, lineHeight: 20 }}>
              {t(language, 'rebaselineCaptureExplainer')}
            </Text>
            <V11Pill
              accessibilityLabel={t(language, 'rebaselineParseRecord')}
              contentStyle={{ alignItems: 'center', justifyContent: 'center' }}
              height={54}
              onPress={() => undefined}
              stage="S2"
              theme={theme}
            >
              <Text style={{ color: theme.text.primary, fontSize: 15, fontWeight: '500' }}>
                {t(language, 'rebaselineParseRecord')}
              </Text>
            </V11Pill>
          </>
        ) : null}

        {sheet === 'state' ? (
          <>
            <Text style={{ color: theme.text.secondary, fontSize: 13, lineHeight: 20 }}>
              {t(language, 'rebaselineStatePrompt')}
            </Text>
            <WebView dataSet={{ 'v11-rebaseline-role': 'state-grid' }}>
              {[1, 2, 3, 4, 5].map((value) => (
                <WebPressable
                  accessibilityLabel={`${value} / 5`}
                  accessibilityRole="button"
                  dataSet={{ 'v11-rebaseline-role': 'state-choice' }}
                  key={value}
                  onPress={() => onState(value)}
                >
                  <Text style={{ color: theme.text.primary, fontSize: 18, fontWeight: '500' }}>
                    {value}
                  </Text>
                </WebPressable>
              ))}
            </WebView>
            <Text style={{ color: theme.text.metadata, fontSize: 11, lineHeight: 17 }}>
              {t(language, 'rebaselineDetailedStateNote')}
            </Text>
          </>
        ) : null}

        {sheet === 'decision' ? (
          <>
            {[
              'rebaselineEvidenceCurrentState',
              'rebaselineEvidenceScheduledSql',
              'rebaselineDecisionContextEvidence',
            ].map((key) => (
              <WebView key={key} dataSet={{ 'v11-rebaseline-role': 'evidence-row' }}>
                <V11RebaselineIcon name="activity" size={16} color={theme.glow.primary} />
                <Text style={{ flex: 1, color: theme.text.primary, fontSize: 14, lineHeight: 21 }}>
                  {t(language, key)}
                </Text>
              </WebView>
            ))}
            <Text style={{ color: theme.text.metadata, fontSize: 11, lineHeight: 17 }}>
              {t(language, 'rebaselineEvidenceCaution')}
            </Text>
          </>
        ) : null}

        {sheet === 'history' || sheet === 'record' ? (
          <>
            <WebView dataSet={{ 'v11-rebaseline-role': 'history-row' }}>
              <V11RebaselineIcon name="activity" size={18} color={theme.glow.primary} />
              <WebView style={{ flex: 1 }}>
                <Text style={{ color: theme.text.primary, fontSize: 15, lineHeight: 21, fontWeight: '500' }}>
                  {t(language, 'rebaselineBenchPress')}
                </Text>
                <Text style={{ color: theme.text.secondary, fontSize: 12, lineHeight: 18 }}>
                  {t(language, 'rebaselineBenchMeta')}
                </Text>
              </WebView>
              <Text style={{ color: theme.text.metadata, fontSize: 11 }}>08:10</Text>
            </WebView>
            {sheet === 'history' ? (
              <WebView dataSet={{ 'v11-rebaseline-role': 'history-row' }}>
                <V11RebaselineIcon name="code" size={18} color={theme.glow.supporting} />
                <WebView style={{ flex: 1 }}>
                  <Text style={{ color: theme.text.primary, fontSize: 15, lineHeight: 21, fontWeight: '500' }}>
                    {t(language, 'rebaselineSqlReview')}
                  </Text>
                  <Text style={{ color: theme.text.secondary, fontSize: 12, lineHeight: 18 }}>
                    {t(language, 'rebaselineSqlMeta')}
                  </Text>
                </WebView>
                <Text style={{ color: theme.text.metadata, fontSize: 11 }}>
                  {t(language, 'yesterday')}
                </Text>
              </WebView>
            ) : null}
          </>
        ) : null}

        {(sheet === 'decision' || sheet === 'record') ? (
          <WebView dataSet={{ 'v11-rebaseline-role': 'feedback-row' }}>
            {(['useful', 'not_useful'] as const).map((value) => (
              <WebPressable
                accessibilityRole="button"
                dataSet={{
                  'v11-rebaseline-role': 'feedback-choice',
                  'v11-selected': feedback === value ? 'true' : 'false',
                }}
                key={value}
                onPress={() => onFeedback(value)}
              >
                <Text style={{ color: theme.text.primary, fontSize: 13, fontWeight: '500' }}>
                  {t(language, value === 'useful' ? 'useful' : 'notUseful')}
                </Text>
              </WebPressable>
            ))}
          </WebView>
        ) : null}
      </V11GlassSheet>
    </WebView>
  );
}
