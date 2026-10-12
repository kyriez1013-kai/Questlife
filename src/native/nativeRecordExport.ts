import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { randomUUID } from 'expo-crypto';
import type { AppData } from '../types';
import { createRecordBackup, parseRecordBackup, type RecordBackup } from '../backup/records';

export async function shareNativeRecordFile(data: AppData | RecordBackup, dialogTitle: string): Promise<'shared' | 'unavailable'> {
  const validated = 'format' in data ? parseRecordBackup(JSON.stringify(data)) : createRecordBackup(data, null).data;
  const content = JSON.stringify(validated, null, 2);
  if (!await Sharing.isAvailableAsync()) return 'unavailable';
  const directory = new Directory(Paths.cache, 'questlife-record-exports');
  directory.create({ idempotent: true });
  // Receivers may read after the share sheet returns. Retain recent files and
  // prune only this feature's old cache exports on a later confirmed export.
  for (const item of directory.list()) {
    if (item instanceof File && /^questlife-local-records-[0-9a-f-]+\.json$/.test(item.name)
      && item.modificationTime !== null && item.modificationTime < Date.now() - 24 * 60 * 60 * 1000) item.delete();
  }
  const file = new File(directory, `questlife-local-records-${randomUUID()}.json`);
  try {
    file.create();
    file.write(content);
    if (!file.exists || file.size === 0) throw new Error('record_export_file_empty');
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle });
  } catch (error) {
    if (file.exists) file.delete();
    throw error;
  }
  return 'shared';
}
