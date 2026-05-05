import { Feather, Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import axiosClient from '../api/axiosClient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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

interface ActivityProp {
  id: string;
  type: 'SCAN' | 'LOCATION' | 'REPORT';
  title: string;
  time: string;
  location?: string;
  note?: string;
  contactName?: string;
  contactPhone?: string;
}

const TimelineItem = ({ item, isLast }: { item: ActivityProp; isLast: boolean }) => {
  const handleCallPress = () => {
    if (!item.contactPhone) return;

    const phoneNumber = `tel:${item.contactPhone}`;
    
    // Kiểm tra và mở trình gọi điện
    Linking.canOpenURL(phoneNumber)
      .then((supported) => {
        if (supported) {
          Linking.openURL(phoneNumber);
        } else {
          Alert.alert("Lỗi", "Thiết bị của bạn không hỗ trợ chức năng gọi điện.");
        }
      })
      .catch((err) => console.error("Lỗi khi mở Linking:", err));
  };
  // Render Icon dựa trên type
  const renderIcon = () => {
    switch (item.type) {
      case 'SCAN':
        return <Image
          source={require('../assets/icon/scan-gray.png')}
          style={{ width: 13, height: 13 }}
          resizeMode="cover"
        />;
      case 'LOCATION':
        return <Image
          source={require('../assets/icon/location-gray-icon.png')}
          style={{ width: 13, height: 16 }}
          resizeMode="cover"
        />;
      case 'REPORT':
        return <Image
          source={require('../assets/icon/noti-gray.png')}
          style={{ width: 13, height: 13 }}
          resizeMode="cover"
        />;
      default:
        return <View className="w-2 h-2 bg-gray-400 rounded-full" />;
    }
  };

  return (
    <View className="flex-row">
      {/* Cột trái: Icon & Đường kẻ dọc */}
      <View className="items-center mr-4 relative w-8">
        {/* Icon Container */}
        <View className="w-13 h-13 rounded-full bg-white items-center justify-center z-10 pt-1">
          {renderIcon()}
        </View>

        {/* Đường kẻ dọc nối các item (ẩn đi nếu là item cuối cùng) */}
        {!isLast && (
          <View className="absolute top-8 bottom-[-16px] w-[1px] bg-gray-300 z-0" />
        )}
      </View>

      {/* Cột phải: Nội dung */}
      <View className="flex-1 pb-6">
        {/* Title & Time */}
        <View className="flex-row justify-between items-start mb-1">
          <Text className="text-black text-[14px] font-medium flex-1 pr-2 leading-5">
            {item.title}
          </Text>
          <Text className="text-[#8E8E93] font-regular text-[10px] mt-0.5">
            {item.time}
          </Text>
        </View>

        {/* Location */}
        {item.location && (
          <View className="flex-row items-start mt-1">
            <Image
              source={require('../assets/icon/location-gray-icon.png')}
              style={{ width: 8, height: 10 }}
              resizeMode="cover"
            />
            <Text className="text-[#8E8E93] text-[12px] ml-1 font-regular leading-5">
              {item.location}
            </Text>
          </View>
        )}

        {/* Note */}
        {item.note && (
          <View className="flex-row items-start mt-1">
            <Image
              source={require('../assets/icon/note-gray.png')}
              style={{ width: 9, height: 9 }}
              resizeMode="cover"
            />
            <Text className="text-[#8E8E93] text-[12px] ml-1 font-regular italic leading-5">
              {item.note}
            </Text>
          </View>
        )}

        {/* Contact Action */}
        {item.contactName && (
          <TouchableOpacity className="flex-row items-center mt-2" onPress={handleCallPress}>
            <Ionicons name="call" size={10} color="#9CA3AF" className='mr-1' />
            <Image
              source={require('../assets/icon/message-gray.png')}
              style={{ width: 9, height: 9 }}
              resizeMode="cover"
            />
            <Text className="text-[#8E8E93] text-[12px] ml-1 font-regular underline decoration-[#8E8E93]">
              Contact {item.contactName}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
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
            <Image source={{ uri: petImage }} className="rounded-full mr-4" style={{ width: 60, height: 60 }} />
            <View>
              <View className="flex-row items-center mb-2">
                <Text className="text-xl font-bold text-black mr-2">{pet.name || 'Thú cưng'}</Text>
                <View className="bg-[#FFE8E8] border border-[#DA5A5A]/25 px-2 py-0.5 rounded-full">
                  <Text className="text-[#DA5A5A] text-[10px] font-regular">
                    {reportData.tag?.status === 'LOST' ? 'Missing' : 'Scanned'}
                  </Text>
                </View>
              </View>
              <Text className="text-[10px] text-[#757575] mb-2"> {pet?.age || 'Unknown'} years old • {pet.breed || 'Chưa rõ giống'}</Text>

              <View className='flex-row'>
                <Image
                  source={require('../assets/images/pen.png')}
                  style={{ width: 8, height: 8 }}
                  resizeMode="cover"
                />
                <TouchableOpacity>
                  <Text className="text-[10px] text-[#8E8E93] font-regular underline"> Edit pet information</Text>
                </TouchableOpacity>
              </View>

            </View>
          </View>
        </View>

        {/* Owner / Contact Information */}

        <View className="bg-white">
          <Text className="text-[16px] font-semibold text-black leading-[16px] mb-[10px]">Owner Information</Text>
          <View className="flex justify-center items-center mb-4">
            <View className='bg-white border w-full border-[#E5E5E5] rounded-[16px] px-4 pt-[21px] pb-[23.15px]'>
              <View className="mx-[15px]">
                <View className="flex-row items-center pr-8 mb-6">
                  <Image className='mr-3 top-1' source={require('../assets/icon/person-gray.png')} style={{ width: 15, height: 15 }} resizeMode="cover" />
                  <View className='flex-row border-b border-[#E5E5E5] w-full pt-2 pb-1 justify-between'>
                    <Text className="text-black text-[14px] font-regular leading-[16px]">Owner Name</Text>
                    <Text className="text-[#8E8E93] text-[14px] font-regular leading-[16px]">{pet.owner.name}</Text>
                  </View>
                </View>

                <View className="flex-row items-center pr-8 mb-6">
                  <Image className='mr-3 top-1' source={require('../assets/icon/phone-gray.png')} style={{ width: 15, height: 15 }} resizeMode="cover" />
                  <View className='flex-row border-b border-[#E5E5E5] w-full pt-2 pb-1 justify-between'>
                    <Text className="text-black text-[14px] font-regular leading-[16px]">Phone Number</Text>
                    <Text className="text-[#8E8E93] text-[14px] font-regular leading-[16px]">{pet.owner.phone}</Text>
                  </View>
                </View>

                <View className="flex-row items-center pr-8 mb-4">
                  <Image className='mr-4 top-1' source={require('../assets/icon/location-gray.png')} style={{ width: 11, height: 15 }} resizeMode="cover" />
                  <View className='flex-row border-b border-[#E5E5E5] w-full pt-2 pb-1 justify-between'>
                    <Text className="text-black text-[14px] font-regular leading-[16px]">Address</Text>
                    <Text className="text-[#8E8E93] text-[14px] font-regular leading-[16px]">{pet.owner.address || 'Address not provided'}</Text>
                  </View>
                </View>

              </View>
            </View>
            <View className="flex items-center w-4/5 bg-[#FAFAFA] px-2.5 rounded-full border border-[#D9D9D9] bottom-5">
              <Text className="text-[#757575] text-[14px] font-regular leading-[20px] py-[6px]">
                "Please contact me ASAP"
              </Text>
            </View>
          </View>
        </View>

        {/* Scan Activities */}
        <Text className="text-[16px] font-semibold text-black mb-4">Scan Activity</Text>
        <View className="ml-1">
          {/* Mảng data giả lập theo design. Sau này bạn thay bằng res.data.activities */}
          {[
            {
              id: '1',
              type: 'SCAN',
              title: 'Tag Scanned by Janet Doe',
              time: '12:45 PM at 03/01/2026',
              location: 'Near Happy Land Park, District 7, HCM',
              contactName: 'Janet Doe',
              contactPhone: '0123456789',
            },
            {
              id: '2',
              type: 'LOCATION',
              title: 'Location Shared by Janet Doe',
              time: '12:45 PM at 03/01/2026',
              location: 'Happy Land Park, District 7, HCM',
              note: 'Luna is with me, safe and sound.',
              contactName: 'Janet Doe',
              contactPhone: '0123456789',
            },
            {
              id: '3',
              type: 'REPORT',
              title: `Luna reported as lost by ${pet.owner?.name || 'Sarah'}`,
              time: '12:45 PM at 03/01/2026',
              location: 'Happy Land Park, District 7, HCM',
            }
          ].map((activity, index, array) => (
            <TimelineItem
              key={activity.id}
              item={activity as ActivityProp}
              isLast={index === array.length - 1}
            />
          ))}
        </View>

        <TouchableOpacity className='items-center justify-center border border-[#E89B5A] bg-[#E89B5A] py-4 rounded-[16px]'>
          <Text className='font-semibold text-[16px] text-[#FFFF]'>Mark {pet.name} as Found</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}