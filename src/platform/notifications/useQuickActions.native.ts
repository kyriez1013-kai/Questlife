import {useEffect,useRef} from 'react';
import type {QuickActionIntent} from '../contracts';
import {registerNotificationHandler} from './intentBus';
export function useQuickActions(handler:(intent:QuickActionIntent)=>void){
  const current=useRef(handler);current.current=handler;
  useEffect(()=>registerNotificationHandler(intent=>current.current(intent)),[]);
}
