// app/account-security.tsx
import { Text } from '@/components/AppText';
import { AuthContext } from '@/contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  Modal,
  ScrollView,
  Switch,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axiosClient from '../api/axiosClient';
// Import thư viện sinh trắc học và bộ nhớ
import { useLanguage } from '@/contexts/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

// Tái sử dụng component cho dạng bật/tắt (Toggle)
const SettingToggle = ({ label, value, onValueChange, t }: { label: string, value: boolean, onValueChange: (val: boolean) => void, t: any }) => (
  <View className="flex-row items-center justify-between py-2">
    <Text className="text-[16px] font-semibold text-black">{t(label)}</Text>
    <Switch
      trackColor={{ false: '#D1D5DB', true: '#E89B5A' }}
      thumbColor={'#FFFFFF'}
      ios_backgroundColor="#D1D5DB"
      onValueChange={onValueChange}
      value={value}
      style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
    />
  </View>
);

// Tái sử dụng component cho dạng chuyển hướng (Link)
const SettingLink = ({ label, description, onPress, isLast = false, t }: { label: string, description?: string, onPress?: () => void, isLast?: boolean, t: any }) => (
  <TouchableOpacity
    activeOpacity={0.7}
    onPress={onPress}
    className={`py-4`}
  >
    <View className="flex-row items-center justify-between">
      <Text className="text-[16px] font-semibold text-black">{t(label)}</Text>
      <Feather name="chevron-right" size={20} color="#000000" />
    </View>
    {description && (
      <Text className="text-sm text-gray-500 mt-1.5 leading-5">{t(description)}</Text>
    )}
  </TouchableOpacity>
);

