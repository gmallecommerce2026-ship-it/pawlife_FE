// app/sign-in.tsx
import axiosClient, { BASE_URL } from '@/api/axiosClient';
import { Text } from '@/components/AppText';
import { AuthContext } from '@/contexts/AuthContext';
import { connectSocket } from '@/utils/socket';
import { AntDesign, Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import React, { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform,
  ScrollView, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- COMMON INPUT COMPONENT ---
// Loại bỏ các class động gây crash như bg-orange-50/10
const InputField = ({
  placeholder, icon, value, onChangeText,
  secureTextEntry, isPassword, autoCapitalize = 'none', keyboardType = 'default', error, maxLength, title
}: any) => {
  const [isSecure, setIsSecure] = useState(isPassword ? true : secureTextEntry);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className="mb-[18px]">
      <Text className='mb-[12px] font-semibold font-[16px]'>{title}</Text>
      <View 
        className={`flex-row items-center bg-[#FAFAFA] px-5 py-4 rounded-[16px] border-[1.5px] ${
          error ? 'border-red-500 bg-red-50' : isFocused ? 'border-[#E5E5E5]' : 'border-[#E5E5E5]'
        }`}
      >
        {icon && (
          <View className="mr-3">
            {React.cloneElement(icon, { color: error ? '#B8B8B8' : isFocused ? '#B8B8B8' : '#B8B8B8' })}
          </View>
        )}
        <TextInput
          placeholder={placeholder} value={value} onChangeText={onChangeText}
          secureTextEntry={isPassword ? isSecure : secureTextEntry}
          autoCapitalize={autoCapitalize} keyboardType={keyboardType} maxLength={maxLength}
          onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}
          className="flex-1 text-[16px] text-[#B8B8B8] h-9 font-regular" placeholderTextColor="#9CA3AF"
          style={{fontFamily: 'Urbanist'}}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setIsSecure(!isSecure)} className="ml-2 p-1" activeOpacity={0.7}>
            {isSecure ? <EyeOff size={22} color={isFocused ? "#E89B5A" : "#9CA3AF"} /> : <Eye size={22} color={isFocused ? "#E89B5A" : "#9CA3AF"} />}
          </TouchableOpacity>
        )}
      </View>
      {error && <Text className="text-red-500 text-[13px] font-regular mt-1.5 ml-2">{error}</Text>}
    </View>
  );
};

