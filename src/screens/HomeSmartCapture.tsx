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

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useStore } from '../store';
import { getQuestTheme } from '../design/tokens';
import { getLanguage, t } from '../i18n';
import { RawCapture } from '../types';
import QuestCard from '../components/ui/QuestCard';

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

function insightBgColor(type: InsightType | undefined, questTheme: ReturnType<typeof getQuestTheme>): string {
  switch (type) {
    case 'skill_progress': return questTheme.colors.successSoft;
    case 'goal_link':      return questTheme.colors.primarySoft;
    case 'cross_link':     return questTheme.colors.accentSoft;
    default:               return questTheme.colors.surfaceSoft;
  }
}

// ── Capture card ──────────────────────────────────────────────────────────────

function CaptureCard({
  capture,
  lang,
  questTheme,
  onRetry,
  onDelete,
}: {
  capture: RawCapture;
  lang: 'zh' | 'en';
  questTheme: ReturnType<typeof getQuestTheme>;
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const insightType = capture.parsed?.insightType as InsightType | undefined;
  const insightText = capture.parsed?.insight?.[lang] ?? '';

  return (
    <QuestCard
      questTheme={questTheme}
      variant="flat"
      style={{
        marginTop: questTheme.spacing.sm,
        borderLeftWidth: 3,
        borderLeftColor: insightBorderColor(insightType, questTheme),
      }}
    >
      {/* Header row: timestamp + delete button — works on both web & mobile */}
      <View style={styles.cardHeader}>
        <Text style={[styles.timestamp, { color: questTheme.colors.textSubtle }]}>
          {new Date(capture.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <TouchableOpacity
          onPress={() => onDelete(capture.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[styles.deleteBtn, { borderColor: questTheme.colors.border }]}
          activeOpacity={0.6}
        >
          <Text style={[styles.deleteBtnText, { color: questTheme.colors.textSubtle }]}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Original text — always visible */}
      <Text style={[styles.captureText, { color: questTheme.colors.text, fontSize: questTheme.typography.bodySize }]}>
        {capture.text}
      </Text>

      {/* Parse status row */}
      {capture.parseStatus === 'pending' && (
        <View style={styles.statusRow}>
          <ActivityIndicator size="small" color={questTheme.colors.textMuted} />
          <Text style={[styles.statusLabel, { color: questTheme.colors.textMuted }]}>
            {t(lang, 'scParsing')}
          </Text>
        </View>
      )}

      {capture.parseStatus === 'done' && insightText ? (
        <View style={[styles.insightBox, { backgroundColor: insightBgColor(insightType, questTheme) }]}>
          {/* Insight-type tag */}
          <Text style={[styles.crossLinkTag, { color: insightBorderColor(insightType, questTheme) }]}>
            {t(lang, insightTagKey(insightType))}
          </Text>
          <Text style={[styles.insightText, { color: questTheme.colors.text, fontSize: questTheme.typography.bodySize }]}>
            {insightText}
          </Text>
        </View>
      ) : null}

      {capture.parseStatus === 'failed' && (
        <View style={styles.statusRow}>
          <Text style={[styles.statusLabel, { color: questTheme.colors.warning }]}>
            {t(lang, 'scParseFailed')}
          </Text>
          <TouchableOpacity
            onPress={() => onRetry(capture.id)}
            style={[styles.retryBtn, { borderColor: questTheme.colors.primary }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.retryBtnText, { color: questTheme.colors.primary }]}>
              {t(lang, 'scRetry')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </QuestCard>
  );
}

// ── Main exported component ──────────────────────────────────────────────────

const DEFAULT_VISIBLE = 3;

export default function HomeSmartCapture() {
  const { data, addRawCapture, updateRawCapture, deleteRawCapture } = useStore();
  const lang = getLanguage(data.settings.language ?? data.settings.preferredLanguage);
  const questTheme = getQuestTheme(data.settings.selectedThemeId);

  const [inputText, setInputText]         = useState('');
  const [isPosting, setIsPosting]         = useState(false);
  const [greeting, setGreeting]           = useState('');
  const [showAll, setShowAll]             = useState(false);
  const greetingFetchedRef                = useRef(false);

  // ALL captures sorted newest first — not filtered to today,
  // so users can always access historical entries via expand
  const allCaptures: RawCapture[] = (data.rawCaptures || [])
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // Collapsed view: default 3 newest, expandable to all history
  const todayCaptures = showAll ? allCaptures : allCaptures.slice(0, DEFAULT_VISIBLE);
  const hiddenCount   = allCaptures.length - DEFAULT_VISIBLE;
  const hasMore       = hiddenCount > 0;

  // ── Async parse helper ────────────────────────────────────────────────────

  const triggerParse = useCallback(async (captureId: string, captureText: string) => {
    // 1. Recent capture history (raw, for cross-link detection)
    const history = (data.rawCaptures || [])
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
      const result = await callParseAPI({
        text: captureText,
        history,
        skillsCatalog,
        goalsSnapshot,
        skillHistory,
      });
      if (result.ok) {
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
          },
        });
      } else {
        updateRawCapture(captureId, { parseStatus: 'failed' });
      }
    } catch {
      updateRawCapture(captureId, { parseStatus: 'failed' });
    }
  }, [data.rawCaptures, data.skills, data.categories, data.executionLogs, updateRawCapture]);

  // ── Fetch greeting once per focus ─────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      if (greetingFetchedRef.current) return;
      greetingFetchedRef.current = true;

      const recentHistory = (data.rawCaptures || [])
        .slice(-3)
        .map((c) => ({ text: c.text }));
      const timeBlock = currentTimeBlock();

      // Fallback greeting from i18n (shown immediately while API is in flight)
      setGreeting(t(lang, greetingKeyForBlock(timeBlock)));

      callParseAPI({ mode: 'greeting', history: recentHistory, timeBlock })
        .then((result) => {
          if (result.ok && result.greeting) setGreeting(result.greeting);
        })
        .catch(() => {
          // Already set fallback above — no-op
        });

      return () => {
        greetingFetchedRef.current = false;
      };
    }, [data.rawCaptures, lang]),
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

  // ── Delete handler — Alert works on both web (window.confirm) and native ──

  const handleDelete = useCallback((captureId: string) => {
    Alert.alert(
      t(lang, 'deleteRecord'),
      t(lang, 'scDeleteCaptureBody'),
      [
        { text: t(lang, 'cancel'), style: 'cancel' },
        {
          text: t(lang, 'delete'),
          style: 'destructive',
          onPress: () => deleteRawCapture(captureId),
        },
      ],
    );
  }, [lang, deleteRawCapture]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View>
      {/* Greeting */}
      {greeting ? (
        <Text style={[styles.greeting, {
          color: questTheme.colors.textMuted,
          fontSize: questTheme.typography.bodySize,
        }]}>
          {greeting}
        </Text>
      ) : null}

      {/* One-line input */}
      <QuestCard questTheme={questTheme} variant="data" style={{ marginTop: questTheme.spacing.sm }}>
        <View style={styles.inputRow}>
          <TextInput
            style={[
              styles.input,
              {
                color: questTheme.colors.text,
                fontSize: questTheme.typography.bodySize,
                borderColor: questTheme.colors.border,
                borderRadius: questTheme.radius.sm,
                backgroundColor: questTheme.colors.surfaceSoft,
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
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={isPosting || !inputText.trim()}
            style={[
              styles.sendBtn,
              {
                backgroundColor: inputText.trim()
                  ? questTheme.colors.primary
                  : questTheme.colors.disabledBg,
                borderRadius: questTheme.radius.sm,
              },
            ]}
            activeOpacity={0.8}
          >
            {isPosting ? (
              <ActivityIndicator size="small" color={questTheme.colors.primaryText} />
            ) : (
              <Text style={[styles.sendBtnText, { color: questTheme.colors.primaryText, fontSize: questTheme.typography.bodySize }]}>
                {t(lang, 'scSend')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </QuestCard>

      {/* All captures (collapsed to DEFAULT_VISIBLE, expandable to full history) */}
      {allCaptures.length > 0 && (
        <View style={{ marginTop: questTheme.spacing.xs }}>
          {todayCaptures.map((c) => (
            <CaptureCard
              key={c.id}
              capture={c}
              lang={lang}
              questTheme={questTheme}
              onRetry={handleRetry}
              onDelete={handleDelete}
            />
          ))}

          {/* Expand / collapse button */}
          {hasMore && (
            <TouchableOpacity
              onPress={() => setShowAll((v) => !v)}
              style={[styles.expandBtn, { borderColor: questTheme.colors.border, backgroundColor: questTheme.colors.surfaceSoft }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.expandBtnText, { color: questTheme.colors.textMuted }]}>
                {showAll
                  ? t(lang, 'scCollapse')
                  : t(lang, 'scShowMore').replace('{n}', String(hiddenCount))}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// ── Styles (sizing from numbers only — no hardcoded colors) ─────────────────

const styles = StyleSheet.create({
  greeting: {
    marginBottom: 4,
    lineHeight: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
  },
  sendBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
  },
  sendBtnText: {
    fontWeight: '700',
  },
  // Card header: timestamp (left) + delete button (right)
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 11,
  },
  deleteBtn: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  deleteBtnText: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
  },
  captureText: {
    lineHeight: 20,
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
    marginTop: 8,
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  crossLinkTag: {
    fontSize: 11,
    fontWeight: '700',
  },
  insightText: {
    lineHeight: 20,
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
  // Expand / collapse button
  expandBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
  },
  expandBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
