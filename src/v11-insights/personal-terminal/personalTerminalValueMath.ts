import type { PersonalTerminalSeries } from './personalTerminalPresentation';

type ChangeSeries = Pick<PersonalTerminalSeries, 'semantic' | 'valueChangeMode'>;

export type PersonalTerminalDisplayChange = {
  absolute: number | null;
  percent: number | null;
};

export function relativePercentChange(current: number | null, reference: number | null) {
  if (current == null || reference == null || reference === 0) return null;
  return (current - reference) / Math.abs(reference) * 100;
}

export function resolvePersonalTerminalDisplayChange(
  series: ChangeSeries,
  current: number | null,
  reference: number | null,
): PersonalTerminalDisplayChange {
  const absolute = current == null || reference == null ? null : current - reference;
  const percentAllowed = series.valueChangeMode === 'percentage'
    && series.semantic !== 'ordinal_state'
    && series.semantic !== 'timing';
  return {
    absolute,
    percent: percentAllowed ? relativePercentChange(current, reference) : null,
  };
}
