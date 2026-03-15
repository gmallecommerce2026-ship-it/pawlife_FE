// contexts/AuthContext.tsx
import * as SecureStore from 'expo-secure-store';
import React, { createContext, ReactNode, useEffect, useState } from 'react';
import { authService, LoginPayload, RegisterPayload, SendOtpPayload } from '../services/authService';

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
  register: (data: RegisterPayload) => Promise<void>;
  requestOtp: (data: SendOtpPayload) => Promise<any>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  // BỔ SUNG: Định nghĩa hàm setAuth
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
          setUser(JSON.parse(userData));
        }
      } catch (error) {
        console.error('Lỗi khi load session:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSession();
  }, []);

  
  const login = async (data: LoginPayload) => {
    const response = await authService.loginAPI(data);
    if (response.accessToken && response.user) {
      // Lưu vào SecureStore
      await SecureStore.setItemAsync('accessToken', response.accessToken);
      await SecureStore.setItemAsync('userData', JSON.stringify(response.user));
      setUser(response.user);
    }
  };

  const register = async (data: RegisterPayload) => {
    // Trả về response để component xử lý alert hoặc điều hướng
    return await authService.registerAPI(data); 
  };

  const requestOtp = async (data: SendOtpPayload) => {
    return await authService.sendOtpAPI(data);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('userData');
    setUser(null);
  };

  const updateUser = async (updatedData: Partial<User>) => {
    if (!user) return;
    const newUser = { ...user, ...updatedData };
    setUser(newUser);
    // Cập nhật lại vào SecureStore để giữ data khi tắt app
    await SecureStore.setItemAsync('userData', JSON.stringify(newUser));
  };

  // BỔ SUNG: Hàm setAuth dùng cho 2FA và Social Login
  const setAuth = async (token: string, userData: User) => {
    try {
      await SecureStore.setItemAsync('accessToken', token);
      await SecureStore.setItemAsync('userData', JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error('Lỗi khi lưu thông tin setAuth:', error);
    }
  };

  return (
    // BỔ SUNG: Truyền setAuth vào Provider
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, requestOtp, logout, updateUser, setAuth }}>
      {children}
    </AuthContext.Provider>
  );
};