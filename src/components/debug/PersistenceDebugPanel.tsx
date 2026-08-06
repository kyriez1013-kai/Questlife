import React, { useCallback, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useStore } from '../../store';
import { readPersistedDataForDebug } from '../../storage';
import {
  clearPersistenceTrace,
  downloadPersistenceSnapshot,
  hashPersistenceData,
  isPersistenceDebugEnabled,
  summarizePersistenceData,
} from '../../utils/persistenceTrace';

function compactSummary(data: ReturnType<typeof summarizePersistenceData>) {
  return `logs ${data.executionLogs} · captures ${data.rawCaptures} · efforts ${data.effortUnits} · links ${data.contributionLinks} · skills ${data.skills}`;
}

export default function PersistenceDebugPanel() {
  const { data, loading } = useStore();
  const [persistedSummary, setPersistedSummary] = useState('not read');
  const [snapshotStatus, setSnapshotStatus] = useState('');

  const refreshPersisted = useCallback(async () => {
    const persisted = await readPersistedDataForDebug();
    setPersistedSummary(persisted
      ? `${compactSummary(summarizePersistenceData(persisted))} · ${hashPersistenceData(persisted)}`
      : 'no persisted data');
    return persisted;
  }, []);

  useEffect(() => {
    if (!loading) void refreshPersisted();
  }, [data, loading, refreshPersisted]);

  if (!isPersistenceDebugEnabled()) return null;

  const storeSummary = summarizePersistenceData(data);
  return (
    <View
      accessibilityLabel="Persistence diagnostics"
      style={{
        position: 'fixed' as any,
        top: 8,
        right: 8,
        zIndex: 100000,
        width: 310,
        maxWidth: 'calc(100vw - 16px)' as any,
        borderRadius: 8,
        padding: 10,
        gap: 6,
        backgroundColor: 'rgba(12, 14, 18, 0.94)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.24)',
      }}
    >
      <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>Persistence diagnostics</Text>
      <Text testID="persistence-store-summary" style={{ color: '#E5E7EB', fontSize: 10 }}>
        Store: {compactSummary(storeSummary)} · {hashPersistenceData(data)} · {loading ? 'loading' : 'hydrated'}
      </Text>
      <Text testID="persistence-disk-summary" style={{ color: '#C7CEDA', fontSize: 10 }}>
        Disk: {persistedSummary}
      </Text>
      {snapshotStatus ? <Text style={{ color: '#A7F3D0', fontSize: 10 }}>{snapshotStatus}</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Download persistence snapshot"
          onPress={async () => {
            const persisted = await refreshPersisted();
            const saved = persisted ? downloadPersistenceSnapshot(persisted, 'before-test') : false;
            setSnapshotStatus(saved ? 'Snapshot downloaded' : 'No persisted data to download');
          }}
          style={{ minHeight: 32, justifyContent: 'center', paddingHorizontal: 8, borderRadius: 6, backgroundColor: '#315A8A' }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 10 }}>Download snapshot</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Refresh persisted summary"
          onPress={() => void refreshPersisted()}
          style={{ minHeight: 32, justifyContent: 'center', paddingHorizontal: 8, borderRadius: 6, backgroundColor: '#28313F' }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 10 }}>Refresh disk</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Clear persistence trace"
          onPress={() => {
            clearPersistenceTrace();
            setSnapshotStatus('Trace cleared');
          }}
          style={{ minHeight: 32, justifyContent: 'center', paddingHorizontal: 8, borderRadius: 6, backgroundColor: '#28313F' }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 10 }}>Clear trace</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
