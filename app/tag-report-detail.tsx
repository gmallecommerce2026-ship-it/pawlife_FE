// app/tag-report-detail.tsx
import dayjs from 'dayjs';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertCircle, CheckCircle, ChevronLeft, ChevronRight, MapPin, Phone } from 'lucide-react-native'; // <-- Thêm AlertCircle
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axiosClient from '../api/axiosClient';

import { Text } from '@/components/AppText';

export default function TagReportDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false); // <-- Thêm state

  useEffect(() => {
    if (id) {
      fetchDetail(id as string);
    } else {
      setIsNotFound(true);
      setLoading(false);
    }
  }, [id]);

  const fetchDetail = async (notificationId: string) => {
    try {
      const res = await axiosClient.get(`/notifications/${notificationId}/detail`);
      if (res.data && res.data.detail) {
          setData(res.data.detail);
      } else {
          setIsNotFound(true); // Trả về 200 nhưng rỗng
      }
    } catch (error: any) {
      console.error("Lỗi tải chi tiết:", error);
      setIsNotFound(true); // Lỗi 404 hoặc các lỗi từ Server
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMap = () => {
    if (data?.latitude && data?.longitude) {
      const url = `https://www.google.com/maps/search/?api=1&query=$${data.latitude},${data.longitude}`;
      Linking.openURL(url).catch(err => console.error("Không thể mở bản đồ", err));
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#ffa053" />
      </View>
    );
  }

  // 1. XỬ LÝ TRẠNG THÁI NOT FOUND (GRACEFUL DEGRADATION)
  if (isNotFound || !data) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        {/* Vẫn giữ Header để UX được đồng nhất và có chỗ bấm back rõ ràng */}
        <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <ChevronLeft size={28} color="#1F2937" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900 ml-2">Chi tiết quét thẻ</Text>
        </View>

        {/* Nội dung thông báo lỗi */}
        <View className="flex-1 justify-center items-center px-6 pb-20">
            <View className="w-24 h-24 bg-gray-50 rounded-full items-center justify-center mb-6 border border-gray-100">
                <AlertCircle size={48} color="#9CA3AF" />
            </View>
            <Text className="text-2xl font-bold text-gray-900 mb-3 text-center">
                Báo cáo không khả dụng
            </Text>
            <Text className="text-gray-500 text-center mb-8 px-4 leading-6">
                Thông tin quét thẻ này không còn tồn tại, đã bị xóa khỏi hệ thống hoặc đã được đánh dấu giải quyết.
            </Text>
            <TouchableOpacity 
                className="bg-gray-900 px-8 py-4 rounded-full flex-row items-center shadow-sm"
                onPress={() => router.back()}
                activeOpacity={0.8}
            >
                <ChevronLeft size={20} color="white" />
                <Text className="text-white font-bold text-base ml-2">Quay lại màn hình chính</Text>
            </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (data.status === 'RESOLVED') {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <ChevronLeft size={28} color="#1F2937" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900 ml-2">Chi tiết quét thẻ</Text>
        </View>

        <View className="flex-1 justify-center items-center px-6 pb-20">
            <View className="w-24 h-24 bg-green-50 rounded-full items-center justify-center mb-6 border border-green-100">
                <CheckCircle size={48} color="#10B981" />
            </View>
            <Text className="text-2xl font-bold text-gray-900 mb-3 text-center">
                Thú cưng đã an toàn!
            </Text>
            <Text className="text-gray-500 text-center mb-8 px-4 leading-6">
                Tuyệt vời! Báo cáo này đã được đóng vì thú cưng đã trở về nhà an toàn hoặc chủ nhân đã xác nhận tình trạng ổn định.
            </Text>
            <TouchableOpacity 
                className="bg-gray-900 px-8 py-4 rounded-full flex-row items-center shadow-sm"
                onPress={() => router.back()}
                activeOpacity={0.8}
            >
                <ChevronLeft size={20} color="white" />
                <Text className="text-white font-bold text-base ml-2">Quay lại thông báo</Text>
            </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 2. RENDER UI BÌNH THƯỜNG KHI CÓ DATA
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

        {/* --- NÚT XEM VỊ TRÍ GPS --- */}
        {data.latitude && data.longitude && (
          <TouchableOpacity 
            onPress={handleOpenMap}
            activeOpacity={0.7}
            className="flex-row items-center mb-5 bg-blue-50 p-4 rounded-[16px] border border-blue-100 shadow-sm shadow-blue-50"
          >
            <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
              <MapPin size={20} color="#3B82F6" />
            </View>
            <View className="flex-1">
              <Text className="text-blue-500 text-xs font-bold mb-0.5">VỊ TRÍ ĐÃ LƯU (GPS)</Text>
              <Text className="text-blue-900 font-medium text-sm">Nhấn để xem trên Bản đồ</Text>
            </View>
            <ChevronRight size={20} color="#3B82F6" />
          </TouchableOpacity>
        )}

        {data.phoneNumber && (
          <View className="flex-row items-center mb-5 ml-1">
            <View className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center mr-3 border border-gray-100">
              <Phone size={18} color="#4B5563" />
            </View>
            <View>
              <Text className="text-gray-400 text-xs font-bold mb-0.5 uppercase">Số điện thoại liên hệ</Text>
              <Text className="text-gray-900 font-bold text-base">{data.phoneNumber}</Text>
            </View>
          </View>
        )}

        {data.message && (
          <View className="bg-gray-50 p-4 rounded-2xl mt-2 border border-gray-100">
            <Text className="text-gray-400 text-xs font-bold mb-2 uppercase">Lời nhắn kèm theo</Text>
            <Text className="text-gray-800 text-base leading-6 italic">"{data.message}"</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}