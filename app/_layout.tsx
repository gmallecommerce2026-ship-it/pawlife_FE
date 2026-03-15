// app/_layout.tsx
// Import NativeWind
import { AppProvider } from '@/contexts/AppContext';
import { AuthContext, AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useContext, useEffect, useRef, useState } from 'react';
import { AppState, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import FloatingHomeButton from '../components/FloatingHomeButton';
import './global.css';

// Import thư viện bảo mật
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

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
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(tabs)';

    if (!isAuthenticated && inAuthGroup) {
      router.replace('/');
    } else if (isAuthenticated && inSignInScreen) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);

  const isSignInScreen = inSignInScreen;
  const isHomeScreen = segments[0] === '(tabs)' && (segments.length === 1 || segments[1] === 'index');
  const shouldHideFloatingButton = isSignInScreen || isHomeScreen;
  
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
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
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
      <Stack.Screen name="my-application" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="adoption-status" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="scan" options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'slide_from_right' }} />
      <Stack.Screen name="scanned-pet" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="matching" options={{ headerShown: false, animation: 'slide_from_right' }} />
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
      <Stack.Screen name="followed-shelters" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="interested-events" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="device-management" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="language" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="favorite-pets" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="add-pet" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="edit-pet" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="shelter-pet-detail" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="pawcare/[category]" options={{ headerShown: false, animation: 'slide_from_right' }} />
    </Stack>
  );
}