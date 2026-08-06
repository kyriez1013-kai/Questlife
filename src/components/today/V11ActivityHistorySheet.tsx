import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { V11ThemeTokens } from '../../v11/tokens';
import { V11InlineButton, V11SheetButton } from '../../v11/components/V11SheetControls';
import useV11ReducedMotion from '../../v11/useV11ReducedMotion';
import V11RebaselineIcon from '../../v11-stage2-rebaseline/V11RebaselineIcon';
import V11Stage2ProductionSheet from '../../v11-stage2-rebaseline/V11Stage2ProductionSheet';
import '../../v11-stage2-rebaseline/v11-stage2-rebaseline.css';

const WebView = View as any;
const WebPressable = Pressable as any;
const PAGE_SIZE = 20;

export type V11ActivityRecord = {
  id: string;
  feedback?: {
    detail: string;
    summary: string;
  };
  metadata?: string;
  time: string;
  title: string;
};

type Props = {
  closeLabel: string;
  deleteLabel: string;
  detailTitle: string;
  emptyLabel: string;
  feedbackTitle: string;
  historyTitle: string;
  loadMoreLabel: string;
  onClose: () => void;
  onDeleteRecord: (id: string) => void;
  records: V11ActivityRecord[];
  theme: V11ThemeTokens;
  visible: boolean;
};

export default function V11ActivityHistorySheet({
  closeLabel,
  deleteLabel,
  detailTitle,
  emptyLabel,
  feedbackTitle,
  historyTitle,
  loadMoreLabel,
  onClose,
  onDeleteRecord,
  records,
  theme,
  visible,
}: Props) {
  const reducedMotion = useV11ReducedMotion();
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedRecordId),
    [records, selectedRecordId],
  );

  useEffect(() => {
    if (!visible) {
      setSelectedRecordId(null);
      setVisibleCount(PAGE_SIZE);
      return;
    }
    if (selectedRecordId && !records.some((record) => record.id === selectedRecordId)) {
      setSelectedRecordId(null);
    }
  }, [records, selectedRecordId, visible]);

  const visibleRecords = records.slice(0, visibleCount);
  const hasMore = visibleCount < records.length;

  return (
    <V11Stage2ProductionSheet
      closeLabel={closeLabel}
      onClose={onClose}
      reducedMotion={reducedMotion}
      sheet="production"
      theme={theme}
      title={selectedRecord ? detailTitle : `${historyTitle} · ${records.length}`}
      visible={visible}
    >
      {selectedRecord ? (
        <WebView dataSet={{ 'v11-rebaseline-role': 'record-detail' }}>
          <V11InlineButton
            label={historyTitle}
            onPress={() => setSelectedRecordId(null)}
            theme={theme}
          />
          <WebView dataSet={{ 'v11-rebaseline-role': 'record-detail-summary' }}>
            <V11RebaselineIcon name="activity" size={18} color={theme.glow.primary} />
            <WebView style={{ flex: 1, flexShrink: 1, minWidth: 0 }}>
              <Text style={{ color: theme.text.primary, fontSize: 17, lineHeight: 24, fontWeight: '500' }}>
                {selectedRecord.title}
              </Text>
              {selectedRecord.metadata ? (
                <Text style={{ color: theme.text.secondary, fontSize: 12, lineHeight: 18 }}>
                  {selectedRecord.metadata}
                </Text>
              ) : null}
            </WebView>
            <Text style={{ color: theme.text.metadata, fontSize: 11, lineHeight: 16 }}>
              {selectedRecord.time}
            </Text>
          </WebView>

          {selectedRecord.feedback ? (
            <WebView dataSet={{ 'v11-rebaseline-role': 'record-feedback' }}>
              <Text style={{ color: theme.text.metadata, fontSize: 10, lineHeight: 15, letterSpacing: 0.7 }}>
                {feedbackTitle}
              </Text>
              <Text style={{ color: theme.text.primary, fontSize: 14, lineHeight: 21 }}>
                {selectedRecord.feedback.summary}
              </Text>
              <Text style={{ color: theme.text.secondary, fontSize: 12, lineHeight: 18 }}>
                {selectedRecord.feedback.detail}
              </Text>
            </WebView>
          ) : null}

          <V11InlineButton
            label={deleteLabel}
            onPress={() => onDeleteRecord(selectedRecord.id)}
            theme={theme}
            tone="danger"
          />
        </WebView>
      ) : (
        <WebView dataSet={{ 'v11-rebaseline-role': 'history-list' }}>
          {visibleRecords.length === 0 ? (
            <Text style={{ color: theme.text.secondary, fontSize: 13, lineHeight: 20 }}>
              {emptyLabel}
            </Text>
          ) : visibleRecords.map((record) => (
            <WebPressable
              accessibilityLabel={record.title}
              accessibilityRole="button"
              dataSet={{ 'v11-record-id': record.id, 'v11-rebaseline-role': 'history-row' }}
              key={record.id}
              onPress={() => setSelectedRecordId(record.id)}
            >
              <V11RebaselineIcon name="activity" size={18} color={theme.glow.primary} />
              <WebView style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={2} style={{ color: theme.text.primary, fontSize: 15, lineHeight: 21, fontWeight: '500' }}>
                  {record.title}
                </Text>
                {record.metadata ? (
                  <Text numberOfLines={2} style={{ color: theme.text.secondary, fontSize: 12, lineHeight: 18 }}>
                    {record.metadata}
                  </Text>
                ) : null}
              </WebView>
              <Text style={{ color: theme.text.metadata, fontSize: 11, lineHeight: 16 }}>
                {record.time}
              </Text>
            </WebPressable>
          ))}
          {hasMore ? (
            <V11SheetButton
              label={loadMoreLabel}
              onPress={() => setVisibleCount((count) => Math.min(count + PAGE_SIZE, records.length))}
              theme={theme}
              variant="secondary"
            />
          ) : null}
        </WebView>
      )}
    </V11Stage2ProductionSheet>
  );
}
