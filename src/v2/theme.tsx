import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { v2Tokens, type V2Tokens } from './tokens';
import type { V2Direction, V2Mode } from './flagParse';

const ThemeCtx = createContext<V2Tokens | null>(null);

export function V2ThemeProvider({
  direction, forcedMode, children,
}: { direction: V2Direction; forcedMode?: V2Mode | null; children: React.ReactNode }) {
  const system = useColorScheme();
  const mode: V2Mode = forcedMode ?? (system === 'dark' ? 'dark' : 'light');
  const tokens = useMemo(() => v2Tokens(direction, mode), [direction, mode]);
  return <ThemeCtx.Provider value={tokens}>{children}</ThemeCtx.Provider>;
}

export function useV2Theme(): V2Tokens {
  const t = useContext(ThemeCtx);
  if (!t) throw new Error('useV2Theme must be used inside V2ThemeProvider');
  return t;
}

/** Text style helper: type level → RN style */
export function textStyle(tokens: V2Tokens, level: keyof V2Tokens['type'], color?: string) {
  const s = tokens.type[level];
  return { fontSize: s.size, lineHeight: s.line, fontWeight: s.weight, letterSpacing: s.tracking, color: color ?? tokens.color.ink } as const;
}
