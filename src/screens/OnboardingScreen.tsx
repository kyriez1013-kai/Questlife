import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { useQuestTheme } from '../design/useQuestTheme';
import QuestButton from '../components/ui/QuestButton';
import QuestIcon, { QuestIconName } from '../components/ui/QuestIcon';
import QuestPill from '../components/ui/QuestPill';
import {
  getDomainTemplateByDomain,
} from '../domainTemplates';
import { DomainTemplate, DomainTemplateDomain, GoalType } from '../types';
import { getLanguage, t } from '../i18n';
import { trackEvent } from '../utils/analytics';
import { today } from '../storage';
import {
  buildFirstSuggestion, remainingAnswers, sleepToValue, stateToOverall, SLEEP_SELF_RATING_UNIT,
  type FirstStartAnswers, type FirstStartPartial, type FocusAnswer, type SleepAnswer, type StateAnswer,
} from '../onboarding/firstStart';
import { saveFirstStart } from '../onboarding/useFirstStart';
import { getV11ProductLanguage, getV11ProductThemeId, isV11ProductEnabled } from '../v11/featureFlag';
import RecordBackupActions from '../backup/RecordBackupActions';
import { backupCopy } from '../backup/copy';
import AccountSyncSection from '../sync-v2/AccountSyncSection';
import { syncCopy } from '../sync-v2/copy';
import NativeSettingsSheet from '../native/NativeSettingsSheet';
import { getV11ThemeTokens } from '../v11/tokens';
import V11GlowOrb from '../v11/components/V11GlowOrb';
import '../v11-stage2-rebaseline/v11-stage2-rebaseline.styles';
import { isDarkTheme } from '../design/surfaces';

// welcome → quick → suggest is the "怎么开始" path (no goal needed). mode → goal → preview is the optional goal-first path.
// 'language' and 'positioning' are no longer reachable from the first screen (kept so the old path can be restored).
type Step = 'language' | 'welcome' | 'quick' | 'suggest' | 'positioning' | 'mode' | 'goal' | 'preview';

type StartMode = {
  domain: DomainTemplateDomain;
  goalType: GoalType;
  icon: QuestIconName;
  labelKey: string;
  placeholderZh: string;
  placeholderEn: string;
};

const ONBOARDING_VERSION = 1;

const START_MODES: StartMode[] = [
  { domain: 'fitness_strength', goalType: 'fitness', icon: 'dumbbell', labelKey: 'strengthFitness', placeholderZh: '卧推到100kg', placeholderEn: 'Bench press 100kg' },
  { domain: 'study_course', goalType: 'study', icon: 'book', labelKey: 'learnSkill', placeholderZh: '学完 SQL', placeholderEn: 'Learn SQL' },
  { domain: 'exam_prep', goalType: 'exam', icon: 'brain', labelKey: 'prepareExam', placeholderZh: '准备 Finance 期末考试', placeholderEn: 'Prepare for Finance final exam' },
  { domain: 'writing_assignment', goalType: 'study', icon: 'book', labelKey: 'assignmentWriting', placeholderZh: '完成 essay', placeholderEn: 'Finish my essay' },
  { domain: 'coding_project', goalType: 'project', icon: 'code', labelKey: 'buildProject', placeholderZh: '做一个任务管理 App', placeholderEn: 'Build a task management app' },
  { domain: 'life_maintenance', goalType: 'custom', icon: 'home', labelKey: 'manageLifeAdmin', placeholderZh: '保持房间整洁', placeholderEn: 'Keep my room organised' },
  { domain: 'recovery_health', goalType: 'health', icon: 'heartPulse', labelKey: 'recoveryEnergy', placeholderZh: '恢复精力和睡眠', placeholderEn: 'Improve energy and sleep' },
  { domain: 'custom', goalType: 'custom', icon: 'target', labelKey: 'createManually', placeholderZh: '建立我的第一个目标', placeholderEn: 'Create my first goal' },
];

const frequencyOptions = [1, 2, 3, 4, 5];
const sessionOptions = [10, 20, 30, 45, 60];

function detectInitialLanguage(): 'zh' | 'en' {
  if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('zh')) return 'zh';
  return 'en';
}

function domainLoggingFields(template?: DomainTemplate, lang: 'zh' | 'en' = 'zh') {
  if (!template) return [];
  return template.recordingSchema
    .filter((field) => field.key !== 'note')
    .slice(0, 5)
    .map((field) => (lang === 'en' ? field.label : field.labelZh));
}

