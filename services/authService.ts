// services/authService.ts
import * as Device from 'expo-device';
import axiosClient from '../api/axiosClient';
export interface LoginPayload {
  email: string;
  password?: string;
}

export interface RegisterPayload {
  email: string;
  password?: string;
  name: string;
  phone?: string;
  otp: string;
  gender?: string;
  dob?: string;
  avatarUrl?: string;
}
export interface SendOtpPayload { email: string; type: 'SIGNUP' | 'FORGOT_PASSWORD'; }

export const authService = {
  loginAPI: async (data: LoginPayload) => {
    try {
      const deviceName = Device.modelName || Device.deviceName || 'Mobile Device';
      const deviceOs = `${Device.osName || 'Unknown'} ${Device.osVersion || ''}`.trim();
      const response = await axiosClient.post('auth/login', data, {
        headers: {
          'x-device-name': deviceName,
          'x-device-os': deviceOs,
        }});
      return response.data;
    } catch (error: any) {
      // Bắt lỗi từ Backend trả về (nếu có), nếu không lấy lỗi mặc định của Axios
      throw error.response?.data || { message: error.message };
    }
  },

  registerAPI: async (data: RegisterPayload) => {
    try {
      const response = await axiosClient.post('auth/register', data);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: error.message };
    }
  },

  sendOtpAPI: async (data: SendOtpPayload) => {
    const response = await axiosClient.post('auth/send-otp', data);
    return response.data;
  },
  loginWithGoogle: async (googleData: { email: string; name: string; picture?: string; token: string }) => {
    try {
      // SỬA: Đổi từ 'auth/google' thành 'auth/social-login'
      // Phải truyền lên field 'provider' và 'token' như SocialLoginDto yêu cầu
      const response = await axiosClient.post('auth/social-login', {
        provider: 'GOOGLE',
        token: googleData.token, // Token nhận được từ Google Sign-In SDK
        name: googleData.name,   // Tên lấy được từ thiết bị truyền xuống (nếu có)
      });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: error.message };
    }
  }
};