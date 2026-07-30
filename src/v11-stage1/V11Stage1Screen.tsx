import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Lang, t } from '../i18n';
import {
  V11GlassSheet,
  V11Pill,
} from '../v11/components/V11Material';
import V11GlowOrb from '../v11/components/V11GlowOrb';
import {
  V11ArcRange,
  V11Distribution,
  V11IntervalRange,
  V11RadialGauge,
  V11Sparkline,
} from '../v11/components/V11MicroInstruments';
import {
  V11EvidenceStage,
  V11ThemeMode,
  getV11ThemeTokens,
  v11Motion,
  v11Spacing,
  v11Typography,
} from '../v11/tokens';
import useV11ReducedMotion from '../v11/useV11ReducedMotion';
import '../v11/v11-components.css';
import './v11-stage1.css';

const WebView = View as any;
const WebPressable = Pressable as any;
const WebScrollView = ScrollView as any;

const evidenceStages: V11EvidenceStage[] = ['S0', 'S1', 'S2', 'S3'];

function initialLanguage(): Lang {
  if (typeof window === 'undefined') return 'zh';
  return new URLSearchParams(window.location.search).get('lang') === 'en' ? 'en' : 'zh';
}

function initialTheme(): V11ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  return new URLSearchParams(window.location.search).get('theme') === 'light'
    ? 'light'
    : 'dark';
}

