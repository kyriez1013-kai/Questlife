import { AppData, ContributionLink, EffortUnit, ExecutionLog, RawCapture, Skill } from '../types';

function includesSql(value: unknown) {
  if (value == null) return false;
  try {
    return String(value).toLowerCase().includes('sql');
  } catch {
    return false;
  }
}

function objectMentionsSql(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return includesSql(value);
  }
  if (Array.isArray(value)) return value.some(objectMentionsSql);
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).some(([key, row]) => includesSql(key) || objectMentionsSql(row));
  }
  return false;
}

export function getExecutionLogSourceCaptureId(log?: ExecutionLog) {
  if (!log) return undefined;
  return (
    (log.structuredData?.sourceCaptureId as string | undefined)
    ?? ((log as any).sourceCaptureId as string | undefined)
    ?? ((log as any).rawCaptureId as string | undefined)
  );
}

function effortMatchesLog(unit: EffortUnit, logIds: Set<string>) {
  return logIds.has(unit.executionLogId)
    || logIds.has((unit as any).sourceLogId)
    || logIds.has((unit as any).logId);
}

function linkMatchesLogOrEffort(link: ContributionLink, logIds: Set<string>, effortIds: Set<string>) {
  return logIds.has(link.executionLogId)
    || logIds.has((link as any).sourceLogId)
    || logIds.has((link as any).logId)
    || effortIds.has(link.effortUnitId);
}

export function getLinkedExecutionLogIdsForCapture(executionLogs: ExecutionLog[] = [], captureId: string) {
  return new Set(executionLogs
    .filter((log) => getExecutionLogSourceCaptureId(log) === captureId || log.id.startsWith(`capture-${captureId}`))
    .map((log) => log.id));
}

export function getEffortUnitIdsForLogs(effortUnits: EffortUnit[] = [], logIds: Set<string>) {
  return new Set(effortUnits.filter((unit) => effortMatchesLog(unit, logIds)).map((unit) => unit.id));
}

export function removeDerivedForLogs<T extends AppData>(data: T, logIds: Set<string>) {
  const effortIds = getEffortUnitIdsForLogs(data.effortUnits || [], logIds);
  return {
    effortUnits: (data.effortUnits || []).filter((unit) => !effortMatchesLog(unit, logIds)),
    contributionLinks: (data.contributionLinks || []).filter((link) => !linkMatchesLogOrEffort(link, logIds, effortIds)),
  };
}

function skillNameFor(log: ExecutionLog, skills: Map<string, Skill>) {
  return log.linkedSkillId ? skills.get(log.linkedSkillId)?.name : undefined;
}

