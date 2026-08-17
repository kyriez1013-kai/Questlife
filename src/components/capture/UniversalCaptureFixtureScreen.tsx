import React, { useMemo, useState } from 'react';
import { Platform, SafeAreaView, View } from 'react-native';
import { getLanguage, t } from '../../i18n';
import { getV11ThemeTokens } from '../../v11/tokens';
import V11Stage2ProductionSheet from '../../v11-stage2-rebaseline/V11Stage2ProductionSheet';
import UniversalCaptureComposer, {
  UniversalCaptureEntryView,
  UniversalCaptureLabels,
} from './UniversalCaptureComposer';

type FixtureId = 'learning' | 'work' | 'exercise' | 'state';

function queryValue(name: string): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(name);
}

function fixtureId(): FixtureId {
  const value = queryValue('fixture');
  return value === 'work' || value === 'exercise' || value === 'state' ? value : 'learning';
}

function fixtureEntry(id: FixtureId, lang: 'zh' | 'en'): UniversalCaptureEntryView {
  const common = {
    index: 0,
    active: id !== 'state',
    existing: id !== 'work' && id !== 'state',
    recordable: id !== 'state',
    routeUncertain: id === 'work',
    customActionValue: '',
    goalOptions: [{ id: 'goal-1', label: lang === 'zh' ? '专业成长' : 'Professional growth' }],
    moduleOptions: [{ id: 'module-1', label: lang === 'zh' ? '当前重点' : 'Current focus' }],
    selectedGoalId: id === 'work' ? undefined : 'goal-1',
    selectedModuleId: id === 'work' ? undefined : 'module-1',
    createNewGoal: false,
    createNewModule: false,
    newGoalName: '',
    newModuleName: '',
  };

  if (id === 'exercise') {
    return {
      ...common,
      domain: 'exercise',
      domainLabel: t(lang, 'universalCaptureDomain_exercise'),
      title: lang === 'zh' ? '卧推' : 'Bench press',
      summary: lang === 'zh' ? '80kg × 4组 × 8次' : '80kg × 4 sets × 8 reps',
      routeLabel: `${t(lang, 'recordToPath')}: ${lang === 'zh' ? '健身 → 推力' : 'Fitness → Push'}`,
      actionOptions: [
        { id: 'bench', label: lang === 'zh' ? '卧推' : 'Bench press', value: lang === 'zh' ? '卧推' : 'Bench press' },
        { id: 'incline', label: lang === 'zh' ? '上斜卧推' : 'Incline bench press', value: lang === 'zh' ? '上斜卧推' : 'Incline bench press' },
        { id: 'fly', label: lang === 'zh' ? '飞鸟' : 'Chest fly', value: lang === 'zh' ? '飞鸟' : 'Chest fly' },
      ],
      selectedActions: [lang === 'zh' ? '卧推' : 'Bench press'],
      showDuration: false,
      showQuality: true,
      qualityValue: 4,
      exercises: [{ name: lang === 'zh' ? '卧推' : 'Bench press', weight: '80', sets: '4', reps: '8' }],
    };
  }

  if (id === 'state') {
    return {
      ...common,
      domain: 'state',
      domainLabel: t(lang, 'universalCaptureDomain_state'),
      title: lang === 'zh' ? '今天脑子很慢，没什么精神' : 'My mind feels slow and low-energy today',
      summary: undefined,
      actionOptions: [],
      selectedActions: [],
      showDuration: false,
      showQuality: false,
      exercises: [],
      nonRecordableHint: t(lang, 'universalCaptureStateHandoff'),
    };
  }

  const work = id === 'work';
  return {
    ...common,
    domain: work ? 'work' : 'learning',
    domainLabel: t(lang, work ? 'universalCaptureDomain_work' : 'universalCaptureDomain_learning'),
    title: work ? 'Data pipeline' : 'SQL',
    summary: work
      ? (lang === 'zh' ? '120分钟 · 卡在 proxy' : '120 min · blocked on proxy')
      : (lang === 'zh' ? '40分钟 · 有点累' : '40 min · a little tired'),
    routeLabel: `${t(lang, 'recordToPath')}: ${work ? t(lang, 'scEntryUnassigned') : (lang === 'zh' ? '学习 → 数据' : 'Learning → Data')}`,
    actionOptions: [
      { id: 'practice', label: lang === 'zh' ? '练习 / 刷题' : 'Practice', value: lang === 'zh' ? '练习 / 刷题' : 'Practice' },
      { id: 'project', label: lang === 'zh' ? '项目实战' : 'Project work', value: lang === 'zh' ? '项目实战' : 'Project work' },
      { id: 'debug', label: lang === 'zh' ? '调试' : 'Debug', value: lang === 'zh' ? '调试' : 'Debug' },
      { id: 'notes', label: lang === 'zh' ? '做笔记' : 'Take notes', value: lang === 'zh' ? '做笔记' : 'Take notes' },
    ],
    selectedActions: [work ? (lang === 'zh' ? '调试' : 'Debug') : (lang === 'zh' ? '练习 / 刷题' : 'Practice')],
    durationValue: work ? 120 : 40,
    showDuration: true,
    showQuality: true,
    qualityValue: work ? undefined : 3,
    exercises: [],
  };
}

