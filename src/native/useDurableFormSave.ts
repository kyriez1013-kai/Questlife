import { useEffect, useRef, useState } from 'react';

/** Keep the original synchronous mutation and await its durable local receipt. */
export function useDurableFormSave({ visible, wait, retry, onSaved }: {
  visible: boolean; wait: () => Promise<void>; retry: () => Promise<void>; onSaved: () => void;
}) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const busy = useRef(false);
  const retrying = useRef(false);
  useEffect(() => { if (visible && !busy.current) { retrying.current = false; setStatus('idle'); } }, [visible]);
  const save = async (mutate: () => void) => {
    if (busy.current) return;
    busy.current = true;
    setStatus('saving');
    try {
      if (retrying.current) await retry();
      else { mutate(); retrying.current = true; await wait(); }
      retrying.current = false;
      setStatus('idle');
      onSaved();
    } catch {
      setStatus('error');
    } finally {
      busy.current = false;
    }
  };
  return { status, save, locked: status !== 'idle' };
}
