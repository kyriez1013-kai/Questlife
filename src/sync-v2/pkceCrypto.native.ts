import { getRandomValues, digest, CryptoDigestAlgorithm } from 'expo-crypto';

/** SDK54 Hermes has no full WebCrypto implementation. Supply only the two
 * operations used by Supabase PKCE, backed by the existing Expo native module. */
export function ensurePkceCrypto() {
  const current = (globalThis.crypto ?? {}) as Crypto;
  if (!current.getRandomValues) Object.defineProperty(current, 'getRandomValues', { value: getRandomValues });
  if (!current.subtle?.digest) Object.defineProperty(current, 'subtle', { value: {
    digest: (algorithm: string | Algorithm, data: BufferSource) => {
      if ((typeof algorithm === 'string' ? algorithm : algorithm.name) !== 'SHA-256')
        return Promise.reject(new Error('unsupported_digest'));
      return digest(CryptoDigestAlgorithm.SHA256, data);
    },
  } });
  if (!globalThis.crypto) Object.defineProperty(globalThis, 'crypto', { value: current });
  if (typeof TextEncoder === 'undefined') throw new Error('secure_crypto_unavailable');
}
