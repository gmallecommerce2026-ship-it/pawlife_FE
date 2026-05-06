// app/_layout.tsx
// Import NativeWind
import { AppProvider } from '@/contexts/AppContext';
import { AuthContext, AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { Urbanist_400Regular, Urbanist_400Regular_Italic, Urbanist_500Medium, Urbanist_600SemiBold, Urbanist_700Bold, useFonts } from '@expo-google-fonts/urbanist';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useContext, useEffect, useRef, useState } from 'react';
// BỔ SUNG 1: Thêm Alert vào import từ react-native
import { Alert, AppState, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import FloatingHomeButton from '../components/FloatingHomeButton';
import './global.css';
// Import thư viện bảo mật
import { connectSocket, socket } from '@/utils/socket';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { SuccessModal } from '../components/SuccessModal';
// BỔ SUNG 2: Import socket
export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();
const overrideDefaultFont = () => {
  const TextRender = Text as any;
  const TextInputRender = TextInput as any;

  // Áp dụng font Urbanist cho Text
  TextRender.defaultProps = TextRender.defaultProps || {};
  TextRender.defaultProps.style = [{ fontFamily: 'Urbanist' }, TextRender.defaultProps.style];

  // Áp dụng font Urbanist cho TextInput
  TextInputRender.defaultProps = TextInputRender.defaultProps || {};
  TextInputRender.defaultProps.style = [{ fontFamily: 'Urbanist' }, TextInputRender.defaultProps.style];
};
overrideDefaultFont();

// ------------------------------------------------------------------
// Component Guard: Xử lý logic điều hướng và FaceID Lock
// ------------------------------------------------------------------
function RootLayoutNavGuard() {
  const { isAuthenticated, isLoading } = useContext(AuthContext);
  const segments = useSegments() as string[];
  const router = useRouter();

  // Face ID States
  const [isAppLocked, setIsAppLocked] = useState(false);
  const appState = useRef(AppState.currentState);
  const [hasSeenIntro, setHasSeenIntro] = useState<boolean | null>(null);
  useEffect(() => {
    const initSocket = async () => {
      if (isAuthenticated && !socket.connected) {
        const token = await SecureStore.getItemAsync('access_token'); // Dùng đúng key bạn đang lưu token
        if (token) {
          connectSocket(token);
        }
      }
    };
    initSocket();
  }, [isAuthenticated]);
  // BỔ SUNG 3: Global Socket Listener cho luồng Transfer Ownership
  useEffect(() => {
    // Chỉ kích hoạt socket listener nếu user đã đăng nhập hoàn tất
    if (!isAuthenticated) return;

    const handleIncomingTransfer = (data: { transferId: string, petId: string, senderId: string }) => {
      Alert.alert(
        "Yêu cầu chuyển nhượng",
        `Bạn vừa nhận được yêu cầu chuyển nhượng thú cưng. Bạn có muốn kiểm tra và xác nhận ngay bây giờ không?`,
        [
          { text: "Để sau", style: "cancel" },
          { 
            text: "Xem ngay", 
            onPress: () => {
              // Nhảy thẳng vào trang transfer-ownership của bé pet đó
              router.push({
                pathname: '/transfer-ownership',
                params: { petId: data.petId }
              });
            }
          }
        ]
      );
    };

    // Lắng nghe sự kiện từ server
    socket.on('transfer_requested', handleIncomingTransfer);

    return () => {
      // Dọn dẹp listener khi component unmount hoặc user đăng xuất
      socket.off('transfer_requested', handleIncomingTransfer);
    };
  }, [isAuthenticated, router]);


  const verifyFaceId = async () => {
    try {
      const useFaceId = await AsyncStorage.getItem('useFaceId');
      if (useFaceId !== 'true') return;

      const lastAuthStr = await AsyncStorage.getItem('lastAuthTimestamp');
      const now = Date.now();
      const ONE_HOUR_IN_MS = 60 * 60 * 1000; // 1 tiếng

      if (!lastAuthStr || now - parseInt(lastAuthStr, 10) > ONE_HOUR_IN_MS) {
        setIsAppLocked(true);
        await promptBiometrics();
      }
    } catch (error) {
      console.error("Error verifying Face ID", error);
    }
  };

  const promptBiometrics = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Xác thực để tiếp tục sử dụng ứng dụng',
      disableDeviceFallback: false,
    });

    if (result.success) {
      await AsyncStorage.setItem('lastAuthTimestamp', Date.now().toString());
      setIsAppLocked(false);
    }
  };

  useEffect(() => {
    const checkIntroStatus = async () => {
      try {
        const status = await AsyncStorage.getItem('hasSeenIntro');
        setHasSeenIntro(status === 'true');
      } catch (error) {
        setHasSeenIntro(false);
      }
    };
    checkIntroStatus();
    verifyFaceId();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        verifyFaceId();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Xử lý Auth Routing
  const inSignInScreen = segments.length === 0 || segments[0] === 'index' || segments[0] === 'sign-in' || segments[0] === 'fill-profile';
  useEffect(() => {
    // Đợi quá trình Auth và check Intro hoàn tất mới bắt đầu xử lý luồng
    if (isLoading || hasSeenIntro === null) return;

    const inAuthGroup = segments[0] === '(tabs)';
    const inIntroScreen = segments[0] === 'intro';
    const inSignInScreen = segments.length === 0 || segments[0] === 'index' || segments[0] === 'sign-in' || segments[0] === 'fill-profile';

    if (!isAuthenticated) {
      // Chưa đăng nhập mà cố vào màn hình cần bảo vệ -> đá về '/'
      if (inAuthGroup || inIntroScreen) {
        router.replace('/');
      }
    } else {
      // Đã đăng nhập nhưng đang kẹt ở màn hình Auth
      if (inSignInScreen) {
        // if (!hasSeenIntro) {
          router.replace('/intro'); // Nếu chưa xem intro -> vào intro
        // } else {
          // router.replace('/(tabs)'); // Nếu xem rồi -> vào tabs
        // }
      }
    }
  }, [isAuthenticated, isLoading, segments, hasSeenIntro]);

  const isSignInScreen = inSignInScreen;
  const isHomeScreen = segments[0] === '(tabs)' && (segments.length === 1 || segments[1] === 'index');
  const isIntroScreen = segments[0] === 'intro';
  const shouldHideFloatingButton = isSignInScreen || isHomeScreen || isIntroScreen;
  
  // Render Màn Hình Khóa nếu hết hạn 1 tiếng
  if (isAppLocked) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <FontAwesome name="lock" size={64} color="#10B981" style={{ marginBottom: 20 }} />
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 10 }}>
          Ứng dụng đã bị khóa
        </Text>
        <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 30, textAlign: 'center', paddingHorizontal: 20 }}>
          Đã hơn 1 tiếng kể từ lần đăng nhập cuối. Vui lòng xác thực lại để đảm bảo an toàn.
        </Text>
        <TouchableOpacity 
          onPress={promptBiometrics}
          style={{ backgroundColor: '#10B981', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 8 }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Mở khóa bằng Face ID</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <>
      <RootLayoutNav />
      {!shouldHideFloatingButton && <FloatingHomeButton />}
    </>
  );
}

