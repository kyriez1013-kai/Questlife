import type { ExternalCommitment } from '../contracts';

// Web has no system Calendar adapter. Do not pretend a provider was checked.
export async function readPlanCalendar(_dates: string[]): Promise<ExternalCommitment[]> { return []; }
