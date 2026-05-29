// 可复用大目标 (Category) 表单 - 创建 / 编辑共用
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Keyboard } from 'react-native';
import { useStore } from '../store';
import { appAccent, theme } from '../theme';
import { Category, GoalProgressModel, GoalType } from '../types';
import BottomSheetForm from './BottomSheetForm';
import EmojiPicker from './EmojiPicker';
import { getLanguage, goalTypeLabel, progressModelLabel, t } from '../i18n';
import { getQuestTheme } from '../design/tokens';
import QuestButton from './ui/QuestButton';
import QuestEntityIcon from './ui/QuestEntityIcon';
import QuestInput from './ui/QuestInput';
import QuestPill from './ui/QuestPill';
import { getGoalSemanticIcon } from '../design/entityIcons';
import { getDefaultTemplateForGoalType } from '../domainTemplates';
import { trackEvent } from '../utils/analytics';

const EMOJIS = ['🎯','🏋️','💼','📚','🎨','🧘','💻','🎸','💰','❤️','🌱','🍳','📷','🧠','✍️','🏃','🎮','🔬','🐾','✈️'];
const GOAL_TYPES: GoalType[] = ['fitness', 'career', 'study', 'exam', 'finance', 'health', 'project', 'custom'];
const PROGRESS_MODELS: GoalProgressModel[] = ['criteria_weighted', 'module_average', 'skill_average', 'manual'];

export interface GoalFormProps {
  visible: boolean;
  onClose: () => void;
  initial?: Category;
}