export default function UniversalCaptureFixtureScreen() {
  const lang = getLanguage(queryValue('debugLanguage') ?? 'zh');
  const mode = queryValue('debugTheme') === 'light' ? 'light' : 'dark';
  const theme = getV11ThemeTokens(mode);
  const [entry, setEntry] = useState(() => fixtureEntry(fixtureId(), lang));
  const [confirmed, setConfirmed] = useState(false);
  const labels = useMemo<UniversalCaptureLabels>(() => ({
    add: t(lang, 'addCustomAction'),
    advanced: t(lang, 'universalCaptureMoreFields'),
    cancel: t(lang, 'scEntryIgnore'),
    changeRoute: t(lang, 'change'),
    confirm: t(lang, 'scEntryConfirm'),
    confirmAs: t(lang, 'universalCaptureConfirmAs'),
    createGoal: t(lang, 'createNewGoal'),
    createModule: t(lang, 'createModule'),
    customAction: t(lang, 'universalCaptureCustomAction'),
    decreaseDuration: t(lang, 'universalCaptureDecreaseDuration'),
    duration: t(lang, 'universalCaptureDuration'),
    durationPlaceholder: t(lang, 'universalCaptureDurationPlaceholder'),
    existing: t(lang, 'scEntryExisting'),
    goal: t(lang, 'goal'),
    interpreted: t(lang, 'universalCaptureInterpreted'),
    increaseDuration: t(lang, 'universalCaptureIncreaseDuration'),
    less: t(lang, 'universalCaptureLess'),
    module: t(lang, 'module'),
    more: t(lang, 'universalCaptureMore'),
    newEntry: t(lang, 'scEntryNew'),
    noGoal: t(lang, 'noGoal'),
    noModule: t(lang, 'noModule'),
    quality: t(lang, 'quality'),
    reps: t(lang, 'reps'),
    route: t(lang, 'routing'),
    saving: t(lang, 'savingRecord'),
    stateAction: t(lang, 'universalCaptureOpenState'),
    stateHint: t(lang, 'universalCaptureStateHandoff'),
    sets: t(lang, 'sets'),
    weight: t(lang, 'captureWeight'),
    weightUnit: t(lang, 'captureWeightUnit'),
  }), [lang]);

  const update = (patch: Partial<UniversalCaptureEntryView>) => setEntry((current) => ({ ...current, ...patch }));

  const addCustomAction = () => {
    const value = entry.customActionValue.trim();
    if (!value) return;

    const existing = entry.actionOptions.find((option) => option.value.trim().toLocaleLowerCase() === value.toLocaleLowerCase());
    const selectedValue = existing?.value ?? value;
    update({
      actionOptions: existing
        ? entry.actionOptions
        : [...entry.actionOptions, { id: `custom:${value.toLocaleLowerCase()}`, label: value, value }],
      customActionValue: '',
      selectedActions: entry.selectedActions.includes(selectedValue)
        ? entry.selectedActions
        : [...entry.selectedActions, selectedValue],
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.field.background }}>
      <View style={{ flex: 1 }}>
        <V11Stage2ProductionSheet
          closeLabel={t(lang, 'cancel')}
          onClose={() => undefined}
          reducedMotion={false}
          sheet="capture"
          theme={theme}
          title={t(lang, 'v11Capture')}
          visible
        >
          {confirmed ? null : (
            <UniversalCaptureComposer
              confirming={false}
              confirmDisabled={!entry.active && entry.recordable}
              entries={[entry]}
              labels={labels}
              onAddCustomAction={addCustomAction}
              onCancel={() => undefined}
              onConfirm={() => setConfirmed(true)}
              onCreateGoal={() => update({ createNewGoal: true })}
              onCreateModule={() => update({ createNewModule: true })}
              onCustomActionChange={(_, value) => update({ customActionValue: value })}
              onDurationChange={(_, value) => update({ durationValue: value })}
              onExerciseValueChange={(_, exerciseName, field, value) => update({
                exercises: entry.exercises.map((exercise) => exercise.name === exerciseName ? { ...exercise, [field]: value } : exercise),
              })}
              onNewGoalNameChange={(_, value) => update({ newGoalName: value })}
              onNewModuleNameChange={(_, value) => update({ newModuleName: value })}
              onOpenState={() => undefined}
              onQualityChange={(_, value) => update({ qualityValue: value })}
              onSelectGoal={(_, value) => update({ selectedGoalId: value, createNewGoal: false })}
              onSelectModule={(_, value) => update({ selectedModuleId: value, createNewModule: false })}
              onToggleAction={(_, value) => update({ selectedActions: entry.selectedActions.includes(value) ? [] : [value] })}
              onToggleEntry={() => update({ active: !entry.active })}
              theme={theme}
            />
          )}
        </V11Stage2ProductionSheet>
      </View>
    </SafeAreaView>
  );
}
