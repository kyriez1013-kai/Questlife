// V2: "设置" Tab
// 提醒已移到每个技能内, 这里只保留版本号 + 本地存储说明
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import ColorPicker from '../components/ColorPicker';
import { useStore } from '../store';
import { getLanguage, t } from '../i18n';
import { appAccent, theme } from '../theme';
import { getQuestTheme, questLayout, themeOptions } from '../design/tokens';
import { trackEvent } from '../utils/analytics';
import { confirmAction } from '../utils/confirm';
import { buildDecisionPayload } from '../utils/decisionPayload';
import { AiDecisionService, getLastDecisionServiceMeta, isDecisionAIEnabled, isDecisionAIShadowEnabled, isDecisionDailyBriefEnabled, LegacyDecisionService } from '../services/decisionService';
import { DecisionBriefResult } from '../utils/decisionTypes';
import { evaluateDecisionBriefQuality } from '../utils/decisionQuality';
import { auditDecisionPayload, diagnoseDecisionOutput } from '../utils/decisionRealityAudit';
import { buildDecisionMemorySummary, compactDecisionResults } from '../utils/decisionMemory';
import { buildPatternMemorySummary, derivePatternCandidates, mergePatternCandidates, sanitizePatternMemoryForPayload } from '../utils/patternMemory';
import { parseHealthContextText, ParsedHealthContext } from '../utils/healthContextParser';
import QuestInput from '../components/ui/QuestInput';
import QuestButton from '../components/ui/QuestButton';
import QuestPill from '../components/ui/QuestPill';
import { QuestCompactRow, QuestGroupedSurface, QuestSectionHeader } from '../components/ui/QuestPrimitives';
import QuestSegmentedControl from '../components/ui/QuestSegmentedControl';

