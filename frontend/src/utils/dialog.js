import { Platform, Alert } from 'react-native';

export const confirmDialog = (title, message, onConfirm) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const text = title ? `${title}: ${message}` : message;
    if (window.confirm(text)) {
      onConfirm();
    }
  } else {
    Alert.alert(title || 'Confirm', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onConfirm },
    ]);
  }
};

export const notify = (title, message) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(title ? `${title}\n\n${message}` : message);
  } else {
    Alert.alert(title, message);
  }
};

