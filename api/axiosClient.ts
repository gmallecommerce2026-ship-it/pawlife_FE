// api/axiosClient.ts
import axios from 'axios';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { globalLoadingRef } from '@/contexts/LoadingContext';

export const BASE_URL = 'https://api.p3tid.com/';

// =======================================================================
// 🚀 IN-MEMORY CACHE
// =======================================================================
let inMemoryToken: string | null = null;
let inMemoryDeviceId: string | null = null;
let isRedirecting = false; 

export const setCachedAccessToken = (token: string | null) => {
  inMemoryToken = token;
};

// =======================================================================
// 🌐 GLOBAL LOADING LOGIC (Fix Race Condition & Memory Leaks)
// =======================================================================
let activeRequests = 0;
let showTimer: ReturnType<typeof setTimeout> | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let failsafeTimeout: ReturnType<typeof setTimeout> | null = null;
let loadingStartTime = 0;
let isLoaderVisible = false;
export let isSplashVideoPlaying = true;
export const setSplashVideoState = (isPlaying: boolean) => {
  isSplashVideoPlaying = isPlaying;
  
  // Nếu video vừa tắt đi, mà API vẫn chưa load xong -> Ép hiện Loading Con Chó
  if (!isPlaying && activeRequests > 0 && !isLoaderVisible) {
    isLoaderVisible = true;
    loadingStartTime = Date.now();
    globalLoadingRef.current?.showLoading();
  }
};
const MIN_LOADING_TIME = 500;  
const DELAY_BEFORE_SHOW = 250;

const forceHideLoading = () => {
  activeRequests = 0;
  isLoaderVisible = false;
  
  if (showTimer) { clearTimeout(showTimer); showTimer = null; }
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
  if (failsafeTimeout) { clearTimeout(failsafeTimeout); failsafeTimeout = null; }
  
  globalLoadingRef.current?.hideLoading();
};

const showGlobalLoading = () => {
  activeRequests++;
  
  if (activeRequests === 1) {
    showTimer = setTimeout(() => {
      // BỔ SUNG: Nếu Video đang chạy -> Bỏ qua, không hiện Loading để tránh che video
      if (isSplashVideoPlaying) return; 

      isLoaderVisible = true;
      loadingStartTime = Date.now();
      globalLoadingRef.current?.showLoading();

      failsafeTimeout = setTimeout(() => {
        forceHideLoading();
      }, 15000); 
    }, DELAY_BEFORE_SHOW);
  }
};

const hideGlobalLoading = () => {
  activeRequests = Math.max(0, activeRequests - 1);
  
  if (activeRequests === 0) {
    // 1. Nếu API chạy xong nhanh hơn 250ms -> Hủy bỏ lệnh show ngay lập tức
    if (showTimer) {
      clearTimeout(showTimer);
      showTimer = null;
    }

    // 2. Nếu Loading đã hiện, ép chờ đủ MIN_LOADING_TIME mới tắt để tránh chớp nháy
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
    } else {
      // Đảm bảo dọn dẹp sạch sẽ nếu loader chưa kịp hiện
      forceHideLoading();
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
// HÀM LẤY HOẶC TẠO DEVICE ID
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
    return `fallback_${Platform.OS}_${Date.now()}`;
  }
};

// =======================================================================
// REQUEST INTERCEPTOR
// =======================================================================
axiosClient.interceptors.request.use(
  async (config) => {
    try {
      let token = inMemoryToken;
      if (!token) {
        token = await SecureStore.getItemAsync('accessToken'); 
        if (token) inMemoryToken = token;
      }

      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      const deviceId = await getUniqueDeviceId();
      if (config.headers) {
        config.headers['x-device-id'] = deviceId;
        config.headers['x-device-name'] = Device.deviceName || Device.modelName || 'Unknown Device';
        config.headers['x-device-os'] = `${Platform.OS} ${Platform.Version}`;
      }
      
      // BẬT LOADING (Bỏ qua nếu có header X-Silent-Request)
      if (config.headers && !config.headers['X-Silent-Request']) {
        showGlobalLoading();
      }
    } catch (error) {
      console.error('Interceptor Error:', error);
    }
    return config;
  },
  (error) => {
    if (error.config && error.config.headers && !error.config.headers['X-Silent-Request']) {
      hideGlobalLoading();
    }
    return Promise.reject(error);
  }
);

// =======================================================================
// RESPONSE INTERCEPTOR
// =======================================================================
axiosClient.interceptors.response.use(
  (response) => {
    if (response.config && response.config.headers && !response.config.headers['X-Silent-Request']) {
      hideGlobalLoading();
    }
    return response;
  },
  async (error) => {
    // TẮT LOADING TRƯỚC KHI XỬ LÝ LỖI
    if (error.config && error.config.headers && !error.config.headers['X-Silent-Request']) {
      hideGlobalLoading();
    }

    const errorData = error.response?.data;
    const statusCode = errorData?.statusCode;
    const message = errorData?.message;

    if (statusCode === 4032 || message === 'PROFILE_INCOMPLETE') {
      if (!isRedirecting) {
        isRedirecting = true;
        router.replace('/complete-social-profile');
        setTimeout(() => { isRedirecting = false; }, 1000);
      }
      return Promise.reject(error);
    }

    if (error.response && error.response.status === 401) {
      const isLoginRoute = error.config?.url?.includes('/auth/login');
      
      if (!isLoginRoute && !isRedirecting) {
        isRedirecting = true; 
        
        inMemoryToken = null;
        await SecureStore.deleteItemAsync('accessToken'); 
        await SecureStore.deleteItemAsync('userData');
        
        router.replace('/');
        setTimeout(() => { isRedirecting = false; }, 1000); 
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosClient;