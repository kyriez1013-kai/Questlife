import React, {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { Lang, t } from '../i18n';
import { getQuestTheme, QuestTheme } from '../design/tokens';
import './v11-stage0.css';

type EvidenceStage = 'S1' | 'S3';
type Stage0Theme = 'deepWork' | 'cleanFocus';

type FrameStats = {
  sampleCount: number;
  p95Ms: number;
  overBudgetCount: number;
};

type BackdropSupport = {
  standard: boolean;
  webkit: boolean;
};

type GlassSurfaceProps = {
  children: React.ReactNode;
  fallback: boolean;
  material?: 'backdrop' | 'fallback';
  role: 'action-inner' | 'material-inner';
};

const WebView = View as any;
const WebPressable = Pressable as any;
const WebScrollView = ScrollView as any;

const STAGE0_ROUTE = 'stage0';
const FRAME_SAMPLE_TARGET = 180;
const FRAME_BUDGET_MS = 20;
const DIRECTIONAL_EDGE_STROKE_WIDTH = 1.5;

function getInitialLanguage(): Lang {
  if (typeof window === 'undefined') return 'zh';
  return new URLSearchParams(window.location.search).get('lang') === 'en' ? 'en' : 'zh';
}

function getInitialTheme(): Stage0Theme {
  if (typeof window === 'undefined') return 'deepWork';
  return new URLSearchParams(window.location.search).get('theme') === 'light'
    ? 'cleanFocus'
    : 'deepWork';
}

function getWebBackdropSupport(): BackdropSupport {
  if (Platform.OS !== 'web' || typeof CSS === 'undefined') {
    return { standard: false, webkit: false };
  }

  return {
    standard: CSS.supports('backdrop-filter', 'blur(1px)'),
    webkit: CSS.supports('-webkit-backdrop-filter', 'blur(1px)'),
  };
}

function useFrameObservation(enabled: boolean): FrameStats | null {
  const [stats, setStats] = useState<FrameStats | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    let frameId = 0;
    let previousTime = 0;
    const intervals: number[] = [];

    const observeFrame = (time: number) => {
      if (previousTime > 0) intervals.push(time - previousTime);
      previousTime = time;

      if (intervals.length < FRAME_SAMPLE_TARGET) {
        frameId = window.requestAnimationFrame(observeFrame);
        return;
      }

      const sorted = [...intervals].sort((left, right) => left - right);
      const p95Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
      setStats({
        sampleCount: intervals.length,
        p95Ms: Number(sorted[p95Index].toFixed(1)),
        overBudgetCount: intervals.filter((value) => value > FRAME_BUDGET_MS).length,
      });
    };

    frameId = window.requestAnimationFrame(observeFrame);
    return () => window.cancelAnimationFrame(frameId);
  }, [enabled]);

  return stats;
}

function DirectionalEdge({
  theme,
  radius,
}: {
  theme: QuestTheme;
  radius: number;
}) {
  const gradientId = `v11DirectionalEdge${useId().replace(/:/g, '')}`;
  const edgeRef = useRef<HTMLElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const inset = DIRECTIONAL_EDGE_STROKE_WIDTH / 2;
  const rectWidth = Math.max(0, size.width - DIRECTIONAL_EDGE_STROKE_WIDTH);
  const rectHeight = Math.max(0, size.height - DIRECTIONAL_EDGE_STROKE_WIDTH);
  const isPill = radius >= size.height / 2;
  const resolvedRadius = isPill
    ? rectHeight / 2
    : Math.min(Math.max(0, radius - inset), rectHeight / 2);

  const handleLayout = (event: LayoutChangeEvent) => {
    if (Platform.OS === 'web') return;
    const { width, height } = event.nativeEvent.layout;
    setSize((current) => (
      current.width === width && current.height === height
        ? current
        : { width, height }
    ));
  };

  useLayoutEffect(() => {
    if (Platform.OS !== 'web') return;
    const element = edgeRef.current;
    if (!element) return;

    const syncSize = () => {
      const { width, height } = element.getBoundingClientRect();
      setSize((current) => (
        current.width === width && current.height === height
          ? current
          : { width, height }
      ));
    };

    syncSize();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(syncSize);
      observer.observe(element);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', syncSize);
    return () => window.removeEventListener('resize', syncSize);
  }, []);

  return (
    <WebView
      ref={edgeRef}
      pointerEvents="none"
      dataSet={{
        'v11-role': 'directional-edge',
        'v11-stroke-width': String(DIRECTIONAL_EDGE_STROKE_WIDTH),
      }}
      onLayout={handleLayout}
      style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}
    >
      {size.width > 0 && size.height > 0 ? (
        <Svg
          pointerEvents="none"
          width={size.width}
          height={size.height}
          viewBox={`0 0 ${size.width} ${size.height}`}
          preserveAspectRatio="none"
        >
          <Defs>
            <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={theme.colors.text} stopOpacity={0.48} />
              <Stop offset="42%" stopColor={theme.colors.text} stopOpacity={0.12} />
              <Stop offset="100%" stopColor={theme.colors.text} stopOpacity={0.02} />
            </LinearGradient>
          </Defs>
          <Rect
            x={inset}
            y={inset}
            width={rectWidth}
            height={rectHeight}
            rx={resolvedRadius}
            ry={resolvedRadius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={DIRECTIONAL_EDGE_STROKE_WIDTH}
          />
        </Svg>
      ) : null}
    </WebView>
  );
}

