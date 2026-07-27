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
import QuestButton from '../ui/QuestButton';

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

  useEffect(() => {
    if (!visible) return;
    setVisibleCount(HISTORY_PAGE_SIZE);

    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    window.history.pushState({ questlifeActivityHistory: true }, '');
    pushedHistoryEntry.current = true;

    const handlePopState = () => {
      pushedHistoryEntry.current = false;
      onClose();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [onClose, visible]);

  const requestClose = useCallback(() => {
    if (
      Platform.OS === 'web'
      && typeof window !== 'undefined'
      && pushedHistoryEntry.current
    ) {
      window.history.back();
      return;
    }
    onClose();
  }, [onClose]);

  const visibleCaptures = captures.slice(0, visibleCount);
  const hasMore = visibleCount < captures.length;

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
