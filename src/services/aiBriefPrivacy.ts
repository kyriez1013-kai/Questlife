import type { DecisionBriefInput } from '../utils/decisionTypes';

/** Aggregated context/memory can lose source provenance. Do not send it without
 * explicit imported-context consent; manually entered state/execution remains. */
export function aiBriefForCloud(input: DecisionBriefInput, includeImportedContext: boolean) {
  if (includeImportedContext) return { ...input, include_imported_context: true };
  const { decision_memory_summary: _memory, ...rest } = input;
  return {
    ...rest,
    include_imported_context: false,
    today_context: { recent_context_logs: [] },
    profile: {
      ...input.profile,
      confirmed_patterns: [], pattern_candidates: [], inferred_patterns_v0: [], pattern_memory_summary: undefined,
    },
    history_index: {
      last_28_days: Object.fromEntries(Object.entries(input.history_index.last_28_days)
        .filter(([key]) => !key.startsWith('context_'))),
      last_7_days: input.history_index.last_7_days.map(row => ({
        ...row, context_events: [],
        events: Array.isArray(row.events) ? row.events.filter(event => event?.type !== 'context') : row.events,
      })),
    },
  };
}
