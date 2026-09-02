import React from 'react';
import { Text, View } from 'react-native';
import type { Lang } from '../i18n';
import type { V11ThemeTokens } from '../v11/tokens';
import V11Stage2ProductionSheet from '../v11-stage2-rebaseline/V11Stage2ProductionSheet';
import type { DecisionSurfacePresentationV2 } from './decisionSurfacePresentation';
import { adaptiveText } from './presentation';

const WebView = View as any;
const WebText = Text as any;

export default function AdaptiveDecisionEvidenceSheet({
  lang,
  onClose,
  presentation,
  reducedMotion,
  theme,
  visible,
}: {
  lang: Lang;
  onClose: () => void;
  presentation: DecisionSurfacePresentationV2;
  reducedMotion: boolean;
  theme: V11ThemeTokens;
  visible: boolean;
}) {
  const copy = (key: string, values: Record<string, string | number> = {}) => adaptiveText(lang, key, values);

  return (
    <V11Stage2ProductionSheet
      closeLabel={copy('adaptiveSurfaceCloseEvidence')}
      minHeight={520}
      onClose={onClose}
      reducedMotion={reducedMotion}
      theme={theme}
      title={copy('adaptiveSurfaceFullEvidence')}
      visible={visible}
    >
      <WebView
        dataSet={{ adlui: 'adl2-evidence-sheet' }}
        style={{
          '--adl2-text': theme.text.primary,
          '--adl2-muted': theme.text.secondary,
          '--adl2-meta': theme.text.metadata,
          '--adl2-border': theme.control.neutralBorder,
          '--adl2-primary': theme.glow.primary,
        }}
      >
        <WebText dataSet={{ adlui: 'adl2-evidence-intro' }}>
          {copy('adaptiveSurfaceEvidenceIntro')}
        </WebText>
        {presentation.evidenceGroups.map((group) => (
          <WebView dataSet={{ adlui: 'adl2-evidence-group' }} key={group.id}>
            <WebText dataSet={{ adlui: 'adl2-evidence-group-label' }}>{group.label}</WebText>
            {group.items.map((item) => (
              <WebView dataSet={{ adlui: 'adl2-evidence-detail-row' }} key={item.id}>
                <WebView dataSet={{ adlui: 'adl2-evidence-mark' }} />
                <WebView dataSet={{ adlui: 'adl2-evidence-detail-copy' }}>
                  <WebText dataSet={{ adlui: 'adl2-evidence-detail-text' }}>{item.text}</WebText>
                  {item.supportCount != null || item.counterexampleCount != null ? (
                    <WebText dataSet={{ adlui: 'adl2-evidence-counts' }}>
                      {copy('adaptiveSupportCounter', {
                        support: item.supportCount ?? 0,
                        counter: item.counterexampleCount ?? 0,
                      })}
                    </WebText>
                  ) : null}
                </WebView>
              </WebView>
            ))}
          </WebView>
        ))}
        {presentation.evidenceGroups.length === 0 ? (
          <WebText dataSet={{ adlui: 'adl2-evidence-empty' }}>{copy('adaptiveSurfaceNoEvidence')}</WebText>
        ) : null}
      </WebView>
    </V11Stage2ProductionSheet>
  );
}
