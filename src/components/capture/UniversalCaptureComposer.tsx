import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import type { V11ThemeTokens } from '../../v11/tokens';
import { v11Spacing, v11Typography } from '../../v11/tokens';
import {
  V11CategoricalChip,
  V11CheckboxControl,
  V11CompactValueSelector,
  V11SheetButton,
  V11TextField,
} from '../../v11/components/V11SheetControls';
import type { UniversalCaptureDomain } from '../../utils/universalCapture';
import V11RebaselineIcon from '../../v11-stage2-rebaseline/V11RebaselineIcon';

const WebView = View as any;

export type UniversalCaptureOption = {
  id: string;
  label: string;
  value: string;
};

export type UniversalCaptureRouteOption = {
  id: string;
  label: string;
};

export type UniversalCaptureExerciseValues = {
  name: string;
  weight?: string;
  sets?: string;
  reps?: string;
};

export type UniversalCaptureEntryView = {
  index: number;
  active: boolean;
  domain: UniversalCaptureDomain;
  domainLabel: string;
  existing: boolean;
  recordable: boolean;
  title: string;
  summary?: string;
  routeLabel?: string;
  routeUncertain?: boolean;
  actionOptions: UniversalCaptureOption[];
  selectedActions: string[];
  customActionValue: string;
  durationValue?: number | null;
  qualityValue?: number;
  showDuration: boolean;
  showQuality: boolean;
  exercises: UniversalCaptureExerciseValues[];
  goalOptions: UniversalCaptureRouteOption[];
  moduleOptions: UniversalCaptureRouteOption[];
  selectedGoalId?: string | null;
  selectedModuleId?: string | null;
  createNewGoal: boolean;
  createNewModule: boolean;
  newGoalName: string;
  newModuleName: string;
  nonRecordableHint?: string;
};

export type UniversalCaptureLabels = {
  add: string;
  advanced: string;
  cancel: string;
  changeRoute: string;
  confirm: string;
  confirmAs: string;
  createGoal: string;
  createModule: string;
  customAction: string;
  duration: string;
  durationPlaceholder: string;
  decreaseDuration: string;
  existing: string;
  goal: string;
  interpreted: string;
  increaseDuration: string;
  less: string;
  minutesUnit: string;
  module: string;
  more: string;
  newEntry: string;
  noGoal: string;
  noModule: string;
  quality: string;
  reps: string;
  route: string;
  saving: string;
  stateAction: string;
  stateHint: string;
  sets: string;
  weight: string;
  weightUnit: string;
};

type Props = {
  confirming: boolean;
  confirmDisabled: boolean;
  entries: UniversalCaptureEntryView[];
  labels: UniversalCaptureLabels;
  onAddCustomAction: (entryIndex: number) => void;
  onCancel: () => void;
  onConfirm: () => void;
  onCreateGoal: (entryIndex: number) => void;
  onCreateModule: (entryIndex: number) => void;
  onCustomActionChange: (entryIndex: number, value: string) => void;
  onDurationChange: (entryIndex: number, value: number | null) => void;
  onExerciseValueChange: (
    entryIndex: number,
    exerciseName: string,
    field: 'weight' | 'sets' | 'reps',
    value: string,
  ) => void;
  onNewGoalNameChange: (entryIndex: number, value: string) => void;
  onNewModuleNameChange: (entryIndex: number, value: string) => void;
  onOpenState?: () => void;
  onQualityChange: (entryIndex: number, value: number) => void;
  onSelectGoal: (entryIndex: number, value: string | null) => void;
  onSelectModule: (entryIndex: number, value: string | null) => void;
  onToggleAction: (entryIndex: number, value: string) => void;
  onToggleEntry: (entryIndex: number) => void;
  theme: V11ThemeTokens;
};

function durationFromInput(value: string): number | null {
  const digits = value.replace(/[^0-9]/g, '');
  if (!digits) return null;
  const minutes = Number(digits);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : null;
}

