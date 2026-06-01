// utils/device.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto'; 
import { Platform } from 'react-native';

export const getUniqueDeviceId = async (): Promise<string> => {
  try {
    let deviceId = await AsyncStorage.getItem('X_DEVICE_ID');
    if (!deviceId) {
      // Dùng Expo Crypto để sinh UUID ngẫu nhiên vĩnh viễn cho máy
      deviceId = Crypto.randomUUID(); 
      await AsyncStorage.setItem('X_DEVICE_ID', deviceId);
    }
    return deviceId;
  } catch (e) {
    return `fallback_id_${Platform.OS}_${Date.now()}`;
  }
}