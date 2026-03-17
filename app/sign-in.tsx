// app/sign-in.tsx
import axiosClient, { BASE_URL } from '@/api/axiosClient';
import { Text } from '@/components/AppText';
import { AuthContext } from '@/contexts/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { ChevronLeft, Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import React, { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform,
  ScrollView, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// --- COMMON INPUT COMPONENT ---
const InputField = ({
  placeholder, icon, value, onChangeText,
  secureTextEntry, isPassword, autoCapitalize = 'none', keyboardType = 'default', error, maxLength
}: any) => {
  // Trạng thái cục bộ để quản lý việc ẩn/hiện mật khẩu
  const [isSecure, setIsSecure] = useState(isPassword ? true : secureTextEntry);

  return (
    <View className="mb-4">
      <View className={`flex-row items-center bg-gray-50 px-4 py-4 rounded-2xl border ${error ? 'border-red-500' : 'border-gray-100'}`}>
        
        {/* Đưa icon chính (Mail, Lock) sang bên trái để nhường chỗ cho nút Xem mật khẩu bên phải */}
        {icon && <View className="mr-3">{icon}</View>}
        
        <TextInput
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={isPassword ? isSecure : secureTextEntry}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          maxLength={maxLength}
          className="flex-1 text-base text-gray-700 h-6"
          placeholderTextColor="#9CA3AF"
        />
        
        {/* Nút toggle hiển thị mật khẩu */}
        {isPassword && (
          <TouchableOpacity onPress={() => setIsSecure(!isSecure)} className="ml-2 p-1" activeOpacity={0.7}>
            {isSecure ? <EyeOff size={20} color="#9CA3AF" /> : <Eye size={20} color="#9CA3AF" />}
          </TouchableOpacity>
        )}
        
      </View>
      {error && <Text className="text-red-500 text-xs mt-1 ml-2">{error}</Text>}
    </View>
  );
};

// SCREEN STATES
type AuthView = 'LOGIN' | 'FORGOT_PASSWORD' | 'VERIFY_OTP' | 'RESET_PASSWORD' | 'VERIFY_2FA';

