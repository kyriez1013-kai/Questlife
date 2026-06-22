// V2: "设置" Tab
// 提醒已移到每个技能内, 这里只保留版本号 + 本地存储说明
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import ColorPicker from '../components/ColorPicker';
import { useStore } from '../store';
import { getLanguage, t } from '../i18n';
import { appAccent, theme } from '../theme';
import { getQuestTheme, themeOptions } from '../design/tokens';
import { trackEvent } from '../utils/analytics';
import { confirmAction } from '../utils/confirm';
import { buildDecisionPayload } from '../utils/decisionPayload';
import { AiDecisionService, LegacyDecisionService } from '../services/decisionService';
import { DecisionBriefResult } from '../utils/decisionTypes';
import { evaluateDecisionBriefQuality } from '../utils/decisionQuality';

export default function SettingsScreen() {
  const { data, setSettings, runIntegrityCheck, repairSafeIntegrityIssues, rebuildDerivedData } = useStore();
  const questTheme = getQuestTheme(data.settings.selectedThemeId);
  const accent = appAccent(data.settings.accentColor ?? questTheme.colors.primary);
  const lang = getLanguage(data.settings.language);
  const [integrityIssueCount, setIntegrityIssueCount] = useState<number | null>(null);
  const [decisionLabOutput, setDecisionLabOutput] = useState('');
  const [decisionLabError, setDecisionLabError] = useState('');
  const [decisionLabLoading, setDecisionLabLoading] = useState(false);
  const [lastDecisionFeedback, setLastDecisionFeedback] = useState('');
  const decisionDebugVisible = (() => {
    if (typeof window === 'undefined') return false;
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('debugDecision') === '1' || window.localStorage?.getItem('questlife_debug_decision_ai') === 'true';
    } catch {
      return false;
    }
  })();
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
    if (decisionDebugVisible) setLastDecisionFeedback(readLastDecisionFeedback());
    return undefined;
  }, [decisionDebugVisible, readLastDecisionFeedback]));
  const setDecisionAIFlag = (enabled: boolean) => {
    if (typeof window === 'undefined') return;
    try {
      if (enabled) {
        window.localStorage?.setItem('questlife_decision_ai_enabled', 'true');
        setDecisionLabOutput(t(lang, 'decisionAIEnabledForDebug'));
      } else {
        window.localStorage?.removeItem('questlife_decision_ai_enabled');
        setDecisionLabOutput(t(lang, 'decisionAIDisabledForDebug'));
      }
      setDecisionLabError('');
    } catch (error: any) {
      setDecisionLabError(String(error?.message || error));
    }
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
      setDecisionLabOutput(JSON.stringify({
        payloadSummary: {
          mode: payload.mode,
          trigger: payload.trigger,
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
    setDecisionLabError('');
    setDecisionLabOutput(JSON.stringify({
      payloadSummary: {
        mode: payload.mode,
        trigger: payload.trigger,
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
        contentContainerStyle={{ padding: 16, paddingBottom: 110, maxWidth: 960, width: '100%', alignSelf: 'center' }}
      >
        <Text style={[styles.h1, { color: questTheme.colors.text }]}>{t(lang, 'settings')}</Text>
        <Text style={[styles.sub, { color: questTheme.colors.textMuted }]}>{t(lang, 'settingsSubtitle')}</Text>

        <View style={[styles.card, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border, shadowColor: questTheme.colors.cardShadow }]}>
          <Text style={[styles.label, { color: questTheme.colors.text }]}>{t(lang, 'language')}</Text>
          <View style={styles.languageRow}>
            {[
              { value: 'zh' as const, label: '中文' },
              { value: 'en' as const, label: 'English' },
            ].map((opt) => {
              const on = lang === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.languageBtn, { borderColor: questTheme.colors.border, backgroundColor: questTheme.colors.surfaceSoft }, on && { backgroundColor: accent, borderColor: accent }]}
                  onPress={() => setSettings({ language: opt.value })}
                >
                  <Text style={[styles.languageText, { color: questTheme.colors.text }, on && styles.languageTextOn]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border, shadowColor: questTheme.colors.cardShadow }]}>
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
                  <Text style={[styles.languageText, { color: preview.colors.text }]}>{t(lang, opt.i18nKey)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border, shadowColor: questTheme.colors.cardShadow }]}>
          <Text style={[styles.label, { color: questTheme.colors.text }]}>{t(lang, 'accentColor')}</Text>
          <Text style={[styles.value, { color: questTheme.colors.textMuted }]}>{t(lang, 'accentColorDesc')}</Text>
          <View style={styles.colorPreviewRow}>
            <View style={[styles.colorPreview, { backgroundColor: accent }]} />
            <Text style={[styles.colorValue, { color: accent }]}>{accent}</Text>
          </View>
          <ColorPicker
            colors={theme.accentPalette}
            value={accent}
            onChange={(color) => setSettings({ accentColor: color })}
          />
        </View>

        <View style={[styles.card, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border, shadowColor: questTheme.colors.cardShadow }]}>
          <Text style={[styles.label, { color: questTheme.colors.text }]}>{t(lang, 'reminders')}</Text>
          <Text style={[styles.value, { color: questTheme.colors.textMuted }]}>{t(lang, 'remindersText')}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border, shadowColor: questTheme.colors.cardShadow }]}>
          <Text style={[styles.label, { color: questTheme.colors.text }]}>{t(lang, 'restartOnboarding')}</Text>
          <Text style={[styles.value, { color: questTheme.colors.textMuted }]}>{t(lang, 'restartOnboardingDesc')}</Text>
          <TouchableOpacity
            style={[styles.debugBtn, { alignSelf: 'flex-start', marginTop: 12, borderColor: accent, backgroundColor: questTheme.colors.primarySoft }]}
            onPress={() => setSettings({ onboardingRestartRequested: true })}
          >
            <Text style={[styles.debugBtnText, { color: accent }]}>{t(lang, 'restartOnboarding')}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border, shadowColor: questTheme.colors.cardShadow }]}>
          <Text style={[styles.label, { color: questTheme.colors.text }]}>{t(lang, 'storage')}</Text>
          <Text style={[styles.value, { color: questTheme.colors.textMuted }]}>{t(lang, 'storageText')}</Text>
        </View>

        {__DEV__ ? (
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
                style={[styles.debugBtn, { borderColor: questTheme.colors.warning, backgroundColor: questTheme.colors.warningSoft }]}
                onPress={runBadDecisionSimulation}
              >
                <Text style={[styles.debugBtnText, { color: questTheme.colors.text }]}>{t(lang, 'simulateWeakDecisionOutput')}</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.value, { color: decisionLabError ? questTheme.colors.danger : questTheme.colors.textMuted, marginTop: 12 }]}> 
              {decisionLabLoading ? t(lang, 'decisionAILoading') : decisionLabError ? `${t(lang, 'decisionAIError')}: ${decisionLabError}` : decisionLabOutput ? t(lang, 'decisionAIResultPreview') : t(lang, 'decisionAIHiddenByDefault')}
            </Text>
            {decisionLabOutput ? (
              <Text style={[styles.monoText, { color: questTheme.colors.text, backgroundColor: questTheme.colors.surfaceSoft, borderColor: questTheme.colors.border }]}>{decisionLabOutput}</Text>
            ) : null}
            {lastDecisionFeedback ? (
              <Text style={[styles.value, { color: questTheme.colors.textMuted, marginTop: 12 }]}>
                {t(lang, 'lastInstantReadFeedback')}: {lastDecisionFeedback}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={[styles.card, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border, shadowColor: questTheme.colors.cardShadow }]}>
          <Text style={[styles.label, { color: questTheme.colors.text }]}>{t(lang, 'version')}</Text>
          <Text style={[styles.value, { color: questTheme.colors.textMuted }]}>{t(lang, 'versionText')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  container: { flex: 1, backgroundColor: theme.bg },
  h1: { color: theme.text, fontSize: 34, fontWeight: '800' },
  sub: { color: theme.textDim, marginTop: 4, marginBottom: 18 },
  card: { backgroundColor: theme.card, padding: 18, borderRadius: theme.radius.lg, marginBottom: 12, borderWidth: 1, borderColor: theme.border, ...theme.shadow },
  label: { color: theme.text, fontSize: 16, fontWeight: '800', marginBottom: 8 },
  value: { color: theme.textDim, fontSize: 13, lineHeight: 20 },
  colorPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, marginBottom: 14 },
  colorPreview: { width: 34, height: 34, borderRadius: 17 },
  colorValue: { fontSize: 13, fontWeight: '800' },
  languageRow: { flexDirection: 'row', gap: 10 },
  languageBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.cardAlt },
  languageText: { color: theme.text, fontWeight: '800' },
  languageTextOn: { color: '#fff' },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  themeOption: { width: '48%', minWidth: 142, padding: 12, borderRadius: theme.radius.md, borderWidth: 1 },
  themeSwatches: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  themeSwatch: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  debugActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  debugBtn: { borderWidth: 1, borderRadius: theme.radius.md, paddingHorizontal: 10, paddingVertical: 9 },
  debugBtnText: { fontSize: 12, fontWeight: '800' },
  monoText: { marginTop: 12, borderWidth: 1, borderRadius: theme.radius.md, padding: 10, fontSize: 11, lineHeight: 16 } as any,
});
