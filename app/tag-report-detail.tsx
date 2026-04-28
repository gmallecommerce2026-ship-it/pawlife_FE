import { Feather, Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import axiosClient from '../api/axiosClient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Lấy chính xác kích thước Container chứa Map để không bị vỡ tỷ lệ
const MAP_HEIGHT = Math.round(SCREEN_HEIGHT * 0.4);
const MAP_WIDTH = Math.round(SCREEN_WIDTH);

/**
 * Hàm tính số mét / 1 pixel trên bản đồ (Hệ chiếu Web Mercator)
 * Cần thiết vì 1 pixel ở Việt Nam sẽ khác 1 pixel ở Châu Âu do độ võng trái đất.
 */
const getMetersPerPixel = (latitude: number, zoom: number) => {
  return (156543.03392 * Math.cos((latitude * Math.PI) / 180)) / Math.pow(2, zoom);
};
const getOptimalZoom = (radius: number, latitude: number, mapWidth: number) => {
  if (radius <= 5) return 15; // Nếu là điểm chính xác thì zoom gần (15)

  // Chúng ta muốn đường kính vòng tròn (radius * 2) hiển thị vừa vặn chiếm 70% width của map
  const targetDiameterPx = mapWidth * 0.7; 
  const targetMetersPerPx = (radius * 2) / targetDiameterPx;
  
  // Áp dụng phương trình ngược để tìm ra Zoom Level
  const zoom = Math.log2((156543.03392 * Math.cos((latitude * Math.PI) / 180)) / targetMetersPerPx);
  
  // Giới hạn zoom từ 10 (chế độ nhìn toàn thành phố) đến 16 (nhìn rõ từng đường hẻm)
  return Math.max(10, Math.min(16, zoom));
};
export default function TagReportDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { reportId } = params;

  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    const fetchReportDetail = async () => {
      try {
        if (!reportId) return;
        const res = await axiosClient.get(`/tags/reports/${reportId}`);
        
        // ---- ĐẶT LOG Ở ĐÂY ĐỂ DEBUG ----
        console.log("=== API REPORT DETAIL DATA ===");
        console.log("Report ID:", reportId);
        console.log("Raw API Response:", JSON.stringify(res.data, null, 2));
        console.log("Radius in DB:", res.data.radius);
        // --------------------------------
        
        setReportData(res.data);
      } catch (error) {
        console.error("Lỗi khi tải chi tiết report:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchReportDetail();
  }, [reportId]);

  if (loading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#E89B5A" />
      </View>
    );
  }

  if (!reportData) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <Text className="text-gray-500">Không tìm thấy thông tin báo cáo.</Text>
      </View>
    );
  }

  const reporterName = reportData.scannedBy || 'Người ẩn danh';
  const reporterPhone = reportData.phoneNumber || 'Không cung cấp';

  // Lấy dữ liệu tọa độ & bán kính
  const lat = parseFloat(reportData.latitude ?? reportData.lat ?? params.lat ?? '10.762622');
  const lng = parseFloat(reportData.longitude ?? reportData.lng ?? params.lng ?? '106.660172');
  
  // FIX LỖI DATA CŨ: Lấy raw data, nếu null/undefined thì gán tạm 50m để thấy được hình tròn test
  const rawRadius = reportData.radius ?? params.radius;
  const radius = (rawRadius !== null && rawRadius !== undefined && !isNaN(parseFloat(rawRadius))) 
    ? parseFloat(rawRadius) 
    : 50; 

  const pet = reportData.tag?.pet || {};
  const petImage = pet.images?.[0]?.url || 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=150&q=80';

  // 1. LÔGIC MAPBOX: Ẩn ghim đỏ nếu bán kính > 5 mét
  const showPin = radius <= 5;
  const markerOverlay = showPin ? `pin-s+ff0000(${lng},${lat})/` : '';
  const zoomLevel = 14;

  // FIX LỖI TỶ LỆ: Yêu cầu Mapbox trả về ảnh tĩnh CHÍNH XÁC bằng pixel của MAP_WIDTH x MAP_HEIGHT
  const mapboxStaticUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${markerOverlay}${lng},${lat},${zoomLevel},0/${MAP_WIDTH}x${MAP_HEIGHT}@2x?access_token=${process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN}`;

  // 2. TÍNH KÍCH THƯỚC VÒNG TRÒN CHUẨN XÁC VỀ MẶT TOÁN HỌC:
  const metersPerPx = getMetersPerPixel(lat, zoomLevel);
  const exactCircleSize = (radius / metersPerPx) * 2; // Đường kính tính bằng Pixel hiển thị

  return (
    <View className="flex-1 bg-white">
      {/* MAP SECTION */}
      <View style={{ height: MAP_HEIGHT, width: MAP_WIDTH }} className="relative justify-center items-center bg-gray-100 overflow-hidden">
        <TouchableOpacity 
          className="absolute top-12 left-5 z-20 w-10 h-10 bg-white/80 rounded-full items-center justify-center shadow-sm"
          onPress={() => router.back()}
        >
          <Feather name="chevron-left" size={24} color="black" />
        </TouchableOpacity>

        {/* resizeMode="cover" giờ đây sẽ hoạt động chuẩn tỷ lệ 1:1 vì ảnh Mapbox tải về đã bằng đúng Width x Height */}
        <Image
          source={{ uri: mapboxStaticUrl }}
          style={{ width: MAP_WIDTH, height: MAP_HEIGHT, position: 'absolute' }}
          resizeMode="cover"
        />

        {/* VẼ VÒNG TRÒN KHI KHÔNG HIỆN MARKER (Bán kính lớn hơn 5) */}
        {!showPin && radius > 0 && (
          <View
            pointerEvents="none"
            style={{
              width: exactCircleSize, 
              height: exactCircleSize, 
              borderRadius: exactCircleSize / 2,
              backgroundColor: 'rgba(244, 164, 96, 0.3)', 
              borderColor: 'rgba(244, 164, 96, 0.8)',
              borderWidth: 2, 
              position: 'absolute', 
              zIndex: 10,
            }}
          />
        )}
      </View>

      {/* BOTTOM SHEET INFO */}
      <ScrollView 
        className="flex-1 bg-white rounded-t-[30px] -mt-6 px-6 pt-5 z-20"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="w-12 h-1.5 bg-gray-300 rounded-full self-center mb-5" />

        {/* Pet Header */}
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-row items-center flex-1">
            <Image source={{ uri: petImage }} className="w-14 h-14 rounded-full mr-4" />
            <View>
              <View className="flex-row items-center mb-1">
                <Text className="text-xl font-bold text-black mr-2">{pet.name || 'Thú cưng'}</Text>
                <View className="bg-red-100 px-2 py-0.5 rounded-full">
                  <Text className="text-red-500 text-[10px] font-semibold">
                    {reportData.tag?.status === 'LOST' ? 'Missing' : 'Scanned'}
                  </Text>
                </View>
              </View>
              <Text className="text-gray-500 text-xs">{pet.breed || 'Chưa rõ giống'} - {pet.gender || 'unknown'}</Text>
            </View>
          </View>
        </View>

        {/* Owner / Contact Information */}
        <Text className="text-sm font-bold text-black mb-3">Thông tin liên hệ</Text>
        <View className="border border-gray-100 rounded-2xl p-4 mb-6 shadow-sm bg-white elevation-2">
          <View className="flex-row items-center justify-between border-b border-gray-100 pb-3 mb-3">
            <View className="flex-row items-center">
              <Ionicons name="person" size={16} color="#9CA3AF" />
              <Text className="text-black text-xs font-medium ml-3">Người chia sẻ vị trí</Text>
            </View>
            <Text className="text-gray-500 text-xs font-medium">{reporterName}</Text>
          </View>

          <View className="flex-row items-center justify-between border-b border-gray-100 pb-3 mb-3">
            <View className="flex-row items-center">
              <Ionicons name="call" size={16} color="#9CA3AF" />
              <Text className="text-black text-xs font-medium ml-3">Số điện thoại</Text>
            </View>
            <Text className="text-gray-500 text-xs font-medium">{reporterPhone}</Text>
          </View>

          {reportData.message ? (
            <View className="bg-gray-50 rounded-xl py-3 px-4 border border-gray-100 mt-2">
              <Text className="text-gray-500 text-xs text-center italic">"{reportData.message}"</Text>
            </View>
          ) : null}
        </View>

        {/* Scan Activities */}
        <Text className="text-sm font-bold text-black mb-4">Lịch sử hoạt động</Text>
        <View className="ml-2">
          <View className="flex-row">
            <View className="items-center mr-4 relative">
              <View className="w-7 h-7 rounded-full border border-gray-300 bg-white items-center justify-center z-10">
                <Ionicons name="location-outline" size={14} color="#6B7280" />
              </View>
            </View>
            <View className="flex-1 pb-6">
              <View className="flex-row justify-between items-center mb-1">
                <Text className="text-black text-xs font-bold">
                  Vị trí {showPin ? 'chính xác' : `ước tính (${radius}m)`}
                </Text>
                <Text className="text-gray-400 text-[10px]">
                  {dayjs(reportData.scannedAt).format('hh:mm A DD/MM/YYYY')}
                </Text>
              </View>
              <View className="flex-row items-center mt-1 pr-4">
                <Feather name="map-pin" size={10} color="#9CA3AF" />
                <Text className="text-gray-500 text-[10px] ml-1">Khu vực xung quanh: {lng}, {lat}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}