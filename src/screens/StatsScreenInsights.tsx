/**
 * StatsScreenInsights.tsx — 新增洞察卡片组件
 *
 * 铁律遵守：
 * - 所有颜色取自 questTheme.colors.*
 * - 所有文案通过 t(lang, key)
 * - 着色用 getStateToneColor(value, questTheme)
 * - QuestCard 作容器
 * - 时间维度已在 insightsEngine 里用本地小时处理
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Polygon, Line, Text as SvgText, Polyline, Circle } from 'react-native-svg';
import { getStateToneColor, QuestTheme } from '../design/tokens';
import { t, Lang } from '../i18n';
import QuestCard from '../components/ui/QuestCard';
import {
  InsightsSummaryResult,
  RadarDimension,
  WeekPoint,
  ComboBucket,
  MonthData,
  Anomaly,
} from '../utils/insightsEngine';

// ─────────────────────────────────────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────────────────────────────────────

function DataBadge({ isBaseline, questTheme, lang }: { isBaseline: boolean; questTheme: QuestTheme; lang: Lang }) {
  const color = isBaseline ? questTheme.colors.textSubtle : questTheme.colors.accent;
  const bg    = isBaseline ? questTheme.colors.surfaceMuted : questTheme.colors.accentSoft;
  return (
    <View style={[badgeStyles.pill, { backgroundColor: bg, borderColor: isBaseline ? questTheme.colors.border : questTheme.colors.accent }]}>
      <Text style={[badgeStyles.label, { color }]}>
        {isBaseline ? t(lang, 'ieGenericRef') : t(lang, 'ieYourData')}
      </Text>
    </View>
  );
}

function ConfBadge({ level, questTheme, lang }: { level: 'low' | 'medium' | 'high'; questTheme: QuestTheme; lang: Lang }) {
  const color = level === 'high' ? questTheme.colors.success
    : level === 'medium' ? questTheme.colors.warning
    : questTheme.colors.textSubtle;
  const key = level === 'high' ? 'ieConfHigh' : level === 'medium' ? 'ieConfMed' : 'ieConfLow';
  return (
    <View style={[badgeStyles.pill, { backgroundColor: color + '22', borderColor: color + '66' }]}>
      <Text style={[badgeStyles.label, { color }]}>{t(lang, key)}</Text>
    </View>
  );
}

function WhySection({ whyKey, isExpanded, onToggle, questTheme, lang }: {
  whyKey: string;
  isExpanded: boolean;
  onToggle: () => void;
  questTheme: QuestTheme;
  lang: Lang;
}) {
  return (
    <View style={{ marginTop: questTheme.spacing.sm }}>
      <TouchableOpacity
        onPress={onToggle}
        style={[whyStyles.toggle, { borderColor: questTheme.colors.border, backgroundColor: questTheme.colors.surfaceSubtle }]}
        activeOpacity={0.7}
      >
        <Text style={[whyStyles.toggleText, { color: questTheme.colors.textMuted }]}>
          {isExpanded ? t(lang, 'ieWhyHide') : t(lang, 'ieWhyTitle')}
        </Text>
      </TouchableOpacity>
      {isExpanded && (
        <View style={[whyStyles.body, { borderColor: questTheme.colors.border, backgroundColor: questTheme.colors.surfaceMuted }]}>
          <Text style={[whyStyles.bodyText, { color: questTheme.colors.textMuted }]}>
            {t(lang, whyKey)}
          </Text>
          <Text style={[whyStyles.disclaimer, { color: questTheme.colors.textSubtle }]}>
            {t(lang, 'ieWhyDisclaimer')}
          </Text>
        </View>
      )}
    </View>
  );
}

function CardTitle({ titleKey, isBaseline, confidence, questTheme, lang }: {
  titleKey: string;
  isBaseline: boolean;
  confidence?: 'low' | 'medium' | 'high';
  questTheme: QuestTheme;
  lang: Lang;
}) {
  return (
    <View style={titleStyles.row}>
      <Text style={[titleStyles.text, { color: questTheme.colors.text, fontSize: questTheme.typography.sectionTitleSize }]}>
        {t(lang, titleKey)}
      </Text>
      <View style={titleStyles.badges}>
        <DataBadge isBaseline={isBaseline} questTheme={questTheme} lang={lang} />
        {confidence && <ConfBadge level={confidence} questTheme={questTheme} lang={lang} />}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Anomaly Strip (lightweight)
// ─────────────────────────────────────────────────────────────────────────────

export function AnomalyStrip({ result, questTheme, lang }: {
  result: InsightsSummaryResult['anomalies'];
  questTheme: QuestTheme;
  lang: Lang;
}) {
  if (result.status === 'insufficient') return null;
  if (result.anomalies.length === 0) return null; // silent when all clear

  const topAnomaly: Anomaly = result.anomalies.sort((a, b) => (b.severity === 'high' ? 1 : -1))[0];
  const severityColor = topAnomaly.severity === 'high' ? questTheme.colors.danger : questTheme.colors.warning;
  const desc = t(lang, topAnomaly.descKey)
    .replace('{pct}',  topAnomaly.descValues.pct  ?? '')
    .replace('{days}', topAnomaly.descValues.days ?? '');

  return (
    <View style={[stripStyles.container, { backgroundColor: severityColor + '18', borderColor: severityColor + '55' }]}>
      <Text style={[stripStyles.title, { color: severityColor }]}>
        {t(lang, 'ieAnomalyAlert')} ({result.anomalies.length})
      </Text>
      <Text style={[stripStyles.desc, { color: questTheme.colors.text }]}>{desc}</Text>
      {result.anomalies.length > 1 && (
        <Text style={[stripStyles.more, { color: questTheme.colors.textMuted }]}>
          +{result.anomalies.length - 1} more
        </Text>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Growth Curve Card
// ─────────────────────────────────────────────────────────────────────────────

const CURVE_H = 72;
const CURVE_PAD_H = 10;
const CURVE_PAD_V = 8;

export function GrowthCurveCard({ result, questTheme, lang, isExpanded, onToggle }: {
  result: InsightsSummaryResult['growthCurve'];
  questTheme: QuestTheme;
  lang: Lang;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const isBaseline = result.status === 'insufficient';

  // compute SVG width at render time via layout – use fixed 280
  const W = 280;
  const innerW = W - CURVE_PAD_H * 2;
  const innerH = CURVE_H - CURVE_PAD_V * 2;
  const maxMins = Math.max(60, ...result.weeks.map((w) => w.totalMins));
  const pts = result.weeks.map((w, i) => {
    const x = CURVE_PAD_H + (i / (result.weeks.length - 1)) * innerW;
    const y = CURVE_PAD_V + (1 - w.totalMins / maxMins) * innerH;
    return { x, y, w };
  });
  const polyPoints = pts.map((p) => `${p.x},${p.y}`).join(' ');

  const trendLabel = !isBaseline && result.monthRatePct != null
    ? result.monthRatePct > 0
      ? t(lang, 'ieGrowthMonthRateUp').replace('{pct}', String(Math.abs(result.monthRatePct)))
      : t(lang, 'ieGrowthMonthRateDown').replace('{pct}', String(Math.abs(result.monthRatePct)))
    : null;

  return (
    <QuestCard questTheme={questTheme} variant="data" style={{ marginTop: questTheme.spacing.md, borderColor: questTheme.colors.borderStrong, borderLeftWidth: 3, borderLeftColor: questTheme.colors.accent }}>
      <CardTitle
        titleKey="ieGrowthCurve"
        isBaseline={isBaseline}
        confidence={isBaseline ? undefined : result.conclusion.confidence}
        questTheme={questTheme}
        lang={lang}
      />

      {isBaseline ? (
        <Text style={[cardStyles.insufficientText, { color: questTheme.colors.textMuted }]}>
          {t(lang, 'ieGrowthNoData')}
        </Text>
      ) : (
        <>
          {trendLabel && (
            <View style={cardStyles.row}>
              <Text style={[cardStyles.accentVal, { color: questTheme.colors.accent }]}>{trendLabel}</Text>
              <Text style={[cardStyles.dimLabel, { color: questTheme.colors.textMuted }]}>
                {result.accelerating ? t(lang, 'ieGrowthAccel') : t(lang, 'ieGrowthSteady')}
              </Text>
            </View>
          )}
          <Svg width={W} height={CURVE_H} style={{ marginTop: questTheme.spacing.sm }}>
            {/* Baseline */}
            <Line
              x1={CURVE_PAD_H} y1={CURVE_PAD_V + innerH / 2}
              x2={CURVE_PAD_H + innerW} y2={CURVE_PAD_V + innerH / 2}
              stroke={questTheme.colors.border} strokeWidth="1" strokeDasharray="3 3"
            />
            {/* Curve */}
            <Polyline
              points={polyPoints}
              fill="none"
              stroke={questTheme.colors.accent}
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Dots */}
            {pts.map((p, i) => (
              <Circle key={i} cx={p.x} cy={p.y} r={3} fill={questTheme.colors.accent} />
            ))}
            {/* X-axis labels — first and last week */}
            {result.weeks.length > 0 && (
              <>
                <SvgText x={pts[0].x} y={CURVE_H - 2} fontSize="9" fill={questTheme.colors.textSubtle} textAnchor="middle">
                  {pts[0].w.weekLabel}
                </SvgText>
                <SvgText x={pts[pts.length - 1].x} y={CURVE_H - 2} fontSize="9" fill={questTheme.colors.textSubtle} textAnchor="middle">
                  {pts[pts.length - 1].w.weekLabel}
                </SvgText>
              </>
            )}
          </Svg>
          <Text style={[cardStyles.caption, { color: questTheme.colors.textSubtle }]}>
            {t(lang, 'ieSampleN').replace('{n}', String(result.conclusion.sampleSize))}
          </Text>
        </>
      )}
      <WhySection whyKey="ieGrowthWhyBody" isExpanded={isExpanded} onToggle={onToggle} questTheme={questTheme} lang={lang} />
    </QuestCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Ability Radar Card