export function auditDataResidue(data: AppData) {
  const executionLogs = data.executionLogs || [];
  const skills = data.skills || [];
  const effortUnits = data.effortUnits || [];
  const contributionLinks = data.contributionLinks || [];
  const rawCaptures = data.rawCaptures || [];
  const skillIds = new Set(skills.map((skill) => skill.id));
  const logIds = new Set(executionLogs.map((log) => log.id));
  const effortIds = new Set(effortUnits.map((unit) => unit.id));
  const skillMap = new Map(skills.map((skill) => [skill.id, skill]));
  const captureMap = new Map(rawCaptures.map((capture) => [capture.id, capture]));

  const bySkillId: Record<string, number> = {};
  executionLogs.forEach((log) => {
    if (!log.linkedSkillId) return;
    bySkillId[log.linkedSkillId] = (bySkillId[log.linkedSkillId] || 0) + 1;
  });

  const suspiciousSqlLogs = executionLogs
    .filter((log) => (
      includesSql(log.title)
      || includesSql(log.orphanedSkillName)
      || includesSql(skillNameFor(log, skillMap))
      || objectMentionsSql(log.structuredData)
      || objectMentionsSql(log.progressUpdate)
      || objectMentionsSql(log.metricUpdate)
      || objectMentionsSql(log.actualData)
      || objectMentionsSql(log.predictionData)
    ))
    .map((log) => ({
      id: log.id,
      date: log.date,
      durationMinutes: log.durationMinutes,
      title: log.title,
      linkedSkillId: log.linkedSkillId,
      linkedSkillExists: !!log.linkedSkillId && skillIds.has(log.linkedSkillId),
      linkedSkillName: skillNameFor(log, skillMap),
      linkedGoalId: log.linkedGoalId,
      linkedModuleId: log.linkedModuleId,
      sourceCaptureId: getExecutionLogSourceCaptureId(log),
      sourceCaptureExists: getExecutionLogSourceCaptureId(log) ? captureMap.has(getExecutionLogSourceCaptureId(log) as string) : undefined,
    }));

  const sqlLikeSkills = skills
    .filter((skill) => includesSql(skill.name) || includesSql(skill.icon) || includesSql(skill.unit) || objectMentionsSql(skill.metricConfig))
    .map((skill) => ({
      id: skill.id,
      name: skill.name,
      categoryId: skill.categoryId,
      goalId: skill.goalId,
      moduleId: skill.moduleId,
      taskType: skill.taskType,
      progressType: skill.progressType,
      logCount: bySkillId[skill.id] || 0,
    }));

  const orphanSkills = skills
    .filter((skill) => {
      const hasMissingCategory = !!skill.categoryId && !(data.categories || []).some((goal) => goal.id === skill.categoryId);
      const hasMissingGoal = !!skill.goalId && !(data.categories || []).some((goal) => goal.id === skill.goalId);
      const hasMissingModule = !!skill.moduleId && !(data.modules || []).some((module) => module.id === skill.moduleId);
      return hasMissingCategory || hasMissingGoal || hasMissingModule;
    })
    .map((skill) => ({ id: skill.id, name: skill.name, categoryId: skill.categoryId, goalId: skill.goalId, moduleId: skill.moduleId }));

  const orphanByLogId = effortUnits
    .filter((unit) => !logIds.has(unit.executionLogId))
    .map((unit) => ({ id: unit.id, executionLogId: unit.executionLogId, primarySkillId: unit.primarySkillId, effortType: unit.effortType, metricFamily: unit.metricFamily }));

  const sqlLikeUnits = effortUnits
    .filter((unit) => includesSql(unit.comparableKey) || objectMentionsSql(unit.raw) || includesSql(unit.primarySkillId ? skillMap.get(unit.primarySkillId)?.name : undefined))
    .map((unit) => ({ id: unit.id, executionLogId: unit.executionLogId, primarySkillId: unit.primarySkillId, effortType: unit.effortType, metricFamily: unit.metricFamily, comparableKey: unit.comparableKey }));

  const orphanContributionLinks = contributionLinks
    .filter((link) => !logIds.has(link.executionLogId) || !effortIds.has(link.effortUnitId))
    .map((link) => ({ id: link.id, executionLogId: link.executionLogId, effortUnitId: link.effortUnitId, targetType: link.targetType, targetId: link.targetId }));

  const sqlLikeLinks = contributionLinks
    .filter((link) => {
      const targetSkillName = link.targetType === 'skill' ? skillMap.get(link.targetId)?.name : undefined;
      const unit = effortUnits.find((row) => row.id === link.effortUnitId);
      return includesSql(targetSkillName) || includesSql(unit?.comparableKey) || objectMentionsSql(unit?.raw);
    })
    .map((link) => ({ id: link.id, executionLogId: link.executionLogId, effortUnitId: link.effortUnitId, targetType: link.targetType, targetId: link.targetId, reasonCode: link.reasonCode }));

  const sqlLikeCaptures = rawCaptures
    .filter((capture) => includesSql(capture.text) || objectMentionsSql(capture.parsed))
    .map((capture) => ({
      id: capture.id,
      createdAt: capture.createdAt,
      parseStatus: capture.parseStatus,
      linkedLogIds: Array.from(getLinkedExecutionLogIdsForCapture(executionLogs, capture.id)),
    }));

  const deletedOrClosedCapturesWithLinkedLogs = rawCaptures
    .filter((capture) => capture.parsed?.entriesDismissed || capture.parseStatus === 'done')
    .map((capture) => ({ id: capture.id, parseStatus: capture.parseStatus, entriesDismissed: !!capture.parsed?.entriesDismissed, linkedLogIds: Array.from(getLinkedExecutionLogIdsForCapture(executionLogs, capture.id)) }))
    .filter((row) => row.linkedLogIds.length > 0);

  return {
    executionLogs: {
      total: executionLogs.length,
      bySkillId,
      logsWithLinkedSkillId: executionLogs.filter((log) => !!log.linkedSkillId).length,
      logsWithoutLinkedSkillId: executionLogs.filter((log) => !log.linkedSkillId).length,
      suspiciousSqlLogs,
    },
    skills: {
      total: skills.length,
      sqlLikeSkills,
      orphanSkills,
    },
    effortUnits: {
      total: effortUnits.length,
      orphanByLogId,
      sqlLikeUnits,
    },
    contributionLinks: {
      total: contributionLinks.length,
      orphanByLogId: orphanContributionLinks,
      sqlLikeLinks,
    },
    rawCaptures: {
      total: rawCaptures.length,
      sqlLikeCaptures,
      deletedOrClosedCapturesWithLinkedLogs,
    },
  };
}

export function isDataResidueDebugEnabled() {
  try {
    const search = typeof window !== 'undefined' ? window.location?.search || '' : '';
    if (new URLSearchParams(search).get('debugDataResidue') === '1') return true;
  } catch {}
  try {
    return typeof window !== 'undefined' && window.localStorage?.getItem('questlife_debug_data_residue') === 'true';
  } catch {
    return false;
  }
}
