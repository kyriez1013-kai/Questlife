/**
 * HomeSmartCapture.tsx — Smart Capture Loop (Spec B-1)
 *
 * 渲染在今日页顶部：
 *   1. 开场白（每次进页面调用 /api/parse?mode=greeting，模型不可用时降级静态文案）
 *   2. 一句话输入框 + 发送按钮
 *   3. 今日已有的 rawCaptures 卡片列表
 *
 * 铁律：
 * - 所有颜色来自 questTheme.colors.*
 * - 所有文案走 t(lang, key)
 * - 容器用 QuestCard
 * - 保存原文与模型解析完全解耦；模型失败原文不受影响
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, Platform, StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useStore } from '../store';
import { getQuestTheme } from '../design/tokens';
import { getLanguage, t } from '../i18n';
import { RawCapture } from '../types';
import QuestCard from '../components/ui/QuestCard';
import QuestIcon from '../components/ui/QuestIcon';
import QuestButton from '../components/ui/QuestButton';
import QuestInput from '../components/ui/QuestInput';
import ActivityHistorySheet from '../components/today/ActivityHistorySheet';
import HomeCapturePending from './HomeCapturePending';
import { confirmAction } from '../utils/confirm';
import { buildFallbackEntriesFromRawText } from '../utils/captureCompletion';
import { isV11TodayEnabled } from '../v11/featureFlag';
import { getV11ThemeTokens } from '../v11/tokens';
import {
  V11ComposerAction,
  V11InlineButton,
  V11SheetButton,
  V11TextField,
} from '../v11/components/V11SheetControls';
import V11RebaselineIcon from '../v11-stage2-rebaseline/V11RebaselineIcon';

const WebView = View as any;

// ── Local time block ─────────────────────────────────────────────────────────

function currentTimeBlock() {
  const h = new Date().getHours();
  if (h < 6)  return 'night';
  if (h < 11) return 'morning';
  if (h < 14) return 'midday';
  if (h < 18) return 'afternoon';
  if (h < 22) return 'evening';
  return 'night';
}

function greetingKeyForBlock(block: string): string {
  if (block === 'morning' || block === 'midday') return 'scGreetingMorning';
  if (block === 'afternoon')                      return 'scGreetingAfternoon';
  if (block === 'evening')                        return 'scGreetingEvening';
  return 'scGreetingNight';
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Parse helper (client → /api/parse) ─────────────────────────────────────

async function callParseAPI(body: object): Promise<any> {
  const res = await fetch('/api/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function shouldDebugParse(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('debugParse') === '1' || params.get('debugParse') === 'true') return true;
    return window.localStorage?.getItem('questlife_debug_parse') === 'true';
  } catch {
    return false;
  }
}

// ── Insight-type helpers ────────────────────────────────────────────────────

type InsightType = 'skill_progress' | 'goal_link' | 'cross_link' | 'encourage';

function insightBorderColor(type: InsightType | undefined, questTheme: ReturnType<typeof getQuestTheme>): string {
  switch (type) {
    case 'skill_progress': return questTheme.colors.success;
    case 'goal_link':      return questTheme.colors.primary;
    case 'cross_link':     return questTheme.colors.accent;
    case 'encourage':
    default:               return questTheme.colors.border;
  }
}

function insightTagKey(type: InsightType | undefined): string {
  switch (type) {
    case 'skill_progress': return 'scInsightSkillProgress';
    case 'goal_link':      return 'scInsightGoalLink';
    case 'cross_link':     return 'scInsightCrossLink';
    default:               return 'scInsightEncourage';
  }
}

// ── Capture card ──────────────────────────────────────────────────────────────

function CaptureCard({
  capture,
  lang,
  questTheme,
  onRetry,
  onDelete,
  expanded = false,
}: {
  capture: RawCapture;
  lang: 'zh' | 'en';
  questTheme: ReturnType<typeof getQuestTheme>;
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
  expanded?: boolean;
}) {
  const v11TodayEnabled = isV11TodayEnabled();
  const v11Theme = getV11ThemeTokens(questTheme.id === 'cleanFocus' ? 'light' : 'dark');
  const insightType = capture.parsed?.insightType as InsightType | undefined;
  const insightText = capture.parsed?.insight?.[lang] ?? '';

  const content = (
    <>
      {/* Header row: timestamp + delete button — works on both web & mobile */}
      <View style={styles.cardHeader}>
        <Text style={[styles.timestamp, { color: questTheme.colors.textSubtle }]}>
          {new Date(capture.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        {v11TodayEnabled ? (
          <V11InlineButton label={t(lang, 'delete')} onPress={() => onDelete(capture.id)} theme={v11Theme} tone="danger" />
        ) : (
          <TouchableOpacity
            onPress={() => onDelete(capture.id)}
            style={[styles.deleteBtn, { borderColor: questTheme.colors.border }]}
            activeOpacity={0.6}
            accessibilityRole="button"
            accessibilityLabel={t(lang, 'deleteRecord')}
          >
            <Text style={[styles.deleteBtnText, { color: questTheme.colors.textSubtle }]}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Original text — always visible */}
      <Text numberOfLines={expanded ? undefined : 1} style={[styles.captureText, { color: questTheme.colors.text, fontSize: questTheme.typography.bodySize }]}>
        {capture.text}
      </Text>

      {/* Parse status row */}
      {expanded && capture.parseStatus === 'pending' && (
        <View style={styles.statusRow}>
          <ActivityIndicator size="small" color={questTheme.colors.textMuted} />
          <Text style={[styles.statusLabel, { color: questTheme.colors.textMuted }]}>
            {t(lang, 'scParsing')}
          </Text>
        </View>
      )}

      {expanded && capture.parseStatus === 'done' && insightText ? (
        <View style={[styles.insightBox, { borderTopColor: questTheme.colors.divider }]}>
          <Text style={[styles.crossLinkTag, { color: insightBorderColor(insightType, questTheme) }]}>
            {t(lang, insightTagKey(insightType))}
          </Text>
          <Text numberOfLines={expanded ? undefined : 2} style={[styles.insightText, { color: questTheme.colors.textMuted, fontSize: questTheme.typography.compactBodySize }]}>
            {insightText}
          </Text>
        </View>
      ) : null}

      {expanded && capture.parseStatus === 'failed' && (
        <View style={styles.statusRow}>
          <Text style={[styles.statusLabel, { color: questTheme.colors.warning }]}>
            {t(lang, 'scParseFailed')}
          </Text>
          {v11TodayEnabled ? (
            <V11InlineButton label={t(lang, 'scRetry')} onPress={() => onRetry(capture.id)} theme={v11Theme} />
          ) : (
            <TouchableOpacity
              onPress={() => onRetry(capture.id)}
              style={[styles.retryBtn, { borderColor: questTheme.colors.primary }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.retryBtnText, { color: questTheme.colors.primary }]}>
                {t(lang, 'scRetry')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </>
  );

  if (v11TodayEnabled) {
    return (
      <WebView
        dataSet={{ 'v11-rebaseline-role': 'capture-record' }}
        style={{ borderLeftColor: insightBorderColor(insightType, questTheme) }}
      >
        {content}
      </WebView>
    );
  }

  return (
    <QuestCard
      questTheme={questTheme}
      variant="flat"
      style={{
        marginTop: questTheme.spacing.tight,
        paddingHorizontal: questTheme.spacing.sm,
        paddingVertical: questTheme.spacing.tight,
        borderLeftWidth: 3,
        borderLeftColor: insightBorderColor(insightType, questTheme),
      }}
    >
      {content}
    </QuestCard>
  );
}

// ── Main exported component ──────────────────────────────────────────────────

const DEFAULT_VISIBLE = 1;

function captureHasLiveContext(capture: RawCapture, executionLogs: { structuredData?: Record<string, any> }[]): boolean {
  const generatedLiveLog = executionLogs.some((log) => log.structuredData?.sourceCaptureId === capture.id);
  if (generatedLiveLog) return true;
  if (capture.parsed?.entriesDismissed) return false;
  return capture.parseStatus !== 'done' || (capture.parsed?.entries?.length ?? 0) === 0;
}

export default function HomeSmartCapture() {
  const { data, addRawCapture, updateRawCapture, deleteRawCapture } = useStore();
  const lang = getLanguage(data.settings.language ?? data.settings.preferredLanguage);
  const questTheme = getQuestTheme(data.settings.selectedThemeId);
  const v11TodayEnabled = isV11TodayEnabled();
  const v11Theme = getV11ThemeTokens(questTheme.id === 'cleanFocus' ? 'light' : 'dark');

  const [inputText, setInputText]         = useState('');
  const [isPosting, setIsPosting]         = useState(false);
  const [greeting, setGreeting]           = useState('');
  const [recentVisible, setRecentVisible] = useState(true);
  const [recentExpanded, setRecentExpanded] = useState(true);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [captureInputHeight, setCaptureInputHeight] = useState(68);
  const greetingRequestRef                = useRef(0);
  const captureParseRequestRef            = useRef(new Map<string, number>());
  const activeCaptureHistory = useMemo(() => (
    (data.rawCaptures || []).filter((capture) => captureHasLiveContext(capture, data.executionLogs || []))
  ), [data.rawCaptures, data.executionLogs]);

  // ALL captures sorted newest first. Today renders only the latest item;
  // the complete list lives in the incremental Activity History sheet.
  const allCaptures: RawCapture[] = (data.rawCaptures || [])
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const todayCaptures = recentVisible ? allCaptures.slice(0, DEFAULT_VISIBLE) : [];
  const hasHistory    = allCaptures.length > 0;

  // ── Async parse helper ────────────────────────────────────────────────────

  const triggerParse = useCallback(async (captureId: string, captureText: string) => {
    const requestId = (captureParseRequestRef.current.get(captureId) ?? 0) + 1;
    captureParseRequestRef.current.set(captureId, requestId);
    const isCurrentRequest = () => captureParseRequestRef.current.get(captureId) === requestId;
    // 1. Recent capture history (raw, for cross-link detection)
    const history = activeCaptureHistory
      .filter((c) => c.parseStatus === 'done' && c.id !== captureId)
      .slice(-20)
      .map((c) => ({ id: c.id, text: c.text, type: c.parsed?.type }));

    // 2. Skills catalog — bounded by total skill count (names only)
    const skillsCatalog = (data.skills || []).map((s) => ({ id: s.id, name: s.name }));

    // 3. Goals snapshot — bounded by total category count (4 fields only, no full text)
    const goalsSnapshot = (data.categories || []).map((cat) => {
      const catSkills = (data.skills || []).filter((s) => s.categoryId === cat.id);
      let progressPercent = 0;
      if (cat.manualProgress != null) {
        progressPercent = Math.round(cat.manualProgress);
      } else if (catSkills.length > 0) {
        const avg = catSkills.reduce((sum, s) => {
          const done   = s.metricConfig?.completedHours ?? s.completedHours ?? 0;
          const target = s.metricConfig?.targetHours ?? s.targetHours ?? 100;
          return sum + (target > 0 ? Math.min(100, (done / target) * 100) : 0);
        }, 0) / catSkills.length;
        progressPercent = Math.round(avg);
      }
      return {
        id:              cat.id,
        name:            cat.name,
        progressPercent,
        targetSummary:   (cat.vision ?? cat.name).slice(0, 60),
      };
    });

    // 4. Skill history — BOUNDED: rough-match candidates by name in text, then ≤5 skills × ≤5 logs
    const normalizedText = captureText.toLowerCase();
    const candidateSkillIds = new Set<string>();
    // Name-match first
    (data.skills || []).forEach((s) => {
      if (s.name.length >= 2 && normalizedText.includes(s.name.toLowerCase())) {
        candidateSkillIds.add(s.id);
      }
    });
    // Fallback: most recently used skills (up to 3) if no name match
    if (candidateSkillIds.size === 0) {
      const seen = new Set<string>();
      for (const log of (data.executionLogs || []).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 15)) {
        if (log.linkedSkillId && !seen.has(log.linkedSkillId)) {
          seen.add(log.linkedSkillId);
          candidateSkillIds.add(log.linkedSkillId);
          if (seen.size >= 3) break;
        }
      }
    }

    const skillHistory = [...candidateSkillIds].slice(0, 5).flatMap((skillId) => {
      const skill = (data.skills || []).find((s) => s.id === skillId);
      if (!skill) return [];
      const recentLogs = (data.executionLogs || [])
        .filter((l) => l.linkedSkillId === skillId)
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 5)
        .map((l) => ({
          date: l.date,
          durationMinutes: l.durationMinutes,
          ...(l.qualityRating != null ? { qualityRating: l.qualityRating } : {}),
        }));
      return [{ skillId, skillName: skill.name, recentLogs }];
    });

    try {
      const debugParse = shouldDebugParse();
      const result = await callParseAPI({
        text: captureText,
        history,
        skillsCatalog,
        goalsSnapshot,
        skillHistory,
        ...(debugParse ? { debugParse: true } : {}),
      });
      if (!isCurrentRequest()) return;
      if (result.ok) {
        if (debugParse) {
          console.log('[parse result final]', JSON.stringify({
            ok: result.ok,
            completionSchema: result.completionSchema,
            entries: Array.isArray(result.entries)
              ? result.entries.map((entry: any) => ({
                  skillName: entry.skillName,
                  goalType: entry.goalType,
                  progressType: entry.progressType,
                  completionSchema: entry.completionSchema,
                }))
              : undefined,
          }, null, 2));
        }
        updateRawCapture(captureId, {
          parseStatus: 'done',
          parsed: {
            type:            result.type,
            fields:          result.fields,
            crossLinks:      result.crossLinks,
            insight:         result.insight,
            matchedSkillIds: result.matchedSkillIds ?? [],
            linkedGoalId:    result.linkedGoalId ?? undefined,
            insightType:     result.insightType ?? 'encourage',
            entries:          Array.isArray(result.entries) ? result.entries : [],
            entriesDismissed: false,
            completionSchema: result.completionSchema ?? undefined,
          },
        });
      } else {
        updateRawCapture(captureId, { parseStatus: 'failed' });
      }
    } catch {
      if (!isCurrentRequest()) return;
      updateRawCapture(captureId, { parseStatus: 'failed' });
    }
  }, [activeCaptureHistory, data.skills, data.categories, data.executionLogs, updateRawCapture]);

  // ── Fetch greeting once per focus ─────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      const recentHistory = activeCaptureHistory
        .slice(-3)
        .map((c) => ({ text: c.text }));
      const timeBlock = currentTimeBlock();
      const requestId = greetingRequestRef.current + 1;
      greetingRequestRef.current = requestId;

      // Fallback greeting from i18n (shown immediately while API is in flight)
      setGreeting(t(lang, greetingKeyForBlock(timeBlock)));

      if (recentHistory.length === 0) {
        return () => {
          greetingRequestRef.current += 1;
        };
      }

      callParseAPI({ mode: 'greeting', history: recentHistory, timeBlock })
        .then((result) => {
          if (greetingRequestRef.current === requestId && result.ok && result.greeting) setGreeting(result.greeting);
        })
        .catch(() => {
          // Already set fallback above — no-op
        });

      return () => {
        greetingRequestRef.current += 1;
      };
    }, [activeCaptureHistory, lang]),
  );

  // ── Send handler ──────────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isPosting) return;

    setIsPosting(true);
    setInputText('');

    // 1. Save locally immediately — UI completes right here
    const capture = addRawCapture(text);

    setIsPosting(false);

    // 2. Async parse — completely decoupled, failure doesn't affect saved text
    triggerParse(capture.id, text);
  }, [inputText, isPosting, addRawCapture, triggerParse]);

  // ── Retry handler ─────────────────────────────────────────────────────────

  const handleRetry = useCallback((captureId: string) => {
    const capture = (data.rawCaptures || []).find((c) => c.id === captureId);
    if (!capture) return;
    updateRawCapture(captureId, { parseStatus: 'pending' });
    triggerParse(captureId, capture.text);
  }, [data.rawCaptures, updateRawCapture, triggerParse]);

  // ── Delete handler — RN Web Alert.alert is a no-op, so use confirmAction ──

  const handleDelete = useCallback((captureId: string) => {
    confirmAction({
      title: t(lang, 'deleteRecord'),
      message: t(lang, 'scDeleteCaptureBody'),
      cancelText: t(lang, 'cancel'),
      confirmText: t(lang, 'delete'),
      destructive: true,
      onConfirm: () => {
        captureParseRequestRef.current.set(
          captureId,
          (captureParseRequestRef.current.get(captureId) ?? 0) + 1,
        );
        const linkedCount = (data.executionLogs || []).filter((log) => log.structuredData?.sourceCaptureId === captureId).length;
        if (linkedCount <= 0) {
          deleteRawCapture(captureId);
          return;
        }
        confirmAction({
          title: t(lang, 'scDeleteLinkedLogsTitle'),
          message: t(lang, 'scDeleteLinkedLogsBody').replace('{n}', String(linkedCount)),
          cancelText: t(lang, 'scDeleteRawOnly'),
          confirmText: t(lang, 'scDeleteRawAndLogs'),
          destructive: true,
          onCancel: () => deleteRawCapture(captureId),
          onConfirm: () => deleteRawCapture(captureId, { deleteLinkedExecutionLogs: true }),
        });
      },
    });
  }, [data.executionLogs, lang, deleteRawCapture]);

  const renderCapture = (capture: RawCapture, expanded: boolean) => {
    const parsedEntries = capture.parsed?.entries ?? [];
    const fallbackEntries = buildFallbackEntriesFromRawText(capture.text);
    const entriesForConfirmation = parsedEntries.length > 0 ? parsedEntries : fallbackEntries;
    const hasTopLevelCompletion = capture.parsed?.completionSchema?.needsCompletion === true;
    const canShowConfirmation =
      (capture.parseStatus === 'done' || capture.parseStatus === 'failed') &&
      (entriesForConfirmation.length > 0 || hasTopLevelCompletion) &&
      !capture.parsed?.entriesDismissed;

    return (
      <View key={capture.id}>
        <CaptureCard
          capture={capture}
          lang={lang}
          questTheme={questTheme}
          onRetry={handleRetry}
          onDelete={handleDelete}
          expanded={expanded}
        />
        {expanded && canShowConfirmation ? (
          <HomeCapturePending
            captureId={capture.id}
            entries={entriesForConfirmation}
            onDismiss={() => updateRawCapture(capture.id, {
              parsed: {
                type: capture.parsed?.type ?? 'misc',
                fields: capture.parsed?.fields ?? {},
                crossLinks: capture.parsed?.crossLinks ?? [],
                insight: capture.parsed?.insight ?? { zh: '', en: '' },
                matchedSkillIds: capture.parsed?.matchedSkillIds ?? [],
                linkedGoalId: capture.parsed?.linkedGoalId,
                insightType: capture.parsed?.insightType ?? 'encourage',
                entries: capture.parsed?.entries ?? entriesForConfirmation,
                entriesDismissed: true,
                completionSchema: capture.parsed?.completionSchema,
              },
            })}
          />
        ) : null}
      </View>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const composer = v11TodayEnabled ? (
    <WebView dataSet={{ 'v11-rebaseline-role': 'capture-composer-form' }}>
      <WebView dataSet={{ 'v11-rebaseline-role': 'capture-composer-row' }}>
        <WebView dataSet={{ 'v11-rebaseline-role': 'capture-input-slot' }}>
          <V11TextField
            accessibilityHint={greeting || undefined}
            accessibilityLabel={t(lang, 'scPlaceholder')}
            disabled={isPosting}
            multiline
            onChangeText={(value) => {
              setInputText(value);
              if (!value.trim()) {
                setCaptureInputHeight(68);
                return;
              }
              if (Platform.OS === 'web' && typeof window !== 'undefined') {
                window.requestAnimationFrame(() => {
                  const input = document.getElementById('v11-live-capture-input');
                  if (!input) return;
                  setCaptureInputHeight(Math.max(68, Math.min(156, input.scrollHeight + 4)));
                });
              }
            }}
            onContentSizeChange={(event) => {
              if (!inputText.trim()) {
                setCaptureInputHeight(68);
                return;
              }
              setCaptureInputHeight(Math.max(68, Math.min(156, event.nativeEvent.contentSize.height + 16)));
            }}
            placeholder={t(lang, 'scPlaceholder')}
            nativeID="v11-live-capture-input"
            scrollEnabled
            style={{ height: inputText.trim() ? captureInputHeight : 68, minHeight: 68, maxHeight: 156, textAlignVertical: 'top' }}
            theme={v11Theme}
            tone="neutral"
            value={inputText}
          />
        </WebView>
        <WebView dataSet={{ 'v11-rebaseline-role': 'capture-action-slot' }}>
          <V11ComposerAction
            disabled={isPosting || !inputText.trim()}
            label={t(lang, 'scSend')}
            loading={isPosting}
            onPress={handleSend}
            theme={v11Theme}
            tone="neutral"
          >
            <V11RebaselineIcon name="arrow" size={18} color={v11Theme.control.primaryActionText} />
          </V11ComposerAction>
        </WebView>
      </WebView>
    </WebView>
  ) : (
    <View style={styles.inputRow}>
      <QuestInput
        questTheme={questTheme}
        style={[
          styles.input,
          {
            flex: 1,
          },
        ]}
        value={inputText}
        onChangeText={setInputText}
        placeholder={t(lang, 'scPlaceholder')}
        placeholderTextColor={questTheme.colors.textSubtle}
        onSubmitEditing={handleSend}
        returnKeyType="send"
        multiline={false}
        editable={!isPosting}
        accessibilityLabel={t(lang, 'scPlaceholder')}
        accessibilityHint={greeting || undefined}
      />
      <QuestButton
        questTheme={questTheme}
        variant="primary"
        icon="zap"
        onPress={handleSend}
        disabled={isPosting || !inputText.trim()}
        loading={isPosting}
        accessibilityLabel={t(lang, 'scSend')}
        style={styles.sendBtn}
      />
    </View>
  );

  return (
    <WebView dataSet={v11TodayEnabled ? { 'v11-rebaseline-role': 'capture-workspace' } : undefined}>
      {v11TodayEnabled ? (
        <WebView dataSet={{ 'v11-rebaseline-role': 'capture-composer' }}>
          {composer}
        </WebView>
      ) : (
        <QuestCard
          questTheme={questTheme}
          variant="flat"
          style={{
            padding: questTheme.spacing.tight,
            borderWidth: 1,
            borderColor: questTheme.colors.inputBorder,
            backgroundColor: questTheme.colors.surfaceElevated,
          }}
        >
          {composer}
        </QuestCard>
      )}

      {/* Today keeps one recent record. Full history is rendered in a separate sheet. */}
      {allCaptures.length > 0 && (
        <View style={{ marginTop: questTheme.spacing.xxs }}>
          {todayCaptures.map((capture) => renderCapture(capture, recentExpanded))}

          <View style={[styles.recentActions, { gap: questTheme.spacing.tight, marginTop: questTheme.spacing.tight }]}>
            {v11TodayEnabled ? (
              <>
                {recentVisible ? (
                  <>
                    <V11SheetButton
                      label={t(lang, recentExpanded ? 'collapseRecentRecord' : 'expandRecentRecord')}
                      onPress={() => setRecentExpanded((value) => !value)}
                      theme={v11Theme}
                      tone="neutral"
                      variant="secondary"
                    />
                    <V11SheetButton label={t(lang, 'hideRecentRecord')} onPress={() => setRecentVisible(false)} theme={v11Theme} tone="neutral" variant="secondary" />
                  </>
                ) : (
                  <V11SheetButton label={t(lang, 'showRecentRecord')} onPress={() => setRecentVisible(true)} theme={v11Theme} tone="neutral" variant="secondary" />
                )}
                {hasHistory ? (
                  <V11SheetButton
                    label={t(lang, 'openActivityHistory').replace('{n}', String(allCaptures.length))}
                    onPress={() => setHistoryVisible(true)}
                    theme={v11Theme}
                    tone="neutral"
                    variant="secondary"
                  />
                ) : null}
              </>
            ) : (
              <>
            {recentVisible ? (
              <>
                <QuestButton
                  questTheme={questTheme}
                  variant="ghost"
                  label={t(lang, recentExpanded ? 'collapseRecentRecord' : 'expandRecentRecord')}
                  onPress={() => setRecentExpanded((value) => !value)}
                />
                <QuestButton
                  questTheme={questTheme}
                  variant="ghost"
                  label={t(lang, 'hideRecentRecord')}
                  onPress={() => setRecentVisible(false)}
                />
              </>
            ) : (
              <QuestButton
                questTheme={questTheme}
                variant="ghost"
                label={t(lang, 'showRecentRecord')}
                onPress={() => setRecentVisible(true)}
              />
            )}
            {hasHistory ? (
              <QuestButton
                questTheme={questTheme}
                variant="secondary"
                label={t(lang, 'openActivityHistory').replace('{n}', String(allCaptures.length))}
                onPress={() => setHistoryVisible(true)}
              />
            ) : null}
              </>
            )}
          </View>
        </View>
      )}

      <ActivityHistorySheet
        visible={historyVisible}
        captures={allCaptures}
        questTheme={questTheme}
        title={t(lang, 'activityHistory')}
        countLabel={t(lang, 'activityHistoryCount').replace('{n}', String(allCaptures.length))}
        closeLabel={t(lang, 'closeActivityHistory')}
        loadMoreLabel={t(lang, 'loadMoreRecords')}
        emptyLabel={t(lang, 'activityHistoryEmpty')}
        onClose={() => setHistoryVisible(false)}
        renderCapture={(capture) => renderCapture(capture, true)}
      />
    </WebView>
  );
}

// ── Styles (sizing from numbers only — no hardcoded colors) ─────────────────

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 0,
    minHeight: 44,
  },
  sendBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  sendBtnText: {
    fontWeight: '700',
  },
  // Card header: timestamp (left) + delete button (right)
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 11,
  },
  deleteBtn: {
    borderWidth: 1,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
  },
  captureText: {
    lineHeight: 19,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  statusLabel: {
    fontSize: 12,
  },
  insightBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: 1,
    gap: 6,
  },
  crossLinkTag: {
    fontSize: 11,
    fontWeight: '700',
  },
  insightText: {
    flex: 1,
    lineHeight: 17,
  },
  retryBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  retryBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  recentActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
});
