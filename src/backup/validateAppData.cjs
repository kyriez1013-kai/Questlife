// Generated from AppData. Run scripts/generate-record-validator.cjs. Do not edit.
"use strict";
module.exports = validate21;
module.exports.default = validate21;
const schema6 = {"$schema":"http://json-schema.org/draft-07/schema#","$ref":"#/definitions/AppData","definitions":{"AppData":{"type":"object","properties":{"goals":{"type":"array","items":{"$ref":"#/definitions/Goal"}},"categories":{"type":"array","items":{"$ref":"#/definitions/Category"}},"modules":{"type":"array","items":{"$ref":"#/definitions/QuestModule"}},"moduleSkillLinks":{"type":"array","items":{"$ref":"#/definitions/ModuleSkillLink"}},"skills":{"type":"array","items":{"$ref":"#/definitions/Skill"}},"actions":{"type":"array","items":{"$ref":"#/definitions/Action"}},"executionLogs":{"type":"array","items":{"$ref":"#/definitions/ExecutionLog"}},"effortUnits":{"type":"array","items":{"$ref":"#/definitions/EffortUnit"}},"contributionLinks":{"type":"array","items":{"$ref":"#/definitions/ContributionLink"}},"rescueLogs":{"type":"array","items":{"$ref":"#/definitions/RescueLog"}},"stateCheckIns":{"type":"array","items":{"$ref":"#/definitions/StateCheckIn"}},"contextLogs":{"type":"array","items":{"$ref":"#/definitions/ContextLog"}},"decisionResults":{"type":"array","items":{"$ref":"#/definitions/DecisionResult"}},"patternMemory":{"type":"array","items":{"$ref":"#/definitions/PatternMemory"}},"scheduleBlocks":{"type":"array","items":{"$ref":"#/definitions/ScheduleBlock"}},"rawCaptures":{"type":"array","items":{"$ref":"#/definitions/RawCapture"}},"settings":{"type":"object","properties":{"reminderHour":{"type":"number"},"reminderMinute":{"type":"number"},"reminderEnabled":{"type":"boolean"},"accentColor":{"type":"string","deprecated":"Migrated away by the global visual foundation cleanup."},"language":{"type":"string","enum":["zh","en"]},"preferredLanguage":{"type":"string","enum":["zh","en"]},"selectedThemeId":{"type":"string"},"onboardingCompleted":{"type":"boolean"},"onboardingVersion":{"type":"number"},"firstQuestCreated":{"type":"boolean"},"onboardingRestartRequested":{"type":"boolean"},"firstSystemWelcomeDismissed":{"type":"boolean"},"dashboardPreferences":{"$ref":"#/definitions/DashboardPreferences"}}}},"required":["goals","categories","modules","moduleSkillLinks","skills","actions","executionLogs","effortUnits","contributionLinks","rescueLogs","stateCheckIns","contextLogs","decisionResults","patternMemory","scheduleBlocks","rawCaptures","settings"]},"Goal":{"type":"object","properties":{"id":{"type":"string"},"title":{"type":"string"},"description":{"type":"string"},"level":{"$ref":"#/definitions/GoalLevel"},"parentId":{"type":"string"},"skillIds":{"type":"array","items":{"type":"string"}},"createdAt":{"type":"number"},"targetDate":{"type":"number"},"completed":{"type":"boolean"},"completedAt":{"type":"number"},"color":{"type":"string"}},"required":["id","title","level","skillIds","createdAt","completed"]},"GoalLevel":{"type":"string","enum":["life","big","daily"]},"Category":{"type":"object","properties":{"id":{"type":"string"},"name":{"type":"string"},"emoji":{"type":"string"},"color":{"type":"string"},"goalType":{"$ref":"#/definitions/GoalType"},"domain":{"$ref":"#/definitions/DomainTemplateDomain"},"domainTemplateId":{"type":"string"},"vision":{"type":"string"},"description":{"type":"string"},"targetDate":{"type":"string"},"progressModel":{"$ref":"#/definitions/GoalProgressModel"},"manualProgress":{"type":"number"},"outcomeCriteria":{"type":"array","items":{"$ref":"#/definitions/OutcomeCriterion"}},"createdAt":{"type":"number"}},"required":["id","name","createdAt"]},"GoalType":{"type":"string","enum":["fitness","career","study","exam","finance","health","project","custom"]},"DomainTemplateDomain":{"type":"string","enum":["fitness_strength","fitness_physique","study_course","exam_prep","writing_assignment","coding_project","creative_project","career_skill","life_maintenance","recovery_health","finance_tracking","custom"]},"GoalProgressModel":{"type":"string","enum":["criteria_weighted","module_average","skill_average","manual"]},"OutcomeCriterion":{"type":"object","properties":{"id":{"type":"string"},"title":{"type":"string"},"description":{"type":"string"},"linkedSkillId":{"type":"string"},"metricType":{"$ref":"#/definitions/OutcomeMetricType"},"currentValue":{"type":"number"},"targetValue":{"type":"number"},"unit":{"type":"string"},"weight":{"type":"number"},"completed":{"type":"boolean"},"checklistItemIds":{"type":"array","items":{"type":"string"}},"stateMetric":{"type":"string"},"currency":{"type":"string"}},"required":["id","title","metricType","weight"]},"OutcomeMetricType":{"type":"string","enum":["none","target_value","time_based","frequency","checklist","curriculum","performance_log","quality_score","state_based","money_based","qualitative","manual","binary"]},"QuestModule":{"type":"object","properties":{"id":{"type":"string"},"goalId":{"type":"string"},"name":{"type":"string"},"icon":{"type":"string"},"description":{"type":"string"},"order":{"type":"number"},"progress":{"type":"number"},"createdFromTemplateId":{"type":"string"},"moduleTemplateId":{"type":"string"},"createdAt":{"type":"number"}},"required":["id","goalId","name","createdAt"]},"ModuleSkillLink":{"type":"object","properties":{"id":{"type":"string"},"goalId":{"type":"string"},"moduleId":{"type":"string"},"skillId":{"type":"string"},"role":{"type":"string","enum":["primary","supporting","optional"]},"order":{"type":"number"},"note":{"type":"string"},"createdAt":{"type":"number"}},"required":["id","goalId","moduleId","skillId","createdAt"]},"Skill":{"type":"object","properties":{"id":{"type":"string"},"name":{"type":"string"},"icon":{"type":"string"},"color":{"type":"string"},"totalXP":{"type":"number"},"dailyTargetMinutes":{"type":"number"},"totalTargetHours":{"type":"number"},"createdAt":{"type":"number"},"goalId":{"type":"string"},"linkedGoalIds":{"type":"array","items":{"type":"string"}},"moduleId":{"type":"string"},"progressType":{"$ref":"#/definitions/ProgressType"},"metricConfig":{"$ref":"#/definitions/MetricConfig"},"domainTemplateId":{"type":"string"},"createdFromTemplateId":{"type":"string"},"skillTemplateId":{"type":"string"},"moduleTemplateId":{"type":"string"},"recordingFieldKeys":{"type":"array","items":{"type":"string"}},"currentValue":{"type":"number"},"targetValue":{"type":"number"},"unit":{"type":"string"},"targetHours":{"type":"number"},"completedHours":{"type":"number"},"curriculumItems":{"type":"array","items":{"$ref":"#/definitions/CurriculumItem"}},"weeklyTargetCount":{"type":"number"},"completedThisWeek":{"type":"number"},"categoryId":{"type":"string"},"reminderHour":{"type":"number"},"reminderMinute":{"type":"number"},"reminderEnabled":{"type":"boolean"},"taskType":{"$ref":"#/definitions/TaskType"},"scheduleEnabled":{"type":"boolean"},"scheduleType":{"type":"string","enum":["daily","weekly_days","times_per_week","manual_only"]},"weeklyDays":{"type":"array","items":{"type":"string"}},"timesPerWeek":{"type":"number"},"defaultStartTime":{"type":"string"},"defaultDurationMinutes":{"type":"number"},"flexibility":{"type":"string","enum":["fixed","flexible","movable"]},"rigidity":{"type":"string","enum":["low","medium","high"]},"mentalCost":{"type":"number"},"physicalCost":{"type":"number"},"emotionalCost":{"type":"number"},"recoveryImpact":{"type":"number"},"compressibility":{"type":"number"}},"required":["id","name","color","totalXP","dailyTargetMinutes","createdAt"]},"ProgressType":{"type":"string","enum":["none","time_based","target_value","checklist","curriculum","performance_log","quality_score","state_based","money_based","binary","frequency","qualitative"]},"MetricConfig":{"type":"object","properties":{"metricType":{"$ref":"#/definitions/ProgressType"},"unit":{"type":"string"},"targetLabel":{"type":"string"},"completedHours":{"type":"number"},"targetHours":{"type":"number"},"currentValue":{"type":"number"},"targetValue":{"type":"number"},"weeklyTargetCount":{"type":"number"},"completedThisWeek":{"type":"number"},"checklistItems":{"type":"array","items":{"$ref":"#/definitions/CurriculumItem"}},"averageQuality":{"type":"number"},"targetQuality":{"type":"number"},"stateMetric":{"$ref":"#/definitions/StateMetric"},"targetStateValue":{"type":"number"},"averageStateValue":{"type":"number"},"currentAmount":{"type":"number"},"targetAmount":{"type":"number"},"currency":{"type":"string"},"completed":{"type":"boolean"},"performanceType":{"$ref":"#/definitions/PerformanceType"},"primaryMetric":{"$ref":"#/definitions/PrimaryPerformanceMetric"},"useEstimated1RM":{"type":"boolean"},"trackVolume":{"type":"boolean"},"trackRPE":{"type":"boolean"},"bestValue":{"type":"number"},"targetPerformanceValue":{"type":"number"},"currentBest":{"type":"number"},"bestEstimated1RM":{"type":"number"},"bestVolume":{"type":"number"},"milestones":{"type":"array","items":{"type":"object","properties":{"id":{"type":"string"},"title":{"type":"string"},"completed":{"type":"boolean"},"note":{"type":"string"},"date":{"type":"string"}},"required":["id","title"]}}},"required":["metricType"]},"CurriculumItem":{"type":"object","properties":{"id":{"type":"string"},"title":{"type":"string"},"completed":{"type":"boolean"}},"required":["id","title","completed"]},"StateMetric":{"type":"string","enum":["energy","focus","mood","sleep","stress","recovery","health","custom"]},"PerformanceType":{"type":"string","enum":["strength","endurance","skill_reps","speed","accuracy","business","custom"]},"PrimaryPerformanceMetric":{"type":"string","enum":["weight","volume","estimated_1rm","reps","distance","pace","accuracy","conversion_rate","revenue","custom"]},"TaskType":{"type":"string","enum":["deep_study","light_review","strength_training","cardio_recovery","admin","life_maintenance","creative_building"]},"Action":{"type":"object","properties":{"id":{"type":"string"},"goalId":{"type":"string"},"skillIds":{"type":"array","items":{"type":"string"}},"minutes":{"type":"number"},"note":{"type":"string"},"date":{"type":"string"},"createdAt":{"type":"number"},"quality":{"$ref":"#/definitions/Quality"}},"required":["id","skillIds","minutes","date","createdAt"]},"Quality":{"type":"number","enum":[1,2,3,4,5]},"ExecutionLog":{"type":"object","properties":{"id":{"type":"string"},"date":{"type":"string"},"startTime":{"type":"string"},"endTime":{"type":"string"},"durationMinutes":{"type":"number"},"title":{"type":"string"},"note":{"type":"string"},"linkedSkillId":{"type":"string"},"orphanedSkillName":{"type":"string"},"linkedGoalId":{"type":"string"},"linkedModuleId":{"type":"string"},"linkedScheduleBlockId":{"type":"string"},"source":{"type":"string","enum":["manual","schedule_block","quick_log","timer","one_tap","today_start","today_log","one_tap_done","schedule_log","skill_detail","goal_detail"]},"taskType":{"$ref":"#/definitions/TaskType"},"predictedDurationMinutes":{"type":"number"},"predictedQualityRating":{"type":"number"},"qualityRating":{"type":"number"},"difficultyRating":{"type":"number"},"predictedMentalCost":{"type":"number"},"predictedPhysicalCost":{"type":"number"},"predictedEmotionalCost":{"type":"number"},"actualMentalCost":{"type":"number"},"actualPhysicalCost":{"type":"number"},"actualEmotionalCost":{"type":"number"},"predictionDelta":{"type":"object","properties":{"durationDeltaMinutes":{"type":"number"},"qualityDelta":{"type":"number"}}},"predictionData":{},"actualData":{},"structuredData":{"type":"object","additionalProperties":{}},"domainTemplateId":{"type":"string"},"domain":{"$ref":"#/definitions/DomainTemplateDomain"},"stateSnapshot":{"type":"object","properties":{"energy":{"type":"number"},"focus":{"type":"number"},"mood":{"type":"number"},"health":{"type":"string"},"timestamp":{"type":"string"}}},"progressUpdate":{"type":"object","properties":{"progressType":{"$ref":"#/definitions/ProgressType"},"valueAdded":{"type":"number"},"newCurrentValue":{"type":"number"},"completedCurriculumItemIds":{"type":"array","items":{"type":"string"}},"qualitativeSummary":{"type":"string"},"performanceData":{"$ref":"#/definitions/PerformanceData"},"stateValue":{"type":"number"},"amountAdded":{"type":"number"},"newCurrentAmount":{"type":"number"},"completed":{"type":"boolean"}}},"metricUpdate":{"type":"object","properties":{"metricType":{"$ref":"#/definitions/ProgressType"},"minutesAdded":{"type":"number"},"newCurrentValue":{"type":"number"},"countAdded":{"type":"number"},"completedChecklistItemIds":{"type":"array","items":{"type":"string"}},"performanceValue":{"type":"number"},"performanceUnit":{"type":"string"},"performanceNote":{"type":"string"},"performanceData":{"anyOf":[{"$ref":"#/definitions/PerformanceData"},{}]},"qualityValue":{"type":"number"},"stateValue":{"type":"number"},"amountAdded":{"type":"number"},"newCurrentAmount":{"type":"number"},"markCompleted":{"type":"boolean"},"qualitativeText":{"type":"string"}},"required":["metricType"]},"appliedToProgress":{"type":"boolean"},"dataProvenance":{"$ref":"#/definitions/DataRecordProvenance"},"createdAt":{"type":"string"},"updatedAt":{"type":"string"}},"required":["id","date","durationMinutes","source","createdAt"]},"PerformanceData":{"type":"object","properties":{"performanceType":{"$ref":"#/definitions/PerformanceType"},"values":{"type":"array","items":{"type":"object","properties":{"metric":{"type":"string"},"value":{"type":"number"},"unit":{"type":"string"}},"required":["metric","value"]}},"strengthSets":{"type":"array","items":{"$ref":"#/definitions/StrengthSet"}},"totalVolume":{"type":"number"},"estimated1RM":{"type":"number"},"notes":{"type":"string"}}},"StrengthSet":{"type":"object","properties":{"weight":{"type":"number"},"reps":{"type":"number"},"sets":{"type":"number"},"rpe":{"type":"number"}}},"DataRecordProvenance":{"type":"object","properties":{"schemaVersion":{"type":"string","const":"questlife.data.provenance.v1"},"origin":{"$ref":"#/definitions/DataRecordOrigin"},"confirmation":{"$ref":"#/definitions/DataConfirmationProvenance"},"captureMethod":{"$ref":"#/definitions/DataCaptureMethod"},"recordedAt":{"type":"string"},"availableAt":{"type":"string"},"eventStartAt":{"type":"string"},"eventEndAt":{"type":"string"},"timezone":{"type":"string"},"protocolVersion":{"type":"string"},"instrumentVersion":{"type":"string"},"parser":{"$ref":"#/definitions/DataParserMetadata"},"candidate":{"type":"object","properties":{"rawCaptureId":{"type":"string"},"entryIndex":{"type":"number"},"entryKey":{"type":"string"}},"required":["rawCaptureId"]},"corrections":{"type":"array","items":{"$ref":"#/definitions/DataCandidateCorrection"}},"correctedFields":{"type":"array","items":{"type":"string"}},"fieldOrigins":{"type":"object","additionalProperties":{"$ref":"#/definitions/DataFieldOrigin"}},"sourceIds":{"type":"array","items":{"type":"string"}},"limitations":{"type":"array","items":{"type":"string"}},"retryOfRecordId":{"type":"string"},"deleted":{"type":"boolean"}},"required":["schemaVersion","origin","confirmation","captureMethod","recordedAt","availableAt"],"description":"Additive provenance metadata for future Quant ingestion. Old records remain valid AppData and intentionally do not receive inferred provenance."},"DataRecordOrigin":{"type":"string","enum":["OWNER_OBSERVED","OWNER_CONFIRMED_AI_PARSE","PASSIVE_IMPORTED","SYNTHETIC","QA_TEST","DEBUG_FIXTURE","DERIVED","LEGACY_UNKNOWN"]},"DataConfirmationProvenance":{"type":"string","enum":["USER_ENTERED","USER_CONFIRMED","USER_CORRECTED","NOT_REQUIRED","UNCONFIRMED","UNKNOWN"]},"DataCaptureMethod":{"type":"string","enum":["manual_form","timer","one_tap","schedule","smart_capture_text","context_rule_parser","state_checkin","decision_engine","pattern_engine","rescue","import","unknown"]},"DataParserMetadata":{"type":"object","properties":{"provider":{"type":"string"},"model":{"type":"string"},"version":{"type":"string"},"promptVersion":{"type":"string"},"responseSchemaVersion":{"type":"string"}}},"DataCandidateCorrection":{"type":"object","properties":{"field":{"type":"string"},"proposed":{"type":["string","number","boolean","null"]},"confirmed":{"type":["string","number","boolean","null"]},"valuesRedacted":{"type":"boolean"}},"required":["field"]},"DataFieldOrigin":{"type":"string","enum":["owner_entered","owner_confirmed","owner_corrected","model_proposed_owner_confirmed","rule_derived","derived","ui_default_or_owner_confirmed","unknown"]},"EffortUnit":{"type":"object","properties":{"id":{"type":"string"},"executionLogId":{"type":"string"},"date":{"type":"string"},"timestamp":{"type":"string"},"source":{"type":"string","enum":["execution_log","timer","one_tap","schedule_block","manual"]},"primarySkillId":{"type":"string"},"primaryGoalId":{"type":"string"},"primaryModuleId":{"type":"string"},"scheduleBlockId":{"type":"string"},"effortType":{"$ref":"#/definitions/EffortType"},"metricFamily":{"$ref":"#/definitions/MetricFamily"},"raw":{"type":"object","properties":{"durationMinutes":{"type":"number"},"exerciseName":{"type":"string"},"weight":{"type":"number"},"sets":{"type":"number"},"reps":{"type":"number"},"rpe":{"type":"number"},"estimatedVolume":{"type":"number"},"count":{"type":"number"},"completedItems":{"type":"number"},"score":{"type":"number"},"amount":{"type":"number"},"qualityRating":{"type":"number"},"difficultyRating":{"type":"number"},"mentalCost":{"type":"number"},"physicalCost":{"type":"number"},"note":{"type":"string"},"exercises":{"type":"array","items":{"type":"object","properties":{"exerciseName":{"type":"string"},"weight":{"type":"number"},"sets":{"type":"number"},"reps":{"type":"number"},"rpe":{"type":"number"},"note":{"type":"string"}}}}}},"derived":{"type":"object","properties":{"effortScore":{"type":"number"},"intensityScore":{"type":"number"},"volumeScore":{"type":"number"},"consistencyScore":{"type":"number"},"qualityScore":{"type":"number"}}},"comparableKey":{"type":"string"},"createdAt":{"type":"string"},"updatedAt":{"type":"string"}},"required":["id","executionLogId","date","timestamp","source","effortType","metricFamily","raw","derived","createdAt"]},"EffortType":{"type":"string","enum":["time_investment","strength_training","performance_attempt","study_session","practice_reps","project_progress","checklist_completion","frequency_completion","recovery_action","life_maintenance","qualitative_progress"]},"MetricFamily":{"type":"string","enum":["time","strength","volume","reps","score","money","items","frequency","state_shift","qualitative"]},"ContributionLink":{"type":"object","properties":{"id":{"type":"string"},"effortUnitId":{"type":"string"},"executionLogId":{"type":"string"},"targetType":{"type":"string","enum":["goal","skill","module"]},"targetId":{"type":"string"},"contributionType":{"type":"string","enum":["direct","indirect","supporting","maintenance","recovery"]},"strength":{"type":"string","enum":["high","medium","low"]},"weight":{"type":"number"},"reasonCode":{"type":"string","enum":["primary_skill","linked_module","linked_goal","shared_category","supporting_muscle_group","manual_link","fallback"]},"createdAt":{"type":"string"}},"required":["id","effortUnitId","executionLogId","targetType","targetId","contributionType","strength","weight","reasonCode","createdAt"]},"RescueLog":{"type":"object","properties":{"id":{"type":"string"},"date":{"type":"string"},"startedAt":{"type":"string"},"completedAt":{"type":"string"},"triggerType":{"type":"string","enum":["brain_off","doomscrolling","overthinking","sleep_debt","mental_fatigue","avoidance","unknown"]},"rescueStepCompleted":{"type":"boolean"},"activationStepCompleted":{"type":"boolean"},"bodyAction":{"type":"string"},"activationAction":{"type":"string"},"beforeState":{"type":"object","properties":{"energy":{"type":"number"},"focus":{"type":"number"},"mood":{"type":"number"},"note":{"type":"string"}}},"afterState":{"type":"object","properties":{"energy":{"type":"number"},"focus":{"type":"number"},"mood":{"type":"number"},"note":{"type":"string"}}},"linkedSkillId":{"type":"string"},"linkedGoalId":{"type":"string"},"linkedModuleId":{"type":"string"},"linkedScheduleBlockId":{"type":"string"},"source":{"type":"string","const":"brain_off_rescue"},"note":{"type":"string"},"createdAt":{"type":"string"},"updatedAt":{"type":"string"}},"required":["id","date","startedAt","source","createdAt"]},"StateCheckIn":{"type":"object","properties":{"id":{"type":"string"},"date":{"type":"string"},"timestamp":{"type":"string"},"timeBlock":{"type":"string","enum":["morning","midday","afternoon","evening","night"]},"overall":{"type":"number"},"energy":{"type":"number"},"focus":{"type":"number"},"mood":{"type":"number"},"physical":{"type":"number"},"stress":{"type":"number"},"label":{"type":"string","enum":["very_low","low","normal","good","great"]},"context":{"type":"object","properties":{"sleepQuality":{"type":"number"},"sick":{"type":"boolean"},"postWorkout":{"type":"boolean"},"afterExam":{"type":"boolean"},"caffeine":{"type":"boolean"},"socialDrain":{"type":"boolean"}}},"note":{"type":"string"},"dataProvenance":{"$ref":"#/definitions/DataRecordProvenance"},"createdAt":{"type":"string"},"updatedAt":{"type":"string"}},"required":["id","date","timestamp","overall","createdAt"]},"ContextLog":{"type":"object","properties":{"id":{"type":"string"},"date":{"type":"string"},"createdAt":{"type":"string"},"type":{"type":"string","enum":["sleep","food","environment","body","weather","symptom","custom"]},"label":{"type":"string"},"value":{"type":["number","string"]},"unit":{"type":"string"},"intensity":{"type":"number"},"source":{"type":"string","enum":["manual","healthkit","sensor","import","unknown"]},"note":{"type":"string"},"rawText":{"type":"string"},"dataProvenance":{"$ref":"#/definitions/DataRecordProvenance"}},"required":["id","type","label"]},"DecisionResult":{"type":"object","properties":{"id":{"type":"string"},"createdAt":{"type":"string"},"mode":{"type":"string","enum":["instant_micro","daily_brief"]},"trigger":{"type":"string","enum":["state_checkin","manual","morning_push","debug"]},"source":{"type":"string","enum":["ai","legacy_fallback","ai_failed_fallback"]},"schemaVersion":{"type":"string"},"headlineInsight":{"type":"string"},"readinessBand":{"type":"string","enum":["green","yellow","red","unknown"]},"readinessScore":{"type":"number"},"firstStep":{"type":"object","properties":{"step":{"type":"string"},"why":{"type":"string"},"durationMin":{"type":"number"}},"required":["step"]},"doNot":{"type":"array","items":{"type":"string"}},"perceptionGapDetected":{"type":"boolean"},"evidenceBasis":{"type":"string","enum":["population_prior","personal_pattern","mixed"]},"confidence":{"type":"number"},"quality":{"type":"object","properties":{"score":{"type":"number"},"grade":{"type":"string","enum":["excellent","good","weak","bad"]},"failedCheckIds":{"type":"array","items":{"type":"string"}},"flags":{"type":"object","properties":{"generic":{"type":"boolean"},"missingEvidence":{"type":"boolean"},"missingFirstStep":{"type":"boolean"},"overclaiming":{"type":"boolean"},"medicalRisk":{"type":"boolean"},"tooVerbose":{"type":"boolean"},"tooVague":{"type":"boolean"},"ignoredAcceptedPatterns":{"type":"boolean"},"candidateMisuse":{"type":"boolean"},"acceptedPatternGrounded":{"type":"boolean"}}}},"required":["score","grade","failedCheckIds","flags"]},"meta":{"type":"object","properties":{"model":{"type":"string"},"finishReason":{"type":"string"},"evidenceRichness":{"type":"string","enum":["none","sparse","usable","rich"]},"endpointOk":{"type":"boolean"}}},"userFeedback":{"type":"object","properties":{"rating":{"type":"string","enum":["useful","not_useful"]},"ts":{"type":"string"}},"required":["rating","ts"]},"decisionEpisode":{"$ref":"#/definitions/DecisionEpisodeV1"},"dataProvenance":{"$ref":"#/definitions/DataRecordProvenance"}},"required":["id","createdAt","mode","trigger","source","schemaVersion","headlineInsight"]},"DecisionEpisodeV1":{"type":"object","properties":{"contractVersion":{"type":"string","const":"questlife.decision.episode.v1"},"id":{"type":"string"},"subject":{"type":"object","properties":{"kind":{"type":"string","enum":["owner","demo"]},"subjectId":{"type":"string"}},"required":["kind"]},"status":{"$ref":"#/definitions/DecisionEpisodeStatus"},"question":{"type":"object","properties":{"type":{"$ref":"#/definitions/DecisionQuestionType"},"text":{"type":"string"},"targetId":{"type":"string"},"targetLabel":{"type":"string"}},"required":["type"]},"targetOutcome":{"type":"object","properties":{"horizon":{"$ref":"#/definitions/DecisionOutcomeHorizon"},"fields":{"type":"array","items":{"type":"string","enum":["state","task_result","usefulness","fatigue","carryover"]}}},"required":["horizon","fields"]},"time":{"$ref":"#/definitions/DecisionTimeSemanticsV1"},"contextSnapshot":{"$ref":"#/definitions/DecisionContextSnapshotV1"},"missingContext":{"type":"array","items":{"$ref":"#/definitions/DecisionMissingQuestionV1"}},"contextSources":{"type":"array","items":{"$ref":"#/definitions/DecisionSourceRefV1"}},"candidateActions":{"type":"array","items":{"$ref":"#/definitions/DecisionCandidateActionV1"}},"selectedActionId":{"type":"string"},"evidencePacket":{"$ref":"#/definitions/DecisionEvidencePacketV1"},"limitations":{"type":"array","items":{"type":"string"}},"safetyStatus":{"$ref":"#/definitions/DecisionSafetyStatusV1"},"proposedPlanPatch":{"$ref":"#/definitions/DecisionPlanPatchV1"},"appliedPlanPatch":{"$ref":"#/definitions/DecisionPlanPatchV1"},"undoState":{"$ref":"#/definitions/DecisionUndoStateV1"},"followUpPlan":{"$ref":"#/definitions/DecisionFollowUpPlanV1"},"followUpOutcomes":{"type":"array","items":{"$ref":"#/definitions/DecisionFollowUpOutcomeV1"}},"leverage":{"$ref":"#/definitions/DecisionLeverageReportV1"},"provenance":{"type":"object","properties":{"origin":{"$ref":"#/definitions/DataRecordOrigin"},"sourceIds":{"type":"array","items":{"type":"string"}},"syntheticOnly":{"type":"boolean"},"containsRealUserData":{"type":"boolean"}},"required":["origin","sourceIds","syntheticOnly","containsRealUserData"]},"methodVersion":{"type":"string","const":"questlife.decision.policy.v1"},"createdAt":{"type":"string"},"updatedAt":{"type":"string"}},"required":["contractVersion","id","subject","status","question","targetOutcome","time","missingContext","contextSources","candidateActions","limitations","safetyStatus","undoState","followUpOutcomes","provenance","methodVersion","createdAt","updatedAt"]},"DecisionEpisodeStatus":{"type":"string","enum":["DRAFT","CONTEXT_ASSEMBLING","NEEDS_INPUT","READY","PROPOSED","ACCEPTED","APPLIED","FOLLOW_UP_DUE","OUTCOME_RECORDED","CLOSED","ABSTAINED"]},"DecisionQuestionType":{"type":"string","enum":["training_recovery","cognitive_adjustment","overloaded_day","custom"]},"DecisionOutcomeHorizon":{"type":"string","enum":["two_hours","end_of_day","next_morning"]},"DecisionTimeSemanticsV1":{"type":"object","properties":{"eventTime":{"type":"string"},"recordedTime":{"type":"string"},"availableAt":{"type":"string"},"asOf":{"type":"string"},"timezone":{"type":"string"},"observationWindow":{"type":"object","properties":{"start":{"type":"string"},"end":{"type":"string"}},"required":["start","end"]}},"required":["eventTime","recordedTime","availableAt","asOf","timezone","observationWindow"]},"DecisionContextSnapshotV1":{"type":"object","properties":{"assembledAt":{"type":"string"},"asOf":{"type":"string"},"facts":{"type":"array","items":{"$ref":"#/definitions/DecisionContextFactV1"}},"currentState":{"type":"object","properties":{"overall":{"type":"number"},"energy":{"type":"number"},"focus":{"type":"number"},"mood":{"type":"number"},"physical":{"type":"number"},"stress":{"type":"number"},"observedAt":{"type":"string"},"sourceId":{"type":"string"}},"required":["overall","observedAt","sourceId"]},"sleepMinutes":{"type":"object","properties":{"value":{"type":"number"},"observedAt":{"type":"string"},"sourceId":{"type":"string"}},"required":["value","observedAt","sourceId"]},"recentExecution":{"type":"object","properties":{"count":{"type":"number"},"totalMinutes":{"type":"number"},"averageQuality":{"type":"number"},"sourceIds":{"type":"array","items":{"type":"string"}}},"required":["count","totalMinutes","sourceIds"]},"schedule":{"type":"object","properties":{"date":{"type":"string"},"blocks":{"type":"array","items":{"$ref":"#/definitions/ScheduleBlock"}},"fixedCount":{"type":"number"},"flexibleCount":{"type":"number"},"remainingPlannedMinutes":{"type":"number"},"openWindows":{"type":"array","items":{"type":"object","properties":{"startTime":{"type":"string"},"endTime":{"type":"string"},"minutes":{"type":"number"}},"required":["startTime","endTime","minutes"]}}},"required":["date","blocks","fixedCount","flexibleCount","remainingPlannedMinutes","openWindows"]},"direction":{"type":"object","properties":{"goalId":{"type":"string"},"goalName":{"type":"string"},"skillId":{"type":"string"},"skillName":{"type":"string"}}},"sourceRefs":{"type":"array","items":{"$ref":"#/definitions/DecisionSourceRefV1"}},"missingness":{"type":"array","items":{"type":"object","properties":{"code":{"type":"string"},"reason":{"type":"string"}},"required":["code","reason"]}},"limitations":{"type":"array","items":{"type":"string"}}},"required":["assembledAt","asOf","facts","schedule","sourceRefs","missingness","limitations"]},"DecisionContextFactV1":{"type":"object","properties":{"id":{"type":"string"},"kind":{"type":"string","enum":["state","sleep","recent_load","schedule_constraint","available_window","priority","goal_alignment","historical_episode"]},"label":{"type":"string"},"value":{"type":["number","string","boolean"]},"unit":{"type":"string"},"sourceIds":{"type":"array","items":{"type":"string"}},"observedAt":{"type":"string"}},"required":["id","kind","label","sourceIds"]},"ScheduleBlock":{"type":"object","properties":{"id":{"type":"string"},"title":{"type":"string"},"date":{"type":"string"},"startTime":{"type":"string"},"endTime":{"type":"string"},"plannedMinutes":{"type":"number"},"linkedGoalId":{"type":"string"},"linkedGoalIds":{"type":"array","items":{"type":"string"}},"linkedSkillId":{"type":"string"},"taskType":{"$ref":"#/definitions/TaskType"},"flexibility":{"type":"string","enum":["fixed","flexible","movable"]},"rigidity":{"type":"string","enum":["low","medium","high"]},"status":{"type":"string","enum":["planned","adjusted","completed","skipped"]},"placementLocked":{"type":"boolean","description":"Explicit user placement authority. Fixed commitments remain locked regardless."},"notes":{"type":"string"},"createdAt":{"type":"number"},"source":{"type":"string","enum":["manual","skill_rule"]}},"required":["id","title","date","startTime","endTime","plannedMinutes","taskType","flexibility","rigidity","status","createdAt"]},"DecisionSourceRefV1":{"type":"object","properties":{"sourceType":{"type":"string","enum":["state","context","execution","schedule","goal","skill","quant","decision_memory"]},"sourceId":{"type":"string"},"label":{"type":"string"},"eventTime":{"type":"string"},"availableAt":{"type":"string"},"origin":{"$ref":"#/definitions/DataRecordOrigin"},"eligibility":{"type":"string","enum":["eligible","limited","excluded"]},"limitationCodes":{"type":"array","items":{"type":"string"}}},"required":["sourceType","sourceId","label","eligibility"]},"DecisionMissingQuestionV1":{"type":"object","properties":{"id":{"type":"string"},"kind":{"type":"string","enum":["current_state","constraint","symptom_severity","priority","time_available"]},"promptKey":{"type":"string"},"options":{"type":"array","items":{"type":"object","properties":{"value":{"type":"string"},"labelKey":{"type":"string"}},"required":["value","labelKey"]}},"materialReasonKey":{"type":"string"},"answeredValue":{"type":"string"}},"required":["id","kind","promptKey","options","materialReasonKey"]},"DecisionCandidateActionV1":{"type":"object","properties":{"id":{"type":"string"},"kind":{"type":"string","enum":["continue","shorten","move","protect","recover","low_intensity","switch_task","leave_unplaced","abstain"]},"titleKey":{"type":"string"},"descriptionKey":{"type":"string"},"exactEffectKey":{"type":"string"},"values":{"type":"object","additionalProperties":{"type":["string","number"]}},"protectsKey":{"type":"string"},"feasibilityKey":{"type":"string"},"uncertaintyKey":{"type":"string"},"reversible":{"type":"boolean"},"outcomeHorizon":{"$ref":"#/definitions/DecisionOutcomeHorizon"},"outcomeFields":{"type":"array","items":{"type":"string","enum":["state","task_result","usefulness","fatigue","carryover"]}},"evidenceItemIds":{"type":"array","items":{"type":"string"}},"constraintIds":{"type":"array","items":{"type":"string"}},"planPatch":{"$ref":"#/definitions/DecisionPlanPatchV1"},"policyTrace":{"type":"array","items":{"type":"object","properties":{"criterion":{"type":"string"},"outcome":{"type":"string","enum":["pass","limited","blocked"]},"reason":{"type":"string"}},"required":["criterion","outcome","reason"]}}},"required":["id","kind","titleKey","descriptionKey","exactEffectKey","protectsKey","feasibilityKey","uncertaintyKey","reversible","outcomeHorizon","outcomeFields","evidenceItemIds","constraintIds","planPatch","policyTrace"]},"DecisionPlanPatchV1":{"type":"object","properties":{"id":{"type":"string"},"generatedAt":{"type":"string"},"date":{"type":"string"},"operations":{"type":"array","items":{"$ref":"#/definitions/DecisionPlanOperationV1"}},"unplacedBlockIds":{"type":"array","items":{"type":"string"}},"beforeSnapshot":{"type":"array","items":{"$ref":"#/definitions/ScheduleBlock"}},"afterSnapshot":{"type":"array","items":{"$ref":"#/definitions/ScheduleBlock"}},"confirmedAt":{"type":"string"},"appliedAt":{"type":"string"}},"required":["id","generatedAt","date","operations","unplacedBlockIds","beforeSnapshot","afterSnapshot"]},"DecisionPlanOperationV1":{"anyOf":[{"type":"object","properties":{"id":{"type":"string"},"type":{"type":"string","const":"update"},"blockId":{"type":"string"},"before":{"$ref":"#/definitions/ScheduleBlock"},"after":{"$ref":"#/definitions/ScheduleBlock"},"reasonKey":{"type":"string"}},"required":["id","type","blockId","before","after","reasonKey"]},{"type":"object","properties":{"id":{"type":"string"},"type":{"type":"string","const":"add"},"blockId":{"type":"string"},"before":{"type":"null"},"after":{"$ref":"#/definitions/ScheduleBlock"},"reasonKey":{"type":"string"}},"required":["id","type","blockId","before","after","reasonKey"]},{"type":"object","properties":{"id":{"type":"string"},"type":{"type":"string","const":"remove"},"blockId":{"type":"string"},"before":{"$ref":"#/definitions/ScheduleBlock"},"after":{"type":"null"},"reasonKey":{"type":"string"}},"required":["id","type","blockId","before","after","reasonKey"]}]},"DecisionEvidencePacketV1":{"type":"object","properties":{"contractVersion":{"type":"string","const":"questlife.decision.evidence.v1"},"target":{"type":"string"},"asOf":{"type":"string"},"eligibility":{"type":"string","enum":["eligible","limited","abstained"]},"availableLevels":{"type":"array","items":{"type":"string","enum":["A","B","C","D","E"]}},"highestEvidenceLevel":{"type":"string","enum":["A","B","C","D","E"]},"fact":{"type":"object","properties":{"value":{"type":"number"},"unit":{"type":"string"},"observedAt":{"type":"string"},"sourceId":{"type":"string"}},"required":["value","unit","observedAt","sourceId"]},"personalReference":{"type":"object","properties":{"value":{"type":"number"},"low":{"type":"number"},"high":{"type":"number"},"unit":{"type":"string"},"observationCount":{"type":"number"},"independentPeriodCount":{"type":"number"},"sourceIds":{"type":"array","items":{"type":"string"}}},"required":["unit","observationCount","independentPeriodCount","sourceIds"]},"currentDeviation":{"type":"number"},"trend":{"type":"object","properties":{"direction":{"type":"string","enum":["higher","lower","flat","unavailable"]},"absolute":{"type":"number"},"sourceIds":{"type":"array","items":{"type":"string"}}},"required":["direction","sourceIds"]},"ewma":{"type":"object","properties":{"short":{"type":"number"},"long":{"type":"number"},"observedAt":{"type":"string"},"sourceIds":{"type":"array","items":{"type":"string"}},"limitationCodes":{"type":"array","items":{"type":"string"}}},"required":["sourceIds","limitationCodes"]},"jointModel":{"type":"object","properties":{"observedDeviation":{"type":"number"},"modelAssociated":{"type":"number"},"unexplainedResidual":{"type":"number"},"completeObservationCount":{"type":"number"},"drivers":{"type":"array","items":{"type":"object","properties":{"id":{"type":"string"},"label":{"type":"string"},"contribution":{"type":"number"},"lagPeriods":{"type":"number"},"supportCount":{"type":"number"},"counterexampleCount":{"type":"number"},"stability":{"type":"string"},"limitationCodes":{"type":"array","items":{"type":"string"}}},"required":["id","label","contribution","lagPeriods","supportCount","counterexampleCount","stability","limitationCodes"]}},"limitationCodes":{"type":"array","items":{"type":"string"}}},"required":["observedDeviation","modelAssociated","unexplainedResidual","completeObservationCount","drivers","limitationCodes"]},"similarPeriods":{"type":"array","items":{"type":"object","properties":{"id":{"type":"string"},"startAt":{"type":"string"},"endAt":{"type":"string"},"distance":{"type":"number"},"matchingFeatures":{"type":"array","items":{"type":"string"}},"differentFeatures":{"type":"array","items":{"type":"string"}},"supportCount":{"type":"number"},"counterexampleCount":{"type":"number"}},"required":["id","startAt","endAt","distance","matchingFeatures","differentFeatures","supportCount","counterexampleCount"]}},"recovery":{"type":"object","properties":{"semantics":{"type":"string","enum":["historical_analogue","validated_forecast"]},"episodeCount":{"type":"number"},"path":{"type":"array","items":{"type":"object","properties":{"offsetDays":{"type":"number"},"medianDeviation":{"type":"number"},"lowDeviation":{"type":"number"},"highDeviation":{"type":"number"}},"required":["offsetDays","medianDeviation","lowDeviation","highDeviation"]}},"forecastAllowed":{"type":"boolean"},"limitationCodes":{"type":"array","items":{"type":"string"}}},"required":["semantics","episodeCount","path","forecastAllowed","limitationCodes"]},"scenarioBranches":{"type":"array","items":{"type":"object","properties":{"id":{"type":"string"},"action":{"type":"string"},"comparablePeriodCount":{"type":"number"},"observedOutcomeChange":{"type":"number"},"supportCount":{"type":"number"},"counterexampleCount":{"type":"number"},"missingOutcomeCount":{"type":"number"},"limitationCodes":{"type":"array","items":{"type":"string"}}},"required":["id","action","comparablePeriodCount","supportCount","counterexampleCount","missingOutcomeCount","limitationCodes"]}},"items":{"type":"array","items":{"$ref":"#/definitions/DecisionEvidenceItemV1"}},"missingness":{"type":"array","items":{"type":"string"}},"limitations":{"type":"array","items":{"type":"string"}},"sourceArtifactIds":{"type":"array","items":{"type":"string"}}},"required":["contractVersion","target","asOf","eligibility","availableLevels","similarPeriods","scenarioBranches","items","missingness","limitations","sourceArtifactIds"]},"DecisionEvidenceItemV1":{"type":"object","properties":{"id":{"type":"string"},"category":{"type":"string","enum":["fact","personal_comparison","observational_signal","joint_evidence","historical_analogue","historical_decision","unknown","limitation"]},"evidenceLevel":{"type":"string","enum":["A","B","C","D","E"]},"labelKey":{"type":"string"},"values":{"type":"object","additionalProperties":{"type":["string","number"]}},"sourceIds":{"type":"array","items":{"type":"string"}},"supportCount":{"type":"number"},"counterexampleCount":{"type":"number"},"limitationCodes":{"type":"array","items":{"type":"string"}}},"required":["id","category","labelKey","sourceIds"]},"DecisionSafetyStatusV1":{"type":"object","properties":{"level":{"type":"string","enum":["normal","needs_clarification","blocked"]},"matchedTerms":{"type":"array","items":{"type":"string"}},"reasonCodes":{"type":"array","items":{"type":"string"}},"userMessageKey":{"type":"string"}},"required":["level","matchedTerms","reasonCodes"]},"DecisionUndoStateV1":{"type":"object","properties":{"available":{"type":"boolean"},"usedAt":{"type":"string"},"restoredSnapshotHash":{"type":"string"}},"required":["available"]},"DecisionFollowUpPlanV1":{"type":"object","properties":{"id":{"type":"string"},"horizon":{"$ref":"#/definitions/DecisionOutcomeHorizon"},"dueAt":{"type":"string"},"requiredFields":{"type":"array","items":{"type":"string","enum":["state","task_result","usefulness","fatigue","carryover"]}},"status":{"type":"string","enum":["pending","due","completed","skipped"]}},"required":["id","horizon","dueAt","requiredFields","status"]},"DecisionFollowUpOutcomeV1":{"type":"object","properties":{"id":{"type":"string"},"recordedAt":{"type":"string"},"state":{"type":"number"},"fatigue":{"type":"number"},"taskResult":{"$ref":"#/definitions/DecisionTaskResult"},"usefulness":{"$ref":"#/definitions/DecisionUsefulness"},"carryover":{"type":"string","enum":["none","some","significant"]},"note":{"type":"string"}},"required":["id","recordedAt"]},"DecisionTaskResult":{"type":"string","enum":["completed","partially_completed","not_completed","not_applicable"]},"DecisionUsefulness":{"type":"string","enum":["helpful","uncertain","not_helpful"]},"DecisionLeverageReportV1":{"type":"object","properties":{"fixtureOnly":{"type":"boolean"},"contextItemsAutoAssembled":{"type":"number"},"questionsAvoided":{"type":"number"},"questionsAsked":{"type":"number"},"userTaps":{"type":"number"},"decisionTimeMs":{"type":"number"},"planActionsApplied":{"type":"number"},"followUpCompleted":{"type":"boolean"},"outcomeAvailable":{"type":"boolean"}},"required":["fixtureOnly","contextItemsAutoAssembled","questionsAvoided","questionsAsked","userTaps","decisionTimeMs","planActionsApplied","followUpCompleted","outcomeAvailable"]},"PatternMemory":{"type":"object","properties":{"id":{"type":"string"},"createdAt":{"type":"string"},"updatedAt":{"type":"string"},"status":{"type":"string","enum":["candidate","accepted","rejected","archived"]},"label":{"type":"string"},"description":{"type":"string"},"patternType":{"type":"string","enum":["action_state_effect","context_state_effect","decision_feedback","schedule_timing","recovery_readiness","execution_quality","perception_gap","other"]},"evidenceBasis":{"type":"string","enum":["personal_pattern","mixed","population_prior"]},"confidence":{"type":"number"},"sampleN":{"type":"number"},"support":{"type":"array","items":{"$ref":"#/definitions/PatternMemorySupport"}},"caution":{"type":"string"},"lastSeenAt":{"type":"string"},"usefulness":{"type":"object","properties":{"usefulCount":{"type":"number"},"notUsefulCount":{"type":"number"}},"required":["usefulCount","notUsefulCount"]},"dataProvenance":{"$ref":"#/definitions/DataRecordProvenance"}},"required":["id","createdAt","updatedAt","status","label","description","patternType","evidenceBasis","confidence","sampleN","support"]},"PatternMemorySupport":{"type":"object","properties":{"sourceType":{"type":"string","enum":["execution","state","context","decision_result","after_state"]},"sourceId":{"type":"string"},"ts":{"type":"string"},"summary":{"type":"string"}},"required":["sourceType","summary"]},"RawCapture":{"type":"object","properties":{"id":{"type":"string"},"text":{"type":"string"},"createdAt":{"type":"string"},"parseStatus":{"type":"string","enum":["pending","done","failed"]},"parsed":{"type":"object","properties":{"type":{"type":"string","enum":["training","reading","state","misc"]},"fields":{"type":"object"},"crossLinks":{"type":"array","items":{"type":"object","properties":{"captureId":{"type":"string"},"reason":{"type":"string"}},"required":["captureId","reason"]}},"insight":{"type":"object","properties":{"zh":{"type":"string"},"en":{"type":"string"}},"required":["zh","en"]},"matchedSkillIds":{"type":"array","items":{"type":"string"}},"linkedGoalId":{"type":"string"},"insightType":{"type":"string","enum":["skill_progress","goal_link","cross_link","encourage"]},"entries":{"type":"array","items":{"$ref":"#/definitions/ParsedEntry"}},"entriesDismissed":{"type":"boolean"},"completionSchema":{"$ref":"#/definitions/CompletionSchema"},"parserMeta":{"$ref":"#/definitions/DataParserMetadata"}},"required":["type","fields","crossLinks","insight"]},"dataProvenance":{"$ref":"#/definitions/DataRecordProvenance"}},"required":["id","text","createdAt","parseStatus"]},"ParsedEntry":{"type":"object","properties":{"skillName":{"type":"string"},"matchedSkillId":{"type":["string","null"]},"goalType":{"type":"string"},"progressType":{"type":"string"},"fields":{"type":"object","properties":{"sets":{"type":"array","items":{"$ref":"#/definitions/ParsedStrengthSet"}},"extraWeight":{"type":"number"},"durationMinutes":{"type":"number"},"note":{"type":"string"},"value":{"type":"number"},"unit":{"type":"string"}}},"qualityRating":{"type":"number"}},"required":["skillName","matchedSkillId","progressType","fields"],"description":"One structured execution item extracted from a natural-language capture. LLM fills only known fields from the template; no invented structure."},"ParsedStrengthSet":{"type":"object","properties":{"weight":{"type":"number"},"reps":{"type":"number"}},"description":"One strength-training set, component of ParsedEntry.fields.sets"},"CompletionSchema":{"type":"object","properties":{"needsCompletion":{"type":"boolean"},"domain":{"type":"string","enum":["fitness","learning","state","food","other"]},"suggestedActions":{"type":"array","items":{"type":"string"},"description":"Dynamic action/exercise/scope candidates from LLM — NOT a hardcoded list"},"matchedGoalId":{"type":["string","null"]},"matchedModuleId":{"type":["string","null"]},"goalConfidence":{"type":"string","enum":["high","medium","low"]},"shouldCreateGoal":{"type":"boolean"},"newGoalSuggestion":{"anyOf":[{"type":"object","properties":{"name":{"type":"string"},"domain":{"type":"string"}},"required":["name","domain"]},{"type":"null"}]},"durationOptions":{"type":"array","items":{"type":"number"}},"askDuration":{"type":"boolean"}},"required":["needsCompletion","domain","suggestedActions","matchedGoalId","matchedModuleId","goalConfidence","shouldCreateGoal","newGoalSuggestion","durationOptions","askDuration"],"description":"LLM-driven completion schema — replaces hardcoded smartRouting domain logic"},"DashboardPreferences":{"type":"object","properties":{"activePreset":{"$ref":"#/definitions/DashboardPresetId"},"todayCards":{"type":"array","items":{"$ref":"#/definitions/DashboardCardPreference"}},"insightsCards":{"type":"array","items":{"$ref":"#/definitions/DashboardCardPreference"}},"updatedAt":{"type":"string"}},"required":["activePreset","todayCards","insightsCards"]},"DashboardPresetId":{"type":"string","enum":["default","learning","fitness","recovery","advanced"]},"DashboardCardPreference":{"type":"object","properties":{"cardId":{"type":"string"},"visible":{"type":"boolean"},"order":{"type":"number"},"size":{"$ref":"#/definitions/DashboardCardSize"}},"required":["cardId","visible","order","size"]},"DashboardCardSize":{"type":"string","enum":["small","medium","large"]}}};
const schema7 = {"type":"object","properties":{"goals":{"type":"array","items":{"$ref":"#/definitions/Goal"}},"categories":{"type":"array","items":{"$ref":"#/definitions/Category"}},"modules":{"type":"array","items":{"$ref":"#/definitions/QuestModule"}},"moduleSkillLinks":{"type":"array","items":{"$ref":"#/definitions/ModuleSkillLink"}},"skills":{"type":"array","items":{"$ref":"#/definitions/Skill"}},"actions":{"type":"array","items":{"$ref":"#/definitions/Action"}},"executionLogs":{"type":"array","items":{"$ref":"#/definitions/ExecutionLog"}},"effortUnits":{"type":"array","items":{"$ref":"#/definitions/EffortUnit"}},"contributionLinks":{"type":"array","items":{"$ref":"#/definitions/ContributionLink"}},"rescueLogs":{"type":"array","items":{"$ref":"#/definitions/RescueLog"}},"stateCheckIns":{"type":"array","items":{"$ref":"#/definitions/StateCheckIn"}},"contextLogs":{"type":"array","items":{"$ref":"#/definitions/ContextLog"}},"decisionResults":{"type":"array","items":{"$ref":"#/definitions/DecisionResult"}},"patternMemory":{"type":"array","items":{"$ref":"#/definitions/PatternMemory"}},"scheduleBlocks":{"type":"array","items":{"$ref":"#/definitions/ScheduleBlock"}},"rawCaptures":{"type":"array","items":{"$ref":"#/definitions/RawCapture"}},"settings":{"type":"object","properties":{"reminderHour":{"type":"number"},"reminderMinute":{"type":"number"},"reminderEnabled":{"type":"boolean"},"accentColor":{"type":"string","deprecated":"Migrated away by the global visual foundation cleanup."},"language":{"type":"string","enum":["zh","en"]},"preferredLanguage":{"type":"string","enum":["zh","en"]},"selectedThemeId":{"type":"string"},"onboardingCompleted":{"type":"boolean"},"onboardingVersion":{"type":"number"},"firstQuestCreated":{"type":"boolean"},"onboardingRestartRequested":{"type":"boolean"},"firstSystemWelcomeDismissed":{"type":"boolean"},"dashboardPreferences":{"$ref":"#/definitions/DashboardPreferences"}}}},"required":["goals","categories","modules","moduleSkillLinks","skills","actions","executionLogs","effortUnits","contributionLinks","rescueLogs","stateCheckIns","contextLogs","decisionResults","patternMemory","scheduleBlocks","rawCaptures","settings"]};
const schema8 = {"type":"object","properties":{"id":{"type":"string"},"title":{"type":"string"},"description":{"type":"string"},"level":{"$ref":"#/definitions/GoalLevel"},"parentId":{"type":"string"},"skillIds":{"type":"array","items":{"type":"string"}},"createdAt":{"type":"number"},"targetDate":{"type":"number"},"completed":{"type":"boolean"},"completedAt":{"type":"number"},"color":{"type":"string"}},"required":["id","title","level","skillIds","createdAt","completed"]};
const schema9 = {"type":"string","enum":["life","big","daily"]};

function validate24(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(typeof data !== "string"){
validate24.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((data === "life") || (data === "big")) || (data === "daily"))){
validate24.errors = [{instancePath,schemaPath:"#/enum",keyword:"enum",params:{allowedValues: schema9.enum},message:"must be equal to one of the allowed values"}];
return false;
}
validate24.errors = vErrors;
return errors === 0;
}


function validate23(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((data.id === undefined) && (missing0 = "id")) || ((data.title === undefined) && (missing0 = "title"))) || ((data.level === undefined) && (missing0 = "level"))) || ((data.skillIds === undefined) && (missing0 = "skillIds"))) || ((data.createdAt === undefined) && (missing0 = "createdAt"))) || ((data.completed === undefined) && (missing0 = "completed"))){
validate23.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.id !== undefined){
const _errs1 = errors;
if(typeof data.id !== "string"){
validate23.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.title !== undefined){
const _errs3 = errors;
if(typeof data.title !== "string"){
validate23.errors = [{instancePath:instancePath+"/title",schemaPath:"#/properties/title/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.description !== undefined){
const _errs5 = errors;
if(typeof data.description !== "string"){
validate23.errors = [{instancePath:instancePath+"/description",schemaPath:"#/properties/description/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.level !== undefined){
const _errs7 = errors;
if(!(validate24(data.level, {instancePath:instancePath+"/level",parentData:data,parentDataProperty:"level",rootData}))){
vErrors = vErrors === null ? validate24.errors : vErrors.concat(validate24.errors);
errors = vErrors.length;
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.parentId !== undefined){
const _errs8 = errors;
if(typeof data.parentId !== "string"){
validate23.errors = [{instancePath:instancePath+"/parentId",schemaPath:"#/properties/parentId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs8 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.skillIds !== undefined){
let data5 = data.skillIds;
const _errs10 = errors;
if(errors === _errs10){
if(Array.isArray(data5)){
var valid1 = true;
const len0 = data5.length;
for(let i0=0; i0<len0; i0++){
const _errs12 = errors;
if(typeof data5[i0] !== "string"){
validate23.errors = [{instancePath:instancePath+"/skillIds/" + i0,schemaPath:"#/properties/skillIds/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid1 = _errs12 === errors;
if(!valid1){
break;
}
}
}
else {
validate23.errors = [{instancePath:instancePath+"/skillIds",schemaPath:"#/properties/skillIds/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.createdAt !== undefined){
const _errs14 = errors;
if(!(typeof data.createdAt == "number")){
validate23.errors = [{instancePath:instancePath+"/createdAt",schemaPath:"#/properties/createdAt/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs14 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.targetDate !== undefined){
const _errs16 = errors;
if(!(typeof data.targetDate == "number")){
validate23.errors = [{instancePath:instancePath+"/targetDate",schemaPath:"#/properties/targetDate/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs16 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.completed !== undefined){
const _errs18 = errors;
if(typeof data.completed !== "boolean"){
validate23.errors = [{instancePath:instancePath+"/completed",schemaPath:"#/properties/completed/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs18 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.completedAt !== undefined){
const _errs20 = errors;
if(!(typeof data.completedAt == "number")){
validate23.errors = [{instancePath:instancePath+"/completedAt",schemaPath:"#/properties/completedAt/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs20 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.color !== undefined){
const _errs22 = errors;
if(typeof data.color !== "string"){
validate23.errors = [{instancePath:instancePath+"/color",schemaPath:"#/properties/color/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs22 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate23.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate23.errors = vErrors;
return errors === 0;
}

const schema10 = {"type":"object","properties":{"id":{"type":"string"},"name":{"type":"string"},"emoji":{"type":"string"},"color":{"type":"string"},"goalType":{"$ref":"#/definitions/GoalType"},"domain":{"$ref":"#/definitions/DomainTemplateDomain"},"domainTemplateId":{"type":"string"},"vision":{"type":"string"},"description":{"type":"string"},"targetDate":{"type":"string"},"progressModel":{"$ref":"#/definitions/GoalProgressModel"},"manualProgress":{"type":"number"},"outcomeCriteria":{"type":"array","items":{"$ref":"#/definitions/OutcomeCriterion"}},"createdAt":{"type":"number"}},"required":["id","name","createdAt"]};
const schema11 = {"type":"string","enum":["fitness","career","study","exam","finance","health","project","custom"]};

function validate28(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(typeof data !== "string"){
validate28.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((((((((data === "fitness") || (data === "career")) || (data === "study")) || (data === "exam")) || (data === "finance")) || (data === "health")) || (data === "project")) || (data === "custom"))){
validate28.errors = [{instancePath,schemaPath:"#/enum",keyword:"enum",params:{allowedValues: schema11.enum},message:"must be equal to one of the allowed values"}];
return false;
}
validate28.errors = vErrors;
return errors === 0;
}

const schema12 = {"type":"string","enum":["fitness_strength","fitness_physique","study_course","exam_prep","writing_assignment","coding_project","creative_project","career_skill","life_maintenance","recovery_health","finance_tracking","custom"]};

function validate30(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(typeof data !== "string"){
validate30.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((((((((((((data === "fitness_strength") || (data === "fitness_physique")) || (data === "study_course")) || (data === "exam_prep")) || (data === "writing_assignment")) || (data === "coding_project")) || (data === "creative_project")) || (data === "career_skill")) || (data === "life_maintenance")) || (data === "recovery_health")) || (data === "finance_tracking")) || (data === "custom"))){
validate30.errors = [{instancePath,schemaPath:"#/enum",keyword:"enum",params:{allowedValues: schema12.enum},message:"must be equal to one of the allowed values"}];
return false;
}
validate30.errors = vErrors;
return errors === 0;
}

const schema13 = {"type":"string","enum":["criteria_weighted","module_average","skill_average","manual"]};

function validate32(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(typeof data !== "string"){
validate32.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((((data === "criteria_weighted") || (data === "module_average")) || (data === "skill_average")) || (data === "manual"))){
validate32.errors = [{instancePath,schemaPath:"#/enum",keyword:"enum",params:{allowedValues: schema13.enum},message:"must be equal to one of the allowed values"}];
return false;
}
validate32.errors = vErrors;
return errors === 0;
}

const schema14 = {"type":"object","properties":{"id":{"type":"string"},"title":{"type":"string"},"description":{"type":"string"},"linkedSkillId":{"type":"string"},"metricType":{"$ref":"#/definitions/OutcomeMetricType"},"currentValue":{"type":"number"},"targetValue":{"type":"number"},"unit":{"type":"string"},"weight":{"type":"number"},"completed":{"type":"boolean"},"checklistItemIds":{"type":"array","items":{"type":"string"}},"stateMetric":{"type":"string"},"currency":{"type":"string"}},"required":["id","title","metricType","weight"]};
const schema15 = {"type":"string","enum":["none","target_value","time_based","frequency","checklist","curriculum","performance_log","quality_score","state_based","money_based","qualitative","manual","binary"]};

function validate35(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(typeof data !== "string"){
validate35.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((((((((((((data === "none") || (data === "target_value")) || (data === "time_based")) || (data === "frequency")) || (data === "checklist")) || (data === "curriculum")) || (data === "performance_log")) || (data === "quality_score")) || (data === "state_based")) || (data === "money_based")) || (data === "qualitative")) || (data === "manual")) || (data === "binary"))){
validate35.errors = [{instancePath,schemaPath:"#/enum",keyword:"enum",params:{allowedValues: schema15.enum},message:"must be equal to one of the allowed values"}];
return false;
}
validate35.errors = vErrors;
return errors === 0;
}


function validate34(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((data.id === undefined) && (missing0 = "id")) || ((data.title === undefined) && (missing0 = "title"))) || ((data.metricType === undefined) && (missing0 = "metricType"))) || ((data.weight === undefined) && (missing0 = "weight"))){
validate34.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.id !== undefined){
const _errs1 = errors;
if(typeof data.id !== "string"){
validate34.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.title !== undefined){
const _errs3 = errors;
if(typeof data.title !== "string"){
validate34.errors = [{instancePath:instancePath+"/title",schemaPath:"#/properties/title/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.description !== undefined){
const _errs5 = errors;
if(typeof data.description !== "string"){
validate34.errors = [{instancePath:instancePath+"/description",schemaPath:"#/properties/description/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.linkedSkillId !== undefined){
const _errs7 = errors;
if(typeof data.linkedSkillId !== "string"){
validate34.errors = [{instancePath:instancePath+"/linkedSkillId",schemaPath:"#/properties/linkedSkillId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.metricType !== undefined){
const _errs9 = errors;
if(!(validate35(data.metricType, {instancePath:instancePath+"/metricType",parentData:data,parentDataProperty:"metricType",rootData}))){
vErrors = vErrors === null ? validate35.errors : vErrors.concat(validate35.errors);
errors = vErrors.length;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.currentValue !== undefined){
const _errs10 = errors;
if(!(typeof data.currentValue == "number")){
validate34.errors = [{instancePath:instancePath+"/currentValue",schemaPath:"#/properties/currentValue/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.targetValue !== undefined){
const _errs12 = errors;
if(!(typeof data.targetValue == "number")){
validate34.errors = [{instancePath:instancePath+"/targetValue",schemaPath:"#/properties/targetValue/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs12 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.unit !== undefined){
const _errs14 = errors;
if(typeof data.unit !== "string"){
validate34.errors = [{instancePath:instancePath+"/unit",schemaPath:"#/properties/unit/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs14 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.weight !== undefined){
const _errs16 = errors;
if(!(typeof data.weight == "number")){
validate34.errors = [{instancePath:instancePath+"/weight",schemaPath:"#/properties/weight/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs16 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.completed !== undefined){
const _errs18 = errors;
if(typeof data.completed !== "boolean"){
validate34.errors = [{instancePath:instancePath+"/completed",schemaPath:"#/properties/completed/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs18 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.checklistItemIds !== undefined){
let data10 = data.checklistItemIds;
const _errs20 = errors;
if(errors === _errs20){
if(Array.isArray(data10)){
var valid1 = true;
const len0 = data10.length;
for(let i0=0; i0<len0; i0++){
const _errs22 = errors;
if(typeof data10[i0] !== "string"){
validate34.errors = [{instancePath:instancePath+"/checklistItemIds/" + i0,schemaPath:"#/properties/checklistItemIds/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid1 = _errs22 === errors;
if(!valid1){
break;
}
}
}
else {
validate34.errors = [{instancePath:instancePath+"/checklistItemIds",schemaPath:"#/properties/checklistItemIds/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs20 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.stateMetric !== undefined){
const _errs24 = errors;
if(typeof data.stateMetric !== "string"){
validate34.errors = [{instancePath:instancePath+"/stateMetric",schemaPath:"#/properties/stateMetric/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs24 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.currency !== undefined){
const _errs26 = errors;
if(typeof data.currency !== "string"){
validate34.errors = [{instancePath:instancePath+"/currency",schemaPath:"#/properties/currency/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs26 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate34.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate34.errors = vErrors;
return errors === 0;
}


function validate27(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((data.id === undefined) && (missing0 = "id")) || ((data.name === undefined) && (missing0 = "name"))) || ((data.createdAt === undefined) && (missing0 = "createdAt"))){
validate27.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.id !== undefined){
const _errs1 = errors;
if(typeof data.id !== "string"){
validate27.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.name !== undefined){
const _errs3 = errors;
if(typeof data.name !== "string"){
validate27.errors = [{instancePath:instancePath+"/name",schemaPath:"#/properties/name/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.emoji !== undefined){
const _errs5 = errors;
if(typeof data.emoji !== "string"){
validate27.errors = [{instancePath:instancePath+"/emoji",schemaPath:"#/properties/emoji/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.color !== undefined){
const _errs7 = errors;
if(typeof data.color !== "string"){
validate27.errors = [{instancePath:instancePath+"/color",schemaPath:"#/properties/color/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.goalType !== undefined){
const _errs9 = errors;
if(!(validate28(data.goalType, {instancePath:instancePath+"/goalType",parentData:data,parentDataProperty:"goalType",rootData}))){
vErrors = vErrors === null ? validate28.errors : vErrors.concat(validate28.errors);
errors = vErrors.length;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.domain !== undefined){
const _errs10 = errors;
if(!(validate30(data.domain, {instancePath:instancePath+"/domain",parentData:data,parentDataProperty:"domain",rootData}))){
vErrors = vErrors === null ? validate30.errors : vErrors.concat(validate30.errors);
errors = vErrors.length;
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.domainTemplateId !== undefined){
const _errs11 = errors;
if(typeof data.domainTemplateId !== "string"){
validate27.errors = [{instancePath:instancePath+"/domainTemplateId",schemaPath:"#/properties/domainTemplateId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.vision !== undefined){
const _errs13 = errors;
if(typeof data.vision !== "string"){
validate27.errors = [{instancePath:instancePath+"/vision",schemaPath:"#/properties/vision/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.description !== undefined){
const _errs15 = errors;
if(typeof data.description !== "string"){
validate27.errors = [{instancePath:instancePath+"/description",schemaPath:"#/properties/description/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs15 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.targetDate !== undefined){
const _errs17 = errors;
if(typeof data.targetDate !== "string"){
validate27.errors = [{instancePath:instancePath+"/targetDate",schemaPath:"#/properties/targetDate/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs17 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.progressModel !== undefined){
const _errs19 = errors;
if(!(validate32(data.progressModel, {instancePath:instancePath+"/progressModel",parentData:data,parentDataProperty:"progressModel",rootData}))){
vErrors = vErrors === null ? validate32.errors : vErrors.concat(validate32.errors);
errors = vErrors.length;
}
var valid0 = _errs19 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.manualProgress !== undefined){
const _errs20 = errors;
if(!(typeof data.manualProgress == "number")){
validate27.errors = [{instancePath:instancePath+"/manualProgress",schemaPath:"#/properties/manualProgress/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs20 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.outcomeCriteria !== undefined){
let data12 = data.outcomeCriteria;
const _errs22 = errors;
if(errors === _errs22){
if(Array.isArray(data12)){
var valid1 = true;
const len0 = data12.length;
for(let i0=0; i0<len0; i0++){
const _errs24 = errors;
if(!(validate34(data12[i0], {instancePath:instancePath+"/outcomeCriteria/" + i0,parentData:data12,parentDataProperty:i0,rootData}))){
vErrors = vErrors === null ? validate34.errors : vErrors.concat(validate34.errors);
errors = vErrors.length;
}
var valid1 = _errs24 === errors;
if(!valid1){
break;
}
}
}
else {
validate27.errors = [{instancePath:instancePath+"/outcomeCriteria",schemaPath:"#/properties/outcomeCriteria/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs22 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.createdAt !== undefined){
const _errs25 = errors;
if(!(typeof data.createdAt == "number")){
validate27.errors = [{instancePath:instancePath+"/createdAt",schemaPath:"#/properties/createdAt/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs25 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate27.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate27.errors = vErrors;
return errors === 0;
}

const schema16 = {"type":"object","properties":{"id":{"type":"string"},"goalId":{"type":"string"},"name":{"type":"string"},"icon":{"type":"string"},"description":{"type":"string"},"order":{"type":"number"},"progress":{"type":"number"},"createdFromTemplateId":{"type":"string"},"moduleTemplateId":{"type":"string"},"createdAt":{"type":"number"}},"required":["id","goalId","name","createdAt"]};

function validate39(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((data.id === undefined) && (missing0 = "id")) || ((data.goalId === undefined) && (missing0 = "goalId"))) || ((data.name === undefined) && (missing0 = "name"))) || ((data.createdAt === undefined) && (missing0 = "createdAt"))){
validate39.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.id !== undefined){
const _errs1 = errors;
if(typeof data.id !== "string"){
validate39.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.goalId !== undefined){
const _errs3 = errors;
if(typeof data.goalId !== "string"){
validate39.errors = [{instancePath:instancePath+"/goalId",schemaPath:"#/properties/goalId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.name !== undefined){
const _errs5 = errors;
if(typeof data.name !== "string"){
validate39.errors = [{instancePath:instancePath+"/name",schemaPath:"#/properties/name/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.icon !== undefined){
const _errs7 = errors;
if(typeof data.icon !== "string"){
validate39.errors = [{instancePath:instancePath+"/icon",schemaPath:"#/properties/icon/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.description !== undefined){
const _errs9 = errors;
if(typeof data.description !== "string"){
validate39.errors = [{instancePath:instancePath+"/description",schemaPath:"#/properties/description/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.order !== undefined){
const _errs11 = errors;
if(!(typeof data.order == "number")){
validate39.errors = [{instancePath:instancePath+"/order",schemaPath:"#/properties/order/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.progress !== undefined){
const _errs13 = errors;
if(!(typeof data.progress == "number")){
validate39.errors = [{instancePath:instancePath+"/progress",schemaPath:"#/properties/progress/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.createdFromTemplateId !== undefined){
const _errs15 = errors;
if(typeof data.createdFromTemplateId !== "string"){
validate39.errors = [{instancePath:instancePath+"/createdFromTemplateId",schemaPath:"#/properties/createdFromTemplateId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs15 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.moduleTemplateId !== undefined){
const _errs17 = errors;
if(typeof data.moduleTemplateId !== "string"){
validate39.errors = [{instancePath:instancePath+"/moduleTemplateId",schemaPath:"#/properties/moduleTemplateId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs17 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.createdAt !== undefined){
const _errs19 = errors;
if(!(typeof data.createdAt == "number")){
validate39.errors = [{instancePath:instancePath+"/createdAt",schemaPath:"#/properties/createdAt/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs19 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate39.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate39.errors = vErrors;
return errors === 0;
}

const schema17 = {"type":"object","properties":{"id":{"type":"string"},"goalId":{"type":"string"},"moduleId":{"type":"string"},"skillId":{"type":"string"},"role":{"type":"string","enum":["primary","supporting","optional"]},"order":{"type":"number"},"note":{"type":"string"},"createdAt":{"type":"number"}},"required":["id","goalId","moduleId","skillId","createdAt"]};

function validate41(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((data.id === undefined) && (missing0 = "id")) || ((data.goalId === undefined) && (missing0 = "goalId"))) || ((data.moduleId === undefined) && (missing0 = "moduleId"))) || ((data.skillId === undefined) && (missing0 = "skillId"))) || ((data.createdAt === undefined) && (missing0 = "createdAt"))){
validate41.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.id !== undefined){
const _errs1 = errors;
if(typeof data.id !== "string"){
validate41.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.goalId !== undefined){
const _errs3 = errors;
if(typeof data.goalId !== "string"){
validate41.errors = [{instancePath:instancePath+"/goalId",schemaPath:"#/properties/goalId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.moduleId !== undefined){
const _errs5 = errors;
if(typeof data.moduleId !== "string"){
validate41.errors = [{instancePath:instancePath+"/moduleId",schemaPath:"#/properties/moduleId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.skillId !== undefined){
const _errs7 = errors;
if(typeof data.skillId !== "string"){
validate41.errors = [{instancePath:instancePath+"/skillId",schemaPath:"#/properties/skillId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.role !== undefined){
let data4 = data.role;
const _errs9 = errors;
if(typeof data4 !== "string"){
validate41.errors = [{instancePath:instancePath+"/role",schemaPath:"#/properties/role/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((data4 === "primary") || (data4 === "supporting")) || (data4 === "optional"))){
validate41.errors = [{instancePath:instancePath+"/role",schemaPath:"#/properties/role/enum",keyword:"enum",params:{allowedValues: schema17.properties.role.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.order !== undefined){
const _errs11 = errors;
if(!(typeof data.order == "number")){
validate41.errors = [{instancePath:instancePath+"/order",schemaPath:"#/properties/order/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.note !== undefined){
const _errs13 = errors;
if(typeof data.note !== "string"){
validate41.errors = [{instancePath:instancePath+"/note",schemaPath:"#/properties/note/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.createdAt !== undefined){
const _errs15 = errors;
if(!(typeof data.createdAt == "number")){
validate41.errors = [{instancePath:instancePath+"/createdAt",schemaPath:"#/properties/createdAt/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs15 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
else {
validate41.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate41.errors = vErrors;
return errors === 0;
}

const schema18 = {"type":"object","properties":{"id":{"type":"string"},"name":{"type":"string"},"icon":{"type":"string"},"color":{"type":"string"},"totalXP":{"type":"number"},"dailyTargetMinutes":{"type":"number"},"totalTargetHours":{"type":"number"},"createdAt":{"type":"number"},"goalId":{"type":"string"},"linkedGoalIds":{"type":"array","items":{"type":"string"}},"moduleId":{"type":"string"},"progressType":{"$ref":"#/definitions/ProgressType"},"metricConfig":{"$ref":"#/definitions/MetricConfig"},"domainTemplateId":{"type":"string"},"createdFromTemplateId":{"type":"string"},"skillTemplateId":{"type":"string"},"moduleTemplateId":{"type":"string"},"recordingFieldKeys":{"type":"array","items":{"type":"string"}},"currentValue":{"type":"number"},"targetValue":{"type":"number"},"unit":{"type":"string"},"targetHours":{"type":"number"},"completedHours":{"type":"number"},"curriculumItems":{"type":"array","items":{"$ref":"#/definitions/CurriculumItem"}},"weeklyTargetCount":{"type":"number"},"completedThisWeek":{"type":"number"},"categoryId":{"type":"string"},"reminderHour":{"type":"number"},"reminderMinute":{"type":"number"},"reminderEnabled":{"type":"boolean"},"taskType":{"$ref":"#/definitions/TaskType"},"scheduleEnabled":{"type":"boolean"},"scheduleType":{"type":"string","enum":["daily","weekly_days","times_per_week","manual_only"]},"weeklyDays":{"type":"array","items":{"type":"string"}},"timesPerWeek":{"type":"number"},"defaultStartTime":{"type":"string"},"defaultDurationMinutes":{"type":"number"},"flexibility":{"type":"string","enum":["fixed","flexible","movable"]},"rigidity":{"type":"string","enum":["low","medium","high"]},"mentalCost":{"type":"number"},"physicalCost":{"type":"number"},"emotionalCost":{"type":"number"},"recoveryImpact":{"type":"number"},"compressibility":{"type":"number"}},"required":["id","name","color","totalXP","dailyTargetMinutes","createdAt"]};
const schema19 = {"type":"string","enum":["none","time_based","target_value","checklist","curriculum","performance_log","quality_score","state_based","money_based","binary","frequency","qualitative"]};

function validate44(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(typeof data !== "string"){
validate44.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((((((((((((data === "none") || (data === "time_based")) || (data === "target_value")) || (data === "checklist")) || (data === "curriculum")) || (data === "performance_log")) || (data === "quality_score")) || (data === "state_based")) || (data === "money_based")) || (data === "binary")) || (data === "frequency")) || (data === "qualitative"))){
validate44.errors = [{instancePath,schemaPath:"#/enum",keyword:"enum",params:{allowedValues: schema19.enum},message:"must be equal to one of the allowed values"}];
return false;
}
validate44.errors = vErrors;
return errors === 0;
}

const schema20 = {"type":"object","properties":{"metricType":{"$ref":"#/definitions/ProgressType"},"unit":{"type":"string"},"targetLabel":{"type":"string"},"completedHours":{"type":"number"},"targetHours":{"type":"number"},"currentValue":{"type":"number"},"targetValue":{"type":"number"},"weeklyTargetCount":{"type":"number"},"completedThisWeek":{"type":"number"},"checklistItems":{"type":"array","items":{"$ref":"#/definitions/CurriculumItem"}},"averageQuality":{"type":"number"},"targetQuality":{"type":"number"},"stateMetric":{"$ref":"#/definitions/StateMetric"},"targetStateValue":{"type":"number"},"averageStateValue":{"type":"number"},"currentAmount":{"type":"number"},"targetAmount":{"type":"number"},"currency":{"type":"string"},"completed":{"type":"boolean"},"performanceType":{"$ref":"#/definitions/PerformanceType"},"primaryMetric":{"$ref":"#/definitions/PrimaryPerformanceMetric"},"useEstimated1RM":{"type":"boolean"},"trackVolume":{"type":"boolean"},"trackRPE":{"type":"boolean"},"bestValue":{"type":"number"},"targetPerformanceValue":{"type":"number"},"currentBest":{"type":"number"},"bestEstimated1RM":{"type":"number"},"bestVolume":{"type":"number"},"milestones":{"type":"array","items":{"type":"object","properties":{"id":{"type":"string"},"title":{"type":"string"},"completed":{"type":"boolean"},"note":{"type":"string"},"date":{"type":"string"}},"required":["id","title"]}}},"required":["metricType"]};
const schema21 = {"type":"object","properties":{"id":{"type":"string"},"title":{"type":"string"},"completed":{"type":"boolean"}},"required":["id","title","completed"]};

function validate48(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((data.id === undefined) && (missing0 = "id")) || ((data.title === undefined) && (missing0 = "title"))) || ((data.completed === undefined) && (missing0 = "completed"))){
validate48.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.id !== undefined){
const _errs1 = errors;
if(typeof data.id !== "string"){
validate48.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.title !== undefined){
const _errs3 = errors;
if(typeof data.title !== "string"){
validate48.errors = [{instancePath:instancePath+"/title",schemaPath:"#/properties/title/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.completed !== undefined){
const _errs5 = errors;
if(typeof data.completed !== "boolean"){
validate48.errors = [{instancePath:instancePath+"/completed",schemaPath:"#/properties/completed/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
else {
validate48.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate48.errors = vErrors;
return errors === 0;
}

const schema22 = {"type":"string","enum":["energy","focus","mood","sleep","stress","recovery","health","custom"]};

function validate50(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(typeof data !== "string"){
validate50.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((((((((data === "energy") || (data === "focus")) || (data === "mood")) || (data === "sleep")) || (data === "stress")) || (data === "recovery")) || (data === "health")) || (data === "custom"))){
validate50.errors = [{instancePath,schemaPath:"#/enum",keyword:"enum",params:{allowedValues: schema22.enum},message:"must be equal to one of the allowed values"}];
return false;
}
validate50.errors = vErrors;
return errors === 0;
}

const schema23 = {"type":"string","enum":["strength","endurance","skill_reps","speed","accuracy","business","custom"]};

function validate52(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(typeof data !== "string"){
validate52.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((((((data === "strength") || (data === "endurance")) || (data === "skill_reps")) || (data === "speed")) || (data === "accuracy")) || (data === "business")) || (data === "custom"))){
validate52.errors = [{instancePath,schemaPath:"#/enum",keyword:"enum",params:{allowedValues: schema23.enum},message:"must be equal to one of the allowed values"}];
return false;
}
validate52.errors = vErrors;
return errors === 0;
}

const schema24 = {"type":"string","enum":["weight","volume","estimated_1rm","reps","distance","pace","accuracy","conversion_rate","revenue","custom"]};

function validate54(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(typeof data !== "string"){
validate54.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((((((((((data === "weight") || (data === "volume")) || (data === "estimated_1rm")) || (data === "reps")) || (data === "distance")) || (data === "pace")) || (data === "accuracy")) || (data === "conversion_rate")) || (data === "revenue")) || (data === "custom"))){
validate54.errors = [{instancePath,schemaPath:"#/enum",keyword:"enum",params:{allowedValues: schema24.enum},message:"must be equal to one of the allowed values"}];
return false;
}
validate54.errors = vErrors;
return errors === 0;
}


function validate46(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((data.metricType === undefined) && (missing0 = "metricType")){
validate46.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.metricType !== undefined){
const _errs1 = errors;
if(!(validate44(data.metricType, {instancePath:instancePath+"/metricType",parentData:data,parentDataProperty:"metricType",rootData}))){
vErrors = vErrors === null ? validate44.errors : vErrors.concat(validate44.errors);
errors = vErrors.length;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.unit !== undefined){
const _errs2 = errors;
if(typeof data.unit !== "string"){
validate46.errors = [{instancePath:instancePath+"/unit",schemaPath:"#/properties/unit/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.targetLabel !== undefined){
const _errs4 = errors;
if(typeof data.targetLabel !== "string"){
validate46.errors = [{instancePath:instancePath+"/targetLabel",schemaPath:"#/properties/targetLabel/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.completedHours !== undefined){
const _errs6 = errors;
if(!(typeof data.completedHours == "number")){
validate46.errors = [{instancePath:instancePath+"/completedHours",schemaPath:"#/properties/completedHours/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.targetHours !== undefined){
const _errs8 = errors;
if(!(typeof data.targetHours == "number")){
validate46.errors = [{instancePath:instancePath+"/targetHours",schemaPath:"#/properties/targetHours/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs8 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.currentValue !== undefined){
const _errs10 = errors;
if(!(typeof data.currentValue == "number")){
validate46.errors = [{instancePath:instancePath+"/currentValue",schemaPath:"#/properties/currentValue/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.targetValue !== undefined){
const _errs12 = errors;
if(!(typeof data.targetValue == "number")){
validate46.errors = [{instancePath:instancePath+"/targetValue",schemaPath:"#/properties/targetValue/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs12 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.weeklyTargetCount !== undefined){
const _errs14 = errors;
if(!(typeof data.weeklyTargetCount == "number")){
validate46.errors = [{instancePath:instancePath+"/weeklyTargetCount",schemaPath:"#/properties/weeklyTargetCount/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs14 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.completedThisWeek !== undefined){
const _errs16 = errors;
if(!(typeof data.completedThisWeek == "number")){
validate46.errors = [{instancePath:instancePath+"/completedThisWeek",schemaPath:"#/properties/completedThisWeek/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs16 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.checklistItems !== undefined){
let data9 = data.checklistItems;
const _errs18 = errors;
if(errors === _errs18){
if(Array.isArray(data9)){
var valid1 = true;
const len0 = data9.length;
for(let i0=0; i0<len0; i0++){
const _errs20 = errors;
if(!(validate48(data9[i0], {instancePath:instancePath+"/checklistItems/" + i0,parentData:data9,parentDataProperty:i0,rootData}))){
vErrors = vErrors === null ? validate48.errors : vErrors.concat(validate48.errors);
errors = vErrors.length;
}
var valid1 = _errs20 === errors;
if(!valid1){
break;
}
}
}
else {
validate46.errors = [{instancePath:instancePath+"/checklistItems",schemaPath:"#/properties/checklistItems/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs18 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.averageQuality !== undefined){
const _errs21 = errors;
if(!(typeof data.averageQuality == "number")){
validate46.errors = [{instancePath:instancePath+"/averageQuality",schemaPath:"#/properties/averageQuality/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs21 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.targetQuality !== undefined){
const _errs23 = errors;
if(!(typeof data.targetQuality == "number")){
validate46.errors = [{instancePath:instancePath+"/targetQuality",schemaPath:"#/properties/targetQuality/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs23 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.stateMetric !== undefined){
const _errs25 = errors;
if(!(validate50(data.stateMetric, {instancePath:instancePath+"/stateMetric",parentData:data,parentDataProperty:"stateMetric",rootData}))){
vErrors = vErrors === null ? validate50.errors : vErrors.concat(validate50.errors);
errors = vErrors.length;
}
var valid0 = _errs25 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.targetStateValue !== undefined){
const _errs26 = errors;
if(!(typeof data.targetStateValue == "number")){
validate46.errors = [{instancePath:instancePath+"/targetStateValue",schemaPath:"#/properties/targetStateValue/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs26 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.averageStateValue !== undefined){
const _errs28 = errors;
if(!(typeof data.averageStateValue == "number")){
validate46.errors = [{instancePath:instancePath+"/averageStateValue",schemaPath:"#/properties/averageStateValue/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs28 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.currentAmount !== undefined){
const _errs30 = errors;
if(!(typeof data.currentAmount == "number")){
validate46.errors = [{instancePath:instancePath+"/currentAmount",schemaPath:"#/properties/currentAmount/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs30 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.targetAmount !== undefined){
const _errs32 = errors;
if(!(typeof data.targetAmount == "number")){
validate46.errors = [{instancePath:instancePath+"/targetAmount",schemaPath:"#/properties/targetAmount/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs32 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.currency !== undefined){
const _errs34 = errors;
if(typeof data.currency !== "string"){
validate46.errors = [{instancePath:instancePath+"/currency",schemaPath:"#/properties/currency/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs34 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.completed !== undefined){
const _errs36 = errors;
if(typeof data.completed !== "boolean"){
validate46.errors = [{instancePath:instancePath+"/completed",schemaPath:"#/properties/completed/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs36 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.performanceType !== undefined){
const _errs38 = errors;
if(!(validate52(data.performanceType, {instancePath:instancePath+"/performanceType",parentData:data,parentDataProperty:"performanceType",rootData}))){
vErrors = vErrors === null ? validate52.errors : vErrors.concat(validate52.errors);
errors = vErrors.length;
}
var valid0 = _errs38 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.primaryMetric !== undefined){
const _errs39 = errors;
if(!(validate54(data.primaryMetric, {instancePath:instancePath+"/primaryMetric",parentData:data,parentDataProperty:"primaryMetric",rootData}))){
vErrors = vErrors === null ? validate54.errors : vErrors.concat(validate54.errors);
errors = vErrors.length;
}
var valid0 = _errs39 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.useEstimated1RM !== undefined){
const _errs40 = errors;
if(typeof data.useEstimated1RM !== "boolean"){
validate46.errors = [{instancePath:instancePath+"/useEstimated1RM",schemaPath:"#/properties/useEstimated1RM/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs40 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.trackVolume !== undefined){
const _errs42 = errors;
if(typeof data.trackVolume !== "boolean"){
validate46.errors = [{instancePath:instancePath+"/trackVolume",schemaPath:"#/properties/trackVolume/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs42 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.trackRPE !== undefined){
const _errs44 = errors;
if(typeof data.trackRPE !== "boolean"){
validate46.errors = [{instancePath:instancePath+"/trackRPE",schemaPath:"#/properties/trackRPE/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs44 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.bestValue !== undefined){
const _errs46 = errors;
if(!(typeof data.bestValue == "number")){
validate46.errors = [{instancePath:instancePath+"/bestValue",schemaPath:"#/properties/bestValue/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs46 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.targetPerformanceValue !== undefined){
const _errs48 = errors;
if(!(typeof data.targetPerformanceValue == "number")){
validate46.errors = [{instancePath:instancePath+"/targetPerformanceValue",schemaPath:"#/properties/targetPerformanceValue/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs48 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.currentBest !== undefined){
const _errs50 = errors;
if(!(typeof data.currentBest == "number")){
validate46.errors = [{instancePath:instancePath+"/currentBest",schemaPath:"#/properties/currentBest/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs50 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.bestEstimated1RM !== undefined){
const _errs52 = errors;
if(!(typeof data.bestEstimated1RM == "number")){
validate46.errors = [{instancePath:instancePath+"/bestEstimated1RM",schemaPath:"#/properties/bestEstimated1RM/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs52 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.bestVolume !== undefined){
const _errs54 = errors;
if(!(typeof data.bestVolume == "number")){
validate46.errors = [{instancePath:instancePath+"/bestVolume",schemaPath:"#/properties/bestVolume/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs54 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.milestones !== undefined){
let data30 = data.milestones;
const _errs56 = errors;
if(errors === _errs56){
if(Array.isArray(data30)){
var valid2 = true;
const len1 = data30.length;
for(let i1=0; i1<len1; i1++){
let data31 = data30[i1];
const _errs58 = errors;
if(errors === _errs58){
if(data31 && typeof data31 == "object" && !Array.isArray(data31)){
let missing1;
if(((data31.id === undefined) && (missing1 = "id")) || ((data31.title === undefined) && (missing1 = "title"))){
validate46.errors = [{instancePath:instancePath+"/milestones/" + i1,schemaPath:"#/properties/milestones/items/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
if(data31.id !== undefined){
const _errs60 = errors;
if(typeof data31.id !== "string"){
validate46.errors = [{instancePath:instancePath+"/milestones/" + i1+"/id",schemaPath:"#/properties/milestones/items/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid3 = _errs60 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data31.title !== undefined){
const _errs62 = errors;
if(typeof data31.title !== "string"){
validate46.errors = [{instancePath:instancePath+"/milestones/" + i1+"/title",schemaPath:"#/properties/milestones/items/properties/title/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid3 = _errs62 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data31.completed !== undefined){
const _errs64 = errors;
if(typeof data31.completed !== "boolean"){
validate46.errors = [{instancePath:instancePath+"/milestones/" + i1+"/completed",schemaPath:"#/properties/milestones/items/properties/completed/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid3 = _errs64 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data31.note !== undefined){
const _errs66 = errors;
if(typeof data31.note !== "string"){
validate46.errors = [{instancePath:instancePath+"/milestones/" + i1+"/note",schemaPath:"#/properties/milestones/items/properties/note/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid3 = _errs66 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data31.date !== undefined){
const _errs68 = errors;
if(typeof data31.date !== "string"){
validate46.errors = [{instancePath:instancePath+"/milestones/" + i1+"/date",schemaPath:"#/properties/milestones/items/properties/date/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid3 = _errs68 === errors;
}
else {
var valid3 = true;
}
}
}
}
}
}
}
else {
validate46.errors = [{instancePath:instancePath+"/milestones/" + i1,schemaPath:"#/properties/milestones/items/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid2 = _errs58 === errors;
if(!valid2){
break;
}
}
}
else {
validate46.errors = [{instancePath:instancePath+"/milestones",schemaPath:"#/properties/milestones/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs56 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate46.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate46.errors = vErrors;
return errors === 0;
}

const schema25 = {"type":"string","enum":["deep_study","light_review","strength_training","cardio_recovery","admin","life_maintenance","creative_building"]};

function validate58(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(typeof data !== "string"){
validate58.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((((((data === "deep_study") || (data === "light_review")) || (data === "strength_training")) || (data === "cardio_recovery")) || (data === "admin")) || (data === "life_maintenance")) || (data === "creative_building"))){
validate58.errors = [{instancePath,schemaPath:"#/enum",keyword:"enum",params:{allowedValues: schema25.enum},message:"must be equal to one of the allowed values"}];
return false;
}
validate58.errors = vErrors;
return errors === 0;
}


function validate43(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((data.id === undefined) && (missing0 = "id")) || ((data.name === undefined) && (missing0 = "name"))) || ((data.color === undefined) && (missing0 = "color"))) || ((data.totalXP === undefined) && (missing0 = "totalXP"))) || ((data.dailyTargetMinutes === undefined) && (missing0 = "dailyTargetMinutes"))) || ((data.createdAt === undefined) && (missing0 = "createdAt"))){
validate43.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.id !== undefined){
const _errs1 = errors;
if(typeof data.id !== "string"){
validate43.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.name !== undefined){
const _errs3 = errors;
if(typeof data.name !== "string"){
validate43.errors = [{instancePath:instancePath+"/name",schemaPath:"#/properties/name/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.icon !== undefined){
const _errs5 = errors;
if(typeof data.icon !== "string"){
validate43.errors = [{instancePath:instancePath+"/icon",schemaPath:"#/properties/icon/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.color !== undefined){
const _errs7 = errors;
if(typeof data.color !== "string"){
validate43.errors = [{instancePath:instancePath+"/color",schemaPath:"#/properties/color/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.totalXP !== undefined){
const _errs9 = errors;
if(!(typeof data.totalXP == "number")){
validate43.errors = [{instancePath:instancePath+"/totalXP",schemaPath:"#/properties/totalXP/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.dailyTargetMinutes !== undefined){
const _errs11 = errors;
if(!(typeof data.dailyTargetMinutes == "number")){
validate43.errors = [{instancePath:instancePath+"/dailyTargetMinutes",schemaPath:"#/properties/dailyTargetMinutes/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.totalTargetHours !== undefined){
const _errs13 = errors;
if(!(typeof data.totalTargetHours == "number")){
validate43.errors = [{instancePath:instancePath+"/totalTargetHours",schemaPath:"#/properties/totalTargetHours/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.createdAt !== undefined){
const _errs15 = errors;
if(!(typeof data.createdAt == "number")){
validate43.errors = [{instancePath:instancePath+"/createdAt",schemaPath:"#/properties/createdAt/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs15 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.goalId !== undefined){
const _errs17 = errors;
if(typeof data.goalId !== "string"){
validate43.errors = [{instancePath:instancePath+"/goalId",schemaPath:"#/properties/goalId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs17 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.linkedGoalIds !== undefined){
let data9 = data.linkedGoalIds;
const _errs19 = errors;
if(errors === _errs19){
if(Array.isArray(data9)){
var valid1 = true;
const len0 = data9.length;
for(let i0=0; i0<len0; i0++){
const _errs21 = errors;
if(typeof data9[i0] !== "string"){
validate43.errors = [{instancePath:instancePath+"/linkedGoalIds/" + i0,schemaPath:"#/properties/linkedGoalIds/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid1 = _errs21 === errors;
if(!valid1){
break;
}
}
}
else {
validate43.errors = [{instancePath:instancePath+"/linkedGoalIds",schemaPath:"#/properties/linkedGoalIds/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs19 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.moduleId !== undefined){
const _errs23 = errors;
if(typeof data.moduleId !== "string"){
validate43.errors = [{instancePath:instancePath+"/moduleId",schemaPath:"#/properties/moduleId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs23 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.progressType !== undefined){
const _errs25 = errors;
if(!(validate44(data.progressType, {instancePath:instancePath+"/progressType",parentData:data,parentDataProperty:"progressType",rootData}))){
vErrors = vErrors === null ? validate44.errors : vErrors.concat(validate44.errors);
errors = vErrors.length;
}
var valid0 = _errs25 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.metricConfig !== undefined){
const _errs26 = errors;
if(!(validate46(data.metricConfig, {instancePath:instancePath+"/metricConfig",parentData:data,parentDataProperty:"metricConfig",rootData}))){
vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
errors = vErrors.length;
}
var valid0 = _errs26 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.domainTemplateId !== undefined){
const _errs27 = errors;
if(typeof data.domainTemplateId !== "string"){
validate43.errors = [{instancePath:instancePath+"/domainTemplateId",schemaPath:"#/properties/domainTemplateId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs27 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.createdFromTemplateId !== undefined){
const _errs29 = errors;
if(typeof data.createdFromTemplateId !== "string"){
validate43.errors = [{instancePath:instancePath+"/createdFromTemplateId",schemaPath:"#/properties/createdFromTemplateId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs29 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.skillTemplateId !== undefined){
const _errs31 = errors;
if(typeof data.skillTemplateId !== "string"){
validate43.errors = [{instancePath:instancePath+"/skillTemplateId",schemaPath:"#/properties/skillTemplateId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs31 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.moduleTemplateId !== undefined){
const _errs33 = errors;
if(typeof data.moduleTemplateId !== "string"){
validate43.errors = [{instancePath:instancePath+"/moduleTemplateId",schemaPath:"#/properties/moduleTemplateId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs33 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.recordingFieldKeys !== undefined){
let data18 = data.recordingFieldKeys;
const _errs35 = errors;
if(errors === _errs35){
if(Array.isArray(data18)){
var valid2 = true;
const len1 = data18.length;
for(let i1=0; i1<len1; i1++){
const _errs37 = errors;
if(typeof data18[i1] !== "string"){
validate43.errors = [{instancePath:instancePath+"/recordingFieldKeys/" + i1,schemaPath:"#/properties/recordingFieldKeys/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid2 = _errs37 === errors;
if(!valid2){
break;
}
}
}
else {
validate43.errors = [{instancePath:instancePath+"/recordingFieldKeys",schemaPath:"#/properties/recordingFieldKeys/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs35 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.currentValue !== undefined){
const _errs39 = errors;
if(!(typeof data.currentValue == "number")){
validate43.errors = [{instancePath:instancePath+"/currentValue",schemaPath:"#/properties/currentValue/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs39 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.targetValue !== undefined){
const _errs41 = errors;
if(!(typeof data.targetValue == "number")){
validate43.errors = [{instancePath:instancePath+"/targetValue",schemaPath:"#/properties/targetValue/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs41 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.unit !== undefined){
const _errs43 = errors;
if(typeof data.unit !== "string"){
validate43.errors = [{instancePath:instancePath+"/unit",schemaPath:"#/properties/unit/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs43 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.targetHours !== undefined){
const _errs45 = errors;
if(!(typeof data.targetHours == "number")){
validate43.errors = [{instancePath:instancePath+"/targetHours",schemaPath:"#/properties/targetHours/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs45 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.completedHours !== undefined){
const _errs47 = errors;
if(!(typeof data.completedHours == "number")){
validate43.errors = [{instancePath:instancePath+"/completedHours",schemaPath:"#/properties/completedHours/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs47 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.curriculumItems !== undefined){
let data25 = data.curriculumItems;
const _errs49 = errors;
if(errors === _errs49){
if(Array.isArray(data25)){
var valid3 = true;
const len2 = data25.length;
for(let i2=0; i2<len2; i2++){
const _errs51 = errors;
if(!(validate48(data25[i2], {instancePath:instancePath+"/curriculumItems/" + i2,parentData:data25,parentDataProperty:i2,rootData}))){
vErrors = vErrors === null ? validate48.errors : vErrors.concat(validate48.errors);
errors = vErrors.length;
}
var valid3 = _errs51 === errors;
if(!valid3){
break;
}
}
}
else {
validate43.errors = [{instancePath:instancePath+"/curriculumItems",schemaPath:"#/properties/curriculumItems/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs49 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.weeklyTargetCount !== undefined){
const _errs52 = errors;
if(!(typeof data.weeklyTargetCount == "number")){
validate43.errors = [{instancePath:instancePath+"/weeklyTargetCount",schemaPath:"#/properties/weeklyTargetCount/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs52 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.completedThisWeek !== undefined){
const _errs54 = errors;
if(!(typeof data.completedThisWeek == "number")){
validate43.errors = [{instancePath:instancePath+"/completedThisWeek",schemaPath:"#/properties/completedThisWeek/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs54 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.categoryId !== undefined){
const _errs56 = errors;
if(typeof data.categoryId !== "string"){
validate43.errors = [{instancePath:instancePath+"/categoryId",schemaPath:"#/properties/categoryId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs56 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.reminderHour !== undefined){
const _errs58 = errors;
if(!(typeof data.reminderHour == "number")){
validate43.errors = [{instancePath:instancePath+"/reminderHour",schemaPath:"#/properties/reminderHour/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs58 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.reminderMinute !== undefined){
const _errs60 = errors;
if(!(typeof data.reminderMinute == "number")){
validate43.errors = [{instancePath:instancePath+"/reminderMinute",schemaPath:"#/properties/reminderMinute/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs60 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.reminderEnabled !== undefined){
const _errs62 = errors;
if(typeof data.reminderEnabled !== "boolean"){
validate43.errors = [{instancePath:instancePath+"/reminderEnabled",schemaPath:"#/properties/reminderEnabled/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs62 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.taskType !== undefined){
const _errs64 = errors;
if(!(validate58(data.taskType, {instancePath:instancePath+"/taskType",parentData:data,parentDataProperty:"taskType",rootData}))){
vErrors = vErrors === null ? validate58.errors : vErrors.concat(validate58.errors);
errors = vErrors.length;
}
var valid0 = _errs64 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.scheduleEnabled !== undefined){
const _errs65 = errors;
if(typeof data.scheduleEnabled !== "boolean"){
validate43.errors = [{instancePath:instancePath+"/scheduleEnabled",schemaPath:"#/properties/scheduleEnabled/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs65 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.scheduleType !== undefined){
let data35 = data.scheduleType;
const _errs67 = errors;
if(typeof data35 !== "string"){
validate43.errors = [{instancePath:instancePath+"/scheduleType",schemaPath:"#/properties/scheduleType/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((((data35 === "daily") || (data35 === "weekly_days")) || (data35 === "times_per_week")) || (data35 === "manual_only"))){
validate43.errors = [{instancePath:instancePath+"/scheduleType",schemaPath:"#/properties/scheduleType/enum",keyword:"enum",params:{allowedValues: schema18.properties.scheduleType.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs67 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.weeklyDays !== undefined){
let data36 = data.weeklyDays;
const _errs69 = errors;
if(errors === _errs69){
if(Array.isArray(data36)){
var valid4 = true;
const len3 = data36.length;
for(let i3=0; i3<len3; i3++){
const _errs71 = errors;
if(typeof data36[i3] !== "string"){
validate43.errors = [{instancePath:instancePath+"/weeklyDays/" + i3,schemaPath:"#/properties/weeklyDays/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid4 = _errs71 === errors;
if(!valid4){
break;
}
}
}
else {
validate43.errors = [{instancePath:instancePath+"/weeklyDays",schemaPath:"#/properties/weeklyDays/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs69 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.timesPerWeek !== undefined){
const _errs73 = errors;
if(!(typeof data.timesPerWeek == "number")){
validate43.errors = [{instancePath:instancePath+"/timesPerWeek",schemaPath:"#/properties/timesPerWeek/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs73 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.defaultStartTime !== undefined){
const _errs75 = errors;
if(typeof data.defaultStartTime !== "string"){
validate43.errors = [{instancePath:instancePath+"/defaultStartTime",schemaPath:"#/properties/defaultStartTime/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs75 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.defaultDurationMinutes !== undefined){
const _errs77 = errors;
if(!(typeof data.defaultDurationMinutes == "number")){
validate43.errors = [{instancePath:instancePath+"/defaultDurationMinutes",schemaPath:"#/properties/defaultDurationMinutes/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs77 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.flexibility !== undefined){
let data41 = data.flexibility;
const _errs79 = errors;
if(typeof data41 !== "string"){
validate43.errors = [{instancePath:instancePath+"/flexibility",schemaPath:"#/properties/flexibility/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((data41 === "fixed") || (data41 === "flexible")) || (data41 === "movable"))){
validate43.errors = [{instancePath:instancePath+"/flexibility",schemaPath:"#/properties/flexibility/enum",keyword:"enum",params:{allowedValues: schema18.properties.flexibility.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs79 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.rigidity !== undefined){
let data42 = data.rigidity;
const _errs81 = errors;
if(typeof data42 !== "string"){
validate43.errors = [{instancePath:instancePath+"/rigidity",schemaPath:"#/properties/rigidity/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((data42 === "low") || (data42 === "medium")) || (data42 === "high"))){
validate43.errors = [{instancePath:instancePath+"/rigidity",schemaPath:"#/properties/rigidity/enum",keyword:"enum",params:{allowedValues: schema18.properties.rigidity.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs81 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.mentalCost !== undefined){
const _errs83 = errors;
if(!(typeof data.mentalCost == "number")){
validate43.errors = [{instancePath:instancePath+"/mentalCost",schemaPath:"#/properties/mentalCost/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs83 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.physicalCost !== undefined){
const _errs85 = errors;
if(!(typeof data.physicalCost == "number")){
validate43.errors = [{instancePath:instancePath+"/physicalCost",schemaPath:"#/properties/physicalCost/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs85 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.emotionalCost !== undefined){
const _errs87 = errors;
if(!(typeof data.emotionalCost == "number")){
validate43.errors = [{instancePath:instancePath+"/emotionalCost",schemaPath:"#/properties/emotionalCost/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs87 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.recoveryImpact !== undefined){
const _errs89 = errors;
if(!(typeof data.recoveryImpact == "number")){
validate43.errors = [{instancePath:instancePath+"/recoveryImpact",schemaPath:"#/properties/recoveryImpact/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs89 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.compressibility !== undefined){
const _errs91 = errors;
if(!(typeof data.compressibility == "number")){
validate43.errors = [{instancePath:instancePath+"/compressibility",schemaPath:"#/properties/compressibility/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs91 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate43.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate43.errors = vErrors;
return errors === 0;
}

const schema26 = {"type":"object","properties":{"id":{"type":"string"},"goalId":{"type":"string"},"skillIds":{"type":"array","items":{"type":"string"}},"minutes":{"type":"number"},"note":{"type":"string"},"date":{"type":"string"},"createdAt":{"type":"number"},"quality":{"$ref":"#/definitions/Quality"}},"required":["id","skillIds","minutes","date","createdAt"]};
const schema27 = {"type":"number","enum":[1,2,3,4,5]};

function validate62(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(!(typeof data == "number")){
validate62.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
if(!(((((data === 1) || (data === 2)) || (data === 3)) || (data === 4)) || (data === 5))){
validate62.errors = [{instancePath,schemaPath:"#/enum",keyword:"enum",params:{allowedValues: schema27.enum},message:"must be equal to one of the allowed values"}];
return false;
}
validate62.errors = vErrors;
return errors === 0;
}


function validate61(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((data.id === undefined) && (missing0 = "id")) || ((data.skillIds === undefined) && (missing0 = "skillIds"))) || ((data.minutes === undefined) && (missing0 = "minutes"))) || ((data.date === undefined) && (missing0 = "date"))) || ((data.createdAt === undefined) && (missing0 = "createdAt"))){
validate61.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.id !== undefined){
const _errs1 = errors;
if(typeof data.id !== "string"){
validate61.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.goalId !== undefined){
const _errs3 = errors;
if(typeof data.goalId !== "string"){
validate61.errors = [{instancePath:instancePath+"/goalId",schemaPath:"#/properties/goalId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.skillIds !== undefined){
let data2 = data.skillIds;
const _errs5 = errors;
if(errors === _errs5){
if(Array.isArray(data2)){
var valid1 = true;
const len0 = data2.length;
for(let i0=0; i0<len0; i0++){
const _errs7 = errors;
if(typeof data2[i0] !== "string"){
validate61.errors = [{instancePath:instancePath+"/skillIds/" + i0,schemaPath:"#/properties/skillIds/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid1 = _errs7 === errors;
if(!valid1){
break;
}
}
}
else {
validate61.errors = [{instancePath:instancePath+"/skillIds",schemaPath:"#/properties/skillIds/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.minutes !== undefined){
const _errs9 = errors;
if(!(typeof data.minutes == "number")){
validate61.errors = [{instancePath:instancePath+"/minutes",schemaPath:"#/properties/minutes/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.note !== undefined){
const _errs11 = errors;
if(typeof data.note !== "string"){
validate61.errors = [{instancePath:instancePath+"/note",schemaPath:"#/properties/note/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.date !== undefined){
const _errs13 = errors;
if(typeof data.date !== "string"){
validate61.errors = [{instancePath:instancePath+"/date",schemaPath:"#/properties/date/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.createdAt !== undefined){
const _errs15 = errors;
if(!(typeof data.createdAt == "number")){
validate61.errors = [{instancePath:instancePath+"/createdAt",schemaPath:"#/properties/createdAt/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs15 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.quality !== undefined){
const _errs17 = errors;
if(!(validate62(data.quality, {instancePath:instancePath+"/quality",parentData:data,parentDataProperty:"quality",rootData}))){
vErrors = vErrors === null ? validate62.errors : vErrors.concat(validate62.errors);
errors = vErrors.length;
}
var valid0 = _errs17 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
else {
validate61.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate61.errors = vErrors;
return errors === 0;
}

const schema28 = {"type":"object","properties":{"id":{"type":"string"},"date":{"type":"string"},"startTime":{"type":"string"},"endTime":{"type":"string"},"durationMinutes":{"type":"number"},"title":{"type":"string"},"note":{"type":"string"},"linkedSkillId":{"type":"string"},"orphanedSkillName":{"type":"string"},"linkedGoalId":{"type":"string"},"linkedModuleId":{"type":"string"},"linkedScheduleBlockId":{"type":"string"},"source":{"type":"string","enum":["manual","schedule_block","quick_log","timer","one_tap","today_start","today_log","one_tap_done","schedule_log","skill_detail","goal_detail"]},"taskType":{"$ref":"#/definitions/TaskType"},"predictedDurationMinutes":{"type":"number"},"predictedQualityRating":{"type":"number"},"qualityRating":{"type":"number"},"difficultyRating":{"type":"number"},"predictedMentalCost":{"type":"number"},"predictedPhysicalCost":{"type":"number"},"predictedEmotionalCost":{"type":"number"},"actualMentalCost":{"type":"number"},"actualPhysicalCost":{"type":"number"},"actualEmotionalCost":{"type":"number"},"predictionDelta":{"type":"object","properties":{"durationDeltaMinutes":{"type":"number"},"qualityDelta":{"type":"number"}}},"predictionData":{},"actualData":{},"structuredData":{"type":"object","additionalProperties":{}},"domainTemplateId":{"type":"string"},"domain":{"$ref":"#/definitions/DomainTemplateDomain"},"stateSnapshot":{"type":"object","properties":{"energy":{"type":"number"},"focus":{"type":"number"},"mood":{"type":"number"},"health":{"type":"string"},"timestamp":{"type":"string"}}},"progressUpdate":{"type":"object","properties":{"progressType":{"$ref":"#/definitions/ProgressType"},"valueAdded":{"type":"number"},"newCurrentValue":{"type":"number"},"completedCurriculumItemIds":{"type":"array","items":{"type":"string"}},"qualitativeSummary":{"type":"string"},"performanceData":{"$ref":"#/definitions/PerformanceData"},"stateValue":{"type":"number"},"amountAdded":{"type":"number"},"newCurrentAmount":{"type":"number"},"completed":{"type":"boolean"}}},"metricUpdate":{"type":"object","properties":{"metricType":{"$ref":"#/definitions/ProgressType"},"minutesAdded":{"type":"number"},"newCurrentValue":{"type":"number"},"countAdded":{"type":"number"},"completedChecklistItemIds":{"type":"array","items":{"type":"string"}},"performanceValue":{"type":"number"},"performanceUnit":{"type":"string"},"performanceNote":{"type":"string"},"performanceData":{"anyOf":[{"$ref":"#/definitions/PerformanceData"},{}]},"qualityValue":{"type":"number"},"stateValue":{"type":"number"},"amountAdded":{"type":"number"},"newCurrentAmount":{"type":"number"},"markCompleted":{"type":"boolean"},"qualitativeText":{"type":"string"}},"required":["metricType"]},"appliedToProgress":{"type":"boolean"},"dataProvenance":{"$ref":"#/definitions/DataRecordProvenance"},"createdAt":{"type":"string"},"updatedAt":{"type":"string"}},"required":["id","date","durationMinutes","source","createdAt"]};
const schema29 = {"type":"object","properties":{"performanceType":{"$ref":"#/definitions/PerformanceType"},"values":{"type":"array","items":{"type":"object","properties":{"metric":{"type":"string"},"value":{"type":"number"},"unit":{"type":"string"}},"required":["metric","value"]}},"strengthSets":{"type":"array","items":{"$ref":"#/definitions/StrengthSet"}},"totalVolume":{"type":"number"},"estimated1RM":{"type":"number"},"notes":{"type":"string"}}};
const schema30 = {"type":"object","properties":{"weight":{"type":"number"},"reps":{"type":"number"},"sets":{"type":"number"},"rpe":{"type":"number"}}};

function validate71(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.weight !== undefined){
const _errs1 = errors;
if(!(typeof data.weight == "number")){
validate71.errors = [{instancePath:instancePath+"/weight",schemaPath:"#/properties/weight/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.reps !== undefined){
const _errs3 = errors;
if(!(typeof data.reps == "number")){
validate71.errors = [{instancePath:instancePath+"/reps",schemaPath:"#/properties/reps/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.sets !== undefined){
const _errs5 = errors;
if(!(typeof data.sets == "number")){
validate71.errors = [{instancePath:instancePath+"/sets",schemaPath:"#/properties/sets/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.rpe !== undefined){
const _errs7 = errors;
if(!(typeof data.rpe == "number")){
validate71.errors = [{instancePath:instancePath+"/rpe",schemaPath:"#/properties/rpe/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
else {
validate71.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate71.errors = vErrors;
return errors === 0;
}


function validate69(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.performanceType !== undefined){
const _errs1 = errors;
if(!(validate52(data.performanceType, {instancePath:instancePath+"/performanceType",parentData:data,parentDataProperty:"performanceType",rootData}))){
vErrors = vErrors === null ? validate52.errors : vErrors.concat(validate52.errors);
errors = vErrors.length;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.values !== undefined){
let data1 = data.values;
const _errs2 = errors;
if(errors === _errs2){
if(Array.isArray(data1)){
var valid1 = true;
const len0 = data1.length;
for(let i0=0; i0<len0; i0++){
let data2 = data1[i0];
const _errs4 = errors;
if(errors === _errs4){
if(data2 && typeof data2 == "object" && !Array.isArray(data2)){
let missing0;
if(((data2.metric === undefined) && (missing0 = "metric")) || ((data2.value === undefined) && (missing0 = "value"))){
validate69.errors = [{instancePath:instancePath+"/values/" + i0,schemaPath:"#/properties/values/items/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data2.metric !== undefined){
const _errs6 = errors;
if(typeof data2.metric !== "string"){
validate69.errors = [{instancePath:instancePath+"/values/" + i0+"/metric",schemaPath:"#/properties/values/items/properties/metric/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid2 = _errs6 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data2.value !== undefined){
const _errs8 = errors;
if(!(typeof data2.value == "number")){
validate69.errors = [{instancePath:instancePath+"/values/" + i0+"/value",schemaPath:"#/properties/values/items/properties/value/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid2 = _errs8 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data2.unit !== undefined){
const _errs10 = errors;
if(typeof data2.unit !== "string"){
validate69.errors = [{instancePath:instancePath+"/values/" + i0+"/unit",schemaPath:"#/properties/values/items/properties/unit/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid2 = _errs10 === errors;
}
else {
var valid2 = true;
}
}
}
}
}
else {
validate69.errors = [{instancePath:instancePath+"/values/" + i0,schemaPath:"#/properties/values/items/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid1 = _errs4 === errors;
if(!valid1){
break;
}
}
}
else {
validate69.errors = [{instancePath:instancePath+"/values",schemaPath:"#/properties/values/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.strengthSets !== undefined){
let data6 = data.strengthSets;
const _errs12 = errors;
if(errors === _errs12){
if(Array.isArray(data6)){
var valid3 = true;
const len1 = data6.length;
for(let i1=0; i1<len1; i1++){
const _errs14 = errors;
if(!(validate71(data6[i1], {instancePath:instancePath+"/strengthSets/" + i1,parentData:data6,parentDataProperty:i1,rootData}))){
vErrors = vErrors === null ? validate71.errors : vErrors.concat(validate71.errors);
errors = vErrors.length;
}
var valid3 = _errs14 === errors;
if(!valid3){
break;
}
}
}
else {
validate69.errors = [{instancePath:instancePath+"/strengthSets",schemaPath:"#/properties/strengthSets/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs12 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.totalVolume !== undefined){
const _errs15 = errors;
if(!(typeof data.totalVolume == "number")){
validate69.errors = [{instancePath:instancePath+"/totalVolume",schemaPath:"#/properties/totalVolume/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs15 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.estimated1RM !== undefined){
const _errs17 = errors;
if(!(typeof data.estimated1RM == "number")){
validate69.errors = [{instancePath:instancePath+"/estimated1RM",schemaPath:"#/properties/estimated1RM/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs17 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.notes !== undefined){
const _errs19 = errors;
if(typeof data.notes !== "string"){
validate69.errors = [{instancePath:instancePath+"/notes",schemaPath:"#/properties/notes/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs19 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
else {
validate69.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate69.errors = vErrors;
return errors === 0;
}

const schema31 = {"type":"object","properties":{"schemaVersion":{"type":"string","const":"questlife.data.provenance.v1"},"origin":{"$ref":"#/definitions/DataRecordOrigin"},"confirmation":{"$ref":"#/definitions/DataConfirmationProvenance"},"captureMethod":{"$ref":"#/definitions/DataCaptureMethod"},"recordedAt":{"type":"string"},"availableAt":{"type":"string"},"eventStartAt":{"type":"string"},"eventEndAt":{"type":"string"},"timezone":{"type":"string"},"protocolVersion":{"type":"string"},"instrumentVersion":{"type":"string"},"parser":{"$ref":"#/definitions/DataParserMetadata"},"candidate":{"type":"object","properties":{"rawCaptureId":{"type":"string"},"entryIndex":{"type":"number"},"entryKey":{"type":"string"}},"required":["rawCaptureId"]},"corrections":{"type":"array","items":{"$ref":"#/definitions/DataCandidateCorrection"}},"correctedFields":{"type":"array","items":{"type":"string"}},"fieldOrigins":{"type":"object","additionalProperties":{"$ref":"#/definitions/DataFieldOrigin"}},"sourceIds":{"type":"array","items":{"type":"string"}},"limitations":{"type":"array","items":{"type":"string"}},"retryOfRecordId":{"type":"string"},"deleted":{"type":"boolean"}},"required":["schemaVersion","origin","confirmation","captureMethod","recordedAt","availableAt"],"description":"Additive provenance metadata for future Quant ingestion. Old records remain valid AppData and intentionally do not receive inferred provenance."};
const schema32 = {"type":"string","enum":["OWNER_OBSERVED","OWNER_CONFIRMED_AI_PARSE","PASSIVE_IMPORTED","SYNTHETIC","QA_TEST","DEBUG_FIXTURE","DERIVED","LEGACY_UNKNOWN"]};

function validate76(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(typeof data !== "string"){
validate76.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((((((((data === "OWNER_OBSERVED") || (data === "OWNER_CONFIRMED_AI_PARSE")) || (data === "PASSIVE_IMPORTED")) || (data === "SYNTHETIC")) || (data === "QA_TEST")) || (data === "DEBUG_FIXTURE")) || (data === "DERIVED")) || (data === "LEGACY_UNKNOWN"))){
validate76.errors = [{instancePath,schemaPath:"#/enum",keyword:"enum",params:{allowedValues: schema32.enum},message:"must be equal to one of the allowed values"}];
return false;
}
validate76.errors = vErrors;
return errors === 0;
}

const schema33 = {"type":"string","enum":["USER_ENTERED","USER_CONFIRMED","USER_CORRECTED","NOT_REQUIRED","UNCONFIRMED","UNKNOWN"]};

function validate78(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(typeof data !== "string"){
validate78.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((((((data === "USER_ENTERED") || (data === "USER_CONFIRMED")) || (data === "USER_CORRECTED")) || (data === "NOT_REQUIRED")) || (data === "UNCONFIRMED")) || (data === "UNKNOWN"))){
validate78.errors = [{instancePath,schemaPath:"#/enum",keyword:"enum",params:{allowedValues: schema33.enum},message:"must be equal to one of the allowed values"}];
return false;
}
validate78.errors = vErrors;
return errors === 0;
}

const schema34 = {"type":"string","enum":["manual_form","timer","one_tap","schedule","smart_capture_text","context_rule_parser","state_checkin","decision_engine","pattern_engine","rescue","import","unknown"]};

function validate80(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(typeof data !== "string"){
validate80.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((((((((((((data === "manual_form") || (data === "timer")) || (data === "one_tap")) || (data === "schedule")) || (data === "smart_capture_text")) || (data === "context_rule_parser")) || (data === "state_checkin")) || (data === "decision_engine")) || (data === "pattern_engine")) || (data === "rescue")) || (data === "import")) || (data === "unknown"))){
validate80.errors = [{instancePath,schemaPath:"#/enum",keyword:"enum",params:{allowedValues: schema34.enum},message:"must be equal to one of the allowed values"}];
return false;
}
validate80.errors = vErrors;
return errors === 0;
}

const schema35 = {"type":"object","properties":{"provider":{"type":"string"},"model":{"type":"string"},"version":{"type":"string"},"promptVersion":{"type":"string"},"responseSchemaVersion":{"type":"string"}}};

function validate82(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.provider !== undefined){
const _errs1 = errors;
if(typeof data.provider !== "string"){
validate82.errors = [{instancePath:instancePath+"/provider",schemaPath:"#/properties/provider/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.model !== undefined){
const _errs3 = errors;
if(typeof data.model !== "string"){
validate82.errors = [{instancePath:instancePath+"/model",schemaPath:"#/properties/model/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.version !== undefined){
const _errs5 = errors;
if(typeof data.version !== "string"){
validate82.errors = [{instancePath:instancePath+"/version",schemaPath:"#/properties/version/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.promptVersion !== undefined){
const _errs7 = errors;
if(typeof data.promptVersion !== "string"){
validate82.errors = [{instancePath:instancePath+"/promptVersion",schemaPath:"#/properties/promptVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.responseSchemaVersion !== undefined){
const _errs9 = errors;
if(typeof data.responseSchemaVersion !== "string"){
validate82.errors = [{instancePath:instancePath+"/responseSchemaVersion",schemaPath:"#/properties/responseSchemaVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
else {
validate82.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate82.errors = vErrors;
return errors === 0;
}

const schema36 = {"type":"object","properties":{"field":{"type":"string"},"proposed":{"type":["string","number","boolean","null"]},"confirmed":{"type":["string","number","boolean","null"]},"valuesRedacted":{"type":"boolean"}},"required":["field"]};

function validate84(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((data.field === undefined) && (missing0 = "field")){
validate84.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.field !== undefined){
const _errs1 = errors;
if(typeof data.field !== "string"){
validate84.errors = [{instancePath:instancePath+"/field",schemaPath:"#/properties/field/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.proposed !== undefined){
let data1 = data.proposed;
const _errs3 = errors;
if((((typeof data1 !== "string") && (!(typeof data1 == "number"))) && (typeof data1 !== "boolean")) && (data1 !== null)){
validate84.errors = [{instancePath:instancePath+"/proposed",schemaPath:"#/properties/proposed/type",keyword:"type",params:{type: schema36.properties.proposed.type},message:"must be string,number,boolean,null"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.confirmed !== undefined){
let data2 = data.confirmed;
const _errs5 = errors;
if((((typeof data2 !== "string") && (!(typeof data2 == "number"))) && (typeof data2 !== "boolean")) && (data2 !== null)){
validate84.errors = [{instancePath:instancePath+"/confirmed",schemaPath:"#/properties/confirmed/type",keyword:"type",params:{type: schema36.properties.confirmed.type},message:"must be string,number,boolean,null"}];
return false;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.valuesRedacted !== undefined){
const _errs7 = errors;
if(typeof data.valuesRedacted !== "boolean"){
validate84.errors = [{instancePath:instancePath+"/valuesRedacted",schemaPath:"#/properties/valuesRedacted/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
else {
validate84.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate84.errors = vErrors;
return errors === 0;
}

const schema37 = {"type":"string","enum":["owner_entered","owner_confirmed","owner_corrected","model_proposed_owner_confirmed","rule_derived","derived","ui_default_or_owner_confirmed","unknown"]};

function validate86(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(typeof data !== "string"){
validate86.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((((((((data === "owner_entered") || (data === "owner_confirmed")) || (data === "owner_corrected")) || (data === "model_proposed_owner_confirmed")) || (data === "rule_derived")) || (data === "derived")) || (data === "ui_default_or_owner_confirmed")) || (data === "unknown"))){
validate86.errors = [{instancePath,schemaPath:"#/enum",keyword:"enum",params:{allowedValues: schema37.enum},message:"must be equal to one of the allowed values"}];
return false;
}
validate86.errors = vErrors;
return errors === 0;
}


function validate75(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((data.schemaVersion === undefined) && (missing0 = "schemaVersion")) || ((data.origin === undefined) && (missing0 = "origin"))) || ((data.confirmation === undefined) && (missing0 = "confirmation"))) || ((data.captureMethod === undefined) && (missing0 = "captureMethod"))) || ((data.recordedAt === undefined) && (missing0 = "recordedAt"))) || ((data.availableAt === undefined) && (missing0 = "availableAt"))){
validate75.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.schemaVersion !== undefined){
let data0 = data.schemaVersion;
const _errs1 = errors;
if(typeof data0 !== "string"){
validate75.errors = [{instancePath:instancePath+"/schemaVersion",schemaPath:"#/properties/schemaVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("questlife.data.provenance.v1" !== data0){
validate75.errors = [{instancePath:instancePath+"/schemaVersion",schemaPath:"#/properties/schemaVersion/const",keyword:"const",params:{allowedValue: "questlife.data.provenance.v1"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.origin !== undefined){
const _errs3 = errors;
if(!(validate76(data.origin, {instancePath:instancePath+"/origin",parentData:data,parentDataProperty:"origin",rootData}))){
vErrors = vErrors === null ? validate76.errors : vErrors.concat(validate76.errors);
errors = vErrors.length;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.confirmation !== undefined){
const _errs4 = errors;
if(!(validate78(data.confirmation, {instancePath:instancePath+"/confirmation",parentData:data,parentDataProperty:"confirmation",rootData}))){
vErrors = vErrors === null ? validate78.errors : vErrors.concat(validate78.errors);
errors = vErrors.length;
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.captureMethod !== undefined){
const _errs5 = errors;
if(!(validate80(data.captureMethod, {instancePath:instancePath+"/captureMethod",parentData:data,parentDataProperty:"captureMethod",rootData}))){
vErrors = vErrors === null ? validate80.errors : vErrors.concat(validate80.errors);
errors = vErrors.length;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.recordedAt !== undefined){
const _errs6 = errors;
if(typeof data.recordedAt !== "string"){
validate75.errors = [{instancePath:instancePath+"/recordedAt",schemaPath:"#/properties/recordedAt/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.availableAt !== undefined){
const _errs8 = errors;
if(typeof data.availableAt !== "string"){
validate75.errors = [{instancePath:instancePath+"/availableAt",schemaPath:"#/properties/availableAt/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs8 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.eventStartAt !== undefined){
const _errs10 = errors;
if(typeof data.eventStartAt !== "string"){
validate75.errors = [{instancePath:instancePath+"/eventStartAt",schemaPath:"#/properties/eventStartAt/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.eventEndAt !== undefined){
const _errs12 = errors;
if(typeof data.eventEndAt !== "string"){
validate75.errors = [{instancePath:instancePath+"/eventEndAt",schemaPath:"#/properties/eventEndAt/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs12 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.timezone !== undefined){
const _errs14 = errors;
if(typeof data.timezone !== "string"){
validate75.errors = [{instancePath:instancePath+"/timezone",schemaPath:"#/properties/timezone/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs14 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocolVersion !== undefined){
const _errs16 = errors;
if(typeof data.protocolVersion !== "string"){
validate75.errors = [{instancePath:instancePath+"/protocolVersion",schemaPath:"#/properties/protocolVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs16 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.instrumentVersion !== undefined){
const _errs18 = errors;
if(typeof data.instrumentVersion !== "string"){
validate75.errors = [{instancePath:instancePath+"/instrumentVersion",schemaPath:"#/properties/instrumentVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs18 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.parser !== undefined){
const _errs20 = errors;
if(!(validate82(data.parser, {instancePath:instancePath+"/parser",parentData:data,parentDataProperty:"parser",rootData}))){
vErrors = vErrors === null ? validate82.errors : vErrors.concat(validate82.errors);
errors = vErrors.length;
}
var valid0 = _errs20 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.candidate !== undefined){
let data12 = data.candidate;
const _errs21 = errors;
if(errors === _errs21){
if(data12 && typeof data12 == "object" && !Array.isArray(data12)){
let missing1;
if((data12.rawCaptureId === undefined) && (missing1 = "rawCaptureId")){
validate75.errors = [{instancePath:instancePath+"/candidate",schemaPath:"#/properties/candidate/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
if(data12.rawCaptureId !== undefined){
const _errs23 = errors;
if(typeof data12.rawCaptureId !== "string"){
validate75.errors = [{instancePath:instancePath+"/candidate/rawCaptureId",schemaPath:"#/properties/candidate/properties/rawCaptureId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid1 = _errs23 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data12.entryIndex !== undefined){
const _errs25 = errors;
if(!(typeof data12.entryIndex == "number")){
validate75.errors = [{instancePath:instancePath+"/candidate/entryIndex",schemaPath:"#/properties/candidate/properties/entryIndex/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid1 = _errs25 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data12.entryKey !== undefined){
const _errs27 = errors;
if(typeof data12.entryKey !== "string"){
validate75.errors = [{instancePath:instancePath+"/candidate/entryKey",schemaPath:"#/properties/candidate/properties/entryKey/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid1 = _errs27 === errors;
}
else {
var valid1 = true;
}
}
}
}
}
else {
validate75.errors = [{instancePath:instancePath+"/candidate",schemaPath:"#/properties/candidate/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs21 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.corrections !== undefined){
let data16 = data.corrections;
const _errs29 = errors;
if(errors === _errs29){
if(Array.isArray(data16)){
var valid2 = true;
const len0 = data16.length;
for(let i0=0; i0<len0; i0++){
const _errs31 = errors;
if(!(validate84(data16[i0], {instancePath:instancePath+"/corrections/" + i0,parentData:data16,parentDataProperty:i0,rootData}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
var valid2 = _errs31 === errors;
if(!valid2){
break;
}
}
}
else {
validate75.errors = [{instancePath:instancePath+"/corrections",schemaPath:"#/properties/corrections/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs29 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.correctedFields !== undefined){
let data18 = data.correctedFields;
const _errs32 = errors;
if(errors === _errs32){
if(Array.isArray(data18)){
var valid3 = true;
const len1 = data18.length;
for(let i1=0; i1<len1; i1++){
const _errs34 = errors;
if(typeof data18[i1] !== "string"){
validate75.errors = [{instancePath:instancePath+"/correctedFields/" + i1,schemaPath:"#/properties/correctedFields/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid3 = _errs34 === errors;
if(!valid3){
break;
}
}
}
else {
validate75.errors = [{instancePath:instancePath+"/correctedFields",schemaPath:"#/properties/correctedFields/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs32 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.fieldOrigins !== undefined){
let data20 = data.fieldOrigins;
const _errs36 = errors;
if(errors === _errs36){
if(data20 && typeof data20 == "object" && !Array.isArray(data20)){
for(const key0 in data20){
const _errs39 = errors;
if(!(validate86(data20[key0], {instancePath:instancePath+"/fieldOrigins/" + key0.replace(/~/g, "~0").replace(/\//g, "~1"),parentData:data20,parentDataProperty:key0,rootData}))){
vErrors = vErrors === null ? validate86.errors : vErrors.concat(validate86.errors);
errors = vErrors.length;
}
var valid4 = _errs39 === errors;
if(!valid4){
break;
}
}
}
else {
validate75.errors = [{instancePath:instancePath+"/fieldOrigins",schemaPath:"#/properties/fieldOrigins/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs36 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.sourceIds !== undefined){
let data22 = data.sourceIds;
const _errs40 = errors;
if(errors === _errs40){
if(Array.isArray(data22)){
var valid5 = true;
const len2 = data22.length;
for(let i2=0; i2<len2; i2++){
const _errs42 = errors;
if(typeof data22[i2] !== "string"){
validate75.errors = [{instancePath:instancePath+"/sourceIds/" + i2,schemaPath:"#/properties/sourceIds/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid5 = _errs42 === errors;
if(!valid5){
break;
}
}
}
else {
validate75.errors = [{instancePath:instancePath+"/sourceIds",schemaPath:"#/properties/sourceIds/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs40 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.limitations !== undefined){
let data24 = data.limitations;
const _errs44 = errors;
if(errors === _errs44){
if(Array.isArray(data24)){
var valid6 = true;
const len3 = data24.length;
for(let i3=0; i3<len3; i3++){
const _errs46 = errors;
if(typeof data24[i3] !== "string"){
validate75.errors = [{instancePath:instancePath+"/limitations/" + i3,schemaPath:"#/properties/limitations/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid6 = _errs46 === errors;
if(!valid6){
break;
}
}
}
else {
validate75.errors = [{instancePath:instancePath+"/limitations",schemaPath:"#/properties/limitations/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs44 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.retryOfRecordId !== undefined){
const _errs48 = errors;
if(typeof data.retryOfRecordId !== "string"){
validate75.errors = [{instancePath:instancePath+"/retryOfRecordId",schemaPath:"#/properties/retryOfRecordId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs48 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.deleted !== undefined){
const _errs50 = errors;
if(typeof data.deleted !== "boolean"){
validate75.errors = [{instancePath:instancePath+"/deleted",schemaPath:"#/properties/deleted/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs50 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate75.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate75.errors = vErrors;
return errors === 0;
}


function validate65(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((data.id === undefined) && (missing0 = "id")) || ((data.date === undefined) && (missing0 = "date"))) || ((data.durationMinutes === undefined) && (missing0 = "durationMinutes"))) || ((data.source === undefined) && (missing0 = "source"))) || ((data.createdAt === undefined) && (missing0 = "createdAt"))){
validate65.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.id !== undefined){
const _errs1 = errors;
if(typeof data.id !== "string"){
validate65.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.date !== undefined){
const _errs3 = errors;
if(typeof data.date !== "string"){
validate65.errors = [{instancePath:instancePath+"/date",schemaPath:"#/properties/date/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.startTime !== undefined){
const _errs5 = errors;
if(typeof data.startTime !== "string"){
validate65.errors = [{instancePath:instancePath+"/startTime",schemaPath:"#/properties/startTime/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.endTime !== undefined){
const _errs7 = errors;
if(typeof data.endTime !== "string"){
validate65.errors = [{instancePath:instancePath+"/endTime",schemaPath:"#/properties/endTime/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.durationMinutes !== undefined){
const _errs9 = errors;
if(!(typeof data.durationMinutes == "number")){
validate65.errors = [{instancePath:instancePath+"/durationMinutes",schemaPath:"#/properties/durationMinutes/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.title !== undefined){
const _errs11 = errors;
if(typeof data.title !== "string"){
validate65.errors = [{instancePath:instancePath+"/title",schemaPath:"#/properties/title/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.note !== undefined){
const _errs13 = errors;
if(typeof data.note !== "string"){
validate65.errors = [{instancePath:instancePath+"/note",schemaPath:"#/properties/note/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.linkedSkillId !== undefined){
const _errs15 = errors;
if(typeof data.linkedSkillId !== "string"){
validate65.errors = [{instancePath:instancePath+"/linkedSkillId",schemaPath:"#/properties/linkedSkillId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs15 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.orphanedSkillName !== undefined){
const _errs17 = errors;
if(typeof data.orphanedSkillName !== "string"){
validate65.errors = [{instancePath:instancePath+"/orphanedSkillName",schemaPath:"#/properties/orphanedSkillName/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs17 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.linkedGoalId !== undefined){
const _errs19 = errors;
if(typeof data.linkedGoalId !== "string"){
validate65.errors = [{instancePath:instancePath+"/linkedGoalId",schemaPath:"#/properties/linkedGoalId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs19 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.linkedModuleId !== undefined){
const _errs21 = errors;
if(typeof data.linkedModuleId !== "string"){
validate65.errors = [{instancePath:instancePath+"/linkedModuleId",schemaPath:"#/properties/linkedModuleId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs21 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.linkedScheduleBlockId !== undefined){
const _errs23 = errors;
if(typeof data.linkedScheduleBlockId !== "string"){
validate65.errors = [{instancePath:instancePath+"/linkedScheduleBlockId",schemaPath:"#/properties/linkedScheduleBlockId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs23 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.source !== undefined){
let data12 = data.source;
const _errs25 = errors;
if(typeof data12 !== "string"){
validate65.errors = [{instancePath:instancePath+"/source",schemaPath:"#/properties/source/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((((((((((data12 === "manual") || (data12 === "schedule_block")) || (data12 === "quick_log")) || (data12 === "timer")) || (data12 === "one_tap")) || (data12 === "today_start")) || (data12 === "today_log")) || (data12 === "one_tap_done")) || (data12 === "schedule_log")) || (data12 === "skill_detail")) || (data12 === "goal_detail"))){
validate65.errors = [{instancePath:instancePath+"/source",schemaPath:"#/properties/source/enum",keyword:"enum",params:{allowedValues: schema28.properties.source.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs25 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.taskType !== undefined){
const _errs27 = errors;
if(!(validate58(data.taskType, {instancePath:instancePath+"/taskType",parentData:data,parentDataProperty:"taskType",rootData}))){
vErrors = vErrors === null ? validate58.errors : vErrors.concat(validate58.errors);
errors = vErrors.length;
}
var valid0 = _errs27 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.predictedDurationMinutes !== undefined){
const _errs28 = errors;
if(!(typeof data.predictedDurationMinutes == "number")){
validate65.errors = [{instancePath:instancePath+"/predictedDurationMinutes",schemaPath:"#/properties/predictedDurationMinutes/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs28 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.predictedQualityRating !== undefined){
const _errs30 = errors;
if(!(typeof data.predictedQualityRating == "number")){
validate65.errors = [{instancePath:instancePath+"/predictedQualityRating",schemaPath:"#/properties/predictedQualityRating/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs30 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.qualityRating !== undefined){
const _errs32 = errors;
if(!(typeof data.qualityRating == "number")){
validate65.errors = [{instancePath:instancePath+"/qualityRating",schemaPath:"#/properties/qualityRating/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs32 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.difficultyRating !== undefined){
const _errs34 = errors;
if(!(typeof data.difficultyRating == "number")){
validate65.errors = [{instancePath:instancePath+"/difficultyRating",schemaPath:"#/properties/difficultyRating/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs34 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.predictedMentalCost !== undefined){
const _errs36 = errors;
if(!(typeof data.predictedMentalCost == "number")){
validate65.errors = [{instancePath:instancePath+"/predictedMentalCost",schemaPath:"#/properties/predictedMentalCost/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs36 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.predictedPhysicalCost !== undefined){
const _errs38 = errors;
if(!(typeof data.predictedPhysicalCost == "number")){
validate65.errors = [{instancePath:instancePath+"/predictedPhysicalCost",schemaPath:"#/properties/predictedPhysicalCost/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs38 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.predictedEmotionalCost !== undefined){
const _errs40 = errors;
if(!(typeof data.predictedEmotionalCost == "number")){
validate65.errors = [{instancePath:instancePath+"/predictedEmotionalCost",schemaPath:"#/properties/predictedEmotionalCost/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs40 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.actualMentalCost !== undefined){
const _errs42 = errors;
if(!(typeof data.actualMentalCost == "number")){
validate65.errors = [{instancePath:instancePath+"/actualMentalCost",schemaPath:"#/properties/actualMentalCost/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs42 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.actualPhysicalCost !== undefined){
const _errs44 = errors;
if(!(typeof data.actualPhysicalCost == "number")){
validate65.errors = [{instancePath:instancePath+"/actualPhysicalCost",schemaPath:"#/properties/actualPhysicalCost/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs44 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.actualEmotionalCost !== undefined){
const _errs46 = errors;
if(!(typeof data.actualEmotionalCost == "number")){
validate65.errors = [{instancePath:instancePath+"/actualEmotionalCost",schemaPath:"#/properties/actualEmotionalCost/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs46 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.predictionDelta !== undefined){
let data24 = data.predictionDelta;
const _errs48 = errors;
if(errors === _errs48){
if(data24 && typeof data24 == "object" && !Array.isArray(data24)){
if(data24.durationDeltaMinutes !== undefined){
const _errs50 = errors;
if(!(typeof data24.durationDeltaMinutes == "number")){
validate65.errors = [{instancePath:instancePath+"/predictionDelta/durationDeltaMinutes",schemaPath:"#/properties/predictionDelta/properties/durationDeltaMinutes/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid1 = _errs50 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data24.qualityDelta !== undefined){
const _errs52 = errors;
if(!(typeof data24.qualityDelta == "number")){
validate65.errors = [{instancePath:instancePath+"/predictionDelta/qualityDelta",schemaPath:"#/properties/predictionDelta/properties/qualityDelta/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid1 = _errs52 === errors;
}
else {
var valid1 = true;
}
}
}
else {
validate65.errors = [{instancePath:instancePath+"/predictionDelta",schemaPath:"#/properties/predictionDelta/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs48 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.structuredData !== undefined){
let data27 = data.structuredData;
const _errs54 = errors;
if(errors === _errs54){
if(data27 && typeof data27 == "object" && !Array.isArray(data27)){
}
else {
validate65.errors = [{instancePath:instancePath+"/structuredData",schemaPath:"#/properties/structuredData/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs54 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.domainTemplateId !== undefined){
const _errs57 = errors;
if(typeof data.domainTemplateId !== "string"){
validate65.errors = [{instancePath:instancePath+"/domainTemplateId",schemaPath:"#/properties/domainTemplateId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs57 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.domain !== undefined){
const _errs59 = errors;
if(!(validate30(data.domain, {instancePath:instancePath+"/domain",parentData:data,parentDataProperty:"domain",rootData}))){
vErrors = vErrors === null ? validate30.errors : vErrors.concat(validate30.errors);
errors = vErrors.length;
}
var valid0 = _errs59 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.stateSnapshot !== undefined){
let data30 = data.stateSnapshot;
const _errs60 = errors;
if(errors === _errs60){
if(data30 && typeof data30 == "object" && !Array.isArray(data30)){
if(data30.energy !== undefined){
const _errs62 = errors;
if(!(typeof data30.energy == "number")){
validate65.errors = [{instancePath:instancePath+"/stateSnapshot/energy",schemaPath:"#/properties/stateSnapshot/properties/energy/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid2 = _errs62 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data30.focus !== undefined){
const _errs64 = errors;
if(!(typeof data30.focus == "number")){
validate65.errors = [{instancePath:instancePath+"/stateSnapshot/focus",schemaPath:"#/properties/stateSnapshot/properties/focus/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid2 = _errs64 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data30.mood !== undefined){
const _errs66 = errors;
if(!(typeof data30.mood == "number")){
validate65.errors = [{instancePath:instancePath+"/stateSnapshot/mood",schemaPath:"#/properties/stateSnapshot/properties/mood/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid2 = _errs66 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data30.health !== undefined){
const _errs68 = errors;
if(typeof data30.health !== "string"){
validate65.errors = [{instancePath:instancePath+"/stateSnapshot/health",schemaPath:"#/properties/stateSnapshot/properties/health/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid2 = _errs68 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data30.timestamp !== undefined){
const _errs70 = errors;
if(typeof data30.timestamp !== "string"){
validate65.errors = [{instancePath:instancePath+"/stateSnapshot/timestamp",schemaPath:"#/properties/stateSnapshot/properties/timestamp/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid2 = _errs70 === errors;
}
else {
var valid2 = true;
}
}
}
}
}
}
else {
validate65.errors = [{instancePath:instancePath+"/stateSnapshot",schemaPath:"#/properties/stateSnapshot/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs60 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.progressUpdate !== undefined){
let data36 = data.progressUpdate;
const _errs72 = errors;
if(errors === _errs72){
if(data36 && typeof data36 == "object" && !Array.isArray(data36)){
if(data36.progressType !== undefined){
const _errs74 = errors;
if(!(validate44(data36.progressType, {instancePath:instancePath+"/progressUpdate/progressType",parentData:data36,parentDataProperty:"progressType",rootData}))){
vErrors = vErrors === null ? validate44.errors : vErrors.concat(validate44.errors);
errors = vErrors.length;
}
var valid3 = _errs74 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data36.valueAdded !== undefined){
const _errs75 = errors;
if(!(typeof data36.valueAdded == "number")){
validate65.errors = [{instancePath:instancePath+"/progressUpdate/valueAdded",schemaPath:"#/properties/progressUpdate/properties/valueAdded/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid3 = _errs75 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data36.newCurrentValue !== undefined){
const _errs77 = errors;
if(!(typeof data36.newCurrentValue == "number")){
validate65.errors = [{instancePath:instancePath+"/progressUpdate/newCurrentValue",schemaPath:"#/properties/progressUpdate/properties/newCurrentValue/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid3 = _errs77 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data36.completedCurriculumItemIds !== undefined){
let data40 = data36.completedCurriculumItemIds;
const _errs79 = errors;
if(errors === _errs79){
if(Array.isArray(data40)){
var valid4 = true;
const len0 = data40.length;
for(let i0=0; i0<len0; i0++){
const _errs81 = errors;
if(typeof data40[i0] !== "string"){
validate65.errors = [{instancePath:instancePath+"/progressUpdate/completedCurriculumItemIds/" + i0,schemaPath:"#/properties/progressUpdate/properties/completedCurriculumItemIds/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid4 = _errs81 === errors;
if(!valid4){
break;
}
}
}
else {
validate65.errors = [{instancePath:instancePath+"/progressUpdate/completedCurriculumItemIds",schemaPath:"#/properties/progressUpdate/properties/completedCurriculumItemIds/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid3 = _errs79 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data36.qualitativeSummary !== undefined){
const _errs83 = errors;
if(typeof data36.qualitativeSummary !== "string"){
validate65.errors = [{instancePath:instancePath+"/progressUpdate/qualitativeSummary",schemaPath:"#/properties/progressUpdate/properties/qualitativeSummary/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid3 = _errs83 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data36.performanceData !== undefined){
const _errs85 = errors;
if(!(validate69(data36.performanceData, {instancePath:instancePath+"/progressUpdate/performanceData",parentData:data36,parentDataProperty:"performanceData",rootData}))){
vErrors = vErrors === null ? validate69.errors : vErrors.concat(validate69.errors);
errors = vErrors.length;
}
var valid3 = _errs85 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data36.stateValue !== undefined){
const _errs86 = errors;
if(!(typeof data36.stateValue == "number")){
validate65.errors = [{instancePath:instancePath+"/progressUpdate/stateValue",schemaPath:"#/properties/progressUpdate/properties/stateValue/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid3 = _errs86 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data36.amountAdded !== undefined){
const _errs88 = errors;
if(!(typeof data36.amountAdded == "number")){
validate65.errors = [{instancePath:instancePath+"/progressUpdate/amountAdded",schemaPath:"#/properties/progressUpdate/properties/amountAdded/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid3 = _errs88 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data36.newCurrentAmount !== undefined){
const _errs90 = errors;
if(!(typeof data36.newCurrentAmount == "number")){
validate65.errors = [{instancePath:instancePath+"/progressUpdate/newCurrentAmount",schemaPath:"#/properties/progressUpdate/properties/newCurrentAmount/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid3 = _errs90 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data36.completed !== undefined){
const _errs92 = errors;
if(typeof data36.completed !== "boolean"){
validate65.errors = [{instancePath:instancePath+"/progressUpdate/completed",schemaPath:"#/properties/progressUpdate/properties/completed/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid3 = _errs92 === errors;
}
else {
var valid3 = true;
}
}
}
}
}
}
}
}
}
}
}
else {
validate65.errors = [{instancePath:instancePath+"/progressUpdate",schemaPath:"#/properties/progressUpdate/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs72 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.metricUpdate !== undefined){
let data48 = data.metricUpdate;
const _errs94 = errors;
if(errors === _errs94){
if(data48 && typeof data48 == "object" && !Array.isArray(data48)){
let missing1;
if((data48.metricType === undefined) && (missing1 = "metricType")){
validate65.errors = [{instancePath:instancePath+"/metricUpdate",schemaPath:"#/properties/metricUpdate/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
if(data48.metricType !== undefined){
const _errs96 = errors;
if(!(validate44(data48.metricType, {instancePath:instancePath+"/metricUpdate/metricType",parentData:data48,parentDataProperty:"metricType",rootData}))){
vErrors = vErrors === null ? validate44.errors : vErrors.concat(validate44.errors);
errors = vErrors.length;
}
var valid5 = _errs96 === errors;
}
else {
var valid5 = true;
}
if(valid5){
if(data48.minutesAdded !== undefined){
const _errs97 = errors;
if(!(typeof data48.minutesAdded == "number")){
validate65.errors = [{instancePath:instancePath+"/metricUpdate/minutesAdded",schemaPath:"#/properties/metricUpdate/properties/minutesAdded/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid5 = _errs97 === errors;
}
else {
var valid5 = true;
}
if(valid5){
if(data48.newCurrentValue !== undefined){
const _errs99 = errors;
if(!(typeof data48.newCurrentValue == "number")){
validate65.errors = [{instancePath:instancePath+"/metricUpdate/newCurrentValue",schemaPath:"#/properties/metricUpdate/properties/newCurrentValue/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid5 = _errs99 === errors;
}
else {
var valid5 = true;
}
if(valid5){
if(data48.countAdded !== undefined){
const _errs101 = errors;
if(!(typeof data48.countAdded == "number")){
validate65.errors = [{instancePath:instancePath+"/metricUpdate/countAdded",schemaPath:"#/properties/metricUpdate/properties/countAdded/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid5 = _errs101 === errors;
}
else {
var valid5 = true;
}
if(valid5){
if(data48.completedChecklistItemIds !== undefined){
let data53 = data48.completedChecklistItemIds;
const _errs103 = errors;
if(errors === _errs103){
if(Array.isArray(data53)){
var valid6 = true;
const len1 = data53.length;
for(let i1=0; i1<len1; i1++){
const _errs105 = errors;
if(typeof data53[i1] !== "string"){
validate65.errors = [{instancePath:instancePath+"/metricUpdate/completedChecklistItemIds/" + i1,schemaPath:"#/properties/metricUpdate/properties/completedChecklistItemIds/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid6 = _errs105 === errors;
if(!valid6){
break;
}
}
}
else {
validate65.errors = [{instancePath:instancePath+"/metricUpdate/completedChecklistItemIds",schemaPath:"#/properties/metricUpdate/properties/completedChecklistItemIds/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid5 = _errs103 === errors;
}
else {
var valid5 = true;
}
if(valid5){
if(data48.performanceValue !== undefined){
const _errs107 = errors;
if(!(typeof data48.performanceValue == "number")){
validate65.errors = [{instancePath:instancePath+"/metricUpdate/performanceValue",schemaPath:"#/properties/metricUpdate/properties/performanceValue/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid5 = _errs107 === errors;
}
else {
var valid5 = true;
}
if(valid5){
if(data48.performanceUnit !== undefined){
const _errs109 = errors;
if(typeof data48.performanceUnit !== "string"){
validate65.errors = [{instancePath:instancePath+"/metricUpdate/performanceUnit",schemaPath:"#/properties/metricUpdate/properties/performanceUnit/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid5 = _errs109 === errors;
}
else {
var valid5 = true;
}
if(valid5){
if(data48.performanceNote !== undefined){
const _errs111 = errors;
if(typeof data48.performanceNote !== "string"){
validate65.errors = [{instancePath:instancePath+"/metricUpdate/performanceNote",schemaPath:"#/properties/metricUpdate/properties/performanceNote/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid5 = _errs111 === errors;
}
else {
var valid5 = true;
}
if(valid5){
if(data48.performanceData !== undefined){
const _errs113 = errors;
var valid5 = _errs113 === errors;
}
else {
var valid5 = true;
}
if(valid5){
if(data48.qualityValue !== undefined){
const _errs115 = errors;
if(!(typeof data48.qualityValue == "number")){
validate65.errors = [{instancePath:instancePath+"/metricUpdate/qualityValue",schemaPath:"#/properties/metricUpdate/properties/qualityValue/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid5 = _errs115 === errors;
}
else {
var valid5 = true;
}
if(valid5){
if(data48.stateValue !== undefined){
const _errs117 = errors;
if(!(typeof data48.stateValue == "number")){
validate65.errors = [{instancePath:instancePath+"/metricUpdate/stateValue",schemaPath:"#/properties/metricUpdate/properties/stateValue/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid5 = _errs117 === errors;
}
else {
var valid5 = true;
}
if(valid5){
if(data48.amountAdded !== undefined){
const _errs119 = errors;
if(!(typeof data48.amountAdded == "number")){
validate65.errors = [{instancePath:instancePath+"/metricUpdate/amountAdded",schemaPath:"#/properties/metricUpdate/properties/amountAdded/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid5 = _errs119 === errors;
}
else {
var valid5 = true;
}
if(valid5){
if(data48.newCurrentAmount !== undefined){
const _errs121 = errors;
if(!(typeof data48.newCurrentAmount == "number")){
validate65.errors = [{instancePath:instancePath+"/metricUpdate/newCurrentAmount",schemaPath:"#/properties/metricUpdate/properties/newCurrentAmount/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid5 = _errs121 === errors;
}
else {
var valid5 = true;
}
if(valid5){
if(data48.markCompleted !== undefined){
const _errs123 = errors;
if(typeof data48.markCompleted !== "boolean"){
validate65.errors = [{instancePath:instancePath+"/metricUpdate/markCompleted",schemaPath:"#/properties/metricUpdate/properties/markCompleted/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid5 = _errs123 === errors;
}
else {
var valid5 = true;
}
if(valid5){
if(data48.qualitativeText !== undefined){
const _errs125 = errors;
if(typeof data48.qualitativeText !== "string"){
validate65.errors = [{instancePath:instancePath+"/metricUpdate/qualitativeText",schemaPath:"#/properties/metricUpdate/properties/qualitativeText/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid5 = _errs125 === errors;
}
else {
var valid5 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate65.errors = [{instancePath:instancePath+"/metricUpdate",schemaPath:"#/properties/metricUpdate/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs94 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.appliedToProgress !== undefined){
const _errs127 = errors;
if(typeof data.appliedToProgress !== "boolean"){
validate65.errors = [{instancePath:instancePath+"/appliedToProgress",schemaPath:"#/properties/appliedToProgress/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs127 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.dataProvenance !== undefined){
const _errs129 = errors;
if(!(validate75(data.dataProvenance, {instancePath:instancePath+"/dataProvenance",parentData:data,parentDataProperty:"dataProvenance",rootData}))){
vErrors = vErrors === null ? validate75.errors : vErrors.concat(validate75.errors);
errors = vErrors.length;
}
var valid0 = _errs129 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.createdAt !== undefined){
const _errs130 = errors;
if(typeof data.createdAt !== "string"){
validate65.errors = [{instancePath:instancePath+"/createdAt",schemaPath:"#/properties/createdAt/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs130 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.updatedAt !== undefined){
const _errs132 = errors;
if(typeof data.updatedAt !== "string"){
validate65.errors = [{instancePath:instancePath+"/updatedAt",schemaPath:"#/properties/updatedAt/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs132 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate65.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate65.errors = vErrors;
return errors === 0;
}

const schema38 = {"type":"object","properties":{"id":{"type":"string"},"executionLogId":{"type":"string"},"date":{"type":"string"},"timestamp":{"type":"string"},"source":{"type":"string","enum":["execution_log","timer","one_tap","schedule_block","manual"]},"primarySkillId":{"type":"string"},"primaryGoalId":{"type":"string"},"primaryModuleId":{"type":"string"},"scheduleBlockId":{"type":"string"},"effortType":{"$ref":"#/definitions/EffortType"},"metricFamily":{"$ref":"#/definitions/MetricFamily"},"raw":{"type":"object","properties":{"durationMinutes":{"type":"number"},"exerciseName":{"type":"string"},"weight":{"type":"number"},"sets":{"type":"number"},"reps":{"type":"number"},"rpe":{"type":"number"},"estimatedVolume":{"type":"number"},"count":{"type":"number"},"completedItems":{"type":"number"},"score":{"type":"number"},"amount":{"type":"number"},"qualityRating":{"type":"number"},"difficultyRating":{"type":"number"},"mentalCost":{"type":"number"},"physicalCost":{"type":"number"},"note":{"type":"string"},"exercises":{"type":"array","items":{"type":"object","properties":{"exerciseName":{"type":"string"},"weight":{"type":"number"},"sets":{"type":"number"},"reps":{"type":"number"},"rpe":{"type":"number"},"note":{"type":"string"}}}}}},"derived":{"type":"object","properties":{"effortScore":{"type":"number"},"intensityScore":{"type":"number"},"volumeScore":{"type":"number"},"consistencyScore":{"type":"number"},"qualityScore":{"type":"number"}}},"comparableKey":{"type":"string"},"createdAt":{"type":"string"},"updatedAt":{"type":"string"}},"required":["id","executionLogId","date","timestamp","source","effortType","metricFamily","raw","derived","createdAt"]};
const schema39 = {"type":"string","enum":["time_investment","strength_training","performance_attempt","study_session","practice_reps","project_progress","checklist_completion","frequency_completion","recovery_action","life_maintenance","qualitative_progress"]};

function validate91(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(typeof data !== "string"){
validate91.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((((((((((data === "time_investment") || (data === "strength_training")) || (data === "performance_attempt")) || (data === "study_session")) || (data === "practice_reps")) || (data === "project_progress")) || (data === "checklist_completion")) || (data === "frequency_completion")) || (data === "recovery_action")) || (data === "life_maintenance")) || (data === "qualitative_progress"))){
validate91.errors = [{instancePath,schemaPath:"#/enum",keyword:"enum",params:{allowedValues: schema39.enum},message:"must be equal to one of the allowed values"}];
return false;
}
validate91.errors = vErrors;
return errors === 0;
}

const schema40 = {"type":"string","enum":["time","strength","volume","reps","score","money","items","frequency","state_shift","qualitative"]};

function validate93(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(typeof data !== "string"){
validate93.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((((((((((data === "time") || (data === "strength")) || (data === "volume")) || (data === "reps")) || (data === "score")) || (data === "money")) || (data === "items")) || (data === "frequency")) || (data === "state_shift")) || (data === "qualitative"))){
validate93.errors = [{instancePath,schemaPath:"#/enum",keyword:"enum",params:{allowedValues: schema40.enum},message:"must be equal to one of the allowed values"}];
return false;
}
validate93.errors = vErrors;
return errors === 0;
}


function validate90(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((((((data.id === undefined) && (missing0 = "id")) || ((data.executionLogId === undefined) && (missing0 = "executionLogId"))) || ((data.date === undefined) && (missing0 = "date"))) || ((data.timestamp === undefined) && (missing0 = "timestamp"))) || ((data.source === undefined) && (missing0 = "source"))) || ((data.effortType === undefined) && (missing0 = "effortType"))) || ((data.metricFamily === undefined) && (missing0 = "metricFamily"))) || ((data.raw === undefined) && (missing0 = "raw"))) || ((data.derived === undefined) && (missing0 = "derived"))) || ((data.createdAt === undefined) && (missing0 = "createdAt"))){
validate90.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.id !== undefined){
const _errs1 = errors;
if(typeof data.id !== "string"){
validate90.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.executionLogId !== undefined){
const _errs3 = errors;
if(typeof data.executionLogId !== "string"){
validate90.errors = [{instancePath:instancePath+"/executionLogId",schemaPath:"#/properties/executionLogId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.date !== undefined){
const _errs5 = errors;
if(typeof data.date !== "string"){
validate90.errors = [{instancePath:instancePath+"/date",schemaPath:"#/properties/date/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.timestamp !== undefined){
const _errs7 = errors;
if(typeof data.timestamp !== "string"){
validate90.errors = [{instancePath:instancePath+"/timestamp",schemaPath:"#/properties/timestamp/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.source !== undefined){
let data4 = data.source;
const _errs9 = errors;
if(typeof data4 !== "string"){
validate90.errors = [{instancePath:instancePath+"/source",schemaPath:"#/properties/source/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((((data4 === "execution_log") || (data4 === "timer")) || (data4 === "one_tap")) || (data4 === "schedule_block")) || (data4 === "manual"))){
validate90.errors = [{instancePath:instancePath+"/source",schemaPath:"#/properties/source/enum",keyword:"enum",params:{allowedValues: schema38.properties.source.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.primarySkillId !== undefined){
const _errs11 = errors;
if(typeof data.primarySkillId !== "string"){
validate90.errors = [{instancePath:instancePath+"/primarySkillId",schemaPath:"#/properties/primarySkillId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.primaryGoalId !== undefined){
const _errs13 = errors;
if(typeof data.primaryGoalId !== "string"){
validate90.errors = [{instancePath:instancePath+"/primaryGoalId",schemaPath:"#/properties/primaryGoalId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.primaryModuleId !== undefined){
const _errs15 = errors;
if(typeof data.primaryModuleId !== "string"){
validate90.errors = [{instancePath:instancePath+"/primaryModuleId",schemaPath:"#/properties/primaryModuleId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs15 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.scheduleBlockId !== undefined){
const _errs17 = errors;
if(typeof data.scheduleBlockId !== "string"){
validate90.errors = [{instancePath:instancePath+"/scheduleBlockId",schemaPath:"#/properties/scheduleBlockId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs17 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.effortType !== undefined){
const _errs19 = errors;
if(!(validate91(data.effortType, {instancePath:instancePath+"/effortType",parentData:data,parentDataProperty:"effortType",rootData}))){
vErrors = vErrors === null ? validate91.errors : vErrors.concat(validate91.errors);
errors = vErrors.length;
}
var valid0 = _errs19 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.metricFamily !== undefined){
const _errs20 = errors;
if(!(validate93(data.metricFamily, {instancePath:instancePath+"/metricFamily",parentData:data,parentDataProperty:"metricFamily",rootData}))){
vErrors = vErrors === null ? validate93.errors : vErrors.concat(validate93.errors);
errors = vErrors.length;
}
var valid0 = _errs20 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.raw !== undefined){
let data11 = data.raw;
const _errs21 = errors;
if(errors === _errs21){
if(data11 && typeof data11 == "object" && !Array.isArray(data11)){
if(data11.durationMinutes !== undefined){
const _errs23 = errors;
if(!(typeof data11.durationMinutes == "number")){
validate90.errors = [{instancePath:instancePath+"/raw/durationMinutes",schemaPath:"#/properties/raw/properties/durationMinutes/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid1 = _errs23 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data11.exerciseName !== undefined){
const _errs25 = errors;
if(typeof data11.exerciseName !== "string"){
validate90.errors = [{instancePath:instancePath+"/raw/exerciseName",schemaPath:"#/properties/raw/properties/exerciseName/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid1 = _errs25 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data11.weight !== undefined){
const _errs27 = errors;
if(!(typeof data11.weight == "number")){
validate90.errors = [{instancePath:instancePath+"/raw/weight",schemaPath:"#/properties/raw/properties/weight/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid1 = _errs27 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data11.sets !== undefined){
const _errs29 = errors;
if(!(typeof data11.sets == "number")){
validate90.errors = [{instancePath:instancePath+"/raw/sets",schemaPath:"#/properties/raw/properties/sets/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid1 = _errs29 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data11.reps !== undefined){
const _errs31 = errors;
if(!(typeof data11.reps == "number")){
validate90.errors = [{instancePath:instancePath+"/raw/reps",schemaPath:"#/properties/raw/properties/reps/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid1 = _errs31 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data11.rpe !== undefined){
const _errs33 = errors;
if(!(typeof data11.rpe == "number")){
validate90.errors = [{instancePath:instancePath+"/raw/rpe",schemaPath:"#/properties/raw/properties/rpe/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid1 = _errs33 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data11.estimatedVolume !== undefined){
const _errs35 = errors;
if(!(typeof data11.estimatedVolume == "number")){
validate90.errors = [{instancePath:instancePath+"/raw/estimatedVolume",schemaPath:"#/properties/raw/properties/estimatedVolume/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid1 = _errs35 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data11.count !== undefined){
const _errs37 = errors;
if(!(typeof data11.count == "number")){
validate90.errors = [{instancePath:instancePath+"/raw/count",schemaPath:"#/properties/raw/properties/count/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid1 = _errs37 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data11.completedItems !== undefined){
const _errs39 = errors;
if(!(typeof data11.completedItems == "number")){
validate90.errors = [{instancePath:instancePath+"/raw/completedItems",schemaPath:"#/properties/raw/properties/completedItems/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid1 = _errs39 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data11.score !== undefined){
const _errs41 = errors;
if(!(typeof data11.score == "number")){
validate90.errors = [{instancePath:instancePath+"/raw/score",schemaPath:"#/properties/raw/properties/score/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid1 = _errs41 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data11.amount !== undefined){
const _errs43 = errors;
if(!(typeof data11.amount == "number")){
validate90.errors = [{instancePath:instancePath+"/raw/amount",schemaPath:"#/properties/raw/properties/amount/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid1 = _errs43 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data11.qualityRating !== undefined){
const _errs45 = errors;
if(!(typeof data11.qualityRating == "number")){
validate90.errors = [{instancePath:instancePath+"/raw/qualityRating",schemaPath:"#/properties/raw/properties/qualityRating/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid1 = _errs45 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data11.difficultyRating !== undefined){
const _errs47 = errors;
if(!(typeof data11.difficultyRating == "number")){
validate90.errors = [{instancePath:instancePath+"/raw/difficultyRating",schemaPath:"#/properties/raw/properties/difficultyRating/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid1 = _errs47 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data11.mentalCost !== undefined){
const _errs49 = errors;
if(!(typeof data11.mentalCost == "number")){
validate90.errors = [{instancePath:instancePath+"/raw/mentalCost",schemaPath:"#/properties/raw/properties/mentalCost/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid1 = _errs49 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data11.physicalCost !== undefined){
const _errs51 = errors;
if(!(typeof data11.physicalCost == "number")){
validate90.errors = [{instancePath:instancePath+"/raw/physicalCost",schemaPath:"#/properties/raw/properties/physicalCost/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid1 = _errs51 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data11.note !== undefined){
const _errs53 = errors;
if(typeof data11.note !== "string"){
validate90.errors = [{instancePath:instancePath+"/raw/note",schemaPath:"#/properties/raw/properties/note/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid1 = _errs53 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data11.exercises !== undefined){
let data28 = data11.exercises;
const _errs55 = errors;
if(errors === _errs55){
if(Array.isArray(data28)){
var valid2 = true;
const len0 = data28.length;
for(let i0=0; i0<len0; i0++){
let data29 = data28[i0];
const _errs57 = errors;
if(errors === _errs57){
if(data29 && typeof data29 == "object" && !Array.isArray(data29)){
if(data29.exerciseName !== undefined){
const _errs59 = errors;
if(typeof data29.exerciseName !== "string"){
validate90.errors = [{instancePath:instancePath+"/raw/exercises/" + i0+"/exerciseName",schemaPath:"#/properties/raw/properties/exercises/items/properties/exerciseName/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid3 = _errs59 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data29.weight !== undefined){
const _errs61 = errors;
if(!(typeof data29.weight == "number")){
validate90.errors = [{instancePath:instancePath+"/raw/exercises/" + i0+"/weight",schemaPath:"#/properties/raw/properties/exercises/items/properties/weight/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid3 = _errs61 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data29.sets !== undefined){
const _errs63 = errors;
if(!(typeof data29.sets == "number")){
validate90.errors = [{instancePath:instancePath+"/raw/exercises/" + i0+"/sets",schemaPath:"#/properties/raw/properties/exercises/items/properties/sets/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid3 = _errs63 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data29.reps !== undefined){
const _errs65 = errors;
if(!(typeof data29.reps == "number")){
validate90.errors = [{instancePath:instancePath+"/raw/exercises/" + i0+"/reps",schemaPath:"#/properties/raw/properties/exercises/items/properties/reps/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid3 = _errs65 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data29.rpe !== undefined){
const _errs67 = errors;
if(!(typeof data29.rpe == "number")){
validate90.errors = [{instancePath:instancePath+"/raw/exercises/" + i0+"/rpe",schemaPath:"#/properties/raw/properties/exercises/items/properties/rpe/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid3 = _errs67 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data29.note !== undefined){
const _errs69 = errors;
if(typeof data29.note !== "string"){
validate90.errors = [{instancePath:instancePath+"/raw/exercises/" + i0+"/note",schemaPath:"#/properties/raw/properties/exercises/items/properties/note/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid3 = _errs69 === errors;
}
else {
var valid3 = true;
}
}
}
}
}
}
}
else {
validate90.errors = [{instancePath:instancePath+"/raw/exercises/" + i0,schemaPath:"#/properties/raw/properties/exercises/items/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid2 = _errs57 === errors;
if(!valid2){
break;
}
}
}
else {
validate90.errors = [{instancePath:instancePath+"/raw/exercises",schemaPath:"#/properties/raw/properties/exercises/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid1 = _errs55 === errors;
}
else {
var valid1 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate90.errors = [{instancePath:instancePath+"/raw",schemaPath:"#/properties/raw/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs21 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.derived !== undefined){
let data36 = data.derived;
const _errs71 = errors;
if(errors === _errs71){
if(data36 && typeof data36 == "object" && !Array.isArray(data36)){
if(data36.effortScore !== undefined){
const _errs73 = errors;
if(!(typeof data36.effortScore == "number")){
validate90.errors = [{instancePath:instancePath+"/derived/effortScore",schemaPath:"#/properties/derived/properties/effortScore/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid4 = _errs73 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data36.intensityScore !== undefined){
const _errs75 = errors;
if(!(typeof data36.intensityScore == "number")){
validate90.errors = [{instancePath:instancePath+"/derived/intensityScore",schemaPath:"#/properties/derived/properties/intensityScore/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid4 = _errs75 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data36.volumeScore !== undefined){
const _errs77 = errors;
if(!(typeof data36.volumeScore == "number")){
validate90.errors = [{instancePath:instancePath+"/derived/volumeScore",schemaPath:"#/properties/derived/properties/volumeScore/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid4 = _errs77 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data36.consistencyScore !== undefined){
const _errs79 = errors;
if(!(typeof data36.consistencyScore == "number")){
validate90.errors = [{instancePath:instancePath+"/derived/consistencyScore",schemaPath:"#/properties/derived/properties/consistencyScore/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid4 = _errs79 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data36.qualityScore !== undefined){
const _errs81 = errors;
if(!(typeof data36.qualityScore == "number")){
validate90.errors = [{instancePath:instancePath+"/derived/qualityScore",schemaPath:"#/properties/derived/properties/qualityScore/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid4 = _errs81 === errors;
}
else {
var valid4 = true;
}
}
}
}
}
}
else {
validate90.errors = [{instancePath:instancePath+"/derived",schemaPath:"#/properties/derived/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs71 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.comparableKey !== undefined){
const _errs83 = errors;
if(typeof data.comparableKey !== "string"){
validate90.errors = [{instancePath:instancePath+"/comparableKey",schemaPath:"#/properties/comparableKey/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs83 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.createdAt !== undefined){
const _errs85 = errors;
if(typeof data.createdAt !== "string"){
validate90.errors = [{instancePath:instancePath+"/createdAt",schemaPath:"#/properties/createdAt/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs85 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.updatedAt !== undefined){
const _errs87 = errors;
if(typeof data.updatedAt !== "string"){
validate90.errors = [{instancePath:instancePath+"/updatedAt",schemaPath:"#/properties/updatedAt/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs87 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate90.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate90.errors = vErrors;
return errors === 0;
}

const schema41 = {"type":"object","properties":{"id":{"type":"string"},"effortUnitId":{"type":"string"},"executionLogId":{"type":"string"},"targetType":{"type":"string","enum":["goal","skill","module"]},"targetId":{"type":"string"},"contributionType":{"type":"string","enum":["direct","indirect","supporting","maintenance","recovery"]},"strength":{"type":"string","enum":["high","medium","low"]},"weight":{"type":"number"},"reasonCode":{"type":"string","enum":["primary_skill","linked_module","linked_goal","shared_category","supporting_muscle_group","manual_link","fallback"]},"createdAt":{"type":"string"}},"required":["id","effortUnitId","executionLogId","targetType","targetId","contributionType","strength","weight","reasonCode","createdAt"]};

function validate96(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((((((data.id === undefined) && (missing0 = "id")) || ((data.effortUnitId === undefined) && (missing0 = "effortUnitId"))) || ((data.executionLogId === undefined) && (missing0 = "executionLogId"))) || ((data.targetType === undefined) && (missing0 = "targetType"))) || ((data.targetId === undefined) && (missing0 = "targetId"))) || ((data.contributionType === undefined) && (missing0 = "contributionType"))) || ((data.strength === undefined) && (missing0 = "strength"))) || ((data.weight === undefined) && (missing0 = "weight"))) || ((data.reasonCode === undefined) && (missing0 = "reasonCode"))) || ((data.createdAt === undefined) && (missing0 = "createdAt"))){
validate96.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.id !== undefined){
const _errs1 = errors;
if(typeof data.id !== "string"){
validate96.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.effortUnitId !== undefined){
const _errs3 = errors;
if(typeof data.effortUnitId !== "string"){
validate96.errors = [{instancePath:instancePath+"/effortUnitId",schemaPath:"#/properties/effortUnitId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.executionLogId !== undefined){
const _errs5 = errors;
if(typeof data.executionLogId !== "string"){
validate96.errors = [{instancePath:instancePath+"/executionLogId",schemaPath:"#/properties/executionLogId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.targetType !== undefined){
let data3 = data.targetType;
const _errs7 = errors;
if(typeof data3 !== "string"){
validate96.errors = [{instancePath:instancePath+"/targetType",schemaPath:"#/properties/targetType/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((data3 === "goal") || (data3 === "skill")) || (data3 === "module"))){
validate96.errors = [{instancePath:instancePath+"/targetType",schemaPath:"#/properties/targetType/enum",keyword:"enum",params:{allowedValues: schema41.properties.targetType.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.targetId !== undefined){
const _errs9 = errors;
if(typeof data.targetId !== "string"){
validate96.errors = [{instancePath:instancePath+"/targetId",schemaPath:"#/properties/targetId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.contributionType !== undefined){
let data5 = data.contributionType;
const _errs11 = errors;
if(typeof data5 !== "string"){
validate96.errors = [{instancePath:instancePath+"/contributionType",schemaPath:"#/properties/contributionType/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((((data5 === "direct") || (data5 === "indirect")) || (data5 === "supporting")) || (data5 === "maintenance")) || (data5 === "recovery"))){
validate96.errors = [{instancePath:instancePath+"/contributionType",schemaPath:"#/properties/contributionType/enum",keyword:"enum",params:{allowedValues: schema41.properties.contributionType.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.strength !== undefined){
let data6 = data.strength;
const _errs13 = errors;
if(typeof data6 !== "string"){
validate96.errors = [{instancePath:instancePath+"/strength",schemaPath:"#/properties/strength/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((data6 === "high") || (data6 === "medium")) || (data6 === "low"))){
validate96.errors = [{instancePath:instancePath+"/strength",schemaPath:"#/properties/strength/enum",keyword:"enum",params:{allowedValues: schema41.properties.strength.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.weight !== undefined){
const _errs15 = errors;
if(!(typeof data.weight == "number")){
validate96.errors = [{instancePath:instancePath+"/weight",schemaPath:"#/properties/weight/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs15 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.reasonCode !== undefined){
let data8 = data.reasonCode;
const _errs17 = errors;
if(typeof data8 !== "string"){
validate96.errors = [{instancePath:instancePath+"/reasonCode",schemaPath:"#/properties/reasonCode/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((((((data8 === "primary_skill") || (data8 === "linked_module")) || (data8 === "linked_goal")) || (data8 === "shared_category")) || (data8 === "supporting_muscle_group")) || (data8 === "manual_link")) || (data8 === "fallback"))){
validate96.errors = [{instancePath:instancePath+"/reasonCode",schemaPath:"#/properties/reasonCode/enum",keyword:"enum",params:{allowedValues: schema41.properties.reasonCode.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs17 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.createdAt !== undefined){
const _errs19 = errors;
if(typeof data.createdAt !== "string"){
validate96.errors = [{instancePath:instancePath+"/createdAt",schemaPath:"#/properties/createdAt/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs19 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate96.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate96.errors = vErrors;
return errors === 0;
}

const schema42 = {"type":"object","properties":{"id":{"type":"string"},"date":{"type":"string"},"startedAt":{"type":"string"},"completedAt":{"type":"string"},"triggerType":{"type":"string","enum":["brain_off","doomscrolling","overthinking","sleep_debt","mental_fatigue","avoidance","unknown"]},"rescueStepCompleted":{"type":"boolean"},"activationStepCompleted":{"type":"boolean"},"bodyAction":{"type":"string"},"activationAction":{"type":"string"},"beforeState":{"type":"object","properties":{"energy":{"type":"number"},"focus":{"type":"number"},"mood":{"type":"number"},"note":{"type":"string"}}},"afterState":{"type":"object","properties":{"energy":{"type":"number"},"focus":{"type":"number"},"mood":{"type":"number"},"note":{"type":"string"}}},"linkedSkillId":{"type":"string"},"linkedGoalId":{"type":"string"},"linkedModuleId":{"type":"string"},"linkedScheduleBlockId":{"type":"string"},"source":{"type":"string","const":"brain_off_rescue"},"note":{"type":"string"},"createdAt":{"type":"string"},"updatedAt":{"type":"string"}},"required":["id","date","startedAt","source","createdAt"]};

function validate98(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((data.id === undefined) && (missing0 = "id")) || ((data.date === undefined) && (missing0 = "date"))) || ((data.startedAt === undefined) && (missing0 = "startedAt"))) || ((data.source === undefined) && (missing0 = "source"))) || ((data.createdAt === undefined) && (missing0 = "createdAt"))){
validate98.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.id !== undefined){
const _errs1 = errors;
if(typeof data.id !== "string"){
validate98.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.date !== undefined){
const _errs3 = errors;
if(typeof data.date !== "string"){
validate98.errors = [{instancePath:instancePath+"/date",schemaPath:"#/properties/date/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.startedAt !== undefined){
const _errs5 = errors;
if(typeof data.startedAt !== "string"){
validate98.errors = [{instancePath:instancePath+"/startedAt",schemaPath:"#/properties/startedAt/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.completedAt !== undefined){
const _errs7 = errors;
if(typeof data.completedAt !== "string"){
validate98.errors = [{instancePath:instancePath+"/completedAt",schemaPath:"#/properties/completedAt/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.triggerType !== undefined){
let data4 = data.triggerType;
const _errs9 = errors;
if(typeof data4 !== "string"){
validate98.errors = [{instancePath:instancePath+"/triggerType",schemaPath:"#/properties/triggerType/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((((((data4 === "brain_off") || (data4 === "doomscrolling")) || (data4 === "overthinking")) || (data4 === "sleep_debt")) || (data4 === "mental_fatigue")) || (data4 === "avoidance")) || (data4 === "unknown"))){
validate98.errors = [{instancePath:instancePath+"/triggerType",schemaPath:"#/properties/triggerType/enum",keyword:"enum",params:{allowedValues: schema42.properties.triggerType.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.rescueStepCompleted !== undefined){
const _errs11 = errors;
if(typeof data.rescueStepCompleted !== "boolean"){
validate98.errors = [{instancePath:instancePath+"/rescueStepCompleted",schemaPath:"#/properties/rescueStepCompleted/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.activationStepCompleted !== undefined){
const _errs13 = errors;
if(typeof data.activationStepCompleted !== "boolean"){
validate98.errors = [{instancePath:instancePath+"/activationStepCompleted",schemaPath:"#/properties/activationStepCompleted/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.bodyAction !== undefined){
const _errs15 = errors;
if(typeof data.bodyAction !== "string"){
validate98.errors = [{instancePath:instancePath+"/bodyAction",schemaPath:"#/properties/bodyAction/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs15 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.activationAction !== undefined){
const _errs17 = errors;
if(typeof data.activationAction !== "string"){
validate98.errors = [{instancePath:instancePath+"/activationAction",schemaPath:"#/properties/activationAction/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs17 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.beforeState !== undefined){
let data9 = data.beforeState;
const _errs19 = errors;
if(errors === _errs19){
if(data9 && typeof data9 == "object" && !Array.isArray(data9)){
if(data9.energy !== undefined){
const _errs21 = errors;
if(!(typeof data9.energy == "number")){
validate98.errors = [{instancePath:instancePath+"/beforeState/energy",schemaPath:"#/properties/beforeState/properties/energy/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid1 = _errs21 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data9.focus !== undefined){
const _errs23 = errors;
if(!(typeof data9.focus == "number")){
validate98.errors = [{instancePath:instancePath+"/beforeState/focus",schemaPath:"#/properties/beforeState/properties/focus/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid1 = _errs23 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data9.mood !== undefined){
const _errs25 = errors;
if(!(typeof data9.mood == "number")){
validate98.errors = [{instancePath:instancePath+"/beforeState/mood",schemaPath:"#/properties/beforeState/properties/mood/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid1 = _errs25 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data9.note !== undefined){
const _errs27 = errors;
if(typeof data9.note !== "string"){
validate98.errors = [{instancePath:instancePath+"/beforeState/note",schemaPath:"#/properties/beforeState/properties/note/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid1 = _errs27 === errors;
}
else {
var valid1 = true;
}
}
}
}
}
else {
validate98.errors = [{instancePath:instancePath+"/beforeState",schemaPath:"#/properties/beforeState/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs19 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.afterState !== undefined){
let data14 = data.afterState;
const _errs29 = errors;
if(errors === _errs29){
if(data14 && typeof data14 == "object" && !Array.isArray(data14)){
if(data14.energy !== undefined){
const _errs31 = errors;
if(!(typeof data14.energy == "number")){
validate98.errors = [{instancePath:instancePath+"/afterState/energy",schemaPath:"#/properties/afterState/properties/energy/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid2 = _errs31 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data14.focus !== undefined){
const _errs33 = errors;
if(!(typeof data14.focus == "number")){
validate98.errors = [{instancePath:instancePath+"/afterState/focus",schemaPath:"#/properties/afterState/properties/focus/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid2 = _errs33 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data14.mood !== undefined){
const _errs35 = errors;
if(!(typeof data14.mood == "number")){
validate98.errors = [{instancePath:instancePath+"/afterState/mood",schemaPath:"#/properties/afterState/properties/mood/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid2 = _errs35 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data14.note !== undefined){
const _errs37 = errors;
if(typeof data14.note !== "string"){
validate98.errors = [{instancePath:instancePath+"/afterState/note",schemaPath:"#/properties/afterState/properties/note/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid2 = _errs37 === errors;
}
else {
var valid2 = true;
}
}
}
}
}
else {
validate98.errors = [{instancePath:instancePath+"/afterState",schemaPath:"#/properties/afterState/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs29 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.linkedSkillId !== undefined){
const _errs39 = errors;
if(typeof data.linkedSkillId !== "string"){
validate98.errors = [{instancePath:instancePath+"/linkedSkillId",schemaPath:"#/properties/linkedSkillId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs39 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.linkedGoalId !== undefined){
const _errs41 = errors;
if(typeof data.linkedGoalId !== "string"){
validate98.errors = [{instancePath:instancePath+"/linkedGoalId",schemaPath:"#/properties/linkedGoalId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs41 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.linkedModuleId !== undefined){
const _errs43 = errors;
if(typeof data.linkedModuleId !== "string"){
validate98.errors = [{instancePath:instancePath+"/linkedModuleId",schemaPath:"#/properties/linkedModuleId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs43 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.linkedScheduleBlockId !== undefined){
const _errs45 = errors;
if(typeof data.linkedScheduleBlockId !== "string"){
validate98.errors = [{instancePath:instancePath+"/linkedScheduleBlockId",schemaPath:"#/properties/linkedScheduleBlockId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs45 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.source !== undefined){
let data23 = data.source;
const _errs47 = errors;
if(typeof data23 !== "string"){
validate98.errors = [{instancePath:instancePath+"/source",schemaPath:"#/properties/source/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("brain_off_rescue" !== data23){
validate98.errors = [{instancePath:instancePath+"/source",schemaPath:"#/properties/source/const",keyword:"const",params:{allowedValue: "brain_off_rescue"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs47 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.note !== undefined){
const _errs49 = errors;
if(typeof data.note !== "string"){
validate98.errors = [{instancePath:instancePath+"/note",schemaPath:"#/properties/note/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs49 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.createdAt !== undefined){
const _errs51 = errors;
if(typeof data.createdAt !== "string"){
validate98.errors = [{instancePath:instancePath+"/createdAt",schemaPath:"#/properties/createdAt/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs51 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.updatedAt !== undefined){
const _errs53 = errors;
if(typeof data.updatedAt !== "string"){
validate98.errors = [{instancePath:instancePath+"/updatedAt",schemaPath:"#/properties/updatedAt/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs53 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate98.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate98.errors = vErrors;
return errors === 0;
}

const schema43 = {"type":"object","properties":{"id":{"type":"string"},"date":{"type":"string"},"timestamp":{"type":"string"},"timeBlock":{"type":"string","enum":["morning","midday","afternoon","evening","night"]},"overall":{"type":"number"},"energy":{"type":"number"},"focus":{"type":"number"},"mood":{"type":"number"},"physical":{"type":"number"},"stress":{"type":"number"},"label":{"type":"string","enum":["very_low","low","normal","good","great"]},"context":{"type":"object","properties":{"sleepQuality":{"type":"number"},"sick":{"type":"boolean"},"postWorkout":{"type":"boolean"},"afterExam":{"type":"boolean"},"caffeine":{"type":"boolean"},"socialDrain":{"type":"boolean"}}},"note":{"type":"string"},"dataProvenance":{"$ref":"#/definitions/DataRecordProvenance"},"createdAt":{"type":"string"},"updatedAt":{"type":"string"}},"required":["id","date","timestamp","overall","createdAt"]};

function validate100(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((data.id === undefined) && (missing0 = "id")) || ((data.date === undefined) && (missing0 = "date"))) || ((data.timestamp === undefined) && (missing0 = "timestamp"))) || ((data.overall === undefined) && (missing0 = "overall"))) || ((data.createdAt === undefined) && (missing0 = "createdAt"))){
validate100.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.id !== undefined){
const _errs1 = errors;
if(typeof data.id !== "string"){
validate100.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.date !== undefined){
const _errs3 = errors;
if(typeof data.date !== "string"){
validate100.errors = [{instancePath:instancePath+"/date",schemaPath:"#/properties/date/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.timestamp !== undefined){
const _errs5 = errors;
if(typeof data.timestamp !== "string"){
validate100.errors = [{instancePath:instancePath+"/timestamp",schemaPath:"#/properties/timestamp/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.timeBlock !== undefined){
let data3 = data.timeBlock;
const _errs7 = errors;
if(typeof data3 !== "string"){
validate100.errors = [{instancePath:instancePath+"/timeBlock",schemaPath:"#/properties/timeBlock/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((((data3 === "morning") || (data3 === "midday")) || (data3 === "afternoon")) || (data3 === "evening")) || (data3 === "night"))){
validate100.errors = [{instancePath:instancePath+"/timeBlock",schemaPath:"#/properties/timeBlock/enum",keyword:"enum",params:{allowedValues: schema43.properties.timeBlock.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.overall !== undefined){
const _errs9 = errors;
if(!(typeof data.overall == "number")){
validate100.errors = [{instancePath:instancePath+"/overall",schemaPath:"#/properties/overall/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.energy !== undefined){
const _errs11 = errors;
if(!(typeof data.energy == "number")){
validate100.errors = [{instancePath:instancePath+"/energy",schemaPath:"#/properties/energy/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.focus !== undefined){
const _errs13 = errors;
if(!(typeof data.focus == "number")){
validate100.errors = [{instancePath:instancePath+"/focus",schemaPath:"#/properties/focus/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.mood !== undefined){
const _errs15 = errors;
if(!(typeof data.mood == "number")){
validate100.errors = [{instancePath:instancePath+"/mood",schemaPath:"#/properties/mood/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs15 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.physical !== undefined){
const _errs17 = errors;
if(!(typeof data.physical == "number")){
validate100.errors = [{instancePath:instancePath+"/physical",schemaPath:"#/properties/physical/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs17 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.stress !== undefined){
const _errs19 = errors;
if(!(typeof data.stress == "number")){
validate100.errors = [{instancePath:instancePath+"/stress",schemaPath:"#/properties/stress/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs19 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.label !== undefined){
let data10 = data.label;
const _errs21 = errors;
if(typeof data10 !== "string"){
validate100.errors = [{instancePath:instancePath+"/label",schemaPath:"#/properties/label/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((((data10 === "very_low") || (data10 === "low")) || (data10 === "normal")) || (data10 === "good")) || (data10 === "great"))){
validate100.errors = [{instancePath:instancePath+"/label",schemaPath:"#/properties/label/enum",keyword:"enum",params:{allowedValues: schema43.properties.label.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs21 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.context !== undefined){
let data11 = data.context;
const _errs23 = errors;
if(errors === _errs23){
if(data11 && typeof data11 == "object" && !Array.isArray(data11)){
if(data11.sleepQuality !== undefined){
const _errs25 = errors;
if(!(typeof data11.sleepQuality == "number")){
validate100.errors = [{instancePath:instancePath+"/context/sleepQuality",schemaPath:"#/properties/context/properties/sleepQuality/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid1 = _errs25 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data11.sick !== undefined){
const _errs27 = errors;
if(typeof data11.sick !== "boolean"){
validate100.errors = [{instancePath:instancePath+"/context/sick",schemaPath:"#/properties/context/properties/sick/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid1 = _errs27 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data11.postWorkout !== undefined){
const _errs29 = errors;
if(typeof data11.postWorkout !== "boolean"){
validate100.errors = [{instancePath:instancePath+"/context/postWorkout",schemaPath:"#/properties/context/properties/postWorkout/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid1 = _errs29 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data11.afterExam !== undefined){
const _errs31 = errors;
if(typeof data11.afterExam !== "boolean"){
validate100.errors = [{instancePath:instancePath+"/context/afterExam",schemaPath:"#/properties/context/properties/afterExam/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid1 = _errs31 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data11.caffeine !== undefined){
const _errs33 = errors;
if(typeof data11.caffeine !== "boolean"){
validate100.errors = [{instancePath:instancePath+"/context/caffeine",schemaPath:"#/properties/context/properties/caffeine/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid1 = _errs33 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data11.socialDrain !== undefined){
const _errs35 = errors;
if(typeof data11.socialDrain !== "boolean"){
validate100.errors = [{instancePath:instancePath+"/context/socialDrain",schemaPath:"#/properties/context/properties/socialDrain/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid1 = _errs35 === errors;
}
else {
var valid1 = true;
}
}
}
}
}
}
}
else {
validate100.errors = [{instancePath:instancePath+"/context",schemaPath:"#/properties/context/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs23 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.note !== undefined){
const _errs37 = errors;
if(typeof data.note !== "string"){
validate100.errors = [{instancePath:instancePath+"/note",schemaPath:"#/properties/note/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs37 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.dataProvenance !== undefined){
const _errs39 = errors;
if(!(validate75(data.dataProvenance, {instancePath:instancePath+"/dataProvenance",parentData:data,parentDataProperty:"dataProvenance",rootData}))){
vErrors = vErrors === null ? validate75.errors : vErrors.concat(validate75.errors);
errors = vErrors.length;
}
var valid0 = _errs39 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.createdAt !== undefined){
const _errs40 = errors;
if(typeof data.createdAt !== "string"){
validate100.errors = [{instancePath:instancePath+"/createdAt",schemaPath:"#/properties/createdAt/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs40 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.updatedAt !== undefined){
const _errs42 = errors;
if(typeof data.updatedAt !== "string"){
validate100.errors = [{instancePath:instancePath+"/updatedAt",schemaPath:"#/properties/updatedAt/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs42 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate100.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate100.errors = vErrors;
return errors === 0;
}

const schema44 = {"type":"object","properties":{"id":{"type":"string"},"date":{"type":"string"},"createdAt":{"type":"string"},"type":{"type":"string","enum":["sleep","food","environment","body","weather","symptom","custom"]},"label":{"type":"string"},"value":{"type":["number","string"]},"unit":{"type":"string"},"intensity":{"type":"number"},"source":{"type":"string","enum":["manual","healthkit","sensor","import","unknown"]},"note":{"type":"string"},"rawText":{"type":"string"},"dataProvenance":{"$ref":"#/definitions/DataRecordProvenance"}},"required":["id","type","label"]};

function validate103(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((data.id === undefined) && (missing0 = "id")) || ((data.type === undefined) && (missing0 = "type"))) || ((data.label === undefined) && (missing0 = "label"))){
validate103.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.id !== undefined){
const _errs1 = errors;
if(typeof data.id !== "string"){
validate103.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.date !== undefined){
const _errs3 = errors;
if(typeof data.date !== "string"){
validate103.errors = [{instancePath:instancePath+"/date",schemaPath:"#/properties/date/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.createdAt !== undefined){
const _errs5 = errors;
if(typeof data.createdAt !== "string"){
validate103.errors = [{instancePath:instancePath+"/createdAt",schemaPath:"#/properties/createdAt/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.type !== undefined){
let data3 = data.type;
const _errs7 = errors;
if(typeof data3 !== "string"){
validate103.errors = [{instancePath:instancePath+"/type",schemaPath:"#/properties/type/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((((((data3 === "sleep") || (data3 === "food")) || (data3 === "environment")) || (data3 === "body")) || (data3 === "weather")) || (data3 === "symptom")) || (data3 === "custom"))){
validate103.errors = [{instancePath:instancePath+"/type",schemaPath:"#/properties/type/enum",keyword:"enum",params:{allowedValues: schema44.properties.type.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.label !== undefined){
const _errs9 = errors;
if(typeof data.label !== "string"){
validate103.errors = [{instancePath:instancePath+"/label",schemaPath:"#/properties/label/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.value !== undefined){
let data5 = data.value;
const _errs11 = errors;
if((!(typeof data5 == "number")) && (typeof data5 !== "string")){
validate103.errors = [{instancePath:instancePath+"/value",schemaPath:"#/properties/value/type",keyword:"type",params:{type: schema44.properties.value.type},message:"must be number,string"}];
return false;
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.unit !== undefined){
const _errs13 = errors;
if(typeof data.unit !== "string"){
validate103.errors = [{instancePath:instancePath+"/unit",schemaPath:"#/properties/unit/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.intensity !== undefined){
const _errs15 = errors;
if(!(typeof data.intensity == "number")){
validate103.errors = [{instancePath:instancePath+"/intensity",schemaPath:"#/properties/intensity/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs15 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.source !== undefined){
let data8 = data.source;
const _errs17 = errors;
if(typeof data8 !== "string"){
validate103.errors = [{instancePath:instancePath+"/source",schemaPath:"#/properties/source/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((((data8 === "manual") || (data8 === "healthkit")) || (data8 === "sensor")) || (data8 === "import")) || (data8 === "unknown"))){
validate103.errors = [{instancePath:instancePath+"/source",schemaPath:"#/properties/source/enum",keyword:"enum",params:{allowedValues: schema44.properties.source.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs17 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.note !== undefined){
const _errs19 = errors;
if(typeof data.note !== "string"){
validate103.errors = [{instancePath:instancePath+"/note",schemaPath:"#/properties/note/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs19 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.rawText !== undefined){
const _errs21 = errors;
if(typeof data.rawText !== "string"){
validate103.errors = [{instancePath:instancePath+"/rawText",schemaPath:"#/properties/rawText/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs21 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.dataProvenance !== undefined){
const _errs23 = errors;
if(!(validate75(data.dataProvenance, {instancePath:instancePath+"/dataProvenance",parentData:data,parentDataProperty:"dataProvenance",rootData}))){
vErrors = vErrors === null ? validate75.errors : vErrors.concat(validate75.errors);
errors = vErrors.length;
}
var valid0 = _errs23 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate103.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate103.errors = vErrors;
return errors === 0;
}

const schema45 = {"type":"object","properties":{"id":{"type":"string"},"createdAt":{"type":"string"},"mode":{"type":"string","enum":["instant_micro","daily_brief"]},"trigger":{"type":"string","enum":["state_checkin","manual","morning_push","debug"]},"source":{"type":"string","enum":["ai","legacy_fallback","ai_failed_fallback"]},"schemaVersion":{"type":"string"},"headlineInsight":{"type":"string"},"readinessBand":{"type":"string","enum":["green","yellow","red","unknown"]},"readinessScore":{"type":"number"},"firstStep":{"type":"object","properties":{"step":{"type":"string"},"why":{"type":"string"},"durationMin":{"type":"number"}},"required":["step"]},"doNot":{"type":"array","items":{"type":"string"}},"perceptionGapDetected":{"type":"boolean"},"evidenceBasis":{"type":"string","enum":["population_prior","personal_pattern","mixed"]},"confidence":{"type":"number"},"quality":{"type":"object","properties":{"score":{"type":"number"},"grade":{"type":"string","enum":["excellent","good","weak","bad"]},"failedCheckIds":{"type":"array","items":{"type":"string"}},"flags":{"type":"object","properties":{"generic":{"type":"boolean"},"missingEvidence":{"type":"boolean"},"missingFirstStep":{"type":"boolean"},"overclaiming":{"type":"boolean"},"medicalRisk":{"type":"boolean"},"tooVerbose":{"type":"boolean"},"tooVague":{"type":"boolean"},"ignoredAcceptedPatterns":{"type":"boolean"},"candidateMisuse":{"type":"boolean"},"acceptedPatternGrounded":{"type":"boolean"}}}},"required":["score","grade","failedCheckIds","flags"]},"meta":{"type":"object","properties":{"model":{"type":"string"},"finishReason":{"type":"string"},"evidenceRichness":{"type":"string","enum":["none","sparse","usable","rich"]},"endpointOk":{"type":"boolean"}}},"userFeedback":{"type":"object","properties":{"rating":{"type":"string","enum":["useful","not_useful"]},"ts":{"type":"string"}},"required":["rating","ts"]},"decisionEpisode":{"$ref":"#/definitions/DecisionEpisodeV1"},"dataProvenance":{"$ref":"#/definitions/DataRecordProvenance"}},"required":["id","createdAt","mode","trigger","source","schemaVersion","headlineInsight"]};
const schema46 = {"type":"object","properties":{"contractVersion":{"type":"string","const":"questlife.decision.episode.v1"},"id":{"type":"string"},"subject":{"type":"object","properties":{"kind":{"type":"string","enum":["owner","demo"]},"subjectId":{"type":"string"}},"required":["kind"]},"status":{"$ref":"#/definitions/DecisionEpisodeStatus"},"question":{"type":"object","properties":{"type":{"$ref":"#/definitions/DecisionQuestionType"},"text":{"type":"string"},"targetId":{"type":"string"},"targetLabel":{"type":"string"}},"required":["type"]},"targetOutcome":{"type":"object","properties":{"horizon":{"$ref":"#/definitions/DecisionOutcomeHorizon"},"fields":{"type":"array","items":{"type":"string","enum":["state","task_result","usefulness","fatigue","carryover"]}}},"required":["horizon","fields"]},"time":{"$ref":"#/definitions/DecisionTimeSemanticsV1"},"contextSnapshot":{"$ref":"#/definitions/DecisionContextSnapshotV1"},"missingContext":{"type":"array","items":{"$ref":"#/definitions/DecisionMissingQuestionV1"}},"contextSources":{"type":"array","items":{"$ref":"#/definitions/DecisionSourceRefV1"}},"candidateActions":{"type":"array","items":{"$ref":"#/definitions/DecisionCandidateActionV1"}},"selectedActionId":{"type":"string"},"evidencePacket":{"$ref":"#/definitions/DecisionEvidencePacketV1"},"limitations":{"type":"array","items":{"type":"string"}},"safetyStatus":{"$ref":"#/definitions/DecisionSafetyStatusV1"},"proposedPlanPatch":{"$ref":"#/definitions/DecisionPlanPatchV1"},"appliedPlanPatch":{"$ref":"#/definitions/DecisionPlanPatchV1"},"undoState":{"$ref":"#/definitions/DecisionUndoStateV1"},"followUpPlan":{"$ref":"#/definitions/DecisionFollowUpPlanV1"},"followUpOutcomes":{"type":"array","items":{"$ref":"#/definitions/DecisionFollowUpOutcomeV1"}},"leverage":{"$ref":"#/definitions/DecisionLeverageReportV1"},"provenance":{"type":"object","properties":{"origin":{"$ref":"#/definitions/DataRecordOrigin"},"sourceIds":{"type":"array","items":{"type":"string"}},"syntheticOnly":{"type":"boolean"},"containsRealUserData":{"type":"boolean"}},"required":["origin","sourceIds","syntheticOnly","containsRealUserData"]},"methodVersion":{"type":"string","const":"questlife.decision.policy.v1"},"createdAt":{"type":"string"},"updatedAt":{"type":"string"}},"required":["contractVersion","id","subject","status","question","targetOutcome","time","missingContext","contextSources","candidateActions","limitations","safetyStatus","undoState","followUpOutcomes","provenance","methodVersion","createdAt","updatedAt"]};
const schema47 = {"type":"string","enum":["DRAFT","CONTEXT_ASSEMBLING","NEEDS_INPUT","READY","PROPOSED","ACCEPTED","APPLIED","FOLLOW_UP_DUE","OUTCOME_RECORDED","CLOSED","ABSTAINED"]};

function validate108(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(typeof data !== "string"){
validate108.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((((((((((data === "DRAFT") || (data === "CONTEXT_ASSEMBLING")) || (data === "NEEDS_INPUT")) || (data === "READY")) || (data === "PROPOSED")) || (data === "ACCEPTED")) || (data === "APPLIED")) || (data === "FOLLOW_UP_DUE")) || (data === "OUTCOME_RECORDED")) || (data === "CLOSED")) || (data === "ABSTAINED"))){
validate108.errors = [{instancePath,schemaPath:"#/enum",keyword:"enum",params:{allowedValues: schema47.enum},message:"must be equal to one of the allowed values"}];
return false;
}
validate108.errors = vErrors;
return errors === 0;
}

const schema48 = {"type":"string","enum":["training_recovery","cognitive_adjustment","overloaded_day","custom"]};

function validate110(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(typeof data !== "string"){
validate110.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((((data === "training_recovery") || (data === "cognitive_adjustment")) || (data === "overloaded_day")) || (data === "custom"))){
validate110.errors = [{instancePath,schemaPath:"#/enum",keyword:"enum",params:{allowedValues: schema48.enum},message:"must be equal to one of the allowed values"}];
return false;
}
validate110.errors = vErrors;
return errors === 0;
}

const schema49 = {"type":"string","enum":["two_hours","end_of_day","next_morning"]};

function validate112(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(typeof data !== "string"){
validate112.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((data === "two_hours") || (data === "end_of_day")) || (data === "next_morning"))){
validate112.errors = [{instancePath,schemaPath:"#/enum",keyword:"enum",params:{allowedValues: schema49.enum},message:"must be equal to one of the allowed values"}];
return false;
}
validate112.errors = vErrors;
return errors === 0;
}

const schema50 = {"type":"object","properties":{"eventTime":{"type":"string"},"recordedTime":{"type":"string"},"availableAt":{"type":"string"},"asOf":{"type":"string"},"timezone":{"type":"string"},"observationWindow":{"type":"object","properties":{"start":{"type":"string"},"end":{"type":"string"}},"required":["start","end"]}},"required":["eventTime","recordedTime","availableAt","asOf","timezone","observationWindow"]};

function validate114(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((data.eventTime === undefined) && (missing0 = "eventTime")) || ((data.recordedTime === undefined) && (missing0 = "recordedTime"))) || ((data.availableAt === undefined) && (missing0 = "availableAt"))) || ((data.asOf === undefined) && (missing0 = "asOf"))) || ((data.timezone === undefined) && (missing0 = "timezone"))) || ((data.observationWindow === undefined) && (missing0 = "observationWindow"))){
validate114.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.eventTime !== undefined){
const _errs1 = errors;
if(typeof data.eventTime !== "string"){
validate114.errors = [{instancePath:instancePath+"/eventTime",schemaPath:"#/properties/eventTime/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.recordedTime !== undefined){
const _errs3 = errors;
if(typeof data.recordedTime !== "string"){
validate114.errors = [{instancePath:instancePath+"/recordedTime",schemaPath:"#/properties/recordedTime/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.availableAt !== undefined){
const _errs5 = errors;
if(typeof data.availableAt !== "string"){
validate114.errors = [{instancePath:instancePath+"/availableAt",schemaPath:"#/properties/availableAt/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.asOf !== undefined){
const _errs7 = errors;
if(typeof data.asOf !== "string"){
validate114.errors = [{instancePath:instancePath+"/asOf",schemaPath:"#/properties/asOf/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.timezone !== undefined){
const _errs9 = errors;
if(typeof data.timezone !== "string"){
validate114.errors = [{instancePath:instancePath+"/timezone",schemaPath:"#/properties/timezone/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.observationWindow !== undefined){
let data5 = data.observationWindow;
const _errs11 = errors;
if(errors === _errs11){
if(data5 && typeof data5 == "object" && !Array.isArray(data5)){
let missing1;
if(((data5.start === undefined) && (missing1 = "start")) || ((data5.end === undefined) && (missing1 = "end"))){
validate114.errors = [{instancePath:instancePath+"/observationWindow",schemaPath:"#/properties/observationWindow/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
if(data5.start !== undefined){
const _errs13 = errors;
if(typeof data5.start !== "string"){
validate114.errors = [{instancePath:instancePath+"/observationWindow/start",schemaPath:"#/properties/observationWindow/properties/start/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid1 = _errs13 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data5.end !== undefined){
const _errs15 = errors;
if(typeof data5.end !== "string"){
validate114.errors = [{instancePath:instancePath+"/observationWindow/end",schemaPath:"#/properties/observationWindow/properties/end/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid1 = _errs15 === errors;
}
else {
var valid1 = true;
}
}
}
}
else {
validate114.errors = [{instancePath:instancePath+"/observationWindow",schemaPath:"#/properties/observationWindow/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
else {
validate114.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate114.errors = vErrors;
return errors === 0;
}

const schema51 = {"type":"object","properties":{"assembledAt":{"type":"string"},"asOf":{"type":"string"},"facts":{"type":"array","items":{"$ref":"#/definitions/DecisionContextFactV1"}},"currentState":{"type":"object","properties":{"overall":{"type":"number"},"energy":{"type":"number"},"focus":{"type":"number"},"mood":{"type":"number"},"physical":{"type":"number"},"stress":{"type":"number"},"observedAt":{"type":"string"},"sourceId":{"type":"string"}},"required":["overall","observedAt","sourceId"]},"sleepMinutes":{"type":"object","properties":{"value":{"type":"number"},"observedAt":{"type":"string"},"sourceId":{"type":"string"}},"required":["value","observedAt","sourceId"]},"recentExecution":{"type":"object","properties":{"count":{"type":"number"},"totalMinutes":{"type":"number"},"averageQuality":{"type":"number"},"sourceIds":{"type":"array","items":{"type":"string"}}},"required":["count","totalMinutes","sourceIds"]},"schedule":{"type":"object","properties":{"date":{"type":"string"},"blocks":{"type":"array","items":{"$ref":"#/definitions/ScheduleBlock"}},"fixedCount":{"type":"number"},"flexibleCount":{"type":"number"},"remainingPlannedMinutes":{"type":"number"},"openWindows":{"type":"array","items":{"type":"object","properties":{"startTime":{"type":"string"},"endTime":{"type":"string"},"minutes":{"type":"number"}},"required":["startTime","endTime","minutes"]}}},"required":["date","blocks","fixedCount","flexibleCount","remainingPlannedMinutes","openWindows"]},"direction":{"type":"object","properties":{"goalId":{"type":"string"},"goalName":{"type":"string"},"skillId":{"type":"string"},"skillName":{"type":"string"}}},"sourceRefs":{"type":"array","items":{"$ref":"#/definitions/DecisionSourceRefV1"}},"missingness":{"type":"array","items":{"type":"object","properties":{"code":{"type":"string"},"reason":{"type":"string"}},"required":["code","reason"]}},"limitations":{"type":"array","items":{"type":"string"}}},"required":["assembledAt","asOf","facts","schedule","sourceRefs","missingness","limitations"]};
const schema52 = {"type":"object","properties":{"id":{"type":"string"},"kind":{"type":"string","enum":["state","sleep","recent_load","schedule_constraint","available_window","priority","goal_alignment","historical_episode"]},"label":{"type":"string"},"value":{"type":["number","string","boolean"]},"unit":{"type":"string"},"sourceIds":{"type":"array","items":{"type":"string"}},"observedAt":{"type":"string"}},"required":["id","kind","label","sourceIds"]};

function validate117(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((data.id === undefined) && (missing0 = "id")) || ((data.kind === undefined) && (missing0 = "kind"))) || ((data.label === undefined) && (missing0 = "label"))) || ((data.sourceIds === undefined) && (missing0 = "sourceIds"))){
validate117.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.id !== undefined){
const _errs1 = errors;
if(typeof data.id !== "string"){
validate117.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.kind !== undefined){
let data1 = data.kind;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate117.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((((((((data1 === "state") || (data1 === "sleep")) || (data1 === "recent_load")) || (data1 === "schedule_constraint")) || (data1 === "available_window")) || (data1 === "priority")) || (data1 === "goal_alignment")) || (data1 === "historical_episode"))){
validate117.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/enum",keyword:"enum",params:{allowedValues: schema52.properties.kind.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.label !== undefined){
const _errs5 = errors;
if(typeof data.label !== "string"){
validate117.errors = [{instancePath:instancePath+"/label",schemaPath:"#/properties/label/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.value !== undefined){
let data3 = data.value;
const _errs7 = errors;
if(((!(typeof data3 == "number")) && (typeof data3 !== "string")) && (typeof data3 !== "boolean")){
validate117.errors = [{instancePath:instancePath+"/value",schemaPath:"#/properties/value/type",keyword:"type",params:{type: schema52.properties.value.type},message:"must be number,string,boolean"}];
return false;
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.unit !== undefined){
const _errs9 = errors;
if(typeof data.unit !== "string"){
validate117.errors = [{instancePath:instancePath+"/unit",schemaPath:"#/properties/unit/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.sourceIds !== undefined){
let data5 = data.sourceIds;
const _errs11 = errors;
if(errors === _errs11){
if(Array.isArray(data5)){
var valid1 = true;
const len0 = data5.length;
for(let i0=0; i0<len0; i0++){
const _errs13 = errors;
if(typeof data5[i0] !== "string"){
validate117.errors = [{instancePath:instancePath+"/sourceIds/" + i0,schemaPath:"#/properties/sourceIds/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid1 = _errs13 === errors;
if(!valid1){
break;
}
}
}
else {
validate117.errors = [{instancePath:instancePath+"/sourceIds",schemaPath:"#/properties/sourceIds/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.observedAt !== undefined){
const _errs15 = errors;
if(typeof data.observedAt !== "string"){
validate117.errors = [{instancePath:instancePath+"/observedAt",schemaPath:"#/properties/observedAt/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs15 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
else {
validate117.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate117.errors = vErrors;
return errors === 0;
}

const schema53 = {"type":"object","properties":{"id":{"type":"string"},"title":{"type":"string"},"date":{"type":"string"},"startTime":{"type":"string"},"endTime":{"type":"string"},"plannedMinutes":{"type":"number"},"linkedGoalId":{"type":"string"},"linkedGoalIds":{"type":"array","items":{"type":"string"}},"linkedSkillId":{"type":"string"},"taskType":{"$ref":"#/definitions/TaskType"},"flexibility":{"type":"string","enum":["fixed","flexible","movable"]},"rigidity":{"type":"string","enum":["low","medium","high"]},"status":{"type":"string","enum":["planned","adjusted","completed","skipped"]},"placementLocked":{"type":"boolean","description":"Explicit user placement authority. Fixed commitments remain locked regardless."},"notes":{"type":"string"},"createdAt":{"type":"number"},"source":{"type":"string","enum":["manual","skill_rule"]}},"required":["id","title","date","startTime","endTime","plannedMinutes","taskType","flexibility","rigidity","status","createdAt"]};

function validate119(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((((((((data.id === undefined) && (missing0 = "id")) || ((data.title === undefined) && (missing0 = "title"))) || ((data.date === undefined) && (missing0 = "date"))) || ((data.startTime === undefined) && (missing0 = "startTime"))) || ((data.endTime === undefined) && (missing0 = "endTime"))) || ((data.plannedMinutes === undefined) && (missing0 = "plannedMinutes"))) || ((data.taskType === undefined) && (missing0 = "taskType"))) || ((data.flexibility === undefined) && (missing0 = "flexibility"))) || ((data.rigidity === undefined) && (missing0 = "rigidity"))) || ((data.status === undefined) && (missing0 = "status"))) || ((data.createdAt === undefined) && (missing0 = "createdAt"))){
validate119.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.id !== undefined){
const _errs1 = errors;
if(typeof data.id !== "string"){
validate119.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.title !== undefined){
const _errs3 = errors;
if(typeof data.title !== "string"){
validate119.errors = [{instancePath:instancePath+"/title",schemaPath:"#/properties/title/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.date !== undefined){
const _errs5 = errors;
if(typeof data.date !== "string"){
validate119.errors = [{instancePath:instancePath+"/date",schemaPath:"#/properties/date/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.startTime !== undefined){
const _errs7 = errors;
if(typeof data.startTime !== "string"){
validate119.errors = [{instancePath:instancePath+"/startTime",schemaPath:"#/properties/startTime/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.endTime !== undefined){
const _errs9 = errors;
if(typeof data.endTime !== "string"){
validate119.errors = [{instancePath:instancePath+"/endTime",schemaPath:"#/properties/endTime/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.plannedMinutes !== undefined){
const _errs11 = errors;
if(!(typeof data.plannedMinutes == "number")){
validate119.errors = [{instancePath:instancePath+"/plannedMinutes",schemaPath:"#/properties/plannedMinutes/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.linkedGoalId !== undefined){
const _errs13 = errors;
if(typeof data.linkedGoalId !== "string"){
validate119.errors = [{instancePath:instancePath+"/linkedGoalId",schemaPath:"#/properties/linkedGoalId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.linkedGoalIds !== undefined){
let data7 = data.linkedGoalIds;
const _errs15 = errors;
if(errors === _errs15){
if(Array.isArray(data7)){
var valid1 = true;
const len0 = data7.length;
for(let i0=0; i0<len0; i0++){
const _errs17 = errors;
if(typeof data7[i0] !== "string"){
validate119.errors = [{instancePath:instancePath+"/linkedGoalIds/" + i0,schemaPath:"#/properties/linkedGoalIds/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid1 = _errs17 === errors;
if(!valid1){
break;
}
}
}
else {
validate119.errors = [{instancePath:instancePath+"/linkedGoalIds",schemaPath:"#/properties/linkedGoalIds/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs15 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.linkedSkillId !== undefined){
const _errs19 = errors;
if(typeof data.linkedSkillId !== "string"){
validate119.errors = [{instancePath:instancePath+"/linkedSkillId",schemaPath:"#/properties/linkedSkillId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs19 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.taskType !== undefined){
const _errs21 = errors;
if(!(validate58(data.taskType, {instancePath:instancePath+"/taskType",parentData:data,parentDataProperty:"taskType",rootData}))){
vErrors = vErrors === null ? validate58.errors : vErrors.concat(validate58.errors);
errors = vErrors.length;
}
var valid0 = _errs21 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.flexibility !== undefined){
let data11 = data.flexibility;
const _errs22 = errors;
if(typeof data11 !== "string"){
validate119.errors = [{instancePath:instancePath+"/flexibility",schemaPath:"#/properties/flexibility/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((data11 === "fixed") || (data11 === "flexible")) || (data11 === "movable"))){
validate119.errors = [{instancePath:instancePath+"/flexibility",schemaPath:"#/properties/flexibility/enum",keyword:"enum",params:{allowedValues: schema53.properties.flexibility.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs22 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.rigidity !== undefined){
let data12 = data.rigidity;
const _errs24 = errors;
if(typeof data12 !== "string"){
validate119.errors = [{instancePath:instancePath+"/rigidity",schemaPath:"#/properties/rigidity/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((data12 === "low") || (data12 === "medium")) || (data12 === "high"))){
validate119.errors = [{instancePath:instancePath+"/rigidity",schemaPath:"#/properties/rigidity/enum",keyword:"enum",params:{allowedValues: schema53.properties.rigidity.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs24 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.status !== undefined){
let data13 = data.status;
const _errs26 = errors;
if(typeof data13 !== "string"){
validate119.errors = [{instancePath:instancePath+"/status",schemaPath:"#/properties/status/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((((data13 === "planned") || (data13 === "adjusted")) || (data13 === "completed")) || (data13 === "skipped"))){
validate119.errors = [{instancePath:instancePath+"/status",schemaPath:"#/properties/status/enum",keyword:"enum",params:{allowedValues: schema53.properties.status.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs26 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.placementLocked !== undefined){
const _errs28 = errors;
if(typeof data.placementLocked !== "boolean"){
validate119.errors = [{instancePath:instancePath+"/placementLocked",schemaPath:"#/properties/placementLocked/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs28 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.notes !== undefined){
const _errs30 = errors;
if(typeof data.notes !== "string"){
validate119.errors = [{instancePath:instancePath+"/notes",schemaPath:"#/properties/notes/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs30 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.createdAt !== undefined){
const _errs32 = errors;
if(!(typeof data.createdAt == "number")){
validate119.errors = [{instancePath:instancePath+"/createdAt",schemaPath:"#/properties/createdAt/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs32 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.source !== undefined){
let data17 = data.source;
const _errs34 = errors;
if(typeof data17 !== "string"){
validate119.errors = [{instancePath:instancePath+"/source",schemaPath:"#/properties/source/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((data17 === "manual") || (data17 === "skill_rule"))){
validate119.errors = [{instancePath:instancePath+"/source",schemaPath:"#/properties/source/enum",keyword:"enum",params:{allowedValues: schema53.properties.source.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs34 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate119.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate119.errors = vErrors;
return errors === 0;
}

const schema54 = {"type":"object","properties":{"sourceType":{"type":"string","enum":["state","context","execution","schedule","goal","skill","quant","decision_memory"]},"sourceId":{"type":"string"},"label":{"type":"string"},"eventTime":{"type":"string"},"availableAt":{"type":"string"},"origin":{"$ref":"#/definitions/DataRecordOrigin"},"eligibility":{"type":"string","enum":["eligible","limited","excluded"]},"limitationCodes":{"type":"array","items":{"type":"string"}}},"required":["sourceType","sourceId","label","eligibility"]};

function validate122(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((data.sourceType === undefined) && (missing0 = "sourceType")) || ((data.sourceId === undefined) && (missing0 = "sourceId"))) || ((data.label === undefined) && (missing0 = "label"))) || ((data.eligibility === undefined) && (missing0 = "eligibility"))){
validate122.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.sourceType !== undefined){
let data0 = data.sourceType;
const _errs1 = errors;
if(typeof data0 !== "string"){
validate122.errors = [{instancePath:instancePath+"/sourceType",schemaPath:"#/properties/sourceType/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((((((((data0 === "state") || (data0 === "context")) || (data0 === "execution")) || (data0 === "schedule")) || (data0 === "goal")) || (data0 === "skill")) || (data0 === "quant")) || (data0 === "decision_memory"))){
validate122.errors = [{instancePath:instancePath+"/sourceType",schemaPath:"#/properties/sourceType/enum",keyword:"enum",params:{allowedValues: schema54.properties.sourceType.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.sourceId !== undefined){
const _errs3 = errors;
if(typeof data.sourceId !== "string"){
validate122.errors = [{instancePath:instancePath+"/sourceId",schemaPath:"#/properties/sourceId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.label !== undefined){
const _errs5 = errors;
if(typeof data.label !== "string"){
validate122.errors = [{instancePath:instancePath+"/label",schemaPath:"#/properties/label/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.eventTime !== undefined){
const _errs7 = errors;
if(typeof data.eventTime !== "string"){
validate122.errors = [{instancePath:instancePath+"/eventTime",schemaPath:"#/properties/eventTime/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.availableAt !== undefined){
const _errs9 = errors;
if(typeof data.availableAt !== "string"){
validate122.errors = [{instancePath:instancePath+"/availableAt",schemaPath:"#/properties/availableAt/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.origin !== undefined){
const _errs11 = errors;
if(!(validate76(data.origin, {instancePath:instancePath+"/origin",parentData:data,parentDataProperty:"origin",rootData}))){
vErrors = vErrors === null ? validate76.errors : vErrors.concat(validate76.errors);
errors = vErrors.length;
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.eligibility !== undefined){
let data6 = data.eligibility;
const _errs12 = errors;
if(typeof data6 !== "string"){
validate122.errors = [{instancePath:instancePath+"/eligibility",schemaPath:"#/properties/eligibility/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((data6 === "eligible") || (data6 === "limited")) || (data6 === "excluded"))){
validate122.errors = [{instancePath:instancePath+"/eligibility",schemaPath:"#/properties/eligibility/enum",keyword:"enum",params:{allowedValues: schema54.properties.eligibility.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs12 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.limitationCodes !== undefined){
let data7 = data.limitationCodes;
const _errs14 = errors;
if(errors === _errs14){
if(Array.isArray(data7)){
var valid1 = true;
const len0 = data7.length;
for(let i0=0; i0<len0; i0++){
const _errs16 = errors;
if(typeof data7[i0] !== "string"){
validate122.errors = [{instancePath:instancePath+"/limitationCodes/" + i0,schemaPath:"#/properties/limitationCodes/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid1 = _errs16 === errors;
if(!valid1){
break;
}
}
}
else {
validate122.errors = [{instancePath:instancePath+"/limitationCodes",schemaPath:"#/properties/limitationCodes/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs14 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
else {
validate122.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate122.errors = vErrors;
return errors === 0;
}


function validate116(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((((data.assembledAt === undefined) && (missing0 = "assembledAt")) || ((data.asOf === undefined) && (missing0 = "asOf"))) || ((data.facts === undefined) && (missing0 = "facts"))) || ((data.schedule === undefined) && (missing0 = "schedule"))) || ((data.sourceRefs === undefined) && (missing0 = "sourceRefs"))) || ((data.missingness === undefined) && (missing0 = "missingness"))) || ((data.limitations === undefined) && (missing0 = "limitations"))){
validate116.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.assembledAt !== undefined){
const _errs1 = errors;
if(typeof data.assembledAt !== "string"){
validate116.errors = [{instancePath:instancePath+"/assembledAt",schemaPath:"#/properties/assembledAt/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.asOf !== undefined){
const _errs3 = errors;
if(typeof data.asOf !== "string"){
validate116.errors = [{instancePath:instancePath+"/asOf",schemaPath:"#/properties/asOf/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.facts !== undefined){
let data2 = data.facts;
const _errs5 = errors;
if(errors === _errs5){
if(Array.isArray(data2)){
var valid1 = true;
const len0 = data2.length;
for(let i0=0; i0<len0; i0++){
const _errs7 = errors;
if(!(validate117(data2[i0], {instancePath:instancePath+"/facts/" + i0,parentData:data2,parentDataProperty:i0,rootData}))){
vErrors = vErrors === null ? validate117.errors : vErrors.concat(validate117.errors);
errors = vErrors.length;
}
var valid1 = _errs7 === errors;
if(!valid1){
break;
}
}
}
else {
validate116.errors = [{instancePath:instancePath+"/facts",schemaPath:"#/properties/facts/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.currentState !== undefined){
let data4 = data.currentState;
const _errs8 = errors;
if(errors === _errs8){
if(data4 && typeof data4 == "object" && !Array.isArray(data4)){
let missing1;
if((((data4.overall === undefined) && (missing1 = "overall")) || ((data4.observedAt === undefined) && (missing1 = "observedAt"))) || ((data4.sourceId === undefined) && (missing1 = "sourceId"))){
validate116.errors = [{instancePath:instancePath+"/currentState",schemaPath:"#/properties/currentState/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
if(data4.overall !== undefined){
const _errs10 = errors;
if(!(typeof data4.overall == "number")){
validate116.errors = [{instancePath:instancePath+"/currentState/overall",schemaPath:"#/properties/currentState/properties/overall/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid2 = _errs10 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data4.energy !== undefined){
const _errs12 = errors;
if(!(typeof data4.energy == "number")){
validate116.errors = [{instancePath:instancePath+"/currentState/energy",schemaPath:"#/properties/currentState/properties/energy/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid2 = _errs12 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data4.focus !== undefined){
const _errs14 = errors;
if(!(typeof data4.focus == "number")){
validate116.errors = [{instancePath:instancePath+"/currentState/focus",schemaPath:"#/properties/currentState/properties/focus/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid2 = _errs14 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data4.mood !== undefined){
const _errs16 = errors;
if(!(typeof data4.mood == "number")){
validate116.errors = [{instancePath:instancePath+"/currentState/mood",schemaPath:"#/properties/currentState/properties/mood/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid2 = _errs16 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data4.physical !== undefined){
const _errs18 = errors;
if(!(typeof data4.physical == "number")){
validate116.errors = [{instancePath:instancePath+"/currentState/physical",schemaPath:"#/properties/currentState/properties/physical/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid2 = _errs18 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data4.stress !== undefined){
const _errs20 = errors;
if(!(typeof data4.stress == "number")){
validate116.errors = [{instancePath:instancePath+"/currentState/stress",schemaPath:"#/properties/currentState/properties/stress/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid2 = _errs20 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data4.observedAt !== undefined){
const _errs22 = errors;
if(typeof data4.observedAt !== "string"){
validate116.errors = [{instancePath:instancePath+"/currentState/observedAt",schemaPath:"#/properties/currentState/properties/observedAt/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid2 = _errs22 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data4.sourceId !== undefined){
const _errs24 = errors;
if(typeof data4.sourceId !== "string"){
validate116.errors = [{instancePath:instancePath+"/currentState/sourceId",schemaPath:"#/properties/currentState/properties/sourceId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid2 = _errs24 === errors;
}
else {
var valid2 = true;
}
}
}
}
}
}
}
}
}
}
else {
validate116.errors = [{instancePath:instancePath+"/currentState",schemaPath:"#/properties/currentState/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs8 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.sleepMinutes !== undefined){
let data13 = data.sleepMinutes;
const _errs26 = errors;
if(errors === _errs26){
if(data13 && typeof data13 == "object" && !Array.isArray(data13)){
let missing2;
if((((data13.value === undefined) && (missing2 = "value")) || ((data13.observedAt === undefined) && (missing2 = "observedAt"))) || ((data13.sourceId === undefined) && (missing2 = "sourceId"))){
validate116.errors = [{instancePath:instancePath+"/sleepMinutes",schemaPath:"#/properties/sleepMinutes/required",keyword:"required",params:{missingProperty: missing2},message:"must have required property '"+missing2+"'"}];
return false;
}
else {
if(data13.value !== undefined){
const _errs28 = errors;
if(!(typeof data13.value == "number")){
validate116.errors = [{instancePath:instancePath+"/sleepMinutes/value",schemaPath:"#/properties/sleepMinutes/properties/value/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid3 = _errs28 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data13.observedAt !== undefined){
const _errs30 = errors;
if(typeof data13.observedAt !== "string"){
validate116.errors = [{instancePath:instancePath+"/sleepMinutes/observedAt",schemaPath:"#/properties/sleepMinutes/properties/observedAt/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid3 = _errs30 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data13.sourceId !== undefined){
const _errs32 = errors;
if(typeof data13.sourceId !== "string"){
validate116.errors = [{instancePath:instancePath+"/sleepMinutes/sourceId",schemaPath:"#/properties/sleepMinutes/properties/sourceId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid3 = _errs32 === errors;
}
else {
var valid3 = true;
}
}
}
}
}
else {
validate116.errors = [{instancePath:instancePath+"/sleepMinutes",schemaPath:"#/properties/sleepMinutes/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs26 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.recentExecution !== undefined){
let data17 = data.recentExecution;
const _errs34 = errors;
if(errors === _errs34){
if(data17 && typeof data17 == "object" && !Array.isArray(data17)){
let missing3;
if((((data17.count === undefined) && (missing3 = "count")) || ((data17.totalMinutes === undefined) && (missing3 = "totalMinutes"))) || ((data17.sourceIds === undefined) && (missing3 = "sourceIds"))){
validate116.errors = [{instancePath:instancePath+"/recentExecution",schemaPath:"#/properties/recentExecution/required",keyword:"required",params:{missingProperty: missing3},message:"must have required property '"+missing3+"'"}];
return false;
}
else {
if(data17.count !== undefined){
const _errs36 = errors;
if(!(typeof data17.count == "number")){
validate116.errors = [{instancePath:instancePath+"/recentExecution/count",schemaPath:"#/properties/recentExecution/properties/count/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid4 = _errs36 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data17.totalMinutes !== undefined){
const _errs38 = errors;
if(!(typeof data17.totalMinutes == "number")){
validate116.errors = [{instancePath:instancePath+"/recentExecution/totalMinutes",schemaPath:"#/properties/recentExecution/properties/totalMinutes/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid4 = _errs38 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data17.averageQuality !== undefined){
const _errs40 = errors;
if(!(typeof data17.averageQuality == "number")){
validate116.errors = [{instancePath:instancePath+"/recentExecution/averageQuality",schemaPath:"#/properties/recentExecution/properties/averageQuality/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid4 = _errs40 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data17.sourceIds !== undefined){
let data21 = data17.sourceIds;
const _errs42 = errors;
if(errors === _errs42){
if(Array.isArray(data21)){
var valid5 = true;
const len1 = data21.length;
for(let i1=0; i1<len1; i1++){
const _errs44 = errors;
if(typeof data21[i1] !== "string"){
validate116.errors = [{instancePath:instancePath+"/recentExecution/sourceIds/" + i1,schemaPath:"#/properties/recentExecution/properties/sourceIds/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid5 = _errs44 === errors;
if(!valid5){
break;
}
}
}
else {
validate116.errors = [{instancePath:instancePath+"/recentExecution/sourceIds",schemaPath:"#/properties/recentExecution/properties/sourceIds/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid4 = _errs42 === errors;
}
else {
var valid4 = true;
}
}
}
}
}
}
else {
validate116.errors = [{instancePath:instancePath+"/recentExecution",schemaPath:"#/properties/recentExecution/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs34 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.schedule !== undefined){
let data23 = data.schedule;
const _errs46 = errors;
if(errors === _errs46){
if(data23 && typeof data23 == "object" && !Array.isArray(data23)){
let missing4;
if(((((((data23.date === undefined) && (missing4 = "date")) || ((data23.blocks === undefined) && (missing4 = "blocks"))) || ((data23.fixedCount === undefined) && (missing4 = "fixedCount"))) || ((data23.flexibleCount === undefined) && (missing4 = "flexibleCount"))) || ((data23.remainingPlannedMinutes === undefined) && (missing4 = "remainingPlannedMinutes"))) || ((data23.openWindows === undefined) && (missing4 = "openWindows"))){
validate116.errors = [{instancePath:instancePath+"/schedule",schemaPath:"#/properties/schedule/required",keyword:"required",params:{missingProperty: missing4},message:"must have required property '"+missing4+"'"}];
return false;
}
else {
if(data23.date !== undefined){
const _errs48 = errors;
if(typeof data23.date !== "string"){
validate116.errors = [{instancePath:instancePath+"/schedule/date",schemaPath:"#/properties/schedule/properties/date/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid6 = _errs48 === errors;
}
else {
var valid6 = true;
}
if(valid6){
if(data23.blocks !== undefined){
let data25 = data23.blocks;
const _errs50 = errors;
if(errors === _errs50){
if(Array.isArray(data25)){
var valid7 = true;
const len2 = data25.length;
for(let i2=0; i2<len2; i2++){
const _errs52 = errors;
if(!(validate119(data25[i2], {instancePath:instancePath+"/schedule/blocks/" + i2,parentData:data25,parentDataProperty:i2,rootData}))){
vErrors = vErrors === null ? validate119.errors : vErrors.concat(validate119.errors);
errors = vErrors.length;
}
var valid7 = _errs52 === errors;
if(!valid7){
break;
}
}
}
else {
validate116.errors = [{instancePath:instancePath+"/schedule/blocks",schemaPath:"#/properties/schedule/properties/blocks/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid6 = _errs50 === errors;
}
else {
var valid6 = true;
}
if(valid6){
if(data23.fixedCount !== undefined){
const _errs53 = errors;
if(!(typeof data23.fixedCount == "number")){
validate116.errors = [{instancePath:instancePath+"/schedule/fixedCount",schemaPath:"#/properties/schedule/properties/fixedCount/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid6 = _errs53 === errors;
}
else {
var valid6 = true;
}
if(valid6){
if(data23.flexibleCount !== undefined){
const _errs55 = errors;
if(!(typeof data23.flexibleCount == "number")){
validate116.errors = [{instancePath:instancePath+"/schedule/flexibleCount",schemaPath:"#/properties/schedule/properties/flexibleCount/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid6 = _errs55 === errors;
}
else {
var valid6 = true;
}
if(valid6){
if(data23.remainingPlannedMinutes !== undefined){
const _errs57 = errors;
if(!(typeof data23.remainingPlannedMinutes == "number")){
validate116.errors = [{instancePath:instancePath+"/schedule/remainingPlannedMinutes",schemaPath:"#/properties/schedule/properties/remainingPlannedMinutes/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid6 = _errs57 === errors;
}
else {
var valid6 = true;
}
if(valid6){
if(data23.openWindows !== undefined){
let data30 = data23.openWindows;
const _errs59 = errors;
if(errors === _errs59){
if(Array.isArray(data30)){
var valid8 = true;
const len3 = data30.length;
for(let i3=0; i3<len3; i3++){
let data31 = data30[i3];
const _errs61 = errors;
if(errors === _errs61){
if(data31 && typeof data31 == "object" && !Array.isArray(data31)){
let missing5;
if((((data31.startTime === undefined) && (missing5 = "startTime")) || ((data31.endTime === undefined) && (missing5 = "endTime"))) || ((data31.minutes === undefined) && (missing5 = "minutes"))){
validate116.errors = [{instancePath:instancePath+"/schedule/openWindows/" + i3,schemaPath:"#/properties/schedule/properties/openWindows/items/required",keyword:"required",params:{missingProperty: missing5},message:"must have required property '"+missing5+"'"}];
return false;
}
else {
if(data31.startTime !== undefined){
const _errs63 = errors;
if(typeof data31.startTime !== "string"){
validate116.errors = [{instancePath:instancePath+"/schedule/openWindows/" + i3+"/startTime",schemaPath:"#/properties/schedule/properties/openWindows/items/properties/startTime/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid9 = _errs63 === errors;
}
else {
var valid9 = true;
}
if(valid9){
if(data31.endTime !== undefined){
const _errs65 = errors;
if(typeof data31.endTime !== "string"){
validate116.errors = [{instancePath:instancePath+"/schedule/openWindows/" + i3+"/endTime",schemaPath:"#/properties/schedule/properties/openWindows/items/properties/endTime/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid9 = _errs65 === errors;
}
else {
var valid9 = true;
}
if(valid9){
if(data31.minutes !== undefined){
const _errs67 = errors;
if(!(typeof data31.minutes == "number")){
validate116.errors = [{instancePath:instancePath+"/schedule/openWindows/" + i3+"/minutes",schemaPath:"#/properties/schedule/properties/openWindows/items/properties/minutes/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid9 = _errs67 === errors;
}
else {
var valid9 = true;
}
}
}
}
}
else {
validate116.errors = [{instancePath:instancePath+"/schedule/openWindows/" + i3,schemaPath:"#/properties/schedule/properties/openWindows/items/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid8 = _errs61 === errors;
if(!valid8){
break;
}
}
}
else {
validate116.errors = [{instancePath:instancePath+"/schedule/openWindows",schemaPath:"#/properties/schedule/properties/openWindows/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid6 = _errs59 === errors;
}
else {
var valid6 = true;
}
}
}
}
}
}
}
}
else {
validate116.errors = [{instancePath:instancePath+"/schedule",schemaPath:"#/properties/schedule/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs46 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.direction !== undefined){
let data35 = data.direction;
const _errs69 = errors;
if(errors === _errs69){
if(data35 && typeof data35 == "object" && !Array.isArray(data35)){
if(data35.goalId !== undefined){
const _errs71 = errors;
if(typeof data35.goalId !== "string"){
validate116.errors = [{instancePath:instancePath+"/direction/goalId",schemaPath:"#/properties/direction/properties/goalId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid10 = _errs71 === errors;
}
else {
var valid10 = true;
}
if(valid10){
if(data35.goalName !== undefined){
const _errs73 = errors;
if(typeof data35.goalName !== "string"){
validate116.errors = [{instancePath:instancePath+"/direction/goalName",schemaPath:"#/properties/direction/properties/goalName/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid10 = _errs73 === errors;
}
else {
var valid10 = true;
}
if(valid10){
if(data35.skillId !== undefined){
const _errs75 = errors;
if(typeof data35.skillId !== "string"){
validate116.errors = [{instancePath:instancePath+"/direction/skillId",schemaPath:"#/properties/direction/properties/skillId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid10 = _errs75 === errors;
}
else {
var valid10 = true;
}
if(valid10){
if(data35.skillName !== undefined){
const _errs77 = errors;
if(typeof data35.skillName !== "string"){
validate116.errors = [{instancePath:instancePath+"/direction/skillName",schemaPath:"#/properties/direction/properties/skillName/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid10 = _errs77 === errors;
}
else {
var valid10 = true;
}
}
}
}
}
else {
validate116.errors = [{instancePath:instancePath+"/direction",schemaPath:"#/properties/direction/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs69 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.sourceRefs !== undefined){
let data40 = data.sourceRefs;
const _errs79 = errors;
if(errors === _errs79){
if(Array.isArray(data40)){
var valid11 = true;
const len4 = data40.length;
for(let i4=0; i4<len4; i4++){
const _errs81 = errors;
if(!(validate122(data40[i4], {instancePath:instancePath+"/sourceRefs/" + i4,parentData:data40,parentDataProperty:i4,rootData}))){
vErrors = vErrors === null ? validate122.errors : vErrors.concat(validate122.errors);
errors = vErrors.length;
}
var valid11 = _errs81 === errors;
if(!valid11){
break;
}
}
}
else {
validate116.errors = [{instancePath:instancePath+"/sourceRefs",schemaPath:"#/properties/sourceRefs/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs79 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.missingness !== undefined){
let data42 = data.missingness;
const _errs82 = errors;
if(errors === _errs82){
if(Array.isArray(data42)){
var valid12 = true;
const len5 = data42.length;
for(let i5=0; i5<len5; i5++){
let data43 = data42[i5];
const _errs84 = errors;
if(errors === _errs84){
if(data43 && typeof data43 == "object" && !Array.isArray(data43)){
let missing6;
if(((data43.code === undefined) && (missing6 = "code")) || ((data43.reason === undefined) && (missing6 = "reason"))){
validate116.errors = [{instancePath:instancePath+"/missingness/" + i5,schemaPath:"#/properties/missingness/items/required",keyword:"required",params:{missingProperty: missing6},message:"must have required property '"+missing6+"'"}];
return false;
}
else {
if(data43.code !== undefined){
const _errs86 = errors;
if(typeof data43.code !== "string"){
validate116.errors = [{instancePath:instancePath+"/missingness/" + i5+"/code",schemaPath:"#/properties/missingness/items/properties/code/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid13 = _errs86 === errors;
}
else {
var valid13 = true;
}
if(valid13){
if(data43.reason !== undefined){
const _errs88 = errors;
if(typeof data43.reason !== "string"){
validate116.errors = [{instancePath:instancePath+"/missingness/" + i5+"/reason",schemaPath:"#/properties/missingness/items/properties/reason/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid13 = _errs88 === errors;
}
else {
var valid13 = true;
}
}
}
}
else {
validate116.errors = [{instancePath:instancePath+"/missingness/" + i5,schemaPath:"#/properties/missingness/items/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid12 = _errs84 === errors;
if(!valid12){
break;
}
}
}
else {
validate116.errors = [{instancePath:instancePath+"/missingness",schemaPath:"#/properties/missingness/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs82 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.limitations !== undefined){
let data46 = data.limitations;
const _errs90 = errors;
if(errors === _errs90){
if(Array.isArray(data46)){
var valid14 = true;
const len6 = data46.length;
for(let i6=0; i6<len6; i6++){
const _errs92 = errors;
if(typeof data46[i6] !== "string"){
validate116.errors = [{instancePath:instancePath+"/limitations/" + i6,schemaPath:"#/properties/limitations/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid14 = _errs92 === errors;
if(!valid14){
break;
}
}
}
else {
validate116.errors = [{instancePath:instancePath+"/limitations",schemaPath:"#/properties/limitations/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs90 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate116.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate116.errors = vErrors;
return errors === 0;
}

const schema55 = {"type":"object","properties":{"id":{"type":"string"},"kind":{"type":"string","enum":["current_state","constraint","symptom_severity","priority","time_available"]},"promptKey":{"type":"string"},"options":{"type":"array","items":{"type":"object","properties":{"value":{"type":"string"},"labelKey":{"type":"string"}},"required":["value","labelKey"]}},"materialReasonKey":{"type":"string"},"answeredValue":{"type":"string"}},"required":["id","kind","promptKey","options","materialReasonKey"]};

function validate126(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((data.id === undefined) && (missing0 = "id")) || ((data.kind === undefined) && (missing0 = "kind"))) || ((data.promptKey === undefined) && (missing0 = "promptKey"))) || ((data.options === undefined) && (missing0 = "options"))) || ((data.materialReasonKey === undefined) && (missing0 = "materialReasonKey"))){
validate126.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.id !== undefined){
const _errs1 = errors;
if(typeof data.id !== "string"){
validate126.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.kind !== undefined){
let data1 = data.kind;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate126.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((((data1 === "current_state") || (data1 === "constraint")) || (data1 === "symptom_severity")) || (data1 === "priority")) || (data1 === "time_available"))){
validate126.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/enum",keyword:"enum",params:{allowedValues: schema55.properties.kind.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.promptKey !== undefined){
const _errs5 = errors;
if(typeof data.promptKey !== "string"){
validate126.errors = [{instancePath:instancePath+"/promptKey",schemaPath:"#/properties/promptKey/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.options !== undefined){
let data3 = data.options;
const _errs7 = errors;
if(errors === _errs7){
if(Array.isArray(data3)){
var valid1 = true;
const len0 = data3.length;
for(let i0=0; i0<len0; i0++){
let data4 = data3[i0];
const _errs9 = errors;
if(errors === _errs9){
if(data4 && typeof data4 == "object" && !Array.isArray(data4)){
let missing1;
if(((data4.value === undefined) && (missing1 = "value")) || ((data4.labelKey === undefined) && (missing1 = "labelKey"))){
validate126.errors = [{instancePath:instancePath+"/options/" + i0,schemaPath:"#/properties/options/items/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
if(data4.value !== undefined){
const _errs11 = errors;
if(typeof data4.value !== "string"){
validate126.errors = [{instancePath:instancePath+"/options/" + i0+"/value",schemaPath:"#/properties/options/items/properties/value/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid2 = _errs11 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data4.labelKey !== undefined){
const _errs13 = errors;
if(typeof data4.labelKey !== "string"){
validate126.errors = [{instancePath:instancePath+"/options/" + i0+"/labelKey",schemaPath:"#/properties/options/items/properties/labelKey/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid2 = _errs13 === errors;
}
else {
var valid2 = true;
}
}
}
}
else {
validate126.errors = [{instancePath:instancePath+"/options/" + i0,schemaPath:"#/properties/options/items/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid1 = _errs9 === errors;
if(!valid1){
break;
}
}
}
else {
validate126.errors = [{instancePath:instancePath+"/options",schemaPath:"#/properties/options/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.materialReasonKey !== undefined){
const _errs15 = errors;
if(typeof data.materialReasonKey !== "string"){
validate126.errors = [{instancePath:instancePath+"/materialReasonKey",schemaPath:"#/properties/materialReasonKey/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs15 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.answeredValue !== undefined){
const _errs17 = errors;
if(typeof data.answeredValue !== "string"){
validate126.errors = [{instancePath:instancePath+"/answeredValue",schemaPath:"#/properties/answeredValue/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs17 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
else {
validate126.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate126.errors = vErrors;
return errors === 0;
}

const schema56 = {"type":"object","properties":{"id":{"type":"string"},"kind":{"type":"string","enum":["continue","shorten","move","protect","recover","low_intensity","switch_task","leave_unplaced","abstain"]},"titleKey":{"type":"string"},"descriptionKey":{"type":"string"},"exactEffectKey":{"type":"string"},"values":{"type":"object","additionalProperties":{"type":["string","number"]}},"protectsKey":{"type":"string"},"feasibilityKey":{"type":"string"},"uncertaintyKey":{"type":"string"},"reversible":{"type":"boolean"},"outcomeHorizon":{"$ref":"#/definitions/DecisionOutcomeHorizon"},"outcomeFields":{"type":"array","items":{"type":"string","enum":["state","task_result","usefulness","fatigue","carryover"]}},"evidenceItemIds":{"type":"array","items":{"type":"string"}},"constraintIds":{"type":"array","items":{"type":"string"}},"planPatch":{"$ref":"#/definitions/DecisionPlanPatchV1"},"policyTrace":{"type":"array","items":{"type":"object","properties":{"criterion":{"type":"string"},"outcome":{"type":"string","enum":["pass","limited","blocked"]},"reason":{"type":"string"}},"required":["criterion","outcome","reason"]}}},"required":["id","kind","titleKey","descriptionKey","exactEffectKey","protectsKey","feasibilityKey","uncertaintyKey","reversible","outcomeHorizon","outcomeFields","evidenceItemIds","constraintIds","planPatch","policyTrace"]};
const schema57 = {"type":"object","properties":{"id":{"type":"string"},"generatedAt":{"type":"string"},"date":{"type":"string"},"operations":{"type":"array","items":{"$ref":"#/definitions/DecisionPlanOperationV1"}},"unplacedBlockIds":{"type":"array","items":{"type":"string"}},"beforeSnapshot":{"type":"array","items":{"$ref":"#/definitions/ScheduleBlock"}},"afterSnapshot":{"type":"array","items":{"$ref":"#/definitions/ScheduleBlock"}},"confirmedAt":{"type":"string"},"appliedAt":{"type":"string"}},"required":["id","generatedAt","date","operations","unplacedBlockIds","beforeSnapshot","afterSnapshot"]};
const schema58 = {"anyOf":[{"type":"object","properties":{"id":{"type":"string"},"type":{"type":"string","const":"update"},"blockId":{"type":"string"},"before":{"$ref":"#/definitions/ScheduleBlock"},"after":{"$ref":"#/definitions/ScheduleBlock"},"reasonKey":{"type":"string"}},"required":["id","type","blockId","before","after","reasonKey"]},{"type":"object","properties":{"id":{"type":"string"},"type":{"type":"string","const":"add"},"blockId":{"type":"string"},"before":{"type":"null"},"after":{"$ref":"#/definitions/ScheduleBlock"},"reasonKey":{"type":"string"}},"required":["id","type","blockId","before","after","reasonKey"]},{"type":"object","properties":{"id":{"type":"string"},"type":{"type":"string","const":"remove"},"blockId":{"type":"string"},"before":{"$ref":"#/definitions/ScheduleBlock"},"after":{"type":"null"},"reasonKey":{"type":"string"}},"required":["id","type","blockId","before","after","reasonKey"]}]};

function validate132(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
const _errs0 = errors;
let valid0 = false;
const _errs1 = errors;
if(errors === _errs1){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((data.id === undefined) && (missing0 = "id")) || ((data.type === undefined) && (missing0 = "type"))) || ((data.blockId === undefined) && (missing0 = "blockId"))) || ((data.before === undefined) && (missing0 = "before"))) || ((data.after === undefined) && (missing0 = "after"))) || ((data.reasonKey === undefined) && (missing0 = "reasonKey"))){
const err0 = {instancePath,schemaPath:"#/anyOf/0/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
else {
if(data.id !== undefined){
const _errs3 = errors;
if(typeof data.id !== "string"){
const err1 = {instancePath:instancePath+"/id",schemaPath:"#/anyOf/0/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
var valid1 = _errs3 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data.type !== undefined){
let data1 = data.type;
const _errs5 = errors;
if(typeof data1 !== "string"){
const err2 = {instancePath:instancePath+"/type",schemaPath:"#/anyOf/0/properties/type/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if("update" !== data1){
const err3 = {instancePath:instancePath+"/type",schemaPath:"#/anyOf/0/properties/type/const",keyword:"const",params:{allowedValue: "update"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
var valid1 = _errs5 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data.blockId !== undefined){
const _errs7 = errors;
if(typeof data.blockId !== "string"){
const err4 = {instancePath:instancePath+"/blockId",schemaPath:"#/anyOf/0/properties/blockId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
var valid1 = _errs7 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data.before !== undefined){
const _errs9 = errors;
if(!(validate119(data.before, {instancePath:instancePath+"/before",parentData:data,parentDataProperty:"before",rootData}))){
vErrors = vErrors === null ? validate119.errors : vErrors.concat(validate119.errors);
errors = vErrors.length;
}
var valid1 = _errs9 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data.after !== undefined){
const _errs10 = errors;
if(!(validate119(data.after, {instancePath:instancePath+"/after",parentData:data,parentDataProperty:"after",rootData}))){
vErrors = vErrors === null ? validate119.errors : vErrors.concat(validate119.errors);
errors = vErrors.length;
}
var valid1 = _errs10 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data.reasonKey !== undefined){
const _errs11 = errors;
if(typeof data.reasonKey !== "string"){
const err5 = {instancePath:instancePath+"/reasonKey",schemaPath:"#/anyOf/0/properties/reasonKey/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
var valid1 = _errs11 === errors;
}
else {
var valid1 = true;
}
}
}
}
}
}
}
}
else {
const err6 = {instancePath,schemaPath:"#/anyOf/0/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
var _valid0 = _errs1 === errors;
valid0 = valid0 || _valid0;
if(!valid0){
const _errs13 = errors;
if(errors === _errs13){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing1;
if(((((((data.id === undefined) && (missing1 = "id")) || ((data.type === undefined) && (missing1 = "type"))) || ((data.blockId === undefined) && (missing1 = "blockId"))) || ((data.before === undefined) && (missing1 = "before"))) || ((data.after === undefined) && (missing1 = "after"))) || ((data.reasonKey === undefined) && (missing1 = "reasonKey"))){
const err7 = {instancePath,schemaPath:"#/anyOf/1/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
else {
if(data.id !== undefined){
const _errs15 = errors;
if(typeof data.id !== "string"){
const err8 = {instancePath:instancePath+"/id",schemaPath:"#/anyOf/1/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
var valid2 = _errs15 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data.type !== undefined){
let data7 = data.type;
const _errs17 = errors;
if(typeof data7 !== "string"){
const err9 = {instancePath:instancePath+"/type",schemaPath:"#/anyOf/1/properties/type/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
if("add" !== data7){
const err10 = {instancePath:instancePath+"/type",schemaPath:"#/anyOf/1/properties/type/const",keyword:"const",params:{allowedValue: "add"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
var valid2 = _errs17 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data.blockId !== undefined){
const _errs19 = errors;
if(typeof data.blockId !== "string"){
const err11 = {instancePath:instancePath+"/blockId",schemaPath:"#/anyOf/1/properties/blockId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
var valid2 = _errs19 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data.before !== undefined){
const _errs21 = errors;
if(data.before !== null){
const err12 = {instancePath:instancePath+"/before",schemaPath:"#/anyOf/1/properties/before/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
var valid2 = _errs21 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data.after !== undefined){
const _errs23 = errors;
if(!(validate119(data.after, {instancePath:instancePath+"/after",parentData:data,parentDataProperty:"after",rootData}))){
vErrors = vErrors === null ? validate119.errors : vErrors.concat(validate119.errors);
errors = vErrors.length;
}
var valid2 = _errs23 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data.reasonKey !== undefined){
const _errs24 = errors;
if(typeof data.reasonKey !== "string"){
const err13 = {instancePath:instancePath+"/reasonKey",schemaPath:"#/anyOf/1/properties/reasonKey/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
var valid2 = _errs24 === errors;
}
else {
var valid2 = true;
}
}
}
}
}
}
}
}
else {
const err14 = {instancePath,schemaPath:"#/anyOf/1/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
}
var _valid0 = _errs13 === errors;
valid0 = valid0 || _valid0;
if(!valid0){
const _errs26 = errors;
if(errors === _errs26){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing2;
if(((((((data.id === undefined) && (missing2 = "id")) || ((data.type === undefined) && (missing2 = "type"))) || ((data.blockId === undefined) && (missing2 = "blockId"))) || ((data.before === undefined) && (missing2 = "before"))) || ((data.after === undefined) && (missing2 = "after"))) || ((data.reasonKey === undefined) && (missing2 = "reasonKey"))){
const err15 = {instancePath,schemaPath:"#/anyOf/2/required",keyword:"required",params:{missingProperty: missing2},message:"must have required property '"+missing2+"'"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
else {
if(data.id !== undefined){
const _errs28 = errors;
if(typeof data.id !== "string"){
const err16 = {instancePath:instancePath+"/id",schemaPath:"#/anyOf/2/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
var valid3 = _errs28 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data.type !== undefined){
let data13 = data.type;
const _errs30 = errors;
if(typeof data13 !== "string"){
const err17 = {instancePath:instancePath+"/type",schemaPath:"#/anyOf/2/properties/type/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
if("remove" !== data13){
const err18 = {instancePath:instancePath+"/type",schemaPath:"#/anyOf/2/properties/type/const",keyword:"const",params:{allowedValue: "remove"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
var valid3 = _errs30 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data.blockId !== undefined){
const _errs32 = errors;
if(typeof data.blockId !== "string"){
const err19 = {instancePath:instancePath+"/blockId",schemaPath:"#/anyOf/2/properties/blockId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
var valid3 = _errs32 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data.before !== undefined){
const _errs34 = errors;
if(!(validate119(data.before, {instancePath:instancePath+"/before",parentData:data,parentDataProperty:"before",rootData}))){
vErrors = vErrors === null ? validate119.errors : vErrors.concat(validate119.errors);
errors = vErrors.length;
}
var valid3 = _errs34 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data.after !== undefined){
const _errs35 = errors;
if(data.after !== null){
const err20 = {instancePath:instancePath+"/after",schemaPath:"#/anyOf/2/properties/after/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
var valid3 = _errs35 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data.reasonKey !== undefined){
const _errs37 = errors;
if(typeof data.reasonKey !== "string"){
const err21 = {instancePath:instancePath+"/reasonKey",schemaPath:"#/anyOf/2/properties/reasonKey/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
var valid3 = _errs37 === errors;
}
else {
var valid3 = true;
}
}
}
}
}
}
}
}
else {
const err22 = {instancePath,schemaPath:"#/anyOf/2/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
}
var _valid0 = _errs26 === errors;
valid0 = valid0 || _valid0;
}
}
if(!valid0){
const err23 = {instancePath,schemaPath:"#/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
validate132.errors = vErrors;
return false;
}
else {
errors = _errs0;
if(vErrors !== null){
if(_errs0){
vErrors.length = _errs0;
}
else {
vErrors = null;
}
}
}
validate132.errors = vErrors;
return errors === 0;
}


function validate131(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((((data.id === undefined) && (missing0 = "id")) || ((data.generatedAt === undefined) && (missing0 = "generatedAt"))) || ((data.date === undefined) && (missing0 = "date"))) || ((data.operations === undefined) && (missing0 = "operations"))) || ((data.unplacedBlockIds === undefined) && (missing0 = "unplacedBlockIds"))) || ((data.beforeSnapshot === undefined) && (missing0 = "beforeSnapshot"))) || ((data.afterSnapshot === undefined) && (missing0 = "afterSnapshot"))){
validate131.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.id !== undefined){
const _errs1 = errors;
if(typeof data.id !== "string"){
validate131.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.generatedAt !== undefined){
const _errs3 = errors;
if(typeof data.generatedAt !== "string"){
validate131.errors = [{instancePath:instancePath+"/generatedAt",schemaPath:"#/properties/generatedAt/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.date !== undefined){
const _errs5 = errors;
if(typeof data.date !== "string"){
validate131.errors = [{instancePath:instancePath+"/date",schemaPath:"#/properties/date/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.operations !== undefined){
let data3 = data.operations;
const _errs7 = errors;
if(errors === _errs7){
if(Array.isArray(data3)){
var valid1 = true;
const len0 = data3.length;
for(let i0=0; i0<len0; i0++){
const _errs9 = errors;
if(!(validate132(data3[i0], {instancePath:instancePath+"/operations/" + i0,parentData:data3,parentDataProperty:i0,rootData}))){
vErrors = vErrors === null ? validate132.errors : vErrors.concat(validate132.errors);
errors = vErrors.length;
}
var valid1 = _errs9 === errors;
if(!valid1){
break;
}
}
}
else {
validate131.errors = [{instancePath:instancePath+"/operations",schemaPath:"#/properties/operations/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.unplacedBlockIds !== undefined){
let data5 = data.unplacedBlockIds;
const _errs10 = errors;
if(errors === _errs10){
if(Array.isArray(data5)){
var valid2 = true;
const len1 = data5.length;
for(let i1=0; i1<len1; i1++){
const _errs12 = errors;
if(typeof data5[i1] !== "string"){
validate131.errors = [{instancePath:instancePath+"/unplacedBlockIds/" + i1,schemaPath:"#/properties/unplacedBlockIds/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid2 = _errs12 === errors;
if(!valid2){
break;
}
}
}
else {
validate131.errors = [{instancePath:instancePath+"/unplacedBlockIds",schemaPath:"#/properties/unplacedBlockIds/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.beforeSnapshot !== undefined){
let data7 = data.beforeSnapshot;
const _errs14 = errors;
if(errors === _errs14){
if(Array.isArray(data7)){
var valid3 = true;
const len2 = data7.length;
for(let i2=0; i2<len2; i2++){
const _errs16 = errors;
if(!(validate119(data7[i2], {instancePath:instancePath+"/beforeSnapshot/" + i2,parentData:data7,parentDataProperty:i2,rootData}))){
vErrors = vErrors === null ? validate119.errors : vErrors.concat(validate119.errors);
errors = vErrors.length;
}
var valid3 = _errs16 === errors;
if(!valid3){
break;
}
}
}
else {
validate131.errors = [{instancePath:instancePath+"/beforeSnapshot",schemaPath:"#/properties/beforeSnapshot/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs14 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.afterSnapshot !== undefined){
let data9 = data.afterSnapshot;
const _errs17 = errors;
if(errors === _errs17){
if(Array.isArray(data9)){
var valid4 = true;
const len3 = data9.length;
for(let i3=0; i3<len3; i3++){
const _errs19 = errors;
if(!(validate119(data9[i3], {instancePath:instancePath+"/afterSnapshot/" + i3,parentData:data9,parentDataProperty:i3,rootData}))){
vErrors = vErrors === null ? validate119.errors : vErrors.concat(validate119.errors);
errors = vErrors.length;
}
var valid4 = _errs19 === errors;
if(!valid4){
break;
}
}
}
else {
validate131.errors = [{instancePath:instancePath+"/afterSnapshot",schemaPath:"#/properties/afterSnapshot/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs17 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.confirmedAt !== undefined){
const _errs20 = errors;
if(typeof data.confirmedAt !== "string"){
validate131.errors = [{instancePath:instancePath+"/confirmedAt",schemaPath:"#/properties/confirmedAt/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs20 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.appliedAt !== undefined){
const _errs22 = errors;
if(typeof data.appliedAt !== "string"){
validate131.errors = [{instancePath:instancePath+"/appliedAt",schemaPath:"#/properties/appliedAt/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs22 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
else {
validate131.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate131.errors = vErrors;
return errors === 0;
}


function validate129(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((((((((((((data.id === undefined) && (missing0 = "id")) || ((data.kind === undefined) && (missing0 = "kind"))) || ((data.titleKey === undefined) && (missing0 = "titleKey"))) || ((data.descriptionKey === undefined) && (missing0 = "descriptionKey"))) || ((data.exactEffectKey === undefined) && (missing0 = "exactEffectKey"))) || ((data.protectsKey === undefined) && (missing0 = "protectsKey"))) || ((data.feasibilityKey === undefined) && (missing0 = "feasibilityKey"))) || ((data.uncertaintyKey === undefined) && (missing0 = "uncertaintyKey"))) || ((data.reversible === undefined) && (missing0 = "reversible"))) || ((data.outcomeHorizon === undefined) && (missing0 = "outcomeHorizon"))) || ((data.outcomeFields === undefined) && (missing0 = "outcomeFields"))) || ((data.evidenceItemIds === undefined) && (missing0 = "evidenceItemIds"))) || ((data.constraintIds === undefined) && (missing0 = "constraintIds"))) || ((data.planPatch === undefined) && (missing0 = "planPatch"))) || ((data.policyTrace === undefined) && (missing0 = "policyTrace"))){
validate129.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.id !== undefined){
const _errs1 = errors;
if(typeof data.id !== "string"){
validate129.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.kind !== undefined){
let data1 = data.kind;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate129.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((((((((data1 === "continue") || (data1 === "shorten")) || (data1 === "move")) || (data1 === "protect")) || (data1 === "recover")) || (data1 === "low_intensity")) || (data1 === "switch_task")) || (data1 === "leave_unplaced")) || (data1 === "abstain"))){
validate129.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/enum",keyword:"enum",params:{allowedValues: schema56.properties.kind.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.titleKey !== undefined){
const _errs5 = errors;
if(typeof data.titleKey !== "string"){
validate129.errors = [{instancePath:instancePath+"/titleKey",schemaPath:"#/properties/titleKey/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.descriptionKey !== undefined){
const _errs7 = errors;
if(typeof data.descriptionKey !== "string"){
validate129.errors = [{instancePath:instancePath+"/descriptionKey",schemaPath:"#/properties/descriptionKey/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.exactEffectKey !== undefined){
const _errs9 = errors;
if(typeof data.exactEffectKey !== "string"){
validate129.errors = [{instancePath:instancePath+"/exactEffectKey",schemaPath:"#/properties/exactEffectKey/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.values !== undefined){
let data5 = data.values;
const _errs11 = errors;
if(errors === _errs11){
if(data5 && typeof data5 == "object" && !Array.isArray(data5)){
for(const key0 in data5){
let data6 = data5[key0];
const _errs14 = errors;
if((typeof data6 !== "string") && (!(typeof data6 == "number"))){
validate129.errors = [{instancePath:instancePath+"/values/" + key0.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/values/additionalProperties/type",keyword:"type",params:{type: schema56.properties.values.additionalProperties.type},message:"must be string,number"}];
return false;
}
var valid1 = _errs14 === errors;
if(!valid1){
break;
}
}
}
else {
validate129.errors = [{instancePath:instancePath+"/values",schemaPath:"#/properties/values/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protectsKey !== undefined){
const _errs16 = errors;
if(typeof data.protectsKey !== "string"){
validate129.errors = [{instancePath:instancePath+"/protectsKey",schemaPath:"#/properties/protectsKey/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs16 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.feasibilityKey !== undefined){
const _errs18 = errors;
if(typeof data.feasibilityKey !== "string"){
validate129.errors = [{instancePath:instancePath+"/feasibilityKey",schemaPath:"#/properties/feasibilityKey/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs18 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.uncertaintyKey !== undefined){
const _errs20 = errors;
if(typeof data.uncertaintyKey !== "string"){
validate129.errors = [{instancePath:instancePath+"/uncertaintyKey",schemaPath:"#/properties/uncertaintyKey/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs20 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.reversible !== undefined){
const _errs22 = errors;
if(typeof data.reversible !== "boolean"){
validate129.errors = [{instancePath:instancePath+"/reversible",schemaPath:"#/properties/reversible/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs22 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.outcomeHorizon !== undefined){
const _errs24 = errors;
if(!(validate112(data.outcomeHorizon, {instancePath:instancePath+"/outcomeHorizon",parentData:data,parentDataProperty:"outcomeHorizon",rootData}))){
vErrors = vErrors === null ? validate112.errors : vErrors.concat(validate112.errors);
errors = vErrors.length;
}
var valid0 = _errs24 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.outcomeFields !== undefined){
let data12 = data.outcomeFields;
const _errs25 = errors;
if(errors === _errs25){
if(Array.isArray(data12)){
var valid2 = true;
const len0 = data12.length;
for(let i0=0; i0<len0; i0++){
let data13 = data12[i0];
const _errs27 = errors;
if(typeof data13 !== "string"){
validate129.errors = [{instancePath:instancePath+"/outcomeFields/" + i0,schemaPath:"#/properties/outcomeFields/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((((data13 === "state") || (data13 === "task_result")) || (data13 === "usefulness")) || (data13 === "fatigue")) || (data13 === "carryover"))){
validate129.errors = [{instancePath:instancePath+"/outcomeFields/" + i0,schemaPath:"#/properties/outcomeFields/items/enum",keyword:"enum",params:{allowedValues: schema56.properties.outcomeFields.items.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid2 = _errs27 === errors;
if(!valid2){
break;
}
}
}
else {
validate129.errors = [{instancePath:instancePath+"/outcomeFields",schemaPath:"#/properties/outcomeFields/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs25 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.evidenceItemIds !== undefined){
let data14 = data.evidenceItemIds;
const _errs29 = errors;
if(errors === _errs29){
if(Array.isArray(data14)){
var valid3 = true;
const len1 = data14.length;
for(let i1=0; i1<len1; i1++){
const _errs31 = errors;
if(typeof data14[i1] !== "string"){
validate129.errors = [{instancePath:instancePath+"/evidenceItemIds/" + i1,schemaPath:"#/properties/evidenceItemIds/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid3 = _errs31 === errors;
if(!valid3){
break;
}
}
}
else {
validate129.errors = [{instancePath:instancePath+"/evidenceItemIds",schemaPath:"#/properties/evidenceItemIds/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs29 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.constraintIds !== undefined){
let data16 = data.constraintIds;
const _errs33 = errors;
if(errors === _errs33){
if(Array.isArray(data16)){
var valid4 = true;
const len2 = data16.length;
for(let i2=0; i2<len2; i2++){
const _errs35 = errors;
if(typeof data16[i2] !== "string"){
validate129.errors = [{instancePath:instancePath+"/constraintIds/" + i2,schemaPath:"#/properties/constraintIds/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid4 = _errs35 === errors;
if(!valid4){
break;
}
}
}
else {
validate129.errors = [{instancePath:instancePath+"/constraintIds",schemaPath:"#/properties/constraintIds/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs33 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.planPatch !== undefined){
const _errs37 = errors;
if(!(validate131(data.planPatch, {instancePath:instancePath+"/planPatch",parentData:data,parentDataProperty:"planPatch",rootData}))){
vErrors = vErrors === null ? validate131.errors : vErrors.concat(validate131.errors);
errors = vErrors.length;
}
var valid0 = _errs37 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.policyTrace !== undefined){
let data19 = data.policyTrace;
const _errs38 = errors;
if(errors === _errs38){
if(Array.isArray(data19)){
var valid5 = true;
const len3 = data19.length;
for(let i3=0; i3<len3; i3++){
let data20 = data19[i3];
const _errs40 = errors;
if(errors === _errs40){
if(data20 && typeof data20 == "object" && !Array.isArray(data20)){
let missing1;
if((((data20.criterion === undefined) && (missing1 = "criterion")) || ((data20.outcome === undefined) && (missing1 = "outcome"))) || ((data20.reason === undefined) && (missing1 = "reason"))){
validate129.errors = [{instancePath:instancePath+"/policyTrace/" + i3,schemaPath:"#/properties/policyTrace/items/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
if(data20.criterion !== undefined){
const _errs42 = errors;
if(typeof data20.criterion !== "string"){
validate129.errors = [{instancePath:instancePath+"/policyTrace/" + i3+"/criterion",schemaPath:"#/properties/policyTrace/items/properties/criterion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid6 = _errs42 === errors;
}
else {
var valid6 = true;
}
if(valid6){
if(data20.outcome !== undefined){
let data22 = data20.outcome;
const _errs44 = errors;
if(typeof data22 !== "string"){
validate129.errors = [{instancePath:instancePath+"/policyTrace/" + i3+"/outcome",schemaPath:"#/properties/policyTrace/items/properties/outcome/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((data22 === "pass") || (data22 === "limited")) || (data22 === "blocked"))){
validate129.errors = [{instancePath:instancePath+"/policyTrace/" + i3+"/outcome",schemaPath:"#/properties/policyTrace/items/properties/outcome/enum",keyword:"enum",params:{allowedValues: schema56.properties.policyTrace.items.properties.outcome.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid6 = _errs44 === errors;
}
else {
var valid6 = true;
}
if(valid6){
if(data20.reason !== undefined){
const _errs46 = errors;
if(typeof data20.reason !== "string"){
validate129.errors = [{instancePath:instancePath+"/policyTrace/" + i3+"/reason",schemaPath:"#/properties/policyTrace/items/properties/reason/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid6 = _errs46 === errors;
}
else {
var valid6 = true;
}
}
}
}
}
else {
validate129.errors = [{instancePath:instancePath+"/policyTrace/" + i3,schemaPath:"#/properties/policyTrace/items/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid5 = _errs40 === errors;
if(!valid5){
break;
}
}
}
else {
validate129.errors = [{instancePath:instancePath+"/policyTrace",schemaPath:"#/properties/policyTrace/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs38 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate129.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate129.errors = vErrors;
return errors === 0;
}

const schema59 = {"type":"object","properties":{"contractVersion":{"type":"string","const":"questlife.decision.evidence.v1"},"target":{"type":"string"},"asOf":{"type":"string"},"eligibility":{"type":"string","enum":["eligible","limited","abstained"]},"availableLevels":{"type":"array","items":{"type":"string","enum":["A","B","C","D","E"]}},"highestEvidenceLevel":{"type":"string","enum":["A","B","C","D","E"]},"fact":{"type":"object","properties":{"value":{"type":"number"},"unit":{"type":"string"},"observedAt":{"type":"string"},"sourceId":{"type":"string"}},"required":["value","unit","observedAt","sourceId"]},"personalReference":{"type":"object","properties":{"value":{"type":"number"},"low":{"type":"number"},"high":{"type":"number"},"unit":{"type":"string"},"observationCount":{"type":"number"},"independentPeriodCount":{"type":"number"},"sourceIds":{"type":"array","items":{"type":"string"}}},"required":["unit","observationCount","independentPeriodCount","sourceIds"]},"currentDeviation":{"type":"number"},"trend":{"type":"object","properties":{"direction":{"type":"string","enum":["higher","lower","flat","unavailable"]},"absolute":{"type":"number"},"sourceIds":{"type":"array","items":{"type":"string"}}},"required":["direction","sourceIds"]},"ewma":{"type":"object","properties":{"short":{"type":"number"},"long":{"type":"number"},"observedAt":{"type":"string"},"sourceIds":{"type":"array","items":{"type":"string"}},"limitationCodes":{"type":"array","items":{"type":"string"}}},"required":["sourceIds","limitationCodes"]},"jointModel":{"type":"object","properties":{"observedDeviation":{"type":"number"},"modelAssociated":{"type":"number"},"unexplainedResidual":{"type":"number"},"completeObservationCount":{"type":"number"},"drivers":{"type":"array","items":{"type":"object","properties":{"id":{"type":"string"},"label":{"type":"string"},"contribution":{"type":"number"},"lagPeriods":{"type":"number"},"supportCount":{"type":"number"},"counterexampleCount":{"type":"number"},"stability":{"type":"string"},"limitationCodes":{"type":"array","items":{"type":"string"}}},"required":["id","label","contribution","lagPeriods","supportCount","counterexampleCount","stability","limitationCodes"]}},"limitationCodes":{"type":"array","items":{"type":"string"}}},"required":["observedDeviation","modelAssociated","unexplainedResidual","completeObservationCount","drivers","limitationCodes"]},"similarPeriods":{"type":"array","items":{"type":"object","properties":{"id":{"type":"string"},"startAt":{"type":"string"},"endAt":{"type":"string"},"distance":{"type":"number"},"matchingFeatures":{"type":"array","items":{"type":"string"}},"differentFeatures":{"type":"array","items":{"type":"string"}},"supportCount":{"type":"number"},"counterexampleCount":{"type":"number"}},"required":["id","startAt","endAt","distance","matchingFeatures","differentFeatures","supportCount","counterexampleCount"]}},"recovery":{"type":"object","properties":{"semantics":{"type":"string","enum":["historical_analogue","validated_forecast"]},"episodeCount":{"type":"number"},"path":{"type":"array","items":{"type":"object","properties":{"offsetDays":{"type":"number"},"medianDeviation":{"type":"number"},"lowDeviation":{"type":"number"},"highDeviation":{"type":"number"}},"required":["offsetDays","medianDeviation","lowDeviation","highDeviation"]}},"forecastAllowed":{"type":"boolean"},"limitationCodes":{"type":"array","items":{"type":"string"}}},"required":["semantics","episodeCount","path","forecastAllowed","limitationCodes"]},"scenarioBranches":{"type":"array","items":{"type":"object","properties":{"id":{"type":"string"},"action":{"type":"string"},"comparablePeriodCount":{"type":"number"},"observedOutcomeChange":{"type":"number"},"supportCount":{"type":"number"},"counterexampleCount":{"type":"number"},"missingOutcomeCount":{"type":"number"},"limitationCodes":{"type":"array","items":{"type":"string"}}},"required":["id","action","comparablePeriodCount","supportCount","counterexampleCount","missingOutcomeCount","limitationCodes"]}},"items":{"type":"array","items":{"$ref":"#/definitions/DecisionEvidenceItemV1"}},"missingness":{"type":"array","items":{"type":"string"}},"limitations":{"type":"array","items":{"type":"string"}},"sourceArtifactIds":{"type":"array","items":{"type":"string"}}},"required":["contractVersion","target","asOf","eligibility","availableLevels","similarPeriods","scenarioBranches","items","missingness","limitations","sourceArtifactIds"]};
const schema60 = {"type":"object","properties":{"id":{"type":"string"},"category":{"type":"string","enum":["fact","personal_comparison","observational_signal","joint_evidence","historical_analogue","historical_decision","unknown","limitation"]},"evidenceLevel":{"type":"string","enum":["A","B","C","D","E"]},"labelKey":{"type":"string"},"values":{"type":"object","additionalProperties":{"type":["string","number"]}},"sourceIds":{"type":"array","items":{"type":"string"}},"supportCount":{"type":"number"},"counterexampleCount":{"type":"number"},"limitationCodes":{"type":"array","items":{"type":"string"}}},"required":["id","category","labelKey","sourceIds"]};

function validate143(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((data.id === undefined) && (missing0 = "id")) || ((data.category === undefined) && (missing0 = "category"))) || ((data.labelKey === undefined) && (missing0 = "labelKey"))) || ((data.sourceIds === undefined) && (missing0 = "sourceIds"))){
validate143.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.id !== undefined){
const _errs1 = errors;
if(typeof data.id !== "string"){
validate143.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.category !== undefined){
let data1 = data.category;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate143.errors = [{instancePath:instancePath+"/category",schemaPath:"#/properties/category/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((((((((data1 === "fact") || (data1 === "personal_comparison")) || (data1 === "observational_signal")) || (data1 === "joint_evidence")) || (data1 === "historical_analogue")) || (data1 === "historical_decision")) || (data1 === "unknown")) || (data1 === "limitation"))){
validate143.errors = [{instancePath:instancePath+"/category",schemaPath:"#/properties/category/enum",keyword:"enum",params:{allowedValues: schema60.properties.category.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.evidenceLevel !== undefined){
let data2 = data.evidenceLevel;
const _errs5 = errors;
if(typeof data2 !== "string"){
validate143.errors = [{instancePath:instancePath+"/evidenceLevel",schemaPath:"#/properties/evidenceLevel/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((((data2 === "A") || (data2 === "B")) || (data2 === "C")) || (data2 === "D")) || (data2 === "E"))){
validate143.errors = [{instancePath:instancePath+"/evidenceLevel",schemaPath:"#/properties/evidenceLevel/enum",keyword:"enum",params:{allowedValues: schema60.properties.evidenceLevel.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.labelKey !== undefined){
const _errs7 = errors;
if(typeof data.labelKey !== "string"){
validate143.errors = [{instancePath:instancePath+"/labelKey",schemaPath:"#/properties/labelKey/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.values !== undefined){
let data4 = data.values;
const _errs9 = errors;
if(errors === _errs9){
if(data4 && typeof data4 == "object" && !Array.isArray(data4)){
for(const key0 in data4){
let data5 = data4[key0];
const _errs12 = errors;
if((typeof data5 !== "string") && (!(typeof data5 == "number"))){
validate143.errors = [{instancePath:instancePath+"/values/" + key0.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/values/additionalProperties/type",keyword:"type",params:{type: schema60.properties.values.additionalProperties.type},message:"must be string,number"}];
return false;
}
var valid1 = _errs12 === errors;
if(!valid1){
break;
}
}
}
else {
validate143.errors = [{instancePath:instancePath+"/values",schemaPath:"#/properties/values/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.sourceIds !== undefined){
let data6 = data.sourceIds;
const _errs14 = errors;
if(errors === _errs14){
if(Array.isArray(data6)){
var valid2 = true;
const len0 = data6.length;
for(let i0=0; i0<len0; i0++){
const _errs16 = errors;
if(typeof data6[i0] !== "string"){
validate143.errors = [{instancePath:instancePath+"/sourceIds/" + i0,schemaPath:"#/properties/sourceIds/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid2 = _errs16 === errors;
if(!valid2){
break;
}
}
}
else {
validate143.errors = [{instancePath:instancePath+"/sourceIds",schemaPath:"#/properties/sourceIds/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs14 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.supportCount !== undefined){
const _errs18 = errors;
if(!(typeof data.supportCount == "number")){
validate143.errors = [{instancePath:instancePath+"/supportCount",schemaPath:"#/properties/supportCount/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs18 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.counterexampleCount !== undefined){
const _errs20 = errors;
if(!(typeof data.counterexampleCount == "number")){
validate143.errors = [{instancePath:instancePath+"/counterexampleCount",schemaPath:"#/properties/counterexampleCount/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs20 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.limitationCodes !== undefined){
let data10 = data.limitationCodes;
const _errs22 = errors;
if(errors === _errs22){
if(Array.isArray(data10)){
var valid3 = true;
const len1 = data10.length;
for(let i1=0; i1<len1; i1++){
const _errs24 = errors;
if(typeof data10[i1] !== "string"){
validate143.errors = [{instancePath:instancePath+"/limitationCodes/" + i1,schemaPath:"#/properties/limitationCodes/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid3 = _errs24 === errors;
if(!valid3){
break;
}
}
}
else {
validate143.errors = [{instancePath:instancePath+"/limitationCodes",schemaPath:"#/properties/limitationCodes/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs22 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
else {
validate143.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate143.errors = vErrors;
return errors === 0;
}


function validate142(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((((((((data.contractVersion === undefined) && (missing0 = "contractVersion")) || ((data.target === undefined) && (missing0 = "target"))) || ((data.asOf === undefined) && (missing0 = "asOf"))) || ((data.eligibility === undefined) && (missing0 = "eligibility"))) || ((data.availableLevels === undefined) && (missing0 = "availableLevels"))) || ((data.similarPeriods === undefined) && (missing0 = "similarPeriods"))) || ((data.scenarioBranches === undefined) && (missing0 = "scenarioBranches"))) || ((data.items === undefined) && (missing0 = "items"))) || ((data.missingness === undefined) && (missing0 = "missingness"))) || ((data.limitations === undefined) && (missing0 = "limitations"))) || ((data.sourceArtifactIds === undefined) && (missing0 = "sourceArtifactIds"))){
validate142.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.contractVersion !== undefined){
let data0 = data.contractVersion;
const _errs1 = errors;
if(typeof data0 !== "string"){
validate142.errors = [{instancePath:instancePath+"/contractVersion",schemaPath:"#/properties/contractVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("questlife.decision.evidence.v1" !== data0){
validate142.errors = [{instancePath:instancePath+"/contractVersion",schemaPath:"#/properties/contractVersion/const",keyword:"const",params:{allowedValue: "questlife.decision.evidence.v1"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.target !== undefined){
const _errs3 = errors;
if(typeof data.target !== "string"){
validate142.errors = [{instancePath:instancePath+"/target",schemaPath:"#/properties/target/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.asOf !== undefined){
const _errs5 = errors;
if(typeof data.asOf !== "string"){
validate142.errors = [{instancePath:instancePath+"/asOf",schemaPath:"#/properties/asOf/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.eligibility !== undefined){
let data3 = data.eligibility;
const _errs7 = errors;
if(typeof data3 !== "string"){
validate142.errors = [{instancePath:instancePath+"/eligibility",schemaPath:"#/properties/eligibility/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((data3 === "eligible") || (data3 === "limited")) || (data3 === "abstained"))){
validate142.errors = [{instancePath:instancePath+"/eligibility",schemaPath:"#/properties/eligibility/enum",keyword:"enum",params:{allowedValues: schema59.properties.eligibility.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.availableLevels !== undefined){
let data4 = data.availableLevels;
const _errs9 = errors;
if(errors === _errs9){
if(Array.isArray(data4)){
var valid1 = true;
const len0 = data4.length;
for(let i0=0; i0<len0; i0++){
let data5 = data4[i0];
const _errs11 = errors;
if(typeof data5 !== "string"){
validate142.errors = [{instancePath:instancePath+"/availableLevels/" + i0,schemaPath:"#/properties/availableLevels/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((((data5 === "A") || (data5 === "B")) || (data5 === "C")) || (data5 === "D")) || (data5 === "E"))){
validate142.errors = [{instancePath:instancePath+"/availableLevels/" + i0,schemaPath:"#/properties/availableLevels/items/enum",keyword:"enum",params:{allowedValues: schema59.properties.availableLevels.items.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid1 = _errs11 === errors;
if(!valid1){
break;
}
}
}
else {
validate142.errors = [{instancePath:instancePath+"/availableLevels",schemaPath:"#/properties/availableLevels/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.highestEvidenceLevel !== undefined){
let data6 = data.highestEvidenceLevel;
const _errs13 = errors;
if(typeof data6 !== "string"){
validate142.errors = [{instancePath:instancePath+"/highestEvidenceLevel",schemaPath:"#/properties/highestEvidenceLevel/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((((data6 === "A") || (data6 === "B")) || (data6 === "C")) || (data6 === "D")) || (data6 === "E"))){
validate142.errors = [{instancePath:instancePath+"/highestEvidenceLevel",schemaPath:"#/properties/highestEvidenceLevel/enum",keyword:"enum",params:{allowedValues: schema59.properties.highestEvidenceLevel.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.fact !== undefined){
let data7 = data.fact;
const _errs15 = errors;
if(errors === _errs15){
if(data7 && typeof data7 == "object" && !Array.isArray(data7)){
let missing1;
if(((((data7.value === undefined) && (missing1 = "value")) || ((data7.unit === undefined) && (missing1 = "unit"))) || ((data7.observedAt === undefined) && (missing1 = "observedAt"))) || ((data7.sourceId === undefined) && (missing1 = "sourceId"))){
validate142.errors = [{instancePath:instancePath+"/fact",schemaPath:"#/properties/fact/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
if(data7.value !== undefined){
const _errs17 = errors;
if(!(typeof data7.value == "number")){
validate142.errors = [{instancePath:instancePath+"/fact/value",schemaPath:"#/properties/fact/properties/value/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid2 = _errs17 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data7.unit !== undefined){
const _errs19 = errors;
if(typeof data7.unit !== "string"){
validate142.errors = [{instancePath:instancePath+"/fact/unit",schemaPath:"#/properties/fact/properties/unit/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid2 = _errs19 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data7.observedAt !== undefined){
const _errs21 = errors;
if(typeof data7.observedAt !== "string"){
validate142.errors = [{instancePath:instancePath+"/fact/observedAt",schemaPath:"#/properties/fact/properties/observedAt/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid2 = _errs21 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data7.sourceId !== undefined){
const _errs23 = errors;
if(typeof data7.sourceId !== "string"){
validate142.errors = [{instancePath:instancePath+"/fact/sourceId",schemaPath:"#/properties/fact/properties/sourceId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid2 = _errs23 === errors;
}
else {
var valid2 = true;
}
}
}
}
}
}
else {
validate142.errors = [{instancePath:instancePath+"/fact",schemaPath:"#/properties/fact/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs15 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.personalReference !== undefined){
let data12 = data.personalReference;
const _errs25 = errors;
if(errors === _errs25){
if(data12 && typeof data12 == "object" && !Array.isArray(data12)){
let missing2;
if(((((data12.unit === undefined) && (missing2 = "unit")) || ((data12.observationCount === undefined) && (missing2 = "observationCount"))) || ((data12.independentPeriodCount === undefined) && (missing2 = "independentPeriodCount"))) || ((data12.sourceIds === undefined) && (missing2 = "sourceIds"))){
validate142.errors = [{instancePath:instancePath+"/personalReference",schemaPath:"#/properties/personalReference/required",keyword:"required",params:{missingProperty: missing2},message:"must have required property '"+missing2+"'"}];
return false;
}
else {
if(data12.value !== undefined){
const _errs27 = errors;
if(!(typeof data12.value == "number")){
validate142.errors = [{instancePath:instancePath+"/personalReference/value",schemaPath:"#/properties/personalReference/properties/value/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid3 = _errs27 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data12.low !== undefined){
const _errs29 = errors;
if(!(typeof data12.low == "number")){
validate142.errors = [{instancePath:instancePath+"/personalReference/low",schemaPath:"#/properties/personalReference/properties/low/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid3 = _errs29 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data12.high !== undefined){
const _errs31 = errors;
if(!(typeof data12.high == "number")){
validate142.errors = [{instancePath:instancePath+"/personalReference/high",schemaPath:"#/properties/personalReference/properties/high/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid3 = _errs31 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data12.unit !== undefined){
const _errs33 = errors;
if(typeof data12.unit !== "string"){
validate142.errors = [{instancePath:instancePath+"/personalReference/unit",schemaPath:"#/properties/personalReference/properties/unit/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid3 = _errs33 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data12.observationCount !== undefined){
const _errs35 = errors;
if(!(typeof data12.observationCount == "number")){
validate142.errors = [{instancePath:instancePath+"/personalReference/observationCount",schemaPath:"#/properties/personalReference/properties/observationCount/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid3 = _errs35 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data12.independentPeriodCount !== undefined){
const _errs37 = errors;
if(!(typeof data12.independentPeriodCount == "number")){
validate142.errors = [{instancePath:instancePath+"/personalReference/independentPeriodCount",schemaPath:"#/properties/personalReference/properties/independentPeriodCount/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid3 = _errs37 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data12.sourceIds !== undefined){
let data19 = data12.sourceIds;
const _errs39 = errors;
if(errors === _errs39){
if(Array.isArray(data19)){
var valid4 = true;
const len1 = data19.length;
for(let i1=0; i1<len1; i1++){
const _errs41 = errors;
if(typeof data19[i1] !== "string"){
validate142.errors = [{instancePath:instancePath+"/personalReference/sourceIds/" + i1,schemaPath:"#/properties/personalReference/properties/sourceIds/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid4 = _errs41 === errors;
if(!valid4){
break;
}
}
}
else {
validate142.errors = [{instancePath:instancePath+"/personalReference/sourceIds",schemaPath:"#/properties/personalReference/properties/sourceIds/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid3 = _errs39 === errors;
}
else {
var valid3 = true;
}
}
}
}
}
}
}
}
}
else {
validate142.errors = [{instancePath:instancePath+"/personalReference",schemaPath:"#/properties/personalReference/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs25 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.currentDeviation !== undefined){
const _errs43 = errors;
if(!(typeof data.currentDeviation == "number")){
validate142.errors = [{instancePath:instancePath+"/currentDeviation",schemaPath:"#/properties/currentDeviation/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs43 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.trend !== undefined){
let data22 = data.trend;
const _errs45 = errors;
if(errors === _errs45){
if(data22 && typeof data22 == "object" && !Array.isArray(data22)){
let missing3;
if(((data22.direction === undefined) && (missing3 = "direction")) || ((data22.sourceIds === undefined) && (missing3 = "sourceIds"))){
validate142.errors = [{instancePath:instancePath+"/trend",schemaPath:"#/properties/trend/required",keyword:"required",params:{missingProperty: missing3},message:"must have required property '"+missing3+"'"}];
return false;
}
else {
if(data22.direction !== undefined){
let data23 = data22.direction;
const _errs47 = errors;
if(typeof data23 !== "string"){
validate142.errors = [{instancePath:instancePath+"/trend/direction",schemaPath:"#/properties/trend/properties/direction/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((((data23 === "higher") || (data23 === "lower")) || (data23 === "flat")) || (data23 === "unavailable"))){
validate142.errors = [{instancePath:instancePath+"/trend/direction",schemaPath:"#/properties/trend/properties/direction/enum",keyword:"enum",params:{allowedValues: schema59.properties.trend.properties.direction.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid5 = _errs47 === errors;
}
else {
var valid5 = true;
}
if(valid5){
if(data22.absolute !== undefined){
const _errs49 = errors;
if(!(typeof data22.absolute == "number")){
validate142.errors = [{instancePath:instancePath+"/trend/absolute",schemaPath:"#/properties/trend/properties/absolute/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid5 = _errs49 === errors;
}
else {
var valid5 = true;
}
if(valid5){
if(data22.sourceIds !== undefined){
let data25 = data22.sourceIds;
const _errs51 = errors;
if(errors === _errs51){
if(Array.isArray(data25)){
var valid6 = true;
const len2 = data25.length;
for(let i2=0; i2<len2; i2++){
const _errs53 = errors;
if(typeof data25[i2] !== "string"){
validate142.errors = [{instancePath:instancePath+"/trend/sourceIds/" + i2,schemaPath:"#/properties/trend/properties/sourceIds/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid6 = _errs53 === errors;
if(!valid6){
break;
}
}
}
else {
validate142.errors = [{instancePath:instancePath+"/trend/sourceIds",schemaPath:"#/properties/trend/properties/sourceIds/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid5 = _errs51 === errors;
}
else {
var valid5 = true;
}
}
}
}
}
else {
validate142.errors = [{instancePath:instancePath+"/trend",schemaPath:"#/properties/trend/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs45 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.ewma !== undefined){
let data27 = data.ewma;
const _errs55 = errors;
if(errors === _errs55){
if(data27 && typeof data27 == "object" && !Array.isArray(data27)){
let missing4;
if(((data27.sourceIds === undefined) && (missing4 = "sourceIds")) || ((data27.limitationCodes === undefined) && (missing4 = "limitationCodes"))){
validate142.errors = [{instancePath:instancePath+"/ewma",schemaPath:"#/properties/ewma/required",keyword:"required",params:{missingProperty: missing4},message:"must have required property '"+missing4+"'"}];
return false;
}
else {
if(data27.short !== undefined){
const _errs57 = errors;
if(!(typeof data27.short == "number")){
validate142.errors = [{instancePath:instancePath+"/ewma/short",schemaPath:"#/properties/ewma/properties/short/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid7 = _errs57 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data27.long !== undefined){
const _errs59 = errors;
if(!(typeof data27.long == "number")){
validate142.errors = [{instancePath:instancePath+"/ewma/long",schemaPath:"#/properties/ewma/properties/long/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid7 = _errs59 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data27.observedAt !== undefined){
const _errs61 = errors;
if(typeof data27.observedAt !== "string"){
validate142.errors = [{instancePath:instancePath+"/ewma/observedAt",schemaPath:"#/properties/ewma/properties/observedAt/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid7 = _errs61 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data27.sourceIds !== undefined){
let data31 = data27.sourceIds;
const _errs63 = errors;
if(errors === _errs63){
if(Array.isArray(data31)){
var valid8 = true;
const len3 = data31.length;
for(let i3=0; i3<len3; i3++){
const _errs65 = errors;
if(typeof data31[i3] !== "string"){
validate142.errors = [{instancePath:instancePath+"/ewma/sourceIds/" + i3,schemaPath:"#/properties/ewma/properties/sourceIds/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid8 = _errs65 === errors;
if(!valid8){
break;
}
}
}
else {
validate142.errors = [{instancePath:instancePath+"/ewma/sourceIds",schemaPath:"#/properties/ewma/properties/sourceIds/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid7 = _errs63 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data27.limitationCodes !== undefined){
let data33 = data27.limitationCodes;
const _errs67 = errors;
if(errors === _errs67){
if(Array.isArray(data33)){
var valid9 = true;
const len4 = data33.length;
for(let i4=0; i4<len4; i4++){
const _errs69 = errors;
if(typeof data33[i4] !== "string"){
validate142.errors = [{instancePath:instancePath+"/ewma/limitationCodes/" + i4,schemaPath:"#/properties/ewma/properties/limitationCodes/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid9 = _errs69 === errors;
if(!valid9){
break;
}
}
}
else {
validate142.errors = [{instancePath:instancePath+"/ewma/limitationCodes",schemaPath:"#/properties/ewma/properties/limitationCodes/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid7 = _errs67 === errors;
}
else {
var valid7 = true;
}
}
}
}
}
}
}
else {
validate142.errors = [{instancePath:instancePath+"/ewma",schemaPath:"#/properties/ewma/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs55 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.jointModel !== undefined){
let data35 = data.jointModel;
const _errs71 = errors;
if(errors === _errs71){
if(data35 && typeof data35 == "object" && !Array.isArray(data35)){
let missing5;
if(((((((data35.observedDeviation === undefined) && (missing5 = "observedDeviation")) || ((data35.modelAssociated === undefined) && (missing5 = "modelAssociated"))) || ((data35.unexplainedResidual === undefined) && (missing5 = "unexplainedResidual"))) || ((data35.completeObservationCount === undefined) && (missing5 = "completeObservationCount"))) || ((data35.drivers === undefined) && (missing5 = "drivers"))) || ((data35.limitationCodes === undefined) && (missing5 = "limitationCodes"))){
validate142.errors = [{instancePath:instancePath+"/jointModel",schemaPath:"#/properties/jointModel/required",keyword:"required",params:{missingProperty: missing5},message:"must have required property '"+missing5+"'"}];
return false;
}
else {
if(data35.observedDeviation !== undefined){
const _errs73 = errors;
if(!(typeof data35.observedDeviation == "number")){
validate142.errors = [{instancePath:instancePath+"/jointModel/observedDeviation",schemaPath:"#/properties/jointModel/properties/observedDeviation/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid10 = _errs73 === errors;
}
else {
var valid10 = true;
}
if(valid10){
if(data35.modelAssociated !== undefined){
const _errs75 = errors;
if(!(typeof data35.modelAssociated == "number")){
validate142.errors = [{instancePath:instancePath+"/jointModel/modelAssociated",schemaPath:"#/properties/jointModel/properties/modelAssociated/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid10 = _errs75 === errors;
}
else {
var valid10 = true;
}
if(valid10){
if(data35.unexplainedResidual !== undefined){
const _errs77 = errors;
if(!(typeof data35.unexplainedResidual == "number")){
validate142.errors = [{instancePath:instancePath+"/jointModel/unexplainedResidual",schemaPath:"#/properties/jointModel/properties/unexplainedResidual/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid10 = _errs77 === errors;
}
else {
var valid10 = true;
}
if(valid10){
if(data35.completeObservationCount !== undefined){
const _errs79 = errors;
if(!(typeof data35.completeObservationCount == "number")){
validate142.errors = [{instancePath:instancePath+"/jointModel/completeObservationCount",schemaPath:"#/properties/jointModel/properties/completeObservationCount/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid10 = _errs79 === errors;
}
else {
var valid10 = true;
}
if(valid10){
if(data35.drivers !== undefined){
let data40 = data35.drivers;
const _errs81 = errors;
if(errors === _errs81){
if(Array.isArray(data40)){
var valid11 = true;
const len5 = data40.length;
for(let i5=0; i5<len5; i5++){
let data41 = data40[i5];
const _errs83 = errors;
if(errors === _errs83){
if(data41 && typeof data41 == "object" && !Array.isArray(data41)){
let missing6;
if(((((((((data41.id === undefined) && (missing6 = "id")) || ((data41.label === undefined) && (missing6 = "label"))) || ((data41.contribution === undefined) && (missing6 = "contribution"))) || ((data41.lagPeriods === undefined) && (missing6 = "lagPeriods"))) || ((data41.supportCount === undefined) && (missing6 = "supportCount"))) || ((data41.counterexampleCount === undefined) && (missing6 = "counterexampleCount"))) || ((data41.stability === undefined) && (missing6 = "stability"))) || ((data41.limitationCodes === undefined) && (missing6 = "limitationCodes"))){
validate142.errors = [{instancePath:instancePath+"/jointModel/drivers/" + i5,schemaPath:"#/properties/jointModel/properties/drivers/items/required",keyword:"required",params:{missingProperty: missing6},message:"must have required property '"+missing6+"'"}];
return false;
}
else {
if(data41.id !== undefined){
const _errs85 = errors;
if(typeof data41.id !== "string"){
validate142.errors = [{instancePath:instancePath+"/jointModel/drivers/" + i5+"/id",schemaPath:"#/properties/jointModel/properties/drivers/items/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid12 = _errs85 === errors;
}
else {
var valid12 = true;
}
if(valid12){
if(data41.label !== undefined){
const _errs87 = errors;
if(typeof data41.label !== "string"){
validate142.errors = [{instancePath:instancePath+"/jointModel/drivers/" + i5+"/label",schemaPath:"#/properties/jointModel/properties/drivers/items/properties/label/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid12 = _errs87 === errors;
}
else {
var valid12 = true;
}
if(valid12){
if(data41.contribution !== undefined){
const _errs89 = errors;
if(!(typeof data41.contribution == "number")){
validate142.errors = [{instancePath:instancePath+"/jointModel/drivers/" + i5+"/contribution",schemaPath:"#/properties/jointModel/properties/drivers/items/properties/contribution/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid12 = _errs89 === errors;
}
else {
var valid12 = true;
}
if(valid12){
if(data41.lagPeriods !== undefined){
const _errs91 = errors;
if(!(typeof data41.lagPeriods == "number")){
validate142.errors = [{instancePath:instancePath+"/jointModel/drivers/" + i5+"/lagPeriods",schemaPath:"#/properties/jointModel/properties/drivers/items/properties/lagPeriods/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid12 = _errs91 === errors;
}
else {
var valid12 = true;
}
if(valid12){
if(data41.supportCount !== undefined){
const _errs93 = errors;
if(!(typeof data41.supportCount == "number")){
validate142.errors = [{instancePath:instancePath+"/jointModel/drivers/" + i5+"/supportCount",schemaPath:"#/properties/jointModel/properties/drivers/items/properties/supportCount/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid12 = _errs93 === errors;
}
else {
var valid12 = true;
}
if(valid12){
if(data41.counterexampleCount !== undefined){
const _errs95 = errors;
if(!(typeof data41.counterexampleCount == "number")){
validate142.errors = [{instancePath:instancePath+"/jointModel/drivers/" + i5+"/counterexampleCount",schemaPath:"#/properties/jointModel/properties/drivers/items/properties/counterexampleCount/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid12 = _errs95 === errors;
}
else {
var valid12 = true;
}
if(valid12){
if(data41.stability !== undefined){
const _errs97 = errors;
if(typeof data41.stability !== "string"){
validate142.errors = [{instancePath:instancePath+"/jointModel/drivers/" + i5+"/stability",schemaPath:"#/properties/jointModel/properties/drivers/items/properties/stability/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid12 = _errs97 === errors;
}
else {
var valid12 = true;
}
if(valid12){
if(data41.limitationCodes !== undefined){
let data49 = data41.limitationCodes;
const _errs99 = errors;
if(errors === _errs99){
if(Array.isArray(data49)){
var valid13 = true;
const len6 = data49.length;
for(let i6=0; i6<len6; i6++){
const _errs101 = errors;
if(typeof data49[i6] !== "string"){
validate142.errors = [{instancePath:instancePath+"/jointModel/drivers/" + i5+"/limitationCodes/" + i6,schemaPath:"#/properties/jointModel/properties/drivers/items/properties/limitationCodes/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid13 = _errs101 === errors;
if(!valid13){
break;
}
}
}
else {
validate142.errors = [{instancePath:instancePath+"/jointModel/drivers/" + i5+"/limitationCodes",schemaPath:"#/properties/jointModel/properties/drivers/items/properties/limitationCodes/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid12 = _errs99 === errors;
}
else {
var valid12 = true;
}
}
}
}
}
}
}
}
}
}
else {
validate142.errors = [{instancePath:instancePath+"/jointModel/drivers/" + i5,schemaPath:"#/properties/jointModel/properties/drivers/items/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid11 = _errs83 === errors;
if(!valid11){
break;
}
}
}
else {
validate142.errors = [{instancePath:instancePath+"/jointModel/drivers",schemaPath:"#/properties/jointModel/properties/drivers/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid10 = _errs81 === errors;
}
else {
var valid10 = true;
}
if(valid10){
if(data35.limitationCodes !== undefined){
let data51 = data35.limitationCodes;
const _errs103 = errors;
if(errors === _errs103){
if(Array.isArray(data51)){
var valid14 = true;
const len7 = data51.length;
for(let i7=0; i7<len7; i7++){
const _errs105 = errors;
if(typeof data51[i7] !== "string"){
validate142.errors = [{instancePath:instancePath+"/jointModel/limitationCodes/" + i7,schemaPath:"#/properties/jointModel/properties/limitationCodes/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid14 = _errs105 === errors;
if(!valid14){
break;
}
}
}
else {
validate142.errors = [{instancePath:instancePath+"/jointModel/limitationCodes",schemaPath:"#/properties/jointModel/properties/limitationCodes/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid10 = _errs103 === errors;
}
else {
var valid10 = true;
}
}
}
}
}
}
}
}
else {
validate142.errors = [{instancePath:instancePath+"/jointModel",schemaPath:"#/properties/jointModel/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs71 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.similarPeriods !== undefined){
let data53 = data.similarPeriods;
const _errs107 = errors;
if(errors === _errs107){
if(Array.isArray(data53)){
var valid15 = true;
const len8 = data53.length;
for(let i8=0; i8<len8; i8++){
let data54 = data53[i8];
const _errs109 = errors;
if(errors === _errs109){
if(data54 && typeof data54 == "object" && !Array.isArray(data54)){
let missing7;
if(((((((((data54.id === undefined) && (missing7 = "id")) || ((data54.startAt === undefined) && (missing7 = "startAt"))) || ((data54.endAt === undefined) && (missing7 = "endAt"))) || ((data54.distance === undefined) && (missing7 = "distance"))) || ((data54.matchingFeatures === undefined) && (missing7 = "matchingFeatures"))) || ((data54.differentFeatures === undefined) && (missing7 = "differentFeatures"))) || ((data54.supportCount === undefined) && (missing7 = "supportCount"))) || ((data54.counterexampleCount === undefined) && (missing7 = "counterexampleCount"))){
validate142.errors = [{instancePath:instancePath+"/similarPeriods/" + i8,schemaPath:"#/properties/similarPeriods/items/required",keyword:"required",params:{missingProperty: missing7},message:"must have required property '"+missing7+"'"}];
return false;
}
else {
if(data54.id !== undefined){
const _errs111 = errors;
if(typeof data54.id !== "string"){
validate142.errors = [{instancePath:instancePath+"/similarPeriods/" + i8+"/id",schemaPath:"#/properties/similarPeriods/items/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid16 = _errs111 === errors;
}
else {
var valid16 = true;
}
if(valid16){
if(data54.startAt !== undefined){
const _errs113 = errors;
if(typeof data54.startAt !== "string"){
validate142.errors = [{instancePath:instancePath+"/similarPeriods/" + i8+"/startAt",schemaPath:"#/properties/similarPeriods/items/properties/startAt/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid16 = _errs113 === errors;
}
else {
var valid16 = true;
}
if(valid16){
if(data54.endAt !== undefined){
const _errs115 = errors;
if(typeof data54.endAt !== "string"){
validate142.errors = [{instancePath:instancePath+"/similarPeriods/" + i8+"/endAt",schemaPath:"#/properties/similarPeriods/items/properties/endAt/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid16 = _errs115 === errors;
}
else {
var valid16 = true;
}
if(valid16){
if(data54.distance !== undefined){
const _errs117 = errors;
if(!(typeof data54.distance == "number")){
validate142.errors = [{instancePath:instancePath+"/similarPeriods/" + i8+"/distance",schemaPath:"#/properties/similarPeriods/items/properties/distance/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid16 = _errs117 === errors;
}
else {
var valid16 = true;
}
if(valid16){
if(data54.matchingFeatures !== undefined){
let data59 = data54.matchingFeatures;
const _errs119 = errors;
if(errors === _errs119){
if(Array.isArray(data59)){
var valid17 = true;
const len9 = data59.length;
for(let i9=0; i9<len9; i9++){
const _errs121 = errors;
if(typeof data59[i9] !== "string"){
validate142.errors = [{instancePath:instancePath+"/similarPeriods/" + i8+"/matchingFeatures/" + i9,schemaPath:"#/properties/similarPeriods/items/properties/matchingFeatures/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid17 = _errs121 === errors;
if(!valid17){
break;
}
}
}
else {
validate142.errors = [{instancePath:instancePath+"/similarPeriods/" + i8+"/matchingFeatures",schemaPath:"#/properties/similarPeriods/items/properties/matchingFeatures/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid16 = _errs119 === errors;
}
else {
var valid16 = true;
}
if(valid16){
if(data54.differentFeatures !== undefined){
let data61 = data54.differentFeatures;
const _errs123 = errors;
if(errors === _errs123){
if(Array.isArray(data61)){
var valid18 = true;
const len10 = data61.length;
for(let i10=0; i10<len10; i10++){
const _errs125 = errors;
if(typeof data61[i10] !== "string"){
validate142.errors = [{instancePath:instancePath+"/similarPeriods/" + i8+"/differentFeatures/" + i10,schemaPath:"#/properties/similarPeriods/items/properties/differentFeatures/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid18 = _errs125 === errors;
if(!valid18){
break;
}
}
}
else {
validate142.errors = [{instancePath:instancePath+"/similarPeriods/" + i8+"/differentFeatures",schemaPath:"#/properties/similarPeriods/items/properties/differentFeatures/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid16 = _errs123 === errors;
}
else {
var valid16 = true;
}
if(valid16){
if(data54.supportCount !== undefined){
const _errs127 = errors;
if(!(typeof data54.supportCount == "number")){
validate142.errors = [{instancePath:instancePath+"/similarPeriods/" + i8+"/supportCount",schemaPath:"#/properties/similarPeriods/items/properties/supportCount/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid16 = _errs127 === errors;
}
else {
var valid16 = true;
}
if(valid16){
if(data54.counterexampleCount !== undefined){
const _errs129 = errors;
if(!(typeof data54.counterexampleCount == "number")){
validate142.errors = [{instancePath:instancePath+"/similarPeriods/" + i8+"/counterexampleCount",schemaPath:"#/properties/similarPeriods/items/properties/counterexampleCount/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid16 = _errs129 === errors;
}
else {
var valid16 = true;
}
}
}
}
}
}
}
}
}
}
else {
validate142.errors = [{instancePath:instancePath+"/similarPeriods/" + i8,schemaPath:"#/properties/similarPeriods/items/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid15 = _errs109 === errors;
if(!valid15){
break;
}
}
}
else {
validate142.errors = [{instancePath:instancePath+"/similarPeriods",schemaPath:"#/properties/similarPeriods/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs107 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.recovery !== undefined){
let data65 = data.recovery;
const _errs131 = errors;
if(errors === _errs131){
if(data65 && typeof data65 == "object" && !Array.isArray(data65)){
let missing8;
if((((((data65.semantics === undefined) && (missing8 = "semantics")) || ((data65.episodeCount === undefined) && (missing8 = "episodeCount"))) || ((data65.path === undefined) && (missing8 = "path"))) || ((data65.forecastAllowed === undefined) && (missing8 = "forecastAllowed"))) || ((data65.limitationCodes === undefined) && (missing8 = "limitationCodes"))){
validate142.errors = [{instancePath:instancePath+"/recovery",schemaPath:"#/properties/recovery/required",keyword:"required",params:{missingProperty: missing8},message:"must have required property '"+missing8+"'"}];
return false;
}
else {
if(data65.semantics !== undefined){
let data66 = data65.semantics;
const _errs133 = errors;
if(typeof data66 !== "string"){
validate142.errors = [{instancePath:instancePath+"/recovery/semantics",schemaPath:"#/properties/recovery/properties/semantics/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((data66 === "historical_analogue") || (data66 === "validated_forecast"))){
validate142.errors = [{instancePath:instancePath+"/recovery/semantics",schemaPath:"#/properties/recovery/properties/semantics/enum",keyword:"enum",params:{allowedValues: schema59.properties.recovery.properties.semantics.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid19 = _errs133 === errors;
}
else {
var valid19 = true;
}
if(valid19){
if(data65.episodeCount !== undefined){
const _errs135 = errors;
if(!(typeof data65.episodeCount == "number")){
validate142.errors = [{instancePath:instancePath+"/recovery/episodeCount",schemaPath:"#/properties/recovery/properties/episodeCount/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid19 = _errs135 === errors;
}
else {
var valid19 = true;
}
if(valid19){
if(data65.path !== undefined){
let data68 = data65.path;
const _errs137 = errors;
if(errors === _errs137){
if(Array.isArray(data68)){
var valid20 = true;
const len11 = data68.length;
for(let i11=0; i11<len11; i11++){
let data69 = data68[i11];
const _errs139 = errors;
if(errors === _errs139){
if(data69 && typeof data69 == "object" && !Array.isArray(data69)){
let missing9;
if(((((data69.offsetDays === undefined) && (missing9 = "offsetDays")) || ((data69.medianDeviation === undefined) && (missing9 = "medianDeviation"))) || ((data69.lowDeviation === undefined) && (missing9 = "lowDeviation"))) || ((data69.highDeviation === undefined) && (missing9 = "highDeviation"))){
validate142.errors = [{instancePath:instancePath+"/recovery/path/" + i11,schemaPath:"#/properties/recovery/properties/path/items/required",keyword:"required",params:{missingProperty: missing9},message:"must have required property '"+missing9+"'"}];
return false;
}
else {
if(data69.offsetDays !== undefined){
const _errs141 = errors;
if(!(typeof data69.offsetDays == "number")){
validate142.errors = [{instancePath:instancePath+"/recovery/path/" + i11+"/offsetDays",schemaPath:"#/properties/recovery/properties/path/items/properties/offsetDays/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid21 = _errs141 === errors;
}
else {
var valid21 = true;
}
if(valid21){
if(data69.medianDeviation !== undefined){
const _errs143 = errors;
if(!(typeof data69.medianDeviation == "number")){
validate142.errors = [{instancePath:instancePath+"/recovery/path/" + i11+"/medianDeviation",schemaPath:"#/properties/recovery/properties/path/items/properties/medianDeviation/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid21 = _errs143 === errors;
}
else {
var valid21 = true;
}
if(valid21){
if(data69.lowDeviation !== undefined){
const _errs145 = errors;
if(!(typeof data69.lowDeviation == "number")){
validate142.errors = [{instancePath:instancePath+"/recovery/path/" + i11+"/lowDeviation",schemaPath:"#/properties/recovery/properties/path/items/properties/lowDeviation/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid21 = _errs145 === errors;
}
else {
var valid21 = true;
}
if(valid21){
if(data69.highDeviation !== undefined){
const _errs147 = errors;
if(!(typeof data69.highDeviation == "number")){
validate142.errors = [{instancePath:instancePath+"/recovery/path/" + i11+"/highDeviation",schemaPath:"#/properties/recovery/properties/path/items/properties/highDeviation/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid21 = _errs147 === errors;
}
else {
var valid21 = true;
}
}
}
}
}
}
else {
validate142.errors = [{instancePath:instancePath+"/recovery/path/" + i11,schemaPath:"#/properties/recovery/properties/path/items/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid20 = _errs139 === errors;
if(!valid20){
break;
}
}
}
else {
validate142.errors = [{instancePath:instancePath+"/recovery/path",schemaPath:"#/properties/recovery/properties/path/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid19 = _errs137 === errors;
}
else {
var valid19 = true;
}
if(valid19){
if(data65.forecastAllowed !== undefined){
const _errs149 = errors;
if(typeof data65.forecastAllowed !== "boolean"){
validate142.errors = [{instancePath:instancePath+"/recovery/forecastAllowed",schemaPath:"#/properties/recovery/properties/forecastAllowed/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid19 = _errs149 === errors;
}
else {
var valid19 = true;
}
if(valid19){
if(data65.limitationCodes !== undefined){
let data75 = data65.limitationCodes;
const _errs151 = errors;
if(errors === _errs151){
if(Array.isArray(data75)){
var valid22 = true;
const len12 = data75.length;
for(let i12=0; i12<len12; i12++){
const _errs153 = errors;
if(typeof data75[i12] !== "string"){
validate142.errors = [{instancePath:instancePath+"/recovery/limitationCodes/" + i12,schemaPath:"#/properties/recovery/properties/limitationCodes/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid22 = _errs153 === errors;
if(!valid22){
break;
}
}
}
else {
validate142.errors = [{instancePath:instancePath+"/recovery/limitationCodes",schemaPath:"#/properties/recovery/properties/limitationCodes/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid19 = _errs151 === errors;
}
else {
var valid19 = true;
}
}
}
}
}
}
}
else {
validate142.errors = [{instancePath:instancePath+"/recovery",schemaPath:"#/properties/recovery/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs131 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.scenarioBranches !== undefined){
let data77 = data.scenarioBranches;
const _errs155 = errors;
if(errors === _errs155){
if(Array.isArray(data77)){
var valid23 = true;
const len13 = data77.length;
for(let i13=0; i13<len13; i13++){
let data78 = data77[i13];
const _errs157 = errors;
if(errors === _errs157){
if(data78 && typeof data78 == "object" && !Array.isArray(data78)){
let missing10;
if((((((((data78.id === undefined) && (missing10 = "id")) || ((data78.action === undefined) && (missing10 = "action"))) || ((data78.comparablePeriodCount === undefined) && (missing10 = "comparablePeriodCount"))) || ((data78.supportCount === undefined) && (missing10 = "supportCount"))) || ((data78.counterexampleCount === undefined) && (missing10 = "counterexampleCount"))) || ((data78.missingOutcomeCount === undefined) && (missing10 = "missingOutcomeCount"))) || ((data78.limitationCodes === undefined) && (missing10 = "limitationCodes"))){
validate142.errors = [{instancePath:instancePath+"/scenarioBranches/" + i13,schemaPath:"#/properties/scenarioBranches/items/required",keyword:"required",params:{missingProperty: missing10},message:"must have required property '"+missing10+"'"}];
return false;
}
else {
if(data78.id !== undefined){
const _errs159 = errors;
if(typeof data78.id !== "string"){
validate142.errors = [{instancePath:instancePath+"/scenarioBranches/" + i13+"/id",schemaPath:"#/properties/scenarioBranches/items/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid24 = _errs159 === errors;
}
else {
var valid24 = true;
}
if(valid24){
if(data78.action !== undefined){
const _errs161 = errors;
if(typeof data78.action !== "string"){
validate142.errors = [{instancePath:instancePath+"/scenarioBranches/" + i13+"/action",schemaPath:"#/properties/scenarioBranches/items/properties/action/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid24 = _errs161 === errors;
}
else {
var valid24 = true;
}
if(valid24){
if(data78.comparablePeriodCount !== undefined){
const _errs163 = errors;
if(!(typeof data78.comparablePeriodCount == "number")){
validate142.errors = [{instancePath:instancePath+"/scenarioBranches/" + i13+"/comparablePeriodCount",schemaPath:"#/properties/scenarioBranches/items/properties/comparablePeriodCount/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid24 = _errs163 === errors;
}
else {
var valid24 = true;
}
if(valid24){
if(data78.observedOutcomeChange !== undefined){
const _errs165 = errors;
if(!(typeof data78.observedOutcomeChange == "number")){
validate142.errors = [{instancePath:instancePath+"/scenarioBranches/" + i13+"/observedOutcomeChange",schemaPath:"#/properties/scenarioBranches/items/properties/observedOutcomeChange/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid24 = _errs165 === errors;
}
else {
var valid24 = true;
}
if(valid24){
if(data78.supportCount !== undefined){
const _errs167 = errors;
if(!(typeof data78.supportCount == "number")){
validate142.errors = [{instancePath:instancePath+"/scenarioBranches/" + i13+"/supportCount",schemaPath:"#/properties/scenarioBranches/items/properties/supportCount/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid24 = _errs167 === errors;
}
else {
var valid24 = true;
}
if(valid24){
if(data78.counterexampleCount !== undefined){
const _errs169 = errors;
if(!(typeof data78.counterexampleCount == "number")){
validate142.errors = [{instancePath:instancePath+"/scenarioBranches/" + i13+"/counterexampleCount",schemaPath:"#/properties/scenarioBranches/items/properties/counterexampleCount/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid24 = _errs169 === errors;
}
else {
var valid24 = true;
}
if(valid24){
if(data78.missingOutcomeCount !== undefined){
const _errs171 = errors;
if(!(typeof data78.missingOutcomeCount == "number")){
validate142.errors = [{instancePath:instancePath+"/scenarioBranches/" + i13+"/missingOutcomeCount",schemaPath:"#/properties/scenarioBranches/items/properties/missingOutcomeCount/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid24 = _errs171 === errors;
}
else {
var valid24 = true;
}
if(valid24){
if(data78.limitationCodes !== undefined){
let data86 = data78.limitationCodes;
const _errs173 = errors;
if(errors === _errs173){
if(Array.isArray(data86)){
var valid25 = true;
const len14 = data86.length;
for(let i14=0; i14<len14; i14++){
const _errs175 = errors;
if(typeof data86[i14] !== "string"){
validate142.errors = [{instancePath:instancePath+"/scenarioBranches/" + i13+"/limitationCodes/" + i14,schemaPath:"#/properties/scenarioBranches/items/properties/limitationCodes/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid25 = _errs175 === errors;
if(!valid25){
break;
}
}
}
else {
validate142.errors = [{instancePath:instancePath+"/scenarioBranches/" + i13+"/limitationCodes",schemaPath:"#/properties/scenarioBranches/items/properties/limitationCodes/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid24 = _errs173 === errors;
}
else {
var valid24 = true;
}
}
}
}
}
}
}
}
}
}
else {
validate142.errors = [{instancePath:instancePath+"/scenarioBranches/" + i13,schemaPath:"#/properties/scenarioBranches/items/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid23 = _errs157 === errors;
if(!valid23){
break;
}
}
}
else {
validate142.errors = [{instancePath:instancePath+"/scenarioBranches",schemaPath:"#/properties/scenarioBranches/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs155 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.items !== undefined){
let data88 = data.items;
const _errs177 = errors;
if(errors === _errs177){
if(Array.isArray(data88)){
var valid26 = true;
const len15 = data88.length;
for(let i15=0; i15<len15; i15++){
const _errs179 = errors;
if(!(validate143(data88[i15], {instancePath:instancePath+"/items/" + i15,parentData:data88,parentDataProperty:i15,rootData}))){
vErrors = vErrors === null ? validate143.errors : vErrors.concat(validate143.errors);
errors = vErrors.length;
}
var valid26 = _errs179 === errors;
if(!valid26){
break;
}
}
}
else {
validate142.errors = [{instancePath:instancePath+"/items",schemaPath:"#/properties/items/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs177 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.missingness !== undefined){
let data90 = data.missingness;
const _errs180 = errors;
if(errors === _errs180){
if(Array.isArray(data90)){
var valid27 = true;
const len16 = data90.length;
for(let i16=0; i16<len16; i16++){
const _errs182 = errors;
if(typeof data90[i16] !== "string"){
validate142.errors = [{instancePath:instancePath+"/missingness/" + i16,schemaPath:"#/properties/missingness/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid27 = _errs182 === errors;
if(!valid27){
break;
}
}
}
else {
validate142.errors = [{instancePath:instancePath+"/missingness",schemaPath:"#/properties/missingness/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs180 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.limitations !== undefined){
let data92 = data.limitations;
const _errs184 = errors;
if(errors === _errs184){
if(Array.isArray(data92)){
var valid28 = true;
const len17 = data92.length;
for(let i17=0; i17<len17; i17++){
const _errs186 = errors;
if(typeof data92[i17] !== "string"){
validate142.errors = [{instancePath:instancePath+"/limitations/" + i17,schemaPath:"#/properties/limitations/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid28 = _errs186 === errors;
if(!valid28){
break;
}
}
}
else {
validate142.errors = [{instancePath:instancePath+"/limitations",schemaPath:"#/properties/limitations/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs184 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.sourceArtifactIds !== undefined){
let data94 = data.sourceArtifactIds;
const _errs188 = errors;
if(errors === _errs188){
if(Array.isArray(data94)){
var valid29 = true;
const len18 = data94.length;
for(let i18=0; i18<len18; i18++){
const _errs190 = errors;
if(typeof data94[i18] !== "string"){
validate142.errors = [{instancePath:instancePath+"/sourceArtifactIds/" + i18,schemaPath:"#/properties/sourceArtifactIds/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid29 = _errs190 === errors;
if(!valid29){
break;
}
}
}
else {
validate142.errors = [{instancePath:instancePath+"/sourceArtifactIds",schemaPath:"#/properties/sourceArtifactIds/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs188 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate142.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate142.errors = vErrors;
return errors === 0;
}

const schema61 = {"type":"object","properties":{"level":{"type":"string","enum":["normal","needs_clarification","blocked"]},"matchedTerms":{"type":"array","items":{"type":"string"}},"reasonCodes":{"type":"array","items":{"type":"string"}},"userMessageKey":{"type":"string"}},"required":["level","matchedTerms","reasonCodes"]};

function validate146(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((data.level === undefined) && (missing0 = "level")) || ((data.matchedTerms === undefined) && (missing0 = "matchedTerms"))) || ((data.reasonCodes === undefined) && (missing0 = "reasonCodes"))){
validate146.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.level !== undefined){
let data0 = data.level;
const _errs1 = errors;
if(typeof data0 !== "string"){
validate146.errors = [{instancePath:instancePath+"/level",schemaPath:"#/properties/level/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((data0 === "normal") || (data0 === "needs_clarification")) || (data0 === "blocked"))){
validate146.errors = [{instancePath:instancePath+"/level",schemaPath:"#/properties/level/enum",keyword:"enum",params:{allowedValues: schema61.properties.level.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.matchedTerms !== undefined){
let data1 = data.matchedTerms;
const _errs3 = errors;
if(errors === _errs3){
if(Array.isArray(data1)){
var valid1 = true;
const len0 = data1.length;
for(let i0=0; i0<len0; i0++){
const _errs5 = errors;
if(typeof data1[i0] !== "string"){
validate146.errors = [{instancePath:instancePath+"/matchedTerms/" + i0,schemaPath:"#/properties/matchedTerms/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid1 = _errs5 === errors;
if(!valid1){
break;
}
}
}
else {
validate146.errors = [{instancePath:instancePath+"/matchedTerms",schemaPath:"#/properties/matchedTerms/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.reasonCodes !== undefined){
let data3 = data.reasonCodes;
const _errs7 = errors;
if(errors === _errs7){
if(Array.isArray(data3)){
var valid2 = true;
const len1 = data3.length;
for(let i1=0; i1<len1; i1++){
const _errs9 = errors;
if(typeof data3[i1] !== "string"){
validate146.errors = [{instancePath:instancePath+"/reasonCodes/" + i1,schemaPath:"#/properties/reasonCodes/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid2 = _errs9 === errors;
if(!valid2){
break;
}
}
}
else {
validate146.errors = [{instancePath:instancePath+"/reasonCodes",schemaPath:"#/properties/reasonCodes/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.userMessageKey !== undefined){
const _errs11 = errors;
if(typeof data.userMessageKey !== "string"){
validate146.errors = [{instancePath:instancePath+"/userMessageKey",schemaPath:"#/properties/userMessageKey/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
else {
validate146.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate146.errors = vErrors;
return errors === 0;
}

const schema62 = {"type":"object","properties":{"available":{"type":"boolean"},"usedAt":{"type":"string"},"restoredSnapshotHash":{"type":"string"}},"required":["available"]};

function validate150(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((data.available === undefined) && (missing0 = "available")){
validate150.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.available !== undefined){
const _errs1 = errors;
if(typeof data.available !== "boolean"){
validate150.errors = [{instancePath:instancePath+"/available",schemaPath:"#/properties/available/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.usedAt !== undefined){
const _errs3 = errors;
if(typeof data.usedAt !== "string"){
validate150.errors = [{instancePath:instancePath+"/usedAt",schemaPath:"#/properties/usedAt/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.restoredSnapshotHash !== undefined){
const _errs5 = errors;
if(typeof data.restoredSnapshotHash !== "string"){
validate150.errors = [{instancePath:instancePath+"/restoredSnapshotHash",schemaPath:"#/properties/restoredSnapshotHash/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
else {
validate150.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate150.errors = vErrors;
return errors === 0;
}

const schema63 = {"type":"object","properties":{"id":{"type":"string"},"horizon":{"$ref":"#/definitions/DecisionOutcomeHorizon"},"dueAt":{"type":"string"},"requiredFields":{"type":"array","items":{"type":"string","enum":["state","task_result","usefulness","fatigue","carryover"]}},"status":{"type":"string","enum":["pending","due","completed","skipped"]}},"required":["id","horizon","dueAt","requiredFields","status"]};

function validate152(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((data.id === undefined) && (missing0 = "id")) || ((data.horizon === undefined) && (missing0 = "horizon"))) || ((data.dueAt === undefined) && (missing0 = "dueAt"))) || ((data.requiredFields === undefined) && (missing0 = "requiredFields"))) || ((data.status === undefined) && (missing0 = "status"))){
validate152.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.id !== undefined){
const _errs1 = errors;
if(typeof data.id !== "string"){
validate152.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.horizon !== undefined){
const _errs3 = errors;
if(!(validate112(data.horizon, {instancePath:instancePath+"/horizon",parentData:data,parentDataProperty:"horizon",rootData}))){
vErrors = vErrors === null ? validate112.errors : vErrors.concat(validate112.errors);
errors = vErrors.length;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.dueAt !== undefined){
const _errs4 = errors;
if(typeof data.dueAt !== "string"){
validate152.errors = [{instancePath:instancePath+"/dueAt",schemaPath:"#/properties/dueAt/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.requiredFields !== undefined){
let data3 = data.requiredFields;
const _errs6 = errors;
if(errors === _errs6){
if(Array.isArray(data3)){
var valid1 = true;
const len0 = data3.length;
for(let i0=0; i0<len0; i0++){
let data4 = data3[i0];
const _errs8 = errors;
if(typeof data4 !== "string"){
validate152.errors = [{instancePath:instancePath+"/requiredFields/" + i0,schemaPath:"#/properties/requiredFields/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((((data4 === "state") || (data4 === "task_result")) || (data4 === "usefulness")) || (data4 === "fatigue")) || (data4 === "carryover"))){
validate152.errors = [{instancePath:instancePath+"/requiredFields/" + i0,schemaPath:"#/properties/requiredFields/items/enum",keyword:"enum",params:{allowedValues: schema63.properties.requiredFields.items.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid1 = _errs8 === errors;
if(!valid1){
break;
}
}
}
else {
validate152.errors = [{instancePath:instancePath+"/requiredFields",schemaPath:"#/properties/requiredFields/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.status !== undefined){
let data5 = data.status;
const _errs10 = errors;
if(typeof data5 !== "string"){
validate152.errors = [{instancePath:instancePath+"/status",schemaPath:"#/properties/status/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((((data5 === "pending") || (data5 === "due")) || (data5 === "completed")) || (data5 === "skipped"))){
validate152.errors = [{instancePath:instancePath+"/status",schemaPath:"#/properties/status/enum",keyword:"enum",params:{allowedValues: schema63.properties.status.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
else {
validate152.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate152.errors = vErrors;
return errors === 0;
}

const schema64 = {"type":"object","properties":{"id":{"type":"string"},"recordedAt":{"type":"string"},"state":{"type":"number"},"fatigue":{"type":"number"},"taskResult":{"$ref":"#/definitions/DecisionTaskResult"},"usefulness":{"$ref":"#/definitions/DecisionUsefulness"},"carryover":{"type":"string","enum":["none","some","significant"]},"note":{"type":"string"}},"required":["id","recordedAt"]};
const schema65 = {"type":"string","enum":["completed","partially_completed","not_completed","not_applicable"]};

function validate156(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(typeof data !== "string"){
validate156.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((((data === "completed") || (data === "partially_completed")) || (data === "not_completed")) || (data === "not_applicable"))){
validate156.errors = [{instancePath,schemaPath:"#/enum",keyword:"enum",params:{allowedValues: schema65.enum},message:"must be equal to one of the allowed values"}];
return false;
}
validate156.errors = vErrors;
return errors === 0;
}

const schema66 = {"type":"string","enum":["helpful","uncertain","not_helpful"]};

function validate158(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(typeof data !== "string"){
validate158.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((data === "helpful") || (data === "uncertain")) || (data === "not_helpful"))){
validate158.errors = [{instancePath,schemaPath:"#/enum",keyword:"enum",params:{allowedValues: schema66.enum},message:"must be equal to one of the allowed values"}];
return false;
}
validate158.errors = vErrors;
return errors === 0;
}


function validate155(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((data.id === undefined) && (missing0 = "id")) || ((data.recordedAt === undefined) && (missing0 = "recordedAt"))){
validate155.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.id !== undefined){
const _errs1 = errors;
if(typeof data.id !== "string"){
validate155.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.recordedAt !== undefined){
const _errs3 = errors;
if(typeof data.recordedAt !== "string"){
validate155.errors = [{instancePath:instancePath+"/recordedAt",schemaPath:"#/properties/recordedAt/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.state !== undefined){
const _errs5 = errors;
if(!(typeof data.state == "number")){
validate155.errors = [{instancePath:instancePath+"/state",schemaPath:"#/properties/state/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.fatigue !== undefined){
const _errs7 = errors;
if(!(typeof data.fatigue == "number")){
validate155.errors = [{instancePath:instancePath+"/fatigue",schemaPath:"#/properties/fatigue/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.taskResult !== undefined){
const _errs9 = errors;
if(!(validate156(data.taskResult, {instancePath:instancePath+"/taskResult",parentData:data,parentDataProperty:"taskResult",rootData}))){
vErrors = vErrors === null ? validate156.errors : vErrors.concat(validate156.errors);
errors = vErrors.length;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.usefulness !== undefined){
const _errs10 = errors;
if(!(validate158(data.usefulness, {instancePath:instancePath+"/usefulness",parentData:data,parentDataProperty:"usefulness",rootData}))){
vErrors = vErrors === null ? validate158.errors : vErrors.concat(validate158.errors);
errors = vErrors.length;
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.carryover !== undefined){
let data6 = data.carryover;
const _errs11 = errors;
if(typeof data6 !== "string"){
validate155.errors = [{instancePath:instancePath+"/carryover",schemaPath:"#/properties/carryover/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((data6 === "none") || (data6 === "some")) || (data6 === "significant"))){
validate155.errors = [{instancePath:instancePath+"/carryover",schemaPath:"#/properties/carryover/enum",keyword:"enum",params:{allowedValues: schema64.properties.carryover.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.note !== undefined){
const _errs13 = errors;
if(typeof data.note !== "string"){
validate155.errors = [{instancePath:instancePath+"/note",schemaPath:"#/properties/note/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
else {
validate155.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate155.errors = vErrors;
return errors === 0;
}

const schema67 = {"type":"object","properties":{"fixtureOnly":{"type":"boolean"},"contextItemsAutoAssembled":{"type":"number"},"questionsAvoided":{"type":"number"},"questionsAsked":{"type":"number"},"userTaps":{"type":"number"},"decisionTimeMs":{"type":"number"},"planActionsApplied":{"type":"number"},"followUpCompleted":{"type":"boolean"},"outcomeAvailable":{"type":"boolean"}},"required":["fixtureOnly","contextItemsAutoAssembled","questionsAvoided","questionsAsked","userTaps","decisionTimeMs","planActionsApplied","followUpCompleted","outcomeAvailable"]};

function validate161(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((((((data.fixtureOnly === undefined) && (missing0 = "fixtureOnly")) || ((data.contextItemsAutoAssembled === undefined) && (missing0 = "contextItemsAutoAssembled"))) || ((data.questionsAvoided === undefined) && (missing0 = "questionsAvoided"))) || ((data.questionsAsked === undefined) && (missing0 = "questionsAsked"))) || ((data.userTaps === undefined) && (missing0 = "userTaps"))) || ((data.decisionTimeMs === undefined) && (missing0 = "decisionTimeMs"))) || ((data.planActionsApplied === undefined) && (missing0 = "planActionsApplied"))) || ((data.followUpCompleted === undefined) && (missing0 = "followUpCompleted"))) || ((data.outcomeAvailable === undefined) && (missing0 = "outcomeAvailable"))){
validate161.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.fixtureOnly !== undefined){
const _errs1 = errors;
if(typeof data.fixtureOnly !== "boolean"){
validate161.errors = [{instancePath:instancePath+"/fixtureOnly",schemaPath:"#/properties/fixtureOnly/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.contextItemsAutoAssembled !== undefined){
const _errs3 = errors;
if(!(typeof data.contextItemsAutoAssembled == "number")){
validate161.errors = [{instancePath:instancePath+"/contextItemsAutoAssembled",schemaPath:"#/properties/contextItemsAutoAssembled/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.questionsAvoided !== undefined){
const _errs5 = errors;
if(!(typeof data.questionsAvoided == "number")){
validate161.errors = [{instancePath:instancePath+"/questionsAvoided",schemaPath:"#/properties/questionsAvoided/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.questionsAsked !== undefined){
const _errs7 = errors;
if(!(typeof data.questionsAsked == "number")){
validate161.errors = [{instancePath:instancePath+"/questionsAsked",schemaPath:"#/properties/questionsAsked/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.userTaps !== undefined){
const _errs9 = errors;
if(!(typeof data.userTaps == "number")){
validate161.errors = [{instancePath:instancePath+"/userTaps",schemaPath:"#/properties/userTaps/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.decisionTimeMs !== undefined){
const _errs11 = errors;
if(!(typeof data.decisionTimeMs == "number")){
validate161.errors = [{instancePath:instancePath+"/decisionTimeMs",schemaPath:"#/properties/decisionTimeMs/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.planActionsApplied !== undefined){
const _errs13 = errors;
if(!(typeof data.planActionsApplied == "number")){
validate161.errors = [{instancePath:instancePath+"/planActionsApplied",schemaPath:"#/properties/planActionsApplied/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.followUpCompleted !== undefined){
const _errs15 = errors;
if(typeof data.followUpCompleted !== "boolean"){
validate161.errors = [{instancePath:instancePath+"/followUpCompleted",schemaPath:"#/properties/followUpCompleted/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs15 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.outcomeAvailable !== undefined){
const _errs17 = errors;
if(typeof data.outcomeAvailable !== "boolean"){
validate161.errors = [{instancePath:instancePath+"/outcomeAvailable",schemaPath:"#/properties/outcomeAvailable/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs17 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
else {
validate161.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate161.errors = vErrors;
return errors === 0;
}


function validate107(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((((((((((((((data.contractVersion === undefined) && (missing0 = "contractVersion")) || ((data.id === undefined) && (missing0 = "id"))) || ((data.subject === undefined) && (missing0 = "subject"))) || ((data.status === undefined) && (missing0 = "status"))) || ((data.question === undefined) && (missing0 = "question"))) || ((data.targetOutcome === undefined) && (missing0 = "targetOutcome"))) || ((data.time === undefined) && (missing0 = "time"))) || ((data.missingContext === undefined) && (missing0 = "missingContext"))) || ((data.contextSources === undefined) && (missing0 = "contextSources"))) || ((data.candidateActions === undefined) && (missing0 = "candidateActions"))) || ((data.limitations === undefined) && (missing0 = "limitations"))) || ((data.safetyStatus === undefined) && (missing0 = "safetyStatus"))) || ((data.undoState === undefined) && (missing0 = "undoState"))) || ((data.followUpOutcomes === undefined) && (missing0 = "followUpOutcomes"))) || ((data.provenance === undefined) && (missing0 = "provenance"))) || ((data.methodVersion === undefined) && (missing0 = "methodVersion"))) || ((data.createdAt === undefined) && (missing0 = "createdAt"))) || ((data.updatedAt === undefined) && (missing0 = "updatedAt"))){
validate107.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.contractVersion !== undefined){
let data0 = data.contractVersion;
const _errs1 = errors;
if(typeof data0 !== "string"){
validate107.errors = [{instancePath:instancePath+"/contractVersion",schemaPath:"#/properties/contractVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("questlife.decision.episode.v1" !== data0){
validate107.errors = [{instancePath:instancePath+"/contractVersion",schemaPath:"#/properties/contractVersion/const",keyword:"const",params:{allowedValue: "questlife.decision.episode.v1"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.id !== undefined){
const _errs3 = errors;
if(typeof data.id !== "string"){
validate107.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.subject !== undefined){
let data2 = data.subject;
const _errs5 = errors;
if(errors === _errs5){
if(data2 && typeof data2 == "object" && !Array.isArray(data2)){
let missing1;
if((data2.kind === undefined) && (missing1 = "kind")){
validate107.errors = [{instancePath:instancePath+"/subject",schemaPath:"#/properties/subject/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
if(data2.kind !== undefined){
let data3 = data2.kind;
const _errs7 = errors;
if(typeof data3 !== "string"){
validate107.errors = [{instancePath:instancePath+"/subject/kind",schemaPath:"#/properties/subject/properties/kind/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((data3 === "owner") || (data3 === "demo"))){
validate107.errors = [{instancePath:instancePath+"/subject/kind",schemaPath:"#/properties/subject/properties/kind/enum",keyword:"enum",params:{allowedValues: schema46.properties.subject.properties.kind.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid1 = _errs7 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data2.subjectId !== undefined){
const _errs9 = errors;
if(typeof data2.subjectId !== "string"){
validate107.errors = [{instancePath:instancePath+"/subject/subjectId",schemaPath:"#/properties/subject/properties/subjectId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid1 = _errs9 === errors;
}
else {
var valid1 = true;
}
}
}
}
else {
validate107.errors = [{instancePath:instancePath+"/subject",schemaPath:"#/properties/subject/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.status !== undefined){
const _errs11 = errors;
if(!(validate108(data.status, {instancePath:instancePath+"/status",parentData:data,parentDataProperty:"status",rootData}))){
vErrors = vErrors === null ? validate108.errors : vErrors.concat(validate108.errors);
errors = vErrors.length;
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.question !== undefined){
let data6 = data.question;
const _errs12 = errors;
if(errors === _errs12){
if(data6 && typeof data6 == "object" && !Array.isArray(data6)){
let missing2;
if((data6.type === undefined) && (missing2 = "type")){
validate107.errors = [{instancePath:instancePath+"/question",schemaPath:"#/properties/question/required",keyword:"required",params:{missingProperty: missing2},message:"must have required property '"+missing2+"'"}];
return false;
}
else {
if(data6.type !== undefined){
const _errs14 = errors;
if(!(validate110(data6.type, {instancePath:instancePath+"/question/type",parentData:data6,parentDataProperty:"type",rootData}))){
vErrors = vErrors === null ? validate110.errors : vErrors.concat(validate110.errors);
errors = vErrors.length;
}
var valid2 = _errs14 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data6.text !== undefined){
const _errs15 = errors;
if(typeof data6.text !== "string"){
validate107.errors = [{instancePath:instancePath+"/question/text",schemaPath:"#/properties/question/properties/text/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid2 = _errs15 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data6.targetId !== undefined){
const _errs17 = errors;
if(typeof data6.targetId !== "string"){
validate107.errors = [{instancePath:instancePath+"/question/targetId",schemaPath:"#/properties/question/properties/targetId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid2 = _errs17 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data6.targetLabel !== undefined){
const _errs19 = errors;
if(typeof data6.targetLabel !== "string"){
validate107.errors = [{instancePath:instancePath+"/question/targetLabel",schemaPath:"#/properties/question/properties/targetLabel/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid2 = _errs19 === errors;
}
else {
var valid2 = true;
}
}
}
}
}
}
else {
validate107.errors = [{instancePath:instancePath+"/question",schemaPath:"#/properties/question/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs12 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.targetOutcome !== undefined){
let data11 = data.targetOutcome;
const _errs21 = errors;
if(errors === _errs21){
if(data11 && typeof data11 == "object" && !Array.isArray(data11)){
let missing3;
if(((data11.horizon === undefined) && (missing3 = "horizon")) || ((data11.fields === undefined) && (missing3 = "fields"))){
validate107.errors = [{instancePath:instancePath+"/targetOutcome",schemaPath:"#/properties/targetOutcome/required",keyword:"required",params:{missingProperty: missing3},message:"must have required property '"+missing3+"'"}];
return false;
}
else {
if(data11.horizon !== undefined){
const _errs23 = errors;
if(!(validate112(data11.horizon, {instancePath:instancePath+"/targetOutcome/horizon",parentData:data11,parentDataProperty:"horizon",rootData}))){
vErrors = vErrors === null ? validate112.errors : vErrors.concat(validate112.errors);
errors = vErrors.length;
}
var valid3 = _errs23 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data11.fields !== undefined){
let data13 = data11.fields;
const _errs24 = errors;
if(errors === _errs24){
if(Array.isArray(data13)){
var valid4 = true;
const len0 = data13.length;
for(let i0=0; i0<len0; i0++){
let data14 = data13[i0];
const _errs26 = errors;
if(typeof data14 !== "string"){
validate107.errors = [{instancePath:instancePath+"/targetOutcome/fields/" + i0,schemaPath:"#/properties/targetOutcome/properties/fields/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((((data14 === "state") || (data14 === "task_result")) || (data14 === "usefulness")) || (data14 === "fatigue")) || (data14 === "carryover"))){
validate107.errors = [{instancePath:instancePath+"/targetOutcome/fields/" + i0,schemaPath:"#/properties/targetOutcome/properties/fields/items/enum",keyword:"enum",params:{allowedValues: schema46.properties.targetOutcome.properties.fields.items.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid4 = _errs26 === errors;
if(!valid4){
break;
}
}
}
else {
validate107.errors = [{instancePath:instancePath+"/targetOutcome/fields",schemaPath:"#/properties/targetOutcome/properties/fields/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid3 = _errs24 === errors;
}
else {
var valid3 = true;
}
}
}
}
else {
validate107.errors = [{instancePath:instancePath+"/targetOutcome",schemaPath:"#/properties/targetOutcome/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs21 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.time !== undefined){
const _errs28 = errors;
if(!(validate114(data.time, {instancePath:instancePath+"/time",parentData:data,parentDataProperty:"time",rootData}))){
vErrors = vErrors === null ? validate114.errors : vErrors.concat(validate114.errors);
errors = vErrors.length;
}
var valid0 = _errs28 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.contextSnapshot !== undefined){
const _errs29 = errors;
if(!(validate116(data.contextSnapshot, {instancePath:instancePath+"/contextSnapshot",parentData:data,parentDataProperty:"contextSnapshot",rootData}))){
vErrors = vErrors === null ? validate116.errors : vErrors.concat(validate116.errors);
errors = vErrors.length;
}
var valid0 = _errs29 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.missingContext !== undefined){
let data17 = data.missingContext;
const _errs30 = errors;
if(errors === _errs30){
if(Array.isArray(data17)){
var valid5 = true;
const len1 = data17.length;
for(let i1=0; i1<len1; i1++){
const _errs32 = errors;
if(!(validate126(data17[i1], {instancePath:instancePath+"/missingContext/" + i1,parentData:data17,parentDataProperty:i1,rootData}))){
vErrors = vErrors === null ? validate126.errors : vErrors.concat(validate126.errors);
errors = vErrors.length;
}
var valid5 = _errs32 === errors;
if(!valid5){
break;
}
}
}
else {
validate107.errors = [{instancePath:instancePath+"/missingContext",schemaPath:"#/properties/missingContext/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs30 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.contextSources !== undefined){
let data19 = data.contextSources;
const _errs33 = errors;
if(errors === _errs33){
if(Array.isArray(data19)){
var valid6 = true;
const len2 = data19.length;
for(let i2=0; i2<len2; i2++){
const _errs35 = errors;
if(!(validate122(data19[i2], {instancePath:instancePath+"/contextSources/" + i2,parentData:data19,parentDataProperty:i2,rootData}))){
vErrors = vErrors === null ? validate122.errors : vErrors.concat(validate122.errors);
errors = vErrors.length;
}
var valid6 = _errs35 === errors;
if(!valid6){
break;
}
}
}
else {
validate107.errors = [{instancePath:instancePath+"/contextSources",schemaPath:"#/properties/contextSources/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs33 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.candidateActions !== undefined){
let data21 = data.candidateActions;
const _errs36 = errors;
if(errors === _errs36){
if(Array.isArray(data21)){
var valid7 = true;
const len3 = data21.length;
for(let i3=0; i3<len3; i3++){
const _errs38 = errors;
if(!(validate129(data21[i3], {instancePath:instancePath+"/candidateActions/" + i3,parentData:data21,parentDataProperty:i3,rootData}))){
vErrors = vErrors === null ? validate129.errors : vErrors.concat(validate129.errors);
errors = vErrors.length;
}
var valid7 = _errs38 === errors;
if(!valid7){
break;
}
}
}
else {
validate107.errors = [{instancePath:instancePath+"/candidateActions",schemaPath:"#/properties/candidateActions/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs36 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.selectedActionId !== undefined){
const _errs39 = errors;
if(typeof data.selectedActionId !== "string"){
validate107.errors = [{instancePath:instancePath+"/selectedActionId",schemaPath:"#/properties/selectedActionId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs39 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.evidencePacket !== undefined){
const _errs41 = errors;
if(!(validate142(data.evidencePacket, {instancePath:instancePath+"/evidencePacket",parentData:data,parentDataProperty:"evidencePacket",rootData}))){
vErrors = vErrors === null ? validate142.errors : vErrors.concat(validate142.errors);
errors = vErrors.length;
}
var valid0 = _errs41 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.limitations !== undefined){
let data25 = data.limitations;
const _errs42 = errors;
if(errors === _errs42){
if(Array.isArray(data25)){
var valid8 = true;
const len4 = data25.length;
for(let i4=0; i4<len4; i4++){
const _errs44 = errors;
if(typeof data25[i4] !== "string"){
validate107.errors = [{instancePath:instancePath+"/limitations/" + i4,schemaPath:"#/properties/limitations/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid8 = _errs44 === errors;
if(!valid8){
break;
}
}
}
else {
validate107.errors = [{instancePath:instancePath+"/limitations",schemaPath:"#/properties/limitations/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs42 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.safetyStatus !== undefined){
const _errs46 = errors;
if(!(validate146(data.safetyStatus, {instancePath:instancePath+"/safetyStatus",parentData:data,parentDataProperty:"safetyStatus",rootData}))){
vErrors = vErrors === null ? validate146.errors : vErrors.concat(validate146.errors);
errors = vErrors.length;
}
var valid0 = _errs46 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.proposedPlanPatch !== undefined){
const _errs47 = errors;
if(!(validate131(data.proposedPlanPatch, {instancePath:instancePath+"/proposedPlanPatch",parentData:data,parentDataProperty:"proposedPlanPatch",rootData}))){
vErrors = vErrors === null ? validate131.errors : vErrors.concat(validate131.errors);
errors = vErrors.length;
}
var valid0 = _errs47 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.appliedPlanPatch !== undefined){
const _errs48 = errors;
if(!(validate131(data.appliedPlanPatch, {instancePath:instancePath+"/appliedPlanPatch",parentData:data,parentDataProperty:"appliedPlanPatch",rootData}))){
vErrors = vErrors === null ? validate131.errors : vErrors.concat(validate131.errors);
errors = vErrors.length;
}
var valid0 = _errs48 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.undoState !== undefined){
const _errs49 = errors;
if(!(validate150(data.undoState, {instancePath:instancePath+"/undoState",parentData:data,parentDataProperty:"undoState",rootData}))){
vErrors = vErrors === null ? validate150.errors : vErrors.concat(validate150.errors);
errors = vErrors.length;
}
var valid0 = _errs49 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.followUpPlan !== undefined){
const _errs50 = errors;
if(!(validate152(data.followUpPlan, {instancePath:instancePath+"/followUpPlan",parentData:data,parentDataProperty:"followUpPlan",rootData}))){
vErrors = vErrors === null ? validate152.errors : vErrors.concat(validate152.errors);
errors = vErrors.length;
}
var valid0 = _errs50 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.followUpOutcomes !== undefined){
let data32 = data.followUpOutcomes;
const _errs51 = errors;
if(errors === _errs51){
if(Array.isArray(data32)){
var valid9 = true;
const len5 = data32.length;
for(let i5=0; i5<len5; i5++){
const _errs53 = errors;
if(!(validate155(data32[i5], {instancePath:instancePath+"/followUpOutcomes/" + i5,parentData:data32,parentDataProperty:i5,rootData}))){
vErrors = vErrors === null ? validate155.errors : vErrors.concat(validate155.errors);
errors = vErrors.length;
}
var valid9 = _errs53 === errors;
if(!valid9){
break;
}
}
}
else {
validate107.errors = [{instancePath:instancePath+"/followUpOutcomes",schemaPath:"#/properties/followUpOutcomes/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs51 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.leverage !== undefined){
const _errs54 = errors;
if(!(validate161(data.leverage, {instancePath:instancePath+"/leverage",parentData:data,parentDataProperty:"leverage",rootData}))){
vErrors = vErrors === null ? validate161.errors : vErrors.concat(validate161.errors);
errors = vErrors.length;
}
var valid0 = _errs54 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.provenance !== undefined){
let data35 = data.provenance;
const _errs55 = errors;
if(errors === _errs55){
if(data35 && typeof data35 == "object" && !Array.isArray(data35)){
let missing4;
if(((((data35.origin === undefined) && (missing4 = "origin")) || ((data35.sourceIds === undefined) && (missing4 = "sourceIds"))) || ((data35.syntheticOnly === undefined) && (missing4 = "syntheticOnly"))) || ((data35.containsRealUserData === undefined) && (missing4 = "containsRealUserData"))){
validate107.errors = [{instancePath:instancePath+"/provenance",schemaPath:"#/properties/provenance/required",keyword:"required",params:{missingProperty: missing4},message:"must have required property '"+missing4+"'"}];
return false;
}
else {
if(data35.origin !== undefined){
const _errs57 = errors;
if(!(validate76(data35.origin, {instancePath:instancePath+"/provenance/origin",parentData:data35,parentDataProperty:"origin",rootData}))){
vErrors = vErrors === null ? validate76.errors : vErrors.concat(validate76.errors);
errors = vErrors.length;
}
var valid10 = _errs57 === errors;
}
else {
var valid10 = true;
}
if(valid10){
if(data35.sourceIds !== undefined){
let data37 = data35.sourceIds;
const _errs58 = errors;
if(errors === _errs58){
if(Array.isArray(data37)){
var valid11 = true;
const len6 = data37.length;
for(let i6=0; i6<len6; i6++){
const _errs60 = errors;
if(typeof data37[i6] !== "string"){
validate107.errors = [{instancePath:instancePath+"/provenance/sourceIds/" + i6,schemaPath:"#/properties/provenance/properties/sourceIds/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid11 = _errs60 === errors;
if(!valid11){
break;
}
}
}
else {
validate107.errors = [{instancePath:instancePath+"/provenance/sourceIds",schemaPath:"#/properties/provenance/properties/sourceIds/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid10 = _errs58 === errors;
}
else {
var valid10 = true;
}
if(valid10){
if(data35.syntheticOnly !== undefined){
const _errs62 = errors;
if(typeof data35.syntheticOnly !== "boolean"){
validate107.errors = [{instancePath:instancePath+"/provenance/syntheticOnly",schemaPath:"#/properties/provenance/properties/syntheticOnly/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid10 = _errs62 === errors;
}
else {
var valid10 = true;
}
if(valid10){
if(data35.containsRealUserData !== undefined){
const _errs64 = errors;
if(typeof data35.containsRealUserData !== "boolean"){
validate107.errors = [{instancePath:instancePath+"/provenance/containsRealUserData",schemaPath:"#/properties/provenance/properties/containsRealUserData/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid10 = _errs64 === errors;
}
else {
var valid10 = true;
}
}
}
}
}
}
else {
validate107.errors = [{instancePath:instancePath+"/provenance",schemaPath:"#/properties/provenance/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs55 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.methodVersion !== undefined){
let data41 = data.methodVersion;
const _errs66 = errors;
if(typeof data41 !== "string"){
validate107.errors = [{instancePath:instancePath+"/methodVersion",schemaPath:"#/properties/methodVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("questlife.decision.policy.v1" !== data41){
validate107.errors = [{instancePath:instancePath+"/methodVersion",schemaPath:"#/properties/methodVersion/const",keyword:"const",params:{allowedValue: "questlife.decision.policy.v1"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs66 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.createdAt !== undefined){
const _errs68 = errors;
if(typeof data.createdAt !== "string"){
validate107.errors = [{instancePath:instancePath+"/createdAt",schemaPath:"#/properties/createdAt/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs68 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.updatedAt !== undefined){
const _errs70 = errors;
if(typeof data.updatedAt !== "string"){
validate107.errors = [{instancePath:instancePath+"/updatedAt",schemaPath:"#/properties/updatedAt/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs70 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate107.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate107.errors = vErrors;
return errors === 0;
}


function validate106(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((((data.id === undefined) && (missing0 = "id")) || ((data.createdAt === undefined) && (missing0 = "createdAt"))) || ((data.mode === undefined) && (missing0 = "mode"))) || ((data.trigger === undefined) && (missing0 = "trigger"))) || ((data.source === undefined) && (missing0 = "source"))) || ((data.schemaVersion === undefined) && (missing0 = "schemaVersion"))) || ((data.headlineInsight === undefined) && (missing0 = "headlineInsight"))){
validate106.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.id !== undefined){
const _errs1 = errors;
if(typeof data.id !== "string"){
validate106.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.createdAt !== undefined){
const _errs3 = errors;
if(typeof data.createdAt !== "string"){
validate106.errors = [{instancePath:instancePath+"/createdAt",schemaPath:"#/properties/createdAt/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.mode !== undefined){
let data2 = data.mode;
const _errs5 = errors;
if(typeof data2 !== "string"){
validate106.errors = [{instancePath:instancePath+"/mode",schemaPath:"#/properties/mode/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((data2 === "instant_micro") || (data2 === "daily_brief"))){
validate106.errors = [{instancePath:instancePath+"/mode",schemaPath:"#/properties/mode/enum",keyword:"enum",params:{allowedValues: schema45.properties.mode.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.trigger !== undefined){
let data3 = data.trigger;
const _errs7 = errors;
if(typeof data3 !== "string"){
validate106.errors = [{instancePath:instancePath+"/trigger",schemaPath:"#/properties/trigger/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((((data3 === "state_checkin") || (data3 === "manual")) || (data3 === "morning_push")) || (data3 === "debug"))){
validate106.errors = [{instancePath:instancePath+"/trigger",schemaPath:"#/properties/trigger/enum",keyword:"enum",params:{allowedValues: schema45.properties.trigger.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.source !== undefined){
let data4 = data.source;
const _errs9 = errors;
if(typeof data4 !== "string"){
validate106.errors = [{instancePath:instancePath+"/source",schemaPath:"#/properties/source/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((data4 === "ai") || (data4 === "legacy_fallback")) || (data4 === "ai_failed_fallback"))){
validate106.errors = [{instancePath:instancePath+"/source",schemaPath:"#/properties/source/enum",keyword:"enum",params:{allowedValues: schema45.properties.source.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.schemaVersion !== undefined){
const _errs11 = errors;
if(typeof data.schemaVersion !== "string"){
validate106.errors = [{instancePath:instancePath+"/schemaVersion",schemaPath:"#/properties/schemaVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.headlineInsight !== undefined){
const _errs13 = errors;
if(typeof data.headlineInsight !== "string"){
validate106.errors = [{instancePath:instancePath+"/headlineInsight",schemaPath:"#/properties/headlineInsight/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.readinessBand !== undefined){
let data7 = data.readinessBand;
const _errs15 = errors;
if(typeof data7 !== "string"){
validate106.errors = [{instancePath:instancePath+"/readinessBand",schemaPath:"#/properties/readinessBand/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((((data7 === "green") || (data7 === "yellow")) || (data7 === "red")) || (data7 === "unknown"))){
validate106.errors = [{instancePath:instancePath+"/readinessBand",schemaPath:"#/properties/readinessBand/enum",keyword:"enum",params:{allowedValues: schema45.properties.readinessBand.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs15 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.readinessScore !== undefined){
const _errs17 = errors;
if(!(typeof data.readinessScore == "number")){
validate106.errors = [{instancePath:instancePath+"/readinessScore",schemaPath:"#/properties/readinessScore/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs17 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.firstStep !== undefined){
let data9 = data.firstStep;
const _errs19 = errors;
if(errors === _errs19){
if(data9 && typeof data9 == "object" && !Array.isArray(data9)){
let missing1;
if((data9.step === undefined) && (missing1 = "step")){
validate106.errors = [{instancePath:instancePath+"/firstStep",schemaPath:"#/properties/firstStep/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
if(data9.step !== undefined){
const _errs21 = errors;
if(typeof data9.step !== "string"){
validate106.errors = [{instancePath:instancePath+"/firstStep/step",schemaPath:"#/properties/firstStep/properties/step/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid1 = _errs21 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data9.why !== undefined){
const _errs23 = errors;
if(typeof data9.why !== "string"){
validate106.errors = [{instancePath:instancePath+"/firstStep/why",schemaPath:"#/properties/firstStep/properties/why/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid1 = _errs23 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data9.durationMin !== undefined){
const _errs25 = errors;
if(!(typeof data9.durationMin == "number")){
validate106.errors = [{instancePath:instancePath+"/firstStep/durationMin",schemaPath:"#/properties/firstStep/properties/durationMin/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid1 = _errs25 === errors;
}
else {
var valid1 = true;
}
}
}
}
}
else {
validate106.errors = [{instancePath:instancePath+"/firstStep",schemaPath:"#/properties/firstStep/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs19 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.doNot !== undefined){
let data13 = data.doNot;
const _errs27 = errors;
if(errors === _errs27){
if(Array.isArray(data13)){
var valid2 = true;
const len0 = data13.length;
for(let i0=0; i0<len0; i0++){
const _errs29 = errors;
if(typeof data13[i0] !== "string"){
validate106.errors = [{instancePath:instancePath+"/doNot/" + i0,schemaPath:"#/properties/doNot/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid2 = _errs29 === errors;
if(!valid2){
break;
}
}
}
else {
validate106.errors = [{instancePath:instancePath+"/doNot",schemaPath:"#/properties/doNot/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs27 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.perceptionGapDetected !== undefined){
const _errs31 = errors;
if(typeof data.perceptionGapDetected !== "boolean"){
validate106.errors = [{instancePath:instancePath+"/perceptionGapDetected",schemaPath:"#/properties/perceptionGapDetected/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs31 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.evidenceBasis !== undefined){
let data16 = data.evidenceBasis;
const _errs33 = errors;
if(typeof data16 !== "string"){
validate106.errors = [{instancePath:instancePath+"/evidenceBasis",schemaPath:"#/properties/evidenceBasis/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((data16 === "population_prior") || (data16 === "personal_pattern")) || (data16 === "mixed"))){
validate106.errors = [{instancePath:instancePath+"/evidenceBasis",schemaPath:"#/properties/evidenceBasis/enum",keyword:"enum",params:{allowedValues: schema45.properties.evidenceBasis.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs33 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.confidence !== undefined){
const _errs35 = errors;
if(!(typeof data.confidence == "number")){
validate106.errors = [{instancePath:instancePath+"/confidence",schemaPath:"#/properties/confidence/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs35 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.quality !== undefined){
let data18 = data.quality;
const _errs37 = errors;
if(errors === _errs37){
if(data18 && typeof data18 == "object" && !Array.isArray(data18)){
let missing2;
if(((((data18.score === undefined) && (missing2 = "score")) || ((data18.grade === undefined) && (missing2 = "grade"))) || ((data18.failedCheckIds === undefined) && (missing2 = "failedCheckIds"))) || ((data18.flags === undefined) && (missing2 = "flags"))){
validate106.errors = [{instancePath:instancePath+"/quality",schemaPath:"#/properties/quality/required",keyword:"required",params:{missingProperty: missing2},message:"must have required property '"+missing2+"'"}];
return false;
}
else {
if(data18.score !== undefined){
const _errs39 = errors;
if(!(typeof data18.score == "number")){
validate106.errors = [{instancePath:instancePath+"/quality/score",schemaPath:"#/properties/quality/properties/score/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid3 = _errs39 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data18.grade !== undefined){
let data20 = data18.grade;
const _errs41 = errors;
if(typeof data20 !== "string"){
validate106.errors = [{instancePath:instancePath+"/quality/grade",schemaPath:"#/properties/quality/properties/grade/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((((data20 === "excellent") || (data20 === "good")) || (data20 === "weak")) || (data20 === "bad"))){
validate106.errors = [{instancePath:instancePath+"/quality/grade",schemaPath:"#/properties/quality/properties/grade/enum",keyword:"enum",params:{allowedValues: schema45.properties.quality.properties.grade.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid3 = _errs41 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data18.failedCheckIds !== undefined){
let data21 = data18.failedCheckIds;
const _errs43 = errors;
if(errors === _errs43){
if(Array.isArray(data21)){
var valid4 = true;
const len1 = data21.length;
for(let i1=0; i1<len1; i1++){
const _errs45 = errors;
if(typeof data21[i1] !== "string"){
validate106.errors = [{instancePath:instancePath+"/quality/failedCheckIds/" + i1,schemaPath:"#/properties/quality/properties/failedCheckIds/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid4 = _errs45 === errors;
if(!valid4){
break;
}
}
}
else {
validate106.errors = [{instancePath:instancePath+"/quality/failedCheckIds",schemaPath:"#/properties/quality/properties/failedCheckIds/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid3 = _errs43 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data18.flags !== undefined){
let data23 = data18.flags;
const _errs47 = errors;
if(errors === _errs47){
if(data23 && typeof data23 == "object" && !Array.isArray(data23)){
if(data23.generic !== undefined){
const _errs49 = errors;
if(typeof data23.generic !== "boolean"){
validate106.errors = [{instancePath:instancePath+"/quality/flags/generic",schemaPath:"#/properties/quality/properties/flags/properties/generic/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid5 = _errs49 === errors;
}
else {
var valid5 = true;
}
if(valid5){
if(data23.missingEvidence !== undefined){
const _errs51 = errors;
if(typeof data23.missingEvidence !== "boolean"){
validate106.errors = [{instancePath:instancePath+"/quality/flags/missingEvidence",schemaPath:"#/properties/quality/properties/flags/properties/missingEvidence/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid5 = _errs51 === errors;
}
else {
var valid5 = true;
}
if(valid5){
if(data23.missingFirstStep !== undefined){
const _errs53 = errors;
if(typeof data23.missingFirstStep !== "boolean"){
validate106.errors = [{instancePath:instancePath+"/quality/flags/missingFirstStep",schemaPath:"#/properties/quality/properties/flags/properties/missingFirstStep/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid5 = _errs53 === errors;
}
else {
var valid5 = true;
}
if(valid5){
if(data23.overclaiming !== undefined){
const _errs55 = errors;
if(typeof data23.overclaiming !== "boolean"){
validate106.errors = [{instancePath:instancePath+"/quality/flags/overclaiming",schemaPath:"#/properties/quality/properties/flags/properties/overclaiming/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid5 = _errs55 === errors;
}
else {
var valid5 = true;
}
if(valid5){
if(data23.medicalRisk !== undefined){
const _errs57 = errors;
if(typeof data23.medicalRisk !== "boolean"){
validate106.errors = [{instancePath:instancePath+"/quality/flags/medicalRisk",schemaPath:"#/properties/quality/properties/flags/properties/medicalRisk/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid5 = _errs57 === errors;
}
else {
var valid5 = true;
}
if(valid5){
if(data23.tooVerbose !== undefined){
const _errs59 = errors;
if(typeof data23.tooVerbose !== "boolean"){
validate106.errors = [{instancePath:instancePath+"/quality/flags/tooVerbose",schemaPath:"#/properties/quality/properties/flags/properties/tooVerbose/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid5 = _errs59 === errors;
}
else {
var valid5 = true;
}
if(valid5){
if(data23.tooVague !== undefined){
const _errs61 = errors;
if(typeof data23.tooVague !== "boolean"){
validate106.errors = [{instancePath:instancePath+"/quality/flags/tooVague",schemaPath:"#/properties/quality/properties/flags/properties/tooVague/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid5 = _errs61 === errors;
}
else {
var valid5 = true;
}
if(valid5){
if(data23.ignoredAcceptedPatterns !== undefined){
const _errs63 = errors;
if(typeof data23.ignoredAcceptedPatterns !== "boolean"){
validate106.errors = [{instancePath:instancePath+"/quality/flags/ignoredAcceptedPatterns",schemaPath:"#/properties/quality/properties/flags/properties/ignoredAcceptedPatterns/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid5 = _errs63 === errors;
}
else {
var valid5 = true;
}
if(valid5){
if(data23.candidateMisuse !== undefined){
const _errs65 = errors;
if(typeof data23.candidateMisuse !== "boolean"){
validate106.errors = [{instancePath:instancePath+"/quality/flags/candidateMisuse",schemaPath:"#/properties/quality/properties/flags/properties/candidateMisuse/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid5 = _errs65 === errors;
}
else {
var valid5 = true;
}
if(valid5){
if(data23.acceptedPatternGrounded !== undefined){
const _errs67 = errors;
if(typeof data23.acceptedPatternGrounded !== "boolean"){
validate106.errors = [{instancePath:instancePath+"/quality/flags/acceptedPatternGrounded",schemaPath:"#/properties/quality/properties/flags/properties/acceptedPatternGrounded/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid5 = _errs67 === errors;
}
else {
var valid5 = true;
}
}
}
}
}
}
}
}
}
}
}
else {
validate106.errors = [{instancePath:instancePath+"/quality/flags",schemaPath:"#/properties/quality/properties/flags/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid3 = _errs47 === errors;
}
else {
var valid3 = true;
}
}
}
}
}
}
else {
validate106.errors = [{instancePath:instancePath+"/quality",schemaPath:"#/properties/quality/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs37 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.meta !== undefined){
let data34 = data.meta;
const _errs69 = errors;
if(errors === _errs69){
if(data34 && typeof data34 == "object" && !Array.isArray(data34)){
if(data34.model !== undefined){
const _errs71 = errors;
if(typeof data34.model !== "string"){
validate106.errors = [{instancePath:instancePath+"/meta/model",schemaPath:"#/properties/meta/properties/model/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid6 = _errs71 === errors;
}
else {
var valid6 = true;
}
if(valid6){
if(data34.finishReason !== undefined){
const _errs73 = errors;
if(typeof data34.finishReason !== "string"){
validate106.errors = [{instancePath:instancePath+"/meta/finishReason",schemaPath:"#/properties/meta/properties/finishReason/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid6 = _errs73 === errors;
}
else {
var valid6 = true;
}
if(valid6){
if(data34.evidenceRichness !== undefined){
let data37 = data34.evidenceRichness;
const _errs75 = errors;
if(typeof data37 !== "string"){
validate106.errors = [{instancePath:instancePath+"/meta/evidenceRichness",schemaPath:"#/properties/meta/properties/evidenceRichness/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((((data37 === "none") || (data37 === "sparse")) || (data37 === "usable")) || (data37 === "rich"))){
validate106.errors = [{instancePath:instancePath+"/meta/evidenceRichness",schemaPath:"#/properties/meta/properties/evidenceRichness/enum",keyword:"enum",params:{allowedValues: schema45.properties.meta.properties.evidenceRichness.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid6 = _errs75 === errors;
}
else {
var valid6 = true;
}
if(valid6){
if(data34.endpointOk !== undefined){
const _errs77 = errors;
if(typeof data34.endpointOk !== "boolean"){
validate106.errors = [{instancePath:instancePath+"/meta/endpointOk",schemaPath:"#/properties/meta/properties/endpointOk/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid6 = _errs77 === errors;
}
else {
var valid6 = true;
}
}
}
}
}
else {
validate106.errors = [{instancePath:instancePath+"/meta",schemaPath:"#/properties/meta/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs69 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.userFeedback !== undefined){
let data39 = data.userFeedback;
const _errs79 = errors;
if(errors === _errs79){
if(data39 && typeof data39 == "object" && !Array.isArray(data39)){
let missing3;
if(((data39.rating === undefined) && (missing3 = "rating")) || ((data39.ts === undefined) && (missing3 = "ts"))){
validate106.errors = [{instancePath:instancePath+"/userFeedback",schemaPath:"#/properties/userFeedback/required",keyword:"required",params:{missingProperty: missing3},message:"must have required property '"+missing3+"'"}];
return false;
}
else {
if(data39.rating !== undefined){
let data40 = data39.rating;
const _errs81 = errors;
if(typeof data40 !== "string"){
validate106.errors = [{instancePath:instancePath+"/userFeedback/rating",schemaPath:"#/properties/userFeedback/properties/rating/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((data40 === "useful") || (data40 === "not_useful"))){
validate106.errors = [{instancePath:instancePath+"/userFeedback/rating",schemaPath:"#/properties/userFeedback/properties/rating/enum",keyword:"enum",params:{allowedValues: schema45.properties.userFeedback.properties.rating.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid7 = _errs81 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data39.ts !== undefined){
const _errs83 = errors;
if(typeof data39.ts !== "string"){
validate106.errors = [{instancePath:instancePath+"/userFeedback/ts",schemaPath:"#/properties/userFeedback/properties/ts/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid7 = _errs83 === errors;
}
else {
var valid7 = true;
}
}
}
}
else {
validate106.errors = [{instancePath:instancePath+"/userFeedback",schemaPath:"#/properties/userFeedback/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs79 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.decisionEpisode !== undefined){
const _errs85 = errors;
if(!(validate107(data.decisionEpisode, {instancePath:instancePath+"/decisionEpisode",parentData:data,parentDataProperty:"decisionEpisode",rootData}))){
vErrors = vErrors === null ? validate107.errors : vErrors.concat(validate107.errors);
errors = vErrors.length;
}
var valid0 = _errs85 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.dataProvenance !== undefined){
const _errs86 = errors;
if(!(validate75(data.dataProvenance, {instancePath:instancePath+"/dataProvenance",parentData:data,parentDataProperty:"dataProvenance",rootData}))){
vErrors = vErrors === null ? validate75.errors : vErrors.concat(validate75.errors);
errors = vErrors.length;
}
var valid0 = _errs86 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate106.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate106.errors = vErrors;
return errors === 0;
}

const schema68 = {"type":"object","properties":{"id":{"type":"string"},"createdAt":{"type":"string"},"updatedAt":{"type":"string"},"status":{"type":"string","enum":["candidate","accepted","rejected","archived"]},"label":{"type":"string"},"description":{"type":"string"},"patternType":{"type":"string","enum":["action_state_effect","context_state_effect","decision_feedback","schedule_timing","recovery_readiness","execution_quality","perception_gap","other"]},"evidenceBasis":{"type":"string","enum":["personal_pattern","mixed","population_prior"]},"confidence":{"type":"number"},"sampleN":{"type":"number"},"support":{"type":"array","items":{"$ref":"#/definitions/PatternMemorySupport"}},"caution":{"type":"string"},"lastSeenAt":{"type":"string"},"usefulness":{"type":"object","properties":{"usefulCount":{"type":"number"},"notUsefulCount":{"type":"number"}},"required":["usefulCount","notUsefulCount"]},"dataProvenance":{"$ref":"#/definitions/DataRecordProvenance"}},"required":["id","createdAt","updatedAt","status","label","description","patternType","evidenceBasis","confidence","sampleN","support"]};
const schema69 = {"type":"object","properties":{"sourceType":{"type":"string","enum":["execution","state","context","decision_result","after_state"]},"sourceId":{"type":"string"},"ts":{"type":"string"},"summary":{"type":"string"}},"required":["sourceType","summary"]};

function validate168(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((data.sourceType === undefined) && (missing0 = "sourceType")) || ((data.summary === undefined) && (missing0 = "summary"))){
validate168.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.sourceType !== undefined){
let data0 = data.sourceType;
const _errs1 = errors;
if(typeof data0 !== "string"){
validate168.errors = [{instancePath:instancePath+"/sourceType",schemaPath:"#/properties/sourceType/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((((data0 === "execution") || (data0 === "state")) || (data0 === "context")) || (data0 === "decision_result")) || (data0 === "after_state"))){
validate168.errors = [{instancePath:instancePath+"/sourceType",schemaPath:"#/properties/sourceType/enum",keyword:"enum",params:{allowedValues: schema69.properties.sourceType.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.sourceId !== undefined){
const _errs3 = errors;
if(typeof data.sourceId !== "string"){
validate168.errors = [{instancePath:instancePath+"/sourceId",schemaPath:"#/properties/sourceId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.ts !== undefined){
const _errs5 = errors;
if(typeof data.ts !== "string"){
validate168.errors = [{instancePath:instancePath+"/ts",schemaPath:"#/properties/ts/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.summary !== undefined){
const _errs7 = errors;
if(typeof data.summary !== "string"){
validate168.errors = [{instancePath:instancePath+"/summary",schemaPath:"#/properties/summary/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
else {
validate168.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate168.errors = vErrors;
return errors === 0;
}


function validate167(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((((((((data.id === undefined) && (missing0 = "id")) || ((data.createdAt === undefined) && (missing0 = "createdAt"))) || ((data.updatedAt === undefined) && (missing0 = "updatedAt"))) || ((data.status === undefined) && (missing0 = "status"))) || ((data.label === undefined) && (missing0 = "label"))) || ((data.description === undefined) && (missing0 = "description"))) || ((data.patternType === undefined) && (missing0 = "patternType"))) || ((data.evidenceBasis === undefined) && (missing0 = "evidenceBasis"))) || ((data.confidence === undefined) && (missing0 = "confidence"))) || ((data.sampleN === undefined) && (missing0 = "sampleN"))) || ((data.support === undefined) && (missing0 = "support"))){
validate167.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.id !== undefined){
const _errs1 = errors;
if(typeof data.id !== "string"){
validate167.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.createdAt !== undefined){
const _errs3 = errors;
if(typeof data.createdAt !== "string"){
validate167.errors = [{instancePath:instancePath+"/createdAt",schemaPath:"#/properties/createdAt/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.updatedAt !== undefined){
const _errs5 = errors;
if(typeof data.updatedAt !== "string"){
validate167.errors = [{instancePath:instancePath+"/updatedAt",schemaPath:"#/properties/updatedAt/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.status !== undefined){
let data3 = data.status;
const _errs7 = errors;
if(typeof data3 !== "string"){
validate167.errors = [{instancePath:instancePath+"/status",schemaPath:"#/properties/status/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((((data3 === "candidate") || (data3 === "accepted")) || (data3 === "rejected")) || (data3 === "archived"))){
validate167.errors = [{instancePath:instancePath+"/status",schemaPath:"#/properties/status/enum",keyword:"enum",params:{allowedValues: schema68.properties.status.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.label !== undefined){
const _errs9 = errors;
if(typeof data.label !== "string"){
validate167.errors = [{instancePath:instancePath+"/label",schemaPath:"#/properties/label/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.description !== undefined){
const _errs11 = errors;
if(typeof data.description !== "string"){
validate167.errors = [{instancePath:instancePath+"/description",schemaPath:"#/properties/description/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.patternType !== undefined){
let data6 = data.patternType;
const _errs13 = errors;
if(typeof data6 !== "string"){
validate167.errors = [{instancePath:instancePath+"/patternType",schemaPath:"#/properties/patternType/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((((((((data6 === "action_state_effect") || (data6 === "context_state_effect")) || (data6 === "decision_feedback")) || (data6 === "schedule_timing")) || (data6 === "recovery_readiness")) || (data6 === "execution_quality")) || (data6 === "perception_gap")) || (data6 === "other"))){
validate167.errors = [{instancePath:instancePath+"/patternType",schemaPath:"#/properties/patternType/enum",keyword:"enum",params:{allowedValues: schema68.properties.patternType.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.evidenceBasis !== undefined){
let data7 = data.evidenceBasis;
const _errs15 = errors;
if(typeof data7 !== "string"){
validate167.errors = [{instancePath:instancePath+"/evidenceBasis",schemaPath:"#/properties/evidenceBasis/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((data7 === "personal_pattern") || (data7 === "mixed")) || (data7 === "population_prior"))){
validate167.errors = [{instancePath:instancePath+"/evidenceBasis",schemaPath:"#/properties/evidenceBasis/enum",keyword:"enum",params:{allowedValues: schema68.properties.evidenceBasis.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs15 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.confidence !== undefined){
const _errs17 = errors;
if(!(typeof data.confidence == "number")){
validate167.errors = [{instancePath:instancePath+"/confidence",schemaPath:"#/properties/confidence/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs17 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.sampleN !== undefined){
const _errs19 = errors;
if(!(typeof data.sampleN == "number")){
validate167.errors = [{instancePath:instancePath+"/sampleN",schemaPath:"#/properties/sampleN/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs19 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.support !== undefined){
let data10 = data.support;
const _errs21 = errors;
if(errors === _errs21){
if(Array.isArray(data10)){
var valid1 = true;
const len0 = data10.length;
for(let i0=0; i0<len0; i0++){
const _errs23 = errors;
if(!(validate168(data10[i0], {instancePath:instancePath+"/support/" + i0,parentData:data10,parentDataProperty:i0,rootData}))){
vErrors = vErrors === null ? validate168.errors : vErrors.concat(validate168.errors);
errors = vErrors.length;
}
var valid1 = _errs23 === errors;
if(!valid1){
break;
}
}
}
else {
validate167.errors = [{instancePath:instancePath+"/support",schemaPath:"#/properties/support/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs21 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.caution !== undefined){
const _errs24 = errors;
if(typeof data.caution !== "string"){
validate167.errors = [{instancePath:instancePath+"/caution",schemaPath:"#/properties/caution/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs24 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.lastSeenAt !== undefined){
const _errs26 = errors;
if(typeof data.lastSeenAt !== "string"){
validate167.errors = [{instancePath:instancePath+"/lastSeenAt",schemaPath:"#/properties/lastSeenAt/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs26 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.usefulness !== undefined){
let data14 = data.usefulness;
const _errs28 = errors;
if(errors === _errs28){
if(data14 && typeof data14 == "object" && !Array.isArray(data14)){
let missing1;
if(((data14.usefulCount === undefined) && (missing1 = "usefulCount")) || ((data14.notUsefulCount === undefined) && (missing1 = "notUsefulCount"))){
validate167.errors = [{instancePath:instancePath+"/usefulness",schemaPath:"#/properties/usefulness/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
if(data14.usefulCount !== undefined){
const _errs30 = errors;
if(!(typeof data14.usefulCount == "number")){
validate167.errors = [{instancePath:instancePath+"/usefulness/usefulCount",schemaPath:"#/properties/usefulness/properties/usefulCount/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid2 = _errs30 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data14.notUsefulCount !== undefined){
const _errs32 = errors;
if(!(typeof data14.notUsefulCount == "number")){
validate167.errors = [{instancePath:instancePath+"/usefulness/notUsefulCount",schemaPath:"#/properties/usefulness/properties/notUsefulCount/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid2 = _errs32 === errors;
}
else {
var valid2 = true;
}
}
}
}
else {
validate167.errors = [{instancePath:instancePath+"/usefulness",schemaPath:"#/properties/usefulness/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs28 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.dataProvenance !== undefined){
const _errs34 = errors;
if(!(validate75(data.dataProvenance, {instancePath:instancePath+"/dataProvenance",parentData:data,parentDataProperty:"dataProvenance",rootData}))){
vErrors = vErrors === null ? validate75.errors : vErrors.concat(validate75.errors);
errors = vErrors.length;
}
var valid0 = _errs34 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate167.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate167.errors = vErrors;
return errors === 0;
}

const schema70 = {"type":"object","properties":{"id":{"type":"string"},"text":{"type":"string"},"createdAt":{"type":"string"},"parseStatus":{"type":"string","enum":["pending","done","failed"]},"parsed":{"type":"object","properties":{"type":{"type":"string","enum":["training","reading","state","misc"]},"fields":{"type":"object"},"crossLinks":{"type":"array","items":{"type":"object","properties":{"captureId":{"type":"string"},"reason":{"type":"string"}},"required":["captureId","reason"]}},"insight":{"type":"object","properties":{"zh":{"type":"string"},"en":{"type":"string"}},"required":["zh","en"]},"matchedSkillIds":{"type":"array","items":{"type":"string"}},"linkedGoalId":{"type":"string"},"insightType":{"type":"string","enum":["skill_progress","goal_link","cross_link","encourage"]},"entries":{"type":"array","items":{"$ref":"#/definitions/ParsedEntry"}},"entriesDismissed":{"type":"boolean"},"completionSchema":{"$ref":"#/definitions/CompletionSchema"},"parserMeta":{"$ref":"#/definitions/DataParserMetadata"}},"required":["type","fields","crossLinks","insight"]},"dataProvenance":{"$ref":"#/definitions/DataRecordProvenance"}},"required":["id","text","createdAt","parseStatus"]};
const schema71 = {"type":"object","properties":{"skillName":{"type":"string"},"matchedSkillId":{"type":["string","null"]},"goalType":{"type":"string"},"progressType":{"type":"string"},"fields":{"type":"object","properties":{"sets":{"type":"array","items":{"$ref":"#/definitions/ParsedStrengthSet"}},"extraWeight":{"type":"number"},"durationMinutes":{"type":"number"},"note":{"type":"string"},"value":{"type":"number"},"unit":{"type":"string"}}},"qualityRating":{"type":"number"}},"required":["skillName","matchedSkillId","progressType","fields"],"description":"One structured execution item extracted from a natural-language capture. LLM fills only known fields from the template; no invented structure."};
const schema72 = {"type":"object","properties":{"weight":{"type":"number"},"reps":{"type":"number"}},"description":"One strength-training set, component of ParsedEntry.fields.sets"};

function validate175(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.weight !== undefined){
const _errs1 = errors;
if(!(typeof data.weight == "number")){
validate175.errors = [{instancePath:instancePath+"/weight",schemaPath:"#/properties/weight/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.reps !== undefined){
const _errs3 = errors;
if(!(typeof data.reps == "number")){
validate175.errors = [{instancePath:instancePath+"/reps",schemaPath:"#/properties/reps/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
}
}
else {
validate175.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate175.errors = vErrors;
return errors === 0;
}


function validate174(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((data.skillName === undefined) && (missing0 = "skillName")) || ((data.matchedSkillId === undefined) && (missing0 = "matchedSkillId"))) || ((data.progressType === undefined) && (missing0 = "progressType"))) || ((data.fields === undefined) && (missing0 = "fields"))){
validate174.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.skillName !== undefined){
const _errs1 = errors;
if(typeof data.skillName !== "string"){
validate174.errors = [{instancePath:instancePath+"/skillName",schemaPath:"#/properties/skillName/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.matchedSkillId !== undefined){
let data1 = data.matchedSkillId;
const _errs3 = errors;
if((typeof data1 !== "string") && (data1 !== null)){
validate174.errors = [{instancePath:instancePath+"/matchedSkillId",schemaPath:"#/properties/matchedSkillId/type",keyword:"type",params:{type: schema71.properties.matchedSkillId.type},message:"must be string,null"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.goalType !== undefined){
const _errs5 = errors;
if(typeof data.goalType !== "string"){
validate174.errors = [{instancePath:instancePath+"/goalType",schemaPath:"#/properties/goalType/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.progressType !== undefined){
const _errs7 = errors;
if(typeof data.progressType !== "string"){
validate174.errors = [{instancePath:instancePath+"/progressType",schemaPath:"#/properties/progressType/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.fields !== undefined){
let data4 = data.fields;
const _errs9 = errors;
if(errors === _errs9){
if(data4 && typeof data4 == "object" && !Array.isArray(data4)){
if(data4.sets !== undefined){
let data5 = data4.sets;
const _errs11 = errors;
if(errors === _errs11){
if(Array.isArray(data5)){
var valid2 = true;
const len0 = data5.length;
for(let i0=0; i0<len0; i0++){
const _errs13 = errors;
if(!(validate175(data5[i0], {instancePath:instancePath+"/fields/sets/" + i0,parentData:data5,parentDataProperty:i0,rootData}))){
vErrors = vErrors === null ? validate175.errors : vErrors.concat(validate175.errors);
errors = vErrors.length;
}
var valid2 = _errs13 === errors;
if(!valid2){
break;
}
}
}
else {
validate174.errors = [{instancePath:instancePath+"/fields/sets",schemaPath:"#/properties/fields/properties/sets/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid1 = _errs11 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data4.extraWeight !== undefined){
const _errs14 = errors;
if(!(typeof data4.extraWeight == "number")){
validate174.errors = [{instancePath:instancePath+"/fields/extraWeight",schemaPath:"#/properties/fields/properties/extraWeight/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid1 = _errs14 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data4.durationMinutes !== undefined){
const _errs16 = errors;
if(!(typeof data4.durationMinutes == "number")){
validate174.errors = [{instancePath:instancePath+"/fields/durationMinutes",schemaPath:"#/properties/fields/properties/durationMinutes/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid1 = _errs16 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data4.note !== undefined){
const _errs18 = errors;
if(typeof data4.note !== "string"){
validate174.errors = [{instancePath:instancePath+"/fields/note",schemaPath:"#/properties/fields/properties/note/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid1 = _errs18 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data4.value !== undefined){
const _errs20 = errors;
if(!(typeof data4.value == "number")){
validate174.errors = [{instancePath:instancePath+"/fields/value",schemaPath:"#/properties/fields/properties/value/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid1 = _errs20 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data4.unit !== undefined){
const _errs22 = errors;
if(typeof data4.unit !== "string"){
validate174.errors = [{instancePath:instancePath+"/fields/unit",schemaPath:"#/properties/fields/properties/unit/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid1 = _errs22 === errors;
}
else {
var valid1 = true;
}
}
}
}
}
}
}
else {
validate174.errors = [{instancePath:instancePath+"/fields",schemaPath:"#/properties/fields/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.qualityRating !== undefined){
const _errs24 = errors;
if(!(typeof data.qualityRating == "number")){
validate174.errors = [{instancePath:instancePath+"/qualityRating",schemaPath:"#/properties/qualityRating/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs24 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
else {
validate174.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate174.errors = vErrors;
return errors === 0;
}

const schema73 = {"type":"object","properties":{"needsCompletion":{"type":"boolean"},"domain":{"type":"string","enum":["fitness","learning","state","food","other"]},"suggestedActions":{"type":"array","items":{"type":"string"},"description":"Dynamic action/exercise/scope candidates from LLM — NOT a hardcoded list"},"matchedGoalId":{"type":["string","null"]},"matchedModuleId":{"type":["string","null"]},"goalConfidence":{"type":"string","enum":["high","medium","low"]},"shouldCreateGoal":{"type":"boolean"},"newGoalSuggestion":{"anyOf":[{"type":"object","properties":{"name":{"type":"string"},"domain":{"type":"string"}},"required":["name","domain"]},{"type":"null"}]},"durationOptions":{"type":"array","items":{"type":"number"}},"askDuration":{"type":"boolean"}},"required":["needsCompletion","domain","suggestedActions","matchedGoalId","matchedModuleId","goalConfidence","shouldCreateGoal","newGoalSuggestion","durationOptions","askDuration"],"description":"LLM-driven completion schema — replaces hardcoded smartRouting domain logic"};

function validate178(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((((((data.needsCompletion === undefined) && (missing0 = "needsCompletion")) || ((data.domain === undefined) && (missing0 = "domain"))) || ((data.suggestedActions === undefined) && (missing0 = "suggestedActions"))) || ((data.matchedGoalId === undefined) && (missing0 = "matchedGoalId"))) || ((data.matchedModuleId === undefined) && (missing0 = "matchedModuleId"))) || ((data.goalConfidence === undefined) && (missing0 = "goalConfidence"))) || ((data.shouldCreateGoal === undefined) && (missing0 = "shouldCreateGoal"))) || ((data.newGoalSuggestion === undefined) && (missing0 = "newGoalSuggestion"))) || ((data.durationOptions === undefined) && (missing0 = "durationOptions"))) || ((data.askDuration === undefined) && (missing0 = "askDuration"))){
validate178.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.needsCompletion !== undefined){
const _errs1 = errors;
if(typeof data.needsCompletion !== "boolean"){
validate178.errors = [{instancePath:instancePath+"/needsCompletion",schemaPath:"#/properties/needsCompletion/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.domain !== undefined){
let data1 = data.domain;
const _errs3 = errors;
if(typeof data1 !== "string"){
validate178.errors = [{instancePath:instancePath+"/domain",schemaPath:"#/properties/domain/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((((data1 === "fitness") || (data1 === "learning")) || (data1 === "state")) || (data1 === "food")) || (data1 === "other"))){
validate178.errors = [{instancePath:instancePath+"/domain",schemaPath:"#/properties/domain/enum",keyword:"enum",params:{allowedValues: schema73.properties.domain.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.suggestedActions !== undefined){
let data2 = data.suggestedActions;
const _errs5 = errors;
if(errors === _errs5){
if(Array.isArray(data2)){
var valid1 = true;
const len0 = data2.length;
for(let i0=0; i0<len0; i0++){
const _errs7 = errors;
if(typeof data2[i0] !== "string"){
validate178.errors = [{instancePath:instancePath+"/suggestedActions/" + i0,schemaPath:"#/properties/suggestedActions/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid1 = _errs7 === errors;
if(!valid1){
break;
}
}
}
else {
validate178.errors = [{instancePath:instancePath+"/suggestedActions",schemaPath:"#/properties/suggestedActions/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.matchedGoalId !== undefined){
let data4 = data.matchedGoalId;
const _errs9 = errors;
if((typeof data4 !== "string") && (data4 !== null)){
validate178.errors = [{instancePath:instancePath+"/matchedGoalId",schemaPath:"#/properties/matchedGoalId/type",keyword:"type",params:{type: schema73.properties.matchedGoalId.type},message:"must be string,null"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.matchedModuleId !== undefined){
let data5 = data.matchedModuleId;
const _errs11 = errors;
if((typeof data5 !== "string") && (data5 !== null)){
validate178.errors = [{instancePath:instancePath+"/matchedModuleId",schemaPath:"#/properties/matchedModuleId/type",keyword:"type",params:{type: schema73.properties.matchedModuleId.type},message:"must be string,null"}];
return false;
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.goalConfidence !== undefined){
let data6 = data.goalConfidence;
const _errs13 = errors;
if(typeof data6 !== "string"){
validate178.errors = [{instancePath:instancePath+"/goalConfidence",schemaPath:"#/properties/goalConfidence/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((data6 === "high") || (data6 === "medium")) || (data6 === "low"))){
validate178.errors = [{instancePath:instancePath+"/goalConfidence",schemaPath:"#/properties/goalConfidence/enum",keyword:"enum",params:{allowedValues: schema73.properties.goalConfidence.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.shouldCreateGoal !== undefined){
const _errs15 = errors;
if(typeof data.shouldCreateGoal !== "boolean"){
validate178.errors = [{instancePath:instancePath+"/shouldCreateGoal",schemaPath:"#/properties/shouldCreateGoal/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs15 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.newGoalSuggestion !== undefined){
let data8 = data.newGoalSuggestion;
const _errs17 = errors;
const _errs18 = errors;
let valid2 = false;
const _errs19 = errors;
if(errors === _errs19){
if(data8 && typeof data8 == "object" && !Array.isArray(data8)){
let missing1;
if(((data8.name === undefined) && (missing1 = "name")) || ((data8.domain === undefined) && (missing1 = "domain"))){
const err0 = {instancePath:instancePath+"/newGoalSuggestion",schemaPath:"#/properties/newGoalSuggestion/anyOf/0/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
else {
if(data8.name !== undefined){
const _errs21 = errors;
if(typeof data8.name !== "string"){
const err1 = {instancePath:instancePath+"/newGoalSuggestion/name",schemaPath:"#/properties/newGoalSuggestion/anyOf/0/properties/name/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
var valid3 = _errs21 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data8.domain !== undefined){
const _errs23 = errors;
if(typeof data8.domain !== "string"){
const err2 = {instancePath:instancePath+"/newGoalSuggestion/domain",schemaPath:"#/properties/newGoalSuggestion/anyOf/0/properties/domain/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
var valid3 = _errs23 === errors;
}
else {
var valid3 = true;
}
}
}
}
else {
const err3 = {instancePath:instancePath+"/newGoalSuggestion",schemaPath:"#/properties/newGoalSuggestion/anyOf/0/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
var _valid0 = _errs19 === errors;
valid2 = valid2 || _valid0;
if(!valid2){
const _errs25 = errors;
if(data8 !== null){
const err4 = {instancePath:instancePath+"/newGoalSuggestion",schemaPath:"#/properties/newGoalSuggestion/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
var _valid0 = _errs25 === errors;
valid2 = valid2 || _valid0;
}
if(!valid2){
const err5 = {instancePath:instancePath+"/newGoalSuggestion",schemaPath:"#/properties/newGoalSuggestion/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
validate178.errors = vErrors;
return false;
}
else {
errors = _errs18;
if(vErrors !== null){
if(_errs18){
vErrors.length = _errs18;
}
else {
vErrors = null;
}
}
}
var valid0 = _errs17 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.durationOptions !== undefined){
let data11 = data.durationOptions;
const _errs27 = errors;
if(errors === _errs27){
if(Array.isArray(data11)){
var valid4 = true;
const len1 = data11.length;
for(let i1=0; i1<len1; i1++){
const _errs29 = errors;
if(!(typeof data11[i1] == "number")){
validate178.errors = [{instancePath:instancePath+"/durationOptions/" + i1,schemaPath:"#/properties/durationOptions/items/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid4 = _errs29 === errors;
if(!valid4){
break;
}
}
}
else {
validate178.errors = [{instancePath:instancePath+"/durationOptions",schemaPath:"#/properties/durationOptions/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs27 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.askDuration !== undefined){
const _errs31 = errors;
if(typeof data.askDuration !== "boolean"){
validate178.errors = [{instancePath:instancePath+"/askDuration",schemaPath:"#/properties/askDuration/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs31 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate178.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate178.errors = vErrors;
return errors === 0;
}


function validate173(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((data.id === undefined) && (missing0 = "id")) || ((data.text === undefined) && (missing0 = "text"))) || ((data.createdAt === undefined) && (missing0 = "createdAt"))) || ((data.parseStatus === undefined) && (missing0 = "parseStatus"))){
validate173.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.id !== undefined){
const _errs1 = errors;
if(typeof data.id !== "string"){
validate173.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.text !== undefined){
const _errs3 = errors;
if(typeof data.text !== "string"){
validate173.errors = [{instancePath:instancePath+"/text",schemaPath:"#/properties/text/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.createdAt !== undefined){
const _errs5 = errors;
if(typeof data.createdAt !== "string"){
validate173.errors = [{instancePath:instancePath+"/createdAt",schemaPath:"#/properties/createdAt/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.parseStatus !== undefined){
let data3 = data.parseStatus;
const _errs7 = errors;
if(typeof data3 !== "string"){
validate173.errors = [{instancePath:instancePath+"/parseStatus",schemaPath:"#/properties/parseStatus/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((data3 === "pending") || (data3 === "done")) || (data3 === "failed"))){
validate173.errors = [{instancePath:instancePath+"/parseStatus",schemaPath:"#/properties/parseStatus/enum",keyword:"enum",params:{allowedValues: schema70.properties.parseStatus.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.parsed !== undefined){
let data4 = data.parsed;
const _errs9 = errors;
if(errors === _errs9){
if(data4 && typeof data4 == "object" && !Array.isArray(data4)){
let missing1;
if(((((data4.type === undefined) && (missing1 = "type")) || ((data4.fields === undefined) && (missing1 = "fields"))) || ((data4.crossLinks === undefined) && (missing1 = "crossLinks"))) || ((data4.insight === undefined) && (missing1 = "insight"))){
validate173.errors = [{instancePath:instancePath+"/parsed",schemaPath:"#/properties/parsed/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
if(data4.type !== undefined){
let data5 = data4.type;
const _errs11 = errors;
if(typeof data5 !== "string"){
validate173.errors = [{instancePath:instancePath+"/parsed/type",schemaPath:"#/properties/parsed/properties/type/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((((data5 === "training") || (data5 === "reading")) || (data5 === "state")) || (data5 === "misc"))){
validate173.errors = [{instancePath:instancePath+"/parsed/type",schemaPath:"#/properties/parsed/properties/type/enum",keyword:"enum",params:{allowedValues: schema70.properties.parsed.properties.type.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid1 = _errs11 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data4.fields !== undefined){
let data6 = data4.fields;
const _errs13 = errors;
if(!(data6 && typeof data6 == "object" && !Array.isArray(data6))){
validate173.errors = [{instancePath:instancePath+"/parsed/fields",schemaPath:"#/properties/parsed/properties/fields/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
var valid1 = _errs13 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data4.crossLinks !== undefined){
let data7 = data4.crossLinks;
const _errs15 = errors;
if(errors === _errs15){
if(Array.isArray(data7)){
var valid2 = true;
const len0 = data7.length;
for(let i0=0; i0<len0; i0++){
let data8 = data7[i0];
const _errs17 = errors;
if(errors === _errs17){
if(data8 && typeof data8 == "object" && !Array.isArray(data8)){
let missing2;
if(((data8.captureId === undefined) && (missing2 = "captureId")) || ((data8.reason === undefined) && (missing2 = "reason"))){
validate173.errors = [{instancePath:instancePath+"/parsed/crossLinks/" + i0,schemaPath:"#/properties/parsed/properties/crossLinks/items/required",keyword:"required",params:{missingProperty: missing2},message:"must have required property '"+missing2+"'"}];
return false;
}
else {
if(data8.captureId !== undefined){
const _errs19 = errors;
if(typeof data8.captureId !== "string"){
validate173.errors = [{instancePath:instancePath+"/parsed/crossLinks/" + i0+"/captureId",schemaPath:"#/properties/parsed/properties/crossLinks/items/properties/captureId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid3 = _errs19 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data8.reason !== undefined){
const _errs21 = errors;
if(typeof data8.reason !== "string"){
validate173.errors = [{instancePath:instancePath+"/parsed/crossLinks/" + i0+"/reason",schemaPath:"#/properties/parsed/properties/crossLinks/items/properties/reason/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid3 = _errs21 === errors;
}
else {
var valid3 = true;
}
}
}
}
else {
validate173.errors = [{instancePath:instancePath+"/parsed/crossLinks/" + i0,schemaPath:"#/properties/parsed/properties/crossLinks/items/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid2 = _errs17 === errors;
if(!valid2){
break;
}
}
}
else {
validate173.errors = [{instancePath:instancePath+"/parsed/crossLinks",schemaPath:"#/properties/parsed/properties/crossLinks/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid1 = _errs15 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data4.insight !== undefined){
let data11 = data4.insight;
const _errs23 = errors;
if(errors === _errs23){
if(data11 && typeof data11 == "object" && !Array.isArray(data11)){
let missing3;
if(((data11.zh === undefined) && (missing3 = "zh")) || ((data11.en === undefined) && (missing3 = "en"))){
validate173.errors = [{instancePath:instancePath+"/parsed/insight",schemaPath:"#/properties/parsed/properties/insight/required",keyword:"required",params:{missingProperty: missing3},message:"must have required property '"+missing3+"'"}];
return false;
}
else {
if(data11.zh !== undefined){
const _errs25 = errors;
if(typeof data11.zh !== "string"){
validate173.errors = [{instancePath:instancePath+"/parsed/insight/zh",schemaPath:"#/properties/parsed/properties/insight/properties/zh/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid4 = _errs25 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data11.en !== undefined){
const _errs27 = errors;
if(typeof data11.en !== "string"){
validate173.errors = [{instancePath:instancePath+"/parsed/insight/en",schemaPath:"#/properties/parsed/properties/insight/properties/en/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid4 = _errs27 === errors;
}
else {
var valid4 = true;
}
}
}
}
else {
validate173.errors = [{instancePath:instancePath+"/parsed/insight",schemaPath:"#/properties/parsed/properties/insight/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid1 = _errs23 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data4.matchedSkillIds !== undefined){
let data14 = data4.matchedSkillIds;
const _errs29 = errors;
if(errors === _errs29){
if(Array.isArray(data14)){
var valid5 = true;
const len1 = data14.length;
for(let i1=0; i1<len1; i1++){
const _errs31 = errors;
if(typeof data14[i1] !== "string"){
validate173.errors = [{instancePath:instancePath+"/parsed/matchedSkillIds/" + i1,schemaPath:"#/properties/parsed/properties/matchedSkillIds/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid5 = _errs31 === errors;
if(!valid5){
break;
}
}
}
else {
validate173.errors = [{instancePath:instancePath+"/parsed/matchedSkillIds",schemaPath:"#/properties/parsed/properties/matchedSkillIds/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid1 = _errs29 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data4.linkedGoalId !== undefined){
const _errs33 = errors;
if(typeof data4.linkedGoalId !== "string"){
validate173.errors = [{instancePath:instancePath+"/parsed/linkedGoalId",schemaPath:"#/properties/parsed/properties/linkedGoalId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid1 = _errs33 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data4.insightType !== undefined){
let data17 = data4.insightType;
const _errs35 = errors;
if(typeof data17 !== "string"){
validate173.errors = [{instancePath:instancePath+"/parsed/insightType",schemaPath:"#/properties/parsed/properties/insightType/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((((data17 === "skill_progress") || (data17 === "goal_link")) || (data17 === "cross_link")) || (data17 === "encourage"))){
validate173.errors = [{instancePath:instancePath+"/parsed/insightType",schemaPath:"#/properties/parsed/properties/insightType/enum",keyword:"enum",params:{allowedValues: schema70.properties.parsed.properties.insightType.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid1 = _errs35 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data4.entries !== undefined){
let data18 = data4.entries;
const _errs37 = errors;
if(errors === _errs37){
if(Array.isArray(data18)){
var valid6 = true;
const len2 = data18.length;
for(let i2=0; i2<len2; i2++){
const _errs39 = errors;
if(!(validate174(data18[i2], {instancePath:instancePath+"/parsed/entries/" + i2,parentData:data18,parentDataProperty:i2,rootData}))){
vErrors = vErrors === null ? validate174.errors : vErrors.concat(validate174.errors);
errors = vErrors.length;
}
var valid6 = _errs39 === errors;
if(!valid6){
break;
}
}
}
else {
validate173.errors = [{instancePath:instancePath+"/parsed/entries",schemaPath:"#/properties/parsed/properties/entries/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid1 = _errs37 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data4.entriesDismissed !== undefined){
const _errs40 = errors;
if(typeof data4.entriesDismissed !== "boolean"){
validate173.errors = [{instancePath:instancePath+"/parsed/entriesDismissed",schemaPath:"#/properties/parsed/properties/entriesDismissed/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid1 = _errs40 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data4.completionSchema !== undefined){
const _errs42 = errors;
if(!(validate178(data4.completionSchema, {instancePath:instancePath+"/parsed/completionSchema",parentData:data4,parentDataProperty:"completionSchema",rootData}))){
vErrors = vErrors === null ? validate178.errors : vErrors.concat(validate178.errors);
errors = vErrors.length;
}
var valid1 = _errs42 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data4.parserMeta !== undefined){
const _errs43 = errors;
if(!(validate82(data4.parserMeta, {instancePath:instancePath+"/parsed/parserMeta",parentData:data4,parentDataProperty:"parserMeta",rootData}))){
vErrors = vErrors === null ? validate82.errors : vErrors.concat(validate82.errors);
errors = vErrors.length;
}
var valid1 = _errs43 === errors;
}
else {
var valid1 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate173.errors = [{instancePath:instancePath+"/parsed",schemaPath:"#/properties/parsed/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.dataProvenance !== undefined){
const _errs44 = errors;
if(!(validate75(data.dataProvenance, {instancePath:instancePath+"/dataProvenance",parentData:data,parentDataProperty:"dataProvenance",rootData}))){
vErrors = vErrors === null ? validate75.errors : vErrors.concat(validate75.errors);
errors = vErrors.length;
}
var valid0 = _errs44 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
else {
validate173.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate173.errors = vErrors;
return errors === 0;
}

const schema74 = {"type":"object","properties":{"activePreset":{"$ref":"#/definitions/DashboardPresetId"},"todayCards":{"type":"array","items":{"$ref":"#/definitions/DashboardCardPreference"}},"insightsCards":{"type":"array","items":{"$ref":"#/definitions/DashboardCardPreference"}},"updatedAt":{"type":"string"}},"required":["activePreset","todayCards","insightsCards"]};
const schema75 = {"type":"string","enum":["default","learning","fitness","recovery","advanced"]};

function validate184(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(typeof data !== "string"){
validate184.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((((data === "default") || (data === "learning")) || (data === "fitness")) || (data === "recovery")) || (data === "advanced"))){
validate184.errors = [{instancePath,schemaPath:"#/enum",keyword:"enum",params:{allowedValues: schema75.enum},message:"must be equal to one of the allowed values"}];
return false;
}
validate184.errors = vErrors;
return errors === 0;
}

const schema76 = {"type":"object","properties":{"cardId":{"type":"string"},"visible":{"type":"boolean"},"order":{"type":"number"},"size":{"$ref":"#/definitions/DashboardCardSize"}},"required":["cardId","visible","order","size"]};
const schema77 = {"type":"string","enum":["small","medium","large"]};

function validate187(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(typeof data !== "string"){
validate187.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((data === "small") || (data === "medium")) || (data === "large"))){
validate187.errors = [{instancePath,schemaPath:"#/enum",keyword:"enum",params:{allowedValues: schema77.enum},message:"must be equal to one of the allowed values"}];
return false;
}
validate187.errors = vErrors;
return errors === 0;
}


function validate186(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((data.cardId === undefined) && (missing0 = "cardId")) || ((data.visible === undefined) && (missing0 = "visible"))) || ((data.order === undefined) && (missing0 = "order"))) || ((data.size === undefined) && (missing0 = "size"))){
validate186.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.cardId !== undefined){
const _errs1 = errors;
if(typeof data.cardId !== "string"){
validate186.errors = [{instancePath:instancePath+"/cardId",schemaPath:"#/properties/cardId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.visible !== undefined){
const _errs3 = errors;
if(typeof data.visible !== "boolean"){
validate186.errors = [{instancePath:instancePath+"/visible",schemaPath:"#/properties/visible/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.order !== undefined){
const _errs5 = errors;
if(!(typeof data.order == "number")){
validate186.errors = [{instancePath:instancePath+"/order",schemaPath:"#/properties/order/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.size !== undefined){
const _errs7 = errors;
if(!(validate187(data.size, {instancePath:instancePath+"/size",parentData:data,parentDataProperty:"size",rootData}))){
vErrors = vErrors === null ? validate187.errors : vErrors.concat(validate187.errors);
errors = vErrors.length;
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
else {
validate186.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate186.errors = vErrors;
return errors === 0;
}


function validate183(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((data.activePreset === undefined) && (missing0 = "activePreset")) || ((data.todayCards === undefined) && (missing0 = "todayCards"))) || ((data.insightsCards === undefined) && (missing0 = "insightsCards"))){
validate183.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.activePreset !== undefined){
const _errs1 = errors;
if(!(validate184(data.activePreset, {instancePath:instancePath+"/activePreset",parentData:data,parentDataProperty:"activePreset",rootData}))){
vErrors = vErrors === null ? validate184.errors : vErrors.concat(validate184.errors);
errors = vErrors.length;
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.todayCards !== undefined){
let data1 = data.todayCards;
const _errs2 = errors;
if(errors === _errs2){
if(Array.isArray(data1)){
var valid1 = true;
const len0 = data1.length;
for(let i0=0; i0<len0; i0++){
const _errs4 = errors;
if(!(validate186(data1[i0], {instancePath:instancePath+"/todayCards/" + i0,parentData:data1,parentDataProperty:i0,rootData}))){
vErrors = vErrors === null ? validate186.errors : vErrors.concat(validate186.errors);
errors = vErrors.length;
}
var valid1 = _errs4 === errors;
if(!valid1){
break;
}
}
}
else {
validate183.errors = [{instancePath:instancePath+"/todayCards",schemaPath:"#/properties/todayCards/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.insightsCards !== undefined){
let data3 = data.insightsCards;
const _errs5 = errors;
if(errors === _errs5){
if(Array.isArray(data3)){
var valid2 = true;
const len1 = data3.length;
for(let i1=0; i1<len1; i1++){
const _errs7 = errors;
if(!(validate186(data3[i1], {instancePath:instancePath+"/insightsCards/" + i1,parentData:data3,parentDataProperty:i1,rootData}))){
vErrors = vErrors === null ? validate186.errors : vErrors.concat(validate186.errors);
errors = vErrors.length;
}
var valid2 = _errs7 === errors;
if(!valid2){
break;
}
}
}
else {
validate183.errors = [{instancePath:instancePath+"/insightsCards",schemaPath:"#/properties/insightsCards/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.updatedAt !== undefined){
const _errs8 = errors;
if(typeof data.updatedAt !== "string"){
validate183.errors = [{instancePath:instancePath+"/updatedAt",schemaPath:"#/properties/updatedAt/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs8 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
else {
validate183.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate183.errors = vErrors;
return errors === 0;
}


function validate22(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((((((((((((((data.goals === undefined) && (missing0 = "goals")) || ((data.categories === undefined) && (missing0 = "categories"))) || ((data.modules === undefined) && (missing0 = "modules"))) || ((data.moduleSkillLinks === undefined) && (missing0 = "moduleSkillLinks"))) || ((data.skills === undefined) && (missing0 = "skills"))) || ((data.actions === undefined) && (missing0 = "actions"))) || ((data.executionLogs === undefined) && (missing0 = "executionLogs"))) || ((data.effortUnits === undefined) && (missing0 = "effortUnits"))) || ((data.contributionLinks === undefined) && (missing0 = "contributionLinks"))) || ((data.rescueLogs === undefined) && (missing0 = "rescueLogs"))) || ((data.stateCheckIns === undefined) && (missing0 = "stateCheckIns"))) || ((data.contextLogs === undefined) && (missing0 = "contextLogs"))) || ((data.decisionResults === undefined) && (missing0 = "decisionResults"))) || ((data.patternMemory === undefined) && (missing0 = "patternMemory"))) || ((data.scheduleBlocks === undefined) && (missing0 = "scheduleBlocks"))) || ((data.rawCaptures === undefined) && (missing0 = "rawCaptures"))) || ((data.settings === undefined) && (missing0 = "settings"))){
validate22.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.goals !== undefined){
let data0 = data.goals;
const _errs1 = errors;
if(errors === _errs1){
if(Array.isArray(data0)){
var valid1 = true;
const len0 = data0.length;
for(let i0=0; i0<len0; i0++){
const _errs3 = errors;
if(!(validate23(data0[i0], {instancePath:instancePath+"/goals/" + i0,parentData:data0,parentDataProperty:i0,rootData}))){
vErrors = vErrors === null ? validate23.errors : vErrors.concat(validate23.errors);
errors = vErrors.length;
}
var valid1 = _errs3 === errors;
if(!valid1){
break;
}
}
}
else {
validate22.errors = [{instancePath:instancePath+"/goals",schemaPath:"#/properties/goals/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs1 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.categories !== undefined){
let data2 = data.categories;
const _errs4 = errors;
if(errors === _errs4){
if(Array.isArray(data2)){
var valid2 = true;
const len1 = data2.length;
for(let i1=0; i1<len1; i1++){
const _errs6 = errors;
if(!(validate27(data2[i1], {instancePath:instancePath+"/categories/" + i1,parentData:data2,parentDataProperty:i1,rootData}))){
vErrors = vErrors === null ? validate27.errors : vErrors.concat(validate27.errors);
errors = vErrors.length;
}
var valid2 = _errs6 === errors;
if(!valid2){
break;
}
}
}
else {
validate22.errors = [{instancePath:instancePath+"/categories",schemaPath:"#/properties/categories/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.modules !== undefined){
let data4 = data.modules;
const _errs7 = errors;
if(errors === _errs7){
if(Array.isArray(data4)){
var valid3 = true;
const len2 = data4.length;
for(let i2=0; i2<len2; i2++){
const _errs9 = errors;
if(!(validate39(data4[i2], {instancePath:instancePath+"/modules/" + i2,parentData:data4,parentDataProperty:i2,rootData}))){
vErrors = vErrors === null ? validate39.errors : vErrors.concat(validate39.errors);
errors = vErrors.length;
}
var valid3 = _errs9 === errors;
if(!valid3){
break;
}
}
}
else {
validate22.errors = [{instancePath:instancePath+"/modules",schemaPath:"#/properties/modules/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.moduleSkillLinks !== undefined){
let data6 = data.moduleSkillLinks;
const _errs10 = errors;
if(errors === _errs10){
if(Array.isArray(data6)){
var valid4 = true;
const len3 = data6.length;
for(let i3=0; i3<len3; i3++){
const _errs12 = errors;
if(!(validate41(data6[i3], {instancePath:instancePath+"/moduleSkillLinks/" + i3,parentData:data6,parentDataProperty:i3,rootData}))){
vErrors = vErrors === null ? validate41.errors : vErrors.concat(validate41.errors);
errors = vErrors.length;
}
var valid4 = _errs12 === errors;
if(!valid4){
break;
}
}
}
else {
validate22.errors = [{instancePath:instancePath+"/moduleSkillLinks",schemaPath:"#/properties/moduleSkillLinks/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.skills !== undefined){
let data8 = data.skills;
const _errs13 = errors;
if(errors === _errs13){
if(Array.isArray(data8)){
var valid5 = true;
const len4 = data8.length;
for(let i4=0; i4<len4; i4++){
const _errs15 = errors;
if(!(validate43(data8[i4], {instancePath:instancePath+"/skills/" + i4,parentData:data8,parentDataProperty:i4,rootData}))){
vErrors = vErrors === null ? validate43.errors : vErrors.concat(validate43.errors);
errors = vErrors.length;
}
var valid5 = _errs15 === errors;
if(!valid5){
break;
}
}
}
else {
validate22.errors = [{instancePath:instancePath+"/skills",schemaPath:"#/properties/skills/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.actions !== undefined){
let data10 = data.actions;
const _errs16 = errors;
if(errors === _errs16){
if(Array.isArray(data10)){
var valid6 = true;
const len5 = data10.length;
for(let i5=0; i5<len5; i5++){
const _errs18 = errors;
if(!(validate61(data10[i5], {instancePath:instancePath+"/actions/" + i5,parentData:data10,parentDataProperty:i5,rootData}))){
vErrors = vErrors === null ? validate61.errors : vErrors.concat(validate61.errors);
errors = vErrors.length;
}
var valid6 = _errs18 === errors;
if(!valid6){
break;
}
}
}
else {
validate22.errors = [{instancePath:instancePath+"/actions",schemaPath:"#/properties/actions/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs16 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.executionLogs !== undefined){
let data12 = data.executionLogs;
const _errs19 = errors;
if(errors === _errs19){
if(Array.isArray(data12)){
var valid7 = true;
const len6 = data12.length;
for(let i6=0; i6<len6; i6++){
const _errs21 = errors;
if(!(validate65(data12[i6], {instancePath:instancePath+"/executionLogs/" + i6,parentData:data12,parentDataProperty:i6,rootData}))){
vErrors = vErrors === null ? validate65.errors : vErrors.concat(validate65.errors);
errors = vErrors.length;
}
var valid7 = _errs21 === errors;
if(!valid7){
break;
}
}
}
else {
validate22.errors = [{instancePath:instancePath+"/executionLogs",schemaPath:"#/properties/executionLogs/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs19 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.effortUnits !== undefined){
let data14 = data.effortUnits;
const _errs22 = errors;
if(errors === _errs22){
if(Array.isArray(data14)){
var valid8 = true;
const len7 = data14.length;
for(let i7=0; i7<len7; i7++){
const _errs24 = errors;
if(!(validate90(data14[i7], {instancePath:instancePath+"/effortUnits/" + i7,parentData:data14,parentDataProperty:i7,rootData}))){
vErrors = vErrors === null ? validate90.errors : vErrors.concat(validate90.errors);
errors = vErrors.length;
}
var valid8 = _errs24 === errors;
if(!valid8){
break;
}
}
}
else {
validate22.errors = [{instancePath:instancePath+"/effortUnits",schemaPath:"#/properties/effortUnits/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs22 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.contributionLinks !== undefined){
let data16 = data.contributionLinks;
const _errs25 = errors;
if(errors === _errs25){
if(Array.isArray(data16)){
var valid9 = true;
const len8 = data16.length;
for(let i8=0; i8<len8; i8++){
const _errs27 = errors;
if(!(validate96(data16[i8], {instancePath:instancePath+"/contributionLinks/" + i8,parentData:data16,parentDataProperty:i8,rootData}))){
vErrors = vErrors === null ? validate96.errors : vErrors.concat(validate96.errors);
errors = vErrors.length;
}
var valid9 = _errs27 === errors;
if(!valid9){
break;
}
}
}
else {
validate22.errors = [{instancePath:instancePath+"/contributionLinks",schemaPath:"#/properties/contributionLinks/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs25 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.rescueLogs !== undefined){
let data18 = data.rescueLogs;
const _errs28 = errors;
if(errors === _errs28){
if(Array.isArray(data18)){
var valid10 = true;
const len9 = data18.length;
for(let i9=0; i9<len9; i9++){
const _errs30 = errors;
if(!(validate98(data18[i9], {instancePath:instancePath+"/rescueLogs/" + i9,parentData:data18,parentDataProperty:i9,rootData}))){
vErrors = vErrors === null ? validate98.errors : vErrors.concat(validate98.errors);
errors = vErrors.length;
}
var valid10 = _errs30 === errors;
if(!valid10){
break;
}
}
}
else {
validate22.errors = [{instancePath:instancePath+"/rescueLogs",schemaPath:"#/properties/rescueLogs/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs28 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.stateCheckIns !== undefined){
let data20 = data.stateCheckIns;
const _errs31 = errors;
if(errors === _errs31){
if(Array.isArray(data20)){
var valid11 = true;
const len10 = data20.length;
for(let i10=0; i10<len10; i10++){
const _errs33 = errors;
if(!(validate100(data20[i10], {instancePath:instancePath+"/stateCheckIns/" + i10,parentData:data20,parentDataProperty:i10,rootData}))){
vErrors = vErrors === null ? validate100.errors : vErrors.concat(validate100.errors);
errors = vErrors.length;
}
var valid11 = _errs33 === errors;
if(!valid11){
break;
}
}
}
else {
validate22.errors = [{instancePath:instancePath+"/stateCheckIns",schemaPath:"#/properties/stateCheckIns/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs31 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.contextLogs !== undefined){
let data22 = data.contextLogs;
const _errs34 = errors;
if(errors === _errs34){
if(Array.isArray(data22)){
var valid12 = true;
const len11 = data22.length;
for(let i11=0; i11<len11; i11++){
const _errs36 = errors;
if(!(validate103(data22[i11], {instancePath:instancePath+"/contextLogs/" + i11,parentData:data22,parentDataProperty:i11,rootData}))){
vErrors = vErrors === null ? validate103.errors : vErrors.concat(validate103.errors);
errors = vErrors.length;
}
var valid12 = _errs36 === errors;
if(!valid12){
break;
}
}
}
else {
validate22.errors = [{instancePath:instancePath+"/contextLogs",schemaPath:"#/properties/contextLogs/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs34 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.decisionResults !== undefined){
let data24 = data.decisionResults;
const _errs37 = errors;
if(errors === _errs37){
if(Array.isArray(data24)){
var valid13 = true;
const len12 = data24.length;
for(let i12=0; i12<len12; i12++){
const _errs39 = errors;
if(!(validate106(data24[i12], {instancePath:instancePath+"/decisionResults/" + i12,parentData:data24,parentDataProperty:i12,rootData}))){
vErrors = vErrors === null ? validate106.errors : vErrors.concat(validate106.errors);
errors = vErrors.length;
}
var valid13 = _errs39 === errors;
if(!valid13){
break;
}
}
}
else {
validate22.errors = [{instancePath:instancePath+"/decisionResults",schemaPath:"#/properties/decisionResults/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs37 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.patternMemory !== undefined){
let data26 = data.patternMemory;
const _errs40 = errors;
if(errors === _errs40){
if(Array.isArray(data26)){
var valid14 = true;
const len13 = data26.length;
for(let i13=0; i13<len13; i13++){
const _errs42 = errors;
if(!(validate167(data26[i13], {instancePath:instancePath+"/patternMemory/" + i13,parentData:data26,parentDataProperty:i13,rootData}))){
vErrors = vErrors === null ? validate167.errors : vErrors.concat(validate167.errors);
errors = vErrors.length;
}
var valid14 = _errs42 === errors;
if(!valid14){
break;
}
}
}
else {
validate22.errors = [{instancePath:instancePath+"/patternMemory",schemaPath:"#/properties/patternMemory/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs40 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.scheduleBlocks !== undefined){
let data28 = data.scheduleBlocks;
const _errs43 = errors;
if(errors === _errs43){
if(Array.isArray(data28)){
var valid15 = true;
const len14 = data28.length;
for(let i14=0; i14<len14; i14++){
const _errs45 = errors;
if(!(validate119(data28[i14], {instancePath:instancePath+"/scheduleBlocks/" + i14,parentData:data28,parentDataProperty:i14,rootData}))){
vErrors = vErrors === null ? validate119.errors : vErrors.concat(validate119.errors);
errors = vErrors.length;
}
var valid15 = _errs45 === errors;
if(!valid15){
break;
}
}
}
else {
validate22.errors = [{instancePath:instancePath+"/scheduleBlocks",schemaPath:"#/properties/scheduleBlocks/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs43 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.rawCaptures !== undefined){
let data30 = data.rawCaptures;
const _errs46 = errors;
if(errors === _errs46){
if(Array.isArray(data30)){
var valid16 = true;
const len15 = data30.length;
for(let i15=0; i15<len15; i15++){
const _errs48 = errors;
if(!(validate173(data30[i15], {instancePath:instancePath+"/rawCaptures/" + i15,parentData:data30,parentDataProperty:i15,rootData}))){
vErrors = vErrors === null ? validate173.errors : vErrors.concat(validate173.errors);
errors = vErrors.length;
}
var valid16 = _errs48 === errors;
if(!valid16){
break;
}
}
}
else {
validate22.errors = [{instancePath:instancePath+"/rawCaptures",schemaPath:"#/properties/rawCaptures/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs46 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.settings !== undefined){
let data32 = data.settings;
const _errs49 = errors;
if(errors === _errs49){
if(data32 && typeof data32 == "object" && !Array.isArray(data32)){
if(data32.reminderHour !== undefined){
const _errs51 = errors;
if(!(typeof data32.reminderHour == "number")){
validate22.errors = [{instancePath:instancePath+"/settings/reminderHour",schemaPath:"#/properties/settings/properties/reminderHour/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid17 = _errs51 === errors;
}
else {
var valid17 = true;
}
if(valid17){
if(data32.reminderMinute !== undefined){
const _errs53 = errors;
if(!(typeof data32.reminderMinute == "number")){
validate22.errors = [{instancePath:instancePath+"/settings/reminderMinute",schemaPath:"#/properties/settings/properties/reminderMinute/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid17 = _errs53 === errors;
}
else {
var valid17 = true;
}
if(valid17){
if(data32.reminderEnabled !== undefined){
const _errs55 = errors;
if(typeof data32.reminderEnabled !== "boolean"){
validate22.errors = [{instancePath:instancePath+"/settings/reminderEnabled",schemaPath:"#/properties/settings/properties/reminderEnabled/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid17 = _errs55 === errors;
}
else {
var valid17 = true;
}
if(valid17){
if(data32.accentColor !== undefined){
const _errs57 = errors;
if(typeof data32.accentColor !== "string"){
validate22.errors = [{instancePath:instancePath+"/settings/accentColor",schemaPath:"#/properties/settings/properties/accentColor/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid17 = _errs57 === errors;
}
else {
var valid17 = true;
}
if(valid17){
if(data32.language !== undefined){
let data37 = data32.language;
const _errs59 = errors;
if(typeof data37 !== "string"){
validate22.errors = [{instancePath:instancePath+"/settings/language",schemaPath:"#/properties/settings/properties/language/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((data37 === "zh") || (data37 === "en"))){
validate22.errors = [{instancePath:instancePath+"/settings/language",schemaPath:"#/properties/settings/properties/language/enum",keyword:"enum",params:{allowedValues: schema7.properties.settings.properties.language.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid17 = _errs59 === errors;
}
else {
var valid17 = true;
}
if(valid17){
if(data32.preferredLanguage !== undefined){
let data38 = data32.preferredLanguage;
const _errs61 = errors;
if(typeof data38 !== "string"){
validate22.errors = [{instancePath:instancePath+"/settings/preferredLanguage",schemaPath:"#/properties/settings/properties/preferredLanguage/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((data38 === "zh") || (data38 === "en"))){
validate22.errors = [{instancePath:instancePath+"/settings/preferredLanguage",schemaPath:"#/properties/settings/properties/preferredLanguage/enum",keyword:"enum",params:{allowedValues: schema7.properties.settings.properties.preferredLanguage.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid17 = _errs61 === errors;
}
else {
var valid17 = true;
}
if(valid17){
if(data32.selectedThemeId !== undefined){
const _errs63 = errors;
if(typeof data32.selectedThemeId !== "string"){
validate22.errors = [{instancePath:instancePath+"/settings/selectedThemeId",schemaPath:"#/properties/settings/properties/selectedThemeId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid17 = _errs63 === errors;
}
else {
var valid17 = true;
}
if(valid17){
if(data32.onboardingCompleted !== undefined){
const _errs65 = errors;
if(typeof data32.onboardingCompleted !== "boolean"){
validate22.errors = [{instancePath:instancePath+"/settings/onboardingCompleted",schemaPath:"#/properties/settings/properties/onboardingCompleted/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid17 = _errs65 === errors;
}
else {
var valid17 = true;
}
if(valid17){
if(data32.onboardingVersion !== undefined){
const _errs67 = errors;
if(!(typeof data32.onboardingVersion == "number")){
validate22.errors = [{instancePath:instancePath+"/settings/onboardingVersion",schemaPath:"#/properties/settings/properties/onboardingVersion/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
var valid17 = _errs67 === errors;
}
else {
var valid17 = true;
}
if(valid17){
if(data32.firstQuestCreated !== undefined){
const _errs69 = errors;
if(typeof data32.firstQuestCreated !== "boolean"){
validate22.errors = [{instancePath:instancePath+"/settings/firstQuestCreated",schemaPath:"#/properties/settings/properties/firstQuestCreated/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid17 = _errs69 === errors;
}
else {
var valid17 = true;
}
if(valid17){
if(data32.onboardingRestartRequested !== undefined){
const _errs71 = errors;
if(typeof data32.onboardingRestartRequested !== "boolean"){
validate22.errors = [{instancePath:instancePath+"/settings/onboardingRestartRequested",schemaPath:"#/properties/settings/properties/onboardingRestartRequested/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid17 = _errs71 === errors;
}
else {
var valid17 = true;
}
if(valid17){
if(data32.firstSystemWelcomeDismissed !== undefined){
const _errs73 = errors;
if(typeof data32.firstSystemWelcomeDismissed !== "boolean"){
validate22.errors = [{instancePath:instancePath+"/settings/firstSystemWelcomeDismissed",schemaPath:"#/properties/settings/properties/firstSystemWelcomeDismissed/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid17 = _errs73 === errors;
}
else {
var valid17 = true;
}
if(valid17){
if(data32.dashboardPreferences !== undefined){
const _errs75 = errors;
if(!(validate183(data32.dashboardPreferences, {instancePath:instancePath+"/settings/dashboardPreferences",parentData:data32,parentDataProperty:"dashboardPreferences",rootData}))){
vErrors = vErrors === null ? validate183.errors : vErrors.concat(validate183.errors);
errors = vErrors.length;
}
var valid17 = _errs75 === errors;
}
else {
var valid17 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate22.errors = [{instancePath:instancePath+"/settings",schemaPath:"#/properties/settings/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs49 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate22.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate22.errors = vErrors;
return errors === 0;
}


function validate21(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(!(validate22(data, {instancePath,parentData,parentDataProperty,rootData}))){
vErrors = vErrors === null ? validate22.errors : vErrors.concat(validate22.errors);
errors = vErrors.length;
}
validate21.errors = vErrors;
return errors === 0;
}
