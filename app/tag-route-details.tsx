import { Text } from '@/components/AppText';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { TouchableWithoutFeedback } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { BlurView } from 'expo-blur';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  View,
  LayoutAnimation,
  UIManager
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function TagRouteDetailsScreen() {
  const router = useRouter();

  // States để lưu trữ dữ liệu bản đồ
  const [routePolyline, setRoutePolyline] = useState<string | null>(null);
  const [isFetchingRoute, setIsFetchingRoute] = useState(true);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  const toggleExpand = () => {
    // Tạo hiệu ứng mượt mà khi thay đổi layout
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

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

  const PADDING_OFFSET = 100;
  const BOTTOM_CARD_PADDING = Math.round(SCREEN_HEIGHT * 0.5);
  const mapboxPadding = `${PADDING_OFFSET},${PADDING_OFFSET},${BOTTOM_CARD_PADDING},${PADDING_OFFSET}`;

  // URL cho Static Map (Đã fix polyline)
  const pathParam = routePolyline ? `path-5+3B82F6-0.8(${encodeURIComponent(routePolyline)}),` : '';
  const mapboxStaticUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${pathParam}pin-s-a+3B82F6(${currentLng},${currentLat}),pin-s-b+EF4444(${targetLng},${targetLat})/auto/${SCREEN_WIDTH}x${SCREEN_HEIGHT}@2x?padding=${mapboxPadding}&access_token=${process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN}`;

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
                <View className="overflow-hidden rounded-full">
                  <LinearGradient
                    colors={['rgba(221, 221, 221, 0.3)', 'rgba(247, 247, 247, 0.7)', '#FFFFFF']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    locations={[0, 0.5, 1]}

                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 9999 }}
                  />
                  <BlurView
                    intensity={30}
                    tint="light"
                    className="w-[36px] h-[36px] items-center justify-center bg-white/40 border border-white/60"
                  >
                    <Feather name="chevron-left" size={20} color="#1F2937" />
                  </BlurView>
                </View>
              </TouchableOpacity>

              <View className="items-center">
                <Text className="text-[16px] font-bold text-[#111827] tracking-tight">Scanned Tag</Text>
                <Text className="text-[12px] font-regular text-[#757575] tracking-[0.06px] mt-0.5 text-center">
                  25 minutes ago • Today
                </Text>
              </View>


              <TouchableOpacity
                onPress={() => setIsMenuVisible(true)}
                activeOpacity={0.7}
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 5,
                  elevation: 3,
                }}

              >
                <View className="overflow-hidden rounded-full">
                  <LinearGradient
                    colors={['rgba(221, 221, 221, 0.3)', 'rgba(247, 247, 247, 0.7)', '#FFFFFF']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    locations={[0, 0.5, 1]}

                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 9999 }}
                  />
                  <BlurView
                    intensity={30}
                    tint="light"
                    className="w-[36px] h-[36px] items-center justify-center bg-white/40 border border-white/60"
                  >
                    <Feather name="more-horizontal" size={20} color="#111827" />
                  </BlurView>
                </View>
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
          <View className='flex-row items-center justify-between'>
            <View className="flex-row items-center">
              <Image
                source={{ uri: 'https://i.pravatar.cc/150?img=47' }}
                className="w-[60px] h-[60px] rounded-full"
              />
              <View className="ml-3.5 flex-1 justify-center">
                <View className="flex-row items-center">
                  <Text className="text-[16px] font-medium text-[#1E1E1E] leading-[24px] mb-[3px]">Sarah Jenkins</Text>
                  <Image className='ml-2' source={require('../assets/icon/real-tick.png')} style={{ width: 12, height: 12 }} resizeMode="cover" />
                </View>
                <Text className="text-[12px] text-[#8E8E93]" numberOfLines={1}>
                  "Luna is with me, safe and sound."
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={toggleExpand} className="p-2 right-6">
              <Feather
                name={isExpanded ? "chevron-down" : "chevron-up"}
                size={20}
                color="#8E8E93"
              />
            </TouchableOpacity>
          </View>



          {isExpanded && (
            <View>
              <View className="h-[1px] bg-gray-100 w-full my-5" />
              <View className="flex-row justify-between items-start mb-[22px]">
                <View>
                  <Text className="text-[12px] font-regular text-[#757575] tracking-widest mb-1.5">
                    Distance
                  </Text>
                  <Text className="text-[40px] font-bold text-black mt-2">
                    {routeStats.distance} <Text className="text-[16px] font-medium text-black">km</Text>
                  </Text>
                </View>

                <View className="items-start right-[43px]">
                  <Text className="text-[12px] font-regular text-[#757575] mb-7">Travel time: <Text className="text-[14px] font-bold text-black">{routeStats.durationMoto} min</Text></Text>
                  <View className="flex-row">
                    <View className="flex-row items-center">
                      <Image className='' source={require('../assets/icon/drive-moto.png')} style={{ width: 10, height: 16 }} resizeMode="cover" />
                      <Text className="text-[12px] font-regular ml-2 text-[#757575]">{routeStats.durationCar}min</Text>
                    </View>
                    <View className="flex-row items-center ml-3">
                      <Image className='' source={require('../assets/icon/drive-car.png')} style={{ width: 20, height: 16 }} resizeMode="cover" />
                      <Text className="text-[12px] font-regular ml-2 text-[#757575]">{routeStats.durationMoto}min</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View className="pl-1">
                <View className="flex-row items-start mb-[24px]">
                  <View className="items-center w-4 mr-3.5 relative">
                    <View className="w-[18px] h-[18px] rounded-full border-[3px] border-[#D7E5FF] bg-[#3478F5] z-10 mt-1" />
                    <View className="w-[1.5px] h-[27px] bg-gray-200 absolute top-[20px] mt-1.5" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[14px] font-bold text-black" numberOfLines={1}>
                      {addresses.origin}
                    </Text>
                    <Text className="text-[12px] text-[#757575] font-regular mt-1" numberOfLines={1}>
                      {addresses.originSub}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-start">
                  <View className="items-center w-4 mr-3.5 mt-1">
                    <View className="w-4 h-4 rounded-full bg-red-50 items-center justify-center z-10">
                      <View className="w-[18px] h-[18px] rounded-full border-[3px] border-[#FFECDB] bg-[#E89B5A]" />
                    </View>
                  </View>
                  <View className="flex-1">
                    <Text className="text-[14px] font-bold text-black" numberOfLines={1}>
                      {addresses.destination}
                    </Text>
                    <Text className="text-[12px] text-[#757575] font-regular mt-1" numberOfLines={1}>
                      {addresses.destinationSub}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

          )}



          {/* Action Buttons */}
          <View className="w-full mt-6"
            pointerEvents="none">
            <TouchableOpacity
              activeOpacity={0.7}
              className="w-full \ h-[52px] rounded-[16px] flex-row items-center justify-center mb-3"
              style={{
                shadowColor: '#B45C11',
                shadowOffset: {
                  width: 0,
                  height: 2
                },
                shadowOpacity: 0.25,
                shadowRadius: 5,
                elevation: 5,
              }}
            >
              <LinearGradient
                colors={['#FFD4AF', 'transparent']}
                start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 16 }}
              />
              <LinearGradient
                colors={['#FFC593', '#E89B5A']}
                locations={[0.5, 1]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 16 }}
              />
              <Image className='' source={require('../assets/icon/phone-white.png')} style={{ width: 16, height: 16 }} resizeMode="cover" />
              <Text className="text-[#ffffff] text-[16px] font-bold ml-2.5 tracking-tight">Contact Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              className="w-full bg-white h-[52px] rounded-[16px] flex-row items-center justify-center border border-[#E5E5E5]"
              style={{
                shadowColor: '#000',
                shadowOffset: {
                  width: 0,
                  height: 2
                },
                shadowOpacity: 0.1,
                shadowRadius: 5,
                elevation: 5,
              }}
            >
              <Image className='' source={require('../assets/icon/location-gray.png')} style={{ width: 12, height: 17 }} resizeMode="cover" />
              <Text className="text-[#8E8E93] text-[16px] font-medium ml-2.5 tracking-tight">Open in Maps</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Modal
          visible={isMenuVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsMenuVisible(false)}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPressOut={() => setIsMenuVisible(false)}
          >
            <TouchableWithoutFeedback>
              <View
                className="absolute top-[95px] right-[20px] w-[180px] bg-white rounded-[12px] border border-[#E5E5E5] overflow-hidden"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 10,
                  elevation: 5,
                }}
              >
                <TouchableOpacity
                  className="flex-row items-center px-4 py-3.5 border-b border-gray-100"
                  onPress={() => {
                    setIsMenuVisible(false);
                    console.log("Xử lý Share Location...");
                  }}
                >
                  <Text className="ml-3 text-[12px] font-medium text-black">Share Location</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-row items-center px-4 py-3.5"
                  onPress={() => {
                    setIsMenuVisible(false);
                    console.log("Xử lý Report");
                  }}
                >
                  <Text className="ml-3 text-[12px] font-medium text-[#EF4444]">Report</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </TouchableOpacity>
        </Modal>
      </View>
    </View>
  );
}