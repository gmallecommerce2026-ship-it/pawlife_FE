// app/device-management.tsx
import { Text } from '@/components/AppText';
import { useLanguage } from '@/contexts/LanguageContext'; // <--- Thêm import này
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// Import axiosClient của dự án để tự động gắn Bearer Token
import axiosClient from '../api/axiosClient';

// Interface cho Thiết bị trả về từ Backend
interface DeviceSession {
  id: string;
  name: string;
  os: string;
  location: string;
  lastActive: string;
  isCurrentDevice: boolean;
  type: 'smartphone' | 'laptop' | 'tablet';
}

export default function DeviceManagementScreen() {
  const router = useRouter();
  const { language } = useLanguage(); // <--- Khởi tạo hook
  const isVi = language === 'vi'; // <--- Check ngôn ngữ

  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null); // Lưu ID thiết bị đang bị xóa

  // --- 1. LẤY DANH SÁCH THIẾT BỊ TỪ BACKEND ---
  const fetchDevices = async () => {
    try {
      setIsLoading(true);
      const response = await axiosClient.get('/auth/devices');
      let data = response.data?.data || response.data || [];
      
      // Sắp xếp: Thiết bị hiện tại (isCurrentDevice = true) lên top, 
      // sau đó ưu tiên thiết bị hoạt động gần nhất (lastActive)
      data.sort((a: any, b: any) => {
        if (a.isCurrentDevice) return -1;
        if (b.isCurrentDevice) return 1;
        return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime();
      });

      setDevices(data);
    } catch (error) {
      console.error("Lỗi lấy danh sách thiết bị:", error);
      Alert.alert(
        isVi ? "Lỗi" : "Error", 
        isVi ? "Không thể tải danh sách thiết bị lúc này." : "Unable to load device list at this time."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  // --- 2. XỬ LÝ ĐĂNG XUẤT THIẾT BỊ KHÁC ---
  const handleLogoutDevice = (deviceId: string, deviceName: string) => {
    Alert.alert(
      isVi ? "Đăng xuất thiết bị" : "Log out device",
      isVi ? `Bạn có chắc chắn muốn đăng xuất tài khoản khỏi ${deviceName}?` : `Are you sure you want to log out of ${deviceName}?`,
      [
        { text: isVi ? "Hủy" : "Cancel", style: "cancel" },
        {
          text: isVi ? "Đăng xuất" : "Log Out",
          style: "destructive",
          onPress: async () => {
            try {
              setIsProcessing(deviceId); // Hiển thị loading cho riêng nút này

              // Gọi API xóa Session
              await axiosClient.delete(`/auth/logout-device/${deviceId}`);

              // Cập nhật UI ngay lập tức bằng cách lọc thiết bị đã xóa ra khỏi mảng
              setDevices(prev => prev.filter(device => device.id !== deviceId));
              Alert.alert(
                isVi ? "Thành công" : "Success", 
                isVi ? `Đã đăng xuất khỏi ${deviceName}` : `Logged out of ${deviceName}`
              );
            } catch (error) {
              console.error("Lỗi đăng xuất thiết bị:", error);
              Alert.alert(
                isVi ? "Lỗi" : "Error", 
                isVi ? "Không thể đăng xuất thiết bị lúc này. Vui lòng kiểm tra lại kết nối mạng." : "Unable to log out device. Please check your network connection."
              );
            } finally {
              setIsProcessing(null);
            }
          }
        }
      ]
    );
  };

  // --- 3. HÀM CHỌN ICON DỰA TRÊN LOẠI THIẾT BỊ ---
  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'laptop':
        return <MaterialCommunityIcons name="laptop" size={28} color="#4B5563" />;
      case 'tablet':
        return <MaterialCommunityIcons name="tablet" size={28} color="#4B5563" />;
      case 'smartphone':
      default:
        return <MaterialCommunityIcons name="cellphone" size={28} color="#4B5563" />;
    }
  };

  // Hàm helper để format thời gian
  const formatTime = (isoString: string) => {
    if (!isoString) return isVi ? 'Không rõ thời gian' : 'Unknown time';
    try {
      const date = new Date(isoString);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();

      return `${hours}:${minutes} • ${day}/${month}/${year}`;
    } catch {
      return isVi ? 'Thời gian không hợp lệ' : 'Invalid time';
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
            <Text className="text-[20px] font-semibold text-black">
              {isVi ? 'Quản lý thiết bị' : 'Device Management'}
            </Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, paddingTop: 16 }}>

          <View className="px-6 mb-6">
            <Text className="text-gray-500 text-sm leading-5">
              {isVi 
                ? 'Đây là danh sách các thiết bị đã đăng nhập vào tài khoản. Đăng xuất khỏi mọi thiết bị có biểu hiện bất thường.'
                : 'This is a list of devices that have logged into the account. Log out of any device that shows unusual behavior.'}
            </Text>
          </View>

          {/* --- KHU VỰC DANH SÁCH THIẾT BỊ --- */}
          <View className="bg-white border-y border-gray-100 justify-center">

            {/* TRẠNG THÁI LOADING */}
            {isLoading ? (
              <View className="py-8 items-center justify-center">
                <ActivityIndicator size="large" color="#10B981" />
                <Text className="text-gray-400 mt-4 text-sm">
                  {isVi ? 'Đang tải danh sách thiết bị...' : 'Loading device list...'}
                </Text>
              </View>
            ) : devices.length === 0 ? (

              /* TRẠNG THÁI TRỐNG (Phòng hờ) */
              <View className="py-8 items-center justify-center">
                <Text className="text-gray-400 text-sm">
                  {isVi ? 'Không tìm thấy dữ liệu thiết bị.' : 'No device data found.'}
                </Text>
              </View>
            ) : (

              /* HIỂN THỊ DỮ LIỆU THẬT */
              devices.map((device, index) => (
                <View
                  key={device.id}
                  className={`flex-row items-center p-6 ${index !== devices.length - 1 ? 'border-b border-gray-100' : ''}`}
                >
                  {/* Icon Thiết bị */}
                  <View className="w-12 h-12 rounded-full bg-gray-50 items-center justify-center border border-gray-100 mr-4">
                    {getDeviceIcon(device.type)}
                  </View>

                  {/* Thông tin */}
                  <View className="flex-1">
                    <View className="flex-row items-center mb-1">
                      <Text className="text-base font-semibold text-gray-900">{device.name}</Text>
                      {device.isCurrentDevice && (
                        <View className="bg-emerald-50 px-2 py-0.5 rounded ml-2 border border-emerald-100">
                          <Text className="text-emerald-600 text-[10px] font-semibold uppercase">
                            {isVi ? 'Thiết bị này' : 'This device'}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-sm text-gray-500 mb-0.5">{device.os} • {device.location}</Text>
                    <Text className={`text-xs ${device.isCurrentDevice ? 'text-emerald-500 font-medium' : 'text-gray-400'}`}>
                      {device.isCurrentDevice 
                        ? (isVi ? 'Đang hoạt động' : 'Active now') 
                        : formatTime(device.lastActive)}
                    </Text>
                  </View>

                  {/* Nút Đăng xuất */}
                  {!device.isCurrentDevice && (
                    <TouchableOpacity
                      onPress={() => handleLogoutDevice(device.id, device.name)}
                      disabled={isProcessing === device.id}
                      className="p-2 ml-2"
                    >
                      {isProcessing === device.id ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <Feather name="log-out" size={20} color="#EF4444" />
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}