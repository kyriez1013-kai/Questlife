import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type ProductionSheet from './V11Stage2ProductionSheet';
import V11RebaselineIcon from './V11RebaselineIcon';

export default function NativeProductionSheet({ children, closeLabel, footer, onClose, theme, title, visible }: React.ComponentProps<typeof ProductionSheet>) {
  const insets = useSafeAreaInsets();
  return <Modal transparent animationType="none" visible={visible} onRequestClose={onClose} statusBarTranslucent>
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <View style={{ flex: 1, justifyContent: 'flex-end', paddingTop: insets.top + 12, backgroundColor: theme.questTheme.colors.overlay }}>
        <Pressable accessibilityLabel={closeLabel} onPress={onClose} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal style={{ maxHeight: '94%', width: '100%', maxWidth: 680, alignSelf: 'center', backgroundColor: theme.questTheme.colors.surfaceElevated, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: Math.max(insets.bottom, 12), overflow: 'hidden' }}>
          <View style={{ paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text accessibilityRole="header" style={{ flex: 1, fontSize: 20, lineHeight: 26, color: theme.text.primary }}>{title}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose} style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}><V11RebaselineIcon name="close" size={20} color={theme.text.primary} /></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
            {children}
          </ScrollView>
          {footer ? <View style={{ paddingHorizontal: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.control.borderSubtle }}>{footer}</View> : null}
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