const SocialButton = ({ icon, title, onPress, bgClass = "bg-white", textClass = "text-gray-700", borderClass = "border border-[#E5E5E5]", disabled }: any) => (
  <TouchableOpacity 
    onPress={onPress} activeOpacity={0.8} disabled={disabled}
    className={`flex-row items-center justify-center w-full py-[16px] rounded-[16px] mb-[12px] ${bgClass} ${borderClass}`}
    style={{ opacity: disabled ? 0.5 : 1 }}
  >
    {icon}
    <Text className={`ml-3 font-semibold text-[14px] ${textClass}`}>{title}</Text>
  </TouchableOpacity>
);

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
  
  const [isBiometricReady, setIsBiometricReady] = useState(false);
  const [isRememberMe, setIsRememberMe] = useState(false);

  useEffect(() => {
    const checkSetup = async () => {
      const isEnabled = await AsyncStorage.getItem('isFaceIdEnabled');
      const savedEmail = await SecureStore.getItemAsync('secure_email');
      const savedPass = await SecureStore.getItemAsync('secure_password');

      if (isEnabled === 'true' && savedEmail && savedPass) setIsBiometricReady(true);
      if (savedEmail && await AsyncStorage.getItem('isRememberMe') === 'true') {
        setEmail(savedEmail); setIsRememberMe(true);
      }
    };
    checkSetup();
  }, []);

  const executeLogin = async (loginEmail: string, loginPass: string) => {
    try {
      setIsLoading(true);
      const response = await axiosClient.post('/auth/login', { email: loginEmail, password: loginPass });
      
      if (isRememberMe) {
        await SecureStore.setItemAsync('secure_email', loginEmail);
        await SecureStore.setItemAsync('secure_password', loginPass);
        await AsyncStorage.setItem('isRememberMe', 'true');
      } else {
        await AsyncStorage.removeItem('isRememberMe');
      }
      
      if (response.data.requires2FA) {
        setTempAuthToken(response.data.tempToken); setCurrentView('VERIFY_2FA');
      } else {
        await login({ email: loginEmail, password: loginPass });
      }
    } catch (error: any) {
      setErrors({ form: error.response?.data?.message || 'Incorrect email or password.' });
    } finally {
      setIsLoading(false);
    }
  };

  // VALIDATION ĐƯỢC CHUYỂN VÀO HÀM NHẤN NÚT (Sửa dứt điểm lỗi crash)
  const handleLogin = () => {
    let newErrors: Record<string, string> = {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address.';
    }
    if (!password || password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({}); 
    executeLogin(email, password); 
  };

  const handleBiometricAuth = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to log in', fallbackLabel: 'Use password', cancelLabel: 'Cancel',
      });
      if (result.success) {
        const savedEmail = await SecureStore.getItemAsync('secure_email');
        const savedPass = await SecureStore.getItemAsync('secure_password');
        if (savedEmail && savedPass) executeLogin(savedEmail, savedPass);
        else Alert.alert('Error', 'No saved login data found.');
      }
    } catch (error) { console.error(error); }
  };

  const handleVerify2FAAndSubmit = async () => {
    if (twoFaCode.length !== 6) return setErrors({ twoFaCode: 'OTP must be 6 digits.' });
    try {
      setIsLoading(true);
      const response = await axiosClient.post('/auth/login/2fa', { tempToken: tempAuthToken, code: twoFaCode });
      if (setAuth) {
        await setAuth(response.data.accessToken, response.data.user);
        axiosClient.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;
        
        // BỔ SUNG: Kích hoạt socket ngay khi có token
        connectSocket(response.data.accessToken); 
        
      } else {
        Alert.alert("Error", "Could not save login session."); return;
      }
      // router.replace('/(tabs)');
    } catch (error: any) {
      setErrors({ form: error.response?.data?.message || 'Incorrect verification code.' });
    } finally { setIsLoading(false); }
  };

  const handleRequestOtp = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setErrors({ email: 'Please enter a valid email.' });
    try {
      setIsLoading(true);
      await requestOtp({ email, type: 'FORGOT_PASSWORD' });
      setCurrentView('VERIFY_OTP'); setErrors({});
    } catch (error: any) {
      setErrors({ form: error.response?.data?.message || 'Failed to send OTP. Please try again.' });
    } finally { setIsLoading(false); }
  };

  const handleVerifyOtpAndSubmit = async (currentOtp: string = otp) => {
    // Luồng cũ của bạn: Chỉ kiểm tra độ dài rồi chuyển view luôn.
    // Việc gọi API thật sự sẽ diễn ra ở màn hình RESET_PASSWORD
    if (currentOtp.length !== 6) return setErrors({ otp: 'OTP must be 6 digits.' });
    try {
      setIsLoading(true); 
      // Chuyển thẳng sang view RESET_PASSWORD (giống hệt code gốc)
      setCurrentView('RESET_PASSWORD');
    } catch (error: any) {
      setErrors({ form: error.response?.data?.message || 'Incorrect or expired OTP.' });
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) return setErrors({ newPassword: 'Password must be at least 6 characters.' });
    try {
      setIsLoading(true);
      await axios.post(`${BASE_URL}auth/reset-password`, { email, otp, newPassword });
      Alert.alert('Success', 'Password has been updated. Please log in again.');
      setCurrentView('LOGIN'); setPassword(''); setOtp(''); setNewPassword(''); 
    } catch (error: any) {
      setErrors({ form: error.response?.data?.message || 'Network error or server not responding.' });
    } finally { setIsLoading(false); }
  };

  const renderLogin = () => (
    <>
      <View className="mb-[58px]">
        <Text className="text-[30px] font-semibold text-gray-900 mb-2.5 tracking-tight">Welcome back! 👋</Text>
        <Text className="text-gray-500 font-medium text-[16px] leading-6">Let’s continue the journey with your furry friends.</Text>
      </View>

      <InputField 
        placeholder="Email" value={email} onChangeText={(t: string) => { setEmail(t); setErrors({...errors, email: ''}) }}
        icon={<Mail size={22} />} keyboardType="email-address" error={errors.email} title={"Email"}
      />
      <InputField 
        placeholder="Password" value={password} onChangeText={(t: string) => { setPassword(t); setErrors({...errors, password: ''}) }}
        isPassword={true} icon={<Lock size={22} />} error={errors.password} title={"Password"}
      />

      <View className="flex-row justify-between items-center mb-[2px] mt-[-8px]">
        <TouchableOpacity className="flex-row items-center py-2" onPress={() => setIsRememberMe(!isRememberMe)} activeOpacity={0.7}>
          <MaterialCommunityIcons name={isRememberMe ? "checkbox-marked" : "checkbox-blank-outline"} size={22} color={isRememberMe ? "#E89B5A" : "#9CA3AF"} />
          <Text className="text-gray-600 font-medium ml-2 text-[14px]">Remember me</Text>
        </TouchableOpacity>
        <TouchableOpacity className="py-2" onPress={() => { setErrors({}); setCurrentView('FORGOT_PASSWORD'); }}>
          <Text className="text-[#E89B5A] font-bold text-[14px]">Forgot password?</Text>
        </TouchableOpacity>
      </View>

      {errors.form && (
        <View className="bg-red-50 p-3 rounded-xl mb-4 border border-red-100">
            <Text className="text-red-500 font-medium text-center text-[14px]">{errors.form}</Text>
        </View>
      )}

      {/* SỬ DỤNG OPACITY QUA INLINE STYLE ĐỂ TRÁNH CRASH */}
      <View className="flex-row items-center w-full mb-4">
        <TouchableOpacity 
          className="flex-1 py-[15px] rounded-[100px] shadow-sm items-center bg-[#E89B5A]"
          onPress={handleLogin} disabled={isLoading} activeOpacity={0.8}
          style={{ opacity: isLoading ? 0.7 : 1 }}
        >
          {isLoading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-[16px]">Log In</Text>}
        </TouchableOpacity>

        {/* {isBiometricReady && ( */}
          <TouchableOpacity 
            onPress={handleBiometricAuth} disabled={isLoading} activeOpacity={0.7}
            className="h-[64px] aspect-square items-center justify-center ml-1"
            style={{ borderColor: 'rgba(232, 155, 90, 0.3)' }}
          >
             <MaterialCommunityIcons name="face-recognition" size={28} color="#61e250" />
          </TouchableOpacity>
        {/* )} */}
      </View>

      <View className="flex-row items-center mb-4">
        <View className="flex-1  bg-gray-200" />
        <Text className="text-gray-400 font-medium px-4 text-[14px]">or</Text>
        <View className="flex-1  bg-gray-200" />
      </View>

      <View className="w-full mb-8">
          <SocialButton 
            icon={<AntDesign name="google" size={24} color="#DB4437" />} title="Continue with Google" 
            onPress={() => Alert.alert("Notice", "Feature is under development")} disabled={isLoading}
          />
          {Platform.OS === 'ios' && (
              <SocialButton
                icon={<AntDesign name="apple" size={24} color="black" />} title="Continue with Apple"
                disabled={isLoading}
                onPress={async () => {
                  try {
                    await AppleAuthentication.signInAsync({
                      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
                    });
                  } catch (e: any) {
                    if (e.code !== 'ERR_REQUEST_CANCELED') Alert.alert("Apple Login Error", e.message);
                  }
                }}
              />
          )}
          <SocialButton 
            icon={<FontAwesome5 name="facebook" size={24} color="#4267B2" />} title="Continue with Facebook" 
            onPress={() => Alert.alert("Notice", "Feature is under development")} disabled={isLoading}
          />
      </View>
      
      {/* <View className="flex-row justify-center items-center mt-auto pb-8">
        <Text className="text-gray-500 font-medium text-[15px]">Don't have an account? </Text>
        <TouchableOpacity onPress={() => { setErrors({}); router.push('/fill-profile'); }}>
          <Text className="text-[#E89B5A] font-bold text-[15px]">Sign up now</Text>
        </TouchableOpacity>
      </View> */}
    </>
  );

  const renderForgotPassword = () => (
    <>
      <View className="mb-10 mt-4">
        <Text className="text-[30px] font-semibold text-gray-900 mb-2.5 tracking-tight">Forgot Password?</Text>
        <Text className="text-gray-500 text-[16px] font-medium leading-6">Enter your registered email. We’ll send an OTP code for the next step.</Text>
      </View>
      <InputField 
        placeholder="Enter registered email" value={email} keyboardType="email-address" error={errors.email} title={"Your Registered Email"}
        onChangeText={(text: string) => { setEmail(text); setErrors({...errors, email: ''}) }} icon={<Mail size={22} />} 
      />
      {errors.form && <Text className="text-red-500 font-medium mb-6 text-center">{errors.form}</Text>}
      <View className="mt-auto pb-8">
        <TouchableOpacity 
          className="w-full py-[21px] rounded-[100px] items-center bg-[#E89B5A]"
          onPress={handleRequestOtp} disabled={isLoading} activeOpacity={0.8}
          style={{ opacity: isLoading ? 0.7 : 1 }}
        >
          {isLoading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-[16px]">Send OTP Code</Text>}
        </TouchableOpacity>
      </View>
    </>
  );

  // --- LOGIC BÀN PHÍM ẢO ---
  const handleOtpKeyPress = (value: string) => {
    setErrors({ ...errors, otp: '', form: '' }); 
    if (value === 'delete') {
      setOtp((prev) => prev.slice(0, -1));
    } else {
      if (otp.length < 6) { 
        const newOtp = otp + value;
        setOtp(newOtp); 
        
        // TÍNH NĂNG AUTO-SUBMIT:
        // Ngay khi nhập đủ 6 số, tự động kích hoạt hàm chuyển view
        if (newOtp.length === 6) {
          handleVerifyOtpAndSubmit(newOtp);
        }
      }
    }
  };

  const KeyButton = ({ value, label, icon }: { value: string, label?: string, icon?: React.ReactNode }) => {
    const isEmpty = value === 'empty';
    return (
      <TouchableOpacity
        disabled={isEmpty}
        onPress={() => handleOtpKeyPress(value)}
        activeOpacity={0.7}
        className={`w-[30%] h-[60px] justify-center items-center rounded-[16px] mb-3 ${
          isEmpty ? 'bg-transparent' : 'bg-[#F5F5F5]'
        }`}
      >
        {icon ? icon : <Text className="text-[24px] font-regular text-[#6B7280]">{label}</Text>}
      </TouchableOpacity>
    );
  };

  // --- GIAO DIỆN XÁC THỰC OTP ---
  const renderVerifyOtp = () => (
    <View className="flex-1 mt-4">
      {/* Tiêu đề */}
      <View className="mb-10">
        <Text className="text-[32px] font-bold text-black mb-4 flex-row items-center">
          Enter OTP Code 🔐
        </Text>
        <Text className="text-[15px] text-[#9CA3AF] leading-6 font-regular">
          Email has been sent to <Text className="text-black font-semibold">{email}</Text>. Please enter the one-time verification code below.
        </Text>
      </View>

      {/* 6 Ô hiển thị mã OTP */}
      <View className="flex-row justify-between mb-6">
        {[0, 1, 2, 3, 4, 5].map((index) => { // Đã tăng mảng lên 6 phần tử
          const digit = otp[index] || '';
          const isActive = index === otp.length;

          return (
            <View
              key={index}
              // Thu nhỏ width/height một chút để vừa 6 ô (w-[45px] h-[55px] hoặc tương tự tùy màn)
              className={`w-[48px] h-[60px] rounded-[12px] justify-center items-center border-[1.5px] ${
                isActive ? 'border-[#E89B5A]' : 'border-[#E5E5E5]'
              } ${digit ? 'border-[#E89B5A] bg-[#FFF8F3]' : 'bg-white'}`}
            >
              <Text className="text-[26px] font-bold text-black">{digit}</Text>
            </View>
          );
        })}
      </View>

      {/* Hiển thị lỗi nếu có */}
      {errors.otp && <Text className="text-red-500 text-[14px] text-center font-medium mb-2">{errors.otp}</Text>}
      {errors.form && <Text className="text-red-500 font-medium text-center mb-2">{errors.form}</Text>}

      <View className="items-center mb-6">
        <Text className="text-[#9CA3AF] text-[15px] font-regular">Resend New Code 00:30</Text>
      </View>


      {/* Bàn phím ảo */}
      <View className="mt-auto pb-4">
        <View className="flex-row justify-between w-full">
          <KeyButton value="1" label="1" /><KeyButton value="2" label="2" /><KeyButton value="3" label="3" />
        </View>
        <View className="flex-row justify-between w-full">
          <KeyButton value="4" label="4" /><KeyButton value="5" label="5" /><KeyButton value="6" label="6" />
        </View>
        <View className="flex-row justify-between w-full">
          <KeyButton value="7" label="7" /><KeyButton value="8" label="8" /><KeyButton value="9" label="9" />
        </View>
        <View className="flex-row justify-between w-full">
          <KeyButton value="empty" label="" /><KeyButton value="0" label="0" />
          <KeyButton value="delete" icon={<Feather name="arrow-left" size={24} color="#6B7280" />} />
        </View>
      </View>
    </View>
  );

  const renderResetPassword = () => (
    <>
      <View className="mb-10 mt-4">
        <Text className="text-[32px] font-extrabold text-gray-900 mb-2.5 tracking-tight">New Password</Text>
        <Text className="text-gray-500 text-[16px] leading-6">Create a strong and memorable new password.</Text>
      </View>
      <InputField 
        placeholder="Enter new password" value={newPassword} isPassword={true} error={errors.newPassword}
        onChangeText={(text: string) => { setNewPassword(text); setErrors({...errors, newPassword: ''}) }} icon={<Lock size={22} />} 
      />
      {errors.form && <Text className="text-red-500 font-medium mb-6 text-center">{errors.form}</Text>}
      <TouchableOpacity 
        className="w-full py-[21px] mt-2 rounded-[100px] items-center bg-[#E89B5A]"
        onPress={handleResetPassword} disabled={isLoading} activeOpacity={0.8}
        style={{ opacity: isLoading ? 0.7 : 1 }}
      >
        {isLoading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-[16px]">Update Password</Text>}
      </TouchableOpacity>
    </>
  );

  const renderVerify2FA = () => (
    <>
      <View className="mb-10 mt-4 items-center">
        <MaterialCommunityIcons name="shield-check" size={64} color="#E89B5A" className="mb-4" />
        <Text className="text-[32px] font-extrabold text-gray-900 mb-2.5 tracking-tight">2-Step Verification</Text>
        <Text className="text-gray-500 text-center text-[16px] leading-6 px-4">Enter the 6-digit code from your Google Authenticator app.</Text>
      </View>
      <TextInput
        placeholder="000000" keyboardType="number-pad" maxLength={6} value={twoFaCode}
        onChangeText={(text) => { setTwoFaCode(text); setErrors({...errors, twoFaCode: ''}) }}
        className={`bg-[#F9FAFB] px-4 py-5 rounded-[20px] border-[1.5px] text-center text-[28px] tracking-[12px] font-extrabold text-gray-800 ${errors.twoFaCode ? 'border-red-500' : 'border-[#E89B5A]'}`}
      />
      {errors.twoFaCode && <Text className="text-red-500 text-[14px] mt-3 text-center font-medium">{errors.twoFaCode}</Text>}
      {errors.form && <Text className="text-red-500 font-medium mt-4 text-center">{errors.form}</Text>}
      <TouchableOpacity 
        className="w-full py-[21px] mt-8 rounded-[100px] items-center bg-[#E89B5A]"
        onPress={handleVerify2FAAndSubmit} disabled={isLoading} activeOpacity={0.8}
        style={{ opacity: isLoading ? 0.7 : 1 }}
      >
        {isLoading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-[16px]">Confirm Login</Text>}
      </TouchableOpacity>
    </>
  );

  const handleBack = () => {
    setErrors({});
    if (currentView === 'LOGIN') router.back();
    else if (currentView === 'VERIFY_OTP') setCurrentView('FORGOT_PASSWORD');
    else setCurrentView('LOGIN');
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity onPress={handleBack} disabled={isLoading} className="p-2 -ml-2 rounded-full active:bg-gray-100">
          <Feather name="chevron-left" size={35} color="#000000" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView className="flex-1 px-7" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
          {currentView === 'LOGIN' && renderLogin()}
          {(currentView === 'FORGOT_PASSWORD') && renderForgotPassword()}
          {currentView === 'VERIFY_OTP' && renderVerifyOtp()}
          {currentView === 'VERIFY_2FA' && renderVerify2FA()}
          {currentView === 'RESET_PASSWORD' && renderResetPassword()}
        </ScrollView>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}