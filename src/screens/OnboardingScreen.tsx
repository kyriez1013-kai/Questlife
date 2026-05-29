import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
import { appAccent } from '../theme';
import { getQuestTheme } from '../design/tokens';
import QuestButton from '../components/ui/QuestButton';
import QuestIcon, { QuestIconName } from '../components/ui/QuestIcon';
import QuestPill from '../components/ui/QuestPill';
import {
  getDomainTemplateByDomain,
} from '../domainTemplates';
import { DomainTemplate, DomainTemplateDomain, GoalType } from '../types';
import { getLanguage, t } from '../i18n';
import { trackEvent } from '../utils/analytics';

type Step = 'language' | 'positioning' | 'mode' | 'goal' | 'preview';

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
  } = useStore();
  const questTheme = getQuestTheme(data.settings.selectedThemeId);
  const accent = appAccent(data.settings.accentColor ?? questTheme.colors.primary);
  const lang = getLanguage(data.settings.language ?? data.settings.preferredLanguage);
  const hasExistingCoreData = data.categories.length > 0 || data.skills.length > 0 || (data.executionLogs || []).length > 0;
  const [step, setStep] = useState<Step>(data.settings.language ? 'positioning' : 'language');
  const [selectedMode, setSelectedMode] = useState<StartMode>(START_MODES[0]);
  const [goalName, setGoalName] = useState('');
  const [currentLevel, setCurrentLevel] = useState('');
  const [target, setTarget] = useState('');
  const [weeklyFrequency, setWeeklyFrequency] = useState(3);
  const [sessionLength, setSessionLength] = useState(30);
  const [error, setError] = useState('');

  const selectedTemplate = useMemo(() => (
    selectedMode.domain === 'custom' ? undefined : getDomainTemplateByDomain(selectedMode.domain)
  ), [selectedMode.domain]);
  const placeholder = lang === 'en' ? selectedMode.placeholderEn : selectedMode.placeholderZh;
  const canExit = hasExistingCoreData || !!data.settings.onboardingRestartRequested;

  useEffect(() => {
    trackEvent('onboarding_started', { detectedLanguage: detectInitialLanguage() }, { page: 'onboarding' });
  }, []);

  const goBack = () => {
    if (step === 'positioning') setStep('language');
    if (step === 'mode') setStep('positioning');
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
      Alert.alert('QuestLife', lang === 'en' ? 'Could not create the system. Please try again.' : '创建系统失败，请重试。');
    }
  };

  const Dots = () => {
    const steps: Step[] = ['positioning', 'mode', 'goal', 'preview'];
    if (step === 'language') return null;
    const current = Math.max(0, steps.indexOf(step));
    return (
      <View style={styles.dots}>
        {steps.map((item, index) => (
          <View key={item} style={[styles.dot, { backgroundColor: index <= current ? accent : questTheme.colors.surfaceSoft }]} />
        ))}
      </View>
    );
  };

  const shell = (children: React.ReactNode) => (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.safe, { backgroundColor: questTheme.colors.background }]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        style={{ backgroundColor: questTheme.colors.background }}
      >
        <View style={styles.topRow}>
          {step !== 'language' ? (
            <TouchableOpacity onPress={goBack} style={[styles.smallBtn, { borderColor: questTheme.colors.border, backgroundColor: questTheme.colors.surface }]}>
              <Text style={[styles.smallBtnText, { color: questTheme.colors.text }]}>{t(lang, 'back')}</Text>
            </TouchableOpacity>
          ) : <View />}
          {canExit ? (
            <TouchableOpacity onPress={exitOnboarding} style={[styles.smallBtn, { borderColor: questTheme.colors.border, backgroundColor: questTheme.colors.surface }]}>
              <Text style={[styles.smallBtnText, { color: questTheme.colors.textMuted }]}>{t(lang, 'later')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <Dots />
        {children}
      </ScrollView>
    </SafeAreaView>
  );

  if (step === 'language') {
    return shell(
      <View style={styles.centerBlock}>
        <View style={[styles.logoMark, { backgroundColor: questTheme.colors.primarySoft, borderColor: questTheme.colors.border }]}>
          <QuestIcon name="target" color={accent} size={34} strokeWidth={2.4} />
        </View>
        <Text style={[styles.brand, { color: questTheme.colors.text }]}>QuestLife</Text>
        <Text style={[styles.title, { color: questTheme.colors.text }]}>{t(detectInitialLanguage(), 'chooseLanguage')}</Text>
        <Text style={[styles.subtitle, { color: questTheme.colors.textMuted }]}>
          选择你的语言 · Choose your language{'\n'}
          你可以之后在设置里更改。 / You can change this later in Settings.
        </Text>
        <View style={styles.languageGrid}>
          <QuestButton questTheme={questTheme} label={t('zh', 'languageChinese')} onPress={() => selectLanguage('zh')} />
          <QuestButton questTheme={questTheme} label={t('en', 'languageEnglish')} variant="secondary" onPress={() => selectLanguage('en')} />
        </View>
      </View>
    );
  }

  if (step === 'positioning') {
    return shell(
      <View>
        <View style={[styles.logoMark, { backgroundColor: questTheme.colors.primarySoft, borderColor: questTheme.colors.border }]}>
          <QuestIcon name="tree" color={accent} size={32} strokeWidth={2.4} />
        </View>
        <Text style={[styles.title, { color: questTheme.colors.text }]}>{t(lang, 'turnGoalsIntoSystems')}</Text>
        <Text style={[styles.subtitle, { color: questTheme.colors.textMuted }]}>{t(lang, 'questLifePositioningSubtitle')}</Text>
        <View style={[styles.card, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }]}>
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
        </View>
        <QuestButton questTheme={questTheme} label={t(lang, 'buildMyFirstSystem')} onPress={() => setStep('mode')} />
      </View>
    );
  }

  if (step === 'mode') {
    return shell(
      <View>
        <Text style={[styles.title, { color: questTheme.colors.text }]}>{t(lang, 'chooseStartingMode')}</Text>
        <Text style={[styles.subtitle, { color: questTheme.colors.textMuted }]}>{t(lang, 'changeLaterInSettings')}</Text>
        <View style={styles.modeGrid}>
          {START_MODES.map((mode) => {
            const selected = selectedMode.domain === mode.domain;
            return (
              <TouchableOpacity
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
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  if (step === 'goal') {
    return shell(
      <View>
        <Text style={[styles.title, { color: questTheme.colors.text }]}>{t(lang, 'firstGoalQuestion')}</Text>
        <Text style={[styles.subtitle, { color: questTheme.colors.textMuted }]}>{t(lang, 'firstGoalExamples')}</Text>
        <Text style={[styles.label, { color: questTheme.colors.text }]}>{t(lang, 'name')}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: questTheme.colors.surface, borderColor: error ? questTheme.colors.danger : questTheme.colors.border, color: questTheme.colors.text }]}
          value={goalName}
          onChangeText={(value) => { setGoalName(value); setError(''); }}
          placeholder={placeholder}
          placeholderTextColor={questTheme.colors.textSubtle}
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
        />
        {error ? <Text style={[styles.error, { color: questTheme.colors.danger }]}>{error}</Text> : null}
        <Text style={[styles.label, { color: questTheme.colors.text }]}>{t(lang, 'currentLevel')}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border, color: questTheme.colors.text }]}
          value={currentLevel}
          onChangeText={setCurrentLevel}
          placeholder={lang === 'en' ? 'Optional current state' : '可选：当前状态'}
          placeholderTextColor={questTheme.colors.textSubtle}
        />
        <Text style={[styles.label, { color: questTheme.colors.text }]}>{t(lang, 'target')}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border, color: questTheme.colors.text }]}
          value={target}
          onChangeText={setTarget}
          placeholder={lang === 'en' ? 'Optional target or deadline' : '可选：目标或截止时间'}
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
      </View>
    );
  }

  const previewModules = selectedTemplate?.defaultModules.slice(0, 6).map((item) => (lang === 'en' ? item.name : item.nameZh)) ?? [];
  const previewSkills = selectedTemplate?.defaultSkills.slice(0, 6).map((item) => (lang === 'en' ? item.name : item.nameZh)) ?? [];
  const loggingFields = domainLoggingFields(selectedTemplate, lang);
  return shell(
    <View>
      <Text style={[styles.title, { color: questTheme.colors.text }]}>{t(lang, 'systemPreview')}</Text>
      <Text style={[styles.subtitle, { color: questTheme.colors.textMuted }]}>{t(lang, 'questLifeWillCreate')}</Text>
      <View style={[styles.card, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }]}>
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
      </View>
      <View style={styles.actionStack}>
        <QuestButton questTheme={questTheme} label={t(lang, 'createSystem')} onPress={() => createGoal(true)} />
        <QuestButton questTheme={questTheme} label={t(lang, 'backToEdit')} variant="secondary" onPress={() => setStep('goal')} />
      </View>
    </View>
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
