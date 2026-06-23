import { Text } from '@/components/AppText';
import { useLanguage } from '@/contexts/LanguageContext';
import { Feather } from '@expo/vector-icons';
import { Slider } from '@miblanchard/react-native-slider';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  DeviceEventEmitter,
  Dimensions,
  Image,
  InteractionManager,
  Keyboard,
  Platform,
  TouchableOpacity,
  View
} from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import MapView, { Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Yêu cầu 1: Trên iOS, không ép Google Maps SDK (rất tốn RAM/OpenGL context).
// Để provider = undefined -> RN Maps tự dùng MKMapView (Apple Maps) native, nhẹ và ổn định hơn nhiều.
const MAP_PROVIDER = Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined;

export default function SelectLocationMapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const mapRef = useRef<MapView>(null);
  const [radius, setRadius] = useState(500);
  const { t, language } = useLanguage();
  const isVi = language === 'vi';
  const { petAvatar } = params;

  // Yêu cầu 3: chỉ mount MapView sau khi:
  // 1) Screen đã focus thật sự (useIsFocused)
  // 2) Animation chuyển trang của Expo Router/React Navigation đã chạy xong (InteractionManager)
  const isFocused = useIsFocused();
  const [isReadyToMount, setIsReadyToMount] = useState(false);

  useEffect(() => {
    let interactionHandle: { cancel: () => void } | null = null;

    if (isFocused) {
      interactionHandle = InteractionManager.runAfterInteractions(() => {
        setIsReadyToMount(true);
      });
    } else {
      // Khi screen mất focus (bị che hoặc back), unmount map ngay để giải phóng OpenGL context trên iOS.
      setIsReadyToMount(false);
    }

    return () => {
      interactionHandle?.cancel();
    };
  }, [isFocused]);

  // Đề phòng trường hợp dùng push/pop nhiều lần liên tiếp, reset khi unmount hẳn component.
  useFocusEffect(
    useCallback(() => {
      return () => {
        setIsReadyToMount(false);
      };
    }, [])
  );

  const [region, setRegion] = useState({
    latitude: 21.028511,
    longitude: 105.804817,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });

  const [selectedAddress, setSelectedAddress] = useState(isVi ? 'Đang định vị...' : 'Locating...');
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  // --- ANIMATION STATES ---
  const translateY = useRef(new Animated.Value(0)).current;
  const radiusScale = useRef(new Animated.Value(1)).current;
  const shadowScale = useRef(new Animated.Value(1)).current;
  const isDragging = useRef(false);

  const [displayRadius, setDisplayRadius] = useState(radius);

  useEffect(() => {
    const listenerId = radiusScale.addListener(({ value }) => {
      setDisplayRadius(radius * value);
    });
    return () => radiusScale.removeListener(listenerId);
  }, [radius]);

  useEffect(() => {
    radiusScale.setValue(1);
    setDisplayRadius(radius);
  }, [radius]);

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
        setSelectedAddress(isVi ? 'Chưa cấp quyền vị trí' : 'Location access denied');
      }
    })();
  }, []);

  const getAddressFromGoogleMapAPI = async (latitude: number, longitude: number) => {
    setIsLoadingAddress(true);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_API_KEY}&language=vi`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const fullAddress = data.results[0].formatted_address;
        const addressParts = fullAddress.split(', ');
        if (addressParts.length > 1) {
          addressParts.pop();
        }
        const cleanAddress = addressParts.join(', ');
        setSelectedAddress(cleanAddress);
      } else {
        setSelectedAddress(isVi ? 'Vị trí không xác định' : 'Unknown location');
      }
    } catch (error) {
      setSelectedAddress(isVi ? 'Không thể kết nối máy chủ' : 'Unable to connect to the server');
    } finally {
      setIsLoadingAddress(false);
    }
  };

  const [centerCoord, setCenterCoord] = useState({
    latitude: 21.028511,
    longitude: 105.804817,
  });
  const debounceRef: any = useRef<NodeJS.Timeout | null>(null);

  const onMapDragStart = () => {
    if (!isDragging.current) {
      isDragging.current = true;

      Animated.parallel([
        Animated.timing(translateY, { toValue: -35, duration: 200, useNativeDriver: true }),
        Animated.timing(shadowScale, { toValue: 0.3, duration: 200, useNativeDriver: true }),
        Animated.timing(radiusScale, { toValue: 0, duration: 200, useNativeDriver: false })
      ]).start();
    }
  };

  // 2. Thả Pin rơi nảy xuống khi kéo xong
  const onRegionChangeComplete = (newRegion: any, details: any) => {
    setRegion(newRegion);
    setCenterCoord({ latitude: newRegion.latitude, longitude: newRegion.longitude });

    if (isDragging.current) {
      isDragging.current = false;

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 4,   // Tăng nhẹ ma sát để nảy mềm mại hơn
          tension: 20,   // Giảm mạnh lực rơi (từ 80 xuống 20) để tạo cảm giác "lơ lửng" chậm rãi
          useNativeDriver: true
        }),
        Animated.spring(shadowScale, {
          toValue: 1,
          friction: 4,
          tension: 20,   // Bóng dưới đất cũng to ra chậm chậm khớp với nhịp rơi
          useNativeDriver: true
        }),
        Animated.spring(radiusScale, {
          toValue: 1,
          friction: 5,
          tension: 20,
          useNativeDriver: false
        })
      ]).start();

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        getAddressFromGoogleMapAPI(newRegion.latitude, newRegion.longitude);
      }, 500);
    }
  };

  const handleConfirm = () => {
    DeviceEventEmitter.emit('onLocationSelected', {
      address: selectedAddress,
      latitude: region.latitude,
      longitude: region.longitude,
      radius: radius
    });
    router.back();
  };

  return (
    <View className="flex-1 bg-white">
      {isReadyToMount ? (
        <MapView
          ref={mapRef}
          provider={MAP_PROVIDER}
          mapType="standard" 
          userInterfaceStyle="light"
          showsPointsOfInterest={false}
          style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
          showsMyLocationButton={false}
          showsCompass={false}
          showsBuildings={true}
          mapPadding={{ top: 120, right: 0, bottom: 350, left: 0 }}
          initialRegion={{
            latitude: centerCoord.latitude,
            longitude: centerCoord.longitude,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          }}

          onPanDrag={onMapDragStart} // <--- ĐỔI onRegionChange THÀNH onPanDrag
          onRegionChangeComplete={onRegionChangeComplete}

          showsUserLocation={true}
        >
          {displayRadius > 0 && (
            <Circle
              center={{ latitude: centerCoord.latitude, longitude: centerCoord.longitude }}
              radius={displayRadius}
              fillColor="rgba(232, 90, 90, 0.2)"   // Nền đỏ nhạt (Opacity 20%)
              strokeColor="rgba(232, 90, 90, 0.8)" // Viền đỏ đậm (Opacity 80%)
              strokeWidth={1}
            />
          )}
        </MapView>
      ) : (
        // Placeholder trong lúc chờ animation chuyển trang kết thúc, tránh 2 MapView cùng tồn tại lúc transition trên iOS.
        <View
          style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, backgroundColor: '#F3F4F6' }}
          className="items-center justify-center"
        >
          <ActivityIndicator size="large" color="#E89B5A" />
        </View>
      )}

      {/* --- PIN & SHADOW (OVERLAY CỐ ĐỊNH GIỮA MÀN HÌNH) --- */}
      {isReadyToMount && (
        <View
          style={{
            position: 'absolute',
            top: 120,
            bottom: 350,
            left: 0,
            right: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          pointerEvents="none"
        >
          {/* 1. Bóng đổ (Đã chuyển thành Animated.View) */}
          <Animated.View
            style={{
              position: 'absolute',
              width: 12, // Làm bóng dẹt và bè ra ngang một chút cho giống thật
              height: 4,
              marginTop: 10,
              borderRadius: 6,
              backgroundColor: 'rgba(0,0,0,0.4)',
              transform: [{ scale: shadowScale }] // Gắn hiệu ứng thu nhỏ bóng
            }}
          />

          {/* 2. Cục Pin màu đỏ (Giữ nguyên như lúc nãy bạn vừa sửa) */}
          <Animated.View
            style={{
              position: 'absolute',
              alignItems: 'center',
              bottom: '50%',
              transform: [{ translateY }]
            }}
          >
            <View
              className='rounded-full border-4'
              style={{
                width: 40, height: 40, overflow: 'hidden', zIndex: 10,
                backgroundColor: '#E85A5A', borderColor: '#E85A5A'
              }}
            >
              <Image
                source={petAvatar ? { uri: petAvatar as string } : require('../assets/icon/location-form.png')}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </View>
            <View
              className="w-[14px] h-[14px] rotate-45"
              style={{
                backgroundColor: '#E85A5A', marginTop: -10, zIndex: -1,
                shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2, shadowRadius: 2,
              }}
            />
          </Animated.View>
        </View>
      )}

      {/* --- FLOATING SEARCH BAR --- */}
      <View
        style={{
          position: 'absolute',
          top: insets.top + 10,
          left: 16,
          right: 16,
          zIndex: 999,
          elevation: 10,
        }}
      >
        <GooglePlacesAutocomplete
          placeholder={isVi ? "Tìm kiếm địa chỉ..." : "Search an address..."}
          fetchDetails={true}
          onPress={(data, details = null) => {
            if (details?.geometry?.location) {
              const newRegion = {
                latitude: details.geometry.location.lat,
                longitude: details.geometry.location.lng,
                latitudeDelta: 0.015,
                longitudeDelta: 0.015,
              };
              mapRef.current?.animateToRegion(newRegion, 1000);
              Keyboard.dismiss();
            }
          }}
          query={{
            key: GOOGLE_API_KEY,
            language: 'vi',
            components: 'country:vn',
          }}
          renderLeftButton={() => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ justifyContent: 'center', alignItems: 'center', paddingLeft: 12, paddingRight: 8 }}
            >
              <Feather name="chevron-left" size={24} color="#1F2937" />
            </TouchableOpacity>
          )}
          styles={{
            container: { flex: 0 },
            textInputContainer: {
              backgroundColor: '#FFFFFF', borderRadius: 30, flexDirection: 'row', alignItems: 'center',
              shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15,
              shadowRadius: 10, elevation: 5, height: 52,
            },
            textInput: {
              height: 52, borderRadius: 30, paddingHorizontal: 10, fontSize: 16, color: '#1F2937',
              backgroundColor: 'transparent', marginBottom: 0, marginTop: 0, fontFamily: "Urbanist"
            },
            listView: {
              backgroundColor: '#FFFFFF', borderRadius: 16, marginTop: 8, shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5, maxHeight: 250,
            },
            description: {
              fontFamily: "Urbanist",
              fontSize: 15,
              color: '#1F2937',
            },
            row: { padding: 14, minHeight: 48, flexDirection: 'row' },
            separator: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 14 },

          }}
          textInputProps={{ placeholderTextColor: '#9CA3AF', clearButtonMode: 'while-editing', fontFamily: "Urbanist" }}
          keyboardShouldPersistTaps="handled"
        />
      </View>

      {/* --- BOTTOM SHEET --- */}
      <View
        style={{ paddingBottom: insets.bottom }}
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[24px] p-6 shadow-2xl"
      >
        <Text className="text-black font-semibold text-[20px] tracking-[0.06px] mb-2">
          Select Location
        </Text>

        <Text className="text-[#8E8E93] font-regular text-[14px] tracking-[0.06px] mb-[30px]">
          Drag the screen to move pin or type in address.
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
                      width: 16, height: 16, backgroundColor: '#FFFFFF',
                      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.25, shadowRadius: 2, elevation: 4
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
            shadowColor: '#FF0000', shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.25, shadowRadius: 10, elevation: 5,
          }}
        >
          <Text className="text-white font-bold text-[16px]">Confirm Location</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}