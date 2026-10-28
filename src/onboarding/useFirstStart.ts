import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FirstStartAnswers } from './firstStart';

/** Device-local record of today's first-start answers, so Today can repeat the result page word for word. */
export const FIRST_START_KEY = 'questlife.firstStart.v1';
export type FirstStartRecord = { version: 1; date: string; answers: FirstStartAnswers };

export async function saveFirstStart(record: FirstStartRecord): Promise<void> {
  await AsyncStorage.setItem(FIRST_START_KEY, JSON.stringify(record));
}

/** Answers saved today, or null. Advisory only — the check-in itself is the durable record. */
export function useFirstStartAnswers(today: string): FirstStartAnswers | null {
  const [answers, setAnswers] = useState<FirstStartAnswers | null>(null);
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(FIRST_START_KEY)
      .then((raw) => {
        if (!alive || !raw) return;
        const rec = JSON.parse(raw) as FirstStartRecord;
        setAnswers(rec?.version === 1 && rec.date === today ? rec.answers : null);
      })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [today]);
  return answers;
}
