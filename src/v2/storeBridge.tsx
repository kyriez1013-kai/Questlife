import React, { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { useStore } from '../store';

/**
 * Slice subscriptions on top of the existing single-context Store.
 *
 * Only <V2StoreBridge> calls `useStore()` (and therefore re-renders on every data change).
 * Its `children` prop keeps the same element identity, so React skips re-rendering them;
 * v2 components read data through `useV2Select(selector)`, which re-renders a component
 * only when *its* selected value changes (reference equality by default).
 */
type Store = ReturnType<typeof useStore>;

type Bridge = {
  get: () => Store;
  subscribe: (listener: () => void) => () => void;
};

const BridgeCtx = createContext<Bridge | null>(null);

export function V2StoreBridge({ children }: { children: React.ReactNode }) {
  const store = useStore();
  const ref = useRef(store);
  ref.current = store;
  const listeners = useRef(new Set<() => void>());
  const bridge = useMemo<Bridge>(() => ({
    get: () => ref.current,
    subscribe: (l) => { listeners.current.add(l); return () => { listeners.current.delete(l); }; },
  }), []);
  // Notify after commit so subscribers read the committed store.
  useEffect(() => { listeners.current.forEach((l) => l()); });
  return <BridgeCtx.Provider value={bridge}>{children}</BridgeCtx.Provider>;
}

function useBridge(): Bridge {
  const b = useContext(BridgeCtx);
  if (!b) throw new Error('v2 hooks must be used inside V2StoreBridge');
  return b;
}

export function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => Object.is((a as any)[k], (b as any)[k]));
}

/** Subscribe to a slice of the store. `selector` must be cheap and pure. */
export function useV2Select<T>(selector: (s: Store) => T, isEqual: (a: T, b: T) => boolean = Object.is): T {
  const bridge = useBridge();
  const last = useRef<{ v: T } | null>(null);
  const getSnapshot = () => {
    const next = selector(bridge.get());
    if (last.current && isEqual(last.current.v, next)) return last.current.v;
    last.current = { v: next };
    return next;
  };
  return useSyncExternalStore(bridge.subscribe, getSnapshot, getSnapshot);
}

/**
 * Stable action handles. Actions on the Store change identity whenever data changes,
 * so v2 components call them through this object, which always delegates to the latest store.
 */
export function useV2Actions() {
  const bridge = useBridge();
  return useMemo(() => ({
    createExecutionLog: (...a: Parameters<Store['createExecutionLog']>) => bridge.get().createExecutionLog(...a),
    waitForExecutionLog: (...a: Parameters<Store['waitForExecutionLog']>) => bridge.get().waitForExecutionLog(...a),
    waitForLocalWrites: () => bridge.get().waitForLocalWrites(),
    retryLocalWrites: () => bridge.get().retryLocalWrites(),
    createStateCheckIn: (...a: Parameters<Store['createStateCheckIn']>) => bridge.get().createStateCheckIn(...a),
    addRawCapture: (...a: Parameters<Store['addRawCapture']>) => bridge.get().addRawCapture(...a),
    updateRawCapture: (...a: Parameters<Store['updateRawCapture']>) => bridge.get().updateRawCapture(...a),
    deleteRawCapture: (...a: Parameters<Store['deleteRawCapture']>) => bridge.get().deleteRawCapture(...a),
    setSettings: (...a: Parameters<Store['setSettings']>) => bridge.get().setSettings(...a),
    completeRescueStep: (...a: Parameters<Store['completeRescueStep']>) => bridge.get().completeRescueStep(...a),
    completeActivationStep: (...a: Parameters<Store['completeActivationStep']>) => bridge.get().completeActivationStep(...a),
    createRescueLog: (...a: Parameters<Store['createRescueLog']>) => bridge.get().createRescueLog(...a),
    addContextLog: (...a: Parameters<Store['addContextLog']>) => bridge.get().addContextLog(...a),
    getState: () => bridge.get(),
  }), [bridge]);
}
