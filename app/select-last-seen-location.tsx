import { Text } from '@/components/AppText';
import { Feather } from '@expo/vector-icons';
import { Slider } from '@miblanchard/react-native-slider';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, MapPin } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, TouchableOpacity, View } from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';




const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
export default function SelectLocationMapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const mapRef = useRef<MapView>(null);
  const [radius, setRadius] = useState(500);

  const { petId, petName, petAvatar, petBreed, petAge, lostDateStr } = params;

  // Tọa độ mặc định (Sẽ được cập nhật ngay khi lấy được GPS)
  const [region, setRegion] = useState({
    latitude: 21.028511,
    longitude: 105.804817,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });

  const [selectedAddress, setSelectedAddress] = useState('Đang định vị...');
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  // 1. TỰ ĐỘNG LẤY GPS NGAY KHI VÀO MÀN HÌNH
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const newRegion = {
          ...region,
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };

        setRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 1000);
        getAddressFromGoogleMapAPI(loc.coords.latitude, loc.coords.longitude);
      } else {
        setSelectedAddress('Chưa cấp quyền vị trí');
      }
    })();
  }, []);



  // 2. Dịch tọa độ thành địa chỉ chữ bằng Google Geocoding API
  const getAddressFromGoogleMapAPI = async (latitude: number, longitude: number) => {
    setIsLoadingAddress(true);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_API_KEY}&language=vi`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const fullAddress = data.results[0].formatted_address;

        // --- XỬ LÝ LOẠI BỎ QUỐC GIA Ở ĐÂY ---
        const addressParts = fullAddress.split(', '); // Cắt chuỗi thành mảng dựa trên dấu phẩy
        if (addressParts.length > 1) {
          addressParts.pop(); // Xóa bỏ phần tử cuối cùng trong mảng (Quốc gia)
        }
        const cleanAddress = addressParts.join(', '); // Nối mảng lại thành chuỗi địa chỉ mới

        setSelectedAddress(cleanAddress);
      } else {
        setSelectedAddress('Vị trí không xác định');
      }
    } catch (error) {
      setSelectedAddress('Không thể kết nối máy chủ');
    } finally {
      setIsLoadingAddress(false);
    }
  };

  const [centerCoord, setCenterCoord] = useState({
    latitude: 21.028511,
    longitude: 105.804817,
  });

  // 3. Khi người dùng vuốt/kéo thả bản đồ xong thì lấy địa chỉ mới
  const onRegionChangeComplete = (newRegion: any) => {
    setRegion(newRegion);
    setCenterCoord({
      latitude: newRegion.latitude,
      longitude: newRegion.longitude,
    });
    getAddressFromGoogleMapAPI(newRegion.latitude, newRegion.longitude);
  };

  // 4. Bấm xác nhận và quay về form
  const handleConfirm = () => {
    router.replace({
      pathname: '/report-lost-pet',
      params: {
        petId, petName, petAvatar, petBreed, petAge, lostDateStr,
        selectedMapAddress: selectedAddress,
        selectedLatitude: region.latitude,
        selectedLongitude: region.longitude,
        selectedRadius: radius.toString()
      }
    });
  };
  const formatRadiusText = (val: number) => {
    if (val < 1000) return `${Math.round(val)} m`;
    return `${(val / 1000).toFixed(1)} km`;
  };

  return (
    <View className="flex-1 bg-white">
      {/* --- BẢN ĐỒ TOÀN MÀN HÌNH --- */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
        showsMyLocationButton={false}
        showsCompass={false}
        showsBuildings={true}
        mapPadding={{ top: 120, right: 0, bottom: 350, left: 0 }}
        // region={region}
        initialRegion={{
          latitude: centerCoord.latitude,
          longitude: centerCoord.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        }}
        onRegionChangeComplete={onRegionChangeComplete}
        showsUserLocation={true}
      >
        {radius > 0 && (
          <Circle
            center={{ latitude: centerCoord.latitude, longitude: centerCoord.longitude }}
            radius={radius}
            fillColor="rgba(232, 155, 90, 0.2)"
            strokeColor="rgba(232, 155, 90, 0.8)"
            strokeWidth={1}
          />
        )}
        <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }}>
          <View className="items-center justify-center">
            <View className='bg-[#E89B5A] rounded-full border-4 z-10 border-[#E89B5A] ' style={{ width: 40, height: 40, borderRadius: 20, overflow: 'hidden', backgroundColor: '#E89B5A' }}>
              <Image
                source={
                  petAvatar
                    ? { uri: petAvatar as string }
                    : require('../assets/icon/location-form.png')
                }
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </View>
            <View className="w-2 h-2 bg-[#E89B5A] rotate-45 -mt-1 shadow-sm" />
          </View>
        </Marker>
      </MapView>

      {/* --- NÚT BACK LƠ LỬNG Ở GÓC TRÁI (THAY CHO THANH SEARCH) --- */}
      <View
        style={{ paddingTop: insets.top + 10 }}
        className="absolute top-0 left-0 px-5 z-10"
      >
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
              backgroundColor: 'rgba(255, 255, 255, 0.2)', // Nền hơi mờ để bạn dễ nhìn thấy viền
            }}>
            <LinearGradient
              colors={['rgba(221, 221, 221, 0.3)', 'rgba(247, 247, 247, 0.7)', '#FFFFFF']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              locations={[0, 0.3, 1]}

              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 9999 }}
            />
            <Feather name="chevron-left" size={20} color="#1F2937" />
          </View>
        </TouchableOpacity>
      </View>

      <View
        style={{ paddingBottom: insets.bottom + 20 }}
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[24px] p-6 shadow-2xl"
      >
        <Text className="text-black font-semibold text-[20px] tracking-[0.06px] mb-2">
          Select Location
        </Text>

        <Text className="text-[#8E8E93] font-regular text-[14px] tracking-[0.06px] mb-[30px]">
          Drag the screen to move pin
        </Text>
        <Text className="text-[#8E8E93] font-medium text-[14px] tracking-[0.06px] mb-[12px]">
          Lost Location
        </Text>

        <View className="flex-row items-start mb-5">
          <View className="flex-1">
            {isLoadingAddress ? (
              <ActivityIndicator size="small" color="#E89B5A" className="self-start mt-1" />
            ) : (
              <View className='border-b border-[#E5E5E5]'>
                <Text className="text-[16px] font-semibold text-black leading-6 tracking-[0.06px] pb-2" numberOfLines={2}>
                  {selectedAddress}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View className="mb-6">
          <Text className="text-[14px] font-medium text-[#8E8E93] mb-1">Estimate Radius</Text>

          <View className="">
            {(() => {
              const percent = ((radius - 100) / 4900) * 100;
              return (
                <View style={{ height: 40, justifyContent: 'center', position: 'relative' }}>

                  <LinearGradient
                    colors={['#FFD8B2', '#FF9C56', '#D84315']}
                    start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
                    style={{ position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 2 }}
                  />

                  {/* Dải màu nền xám che lấp phần chưa chọn */}
                  <View
                    style={{
                      position: 'absolute',
                      right: 0,
                      width: `${100 - percent}%`,
                      height: 4,
                      backgroundColor: '#E5E7EB',
                      borderRadius: 2
                    }}
                  />

                  {/* Slider trong suốt đè lên trên để nhận sự kiện kéo/chạm */}
                  <Slider
                    value={radius}
                    minimumValue={100}
                    maximumValue={5000}
                    step={100}
                    onValueChange={(val) => setRadius(Array.isArray(val) ? val[0] : val)}
                    minimumTrackTintColor="transparent"
                    maximumTrackTintColor="transparent"
                    trackStyle={{ height: 4, backgroundColor: 'transparent' }}
                    thumbStyle={{
                      width: 16,
                      height: 16,
                      backgroundColor: '#FFFFFF',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.25,
                      shadowRadius: 2,
                      elevation: 4
                    }}
                  />
                </View>
              );
            })()}

            <Text className="text-[#8E8E93] font-medium text-[12px] text-center -mt-1">
              {radius < 1000 ? `${Math.round(radius)} m` : `${(radius / 1000).toFixed(1)} km`}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleConfirm}
          disabled={isLoadingAddress}
          activeOpacity={0.8}
          className={`w-full py-4 rounded-[16px] items-center justify-center ${isLoadingAddress ? 'bg-[#FFB4B4]' : 'bg-[#E85A5A]'}`}
          style={{
            shadowColor: '#FF0000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 5,
          }}
        >
          <Text className="text-white font-bold text-[16px]">Confirm Location</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}