// ------------------------------------------------------------------
// Component RootLayout chính: Load Font và Provider
// ------------------------------------------------------------------
export default function RootLayout() {
  // Thay đổi phần useFonts như sau:
  const [loaded, error] = useFonts({
    Urbanist: Urbanist_400Regular,
    UrbanistMedium: Urbanist_500Medium,
    UrbanistSemiBold: Urbanist_600SemiBold,
    UrbanistBold: Urbanist_700Bold,
    UrbanistItalic: Urbanist_400Regular_Italic
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return <View />;
  }
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <AuthProvider>
          <LanguageProvider>
            <RootLayoutNavGuard />
            <SuccessModal />
          </LanguageProvider>
        </AuthProvider>
      </AppProvider>
    </GestureHandlerRootView>
  );
}

// ------------------------------------------------------------------
// Component Stack cấu hình các màn hình
// ------------------------------------------------------------------
function RootLayoutNav() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="sign-in" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="fill-profile" options={{ headerShown: false, presentation: 'card', animation: 'slide_from_right' }} />
      
      {/* SỬA LỖI 1: Thêm chữ 's' vào my-applications để khớp với tên file */}
      <Stack.Screen name="my-applications" options={{ headerShown: false, animation: 'slide_from_right' }} />
      
      <Stack.Screen name="adoption-status" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      
      {/* SỬA LỖI 2: ĐÃ XÓA `scan`, `scanned-pet`, và `matching` VÌ CHÚNG THUỘC VỀ (tabs) */}

      <Stack.Screen name="shelter-profile" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="pet-detail-modal" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="pet-profile-detail" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="change-password" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="adoption-form" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="application-success" options={{ headerShown: false, presentation: 'transparentModal', animation: 'fade' }} />
      <Stack.Screen name="search" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="event-detail" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="organizer-profile" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="filter-modal" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="notifications" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="tag-report-detail" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="profile-settings" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="edit-profile" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="account-security" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="help-and-support" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="faq" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="privacy-policy" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="terms-of-service" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="verify-otp" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="followed-shelters" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="interested-events" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="device-management" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="language" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="favorite-pets" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="add-pet" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="edit-pet" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="shelter-pet-detail" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="view-qr-code" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="transfer-ownership" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="pawcare/[category]" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="intro" options={{ headerShown: false, animation: 'fade' }} />
    </Stack>
  );
}