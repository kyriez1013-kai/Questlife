import type { AppData } from '../types';

const COLLECTION_KEYS = [
  'goals',
  'categories',
  'modules',
  'moduleSkillLinks',
  'skills',
  'actions',
  'executionLogs',
  'effortUnits',
  'contributionLinks',
  'rescueLogs',
  'stateCheckIns',
  'contextLogs',
  'decisionResults',
  'patternMemory',
  'scheduleBlocks',
  'rawCaptures',
] as const;

type CollectionKey = typeof COLLECTION_KEYS[number];
type Identified = { id?: unknown };

function sameValue(a: unknown, b: unknown) {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return a === b;
  }
}

function itemId(item: Identified, index: number) {
  return typeof item?.id === 'string' ? item.id : `index:${index}`;
}

function mapById(items: Identified[]) {
  return new Map(items.map((item, index) => [itemId(item, index), item]));
}

function mergeCollection(base: Identified[], next: Identified[], current: Identified[]) {
  const baseById = mapById(base);
  const nextById = mapById(next);
  const currentById = mapById(current);

  baseById.forEach((baseItem, id) => {
    const nextItem = nextById.get(id);
    if (!nextItem) {
      currentById.delete(id);
      return;
    }
    if (!sameValue(baseItem, nextItem)) currentById.set(id, nextItem);
  });

  nextById.forEach((nextItem, id) => {
    if (!baseById.has(id)) currentById.set(id, nextItem);
  });

  const orderedIds = [
    ...current.map(itemId),
    ...next.map(itemId),
  ];
  const seen = new Set<string>();
  return orderedIds.flatMap((id) => {
    if (seen.has(id)) return [];
    seen.add(id);
    const item = currentById.get(id);
    return item ? [item] : [];
  });
}

function mergeSettings(
  base: AppData['settings'],
  next: AppData['settings'],
  current: AppData['settings'],
) {
  const merged = { ...(current || {}) } as Record<string, unknown>;
  const baseRecord = (base || {}) as Record<string, unknown>;
  const nextRecord = (next || {}) as Record<string, unknown>;
  const keys = new Set([...Object.keys(baseRecord), ...Object.keys(nextRecord)]);
  keys.forEach((key) => {
    if (!(key in nextRecord)) {
      delete merged[key];
      return;
    }
    if (!(key in baseRecord) || !sameValue(baseRecord[key], nextRecord[key])) {
      merged[key] = nextRecord[key];
    }
  });
  return merged as AppData['settings'];
}

/**
 * Applies only the caller's base -> next delta onto the latest persisted data.
 * Collections merge by stable entity ID; explicit removals remain removals.
 */
export function rebaseAppDataWrite(base: AppData, next: AppData, current: AppData): AppData {
  const rebased = {
    ...current,
    settings: mergeSettings(base.settings, next.settings, current.settings),
  } as AppData;

  COLLECTION_KEYS.forEach((key) => {
    const baseItems = Array.isArray(base[key]) ? base[key] as Identified[] : [];
    const nextItems = Array.isArray(next[key]) ? next[key] as Identified[] : [];
    const currentItems = Array.isArray(current[key]) ? current[key] as Identified[] : [];
    (rebased as unknown as Record<CollectionKey, Identified[]>)[key] = mergeCollection(baseItems, nextItems, currentItems);
  });

  return rebased;
}

export function shouldPersistStoreMutation(hydrated: boolean) {
  return hydrated;
}