export default function SettingsScreen() {
  const { data, setSettings, addContextLogs, runIntegrityCheck, repairSafeIntegrityIssues, rebuildDerivedData, mergePatternMemoryCandidates, updatePatternMemoryStatus } = useStore();
  const questTheme = getQuestTheme(data.settings.selectedThemeId);
  const accent = appAccent(data.settings.accentColor ?? questTheme.colors.primary);
  const lang = getLanguage(data.settings.language);
  const [integrityIssueCount, setIntegrityIssueCount] = useState<number | null>(null);
  const [decisionLabOutput, setDecisionLabOutput] = useState('');
  const [decisionLabError, setDecisionLabError] = useState('');
  const [decisionLabLoading, setDecisionLabLoading] = useState(false);
  const [decisionPatternDebug, setDecisionPatternDebug] = useState<{
    accepted: number;
    candidates: number;
    references: number;
    ignored: boolean;
    candidateMisuse: boolean;
    evidenceBasis?: string;
  } | null>(null);
  const [lastDecisionFeedback, setLastDecisionFeedback] = useState('');
  const [contextPasteText, setContextPasteText] = useState('');
  const [contextPreview, setContextPreview] = useState<ParsedHealthContext | null>(null);
  const [contextSaved, setContextSaved] = useState(false);
  const [decisionFlagSnapshot, setDecisionFlagSnapshot] = useState(() => ({
    aiEnabled: isDecisionAIEnabled(),
    dailyBriefEnabled: isDecisionDailyBriefEnabled(),
    shadowEnabled: isDecisionAIShadowEnabled(),
  }));
  const decisionMemorySummary = buildDecisionMemorySummary(data.decisionResults || []);
  const recentDecisionResults = compactDecisionResults(data.decisionResults || [], 5);
  const derivedPatternCandidates = useMemo(() => derivePatternCandidates(data), [data]);
  const patternReviewItems = useMemo(
    () => mergePatternCandidates(data.patternMemory || [], derivedPatternCandidates),
    [data.patternMemory, derivedPatternCandidates],
  );
  const patternMemorySummary = buildPatternMemorySummary(data.patternMemory || []);
  const patternPayload = sanitizePatternMemoryForPayload(data.patternMemory || []);
  const contextLogCount = (data.contextLogs || []).length;
  const stateSignalCount = (data.stateCheckIns || []).length;
  const executionLogCount = (data.executionLogs || []).length;
  const decisionResultCount = (data.decisionResults || []).length;
  const hasUserSignals = contextLogCount + stateSignalCount + executionLogCount > 0;
  const decisionDebugVisible = (() => {
    if (typeof window === 'undefined') return false;
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('debugDecision') === '1' || window.localStorage?.getItem('questlife_debug_decision_ai') === 'true';
    } catch {
      return false;
    }
  })();
  const developerToolsVisible = __DEV__ || decisionDebugVisible;
  const readLastDecisionFeedback = useCallback(() => {
    if (typeof window === 'undefined') return '';
    try {
      const raw = window.localStorage?.getItem('questlife_decision_ai_last_feedback');
      if (!raw) return '';
      const parsed = JSON.parse(raw);
      const label = parsed?.feedback === 'useful' ? t(lang, 'decisionUseful') : parsed?.feedback === 'not_useful' ? t(lang, 'decisionNotUseful') : '';
      return label ? `${label} · ${t(lang, 'instantMicroMode')} · ${parsed?.timestamp || ''}` : '';
    } catch {
      return '';
    }
  }, [lang]);
  useFocusEffect(useCallback(() => {
    if (decisionDebugVisible) {
      setLastDecisionFeedback(readLastDecisionFeedback());
      setDecisionFlagSnapshot({
        aiEnabled: isDecisionAIEnabled(),
        dailyBriefEnabled: isDecisionDailyBriefEnabled(),
        shadowEnabled: isDecisionAIShadowEnabled(),
      });
    }
    return undefined;
  }, [decisionDebugVisible, readLastDecisionFeedback]));
  const refreshDecisionFlagSnapshot = () => setDecisionFlagSnapshot({
    aiEnabled: isDecisionAIEnabled(),
    dailyBriefEnabled: isDecisionDailyBriefEnabled(),
    shadowEnabled: isDecisionAIShadowEnabled(),
  });

  const setDecisionFlag = (key: string, enabled: boolean, enabledText: string, disabledText: string) => {
    if (typeof window === 'undefined') return;
    try {
      if (enabled) window.localStorage?.setItem(key, 'true');
      else window.localStorage?.removeItem(key);
      setDecisionLabOutput(enabled ? enabledText : disabledText);
      setDecisionLabError('');
      refreshDecisionFlagSnapshot();
    } catch (error: any) {
      setDecisionLabError(String(error?.message || error));
    }
  };

  const setDecisionAIFlag = (enabled: boolean) => {
    setDecisionFlag(
      'questlife_decision_ai_enabled',
      enabled,
      t(lang, 'decisionAIEnabledForDebug'),
      t(lang, 'decisionAIDisabledForDebug'),
    );
  };
  const setDecisionDailyBriefFlag = (enabled: boolean) => {
    setDecisionFlag(
      'questlife_decision_daily_brief_enabled',
      enabled,
      t(lang, 'dailyAIBriefEnabledForDebug'),
      t(lang, 'dailyAIBriefDisabledForDebug'),
    );
  };
  const setDecisionShadowFlag = (enabled: boolean) => {
    setDecisionFlag(
      'questlife_decision_ai_shadow',
      enabled,
      t(lang, 'decisionAIShadowEnabledForDebug'),
      t(lang, 'decisionAIShadowDisabledForDebug'),
    );
  };
  const runDecisionLab = async (kind: 'legacy_daily' | 'ai_daily' | 'ai_instant') => {
    setDecisionLabLoading(true);
    setDecisionLabError('');
    try {
      const payload = buildDecisionPayload(data, {
        mode: kind === 'ai_instant' ? 'instant_micro' : 'daily_brief',
        trigger: 'debug',
        locale: lang,
      });
      const service = kind === 'legacy_daily' ? new LegacyDecisionService() : new AiDecisionService();
      const result = await service.buildBrief(payload);
      const quality = evaluateDecisionBriefQuality({ result, payload, mode: payload.mode });
      const serviceMeta = getLastDecisionServiceMeta();
      const payloadAudit = auditDecisionPayload(payload);
      const genericDiagnosis = diagnoseDecisionOutput({
        payload,
        result,
        quality,
        source: serviceMeta.service,
      });
      setDecisionPatternDebug({
        accepted: payload.profile.confirmed_patterns.length,
        candidates: payload.profile.pattern_candidates?.length || 0,
        references: result.pattern_references?.length || 0,
        ignored: genericDiagnosis.ignoredAcceptedPatterns,
        candidateMisuse: genericDiagnosis.candidateMisuse,
        evidenceBasis: result.evidence_basis,
      });
      setDecisionLabOutput(JSON.stringify({
        service: serviceMeta,
        payloadAudit,
        genericDiagnosis,
        failedChecks: quality.checks.filter((check) => !check.passed).map((check) => ({
          id: check.id,
          severity: check.severity,
          messageKey: check.messageKey,
          detail: check.detail,
        })),
        payloadSummary: {
          mode: payload.mode,
          trigger: payload.trigger,
          decision_memory_summary: payload.decision_memory_summary,
          pattern_memory_summary: payload.profile.pattern_memory_summary,
          confirmed_patterns: payload.profile.confirmed_patterns.length,
          pattern_candidates: payload.profile.pattern_candidates?.length || 0,
          goals: payload.profile.active_goals.length,
          skills: payload.profile.skills.length,
          last7Days: payload.history_index.last_7_days.length,
          contextItems: payload.today_context.recent_context_logs.length,
          latestStateExists: !!payload.current_state,
          scheduleToday: payload.schedule_today.length,
          approxBytes: JSON.stringify(payload).length,
        },
        quality,
        result,
      }, null, 2));
    } catch (error: any) {
      setDecisionLabError(String(error?.message || error));
    } finally {
      setDecisionLabLoading(false);
    }
  };
  const runBadDecisionSimulation = () => {
    const payload = buildDecisionPayload(data, { mode: 'instant_micro', trigger: 'debug', locale: lang });
    const result: DecisionBriefResult = {
      schema_version: '1.0',
      generated_at: new Date().toISOString(),
      readiness: { score: null, band: 'unknown', vs_baseline: 'unknown', drivers: [] },
      headline_insight: lang === 'zh' ? '保持积极，继续努力。' : 'Stay positive and keep going.',
      perception_gap: { detected: false, subjective: '', objective: '', interpretation: '', test_action: '' },
      deep_analysis: lang === 'zh' ? '照顾好自己。' : 'Listen to your body.',
      prescription: { do_first: { step: lang === 'zh' ? '继续努力。' : 'Try your best.', why: '', duration_min: null }, schedule_adjustments: [], do_not: [] },
      patterns_surfaced: [],
      confidence: 0.8,
      evidence_basis: 'population_prior',
      data_gaps: [],
      tone: 'assertive',
    };
    const quality = evaluateDecisionBriefQuality({ result, payload, mode: payload.mode });
    const payloadAudit = auditDecisionPayload(payload);
    const genericDiagnosis = diagnoseDecisionOutput({
      payload,
      result,
      quality,
      source: 'mock_weak_output',
    });
    setDecisionPatternDebug({
      accepted: payload.profile.confirmed_patterns.length,
      candidates: payload.profile.pattern_candidates?.length || 0,
      references: result.pattern_references?.length || 0,
      ignored: genericDiagnosis.ignoredAcceptedPatterns,
      candidateMisuse: genericDiagnosis.candidateMisuse,
      evidenceBasis: result.evidence_basis,
    });
    setDecisionLabError('');
    setDecisionLabOutput(JSON.stringify({
      service: { service: 'mock_weak_output', endpointOk: undefined },
      payloadAudit,
      genericDiagnosis,
      failedChecks: quality.checks.filter((check) => !check.passed).map((check) => ({
        id: check.id,
        severity: check.severity,
        messageKey: check.messageKey,
        detail: check.detail,
      })),
      payloadSummary: {
        mode: payload.mode,
        trigger: payload.trigger,
        decision_memory_summary: payload.decision_memory_summary,
        pattern_memory_summary: payload.profile.pattern_memory_summary,
        confirmed_patterns: payload.profile.confirmed_patterns.length,
        pattern_candidates: payload.profile.pattern_candidates?.length || 0,
        goals: payload.profile.active_goals.length,
        skills: payload.profile.skills.length,
        last7Days: payload.history_index.last_7_days.length,
        contextItems: payload.today_context.recent_context_logs.length,
        latestStateExists: !!payload.current_state,
        scheduleToday: payload.schedule_today.length,
        approxBytes: JSON.stringify(payload).length,
      },
      quality,
      result,
    }, null, 2));
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: questTheme.colors.background }]}>
      <ScrollView
        style={[styles.container, { backgroundColor: questTheme.colors.background }]}
        contentContainerStyle={{
          paddingHorizontal: questTheme.spacing.md,
          paddingTop: questTheme.spacing.sm,
          paddingBottom: questLayout.contentBottomInset + questTheme.spacing.lg,
          maxWidth: questLayout.contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        <QuestSectionHeader
          questTheme={questTheme}
          title={t(lang, 'preferences')}
          subtitle={t(lang, 'settingsSubtitle')}
          style={styles.firstSectionHeader}
        />
        <QuestGroupedSurface questTheme={questTheme}>
          <View style={styles.settingsGroupItem}>
            <Text style={[styles.label, { color: questTheme.colors.text }]}>{t(lang, 'language')}</Text>
            <QuestSegmentedControl
              value={lang}
              options={[
                { value: 'zh', label: '中文' },
                { value: 'en', label: 'English' },
              ]}
              onChange={(language) => setSettings({ language })}
              questTheme={questTheme}
              accessibilityLabel={t(lang, 'language')}
              style={styles.languageRow}
            />
          </View>
          <View style={[styles.settingsGroupItem, styles.settingsGroupDivider, { borderTopColor: questTheme.colors.divider }]}>
            <Text style={[styles.label, { color: questTheme.colors.text }]}>{t(lang, 'interfaceTheme')}</Text>
            <Text style={[styles.value, { color: questTheme.colors.textMuted }]}>{t(lang, 'visualStyle')}</Text>
            <View style={styles.themeGrid}>
              {themeOptions.map((opt) => {
                const on = questTheme.id === opt.id;
                const preview = getQuestTheme(opt.id);
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.themeOption,
                      { backgroundColor: preview.colors.surfaceSoft, borderColor: on ? preview.colors.primary : questTheme.colors.border },
                      on && { borderWidth: 2 },
                    ]}
                    onPress={() => {
                      setSettings({ selectedThemeId: opt.id });
                      trackEvent('theme_changed', { themeId: opt.id }, { page: 'settings' });
                    }}
                  >
                    <View style={styles.themeSwatches}>
                      <View style={[styles.themeSwatch, { backgroundColor: preview.colors.background }]} />
                      <View style={[styles.themeSwatch, { backgroundColor: preview.colors.primary }]} />
                      <View style={[styles.themeSwatch, { backgroundColor: preview.colors.accent }]} />
                    </View>
                    <Text style={[styles.languageText, { color: preview.colors.textPrimary }]}>{t(lang, opt.i18nKey)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <View style={[styles.settingsGroupItem, styles.settingsGroupDivider, { borderTopColor: questTheme.colors.divider }]}>
            <Text style={[styles.label, { color: questTheme.colors.text }]}>{t(lang, 'accentColor')}</Text>
            <Text style={[styles.value, { color: questTheme.colors.textMuted }]}>{t(lang, 'accentColorDesc')}</Text>
            <View style={styles.colorPreviewRow}>
              <View style={[styles.colorPreview, { backgroundColor: accent }]} />
              <Text style={[styles.colorValue, { color: accent }]}>{accent}</Text>
            </View>
            <ColorPicker colors={theme.accentPalette} value={accent} onChange={(color) => setSettings({ accentColor: color })} />
          </View>
          <QuestCompactRow
            questTheme={questTheme}
            divider
            title={t(lang, 'restartOnboarding')}
            body={t(lang, 'restartOnboardingDesc')}
            trailing={(
              <QuestButton
                questTheme={questTheme}
                variant="ghost"
                label={t(lang, 'restartOnboarding')}
                onPress={() => setSettings({ onboardingRestartRequested: true })}
              />
            )}
          />
          <QuestCompactRow questTheme={questTheme} divider title={t(lang, 'reminders')} body={t(lang, 'remindersText')} />
          <QuestCompactRow questTheme={questTheme} divider title={t(lang, 'version')} body={t(lang, 'versionText')} />
        </QuestGroupedSurface>

        <QuestSectionHeader
          questTheme={questTheme}
          title={t(lang, 'dataSources')}
          subtitle={t(lang, 'dataSourcesDescription')}
        />
        <QuestGroupedSurface questTheme={questTheme}>
          <View style={styles.settingsGroupItem}>
            <Text style={[styles.label, { color: questTheme.colors.text }]}>{t(lang, 'manualContextInput')}</Text>
            <QuestInput
              questTheme={questTheme}
              value={contextPasteText}
              onChangeText={(value) => {
                setContextPasteText(value);
                setContextPreview(null);
                setContextSaved(false);
              }}
              placeholder={t(lang, 'pasteHealthContext')}
              multiline
              style={styles.contextInput}
            />
            {contextPreview ? (
              <Text style={[styles.value, { color: contextPreview.contextLogs.length > 0 ? questTheme.colors.success : questTheme.colors.textMuted }]}>
                {contextPreview.contextLogs.length > 0
                  ? t(lang, 'contextPreviewFound').replace('{count}', String(contextPreview.contextLogs.length))
                  : t(lang, 'contextPreviewEmpty')}
              </Text>
            ) : null}
            {contextSaved ? <Text style={[styles.value, { color: questTheme.colors.success }]}>{t(lang, 'contextSaved')}</Text> : null}
            <View style={styles.dataSourceActions}>
              <QuestButton
                questTheme={questTheme}
                variant="secondary"
                label={t(lang, 'parseContext')}
                disabled={!contextPasteText.trim()}
                onPress={() => {
                  setContextPreview(parseHealthContextText(contextPasteText));
                  setContextSaved(false);
                }}
                style={styles.dataSourceButton}
              />
              <QuestButton
                questTheme={questTheme}
                label={t(lang, 'saveContext')}
                disabled={!contextPreview?.contextLogs.length}
                onPress={() => {
                  if (!contextPreview?.contextLogs.length) return;
                  addContextLogs(contextPreview.contextLogs);
                  setContextPasteText('');
                  setContextPreview(null);
                  setContextSaved(true);
                }}
                style={styles.dataSourceButton}
              />
            </View>
          </View>
          <QuestCompactRow
            questTheme={questTheme}
            divider
            title={t(lang, 'manualContextSource')}
            body={contextLogCount > 0
              ? `${t(lang, 'contextLogs')}: ${contextLogCount}`
              : t(lang, 'addContextForCoverage')}
            trailing={<QuestPill questTheme={questTheme} variant="success" label={t(lang, 'sourceAvailable')} />}
          />
          <QuestCompactRow
            questTheme={questTheme}
            divider
            title={t(lang, 'externalDataSources')}
            body={t(lang, 'noExternalDataSourceConnected')}
            trailing={<QuestPill questTheme={questTheme} variant="muted" label={t(lang, 'notConnected')} />}
          />
        </QuestGroupedSurface>

        <QuestSectionHeader
          questTheme={questTheme}
          title={t(lang, 'aiAndDecisions')}
          subtitle={t(lang, 'aiAndDecisionsDescription')}
        />
        <QuestGroupedSurface questTheme={questTheme}>
          <QuestCompactRow
            questTheme={questTheme}
            title={t(lang, 'decisionBriefStatus')}
            body={decisionFlagSnapshot.aiEnabled
              ? `${t(lang, 'dailyDecisionBrief')}: ${t(lang, decisionFlagSnapshot.dailyBriefEnabled ? 'flagOn' : 'flagOff')}`
              : t(lang, 'localDecisionFallbackActive')}
          />
          <QuestCompactRow
            questTheme={questTheme}
            divider
            title={t(lang, 'decisionMemory')}
            body={decisionResultCount > 0
              ? `${t(lang, 'totalDecisionResults')}: ${decisionResultCount} · ${t(lang, 'last7dDecisionResults')}: ${decisionMemorySummary.recent_count_7d}`
              : t(lang, 'noDecisionHistory')}
          />
        </QuestGroupedSurface>

        <QuestSectionHeader
          questTheme={questTheme}
          title={t(lang, 'dataHealth')}
          subtitle={t(lang, 'dataHealthDescription')}
        />
        <QuestGroupedSurface questTheme={questTheme}>
          <QuestCompactRow
            questTheme={questTheme}
            title={t(lang, 'storedSignals')}
            body={hasUserSignals
              ? `${t(lang, 'executionLogs')}: ${executionLogCount} · ${t(lang, 'stateSignals')}: ${stateSignalCount} · ${t(lang, 'contextLogs')}: ${contextLogCount}`
              : t(lang, 'dataStillAccumulating')}
          />
          <QuestCompactRow questTheme={questTheme} divider title={t(lang, 'dataLimitations')} body={t(lang, 'dataCoverageLimitation')} />
          <QuestCompactRow questTheme={questTheme} divider title={t(lang, 'storage')} body={t(lang, 'storageText')} />
        </QuestGroupedSurface>

        {developerToolsVisible ? (
          <QuestSectionHeader
            questTheme={questTheme}
            title={t(lang, 'developerTools')}
            subtitle={t(lang, 'developerToolsDescription')}
          />
        ) : null}

        {developerToolsVisible ? (
          <View style={[styles.card, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border, shadowColor: questTheme.colors.cardShadow }]}>
            <Text style={[styles.label, { color: questTheme.colors.text }]}>{t(lang, 'dataIntegrity')}</Text>
            <Text style={[styles.value, { color: questTheme.colors.textMuted }]}>
              {t(lang, 'goals')}: {data.categories.length} · {t(lang, 'modules')}: {(data.modules || []).length} · {t(lang, 'skills')}: {data.skills.length}{'\n'}
              {t(lang, 'executionLogs')}: {(data.executionLogs || []).length} · {t(lang, 'totalEfforts')}: {(data.effortUnits || []).length} · {t(lang, 'contributionLinks')}: {(data.contributionLinks || []).length}{'\n'}
              {integrityIssueCount == null ? t(lang, 'runIntegrityCheck') : integrityIssueCount === 0 ? t(lang, 'noIntegrityIssues') : `${t(lang, 'orphanDataFound')}: ${integrityIssueCount}`}
            </Text>
            <View style={styles.debugActions}>
              <TouchableOpacity
                style={[styles.debugBtn, { borderColor: questTheme.colors.border, backgroundColor: questTheme.colors.surfaceSoft }]}
                onPress={() => {
                  const result = runIntegrityCheck();
                  setIntegrityIssueCount(result.issues.length);
                }}
              >
                <Text style={[styles.debugBtnText, { color: questTheme.colors.text }]}>{t(lang, 'runIntegrityCheck')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.debugBtn, { borderColor: questTheme.colors.border, backgroundColor: questTheme.colors.surfaceSoft }]}
                onPress={() => {
                  const result = repairSafeIntegrityIssues();
                  setIntegrityIssueCount(result.issues.length);
                }}
              >
                <Text style={[styles.debugBtnText, { color: questTheme.colors.text }]}>{t(lang, 'repairSafeIssues')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.debugBtn, { borderColor: questTheme.colors.warning, backgroundColor: questTheme.colors.warningSoft }]}
                onPress={() => confirmAction({
                  title: t(lang, 'rebuildDerivedData'),
                  message: t(lang, 'rebuildWarning'),
                  cancelText: t(lang, 'cancel'),
                  confirmText: t(lang, 'rebuildDerivedData'),
                  onConfirm: () => rebuildDerivedData(),
                })}
              >
                <Text style={[styles.debugBtnText, { color: questTheme.colors.text }]}>{t(lang, 'rebuildDerivedData')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}



        {decisionDebugVisible ? (
          <View style={[styles.card, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border, shadowColor: questTheme.colors.cardShadow }]}> 
            <Text style={[styles.label, { color: questTheme.colors.text }]}>{t(lang, 'decisionAILab')}</Text>
            <Text style={[styles.value, { color: questTheme.colors.textMuted }]}>{t(lang, 'decisionAILabDesc')}</Text>
            <Text style={[styles.value, { color: questTheme.colors.textMuted, marginTop: 8 }]}>
              {t(lang, 'decisionAIFlagStatus')}: AI {t(lang, decisionFlagSnapshot.aiEnabled ? 'flagOn' : 'flagOff')} · {t(lang, 'enableDailyAIBrief')} {t(lang, decisionFlagSnapshot.dailyBriefEnabled ? 'flagOn' : 'flagOff')} · {t(lang, 'decisionAIShadow')} {t(lang, decisionFlagSnapshot.shadowEnabled ? 'flagOn' : 'flagOff')}
            </Text>
            <View style={styles.debugActions}>
              <TouchableOpacity
                disabled={decisionLabLoading}
                style={[styles.debugBtn, { borderColor: questTheme.colors.border, backgroundColor: questTheme.colors.surfaceSoft }]}
                onPress={() => runDecisionLab('legacy_daily')}
              >
                <Text style={[styles.debugBtnText, { color: questTheme.colors.text }]}>{t(lang, 'generateFallbackBrief')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={decisionLabLoading}
                style={[styles.debugBtn, { borderColor: accent, backgroundColor: questTheme.colors.primarySoft }]}
                onPress={() => runDecisionLab('ai_daily')}
              >
                <Text style={[styles.debugBtnText, { color: accent }]}>{t(lang, 'generateDailyDecisionBrief')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={decisionLabLoading}
                style={[styles.debugBtn, { borderColor: accent, backgroundColor: questTheme.colors.primarySoft }]}
                onPress={() => runDecisionLab('ai_instant')}
              >
                <Text style={[styles.debugBtnText, { color: accent }]}>{t(lang, 'generateInstantMicroBrief')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={decisionLabLoading}
                style={[styles.debugBtn, { borderColor: accent, backgroundColor: questTheme.colors.surfaceSoft }]}
                onPress={() => setDecisionAIFlag(true)}
              >
                <Text style={[styles.debugBtnText, { color: accent }]}>{t(lang, 'enableDecisionAIForDebug')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={decisionLabLoading}
                style={[styles.debugBtn, { borderColor: questTheme.colors.border, backgroundColor: questTheme.colors.surfaceSoft }]}
                onPress={() => setDecisionAIFlag(false)}
              >
                <Text style={[styles.debugBtnText, { color: questTheme.colors.text }]}>{t(lang, 'disableDecisionAIForDebug')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={decisionLabLoading}
                style={[styles.debugBtn, { borderColor: accent, backgroundColor: questTheme.colors.primarySoft }]}
                onPress={() => setDecisionDailyBriefFlag(true)}
              >
                <Text style={[styles.debugBtnText, { color: accent }]}>{t(lang, 'enableDailyAIBrief')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={decisionLabLoading}
                style={[styles.debugBtn, { borderColor: questTheme.colors.border, backgroundColor: questTheme.colors.surfaceSoft }]}
                onPress={() => setDecisionDailyBriefFlag(false)}
              >
                <Text style={[styles.debugBtnText, { color: questTheme.colors.text }]}>{t(lang, 'disableDailyAIBrief')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={decisionLabLoading}
                style={[styles.debugBtn, { borderColor: accent, backgroundColor: questTheme.colors.primarySoft }]}
                onPress={() => setDecisionShadowFlag(true)}
              >
                <Text style={[styles.debugBtnText, { color: accent }]}>{t(lang, 'enableDecisionAIShadow')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={decisionLabLoading}
                style={[styles.debugBtn, { borderColor: questTheme.colors.border, backgroundColor: questTheme.colors.surfaceSoft }]}
                onPress={() => setDecisionShadowFlag(false)}
              >
                <Text style={[styles.debugBtnText, { color: questTheme.colors.text }]}>{t(lang, 'disableDecisionAIShadow')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={decisionLabLoading}
                style={[styles.debugBtn, { borderColor: questTheme.colors.warning, backgroundColor: questTheme.colors.warningSoft }]}
                onPress={runBadDecisionSimulation}
              >
                <Text style={[styles.debugBtnText, { color: questTheme.colors.text }]}>{t(lang, 'simulateWeakDecisionOutput')}</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.memoryBox, { backgroundColor: questTheme.colors.surfaceSoft, borderColor: questTheme.colors.border }]}>
              <Text style={[styles.label, { color: questTheme.colors.text, marginBottom: 6 }]}>{t(lang, 'patternMemory')}</Text>
              <Text style={[styles.value, { color: questTheme.colors.textMuted }]}>
                {t(lang, 'acceptedPatterns')}: {patternMemorySummary.accepted_count} · {t(lang, 'candidatePatterns')}: {patternMemorySummary.candidate_count} · {t(lang, 'rejectedPatterns')}: {patternMemorySummary.rejected_count}{'\n'}
                {t(lang, 'patternIncludedInPayload')}: {patternPayload.confirmed_patterns.length > 0 ? t(lang, 'yes') : t(lang, 'no')} · {t(lang, 'lowConfidencePattern')}: {patternMemorySummary.low_confidence_count}
              </Text>
              <View style={styles.debugActions}>
                <TouchableOpacity
                  disabled={decisionLabLoading}
                  style={[styles.debugBtn, { borderColor: accent, backgroundColor: questTheme.colors.primarySoft }]}
                  onPress={() => {
                    mergePatternMemoryCandidates(derivedPatternCandidates);
                    setDecisionLabError('');
                    setDecisionLabOutput(`${t(lang, 'regeneratePatternCandidates')}: ${derivedPatternCandidates.length}`);
                  }}
                >
                  <Text style={[styles.debugBtnText, { color: accent }]}>{t(lang, 'regeneratePatternCandidates')}</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.value, { color: questTheme.colors.textMuted, marginTop: 8 }]}>{t(lang, 'patternCandidates')}</Text>
              {patternReviewItems.length === 0 ? (
                <Text style={[styles.value, { color: questTheme.colors.textSubtle, marginTop: 4 }]}>{t(lang, 'noPatternMemoryYet')}</Text>
              ) : (
                patternReviewItems.slice(0, 8).map((pattern) => (
                  <View key={pattern.id} style={[styles.memoryRow, { borderColor: questTheme.colors.border }]}>
                    <Text style={[styles.value, { color: questTheme.colors.text }]}>{pattern.label}</Text>
                    <Text style={[styles.value, { color: questTheme.colors.textMuted }]}>
                      {t(lang, 'patternType')}: {pattern.patternType} · {t(lang, 'sampleN')}: {pattern.sampleN} · {t(lang, 'confidence')}: {Math.round(pattern.confidence * 100)}% · {t(lang, 'evidenceBasis')}: {pattern.evidenceBasis}
                    </Text>
                    <Text style={[styles.value, { color: questTheme.colors.textSubtle }]}>
                      {pattern.status === 'accepted' ? t(lang, 'confirmedPattern') : pattern.status === 'candidate' ? t(lang, 'unconfirmedPattern') : pattern.status} · {pattern.caution || ''}
                    </Text>
                    <Text style={[styles.value, { color: questTheme.colors.textSubtle }]}>
                      {t(lang, 'support')}: {(pattern.support || []).map((item) => item.summary).slice(0, 2).join(' · ')}
                    </Text>
                    <View style={styles.debugActions}>
                      <TouchableOpacity
                        style={[styles.debugBtn, { borderColor: accent, backgroundColor: questTheme.colors.primarySoft }]}
                        onPress={() => {
                          mergePatternMemoryCandidates([pattern]);
                          updatePatternMemoryStatus(pattern.id, 'accepted');
                        }}
                      >
                        <Text style={[styles.debugBtnText, { color: accent }]}>{t(lang, 'acceptPattern')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.debugBtn, { borderColor: questTheme.colors.warning, backgroundColor: questTheme.colors.warningSoft }]}
                        onPress={() => {
                          mergePatternMemoryCandidates([pattern]);
                          updatePatternMemoryStatus(pattern.id, 'rejected');
                        }}
                      >
                        <Text style={[styles.debugBtnText, { color: questTheme.colors.text }]}>{t(lang, 'rejectPattern')}</Text>
                      </TouchableOpacity>
                      {pattern.status === 'accepted' ? (
                        <TouchableOpacity
                          style={[styles.debugBtn, { borderColor: questTheme.colors.border, backgroundColor: questTheme.colors.surface }]}
                          onPress={() => updatePatternMemoryStatus(pattern.id, 'archived')}
                        >
                          <Text style={[styles.debugBtnText, { color: questTheme.colors.textMuted }]}>{t(lang, 'archivePattern')}</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                ))
              )}
            </View>
            <Text style={[styles.value, { color: decisionLabError ? questTheme.colors.danger : questTheme.colors.textMuted, marginTop: 12 }]}> 
              {decisionLabLoading ? t(lang, 'decisionAILoading') : decisionLabError ? `${t(lang, 'decisionAIError')}: ${decisionLabError}` : decisionLabOutput ? t(lang, 'decisionAIResultPreview') : t(lang, 'decisionAIHiddenByDefault')}
            </Text>
            {decisionPatternDebug ? (
              <Text style={[styles.value, { color: questTheme.colors.textMuted, marginTop: 8 }]}>
                {t(lang, 'acceptedPatternsAvailable')}: {decisionPatternDebug.accepted} · {t(lang, 'candidatePatternsAvailable')}: {decisionPatternDebug.candidates} · {t(lang, 'patternReference')}: {decisionPatternDebug.references}{'\n'}
                {t(lang, 'ignoredAcceptedPatterns')}: {decisionPatternDebug.ignored ? t(lang, 'yes') : t(lang, 'no')} · {t(lang, 'candidatePatternMisuse')}: {decisionPatternDebug.candidateMisuse ? t(lang, 'yes') : t(lang, 'no')} · {t(lang, 'evidenceBasis')}: {decisionPatternDebug.evidenceBasis || '-'}
              </Text>
            ) : null}
            {decisionLabOutput ? (
              <Text style={[styles.monoText, { color: questTheme.colors.text, backgroundColor: questTheme.colors.surfaceSoft, borderColor: questTheme.colors.border }]}>{decisionLabOutput}</Text>
            ) : null}
            {lastDecisionFeedback ? (
              <Text style={[styles.value, { color: questTheme.colors.textMuted, marginTop: 12 }]}>
                {t(lang, 'lastInstantReadFeedback')}: {lastDecisionFeedback}
              </Text>
            ) : null}
            <View style={[styles.memoryBox, { backgroundColor: questTheme.colors.surfaceSoft, borderColor: questTheme.colors.border }]}>
              <Text style={[styles.label, { color: questTheme.colors.text, marginBottom: 6 }]}>{t(lang, 'decisionMemory')}</Text>
              <Text style={[styles.value, { color: questTheme.colors.textMuted }]}>
                {t(lang, 'totalDecisionResults')}: {(data.decisionResults || []).length} · {t(lang, 'last7dDecisionResults')}: {decisionMemorySummary.recent_count_7d}{'\n'}
                {t(lang, 'useful')}: {decisionMemorySummary.useful_count_7d} · {t(lang, 'notUseful')}: {decisionMemorySummary.not_useful_count_7d} · {t(lang, 'weakBadDecisionResults')}: {decisionMemorySummary.weak_or_bad_quality_count_7d}
              </Text>
              {decisionMemorySummary.repeated_failed_checks.length > 0 ? (
                <Text style={[styles.value, { color: questTheme.colors.textSubtle, marginTop: 6 }]}>
                  {t(lang, 'decisionQualityHistory')}: {decisionMemorySummary.repeated_failed_checks.join(', ')}
                </Text>
              ) : null}
              <Text style={[styles.value, { color: questTheme.colors.textMuted, marginTop: 10 }]}>{t(lang, 'recentDecisionResults')}</Text>
              {recentDecisionResults.length === 0 ? (
                <Text style={[styles.value, { color: questTheme.colors.textSubtle, marginTop: 4 }]}>{t(lang, 'noDecisionMemoryYet')}</Text>
              ) : (
                recentDecisionResults.map((result) => (
                  <View key={result.id} style={[styles.memoryRow, { borderColor: questTheme.colors.border }]}>
                    <Text style={[styles.value, { color: questTheme.colors.text }]}>
                      {result.headlineInsight || t(lang, 'latestDecisionMemory')}
                    </Text>
                    <Text style={[styles.value, { color: questTheme.colors.textMuted }]}>
                      {t(lang, 'decisionResultMode')}: {result.mode} · {t(lang, 'decisionResultSource')}: {result.source} · {t(lang, 'decisionResultQuality')}: {result.quality ? `${result.quality.grade}/${result.quality.score}` : '-'} · {t(lang, 'decisionFeedback')}: {result.userFeedback?.rating === 'useful' ? t(lang, 'useful') : result.userFeedback?.rating === 'not_useful' ? t(lang, 'notUseful') : '-'}
                    </Text>
                    <Text style={[styles.value, { color: questTheme.colors.textSubtle }]}>
                      {t(lang, 'evidence')}: {result.evidenceBasis || '-'} · {t(lang, 'confidence')}: {result.confidence == null ? '-' : Math.round(result.confidence * 100) + '%'} · {result.createdAt}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>
        ) : null}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  container: { flex: 1, backgroundColor: theme.bg },
  h1: { color: theme.text, fontSize: 34, fontWeight: '800' },
  sub: { color: theme.textDim, marginTop: 4, marginBottom: 18 },
  card: { backgroundColor: theme.card, padding: 14, borderRadius: theme.radius.lg, marginBottom: 8, borderWidth: 1, borderColor: theme.border },
  firstSectionHeader: { marginTop: 6 },
  settingsGroupItem: { padding: 14 },
  settingsGroupDivider: { borderTopWidth: 1 },
  label: { color: theme.text, fontSize: 15, fontWeight: '800', marginBottom: 6 },
  value: { color: theme.textDim, fontSize: 12, lineHeight: 18 },
  aboutRow: { paddingVertical: 2 },
  aboutRowDivider: { borderTopWidth: 1, marginTop: 10, paddingTop: 10 },
  aboutLabel: { fontSize: 14, marginBottom: 4 },
  colorPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 10 },
  colorPreview: { width: 34, height: 34, borderRadius: 17 },
  colorValue: { fontSize: 13, fontWeight: '800' },
  contextInput: { minHeight: 72, marginTop: 10, marginBottom: 8, textAlignVertical: 'top' },
  dataSourceActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 8 },
  dataSourceButton: { flexGrow: 1, flexBasis: 140, minWidth: 140 },
  languageRow: { width: '100%' },
  languageText: { color: theme.text, fontWeight: '800' },
  languageTextOn: { color: '#fff' },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  memoryBox: { marginTop: 14, padding: 12, borderWidth: 1, borderRadius: theme.radius.md },
  memoryRow: { paddingTop: 8, marginTop: 8, borderTopWidth: 1 },
  themeOption: { width: '48.5%', minWidth: 142, padding: 10, borderRadius: theme.radius.md, borderWidth: 1 },
  themeSwatches: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  themeSwatch: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  debugActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  debugBtn: { minHeight: questLayout.controlMinHeight, justifyContent: 'center', borderWidth: 1, borderRadius: theme.radius.md, paddingHorizontal: 10, paddingVertical: 9 },
  debugBtnText: { fontSize: 12, fontWeight: '800' },
  monoText: { marginTop: 12, borderWidth: 1, borderRadius: theme.radius.md, padding: 10, fontSize: 11, lineHeight: 16 } as any,
});
