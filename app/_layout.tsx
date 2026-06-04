// app/_layout.tsx
// Import NativeWind
import { AppProvider } from '@/contexts/AppContext';
import { AuthContext, AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext'; // BỔ SUNG: Import useLanguage
import {
  Urbanist_400Regular,
  Urbanist_400Regular_Italic,
  Urbanist_500Medium,
  Urbanist_600SemiBold,
  Urbanist_700Bold,
  Urbanist_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/urbanist';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useContext, useEffect, useRef, useState } from 'react';
// BỔ SUNG 1: Thêm Alert vào import từ react-native
import { Alert, AppState, Text, TextInput, TouchableOpacity } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import './global.css';

// Import thư viện bảo mật
import { toastConfig } from '@/components/toastConfig';
import { connectSocket, socket } from '@/utils/socket';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import Toast from 'react-native-toast-message';
import { SuccessModal } from '../components/SuccessModal';

// BỔ SUNG: Import React Query
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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

// Khởi tạo Query Client (Bên ngoài component để không bị re-create)
const queryClient = new QueryClient();

// ------------------------------------------------------------------
// Component Guard: Xử lý logic điều hướng và FaceID Lock
// ------------------------------------------------------------------
function RootLayoutNavGuard() {
  const { isAuthenticated, isLoading, user } = useContext(AuthContext);
  const segments = useSegments() as string[];
  const router = useRouter();
  const { t } = useLanguage(); // BỔ SUNG: Gọi hook dịch thuật

  // Face ID States
  const [isAppLocked, setIsAppLocked] = useState(false);
  const appState = useRef(AppState.currentState);
  const [hasSeenIntro, setHasSeenIntro] = useState<boolean | null>(null);

  useEffect(() => {
    const initSocket = async () => {
      if (isAuthenticated && !socket.connected) {
        const token = await SecureStore.getItemAsync('access_token');
        if (token) {
          connectSocket(token);
        }
      }
    };
    initSocket();
  }, [isAuthenticated]);

  // BỔ SUNG 3: Global Socket Listener cho luồng Transfer Ownership
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleIncomingTransfer = (data: { transferId: string, petId: string, senderId: string }) => {
      Alert.alert(
        t('Transfer Request'),
        t('You just received a pet transfer request. Do you want to check and confirm it now?'),
        [
          { text: t('Later'), style: "cancel" },
          {
            text: t('View now'),
            onPress: () => {
              router.push({
                pathname: '/transfer-ownership',
                params: { petId: data.petId }
              });
            }
          }
        ]
      );
    };

    socket.on('transfer_requested', handleIncomingTransfer);

    return () => {
      socket.off('transfer_requested', handleIncomingTransfer);
    };
  }, [isAuthenticated, router, t]);

  const verifyFaceId = async () => {
    try {
      const useFaceId = await AsyncStorage.getItem('useFaceId');
      if (useFaceId !== 'true') return;

      const lastAuthStr = await AsyncStorage.getItem('lastAuthTimestamp');
      const now = Date.now();
      const ONE_HOUR_IN_MS = 60 * 60 * 1000;

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
      promptMessage: t('Authenticate to continue using the app'),
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

  // Xử lý Auth Routing & Profile Completion Guard
  useEffect(() => {
    if (isLoading || hasSeenIntro === null) return;

    const inAuthGroup = segments[0] === '(tabs)';
    const inIntroScreen = segments[0] === 'intro';
    const inSignInScreen = segments.length === 0 || segments[0] === 'index' || segments[0] === 'sign-in' || segments[0] === 'fill-profile';
    const inCompleteProfileScreen = segments[0] === 'complete-social-profile';

    if (!isAuthenticated) {
      if (inAuthGroup || inIntroScreen || inCompleteProfileScreen) {
        router.push('/');
      }
    } else {
      const isProfileIncomplete = !user?.phone || !user?.dob || !user?.gender;

      if (isProfileIncomplete) {
        if (!inCompleteProfileScreen) {
          router.push('/complete-social-profile');
        }
      } else {
        if (inSignInScreen || inCompleteProfileScreen) {
          if (!hasSeenIntro) {
            router.push('/intro'); 
          } else {
            router.push('/(tabs)'); 
          }
        }
      }
    }
  }, [isAuthenticated, isLoading, user, segments, hasSeenIntro]);

  // Render Màn Hình Khóa nếu hết hạn 1 tiếng
  if (isAppLocked) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <FontAwesome name="lock" size={64} color="#10B981" style={{ marginBottom: 20 }} />
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 10 }}>
          {t('App locked')}
        </Text>
        <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 30, textAlign: 'center', paddingHorizontal: 20 }}>
          {t('It has been over an hour since your last login. Please authenticate again for safety.')}
        </Text>
        <TouchableOpacity
          onPress={promptBiometrics}
          style={{ backgroundColor: '#10B981', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 8 }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
            {t('Unlock with Face ID')}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <>
      <RootLayoutNav />
    </>
  );
}

// ------------------------------------------------------------------
// Component RootLayout chính: Load Font và Provider
// ------------------------------------------------------------------
export default function RootLayout() {
  const [loaded, error] = useFonts({
    Urbanist: Urbanist_400Regular,
    UrbanistMedium: Urbanist_500Medium,
    UrbanistSemiBold: Urbanist_600SemiBold,
    UrbanistBold: Urbanist_700Bold,
    UrbanistItalic: Urbanist_400Regular_Italic,
    UrbanistExtraBold: Urbanist_800ExtraBold,
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
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AppProvider>
          <AuthProvider>
            <LanguageProvider>
              <RootLayoutNavGuard />
              <Toast config={toastConfig} position="top" topOffset={50} />
              <SuccessModal />
            </LanguageProvider>
          </AuthProvider>
        </AppProvider>
      </QueryClientProvider>
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
      <Stack.Screen name="my-applications" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="adoption-status" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="select-last-seen-location" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="tag-route-details" options={{ headerShown: false, animation: 'slide_from_right' }} />
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
      {/* <Stack.Screen name="profile-settings" options={{ headerShown: false, animation: 'slide_from_right' }} /> */}
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
      <Stack.Screen name="report-lost-pet" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="complete-social-profile" options={{ headerShown: false, animation: 'slide_from_right' }} />
    </Stack>
  );
}