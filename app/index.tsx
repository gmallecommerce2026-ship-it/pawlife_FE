// app/index.tsx
import axiosClient, { setCachedAccessToken } from '@/api/axiosClient';
import { Text } from '@/components/AppText';
import { AuthContext } from '@/contexts/AuthContext';
import { AntDesign } from '@expo/vector-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Href, useRouter } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
import { Alert, Dimensions, Image, Linking, Platform, TouchableOpacity, View } from 'react-native';
// import { AccessToken, LoginManager, Settings } from 'react-native-fbsdk-next';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
const { height } = Dimensions.get('window');

// 1. CẤU HÌNH GOOGLE SIGN IN
GoogleSignin.configure({
  // BẮT BUỘC: Bạn phải tạo một Client ID loại "Web application" trên Google Cloud Console và dán vào đây
  // Backend NestJS sẽ dùng Web Client ID này để verify idToken.
  webClientId: '725064672703-i8cmlg934i6m5v8ssi69577vf9d3k7hc.apps.googleusercontent.com', 
  // Lấy từ file app.json của bạn:
  iosClientId: '725064672703-l61bog4iims28n57sspk6hokcf1l86c7.apps.googleusercontent.com',
  offlineAccess: true,
});

export default function WelcomeScreen() {
  const router = useRouter();
  const [showContent, setShowContent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { setAuth } = useContext(AuthContext) as any;
  const logoTranslateY = useSharedValue(height / 3.5);
  const logoScale = useSharedValue(2);

  useEffect(() => {
    logoTranslateY.value = withDelay(1200, withSpring(0, { damping: 14, stiffness: 90 }));
    logoScale.value = withDelay(1200, withSpring(1, { damping: 14, stiffness: 90 }));
    const timer = setTimeout(() => { setShowContent(true); }, 1300);
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

  // HÀM GỌI API CHUNG CHO SOCIAL LOGIN
  const handleSocialLoginAPI = async (provider: 'GOOGLE' | 'APPLE' | 'FACEBOOK', token: string) => {
    try {
      setIsLoading(true);

      const response = await axiosClient.post(`/auth/social-login`, { provider, token, }, { timeout: 10000 });
      const { accessToken, user, requires2FA, tempToken } = response.data;

      if (requires2FA) {
        router.push({ pathname: '/sign-in', params: { view: 'VERIFY_2FA', token: tempToken } });
        setIsLoading(false);
        return;
      }

      if (setAuth) {
        await setAuth(accessToken, user);
        axiosClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

        // <-- 2. BỔ SUNG: CẬP NHẬT CACHE RAM -->
        setCachedAccessToken(accessToken);

        if (user.isProfileComplete === false) {
          router.push('/complete-social-profile' as Href);
        } else {
          router.push('/(tabs)' as Href);
        }
      } else {
        Alert.alert("Lỗi ứng dụng", "Không thể lưu phiên đăng nhập.");
      }

    } catch (error: any) {
      console.error(`Lỗi đăng nhập ${provider}:`, error.response?.data || error.message);
      Alert.alert('Đăng nhập thất bại', error.response?.data?.message || 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra lại.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. XỬ LÝ ĐĂNG NHẬP GOOGLE
  const handleGoogleLogin = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      // API mới của thư viện google-signin (từ v11+)
      if (response.type === 'success') {
        // Truy cập idToken thông qua response.data
        if (response.data?.idToken) {
          await handleSocialLoginAPI('GOOGLE', response.data.idToken);
        }
      } else if (response.type === 'cancelled') {
        // Người dùng chủ động đóng popup đăng nhập
        return;
      }
    } catch (error: any) {
      // Giữ nguyên block catch để bắt các lỗi kết nối hoặc Google Play Services
      if (error.code !== 'SIGN_IN_CANCELLED' && error.code !== '12501') {
         console.error("Google Login Error:", error);
         Alert.alert("Lỗi đăng nhập", "Không thể kết nối với Google lúc này.");
      }
    }
  };

  // 3. XỬ LÝ ĐĂNG NHẬP FACEBOOK
  // const handleFacebookLogin = async () => {
  //   try {
  //     // --- BỔ SUNG LOGIC CHO RIÊNG iOS ---
  //     if (Platform.OS === 'ios') {
  //       Settings.initializeSDK();
  //     }
  //     // ------------------------------------

  //     // Tiến hành gọi cửa sổ đăng nhập Facebook như bình thường
  //     const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);

  //     if (result.isCancelled) {
  //       return;
  //     }

  //     const data = await AccessToken.getCurrentAccessToken();

  //     if (!data) {
  //       throw new Error('Không thể lấy mã truy cập từ Facebook');
  //     }

  //     // Gọi API của bạn
  //     await handleSocialLoginAPI('FACEBOOK', data.accessToken);

  //   } catch (error: any) {
  //     console.error("Facebook Login Error:", error);
  //     Alert.alert("Lỗi đăng nhập", "Không thể kết nối với Facebook lúc này.");
  //   }
  // };

  // 4. XỬ LÝ ĐĂNG NHẬP APPLE
  const handleAppleLogin = async () => {
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
        Alert.alert("Lỗi đăng nhập Apple", e.message);
      }
    }
  };

  const SocialButton = ({ icon, title, onPress, bgClass = "bg-white", textClass = "text-gray-700", borderClass = "border border-[#E5E5E5]" }: any) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={isLoading}
      activeOpacity={0.8}
      className={`flex-row items-center justify-center w-full py-[21px] rounded-[16px] mb-[12px] ${bgClass} ${borderClass} ${isLoading ? 'opacity-50' : ''}`}
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
      <Image
        source={icon}
        style={{ width: 21, height: 21 }}
        resizeMode="cover"
      />
      <Text className={`ml-[13px] font-semibold text-[14px] tracking-[0.06px] ${textClass}`}>
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
              <Text className="text-[30px] font-semibold text-black mb-[21px] tracking-[0.06px] ">
                Let’s Get Started!
              </Text>
              <Text className="text-gray-500 mb-[33px] font-medium text-[16px]">
                Let's dive into your account
              </Text>

              <Animated.View entering={FadeInDown.delay(300).springify()} className="w-full">
                <SocialButton
                  icon={require('../assets/icon/google.png')}
                  title="Continue with Google"
                  onPress={handleGoogleLogin}
                />
              </Animated.View>

              {Platform.OS === 'ios' && (
                <Animated.View entering={FadeInDown.delay(400).springify()} className="w-full">
                  <SocialButton
                    icon={require('../assets/icon/apple.png')}
                    title="Continue with Apple"
                    onPress={handleAppleLogin}
                  />
                </Animated.View>
              )}

              {/* <Animated.View entering={FadeInDown.delay(500).springify()} className="w-full">
                    <SocialButton 
                  icon={require('../assets/icon/facebook.png')}
                      title="Continue with Facebook" 
                      onPress={handleFacebookLogin}
                    />
                </Animated.View> */}

              <Animated.View entering={FadeInDown.delay(600).springify()} className="w-full mt-4">
                <TouchableOpacity
                  className={`w-full bg-[#E89B5A] py-[21px] rounded-[100px] shadow-sm items-center active:scale-95 transition-transform  ${isLoading ? 'opacity-50' : ''}`}
                  onPress={() => router.push('/sign-in' as Href)}
                  disabled={isLoading}
                  style={{
                    shadowColor: '#000000',
                    shadowOffset: {
                      width: 0,
                      height: 4,
                    },
                    shadowOpacity: 0.15,
                    shadowRadius: 4,

                    elevation: 5,
                  }}
                >
                  <Text className="text-white font-bold text-[20px]">Log In</Text>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(700).springify()} className="mt-[25px]">
                <TouchableOpacity onPress={() => router.push('/fill-profile')} disabled={isLoading}>
                  <Text className="text-[#E89B5A] font-semibold text-[20px]">Sign Up</Text>
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
              onPress={() => Linking.openURL('https://elfin-pajama-4bb.notion.site/CH-NH-S-CH-B-O-M-T-PAWLIFE-36c6c8475df680fa8064e7ebf82d0933')}
              activeOpacity={0.7}
            >
              <Text className="text-center text-[#8E8E93] tracking-[0.06px] text-[16px] font-medium">
                Privacy Policy
              </Text>
            </TouchableOpacity>

            <Text className="text-center text-[#8E8E93] tracking-[0.06px] text-[16px] mx-2 font-medium">
              ·
            </Text>

            <TouchableOpacity
              onPress={() => Linking.openURL('https://elfin-pajama-4bb.notion.site/I-U-KHO-N-D-CH-V-PAWLIFE-36c6c8475df6802d9157e559e3eb422c')}
              activeOpacity={0.7}
            >
              <Text className="text-center text-[#8E8E93] tracking-[0.06px] text-[16px] font-medium">
                Terms of Service
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}