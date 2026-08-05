import React, { useMemo, useState } from 'react';
import {
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getQuestTheme } from '../../design/tokens';
import { getSkillSemanticIcon } from '../../design/entityIcons';
import { getRecordingFieldsForSkill } from '../../domainTemplates';
import { Lang, qualityLabel, t } from '../../i18n';
import { theme } from '../../theme';
import {
  Category,
  DomainRecordingField,
  Quality,
  ScheduleBlock,
  Skill,
} from '../../types';
import {
  getPredictionSchemaForSkill,
  isStrengthPredictionSkill,
} from '../../utils/prediction';
import QuestButton from '../ui/QuestButton';
import QuestEntityIcon from '../ui/QuestEntityIcon';
import QuestInput from '../ui/QuestInput';

type LogType = 'skill' | 'schedule' | 'custom';
type StrengthLogMode = 'simple' | 'session';

export type V11StrengthExerciseDraft = {
  id: string;
  exerciseName: string;
  weight: string;
  sets: string;
  reps: string;
  rpe: string;
  note: string;
};

type Props = {
  accent: string;
  amountAdded: string;
  binaryCompleted: boolean;
  categories: Category[];
  completedCurriculumItemIds: string[];
  difficulty: Quality | null;
  emotionalCost: Quality | null;
  exerciseEntries: V11StrengthExerciseDraft[];
  frequencyCompleted: boolean;
  lang: Lang;
  logType: LogType;
  mentalCost: Quality | null;
  minutes: string;
  newCurrentAmount: string;
  newCurrentValue: string;
  note: string;
  onAmountAddedChange: (value: string) => void;
  onBinaryCompletedChange: React.Dispatch<React.SetStateAction<boolean>>;
  onCompletedCurriculumItemIdsChange: React.Dispatch<React.SetStateAction<string[]>>;
  onDifficultyChange: React.Dispatch<React.SetStateAction<Quality | null>>;
  onEmotionalCostChange: React.Dispatch<React.SetStateAction<Quality | null>>;
  onExerciseEntriesChange: React.Dispatch<React.SetStateAction<V11StrengthExerciseDraft[]>>;
  onFrequencyCompletedChange: React.Dispatch<React.SetStateAction<boolean>>;
  onLogTypeChange: (value: LogType) => void;
  onMentalCostChange: React.Dispatch<React.SetStateAction<Quality | null>>;
  onMinutesChange: (value: string) => void;
  onNewCurrentAmountChange: (value: string) => void;
  onNewCurrentValueChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onPerformanceValueChange: (value: string) => void;
  onPhysicalCostChange: React.Dispatch<React.SetStateAction<Quality | null>>;
  onPredictedMinutesChange: (value: string) => void;
  onPredictedQualityChange: React.Dispatch<React.SetStateAction<Quality | null>>;
  onPredictedStrengthRepsChange: (value: string) => void;
  onPredictedStrengthRpeChange: (value: string) => void;
  onPredictedStrengthSetsChange: (value: string) => void;
  onPredictedStrengthWeightChange: (value: string) => void;
  onPredictedValueChange: (value: string) => void;
  onQualityChange: React.Dispatch<React.SetStateAction<Quality | null>>;
  onQualitativeSummaryChange: (value: string) => void;
  onScheduleBlockSelect: (block: ScheduleBlock) => void;
  onSchemaValuesChange: React.Dispatch<React.SetStateAction<Record<string, string | number | boolean>>>;
  onSessionTypeChange: (value: string) => void;
  onShowAdvancedFieldsChange: React.Dispatch<React.SetStateAction<boolean>>;
  onShowDetailedPredictionChange: React.Dispatch<React.SetStateAction<boolean>>;
  onShowPredictionChange: React.Dispatch<React.SetStateAction<boolean>>;
  onSkillSelect: (skillId: string) => void;
  onStateValueChange: (value: string) => void;
  onStrengthLogModeChange: (value: StrengthLogMode) => void;
  onStrengthRepsChange: (value: string) => void;
  onStrengthRpeChange: (value: string) => void;
  onStrengthSetsChange: (value: string) => void;
  onStrengthWeightChange: (value: string) => void;
  performanceValue: string;
  physicalCost: Quality | null;
  predictedMinutes: string;
  predictedQuality: Quality | null;
  predictedStrengthReps: string;
  predictedStrengthRpe: string;
  predictedStrengthSets: string;
  predictedStrengthWeight: string;
  predictedValue: string;
  quality: Quality | null;
  qualitativeSummary: string;
  questTheme: ReturnType<typeof getQuestTheme>;
  scheduleBlockId: string | null;
  schemaValues: Record<string, string | number | boolean>;
  sessionType: string;
  showAdvancedFields: boolean;
  showDetailedPrediction: boolean;
  showPrediction: boolean;
  skillId: string | null;
  skills: Skill[];
  stateValue: string;
  strengthLogMode: StrengthLogMode;
  strengthReps: string;
  strengthRpe: string;
  strengthSets: string;
  strengthWeight: string;
  todayScheduleBlocks: ScheduleBlock[];
  useV11: boolean;
};

