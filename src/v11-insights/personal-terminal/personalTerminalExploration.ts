import type {
  PersonalTerminalEvent,
  PersonalTerminalModel,
  PersonalTerminalSeries,
  PersonalTerminalSignal,
  PersonalTerminalViewData,
} from './personalTerminalPresentation';

export type PersonalTerminalExploreAction =
  | 'none'
  | 'compare'
  | 'show_events'
  | 'open_signal'
  | 'open_evidence';

export type PersonalTerminalAnalystModule = {
  id: 'observed' | 'related' | 'signal' | 'events' | 'evidence' | 'unknown';
  action: PersonalTerminalExploreAction;
  count: number | null;
  targetId: string | null;
};

export type PersonalTerminalHighlightWindow = {
  kind: 'event' | 'signal' | 'period';
  start: string;
  end: string;
  sourceIds: string[];
};

export type PersonalTerminalExplorationModel = {
  analystModules: PersonalTerminalAnalystModule[];
  events: PersonalTerminalEvent[];
  primarySignal: PersonalTerminalSignal | null;
  relatedSeries: PersonalTerminalSeries | null;
  evidence: {
    observationCount: number;
    independentDayCount: number;
    expectedDayCount: number | null;
    missingDayCount: number | null;
    sourceCount: number;
  };
};

function timestamp(value: string) {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function orderedWindow(start: string, end: string) {
  return timestamp(start) != null && timestamp(end) != null && timestamp(start)! > timestamp(end)!
    ? { start: end, end: start }
    : { start, end };
}

function currentViewWindow(viewData: PersonalTerminalViewData) {
  if (viewData.observations.length) {
    const start = viewData.observations[0]?.timestamp ?? null;
    const end = viewData.observations[viewData.observations.length - 1]?.timestamp ?? null;
    return start && end ? orderedWindow(start, end) : null;
  }

  const start = viewData.line[0]?.time ?? null;
  const end = viewData.line[viewData.line.length - 1]?.time ?? null;
  return start && end ? orderedWindow(start, end) : null;
}

function eventsInWindow(series: PersonalTerminalSeries, viewData: PersonalTerminalViewData) {
  const window = currentViewWindow(viewData);
  if (!window) return [];
  const start = timestamp(window.start);
  const end = timestamp(window.end);
  if (start == null || end == null) return [];
  return series.events.filter((event) => {
    const value = timestamp(event.timestamp);
    return value != null && value >= start && value <= end;
  });
}

function signalForSeries(signals: PersonalTerminalSignal[], series: PersonalTerminalSeries) {
  if (!series.constructKey) return null;
  return signals.find((signal) => (
    signal.sourceConstruct === series.constructKey || signal.targetConstruct === series.constructKey
  )) ?? null;
}

function relatedSeriesForSignal(
  signal: PersonalTerminalSignal | null,
  series: PersonalTerminalSeries,
  comparisonSeries: PersonalTerminalSeries[],
) {
  if (!signal || !series.constructKey) return null;
  const relatedConstruct = signal.sourceConstruct === series.constructKey
    ? signal.targetConstruct
    : signal.targetConstruct === series.constructKey
      ? signal.sourceConstruct
      : null;
  if (!relatedConstruct) return null;
  return comparisonSeries.find((candidate) => (
    candidate.id !== series.id
      && candidate.constructKey === relatedConstruct
      && candidate.observations.length > 0
  )) ?? null;
}

export function buildPersonalTerminalExplorationModel({
  comparisonSeries,
  model,
  series,
  viewData,
}: {
  comparisonSeries: PersonalTerminalSeries[];
  model: PersonalTerminalModel;
  series: PersonalTerminalSeries;
  viewData: PersonalTerminalViewData;
}): PersonalTerminalExplorationModel {
  const events = eventsInWindow(series, viewData);
  const primarySignal = signalForSeries(model.signals, series);
  const relatedSeries = relatedSeriesForSignal(primarySignal, series, comparisonSeries);
  const independentDayCount = new Set(viewData.observations.map((row) => row.timestamp.slice(0, 10))).size;
  const firstVisibleAt = viewData.observations[0]?.timestamp ?? null;
  const lastVisibleAt = viewData.observations[viewData.observations.length - 1]?.timestamp ?? null;
  const firstSeriesAt = series.observations[0]?.timestamp ?? null;
  const lastSeriesAt = series.observations[series.observations.length - 1]?.timestamp ?? null;
  const coversSeriesWindow = Boolean(
    firstVisibleAt && lastVisibleAt && firstVisibleAt === firstSeriesAt && lastVisibleAt === lastSeriesAt,
  );
  const expectedDayCount = coversSeriesWindow ? series.coverage?.expectedDays ?? null : null;
  const missingDayCount = expectedDayCount == null
    ? null
    : Math.max(0, expectedDayCount - (series.coverage?.observedDays ?? independentDayCount));

  return {
    analystModules: [
      { id: 'observed', action: 'none', count: viewData.observations.length, targetId: null },
      { id: 'related', action: relatedSeries ? 'compare' : 'none', count: relatedSeries ? relatedSeries.observations.length : null, targetId: relatedSeries?.id ?? null },
      { id: 'signal', action: primarySignal ? 'open_signal' : 'none', count: primarySignal?.observationCount ?? null, targetId: primarySignal?.id ?? null },
      { id: 'events', action: events.length ? 'show_events' : 'none', count: events.length, targetId: null },
      { id: 'evidence', action: 'open_evidence', count: viewData.observations.length, targetId: null },
      { id: 'unknown', action: 'none', count: missingDayCount, targetId: null },
    ],
    events,
    primarySignal,
    relatedSeries,
    evidence: {
      observationCount: viewData.observations.length,
      independentDayCount,
      expectedDayCount,
      missingDayCount,
      sourceCount: series.coverage?.sourceCount ?? 0,
    },
  };
}

export function highlightWindowForEvents(events: PersonalTerminalEvent[]): PersonalTerminalHighlightWindow | null {
  const ordered = events
    .filter((event) => timestamp(event.timestamp) != null)
    .sort((left, right) => timestamp(left.timestamp)! - timestamp(right.timestamp)!);
  if (!ordered.length) return null;
  return {
    kind: 'event',
    start: ordered[0].timestamp,
    end: ordered[ordered.length - 1].timestamp,
    sourceIds: ordered.flatMap((event) => event.sourceIds),
  };
}

export function highlightWindowForSignal(signal: PersonalTerminalSignal): PersonalTerminalHighlightWindow | null {
  const example = signal.recentExamples?.[signal.recentExamples.length - 1];
  if (!example) return null;
  const window = orderedWindow(example.sourceAt, example.targetAt);
  return {
    kind: 'signal',
    ...window,
    sourceIds: [example.sourceObservationId, example.targetObservationId],
  };
}