export default function V11Stage1Screen() {
  const [lang, setLang] = useState<Lang>(initialLanguage);
  const [themeMode, setThemeMode] = useState<V11ThemeMode>(initialTheme);
  const [forceFallback, setForceFallback] = useState(false);
  const [forceReducedMotion, setForceReducedMotion] = useState(false);
  const systemReducedMotion = useV11ReducedMotion();
  const reducedMotion = forceReducedMotion || systemReducedMotion;
  const theme = getV11ThemeTokens(themeMode);

  const cssVariables = {
    '--v11-stage1-background': theme.field.background,
    '--v11-stage1-field-near': theme.field.near,
    '--v11-stage1-field-middle': theme.field.middle,
    '--v11-stage1-field-far': theme.field.far,
    '--v11-stage1-grid': theme.field.grid,
    '--v11-stage1-text': theme.text.primary,
    '--v11-stage1-secondary': theme.text.secondary,
    '--v11-stage1-metadata': theme.text.metadata,
    '--v11-stage1-primary': theme.glow.primary,
    '--v11-stage1-supporting': theme.glow.supporting,
    '--v11-stage1-soft': theme.questTheme.colors.cardSurface,
    '--v11-stage1-fallback': theme.material.fallback,
  } as any;

  const control = (
    label: string,
    value: string,
    onPress: () => void,
  ) => (
    <WebPressable
      accessibilityLabel={`${label}: ${value}`}
      accessibilityRole="button"
      dataSet={{ 'v11-stage1-role': 'control' }}
      onPress={onPress}
    >
      <Text style={[styles.controlLabel, { color: theme.text.metadata }]}>
        {label}
      </Text>
      <Text style={[styles.controlValue, { color: theme.text.primary }]}>
        {value}
      </Text>
    </WebPressable>
  );

  return (
    <WebScrollView
      contentContainerStyle={styles.scrollContent}
      dataSet={{
        'v11-motion': reducedMotion ? 'reduced' : 'normal',
        'v11-route': 'stage1',
        'v11-stage1-role': 'root',
        'v11-theme': themeMode,
      }}
      style={cssVariables}
    >
      <WebView dataSet={{ 'v11-stage1-role': 'field' }} pointerEvents="none" />
      <WebView dataSet={{ 'v11-stage1-role': 'content' }}>
        <WebView dataSet={{ 'v11-stage1-role': 'header' }}>
          <WebView style={styles.headerCopy}>
            <Text style={[styles.kicker, { color: theme.text.metadata }]}>
              {t(lang, 'stage1Title')}
            </Text>
            <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
              {t(lang, 'stage1Subtitle')}
            </Text>
          </WebView>
          <WebPressable
            accessibilityLabel={t(lang, 'stage0Language')}
            accessibilityRole="button"
            dataSet={{ 'v11-stage1-role': 'language' }}
            onPress={() => setLang((current) => current === 'zh' ? 'en' : 'zh')}
          >
            <Text style={{ color: theme.text.primary }}>
              {t(lang, lang === 'zh' ? 'languageEnglish' : 'languageChinese')}
            </Text>
          </WebPressable>
        </WebView>

        <WebView dataSet={{ 'v11-stage1-role': 'controls' }}>
          {control(
            t(lang, 'stage1Theme'),
            t(lang, themeMode === 'dark' ? 'stage1Dark' : 'stage1Light'),
            () => setThemeMode((current) => current === 'dark' ? 'light' : 'dark'),
          )}
          {control(
            t(lang, 'stage1MaterialMode'),
            t(lang, forceFallback ? 'stage1Fallback' : 'stage1TrueGlass'),
            () => setForceFallback((current) => !current),
          )}
          {control(
            t(lang, 'stage1MotionMode'),
            t(lang, reducedMotion ? 'stage1ReducedMotion' : 'stage1NormalMotion'),
            () => setForceReducedMotion((current) => !current),
          )}
        </WebView>

        <WebView dataSet={{ 'v11-stage1-role': 'section' }}>
          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
            {t(lang, 'stage1ColorField')}
          </Text>
          <WebView dataSet={{ 'v11-stage1-role': 'field-sample' }}>
            <V11GlowOrb
              stage="S3"
              theme={theme}
              style={styles.fieldPrimaryGlow}
            />
            <V11GlowOrb
              stage="S2"
              theme={theme}
              tone="supporting"
              style={styles.fieldSupportingGlow}
            />
            <Text style={[styles.fieldLabel, { color: theme.text.secondary }]}>
              {t(lang, themeMode === 'dark' ? 'stage1Dark' : 'stage1Light')}
            </Text>
          </WebView>
        </WebView>

        <WebView dataSet={{ 'v11-stage1-role': 'section' }}>
          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
            {t(lang, 'stage1Materials')}
          </Text>
          <V11Pill
            accessibilityLabel={t(lang, 'stage1PillAction')}
            contentStyle={styles.pillContent}
            fallback={forceFallback}
            onPress={() => undefined}
            reducedMotion={reducedMotion}
            stage="S3"
            style={styles.primaryPill}
            theme={theme}
          >
            <Text style={[styles.microLabel, { color: theme.text.metadata }]}>
              {t(lang, 'stage1Pill')}
            </Text>
            <Text style={[styles.pillLabel, { color: theme.text.primary }]}>
              {t(lang, 'stage1PillAction')}
            </Text>
          </V11Pill>

          <WebView dataSet={{ 'v11-stage1-role': 'material-grid' }}>
            <V11GlassSheet
              contentStyle={styles.sheetContent}
              fallback={false}
              minHeight={154}
              stage="S3"
              style={styles.materialSheet}
              theme={theme}
            >
              <Text style={[styles.sheetTitle, { color: theme.text.primary }]}>
                {t(lang, 'stage1TrueGlass')}
              </Text>
              <Text style={[styles.sheetCopy, { color: theme.text.secondary }]}>
                {t(lang, 'stage1GlassDescription')}
              </Text>
            </V11GlassSheet>
            <V11GlassSheet
              contentStyle={styles.sheetContent}
              fallback
              minHeight={154}
              stage="S3"
              style={styles.materialSheet}
              theme={theme}
            >
              <Text style={[styles.sheetTitle, { color: theme.text.primary }]}>
                {t(lang, 'stage1Fallback')}
              </Text>
              <Text style={[styles.sheetCopy, { color: theme.text.secondary }]}>
                {t(lang, 'stage1FallbackDescription')}
              </Text>
            </V11GlassSheet>
          </WebView>
        </WebView>

        <WebView dataSet={{ 'v11-stage1-role': 'section' }}>
          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
            {t(lang, 'stage1GlowStages')}
          </Text>
          <WebView dataSet={{ 'v11-stage1-role': 'stage-grid' }}>
            {evidenceStages.map((stage) => (
              <WebView
                key={stage}
                dataSet={{
                  'v11-stage1-role': 'stage-sample',
                  'v11-stage': stage.toLowerCase(),
                }}
              >
                <V11GlowOrb
                  stage={stage}
                  theme={theme}
                  style={styles.stageGlow}
                />
                <Text style={[styles.stageLabel, { color: theme.text.primary }]}>
                  {stage}
                </Text>
              </WebView>
            ))}
          </WebView>
        </WebView>

        <WebView dataSet={{ 'v11-stage1-role': 'section' }}>
          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
            {t(lang, 'stage1MicroInstruments')}
          </Text>
          <V11GlassSheet
            contentStyle={styles.instrumentSheet}
            fallback={forceFallback}
            minHeight={138}
            stage="S3"
            theme={theme}
          >
            {[
              {
                key: 'radial',
                label: t(lang, 'stage1RadialGauge'),
                element: (
                  <V11RadialGauge
                    accessibilityLabel={t(lang, 'stage1RadialGauge')}
                    color={theme.glow.primary}
                    mutedColor={theme.questTheme.colors.border}
                  />
                ),
              },
              {
                key: 'sparkline',
                label: t(lang, 'stage1Sparkline'),
                element: (
                  <V11Sparkline
                    accessibilityLabel={t(lang, 'stage1Sparkline')}
                    color={theme.glow.supporting}
                    mutedColor={theme.questTheme.colors.border}
                  />
                ),
              },
              {
                key: 'distribution',
                label: t(lang, 'stage1Distribution'),
                element: (
                  <V11Distribution
                    accessibilityLabel={t(lang, 'stage1Distribution')}
                    color={theme.glow.primary}
                    mutedColor={theme.questTheme.colors.border}
                  />
                ),
              },
              {
                key: 'arc',
                label: t(lang, 'stage1ArcRange'),
                element: (
                  <V11ArcRange
                    accessibilityLabel={t(lang, 'stage1ArcRange')}
                    color={theme.glow.supporting}
                    mutedColor={theme.questTheme.colors.border}
                  />
                ),
              },
              {
                key: 'interval',
                label: t(lang, 'stage1IntervalRange'),
                element: (
                  <V11IntervalRange
                    accessibilityLabel={t(lang, 'stage1IntervalRange')}
                    color={theme.glow.primary}
                    mutedColor={theme.questTheme.colors.border}
                  />
                ),
              },
            ].map((item) => (
              <WebView key={item.key} dataSet={{ 'v11-stage1-role': 'instrument-item' }}>
                {item.element}
                <Text style={[styles.instrumentLabel, { color: theme.text.secondary }]}>
                  {item.label}
                </Text>
              </WebView>
            ))}
          </V11GlassSheet>
        </WebView>

        <WebView dataSet={{ 'v11-stage1-role': 'section' }}>
          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
            {t(lang, 'stage1Typography')}
          </Text>
          <WebView dataSet={{ 'v11-stage1-role': 'type-sample' }}>
            <WebView style={styles.readingRow}>
              <Text style={[styles.reading, { color: theme.text.primary }]}>2</Text>
              <Text style={[styles.readingUnit, { color: theme.text.secondary }]}>
                / 5 {t(lang, 'stage1StateUnit')}
              </Text>
            </WebView>
            <Text style={[styles.judgement, { color: theme.text.primary }]}>
              {t(lang, 'stage1JudgementSample')}
            </Text>
            <Text style={[styles.body, { color: theme.text.secondary }]}>
              {t(lang, 'stage1BodySample')}
            </Text>
            <Text style={[styles.metadata, { color: theme.text.metadata }]}>
              {t(lang, 'stage1MetadataSample')}
            </Text>
          </WebView>
        </WebView>

        <WebView dataSet={{ 'v11-stage1-role': 'section' }}>
          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
            {t(lang, 'stage1Spacing')}
          </Text>
          <WebView dataSet={{ 'v11-stage1-role': 'spacing-list' }}>
            {Object.entries(v11Spacing).map(([name, value]) => (
              <WebView key={name} dataSet={{ 'v11-stage1-role': 'spacing-row' }}>
                <Text style={[styles.spacingLabel, { color: theme.text.secondary }]}>
                  {name} · {value}
                </Text>
                <WebView
                  dataSet={{ 'v11-stage1-role': 'spacing-bar' }}
                  style={{ width: Math.min(value, 120) }}
                />
              </WebView>
            ))}
          </WebView>
        </WebView>

        <WebView dataSet={{ 'v11-stage1-role': 'section' }}>
          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
            {t(lang, 'stage1Motion')}
          </Text>
          <WebView dataSet={{ 'v11-stage1-role': 'motion-grid' }}>
            {[
              [t(lang, 'stage1Instant'), v11Motion.duration.instant, v11Motion.easing.instant],
              [t(lang, 'stage1Standard'), v11Motion.duration.standard, v11Motion.easing.standard],
              [t(lang, 'stage1Deliberate'), v11Motion.duration.deliberate, v11Motion.easing.deliberate],
            ].map(([label, duration, easing]) => (
              <WebView key={String(label)} dataSet={{ 'v11-stage1-role': 'motion-row' }}>
                <Text style={[styles.motionLabel, { color: theme.text.primary }]}>
                  {label} · {duration}ms
                </Text>
                <Text style={[styles.motionEasing, { color: theme.text.metadata }]}>
                  {easing}
                </Text>
              </WebView>
            ))}
          </WebView>
          <Text style={[styles.reducedLabel, { color: theme.text.secondary }]}>
            {t(lang, 'stage1ReducedComparison')}
          </Text>
          <WebView dataSet={{ 'v11-stage1-role': 'motion-comparison' }}>
            {[
              {
                key: 'normal',
                label: t(lang, 'stage1NormalMotion'),
                reduced: false,
              },
              {
                key: 'reduced',
                label: t(lang, 'stage1ReducedMotion'),
                reduced: true,
              },
            ].map((sample) => (
              <WebView
                key={sample.key}
                dataSet={{
                  'v11-motion': sample.reduced ? 'reduced' : 'normal',
                  'v11-stage1-role': 'motion-sample',
                }}
              >
                <V11GlowOrb
                  stage="S2"
                  theme={theme}
                  style={styles.motionGlow}
                />
                <V11Pill
                  accessibilityLabel={sample.label}
                  contentStyle={styles.motionPillContent}
                  fallback={forceFallback}
                  height={48}
                  onPress={() => undefined}
                  reducedMotion={sample.reduced}
                  stage="S2"
                  style={styles.motionPill}
                  theme={theme}
                >
                  <Text style={[styles.motionSampleLabel, { color: theme.text.primary }]}>
                    {sample.label}
                  </Text>
                </V11Pill>
              </WebView>
            ))}
          </WebView>
        </WebView>

        <Text style={[styles.notice, { color: theme.text.metadata }]}>
          {t(lang, 'stage1FixtureNotice')}
        </Text>
      </WebView>
    </WebScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  headerCopy: {
    minWidth: 0,
    flex: 1,
  },
  kicker: {
    ...v11Typography.label,
    textTransform: 'uppercase',
  },
  subtitle: {
    ...v11Typography.body,
    marginTop: v11Spacing.xxs,
    fontSize: 12,
    lineHeight: 18,
  },
  controlLabel: {
    ...v11Typography.metadata,
  },
  controlValue: {
    ...v11Typography.body,
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
  },
  sectionTitle: {
    ...v11Typography.title,
  },
  fieldPrimaryGlow: {
    position: 'absolute',
    top: -82,
    left: -56,
  },
  fieldSupportingGlow: {
    position: 'absolute',
    right: -76,
    bottom: -82,
  },
  fieldLabel: {
    ...v11Typography.metadata,
  },
  primaryPill: {
    width: '100%',
    maxWidth: 320,
    marginTop: v11Spacing.lg,
  },
  pillContent: {
    minHeight: 64,
    paddingHorizontal: v11Spacing.lg,
    justifyContent: 'center',
  },
  microLabel: {
    ...v11Typography.metadata,
  },
  pillLabel: {
    ...v11Typography.body,
    marginTop: 2,
  },
  materialSheet: {
    minWidth: 0,
    flex: 1,
  },
  sheetContent: {
    minHeight: 154,
    padding: v11Spacing.md,
    justifyContent: 'flex-end',
    gap: v11Spacing.xxs,
  },
  sheetTitle: {
    ...v11Typography.body,
    fontWeight: '500',
  },
  sheetCopy: {
    ...v11Typography.metadata,
    letterSpacing: 0,
  },
  stageGlow: {
    position: 'absolute',
    top: -92,
    left: -92,
  },
  stageLabel: {
    ...v11Typography.label,
  },
  instrumentSheet: {
    minHeight: 138,
    padding: v11Spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: v11Spacing.md,
  },
  instrumentLabel: {
    marginTop: v11Spacing.xxs,
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
  },
  readingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  reading: {
    ...v11Typography.reading,
  },
  readingUnit: {
    marginLeft: v11Spacing.sm,
    fontSize: 13,
    lineHeight: 18,
  },
  judgement: {
    ...v11Typography.judgement,
    marginTop: v11Spacing.lg,
  },
  body: {
    ...v11Typography.body,
    marginTop: v11Spacing.sm,
  },
  metadata: {
    ...v11Typography.metadata,
    marginTop: v11Spacing.sm,
  },
  spacingLabel: {
    width: 118,
    fontSize: 11,
    lineHeight: 16,
  },
  motionLabel: {
    ...v11Typography.body,
    fontWeight: '500',
  },
  motionEasing: {
    ...v11Typography.metadata,
    marginTop: 2,
    letterSpacing: 0,
  },
  reducedLabel: {
    ...v11Typography.body,
    marginTop: v11Spacing.md,
  },
  motionGlow: {
    position: 'absolute',
    top: -108,
    left: -96,
  },
  motionPill: {
    width: '100%',
  },
  motionPillContent: {
    minHeight: 48,
    paddingHorizontal: v11Spacing.sm,
    justifyContent: 'center',
  },
  motionSampleLabel: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
  notice: {
    ...v11Typography.metadata,
    marginTop: v11Spacing.section,
  },
});
