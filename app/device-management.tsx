// app/device-management.tsx
import { Text } from '@/components/AppText';
import { AntDesign, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
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
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null); // Lưu ID thiết bị đang bị xóa

  // --- 1. LẤY DANH SÁCH THIẾT BỊ TỪ BACKEND ---
  const fetchDevices = async () => {
    try {
      setIsLoading(true);
      const response = await axiosClient.get('/auth/devices');
      // Giả sử API trả về mảng trực tiếp, hoặc nằm trong response.data
      const data = response.data?.data || response.data || [];
      setDevices(data);
    } catch (error) {
      console.error("Lỗi lấy danh sách thiết bị:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách thiết bị lúc này. Vui lòng thử lại sau.");
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
      "Đăng xuất thiết bị",
      `Bạn có chắc chắn muốn đăng xuất tài khoản khỏi ${deviceName}?`,
      [
        { text: "Hủy", style: "cancel" },
        { 
          text: "Đăng xuất", 
          style: "destructive",
          onPress: async () => {
            try {
              setIsProcessing(deviceId); // Hiển thị loading cho riêng nút này
              
              // Gọi API xóa Session
              await axiosClient.delete(`/auth/logout-device/${deviceId}`);
              
              // Cập nhật UI ngay lập tức bằng cách lọc thiết bị đã xóa ra khỏi mảng
              setDevices(prev => prev.filter(device => device.id !== deviceId));
              Alert.alert("Thành công", `Đã đăng xuất khỏi ${deviceName}`);
            } catch (error) {
              console.error("Lỗi đăng xuất thiết bị:", error);
              Alert.alert("Lỗi", "Không thể đăng xuất thiết bị lúc này. Vui lòng kiểm tra lại kết nối mạng.");
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

  // Hàm helper để format thời gian (Tùy chọn: có thể dùng thư viện date-fns để format đẹp hơn)
  const formatTime = (isoString: string) => {
    if (!isoString) return 'Không rõ thời gian';
    try {
        const date = new Date(isoString);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        
        return `${hours}:${minutes} • ${day}/${month}/${year}`;
    } catch {
        return 'Thời gian không hợp lệ';
    }
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
            <Text className="text-xl font-bold text-gray-900">Quản lý thiết bị</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, paddingTop: 16 }}>
          
          <View className="px-6 mb-6">
            <Text className="text-gray-500 text-sm leading-5">
              Đây là danh sách các thiết bị đã đăng nhập vào tài khoản. Đăng xuất khỏi bất kỳ thiết bị nào có dấu hiệu bất thường.
            </Text>
          </View>

          {/* --- KHU VỰC DANH SÁCH THIẾT BỊ --- */}
          <View className="bg-white border-y border-gray-100 min-h-[100px] justify-center">
            
            {/* TRẠNG THÁI LOADING */}
            {isLoading ? (
              <View className="py-8 items-center justify-center">
                <ActivityIndicator size="large" color="#10B981" />
                <Text className="text-gray-400 mt-4 text-sm">Đang tải danh sách thiết bị...</Text>
              </View>
            ) : devices.length === 0 ? (
              
              /* TRẠNG THÁI TRỐNG (Phòng hờ) */
              <View className="py-8 items-center justify-center">
                <Text className="text-gray-400 text-sm">Không tìm thấy dữ liệu thiết bị.</Text>
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
                      <Text className="text-base font-bold text-gray-900">{device.name}</Text>
                      {device.isCurrentDevice && (
                        <View className="bg-emerald-50 px-2 py-0.5 rounded ml-2 border border-emerald-100">
                          <Text className="text-emerald-600 text-[10px] font-bold uppercase">Thiết bị này</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-sm text-gray-500 mb-0.5">{device.os} • {device.location}</Text>
                    <Text className={`text-xs ${device.isCurrentDevice ? 'text-emerald-500 font-medium' : 'text-gray-400'}`}>
                      {device.isCurrentDevice ? 'Đang hoạt động' : formatTime(device.lastActive)}
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