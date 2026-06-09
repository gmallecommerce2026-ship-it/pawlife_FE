// api/axiosClient.ts
import axios from 'axios';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// BỔ SUNG: Import global ref từ LoadingContext của bạn
import { globalLoadingRef } from '@/contexts/LoadingContext';

export const BASE_URL = 'https://api.p3tid.com/';

// =======================================================================
// 🚀 IN-MEMORY CACHE: Tối ưu hiệu năng cực đại (Chống giật lag App)
// =======================================================================
let inMemoryToken: string | null = null;
let inMemoryDeviceId: string | null = null;
let isRedirecting = false; // Biến cờ chống gọi router.replace nhiều lần

export const setCachedAccessToken = (token: string | null) => {
  inMemoryToken = token;
};

// =======================================================================
// 🌐 GLOBAL LOADING LOGIC (Biến đếm request để xử lý gọi API đồng thời)
// =======================================================================
// =======================================================================
// 🌐 GLOBAL LOADING LOGIC (Có cơ chế Failsafe chống đơ App)
// =======================================================================
let activeRequests = 0;
let failsafeTimeout: any = null;
let showTimer: any = null;
let hideTimer: any = null;
let loadingStartTime = 0;
let isLoaderVisible = false;

const MIN_LOADING_TIME = 600;  // Nếu đã hiện, giữ ít nhất 0.6 giây
const DELAY_BEFORE_SHOW = 250; // Nếu API xong trước 250ms, không hiện loading

const forceHideLoading = () => {
  activeRequests = 0;
  isLoaderVisible = false;
  if (showTimer) clearTimeout(showTimer);
  if (hideTimer) clearTimeout(hideTimer);
  if (failsafeTimeout) clearTimeout(failsafeTimeout);
  globalLoadingRef.current?.hideLoading();
};

const showGlobalLoading = () => {
  if (activeRequests === 0) {
    // Đợi 250ms mới gọi màn hình Loading
    showTimer = setTimeout(() => {
      isLoaderVisible = true;
      loadingStartTime = Date.now();
      globalLoadingRef.current?.showLoading();
    }, DELAY_BEFORE_SHOW);
  }
  activeRequests++;

  // Failsafe 15s: Chống treo app nếu rớt mạng
  if (failsafeTimeout) clearTimeout(failsafeTimeout);
  failsafeTimeout = setTimeout(() => {
    forceHideLoading();
  }, 15000); 
};

const hideGlobalLoading = () => {
  activeRequests = Math.max(0, activeRequests - 1);
  if (activeRequests === 0) {
    // 1. Nếu API chạy xong nhanh hơn 250ms -> Hủy bỏ lệnh show -> UI mượt, không chớp giật
    if (showTimer) {
      clearTimeout(showTimer);
      showTimer = null;
    }
    
    if (failsafeTimeout) {
      clearTimeout(failsafeTimeout);
      failsafeTimeout = null;
    }

    // 2. Nếu Loading đã lỡ hiện lên rồi -> Ép nó chờ cho đủ 600ms mới được tắt
    if (isLoaderVisible) {
      const elapsedTime = Date.now() - loadingStartTime;
      const remainingTime = MIN_LOADING_TIME - elapsedTime;

      if (remainingTime > 0) {
        hideTimer = setTimeout(() => {
          forceHideLoading();
        }, remainingTime);
      } else {
        forceHideLoading();
      }
    }
  }
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
  if (inMemoryDeviceId) return inMemoryDeviceId;

  try {
    let deviceId = await SecureStore.getItemAsync('x_device_id');
    if (!deviceId) {
      deviceId = Crypto.randomUUID();
      await SecureStore.setItemAsync('x_device_id', deviceId);
    }
    inMemoryDeviceId = deviceId;
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
        token = await SecureStore.getItemAsync('accessToken'); // Hoặc 'access_token' tuỳ code auth
        if (token) inMemoryToken = token;
      }

      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // 2. LẤY DEVICE ID & INFO
      const deviceId = await getUniqueDeviceId();
      if (config.headers) {
        config.headers['x-device-id'] = deviceId;
        config.headers['x-device-name'] = Device.deviceName || Device.modelName || 'Unknown Device';
        config.headers['x-device-os'] = `${Platform.OS} ${Platform.Version}`;
      }
      
      // 3. BẬT LOADING SCREEN
      // Nếu API không có header 'X-Silent-Request' thì mới bật loading
      if (config.headers && !config.headers['X-Silent-Request']) {
        showGlobalLoading();
      }

    } catch (error) {
      console.error('Lỗi Request Interceptor:', error);
    }

    return config;
  },
  (error) => {
    // Tắt loading nếu request fail ngay từ đầu
    hideGlobalLoading();
    return Promise.reject(error);
  }
);

// =======================================================================
// RESPONSE INTERCEPTOR
// =======================================================================
axiosClient.interceptors.response.use(
  (response) => {
    // 1. TẮT LOADING KHI THÀNH CÔNG
    if (response.config && response.config.headers && !response.config.headers['X-Silent-Request']) {
      hideGlobalLoading();
    }
    return response;
  },
  async (error) => {
    // 1. TẮT LOADING KHI CÓ LỖI (Quan trọng: Phải tắt loading trước khi handle lỗi/redirect)
    if (error.config && error.config.headers && !error.config.headers['X-Silent-Request']) {
      hideGlobalLoading();
    }

    const errorData = error.response?.data;
    const statusCode = errorData?.statusCode;
    const message = errorData?.message;

    // 2. LỖI THIẾU PROFILE
    if (statusCode === 4032 || message === 'PROFILE_INCOMPLETE') {
      if (!isRedirecting) {
        isRedirecting = true;
        router.replace('/complete-social-profile');
        setTimeout(() => { isRedirecting = false; }, 1000);
      }
      return Promise.reject(error);
    }

    // 3. LỖI HẾT HẠN TOKEN (401)
    if (error.response && error.response.status === 401) {
      const isLoginRoute = error.config?.url?.includes('/auth/login');
      
      if (!isLoginRoute && !isRedirecting) {
        isRedirecting = true; 
        
        // Dọn dẹp cache RAM và SecureStore
        inMemoryToken = null;
        await SecureStore.deleteItemAsync('accessToken'); // Nếu bạn lưu key là access_token thì sửa lại cho đúng
        await SecureStore.deleteItemAsync('userData');
        
        // Điều hướng ra màn hình chính/login
        router.replace('/');
        
        setTimeout(() => { isRedirecting = false; }, 1000); 
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosClient;