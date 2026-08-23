// 通用底部弹出表单容器, 解决移动端键盘遮挡 + 表单滚动 + 收起键盘 三件事.
//
// 结构:
//   Modal (RN Modal, 全屏覆盖, transparent, slide 动画)
//     KeyboardAvoidingView (iOS: padding; Android 由系统的 adjustResize 处理)
//       Pressable backdrop (绝对全屏, 点击关闭整个弹窗)
//       Sheet 容器 (底部对齐, 最大 92% 高度)
//         ScrollView (keyboardShouldPersistTaps='handled' — 在 scroll/点击非输入区时自动收键盘)
//           children (你的表单字段)
//
// 用法:
//   <BottomSheetForm visible={open} onClose={close}>
//     <Text>...</Text>
//     <TextInput ... />
//   </BottomSheetForm>
//
// 注意:
//  - 在表单底部 (BottomSheetForm 内部) 已经有 paddingBottom: 120, 一般够了;
//    如果你的表单特别长, 自己再加一点.
//  - 单行 TextInput 建议加 returnKeyType="done" + onSubmitEditing={Keyboard.dismiss}
//    让 return 键能收键盘.
import React, { ReactNode } from 'react';
import {
  Modal, KeyboardAvoidingView, Platform, View, ScrollView, Pressable, StyleSheet,
} from 'react-native';
import { theme } from '../theme';
import { useStore } from '../store';
import { useQuestTheme } from '../design/useQuestTheme';
import { useQuestReducedMotion } from '../design/motion';
import QuestIcon from './ui/QuestIcon';
import { getLanguage, t } from '../i18n';
import { getV11ProductLanguage, getV11ProductThemeId, isV11ProductEnabled } from '../v11/featureFlag';

export interface BottomSheetFormProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  closeAccessibilityLabel?: string;
}

export default function BottomSheetForm({ visible, onClose, children, footer, closeAccessibilityLabel }: BottomSheetFormProps) {
  const { data } = useStore();
  const questTheme = useQuestTheme(getV11ProductThemeId(data.settings.selectedThemeId));
  const language = getV11ProductLanguage(getLanguage(data.settings.language));
  const v11ProductEnabled = isV11ProductEnabled();
  const reducedMotion = useQuestReducedMotion();
  const SheetView = View as any;
  const FooterView = View as any;
  const ChromeView = View as any;
  const BodyScrollView = ScrollView as any;
  return (
    <Modal visible={visible} transparent animationType={reducedMotion ? 'none' : 'slide'} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.fill}
        // iOS 顶部 status bar 区域不需要 KAV 留 padding
        keyboardVerticalOffset={0}
      >
        {/* 点击半透明遮罩 = 关闭弹窗 (RN 会自动收起键盘) */}
        <Pressable
          nativeID={v11ProductEnabled ? 'v11-bottom-sheet-scrim' : undefined}
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={closeAccessibilityLabel}
        />
        {/* sheet 本身: 底部对齐, 圆角, 最大 92% */}
        <SheetView
          className={`bottom-sheet-form${v11ProductEnabled ? ' v11-product-sheet' : ''}`}
          style={[
            styles.sheet,
            {
              backgroundColor: questTheme.colors.surfaceElevated,
              borderColor: questTheme.colors.borderStrong,
              shadowColor: questTheme.colors.cardShadow,
            },
          ]}
          pointerEvents="box-none"
          accessibilityRole="dialog"
          accessibilityViewIsModal
        >
          <ChromeView className="bottom-sheet-chrome" style={styles.chrome}>
            <View style={[styles.handle, { backgroundColor: questTheme.colors.borderStrong }]} />
            <Pressable
              accessibilityLabel={closeAccessibilityLabel ?? t(language, 'close')}
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                { backgroundColor: pressed ? questTheme.colors.surfaceSoft : 'transparent' },
              ]}
            >
              <View style={styles.closeIcon} pointerEvents="none">
                <QuestIcon name="plus" size={18} color={questTheme.colors.textMuted} />
              </View>
            </Pressable>
          </ChromeView>
          <BodyScrollView
            className="bottom-sheet-scroll"
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            contentContainerStyle={[styles.content, footer ? styles.contentWithFooter : null]}
            showsVerticalScrollIndicator={false}
            // 内部 ScrollView 自己接管手势, 不要让外面的滚动透传
            nestedScrollEnabled
          >
            {children}
          </BodyScrollView>
          {footer ? (
            <FooterView
              className="bottom-sheet-footer"
              style={[
                styles.footer,
                {
                  backgroundColor: questTheme.colors.surfaceElevated,
                  borderColor: questTheme.colors.border,
                },
              ]}
            >
              {footer}
            </FooterView>
          ) : null}
        </SheetView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: theme.bg,
    borderTopWidth: 1,
    borderColor: theme.border,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: -10 },
    shadowRadius: 28,
    elevation: 12,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 120, // 给虚拟键盘留余地, 滚到最底也能看到"创建/保存"
  },
  contentWithFooter: {
    paddingBottom: 24,
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 18,
  },
  chrome: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  handle: { width: 38, height: 4, borderRadius: 2 },
  closeButton: {
    position: 'absolute',
    right: 8,
    top: 2,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    transform: [{ rotate: '45deg' }],
  },
});
