import { Text } from '@/components/AppText';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  View
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function TagRouteDetailsScreen() {
  const router = useRouter();
  
  // States để lưu trữ dữ liệu bản đồ
  const [routePolyline, setRoutePolyline] = useState<string | null>(null);
  const [isFetchingRoute, setIsFetchingRoute] = useState(true);
  
  // States cho các thông tin động
  const [routeStats, setRouteStats] = useState({
    distance: 0, // km
    durationCar: 0, // phút
    durationMoto: 0, // phút
  });
  const [addresses, setAddresses] = useState({
    origin: 'Đang tải vị trí...',
    originSub: '',
    destination: 'Đang tải vị trí...',
    destinationSub: '',
  });

  // Giả lập nhận tọa độ từ màn hình trước (hoặc lấy từ thiết bị)
  const currentLat = 10.762622;
  const currentLng = 106.660172;
  const targetLat = 10.772622;
  const targetLng = 106.670172;

  useEffect(() => {
    const fetchMapData = async () => {
      try {
        const token = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
        if (!token) throw new Error("Thiếu Mapbox Token");

        // 1. LẤY TUYẾN ĐƯỜNG, KHOẢNG CÁCH VÀ THỜI GIAN (DIRECTIONS API)
        // Thêm `overview=simplified` để làm ngắn chuỗi polyline, giúp Static Map không bị lỗi URL quá dài
        const routeUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${currentLng},${currentLat};${targetLng},${targetLat}?geometries=polyline&overview=simplified&access_token=${token}`;
        
        const routeResponse = await fetch(routeUrl);
        const routeData = await routeResponse.json();

        if (routeData.routes?.[0]) {
          const route = routeData.routes[0];
          setRoutePolyline(route.geometry);
          
          const distanceKm = (route.distance / 1000).toFixed(1); // Chuyển meters -> km
          const durationMins = Math.round(route.duration / 60); // Chuyển seconds -> phút
          
          setRouteStats({
            distance: Number(distanceKm),
            durationCar: durationMins,
            // Giả lập xe máy ở VN thường đi nhanh hơn ô tô (hoặc bạn có thể gọi API cycling)
            durationMoto: Math.max(1, Math.round(durationMins * 0.8)), 
          });
        }

        // 2. LẤY TÊN ĐỊA CHỈ TỪ TỌA ĐỘ (REVERSE GEOCODING API)
        const fetchAddress = async (lng: number, lat: number) => {
          const geoUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?language=vi&access_token=${token}`;
          const res = await fetch(geoUrl);
          const data = await res.json();
          const placeName = data.features?.[0]?.place_name_vi || `${lat}, ${lng}`;
          
          // Cắt chuỗi để chia thành Tên chính và Phường/Quận
          const parts = placeName.split(', ');
          return {
            main: parts[0] || 'Vị trí',
            sub: parts.slice(1, 3).join(', ') || 'Không rõ khu vực'
          };
        };

        const [originAddr, destAddr] = await Promise.all([
          fetchAddress(currentLng, currentLat),
          fetchAddress(targetLng, targetLat)
        ]);

        setAddresses({
          origin: originAddr.main,
          originSub: originAddr.sub,
          destination: destAddr.main,
          destinationSub: destAddr.sub,
        });

      } catch (error) {
        console.error('Lỗi khi tải dữ liệu bản đồ:', error);
      } finally {
        setIsFetchingRoute(false);
      }
    };

    fetchMapData();
  }, [currentLat, currentLng, targetLat, targetLng]);

  // URL cho Static Map (Đã fix polyline)
  const pathParam = routePolyline ? `path-5+3B82F6-0.8(${encodeURIComponent(routePolyline)}),` : '';
  const mapboxStaticUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${pathParam}pin-s-a+3B82F6(${currentLng},${currentLat}),pin-s-b+EF4444(${targetLng},${targetLat})/auto/${SCREEN_WIDTH}x${SCREEN_HEIGHT}@2x?padding=120&access_token=${process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN}`;

  return (
    <View className="flex-1 bg-black">
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      
      {/* HEADER */}
      <View 
        style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50 }}
        pointerEvents="box-none"
      >
        <View className="bg-white">
          <SafeAreaView style={Platform.OS === 'android' ? { paddingTop: StatusBar.currentHeight || 16 } : {}}>
            <View className="flex-row items-center justify-between px-5 py-4">
              <TouchableOpacity
                activeOpacity={0.7}
                className="w-10 h-10 rounded-full items-center justify-center bg-white shadow-sm border border-gray-100"
                onPress={() => router.back()}
              >
                <Feather name="chevron-left" size={22} color="#111827" />
              </TouchableOpacity>

              <View className="items-center">
                <Text className="text-[16px] font-bold text-[#111827] tracking-tight">Scanned Tag</Text>
                <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-[1px] mt-0.5">
                  Mới đây
                </Text>
              </View>

              <TouchableOpacity 
                activeOpacity={0.7}
                className="w-10 h-10 rounded-full items-center justify-center bg-white shadow-sm border border-gray-100"
              >
                <Feather name="more-horizontal" size={20} color="#111827" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        <LinearGradient
          colors={['rgba(255,255,255,1)', 'rgba(255,255,255,0.8)', 'rgba(255,255,255,0.3)', 'rgba(255,255,255,0)']}
          locations={[0, 0.3, 0.7, 1]}
          style={{ height: 64, width: '100%' }}
          pointerEvents="none"
        />
      </View>

      {/* MAP FULL SCREEN */}
      <View className="flex-1 bg-[#F3F4F6] relative">
        {isFetchingRoute ? (
          <View className="flex-1 justify-center items-center pb-[20%]">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="mt-4 text-gray-500 font-medium">Đang tính toán tuyến đường...</Text>
          </View>
        ) : (
          <Image 
            source={{ uri: mapboxStaticUrl }} 
            className="w-full h-full" 
            resizeMode="cover" 
          />
        )}

        {/* FLOATING CARD */}
        <View 
          style={{
            position: 'absolute', bottom: 24, left: 16, right: 16,  
            backgroundColor: 'white', borderRadius: 32, padding: 24,
            shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.1, shadowRadius: 24, elevation: 16, zIndex: 40,
          }}
        >
          {/* Scanner Info */}
          <View className="flex-row items-center">
            <Image 
              source={{ uri: 'https://i.pravatar.cc/150?img=47' }}
              className="w-11 h-11 rounded-full bg-gray-100 border border-gray-100"
            />
            <View className="ml-3.5 flex-1 justify-center">
              <View className="flex-row items-center">
                <Text className="text-[15px] font-bold text-[#111827] tracking-tight">Người tìm thấy</Text>
                <View className="w-2 h-2 rounded-full bg-green-500 ml-1.5 mt-0.5" />
              </View>
              <Text className="text-[13px] text-gray-500 mt-0.5" numberOfLines={1}>
                "Tôi đã tìm thấy thú cưng của bạn!"
              </Text>
            </View>
          </View>

          <View className="h-[1px] bg-gray-100 w-full my-5" />

          {/* DỮ LIỆU ĐỘNG: Stats Row */}
          <View className="flex-row justify-between items-start mb-6">
            <View>
              <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                Khoảng cách
              </Text>
              <Text className="text-[34px] font-black text-[#111827] tracking-tighter leading-[38px]">
                {routeStats.distance} <Text className="text-[16px] font-bold text-gray-400">km</Text>
              </Text>
            </View>

            <View className="items-end">
              <Text className="text-[13px] font-bold text-gray-500 mb-2">Ước tính: <Text className="text-[16px] font-bold text-[#111827]">{routeStats.durationMoto} phút</Text></Text>
              <View className="flex-row">
                <View className="flex-row items-center px-2 py-1.5 bg-gray-50 rounded-lg">
                  <Ionicons name="car" size={14} color="#111827" />
                  <Text className="text-[11px] font-bold ml-1.5 text-[#111827]">{routeStats.durationCar}p</Text>
                </View>
                <View className="flex-row items-center px-2 py-1.5 bg-amber-50 rounded-lg ml-2">
                  <MaterialCommunityIcons name="motorbike" size={14} color="#F59E0B" />
                  <Text className="text-[11px] font-bold ml-1.5 text-[#F59E0B]">{routeStats.durationMoto}p</Text>
                </View>
              </View>
            </View>
          </View>

          {/* DỮ LIỆU ĐỘNG: Location Timeline */}
          <View className="pl-1">
            {/* Origin (Vị trí hiện tại) */}
            <View className="flex-row items-start mb-[10px]">
              <View className="items-center w-4 mr-3.5 relative">
                <View className="w-3.5 h-3.5 rounded-full border-[3px] border-blue-100 bg-blue-500 z-10 mt-1" />
                <View className="w-[1.5px] h-[36px] bg-gray-200 absolute top-[14px]" />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-bold text-[#111827] tracking-tight leading-5" numberOfLines={1}>
                  {addresses.origin}
                </Text>
                <Text className="text-[13px] text-gray-400 font-medium" numberOfLines={1}>
                  {addresses.originSub}
                </Text>
              </View>
            </View>

            {/* Destination (Vị trí quét) */}
            <View className="flex-row items-start">
              <View className="items-center w-4 mr-3.5 mt-1">
                <View className="w-4 h-4 rounded-full bg-red-50 items-center justify-center z-10">
                  <View className="w-[8px] h-[8px] rounded-full bg-red-500" />
                </View>
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-bold text-[#111827] tracking-tight leading-5" numberOfLines={1}>
                  {addresses.destination}
                </Text>
                <Text className="text-[13px] text-gray-400 font-medium" numberOfLines={1}>
                  {addresses.destinationSub}
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="w-full mt-6">
            <TouchableOpacity activeOpacity={0.7} className="w-full bg-[#E89B5A] h-[52px] rounded-[16px] flex-row items-center justify-center mb-3 shadow-sm shadow-[#E89B5A]/30">
              <Feather name="phone-call" size={16} color="#ffffff" />
              <Text className="text-[#ffffff] text-[15px] font-bold ml-2.5 tracking-tight">Gọi liên hệ ngay</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.85} className="w-full bg-white h-[52px] rounded-[16px] flex-row items-center justify-center border border-gray-200">
              <Feather name="map" size={16} color="#9CA3AF" />
              <Text className="text-gray-500 text-[15px] font-bold ml-2.5 tracking-tight">Mở trong Google Maps</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </View>
  );
}