export default function AccountSecurityScreen() {
  const router = useRouter();
  const { logout, user, setAuth } = useContext(AuthContext) as any;
  const { t } = useLanguage(); // Lấy hàm translate

  // States cho các mục Toggle
  const [useFaceId, setUseFaceId] = useState(false);
  const [useGoogleAuth, setUseGoogleAuth] = useState(false);

  const [isDeleting, setIsDeleting] = useState(false);

  // States cho Modal Google Authenticator
  const [is2FAModalVisible, set2FAModalVisible] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [twoFaCode, setTwoFaCode] = useState('');
  const [isProcessing2FA, setIsProcessing2FA] = useState(false);

  const handleTwoFaCodeChange = (text: string) => {
    setTwoFaCode(text);

    // Tự động ẩn bàn phím khi nhập đủ 6 số
    if (text.length === 6) {
      Keyboard.dismiss();
    }
  };

  // Load trạng thái Face ID & 2FA khi vào màn hình
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;
      try {
        const faceIdSetting = await AsyncStorage.getItem('isFaceIdEnabled');
        setUseFaceId(faceIdSetting === 'true');

        setUseGoogleAuth(!!user.isTwoFactorEnabled);
      } catch (error) {
        console.error("Error loading settings", error);
      }
    };
    loadSettings();
  }, [user]);

  // Xử lý bật/tắt Face ID
  const handleToggleFaceId = async (newValue: boolean) => {
    if (newValue) {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert(t("Error"), t("Device does not support or has not set up biometrics (Face ID/Touch ID)."));
        return;
      }

      // Yêu cầu xác thực ngay khi vừa gạt công tắc để đảm bảo chủ thiết bị
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('Authenticate to enable Face ID Login'),
        cancelLabel: t('common.cancel'), // Dùng key chung
      });

      if (result.success) {
        // Kiểm tra xem đã có thông tin trong SecureStore chưa
        const savedEmail = await SecureStore.getItemAsync('secure_email');
        if (!savedEmail) {
          Alert.alert(t("Notice"), t("Please log out and log in again with a password once so the system can securely store your key."));
          return;
        }

        setUseFaceId(true);
        // LƯU CỜ GLOBAL ĐỂ MÀN SIGN IN NHẬN DIỆN ĐƯỢC
        await AsyncStorage.setItem('isFaceIdEnabled', 'true');
        Alert.alert(t("Success"), t("Face ID/Biometrics login enabled."));
      } else {
        setUseFaceId(false);
      }
    } else {
      setUseFaceId(false);
      await AsyncStorage.removeItem('isFaceIdEnabled');
    }
  };

  // Xử lý bật/tắt Google Authenticator
  const handleToggleGoogleAuth = async (newValue: boolean) => {
    if (newValue) {
      try {
        const response = await axiosClient.post('/auth/2fa/generate');
        setQrCodeUrl(response.data.qrCodeUrl);
        set2FAModalVisible(true);
      } catch (error) {
        Alert.alert(t("Error"), t("Cannot generate 2FA configuration code."));
      }
    } else {
      Alert.alert(
        t("Turn off Google Authenticator"),
        t("Are you sure you want to turn off two-factor authentication?"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("Turn off"),
            style: "destructive",
            onPress: async () => {
              try {
                await axiosClient.post('/auth/2fa/turn-off');
                setUseGoogleAuth(false);

                if (setAuth && user) {
                  const currentToken = await SecureStore.getItemAsync('accessToken');
                  if (currentToken) {
                    await setAuth(currentToken, { ...user, isTwoFactorEnabled: false });
                  }
                }
                Alert.alert(t("Success"), t("Google Authenticator has been turned off."));
              } catch (error) {
                Alert.alert(t("Error"), t("Cannot turn off 2FA at this time."));
              }
            }
          }
        ]
      );
    }
  };

  // Xác nhận bật 2FA
  const handleConfirm2FA = async () => {
    if (twoFaCode.length !== 6) {
      Alert.alert(t("Error"), t("Please enter exactly 6 digits from the app."));
      return;
    }
    try {
      setIsProcessing2FA(true);
      await axiosClient.post('/auth/2fa/turn-on', { code: twoFaCode });
      setUseGoogleAuth(true);
      set2FAModalVisible(false);
      setTwoFaCode('');

      if (setAuth && user) {
        const currentToken = await SecureStore.getItemAsync('accessToken');
        if (currentToken) {
          await setAuth(currentToken, { ...user, isTwoFactorEnabled: true });
        }
      }

      Alert.alert(t("Success"), t("Two-factor authentication via Google Authenticator enabled."));
    } catch (error: any) {
      Alert.alert(t("Error"), error.response?.data?.message || t("Incorrect 2FA code."));
    } finally {
      setIsProcessing2FA(false);
    }
  };

  const handleDeactivate = () => {
    Alert.alert(
      t("Deactivate Account"),
      t("Are you sure you want to deactivate your account? You can reactivate it anytime by logging back in."),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("Deactivate"), style: "destructive", onPress: () => {} }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t("Delete Account"),
      t("Are you absolutely sure you want to delete your account? This action cannot be undone and all your data will be permanently lost."),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("Yes, delete it"),
          style: "destructive",
          onPress: async () => {
            try {
              setIsDeleting(true);
              await axiosClient.delete('/auth/account');
              if (logout) await logout();
              Alert.alert(t("Success"), t("Your account has been permanently deleted."));
              router.push('/');
            } catch (error) {
              console.error("Delete Error:", error);
              Alert.alert(t("Error"), t("Failed to delete account. Please try again later."));
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View className="flex-1 bg-[#FFFFFF]">
      <SafeAreaView edges={['top', 'bottom']}>

        {/* --- HEADER --- */}
        <View className="flex-row items-center px-4 py-2 mb-2 relative bg-white pb-4">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 z-10">
            <Feather name="chevron-left" size={20} color="#000000" />
          </TouchableOpacity>
          <View className="absolute left-0 right-0 items-center justify-center pointer-events-none">
            <Text className="text-[20px] font-semibold text-black">{t('Account & Security')}</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* --- BIOMETRICS & 2FA --- */}
          <View className="bg-white px-6 mt-2">
            <SettingToggle
              label="Face ID"
              value={useFaceId}
              onValueChange={handleToggleFaceId}
              t={t} // Truyền t vào
            />

            {/* <View className="py-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-[16px] font-semibold text-black">{t('Google Authenticator')}</Text>
                <Switch
                  trackColor={{ false: '#D1D5DB', true: '#E89B5A' }}
                  thumbColor={'#FFFFFF'}
                  ios_backgroundColor="#D1D5DB"
                  onValueChange={handleToggleGoogleAuth}
                  value={useGoogleAuth}
                  style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                />
              </View>
            </View> */}
          </View>

          {/* --- MANAGEMENT --- */}
          <View className="bg-white px-6 ">
            <SettingLink
              label="Change Password"
              t={t} // Truyền t vào
              onPress={() => router.push('/change-password')}
            />
            <SettingLink
              label="Device Management"
              description="Manage your account on the various devices you own."
              t={t} // Truyền t vào
              onPress={() => router.push('/device-management')}
              isLast={true}
            />
          </View>

          {/* --- DANGER ZONE --- */}
          <View className="bg-white px-6 mt-6 ">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleDeleteAccount}
              disabled={isDeleting}
              className="py-4"
            >
              <View className='flex-row items-center justify-between'>
                <View className="flex-row items-center">
                  <Text className="text-[16px] font-semibold text-red-500 mr-2">
                    {isDeleting ? t("Deleting Account...") : t("Delete Account")}
                  </Text>
                  {isDeleting && <ActivityIndicator size="small" color="#EF4444" />}
                </View>
                <Feather name="chevron-right" size={20} color="#EB4824" />
              </View>
              <Text className="text-sm text-gray-500 mt-1.5 leading-5">
                {t("Permanently remove your account and data. Proceed with caution.")}
              </Text>
            </TouchableOpacity>
          </View>

        </ScrollView>

        {/* --- MODAL BẬT 2FA --- */}
        <Modal visible={is2FAModalVisible} animationType="slide" transparent={true}>
          <View className="flex-1 bg-black/50 justify-center items-center px-4">
            <View className="bg-white rounded-3xl p-6 w-full items-center">
              <Text className="text-xl font-bold mb-2">{t('2FA Setup')}</Text>
              <Text className="text-center text-gray-500 mb-4">
                {t('Use the Google Authenticator app to scan the QR code below.')}
              </Text>

              {qrCodeUrl ? (
                <Image source={{ uri: qrCodeUrl }} style={{ width: 200, height: 200 }} className="mb-6" />
              ) : (
                <ActivityIndicator size="large" color="#f97316" className="my-10" />
              )}

              <TextInput
                placeholder={t('Enter 6-digit code from the app')}
                keyboardType="number-pad"
                maxLength={6}
                value={twoFaCode}
                onChangeText={handleTwoFaCodeChange}
                className="bg-gray-50 w-full px-4 py-4 rounded-2xl border border-gray-100 text-center text-xl tracking-[5px] font-bold mb-4"
              />

              <TouchableOpacity
                className={`w-full py-4 rounded-full mb-3 ${isProcessing2FA ? 'bg-orange-300' : 'bg-orange-500'}`}
                onPress={handleConfirm2FA} disabled={isProcessing2FA}
              >
                {isProcessing2FA ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-center text-white font-bold text-lg">{t('Xác nhận')}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => { set2FAModalVisible(false); setTwoFaCode(''); }}
                className="py-2"
                disabled={isProcessing2FA}
              >
                <Text className="text-gray-500 font-medium text-base">{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </View>
  );
}