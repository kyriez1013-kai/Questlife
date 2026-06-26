import { ScheduleBlock } from '../types';

export type ScheduleProposalAction = 'move' | 'shorten' | 'swap' | 'protect' | 'suggest';
export type ScheduleProposalStatus = 'pending' | 'applied' | 'dismissed' | 'failed';

export type ScheduleProposal = {
  id: string;
  sourceDecisionResultId?: string;
  createdAt: string;
  blockId?: string;
  action: ScheduleProposalAction;
  from?: string;
  to?: string;
  reason: string;
  confidence?: number;
  status: ScheduleProposalStatus;
};

export type ScheduleProposalApplyResult = {
  ok: boolean;
  patch?: Partial<ScheduleBlock>;
  messageKey?: string;
};

const supportedActions: ScheduleProposalAction[] = ['move', 'shorten', 'protect', 'suggest', 'swap'];

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function readNumber(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function isTimeString(value?: string) {
  return !!value && /^([01]?\d|2[0-3]):[0-5]\d$/.test(value);
}

function minutesOf(value: string) {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

function addMinutes(value: string, minutes: number) {
  const total = Math.max(0, Math.min(24 * 60 - 1, minutesOf(value) + minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function normalizeScheduleProposals(raw: unknown, sourceDecisionResultId?: string): ScheduleProposal[] {
  if (!Array.isArray(raw)) return [];
  const createdAt = new Date().toISOString();
  return raw.slice(0, 6).map((item, index) => {
    const value = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    const rawAction = readString(value.action || value.type || value.kind).toLowerCase();
    const action = supportedActions.includes(rawAction as ScheduleProposalAction)
      ? rawAction as ScheduleProposalAction
      : 'suggest';
    const blockId = readString(value.blockId || value.scheduleBlockId || value.id || value.targetBlockId);
    const from = readString(value.from || value.fromTime || value.currentTime || value.current);
    const to = readString(value.to || value.toTime || value.newTime || value.targetTime || value.proposed);
    const reason = readString(value.reason || value.why || value.description) || 'schedule_proposal';
    return {
      id: readString(value.proposalId || value.proposal_id) || `schedule-proposal-${sourceDecisionResultId || 'local'}-${index}`,
      sourceDecisionResultId,
      createdAt,
      blockId: blockId || undefined,
      action,
      from: from || undefined,
      to: to || undefined,
      reason,
      confidence: readNumber(value.confidence),
      status: 'pending',
    };
  });
}

export function previewScheduleProposal(proposal: ScheduleProposal, block?: ScheduleBlock) {
  const from = proposal.from || (block ? `${block.startTime}-${block.endTime}` : undefined);
  const to = proposal.to;
  return { from, to };
}

export function scheduleProposalActionKey(action: ScheduleProposalAction) {
  if (action === 'move') return 'scheduleProposalActionMove';
  if (action === 'shorten') return 'scheduleProposalActionShorten';
  if (action === 'protect') return 'scheduleProposalActionProtect';
  if (action === 'swap') return 'scheduleProposalActionSwap';
  return 'scheduleProposalActionSuggest';
}

export function buildScheduleProposalPatch(proposal: ScheduleProposal, block?: ScheduleBlock): ScheduleProposalApplyResult {
  if (proposal.status !== 'pending') return { ok: false, messageKey: 'scheduleProposalNotApplied' };
  if (!proposal.blockId) return { ok: false, messageKey: 'proposalRequiresBlock' };
  if (!block) return { ok: false, messageKey: 'noMatchingScheduleBlock' };

  if (proposal.action === 'move') {
    if (!isTimeString(proposal.to)) return { ok: false, messageKey: 'proposalRequiresBlock' };
    const to = proposal.to || '';
    const duration = Math.max(1, minutesOf(block.endTime) - minutesOf(block.startTime));
    return {
      ok: true,
      patch: {
        startTime: to,
        endTime: addMinutes(to, duration),
        status: block.status === 'completed' ? block.status : 'adjusted',
        notes: [block.notes, proposal.reason].filter(Boolean).join('\n'),
      },
    };
  }

  if (proposal.action === 'shorten') {
    if (!isTimeString(proposal.to)) return { ok: false, messageKey: 'proposalRequiresBlock' };
    const to = proposal.to || '';
    if (minutesOf(to) <= minutesOf(block.startTime)) return { ok: false, messageKey: 'proposalRequiresBlock' };
    return {
      ok: true,
      patch: {
        endTime: to,
        plannedMinutes: minutesOf(to) - minutesOf(block.startTime),
        status: block.status === 'completed' ? block.status : 'adjusted',
        notes: [block.notes, proposal.reason].filter(Boolean).join('\n'),
      },
    };
  }

  if (proposal.action === 'protect') {
    return {
      ok: true,
      patch: {
        notes: [block.notes, proposal.reason].filter(Boolean).join('\n'),
      },
    };
  }

  return { ok: false, messageKey: 'unsupportedProposalAction' };
}
