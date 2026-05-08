import { Text } from '@/components/AppText';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Platform,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Circle, Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const decodeGooglePolyline = (t: string, e = 5) => {
    let n = 0, r = 0, o = 0, l = 0, i = 0, a = [];
    let c = Math.pow(10, e || 5);
    while (n < t.length) {
        o = 0, i = 0;
        do { i |= (31 & t.charCodeAt(n) - 63) << o, o += 5, n++ } while (t.charCodeAt(n - 1) >= 95);
        r += 1 & i ? ~(i >> 1) : i >> 1, o = 0, i = 0;
        do { i |= (31 & t.charCodeAt(n) - 63) << o, o += 5, n++ } while (t.charCodeAt(n - 1) >= 95);
        l += 1 & i ? ~(i >> 1) : i >> 1;
        a.push({ latitude: r / c, longitude: l / c });
    }
    return a;
};
export default function TagRouteDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const mapRef = useRef<MapView>(null);

  const targetLat = parseFloat(params.targetLat as string) || 10.772622;
  const targetLng = parseFloat(params.targetLng as string) || 106.670172;
  const scannerName = (params.scannerName as string) || 'Anonymous';
  const scannerMessage = (params.scannerMessage as string) || 'Scanned your pet tag';
  const scannerPhone = params.scannerPhone as string;
  const timeAgo = (params.timeAgo as string) || 'Recently';
  
  const rawRadius = params.radius;
  const radius = (rawRadius !== null && rawRadius !== undefined && !isNaN(parseFloat(rawRadius as string))) ? parseFloat(rawRadius as string) : 0;

  // CÁC TRẠNG THÁI KIỂM SOÁT TẢI DỮ LIỆU
  const [isGpsReady, setIsGpsReady] = useState(false);
  const [isFetchingRoute, setIsFetchingRoute] = useState(true);
  
  const [routeCoordinates, setRouteCoordinates] = useState<{latitude: number, longitude: number}[]>([]);
  const [currentLoc, setCurrentLoc] = useState({ lat: targetLat, lng: targetLng }); // Khởi tạo bằng target để tránh map nhảy xa
  const [realStats, setRealStats] = useState({ distance: '...', duration: 0 });
  const [addresses, setAddresses] = useState({ origin: 'Locating...', destination: 'Loading...' });

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;
    let isMounted = true;

    const initializeDataAndMap = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        let curLat = targetLat; 
        let curLng = targetLng;

        if (status === 'granted') {
          try {
            // 1. Lấy vị trí nhanh nhất có thể
            let location = await Location.getLastKnownPositionAsync();
            if (!location) {
              // Dùng Balanced thay vì High cho lần đầu để load map nhanh hơn (giảm nghẽn)
              location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            }

            if (location) {
              curLat = location.coords.latitude;
              curLng = location.coords.longitude;
            }
          } catch (locationError) {
            console.warn("Lỗi lấy GPS:", locationError);
          }
        }

        if (!isMounted) return;

        // 2. MỞ KHÓA UI NGAY LẬP TỨC: Cập nhật toạ độ và tắt màn hình chờ GPS
        setCurrentLoc({ lat: curLat, lng: curLng });
        setIsGpsReady(true); 

        // 3. Gọi các API của Mapbox SONG SONG (Không block MapView)
        const dirUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${curLng},${curLat};${targetLng},${targetLat}?geometries=geojson&access_token=${process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN}`;
        const geoUrl = (lng: number, lat: number) => `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN}`;

        const [dirRes, oriRes, destRes] = await Promise.all([
          fetch(dirUrl).catch(() => null),
          fetch(geoUrl(curLng, curLat)).catch(() => null),
          fetch(geoUrl(targetLng, targetLat)).catch(() => null)
        ]);

        if (isMounted) {
          const [dirData, oriData, destData] = await Promise.all([
            dirRes ? dirRes.json() : null,
            oriRes ? oriRes.json() : null,
            destRes ? destRes.json() : null
          ]);

          // Xử lý Route
          if (dirData?.routes?.[0]) {
            const route = dirData.routes[0];
            const coords = route.geometry.coordinates.map((coord: any[]) => ({
              latitude: parseFloat(coord[1]),
              longitude: parseFloat(coord[0])
            }));
            setRouteCoordinates(coords);
            setRealStats({
              distance: (route.distance / 1000).toFixed(1),
              duration: Math.round(route.duration / 60)
            });
            
            // Tự động zoom bản đồ để vừa cả vị trí user và điểm quét
            if (mapRef.current) {
                mapRef.current.fitToCoordinates(
                    [{ latitude: curLat, longitude: curLng }, { latitude: targetLat, longitude: targetLng }],
                    { edgePadding: { top: 150, right: 50, bottom: 450, left: 50 }, animated: true }
                );
            }
          }

          // Xử lý Addresses
          setAddresses({
            origin: oriData?.features?.[0]?.place_name?.split(',')[0] || 'Your Location',
            destination: destData?.features?.[0]?.place_name?.split(',')[0] || 'Scanned Target'
          });

          setIsFetchingRoute(false);
        }

        // 4. Bật the dõi vị trí ngầm với độ chính xác cao khi mọi thứ đã load xong
        if (status === 'granted') {
          locationSubscription = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 5 },
            (newLocation) => {
              if (isMounted) {
                setCurrentLoc({
                  lat: newLocation.coords.latitude,
                  lng: newLocation.coords.longitude,
                });
              }
            }
          );
        }

      } catch (error) {
        console.error('Data fetch failed:', error);
        if (isMounted) {
          setIsGpsReady(true);
          setIsFetchingRoute(false);
        }
      }
    };

    initializeDataAndMap();

    return () => {
      isMounted = false;
      if (locationSubscription) locationSubscription.remove();
    };
  }, [targetLat, targetLng]);

  const handleContact = () => {
    if (scannerPhone) {
      Linking.openURL(`tel:${scannerPhone}`);
    } else {
      Alert.alert("Notice", "No phone number available for this contact.");
    }
  };

  const handleOpenMaps = () => {
    const url = Platform.select({
      ios: `maps://app?saddr=${currentLoc.lat},${currentLoc.lng}&daddr=${targetLat},${targetLng}`,
      android: `google.navigation:q=${targetLat},${targetLng}`
    });
    Linking.openURL(url!);
  };

  const centerMapToUser = async () => {
    let heading = 0;
    try {
      const headingData = await Location.getHeadingAsync();
      heading = headingData.trueHeading || headingData.magHeading || 0;
    } catch (e) {}

    mapRef.current?.animateCamera({
      center: { latitude: currentLoc.lat, longitude: currentLoc.lng },
      pitch: 60,
      zoom: 18,
      heading: heading,
    }, { duration: 1000 });
  };

  return (
    <View className="flex-1 bg-black">
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      
      {/* --- HEADER --- */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50 }} pointerEvents="box-none">
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
                  {timeAgo}
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

      {/* --- MAP TƯƠNG TÁC --- */}
      <View className="flex-1 bg-[#F3F4F6] relative">
        
        {/* Render MapView nhanh nhất có thể */}
        {isGpsReady && (
          <MapView
            ref={mapRef}
            style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
            provider={PROVIDER_GOOGLE}
            showsUserLocation={true}
            showsUserHeading={true}
            showsMyLocationButton={false}
            showsCompass={false}
            showsBuildings={true}
            mapPadding={{ top: 120, right: 0, bottom: 420, left: 0 }}
            initialRegion={{
              latitude: currentLoc.lat,
              longitude: currentLoc.lng,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            {radius > 0 && (
              <Circle
                center={{ latitude: targetLat, longitude: targetLng }}
                radius={radius}
                fillColor="rgba(232, 155, 90, 0.25)"
                strokeColor="rgba(232, 155, 90, 0.6)"
                strokeWidth={1.5}
              />
            )}

            {routeCoordinates.length > 0 && (
              <>
                <Polyline coordinates={routeCoordinates} strokeColor="#1d4ed8" strokeWidth={8} lineCap="round" lineJoin="round" zIndex={10} />
                <Polyline coordinates={routeCoordinates} strokeColor="#3b82f6" strokeWidth={5} lineCap="round" lineJoin="round" zIndex={11} />
              </>
            )}

            <Marker coordinate={{ latitude: targetLat, longitude: targetLng }} title="Điểm quét">
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
        )}

        {/* Chỉ che màn hình trong 0.5 - 1s đầu tiên để lấy GPS */}
        {!isGpsReady && (
          <View className="absolute inset-0 justify-center items-center bg-[#F3F4F6] z-10 pb-[20%]">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="mt-4 text-[13px] text-gray-500 font-medium tracking-tight">Locating your device...</Text>
          </View>
        )}

        <TouchableOpacity
          activeOpacity={0.8}
          className="absolute right-4 top-[140px] w-[50px] h-[50px] bg-white rounded-full items-center justify-center shadow-lg elevation-5 z-40"
          onPress={centerMapToUser}
        >
          <MaterialCommunityIcons name="crosshairs-gps" size={24} color="#3B82F6" />
        </TouchableOpacity>

        {/* --- FLOATING CARD THÔNG TIN THẬT --- */}
        <View 
          style={{
            position: 'absolute', bottom: 24, left: 16, right: 16,  
            backgroundColor: 'white', borderRadius: 32, padding: 24,
            shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.1, shadowRadius: 24, elevation: 16, zIndex: 40,
          }}
        >
          <View className="flex-row items-center">
            <View className="w-11 h-11 rounded-full bg-blue-50 border border-gray-100 items-center justify-center">
              <Text className="text-[16px] font-bold text-blue-500">{scannerName.charAt(0).toUpperCase()}</Text>
            </View>
            <View className="ml-3.5 flex-1 justify-center">
              <View className="flex-row items-center">
                <Text className="text-[15px] font-bold text-[#111827] tracking-tight">{scannerName}</Text>
                <View className="w-2 h-2 rounded-full bg-green-500 ml-1.5 mt-0.5" />
              </View>
              <Text className="text-[13px] text-gray-500 mt-0.5" numberOfLines={1}>
                "{scannerMessage}"
              </Text>
            </View>
          </View>

          <View className="h-[1px] bg-gray-100 w-full my-5" />

          <View className="flex-row justify-between items-start mb-6">
            <View>
              <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                Distance
              </Text>
              <Text className="text-[34px] font-black text-[#111827] tracking-tighter leading-[38px]">
                {realStats.distance} <Text className="text-[16px] font-bold text-gray-400">km</Text>
              </Text>
            </View>

            <View className="items-end">
              <Text className="text-[13px] font-bold text-gray-500 mb-2">Travel time: <Text className="text-[16px] font-bold text-[#111827]">{realStats.duration} min</Text></Text>
              <View className="flex-row">
                <View className="flex-row items-center px-2 py-1.5 bg-gray-50 rounded-lg">
                  <Ionicons name="car" size={14} color="#111827" />
                  <Text className="text-[11px] font-bold ml-1.5 text-[#111827]">{realStats.duration} min</Text>
                </View>
                <View className="flex-row items-center px-2 py-1.5 bg-amber-50 rounded-lg ml-2">
                  <MaterialCommunityIcons name="motorbike" size={14} color="#F59E0B" />
                  <Text className="text-[11px] font-bold ml-1.5 text-[#F59E0B]">{Math.max(1, Math.round(realStats.duration * 0.7))} min</Text>
                </View>
              </View>
            </View>
          </View>

          <View className="pl-1">
            <View className="flex-row items-start mb-[10px]">
              <View className="items-center w-4 mr-3.5 relative">
                <View className="w-3.5 h-3.5 rounded-full border-[3px] border-blue-100 bg-blue-500 z-10 mt-1" />
                <View className="w-[1.5px] h-[36px] bg-gray-200 absolute top-[14px]" />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-bold text-[#111827] tracking-tight leading-5">Your Location</Text>
                <Text className="text-[13px] text-gray-400 font-medium" numberOfLines={1}>{addresses.origin}</Text>
              </View>
            </View>

            <View className="flex-row items-start">
              <View className="items-center w-4 mr-3.5 mt-1">
                <View className="w-4 h-4 rounded-full bg-red-50 items-center justify-center z-10">
                  <View className="w-[8px] h-[8px] rounded-full bg-red-500" />
                </View>
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-bold text-[#111827] tracking-tight leading-5">Scanned Point</Text>
                <Text className="text-[13px] text-gray-400 font-medium" numberOfLines={1}>{addresses.destination}</Text>
              </View>
            </View>
          </View>

          <View className="w-full mt-6">
            <TouchableOpacity activeOpacity={0.7} onPress={handleContact} className="w-full bg-[#E89B5A] h-[52px] rounded-[16px] flex-row items-center justify-center mb-3 shadow-sm shadow-[#E89B5A]/30">
              <Feather name="phone-call" size={16} color="#ffffff" />
              <Text className="text-[#ffffff] text-[15px] font-bold ml-2.5 tracking-tight">Contact Now</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.85} onPress={handleOpenMaps} className="w-full bg-white h-[52px] rounded-[16px] flex-row items-center justify-center border border-gray-200">
              <Feather name="map" size={16} color="#9CA3AF" />
              <Text className="text-gray-500 text-[15px] font-bold ml-2.5 tracking-tight">Open in Maps</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </View>
  );
}