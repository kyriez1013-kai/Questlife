import type { StateCheckIn } from '../types';

const NON_PERSONAL_ORIGINS = new Set(['SYNTHETIC', 'QA_TEST', 'DEBUG_FIXTURE']);

export function localStateDate(now: Date) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// Use the same source eligibility as the existing owner decision assembler.
export function eligibleStateObservations(rows: StateCheckIn[], now = new Date()) {
  const asOf = now.getTime();
  return (rows || []).filter((row) => {
    const provenance = row.dataProvenance;
    const observedAt = Date.parse(row.timestamp ?? row.createdAt);
    const availableAt = Date.parse(provenance?.availableAt ?? row.createdAt ?? row.timestamp);
    return Number.isFinite(row.overall) && row.overall >= 1 && row.overall <= 5
      && Number.isFinite(observedAt) && observedAt <= asOf
      && Number.isFinite(availableAt) && availableAt <= asOf
      && !provenance?.deleted
      && !NON_PERSONAL_ORIGINS.has(provenance?.origin ?? '');
  }).slice().sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
}

export function currentDayStateObservations(rows: StateCheckIn[], today: string, now = new Date()) {
  return eligibleStateObservations(rows, now).filter((row) => row.date === today);
}
