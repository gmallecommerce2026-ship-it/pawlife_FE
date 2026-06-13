import { Text } from '@/components/AppText';
import { Feather } from '@expo/vector-icons';
import { Slider } from '@miblanchard/react-native-slider';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, DeviceEventEmitter, Dimensions, Image, Keyboard, TouchableOpacity, View } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
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

  const [region, setRegion] = useState({
    latitude: 21.028511,
    longitude: 105.804817,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });

  const [selectedAddress, setSelectedAddress] = useState('Đang định vị...');
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);


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
  const debounceRef: any = useRef<NodeJS.Timeout | null>(null);

  const onRegionChangeComplete = (newRegion: any) => {
    setRegion(newRegion);
    setCenterCoord({ latitude: newRegion.latitude, longitude: newRegion.longitude });
    
    // Debounce 500ms
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      getAddressFromGoogleMapAPI(newRegion.latitude, newRegion.longitude);
    }, 500);
  };

  const handleConfirm = () => {
    // Bắn dữ liệu về màn hình Form đang mở ở dưới nền
    DeviceEventEmitter.emit('onLocationSelected', {
      address: selectedAddress,
      latitude: region.latitude,
      longitude: region.longitude,
      radius: radius
    });
    
    // Gọi back() để đóng trang Map, hiện lại trang Form với nguyên vẹn dữ liệu
    router.back();
  };

  return (
    <View className="flex-1 bg-white">
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
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
        <Marker coordinate={{ latitude: centerCoord.latitude, longitude: centerCoord.longitude }}>
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

      {/* --- FLOATING SEARCH BAR (CHUẨN GOOGLE MAPS) --- */}
      <View
        style={{
          position: 'absolute',
          top: insets.top + 10,
          left: 16,
          right: 16,
          zIndex: 999, // iOS
          elevation: 10, // Android: Bắt buộc phải có để nổi lên trên MapView
        }}
      >
        <GooglePlacesAutocomplete
          placeholder="Tìm kiếm địa chỉ..."
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
          // Đẩy nút Back vào bên trong ô Search
          renderLeftButton={() => (
            <TouchableOpacity 
              onPress={() => router.back()} 
              style={{ justifyContent: 'center', alignItems: 'center', paddingLeft: 12, paddingRight: 8 }}
            >
              <Feather name="chevron-left" size={24} color="#1F2937" />
            </TouchableOpacity>
          )}
          styles={{
            container: {
              flex: 0, // Bắt buộc là 0 để không chiếm toàn màn hình khi absolute
            },
            textInputContainer: {
              backgroundColor: '#FFFFFF',
              borderRadius: 30,
              flexDirection: 'row',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 10,
              elevation: 5,
              height: 52, // Chiều cao cố định giống Google Maps
            },
            textInput: {
              height: 52,
              borderRadius: 30,
              paddingHorizontal: 10,
              fontSize: 16,
              color: '#1F2937',
              backgroundColor: 'transparent', // Để nền cho textInputContainer lo
              marginBottom: 0, // Ghi đè margin mặc định của thư viện
              marginTop: 0,
            },
            listView: {
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              marginTop: 8,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 5,
              maxHeight: 250, // Tránh list dài quá che mất nút confirm ở dưới
            },
            row: {
              padding: 14,
              minHeight: 48,
              flexDirection: 'row',
            },
            separator: {
              height: 1,
              backgroundColor: '#F3F4F6', // Tailwind gray-100
              marginHorizontal: 14,
            },
          }}
          textInputProps={{
            placeholderTextColor: '#9CA3AF', // Tailwind gray-400
            clearButtonMode: 'while-editing',
          }}
          keyboardShouldPersistTaps="handled"
        />
      </View>

      {/* --- BOTTOM SHEET TÙY CHỈNH LOCATION --- */}
      <View
        style={{ paddingBottom: insets.bottom }}
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[24px] p-6 shadow-2xl"
      >
        <Text className="text-black font-semibold text-[20px] tracking-[0.06px] mb-2">
          Select Location
        </Text>

        <Text className="text-[#8E8E93] font-regular text-[14px] tracking-[0.06px] mb-[30px]">
          Drag the screen or search to move pin
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