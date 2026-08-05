import React, { useState } from 'react';
import { SafeAreaView, ScrollView, Text, View } from 'react-native';
import { Lang, t } from '../i18n';
import {
  V11CategoricalChip,
  V11DiscreteNumericRail,
  V11SegmentedSelector,
  V11SheetButton,
  V11StickySheetFooter,
  V11TextField,
} from '../v11/components/V11SheetControls';
import { getV11ThemeTokens, V11ThemeTokens, v11Spacing, v11Typography } from '../v11/tokens';
import './v11-stage2-rebaseline.css';

const WebView = View as any;

function languageFromQuery(): Lang {
  if (typeof window === 'undefined') return 'zh';
  return new URLSearchParams(window.location.search).get('lang') === 'en' ? 'en' : 'zh';
}

function ThemeFixture({ lang, theme }: { lang: Lang; theme: V11ThemeTokens }) {
  const [numeric, setNumeric] = useState(3);
  const [segment, setSegment] = useState<'first' | 'second'>('first');

  return (
    <WebView
      dataSet={{ 'v11-control-fixture-theme': theme.mode, 'v11-theme': theme.mode }}
      style={{
        width: '100%',
        minWidth: 0,
        padding: v11Spacing.lg,
        gap: v11Spacing.lg,
        borderRadius: 24,
        backgroundColor: theme.questTheme.colors.surfaceElevated,
      }}
    >
      <Text style={{ color: theme.text.primary, ...v11Typography.title }}>{theme.mode}</Text>

      <V11DiscreteNumericRail
        label={t(lang, 'rebaselineCalibrationRailLabel')}
        onChange={setNumeric}
        options={[1, 2, 3, 4, 5].map((value) => ({
          value,
          label: t(lang, value === 1 ? 'veryBad' : value === 2 ? 'bad' : value === 3 ? 'average' : value === 4 ? 'good' : 'great'),
        }))}
        theme={theme}
        value={numeric}
      />

      <WebView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <V11CategoricalChip label={t(lang, 'rebaselineControlUnselected')} onPress={() => undefined} selected={false} theme={theme} />
        <V11CategoricalChip label={t(lang, 'rebaselineControlSelected')} onPress={() => undefined} selected theme={theme} />
        <V11CategoricalChip label={t(lang, 'rebaselineControlPressed')} onPress={() => undefined} selected={false} theme={theme} visualState="pressed" />
        <V11CategoricalChip disabled label={t(lang, 'rebaselineControlDisabled')} onPress={() => undefined} selected={false} theme={theme} />
      </WebView>

      <V11SegmentedSelector
        onChange={setSegment}
        options={[
          { value: 'first', label: t(lang, 'rebaselineControlSelected') },
          { value: 'second', label: t(lang, 'rebaselineControlUnselected') },
        ]}
        theme={theme}
        value={segment}
      />

      <V11TextField placeholder={t(lang, 'rebaselineControlUnselected')} theme={theme} />
      <V11TextField placeholder={t(lang, 'rebaselineControlFocused')} theme={theme} visualState="focused" />
      <V11TextField placeholder={t(lang, 'rebaselineControlError')} status="error" theme={theme} />
      <V11TextField disabled placeholder={t(lang, 'rebaselineControlDisabled')} theme={theme} />

      <WebView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <V11SheetButton label={t(lang, 'save')} onPress={() => undefined} style={{ minWidth: 132, flex: 1 }} theme={theme} variant="primary" />
        <V11SheetButton label={t(lang, 'cancel')} onPress={() => undefined} style={{ minWidth: 132, flex: 1 }} theme={theme} variant="secondary" />
        <V11SheetButton disabled label={t(lang, 'rebaselineControlDisabled')} onPress={() => undefined} style={{ minWidth: 132, flex: 1 }} theme={theme} variant="primary" />
        <V11SheetButton label={t(lang, 'rebaselineControlPressed')} onPress={() => undefined} style={{ minWidth: 132, flex: 1 }} theme={theme} variant="primary" visualState="pressed" />
        <V11SheetButton label={t(lang, 'rebaselineControlSuccess')} onPress={() => undefined} status="success" style={{ minWidth: 132, flex: 1 }} theme={theme} variant="primary" />
        <V11SheetButton label={t(lang, 'rebaselineControlError')} onPress={() => undefined} status="error" style={{ minWidth: 132, flex: 1 }} theme={theme} variant="secondary" />
        <V11SheetButton label={t(lang, 'rebaselineControlLoading')} loading onPress={() => undefined} style={{ minWidth: 132, flex: 1 }} theme={theme} variant="primary" />
      </WebView>

      <V11StickySheetFooter
        cancelLabel={t(lang, 'cancel')}
        message={t(lang, 'rebaselineControlError')}
        messageStatus="error"
        onCancel={() => undefined}
        onSave={() => undefined}
        saveLabel={t(lang, 'save')}
        theme={theme}
      />
    </WebView>
  );
}

export default function V11SheetControlFixtureScreen() {
  const lang = languageFromQuery();
  const dark = getV11ThemeTokens('dark');
  const light = getV11ThemeTokens('light');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: dark.field.background }}>
      <ScrollView
        contentContainerStyle={{
          width: '100%',
          maxWidth: 920,
          alignSelf: 'center',
          padding: v11Spacing.lg,
          paddingBottom: 64,
          gap: v11Spacing.xl,
        }}
      >
        <WebView style={{ gap: v11Spacing.xs }}>
          <Text style={{ color: dark.text.primary, ...v11Typography.judgement }}>{t(lang, 'rebaselineControlFixture')}</Text>
          <Text style={{ color: dark.text.secondary, ...v11Typography.body }}>{t(lang, 'rebaselineControlFixtureHint')}</Text>
        </WebView>
        <ThemeFixture lang={lang} theme={dark} />
        <ThemeFixture lang={lang} theme={light} />
      </ScrollView>
    </SafeAreaView>
  );
}
