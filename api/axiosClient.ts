// api/axiosClient.ts
import axios from 'axios';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const BASE_URL = 'https://api.p3tid.com/';

// =======================================================================
// 🚀 IN-MEMORY CACHE: Tối ưu hiệu năng cực đại (Chống giật lag App)
// Thay vì đọc file vật lý (SecureStore) mỗi lần gọi API, ta lưu tạm lên RAM
// =======================================================================
let inMemoryToken: string | null = null;
let inMemoryDeviceId: string | null = null;
let isRedirecting = false; // Biến cờ chống gọi router.replace nhiều lần

// Hàm này được gọi khi User Đăng nhập thành công ở sign-in.tsx hoặc lúc App khởi động
export const setCachedAccessToken = (token: string | null) => {
  inMemoryToken = token;
};

const axiosClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// =======================================================================
// HÀM LẤY HOẶC TẠO DEVICE ID (CÓ SỬ DỤNG CACHE)
// =======================================================================
const getUniqueDeviceId = async (): Promise<string> => {
  if (inMemoryDeviceId) return inMemoryDeviceId; // Lấy từ RAM cực nhanh

  try {
    let deviceId = await SecureStore.getItemAsync('x_device_id');
    if (!deviceId) {
      deviceId = Crypto.randomUUID();
      await SecureStore.setItemAsync('x_device_id', deviceId);
    }
    inMemoryDeviceId = deviceId; // Cập nhật vào RAM
    return deviceId;
  } catch (error) {
    console.error('Lỗi khi lấy Device ID:', error);
    return `fallback_${Platform.OS}_${Date.now()}`;
  }
};

// =======================================================================
// REQUEST INTERCEPTOR
// =======================================================================
axiosClient.interceptors.request.use(
  async (config) => {
    try {
      // 1. LẤY TOKEN (Ưu tiên RAM -> Fallback SecureStore)
      let token = inMemoryToken;
      if (!token) {
        token = await SecureStore.getItemAsync('accessToken');
        if (token) inMemoryToken = token; // Lưu ngược lại lên RAM
      }

      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // 2. LẤY DEVICE ID
      const deviceId = await getUniqueDeviceId();
      if (config.headers) {
        config.headers['x-device-id'] = deviceId;
        // Bổ sung các thông số thiết bị (nên để ở đây luôn cho gọn)
        config.headers['x-device-name'] = Device.deviceName || Device.modelName || 'Unknown Device';
        config.headers['x-device-os'] = `${Platform.OS} ${Platform.Version}`;
      }
    } catch (error) {
      console.error('Lỗi Request Interceptor:', error);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// =======================================================================
// RESPONSE INTERCEPTOR
// =======================================================================
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const errorData = error.response?.data;
    const statusCode = errorData?.statusCode;
    const message = errorData?.message;

    // 1. LỖI THIẾU PROFILE
    if (statusCode === 4032 || message === 'PROFILE_INCOMPLETE') {
      if (!isRedirecting) {
        isRedirecting = true;
        router.replace('/complete-social-profile');
        setTimeout(() => { isRedirecting = false; }, 1000); // Mở khóa sau 1s
      }
      return Promise.reject(error);
    }

    // 2. LỖI HẾT HẠN TOKEN (401)
    if (error.response && error.response.status === 401) {
      const isLoginRoute = error.config?.url?.includes('/auth/login');
      
      if (!isLoginRoute && !isRedirecting) {
        isRedirecting = true; // KHÓA CỜ: Đảm bảo chỉ 1 request được chạy luồng logout
        
        // Dọn dẹp cache RAM và SecureStore
        inMemoryToken = null;
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('userData');
        
        // Điều hướng ra màn hình chính/login
        router.replace('/');
        
        // Mở khóa sau khi điều hướng xong (hoặc để nguyên true vì đã ra khỏi App)
        setTimeout(() => { isRedirecting = false; }, 1000); 
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosClient;