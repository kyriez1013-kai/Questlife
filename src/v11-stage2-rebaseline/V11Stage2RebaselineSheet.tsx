import React, { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { t, type Lang } from '../i18n';
import {
  getV11ThemeTokens,
  type V11ThemeMode,
} from '../v11/tokens';
import type { RebaselineExecutionRow } from './fixtures';
import V11CalibrationRail from './V11CalibrationRail';
import V11RebaselineIcon from './V11RebaselineIcon';
import V11Stage2ProductionSheet from './V11Stage2ProductionSheet';
import {
  V11CategoricalChip,
  V11ComposerAction,
  V11InlineButton,
  V11StickySheetFooter,
  V11TextField,
} from '../v11/components/V11SheetControls';

const WebView = View as any;
const WebPressable = Pressable as any;
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
  onCaptureSaved?: (rawText: string) => void;
  onClose: () => void;
  onDetailedState: () => void;
  onFeedback: (value: 'useful' | 'not_useful') => void;
  onDeleteRecord?: (recordId: string) => void;
  onOpenRecord: (recordId: string) => void;
  onRecordFeedback: (recordId: string, value: 'useful' | 'not_useful') => void;
  onState: (value: number) => void;
  recent: RebaselineExecutionRow[];
  recordFeedback: 'useful' | 'not_useful' | null;
  recordFeedbackStatus: 'idle' | 'saving' | 'saved';
  reducedMotion: boolean;
  selectedRecordId: string | null;
  selectedState: number | null;
  sheet: RebaselineSheet;
  stateSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  themeMode: V11ThemeMode;
};

type CaptureFlowStatus = 'idle' | 'loading' | 'error' | 'pending' | 'saved';