function DurationControl({
  entry,
  labels,
  onDurationChange,
  theme,
}: {
  entry: UniversalCaptureEntryView;
  labels: UniversalCaptureLabels;
  onDurationChange: Props['onDurationChange'];
  theme: V11ThemeTokens;
}) {
  const currentMinutes = typeof entry.durationValue === 'number' && entry.durationValue > 0
    ? Math.round(entry.durationValue)
    : null;

  return (
    <WebView
      dataSet={{ 'universal-capture-role': 'duration-control' }}
      style={{ alignItems: 'center', flexDirection: 'row', gap: v11Spacing.xs, minWidth: 0 }}
    >
      <V11SheetButton
        accessibilityLabel={labels.decreaseDuration}
        disabled={currentMinutes == null}
        label="−"
        onPress={() => onDurationChange(entry.index, currentMinutes && currentMinutes > 1 ? currentMinutes - 1 : null)}
        style={{ flexGrow: 0, minWidth: v11Spacing.readingGap, width: v11Spacing.readingGap }}
        theme={theme}
        tone="neutral"
        variant="secondary"
      />
      <WebView dataSet={{ 'universal-capture-role': 'numeric-control' }} style={{ flex: 1, minWidth: 0 }}>
        <V11TextField
          accessibilityLabel={labels.durationPlaceholder}
          inputMode="numeric"
          keyboardType="number-pad"
          onChangeText={(value) => onDurationChange(entry.index, durationFromInput(value))}
          placeholder={labels.durationPlaceholder}
          theme={theme}
          tone="neutral"
          value={currentMinutes == null ? '' : String(currentMinutes)}
        />
        <Text style={{ color: theme.text.secondary, ...v11Typography.metadata }}>{labels.minutesUnit}</Text>
      </WebView>
      <V11SheetButton
        accessibilityLabel={labels.increaseDuration}
        label="+"
        onPress={() => onDurationChange(entry.index, (currentMinutes ?? 0) + 1)}
        style={{ flexGrow: 0, minWidth: v11Spacing.readingGap, width: v11Spacing.readingGap }}
        theme={theme}
        tone="neutral"
        variant="secondary"
      />
    </WebView>
  );
}

function EntryActions({
  entry,
  labels,
  onAddCustomAction,
  onCustomActionChange,
  onToggleAction,
  theme,
}: {
  entry: UniversalCaptureEntryView;
  labels: UniversalCaptureLabels;
  onAddCustomAction: Props['onAddCustomAction'];
  onCustomActionChange: Props['onCustomActionChange'];
  onToggleAction: Props['onToggleAction'];
  theme: V11ThemeTokens;
}) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const primaryOptions = entry.actionOptions.slice(0, 5);
  const hiddenOptions = entry.actionOptions.slice(5);

  if (entry.actionOptions.length === 0 && entry.domain !== 'generic') return null;

  return (
    <WebView dataSet={{ 'universal-capture-role': 'action-selector' }}>
      <WebView dataSet={{ 'universal-capture-role': 'compact-choice-row' }}>
        {primaryOptions.map((option) => (
          <V11CategoricalChip
            key={option.id}
            density="compact"
            label={option.label}
            onPress={() => onToggleAction(entry.index, option.value)}
            selected={entry.selectedActions.includes(option.value)}
            theme={theme}
            tone="neutral"
          />
        ))}
        {(hiddenOptions.length > 0 || entry.domain === 'generic' || entry.domain === 'learning' || entry.domain === 'work' || entry.domain === 'exercise') ? (
          <V11CategoricalChip
            density="compact"
            label={galleryOpen ? labels.less : labels.more}
            onPress={() => setGalleryOpen((value) => !value)}
            selected={galleryOpen}
            theme={theme}
            tone="neutral"
          />
        ) : null}
      </WebView>
      {galleryOpen ? (
        <WebView dataSet={{ 'universal-capture-role': 'action-gallery' }}>
          {hiddenOptions.length > 0 ? (
            <WebView dataSet={{ 'universal-capture-role': 'compact-choice-row' }}>
              {hiddenOptions.map((option) => (
                <V11CategoricalChip
                  key={option.id}
                  density="compact"
                  label={option.label}
                  onPress={() => onToggleAction(entry.index, option.value)}
                  selected={entry.selectedActions.includes(option.value)}
                  theme={theme}
                  tone="neutral"
                />
              ))}
            </WebView>
          ) : null}
          <WebView dataSet={{ 'universal-capture-role': 'inline-add' }}>
            <V11TextField
              accessibilityLabel={labels.customAction}
              onChangeText={(value) => onCustomActionChange(entry.index, value)}
              onSubmitEditing={() => onAddCustomAction(entry.index)}
              placeholder={labels.customAction}
              theme={theme}
              tone="neutral"
              value={entry.customActionValue}
            />
            <V11SheetButton
              disabled={!entry.customActionValue.trim()}
              label={labels.add}
              onPress={() => onAddCustomAction(entry.index)}
              theme={theme}
              tone="neutral"
              variant="secondary"
            />
          </WebView>
        </WebView>
      ) : null}
    </WebView>
  );
}

