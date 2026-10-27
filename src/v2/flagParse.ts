export type V2Direction = 'A' | 'B';
export type V2Mode = 'light' | 'dark';

/** Pure (no react-native import) so it can be unit-tested in node. */
export function parseV2Flag(value: string | null | undefined): { enabled: boolean; direction: V2Direction } {
  const v = (value ?? '').toLowerCase();
  if (v === 'b') return { enabled: true, direction: 'B' };
  if (v === '1' || v === 'a' || v === 'true') return { enabled: true, direction: 'A' };
  return { enabled: false, direction: 'A' };
}