function captureQuery() {
  if (typeof window === 'undefined') return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

function initialCaptureStatus(): CaptureFlowStatus {
  const value = captureQuery().get('captureState');
  return value === 'loading' || value === 'error' || value === 'pending' || value === 'saved'
    ? value
    : 'idle';
}

function initialCaptureText() {
  const preset = captureQuery().get('capturePreset');
  if (preset === 'short') return '卧推 80kg 3x5';
  if (preset === 'multiline') return '今天练胸\n卧推 80kg 3x5\n上斜卧推 60kg 3x8';
  if (preset === 'long-en') {
    return 'Bench press 80 kg for three sets of five reps, then incline press 60 kg for three sets of eight. Energy felt steady and the final set was challenging.';
  }
  return '';
}

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
  onCaptureSaved,
  onClose,
  onDetailedState,
  onFeedback,
  onDeleteRecord,
  onOpenRecord,
  onRecordFeedback,
  onState,
  recent,
  recordFeedback,
  recordFeedbackStatus,
  reducedMotion,
  selectedRecordId,
  selectedState,
  sheet,
  stateSaveStatus,
  themeMode,
}: Props) {
  const theme = getV11ThemeTokens(themeMode);
  const [captureText, setCaptureText] = useState(initialCaptureText);
  const [captureStatus, setCaptureStatus] = useState<CaptureFlowStatus>(initialCaptureStatus);
  const [captureInputHeight, setCaptureInputHeight] = useState(68);
  const captureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const captureRequestRef = useRef(0);
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
  const selectedRecord = recent.find((row) => row.id === selectedRecordId) ?? null;

  useEffect(() => {
    if (sheet !== 'state-detail') return;
    setDetailValues((current) => ({ ...current, overall: selectedState ?? 3 }));
  }, [selectedState, sheet]);

  useEffect(() => () => {
    if (captureTimerRef.current) clearTimeout(captureTimerRef.current);
    captureRequestRef.current += 1;
  }, []);

  useEffect(() => {
    if (sheet === 'capture') return;
    if (captureTimerRef.current) {
      clearTimeout(captureTimerRef.current);
      captureTimerRef.current = null;
    }
    captureRequestRef.current += 1;
    setCaptureStatus('idle');
  }, [sheet]);

  if (!sheet) return null;

  const logCaptureFixtureQa = (
    requestId: string,
    rawText: string,
    status: 'loading' | 'pending' | 'error',
  ) => {
    if (captureQuery().get('debugCapture') !== '1') return;
    console.info('[v11-capture-fixture-qa]', JSON.stringify({
      requestTimestamp: new Date().toISOString(),
      submittedRawText: rawText,
      endpoint: null,
      httpStatus: null,
      responseIdentifier: requestId,
      fallbackUsed: false,
      fixtureMode: true,
      status,
    }));
  };

  const submitCapture = () => {
    if (!captureText.trim() || captureStatus === 'loading') return;
    if (captureTimerRef.current) clearTimeout(captureTimerRef.current);
    const requestNumber = captureRequestRef.current + 1;
    captureRequestRef.current = requestNumber;
    const requestId = `fixture-capture-${requestNumber}`;
    const requestText = captureText.trim();
    setCaptureStatus('loading');
    logCaptureFixtureQa(requestId, requestText, 'loading');
    captureTimerRef.current = setTimeout(() => {
      if (captureRequestRef.current !== requestNumber) return;
      const nextStatus = captureQuery().get('captureResult') === 'error' ? 'error' : 'pending';
      setCaptureStatus(nextStatus);
      logCaptureFixtureQa(requestId, requestText, nextStatus);
    }, 640);
  };

  const retryCapture = () => {
    if (captureTimerRef.current) clearTimeout(captureTimerRef.current);
    const requestNumber = captureRequestRef.current + 1;
    captureRequestRef.current = requestNumber;
    const requestId = `fixture-capture-${requestNumber}`;
    const requestText = captureText.trim();
    setCaptureStatus('loading');
    logCaptureFixtureQa(requestId, requestText, 'loading');
    captureTimerRef.current = setTimeout(() => {
      if (captureRequestRef.current !== requestNumber) return;
      setCaptureStatus('pending');
      logCaptureFixtureQa(requestId, requestText, 'pending');
    }, 640);
  };

  const stateLabels = ['veryBad', 'bad', 'average', 'good', 'great'];
  const stateStatusKey = stateSaveStatus === 'saving'
    ? 'rebaselineStateSaving'
    : stateSaveStatus === 'saved'
      ? 'stateCheckInSaved'
      : stateSaveStatus === 'error'
        ? 'rebaselineStateSaveError'
        : null;

  if (sheet === 'capture') {
    return (
      <V11Stage2ProductionSheet
        closeLabel={t(language, 'close')}
        footer={captureStatus === 'pending' ? (
          <V11StickySheetFooter
            cancelLabel={t(language, 'cancel')}
            onCancel={onClose}
            onSave={() => {
              setCaptureStatus('saved');
              onCaptureSaved?.(captureText.trim());
            }}
            saveLabel={t(language, 'rebaselineCaptureConfirm')}
            theme={theme}
          />
        ) : undefined}
        onClose={onClose}
        reducedMotion={reducedMotion}
        sheet="capture"
        theme={theme}
        title={t(language, 'rebaselineCaptureTitle')}
        visible
      >
        <WebView dataSet={{ 'v11-rebaseline-role': 'capture-composer-form' }}>
          <WebView dataSet={{ 'v11-rebaseline-role': 'capture-composer-row' }}>
            <WebView dataSet={{ 'v11-rebaseline-role': 'capture-input-slot' }}>
              <V11TextField
                accessibilityLabel={t(language, 'rebaselineCapturePlaceholder')}
                autoFocus
                disabled={captureStatus === 'loading'}
                multiline
                onChangeText={(value) => {
                  if (captureTimerRef.current) clearTimeout(captureTimerRef.current);
                  captureRequestRef.current += 1;
                  setCaptureText(value);
                  if (captureStatus !== 'idle') setCaptureStatus('idle');
                }}
                onContentSizeChange={(event) => {
                  if (!captureText.trim()) {
                    setCaptureInputHeight(68);
                    return;
                  }
                  const nextHeight = Math.max(68, Math.min(156, event.nativeEvent.contentSize.height + 16));
                  setCaptureInputHeight(nextHeight);
                }}
                placeholder={t(language, 'rebaselineCapturePlaceholder')}
                scrollEnabled
                style={{ height: captureText.trim() ? captureInputHeight : 68, minHeight: 68, maxHeight: 156, textAlignVertical: 'top' }}
                theme={theme}
                value={captureText}
              />
            </WebView>
            <WebView dataSet={{ 'v11-rebaseline-role': 'capture-action-slot' }}>
              <V11ComposerAction
                disabled={!captureText.trim()}
                label={t(language, 'rebaselineSendCapture')}
                loading={captureStatus === 'loading'}
                onPress={submitCapture}
                theme={theme}
              >
                <V11RebaselineIcon name="arrow" size={18} color={theme.control.primaryActionText} />
              </V11ComposerAction>
            </WebView>
          </WebView>

          <Text style={{ color: theme.text.secondary, fontSize: 13, lineHeight: 20 }}>
            {t(language, 'rebaselineCaptureExplainer')}
          </Text>

          {captureStatus === 'loading' ? (
            <Text accessibilityLiveRegion="polite" style={{ color: theme.text.secondary, fontSize: 13, lineHeight: 20 }}>
              {t(language, 'rebaselineCaptureLoading')}
            </Text>
          ) : null}

          {captureStatus === 'error' ? (
            <WebView dataSet={{ 'v11-rebaseline-role': 'capture-flow-status', 'v11-status': 'error' }}>
              <Text accessibilityLiveRegion="polite" style={{ color: theme.control.error, fontSize: 13, lineHeight: 20 }}>
                {t(language, 'rebaselineCaptureParseFailed')}
              </Text>
              <V11InlineButton
                label={t(language, 'rebaselineCaptureRetry')}
                onPress={retryCapture}
                theme={theme}
              />
            </WebView>
          ) : null}

          {captureStatus === 'pending' ? (
            <WebView dataSet={{ 'v11-rebaseline-role': 'capture-confirmation' }}>
              <Text style={{ color: theme.text.primary, fontSize: 15, lineHeight: 22, fontWeight: '500' }}>
                {t(language, 'rebaselineCapturePendingTitle')}
              </Text>
              <Text style={{ color: theme.text.secondary, fontSize: 13, lineHeight: 20 }}>
                {t(language, 'rebaselineCaptureCurrentRaw')} · {captureText.trim()}
              </Text>
              <V11InlineButton
                label={t(language, 'rebaselineCaptureEdit')}
                onPress={() => setCaptureStatus('idle')}
                theme={theme}
              />
            </WebView>
          ) : null}

          {captureStatus === 'saved' ? (
            <Text accessibilityLiveRegion="polite" style={{ color: theme.text.primary, fontSize: 13, lineHeight: 20 }}>
              {t(language, 'rebaselineCaptureSaved')}
            </Text>
          ) : null}
        </WebView>
      </V11Stage2ProductionSheet>
    );
  }

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
                <V11CalibrationRail
                  accessibilityLabel={t(language, key)}
                  language={language}
                  onSelect={(option) => setDetailValues((current) => ({ ...current, [key]: option }))}
                  reducedMotion={reducedMotion}
                  selectedValue={value}
                  showSelectedMeaning={false}
                  status={stateSaveStatus}
                  theme={theme}
                  variant="sheet"
                />
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
    <V11Stage2ProductionSheet
      closeLabel={t(language, 'close')}
      onClose={onClose}
      reducedMotion={reducedMotion}
      minHeight={sheet === 'record' ? 220 : undefined}
      sheet={sheet === 'state'
          ? 'state'
          : sheet === 'record'
            ? 'record'
            : 'production'}
      theme={theme}
      title={sheet === 'history'
        ? `${t(language, titleKey(sheet))} · ${recent.length}`
        : t(language, titleKey(sheet))}
      visible
    >
        {sheet === 'state' ? (
          <>
            <Text style={{ color: theme.text.secondary, fontSize: 13, lineHeight: 20 }}>
              {t(language, 'rebaselineStatePrompt')}
            </Text>
            <V11CalibrationRail
              accessibilityLabel={t(language, 'rebaselineCalibrationRailLabel')}
              language={language}
              onSelect={onState}
              reducedMotion={reducedMotion}
              selectedValue={selectedState}
              status={stateSaveStatus}
              theme={theme}
              variant="today"
            />
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
          <WebView dataSet={{ 'v11-rebaseline-role': 'history-list' }}>
            {recent.length === 0 ? (
              <Text style={{ color: theme.text.secondary, fontSize: 13, lineHeight: 20 }}>
                {t(language, 'rebaselineNoLatestRecord')}
              </Text>
            ) : recent.map((row) => (
              <WebPressable
                accessibilityRole="button"
                dataSet={{ 'v11-rebaseline-role': 'history-row' }}
                key={row.id}
                onPress={() => onOpenRecord(row.id)}
              >
                <V11RebaselineIcon name="activity" size={18} color={theme.glow.primary} />
                <WebView style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={2} style={{ flexShrink: 1, color: theme.text.primary, fontSize: 15, lineHeight: 21, fontWeight: '500' }}>
                    {row.titleText ?? t(language, row.titleKey)}
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
          </WebView>
        ) : null}

        {sheet === 'record' ? (
          selectedRecord ? (
            <WebView dataSet={{ 'v11-rebaseline-role': 'record-detail' }}>
              <WebView dataSet={{ 'v11-rebaseline-role': 'record-detail-summary' }}>
                <V11RebaselineIcon name="activity" size={18} color={theme.glow.primary} />
                <WebView style={{ flex: 1, flexShrink: 1, minWidth: 0 }}>
                  <Text numberOfLines={3} style={{ flexShrink: 1, color: theme.text.primary, fontSize: 17, lineHeight: 24, fontWeight: '500' }}>
                    {selectedRecord.titleText ?? t(language, selectedRecord.titleKey)}
                  </Text>
                  <Text numberOfLines={3} style={{ flexShrink: 1, color: theme.text.secondary, fontSize: 12, lineHeight: 18 }}>
                    {t(language, selectedRecord.metaKey)} · {t(language, selectedRecord.resultKey)}
                  </Text>
                </WebView>
                <Text style={{ color: theme.text.metadata, fontSize: 11 }}>
                  {t(language, selectedRecord.timeKey)}
                </Text>
              </WebView>

              {selectedRecord.feedbackTextKey ? (
                <WebView dataSet={{ 'v11-rebaseline-role': 'record-feedback' }}>
                  <Text style={{ color: theme.text.metadata, fontSize: 10, lineHeight: 15, letterSpacing: 0.7 }}>
                    {t(language, 'rebaselineExecutionFeedbackTitle')}
                  </Text>
                  <Text style={{ color: theme.text.primary, fontSize: 14, lineHeight: 21 }}>
                    {t(language, selectedRecord.feedbackTextKey)}
                  </Text>
                  <Text style={{ color: theme.text.secondary, fontSize: 12, lineHeight: 18 }}>
                    {t(language, 'rebaselineExecutionFeedbackQuestion')}
                  </Text>
                  <WebView dataSet={{ 'v11-rebaseline-role': 'record-feedback-choices' }}>
                    {(['useful', 'not_useful'] as const).map((value) => (
                      <V11CategoricalChip
                        accessibilityRole="radio"
                        key={value}
                        label={t(language, value === 'useful' ? 'useful' : 'notUseful')}
                        onPress={() => onRecordFeedback(selectedRecord.id, value)}
                        selected={recordFeedback === value}
                        theme={theme}
                      />
                    ))}
                  </WebView>
                  {recordFeedbackStatus !== 'idle' ? (
                    <Text accessibilityLiveRegion="polite" style={{ color: theme.text.secondary, fontSize: 12, lineHeight: 18 }}>
                      {t(language, recordFeedbackStatus === 'saving' ? 'feedbackSaving' : 'feedbackSaved')}
                    </Text>
                  ) : null}
                </WebView>
              ) : null}

              {onDeleteRecord ? (
                <V11InlineButton
                  label={t(language, 'rebaselineDeleteFixtureRecord')}
                  onPress={() => onDeleteRecord(selectedRecord.id)}
                  theme={theme}
                />
              ) : null}
            </WebView>
          ) : (
            <Text style={{ color: theme.text.secondary, fontSize: 13, lineHeight: 20 }}>
              {t(language, 'rebaselineRecordUnavailable')}
            </Text>
          )
        ) : null}

        {sheet === 'decision' ? (
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
    </V11Stage2ProductionSheet>
  );
}
