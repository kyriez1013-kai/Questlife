import React, { useEffect, useState } from 'react';
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
import V11Stage2ProductionSheet from './V11Stage2ProductionSheet';

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
  const [detailValues, setDetailValues] = useState<Record<string, number>>({
    overall: selectedState ?? 3,
    energy: 3,
    focus: 3,
    mood: 3,
    physical: 3,
    stress: 3,
    sleepQuality: 3,
  });
  const [detailHealth, setDetailHealth] = useState<'normal' | 'tired' | 'sick' | 'recovery'>('normal');
  const [detailContext, setDetailContext] = useState<Record<string, boolean>>({
    postWorkout: false,
    afterExam: false,
    caffeine: false,
    socialDrain: false,
  });
  const [detailNote, setDetailNote] = useState('');

  useEffect(() => {
    if (sheet !== 'state-detail') return;
    setDetailValues((current) => ({ ...current, overall: selectedState ?? 3 }));
  }, [selectedState, sheet]);

  if (!sheet) return null;

  const stateLabels = ['veryBad', 'bad', 'average', 'good', 'great'];
  const stateStatusKey = stateSaveStatus === 'saving'
    ? 'rebaselineStateSaving'
    : stateSaveStatus === 'saved'
      ? 'stateCheckInSaved'
      : stateSaveStatus === 'error'
        ? 'rebaselineStateSaveError'
        : null;

  if (sheet === 'state-detail') {
    const metricKeys = ['overall', 'energy', 'focus', 'mood', 'physical', 'stress', 'sleepQuality'];
    const healthOptions = ['normal', 'tired', 'sick', 'recovery'] as const;
    const healthKeys = {
      normal: 'healthNormal',
      tired: 'healthTired',
      sick: 'healthSick',
      recovery: 'healthRecovery',
    } as const;
    const contextKeys = ['postWorkout', 'afterExam', 'caffeine', 'socialDrain'];

    return (
      <V11Stage2ProductionSheet
        closeLabel={t(language, 'close')}
        footer={(
          <WebView dataSet={{ 'v11-rebaseline-role': 'state-detail-footer-actions' }}>
            <WebPressable
              accessibilityRole="button"
              dataSet={{ 'v11-action': 'secondary', 'v11-rebaseline-role': 'state-detail-footer-action' }}
              onPress={onClose}
            >
              <Text style={{ color: theme.text.primary, fontSize: 13, fontWeight: '500' }}>
                {t(language, 'cancel')}
              </Text>
            </WebPressable>
            <WebPressable
              accessibilityRole="button"
              accessibilityState={{ disabled: stateSaveStatus === 'saving' }}
              dataSet={{ 'v11-action': 'primary', 'v11-rebaseline-role': 'state-detail-footer-action' }}
              disabled={stateSaveStatus === 'saving'}
              onPress={() => onState(detailValues.overall)}
            >
              <Text style={{ color: theme.text.primary, fontSize: 13, fontWeight: '600' }}>
                {t(language, stateSaveStatus === 'saving' ? 'rebaselineStateSaving' : 'save')}
              </Text>
            </WebPressable>
          </WebView>
        )}
        onClose={onClose}
        reducedMotion={reducedMotion}
        sheet="state"
        theme={theme}
        title={t(language, 'detailedCheckIn')}
        visible
      >
        <WebView dataSet={{ 'v11-form': 'state-detail', 'v11-rebaseline-role': 'state-detail-form' }}>
          <Text style={{ color: theme.text.secondary, fontSize: 13, lineHeight: 20 }}>
            {t(language, 'rebaselineDetailedStateAllPrompt')}
          </Text>

          {metricKeys.map((key) => {
            const value = detailValues[key] ?? 3;
            return (
              <WebView dataSet={{ 'v11-rebaseline-role': 'state-detail-metric' }} key={key}>
                <WebView dataSet={{ 'v11-rebaseline-role': 'state-detail-metric-heading' }}>
                  <Text style={{ color: theme.text.primary, fontSize: 14, fontWeight: '500' }}>
                    {t(language, key)}
                  </Text>
                  <Text style={{ color: theme.text.secondary, fontSize: 12 }}>
                    {value} · {t(language, stateLabels[value - 1])}
                  </Text>
                </WebView>
                <WebView dataSet={{ 'v11-rebaseline-role': 'state-detail-options' }}>
                  {[1, 2, 3, 4, 5].map((option) => (
                    <WebPressable
                      accessibilityLabel={`${t(language, key)} ${option} ${t(language, stateLabels[option - 1])}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: value === option }}
                      dataSet={{
                        'v11-rebaseline-role': 'state-detail-choice',
                        'v11-selected': value === option ? 'true' : 'false',
                      }}
                      key={option}
                      onPress={() => setDetailValues((current) => ({ ...current, [key]: option }))}
                    >
                      <Text style={{ color: theme.text.primary, fontSize: 14, lineHeight: 18, fontWeight: '500' }}>
                        {option}
                      </Text>
                      <Text numberOfLines={2} style={{ color: theme.text.secondary, fontSize: 9.5, lineHeight: 12, textAlign: 'center' }}>
                        {t(language, stateLabels[option - 1])}
                      </Text>
                    </WebPressable>
                  ))}
                </WebView>
              </WebView>
            );
          })}

          <WebView dataSet={{ 'v11-rebaseline-role': 'state-detail-group' }}>
            <Text style={{ color: theme.text.primary, fontSize: 14, fontWeight: '500' }}>
              {t(language, 'health')}
            </Text>
            <WebView dataSet={{ 'v11-rebaseline-role': 'state-detail-tags' }}>
              {healthOptions.map((value) => (
                <WebPressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: detailHealth === value }}
                  dataSet={{
                    'v11-rebaseline-role': 'state-detail-tag',
                    'v11-selected': detailHealth === value ? 'true' : 'false',
                  }}
                  key={value}
                  onPress={() => setDetailHealth(value)}
                >
                  <Text style={{ color: theme.text.primary, fontSize: 12, fontWeight: '500' }}>
                    {t(language, healthKeys[value])}
                  </Text>
                </WebPressable>
              ))}
            </WebView>
          </WebView>

          <WebView dataSet={{ 'v11-rebaseline-role': 'state-detail-group' }}>
            <Text style={{ color: theme.text.primary, fontSize: 14, fontWeight: '500' }}>
              {t(language, 'rebaselineStateContext')}
            </Text>
            <WebView dataSet={{ 'v11-rebaseline-role': 'state-detail-tags' }}>
              {contextKeys.map((key) => (
                <WebPressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: Boolean(detailContext[key]) }}
                  dataSet={{
                    'v11-rebaseline-role': 'state-detail-tag',
                    'v11-selected': detailContext[key] ? 'true' : 'false',
                  }}
                  key={key}
                  onPress={() => setDetailContext((current) => ({ ...current, [key]: !current[key] }))}
                >
                  <Text style={{ color: theme.text.primary, fontSize: 12, fontWeight: '500' }}>
                    {t(language, key)}
                  </Text>
                </WebPressable>
              ))}
            </WebView>
          </WebView>

          <WebView dataSet={{ 'v11-rebaseline-role': 'state-detail-group' }}>
            <Text style={{ color: theme.text.primary, fontSize: 14, fontWeight: '500' }}>
              {t(language, 'notes')}
            </Text>
            <WebTextInput
              accessibilityLabel={t(language, 'notes')}
              dataSet={{ 'v11-rebaseline-role': 'state-detail-notes' }}
              multiline
              onChangeText={setDetailNote}
              placeholder={t(language, 'stateNoteExample')}
              placeholderTextColor={theme.text.metadata}
              style={{ color: theme.text.primary, fontSize: 14, lineHeight: 20 }}
              value={detailNote}
            />
          </WebView>

          {stateStatusKey ? (
            <Text
              accessibilityLiveRegion="polite"
              style={{ color: stateSaveStatus === 'error' ? theme.questTheme.colors.danger : theme.text.secondary, fontSize: 12, lineHeight: 18 }}
            >
              {t(language, stateStatusKey)}
            </Text>
          ) : null}
        </WebView>
      </V11Stage2ProductionSheet>
    );
  }

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
