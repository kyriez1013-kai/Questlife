import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { t, type Lang } from '../i18n';
import {
  getV11ThemeTokens,
  type V11ThemeMode,
} from '../v11/tokens';
import { V11GlassSheet, V11Pill } from '../v11/components/V11Material';
import type { RebaselineExecutionRow } from './fixtures';
import V11RebaselineIcon from './V11RebaselineIcon';

const WebView = View as any;
const WebPressable = Pressable as any;
const WebScrollView = ScrollView as any;
const WebTextInput = TextInput as any;

export type RebaselineSheet =
  | 'capture'
  | 'state'
  | 'state-detail'
  | 'decision'
  | 'history'
  | 'record'
  | null;

type Props = {
  feedback: 'useful' | 'not_useful' | null;
  feedbackStatus: 'idle' | 'saving' | 'saved';
  language: Lang;
  onClose: () => void;
  onDetailedState: () => void;
  onFeedback: (value: 'useful' | 'not_useful') => void;
  onOpenRecord: () => void;
  onState: (value: number) => void;
  recent: RebaselineExecutionRow[];
  reducedMotion: boolean;
  selectedState: number | null;
  sheet: RebaselineSheet;
  stateSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  themeMode: V11ThemeMode;
};

function titleKey(sheet: Exclude<RebaselineSheet, null>) {
  if (sheet === 'capture') return 'rebaselineCaptureTitle';
  if (sheet === 'state') return 'rebaselineStateTitle';
  if (sheet === 'state-detail') return 'detailedCheckIn';
  if (sheet === 'decision') return 'rebaselineDecisionTitle';
  if (sheet === 'history') return 'rebaselineHistoryTitle';
  return 'rebaselineRecordTitle';
}

