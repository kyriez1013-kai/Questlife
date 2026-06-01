import { Alert, Platform } from 'react-native';

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmText: string;
  cancelText: string;
  destructive?: boolean;
  onConfirm: () => void;
};

export function confirmAction(options: ConfirmOptions) {
  const message = options.message ?? '';
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.confirm === 'function') {
    const body = message ? `${options.title}\n\n${message}` : options.title;
    if (window.confirm(body)) options.onConfirm();
    return;
  }

  Alert.alert(options.title, message, [
    { text: options.cancelText, style: 'cancel' },
    {
      text: options.confirmText,
      style: options.destructive ? 'destructive' : 'default',
      onPress: options.onConfirm,
    },
  ]);
}
