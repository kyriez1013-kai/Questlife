import type { Band } from './types';

export const MIN_BASELINE_N = 7;

export type Baseline = { median: number; scale: number; n: number; personal: boolean };

export function median(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function quantile(values: number[], q: number): number | undefined {
  if (!values.length) return undefined;
  const sorted = values.slice().sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/** Median absolute deviation, scaled (×1.4826) to be comparable to a standard deviation. */
export function scaledMad(values: number[]): number | undefined {
  const m = median(values);
  if (m === undefined) return undefined;
  return 1.4826 * (median(values.map((v) => Math.abs(v - m))) ?? 0);
}

/**
 * Personal baseline for a value series, or undefined when there are fewer than MIN_BASELINE_N
 * observations. `minScale` keeps integer scales and noisy sensors from flagging tiny deviations.
 */
export function personalBaseline(values: number[], minScale: number): Baseline | undefined {
  const clean = values.filter((v) => Number.isFinite(v));
  if (clean.length < MIN_BASELINE_N) return undefined;
  return { median: median(clean)!, scale: Math.max(scaledMad(clean)!, minScale), n: clean.length, personal: true };
}

/** 1–5 scale baseline: personal when ≥7 prior answers, otherwise the scale midpoint (3 ± 1). */
export function scaleBaseline(values: number[]): Baseline {
  return personalBaseline(values, 1) ?? { median: 3, scale: 1, n: values.length, personal: false };
}

/** Endpoints of the 1–5 scale always count as low/high, whatever the baseline. */
export function bandOf(value: number, baseline: Baseline): Band {
  if (value <= 1 || value <= baseline.median - baseline.scale) return 'low';
  if (value >= 5 || value >= baseline.median + baseline.scale) return 'high';
  return 'mid';
}
