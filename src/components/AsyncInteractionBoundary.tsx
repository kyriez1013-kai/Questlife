import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

export const AsyncInteractionContext = createContext<(key: object, pending: boolean) => void>(() => undefined);
export const AsyncInteractionGuard = createContext<(action: () => void) => void>(action => action());

// Report synchronously: a close event in this turn must not discard an active request.
export function useInteractionBusyState() {
  const report = useContext(AsyncInteractionContext);
  const key = useRef({});
  const [busy, setState] = useState(false);
  const setBusy = useCallback((value: boolean) => {
    report(key.current, value);
    setState(value);
  }, [report]);
  useEffect(() => {
    const identity = key.current;
    return () => report(identity, false);
  }, [report]);
  return [busy, setBusy] as const;
}
