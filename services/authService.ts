// services/authService.ts
import * as Device from 'expo-device';
import axiosClient from '../api/axiosClient';
export interface LoginPayload {
  email: string;
  password?: string;
}
export interface UpdateProfilePayload {
  name?: string;
  avatarUrl?: string;
  phone?: string;
  dob?: string;
  gender?: string;
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
      const deviceName = Device.modelName || Device.deviceName || "Unknown Mobile";
      const deviceOs = `${Device.osName} ${Device.osVersion}`;
      return await axiosClient.post('/auth/login', {
        data
      }, {
        headers: {
          // Khớp với @Headers('x-device-name') trong auth.controller.ts
          'x-device-name': deviceName,
          'x-device-os': deviceOs
        }
      });
    } catch (error: any) {
      // Bắt lỗi từ Backend trả về (nếu có), nếu không lấy lỗi mặc định của Axios
      throw error.response?.data || { message: error.message };
    }
  },

  updateProfileAPI: async (data: UpdateProfilePayload) => {
    // Lưu ý: Đổi URL '/auth/me/profile' thành đường dẫn chính xác 
    // mà bạn vừa tạo ở Backend API
    const response = await axiosClient.patch('/auth/me/profile', data);
    return response.data;
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