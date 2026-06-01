import { Feather, Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  TouchableOpacity,
  View,
  ScrollView
} from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import axiosClient from '../api/axiosClient';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Text } from '@/components/AppText';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_WIDTH = Math.round(SCREEN_WIDTH);
const BACKGROUND_MAP_HEIGHT = SCREEN_HEIGHT;
const BOTTOM_BAR_HEIGHT = 100;

interface ActivityProp {
  id: string;
  type: 'SCAN' | 'LOCATION' | 'REPORT';
  title: string;
  time: string;
  location?: string;
  note?: string;
  contactName?: string;
  contactPhone?: string;
  images?: string[];
}

const MOCK_ACTIVITIES: ActivityProp[] = [
  {
    id: '2',
    type: 'SCAN',
    title: 'Pet Tag Scanned',
    time: 'Yesterday, 02:15 PM',
    location: 'Near Happy Land Park, District 7, HCM',
    contactName: 'Janet Doe',
    contactPhone: '0901234567',
    // SCAN không có ảnh
  },
  {
    id: '1',
    type: 'LOCATION',
    title: 'Location Updated',
    time: 'Today, 10:30 AM',
    location: 'Happy Land Park, District 7, HCM',
    note: '“Luna is with me, safe and sound.”',
    contactName: 'Janet Doe',
    contactPhone: '0901234567',
    // Trạng thái LOCATION có chứa 1 list ảnh
    images: [
      'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=500&q=80',
      'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=500&q=80',
      'https://images.unsplash.com/photo-1598133894008-61f7fdb8cc3a?w=500&q=80'
    ],
  },
  {
    id: '3',
    type: 'REPORT',
    title: 'Reported as Lost',
    time: 'Yesterday, 09:00 AM',
    location: 'Happy Land Park, District 7, HCM',
    // REPORT không có ảnh
  }
];

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
        return <Image source={require('../assets/icon/scan-orange.png')} style={{ width: 13, height: 13 }} resizeMode="cover" />;
      case 'LOCATION':
        return <Image source={require('../assets/icon/location-purple.png')} style={{ width: 16, height: 13 }} resizeMode="cover" />;
      case 'REPORT':
        return <Image source={require('../assets/icon/noti-red.png')} style={{ width: 13, height: 13 }} resizeMode="cover" />;
      default:
        return <View className="w-2 h-2 bg-gray-400 rounded-full" />;
    }
  };

  return (
    <View className="flex-row">
      <View className="items-center mr-4 relative">
        <View className="w-13 h-13 rounded-full bg-white items-center justify-center z-10 pt-1">
          {renderIcon()}
        </View>
        {!isLast && <View className="absolute top-8 bottom-[-16px] w-[1px] bg-gray-300 z-0" />}
      </View>

      <View className="flex-1 pb-6">
        <View className="flex-row justify-between items-start mb-1">
          <Text className="text-black text-[14px] font-medium flex-1 pr-2 leading-5">{item.title}</Text>
          <Text className="text-[#8E8E93] font-regular text-[12px] mt-0.5 tracking-[0.06px]">{item.time}</Text>
        </View>

        {item.location && (
          <View className="flex-row items-start mt-1">
            <Image className='top-[3px]' source={require('../assets/icon/location-gray-icon.png')} style={{ width: 8, height: 10 }} resizeMode="cover" />
            <Text className="text-[#8E8E93] text-[12px] ml-1 font-regular leading-5">{item.location}</Text>
          </View>
        )}

        {item.note && (
          <View className="flex-row items-start mt-1">
            <Image className='top-[3px]' source={require('../assets/icon/note-gray.png')} style={{ width: 9, height: 9 }} resizeMode="cover" />
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

        {item.type === 'LOCATION' && item.images && item.images.length > 0 && (
          <ScrollView
            horizontal={true} // Bật chế độ cuộn ngang
            showsHorizontalScrollIndicator={false} // Ẩn thanh cuộn ngang cho đẹp
            className="mt-3 flex-row"
          >
            {item.images.map((imgUrl, index) => (
              <Image
                key={`${item.id}-img-${index}`}
                source={{ uri: imgUrl }}
                className="w-[100px] h-[74px] rounded-[12px] bg-gray-100"
                style={{ marginRight: 8 }} // Khoảng cách giữa các ảnh
                resizeMode="cover"
              />
            ))}
          </ScrollView>
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
  const insets = useSafeAreaInsets();
  const [headerHeight, setHeaderHeight] = useState(120);

  const REQUIRED_TOP_INSET = insets.top + 44 + 21;
  const animatedPosition = useSharedValue(SCREEN_HEIGHT);

  const scrollY = useSharedValue(0);

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const isScrolled = scrollY.value > 10;
    return {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: withTiming(isScrolled ? 0.08 : 0, { duration: 200 }),
      shadowRadius: 6,
      elevation: withTiming(isScrolled ? 6 : 0, { duration: 200 }),

      backgroundColor: '#FFFFFF',

    };
  });

  const handleScroll = (event: any) => {
    scrollY.value = event.nativeEvent.contentOffset.y;
  };


  const snapPoints = useMemo(() => {
    const highestSnapPoint = SCREEN_HEIGHT - REQUIRED_TOP_INSET;

    const lowestSnapPoint = headerHeight;
    const middleSnapPoint = SCREEN_HEIGHT / 2;
    return [lowestSnapPoint, middleSnapPoint, highestSnapPoint];
  }, [headerHeight, SCREEN_HEIGHT, insets.top]);




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
        className="absolute top-12 left-5 z-50 w-10 h-10 rounded-full items-center justify-center shadow-sm"
        onPress={() => router.back()}
        activeOpacity={0.7}
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 5,
          elevation: 3,
        }}
      >
        <View className="overflow-hidden rounded-full w-[36px] h-[36px] items-center justify-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: 28,
            borderWidth: 0.5,
            borderTopColor: 'white',
            borderLeftColor: 'white',
            borderBottomColor: 'transparent',
            borderRightColor: 'transparent',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          }}>
          <LinearGradient
            colors={['rgba(221, 221, 221, 0.1)', 'rgba(247, 247, 247, 0.5)', '#FFFFFF']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            locations={[0, 0.3, 1]}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 9999 }}
          />
          <Feather name="chevron-left" size={20} color="#000000" />
        </View>
      </TouchableOpacity>

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

          <Marker coordinate={{ latitude: lat, longitude: lng }} onPress={handlePinPress} zIndex={50}>
            <View style={{ alignItems: 'center', width: 123 }}>
              <View className="bg-[#FFFFFF] px-3 py-1.5 rounded-lg shadow-md w-full">
                <Text className="text-black text-[14px] font-regular tracking-[0.06px]">Tag Scanned</Text>
                <Text className="text-[#8E8E93] text-[12px] font-regular tracking-[0.06px]">2 hours ago</Text>
              </View>
              <View style={{ width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 6, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#FFFFFF' }} />
              <View className="h-1.5" />
              <View style={{ borderColor: '#FFC28F', borderWidth: 2.5 }} className="w-11 h-11 bg-white rounded-full items-center justify-center shadow-sm">
                <Ionicons name="scan-outline" size={20} color="#FFC28F" />
              </View>
              <View style={{ width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 9, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#FFC28F' }} />
            </View>
          </Marker>
        </MapView>
      </View>

      <BottomSheet
        index={1}
        snapPoints={snapPoints}
        enableOverDrag={false}
        animatedPosition={animatedPosition}
        topInset={REQUIRED_TOP_INSET}
        backgroundStyle={{ backgroundColor: 'white', borderRadius: 26 }}
        handleIndicatorStyle={{ backgroundColor: '#E5E5EA', width: 48, height: 6 }}
      >
        <BottomSheetView className="pt-[12px] bg-white z-10 mb-2"
          onLayout={(event) => {
            const { height } = event.nativeEvent.layout;
            if (height > 0) {
              setHeaderHeight(height); // Cập nhật chiều cao thực tế vào state
            }
          }}
        >
          <Animated.View style={headerAnimatedStyle}>
            <View className="flex-row items-center justify-between flex-1 mx-[20px] pb-[24px]">
              <Image source={{ uri: petImage }} className="rounded-full mr-4" style={{ width: 60, height: 60 }} />
              <View className="flex-1">
                <View className="flex-row justify-between items-center">
                  <View className="flex-row items-center mb-2">
                    <Text className="text-[16px] font-bold text-black mr-2">{pet.name || 'Unknown Pet'}</Text>
                    <View className="bg-[#FFE8E8] border border-[#DA5A5A]/25 py-1 px-[10px] rounded-full">
                      <Text className="text-[#DA5A5A] text-[10px] font-regular">
                        {reportData.tag?.status === 'LOST' ? 'Lost' : 'Scanned'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => { }}>
                    <View className='flex-row items-center'>
                      <Image className='bottom-1 mr-1' source={require('../assets/icon/pen.png')} style={{ width: 7, height: 8 }} resizeMode="cover" />
                      <Text className="text-[10px] text-[#8E8E93] mb-2 underline tracking-[0.06px]">Edit pet information</Text>
                    </View>
                  </TouchableOpacity>
                </View>
                <Text className="text-[12px] text-[#757575] font-regular mb-2">{pet.age || 'Unknow'} years old • {pet.breed || 'Unknown breed'}</Text>
                <Text className="text-[12px] text-[#757575] font-regular mb-2">Describe: Brownish, very shy of strangers, will hide.</Text>
              </View>
            </View>
          </Animated.View>
        </BottomSheetView>
        <BottomSheetScrollView
          onScroll={handleScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom, paddingHorizontal: 24, paddingTop: 130 }} // Chừa chỗ cho Footer
        >
          <View className="bg-white">
            <Text className="text-[16px] font-semibold text-black leading-[16px] mb-[10px]">Owner Information</Text>
            <View className="flex justify-center items-center mb-4">
              <View className='bg-white border w-full border-[#E5E5E5] rounded-[16px] pt-[15px] pb-[21.15px]'>
                <View className="mx-[15px]">
                  <View className="flex-row items-center pr-8 mb-6">
                    <Image className='mr-3 top-1' source={require('../assets/icon/person-gray.png')} style={{ width: 15, height: 15 }} resizeMode="cover" />
                    <View className='flex-row border-b border-[#E5E5E5] w-full pt-2 pb-1 justify-between'>
                      <Text className="text-black text-[14px] font-medium leading-[16px]">Name</Text>
                      <Text className="text-[#8E8E93] text-[12px] font-regular leading-[16px]">{owner.name || 'N/A'}</Text>
                    </View>
                  </View>

                  <View className="flex-row items-center pr-8 mb-6">
                    <Image className='mr-3 top-1' source={require('../assets/icon/phone-gray.png')} style={{ width: 15, height: 15 }} resizeMode="cover" />
                    <View className='flex-row border-b border-[#E5E5E5] w-full pt-2 pb-1 justify-between'>
                      <Text className="text-black text-[14px] font-medium leading-[16px]">Phone</Text>
                      <Text className="text-[#8E8E93] text-[12px] font-regular leading-[16px]">{owner.phone || 'N/A'}</Text>
                    </View>
                  </View>

                  <View className="flex-row items-center pr-8 mb-4">
                    <Image className='mr-4 top-1' source={require('../assets/icon/location-gray.png')} style={{ width: 11, height: 15 }} resizeMode="cover" />
                    <View className='flex-row border-b border-[#E5E5E5] w-full pt-2 pb-1 justify-between'>
                      <Text className="text-black text-[14px] font-medium leading-[16px]">Address</Text>
                      <Text className="text-[#8E8E93] text-[12px] font-regular leading-[16px]">{owner.address || 'Address not provided'}</Text>
                    </View>
                  </View>
                </View>
              </View>
              <View className="flex items-center w-4/5 bg-[#FAFAFA] px-2.5 rounded-full border border-[#D9D9D9] bottom-5">
                <Text className="text-[#757575] text-[12px] font-regular leading-[20px] py-[6px]">
                  "Please contact me ASAP"
                </Text>
              </View>
            </View>
          </View>

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