function GlassSurface({
  children,
  fallback,
  material = fallback ? 'fallback' : 'backdrop',
  role,
}: GlassSurfaceProps) {
  if (Platform.OS === 'web') {
    return React.createElement(
      'div',
      {
        'data-v11-role': role,
        'data-v11-material': material,
        style: {
          backdropFilter: fallback ? 'none' : 'blur(28px) saturate(160%)',
          WebkitBackdropFilter: fallback ? 'none' : 'blur(28px) saturate(160%)',
        },
      },
      children,
    );
  }

  return (
    <View>
      {children}
    </View>
  );
}

function RadialLightOrb({
  color,
  stage,
  supporting = false,
}: {
  color: string;
  stage: EvidenceStage;
  supporting?: boolean;
}) {
  const opacity = supporting
    ? stage === 'S1' ? 0.12 : 0.24
    : stage === 'S1' ? 0.28 : 0.62;

  return (
    <WebView
      pointerEvents="none"
      dataSet={{
        'v11-role': 'orb',
        'v11-variant': supporting ? 'supporting' : 'primary',
        'v11-stage': stage.toLowerCase(),
      }}
      style={{ opacity }}
    >
      <Svg width="100%" height="100%" viewBox="0 0 280 280">
        <Defs>
          <RadialGradient id={supporting ? 'v11SupportOrb' : 'v11PrimaryOrb'} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={color} stopOpacity={0.72} />
            <Stop offset="34%" stopColor={color} stopOpacity={0.38} />
            <Stop offset="68%" stopColor={color} stopOpacity={0.12} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle
          cx={140}
          cy={140}
          r={140}
          fill={`url(#${supporting ? 'v11SupportOrb' : 'v11PrimaryOrb'})`}
        />
      </Svg>
    </WebView>
  );
}

function MaterialSample({
  theme,
  lang,
  variant,
  blurSupported,
}: {
  theme: QuestTheme;
  lang: Lang;
  variant: 'backdrop' | 'fallback';
  blurSupported: boolean;
}) {
  const usesFallback = variant === 'fallback' || !blurSupported;

  return (
    <WebView dataSet={{ 'v11-role': 'material-sample' }}>
      <DirectionalEdge theme={theme} radius={theme.radius.xl} />
      <GlassSurface
        role="material-inner"
        fallback={usesFallback}
        material={usesFallback ? 'fallback' : 'backdrop'}
      >
        <Text style={{ color: theme.colors.text, fontWeight: theme.typography.weightMedium }}>
          {variant === 'fallback' ? t(lang, 'stage0OpaqueFallback') : t(lang, 'stage0LiveBackdrop')}
        </Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: theme.typography.captionSize }}>
          {variant === 'fallback'
            ? t(lang, 'stage0FallbackDescription')
            : blurSupported
              ? t(lang, 'stage0BackdropDescription')
              : t(lang, 'stage0BackdropUnavailable')}
        </Text>
      </GlassSurface>
    </WebView>
  );
}