export default function OnboardingScreen() {
  const {
    data,
    addCategory,
    updateSkill,
    applyDomainTemplateToGoal,
    setSettings,
    createStateCheckIn,
    addContextLog,
    waitForLocalWrites,
    retryLocalWrites,
  } = useStore();
  const questTheme = useQuestTheme(getV11ProductThemeId(data.settings.selectedThemeId));
  const v11ProductEnabled = isV11ProductEnabled();
  const accent = questTheme.colors.primary;
  const lang = getV11ProductLanguage(getLanguage(data.settings.language ?? data.settings.preferredLanguage ?? detectInitialLanguage()));
  const hasExistingCoreData = data.categories.length > 0 || data.skills.length > 0 || (data.executionLogs || []).length > 0;
  const [step, setStep] = useState<Step>('welcome');
  const [answers, setAnswers] = useState<FirstStartPartial>({});
  const [startSaving, setStartSaving] = useState(false);
  const [startFailed, setStartFailed] = useState(false);
  // created once; a retry only re-attempts the durable write, never creates a second check-in
  const startCreated = useRef(false);
  const [selectedMode, setSelectedMode] = useState<StartMode>(START_MODES[0]);
  const [goalName, setGoalName] = useState('');
  const [currentLevel, setCurrentLevel] = useState('');
  const [target, setTarget] = useState('');
  const [weeklyFrequency, setWeeklyFrequency] = useState(3);
  const [sessionLength, setSessionLength] = useState(30);
  const [error, setError] = useState('');
  const [showRecovery, setShowRecovery] = useState(false);
  const [showAccount, setShowAccount] = useState(false);

  const selectedTemplate = useMemo(() => (
    selectedMode.domain === 'custom' ? undefined : getDomainTemplateByDomain(selectedMode.domain)
  ), [selectedMode.domain]);
  const placeholder = lang === 'en' ? selectedMode.placeholderEn : selectedMode.placeholderZh;
  const canExit = step !== 'welcome' || hasExistingCoreData || !!data.settings.onboardingRestartRequested;

  useEffect(() => {
    trackEvent('onboarding_started', { detectedLanguage: detectInitialLanguage() }, { page: 'onboarding' });
  }, []);

  const goBack = () => {
    if (step === 'quick') setStep('welcome');
    if (step === 'suggest') setStep('quick');
    if (step === 'positioning') setStep('welcome');
    if (step === 'mode') setStep('welcome');
    if (step === 'goal') setStep('mode');
    if (step === 'preview') setStep('goal');
  };

  const completeOnboarding = () => {
    setSettings({
      onboardingCompleted: true,
      onboardingVersion: ONBOARDING_VERSION,
      onboardingRestartRequested: false,
    });
  };

  const exitOnboarding = () => {
    setSettings({
      onboardingCompleted: true,
      onboardingVersion: ONBOARDING_VERSION,
      onboardingRestartRequested: false,
    });
  };

  const selectLanguage = (language: 'zh' | 'en') => {
    setSettings({ language, preferredLanguage: language });
    trackEvent('onboarding_language_selected', { language }, { page: 'onboarding' });
    setStep('positioning');
  };

  const switchLanguage = () => {
    const next = lang === 'zh' ? 'en' : 'zh';
    setSettings({ language: next, preferredLanguage: next });
    trackEvent('onboarding_language_selected', { language: next }, { page: 'onboarding' });
  };

  const answerQuick = <K extends keyof FirstStartAnswers>(key: K, value: FirstStartAnswers[K]) => setAnswers((prev) => ({ ...prev, [key]: value }));
  const quickComplete = remainingAnswers(answers) === 0;
  const suggestion = quickComplete ? buildFirstSuggestion(answers as FirstStartAnswers, lang) : null;

  /** Save the answers as a real check-in + sleep self-rating. Success is shown only after the persistence ACK. */
  const finishQuickStart = async () => {
    if (!quickComplete || startSaving) return;
    setStartSaving(true);
    setStartFailed(false);
    try {
      const a = answers as FirstStartAnswers;
      if (!startCreated.current) {
        const now = new Date();
        const overall = stateToOverall(a.state);
        const hour = now.getHours();
        createStateCheckIn({
          date: today(), timestamp: now.toISOString(), overall, energy: overall,
          timeBlock: hour < 11 ? 'morning' : hour < 14 ? 'midday' : hour < 18 ? 'afternoon' : hour < 22 ? 'evening' : 'night',
          label: overall === 2 ? 'low' : overall === 3 ? 'normal' : 'good',
        });
        addContextLog({ date: today(), type: 'sleep', label: lang === 'en' ? 'Sleep (self-rated)' : '睡眠自评', value: sleepToValue(a.sleep), unit: SLEEP_SELF_RATING_UNIT, source: 'manual' });
        startCreated.current = true;
      } else {
        await retryLocalWrites();
      }
      await waitForLocalWrites();
      // lets Today repeat this exact suggestion (same title / body / basis) for the rest of the day
      try { await saveFirstStart({ version: 1, date: today(), answers: a }); } catch { /* advisory only */ }
      trackEvent('onboarding_quick_start_completed', { sleep: a.sleep, state: a.state, focus: a.focus }, { page: 'onboarding' });
      setSettings({ onboardingCompleted: true, onboardingVersion: 2, onboardingRestartRequested: false });
    } catch {
      setStartFailed(true);
    } finally {
      setStartSaving(false);
    }
  };

  const selectMode = (mode: StartMode) => {
    setSelectedMode(mode);
    setGoalName(mode.domain === selectedMode.domain ? goalName : '');
    trackEvent('onboarding_domain_selected', { domain: mode.domain }, { page: 'onboarding' });
    setStep('goal');
  };

  const previewTemplate = () => {
    Keyboard.dismiss();
    if (!goalName.trim()) {
      setError(t(lang, 'firstGoalQuestion'));
      return;
    }
    setError('');
    trackEvent('onboarding_template_previewed', {
      domain: selectedMode.domain,
      moduleCount: selectedTemplate?.defaultModules.length ?? 0,
      skillCount: selectedTemplate?.defaultSkills.length ?? 0,
    }, { page: 'onboarding' });
    setStep('preview');
  };

  const createGoal = (useTemplate: boolean) => {
    if (!goalName.trim()) {
      setError(t(lang, 'firstGoalQuestion'));
      setStep('goal');
      return;
    }
    try {
      const created = addCategory({
        name: goalName.trim(),
        goalType: selectedMode.goalType,
        domain: selectedMode.domain,
        domainTemplateId: useTemplate ? selectedTemplate?.id : undefined,
        vision: [currentLevel.trim(), target.trim()].filter(Boolean).join(' → ') || undefined,
        description: target.trim() || undefined,
        progressModel: useTemplate && selectedTemplate?.defaultProgressModel === 'goal_criteria_weighted' ? 'criteria_weighted' : 'module_average',
        outcomeCriteria: [],
      });
      let result = { createdSkillIds: [] as string[], createdModuleIds: [] as string[] };
      if (useTemplate && selectedTemplate) {
        const applied = applyDomainTemplateToGoal(created.id, selectedTemplate.id);
        result = {
          createdSkillIds: applied?.createdSkillIds ?? [],
          createdModuleIds: applied?.createdModuleIds ?? [],
        };
        result.createdSkillIds.forEach((skillId) => {
          updateSkill(skillId, {
            defaultDurationMinutes: sessionLength,
            dailyTargetMinutes: sessionLength,
          });
        });
        trackEvent('onboarding_system_created', {
          domain: selectedMode.domain,
          moduleCount: result.createdModuleIds.length,
          skillCount: result.createdSkillIds.length,
          weeklyFrequency,
          sessionLength,
        }, { page: 'onboarding' });
      } else {
        trackEvent('onboarding_empty_goal_created', { domain: selectedMode.domain }, { page: 'onboarding' });
      }
      trackEvent('onboarding_completed', { domain: selectedMode.domain, usedTemplate: useTemplate }, { page: 'onboarding' });
      setSettings({
        onboardingCompleted: true,
        onboardingVersion: ONBOARDING_VERSION,
        firstQuestCreated: true,
        firstSystemWelcomeDismissed: false,
        onboardingRestartRequested: false,
      });
    } catch (err) {
      console.warn('[onboarding] failed to create first system', err);
      setError(t(lang, 'onboardingCreateFailed'));
      setStep('goal');
    }
  };

  const Dots = () => {
    const steps: Step[] = ['mode', 'goal', 'preview'];
    if (!steps.includes(step)) return null;
    const current = Math.max(0, steps.indexOf(step));
    return (
      <View style={styles.dots}>
        {steps.map((item, index) => (
          <View key={item} style={[styles.dot, { backgroundColor: index <= current ? accent : questTheme.colors.surfaceSoft }]} />
        ))}
      </View>
    );
  };

  // Same field + glow + glass as Today (web reads the CSS variables; native keeps the plain theme surface).
  const v11Theme = getV11ThemeTokens(isDarkTheme(questTheme) ? 'dark' : 'light');
  const fieldVariables = {
    '--v11-rebaseline-bg': v11Theme.field.background,
    '--v11-rebaseline-elevated': v11Theme.questTheme.colors.surfaceElevated,
    '--v11-rebaseline-far': v11Theme.field.far,
    '--v11-rebaseline-grid': v11Theme.field.grid,
    '--v11-rebaseline-middle': v11Theme.field.middle,
    '--v11-rebaseline-near': v11Theme.field.near,
    '--v11-rebaseline-primary': v11Theme.glow.primary,
    '--v11-rebaseline-text': v11Theme.text.primary,
    '--v11-rebaseline-neutral-border': v11Theme.control.neutralBorder,
    '--v11-rebaseline-neutral-elevated': v11Theme.control.neutralElevatedSurface,
    '--v11-rebaseline-neutral-surface': v11Theme.control.neutralSurface,
  } as any;
  const smallButton = (label: string, onPress: () => void, testID?: string, muted = true) => (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} testID={testID} onPress={onPress}
      style={[styles.smallBtn, { borderColor: questTheme.colors.border, backgroundColor: questTheme.colors.surface }]}>
      <Text style={[styles.smallBtnText, { color: muted ? questTheme.colors.textMuted : questTheme.colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );

  const shell = (children: React.ReactNode) => (
    <OnboardingSafeArea
      className={v11ProductEnabled ? 'v11-onboarding' : undefined}
      edges={['top', 'bottom']}
      style={[styles.safe, { backgroundColor: v11Theme.field.background }]}
    >
      <OnboardingPanel dataSet={{ 'v11-rebaseline-role': 'onboarding-root' }} style={[styles.root, fieldVariables]}>
        <OnboardingPanel dataSet={{ 'v11-rebaseline-role': 'field' }} pointerEvents="none" />
        <V11GlowOrb stage="S1" style={{ position: 'absolute', top: 96, left: -92 }} theme={v11Theme} />
        <V11GlowOrb stage="S1" style={{ position: 'absolute', top: 470, right: -138 }} theme={v11Theme} tone="supporting" />
        {/* back / later (and the language switch on the first screen) stay pinned under the top safe area */}
        <View style={styles.topBar}>
          {step !== 'language' && step !== 'welcome' ? smallButton(t(lang, 'back'), goBack, 'fs-back', false) : <View />}
          <View style={styles.topRight}>
            {step === 'welcome' ? smallButton(t(lang, 'fsSwitchLanguage'), switchLanguage, 'fs-language') : null}
            {canExit ? smallButton(t(lang, 'later'), exitOnboarding, 'fs-later') : null}
          </View>
        </View>
        <OnboardingScrollView
          className={v11ProductEnabled ? 'v11-onboarding-scroll' : undefined}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.centerContent}
          style={{ flex: 1 }}
        >
          <Dots />
          {children}
        </OnboardingScrollView>
      </OnboardingPanel>
      {showAccount ? <NativeSettingsSheet lang={lang} canClose={() => true} onClose={() => setShowAccount(false)}>
        <AccountSyncSection />
      </NativeSettingsSheet> : null}
    </OnboardingSafeArea>
  );

  /** Glass card: on web the CSS role supplies Today's material; native falls back to the theme surface. */
  const card = (children: React.ReactNode, extra?: object) => (
    <OnboardingPanel
      dataSet={{ 'v11-rebaseline-role': 'onboarding-card' }}
      style={[styles.glassCard, Platform.OS === 'web' ? null : { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border, borderWidth: 1 }, extra]}
    >
      {children}
    </OnboardingPanel>
  );

  /** Equal-height capsule chip; groups lay out as a 3-column grid so every chip is the same size. */
  const chip = (label: string, selected: boolean, onPress: () => void, testID: string) => (
    <OnboardingTouchable
      key={testID}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      dataSet={{ 'v11-rebaseline-role': 'onboarding-chip', 'v11-selected': selected ? 'true' : 'false' }}
      onPress={onPress}
      style={[styles.chip, {
        backgroundColor: selected ? questTheme.colors.primary : Platform.OS === 'web' ? 'transparent' : questTheme.colors.surfaceSoft,
        borderColor: selected ? questTheme.colors.primary : questTheme.colors.border,
      }]}
    >
      <Text numberOfLines={1} style={[styles.chipText, { color: selected ? questTheme.colors.primaryText : questTheme.colors.text }]}>{label}</Text>
    </OnboardingTouchable>
  );

  if (step === 'welcome') {
    return shell(
      <OnboardingPanel testID="fs-welcome">
        {card(
          <>
            <View style={[styles.logoMarkSmall, { backgroundColor: questTheme.colors.primarySoft, borderColor: questTheme.colors.border }]}>
              <QuestIcon name="target" color={accent} size={24} strokeWidth={2.4} />
            </View>
            <Text accessibilityRole="header" style={[styles.title, styles.balanced, { color: questTheme.colors.text }]}>{t(lang, 'fsWelcomeTitle')}</Text>
            <Text style={[styles.subtitle, styles.pretty, { color: questTheme.colors.textMuted, marginBottom: 0 }]}>{t(lang, 'fsWelcomeBody')}</Text>
          </>,
        )}
        <View style={styles.actionStack}>
          <QuestButton questTheme={questTheme} label={t(lang, 'fsStart')} onPress={() => setStep('quick')} accessibilityLabel={t(lang, 'fsStart')} />
          <QuestButton questTheme={questTheme} variant="ghost" label={t(lang, 'fsBuildGoalFirst')} onPress={() => setStep('mode')} />
        </View>
        <Text style={[styles.caption, { color: questTheme.colors.textSubtle }]}>{t(lang, 'fsPrivacy')}</Text>
        <View style={styles.linkRow}>
          <TouchableOpacity accessibilityRole="button" onPress={() => setShowAccount(true)} style={styles.linkBtn}>
            <Text style={[styles.linkText, { color: questTheme.colors.textMuted }]}>{syncCopy(lang, 'account')}</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" onPress={() => setShowRecovery((value) => !value)} style={styles.linkBtn}>
            <Text style={[styles.linkText, { color: questTheme.colors.textMuted }]}>{backupCopy(lang, 'title')}</Text>
          </TouchableOpacity>
        </View>
        {showRecovery ? <RecordBackupActions /> : null}
      </OnboardingPanel>
    );
  }

  if (step === 'quick') {
    const group = <K extends keyof FirstStartAnswers>(key: K, titleKey: string, options: Array<FirstStartAnswers[K]>, prefix: string) => card(
      <>
        <Text style={[styles.quickLabel, { color: questTheme.colors.text }]}>{t(lang, titleKey)}</Text>
        <View style={styles.chipGrid}>
          {options.map((value) => chip(t(lang, `${prefix}${String(value)}`), answers[key] === value, () => answerQuick(key, value), `fs-${String(key)}-${String(value)}`))}
        </View>
      </>,
      { marginBottom: 10 },
    );
    const left = remainingAnswers(answers);
    return shell(
      <OnboardingPanel testID="fs-quick">
        <Text accessibilityRole="header" style={[styles.title, styles.balanced, { color: questTheme.colors.text, marginBottom: 14 }]}>{t(lang, 'fsQuickTitle')}</Text>
        {group('sleep', 'fsQSleep', ['bad', 'ok', 'good'] as SleepAnswer[], 'fsSleep_')}
        {group('state', 'fsQState', ['low', 'mid', 'high'] as StateAnswer[], 'fsState_')}
        {group('focus', 'fsQFocus', ['training', 'study', 'work', 'chores', 'recover', 'other'] as FocusAnswer[], 'fsFocus_')}
        <View style={[styles.actionStack, { marginTop: 12 }]}>
          {left > 0 ? <Text style={[styles.caption, { color: questTheme.colors.textMuted, marginTop: 0 }]}>{t(lang, 'fsQRemaining').replace('{n}', String(left))}</Text> : null}
          <QuestButton questTheme={questTheme} label={t(lang, 'fsSeeSuggestion')} disabled={left > 0} onPress={() => setStep('suggest')} />
        </View>
      </OnboardingPanel>
    );
  }

  if (step === 'suggest' && suggestion) {
    return shell(
      <OnboardingPanel testID="fs-suggest">
        {card(
          <>
            <View style={styles.kickerRow}>
              <Text style={[styles.kicker, { color: questTheme.colors.textMuted, marginBottom: 0 }]}>{t(lang, 'fsSuggestKicker')}</Text>
              <Text style={[styles.tag, { color: questTheme.colors.textMuted, borderColor: questTheme.colors.border }]}>{t(lang, 'fsGeneralAdvice')}</Text>
            </View>
            <Text accessibilityRole="header" style={[styles.title, styles.balanced, { color: questTheme.colors.text }]}>{suggestion.title}</Text>
            <Text style={[styles.suggestBody, styles.pretty, { color: questTheme.colors.text }]}>{suggestion.body}</Text>
            <Text style={[styles.basis, { color: questTheme.colors.textMuted }]}>{t(lang, 'fsSuggestBasis')}</Text>
          </>,
        )}
        {startFailed ? <Text accessibilityRole="alert" style={[styles.error, { color: questTheme.colors.danger, textAlign: 'center' }]}>{t(lang, 'fsSaveFailed')}</Text> : null}
        <View style={styles.actionStack}>
          <QuestButton questTheme={questTheme} label={startSaving ? t(lang, 'fsSaving') : startFailed ? t(lang, 'fsRetry') : t(lang, 'fsSuggestCta')} loading={startSaving} onPress={finishQuickStart} />
        </View>
        <Text style={[styles.caption, { color: questTheme.colors.textSubtle }]}>{t(lang, 'fsSuggestNext')}</Text>
        <Text style={[styles.caption, { color: questTheme.colors.textSubtle, marginTop: 6 }]}>{t(lang, 'fsLaterHealth')}</Text>
      </OnboardingPanel>
    );
  }

  if (step === 'language') {
    return shell(
        <OnboardingPanel className={v11ProductEnabled ? 'v11-onboarding-panel v11-onboarding-language' : undefined} style={styles.centerBlock}>
        <View style={[styles.logoMark, { backgroundColor: questTheme.colors.primarySoft, borderColor: questTheme.colors.border }]}> 
          <QuestIcon name="target" color={accent} size={34} strokeWidth={2.4} />
        </View>
        <Text style={[styles.brand, { color: questTheme.colors.text }]}>QuestLife</Text>
        <Text style={[styles.title, { color: questTheme.colors.text }]}>{t(detectInitialLanguage(), 'chooseLanguage')}</Text>
        <Text style={[styles.subtitle, { color: questTheme.colors.textMuted }]}>{t(detectInitialLanguage(), 'changeLaterInSettings')}</Text>
        <View style={styles.languageGrid}>
          <QuestButton questTheme={questTheme} label={t('zh', 'languageChinese')} onPress={() => selectLanguage('zh')} />
          <QuestButton questTheme={questTheme} label={t('en', 'languageEnglish')} variant="secondary" onPress={() => selectLanguage('en')} />
        </View>
      </OnboardingPanel>
    );
  }

  if (step === 'positioning') {
    return shell(
      <OnboardingPanel className={v11ProductEnabled ? 'v11-onboarding-panel' : undefined}>
        <View style={[styles.logoMark, { backgroundColor: questTheme.colors.primarySoft, borderColor: questTheme.colors.border }]}>
          <QuestIcon name="tree" color={accent} size={32} strokeWidth={2.4} />
        </View>
        <Text style={[styles.title, { color: questTheme.colors.text }]}>{t(lang, 'turnGoalsIntoSystems')}</Text>
        <Text style={[styles.subtitle, { color: questTheme.colors.textMuted }]}>{t(lang, 'questLifePositioningSubtitle')}</Text>
        <OnboardingPanel className={v11ProductEnabled ? 'v11-onboarding-evidence' : undefined} style={[styles.card, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }]}> 
          {[
            ['target', 'createGoalPoint'],
            ['folder', 'executableSkillsPoint'],
            ['barChart', 'compoundProgressPoint'],
          ].map(([icon, key], index) => (
            <View key={key} style={styles.pointRow}>
              <View style={[styles.pointIndex, { backgroundColor: questTheme.colors.surfaceSoft }]}>
                <QuestIcon name={icon as QuestIconName} color={accent} size={18} />
              </View>
              <Text style={[styles.pointText, { color: questTheme.colors.text }]}>{index + 1}. {t(lang, key)}</Text>
            </View>
          ))}
        </OnboardingPanel>
        <QuestButton questTheme={questTheme} label={t(lang, 'buildMyFirstSystem')} onPress={() => setStep('mode')} />
        <View style={{ marginTop: questTheme.spacing.md }}>
          <QuestButton questTheme={questTheme} variant="secondary" label={syncCopy(lang, 'account')} onPress={() => setShowAccount(true)} />
        </View>
        <View style={{ marginTop: questTheme.spacing.md }}>
          <QuestButton questTheme={questTheme} variant="secondary" label={backupCopy(lang, 'title')} onPress={() => setShowRecovery(value => !value)} />
          {showRecovery ? <RecordBackupActions /> : null}
        </View>
      </OnboardingPanel>
    );
  }

  if (step === 'mode') {
    return shell(
      <OnboardingPanel className={v11ProductEnabled ? 'v11-onboarding-panel' : undefined}>
        <Text style={[styles.title, { color: questTheme.colors.text }]}>{t(lang, 'chooseStartingMode')}</Text>
        <Text style={[styles.subtitle, { color: questTheme.colors.textMuted }]}>{t(lang, 'changeLaterInSettings')}</Text>
        <View style={styles.modeGrid}>
          {START_MODES.map((mode) => {
            const selected = selectedMode.domain === mode.domain;
            return (
              <OnboardingTouchable
                accessibilityRole="button"
                accessibilityLabel={t(lang, mode.labelKey)}
                accessibilityState={{ selected }}
                className={v11ProductEnabled ? 'v11-onboarding-mode' : undefined}
                key={mode.domain}
                onPress={() => selectMode(mode)}
                style={[
                  styles.modeCard,
                  { backgroundColor: questTheme.colors.surface, borderColor: selected ? accent : questTheme.colors.border },
                  selected && { backgroundColor: questTheme.colors.primarySoft },
                ]}
              >
                <QuestIcon name={mode.icon} color={selected ? accent : questTheme.colors.textMuted} size={23} />
                <Text style={[styles.modeText, { color: questTheme.colors.text }]}>{t(lang, mode.labelKey)}</Text>
              </OnboardingTouchable>
            );
          })}
        </View>
      </OnboardingPanel>
    );
  }

  if (step === 'goal') {
    return shell(
      <OnboardingPanel className={v11ProductEnabled ? 'v11-onboarding-panel' : undefined}>
        <Text style={[styles.title, { color: questTheme.colors.text }]}>{t(lang, 'firstGoalQuestion')}</Text>
        <Text style={[styles.subtitle, { color: questTheme.colors.textMuted }]}>{t(lang, 'firstGoalExamples')}</Text>
        <Text style={[styles.label, { color: questTheme.colors.text }]}>{t(lang, 'name')}</Text>
        <OnboardingTextInput
          className={v11ProductEnabled ? 'v11-onboarding-input' : undefined}
          style={[styles.input, { backgroundColor: questTheme.colors.surface, borderColor: error ? questTheme.colors.danger : questTheme.colors.border, color: questTheme.colors.text }]}
          value={goalName}
          onChangeText={(value: string) => { setGoalName(value); setError(''); }}
          placeholder={placeholder}
          placeholderTextColor={questTheme.colors.textSubtle}
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
        />
        {error ? <Text style={[styles.error, { color: questTheme.colors.danger }]}>{error}</Text> : null}
        <Text style={[styles.label, { color: questTheme.colors.text }]}>{t(lang, 'currentLevel')}</Text>
        <OnboardingTextInput
          className={v11ProductEnabled ? 'v11-onboarding-input' : undefined}
          style={[styles.input, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border, color: questTheme.colors.text }]}
          value={currentLevel}
          onChangeText={setCurrentLevel}
          placeholder={t(lang, 'onboardingOptionalStatePlaceholder')}
          placeholderTextColor={questTheme.colors.textSubtle}
        />
        <Text style={[styles.label, { color: questTheme.colors.text }]}>{t(lang, 'target')}</Text>
        <OnboardingTextInput
          className={v11ProductEnabled ? 'v11-onboarding-input' : undefined}
          style={[styles.input, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border, color: questTheme.colors.text }]}
          value={target}
          onChangeText={setTarget}
          placeholder={t(lang, 'onboardingOptionalTargetPlaceholder')}
          placeholderTextColor={questTheme.colors.textSubtle}
        />
        <Text style={[styles.label, { color: questTheme.colors.text }]}>{t(lang, 'weeklyFrequency')}</Text>
        <View style={styles.pillRow}>
          {frequencyOptions.map((value) => (
            <QuestPill key={value} questTheme={questTheme} label={value === 5 ? '5+' : String(value)} active={weeklyFrequency === value} onPress={() => setWeeklyFrequency(value)} />
          ))}
        </View>
        <Text style={[styles.label, { color: questTheme.colors.text }]}>{t(lang, 'sessionLength')}</Text>
        <View style={styles.pillRow}>
          {sessionOptions.map((value) => (
            <QuestPill key={value} questTheme={questTheme} label={`${value}m`} active={sessionLength === value} onPress={() => setSessionLength(value)} />
          ))}
        </View>
        <View style={styles.actionStack}>
          <QuestButton questTheme={questTheme} label={t(lang, 'generateMySystem')} onPress={selectedMode.domain === 'custom' ? () => createGoal(false) : previewTemplate} />
          <QuestButton questTheme={questTheme} label={t(lang, 'createEmptyGoal')} variant="secondary" onPress={() => createGoal(false)} />
        </View>
      </OnboardingPanel>
    );
  }

  const previewModules = selectedTemplate?.defaultModules.slice(0, 6).map((item) => (lang === 'en' ? item.name : item.nameZh)) ?? [];
  const previewSkills = selectedTemplate?.defaultSkills.slice(0, 6).map((item) => (lang === 'en' ? item.name : item.nameZh)) ?? [];
  const loggingFields = domainLoggingFields(selectedTemplate, lang);
  return shell(
    <OnboardingPanel className={v11ProductEnabled ? 'v11-onboarding-panel' : undefined}>
      <Text style={[styles.title, { color: questTheme.colors.text }]}>{t(lang, 'systemPreview')}</Text>
      <Text style={[styles.subtitle, { color: questTheme.colors.textMuted }]}>{t(lang, 'questLifeWillCreate')}</Text>
      <OnboardingPanel className={v11ProductEnabled ? 'v11-onboarding-evidence' : undefined} style={[styles.card, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }]}> 
        <Text style={[styles.previewTitle, { color: questTheme.colors.text }]}>{t(lang, 'oneGoal')}: {goalName.trim() || placeholder}</Text>
        <Text style={[styles.previewLine, { color: questTheme.colors.textMuted }]}>
          {t(lang, 'modules')}: {previewModules.join(' / ') || t(lang, 'none')}
        </Text>
        <Text style={[styles.previewLine, { color: questTheme.colors.textMuted }]}>
          {t(lang, 'skills')}: {previewSkills.join(' / ') || t(lang, 'none')}
        </Text>
        <Text style={[styles.previewLine, { color: questTheme.colors.textMuted }]}>
          {t(lang, 'recommendedLoggingFields')}: {loggingFields.join(' / ') || t(lang, 'actualLog')}
        </Text>
        <Text style={[styles.previewLine, { color: questTheme.colors.textMuted }]}>
          {t(lang, 'todayFirstAction')}: {sessionLength} {t(lang, 'minutes')} · {weeklyFrequency === 5 ? '5+' : weeklyFrequency} / {t(lang, 'week')}
        </Text>
      </OnboardingPanel>
      <View style={styles.actionStack}>
        <QuestButton questTheme={questTheme} label={t(lang, 'createSystem')} onPress={() => createGoal(true)} />
        <QuestButton questTheme={questTheme} label={t(lang, 'backToEdit')} variant="secondary" onPress={() => setStep('goal')} />
      </View>
    </OnboardingPanel>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 36,
    justifyContent: 'center',
  },
  // welcome is a poster, not a form: anchor to the top so the language switch sits in the corner and the CTA lands in the thumb zone
  contentTop: { justifyContent: 'flex-start' },
  v11Content: { maxWidth: 760, paddingHorizontal: 20, paddingBottom: 48 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  root: { flex: 1, position: 'relative', overflow: 'hidden' },
  topBar: { zIndex: 3, minHeight: 56, paddingHorizontal: 20, paddingTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  // vertically centred, biased upward (more room below than above) so short pages do not leave a dead band
  centerContent: { flexGrow: 1, width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 200, justifyContent: 'center', zIndex: 2 },
  glassCard: { borderRadius: 22, padding: 18 },
  logoMarkSmall: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginBottom: 14 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 44, flexBasis: '31%', flexGrow: 1, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  chipText: { fontSize: 15, fontWeight: '700' },
  kickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  tag: { fontSize: 11, fontWeight: '700', borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, overflow: 'hidden' },
  basis: { fontSize: 13, lineHeight: 19 },
  balanced: { textWrap: 'balance' } as any,
  // avoids a single orphaned character on the last line (CJK has no word boundaries to wrap at)
  pretty: { textWrap: 'pretty' } as any,
  caption: { fontSize: 13, lineHeight: 19, marginTop: 14, textAlign: 'center' },
  kicker: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6, marginBottom: 10 },
  suggestBody: { fontSize: 16, lineHeight: 24, fontWeight: '600', marginBottom: 12 },
  quickLabel: { fontSize: 15, fontWeight: '800', marginBottom: 12 },
  linkRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 6 },
  linkBtn: { minHeight: 44, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  linkText: { fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
  topRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  smallBtn: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  smallBtnText: { fontSize: 12, fontWeight: '800' },
  dots: { flexDirection: 'row', gap: 8, alignSelf: 'center', marginBottom: 24 },
  dot: { width: 24, height: 5, borderRadius: 999 },
  centerBlock: { alignItems: 'center' },
  logoMark: { width: 68, height: 68, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginBottom: 18 },
  brand: { fontSize: 38, fontWeight: '900', marginBottom: 18 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '900', marginBottom: 12 },
  subtitle: { fontSize: 15, lineHeight: 23, marginBottom: 22 },
  languageGrid: { width: '100%', gap: 12, marginTop: 8 },
  card: { borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 18 },
  pointRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  pointIndex: { width: 34, height: 34, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pointText: { fontSize: 15, lineHeight: 21, fontWeight: '700', flex: 1 },
  modeGrid: { gap: 10 },
  modeCard: { minHeight: 58, borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  modeText: { fontSize: 15, fontWeight: '800', flex: 1 },
  label: { fontSize: 13, fontWeight: '800', marginBottom: 8, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 16, minHeight: 50, paddingHorizontal: 14, fontSize: 16, fontWeight: '700' },
  error: { marginTop: 8, fontSize: 12, fontWeight: '700' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionStack: { gap: 10, marginTop: 22 },
  previewTitle: { fontSize: 17, fontWeight: '900', marginBottom: 12 },
  previewLine: { fontSize: 14, lineHeight: 22, fontWeight: '700', marginBottom: 8 },
});

const OnboardingSafeArea = SafeAreaView as any;
const OnboardingScrollView = ScrollView as any;
const OnboardingPanel = View as any;
const OnboardingTouchable = TouchableOpacity as any;
const OnboardingTextInput = TextInput as any;
