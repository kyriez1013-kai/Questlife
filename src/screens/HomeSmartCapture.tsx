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
  View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet,
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

// ── Capture card ──────────────────────────────────────────────────────────────

function CaptureCard({
  capture,
  lang,
  questTheme,
  onRetry,
}: {
  capture: RawCapture;
  lang: 'zh' | 'en';
  questTheme: ReturnType<typeof getQuestTheme>;
  onRetry: (id: string) => void;
}) {
  const hasCrossLinks = (capture.parsed?.crossLinks ?? []).length > 0;
  const insightText = capture.parsed?.insight?.[lang] ?? '';

  return (
    <QuestCard
      questTheme={questTheme}
      variant="flat"
      style={{
        marginTop: questTheme.spacing.sm,
        borderLeftWidth: 3,
        borderLeftColor: hasCrossLinks ? questTheme.colors.accent : questTheme.colors.border,
      }}
    >
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
        <View style={[styles.insightBox, { backgroundColor: questTheme.colors.accentSoft }]}>
          {hasCrossLinks && (
            <Text style={[styles.crossLinkTag, { color: questTheme.colors.accent }]}>
              🔗 {t(lang, 'scCrossLinked')}
            </Text>
          )}
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

      {/* Timestamp */}
      <Text style={[styles.timestamp, { color: questTheme.colors.textSubtle }]}>
        {new Date(capture.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </QuestCard>
  );
}

// ── Main exported component ──────────────────────────────────────────────────

export default function HomeSmartCapture() {
  const { data, addRawCapture, updateRawCapture } = useStore();
  const lang = getLanguage(data.settings.language ?? data.settings.preferredLanguage);
  const questTheme = getQuestTheme(data.settings.selectedThemeId);

  const [inputText, setInputText]         = useState('');
  const [isPosting, setIsPosting]         = useState(false);
  const [greeting, setGreeting]           = useState('');
  const greetingFetchedRef                = useRef(false);

  // Today's captures (sorted newest first, max 5 shown)
  const todayCaptures: RawCapture[] = (data.rawCaptures || [])
    .filter((c) => c.createdAt.startsWith(todayStr()))
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  // ── Async parse helper ────────────────────────────────────────────────────

  const triggerParse = useCallback(async (captureId: string, captureText: string) => {
    const history = (data.rawCaptures || [])
      .filter((c) => c.parseStatus === 'done' && c.id !== captureId)
      .slice(-20)
      .map((c) => ({ id: c.id, text: c.text, type: c.parsed?.type }));

    try {
      const result = await callParseAPI({ text: captureText, history });
      if (result.ok) {
        updateRawCapture(captureId, {
          parseStatus: 'done',
          parsed: {
            type: result.type,
            fields: result.fields,
            crossLinks: result.crossLinks,
            insight: result.insight,
          },
        });
      } else {
        updateRawCapture(captureId, { parseStatus: 'failed' });
      }
    } catch {
      updateRawCapture(captureId, { parseStatus: 'failed' });
    }
  }, [data.rawCaptures, updateRawCapture]);

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

      {/* Today's captures */}
      {todayCaptures.length > 0 && (
        <View style={{ marginTop: questTheme.spacing.xs }}>
          {todayCaptures.map((c) => (
            <CaptureCard
              key={c.id}
              capture={c}
              lang={lang}
              questTheme={questTheme}
              onRetry={handleRetry}
            />
          ))}
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
  timestamp: {
    fontSize: 11,
    marginTop: 6,
  },
});
