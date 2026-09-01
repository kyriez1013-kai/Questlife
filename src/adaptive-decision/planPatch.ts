import type { ScheduleBlock } from '../types';
import type { DecisionPlanOperationV1, DecisionPlanPatchV1 } from './decisionEpisode';

export class DecisionPlanPatchConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DecisionPlanPatchConflictError';
  }
}

function stableBlock(block: ScheduleBlock): string {
  const ordered = Object.keys(block)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = block[key as keyof ScheduleBlock];
      return result;
    }, {});
  return JSON.stringify(ordered);
}

function sameBlock(left: ScheduleBlock | undefined, right: ScheduleBlock | undefined): boolean {
  if (!left || !right) return left === right;
  return stableBlock(left) === stableBlock(right);
}

export function decisionPlanSnapshotHash(blocks: ScheduleBlock[]): string {
  const value = blocks
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(stableBlock)
    .join('|');
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `schedule-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function createDecisionPlanPatch(input: {
  id: string;
  generatedAt: string;
  date: string;
  before: ScheduleBlock[];
  after: ScheduleBlock[];
  reasonByBlockId?: Record<string, string>;
  unplacedBlockIds?: string[];
}): DecisionPlanPatchV1 {
  const beforeById = new Map(input.before.map((block) => [block.id, block]));
  const afterById = new Map(input.after.map((block) => [block.id, block]));
  const ids = Array.from(new Set([...beforeById.keys(), ...afterById.keys()])).sort();
  const operations: DecisionPlanOperationV1[] = [];

  ids.forEach((blockId) => {
    const before = beforeById.get(blockId);
    const after = afterById.get(blockId);
    if (sameBlock(before, after)) return;
    const reasonKey = input.reasonByBlockId?.[blockId] ?? 'adaptivePlanReasonDecision';
    if (before?.flexibility === 'fixed') {
      throw new DecisionPlanPatchConflictError(`Fixed schedule block cannot be changed: ${blockId}`);
    }
    if (!before && after) {
      operations.push({ id: `${input.id}:add:${blockId}`, type: 'add', blockId, before: null, after: { ...after }, reasonKey });
    } else if (before && !after) {
      operations.push({ id: `${input.id}:remove:${blockId}`, type: 'remove', blockId, before: { ...before }, after: null, reasonKey });
    } else if (before && after) {
      operations.push({ id: `${input.id}:update:${blockId}`, type: 'update', blockId, before: { ...before }, after: { ...after }, reasonKey });
    }
  });

  return {
    id: input.id,
    generatedAt: input.generatedAt,
    date: input.date,
    operations,
    unplacedBlockIds: input.unplacedBlockIds?.slice() ?? [],
    beforeSnapshot: input.before.map((block) => ({ ...block })),
    afterSnapshot: input.after.map((block) => ({ ...block })),
  };
}

function blockStateMatches(current: ScheduleBlock | undefined, expected: ScheduleBlock | null): boolean {
  if (expected == null) return current == null;
  return sameBlock(current, expected);
}

export function applyDecisionPlanPatch(
  currentBlocks: ScheduleBlock[],
  patch: DecisionPlanPatchV1,
): ScheduleBlock[] {
  const next = currentBlocks.map((block) => ({ ...block }));
  const byId = new Map(next.map((block) => [block.id, block]));

  patch.operations.forEach((operation) => {
    const current = byId.get(operation.blockId);
    if (blockStateMatches(current, operation.after)) return;
    if (!blockStateMatches(current, operation.before)) {
      throw new DecisionPlanPatchConflictError(`Schedule block changed after preview: ${operation.blockId}`);
    }
    if (operation.after == null) byId.delete(operation.blockId);
    else byId.set(operation.blockId, { ...operation.after });
  });

  return currentBlocks
    .filter((block) => byId.has(block.id))
    .map((block) => ({ ...byId.get(block.id)! }))
    .concat(
      Array.from(byId.values())
        .filter((block) => !currentBlocks.some((current) => current.id === block.id))
        .map((block) => ({ ...block })),
    );
}

export function undoDecisionPlanPatch(
  currentBlocks: ScheduleBlock[],
  patch: DecisionPlanPatchV1,
): ScheduleBlock[] {
  const byId = new Map(currentBlocks.map((block) => [block.id, { ...block }]));

  patch.operations.slice().reverse().forEach((operation) => {
    const current = byId.get(operation.blockId);
    if (blockStateMatches(current, operation.before)) return;
    if (!blockStateMatches(current, operation.after)) {
      throw new DecisionPlanPatchConflictError(`Schedule block changed after decision apply: ${operation.blockId}`);
    }
    if (operation.before == null) byId.delete(operation.blockId);
    else byId.set(operation.blockId, { ...operation.before });
  });

  return currentBlocks
    .filter((block) => byId.has(block.id))
    .map((block) => ({ ...byId.get(block.id)! }))
    .concat(
      Array.from(byId.values())
        .filter((block) => !currentBlocks.some((current) => current.id === block.id))
        .map((block) => ({ ...block })),
    );
}

export function scheduleBlockWithDuration(block: ScheduleBlock, minutes: number): ScheduleBlock {
  const [hour, minute] = block.startTime.split(':').map(Number);
  const startMinutes = hour * 60 + minute;
  const endMinutes = startMinutes + Math.max(1, Math.round(minutes));
  return {
    ...block,
    endTime: `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`,
    plannedMinutes: Math.max(1, Math.round(minutes)),
    status: 'adjusted',
  };
}

export function scheduleBlockOnNextDay(block: ScheduleBlock): ScheduleBlock {
  const date = new Date(`${block.date}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return {
    ...block,
    date: date.toISOString().slice(0, 10),
    status: 'adjusted',
  };
}
