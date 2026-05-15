// app/change-password.tsx
import { Text } from '@/components/AppText';
import { AntDesign, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axiosClient from '../api/axiosClient'; // Đảm bảo đường dẫn này đúng với dự án của bạn
import { useModalStore } from '@/store/useModalStore';
export default function ChangePasswordScreen() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const showModal = useModalStore((state) => state.showModal);

  const handleChangePassword = async () => {
    // Validate form
    let newErrors: Record<string, string> = {};
    if (!currentPassword) newErrors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại.';
    if (!newPassword || newPassword.length < 6) newErrors.newPassword = 'Mật khẩu mới phải có ít nhất 6 ký tự.';
    if (newPassword !== confirmPassword) newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsLoading(true);
      setErrors({});

      // GỌI API ĐỔI MẬT KHẨU Ở ĐÂY (Cập nhật endpoint theo backend NestJS của bạn)
      // Ví dụ: await axiosClient.post('/auth/change-password', { currentPassword, newPassword });
      await axiosClient.post('/auth/change-password', {
        currentPassword: currentPassword,
        newPassword: newPassword
      });

      showModal({
        title: 'Success',
        message: 'Password updated successfully! ',
        buttonText: 'Back',
        onConfirm: () => router.back(),
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Không thể thay đổi mật khẩu lúc này. Vui lòng thử lại.';
      setErrors({ form: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#FFFFFF]">
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>

        {/* --- HEADER --- */}
        <View className="flex-row items-center px-4 py-2 mb-2 relative bg-white pb-4">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 z-10">
            <Feather name="chevron-left" size={20} color="#000000" />
          </TouchableOpacity>
          <View className="absolute left-0 right-0 items-center justify-center pointer-events-none">
            <Text className="text-[24px] font-semibold text-black">Change Password</Text>
          </View>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24 }}>

            {/* Cảnh báo lỗi chung */}
            {errors.form && (
              <View className="bg-red-50 p-4 rounded-xl mb-6 border border-red-100">
                <Text className="text-red-500 text-sm">{errors.form}</Text>
              </View>
            )}

            {/* Mật khẩu hiện tại */}
            <View className="mb-5">
              <Text className="text-[16px] font-semibold text-black mb-2">Current Password</Text>
              <View className={`flex-row items-center bg-[#FAFAFA] border ${errors.currentPassword ? 'border-red-500' : 'border-gray-200'} rounded-[16px] px-4 py-3 h-14`}>
                <TextInput
                  style={{ fontFamily: 'Urbanist' }}
                  className="flex-1 font-regular text-gray-900"
                  secureTextEntry={!showCurrentPassword}
                  value={currentPassword}
                  onChangeText={(text) => { setCurrentPassword(text); setErrors({ ...errors, currentPassword: '' }); }}
                  placeholder="Enter current password"
                  placeholderTextColor="#B8B8B8"
                />
                <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)} className="ml-2 p-1">
                  <Feather name={showCurrentPassword ? "eye" : "eye-off"} size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
              {errors.currentPassword && <Text className="text-red-500 text-xs mt-1.5 ml-1">{errors.currentPassword}</Text>}
            </View>

            {/* Mật khẩu mới */}
            <View className="mb-5">
              <Text className="text-[16px] font-semibold text-black mb-2">New Password</Text>
              <View className={`flex-row items-center bg-[#FAFAFA] border ${errors.newPassword ? 'border-red-500' : 'border-gray-200'} rounded-[16px] px-4 py-3 h-14`}>
                <TextInput
                  style={{ fontFamily: 'Urbanist' }}
                  className="flex-1 font-regular text-gray-900"
                  secureTextEntry={!showNewPassword}
                  value={newPassword}
                  onChangeText={(text) => { setNewPassword(text); setErrors({ ...errors, newPassword: '' }); }}
                  placeholder="Enter new password"
                  placeholderTextColor="#B8B8B8"
                />
                <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} className="ml-2 p-1">
                  <Feather name={showNewPassword ? "eye" : "eye-off"} size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
              {errors.newPassword && <Text className="text-red-500 text-xs mt-1.5 ml-1">{errors.newPassword}</Text>}
            </View>

            {/* Xác nhận mật khẩu mới */}
            <View className="mb-8">
              <Text className="text-[16px] font-semibold text-black mb-2">Confirm New Password</Text>
              <View className={`flex-row items-center bg-[#FAFAFA] border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-200'} rounded-[16px] px-4 py-3 h-14`}>
                <TextInput
                  style={{ fontFamily: 'Urbanist' }}
                  className="flex-1 font-regular text-gray-900"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={(text) => { setConfirmPassword(text); setErrors({ ...errors, confirmPassword: '' }); }}
                  placeholder="Confirm new password"
                  placeholderTextColor="#B8B8B8"
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} className="ml-2 p-1">
                  <Feather name={showConfirmPassword ? "eye" : "eye-off"} size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && <Text className="text-red-500 text-xs mt-1.5 ml-1">{errors.confirmPassword}</Text>}
            </View>

            {/* Nút Submit */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleChangePassword}
              disabled={isLoading}
              className={`w-full h-14 rounded-full flex-row justify-center items-center shadow-sm ${isLoading ? 'bg-[#E89B5A]/60' : 'bg-[#E89B5A]'}`}
            >
              {isLoading && <ActivityIndicator size="small" color="white" className="mr-2" />}
              <Text className="text-white font-bold text-lg">
                {isLoading ? 'Updating...' : 'Update Password'}
              </Text>
            </TouchableOpacity>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}