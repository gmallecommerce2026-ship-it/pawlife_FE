// app/sign-in.tsx
import axiosClient, { BASE_URL, setCachedAccessToken } from '@/api/axiosClient';
import { Text } from '@/components/AppText';
import { AuthContext } from '@/contexts/AuthContext';
import { connectSocket } from '@/utils/socket';
import { AntDesign, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import { GoogleSignin } from '@react-native-google-signin/google-signin';
import axios from 'axios';
import * as AppleAuthentication from 'expo-apple-authentication';
import { LinearGradient } from 'expo-linear-gradient';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform,
  ScrollView, TextInput, TouchableOpacity, View, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// GoogleSignin.configure({
//   webClientId: '725064672703-i8cmlg934i6m5v8ssi69577vf9d3k7hc.apps.googleusercontent.com', 
//   iosClientId: '725064672703-l61bog4iims28n57sspk6hokcf1l86c7.apps.googleusercontent.com',
//   offlineAccess: true,
// });
// BỔ SUNG: Hằng số thời gian đếm ngược 120 giây (2 phút)
const RESEND_OTP_TIME = 120;

// --- COMMON INPUT COMPONENT ---
const InputField = ({
  placeholder, icon, value, onChangeText,
  secureTextEntry, isPassword, autoCapitalize = 'none', keyboardType = 'default', error, maxLength, title
}: any) => {
  const [isSecure, setIsSecure] = useState(isPassword ? true : secureTextEntry);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className="mb-[18px]">
      <Text className='text-[16px] mb-[12px] font-semibold'>{title}</Text>
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
            {isSecure ? <Image
            source={require('../assets/icon/eye-off.png')}
            style={{ width: 20, height: 20 }}
            resizeMode="cover"
          /> : <Image
            source={require('../assets/icon/eye-gray.png')}
            style={{ width: 20, height: 20 }}
            resizeMode="cover"
          /> }
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
    <Image
      source={icon}
      style={{ width: 21, height: 21 }}
      resizeMode="cover"
    />
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

  // BỔ SUNG: State quản lý đếm ngược OTP
  const [otpTimer, setOtpTimer] = useState<number>(RESEND_OTP_TIME);

  useEffect(() => {
      const checkSetup = async () => {
        const isEnabled = await AsyncStorage.getItem('isFaceIdEnabled');
        const savedSecureEmail = await SecureStore.getItemAsync('secure_email');
        const savedPass = await SecureStore.getItemAsync('secure_password');
        if (isEnabled === 'true' && savedSecureEmail && savedPass) {
          setIsBiometricReady(true);
        }

        const isRemember = await AsyncStorage.getItem('isRememberMe');
      if (isRemember === 'true') {
        const rememberedEmail = await AsyncStorage.getItem('remembered_email');
        const savedPass = await SecureStore.getItemAsync('secure_password'); // THÊM DÒNG NÀY
        
        if (rememberedEmail) {
          setEmail(rememberedEmail);
        }
        if (savedPass) {
          setPassword(savedPass); // THÊM DÒNG NÀY: Tự động điền mật khẩu
        }
        setIsRememberMe(true);
      }
    };
    checkSetup();
  }, []);

  // BỔ SUNG: Logic đếm ngược OTP an toàn, chỉ chạy khi đang ở màn Verify OTP
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (currentView === 'VERIFY_OTP' && otpTimer > 0) {
      interval = setInterval(() => { setOtpTimer((prev) => prev - 1); }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [currentView, otpTimer]);

  // BỔ SUNG: Hàm format thời gian MM:SS
  const formatTime = useCallback((totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // const handleGoogleLogin = async () => {
  //   try {
  //     setErrors({});
  //     await GoogleSignin.hasPlayServices();
  //     const response = await GoogleSignin.signIn();
      
  //     if (response.type === 'success' && response.data?.idToken) {
  //       await executeSocialLogin('GOOGLE', response.data.idToken);
  //     }
  //   } catch (error: any) {
  //     if (error.code !== 'SIGN_IN_CANCELLED' && error.code !== '12501') {
  //        console.error("Google Login Error:", error);
  //        setErrors({ form: "Không thể kết nối với Google lúc này." });
  //     }
  //   }
  // };

  // --- BỔ SUNG: XỬ LÝ ĐĂNG NHẬP APPLE ---
  const handleAppleLogin = async () => {
    try {
      setErrors({});
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      
      if (credential.identityToken) {
        await executeSocialLogin('APPLE', credential.identityToken);
      }
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        setErrors({ form: e.message || "Lỗi xác thực Apple" });
      }
    }
  };

  const executeSocialLogin = async (provider: 'GOOGLE' | 'FACEBOOK' | 'APPLE', token: string, extraData?: any) => {
    try {
      setIsLoading(true);
      
      const response = await axiosClient.post('/auth/social-login', { provider, token, ...extraData });
      const { accessToken, user, requires2FA, tempToken } = response.data;

      if (requires2FA) {
        setTempAuthToken(tempToken); 
        setCurrentView('VERIFY_2FA');
        setIsLoading(false);
        return;
      }

      if (setAuth) {
        await setAuth(accessToken, user);
        axiosClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        
        // <-- 2. BỔ SUNG: CẬP NHẬT RAM CACHE -->
        setCachedAccessToken(accessToken); 
        
        connectSocket(accessToken); 
      } else {
        Alert.alert("Lỗi", "Không thể lưu phiên đăng nhập.");
        return;
      }

      if (!user.isProfileComplete) {
        router.replace('/complete-social-profile');
      } else {
        router.replace('/(tabs)');
      }

    } catch (error: any) {
      setErrors({ form: error.response?.data?.message || `Lỗi đăng nhập ${provider}` });
    } finally {
      setIsLoading(false);
    }
  };

  const executeLogin = async (loginEmail: string, loginPass: string) => {
    try {
      setIsLoading(true);
      
      const response = await axiosClient.post('/auth/login', { 
        email: loginEmail, 
        password: loginPass,
        rememberMe: isRememberMe 
      });
      
      if (isRememberMe) {
        await AsyncStorage.setItem('isRememberMe', 'true');
        await AsyncStorage.setItem('remembered_email', loginEmail);
      } else {
        await AsyncStorage.removeItem('isRememberMe');
        await AsyncStorage.removeItem('remembered_email');
      }

      await SecureStore.setItemAsync('secure_email', loginEmail);
      await SecureStore.setItemAsync('secure_password', loginPass);
      
      if (response.data.requires2FA) {
        setTempAuthToken(response.data.tempToken); 
        setCurrentView('VERIFY_2FA');
      } else {
        if (setAuth) {
          await setAuth(response.data.accessToken, response.data.user);
          axiosClient.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;
          
          // <-- 3. BỔ SUNG: CẬP NHẬT RAM CACHE -->
          setCachedAccessToken(response.data.accessToken);
          
          connectSocket(response.data.accessToken); 
        } else {
          Alert.alert("Error", "Could not save login session.");
        }
      }
    } catch (error: any) {
      const errorData = error.response?.data;
      let finalErrorMessage = 'Invalid username or password.';
      if (errorData && errorData.message) {
        if (typeof errorData.message === 'string') {
          finalErrorMessage = errorData.message;
        } else if (Array.isArray(errorData.message) && errorData.message.length > 0) {
          finalErrorMessage = errorData.message[0]; 
        }
      } else if (error.message) { finalErrorMessage = error.message; }
      setErrors({ form: finalErrorMessage });
    } finally {
      setIsLoading(false);
    }
  };

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
      const isEnabled = await AsyncStorage.getItem('isFaceIdEnabled');

      if (isEnabled !== 'true') {
        Alert.alert(
          'Tính năng chưa kích hoạt',
          'Đăng nhập bằng Face ID/Vân tay đang bị tắt hoặc chưa được thiết lập.\n\nVui lòng đăng nhập bằng mật khẩu, sau đó vào phần Cài đặt Bảo mật (Account & Security) để bật tính năng này.',
          [{ text: 'Đã hiểu', style: 'default' }]
        );
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Xác thực để đăng nhập vào ứng dụng',
        fallbackLabel: 'Dùng mật khẩu',
        cancelLabel: 'Hủy',
      });

      if (result.success) {
        const savedEmail = await SecureStore.getItemAsync('secure_email');
        const savedPass = await SecureStore.getItemAsync('secure_password');
        
        if (savedEmail && savedPass) {
          executeLogin(savedEmail, savedPass);
        } else {
          Alert.alert(
            'Lỗi xác thực', 
            'Phiên đăng nhập đã hết hạn hoặc thiết bị đã bị xóa dữ liệu an toàn. Vui lòng đăng nhập lại bằng mật khẩu.'
          );
          await AsyncStorage.removeItem('isFaceIdEnabled');
        }
      }
    } catch (error) { 
      console.error('Lỗi Biometric:', error); 
    }
  };

  const handleVerify2FAAndSubmit = async () => {
    if (twoFaCode.length !== 6) return setErrors({ twoFaCode: 'OTP must be 6 digits.' });
    try {
      setIsLoading(true);
      const response = await axiosClient.post('/auth/login/2fa', { tempToken: tempAuthToken, code: twoFaCode });
      if (setAuth) {
        await setAuth(response.data.accessToken, response.data.user);
        axiosClient.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;
        
        // <-- 4. BỔ SUNG: CẬP NHẬT RAM CACHE -->
        setCachedAccessToken(response.data.accessToken);
        
        connectSocket(response.data.accessToken); 
      } else {
        Alert.alert("Error", "Could not save login session."); return;
      }
    } catch (error: any) {
      setErrors({ form: error.response?.data?.message || 'Incorrect verification code.' });
    } finally { setIsLoading(false); }
  };

  const handleRequestOtp = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setErrors({ email: 'Please enter a valid email.' });
    try {
      setIsLoading(true);
      await requestOtp({ email, type: 'FORGOT_PASSWORD' });
      setCurrentView('VERIFY_OTP'); 
      setErrors({});
      // BỔ SUNG: Reset lại thời gian 120s mỗi khi gọi hàm này thành công
      setOtpTimer(RESEND_OTP_TIME);
    } catch (error: any) {
      setErrors({ form: error.response?.data?.message || 'Failed to send OTP. Please try again.' });
    } finally { setIsLoading(false); }
  };

  const handleVerifyOtpAndSubmit = async (currentOtp: string = otp) => {
    if (currentOtp.length !== 6) return setErrors({ otp: 'OTP must be 6 digits.' });
    try {
      setIsLoading(true); 
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
      <View className="mb-[35px] mt-3">
        <Text className="text-[30px] font-semibold text-black mb-[26px] tracking-[0.06px]">Welcome back! 👋</Text>
        <Text className="text-[#8E8E93] font-medium text-[16px] tracking-[0.06px]">Let’s continue the journey with your furry friends.</Text>
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
          <Text className="text-black font-medium ml-2 text-[14px] tracking-[0.06px]">Remember me</Text>
        </TouchableOpacity>
        <TouchableOpacity className="py-2" onPress={() => { setErrors({}); setCurrentView('FORGOT_PASSWORD'); }}>
          <Text className="text-[#E89B5A] font-medium text-[14px] tracking-[0.06px]">Forgot password?</Text>
        </TouchableOpacity>
      </View>

      {errors.form && (
        <View className="bg-red-50 p-3 rounded-xl mb-4 border border-red-100">
            <Text className="text-red-500 font-medium text-center text-[14px]">{errors.form}</Text>
        </View>
      )}

      <View className="flex-row items-center w-full mb-4">
        <TouchableOpacity 
          className="flex-1 py-[15px] rounded-[100px] shadow-sm items-center bg-[#E89B5A]"
          onPress={handleLogin} disabled={isLoading} activeOpacity={0.8}
          style={{ opacity: isLoading ? 0.7 : 1 }}
        >
          {isLoading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-[16px]">Log In</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleBiometricAuth} disabled={isLoading} activeOpacity={0.7}
          className="h-[64px] aspect-square items-center justify-center ml-1"

        >
          <Image
            source={require('../assets/icon/face-id.png')}
            style={{ width: 43, height: 43 }}
            resizeMode="cover"
          />
        </TouchableOpacity>
      </View>

      <View className="flex-row items-center mb-4">
        <View className="flex-1  bg-gray-200" />
        <Text className="text-gray-400 font-medium px-4 text-[14px]">or</Text>
        <View className="flex-1  bg-gray-200" />
      </View>

      <View className="w-full mb-8">
          <SocialButton 
            icon={require('../assets/icon/google.png')} title="Continue with Google"
            // onPress={handleGoogleLogin} disabled={isLoading}
          />
          {Platform.OS === 'ios' && (
              <SocialButton
                icon={require('../assets/icon/apple.png')} title="Continue with Apple"
                disabled={isLoading}
                onPress={handleAppleLogin}
              />
          )}
          {/* <SocialButton 
            icon={require('../assets/icon/facebook.png')} title="Continue with Facebook" 
            onPress={() => Alert.alert("Notice", "Feature is under development")} disabled={isLoading}
          /> */}
      </View>
    </>
  );

  const renderForgotPassword = () => (
    <>
      <View className="mb-[35px] mt-3">
        <View className='flex-row items-center mb-[26px]'>
          <Text className="text-[30px] font-semibold text-black tracking-[0.06px]">Forgot Password?</Text>
          <Image
            source={require('../assets/icon/forgot-pass.png')}
            style={{ width: 28, height: 28 }}
            resizeMode="cover"
          />
        </View>
        <Text className="text-[#8E8E93] text-[16px] font-medium">Enter your registered email. We’ll send an OTP code for the next step.</Text>
      </View>
      <InputField 
        placeholder="Enter registered email" value={email} keyboardType="email-address" error={errors.email} title={"Your Registered Email"}
        onChangeText={(text: string) => { setEmail(text); setErrors({...errors, email: ''}) }} icon={<Mail size={22} />} 
      />
      {errors.form && <Text className="text-red-500 font-medium mb-6 text-center">{errors.form}</Text>}
      <View className="mt-auto">
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

  const handleOtpKeyPress = (value: string) => {
    setErrors({ ...errors, otp: '', form: '' }); 
    if (value === 'delete') {
      setOtp((prev) => prev.slice(0, -1));
    } else {
      if (otp.length < 6) { 
        const newOtp = otp + value;
        setOtp(newOtp); 
        
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
        disabled={isEmpty || isLoading}
        onPress={() => handleOtpKeyPress(value)}
        activeOpacity={0.7}
        className={`w-[30%] h-[60px] justify-center items-center rounded-[16px] mb-3 ${
          isEmpty ? 'bg-transparent' : 'bg-[#F5F5F5]'
        }`}
      >
        {icon ? icon : <Text className="text-[24px] font-regular text-[#8E8E93]">{label}</Text>}
      </TouchableOpacity>
    );
  };

  const renderVerifyOtp = () => (
    <View className="flex-1 mt-3">
      <View className="mb-[35px]">
        <View className='mb-[26px] flex-row'>
          <Text className="text-[32px] font-semibold text-black flex-row items-center mr-2">
            Enter OTP Code
          </Text>
          <Image
            source={require('../assets/icon/otp.png')}
            style={{ width: 28, height: 28 }}
            resizeMode="cover"
          />
        </View>
        <Text className="text-[16px] text-[#9CA3AF] leading-6 font-medium">
          Email has been sent to <Text className="text-black font-semibold">{email}</Text>. Please enter the one-time verification code below.
        </Text>
      </View>

      <View className="flex-row justify-between mb-6">
        {[0, 1, 2, 3, 4, 5].map((index) => {
          const digit = otp[index] || '';
          const isActive = index === otp.length;

          return (
            <View
              key={index}
              className={`w-[48px] h-[60px] rounded-[12px] justify-center items-center border-[1.5px] ${
                isActive ? 'border-[#E89B5A]' : 'border-[#E5E5E5]'
              } ${digit ? 'border-[#E89B5A] bg-[#FFF8F3]' : 'bg-white'}`}
            >
              <Text className="text-[26px] font-bold text-black">{digit}</Text>
            </View>
          );
        })}
      </View>

      {errors.otp && <Text className="text-red-500 text-[14px] text-center font-medium mb-2">{errors.otp}</Text>}
      {errors.form && <Text className="text-red-500 font-medium text-center mb-2">{errors.form}</Text>}

      {/* BỔ SUNG: UI hiển thị đếm ngược và nút gửi lại OTP */}
      <View className="items-center mb-6 h-[24px] justify-center">
        {isLoading ? (
          <View className="flex-row items-center">
            <ActivityIndicator size="small" color="#E89B5A" className="mr-2" />
            <Text className="text-[#8E8E93] text-[16px] font-regular">Sending...</Text>
          </View>
        ) : otpTimer > 0 ? (
          <Text className="text-[#8E8E93] text-[16px] font-regular">
            Resend New Code <Text className="font-semibold text-black">{formatTime(otpTimer)}</Text>
          </Text>
        ) : (
          <TouchableOpacity onPress={handleRequestOtp} activeOpacity={0.7}>
            <Text className="text-[#E89B5A] text-[16px] font-bold">
              Resend New Code
            </Text>
          </TouchableOpacity>
        )}
      </View>

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
      <View className="mb-10 mt-3">
        <View className='flex-row'>
          <Text className="text-[30px] font-semibold text-black mb-2.5 tracking-[0.06px]">Secure Your Account</Text>
          <Image
            source={require('../assets/icon/secure.png')}
            style={{ width: 28, height: 28 }}
            resizeMode="cover"
          />
        </View>
        <Text className="text-[#8E8E93] text-[16px] leading-6">Create a new password for your PawLife account. Remember to use a strong and unique password.</Text>
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
        {isLoading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-[16px]">Submit</Text>}
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
      <View className="flex-row items-center px-4 py-3 mb-[20px]">
        <TouchableOpacity
          onPress={handleBack}
          activeOpacity={0.7}
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 5,
            elevation: 3,
          }}
          className="w-10 h-10 rounded-full items-center justify-center"
        >
          <View className="overflow-hidden rounded-full w-[36px] h-[36px] items-center justify-center"
            style={{
              width: 36,
              height: 36,
              borderRadius: 28,
              borderWidth: 0.5,
              borderTopColor: 'white',
              borderLeftColor: 'white',
              borderBottomColor: 'transparent',
              borderRightColor: 'transparent',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            }}>
            <LinearGradient
              colors={['rgba(221, 221, 221, 0.1)', 'rgba(247, 247, 247, 0.5)', '#FFFFFF']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              locations={[0, 0.3, 1]}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 9999 }}
            />
            <Feather name="chevron-left" size={20} color="#000000" />
          </View>
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