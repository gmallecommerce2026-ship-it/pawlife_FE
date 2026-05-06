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
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import axiosClient from '../api/axiosClient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const MAP_HEIGHT = Math.round(SCREEN_HEIGHT * 0.4);
const MAP_WIDTH = Math.round(SCREEN_WIDTH);

const getMetersPerPixel = (latitude: number, zoom: number) => {
  return (156543.03392 * Math.cos((latitude * Math.PI) / 180)) / Math.pow(2, zoom);
};

const MOCK_MAP_PINS = [
  { id: '1', top: '20%', left: '25%', color: '#4ADE80' },
  { id: '2', top: '35%', left: '75%', color: '#FBBF24' },
  { id: '3', top: '70%', left: '20%', color: '#60A5FA' },
  { id: '4', top: '60%', left: '80%', color: '#A78BFA' } 
];

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
        else Alert.alert("Error", "Your device does not support calling features.");
      })
      .catch((err) => console.error("Error opening Linking:", err));
  };

  const renderIcon = () => {
    switch (item.type) {
      case 'SCAN':
        return <Image source={require('../assets/icon/scan-gray.png')} style={{ width: 13, height: 13 }} resizeMode="cover" />;
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

        {item.contactName && (
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
  
  const BACKGROUND_MAP_HEIGHT = SCREEN_HEIGHT * 0.65;
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        savedScale.value = scale.value;
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (scale.value > 1) {
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      }
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const mapGestures = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedMapStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value }
    ],
  }));

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

  const lat = parseFloat(reportData.latitude ?? reportData.lat ?? params.lat ?? '10.762622');
  const lng = parseFloat(reportData.longitude ?? reportData.lng ?? params.lng ?? '106.660172');
  const rawRadius = reportData.radius ?? params.radius;
  const radius = (rawRadius !== null && rawRadius !== undefined && !isNaN(parseFloat(rawRadius))) ? parseFloat(rawRadius) : 50;

  const pet = reportData.tag?.pet || {};
  const petImage = pet.images?.[0]?.url || 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=150&q=80';
  const zoomLevel = 14;
  const mapboxStaticUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${lng},${lat},${zoomLevel},0/${MAP_WIDTH}x${MAP_HEIGHT}@2x?access_token=${process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN}`;
  const metersPerPx = getMetersPerPixel(lat, zoomLevel);
  const exactCircleSize = (radius / metersPerPx) * 2;

  // XỬ LÝ CLICK VÀO PIN: Chuyển hướng sang màn hình tag-route-details
  const handlePinPress = () => {
    router.push({
      pathname: '/tag-route-details',
      params: {
        targetLat: lat.toString(),
        targetLng: lng.toString(),
        // Có thể truyền thêm street/city nếu API có trả về
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

      {/* --- LAYER 1: BACKGROUND BẢN ĐỒ TƯƠNG TÁC --- */}
      <View
        style={{ height: BACKGROUND_MAP_HEIGHT, width: MAP_WIDTH, position: 'absolute', top: 0, overflow: 'hidden' }}
        className="bg-[#E5E5EA]"
      >
        <GestureDetector gesture={mapGestures}>
          <Animated.View
            style={[
              animatedMapStyle,
              { flex: 1, justifyContent: 'center', alignItems: 'center' }
            ]}
          >
            <Image
              source={{ uri: mapboxStaticUrl }}
              style={{ width: MAP_WIDTH, height: BACKGROUND_MAP_HEIGHT, position: 'absolute' }}
              resizeMode="cover"
            />

            {/* --- CUSTOM MAP PINS --- */}
            {MOCK_MAP_PINS.map((pin) => (
              <View
                key={pin.id}
                style={{ 
                  position: 'absolute', top: pin.top as any, left: pin.left as any, 
                  zIndex: 20, alignItems: 'center', transform: [{ translateX: -19 }, { translateY: -46 }]
                }}
              >
                <View 
                  style={{ borderColor: pin.color, borderWidth: 2 }} 
                  className="w-[38px] h-[38px] bg-white rounded-full items-center justify-center shadow-sm"
                >
                  <Ionicons name="paw" size={20} color={pin.color} />
                </View>
                <View style={{ width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: pin.color }} />
              </View>
            ))}

            {radius > 0 && (
              <View
                pointerEvents="none"
                style={{
                  width: exactCircleSize, height: exactCircleSize, borderRadius: exactCircleSize / 2,
                  backgroundColor: 'rgba(232, 155, 90, 0.25)', borderColor: 'rgba(232, 155, 90, 0.6)', borderWidth: 1.5,
                  position: 'absolute', top: BACKGROUND_MAP_HEIGHT / 2, left: MAP_WIDTH / 2,
                  transform: [{ translateX: -exactCircleSize / 2 }, { translateY: -exactCircleSize / 2 }], zIndex: 10,
                }}
              />
            )}

            {/* --- CENTER MAIN PIN NÂNG CẤP TƯƠNG TÁC --- */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handlePinPress}
              style={{
                position: 'absolute', top: BACKGROUND_MAP_HEIGHT / 2, left: MAP_WIDTH / 2,
                alignItems: 'center', transform: [{ translateX: -40 }, { translateY: -90 }],
                zIndex: 50, width: 80
              }}
            >
              <View className="bg-[#DA5A5A] px-3 py-1.5 rounded-lg items-center shadow-md w-full">
                <Text className="text-white text-[10px] font-bold text-center">Tag Scanned</Text>
              </View>
              <View style={{ width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 6, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#DA5A5A' }} />
              <View className="h-1.5" />
              <View style={{ borderColor: '#DA5A5A', borderWidth: 2.5 }} className="w-11 h-11 bg-white rounded-full items-center justify-center shadow-sm">
                 <Ionicons name="scan-outline" size={20} color="#DA5A5A" />
              </View>
              <View style={{ width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 9, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#DA5A5A' }} />
            </TouchableOpacity>
          </Animated.View>
        </GestureDetector>
      </View>

      {/* --- LAYER 2: MAIN BOTTOM SHEET FOREGROUND --- */}
      <BottomSheet
        index={0}
        snapPoints={snapPoints}
        backgroundStyle={{ backgroundColor: 'white', borderRadius: 30 }}
        handleIndicatorStyle={{ backgroundColor: '#E5E5EA', width: 48, height: 6 }}
      >
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 24, paddingTop: 10 }}
        >
          {/* Thông tin bé pet */}
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
                <Text className="text-[10px] text-[#757575] mb-2"> {pet?.age || 'Unknown'} years old • {pet.breed || 'Unknown breed'}</Text>
                <View className='flex-row'>
                  <Image source={require('../assets/images/pen.png')} style={{ width: 8, height: 8 }} resizeMode="cover" />
                  <TouchableOpacity>
                    <Text className="text-[10px] text-[#8E8E93] font-regular underline"> Edit pet information</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
          
          {/* Thông tin Owner */}
          <View className="bg-white">
            <Text className="text-[16px] font-semibold text-black leading-[16px] mb-[10px]">Owner Information</Text>
            <View className="flex justify-center items-center mb-4">
              <View className='bg-white border w-full border-[#E5E5E5] rounded-[16px] px-4 pt-[21px] pb-[23.15px]'>
                <View className="mx-[15px]">
                  <View className="flex-row items-center pr-8 mb-6">
                    <Image className='mr-3 top-1' source={require('../assets/icon/person-gray.png')} style={{ width: 15, height: 15 }} resizeMode="cover" />
                    <View className='flex-row border-b border-[#E5E5E5] w-full pt-2 pb-1 justify-between'>
                      <Text className="text-black text-[14px] font-regular leading-[16px]">Owner Name</Text>
                      <Text className="text-[#8E8E93] text-[14px] font-regular leading-[16px]">{pet.owner?.name}</Text>
                    </View>
                  </View>

                  <View className="flex-row items-center pr-8 mb-6">
                    <Image className='mr-3 top-1' source={require('../assets/icon/phone-gray.png')} style={{ width: 15, height: 15 }} resizeMode="cover" />
                    <View className='flex-row border-b border-[#E5E5E5] w-full pt-2 pb-1 justify-between'>
                      <Text className="text-black text-[14px] font-regular leading-[16px]">Phone Number</Text>
                      <Text className="text-[#8E8E93] text-[14px] font-regular leading-[16px]">{pet.owner?.phone}</Text>
                    </View>
                  </View>

                  <View className="flex-row items-center pr-8 mb-4">
                    <Image className='mr-4 top-1' source={require('../assets/icon/location-gray.png')} style={{ width: 11, height: 15 }} resizeMode="cover" />
                    <View className='flex-row border-b border-[#E5E5E5] w-full pt-2 pb-1 justify-between'>
                      <Text className="text-black text-[14px] font-regular leading-[16px]">Address</Text>
                      <Text className="text-[#8E8E93] text-[14px] font-regular leading-[16px]">{pet.owner?.address || 'Address not provided'}</Text>
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

          <Text className="text-[16px] font-semibold text-black mb-4">Scan Activity</Text>
          <View className="ml-1 mb-6">
            {[
              { id: '1', type: 'SCAN', title: 'Tag Scanned by Janet Doe', time: '12:45 PM at 03/01/2026', location: 'Near Happy Land Park, District 7, HCM', contactName: 'Janet Doe', contactPhone: '0123456789' },
              { id: '2', type: 'LOCATION', title: 'Location Shared by Janet Doe', time: '12:45 PM at 03/01/2026', location: 'Happy Land Park, District 7, HCM', note: 'Luna is with me, safe and sound.', contactName: 'Janet Doe', contactPhone: '0123456789' },
              { id: '3', type: 'REPORT', title: `Luna reported as lost by ${pet.owner?.name || 'Sarah'}`, time: '12:45 PM at 03/01/2026', location: 'Happy Land Park, District 7, HCM' }
            ].map((activity, index, array) => (
              <TimelineItem key={activity.id} item={activity as ActivityProp} isLast={index === array.length - 1} />
            ))}
          </View>

          <TouchableOpacity className='items-center justify-center border border-[#E89B5A] bg-[#E89B5A] py-4 rounded-[16px] mb-4'>
            <Text className='font-semibold text-[16px] text-[#FFFF]'>Mark {pet.name} as Found</Text>
          </TouchableOpacity>
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}