function LegacyRecordProgressForm({
  accent,
  amountAdded,
  binaryCompleted,
  categories,
  completedCurriculumItemIds,
  difficulty,
  emotionalCost,
  exerciseEntries,
  frequencyCompleted,
  lang,
  logType,
  mentalCost,
  minutes,
  newCurrentAmount,
  newCurrentValue,
  note,
  onAmountAddedChange,
  onBinaryCompletedChange,
  onCompletedCurriculumItemIdsChange,
  onDifficultyChange,
  onEmotionalCostChange,
  onExerciseEntriesChange,
  onFrequencyCompletedChange,
  onLogTypeChange,
  onMentalCostChange,
  onMinutesChange,
  onNewCurrentAmountChange,
  onNewCurrentValueChange,
  onNoteChange,
  onPerformanceValueChange,
  onPhysicalCostChange,
  onPredictedMinutesChange,
  onPredictedQualityChange,
  onPredictedStrengthRepsChange,
  onPredictedStrengthRpeChange,
  onPredictedStrengthSetsChange,
  onPredictedStrengthWeightChange,
  onPredictedValueChange,
  onQualityChange,
  onQualitativeSummaryChange,
  onScheduleBlockSelect,
  onSchemaValuesChange,
  onSessionTypeChange,
  onShowAdvancedFieldsChange,
  onShowDetailedPredictionChange,
  onShowPredictionChange,
  onSkillSelect,
  onStateValueChange,
  onStrengthLogModeChange,
  onStrengthRepsChange,
  onStrengthRpeChange,
  onStrengthSetsChange,
  onStrengthWeightChange,
  performanceValue,
  physicalCost,
  predictedMinutes,
  predictedQuality,
  predictedStrengthReps,
  predictedStrengthRpe,
  predictedStrengthSets,
  predictedStrengthWeight,
  predictedValue,
  quality,
  qualitativeSummary,
  questTheme,
  scheduleBlockId,
  schemaValues,
  sessionType,
  showAdvancedFields,
  showDetailedPrediction,
  showPrediction,
  skillId,
  skills,
  stateValue,
  strengthLogMode,
  strengthReps,
  strengthRpe,
  strengthSets,
  strengthWeight,
  todayScheduleBlocks,
  useV11,
}: Props) {
  const selectedSkill = skills.find((skill) => skill.id === skillId);
  const modalPredictionSchema = getPredictionSchemaForSkill(selectedSkill);
  const modalIsStrength = isStrengthPredictionSkill(selectedSkill);
  const categoryForSkill = (id: string) => {
    const skill = skills.find((item) => item.id === id);
    return skill ? categories.find((category) => category.id === skill.categoryId) : undefined;
  };

  return (
    <>
      <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'executionLog')}</Text>
      <View style={styles.chipsRow}>
        {[
          { value: 'skill' as const, label: t(lang, 'logSkill') },
          { value: 'schedule' as const, label: t(lang, 'logSchedule') },
          { value: 'custom' as const, label: t(lang, 'customLog') },
        ].map((option) => {
          const selected = logType === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => onLogTypeChange(option.value)}
              style={[
                styles.chip,
                useV11 && { backgroundColor: questTheme.colors.surfaceElevated, borderColor: questTheme.colors.border },
                selected && { backgroundColor: accent, borderColor: accent },
              ]}
            >
              <Text style={[styles.chipText, { color: questTheme.colors.text }, selected && { color: questTheme.colors.primaryText, fontWeight: '700' }]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {logType === 'schedule' ? (
        <>
          <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'todaysSchedule')}</Text>
          <View style={styles.chipsRow}>
            {todayScheduleBlocks.length === 0 ? (
              <Text style={[styles.empty, { color: questTheme.colors.textMuted, backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }]}>
                {t(lang, 'noScheduleToday')}
              </Text>
            ) : todayScheduleBlocks.map((block) => {
              const selected = scheduleBlockId === block.id;
              return (
                <TouchableOpacity
                  key={block.id}
                  onPress={() => onScheduleBlockSelect(block)}
                  style={[
                    styles.chip,
                    useV11 && { backgroundColor: questTheme.colors.surfaceElevated, borderColor: questTheme.colors.border },
                    selected && { backgroundColor: accent, borderColor: accent },
                  ]}
                >
                  <Text style={[styles.chipText, { color: questTheme.colors.text }, selected && { color: questTheme.colors.primaryText, fontWeight: '700' }]}>
                    {block.startTime} {block.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      ) : null}

      {logType !== 'custom' ? <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'selectSkill')}</Text> : null}
      <View style={styles.chipsRow}>
        {logType !== 'custom' && skills.map((skill) => {
          const selected = skill.id === skillId;
          const category = categoryForSkill(skill.id);
          return (
            <TouchableOpacity
              key={skill.id}
              onPress={() => onSkillSelect(skill.id)}
              style={[
                styles.chip,
                { backgroundColor: questTheme.colors.surfaceElevated, borderColor: questTheme.colors.border },
                selected && { backgroundColor: skill.color ?? accent, borderColor: skill.color ?? accent },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <QuestEntityIcon icon={skill.icon} systemIcon={getSkillSemanticIcon(skill)} color={skill.color} questTheme={questTheme} size="sm" />
                <Text style={[styles.chipText, { color: questTheme.colors.text }, selected && { color: questTheme.colors.primaryText, fontWeight: '700' }]}>
                  {category ? `${category.name} → ` : ''}{skill.name}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[
        styles.predictionBox,
        useV11 ? styles.v11FlatSection : null,
        { backgroundColor: useV11 ? 'transparent' : questTheme.colors.surfaceSoft, borderColor: questTheme.colors.border },
      ]}>
        <TouchableOpacity style={styles.modalSectionHeader} onPress={() => onShowPredictionChange((value) => !value)} activeOpacity={0.75}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.minimumLabel, { color: questTheme.colors.text }]}>{t(lang, 'sessionPrediction')}</Text>
            <Text style={[styles.planReason, { color: questTheme.colors.textMuted }]}>{t(lang, 'predictionOptional')}</Text>
          </View>
          <Text style={[styles.modalToggleText, { color: accent }]}>
            {showPrediction ? t(lang, 'skipPrediction') : t(lang, useV11 ? 'detailedPrediction' : 'predictionOptional')}
          </Text>
        </TouchableOpacity>

        {showPrediction && modalPredictionSchema.showDuration ? (
          <>
            <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>
              {modalIsStrength ? t(lang, 'sessionDurationOptional') : t(lang, 'predictedMinutes')}
            </Text>
            <QuestInput questTheme={questTheme} value={predictedMinutes} onChangeText={onPredictedMinutesChange} keyboardType="number-pad" placeholder="45" />
          </>
        ) : null}

        {showPrediction && modalPredictionSchema.showTargetValue && !modalIsStrength ? (
          <>
            <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'targetValueLog')}</Text>
            <QuestInput questTheme={questTheme} value={predictedValue} onChangeText={onPredictedValueChange} keyboardType="decimal-pad" placeholder="95" />
          </>
        ) : null}

        {showPrediction && modalIsStrength ? (
          <TouchableOpacity style={[styles.modalMiniToggle, { borderColor: questTheme.colors.border }]} onPress={() => onShowDetailedPredictionChange((value) => !value)}>
            <Text style={[styles.modalMiniToggleText, { color: accent }]}>
              {showDetailedPrediction ? t(lang, 'hideAdvancedFields') : t(lang, 'detailedPrediction')}
            </Text>
          </TouchableOpacity>
        ) : null}

        {showPrediction && modalPredictionSchema.showStrength && showDetailedPrediction ? (
          <>
            <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'expectedWorkingWeight')}</Text>
            <View style={styles.timeRow}>
              <QuestInput questTheme={questTheme} value={predictedStrengthWeight} onChangeText={onPredictedStrengthWeightChange} keyboardType="decimal-pad" placeholder="75" style={{ flex: 1 }} />
              <QuestInput questTheme={questTheme} value={predictedStrengthReps} onChangeText={onPredictedStrengthRepsChange} keyboardType="number-pad" placeholder={t(lang, 'expectedReps')} style={{ flex: 1 }} />
              <QuestInput questTheme={questTheme} value={predictedStrengthSets} onChangeText={onPredictedStrengthSetsChange} keyboardType="number-pad" placeholder={t(lang, 'expectedSets')} style={{ flex: 1 }} />
            </View>
            <QuestInput questTheme={questTheme} value={predictedStrengthRpe} onChangeText={onPredictedStrengthRpeChange} keyboardType="decimal-pad" placeholder={t(lang, 'expectedRPE')} />
          </>
        ) : null}

        {showPrediction && modalPredictionSchema.showQuality ? (
          <>
            <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'optionalQuality')}</Text>
            <View style={styles.qRow}>
              {[1, 2, 3, 4, 5].map((value) => {
                const rating = value as Quality;
                const selected = predictedQuality === rating;
                return (
                  <TouchableOpacity
                    key={rating}
                    onPress={() => onPredictedQualityChange(selected ? null : rating)}
                    style={[
                      styles.qBox,
                      { backgroundColor: questTheme.colors.surfaceElevated, borderColor: questTheme.colors.border },
                      selected && { borderColor: accent, backgroundColor: questTheme.colors.primarySoft },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.qEmoji, { color: questTheme.colors.text }]}>{rating}</Text>
                    <Text style={[styles.qLabel, { color: questTheme.colors.textMuted }, selected && { color: questTheme.colors.text, fontWeight: '800' }]}>
                      {qualityLabel(lang, rating)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : null}
      </View>

      <View style={styles.modalSectionHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.minimumLabel, { color: questTheme.colors.text }]}>{t(lang, 'actualRecord')}</Text>
          <Text style={[styles.planReason, { color: questTheme.colors.textMuted }]}>{t(lang, 'recordedWithoutPrediction')}</Text>
        </View>
        <TouchableOpacity style={[styles.modalMiniToggle, { borderColor: questTheme.colors.border }]} onPress={() => onShowAdvancedFieldsChange((value) => !value)}>
          <Text style={[styles.modalMiniToggleText, { color: accent }]}>
            {showAdvancedFields ? t(lang, 'hideAdvancedFields') : t(lang, 'showAdvancedFields')}
          </Text>
        </TouchableOpacity>
      </View>

      {modalIsStrength ? (
        <View style={[styles.chipsRow, { marginTop: 8 }]}>
          {[
            { value: 'simple' as const, label: t(lang, 'simpleStrengthLog') },
            { value: 'session' as const, label: t(lang, 'trainingSessionLog') },
          ].map((option) => {
            const selected = strengthLogMode === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                onPress={() => onStrengthLogModeChange(option.value)}
                style={[
                  styles.chip,
                  { backgroundColor: questTheme.colors.surfaceElevated, borderColor: questTheme.colors.border },
                  selected && { backgroundColor: accent, borderColor: accent },
                ]}
              >
                <Text style={[styles.chipText, { color: questTheme.colors.text }, selected && { color: questTheme.colors.primaryText, fontWeight: '700' }]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>
        {modalIsStrength ? t(lang, 'sessionDurationOptional') : t(lang, 'actualMinutes')}
      </Text>
      <QuestInput
        questTheme={questTheme}
        value={minutes}
        onChangeText={onMinutesChange}
        keyboardType="number-pad"
        placeholder="30"
        returnKeyType="done"
        onSubmitEditing={Keyboard.dismiss}
        blurOnSubmit
      />

      <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'optionalQuality')}</Text>
      <View style={styles.qRow}>
        {[1, 2, 3, 4, 5].map((value) => {
          const rating = value as Quality;
          const selected = quality === rating;
          return (
            <TouchableOpacity
              key={rating}
              onPress={() => onQualityChange(selected ? null : rating)}
              style={[
                styles.qBox,
                { backgroundColor: questTheme.colors.surfaceElevated, borderColor: questTheme.colors.border },
                selected && { borderColor: accent, backgroundColor: questTheme.colors.primarySoft },
              ]}
              activeOpacity={0.7}
            >
              <Text style={[styles.qEmoji, { color: questTheme.colors.text }]}>{rating}</Text>
              <Text style={[styles.qLabel, { color: questTheme.colors.textMuted }, selected && { color: questTheme.colors.text, fontWeight: '800' }]}>{qualityLabel(lang, rating)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {showAdvancedFields ? (
        <>
          <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'difficulty')}</Text>
          <View style={styles.qRow}>
            {[1, 2, 3, 4, 5].map((value) => {
              const rating = value as Quality;
              const selected = difficulty === rating;
              return (
                <TouchableOpacity
                  key={rating}
                  onPress={() => onDifficultyChange(selected ? null : rating)}
                  style={[
                    styles.qBox,
                    { backgroundColor: questTheme.colors.surfaceElevated, borderColor: questTheme.colors.border },
                    selected && { borderColor: accent, backgroundColor: questTheme.colors.primarySoft },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.qEmoji, { color: questTheme.colors.text }]}>{rating}</Text>
                  <Text style={[styles.qLabel, { color: questTheme.colors.textMuted }, selected && { color: questTheme.colors.text, fontWeight: '800' }]}>{qualityLabel(lang, rating)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {([
            ['mentalCost', mentalCost, onMentalCostChange],
            ['physicalCost', physicalCost, onPhysicalCostChange],
            ['emotionalCost', emotionalCost, onEmotionalCostChange],
          ] as const).map(([key, selectedValue, setValue]) => (
            <View key={key}>
              <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, key)}</Text>
              <View style={styles.qRow}>
                {[1, 2, 3, 4, 5].map((value) => {
                  const rating = value as Quality;
                  const selected = selectedValue === rating;
                  return (
                    <TouchableOpacity
                      key={rating}
                      onPress={() => setValue(selected ? null : rating)}
                      style={[
                        styles.qBox,
                        { backgroundColor: questTheme.colors.surfaceElevated, borderColor: questTheme.colors.border },
                        selected && { borderColor: accent, backgroundColor: questTheme.colors.primarySoft },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.qEmoji, { color: questTheme.colors.text }]}>{rating}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </>
      ) : null}

      {(() => {
        const rawSchemaFields = getRecordingFieldsForSkill(selectedSkill);
        if (!selectedSkill || logType === 'custom' || rawSchemaFields.length === 0) return null;
        const quickKeys = modalIsStrength
          ? new Set(['weight', 'sets', 'reps', 'quality'])
          : new Set(['durationMinutes', 'quality', 'wordCount', 'amount']);
        const schemaFields = showAdvancedFields
          ? rawSchemaFields
          : rawSchemaFields.filter((field) => field.required || quickKeys.has(field.key)).slice(0, 4);
        const setSchemaValue = (key: string, value: string | number | boolean) => {
          onSchemaValuesChange((current) => ({ ...current, [key]: value }));
        };
        const renderField = (field: DomainRecordingField) => {
          const label = lang === 'en' ? field.label : field.labelZh;
          const value = schemaValues[field.key];
          if (field.type === 'select') {
            return (
              <View key={field.key}>
                <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{label}</Text>
                <View style={styles.chipsRow}>
                  {(field.options || []).map((option) => {
                    const selected = value === option.value;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        onPress={() => setSchemaValue(field.key, option.value)}
                        style={[
                          styles.chip,
                          { backgroundColor: questTheme.colors.surfaceElevated, borderColor: questTheme.colors.border },
                          selected && { backgroundColor: accent, borderColor: accent },
                        ]}
                      >
                        <Text style={[styles.chipText, { color: questTheme.colors.text }, selected && { color: questTheme.colors.primaryText }]}>
                          {lang === 'en' ? option.label : option.labelZh}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          }
          if (field.type === 'rating') {
            const max = field.key === 'rpe' ? 10 : 5;
            return (
              <View key={field.key}>
                <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{label}</Text>
                <View style={styles.qRow}>
                  {Array.from({ length: max }, (_, index) => index + 1).map((rating) => {
                    const selected = Number(value) === rating;
                    return (
                      <TouchableOpacity
                        key={rating}
                        onPress={() => setSchemaValue(field.key, rating)}
                        style={[
                          styles.qBox,
                          { backgroundColor: questTheme.colors.surfaceElevated, borderColor: questTheme.colors.border },
                          selected && { borderColor: accent, backgroundColor: questTheme.colors.primarySoft },
                        ]}
                      >
                        <Text style={[styles.qEmoji, { color: questTheme.colors.text }]}>{rating}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          }
          if (field.type === 'boolean') {
            const selected = Boolean(value);
            return (
              <TouchableOpacity key={field.key} style={styles.curriculumRow} onPress={() => setSchemaValue(field.key, !selected)}>
                <Text style={styles.curriculumCheck}>{selected ? '✓' : '○'}</Text>
                <Text style={[styles.planReason, { color: questTheme.colors.text }]}>{label}</Text>
              </TouchableOpacity>
            );
          }
          return (
            <View key={field.key}>
              <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{label}{field.unit ? ` (${field.unit})` : ''}</Text>
              <QuestInput
                questTheme={questTheme}
                value={value == null ? '' : String(value)}
                onChangeText={(text) => setSchemaValue(field.key, text)}
                keyboardType={field.type === 'number' || field.type === 'duration' ? 'decimal-pad' : 'default'}
                placeholder={field.defaultValue == null ? label : String(field.defaultValue)}
                style={field.type === 'text' ? { minHeight: 58, textAlignVertical: 'top' } : undefined}
                multiline={field.type === 'text'}
              />
            </View>
          );
        };
        return (
          <View style={[styles.progressUpdateBox, { backgroundColor: questTheme.colors.surfaceSoft, borderColor: questTheme.colors.border }]}>
            <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'domainTemplate')}</Text>
            <Text style={[styles.planReason, { color: questTheme.colors.textMuted }]}>
              {showAdvancedFields ? t(lang, 'advancedFields') : t(lang, 'quickLog')}
            </Text>
            {schemaFields.map(renderField)}
          </View>
        );
      })()}

      {modalIsStrength && strengthLogMode === 'session' ? (
        <View style={[styles.progressUpdateBox, { backgroundColor: questTheme.colors.surfaceSoft, borderColor: questTheme.colors.border }]}>
          <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'trainingSessionLog')}</Text>
          <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'sessionType')}</Text>
          <View style={styles.chipsRow}>
            {['push', 'pull', 'legs', 'upper', 'lower', 'full_body', 'custom'].map((value) => {
              const selected = sessionType === value;
              return (
                <TouchableOpacity
                  key={value}
                  onPress={() => onSessionTypeChange(value)}
                  style={[
                    styles.chip,
                    { backgroundColor: questTheme.colors.surfaceElevated, borderColor: questTheme.colors.border },
                    selected && { backgroundColor: accent, borderColor: accent },
                  ]}
                >
                  <Text style={[styles.chipText, { color: questTheme.colors.text }, selected && { color: questTheme.colors.primaryText, fontWeight: '700' }]}>{value.replace('_', ' ')}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {exerciseEntries.slice(0, 5).map((entry, index) => (
            <View key={entry.id} style={[styles.exerciseEntryCard, { backgroundColor: questTheme.colors.surfaceElevated, borderColor: questTheme.colors.border }]}>
              <View style={styles.modalSectionHeader}>
                <Text style={[styles.minimumLabel, { color: questTheme.colors.text }]}>{t(lang, 'exerciseName')} {index + 1}</Text>
                {exerciseEntries.length > 1 ? (
                  <TouchableOpacity onPress={() => onExerciseEntriesChange((current) => current.filter((item) => item.id !== entry.id))}>
                    <Text style={[styles.modalMiniToggleText, { color: questTheme.colors.danger }]}>{t(lang, 'delete')}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <QuestInput
                questTheme={questTheme}
                value={entry.exerciseName}
                onChangeText={(text) => onExerciseEntriesChange((current) => current.map((item) => item.id === entry.id ? { ...item, exerciseName: text } : item))}
                placeholder={t(lang, 'exerciseName')}
              />
              <View style={styles.timeRow}>
                <QuestInput questTheme={questTheme} value={entry.weight} onChangeText={(text) => onExerciseEntriesChange((current) => current.map((item) => item.id === entry.id ? { ...item, weight: text } : item))} keyboardType="decimal-pad" placeholder={t(lang, 'actualWorkingWeight')} style={{ flex: 1 }} />
                <QuestInput questTheme={questTheme} value={entry.sets} onChangeText={(text) => onExerciseEntriesChange((current) => current.map((item) => item.id === entry.id ? { ...item, sets: text } : item))} keyboardType="number-pad" placeholder={t(lang, 'actualSets')} style={{ flex: 1 }} />
                <QuestInput questTheme={questTheme} value={entry.reps} onChangeText={(text) => onExerciseEntriesChange((current) => current.map((item) => item.id === entry.id ? { ...item, reps: text } : item))} keyboardType="number-pad" placeholder={t(lang, 'actualReps')} style={{ flex: 1 }} />
              </View>
              {showAdvancedFields ? (
                <QuestInput
                  questTheme={questTheme}
                  value={entry.rpe}
                  onChangeText={(text) => onExerciseEntriesChange((current) => current.map((item) => item.id === entry.id ? { ...item, rpe: text } : item))}
                  keyboardType="decimal-pad"
                  placeholder={t(lang, 'actualRPE')}
                />
              ) : null}
            </View>
          ))}
          {exerciseEntries.length < 5 ? (
            <QuestButton
              questTheme={questTheme}
              variant="secondary"
              icon="plus"
              label={t(lang, 'addExercise')}
              onPress={() => onExerciseEntriesChange((current) => [...current, { id: `exercise-${Date.now()}`, exerciseName: '', weight: '', sets: '3', reps: '', rpe: '', note: '' }])}
              style={{ marginTop: 10 }}
            />
          ) : null}
        </View>
      ) : null}

      {(() => {
        if (!selectedSkill || logType === 'custom') return null;
        const progressType = selectedSkill.metricConfig?.metricType ?? selectedSkill.progressType ?? 'time_based';
        const checklistItems = selectedSkill.metricConfig?.checklistItems ?? selectedSkill.curriculumItems ?? [];
        return (
          <View style={[styles.progressUpdateBox, { backgroundColor: questTheme.colors.surfaceSoft, borderColor: questTheme.colors.border }]}>
            <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{modalIsStrength ? t(lang, 'actualPerformance') : t(lang, 'progressUpdate')}</Text>
            {progressType === 'time_based' ? (
              <Text style={styles.planReason}>
                {t(lang, 'metricDescTime')}{'\n'}{t(lang, 'appliedToProgress')}: +{minutes || 0} {t(lang, 'minutes')}
              </Text>
            ) : progressType === 'target_value' ? (
              <>
                <Text style={styles.planReason}>{t(lang, 'metricDescTarget')}</Text>
                <Text style={styles.planReason}>
                  {(selectedSkill.metricConfig?.currentValue ?? selectedSkill.currentValue ?? 0)}{selectedSkill.metricConfig?.unit ?? selectedSkill.unit ?? ''} / {(selectedSkill.metricConfig?.targetValue ?? selectedSkill.targetValue ?? 0)}{selectedSkill.metricConfig?.unit ?? selectedSkill.unit ?? ''}
                </Text>
                <QuestInput questTheme={questTheme} value={newCurrentValue} onChangeText={onNewCurrentValueChange} keyboardType="decimal-pad" placeholder={t(lang, 'newCurrentValue')} />
                {modalIsStrength && strengthLogMode === 'simple' ? (
                  <View style={styles.timeRow}>
                    <QuestInput questTheme={questTheme} value={strengthWeight} onChangeText={onStrengthWeightChange} keyboardType="decimal-pad" placeholder={t(lang, 'actualWorkingWeight')} style={{ flex: 1 }} />
                    <QuestInput questTheme={questTheme} value={strengthReps} onChangeText={onStrengthRepsChange} keyboardType="number-pad" placeholder={t(lang, 'actualReps')} style={{ flex: 1 }} />
                    <QuestInput questTheme={questTheme} value={strengthSets} onChangeText={onStrengthSetsChange} keyboardType="number-pad" placeholder={t(lang, 'actualSets')} style={{ flex: 1 }} />
                  </View>
                ) : null}
              </>
            ) : progressType === 'frequency' ? (
              <TouchableOpacity style={styles.curriculumRow} onPress={() => onFrequencyCompletedChange((value) => !value)}>
                <Text style={styles.curriculumCheck}>{frequencyCompleted ? '✓' : '○'}</Text>
                <Text style={styles.planReason}>{t(lang, 'metricDescFrequency')}</Text>
              </TouchableOpacity>
            ) : progressType === 'curriculum' || progressType === 'checklist' ? (
              <>
                <Text style={styles.planReason}>{t(lang, 'metricDescChecklist')}</Text>
                {checklistItems.length === 0 ? (
                  <Text style={styles.planReason}>{t(lang, 'noProgressItems')}</Text>
                ) : checklistItems.map((item) => {
                  const checked = completedCurriculumItemIds.includes(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.curriculumRow}
                      onPress={() => onCompletedCurriculumItemIdsChange((ids) => checked ? ids.filter((id) => id !== item.id) : [...ids, item.id])}
                    >
                      <Text style={styles.curriculumCheck}>{checked || item.completed ? '✓' : '○'}</Text>
                      <Text style={styles.planReason}>{item.title}</Text>
                    </TouchableOpacity>
                  );
                })}
              </>
            ) : progressType === 'performance_log' ? (
              <>
                <Text style={styles.planReason}>{t(lang, 'metricDescPerformance')}</Text>
                {!modalIsStrength ? <QuestInput questTheme={questTheme} value={performanceValue} onChangeText={onPerformanceValueChange} keyboardType="decimal-pad" placeholder={t(lang, 'performanceValue')} /> : null}
                {selectedSkill.metricConfig?.performanceType === 'strength' && strengthLogMode === 'simple' ? (
                  <View style={styles.timeRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'actualWorkingWeight')}</Text>
                      <QuestInput questTheme={questTheme} value={strengthWeight} onChangeText={onStrengthWeightChange} keyboardType="decimal-pad" placeholder="75" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'actualReps')}</Text>
                      <QuestInput questTheme={questTheme} value={strengthReps} onChangeText={onStrengthRepsChange} keyboardType="number-pad" placeholder="5" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'actualSets')}</Text>
                      <QuestInput questTheme={questTheme} value={strengthSets} onChangeText={onStrengthSetsChange} keyboardType="number-pad" placeholder="3" />
                    </View>
                  </View>
                ) : null}
                <QuestInput questTheme={questTheme} value={strengthRpe} onChangeText={onStrengthRpeChange} keyboardType="decimal-pad" placeholder={t(lang, 'actualRPE')} />
              </>
            ) : progressType === 'quality_score' ? (
              <Text style={styles.planReason}>{t(lang, 'metricDescQuality')}{'\n'}{t(lang, 'qualityScore')}: {quality ? `${quality}/5` : t(lang, 'quality')}</Text>
            ) : progressType === 'state_based' ? (
              <>
                <Text style={styles.planReason}>{t(lang, 'metricDescState')}</Text>
                <QuestInput questTheme={questTheme} value={stateValue} onChangeText={onStateValueChange} keyboardType="decimal-pad" placeholder={t(lang, 'stateMetric')} />
              </>
            ) : progressType === 'money_based' ? (
              <>
                <Text style={styles.planReason}>{t(lang, 'metricDescMoney')}</Text>
                <View style={styles.timeRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>{t(lang, 'amountAdded')}</Text>
                    <QuestInput questTheme={questTheme} value={amountAdded} onChangeText={onAmountAddedChange} keyboardType="decimal-pad" placeholder="100" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>{t(lang, 'newCurrentAmount')}</Text>
                    <QuestInput questTheme={questTheme} value={newCurrentAmount} onChangeText={onNewCurrentAmountChange} keyboardType="decimal-pad" placeholder="500" />
                  </View>
                </View>
              </>
            ) : progressType === 'binary' ? (
              <TouchableOpacity style={styles.curriculumRow} onPress={() => onBinaryCompletedChange((value) => !value)}>
                <Text style={styles.curriculumCheck}>{binaryCompleted ? '✓' : '○'}</Text>
                <Text style={styles.planReason}>{t(lang, 'metricDescBinary')}</Text>
              </TouchableOpacity>
            ) : progressType === 'qualitative' ? (
              <>
                <Text style={styles.planReason}>{t(lang, 'metricDescQualitative')}</Text>
                <QuestInput questTheme={questTheme} value={qualitativeSummary} onChangeText={onQualitativeSummaryChange} style={{ height: 70, textAlignVertical: 'top' }} multiline placeholder={t(lang, 'qualitativeSummary')} />
              </>
            ) : (
              <Text style={styles.planReason}>{t(lang, 'noNumericProgress')}</Text>
            )}
          </View>
        );
      })()}

      <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'noteOptional')}</Text>
      <QuestInput questTheme={questTheme} value={note} onChangeText={onNoteChange} style={{ height: 80, textAlignVertical: 'top' }} multiline placeholder={t(lang, 'notePlaceholder')} />
    </>
  );
}

const WebView = View as any;

function V11Section({
  children,
  hint,
  questTheme,
  title,
}: {
  children: React.ReactNode;
  hint?: string;
  questTheme: Props['questTheme'];
  title: string;
}) {
  return (
    <WebView dataSet={{ 'v11-record-role': 'section' }} style={[styles.v11Section, { borderBottomColor: questTheme.colors.border }]}>
      <View style={styles.v11SectionHeading}>
        <Text style={[styles.v11SectionTitle, { color: questTheme.colors.text }]}>{title}</Text>
        {hint ? <Text style={[styles.v11SectionHint, { color: questTheme.colors.textMuted }]}>{hint}</Text> : null}
      </View>
      {children}
    </WebView>
  );
}

function V11Segmented<T extends string>({
  accent,
  onChange,
  options,
  questTheme,
  value,
}: {
  accent: string;
  onChange: (value: T) => void;
  options: { label: string; value: T }[];
  questTheme: Props['questTheme'];
  value: T;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      style={[styles.v11Segmented, { backgroundColor: questTheme.colors.surfaceSoft }]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <TouchableOpacity
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            activeOpacity={0.76}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[
              styles.v11Segment,
              selected && {
                backgroundColor: questTheme.colors.surfaceElevated,
                borderColor: accent,
              },
            ]}
          >
            <Text
              numberOfLines={2}
              style={[
                styles.v11SegmentText,
                { color: selected ? questTheme.colors.text : questTheme.colors.textMuted },
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function V11RatingPicker({
  accent,
  labelMode = 'semantic',
  lang,
  max = 5,
  onChange,
  questTheme,
  value,
}: {
  accent: string;
  labelMode?: 'semantic' | 'number';
  lang: Lang;
  max?: number;
  onChange: (value: Quality | null) => void;
  questTheme: Props['questTheme'];
  value: Quality | null;
}) {
  return (
    <View style={styles.v11RatingRow}>
      {Array.from({ length: max }, (_, index) => index + 1).map((number) => {
        const rating = number as Quality;
        const selected = value === rating;
        return (
          <TouchableOpacity
            accessibilityLabel={labelMode === 'semantic' && max === 5 ? `${rating} ${qualityLabel(lang, rating)}` : String(rating)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            activeOpacity={0.74}
            key={number}
            onPress={() => onChange(selected ? null : rating)}
            style={[
              styles.v11Rating,
              {
                backgroundColor: questTheme.colors.surfaceSoft,
                borderColor: selected ? accent : questTheme.colors.border,
              },
              selected && { backgroundColor: questTheme.colors.primarySoft },
            ]}
          >
            <Text style={[styles.v11RatingNumber, { color: questTheme.colors.text }]}>{number}</Text>
            {labelMode === 'semantic' && max === 5 ? (
              <Text numberOfLines={1} style={[styles.v11RatingLabel, { color: selected ? questTheme.colors.text : questTheme.colors.textMuted }]}>
                {qualityLabel(lang, rating)}
              </Text>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function V11RecordProgressContent(props: Props) {
  const {
    accent,
    amountAdded,
    binaryCompleted,
    categories,
    completedCurriculumItemIds,
    difficulty,
    emotionalCost,
    exerciseEntries,
    frequencyCompleted,
    lang,
    logType,
    mentalCost,
    minutes,
    newCurrentAmount,
    newCurrentValue,
    note,
    performanceValue,
    physicalCost,
    predictedMinutes,
    predictedQuality,
    predictedStrengthReps,
    predictedStrengthRpe,
    predictedStrengthSets,
    predictedStrengthWeight,
    predictedValue,
    quality,
    qualitativeSummary,
    questTheme,
    scheduleBlockId,
    schemaValues,
    sessionType,
    showAdvancedFields,
    showDetailedPrediction,
    showPrediction,
    skillId,
    skills,
    stateValue,
    strengthLogMode,
    strengthReps,
    strengthRpe,
    strengthSets,
    strengthWeight,
    todayScheduleBlocks,
  } = props;
  const [entityPickerOpen, setEntityPickerOpen] = useState(!skillId);
  const [schedulePickerOpen, setSchedulePickerOpen] = useState(!scheduleBlockId);
  const [entityQuery, setEntityQuery] = useState('');
  const selectedSkill = skills.find((skill) => skill.id === skillId);
  const selectedSchedule = todayScheduleBlocks.find((block) => block.id === scheduleBlockId);
  const predictionSchema = logType === 'custom'
    ? { ...getPredictionSchemaForSkill(undefined), showDuration: true, showQuality: true }
    : getPredictionSchemaForSkill(selectedSkill);
  const isStrength = logType !== 'custom' && isStrengthPredictionSkill(selectedSkill);
  const categoryForSkill = (skill: Skill) => categories.find((category) => category.id === skill.categoryId);
  const filteredSkills = useMemo(() => {
    const query = entityQuery.trim().toLocaleLowerCase();
    if (!query) return skills;
    return skills.filter((skill) => {
      const category = categoryForSkill(skill);
      return `${skill.name} ${category?.name ?? ''}`.toLocaleLowerCase().includes(query);
    });
  }, [categories, entityQuery, skills]);

  const inputLabel = (label: string, required = false) => (
    <Text style={[styles.v11FieldLabel, { color: questTheme.colors.textMuted }]}>
      {label}{required ? ' *' : ''}
    </Text>
  );

  const renderSkillRow = (skill: Skill) => {
    const selected = skill.id === skillId;
    const category = categoryForSkill(skill);
    return (
      <TouchableOpacity
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        key={skill.id}
        onPress={() => {
          props.onSkillSelect(skill.id);
          setEntityPickerOpen(false);
        }}
        style={[
          styles.v11EntityOption,
          { borderBottomColor: questTheme.colors.border },
          selected && { backgroundColor: questTheme.colors.primarySoft },
        ]}
      >
        <QuestEntityIcon icon={skill.icon} systemIcon={getSkillSemanticIcon(skill)} color={skill.color} questTheme={questTheme} size="sm" />
        <View style={styles.v11EntityCopy}>
          <Text numberOfLines={2} style={[styles.v11EntityName, { color: questTheme.colors.text }]}>{skill.name}</Text>
          {category ? <Text numberOfLines={1} style={[styles.v11EntityMeta, { color: questTheme.colors.textMuted }]}>{category.name}</Text> : null}
        </View>
        {selected ? <Text style={[styles.v11SelectedMark, { color: accent }]}>✓</Text> : null}
      </TouchableOpacity>
    );
  };

  const predictionSummary = [
    predictedMinutes ? `${predictedMinutes} ${t(lang, 'minutes')}` : '',
    predictedQuality ? `${t(lang, 'quality')} ${predictedQuality}/5` : '',
    predictedValue ? `${t(lang, 'targetValueLog')} ${predictedValue}` : '',
    predictedStrengthWeight ? `${predictedStrengthWeight} kg` : '',
    predictedStrengthSets && predictedStrengthReps ? `${predictedStrengthSets} × ${predictedStrengthReps}` : '',
  ].filter(Boolean).join(' · ');

  const setSchemaValue = (key: string, value: string | number | boolean) => {
    props.onSchemaValuesChange((current) => ({ ...current, [key]: value }));
  };

  const renderSchemaField = (field: DomainRecordingField) => {
    const label = lang === 'en' ? field.label : field.labelZh;
    const value = schemaValues[field.key];
    if (field.type === 'select') {
      return (
        <View key={field.key} style={styles.v11FieldGroup}>
          {inputLabel(label, field.required)}
          <View style={styles.v11ChoiceWrap}>
            {(field.options || []).map((option) => {
              const selected = value === option.value;
              return (
                <TouchableOpacity
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  key={option.value}
                  onPress={() => setSchemaValue(field.key, option.value)}
                  style={[
                    styles.v11Choice,
                    { backgroundColor: questTheme.colors.surfaceSoft, borderColor: selected ? accent : questTheme.colors.border },
                    selected && { backgroundColor: questTheme.colors.primarySoft },
                  ]}
                >
                  <Text style={[styles.v11ChoiceText, { color: questTheme.colors.text }]}>{lang === 'en' ? option.label : option.labelZh}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );
    }
    if (field.type === 'rating') {
      const max = field.key === 'rpe' ? 10 : 5;
      return (
        <View key={field.key} style={styles.v11FieldGroup}>
          {inputLabel(label, field.required)}
          <View style={styles.v11RatingRow}>
            {Array.from({ length: max }, (_, index) => index + 1).map((rating) => {
              const selected = Number(value) === rating;
              return (
                <TouchableOpacity
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  key={rating}
                  onPress={() => setSchemaValue(field.key, rating)}
                  style={[
                    styles.v11Rating,
                    { backgroundColor: questTheme.colors.surfaceSoft, borderColor: selected ? accent : questTheme.colors.border },
                    selected && { backgroundColor: questTheme.colors.primarySoft },
                  ]}
                >
                  <Text style={[styles.v11RatingNumber, { color: questTheme.colors.text }]}>{rating}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );
    }
    if (field.type === 'boolean') {
      const selected = Boolean(value);
      return (
        <TouchableOpacity
          accessibilityRole="checkbox"
          accessibilityState={{ checked: selected }}
          key={field.key}
          onPress={() => setSchemaValue(field.key, !selected)}
          style={[styles.v11ToggleRow, { borderBottomColor: questTheme.colors.border }]}
        >
          <Text style={[styles.v11Check, { color: accent }]}>{selected ? '✓' : '○'}</Text>
          <Text style={[styles.v11Body, { color: questTheme.colors.text }]}>{label}</Text>
        </TouchableOpacity>
      );
    }
    return (
      <View key={field.key} style={styles.v11FieldGroup}>
        {inputLabel(`${label}${field.unit ? ` (${field.unit})` : ''}`, field.required)}
        <QuestInput
          questTheme={questTheme}
          value={value == null ? '' : String(value)}
          onChangeText={(text) => setSchemaValue(field.key, text)}
          keyboardType={field.type === 'number' || field.type === 'duration' ? 'decimal-pad' : 'default'}
          placeholder={field.defaultValue == null ? label : String(field.defaultValue)}
          style={[styles.v11Input, field.type === 'text' ? styles.v11TextArea : null]}
          multiline={field.type === 'text'}
        />
      </View>
    );
  };

  const renderProgressFields = () => {
    if (!selectedSkill || logType === 'custom') return null;
    const progressType = selectedSkill.metricConfig?.metricType ?? selectedSkill.progressType ?? 'time_based';
    const checklistItems = selectedSkill.metricConfig?.checklistItems ?? selectedSkill.curriculumItems ?? [];
    if (progressType === 'time_based') {
      return <Text style={[styles.v11Body, { color: questTheme.colors.textMuted }]}>{t(lang, 'metricDescTime')} · +{minutes || 0} {t(lang, 'minutes')}</Text>;
    }
    if (progressType === 'target_value') {
      return (
        <>
          <Text style={[styles.v11Body, { color: questTheme.colors.textMuted }]}>{t(lang, 'metricDescTarget')}</Text>
          <Text style={[styles.v11MetricReading, { color: questTheme.colors.text }]}>
            {(selectedSkill.metricConfig?.currentValue ?? selectedSkill.currentValue ?? 0)}{selectedSkill.metricConfig?.unit ?? selectedSkill.unit ?? ''} / {(selectedSkill.metricConfig?.targetValue ?? selectedSkill.targetValue ?? 0)}{selectedSkill.metricConfig?.unit ?? selectedSkill.unit ?? ''}
          </Text>
          <QuestInput questTheme={questTheme} value={newCurrentValue} onChangeText={props.onNewCurrentValueChange} keyboardType="decimal-pad" placeholder={t(lang, 'newCurrentValue')} style={styles.v11Input} />
          {isStrength && strengthLogMode === 'simple' ? (
            <View style={styles.v11InputGrid}>
              <QuestInput questTheme={questTheme} value={strengthWeight} onChangeText={props.onStrengthWeightChange} keyboardType="decimal-pad" placeholder={t(lang, 'actualWorkingWeight')} style={styles.v11GridInput} />
              <QuestInput questTheme={questTheme} value={strengthReps} onChangeText={props.onStrengthRepsChange} keyboardType="number-pad" placeholder={t(lang, 'actualReps')} style={styles.v11GridInput} />
              <QuestInput questTheme={questTheme} value={strengthSets} onChangeText={props.onStrengthSetsChange} keyboardType="number-pad" placeholder={t(lang, 'actualSets')} style={styles.v11GridInput} />
            </View>
          ) : null}
        </>
      );
    }
    if (progressType === 'frequency') {
      return (
        <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: frequencyCompleted }} onPress={() => props.onFrequencyCompletedChange((value) => !value)} style={styles.v11ToggleRow}>
          <Text style={[styles.v11Check, { color: accent }]}>{frequencyCompleted ? '✓' : '○'}</Text>
          <Text style={[styles.v11Body, { color: questTheme.colors.text }]}>{t(lang, 'metricDescFrequency')}</Text>
        </TouchableOpacity>
      );
    }
    if (progressType === 'curriculum' || progressType === 'checklist') {
      return (
        <>
          <Text style={[styles.v11Body, { color: questTheme.colors.textMuted }]}>{t(lang, 'metricDescChecklist')}</Text>
          {checklistItems.length === 0 ? <Text style={[styles.v11Body, { color: questTheme.colors.textMuted }]}>{t(lang, 'noProgressItems')}</Text> : checklistItems.map((item) => {
            const checked = completedCurriculumItemIds.includes(item.id);
            return (
              <TouchableOpacity
                accessibilityRole="checkbox"
                accessibilityState={{ checked: checked || item.completed }}
                key={item.id}
                onPress={() => props.onCompletedCurriculumItemIdsChange((ids) => checked ? ids.filter((id) => id !== item.id) : [...ids, item.id])}
                style={[styles.v11ToggleRow, { borderBottomColor: questTheme.colors.border }]}
              >
                <Text style={[styles.v11Check, { color: accent }]}>{checked || item.completed ? '✓' : '○'}</Text>
                <Text style={[styles.v11Body, { color: questTheme.colors.text }]}>{item.title}</Text>
              </TouchableOpacity>
            );
          })}
        </>
      );
    }
    if (progressType === 'performance_log') {
      return (
        <>
          <Text style={[styles.v11Body, { color: questTheme.colors.textMuted }]}>{t(lang, 'metricDescPerformance')}</Text>
          {!isStrength ? <QuestInput questTheme={questTheme} value={performanceValue} onChangeText={props.onPerformanceValueChange} keyboardType="decimal-pad" placeholder={t(lang, 'performanceValue')} style={styles.v11Input} /> : null}
          {selectedSkill.metricConfig?.performanceType === 'strength' && strengthLogMode === 'simple' ? (
            <View style={styles.v11InputGrid}>
              <QuestInput questTheme={questTheme} value={strengthWeight} onChangeText={props.onStrengthWeightChange} keyboardType="decimal-pad" placeholder={t(lang, 'actualWorkingWeight')} style={styles.v11GridInput} />
              <QuestInput questTheme={questTheme} value={strengthReps} onChangeText={props.onStrengthRepsChange} keyboardType="number-pad" placeholder={t(lang, 'actualReps')} style={styles.v11GridInput} />
              <QuestInput questTheme={questTheme} value={strengthSets} onChangeText={props.onStrengthSetsChange} keyboardType="number-pad" placeholder={t(lang, 'actualSets')} style={styles.v11GridInput} />
            </View>
          ) : null}
          {isStrength ? <QuestInput questTheme={questTheme} value={strengthRpe} onChangeText={props.onStrengthRpeChange} keyboardType="decimal-pad" placeholder={t(lang, 'actualRPE')} style={styles.v11Input} /> : null}
        </>
      );
    }
    if (progressType === 'quality_score') {
      return <Text style={[styles.v11Body, { color: questTheme.colors.textMuted }]}>{t(lang, 'metricDescQuality')} · {quality ? `${quality}/5` : t(lang, 'notSet')}</Text>;
    }
    if (progressType === 'state_based') {
      return (
        <>
          <Text style={[styles.v11Body, { color: questTheme.colors.textMuted }]}>{t(lang, 'metricDescState')}</Text>
          <QuestInput questTheme={questTheme} value={stateValue} onChangeText={props.onStateValueChange} keyboardType="decimal-pad" placeholder={t(lang, 'stateMetric')} style={styles.v11Input} />
        </>
      );
    }
    if (progressType === 'money_based') {
      return (
        <>
          <Text style={[styles.v11Body, { color: questTheme.colors.textMuted }]}>{t(lang, 'metricDescMoney')}</Text>
          <View style={styles.v11InputGridTwo}>
            <View style={styles.v11GridField}>{inputLabel(t(lang, 'amountAdded'))}<QuestInput questTheme={questTheme} value={amountAdded} onChangeText={props.onAmountAddedChange} keyboardType="decimal-pad" placeholder="100" style={styles.v11Input} /></View>
            <View style={styles.v11GridField}>{inputLabel(t(lang, 'newCurrentAmount'))}<QuestInput questTheme={questTheme} value={newCurrentAmount} onChangeText={props.onNewCurrentAmountChange} keyboardType="decimal-pad" placeholder="500" style={styles.v11Input} /></View>
          </View>
        </>
      );
    }
    if (progressType === 'binary') {
      return (
        <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: binaryCompleted }} onPress={() => props.onBinaryCompletedChange((value) => !value)} style={styles.v11ToggleRow}>
          <Text style={[styles.v11Check, { color: accent }]}>{binaryCompleted ? '✓' : '○'}</Text>
          <Text style={[styles.v11Body, { color: questTheme.colors.text }]}>{t(lang, 'metricDescBinary')}</Text>
        </TouchableOpacity>
      );
    }
    if (progressType === 'qualitative') {
      return (
        <>
          <Text style={[styles.v11Body, { color: questTheme.colors.textMuted }]}>{t(lang, 'metricDescQualitative')}</Text>
          <QuestInput questTheme={questTheme} value={qualitativeSummary} onChangeText={props.onQualitativeSummaryChange} style={[styles.v11Input, styles.v11TextArea]} multiline placeholder={t(lang, 'qualitativeSummary')} />
        </>
      );
    }
    return <Text style={[styles.v11Body, { color: questTheme.colors.textMuted }]}>{t(lang, 'noNumericProgress')}</Text>;
  };

  const schemaFields = selectedSkill && logType !== 'custom' ? getRecordingFieldsForSkill(selectedSkill) : [];

  return (
    <WebView dataSet={{ 'v11-record-role': 'form' }} style={styles.v11Root}>
      <V11Section questTheme={questTheme} title={t(lang, 'recordSource')}>
        <V11Segmented
          accent={accent}
          onChange={(value) => {
            props.onLogTypeChange(value);
            if (value === 'skill') setEntityPickerOpen(!skillId);
            if (value === 'schedule') setSchedulePickerOpen(!scheduleBlockId);
          }}
          options={[
            { value: 'skill', label: t(lang, 'logSkill') },
            { value: 'schedule', label: t(lang, 'logSchedule') },
            { value: 'custom', label: t(lang, 'customLog') },
          ]}
          questTheme={questTheme}
          value={logType}
        />

        {logType === 'skill' ? (
          <View style={styles.v11SelectionArea}>
            {selectedSkill ? (
              <View style={[styles.v11SelectedEntity, { backgroundColor: questTheme.colors.surfaceSoft }]}>
                <QuestEntityIcon icon={selectedSkill.icon} systemIcon={getSkillSemanticIcon(selectedSkill)} color={selectedSkill.color} questTheme={questTheme} size="sm" />
                <View style={styles.v11EntityCopy}>
                  <Text numberOfLines={2} style={[styles.v11EntityName, { color: questTheme.colors.text }]}>{selectedSkill.name}</Text>
                  <Text numberOfLines={1} style={[styles.v11EntityMeta, { color: questTheme.colors.textMuted }]}>{categoryForSkill(selectedSkill)?.name ?? t(lang, 'selectedEntity')}</Text>
                </View>
                <TouchableOpacity accessibilityRole="button" onPress={() => setEntityPickerOpen((value) => !value)} style={styles.v11InlineAction}>
                  <Text style={[styles.v11InlineActionText, { color: accent }]}>{t(lang, entityPickerOpen ? 'closeSelection' : 'changeSelection')}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {entityPickerOpen || !selectedSkill ? (
              <View style={styles.v11Picker}>
                <QuestInput questTheme={questTheme} value={entityQuery} onChangeText={setEntityQuery} placeholder={t(lang, 'searchSkills')} style={styles.v11Input} />
                <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled style={styles.v11EntityList}>
                  {filteredSkills.length ? filteredSkills.map(renderSkillRow) : (
                    <Text style={[styles.v11EmptyText, { color: questTheme.colors.textMuted }]}>{t(lang, 'noMatchingEntities')}</Text>
                  )}
                </ScrollView>
              </View>
            ) : null}
          </View>
        ) : null}

        {logType === 'schedule' ? (
          <View style={styles.v11SelectionArea}>
            {selectedSchedule ? (
              <View style={[styles.v11SelectedEntity, { backgroundColor: questTheme.colors.surfaceSoft }]}>
                <View style={styles.v11ScheduleTime}><Text style={[styles.v11ScheduleTimeText, { color: accent }]}>{selectedSchedule.startTime}</Text></View>
                <View style={styles.v11EntityCopy}>
                  <Text numberOfLines={2} style={[styles.v11EntityName, { color: questTheme.colors.text }]}>{selectedSchedule.title}</Text>
                  <Text style={[styles.v11EntityMeta, { color: questTheme.colors.textMuted }]}>{selectedSchedule.plannedMinutes} {t(lang, 'minutes')}</Text>
                </View>
                <TouchableOpacity accessibilityRole="button" onPress={() => setSchedulePickerOpen((value) => !value)} style={styles.v11InlineAction}>
                  <Text style={[styles.v11InlineActionText, { color: accent }]}>{t(lang, schedulePickerOpen ? 'closeSelection' : 'changeSelection')}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {schedulePickerOpen || !selectedSchedule ? (
              <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled style={styles.v11EntityList}>
                {todayScheduleBlocks.length ? todayScheduleBlocks.map((block) => {
                  const selected = block.id === scheduleBlockId;
                  return (
                    <TouchableOpacity
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      key={block.id}
                      onPress={() => {
                        props.onScheduleBlockSelect(block);
                        setSchedulePickerOpen(false);
                      }}
                      style={[styles.v11EntityOption, { borderBottomColor: questTheme.colors.border }, selected && { backgroundColor: questTheme.colors.primarySoft }]}
                    >
                      <View style={styles.v11ScheduleTime}><Text style={[styles.v11ScheduleTimeText, { color: accent }]}>{block.startTime}</Text></View>
                      <View style={styles.v11EntityCopy}>
                        <Text numberOfLines={2} style={[styles.v11EntityName, { color: questTheme.colors.text }]}>{block.title}</Text>
                        <Text style={[styles.v11EntityMeta, { color: questTheme.colors.textMuted }]}>{block.plannedMinutes} {t(lang, 'minutes')}</Text>
                      </View>
                      {selected ? <Text style={[styles.v11SelectedMark, { color: accent }]}>✓</Text> : null}
                    </TouchableOpacity>
                  );
                }) : <Text style={[styles.v11EmptyText, { color: questTheme.colors.textMuted }]}>{t(lang, 'noScheduleToday')}</Text>}
              </ScrollView>
            ) : null}
          </View>
        ) : null}

        {logType === 'custom' ? <Text style={[styles.v11Body, { color: questTheme.colors.textMuted }]}>{t(lang, 'customRecordHint')}</Text> : null}
      </V11Section>

      <V11Section hint={t(lang, 'predictionOptional')} questTheme={questTheme} title={t(lang, 'sessionPrediction')}>
        <V11Segmented
          accent={accent}
          onChange={(value) => {
            if (value === 'skip') {
              props.onShowPredictionChange(false);
              props.onShowDetailedPredictionChange(false);
            } else if (value === 'edit') {
              props.onShowPredictionChange(true);
              props.onShowDetailedPredictionChange(true);
            } else {
              props.onShowPredictionChange(true);
              props.onShowDetailedPredictionChange(false);
            }
          }}
          options={[
            { value: 'accept', label: t(lang, 'acceptPrediction') },
            { value: 'edit', label: t(lang, 'edit') },
            { value: 'skip', label: t(lang, 'skipPrediction') },
          ]}
          questTheme={questTheme}
          value={!showPrediction ? 'skip' : showDetailedPrediction ? 'edit' : 'accept'}
        />
        {showPrediction ? (
          <Text style={[styles.v11PredictionSummary, { color: predictionSummary ? questTheme.colors.text : questTheme.colors.textMuted }]}>
            {predictionSummary || t(lang, 'predictionNotSet')}
          </Text>
        ) : null}
        {showPrediction && showDetailedPrediction ? (
          <View style={styles.v11Disclosure}>
            {predictionSchema.showDuration ? <View style={styles.v11FieldGroup}>{inputLabel(isStrength ? t(lang, 'sessionDurationOptional') : t(lang, 'predictedMinutes'))}<QuestInput questTheme={questTheme} value={predictedMinutes} onChangeText={props.onPredictedMinutesChange} keyboardType="number-pad" placeholder="45" style={styles.v11Input} /></View> : null}
            {predictionSchema.showTargetValue && !isStrength ? <View style={styles.v11FieldGroup}>{inputLabel(t(lang, 'targetValueLog'))}<QuestInput questTheme={questTheme} value={predictedValue} onChangeText={props.onPredictedValueChange} keyboardType="decimal-pad" placeholder="95" style={styles.v11Input} /></View> : null}
            {predictionSchema.showStrength ? (
              <View style={styles.v11FieldGroup}>
                {inputLabel(t(lang, 'expectedWorkingWeight'))}
                <View style={styles.v11InputGrid}>
                  <QuestInput questTheme={questTheme} value={predictedStrengthWeight} onChangeText={props.onPredictedStrengthWeightChange} keyboardType="decimal-pad" placeholder="75" style={styles.v11GridInput} />
                  <QuestInput questTheme={questTheme} value={predictedStrengthReps} onChangeText={props.onPredictedStrengthRepsChange} keyboardType="number-pad" placeholder={t(lang, 'expectedReps')} style={styles.v11GridInput} />
                  <QuestInput questTheme={questTheme} value={predictedStrengthSets} onChangeText={props.onPredictedStrengthSetsChange} keyboardType="number-pad" placeholder={t(lang, 'expectedSets')} style={styles.v11GridInput} />
                </View>
                <QuestInput questTheme={questTheme} value={predictedStrengthRpe} onChangeText={props.onPredictedStrengthRpeChange} keyboardType="decimal-pad" placeholder={t(lang, 'expectedRPE')} style={styles.v11Input} />
              </View>
            ) : null}
            {predictionSchema.showQuality ? <View style={styles.v11FieldGroup}>{inputLabel(t(lang, 'optionalQuality'))}<V11RatingPicker accent={accent} lang={lang} onChange={props.onPredictedQualityChange} questTheme={questTheme} value={predictedQuality} /></View> : null}
          </View>
        ) : null}
      </V11Section>

      <V11Section hint={t(lang, 'recordedWithoutPrediction')} questTheme={questTheme} title={t(lang, 'actualRecord')}>
        {isStrength ? (
          <V11Segmented
            accent={accent}
            onChange={props.onStrengthLogModeChange}
            options={[
              { value: 'simple', label: t(lang, 'simpleStrengthLog') },
              { value: 'session', label: t(lang, 'trainingSessionLog') },
            ]}
            questTheme={questTheme}
            value={strengthLogMode}
          />
        ) : null}
        <View style={styles.v11FieldGroup}>
          {inputLabel(isStrength ? t(lang, 'sessionDurationOptional') : t(lang, 'actualMinutes'))}
          <QuestInput questTheme={questTheme} value={minutes} onChangeText={props.onMinutesChange} keyboardType="number-pad" placeholder="30" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} blurOnSubmit style={styles.v11Input} />
        </View>
        <View style={styles.v11FieldGroup}>
          {inputLabel(t(lang, 'optionalQuality'))}
          <V11RatingPicker accent={accent} lang={lang} onChange={props.onQualityChange} questTheme={questTheme} value={quality} />
        </View>

        {isStrength && strengthLogMode === 'session' ? (
          <View style={styles.v11Disclosure}>
            <View style={styles.v11FieldGroup}>
              {inputLabel(t(lang, 'sessionType'))}
              <View style={styles.v11ChoiceWrap}>
                {[
                  ['push', 'sessionTypePush'],
                  ['pull', 'sessionTypePull'],
                  ['legs', 'sessionTypeLegs'],
                  ['upper', 'sessionTypeUpper'],
                  ['lower', 'sessionTypeLower'],
                  ['full_body', 'sessionTypeFullBody'],
                  ['custom', 'custom'],
                ].map(([value, key]) => {
                  const selected = sessionType === value;
                  return (
                    <TouchableOpacity key={value} onPress={() => props.onSessionTypeChange(value)} style={[styles.v11Choice, { backgroundColor: questTheme.colors.surfaceSoft, borderColor: selected ? accent : questTheme.colors.border }, selected && { backgroundColor: questTheme.colors.primarySoft }]}>
                      <Text style={[styles.v11ChoiceText, { color: questTheme.colors.text }]}>{t(lang, key)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            {exerciseEntries.slice(0, 5).map((entry, index) => (
              <View key={entry.id} style={[styles.v11ExerciseRow, { borderTopColor: questTheme.colors.border }]}>
                <View style={styles.v11ExerciseHeading}>
                  <Text style={[styles.v11EntityName, { color: questTheme.colors.text }]}>{t(lang, 'exerciseName')} {index + 1}</Text>
                  {exerciseEntries.length > 1 ? <TouchableOpacity onPress={() => props.onExerciseEntriesChange((current) => current.filter((item) => item.id !== entry.id))} style={styles.v11InlineAction}><Text style={[styles.v11InlineActionText, { color: questTheme.colors.danger }]}>{t(lang, 'delete')}</Text></TouchableOpacity> : null}
                </View>
                <QuestInput questTheme={questTheme} value={entry.exerciseName} onChangeText={(text) => props.onExerciseEntriesChange((current) => current.map((item) => item.id === entry.id ? { ...item, exerciseName: text } : item))} placeholder={t(lang, 'exerciseName')} style={styles.v11Input} />
                <View style={styles.v11InputGrid}>
                  <QuestInput questTheme={questTheme} value={entry.weight} onChangeText={(text) => props.onExerciseEntriesChange((current) => current.map((item) => item.id === entry.id ? { ...item, weight: text } : item))} keyboardType="decimal-pad" placeholder={t(lang, 'actualWorkingWeight')} style={styles.v11GridInput} />
                  <QuestInput questTheme={questTheme} value={entry.sets} onChangeText={(text) => props.onExerciseEntriesChange((current) => current.map((item) => item.id === entry.id ? { ...item, sets: text } : item))} keyboardType="number-pad" placeholder={t(lang, 'actualSets')} style={styles.v11GridInput} />
                  <QuestInput questTheme={questTheme} value={entry.reps} onChangeText={(text) => props.onExerciseEntriesChange((current) => current.map((item) => item.id === entry.id ? { ...item, reps: text } : item))} keyboardType="number-pad" placeholder={t(lang, 'actualReps')} style={styles.v11GridInput} />
                </View>
                {showAdvancedFields ? <QuestInput questTheme={questTheme} value={entry.rpe} onChangeText={(text) => props.onExerciseEntriesChange((current) => current.map((item) => item.id === entry.id ? { ...item, rpe: text } : item))} keyboardType="decimal-pad" placeholder={t(lang, 'actualRPE')} style={styles.v11Input} /> : null}
              </View>
            ))}
            {exerciseEntries.length < 5 ? <QuestButton questTheme={questTheme} variant="secondary" icon="plus" label={t(lang, 'addExercise')} onPress={() => props.onExerciseEntriesChange((current) => [...current, { id: `exercise-${Date.now()}`, exerciseName: '', weight: '', sets: '3', reps: '', rpe: '', note: '' }])} /> : null}
          </View>
        ) : null}

        {selectedSkill && logType !== 'custom' ? (
          <View style={[styles.v11ProgressArea, { borderTopColor: questTheme.colors.border }]}>
            <Text style={[styles.v11FieldLabel, { color: questTheme.colors.textMuted }]}>{isStrength ? t(lang, 'actualPerformance') : t(lang, 'progressUpdate')}</Text>
            {renderProgressFields()}
          </View>
        ) : null}

        <TouchableOpacity accessibilityRole="button" onPress={() => props.onShowAdvancedFieldsChange((value) => !value)} style={[styles.v11DisclosureToggle, { borderColor: questTheme.colors.border }]}>
          <Text style={[styles.v11DisclosureText, { color: accent }]}>{t(lang, showAdvancedFields ? 'hideAdvancedFields' : 'showAdvancedFields')}</Text>
          <Text style={[styles.v11DisclosureGlyph, { color: accent }]}>{showAdvancedFields ? '−' : '+'}</Text>
        </TouchableOpacity>

        {showAdvancedFields ? (
          <View style={styles.v11Disclosure}>
            <View style={styles.v11FieldGroup}>{inputLabel(t(lang, 'difficulty'))}<V11RatingPicker accent={accent} lang={lang} onChange={props.onDifficultyChange} questTheme={questTheme} value={difficulty} /></View>
            {([
              ['mentalCost', mentalCost, props.onMentalCostChange],
              ['physicalCost', physicalCost, props.onPhysicalCostChange],
              ['emotionalCost', emotionalCost, props.onEmotionalCostChange],
            ] as const).map(([key, selectedValue, setValue]) => <View key={key} style={styles.v11FieldGroup}>{inputLabel(t(lang, key))}<V11RatingPicker accent={accent} labelMode="number" lang={lang} onChange={setValue} questTheme={questTheme} value={selectedValue} /></View>)}
            {schemaFields.length ? <View style={styles.v11AdvancedFields}>{schemaFields.map(renderSchemaField)}</View> : null}
          </View>
        ) : null}

        <View style={styles.v11FieldGroup}>
          {inputLabel(t(lang, 'noteOptional'))}
          <QuestInput questTheme={questTheme} value={note} onChangeText={props.onNoteChange} style={[styles.v11Input, styles.v11TextArea]} multiline placeholder={t(lang, 'notePlaceholder')} />
        </View>
      </V11Section>
    </WebView>
  );
}

export default function V11RecordProgressForm(props: Props) {
  return props.useV11 ? <V11RecordProgressContent {...props} /> : <LegacyRecordProgressForm {...props} />;
}

const styles = StyleSheet.create({
  label: { color: theme.textDim, marginTop: 12, marginBottom: 6 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card },
  chipText: { color: theme.text, fontSize: 13 },
  empty: { color: theme.textDim, fontStyle: 'italic', backgroundColor: theme.card, padding: 14, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.border },
  predictionBox: { marginTop: 14, padding: 12, borderRadius: theme.radius.md, backgroundColor: theme.cardAlt },
  v11FlatSection: { paddingHorizontal: 0, paddingVertical: 12, borderRadius: 0, borderBottomWidth: 1 },
  modalSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'space-between' },
  minimumLabel: { color: theme.text, fontSize: 13, fontWeight: '800', marginBottom: 4 },
  planReason: { color: theme.textDim, fontSize: 12, lineHeight: 18, marginTop: 5 },
  modalToggleText: { fontSize: 11, fontWeight: '900', textAlign: 'right', maxWidth: 108 },
  modalMiniToggle: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start' },
  modalMiniToggleText: { fontSize: 11, fontWeight: '900' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  qRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  qBox: {
    minWidth: 48,
    flexGrow: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    alignItems: 'center',
    gap: 4,
  },
  qEmoji: { fontSize: 24 },
  qLabel: { color: theme.textDim, fontSize: 10 },
  progressUpdateBox: { backgroundColor: '#151925', borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 12, marginTop: 12, gap: 8 },
  curriculumRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  curriculumCheck: { color: theme.accent, fontWeight: '800', width: 18 },
  exerciseEntryCard: { borderWidth: 1, borderRadius: theme.radius.md, padding: 10, marginTop: 10, gap: 8 },
  v11Root: { minWidth: 0 },
  v11Section: {
    minWidth: 0,
    paddingVertical: 18,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  v11SectionHeading: { minWidth: 0, gap: 3 },
  v11SectionTitle: { fontSize: 17, lineHeight: 23, fontWeight: '600' },
  v11SectionHint: { fontSize: 12, lineHeight: 18 },
  v11Segmented: {
    minWidth: 0,
    minHeight: 48,
    padding: 3,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 3,
  },
  v11Segment: {
    minWidth: 0,
    minHeight: 44,
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  v11SegmentText: { minWidth: 0, fontSize: 13, lineHeight: 17, fontWeight: '600', textAlign: 'center' },
  v11SelectionArea: { minWidth: 0, gap: 10 },
  v11SelectedEntity: {
    minWidth: 0,
    minHeight: 58,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  v11EntityCopy: { minWidth: 0, flex: 1, gap: 2 },
  v11EntityName: { minWidth: 0, fontSize: 14, lineHeight: 19, fontWeight: '600', flexShrink: 1 },
  v11EntityMeta: { minWidth: 0, fontSize: 11, lineHeight: 16, flexShrink: 1 },
  v11InlineAction: { minWidth: 44, minHeight: 44, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  v11InlineActionText: { fontSize: 12, lineHeight: 17, fontWeight: '700', textAlign: 'center' },
  v11Picker: { minWidth: 0, gap: 8 },
  v11EntityList: { maxHeight: 216, minWidth: 0 },
  v11EntityOption: {
    minWidth: 0,
    minHeight: 56,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  v11SelectedMark: { width: 24, fontSize: 16, lineHeight: 22, fontWeight: '700', textAlign: 'center' },
  v11ScheduleTime: { minWidth: 52, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  v11ScheduleTimeText: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  v11EmptyText: { paddingVertical: 18, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  v11PredictionSummary: { fontSize: 13, lineHeight: 20 },
  v11Disclosure: { minWidth: 0, gap: 14 },
  v11FieldGroup: { minWidth: 0, gap: 7 },
  v11FieldLabel: { minWidth: 0, fontSize: 11, lineHeight: 16, fontWeight: '600', letterSpacing: 0.35 },
  v11Input: { minWidth: 0, width: '100%', borderRadius: 15 },
  v11TextArea: { minHeight: 88, textAlignVertical: 'top' },
  v11InputGrid: { minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  v11GridInput: { minWidth: 76, flexBasis: 92, flexGrow: 1, borderRadius: 15 },
  v11InputGridTwo: { minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  v11GridField: { minWidth: 120, flex: 1, gap: 7 },
  v11RatingRow: { minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  v11Rating: {
    minWidth: 44,
    minHeight: 48,
    flexGrow: 1,
    flexBasis: 44,
    paddingHorizontal: 5,
    paddingVertical: 5,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  v11RatingNumber: { fontSize: 15, lineHeight: 19, fontWeight: '600' },
  v11RatingLabel: { maxWidth: '100%', fontSize: 9, lineHeight: 12, textAlign: 'center' },
  v11ChoiceWrap: { minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  v11Choice: {
    minHeight: 44,
    maxWidth: '100%',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  v11ChoiceText: { maxWidth: '100%', fontSize: 12, lineHeight: 17, fontWeight: '600', textAlign: 'center', flexShrink: 1 },
  v11ToggleRow: {
    minWidth: 0,
    minHeight: 48,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  v11Check: { width: 22, fontSize: 17, lineHeight: 22, fontWeight: '700', textAlign: 'center' },
  v11Body: { minWidth: 0, fontSize: 13, lineHeight: 20, flexShrink: 1 },
  v11MetricReading: { fontSize: 22, lineHeight: 28, fontWeight: '500' },
  v11ProgressArea: { minWidth: 0, paddingTop: 14, gap: 9, borderTopWidth: StyleSheet.hairlineWidth },
  v11DisclosureToggle: {
    minWidth: 0,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  v11DisclosureText: { minWidth: 0, fontSize: 13, lineHeight: 18, fontWeight: '700', flexShrink: 1 },
  v11DisclosureGlyph: { width: 22, fontSize: 20, lineHeight: 22, textAlign: 'center' },
  v11AdvancedFields: { minWidth: 0, gap: 14 },
  v11ExerciseRow: { minWidth: 0, paddingTop: 14, gap: 9, borderTopWidth: StyleSheet.hairlineWidth },
  v11ExerciseHeading: { minWidth: 0, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
});
