import type { AppData } from "../types";
import { APP_ENTITY_TYPES, entityKey, type Projection } from "./contracts";
import { appEntities, canonical } from "./registry";

export function localChanges(
  base: AppData,
  next: AppData,
  explicitDelete: boolean,
): Projection[] {
  const before = new Map(
    appEntities(base).map((row) => [
      entityKey(row.entityType, row.entityId),
      row,
    ]),
  );
  const after = appEntities(next);
  const present = new Set(
    after.map((row) => entityKey(row.entityType, row.entityId)),
  );
  const changes: Projection[] = after.filter(
    (row) =>
      canonical(
        before.get(entityKey(row.entityType, row.entityId))?.payload,
      ) !== canonical(row.payload),
  );
  // Only a labelled user delete/unlink may enqueue tombstones. Never repairs,
  // retention truncation, remote hydration, first load or fixture filtering.
  if (explicitDelete)
    for (const [key, row] of before) {
      const stillPresent = (
        next[row.entityType as (typeof APP_ENTITY_TYPES)[number]] as {
          id: string;
        }[]
      ).some((item) => item.id === row.entityId);
      if (!present.has(key) && !stillPresent)
        changes.push({ ...row, payload: null });
    }
  return changes;
}
export function projectAppData(data: AppData, changes: Projection[]): AppData {
  let result = data;
  for (const type of APP_ENTITY_TYPES) {
    const selected = changes.filter((c) => c.entityType === type);
    if (!selected.length) continue;
    const rows = new Map(
      (data[type] as { id: string }[]).map((row) => [row.id, row]),
    );
    for (const change of selected) {
      if (change.payload) rows.set(change.entityId, change.payload);
      else rows.delete(change.entityId);
    }
    result = { ...result, [type]: [...rows.values()] };
  }
  return result;
}
