import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { AdaptiveDecisionWorkspaceProps } from './AdaptiveDecisionWorkspace';
import { buildDecisionSurfacePresentation } from './decisionSurfacePresentation';
import { adaptiveText } from './presentation';

export default function NativeDecisionWorkspace({
  activeActionId, answers, busy = false, canApply, episode, error = '', lang,
  onAnswer, onApply, onSelectAction, onUndo, scheduleBlocks, theme,
}: AdaptiveDecisionWorkspaceProps) {
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const view = useMemo(() => buildDecisionSurfacePresentation({
    episode, scheduleBlocks, activeActionId, lang,
  }), [episode, scheduleBlocks, activeActionId, lang]);
  const copy = (key: string) => adaptiveText(lang, key);
  const applied = episode.status === 'APPLIED' || episode.status === 'FOLLOW_UP_DUE';
  const text = theme.text.primary;
  const muted = theme.text.secondary;
  const surface = theme.control.neutralSurface;
  const control = (selected = false) => ({
    minHeight: 44,
    justifyContent: 'center' as const,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: selected ? theme.control.neutralSelectedSurface : surface,
    borderColor: selected ? theme.control.neutralSelectedBorder : theme.control.neutralBorder,
    borderWidth: 1,
  });
  return (
    <View style={{ width: '100%', gap: 18, paddingBottom: 20 }}>
      <Text accessibilityRole="header" style={{ color: text, fontSize: 22, lineHeight: 30, fontWeight: '500' }}>{view.question}</Text>
      {view.contextItems.length > 0 ? <View style={{ gap: 8 }}>
        <Text style={{ color: muted, fontSize: 12 }}>{copy('adaptiveSurfaceAlreadyRead')}</Text>
        {view.contextItems.map((item) => <View key={item.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
          <Text style={{ color: muted, fontSize: 13, flexShrink: 1 }}>{item.label}</Text>
          <Text style={{ color: text, fontSize: 13, flexShrink: 1, textAlign: 'right' }}>{item.value}</Text>
        </View>)}
      </View> : null}

      {episode.status === 'NEEDS_INPUT' ? <View style={{ gap: 14 }}>
        <Text style={{ color: muted, fontSize: 12 }}>{copy('adaptiveSurfaceMissingInfo')}</Text>
        {episode.missingContext.map((question) => <View key={question.id} style={{ gap: 9 }}>
          <Text style={{ color: text, fontSize: 15 }}>{copy(question.promptKey)}</Text>
          <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {question.options.map((option) => <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: answers[question.id] === option.value, disabled: busy }}
              key={option.value}
              onPress={() => onAnswer(question.id, option.value)}
              style={control(answers[question.id] === option.value)}
            >
              <Text style={{ color: text, fontSize: 13 }}>{copy(option.labelKey)}</Text>
            </Pressable>)}
          </View>
        </View>)}
      </View> : null}

      {view.isAbstained ? <View style={{ gap: 8 }}>
        <Text style={{ color: text, fontSize: 18 }}>{copy('adaptiveSurfaceSafetyTitle')}</Text>
        <Text style={{ color: muted, fontSize: 14, lineHeight: 20 }}>{copy('adaptiveSurfaceSafetyBody')}</Text>
        <Text style={{ color: muted, fontSize: 13 }}>{copy('adaptiveSurfacePlanNotChanged')}</Text>
      </View> : null}

      {episode.status !== 'NEEDS_INPUT' && !view.isAbstained && view.primaryAction ? <View style={{ gap: 15 }}>
        <Text style={{ color: muted, fontSize: 12 }}>{copy(applied ? 'adaptiveSurfaceApplied' : 'adaptiveSurfaceRecommendation')}</Text>
        <Text style={{ color: text, fontSize: 20, lineHeight: 27 }}>{view.primaryAction.title}</Text>
        <Text style={{ color: muted, fontSize: 14, lineHeight: 21 }}>{view.primaryAction.description}</Text>
        {[...view.primaryAction.planChanges, ...view.primaryAction.protectedItems].map((change) => <View key={change.id} style={{ gap: 4, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.control.neutralBorder }}>
          <Text style={{ color: text, fontSize: 14 }}>{change.title}</Text>
          <Text style={{ color: muted, fontSize: 12 }}>{change.before} {change.kind === 'unchanged' ? '·' : '→'} {change.after}</Text>
        </View>)}
        {applied ? <Pressable accessibilityRole="button" onPress={onUndo} style={control()}>
          <Text style={{ color: text, textAlign: 'center' }}>{copy('adaptiveSurfaceUndo')}</Text>
        </Pressable> : canApply ? <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={onApply} style={[control(true), { backgroundColor: theme.control.neutralAction }]}>
          <Text style={{ color: theme.control.neutralActionText, textAlign: 'center', fontWeight: '600' }}>{copy('adaptiveSurfaceApply')}</Text>
        </Pressable> : null}
        {!applied && view.alternatives.length > 0 ? <View style={{ gap: 8 }}>
          <Text style={{ color: muted, fontSize: 12 }}>{copy('adaptiveSurfaceOtherChoices')}</Text>
          {view.alternatives.map((item) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: activeActionId === item.id }} key={item.id} onPress={() => onSelectAction(item.id)} style={control(activeActionId === item.id)}>
            <Text style={{ color: text, fontSize: 14 }}>{item.title}</Text>
            <Text style={{ color: muted, fontSize: 12 }}>{item.exactEffect}</Text>
          </Pressable>)}
        </View> : null}
        <View style={{ gap: 6 }}>
          <Text style={{ color: muted, fontSize: 12 }}>{copy('adaptiveSurfaceWhy')}</Text>
          {view.primaryAction.reasonLines.map((line, index) => <Text key={`${index}:${line}`} style={{ color: text, fontSize: 13, lineHeight: 19 }}>{line}</Text>)}
        </View>
      </View> : null}

      <Pressable accessibilityRole="button" accessibilityState={{ expanded: evidenceOpen }} onPress={() => setEvidenceOpen(!evidenceOpen)} style={control()}>
        <Text style={{ color: text, textAlign: 'center' }}>{copy('adaptiveSurfaceFullEvidence')}</Text>
      </Pressable>
      {evidenceOpen ? <View style={{ gap: 10 }}>
        {view.evidenceGroups.map((group) => <View key={group.id} style={{ gap: 5 }}>
          <Text style={{ color: muted, fontSize: 12 }}>{group.label}</Text>
          {group.items.map((item) => <Text key={item.id} style={{ color: text, fontSize: 13, lineHeight: 19 }}>{item.text}</Text>)}
        </View>)}
      </View> : null}
      {error ? <Text accessibilityRole="alert" style={{ color: theme.control.error, fontSize: 13 }}>{error}</Text> : null}
    </View>
  );
}