function RouteEditor({
  entry,
  labels,
  onCreateGoal,
  onCreateModule,
  onNewGoalNameChange,
  onNewModuleNameChange,
  onSelectGoal,
  onSelectModule,
  theme,
}: {
  entry: UniversalCaptureEntryView;
  labels: UniversalCaptureLabels;
  onCreateGoal: Props['onCreateGoal'];
  onCreateModule: Props['onCreateModule'];
  onNewGoalNameChange: Props['onNewGoalNameChange'];
  onNewModuleNameChange: Props['onNewModuleNameChange'];
  onSelectGoal: Props['onSelectGoal'];
  onSelectModule: Props['onSelectModule'];
  theme: V11ThemeTokens;
}) {
  return (
    <WebView dataSet={{ 'universal-capture-role': 'route-editor' }}>
      <Text style={{ color: theme.text.secondary, ...v11Typography.metadata }}>{labels.goal}</Text>
      <WebView dataSet={{ 'universal-capture-role': 'compact-choice-row' }}>
        {entry.goalOptions.map((option) => (
          <V11CategoricalChip
            key={option.id}
            density="compact"
            label={option.label}
            onPress={() => onSelectGoal(entry.index, option.id)}
            selected={!entry.createNewGoal && entry.selectedGoalId === option.id}
            theme={theme}
            tone="neutral"
          />
        ))}
        <V11CategoricalChip
          density="compact"
          label={labels.noGoal}
          onPress={() => onSelectGoal(entry.index, null)}
          selected={!entry.createNewGoal && entry.selectedGoalId === null}
          theme={theme}
          tone="neutral"
        />
        <V11CategoricalChip
          density="compact"
          label={labels.createGoal}
          onPress={() => onCreateGoal(entry.index)}
          selected={entry.createNewGoal}
          theme={theme}
          tone="neutral"
        />
      </WebView>
      {entry.createNewGoal ? (
        <V11TextField
          accessibilityLabel={labels.createGoal}
          onChangeText={(value) => onNewGoalNameChange(entry.index, value)}
          theme={theme}
          tone="neutral"
          value={entry.newGoalName}
        />
      ) : null}
      {entry.selectedGoalId !== null || entry.createNewGoal ? (
        <>
          <Text style={{ color: theme.text.secondary, ...v11Typography.metadata }}>{labels.module}</Text>
          <WebView dataSet={{ 'universal-capture-role': 'compact-choice-row' }}>
            {entry.moduleOptions.map((option) => (
              <V11CategoricalChip
                key={option.id}
                density="compact"
                label={option.label}
                onPress={() => onSelectModule(entry.index, option.id)}
                selected={!entry.createNewModule && entry.selectedModuleId === option.id}
                theme={theme}
                tone="neutral"
              />
            ))}
            <V11CategoricalChip
              density="compact"
              label={labels.noModule}
              onPress={() => onSelectModule(entry.index, null)}
              selected={!entry.createNewModule && entry.selectedModuleId === null}
              theme={theme}
              tone="neutral"
            />
            <V11CategoricalChip
              density="compact"
              label={labels.createModule}
              onPress={() => onCreateModule(entry.index)}
              selected={entry.createNewModule}
              theme={theme}
              tone="neutral"
            />
          </WebView>
          {entry.createNewModule ? (
            <V11TextField
              accessibilityLabel={labels.createModule}
              onChangeText={(value) => onNewModuleNameChange(entry.index, value)}
              theme={theme}
              tone="neutral"
              value={entry.newModuleName}
            />
          ) : null}
        </>
      ) : null}
    </WebView>
  );
}

