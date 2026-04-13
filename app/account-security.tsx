// app/account-security.tsx
import { Text } from '@/components/AppText';
import { AuthContext } from '@/contexts/AuthContext';
import { AntDesign, Feather, Ionicons } from '@expo/vector-icons';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { useLanguage } from '@/contexts/LanguageContext';
import { AppContext } from '@/contexts/AppContext';

// Tái sử dụng component cho dạng bật/tắt (Toggle)
const SettingToggle = ({ label, value, onValueChange }: { label: string, value: boolean, onValueChange: (val: boolean) => void }) => (
  <View className="flex-row items-center justify-between py-4 border-b border-gray-100">
    <Text className="text-base font-semibold text-gray-900">{label}</Text>
    <Switch
      trackColor={{ false: '#D1D5DB', true: '#10B981' }}
      thumbColor={'#FFFFFF'}
      ios_backgroundColor="#D1D5DB"
      onValueChange={onValueChange}
      value={value}
    />
  </View>
);

// Tái sử dụng component cho dạng chuyển hướng (Link)
const SettingLink = ({ label, description, onPress, isLast = false }: { label: string, description?: string, onPress?: () => void, isLast?: boolean }) => (
  <TouchableOpacity 
    activeOpacity={0.7} 
    onPress={onPress}
    className={`py-4 ${!isLast ? 'border-b border-gray-100' : ''}`}
  >
    <View className="flex-row items-center justify-between">
      <Text className="text-base font-semibold text-gray-900">{label}</Text>
      <Feather name="chevron-right" size={20} color="#9CA3AF" />
    </View>
    {description && (
      <Text className="text-sm text-gray-500 mt-1.5 leading-5">{description}</Text>
    )}
  </TouchableOpacity>
);

