import type { DecisionContextSnapshotV1, DecisionMissingQuestionV1, DecisionSafetyStatusV1 } from './decisionEpisode';

const BLOCKED_PATTERNS: Array<{ code: string; pattern: RegExp }> = [
  { code: 'CHEST_SYMPTOM', pattern: /(胸痛|胸闷|胸口.*(痛|压迫)|chest pain|chest pressure)/i },
  { code: 'FAINTING', pattern: /(晕厥|昏倒|失去意识|faint(?:ed|ing)?|passed out)/i },
  { code: 'BREATHING_DIFFICULTY', pattern: /(呼吸困难|喘不过气|difficulty breathing|shortness of breath)/i },
  { code: 'SEVERE_WEAKNESS', pattern: /(严重无力|极度虚弱|severe weakness)/i },
  { code: 'SEVERE_OR_NEW_PAIN', pattern: /(剧痛|严重.*痛|新出现.*痛|severe pain|new pain)/i },
];

const CLARIFY_PATTERNS: Array<{ code: string; pattern: RegExp }> = [
  { code: 'DIZZINESS_UNCLEAR', pattern: /(头晕|眩晕|dizz(?:y|iness)|lightheaded)/i },
  { code: 'PAIN_SEVERITY_UNCLEAR', pattern: /(疼|痛|pain|ache)/i },
  { code: 'WEAKNESS_SEVERITY_UNCLEAR', pattern: /(无力|虚弱|weakness)/i },
];

export type DecisionSafetyGateResult = {
  status: DecisionSafetyStatusV1;
  missingQuestion?: DecisionMissingQuestionV1;
};

export function evaluateDecisionSafety(input: {
  questionText?: string;
  context: DecisionContextSnapshotV1;
  symptomSeverityAnswer?: string;
}): DecisionSafetyGateResult {
  const contextSymptomText = input.context.sourceRefs
    .filter((source) => source.sourceType === 'context')
    .map((source) => source.label)
    .join(' ');
  const text = `${input.questionText ?? ''} ${contextSymptomText}`.trim();
  const blocked = BLOCKED_PATTERNS.filter((item) => item.pattern.test(text));
  if (blocked.length > 0 || input.symptomSeverityAnswer === 'severe') {
    return {
      status: {
        level: 'blocked',
        matchedTerms: blocked.map((item) => item.code),
        reasonCodes: blocked.length > 0 ? blocked.map((item) => item.code) : ['USER_REPORTED_SEVERE_SYMPTOM'],
        userMessageKey: 'adaptiveSafetyBlocked',
      },
    };
  }

  const unclear = CLARIFY_PATTERNS.filter((item) => item.pattern.test(text));
  if (unclear.length > 0 && !input.symptomSeverityAnswer) {
    return {
      status: {
        level: 'needs_clarification',
        matchedTerms: unclear.map((item) => item.code),
        reasonCodes: ['SYMPTOM_SEVERITY_REQUIRED'],
        userMessageKey: 'adaptiveSafetyClarify',
      },
      missingQuestion: {
        id: 'symptom-severity',
        kind: 'symptom_severity',
        promptKey: 'adaptiveQuestionSymptomSeverity',
        materialReasonKey: 'adaptiveQuestionSymptomSeverityReason',
        options: [
          { value: 'mild', labelKey: 'adaptiveSymptomMild' },
          { value: 'unusual', labelKey: 'adaptiveSymptomUnusual' },
          { value: 'severe', labelKey: 'adaptiveSymptomSevere' },
        ],
      },
    };
  }

  if (input.symptomSeverityAnswer === 'unusual') {
    return {
      status: {
        level: 'blocked',
        matchedTerms: unclear.map((item) => item.code),
        reasonCodes: ['UNUSUAL_SYMPTOM_REQUIRES_NON_OPTIMIZATION_PATH'],
        userMessageKey: 'adaptiveSafetyBlocked',
      },
    };
  }

  return {
    status: {
      level: 'normal',
      matchedTerms: [],
      reasonCodes: [],
    },
  };
}
