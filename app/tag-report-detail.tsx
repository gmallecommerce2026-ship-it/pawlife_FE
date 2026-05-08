import { Feather, Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import axiosClient from '../api/axiosClient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_WIDTH = Math.round(SCREEN_WIDTH);
const BACKGROUND_MAP_HEIGHT = SCREEN_HEIGHT * 0.65;

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
    Linking.canOpenURL(phoneNumber)
      .then((supported) => {
        if (supported) Linking.openURL(phoneNumber);
        else Alert.alert("Lỗi", "Thiết bị không hỗ trợ gọi điện.");
      })
      .catch((err) => console.error("Error opening Linking:", err));
  };

  const renderIcon = () => {
    switch (item.type) {
      case 'SCAN':
      case 'LOCATION':
        return <Image source={require('../assets/icon/location-gray-icon.png')} style={{ width: 13, height: 16 }} resizeMode="cover" />;
      case 'REPORT':
        return <Image source={require('../assets/icon/noti-gray.png')} style={{ width: 13, height: 13 }} resizeMode="cover" />;
      default:
        return <View className="w-2 h-2 bg-gray-400 rounded-full" />;
    }
  };

  return (
    <View className="flex-row">
      <View className="items-center mr-4 relative w-8">
        <View className="w-13 h-13 rounded-full bg-white items-center justify-center z-10 pt-1">
          {renderIcon()}
        </View>
        {!isLast && <View className="absolute top-8 bottom-[-16px] w-[1px] bg-gray-300 z-0" />}
      </View>

      <View className="flex-1 pb-6">
        <View className="flex-row justify-between items-start mb-1">
          <Text className="text-black text-[14px] font-medium flex-1 pr-2 leading-5">{item.title}</Text>
          <Text className="text-[#8E8E93] font-regular text-[10px] mt-0.5">{item.time}</Text>
        </View>

        {item.location && (
          <View className="flex-row items-start mt-1">
            <Image source={require('../assets/icon/location-gray-icon.png')} style={{ width: 8, height: 10 }} resizeMode="cover" />
            <Text className="text-[#8E8E93] text-[12px] ml-1 font-regular leading-5">{item.location}</Text>
          </View>
        )}

        {item.note && (
          <View className="flex-row items-start mt-1">
            <Image source={require('../assets/icon/note-gray.png')} style={{ width: 9, height: 9 }} resizeMode="cover" />
            <Text className="text-[#8E8E93] text-[12px] ml-1 font-regular italic leading-5">{item.note}</Text>
          </View>
        )}

        {item.contactName && item.contactPhone && (
          <TouchableOpacity className="flex-row items-center mt-2" onPress={handleCallPress}>
            <Ionicons name="call" size={10} color="#9CA3AF" className='mr-1' />
            <Image source={require('../assets/icon/message-gray.png')} style={{ width: 9, height: 9 }} resizeMode="cover" />
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

  const snapPoints = useMemo(() => ['50%', '85%'], []);

  useEffect(() => {
    const fetchReportDetail = async () => {
      try {
        if (!reportId) return;
        const res = await axiosClient.get(`/tags/reports/${reportId}`);
        setReportData(res.data);
      } catch (error) {
        console.error("Error loading report details:", error);
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
        <Text className="text-gray-500">Report information not found.</Text>
      </View>
    );
  }

  // 1. Ánh xạ dữ liệu Toạ độ (Từ Prisma Model TagReport)
  const lat = parseFloat(reportData.latitude || reportData.lat || '10.762622');
  const lng = parseFloat(reportData.longitude || reportData.lng || '106.660172');
  const rawRadius = reportData.radius;
  const radius = (rawRadius !== null && rawRadius !== undefined && !isNaN(parseFloat(rawRadius))) ? parseFloat(rawRadius) : 0;

  // 2. Ánh xạ Pet & Owner
  const pet = reportData.tag?.pet || {};
  const owner = pet.owner || {};
  const petImage = pet.images?.[0]?.url || 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=150&q=80';
  
  // 3. Lấy scanHistory nếu bạn đã update Backend như hướng dẫn ở trên
  const scanHistory = reportData.scanHistory || [];

  // 4. Tạo Activity Timeline động dựa trên dữ liệu thật của báo cáo hiện tại
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Vừa xong';
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }) + ' at ' + d.toLocaleDateString('en-GB');
  };

  const activities: ActivityProp[] = [
    {
      id: reportData.id,
      type: 'SCAN',
      title: reportData.scannedBy ? `Tag Scanned by ${reportData.scannedBy}` : 'Tag Scanned Anonymously',
      time: formatDate(reportData.createdAt),
      location: `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`, // Nếu BE có API Google Geocoding thì trả về string địa chỉ
      note: reportData.message || undefined,
      contactName: reportData.scannedBy || undefined,
      contactPhone: reportData.phoneNumber || undefined,
    }
  ];

  // Nếu pet bị thất lạc, thêm 1 activity thông báo mất
  if (reportData.tag?.status === 'LOST') {
    activities.push({
      id: 'report-lost-origin',
      type: 'REPORT',
      title: `${pet.name || 'Pet'} reported as lost by ${owner.name || 'Owner'}`,
      time: 'Previously',
      location: owner.address || 'Unknown address',
    });
  }

  const handlePinPress = () => {
    router.push({
      pathname: '/tag-route-details',
      params: { 
        targetLat: lat.toString(), 
        targetLng: lng.toString(),
        // Truyền thêm dữ liệu động để hiển thị ở Bottom Card
        scannerName: reportData.scannedBy || 'Người ẩn danh',
        scannerMessage: reportData.message || 'Đã tìm thấy thú cưng của bạn ở khu vực này!',
        scannerPhone: reportData.phoneNumber || '',
        timeAgo: formatDate(reportData.scannedAt)
      }
    });
  };

  return (
    <View className="flex-1 bg-white relative">
      <TouchableOpacity
        className="absolute top-12 left-5 z-50 w-10 h-10 bg-white/80 rounded-full items-center justify-center shadow-sm"
        onPress={() => router.back()}
      >
        <Feather name="chevron-left" size={24} color="black" />
      </TouchableOpacity>

      {/* --- LAYER 1: GOOGLE MAP NATIVE TƯƠNG TÁC --- */}
      <View style={{ height: BACKGROUND_MAP_HEIGHT, width: MAP_WIDTH, position: 'absolute', top: 0 }}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={{ flex: 1 }}
          initialRegion={{
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.008,
            longitudeDelta: 0.008,
          }}
        >
          {radius > 0 && (
            <Circle
              center={{ latitude: lat, longitude: lng }}
              radius={radius}
              fillColor="rgba(232, 155, 90, 0.25)"
              strokeColor="rgba(232, 155, 90, 0.6)"
              strokeWidth={1.5}
            />
          )}

          {/* DYNAMIC PINS TỪ LỊCH SỬ SCAN (scanHistory) */}
          {scanHistory.map((scan: any) => {
            if (!scan.latitude || !scan.longitude) return null;
            return (
              <Marker
                key={scan.id}
                coordinate={{ latitude: parseFloat(scan.latitude), longitude: parseFloat(scan.longitude) }}
              >
                <View style={{ alignItems: 'center' }}>
                  <View style={{ borderColor: '#60A5FA', borderWidth: 2 }} className="w-[38px] h-[38px] bg-white rounded-full items-center justify-center shadow-sm">
                    <Ionicons name="paw" size={20} color="#60A5FA" />
                  </View>
                  <View style={{ width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#60A5FA' }} />
                </View>
              </Marker>
            );
          })}

          {/* PIN CHÍNH CỦA REPORT HIỆN TẠI */}
          <Marker coordinate={{ latitude: lat, longitude: lng }} onPress={handlePinPress} zIndex={50}>
            <View style={{ alignItems: 'center', width: 80 }}>
              <View className="bg-[#DA5A5A] px-3 py-1.5 rounded-lg items-center shadow-md w-full">
                <Text className="text-white text-[10px] font-bold text-center">Tag Scanned</Text>
              </View>
              <View style={{ width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 6, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#DA5A5A' }} />
              <View className="h-1.5" />
              <View style={{ borderColor: '#DA5A5A', borderWidth: 2.5 }} className="w-11 h-11 bg-white rounded-full items-center justify-center shadow-sm">
                 <Ionicons name="scan-outline" size={20} color="#DA5A5A" />
              </View>
              <View style={{ width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 9, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#DA5A5A' }} />
            </View>
          </Marker>
        </MapView>
      </View>

      {/* --- LAYER 2: BOTTOM SHEET THÔNG TIN ĐỘNG --- */}
      <BottomSheet
        index={0}
        snapPoints={snapPoints}
        backgroundStyle={{ backgroundColor: 'white', borderRadius: 30 }}
        handleIndicatorStyle={{ backgroundColor: '#E5E5EA', width: 48, height: 6 }}
      >
        <BottomSheetScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 24, paddingTop: 10 }}>
          
          {/* Thông tin thú cưng */}
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center flex-1">
              <Image source={{ uri: petImage }} className="rounded-full mr-4" style={{ width: 60, height: 60 }} />
              <View>
                <View className="flex-row items-center mb-2">
                  <Text className="text-xl font-bold text-black mr-2">{pet.name || 'Unknown Pet'}</Text>
                  <View className="bg-[#FFE8E8] border border-[#DA5A5A]/25 px-2 py-0.5 rounded-full">
                    <Text className="text-[#DA5A5A] text-[10px] font-regular">
                      {reportData.tag?.status === 'LOST' ? 'Missing' : 'Scanned'}
                    </Text>
                  </View>
                </View>
                <Text className="text-[10px] text-[#757575] mb-2">{pet.age || '?'} years old • {pet.breed || 'Unknown breed'}</Text>
              </View>
            </View>
          </View>
          
          {/* Thông tin Chủ (Owner) */}
          <View className="bg-white">
            <Text className="text-[16px] font-semibold text-black leading-[16px] mb-[10px]">Owner Information</Text>
            <View className="flex justify-center items-center mb-4">
              <View className='bg-white border w-full border-[#E5E5E5] rounded-[16px] px-4 pt-[21px] pb-[23.15px]'>
                <View className="mx-[15px]">
                  <View className="flex-row items-center pr-8 mb-6">
                    <Image className='mr-3 top-1' source={require('../assets/icon/person-gray.png')} style={{ width: 15, height: 15 }} resizeMode="cover" />
                    <View className='flex-row border-b border-[#E5E5E5] w-full pt-2 pb-1 justify-between'>
                      <Text className="text-black text-[14px] font-regular leading-[16px]">Owner Name</Text>
                      <Text className="text-[#8E8E93] text-[14px] font-regular leading-[16px]">{owner.name || 'N/A'}</Text>
                    </View>
                  </View>

                  <View className="flex-row items-center pr-8 mb-6">
                    <Image className='mr-3 top-1' source={require('../assets/icon/phone-gray.png')} style={{ width: 15, height: 15 }} resizeMode="cover" />
                    <View className='flex-row border-b border-[#E5E5E5] w-full pt-2 pb-1 justify-between'>
                      <Text className="text-black text-[14px] font-regular leading-[16px]">Phone Number</Text>
                      <Text className="text-[#8E8E93] text-[14px] font-regular leading-[16px]">{owner.phone || 'N/A'}</Text>
                    </View>
                  </View>

                  <View className="flex-row items-center pr-8 mb-4">
                    <Image className='mr-4 top-1' source={require('../assets/icon/location-gray.png')} style={{ width: 11, height: 15 }} resizeMode="cover" />
                    <View className='flex-row border-b border-[#E5E5E5] w-full pt-2 pb-1 justify-between'>
                      <Text className="text-black text-[14px] font-regular leading-[16px]">Address</Text>
                      <Text className="text-[#8E8E93] text-[14px] font-regular leading-[16px]">{owner.address || 'Address not provided'}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Lịch sử hoạt động động (từ mảng activities tạo ở trên) */}
          <Text className="text-[16px] font-semibold text-black mb-4 mt-2">Scan Activity</Text>
          <View className="ml-1 mb-6">
            {activities.map((activity, index, array) => (
              <TimelineItem key={activity.id} item={activity} isLast={index === array.length - 1} />
            ))}
          </View>

          <TouchableOpacity className='items-center justify-center border border-[#E89B5A] bg-[#E89B5A] py-4 rounded-[16px] mb-4'>
            <Text className='font-semibold text-[16px] text-[#FFFF]'>Mark {pet.name || 'Pet'} as Found</Text>
          </TouchableOpacity>
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}