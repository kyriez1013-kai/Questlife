import * as SecureStore from 'expo-secure-store';
// Supabase sessions can exceed historical iOS keychain limits. Chunks are
// written under a new generation before switching the manifest pointer.
const safe = (key: string) => key.replace(/[^a-zA-Z0-9._-]/g, '_');
export const sessionStorage = {
  async getItem(key: string) {
    const raw = await SecureStore.getItemAsync(safe(key));
    if (!raw) return null;
    const manifest = JSON.parse(raw) as { generation: string; count: number };
    if (!manifest.generation || !Number.isInteger(manifest.count) || manifest.count < 1 || manifest.count > 100) throw new Error('session_storage_invalid');
    const chunks = await Promise.all(Array.from({ length: manifest.count }, (_, i) => SecureStore.getItemAsync(`${safe(key)}.${manifest.generation}.${i}`)));
    if (chunks.some(value => value === null)) throw new Error('session_storage_incomplete');
    return chunks.join('');
  },
  async setItem(key: string, value: string) {
    const previous = await SecureStore.getItemAsync(safe(key));
    const generation = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const chunks = value.match(/[\s\S]{1,1000}/g) ?? [''];
    for (let i = 0; i < chunks.length; i++) await SecureStore.setItemAsync(`${safe(key)}.${generation}.${i}`, chunks[i]);
    await SecureStore.setItemAsync(safe(key), JSON.stringify({ generation, count: chunks.length }));
    if (previous) {
      const old = JSON.parse(previous);
      for (let i = 0; i < old.count; i++) await SecureStore.deleteItemAsync(`${safe(key)}.${old.generation}.${i}`);
    }
  },
  async removeItem(key: string) {
    const raw = await SecureStore.getItemAsync(safe(key));
    await SecureStore.deleteItemAsync(safe(key));
    if (raw) {
      const old = JSON.parse(raw);
      for (let i = 0; i < old.count; i++) await SecureStore.deleteItemAsync(`${safe(key)}.${old.generation}.${i}`);
    }
  },
};