export default function GoalForm({ visible, onClose, initial }: GoalFormProps) {
  const { data, addCategory, updateCategory, applyDomainTemplateToGoal } = useStore();
  const questTheme = getQuestTheme(data.settings.selectedThemeId);
  const accent = appAccent(data.settings.accentColor ?? questTheme.colors.primary);
  const lang = getLanguage(data.settings.language);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [desc, setDesc] = useState('');
  const [goalType, setGoalType] = useState<GoalType>('custom');
  const [vision, setVision] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [progressModel, setProgressModel] = useState<GoalProgressModel>('criteria_weighted');
  const [customIcon, setCustomIcon] = useState(false);
  const [useTemplate, setUseTemplate] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (initial) {
      setName(initial.name);
      setEmoji(initial.emoji ?? '');
      setDesc(initial.description ?? '');
      setGoalType(initial.goalType ?? 'custom');
      setVision(initial.vision ?? '');
      setTargetDate(initial.targetDate ?? '');
      setProgressModel(initial.progressModel ?? 'criteria_weighted');
      setCustomIcon(Boolean(initial.emoji));
      setUseTemplate(false);
    } else {
      setName('');
      setEmoji('');
      setDesc('');
      setGoalType('custom');
      setVision('');
      setTargetDate('');
      setProgressModel('criteria_weighted');
      setCustomIcon(false);
      setUseTemplate(false);
    }
  }, [visible, initial?.id]);

  useEffect(() => {
    if (!customIcon) setEmoji('');
  }, [goalType, customIcon]);

  const recommendedTemplate = getDefaultTemplateForGoalType(goalType);
  const shouldShowTemplate = !!recommendedTemplate && goalType !== 'custom';

  useEffect(() => {
    if (!visible || initial) return;
    setUseTemplate(!!shouldShowTemplate);
  }, [visible, initial?.id, shouldShowTemplate, goalType]);

  const submit = () => {
    if (!name.trim()) { Alert.alert(t(lang, 'name')); return; }
    const templatePatch = useTemplate && recommendedTemplate ? {
      domain: recommendedTemplate.domain,
      domainTemplateId: recommendedTemplate.id,
    } : {};
    const patch = {
      name: name.trim(),
      emoji: customIcon ? emoji : '',
      description: desc.trim() || undefined,
      goalType,
      vision: vision.trim(),
      targetDate: targetDate.trim() || undefined,
      progressModel,
      ...templatePatch,
    };
    if (initial) {
      updateCategory(initial.id, patch);
      if (useTemplate && recommendedTemplate) {
        applyDomainTemplateToGoal(initial.id, recommendedTemplate.id);
      }
    } else {
      const created = addCategory({ ...patch, outcomeCriteria: [] });
      if (useTemplate && recommendedTemplate) {
        applyDomainTemplateToGoal(created.id, recommendedTemplate.id);
      }
    }
    if (useTemplate && recommendedTemplate) {
      trackEvent('domain_template_selected', {
        domain: recommendedTemplate.domain,
        goalType,
        moduleCount: recommendedTemplate.defaultModules.length,
        skillCount: recommendedTemplate.defaultSkills.length,
      }, { page: 'goal_form' });
    }
    onClose();
  };

  return (
    <BottomSheetForm visible={visible} onClose={onClose}>
      <Text style={[styles.h2, { color: questTheme.colors.text }]}>{initial ? t(lang, 'edit') : t(lang, 'addQuest')}</Text>

      <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'name')}</Text>
      <QuestInput
        questTheme={questTheme}
        value={name} onChangeText={setName}
        placeholder={t(lang, 'goalNamePlaceholder')}
        returnKeyType="done" onSubmitEditing={Keyboard.dismiss} blurOnSubmit
      />

      <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'goalType')}</Text>
      <View style={styles.chipWrap}>
        {GOAL_TYPES.map((type) => (
          <QuestPill
            key={type}
            questTheme={questTheme}
            label={goalTypeLabel(lang, type)}
            active={goalType === type}
            onPress={() => setGoalType(type)}
          />
        ))}
      </View>

      {shouldShowTemplate && recommendedTemplate ? (
        <View style={[styles.templatePanel, { backgroundColor: questTheme.colors.surfaceSoft, borderColor: questTheme.colors.border }]}>
          <Text style={[styles.iconPanelTitle, { color: questTheme.colors.text }]}>{t(lang, 'recommendedTemplate')}</Text>
          <Text style={[styles.iconPanelSub, { color: questTheme.colors.textMuted }]}>
            {lang === 'en' ? recommendedTemplate.description : recommendedTemplate.descriptionZh}
          </Text>
          <Text style={[styles.iconPanelSub, { color: questTheme.colors.textMuted, marginTop: 8 }]}>
            {t(lang, 'thisTemplateWillCreate')}
          </Text>
          <Text style={[styles.iconPanelSub, { color: questTheme.colors.text }]}>
            {t(lang, 'modulesCount').replace('{count}', String(recommendedTemplate.defaultModules.length))} · {t(lang, 'skillsCount').replace('{count}', String(recommendedTemplate.defaultSkills.length))}
          </Text>
          <Text style={[styles.iconPanelSub, { color: questTheme.colors.textMuted }]}>
            {t(lang, 'defaultRecordingFields')}: {recommendedTemplate.recordingSchema.slice(0, 5).map((field) => lang === 'en' ? field.label : field.labelZh).join(lang === 'en' ? ', ' : '、')}
          </Text>
          <View style={[styles.chipWrap, { marginTop: 10 }]}>
            <QuestPill questTheme={questTheme} label={initial ? t(lang, 'supplementMissingTemplateStructure') : t(lang, 'useRecommendedTemplate')} active={useTemplate} onPress={() => setUseTemplate(true)} />
            <QuestPill questTheme={questTheme} label={t(lang, 'createEmptyGoal')} active={!useTemplate} onPress={() => setUseTemplate(false)} />
          </View>
        </View>
      ) : null}

      <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'icon')}</Text>
      <View style={[styles.iconPanel, { backgroundColor: questTheme.colors.surfaceSoft, borderColor: questTheme.colors.border }]}>
        <QuestEntityIcon
          icon={customIcon ? emoji : undefined}
          systemIcon={getGoalSemanticIcon({ goalType, name })}
          questTheme={questTheme}
          size="md"
          preferEmoji={customIcon}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.iconPanelTitle, { color: questTheme.colors.text }]}>
            {customIcon ? t(lang, 'customIconEnabled') : `${t(lang, 'autoIcon')}: ${goalTypeLabel(lang, goalType)}`}
          </Text>
          <Text style={[styles.iconPanelSub, { color: questTheme.colors.textMuted }]}>
            {customIcon ? t(lang, 'legacyEmoji') : t(lang, 'semanticIcon')}
          </Text>
        </View>
        {customIcon ? (
          <QuestButton questTheme={questTheme} variant="ghost" label={t(lang, 'useAutoIcon')} onPress={() => { setCustomIcon(false); setEmoji(''); }} />
        ) : (
          <QuestButton questTheme={questTheme} variant="ghost" label={t(lang, 'customizeIcon')} onPress={() => setCustomIcon(true)} />
        )}
      </View>
      {customIcon ? (
        <View style={{ marginTop: 10 }}>
          <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'legacyEmoji')}</Text>
          <EmojiPicker emojis={EMOJIS} value={emoji} onChange={setEmoji} />
        </View>
      ) : null}

      <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'vision')}</Text>
      <QuestInput
        questTheme={questTheme}
        value={vision} onChangeText={setVision}
        style={{ height: 72, textAlignVertical: 'top' }} multiline
        placeholder={t(lang, 'visionPlaceholder')}
      />

      <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'targetDate')}</Text>
      <QuestInput
        questTheme={questTheme}
        value={targetDate} onChangeText={setTargetDate}
        placeholder={t(lang, 'targetDatePlaceholder')}
        returnKeyType="done" onSubmitEditing={Keyboard.dismiss} blurOnSubmit
      />

      <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'progressModel')}</Text>
      <View style={styles.chipWrap}>
        {PROGRESS_MODELS.map((model) => (
          <QuestPill
            key={model}
            questTheme={questTheme}
            label={progressModelLabel(lang, model)}
            active={progressModel === model}
            onPress={() => setProgressModel(model)}
          />
        ))}
      </View>

      <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'description')}</Text>
      <QuestInput
        questTheme={questTheme}
        value={desc} onChangeText={setDesc}
        style={{ height: 80, textAlignVertical: 'top' }} multiline
        placeholder={t(lang, 'noteOptional')}
      />

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
        <QuestButton questTheme={questTheme} variant="secondary" label={t(lang, 'cancel')} onPress={onClose} style={{ flex: 1 }} />
        <QuestButton questTheme={questTheme} variant="primary" label={initial ? t(lang, 'save') : t(lang, 'create')} onPress={submit} style={{ flex: 1 }} />
      </View>
    </BottomSheetForm>
  );
}

const styles = StyleSheet.create({
  h2: { color: theme.text, fontSize: 18, fontWeight: '600' },
  label: { color: theme.textDim, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: theme.card, borderRadius: theme.radius.md, padding: 12, color: theme.text, borderWidth: 1, borderColor: theme.border },
  iconPanel: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: theme.radius.lg, padding: 10 },
  iconPanelTitle: { fontSize: 13, fontWeight: '900' },
  iconPanelSub: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  templatePanel: { borderWidth: 1, borderRadius: theme.radius.lg, padding: 12, marginTop: 12 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: theme.border, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: theme.card },
  chipText: { color: theme.textDim, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  btn: { paddingVertical: 12, borderRadius: theme.radius.md, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.border },
  btnGhostText: { color: theme.text, fontWeight: '600' },
});
