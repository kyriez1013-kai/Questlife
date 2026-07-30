import React from 'react';
import {
  Pressable,
  Text,
  View,
} from 'react-native';
import type { V11ThemeTokens } from '../v11/tokens';

const WebView = View as any;
const WebPressable = Pressable as any;

type UtilityAction = {
  id: string;
  label: string;
  metadata?: string;
  onPress: () => void;
};

export default function V11TodayUtilities({
  feedback,
  feedbackStatus,
  instantExpanded,
  instantFirstStep,
  instantHeadline,
  instantSource,
  instantStatus,
  labels,
  onFeedback,
  onToggleInstant,
  primaryActions,
  theme,
}: {
  feedback: 'useful' | 'not_useful' | null;
  feedbackStatus: 'idle' | 'saving' | 'saved' | 'error';
  instantExpanded: boolean;
  instantFirstStep?: string;
  instantHeadline?: string;
  instantSource?: string;
  instantStatus: 'idle' | 'loading' | 'ready' | 'fallback' | 'error';
  labels: {
    feedbackSaved: string;
    generating: string;
    instantRead: string;
    notUseful: string;
    unavailable: string;
    useful: string;
  };
  onFeedback: (value: 'useful' | 'not_useful') => void;
  onToggleInstant: () => void;
  primaryActions: UtilityAction[];
  theme: V11ThemeTokens;
}) {
  return (
    <WebView dataSet={{ 'v11-today-role': 'utilities' }}>
      {instantStatus !== 'idle' ? (
        <WebView dataSet={{ 'v11-today-role': 'instant-read' }}>
          <WebPressable
            accessibilityRole="button"
            accessibilityState={{ expanded: instantExpanded }}
            dataSet={{ 'v11-today-role': 'utility-heading' }}
            disabled={instantStatus === 'loading'}
            onPress={onToggleInstant}
          >
            <Text style={[styles.title, { color: theme.text.primary }]}>
              {labels.instantRead}
            </Text>
            {instantSource ? (
              <Text style={[styles.meta, { color: theme.text.metadata }]}>
                {instantSource}
              </Text>
            ) : null}
          </WebPressable>

          {instantStatus === 'loading' ? (
            <Text style={[styles.body, { color: theme.text.secondary }]}>
              {labels.generating}
            </Text>
          ) : instantStatus === 'error' || !instantHeadline ? (
            <Text style={[styles.body, { color: theme.text.secondary }]}>
              {labels.unavailable}
            </Text>
          ) : (
            <>
              <Text
                numberOfLines={instantExpanded ? undefined : 1}
                style={[styles.body, { color: theme.text.primary }]}
              >
                {instantHeadline}
              </Text>
              {instantExpanded && instantFirstStep ? (
                <Text style={[styles.body, { color: theme.text.secondary }]}>
                  {instantFirstStep}
                </Text>
              ) : null}
              {instantExpanded ? (
                <WebView dataSet={{ 'v11-today-role': 'feedback-row' }}>
                  {([
                    ['useful', labels.useful],
                    ['not_useful', labels.notUseful],
                  ] as const).map(([value, label]) => (
                    <WebPressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: feedback === value }}
                      dataSet={{
                        'v11-selected': feedback === value ? 'true' : 'false',
                        'v11-today-role': 'utility-action',
                      }}
                      disabled={feedbackStatus === 'saving'}
                      key={value}
                      onPress={() => onFeedback(value)}
                    >
                      <Text style={[styles.meta, { color: theme.text.primary }]}>
                        {label}
                      </Text>
                    </WebPressable>
                  ))}
                </WebView>
              ) : null}
              {feedbackStatus === 'saved' ? (
                <Text style={[styles.meta, { color: theme.text.secondary }]}>
                  {labels.feedbackSaved}
                </Text>
              ) : null}
            </>
          )}
        </WebView>
      ) : null}

      <WebView dataSet={{ 'v11-today-role': 'utility-actions' }}>
        {primaryActions.map((action) => (
          <WebPressable
            accessibilityLabel={action.label}
            accessibilityRole="button"
            dataSet={{ 'v11-today-role': 'utility-action' }}
            key={action.id}
            onPress={action.onPress}
          >
            <Text style={[styles.action, { color: theme.text.primary }]}>
              {action.label}
            </Text>
            {action.metadata ? (
              <Text
                numberOfLines={1}
                style={[styles.meta, { color: theme.text.metadata }]}
              >
                {action.metadata}
              </Text>
            ) : null}
          </WebPressable>
        ))}
      </WebView>
    </WebView>
  );
}

const styles = {
  title: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '400',
  },
  meta: {
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '400',
  },
  action: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
} as const;
