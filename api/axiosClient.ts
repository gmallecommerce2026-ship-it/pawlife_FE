// api/axiosClient.ts
import axios from 'axios';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
// Thay thế URL dưới đây bằng URL Cloudflare Tunnel thực tế
export const BASE_URL = 'https://api.p3tid.com/';

const axiosClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor cho Request: Tự động gắn Token vào Header
axiosClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Lỗi khi cấu hình token trong header:', error);
    }
    config.headers['x-device-name'] = Device.deviceName || Device.modelName || 'Unknown Device';
    config.headers['x-device-os'] = `${Platform.OS} ${Platform.Version}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor cho Response: Có thể xử lý lỗi chung (VD: hết hạn token) ở đây
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      // Dọn dẹp token và đẩy về màn hình chính
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('userData');
      router.replace('/');
    }
    return Promise.reject(error);
  }
);

export default axiosClient;