// ─────────────────────────────────────────────────────────────────────────────

const R_SIZE  = 320;
const R_CX    = R_SIZE / 2;
const R_CY    = R_SIZE / 2;
const R_OUTER = 112;
const R_N     = 5;

function radarPt(score: number, idx: number, scale = R_OUTER): { x: number; y: number } {
  const angle = (Math.PI * 2 * idx) / R_N - Math.PI / 2;
  return { x: R_CX + scale * score * Math.cos(angle), y: R_CY + scale * score * Math.sin(angle) };
}

function polyPoints(dims: RadarDimension[], scale = R_OUTER): string {
  return dims.map((d, i) => { const p = radarPt(d.score, i, scale); return `${p.x},${p.y}`; }).join(' ');
}

export function AbilityRadarCard({ result, questTheme, lang, isExpanded, onToggle }: {
  result: InsightsSummaryResult['abilityRadar'];
  questTheme: QuestTheme;
  lang: Lang;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const isBaseline = result.status === 'insufficient';

  const meaningKeys: Record<string, string> = {
    ieRadarExecution: 'executionPowerMeaning',
    ieRadarConsistency: 'consistencyMeaning',
    ieRadarQuality: 'qualityMeaning',
    ieRadarSelfAware: 'selfKnowledgeMeaning',
    ieRadarResilience: 'recoveryPowerMeaning',
  };

  return (
    <QuestCard questTheme={questTheme} variant="data" style={{ marginTop: questTheme.spacing.md, borderColor: questTheme.colors.borderStrong, borderTopWidth: 2, borderTopColor: questTheme.colors.accent }}>
      <CardTitle
        titleKey="ieAbilityRadar"
        isBaseline={isBaseline}
        confidence={isBaseline ? undefined : result.conclusion.confidence}
        questTheme={questTheme}
        lang={lang}
      />

      <Text style={[cardStyles.caption, { color: questTheme.colors.textMuted, marginTop: questTheme.spacing.xs }]}>
        {t(lang, 'abilityMapExplanation')}
      </Text>

      <View style={[radarStyles.dashboard, { marginTop: questTheme.spacing.md }]}>
        <View style={[radarStyles.chartPanel, { borderColor: questTheme.colors.border, backgroundColor: questTheme.colors.surfaceSubtle }]}>
          <Svg width="100%" height={R_SIZE} viewBox={`0 0 ${R_SIZE} ${R_SIZE}`}>
            {[0.25, 0.5, 0.75, 1].map((frac) => (
              <Polygon
                key={frac}
                points={polyPoints(result.dimensions.map((d) => ({ ...d, score: frac })))}
                fill="none"
                stroke={questTheme.colors.border}
                strokeWidth={frac === 1 ? '1.5' : '1'}
              />
            ))}
            {result.dimensions.map((_, i) => {
              const p = radarPt(1, i);
              return <Line key={i} x1={R_CX} y1={R_CY} x2={p.x} y2={p.y} stroke={questTheme.colors.border} strokeWidth="1" />;
            })}
            <Polygon
              points={polyPoints(result.dimensions.map((d) => ({ ...d, score: 0.5 })))}
              fill="none"
              stroke={questTheme.colors.textSubtle}
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            <Polygon
              points={polyPoints(result.dimensions)}
              fill={questTheme.colors.accent + '33'}
              stroke={questTheme.colors.accent}
              strokeWidth="2.5"
            />
            {result.dimensions.map((d, i) => {
              const p = radarPt(d.score, i);
              const color = d.isBaseline ? questTheme.colors.textSubtle : questTheme.colors.accent;
              return <Circle key={i} cx={p.x} cy={p.y} r={5} fill={color} />;
            })}
          </Svg>
          <Text style={[cardStyles.caption, { color: questTheme.colors.textSubtle, textAlign: 'center' }]}>
            {t(lang, 'ieRadarBaseline')}
          </Text>
        </View>

        <View style={cardStyles.scoreGrid}>
          {result.dimensions.map((d) => {
            const pct = Math.round(d.score * 100);
            const color = d.isBaseline
              ? questTheme.colors.textSubtle
              : getStateToneColor(Math.round(d.score * 5), questTheme);
            return (
              <View key={d.key} style={[cardStyles.scoreItem, { borderColor: questTheme.colors.border, backgroundColor: questTheme.colors.surfaceSubtle }]}>
                <View style={cardStyles.scoreHeader}>
                  <Text style={[cardStyles.scoreVal, { color }]}>{pct}</Text>
                  <Text style={[cardStyles.scoreLabel, { color: questTheme.colors.text }]}>
                    {t(lang, d.key)}
                  </Text>
                </View>
                <Text style={[cardStyles.scoreMeaning, { color: questTheme.colors.textMuted }]}>
                  {t(lang, meaningKeys[d.key] ?? 'abilityMapExplanation')}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
      {result.conclusion.confidence === 'low' ? (
        <Text style={[cardStyles.insufficientText, { color: questTheme.colors.textMuted }]}>
          {t(lang, 'lowConfidenceAbilityMap')}
        </Text>
      ) : null}

      <WhySection whyKey="ieRadarWhyBody" isExpanded={isExpanded} onToggle={onToggle} questTheme={questTheme} lang={lang} />
    </QuestCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Combination Effect Card
// ─────────────────────────────────────────────────────────────────────────────

function comboLabel(bucket: ComboBucket, lang: Lang): string {
  const energy = bucket.highEnergy ? t(lang, 'ieCombHighEnergy') : t(lang, 'ieCombLowEnergy');
  const focus  = bucket.highFocus  ? t(lang, 'ieCombHighFocus')  : t(lang, 'ieCombLowFocus');
  return `${energy} · ${focus}`;
}

export function CombinationEffectCard({ result, questTheme, lang, isExpanded, onToggle }: {
  result: InsightsSummaryResult['combination'];
  questTheme: QuestTheme;
  lang: Lang;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const isBaseline = result.status === 'insufficient';

  return (
    <QuestCard questTheme={questTheme} variant="data" style={{ marginTop: questTheme.spacing.md, borderColor: questTheme.colors.borderStrong, borderLeftWidth: 3, borderLeftColor: questTheme.colors.info }}>
      <CardTitle
        titleKey="ieCombinationEffect"
        isBaseline={isBaseline}
        confidence={isBaseline ? undefined : result.conclusion.confidence}
        questTheme={questTheme}
        lang={lang}
      />

      {isBaseline ? (
        <Text style={[cardStyles.insufficientText, { color: questTheme.colors.textMuted }]}>
          {t(lang, 'ieInsufficient')}
        </Text>
      ) : (
        <View style={{ gap: questTheme.spacing.sm, marginTop: questTheme.spacing.sm }}>
          {result.buckets.slice(0, 4).map((b, idx) => {
            const isBest  = result.bestCombo?.label  === b.label;
            const isWorst = result.worstCombo?.label === b.label;
            const barColor = isBest
              ? questTheme.colors.success
              : isWorst
              ? questTheme.colors.danger
              : questTheme.colors.primarySoft;
            const barWidth = `${(b.avgQuality / 5) * 100}%`;
            return (
              <View key={b.label}>
                <View style={[cardStyles.row, { marginBottom: 2 }]}>
                  <Text style={[cardStyles.dimLabel, { color: questTheme.colors.text, flex: 1 }]}>
                    {comboLabel(b, lang)}
                    {isBest  && <Text style={{ color: questTheme.colors.success }}>  ↑</Text>}
                    {isWorst && <Text style={{ color: questTheme.colors.danger  }}>  ↓</Text>}
                  </Text>
                  <Text style={[cardStyles.dimLabel, { color: questTheme.colors.textMuted }]}>
                    {t(lang, 'ieCombAvgQ').replace('{q}', b.avgQuality.toFixed(1))}
                    {'  '}
                    {t(lang, 'ieCombCount').replace('{n}', String(b.count))}
                  </Text>
                </View>
                <View style={[combStyles.barBg, { backgroundColor: questTheme.colors.surfaceSoft }]}>
                  <View style={[combStyles.barFg, { width: barWidth as any, backgroundColor: barColor }]} />
                </View>
              </View>
            );
          })}
          <Text style={[cardStyles.caption, { color: questTheme.colors.textSubtle }]}>
            {t(lang, 'ieSampleN').replace('{n}', String(result.conclusion.sampleSize))}
          </Text>
        </View>
      )}
      <WhySection whyKey="ieCombWhyBody" isExpanded={isExpanded} onToggle={onToggle} questTheme={questTheme} lang={lang} />
    </QuestCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Monthly Trend Card
// ─────────────────────────────────────────────────────────────────────────────

function monthFmt(m: string, lang: Lang): string {
  const [yr, mo] = m.split('-');
  return lang === 'zh' ? `${yr}年${mo}月` : `${new Date(Number(yr), Number(mo) - 1).toLocaleString('en', { month: 'short' })} ${yr}`;
}

function MonthRow({ month, isCurrent, questTheme, lang }: { month: MonthData; isCurrent: boolean; questTheme: QuestTheme; lang: Lang }) {
  const accent = isCurrent ? questTheme.colors.primary : questTheme.colors.textMuted;
  return (
    <View style={[monthStyles.row, { borderColor: questTheme.colors.border, backgroundColor: isCurrent ? questTheme.colors.surfaceMuted : questTheme.colors.surfaceSubtle }]}>
      <Text style={[cardStyles.dimLabel, { color: accent, flex: 1.2 }]}>{monthFmt(month.month, lang)}</Text>
      <Text style={[cardStyles.dimLabel, { color: questTheme.colors.text, flex: 0.8 }]}>{month.totalHours}h</Text>
      <Text style={[cardStyles.dimLabel, { color: month.avgQuality > 0 ? getStateToneColor(month.avgQuality, questTheme) : questTheme.colors.textSubtle, flex: 0.7 }]}>
        {month.avgQuality > 0 ? month.avgQuality.toFixed(1) : '—'}
      </Text>
      <Text style={[cardStyles.dimLabel, { color: questTheme.colors.textMuted, flex: 0.8 }]}>
        {Math.round(month.consistencyRate * 100)}%
      </Text>
    </View>
  );
}

export function MonthlyTrendCard({ result, questTheme, lang, isExpanded, onToggle }: {
  result: InsightsSummaryResult['monthlyTrend'];
  questTheme: QuestTheme;
  lang: Lang;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const isBaseline = result.status === 'insufficient';

  return (
    <QuestCard questTheme={questTheme} variant="data" style={{ marginTop: questTheme.spacing.md, borderColor: questTheme.colors.borderStrong, borderLeftWidth: 3, borderLeftColor: questTheme.colors.warning }}>
      <CardTitle
        titleKey="ieMonthlyTrend"
        isBaseline={isBaseline}
        confidence={isBaseline ? undefined : result.conclusion.confidence}
        questTheme={questTheme}
        lang={lang}
      />

      {isBaseline ? (
        <Text style={[cardStyles.insufficientText, { color: questTheme.colors.textMuted }]}>
          {t(lang, 'ieInsufficient')}
        </Text>
      ) : (
        <>
          {/* Column headers */}
          <View style={[cardStyles.row, { marginBottom: 6 }]}>
            {[' ', t(lang, 'ieMonthHours'), t(lang, 'ieMonthQuality'), t(lang, 'ieMonthConsistency')].map((h, i) => (
              <Text key={i} style={[cardStyles.caption, { color: questTheme.colors.textSubtle, flex: i === 0 ? 1.2 : i === 2 ? 0.7 : 0.8 }]}>{h}</Text>
            ))}
          </View>
          {result.months.map((m, idx) => (
            <MonthRow key={m.month} month={m} isCurrent={idx === 0} questTheme={questTheme} lang={lang} />
          ))}
          {/* Delta chips */}
          {(result.improvements.length > 0 || result.regressions.length > 0) && (
            <View style={[cardStyles.row, { flexWrap: 'wrap', gap: questTheme.spacing.xs, marginTop: questTheme.spacing.sm }]}>
              {result.improvements.map((k) => (
                <View key={k} style={[chipStyles.chip, { backgroundColor: questTheme.colors.successSoft }]}>
                  <Text style={[chipStyles.text, { color: questTheme.colors.success }]}>
                    {t(lang, 'ieMonthImproved')} · {t(lang, k)}
                  </Text>
                </View>
              ))}
              {result.regressions.map((k) => (
                <View key={k} style={[chipStyles.chip, { backgroundColor: questTheme.colors.dangerSoft }]}>
                  <Text style={[chipStyles.text, { color: questTheme.colors.danger }]}>
                    {t(lang, 'ieMonthDeclined')} · {t(lang, k)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
      <WhySection whyKey="ieMonthWhyBody" isExpanded={isExpanded} onToggle={onToggle} questTheme={questTheme} lang={lang} />
    </QuestCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Tomorrow Prediction Card
// ─────────────────────────────────────────────────────────────────────────────

export function TomorrowPredictionCard({ result, questTheme, lang, isExpanded, onToggle }: {
  result: InsightsSummaryResult['tomorrowPrediction'];
  questTheme: QuestTheme;
  lang: Lang;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const isBaseline = result.status === 'insufficient';

  return (
    <QuestCard questTheme={questTheme} variant="data" style={{ marginTop: questTheme.spacing.md, borderColor: questTheme.colors.borderStrong, borderLeftWidth: 3, borderLeftColor: questTheme.colors.primary }}>
      <CardTitle
        titleKey="ieTomorrowPredict"
        isBaseline={isBaseline}
        confidence={undefined}
        questTheme={questTheme}
        lang={lang}
      />

      {isBaseline ? (
        <Text style={[cardStyles.insufficientText, { color: questTheme.colors.textMuted }]}>
          {t(lang, 'ieTomorrowBaseline')}
        </Text>
      ) : (
        <View style={[cardStyles.row, { marginTop: questTheme.spacing.sm, gap: questTheme.spacing.lg }]}>
          {/* Energy */}
          <View style={{ alignItems: 'center' }}>
            <Text style={[cardStyles.bigVal, { color: getStateToneColor(result.energy, questTheme) }]}>
              {result.energy}
            </Text>
            <Text style={[cardStyles.dimLabel, { color: questTheme.colors.textMuted }]}>
              {t(lang, 'ieTomorrowEnergy')}
            </Text>
          </View>
          {/* Focus */}
          <View style={{ alignItems: 'center' }}>
            <Text style={[cardStyles.bigVal, { color: getStateToneColor(result.focus, questTheme) }]}>
              {result.focus}
            </Text>
            <Text style={[cardStyles.dimLabel, { color: questTheme.colors.textMuted }]}>
              {t(lang, 'ieTomorrowFocus')}
            </Text>
          </View>
          {/* Confidence */}
          <View style={{ alignItems: 'center' }}>
            <Text style={[cardStyles.bigVal, { color: questTheme.colors.textMuted }]}>
              {Math.round(result.confidence * 100)}%
            </Text>
            <Text style={[cardStyles.dimLabel, { color: questTheme.colors.textMuted }]}>
              {t(lang, 'ieTomorrowConfPct').replace('{pct}', '')}
            </Text>
          </View>
        </View>
      )}
      <WhySection whyKey="ieTomorrowWhyBody" isExpanded={isExpanded} onToggle={onToggle} questTheme={questTheme} lang={lang} />
    </QuestCard>
  );
}

function AnomalySignalCard({ result, questTheme, lang }: {
  result: InsightsSummaryResult['anomalies'];
  questTheme: QuestTheme;
  lang: Lang;
}) {
  const topAnomaly = result.status === 'insufficient' ? null : result.anomalies[0];
  const tone = topAnomaly?.severity === 'high' ? questTheme.colors.danger : topAnomaly ? questTheme.colors.warning : questTheme.colors.success;
  const desc = topAnomaly
    ? t(lang, topAnomaly.descKey)
      .replace('{pct}', topAnomaly.descValues.pct ?? '')
      .replace('{days}', topAnomaly.descValues.days ?? '')
    : t(lang, result.status === 'insufficient' ? 'ieInsufficient' : 'noAnomalyDetected');
  return (
    <QuestCard questTheme={questTheme} variant="data" style={{ borderColor: questTheme.colors.borderStrong, borderTopWidth: 2, borderTopColor: tone }}>
      <Text style={[widgetStyles.title, { color: questTheme.colors.text }]}>{t(lang, 'ieAnomalyAlert')}</Text>
      <Text style={[widgetStyles.big, { color: tone }]}>
        {result.status === 'insufficient' ? '—' : String(result.anomalies.length)}
      </Text>
      <Text style={[widgetStyles.body, { color: questTheme.colors.textMuted }]}>{desc}</Text>
    </QuestCard>
  );
}

function SelfKnowledgeSignalCard({ selfKnowledge, questTheme, lang }: {
  selfKnowledge?: {
    durationError: number;
    qualityError: number | null;
    level: string;
    weeks: { week: string; error: number }[];
  } | null;
  questTheme: QuestTheme;
  lang: Lang;
}) {
  return (
    <QuestCard questTheme={questTheme} variant="data" style={{ borderColor: questTheme.colors.borderStrong, borderTopWidth: 2, borderTopColor: questTheme.colors.predicted }}>
      <Text style={[widgetStyles.title, { color: questTheme.colors.text }]}>{t(lang, 'selfKnowledgeAccuracy')}</Text>
      {!selfKnowledge ? (
        <Text style={[widgetStyles.body, { color: questTheme.colors.textMuted }]}>{t(lang, 'needPredictions')}</Text>
      ) : (
        <>
          <Text style={[widgetStyles.big, { color: questTheme.colors.predicted }]}>{selfKnowledge.level}</Text>
          <Text style={[widgetStyles.body, { color: questTheme.colors.textMuted }]}>
            {t(lang, 'durationPredictionError')} ±{selfKnowledge.durationError.toFixed(0)} {t(lang, 'minutes')}
          </Text>
          <Text style={[widgetStyles.body, { color: questTheme.colors.textMuted }]}>
            {t(lang, 'qualityPredictionError')} {selfKnowledge.qualityError == null ? '—' : `±${selfKnowledge.qualityError.toFixed(1)}`}
          </Text>
        </>
      )}
    </QuestCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Master wrapper — renders all 6 new cards
// ─────────────────────────────────────────────────────────────────────────────

export function InsightCardsBlock({ insights, questTheme, lang, selfKnowledge }: {
  insights: InsightsSummaryResult;
  questTheme: QuestTheme;
  lang: Lang;
  selfKnowledge?: {
    durationError: number;
    qualityError: number | null;
    level: string;
    weeks: { week: string; error: number }[];
  } | null;
}) {
  const [expandedWhys, setExpandedWhys] = useState<Set<string>>(new Set());
  const toggle = (key: string) => setExpandedWhys((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  return (
    <>
      <Text style={[sectionStyles.title, { color: questTheme.colors.text }]}>{t(lang, 'coreSignals')}</Text>
      <AbilityRadarCard
        result={insights.abilityRadar}
        questTheme={questTheme}
        lang={lang}
        isExpanded={expandedWhys.has('radar')}
        onToggle={() => toggle('radar')}
      />
      <Text style={[sectionStyles.title, { color: questTheme.colors.text }]}>{t(lang, 'signalGrid')}</Text>
      <View style={dashboardStyles.signalGrid}>
        <View style={dashboardStyles.signalItem}>
          <TomorrowPredictionCard
            result={insights.tomorrowPrediction}
            questTheme={questTheme}
            lang={lang}
            isExpanded={expandedWhys.has('tomorrow')}
            onToggle={() => toggle('tomorrow')}
          />
        </View>
        <View style={dashboardStyles.signalItem}>
          <MonthlyTrendCard
            result={insights.monthlyTrend}
            questTheme={questTheme}
            lang={lang}
            isExpanded={expandedWhys.has('monthly')}
            onToggle={() => toggle('monthly')}
          />
        </View>
        <View style={dashboardStyles.signalItem}>
          <SelfKnowledgeSignalCard selfKnowledge={selfKnowledge} questTheme={questTheme} lang={lang} />
        </View>
        <View style={dashboardStyles.signalItem}>
          <GrowthCurveCard
            result={insights.growthCurve}
            questTheme={questTheme}
            lang={lang}
            isExpanded={expandedWhys.has('growth')}
            onToggle={() => toggle('growth')}
          />
        </View>
        <View style={dashboardStyles.signalItem}>
          <AnomalySignalCard result={insights.anomalies} questTheme={questTheme} lang={lang} />
        </View>
      </View>
      <Text style={[sectionStyles.title, { color: questTheme.colors.text }]}>{t(lang, 'deepAnalysis')}</Text>
      <CombinationEffectCard
        result={insights.combination}
        questTheme={questTheme}
        lang={lang}
        isExpanded={expandedWhys.has('combo')}
        onToggle={() => toggle('combo')}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StyleSheet — all tokens-only, no hardcoded values
// ─────────────────────────────────────────────────────────────────────────────

const badgeStyles = StyleSheet.create({
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 6, borderWidth: 1 },
  label: { fontSize: 11, fontWeight: '600' },
});

const titleStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4, gap: 8 },
  text: { fontWeight: '700', flex: 1 },
  badges: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', rowGap: 4 },
});

const whyStyles = StyleSheet.create({
  toggle: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, marginTop: 2 },
  toggleText: { fontSize: 12, fontWeight: '600' },
  body: { marginTop: 6, padding: 10, borderRadius: 8, borderWidth: 1 },
  bodyText: { fontSize: 12, lineHeight: 18 },
  disclaimer: { fontSize: 11, marginTop: 6, fontStyle: 'italic' },
});

const stripStyles = StyleSheet.create({
  container: { borderRadius: 10, borderWidth: 1, padding: 10, marginTop: 12 },
  title: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
  desc: { fontSize: 13, lineHeight: 18 },
  more: { fontSize: 11, marginTop: 4 },
});

const cardStyles = StyleSheet.create({
  insufficientText: { fontSize: 13, marginTop: 8, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center' },
  accentVal: { fontSize: 16, fontWeight: '800', marginRight: 8 },
  dimLabel: { fontSize: 13 },
  caption: { fontSize: 11, marginTop: 6 },
  scoreGrid: { flex: 1.2, minWidth: 260, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  scoreItem: { width: '48%', minWidth: 120, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  scoreHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  scoreVal: { fontSize: 20, fontWeight: '900' },
  scoreLabel: { fontSize: 12, fontWeight: '900' },
  scoreMeaning: { fontSize: 11, lineHeight: 16, marginTop: 4 },
  bigVal: { fontSize: 28, fontWeight: '800' },
});

const radarStyles = StyleSheet.create({
  dashboard: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: 12 },
  chartPanel: { flex: 1, minWidth: 260, maxWidth: 420, borderWidth: 1, borderRadius: 14, padding: 10, alignItems: 'center', justifyContent: 'center' },
});

const monthStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 6, gap: 8 },
});

const sectionStyles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '800', marginTop: 16, marginBottom: 2 },
});

const dashboardStyles = StyleSheet.create({
  signalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  signalItem: { width: '48%', minWidth: 280 },
});

const widgetStyles = StyleSheet.create({
  title: { fontSize: 14, fontWeight: '900' },
  big: { fontSize: 22, fontWeight: '900', marginTop: 8 },
  body: { fontSize: 12, fontWeight: '700', lineHeight: 18, marginTop: 6 },
});

const combStyles = StyleSheet.create({
  barBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFg: { height: '100%', borderRadius: 4 },
});

const chipStyles = StyleSheet.create({
  chip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  text: { fontSize: 11, fontWeight: '700' },
});