export default function SignInScreen() {
  const router = useRouter();
  const { login, requestOtp, setAuth } = useContext(AuthContext) as any;

  const [currentView, setCurrentView] = useState<AuthView>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [twoFaCode, setTwoFaCode] = useState('');
  const [tempAuthToken, setTempAuthToken] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // STATE MỚI CHO FACEID
  const [isBiometricReady, setIsBiometricReady] = useState(false);

  // KIỂM TRA TRẠNG THÁI FACEID KHI VÀO MÀN HÌNH
  useEffect(() => {
    const checkBiometricSetup = async () => {
      const isEnabled = await AsyncStorage.getItem('isFaceIdEnabled');
      const savedEmail = await SecureStore.getItemAsync('secure_email');
      const savedPass = await SecureStore.getItemAsync('secure_password');

      if (isEnabled === 'true' && savedEmail && savedPass) {
        setIsBiometricReady(true);
      }
    };
    checkBiometricSetup();
  }, []);

  // HÀM GỌI API ĐĂNG NHẬP CHUNG CHUẨN HOÁ
  const executeLogin = async (loginEmail: string, loginPass: string) => {
    try {
      setIsLoading(true);
      const response = await axiosClient.post('/auth/login', { 
        email: loginEmail, 
        password: loginPass 
      });
      
      // NẾU ĐĂNG NHẬP THÀNH CÔNG -> LƯU VÀO SECURE STORE ĐỂ DÙNG CHO FACEID LẦN SAU
      await SecureStore.setItemAsync('secure_email', loginEmail);
      await SecureStore.setItemAsync('secure_password', loginPass);
      
      if (response.data.requires2FA) {
        setTempAuthToken(response.data.tempToken);
        setCurrentView('VERIFY_2FA');
      } else {
        await login({ email: loginEmail, password: loginPass });
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      setErrors({ form: error.response?.data?.message || 'Incorrect email or password.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    let newErrors: Record<string, string> = {};
    if (!email) newErrors.email = 'Please enter your email.';
    if (!password) newErrors.password = 'Please enter your password.';
    if (Object.keys(newErrors).length > 0) return setErrors(newErrors);

    executeLogin(email, password);
  };

  // HÀM XỬ LÝ ĐĂNG NHẬP BẰNG FACEID
  const handleBiometricAuth = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Xác thực để đăng nhập',
        fallbackLabel: 'Dùng mật khẩu',
        cancelLabel: 'Hủy',
      });

      if (result.success) {
        const savedEmail = await SecureStore.getItemAsync('secure_email');
        const savedPass = await SecureStore.getItemAsync('secure_password');
        
        if (savedEmail && savedPass) {
          executeLogin(savedEmail, savedPass);
        } else {
          Alert.alert('Lỗi', 'Không tìm thấy dữ liệu đăng nhập. Vui lòng đăng nhập bằng mật khẩu trước.');
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleVerify2FAAndSubmit = async () => {
  if (twoFaCode.length !== 6) return setErrors({ twoFaCode: 'OTP must be exactly 6 digits.' });

  try {
    setIsLoading(true);
    const response = await axiosClient.post('/auth/login/2fa', { // Đổi axios -> axiosClient
      tempToken: tempAuthToken,
      code: twoFaCode
    });
    
    if (setAuth) {
      // Chờ lưu auth xong hoàn toàn rồi mới chuyển trang
      await setAuth(response.data.accessToken, response.data.user);
      
      // Nếu bạn đang dùng axiosClient thay vì axios mặc định, cần set header trực tiếp ở đây để backup:
      axiosClient.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;
      
    } else {
      console.error("LỖI NGHIÊM TRỌNG: Hàm setAuth chưa được truyền vào AuthContext!");
      Alert.alert("Lỗi ứng dụng", "Không thể lưu phiên đăng nhập.");
      return; // Dừng lại, không cho vào tabs nếu chưa setAuth
    }
    
    router.replace('/(tabs)');
  } catch (error: any) {
    setErrors({ form: error.response?.data?.message || 'Mã xác thực không chính xác.' });
  } finally {
    setIsLoading(false);
  }
};

  const handleRequestOtp = async () => {
    let newErrors: Record<string, string> = {};
    if (!email) newErrors.email = 'Please enter your email.';
    if (Object.keys(newErrors).length > 0) return setErrors(newErrors);

    try {
      setIsLoading(true);
      await requestOtp({ email, type: 'FORGOT_PASSWORD' });
      setCurrentView('VERIFY_OTP');
      setErrors({});
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send OTP. Please try again.';
      setErrors({ form: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtpAndSubmit = async () => {
    if (otp.length !== 6) return setErrors({ otp: 'OTP must be exactly 6 digits.' });

    try {
      setIsLoading(true);
      // CALL OTP VERIFICATION API HERE IF NEEDED: await axios.post('/auth/verify-otp', { email, otp });
      setCurrentView('RESET_PASSWORD');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Incorrect or expired OTP.';
      setErrors({ form: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) return setErrors({ newPassword: 'Password must be at least 6 characters.' });

    try {
      setIsLoading(true);
      
      // GỌI API ĐỔI MẬT KHẨU TỚI NESTJS
      // Đổi 'YOUR_API_URL' thành URL backend thực tế của bạn
      await axios.post(`${BASE_URL}auth/reset-password`, {
        email: email,
        otp: otp,
        newPassword: newPassword,
      });

      Alert.alert('Thành công', 'Mật khẩu đã được cập nhật. Vui lòng đăng nhập lại.');
      setCurrentView('LOGIN');
      setPassword(''); 
      setOtp(''); // Xoá state otp cho an toàn
      setNewPassword(''); // Xoá state mật khẩu mới
    } catch (error: any) {
      // In ra log để xem lỗi thực sự là gì
      console.log("=== LỖI RESET PASSWORD ===");
      console.log(error.response?.data || error.message);
      
      // Hiển thị lỗi từ backend (nếu có) ra màn hình UI
      const errorMessage = error.response?.data?.message || 'Lỗi mạng hoặc server không phản hồi.';
      setErrors({ form: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  // --- RENDERERS FOR EACH VIEW ---

  const renderLogin = () => (
    <>
      <View className="mb-8 items-center">
        <Text className="text-3xl font-bold text-gray-900 mb-2">Welcome back!</Text>
        <Text className="text-gray-500 text-center">Please log in to continue</Text>
      </View>

      <InputField 
        placeholder="Email" 
        value={email} 
        onChangeText={(text: string) => { setEmail(text); setErrors({...errors, email: ''}) }}
        icon={<Mail size={20} color="#9CA3AF" />} 
        keyboardType="email-address"
        error={errors.email}
      />

      <InputField 
        placeholder="Password" 
        value={password} 
        onChangeText={(text: string) => { setPassword(text); setErrors({...errors, password: ''}) }}
        isPassword={true} 
        icon={<Lock size={20} color="#9CA3AF" />} 
        error={errors.password}
      />

      {errors.form && <Text className="text-red-500 font-medium mb-4 text-center">{errors.form}</Text>}

      <TouchableOpacity className="items-end mb-8" onPress={() => { setErrors({}); setCurrentView('FORGOT_PASSWORD'); }}>
        <Text className="text-orange-500 font-medium">Forgot password?</Text>
      </TouchableOpacity>

      {/* CẬP NHẬT GIAO DIỆN NÚT ĐĂNG NHẬP: Gắn thêm nút FaceID nếu khả dụng */}
      <View className="flex-row items-center w-full">
        <TouchableOpacity 
          className={`flex-1 py-4 rounded-full flex-row justify-center items-center ${isLoading ? 'bg-orange-300' : 'bg-orange-500'}`}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading && <ActivityIndicator color="white" className="mr-2" />}
          <Text className="text-center text-white font-bold text-lg">{isLoading ? 'Processing...' : 'Log In'}</Text>
        </TouchableOpacity>

        {isBiometricReady && (
          <TouchableOpacity 
            onPress={handleBiometricAuth}
            disabled={isLoading}
            className="ml-3 p-4 bg-gray-100 rounded-full items-center justify-center border border-gray-200"
          >
             <MaterialCommunityIcons name="face-recognition" size={26} color="#f97316" />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity 
        className="items-center mt-8" 
        onPress={() => { setErrors({}); router.push('/fill-profile'); }}
      >
          <Text className="text-gray-500 font-medium">Don't have an account? <Text className="text-orange-500 font-bold underline">Sign up now</Text></Text>
      </TouchableOpacity>
    </>
  );

  const renderForgotPassword = () => (
    <>
      <View className="mb-8 items-center">
        <Text className="text-3xl font-bold text-gray-900 mb-2">Forgot Password</Text>
        <Text className="text-gray-500 text-center">Enter your email to receive an OTP verification code</Text>
      </View>

      <InputField 
        placeholder="Registered email" value={email} keyboardType="email-address" error={errors.email}
        onChangeText={(text: string) => { setEmail(text); setErrors({...errors, email: ''}) }}
        icon={<Mail size={20} color="#9CA3AF" />} 
      />

      {errors.form && <Text className="text-red-500 font-medium mb-4 text-center">{errors.form}</Text>}

      <TouchableOpacity 
        className={`w-full py-4 rounded-full flex-row justify-center items-center mt-4 ${isLoading ? 'bg-orange-300' : 'bg-orange-500'}`}
        onPress={handleRequestOtp} disabled={isLoading}
      >
        {isLoading && <ActivityIndicator color="white" className="mr-2" />}
        <Text className="text-center text-white font-bold text-lg">{isLoading ? 'Sending...' : 'Send OTP Code'}</Text>
      </TouchableOpacity>
    </>
  );

  // Được chuyển thành Modal trượt từ dưới lên (Bottom Sheet)
  const renderVerifyOtpModal = () => (
    <Modal
      visible={currentView === 'VERIFY_OTP'}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setCurrentView('FORGOT_PASSWORD')}
    >
      <View className="flex-1 bg-black/50 justify-end">
        {/* Vùng bấm ra ngoài để đóng Modal */}
        <TouchableOpacity 
          className="flex-1" 
          activeOpacity={1} 
          onPress={() => setCurrentView('FORGOT_PASSWORD')} 
          disabled={isLoading}
        />
        
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View className="bg-white rounded-t-3xl px-6 pt-4 pb-12 shadow-lg">
            {/* Thanh kéo trang trí ở trên cùng */}
            <View className="items-center mb-6">
              <View className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </View>

            <View className="mb-6 items-center">
              <Text className="text-3xl font-bold text-gray-900 mb-2">Enter OTP Code</Text>
              <Text className="text-gray-500 text-center">
                  A 6-digit code has been sent to <Text className="font-bold text-orange-500">{email}</Text>
              </Text>
            </View>

            <TextInput
              placeholder="Enter 6 digits"
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={(text) => { setOtp(text); setErrors({...errors, otp: ''}) }}
              className={`bg-gray-50 px-4 py-4 rounded-2xl border text-center text-2xl tracking-[10px] font-bold ${errors.otp ? 'border-red-500' : 'border-gray-100'}`}
            />
            {errors.otp && <Text className="text-red-500 text-sm mt-2 text-center">{errors.otp}</Text>}

            {errors.form && <Text className="text-red-500 font-medium mt-4 text-center">{errors.form}</Text>}

            <TouchableOpacity 
              className={`w-full py-4 rounded-full flex-row justify-center items-center mt-6 ${isLoading ? 'bg-orange-300' : 'bg-orange-500'}`}
              onPress={handleVerifyOtpAndSubmit} disabled={isLoading}
            >
              {isLoading && <ActivityIndicator color="white" className="mr-2" />}
              <Text className="text-center text-white font-bold text-lg">
                {isLoading ? 'Verifying...' : 'Verify OTP'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity className="items-center mt-6" onPress={handleRequestOtp} disabled={isLoading}>
                <Text className="text-gray-500 font-medium">Didn't receive the code? <Text className="text-orange-500 font-bold">Resend</Text></Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );

  const renderResetPassword = () => (
    <>
      <View className="mb-8 items-center">
        <Text className="text-3xl font-bold text-gray-900 mb-2">Create New Password</Text>
        <Text className="text-gray-500 text-center">Please enter a new password for your account</Text>
      </View>

      <InputField 
        placeholder="New password" 
        value={newPassword} 
        isPassword={true} // Bật tính năng ẩn/hiện mật khẩu
        error={errors.newPassword}
        onChangeText={(text: string) => { setNewPassword(text); setErrors({...errors, newPassword: ''}) }}
        icon={<Lock size={20} color="#9CA3AF" />} 
      />

      {errors.form && <Text className="text-red-500 font-medium mb-4 text-center">{errors.form}</Text>}

      <TouchableOpacity 
        className={`w-full py-4 rounded-full flex-row justify-center items-center mt-4 ${isLoading ? 'bg-orange-300' : 'bg-orange-500'}`}
        onPress={handleResetPassword} disabled={isLoading}
      >
        {isLoading && <ActivityIndicator color="white" className="mr-2" />}
        <Text className="text-center text-white font-bold text-lg">{isLoading ? 'Updating...' : 'Update Password'}</Text>
      </TouchableOpacity>
    </>
  );

  const renderVerify2FA = () => (
    <>
      <View className="mb-8 items-center">
        <Text className="text-3xl font-bold text-gray-900 mb-2">Bảo mật 2 Lớp</Text>
        <Text className="text-gray-500 text-center">Nhập mã 6 số từ ứng dụng Google Authenticator của bạn.</Text>
      </View>

      <TextInput
        placeholder="Nhập mã 6 số"
        keyboardType="number-pad"
        maxLength={6}
        value={twoFaCode}
        onChangeText={(text) => { setTwoFaCode(text); setErrors({...errors, twoFaCode: ''}) }}
        className={`bg-gray-50 px-4 py-4 rounded-2xl border text-center text-2xl tracking-[10px] font-bold ${errors.twoFaCode ? 'border-red-500' : 'border-gray-100'}`}
      />
      {errors.twoFaCode && <Text className="text-red-500 text-sm mt-2 text-center">{errors.twoFaCode}</Text>}

      {errors.form && <Text className="text-red-500 font-medium mt-4 text-center">{errors.form}</Text>}

      <TouchableOpacity 
        className={`w-full py-4 rounded-full flex-row justify-center items-center mt-6 ${isLoading ? 'bg-orange-300' : 'bg-orange-500'}`}
        onPress={handleVerify2FAAndSubmit} disabled={isLoading}
      >
        {isLoading && <ActivityIndicator color="white" className="mr-2" />}
        <Text className="text-center text-white font-bold text-lg">Xác nhận Đăng nhập</Text>
      </TouchableOpacity>
    </>
  );

  // Handle Back button on the top left
  const handleBack = () => {
    setErrors({});
    if (currentView === 'LOGIN') router.back();
    else if (currentView === 'VERIFY_OTP') {
      setCurrentView('FORGOT_PASSWORD');
    } else {
      setCurrentView('LOGIN');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center px-4 py-2 mb-2">
        <TouchableOpacity onPress={handleBack} disabled={isLoading} className="p-2 -ml-2">
          <ChevronLeft size={28} color="black" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-xl font-bold mr-8">
          {currentView === 'LOGIN' ? 'Log In' : 
           (currentView === 'FORGOT_PASSWORD' || currentView === 'VERIFY_OTP') ? 'Forgot Password' : 
           'Reset Password'}
        </Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView className="flex-1 px-6 mt-10" showsVerticalScrollIndicator={false}>
          {currentView === 'LOGIN' && renderLogin()}
          
          {/* Vẫn render màn Forgot Password ở dưới nền khi Modal OTP hiện lên */}
          {(currentView === 'FORGOT_PASSWORD' || currentView === 'VERIFY_OTP') && renderForgotPassword()}
          {currentView === 'VERIFY_2FA' && renderVerify2FA()}
          {currentView === 'RESET_PASSWORD' && renderResetPassword()}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Render Modal OTP độc lập, nằm trên toàn bộ giao diện */}
      {renderVerifyOtpModal()}

    </SafeAreaView>
  );
}