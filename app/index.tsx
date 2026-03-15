// app/index.tsx
import axiosClient from '@/api/axiosClient';
import { Text } from '@/components/AppText';
import { AuthContext } from '@/contexts/AuthContext';
import { AntDesign, FontAwesome } from '@expo/vector-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Href, useRouter } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
import { Alert, Dimensions, Linking, Platform, SafeAreaView, TouchableOpacity, View } from 'react-native';
import { AccessToken, LoginManager } from 'react-native-fbsdk-next';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
const { height } = Dimensions.get('window');

const API_URL = 'http://192.168.1.9:4001';

export default function WelcomeScreen() {
  const router = useRouter();
  const [showContent, setShowContent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, requestOtp, setAuth } = useContext(AuthContext) as any;
  const logoTranslateY = useSharedValue(height / 3.5);
  const logoScale = useSharedValue(2);

  useEffect(() => {
    // Cấu hình Google Signin
    GoogleSignin.configure({
      webClientId: '725064672703-i8cmlg934i6m5v8ssi69577vf9d3k7hc.apps.googleusercontent.com', // BẮT BUỘC để lấy idToken gửi lên backend
      iosClientId: '725064672703-l61bog4iims28n57sspk6hokcf1l86c7.apps.googleusercontent.com', // Cần thiết nếu chạy trên iOS
    });

    logoTranslateY.value = withDelay(1200, withSpring(0, { damping: 14, stiffness: 90 }));
    logoScale.value = withDelay(1200, withSpring(1, { damping: 14, stiffness: 90 }));

    const timer = setTimeout(() => {
      setShowContent(true);
    }, 1300);

    return () => clearTimeout(timer);
  }, []);

  const animatedLogoStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: logoTranslateY.value },
        { scale: logoScale.value }
      ]
    };
  });

  // --- HÀM KẾT NỐI API NESTJS ---
  const handleSocialLoginAPI = async (provider: 'GOOGLE' | 'APPLE' | 'FACEBOOK', token: string) => {
    try {
      setIsLoading(true);
      
      const response = await axiosClient.post(`/auth/social-login`, {
        provider,
        token,
      }, {
        timeout: 10000 
      });

      const { accessToken, user } = response.data;
      
      // BỎ CÁCH LƯU CŨ NÀY TRONG CODE HIỆN TẠI
      // await SecureStore.setItemAsync('accessToken', accessToken);
      // if (user) {
      //   await SecureStore.setItemAsync('userInfo', JSON.stringify(user));
      // }

      // THÊM ĐOẠN CODE NÀY ĐỂ ĐỒNG BỘ VỚI AUTH CONTEXT
      if (setAuth) {
        // Cập nhật state chung của toàn bộ app
        await setAuth(accessToken, user);
        
        // Gắn token mặc định cho mọi request tiếp theo
        axiosClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      } else {
        console.error("LỖI: setAuth chưa được truyền vào AuthContext!");
        Alert.alert("Lỗi ứng dụng", "Không thể lưu phiên đăng nhập.");
        return; 
      }

      // Sau khi Context đã có data và Axios có token, mới tiến hành chuyển trang
      router.replace('/(tabs)');
      
    } catch (error: any) {
      console.error(`Lỗi đăng nhập ${provider}:`, error.response?.data || error.message);
      Alert.alert(
        'Đăng nhập thất bại', 
        error.response?.data?.message || 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra lại.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // --- HANDLER CHO GOOGLE ---
  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      await GoogleSignin.hasPlayServices();
      
      const userInfo: any = await GoogleSignin.signIn();
      
      // 1. Lấy idToken thay vì lấy email/name chay
      const idToken = userInfo.data?.idToken || userInfo.idToken;

      if (!idToken) throw new Error('Không lấy được mã xác thực từ Google.');

      // 2. Tái sử dụng hàm handleSocialLoginAPI đã viết sẵn
      // Hàm này đã bao gồm logic gọi API chuẩn, lưu accessToken vào SecureStore và redirect
      await handleSocialLoginAPI('GOOGLE', idToken);

    } catch (error: any) {
      console.error('Google Signin Error:', error);
      Alert.alert('Lỗi đăng nhập Google', error.message || 'Đã xảy ra lỗi.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- HANDLER CHO FACEBOOK ---
  const handleFacebookLogin = async () => {
    try {
      const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
      if (result.isCancelled) return;

      const data = await AccessToken.getCurrentAccessToken();
      // Backend yêu cầu accessToken cho Facebook để gọi Graph API
      if (data?.accessToken) {
        await handleSocialLoginAPI('FACEBOOK', data.accessToken.toString());
      } else {
        Alert.alert('Lỗi', 'Không lấy được Facebook Access Token');
      }
    } catch (error: any) {
      console.error('Facebook Sign-in Error:', error);
      Alert.alert('Lỗi đăng nhập Facebook', error.message);
    }
  };

  const SocialButton = ({ icon, title, onPress, bgClass = "bg-white", textClass = "text-gray-700", borderClass = "border border-gray-200" }: any) => (
    <TouchableOpacity 
      onPress={onPress}
      disabled={isLoading}
      activeOpacity={0.8}
      className={`flex-row items-center justify-center w-full py-4 rounded-2xl mb-4 shadow-sm ${bgClass} ${borderClass} ${isLoading ? 'opacity-50' : ''}`}
    >
      {icon}
      <Text className={`ml-3 font-semibold text-base ${textClass}`}>
        {isLoading && title.includes('Apple') ? 'Processing...' : title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-10 items-center">
        {/* ANIMATED LOGO */}
        <Animated.View style={[animatedLogoStyle]} className="mb-4 z-10">
           <View className="w-24 h-24 bg-orange-50 rounded-full items-center justify-center shadow-lg shadow-orange-100 border border-orange-100">
             <FontAwesome name="paw" size={48} color="#ffa053" />
           </View>
        </Animated.View>

        {/* CASCADING LOGIN FORM */}
        {showContent && (
            <View className="w-full flex-1 items-center mt-2">
                <Animated.Text entering={FadeInDown.delay(100).springify()} className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">
                    PawLife
                </Animated.Text>
                <Animated.Text entering={FadeInDown.delay(200).springify()} className="text-gray-500 mb-10 font-medium">
                    Let's dive into your account
                </Animated.Text>

                <Animated.View entering={FadeInDown.delay(300).springify()} className="w-full">
                    <SocialButton 
                      icon={<AntDesign name="google" size={24} color="#DB4437" />} 
                      title="Continue with Google" 
                      onPress={handleGoogleLogin}
                    />
                </Animated.View>
                
                {Platform.OS === 'ios' && (
                    <Animated.View entering={FadeInDown.delay(400).springify()} className="w-full">
                        <SocialButton
                          icon={<AntDesign name="apple" size={24} color="white" />}
                          title="Continue with Apple"
                          bgClass="bg-black"
                          textClass="text-white"
                          borderClass="border border-black"
                          onPress={async () => {
                            try {
                              const credential = await AppleAuthentication.signInAsync({
                                requestedScopes: [
                                  AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                                  AppleAuthentication.AppleAuthenticationScope.EMAIL,
                                ],
                              });
                              if (credential.identityToken) {
                                await handleSocialLoginAPI('APPLE', credential.identityToken);
                              }
                            } catch (e: any) {
                              if (e.code !== 'ERR_REQUEST_CANCELED') {
                                Alert.alert("Lỗi Apple Login", e.message);
                              }
                            }
                          }}
                        />
                    </Animated.View>
                )}

                <Animated.View entering={FadeInDown.delay(500).springify()} className="w-full">
                    <SocialButton 
                      icon={<FontAwesome name="facebook" size={24} color="#4267B2" />} 
                      title="Continue with Facebook" 
                      onPress={handleFacebookLogin}
                    />
                </Animated.View>

                {/* Các đoạn view phía sau giữ nguyên như cũ... */}
                <Animated.View entering={FadeInDown.delay(600).springify()} className="w-full mt-4">
                    <TouchableOpacity 
                      className={`w-full bg-[#F97316] py-4 rounded-full shadow-lg shadow-orange-200 items-center active:scale-95 transition-transform ${isLoading ? 'opacity-50' : ''}`}
                      onPress={() => router.push('/fill-profile')}
                      disabled={isLoading}
                    >
                      <Text className="text-white font-bold text-lg">Sign up</Text>
                    </TouchableOpacity>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(700).springify()} className="mt-6">
                    <TouchableOpacity onPress={() => router.push('/sign-in' as Href)} disabled={isLoading}>
                      <Text className="text-gray-500 font-medium text-base">
                        Already have an account? <Text className="text-[#F97316] font-bold">Sign in</Text>
                      </Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        )}
      </View>

      {/* Footer Links */}
      {showContent && (
        <Animated.View entering={FadeInDown.delay(800).springify()} className="mb-4">
          <View className="flex-row justify-center items-center">
            <TouchableOpacity 
              onPress={() => Linking.openURL('https://pawcare-privacy.vercel.app/')}
              activeOpacity={0.7}
            >
              <Text className="text-center text-gray-500 text-xs font-semibold underline">
                Privacy Policy
              </Text>
            </TouchableOpacity>
            
            <Text className="text-center text-gray-400 text-xs mx-2 font-medium">
              ·
            </Text>
            
            <TouchableOpacity 
              onPress={() => {/* Thêm link Terms of Service nếu có */}}
              activeOpacity={0.7}
            >
              <Text className="text-center text-gray-500 text-xs font-semibold underline">
                Terms of Service
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}