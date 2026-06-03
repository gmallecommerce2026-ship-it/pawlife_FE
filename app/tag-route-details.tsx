import { Text } from '@/components/AppText';
import ReportUGCModal from '@/components/ReportUGCModal';
import { Feather, Ionicons } from '@expo/vector-icons';
import { TouchableWithoutFeedback } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  LayoutAnimation,
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  Share,
  StatusBar,
  TouchableOpacity,
  UIManager,
  View
} from 'react-native';
import MapView, { Circle, Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const decodeGooglePolyline = (t: string) => {
  let n = 0, r = 0, o = 0, l = 0, i = 0, a = [];
  while (n < t.length) {
    o = 0, i = 0;
    do { i |= (31 & t.charCodeAt(n) - 63) << o, o += 5, n++ } while (t.charCodeAt(n - 1) >= 95);
    r += 1 & i ? ~(i >> 1) : i >> 1, o = 0, i = 0;
    do { i |= (31 & t.charCodeAt(n) - 63) << o, o += 5, n++ } while (t.charCodeAt(n - 1) >= 95);
    l += 1 & i ? ~(i >> 1) : i >> 1;
    a.push({ latitude: r / 1e5, longitude: l / 1e5 });
  }
  return a;
};

const getShortAddress = (geoData: any) => {
  if (geoData?.status === 'OK' && geoData.results?.[0]) {
    const formatted = geoData.results[0].formatted_address;
    const parts = formatted.split(', ');
    return parts.slice(0, 2).join(', ');
  }
  return null;
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
  const shinePosition = useSharedValue(-0.5);

  const [isGpsReady, setIsGpsReady] = useState(false);
  const [isFetchingRoute, setIsFetchingRoute] = useState(true);
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number, longitude: number }[]>([]);
  const [currentLoc, setCurrentLoc] = useState({ lat: targetLat, lng: targetLng });
  const [realStats, setRealStats] = useState({ distance: '...', duration: 0 });
  const [addresses, setAddresses] = useState({ origin: 'Locating...', destination: 'Loading...' });
  const [isExpanded, setIsExpanded] = useState(true);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);

  const handleShareLocation = () => {
    setIsMenuVisible(false); 
    
    setTimeout(async () => {
      const mapUrl = `https://www.google.com/maps/search/?api=1&query=${targetLat},${targetLng}`;

      try {
        await Share.share({
          message: Platform.OS === 'android' 
            ? `Pet location scanned here:\n${mapUrl}` 
            : `Pet location scanned here:`,
          url: mapUrl,
          title: 'Pet Location' 
        }, {
          dialogTitle: 'Share Pet Location',
          subject: 'Pet Location'
        });
      } catch (error: any) {
        Alert.alert("Error", "Unable to share location.");
      }
    }, 300);
  };

  useEffect(() => {
    shinePosition.value = withRepeat(
      withSequence(
        withTiming(1.5, { duration: 1000, easing: Easing.linear }),
        withTiming(-0.5, { duration: 0 }),
        withDelay(5000, withTiming(-0.5, { duration: 0 }))
      ),
      -1,
      false
    );
  }, []);

  const shineStyle = useAnimatedStyle(() => {
    return {
      left: `${shinePosition.value * 100}%`,
    };
  });

  const innerShadowStyle = useAnimatedStyle(() => {
    return {
      height: withTiming(isExpanded ? SCREEN_HEIGHT * 1 : SCREEN_HEIGHT * 0.5),
    };
  });

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

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
            let location = await Location.getLastKnownPositionAsync();
            if (!location) {
              location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            }

            if (location) {
              curLat = location.coords.latitude;
              curLng = location.coords.longitude;
            }
          } catch (locationError) {
            console.warn("Error getting GPS:", locationError);
          }
        }

        if (!isMounted) return;

        setCurrentLoc({ lat: curLat, lng: curLng });
        setIsGpsReady(true);

        const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!GOOGLE_API_KEY) {
          console.warn("Missing EXPO_PUBLIC_GOOGLE_MAPS_API_KEY");
        }

        const dirUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${curLat},${curLng}&destination=${targetLat},${targetLng}&key=${GOOGLE_API_KEY}`;
        const geoUrl = (lat: number, lng: number) => `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=en&key=${GOOGLE_API_KEY}`; 

        const [dirRes, oriRes, destRes] = await Promise.all([
          fetch(dirUrl).catch(() => null),
          fetch(geoUrl(curLat, curLng)).catch(() => null),
          fetch(geoUrl(targetLat, targetLng)).catch(() => null)
        ]);

        if (isMounted) {
          const [dirData, oriData, destData] = await Promise.all([
            dirRes ? dirRes.json() : null,
            oriRes ? oriRes.json() : null,
            destRes ? destRes.json() : null
          ]);

          if (dirData?.status === 'OK' && dirData.routes?.[0]) {
            const route = dirData.routes[0];
            const leg = route.legs[0];

            try {
              const coords = decodeGooglePolyline(route.overview_polyline.points);
              setRouteCoordinates(coords);
            } catch (err) {
              console.error("Error decoding Polyline:", err);
            }

            setRealStats({
              distance: (leg.distance.value / 1000).toFixed(1),
              duration: Math.round(leg.duration.value / 60)
            });

            if (mapRef.current) {
              setTimeout(() => {
                mapRef.current?.fitToCoordinates(
                  [{ latitude: curLat, longitude: curLng }, { latitude: targetLat, longitude: targetLng }],
                  { edgePadding: { top: 150, right: 50, bottom: 450, left: 50 }, animated: true }
                );
              }, 500);
            }
          } else {
            console.warn("Google Directions API Error:", dirData?.status, dirData?.error_message);
          }

          setAddresses({
            origin: getShortAddress(oriData) || 'Your Location',
            destination: getShortAddress(destData) || 'Scanned Point'
          });

          setIsFetchingRoute(false);
        }

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
    } catch (e) { }

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
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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

              <View className="items-center">
                <Text className="text-[20px] font-semibold text-black tracking-tight">Scanned Tag</Text>
                <Text className="text-[12px] font-regular text-[#8E8E93] tracking-[0.06px] mt-0.5">
                  {timeAgo}
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
                <View className="overflow-hidden rounded-full w-[36px] h-[36px] items-center justify-center"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 28,
                    borderWidth: 1.5,
                    borderTopColor: 'white',
                    borderLeftColor: 'white',
                    borderBottomColor: 'transparent',
                    borderRightColor: 'transparent',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  }}>
                  <LinearGradient
                    colors={['rgba(221, 221, 221, 0.3)', 'rgba(247, 247, 247, 0.7)', '#FFFFFF']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    locations={[0, 0.3, 1]}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 9999 }}
                  />
                  <Feather name="more-horizontal" size={20} color="#111827" />
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

      {/* --- MAP TƯƠNG TÁC --- */}
      <View className="flex-1 bg-[#F3F4F6] relative">

        {isGpsReady && (
          <MapView
            ref={mapRef}
            style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
            provider={PROVIDER_GOOGLE}
            showsUserLocation={true}
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

            <Marker coordinate={{ latitude: targetLat, longitude: targetLng }} title="Scanned Point">
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
          <Image
            source={require('../assets/icon/safari.png')}
            style={{ width: 22, height: 22 }}
            resizeMode="cover"
          />
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
            <View className="w-[60px] h-[60px] rounded-full bg-blue-50 border border-gray-100 items-center justify-center">
              <Text className="text-[16px] font-bold text-blue-500">{scannerName.charAt(0).toUpperCase()}</Text>
            </View>
            <View className="ml-3.5 flex-1 justify-center">
              <View className="flex-row items-center mb-2">
                <Text className="text-[16px] font-medium text-[#1E1E1E] leading-[16px] ">{scannerName}</Text>
              </View>
              <Text className="text-[12px] text-[#8E8E93] tracking-[0.06px] leading-[13px]" numberOfLines={1}>
                "{scannerMessage}"
              </Text>
            </View>
            <TouchableOpacity onPress={toggleExpand} className="p-2">
              <Feather
                name={isExpanded ? "chevron-down" : "chevron-up"}
                size={22}
                color="#8E8E93"
              />
            </TouchableOpacity>
          </View>

          {isExpanded && (
            <View>
              <View className="h-[1px] bg-gray-100 w-full my-5" />
              <View className="mb-6">
                {/* --- HÀNG 1: Các tiêu đề nằm ngang nhau --- */}
                <View className="flex-row justify-between items-end mb-2">
                  <Text className="text-[12px] font-regular text-[#757575]">
                    Distance
                  </Text>

                  <Text className="text-[12px] font-regular text-[#757575] mr-7">
                    Travel time: <Text className="text-[14px] font-bold text-black">{realStats.duration} min</Text>
                  </Text>
                </View>

                {/* --- HÀNG 2: Các giá trị số nằm thẳng trên 1 dòng --- */}
                {/* items-end giúp đáy của dòng chữ 40px và đáy của các icon căn bằng nhau */}
                <View className="flex-row justify-between items-end">

                  {/* Số khoảng cách */}
                  <Text className="text-[40px] font-bold text-black leading-[40px]">
                    {realStats.distance} <Text className="text-[16px] font-medium text-black">km</Text>
                  </Text>

                  {/* Các icon và thời gian */}
                  <View className="flex-row items-center mr-7 pb-1">
                    {/* pb-1 (padding-bottom) giúp đẩy phần này lên 1 chút xíu để chân chữ vừa khít với chân của số 40px */}

                    <View className="flex-row items-center">
                      <Image
                        source={require('../assets/icon/drive-moto.png')}
                        style={{ width: 10, height: 16 }}
                        resizeMode="cover"
                      />
                      <Text className="text-[12px] font-regular ml-2 text-[#757575]">
                        {realStats.duration} min
                      </Text>
                    </View>

                    <View className="flex-row items-center ml-4">
                      <Image
                        source={require('../assets/icon/drive-car.png')}
                        style={{ width: 20, height: 16 }}
                        resizeMode="cover"
                      />
                      <Text className="text-[12px] font-regular ml-2 text-[#757575]">
                        {Math.max(1, Math.round(realStats.duration * 0.7))} min
                      </Text>
                    </View>

                  </View>

                </View>
              </View>

              <View className="pl-1">

                <View className="flex-row items-start mb-[20px]">
                  <View className="items-center w-4 mr-3.5 relative">
                    <View className="w-[18px] h-[18px] rounded-full border-[3px] border-[#D7E5FF] bg-[#3478F5] z-10 mt-1" />
                    <View className="w-[1.5px] h-[27px] bg-gray-200 absolute top-[20px] mt-1.5" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[14px] font-bold text-black">Your Location</Text>
                    <Text className="text-[12px] text-[#757575] font-regular mt-1" numberOfLines={1}>{addresses.origin}</Text>
                  </View>
                </View>

                <View className="flex-row items-start">
                  <View className="items-center w-4 mr-3.5 mt-2">
                    <View className="w-4 h-4 rounded-full bg-red-50 items-center justify-center z-10">
                      <View className="w-[18px] h-[18px] rounded-full border-[3px] border-[#FFECDB] bg-[#E89B5A]" />
                    </View>
                  </View>
                  <View className="flex-1">
                    <Text className="text-[14px] font-bold text-black">Scanned Point</Text>
                    <Text className="text-[12px] text-[#757575] font-regular mt-1">{addresses.destination}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          <View className="w-full mt-6">
            <View style={{
              shadowColor: '#B45C11',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 5,
              elevation: 5,
            }}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleContact}
                className="w-full h-[52px] rounded-[16px] flex-row overflow-hidden items-center justify-center mb-3"
              >
                <LinearGradient
                  colors={['#FFC593', '#E89B5A']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  locations={[0.3, 1]}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                />
                <Image source={require('../assets/icon/phone-white.png')} style={{ width: 16, height: 16 }} resizeMode="cover" />
                <Text className="text-[#ffffff] text-[16px] font-semibold ml-2.5 tracking-tight">Contact Now</Text>
                
                <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, width: 60, transform: [{ skewX: '-20deg' }], zIndex: 10 }, shineStyle]}>
                  <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.2)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
                </Animated.View>
              </TouchableOpacity>
            </View>

            <View style={{
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 5,
              elevation: 5,
            }}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleOpenMaps}
                className="w-full bg-white h-[52px] rounded-[16px] flex-row items-center justify-center border border-gray-200"
              >
                <Image source={require('../assets/icon/location-gray.png')} style={{ width: 12, height: 17 }} resizeMode="cover" />
                <Text className="text-[#8E8E93] text-[16px] font-medium ml-2.5 tracking-tight">Open in Maps</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <Animated.View
          style={[
            {
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              pointerEvents: 'none',
            },
            innerShadowStyle 
          ]}
        >
          <LinearGradient
            colors={['#FFFFFF', 'rgba(255,255,255,0)']}
            locations={[0, 0.9]}
            start={{ x: 0, y: 1 }}
            end={{ x: 0, y: 0 }}
            style={{ flex: 1, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}
          />
        </Animated.View>

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
                  className="flex-row items-center px-2 py-3.5 border-b border-gray-100"
                  onPress={handleShareLocation}
                >
                  <Text className="ml-3 text-[13px] font-medium text-[#1C1C1E]">Share Location</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-row items-center px-2 py-3.5"
                  onPress={() => {
                    setIsMenuVisible(false);
                    setTimeout(() => {
                      setIsReportModalVisible(true);
                    }, 200);
                  }}
                >
                  <Text className="ml-3 text-[13px] font-medium text-[#EF4444]">Report</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </TouchableOpacity>
        </Modal>
      </View>
      <ReportUGCModal 
          isVisible={isReportModalVisible} 
          onClose={() => setIsReportModalVisible(false)}
          reportTargetName={scannerName}
        />
    </View>
  );
}