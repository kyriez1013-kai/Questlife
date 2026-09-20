export function ensurePkceCrypto() {
  if (!globalThis.crypto?.getRandomValues || !globalThis.crypto?.subtle?.digest || typeof TextEncoder === 'undefined')
    throw new Error('secure_crypto_unavailable');
}
