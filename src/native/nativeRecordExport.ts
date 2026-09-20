import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { randomUUID } from 'expo-crypto';
import type { AppData } from '../types';

export async function shareNativeRecordFile(data: AppData, dialogTitle: string): Promise<'shared' | 'unavailable'> {
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
    file.write(JSON.stringify(data, null, 2));
    if (!file.exists || file.size === 0) throw new Error('record_export_file_empty');
  } catch (error) {
    if (file.exists) file.delete();
    throw error;
  }
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle });
  return 'shared';
}
