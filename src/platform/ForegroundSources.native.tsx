import { useEffect } from 'react';
import { AppState } from 'react-native';
import { calendarSource, deviceRepository, healthSync } from './services';

export default function ForegroundSources() {
  useEffect(() => {
    let running = false;
    const refresh = async () => {
      if(running) return;
      running=true;
      try {
        const state=await deviceRepository.read();
        if(state.health.connected) await healthSync.sync().catch(()=>undefined);
        if(state.calendar.connected && state.calendar.selectedIds.length) {
          const start=new Date(); start.setHours(0,0,0,0);
          const end=new Date(start); end.setDate(end.getDate()+7);
          try { await calendarSource.sync(state.calendar.selectedIds,start.toISOString(),end.toISOString()); }
          catch { await deviceRepository.update(d=>({...d,calendar:{...d.calendar,error:'calendar_read_failed'}})); }
        }
      } catch { /* Source settings displays repository/read failure without private logs. */ }
      finally { running=false; }
    };
    void refresh();
    const listener=AppState.addEventListener('change',state=>{if(state==='active')void refresh();});
    return ()=>listener.remove();
  },[]);
  return null;
}
