import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { notificationsAPI } from '../services/api';

// Show notifications even when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function usePushToken(user) {
  useEffect(() => {
    if (!user) return;
    registerPushToken();
  }, [user]);
}

export async function disablePushToken() {
  try {
    await notificationsAPI.savePushToken(null);
  } catch (err) {
    console.warn('[PushToken] Failed to disable:', err.message);
  }
}

export { registerPushToken };

async function registerPushToken() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.warn('[PushToken] No projectId found. Run npx eas init to set one up.');
    return;
  }

  try {
    const { data: pushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
    await notificationsAPI.savePushToken(pushToken);
    console.log('[PushToken] Registered:', pushToken);
  } catch (err) {
    console.warn('[PushToken] Failed:', err.message);
  }
}
