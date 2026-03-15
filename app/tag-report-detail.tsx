import dayjs from 'dayjs';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Phone } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axiosClient from '../api/axiosClient';

import { Text } from '@/components/AppText';
export default function TagReportDetailScreen() {
  const router = useRouter();
  
  // 1. Lấy tham số 'id' (referenceId) được truyền từ màn hình Notification
  const { id } = useLocalSearchParams();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchDetail(id as string);
    }
  }, [id]);

  // 2. Gọi API để lấy data thật
  const fetchDetail = async (notificationId: string) => {
    try {
      const res = await axiosClient.get(`/notifications/${notificationId}/detail`);
      
      // Lúc này res.data sẽ chứa cả thông báo gốc VÀ dữ liệu TagReport bên trong trường "detail"
      // Ví dụ: set dữ liệu tag report vào state
      if (res.data && res.data.detail) {
          setData(res.data.detail);
      }
    } catch (error) {
      console.error("Lỗi tải chi tiết:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#ffa053" />
      </View>
    );
  }

  if (!data) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <Text className="text-gray-500">Không tìm thấy dữ liệu.</Text>
      </View>
    );
  }

  // 3. Render UI với dữ liệu động
  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ChevronLeft size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900 ml-2">Chi tiết quét thẻ</Text>
      </View>

      {/* Content */}
      <View className="p-6">
        <View className="bg-orange-50 rounded-2xl p-5 mb-6 border border-orange-100">
          <Text className="text-orange-800 font-bold text-lg mb-2">Thú cưng có thể đang đi lạc!</Text>
          <Text className="text-orange-700 leading-5">
            {data.scannedBy ? `${data.scannedBy} đã` : 'Ai đó đã'} quét vòng cổ vào lúc {dayjs(data.scannedAt).format('HH:mm - DD/MM/YYYY')}.
          </Text>
        </View>

        {data.phoneNumber && (
          <View className="flex-row items-center mb-4">
            <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3">
              <Phone size={20} color="#4B5563" />
            </View>
            <View>
              <Text className="text-gray-500 text-xs">Số điện thoại liên hệ</Text>
              <Text className="text-gray-900 font-medium text-base">{data.phoneNumber}</Text>
            </View>
          </View>
        )}

        {data.message && (
          <View className="bg-gray-50 p-4 rounded-xl mt-2 border border-gray-100">
            <Text className="text-gray-500 text-xs mb-1">Lời nhắn:</Text>
            <Text className="text-gray-800 italic">"{data.message}"</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}