export default function V11Stage0Screen() {
  const [lang, setLang] = useState<Lang>(getInitialLanguage);
  const [themeId, setThemeId] = useState<Stage0Theme>(getInitialTheme);
  const [stage, setStage] = useState<EvidenceStage>('S1');
  const [forceFallback, setForceFallback] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [sweeping, setSweeping] = useState(false);
  const sweepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backdropSupport = useMemo(getWebBackdropSupport, []);
  const blurSupported = backdropSupport.standard || backdropSupport.webkit;
  const frameStats = useFrameObservation(!reducedMotion);
  const theme = getQuestTheme(themeId);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener?.('change', sync);
    return () => media.removeEventListener?.('change', sync);
  }, []);

  useEffect(() => () => {
    if (sweepTimerRef.current) clearTimeout(sweepTimerRef.current);
  }, []);

  const triggerMaterialSweep = () => {
    if (reducedMotion) return;
    if (sweepTimerRef.current) clearTimeout(sweepTimerRef.current);
    setSweeping(false);
    window.requestAnimationFrame(() => setSweeping(true));
    sweepTimerRef.current = setTimeout(() => setSweeping(false), 120);
  };

  const cssVariables = {
    '--v11-stage0-bg': theme.colors.background,
    '--v11-stage0-field-near': theme.colors.surfaceSoft,
    '--v11-stage0-field-mid': theme.colors.background,
    '--v11-stage0-field-far': theme.colors.surfaceSubtle,
    '--v11-stage0-surface': theme.colors.cardSurface,
    '--v11-stage0-surface-fallback': theme.colors.surfaceElevated,
    '--v11-stage0-text': theme.colors.text,
    '--v11-stage0-muted': theme.colors.textMuted,
    '--v11-stage0-meta': theme.colors.textSubtle,
    '--v11-stage0-primary': theme.colors.primary,
    '--v11-stage0-support': theme.colors.accent,
    '--v11-stage0-shadow': theme.colors.cardShadow,
    '--v11-stage0-radius': `${theme.radius.xxl}px`,
    '--v11-stage0-pill-radius': `${theme.radius.pill}px`,
  } as any;

  return (
    <WebScrollView
      contentContainerStyle={styles.scrollContent}
      style={cssVariables}
      dataSet={{
        'v11-role': 'root',
        'v11-route': STAGE0_ROUTE,
        'v11-theme': themeId,
        'v11-fallback': forceFallback ? 'true' : 'false',
        'v11-motion': reducedMotion ? 'reduced' : 'normal',
      }}
    >
      <WebView dataSet={{ 'v11-role': 'field' }} pointerEvents="none" />
      <WebView dataSet={{ 'v11-role': 'content' }}>
        <WebView dataSet={{ 'v11-role': 'topline' }}>
          <WebView dataSet={{ 'v11-role': 'topline-copy' }}>
            <Text style={[styles.kicker, { color: theme.colors.textSubtle }]}>
              {t(lang, 'stage0Title')}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
              {t(lang, 'stage0Subtitle')}
            </Text>
          </WebView>
          <WebPressable
            accessibilityRole="button"
            accessibilityLabel={t(lang, 'stage0Language')}
            dataSet={{ 'v11-role': 'mini-control' }}
            onPress={() => setLang((value) => value === 'zh' ? 'en' : 'zh')}
          >
            <Text style={{ color: theme.colors.text }}>{lang === 'zh' ? 'EN' : '中文'}</Text>
          </WebPressable>
        </WebView>

        <WebView dataSet={{ 'v11-role': 'instrument' }}>
          <RadialLightOrb color={theme.colors.primary} stage={stage} />
          <RadialLightOrb color={theme.colors.accent} stage={stage} supporting />

          <Text style={[styles.readingLabel, { color: theme.colors.textSubtle }]}>
            {t(lang, 'stage0MainReading')}
          </Text>
          <WebView dataSet={{ 'v11-role': 'reading-row' }}>
            <Text style={[styles.reading, { color: theme.colors.text }]}>2</Text>
            <Text style={[styles.denominator, { color: theme.colors.textMuted }]}>/ 5</Text>
            <Text style={[styles.unit, { color: theme.colors.textSubtle }]}>state</Text>
          </WebView>
          <Text style={[styles.provenance, { color: theme.colors.textSubtle }]}>
            {stage} · {t(lang, 'stage0RecordedOnce')}
          </Text>
          <Text style={[styles.judgement, { color: theme.colors.text }]}>
            {t(lang, 'stage0Judgement')}
          </Text>

          <WebPressable
            accessibilityRole="button"
            dataSet={{
              'v11-role': 'action',
              'v11-sweeping': sweeping ? 'true' : 'false',
            }}
            onPress={triggerMaterialSweep}
          >
            <DirectionalEdge theme={theme} radius={theme.radius.pill} />
            <GlassSurface role="action-inner" fallback={forceFallback || !blurSupported}>
              <Text style={[styles.sequence, { color: theme.colors.textSubtle }]}>01</Text>
              <Text style={[styles.actionLabel, { color: theme.colors.text }]}>
                {t(lang, 'stage0Action')}
              </Text>
            </GlassSurface>
          </WebPressable>
        </WebView>

        <WebView dataSet={{ 'v11-role': 'controls' }}>
          <WebPressable
            accessibilityRole="button"
            dataSet={{ 'v11-role': 'control' }}
            onPress={() => setStage((value) => value === 'S1' ? 'S3' : 'S1')}
          >
            <Text style={{ color: theme.colors.text }}>
              {t(lang, 'stage0EvidenceStage')} · {stage}
            </Text>
          </WebPressable>
          <WebPressable
            accessibilityRole="button"
            dataSet={{ 'v11-role': 'control' }}
            onPress={() => setThemeId((value) => value === 'deepWork' ? 'cleanFocus' : 'deepWork')}
          >
            <Text style={{ color: theme.colors.text }}>
              {t(lang, 'stage0Theme')} · {themeId === 'deepWork' ? t(lang, 'deepWork') : t(lang, 'cleanFocus')}
            </Text>
          </WebPressable>
          <WebPressable
            accessibilityRole="button"
            dataSet={{ 'v11-role': 'control' }}
            onPress={() => setForceFallback((value) => !value)}
          >
            <Text style={{ color: theme.colors.text }}>
              {forceFallback ? t(lang, 'stage0UseBackdrop') : t(lang, 'stage0ForceFallback')}
            </Text>
          </WebPressable>
          <WebPressable
            accessibilityRole="button"
            dataSet={{ 'v11-role': 'control' }}
            onPress={() => setReducedMotion((value) => !value)}
          >
            <Text style={{ color: theme.colors.text }}>
              {reducedMotion ? t(lang, 'stage0NormalMotion') : t(lang, 'stage0ReducedMotion')}
            </Text>
          </WebPressable>
        </WebView>

        <WebView dataSet={{ 'v11-role': 'section' }}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t(lang, 'stage0MaterialComparison')}
          </Text>
          <Text style={[styles.sectionCopy, { color: theme.colors.textMuted }]}>
            {blurSupported ? t(lang, 'stage0SupportDetected') : t(lang, 'stage0SupportMissing')}
          </Text>
          <Text style={[styles.supportDetail, { color: theme.colors.textSubtle }]}>
            standard={String(backdropSupport.standard)} · -webkit={String(backdropSupport.webkit)}
          </Text>
          <WebView dataSet={{ 'v11-role': 'material-grid' }}>
            <MaterialSample
              theme={theme}
              lang={lang}
              variant="backdrop"
              blurSupported={blurSupported}
            />
            <MaterialSample
              theme={theme}
              lang={lang}
              variant="fallback"
              blurSupported={blurSupported}
            />
          </WebView>
        </WebView>

        <WebView dataSet={{ 'v11-role': 'section' }}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t(lang, 'stage0Performance')}
          </Text>
          <WebView dataSet={{ 'v11-role': 'metrics' }}>
            <WebView dataSet={{ 'v11-role': 'metric' }}>
              <Text style={[styles.metricLabel, { color: theme.colors.textSubtle }]}>P95</Text>
              <Text style={[styles.metricValue, { color: theme.colors.text }]}>
                {frameStats ? `${frameStats.p95Ms} ms` : t(lang, 'stage0Measuring')}
              </Text>
            </WebView>
            <WebView dataSet={{ 'v11-role': 'metric' }}>
              <Text style={[styles.metricLabel, { color: theme.colors.textSubtle }]}>
                {t(lang, 'stage0OverBudget')}
              </Text>
              <Text style={[styles.metricValue, { color: theme.colors.text }]}>
                {frameStats ? `${frameStats.overBudgetCount} / ${frameStats.sampleCount}` : '—'}
              </Text>
            </WebView>
          </WebView>
          <Text style={[styles.footnote, { color: theme.colors.textSubtle }]}>
            {t(lang, 'stage0FixtureNotice')}
          </Text>
        </WebView>
      </WebView>
    </WebScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  kicker: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
  },
  readingLabel: {
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  reading: {
    fontSize: 94,
    lineHeight: 102,
    fontWeight: '300',
    letterSpacing: -6,
  },
  denominator: {
    marginLeft: 12,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '400',
  },
  unit: {
    marginLeft: 8,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '400',
    textTransform: 'lowercase',
  },
  provenance: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 0.8,
  },
  judgement: {
    maxWidth: 286,
    marginTop: 42,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '400',
    letterSpacing: -0.5,
  },
  sequence: {
    fontSize: 9,
    lineHeight: 11,
    letterSpacing: 0.8,
  },
  actionLabel: {
    marginTop: 3,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '400',
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  sectionCopy: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
  },
  supportDetail: {
    marginTop: 3,
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 0.2,
  },
  metricLabel: {
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  metricValue: {
    marginTop: 4,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '500',
  },
  footnote: {
    marginTop: 12,
    fontSize: 11,
    lineHeight: 16,
  },
});
