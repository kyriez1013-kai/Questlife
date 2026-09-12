import { useEffect, useState } from 'react';
import { deviceRepository } from './services';
import { emptyDeviceData } from './deviceRepository';

export function useDeviceData() {
  const [data, setData] = useState(emptyDeviceData);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    const refresh = () => { void deviceRepository.read().then(value => { if(active){setData(value);setError(false);} }).catch(() => {if(active)setError(true);}); };
    const unsubscribe = deviceRepository.subscribe(refresh);
    refresh();
    return () => { active=false; unsubscribe(); };
  }, []);
  return { data, error };
}