export default function AccountSecurityScreen() {
  const router = useRouter();
  const { logout, user, setAuth } = useContext(AuthContext) as any;
  
  // States cho các mục Toggle
  const [useFaceId, setUseFaceId] = useState(false);
  const [useGoogleAuth, setUseGoogleAuth] = useState(false);
  
  const [isDeleting, setIsDeleting] = useState(false);

  // States cho Modal Google Authenticator
  const [is2FAModalVisible, set2FAModalVisible] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [twoFaCode, setTwoFaCode] = useState('');
  const [isProcessing2FA, setIsProcessing2FA] = useState(false);
  const { isFloatingButtonVisible, setIsFloatingButtonVisible } = useContext(AppContext) as any;
const { t } = useLanguage();
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
        // ĐỔI TÊN KEY ĐỂ DÙNG CHUNG CHO MÀN LOGIN
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
        Alert.alert("Lỗi", "Thiết bị không hỗ trợ hoặc chưa thiết lập sinh trắc học (Face ID/Vân tay).");
        return;
      }

      // Yêu cầu xác thực ngay khi vừa gạt công tắc để đảm bảo chủ thiết bị
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Xác thực để bật Đăng nhập bằng Face ID',
        cancelLabel: 'Hủy',
      });

      if (result.success) {
        // Kiểm tra xem đã có thông tin trong SecureStore chưa
        const savedEmail = await SecureStore.getItemAsync('secure_email');
        if (!savedEmail) {
          Alert.alert("Lưu ý", "Vui lòng đăng xuất và đăng nhập lại bằng mật khẩu một lần để hệ thống lưu trữ khóa bảo mật.");
          return;
        }

        setUseFaceId(true);
        // LƯU CỜ GLOBAL ĐỂ MÀN SIGN IN NHẬN DIỆN ĐƯỢC
        await AsyncStorage.setItem('isFaceIdEnabled', 'true');
        Alert.alert("Thành công", "Đã bật đăng nhập bằng Face ID/Sinh trắc học.");
      } else {
        setUseFaceId(false);
      }
    } else {
      setUseFaceId(false);
      await AsyncStorage.removeItem('isFaceIdEnabled');
      // Tùy chọn: Xóa luôn thông tin trong SecureStore nếu muốn an toàn tuyệt đối khi tắt
      // await SecureStore.deleteItemAsync('secure_email');
      // await SecureStore.deleteItemAsync('secure_password');
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
        Alert.alert("Lỗi", "Không thể tạo mã cấu hình 2FA.");
      }
    } else {
      Alert.alert(
        "Tắt Google Authenticator",
        "Bạn có chắc chắn muốn tắt bảo mật 2 lớp?",
        [
          { text: "Hủy", style: "cancel" },
          { 
            text: "Tắt", 
            style: "destructive", 
            onPress: async () => {
              try {
                await axiosClient.post('/auth/2fa/turn-off');
                setUseGoogleAuth(false);
                
                if (setAuth && user) {
                  // FIX: Dùng SecureStore thay vì AsyncStorage
                  const currentToken = await SecureStore.getItemAsync('accessToken');
                  if (currentToken) {
                    await setAuth(currentToken, { ...user, isTwoFactorEnabled: false });
                  }
                }
                Alert.alert("Thành công", "Đã tắt Google Authenticator.");
              } catch (error) {
                Alert.alert("Lỗi", "Không thể tắt 2FA lúc này.");
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
      Alert.alert("Lỗi", "Vui lòng nhập đúng 6 số từ ứng dụng.");
      return;
    }
    try {
      setIsProcessing2FA(true);
      await axiosClient.post('/auth/2fa/turn-on', { code: twoFaCode });
      setUseGoogleAuth(true);
      set2FAModalVisible(false);
      setTwoFaCode('');
      
      if (setAuth && user) {
        // FIX: Dùng SecureStore thay vì AsyncStorage
        const currentToken = await SecureStore.getItemAsync('accessToken');
        if (currentToken) {
          await setAuth(currentToken, { ...user, isTwoFactorEnabled: true });
        }
      }

      Alert.alert("Thành công", "Đã bật bảo mật 2 lớp bằng Google Authenticator.");
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Mã 2FA không chính xác.");
    } finally {
      setIsProcessing2FA(false);
    }
  };

  const handleDeactivate = () => {
    Alert.alert(
      "Deactivate Account",
      "Are you sure you want to deactivate your account? You can reactivate it anytime by logging back in.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Deactivate", style: "destructive", onPress: () => console.log("Deactivate triggered") }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you absolutely sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Yes, delete it", 
          style: "destructive",
          onPress: async () => {
            try {
              setIsDeleting(true);
              await axiosClient.delete('/auth/account');
              if (logout) await logout(); 
              Alert.alert("Success", "Your account has been permanently deleted.");
              router.replace('/');
            } catch (error) {
              console.error("Delete Error:", error);
              Alert.alert("Error", "Failed to delete account. Please try again later.");
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View className="flex-1 bg-[#F9FAFB]">
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        
        {/* --- HEADER --- */}
        <View className="flex-row items-center px-4 py-2 mb-2 relative bg-white pb-4 shadow-sm z-10">
            <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 z-10">
                <AntDesign name="left" size={24} color="#1F2937" />
            </TouchableOpacity>
            <View className="absolute left-0 right-0 items-center justify-center pointer-events-none">
                <Text className="text-xl font-bold text-gray-900">Account & Security</Text>
            </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            
            {/* --- BIOMETRICS & 2FA --- */}
            <View className="bg-white px-6 mt-4 border-y border-gray-100">
              <SettingToggle 
                label="Face ID" 
                value={useFaceId} 
                onValueChange={handleToggleFaceId} 
              />
              
              <View className="py-4">
                <View className="flex-row items-center justify-between">
                    <Text className="text-base font-semibold text-gray-900">Google Authenticator</Text>
                    <Switch
                        trackColor={{ false: '#D1D5DB', true: '#10B981' }}
                        thumbColor={'#FFFFFF'}
                        ios_backgroundColor="#D1D5DB"
                        onValueChange={handleToggleGoogleAuth}
                        value={useGoogleAuth}
                    />
                </View>
              </View>
            </View>

            {/* --- MANAGEMENT --- */}
            <View className="bg-white px-6 mt-6 border-y border-gray-100">
              <SettingLink 
                label="Change Password" 
                onPress={() => router.push('/change-password')}
              />
              <SettingLink 
                label="Device Management" 
                description="Manage your account on the various devices you own."
                onPress={() => router.push('/device-management')}
                isLast={true}
              />
            </View>
            <View className="bg-white px-6 mt-6 border-y border-gray-100">
  <View className="flex-row items-center justify-between py-4">
    <View className="flex-row items-center flex-1 pr-4">
      <View className="w-10 h-10 bg-[#F4F5F7] rounded-full items-center justify-center mr-3">
        <Ionicons name="radio-button-on" size={20} color="#374151" />
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-gray-900">
          {t('Floating Home Button') || 'Floating Home Button'}
        </Text>
        <Text className="text-sm text-gray-500 mt-0.5">
          {t('Show virtual home button on screen') || 'Show virtual home button on screen'}
        </Text>
      </View>
    </View>
    <Switch
      value={isFloatingButtonVisible}
      onValueChange={(val) => setIsFloatingButtonVisible(val)}
      trackColor={{ false: '#D1D5DB', true: '#10B981' }} /* Dùng màu xanh đồng bộ với Face ID */
      thumbColor={'#FFFFFF'}
      ios_backgroundColor="#D1D5DB"
    />
  </View>
</View>
            {/* --- DANGER ZONE --- */}
            <View className="bg-white px-6 mt-6 border-y border-gray-100">
            {/* <TouchableOpacity 
                activeOpacity={0.7} 
                onPress={handleDeactivate}
                className="py-4 border-b border-gray-100"
            >
                <Text className="text-base font-semibold text-orange-500">Deactivate Account</Text>
                <Text className="text-sm text-gray-500 mt-1.5 leading-5">
                Temporarily deactivate your account. Easily reactivate when you're ready.
                </Text>
            </TouchableOpacity> */}

            <TouchableOpacity 
                activeOpacity={0.7} 
                onPress={handleDeleteAccount}
                disabled={isDeleting}
                className="py-4"
            >
                <View className="flex-row items-center">
                <Text className="text-base font-semibold text-red-500 mr-2">
                    {isDeleting ? "Deleting Account..." : "Delete Account"}
                </Text>
                {isDeleting && <ActivityIndicator size="small" color="#EF4444" />}
                </View>
                <Text className="text-sm text-gray-500 mt-1.5 leading-5">
                Permanently remove your account and data. Proceed with caution.
                </Text>
            </TouchableOpacity>
            </View>

        </ScrollView>

        {/* --- MODAL BẬT 2FA --- */}
        <Modal visible={is2FAModalVisible} animationType="slide" transparent={true}>
          <View className="flex-1 bg-black/50 justify-center items-center px-4">
            <View className="bg-white rounded-3xl p-6 w-full items-center">
              <Text className="text-xl font-bold mb-2">Cài đặt 2FA</Text>
              <Text className="text-center text-gray-500 mb-4">
                Sử dụng ứng dụng Google Authenticator để quét mã QR bên dưới.
              </Text>
              
              {qrCodeUrl ? (
                <Image source={{ uri: qrCodeUrl }} style={{ width: 200, height: 200 }} className="mb-6" />
              ) : (
                <ActivityIndicator size="large" color="#f97316" className="my-10" />
              )}

              <TextInput
                placeholder="Nhập mã 6 số từ ứng dụng"
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
                  <Text className="text-center text-white font-bold text-lg">Xác nhận</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => { set2FAModalVisible(false); setTwoFaCode(''); }} 
                className="py-2"
                disabled={isProcessing2FA}
              >
                <Text className="text-gray-500 font-medium text-base">Hủy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </View>
  );
}