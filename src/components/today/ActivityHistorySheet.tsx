import React, { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { QuestTheme, questLayout } from '../../design/tokens';
import { RawCapture } from '../../types';
import { isV11TodayEnabled } from '../../v11/featureFlag';
import { getV11ThemeTokens } from '../../v11/tokens';
import useV11ReducedMotion from '../../v11/useV11ReducedMotion';
import V11Stage2ProductionSheet from '../../v11-stage2-rebaseline/V11Stage2ProductionSheet';
import { V11SheetButton } from '../../v11/components/V11SheetControls';
import QuestButton from '../ui/QuestButton';

const WebView = View as any;

const HISTORY_PAGE_SIZE = 20;

type ActivityHistorySheetProps = {
  visible: boolean;
  captures: RawCapture[];
  questTheme: QuestTheme;
  title: string;
  countLabel: string;
  closeLabel: string;
  loadMoreLabel: string;
  emptyLabel: string;
  onClose: () => void;
  renderCapture: (capture: RawCapture) => ReactNode;
};

export default function ActivityHistorySheet({
  visible,
  captures,
  questTheme,
  title,
  countLabel,
  closeLabel,
  loadMoreLabel,
  emptyLabel,
  onClose,
  renderCapture,
}: ActivityHistorySheetProps) {
  const [visibleCount, setVisibleCount] = useState(HISTORY_PAGE_SIZE);
  const pushedHistoryEntry = useRef(false);
  const onCloseRef = useRef(onClose);
  const v11Enabled = isV11TodayEnabled();
  const reducedMotion = useV11ReducedMotion();
  const v11Theme = getV11ThemeTokens(questTheme.id === 'cleanFocus' ? 'light' : 'dark');

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!visible) return;
    setVisibleCount(HISTORY_PAGE_SIZE);

    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    window.history.pushState(
      { questlifeActivityHistory: true },
      '',
      `${window.location.pathname}${window.location.search}#activity-history`,
    );
    pushedHistoryEntry.current = true;

    const handlePopState = () => {
      pushedHistoryEntry.current = false;
      onCloseRef.current();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [visible]);

  const requestClose = useCallback(() => {
    if (
      Platform.OS === 'web'
      && typeof window !== 'undefined'
      && pushedHistoryEntry.current
    ) {
      window.history.back();
      return;
    }
    onCloseRef.current();
  }, []);

  const visibleCaptures = captures.slice(0, visibleCount);
  const hasMore = visibleCount < captures.length;

  if (v11Enabled) {
    return (
      <V11Stage2ProductionSheet
        closeLabel={closeLabel}
        onClose={requestClose}
        reducedMotion={reducedMotion}
        sheet="production"
        theme={v11Theme}
        title={title}
        visible={visible}
      >
        <Text
          style={{
            color: questTheme.colors.textMuted,
            fontSize: questTheme.typography.metaSize,
            lineHeight: questTheme.typography.metaLineHeight,
            fontWeight: questTheme.typography.weightMedium,
          }}
        >
          {countLabel}
        </Text>
        <WebView dataSet={{ 'v11-rebaseline-role': 'history-list' }}>
          {visibleCaptures.length === 0 ? (
            <Text
              style={{
                color: questTheme.colors.textMuted,
                fontSize: questTheme.typography.bodySize,
                lineHeight: questTheme.typography.bodyLineHeight,
                textAlign: 'center',
                paddingVertical: questTheme.spacing.xl,
              }}
            >
              {emptyLabel}
            </Text>
          ) : visibleCaptures.map((capture) => (
            <React.Fragment key={capture.id}>{renderCapture(capture)}</React.Fragment>
          ))}
          {hasMore ? (
            <V11SheetButton
              label={loadMoreLabel}
              onPress={() => setVisibleCount((count) => Math.min(count + HISTORY_PAGE_SIZE, captures.length))}
              theme={v11Theme}
              variant="secondary"
            />
          ) : null}
        </WebView>
      </V11Stage2ProductionSheet>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={requestClose}
    >
      <View
        style={[
          styles.screen,
          {
            backgroundColor: questTheme.colors.background,
            paddingHorizontal: questTheme.spacing.md,
            paddingTop: questTheme.spacing.lg,
          },
        ]}
        accessibilityRole="none"
      >
        <View
          style={[
            styles.header,
            {
              borderBottomColor: questTheme.colors.divider,
              paddingBottom: questTheme.spacing.sm,
              gap: questTheme.spacing.sm,
            },
          ]}
        >
          <View style={styles.headerCopy}>
            <Text
              style={{
                color: questTheme.colors.text,
                fontSize: questTheme.typography.titleSize,
                lineHeight: questTheme.typography.titleLineHeight,
                fontWeight: questTheme.typography.weightBold,
              }}
            >
              {title}
            </Text>
            <Text
              style={{
                color: questTheme.colors.textMuted,
                fontSize: questTheme.typography.metaSize,
                lineHeight: questTheme.typography.metaLineHeight,
                fontWeight: questTheme.typography.weightMedium,
              }}
            >
              {countLabel}
            </Text>
          </View>
          <QuestButton
            questTheme={questTheme}
            variant="secondary"
            label={closeLabel}
            onPress={requestClose}
            accessibilityLabel={closeLabel}
          />
        </View>

        <FlatList
          data={visibleCaptures}
          keyExtractor={(capture) => capture.id}
          renderItem={({ item }) => <>{renderCapture(item)}</>}
          contentContainerStyle={[
            styles.listContent,
            {
              gap: questTheme.spacing.tight,
              paddingTop: questTheme.spacing.sm,
              paddingBottom: questLayout.contentBottomInset + questTheme.spacing.lg,
            },
            captures.length === 0 ? styles.emptyContent : null,
          ]}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={Math.min(HISTORY_PAGE_SIZE, captures.length)}
          maxToRenderPerBatch={HISTORY_PAGE_SIZE}
          windowSize={5}
          ListEmptyComponent={(
            <Text
              style={{
                color: questTheme.colors.textMuted,
                fontSize: questTheme.typography.bodySize,
                lineHeight: questTheme.typography.bodyLineHeight,
                textAlign: 'center',
              }}
            >
              {emptyLabel}
            </Text>
          )}
          ListFooterComponent={hasMore ? (
            <Pressable
              onPress={() => setVisibleCount((count) => Math.min(count + HISTORY_PAGE_SIZE, captures.length))}
              accessibilityRole="button"
              accessibilityLabel={loadMoreLabel}
              style={({ pressed }) => [
                styles.loadMore,
                {
                  minHeight: questLayout.controlMinHeight,
                  marginTop: questTheme.spacing.sm,
                  borderColor: questTheme.colors.border,
                  borderRadius: questTheme.radius.md,
                  backgroundColor: pressed
                    ? questTheme.colors.cardSurfaceHover
                    : questTheme.colors.surfaceMuted,
                },
              ]}
            >
              <Text
                style={{
                  color: questTheme.colors.textMuted,
                  fontSize: questTheme.typography.buttonSize,
                  fontWeight: questTheme.typography.weightBold,
                }}
              >
                {loadMoreLabel}
              </Text>
            </Pressable>
          ) : null}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  listContent: {
    width: '100%',
    maxWidth: questLayout.contentMaxWidth,
    alignSelf: 'center',
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  loadMore: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
