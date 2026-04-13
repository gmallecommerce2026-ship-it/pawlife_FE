// app/index.tsx
import axiosClient from '@/api/axiosClient';
import { Text } from '@/components/AppText';
import { AuthContext } from '@/contexts/AuthContext';
import { AntDesign, FontAwesome } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Href, useRouter } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
import { Alert, Dimensions, Image, Linking, Platform, TouchableOpacity, View } from 'react-native'; // Đã thêm Image
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
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
      
      if (setAuth) {
        await setAuth(accessToken, user);
        axiosClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      } else {
        console.error("LỖI: setAuth chưa được truyền vào AuthContext!");
        Alert.alert("Lỗi ứng dụng", "Không thể lưu phiên đăng nhập.");
        return; 
      }

      //router.replace('/(tabs)');
      
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

  const handleGoogleLogin = async () => {
    Alert.alert("Notice", "Feature is under development");
  };

  const handleFacebookLogin = async () => {
    Alert.alert("Notice", "Feature is under development");
  };

  const SocialButton = ({ icon, title, onPress, bgClass = "bg-white", textClass = "text-gray-700", borderClass = "border border-[#E5E5E5]" }: any) => (
    <TouchableOpacity 
      onPress={onPress}
      disabled={isLoading}
      activeOpacity={0.8}
      className={`flex-row items-center justify-center w-full py-4 rounded-[16px] mb-[12px] ${bgClass} ${borderClass} ${isLoading ? 'opacity-50' : ''}`}
      style={{
        shadowColor: '#000000',
        shadowOffset: {
          width: 0, // 0 để bóng không lệch sang 2 bên
          height: 4, // Số dương để đẩy bóng xuống cạnh dưới
        },
        shadowOpacity: 0.05, // Độ đậm nhạt của bóng
        shadowRadius: 4, // Độ nhòe của bóng
        elevation: 5, 
      }}
    >
      {icon}
      <Text className={`ml-3 font-semibold text-[14px] ${textClass}`}>
        {isLoading && title.includes('Apple') ? 'Processing...' : title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-[50px] items-center">

        {/* CASCADING LOGIN FORM */}
        {showContent && (
          <>
          <View className="z-10">
            <View className="w-[85px] h-[85px] items-center justify-center">
              <Image 
                source={require('../assets/images/icon.png')} 
                style={{ width: 85, height: 85 }} 
                resizeMode="contain" 
              />
            </View>
          </View>
            <View className="w-full flex-1 items-center mt-2">
                <Text className="text-[30px] font-semibold text-gray-900 mb-[25px] tracking-tight">
                    Let’s Get Started!
                </Text>
                <Text className="text-gray-500 mb-[53px] font-medium text-[16px]">
                    Let's dive into your account
                </Text>

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
                          icon={<AntDesign name="apple" size={24} color="black" />}
                          title="Continue with Apple"
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
                                Alert.alert("Apple Login Error", e.message);
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

                <Animated.View entering={FadeInDown.delay(600).springify()} className="w-full mt-4">
                    <TouchableOpacity 
                      className={`w-full bg-[#E89B5A] mt-[13px] py-[21px] rounded-[100px] shadow-sm items-center active:scale-95 transition-transform ${isLoading ? 'opacity-50' : ''}`}
                      onPress={() => router.push('/sign-in' as Href)}
                      disabled={isLoading}
                      style={{
                      // --- Dành cho iOS ---
                      shadowColor: '#000000',
                      shadowOffset: {
                        width: 0, // 0 để bóng không lệch sang 2 bên
                        height: 4, // Số dương để đẩy bóng xuống cạnh dưới
                      },
                      shadowOpacity: 0.15, // Độ đậm nhạt của bóng
                      shadowRadius: 4, // Độ nhòe của bóng
                      
                      // --- Dành cho Android ---
                      elevation: 5, 
                    }}
                    >
                      <Text className="text-white font-bold text-[16px]">Log In</Text>
                    </TouchableOpacity>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(700).springify()} className="mt-[25px]">
                    <TouchableOpacity onPress={() => router.push('/fill-profile')} disabled={isLoading}>
                        <Text className="text-[#E89B5A] font-semibold text-[16px]">Sign Up</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
          </>
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
              <Text className="text-center text-gray-500 text-[16px] font-medium">
                Privacy Policy
              </Text>
            </TouchableOpacity>
            
            <Text className="text-center text-gray-400 text-[16px] mx-2 font-medium">
              ·
            </Text>
            
            <TouchableOpacity 
              onPress={() => {/* Thêm link Terms of Service nếu có */}}
              activeOpacity={0.7}
            >
              <Text className="text-center text-gray-500 text-[16px] font-medium">
                Terms of Service
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}