export default function V11Stage2RebaselineSheet({
  feedback,
  feedbackStatus,
  language,
  onClose,
  onDetailedState,
  onFeedback,
  onOpenRecord,
  onState,
  recent,
  reducedMotion,
  selectedState,
  sheet,
  stateSaveStatus,
  themeMode,
}: Props) {
  const theme = getV11ThemeTokens(themeMode);
  const [captureText, setCaptureText] = useState('');
  if (!sheet) return null;

  const stateLabels = ['veryBad', 'bad', 'average', 'good', 'great'];
  const stateStatusKey = stateSaveStatus === 'saving'
    ? 'rebaselineStateSaving'
    : stateSaveStatus === 'saved'
      ? 'stateCheckInSaved'
      : stateSaveStatus === 'error'
        ? 'rebaselineStateSaveError'
        : null;
  return (
    <WebView
      dataSet={{
        'v11-rebaseline-role': 'overlay',
        'v11-sheet': sheet,
      }}
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
        minHeight={sheet === 'state'
          ? 286
          : sheet === 'state-detail'
            ? 340
            : sheet === 'capture'
              ? 350
              : sheet === 'history'
                ? 420
                : 390}
        reducedMotion={reducedMotion}
        stage="S2"
        style={{ width: '100%' }}
        theme={theme}
      >
        <WebView dataSet={{ 'v11-rebaseline-role': 'sheet-handle' }} />
        <WebView dataSet={{ 'v11-rebaseline-role': 'sheet-header' }}>
          <Text numberOfLines={2} style={{ flex: 1, flexShrink: 1, minWidth: 0, color: theme.text.primary, fontSize: 20, lineHeight: 27, fontWeight: '500' }}>
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
            <WebTextInput
              accessibilityLabel={t(language, 'rebaselineCapturePlaceholder')}
              autoFocus
              dataSet={{ 'v11-rebaseline-role': 'capture-field' }}
              multiline
              onChangeText={setCaptureText}
              placeholder={t(language, 'rebaselineCapturePlaceholder')}
              placeholderTextColor={theme.text.metadata}
              style={{ color: theme.text.primary, fontSize: 15, lineHeight: 22 }}
              value={captureText}
            />
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
                  accessibilityState={{
                    disabled: stateSaveStatus === 'saving',
                    selected: selectedState === value,
                  }}
                  dataSet={{
                    'v11-rebaseline-role': 'state-choice',
                    'v11-save-status': selectedState === value ? stateSaveStatus : 'idle',
                    'v11-selected': selectedState === value ? 'true' : 'false',
                  }}
                  disabled={stateSaveStatus === 'saving'}
                  key={value}
                  onPress={() => onState(value)}
                >
                  <Text style={{ color: theme.text.primary, fontSize: 18, fontWeight: '500' }}>
                    {value}
                  </Text>
                  <Text style={{ color: theme.text.secondary, fontSize: 10, lineHeight: 14 }}>
                    {t(language, stateLabels[value - 1])}
                  </Text>
                </WebPressable>
              ))}
            </WebView>
            {stateStatusKey ? (
              <Text
                accessibilityLiveRegion="polite"
                style={{ color: stateSaveStatus === 'error' ? theme.questTheme.colors.danger : theme.text.secondary, fontSize: 12, lineHeight: 18 }}
              >
                {t(language, stateStatusKey)}
              </Text>
            ) : null}
            <WebPressable
              accessibilityRole="button"
              dataSet={{ 'v11-rebaseline-role': 'state-detail-action' }}
              onPress={onDetailedState}
            >
              <V11RebaselineIcon name="activity" size={16} color={theme.text.secondary} />
              <Text numberOfLines={2} style={{ flex: 1, flexShrink: 1, minWidth: 0, color: theme.text.primary, fontSize: 13, lineHeight: 19, fontWeight: '500' }}>
                {t(language, 'rebaselineRecordMoreState')}
              </Text>
            </WebPressable>
          </>
        ) : null}

        {sheet === 'state-detail' ? (
          <WebScrollView
            contentContainerStyle={{ gap: 10, paddingBottom: 4 }}
            dataSet={{ 'v11-rebaseline-role': 'state-detail-scroll' }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={{ color: theme.text.secondary, fontSize: 13, lineHeight: 20 }}>
              {t(language, 'rebaselineDetailedStatePrompt')}
            </Text>
            {(['energy', 'focus', 'mood'] as const).map((key) => (
              <WebView dataSet={{ 'v11-rebaseline-role': 'state-detail-row' }} key={key}>
                <Text style={{ color: theme.text.primary, fontSize: 14, fontWeight: '500' }}>
                  {t(language, key)}
                </Text>
                <Text style={{ color: theme.text.secondary, fontSize: 13 }}>
                  {selectedState ?? 3} / 5
                </Text>
              </WebView>
            ))}
            <V11Pill
              accessibilityLabel={t(language, 'save')}
              contentStyle={{ alignItems: 'center', justifyContent: 'center' }}
              height={52}
              onPress={() => onState(selectedState ?? 3)}
              reducedMotion={reducedMotion}
              stage="S2"
              theme={theme}
            >
              <Text style={{ color: theme.text.primary, fontSize: 14, fontWeight: '500' }}>
                {t(language, 'save')}
              </Text>
            </V11Pill>
          </WebScrollView>
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
                <Text numberOfLines={2} style={{ flex: 1, flexShrink: 1, minWidth: 0, color: theme.text.primary, fontSize: 14, lineHeight: 21 }}>
                  {t(language, key)}
                </Text>
              </WebView>
            ))}
            <Text style={{ color: theme.text.metadata, fontSize: 11, lineHeight: 17 }}>
              {t(language, 'rebaselineEvidenceCaution')}
            </Text>
          </>
        ) : null}

        {sheet === 'history' ? (
          <WebScrollView
            contentContainerStyle={{ paddingBottom: 16 }}
            dataSet={{ 'v11-rebaseline-role': 'history-scroll' }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {recent.length === 0 ? (
              <Text style={{ color: theme.text.secondary, fontSize: 13, lineHeight: 20 }}>
                {t(language, 'rebaselineNoLatestRecord')}
              </Text>
            ) : recent.map((row) => (
              <WebPressable
                accessibilityRole="button"
                dataSet={{ 'v11-rebaseline-role': 'history-row' }}
                key={row.id}
                onPress={onOpenRecord}
              >
                <V11RebaselineIcon name="activity" size={18} color={theme.glow.primary} />
                <WebView style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={2} style={{ flexShrink: 1, color: theme.text.primary, fontSize: 15, lineHeight: 21, fontWeight: '500' }}>
                    {t(language, row.titleKey)}
                  </Text>
                  <Text numberOfLines={2} style={{ color: theme.text.secondary, fontSize: 12, lineHeight: 18 }}>
                    {t(language, row.metaKey)} · {t(language, row.resultKey)}
                  </Text>
                </WebView>
                <Text style={{ color: theme.text.metadata, fontSize: 11 }}>
                  {t(language, row.timeKey)}
                </Text>
              </WebPressable>
            ))}
          </WebScrollView>
        ) : null}

        {sheet === 'record' ? (
          <WebView dataSet={{ 'v11-rebaseline-role': 'history-row' }}>
            <V11RebaselineIcon name="activity" size={18} color={theme.glow.primary} />
            <WebView style={{ flex: 1, flexShrink: 1, minWidth: 0 }}>
              <Text numberOfLines={2} style={{ flexShrink: 1, color: theme.text.primary, fontSize: 15, lineHeight: 21, fontWeight: '500' }}>
                {t(language, 'rebaselineBenchPress')}
              </Text>
              <Text numberOfLines={2} style={{ flexShrink: 1, color: theme.text.secondary, fontSize: 12, lineHeight: 18 }}>
                {t(language, 'rebaselineBenchMeta')} · {t(language, 'rebaselineQualityFour')}
              </Text>
            </WebView>
            <Text style={{ color: theme.text.metadata, fontSize: 11 }}>08:10</Text>
          </WebView>
        ) : null}

        {(sheet === 'decision' || sheet === 'record') ? (
          <WebView dataSet={{ 'v11-rebaseline-role': 'feedback-row' }}>
            {(['useful', 'not_useful'] as const).map((value) => (
              <WebPressable
                accessibilityRole="button"
                dataSet={{
                  'v11-rebaseline-role': 'feedback-choice',
                  'v11-selected': feedback === value ? 'true' : 'false',
                  'v11-save-status': feedback === value ? feedbackStatus : 'idle',
                }}
                key={value}
                onPress={() => onFeedback(value)}
              >
                <Text style={{ color: theme.text.primary, fontSize: 13, fontWeight: '500' }}>
                  {t(language, value === 'useful' ? 'useful' : 'notUseful')}
                </Text>
              </WebPressable>
            ))}
            {feedbackStatus !== 'idle' ? (
              <Text accessibilityLiveRegion="polite" style={{ color: theme.text.secondary, fontSize: 12 }}>
                {t(language, feedbackStatus === 'saving' ? 'feedbackSaving' : 'feedbackSaved')}
              </Text>
            ) : null}
          </WebView>
        ) : null}
      </V11GlassSheet>
    </WebView>
  );
}
