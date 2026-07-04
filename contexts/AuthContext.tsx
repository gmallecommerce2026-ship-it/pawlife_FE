// contexts/AuthContext.tsx
import axiosClient from '@/api/axiosClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, ReactNode, useEffect, useState } from 'react';
import { authService, LoginPayload, RegisterPayload, SendOtpPayload } from '../services/authService';
// Import socket từ utils (Đảm bảo đường dẫn này khớp với project của bạn)
import { socket } from '@/utils/socket';

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  phone?: string;
  dob?: string;
  gender?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginPayload) => Promise<void>;
  register: (data: RegisterPayload) => Promise<any>;
  requestOtp: (data: SendOtpPayload) => Promise<any>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  setAuth: (token: string, userData: User) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Khôi phục session khi mở app
  useEffect(() => {
    const loadSession = async () => {
      try {
        const token = await SecureStore.getItemAsync('accessToken');
        const userData = await SecureStore.getItemAsync('userData');

        if (token && userData) {
          // BỔ SUNG: Gắn lại token vào Header của Axios Client ngay lập tức
          axiosClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          setUser(JSON.parse(userData));
        }
      } catch (error) {
        console.error('Lỗi khi load session / Error loading session:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSession();
  }, []);

  const login = async (data: LoginPayload) => {
    const response = await authService.loginAPI(data);

    // ĐÃ FIX: Lấy dữ liệu thực từ response.data của Axios
    const responseData = response.data ? response.data : response;

    if (responseData.accessToken && responseData.user) {
      await SecureStore.setItemAsync('accessToken', responseData.accessToken);
      await SecureStore.setItemAsync('userData', JSON.stringify(responseData.user));
      setUser(responseData.user);
    }
  };

  const register = async (data: RegisterPayload) => {
    return await authService.registerAPI(data);
  };

  const requestOtp = async (data: SendOtpPayload) => {
    return await authService.sendOtpAPI(data);
  };

  const logout = async () => {
    // 1. Dọn dẹp Socket triệt để
    if (socket) {
      // Xóa toàn bộ các sự kiện đang lắng nghe trước khi ngắt kết nối để tránh rò rỉ bộ nhớ
      socket.removeAllListeners();
      if (socket.connected) {
        socket.disconnect();
      }
    }

    // 2. Xóa đồng bộ ở TẤT CẢ các storage
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('userData');
    // Thêm dòng này vì trong updateUser bạn có dùng AsyncStorage
    await AsyncStorage.removeItem('user_data');

    // 3. Xóa thông tin auth trên axios
    delete axiosClient.defaults.headers.common['Authorization'];

    // 4. Reset User State
    setUser(null);
  };

  const updateUser = async (updatePayload: any) => {
    try {
      const response = await axiosClient.patch('/auth/me/profile', updatePayload);
      const updatedUserData = response.data.user;

      setUser((prev) => ({ ...prev, ...updatedUserData }) as User);

      const currentStorageStr = await AsyncStorage.getItem('user_data');
      if (currentStorageStr) {
        const currentStorage = JSON.parse(currentStorageStr);
        await AsyncStorage.setItem('user_data', JSON.stringify({ ...currentStorage, ...updatedUserData }));
      }
    } catch (error) {
      console.error("Lỗi cập nhật profile / Error updating profile:", error);
      throw error;
    }
  };

  const setAuth = async (token: string, userData: User) => {
    try {
      await SecureStore.setItemAsync('accessToken', token);
      await SecureStore.setItemAsync('userData', JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error('Lỗi khi lưu thông tin setAuth / Error saving setAuth info:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, requestOtp, logout, updateUser, setAuth }}>
      {children}
    </AuthContext.Provider>
  );
};