function UniversalEntry({
  entry,
  labels,
  onAddCustomAction,
  onCreateGoal,
  onCreateModule,
  onCustomActionChange,
  onDurationChange,
  onExerciseValueChange,
  onNewGoalNameChange,
  onNewModuleNameChange,
  onOpenState,
  onQualityChange,
  onSelectGoal,
  onSelectModule,
  onToggleAction,
  onToggleEntry,
  theme,
}: Omit<Props, 'confirmDisabled' | 'confirming' | 'entries' | 'onCancel' | 'onConfirm'> & {
  entry: UniversalCaptureEntryView;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const valueLabels = useMemo(() => ({
    1: '1',
    2: '2',
    3: '3',
    4: '4',
    5: '5',
  }), []);

  return (
    <WebView dataSet={{ 'universal-capture-domain': entry.domain, 'universal-capture-role': 'entry' }}>
      <WebView dataSet={{ 'universal-capture-role': 'entry-heading' }}>
        {entry.recordable ? (
          <V11CheckboxControl
            accessibilityLabel={entry.title}
            checked={entry.active}
            onPress={() => onToggleEntry(entry.index)}
            theme={theme}
            tone="neutral"
          />
        ) : (
          <V11RebaselineIcon name="activity" size={18} color={theme.text.secondary} />
        )}
        <WebView dataSet={{ 'universal-capture-role': 'entry-copy' }}>
          <Text style={{ color: theme.text.primary, ...v11Typography.body }}>{entry.title}</Text>
          <Text style={{ color: theme.text.secondary, ...v11Typography.metadata }}>
            {entry.domainLabel} · {entry.existing ? labels.existing : labels.newEntry}
            {entry.summary ? ` · ${entry.summary}` : ''}
          </Text>
        </WebView>
      </WebView>

      {entry.recordable ? (
        <>
          <EntryActions
            entry={entry}
            labels={labels}
            onAddCustomAction={onAddCustomAction}
            onCustomActionChange={onCustomActionChange}
            onToggleAction={onToggleAction}
            theme={theme}
          />

          {entry.exercises.map((exercise) => (
            <WebView dataSet={{ 'universal-capture-role': 'numeric-row' }} key={exercise.name}>
              <WebView dataSet={{ 'universal-capture-role': 'numeric-heading' }}>
                <Text numberOfLines={1} style={{ color: theme.text.primary, ...v11Typography.label }}>{exercise.name}</Text>
              </WebView>
              <WebView dataSet={{ 'universal-capture-role': 'numeric-field' }}>
                <Text style={{ color: theme.text.secondary, ...v11Typography.metadata }}>{labels.weight}</Text>
                <WebView dataSet={{ 'universal-capture-role': 'numeric-control' }}>
                  <V11TextField
                    keyboardType="numeric"
                    onChangeText={(value) => onExerciseValueChange(entry.index, exercise.name, 'weight', value)}
                    placeholder="0"
                    theme={theme}
                    tone="neutral"
                    value={exercise.weight ?? ''}
                  />
                  <Text style={{ color: theme.text.secondary, ...v11Typography.metadata }}>{labels.weightUnit}</Text>
                </WebView>
              </WebView>
              <WebView dataSet={{ 'universal-capture-role': 'numeric-field' }}>
                <Text style={{ color: theme.text.secondary, ...v11Typography.metadata }}>{labels.sets}</Text>
                <V11TextField
                  keyboardType="numeric"
                  onChangeText={(value) => onExerciseValueChange(entry.index, exercise.name, 'sets', value)}
                  placeholder="0"
                  theme={theme}
                  tone="neutral"
                  value={exercise.sets ?? ''}
                />
              </WebView>
              <WebView dataSet={{ 'universal-capture-role': 'numeric-field' }}>
                <Text style={{ color: theme.text.secondary, ...v11Typography.metadata }}>{labels.reps}</Text>
                <V11TextField
                  keyboardType="numeric"
                  onChangeText={(value) => onExerciseValueChange(entry.index, exercise.name, 'reps', value)}
                  placeholder="0"
                  theme={theme}
                  tone="neutral"
                  value={exercise.reps ?? ''}
                />
              </WebView>
            </WebView>
          ))}

          {(entry.showDuration || entry.showQuality) ? (
            <WebView dataSet={{ 'universal-capture-role': 'correction-grid' }}>
              {entry.showDuration ? (
                <WebView dataSet={{ 'universal-capture-role': 'correction-field' }}>
                  <Text style={{ color: theme.text.secondary, ...v11Typography.metadata }}>{labels.duration}</Text>
                  <DurationControl
                    entry={entry}
                    labels={labels}
                    onDurationChange={onDurationChange}
                    theme={theme}
                  />
                </WebView>
              ) : null}
              {entry.showQuality ? (
                <WebView dataSet={{ 'universal-capture-role': 'correction-field' }}>
                  <Text style={{ color: theme.text.secondary, ...v11Typography.metadata }}>{labels.quality}</Text>
                  <V11CompactValueSelector<number>
                    columns={5}
                    onChange={(value) => onQualityChange(entry.index, value)}
                    options={[1, 2, 3, 4, 5].map((value) => ({ value, label: valueLabels[value as keyof typeof valueLabels] }))}
                    theme={theme}
                    value={entry.qualityValue}
                  />
                </WebView>
              ) : null}
            </WebView>
          ) : null}

          {entry.routeLabel ? (
            <WebView dataSet={{ 'universal-capture-role': 'route-summary', 'universal-capture-uncertain': entry.routeUncertain ? 'true' : 'false' }}>
              <V11RebaselineIcon name="target" size={15} color={theme.text.secondary} />
              <Text style={{ color: theme.text.secondary, ...v11Typography.metadata }}>{entry.routeLabel}</Text>
              <V11SheetButton
                label={advancedOpen ? labels.less : labels.advanced}
                onPress={() => setAdvancedOpen((value) => !value)}
                theme={theme}
                tone="neutral"
                variant="secondary"
              />
            </WebView>
          ) : null}
          {advancedOpen ? (
            <RouteEditor
              entry={entry}
              labels={labels}
              onCreateGoal={onCreateGoal}
              onCreateModule={onCreateModule}
              onNewGoalNameChange={onNewGoalNameChange}
              onNewModuleNameChange={onNewModuleNameChange}
              onSelectGoal={onSelectGoal}
              onSelectModule={onSelectModule}
              theme={theme}
            />
          ) : null}
        </>
      ) : (
        <WebView dataSet={{ 'universal-capture-role': 'state-handoff' }}>
          <Text style={{ color: theme.text.secondary, ...v11Typography.body }}>
            {entry.nonRecordableHint ?? labels.stateHint}
          </Text>
          {entry.domain === 'state' && onOpenState ? (
            <V11SheetButton
              label={labels.stateAction}
              onPress={onOpenState}
              theme={theme}
              tone="neutral"
              variant="primary"
            />
          ) : null}
        </WebView>
      )}
    </WebView>
  );
}

export default function UniversalCaptureComposer({
  confirming,
  confirmDisabled,
  entries,
  labels,
  onCancel,
  onConfirm,
  theme,
  ...entryCallbacks
}: Props) {
  return (
    <WebView dataSet={{ 'universal-capture-role': 'confirmation' }}>
      <WebView dataSet={{ 'universal-capture-role': 'confirmation-heading' }}>
        <Text style={{ color: theme.text.secondary, ...v11Typography.metadata }}>{labels.interpreted}</Text>
        <Text style={{ color: theme.text.primary, ...v11Typography.title }}>{labels.confirmAs}</Text>
      </WebView>
      {entries.map((entry) => (
        <UniversalEntry
          key={`${entry.index}:${entry.title}`}
          entry={entry}
          labels={labels}
          theme={theme}
          {...entryCallbacks}
        />
      ))}
      <WebView dataSet={{ 'v11-rebaseline-role': 'capture-pending-actions' }}>
        {entries.some((entry) => entry.recordable) ? (
          <V11SheetButton
            disabled={confirmDisabled || confirming}
            label={confirming ? labels.saving : labels.confirm}
            loading={confirming}
            onPress={onConfirm}
            theme={theme}
            tone="neutral"
            variant="primary"
          />
        ) : null}
        <V11SheetButton
          label={labels.cancel}
          onPress={onCancel}
          theme={theme}
          tone="neutral"
          variant="secondary"
        />
      </WebView>
    </WebView>
  );
}
