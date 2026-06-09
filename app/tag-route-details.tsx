import { Text } from '@/components/AppText';
import CompassWidget from '@/components/CompassWidget';
import ReportUGCModal from '@/components/ReportUGCModal';
import ShelterContactModal from '@/components/ShelterContactModal'; // 🌟 THÊM IMPORT NÀY
import { useLanguage } from '@/contexts/LanguageContext';
import { formatMinutes } from '@/utils/date.util';
import { Feather } from '@expo/vector-icons';
import { TouchableWithoutFeedback } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  View,
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
  const { language } = useLanguage();
  const isVi = language === 'vi';
  const mapRef = useRef<MapView>(null);
  const targetLat = parseFloat(params.targetLat as string) || 10.772622;
  const targetLng = parseFloat(params.targetLng as string) || 106.670172;
  const centerLat = parseFloat(params.centerLat as string) || targetLat;
  const centerLng = parseFloat(params.centerLng as string) || targetLng;
  const scannerName = (params.scannerName as string) || (isVi ? 'Ẩn danh' : 'Anonymous');
  const scannerMessage = (params.scannerMessage as string) || (isVi ? 'Đã quét thẻ thú cưng của bạn' : 'Scanned your pet tag');
  const scannerPhone = params.scannerPhone as string;
  const timeAgo = (params.timeAgo as string) || (isVi ? 'Gần đây' : 'Recently');
  const pageTitle = (params.pageTitle as string) || 'Scanned Tag';

  const rawRadius = params.radius;
  const radius = (rawRadius !== null && rawRadius !== undefined && !isNaN(parseFloat(rawRadius as string))) ? parseFloat(rawRadius as string) : 0;
  const shinePosition = useSharedValue(-0.5);
  const [currentRegion, setCurrentRegion] = useState({
    latitude: targetLat,
    longitude: targetLng,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [isGpsReady, setIsGpsReady] = useState(false);
  const [isFetchingRoute, setIsFetchingRoute] = useState(true);
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  // 🌟 THÊM STATE QUẢN LÝ MODAL LIÊN HỆ
  const [isContactModalVisible, setIsContactModalVisible] = useState(false);
  const [locationMode, setLocationMode] = useState<'NONE' | 'CENTERED' | 'COMPASS'>('NONE');
  const [mapHeading, setMapHeading] = useState(0);
  const [deviceHeading, setDeviceHeading] = useState(0);
  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number, longitude: number }[]>([]);
  const [currentLoc, setCurrentLoc] = useState({ lat: targetLat, lng: targetLng });
  const [realStats, setRealStats] = useState({ distance: '...', duration: 0 });
  const [addresses, setAddresses] = useState({ origin: 'Locating...', destination: 'Loading...' });
  const [isExpanded, setIsExpanded] = useState(true);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const modeRef = useRef<'NONE' | 'CENTERED' | 'COMPASS'>('NONE');
  const currentLocRef = useRef({ lat: targetLat, lng: targetLng });
  const headingSubRef = useRef<Location.LocationSubscription | null>(null);
  const handleRegionChangeComplete = async (region: any) => {
    setCurrentRegion(region);
    if (mapRef.current) {
      try {
        const camera = await mapRef.current.getCamera();
        setMapHeading(camera.heading || 0);
      } catch (e) {
        console.warn("Lỗi đọc góc camera:", e);
      }
    }
  };

  const updateLocationMode = (mode: 'NONE' | 'CENTERED' | 'COMPASS') => {
    modeRef.current = mode;
    setLocationMode(mode);
    if (mode !== 'COMPASS') stopHeadingWatch();
  };

  // Dừng đọc cảm biến la bàn
  const stopHeadingWatch = () => {
    if (headingSubRef.current) {
      headingSubRef.current.remove();
      headingSubRef.current = null;
    }
  };

  // Bắt đầu đọc cảm biến la bàn
  const startHeadingWatch = async () => {
    if (headingSubRef.current) return;
    
    let lastHeading = 0;
    headingSubRef.current = await Location.watchHeadingAsync((data) => {
      // Dùng magHeading (hướng từ trường) và làm tròn để chống giật (jitter)
      const currentHeading = Math.round(data.magHeading);
      
      if (Math.abs(currentHeading - lastHeading) > 1) {
        lastHeading = currentHeading;
        setDeviceHeading(currentHeading);
        
        // Nếu đang ở chế độ xoay theo la bàn -> Cập nhật camera map liên tục
        if (modeRef.current === 'COMPASS' && mapRef.current) {
          mapRef.current.setCamera({ 
            heading: currentHeading,
            center: { latitude: currentLocRef.current.lat, longitude: currentLocRef.current.lng }
          });
        }
      }
    });
  };

  // Đảm bảo tắt cảm biến khi thoát màn hình
  useEffect(() => {
    return () => stopHeadingWatch();
  }, []);
  // Logic 3 trạng thái chuẩn Google Maps
  const handleMyLocationPress = async () => {
    if (!mapRef.current || !currentLocRef.current.lat || !currentLocRef.current.lng) return;

    try {
      if (locationMode === 'NONE' || locationMode === 'COMPASS') {
        // Trạng thái 1 -> 2: Zoom về, thẳng hướng Bắc
        updateLocationMode('CENTERED');
        setMapHeading(0);
        
        mapRef.current.animateCamera({
          center: { latitude: currentLocRef.current.lat, longitude: currentLocRef.current.lng },
          heading: 0,
          pitch: 0,
          zoom: 17
        }, { duration: 800 });
        
      } else if (locationMode === 'CENTERED') {
        // Trạng thái 2 -> 3: Bật La bàn xoay theo điện thoại
        updateLocationMode('COMPASS');
        
        // 🌟 FIX LA BÀN GIẬT: Lấy góc ngay lập tức để đưa vào animation mượt
        const currentH = await Location.getHeadingAsync();
        const targetHeading = Math.round(currentH.magHeading);

        mapRef.current.animateCamera({
          center: { latitude: currentLocRef.current.lat, longitude: currentLocRef.current.lng },
          pitch: 60, // Nghiêng góc 3D
          heading: targetHeading, // Xoay mượt mà về hướng điện thoại
          zoom: 18
        }, { duration: 800 });

        // Đợi 800ms cho animation chạy xong rồi mới kích hoạt cảm biến liên tục
        setTimeout(() => {
          if (modeRef.current === 'COMPASS') {
            startHeadingWatch();
          }
        }, 800);
      }
    } catch (e) {
      console.warn("Lỗi di chuyển camera:", e);
    }
  };
  const arriveByTime = useMemo(() => {
    if (!realStats.duration || realStats.duration === 0) return '...';
    
    // Lấy timestamp hiện tại và cộng thêm số phút di chuyển (quy đổi ra mili giây)
    const arrivalDate = new Date(Date.now() + realStats.duration * 60 * 1000);
    
    // Định dạng hiển thị hh:mm AM/PM đồng bộ với chuẩn en-US của app hiện tại
    return arrivalDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }, [realStats.duration]);

  const handleZoom = async (isZoomIn: boolean) => {
    if (!mapRef.current) return;
    
    try {
      // 🌟 FIX LỖI ZOOM: Dùng getCamera để giữ nguyên độ nghiêng (pitch) và hướng (heading)
      const camera = await mapRef.current.getCamera();
      const currentZoom = camera.zoom || 15;
      
      mapRef.current.animateCamera({
        zoom: isZoomIn ? currentZoom + 1 : currentZoom - 1
      }, { duration: 300 });
      
    } catch (e) {
      console.warn("Lỗi zoom:", e);
    }
  };
  const displayLocation = useMemo(() => {
    return { lat: targetLat, lng: targetLng };
  }, [targetLat, targetLng]);

  const dynamicMapPadding = React.useMemo(() => {
    return {
      top: Platform.OS === 'ios' ? 160 : 150,     
      right: 20,
      bottom: isExpanded ? 500 : 300,            
      left: 20,
    };
  }, [isExpanded]);

  useEffect(() => {
    if (isGpsReady && mapRef.current) {
      
      // 🌟 FIX LỖI MODAL: Chặn không cho ép lại bản đồ 2D nếu đang ở chế độ Focus/La bàn
      if (modeRef.current !== 'NONE') return;

      const timeoutId = setTimeout(() => {
        const coordinatesToFit = routeCoordinates.length > 0 
          ? routeCoordinates 
          : [
              { latitude: currentLoc.lat, longitude: currentLoc.lng }, 
              { latitude: targetLat, longitude: targetLng }            
            ];

        mapRef.current?.fitToCoordinates(coordinatesToFit, {
          edgePadding: { top: 80, right: 40, bottom: 40, left: 40 }, 
          animated: true,
        });
      }, 400);

      return () => clearTimeout(timeoutId);
    }
  }, [isExpanded, currentLoc.lat, currentLoc.lng, isGpsReady, targetLat, targetLng, routeCoordinates.length]);
  
  const handleShareLocation = () => {
    setIsMenuVisible(false); 
    
    setTimeout(async () => {
      const mapUrl = `https://maps.google.com/?q=${displayLocation.lat},${displayLocation.lng}`;
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

    // Tách riêng hàm gọi API để tái sử dụng và xử lý lỗi đồng bộ
    const fetchDirections = async (startLat: number, startLng: number) => {
      const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!GOOGLE_API_KEY) return;

      const destLat = displayLocation.lat;
      const destLng = displayLocation.lng;

      const dirUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${startLat},${startLng}&destination=${destLat},${destLng}&key=${GOOGLE_API_KEY}`;
      const geoUrl = (lat: number, lng: number) => `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=en&key=${GOOGLE_API_KEY}`;
      
      try {
        const [dirRes, oriRes, destRes] = await Promise.all([
          fetch(dirUrl).catch(() => null),
          fetch(geoUrl(startLat, startLng)).catch(() => null),
          fetch(geoUrl(destLat, destLng)).catch(() => null)
        ]);

        if (!isMounted) return;

        const [dirData, oriData, destData] = await Promise.all([
          dirRes ? await dirRes.json() : null,
          oriRes ? await oriRes.json() : null,
          destRes ? await destRes.json() : null
        ]);

        if (dirData?.status === 'OK' && dirData.routes?.[0]) {
          const route = dirData.routes[0];
          const leg = route.legs[0];

          try {
            // 🌟 FIX LỖI 1: KHÔNG CHẠM ĐÍCH HOÀN HẢO
            // Dùng chi tiết từng bước (steps) thay vì đường tổng quan (overview_polyline)
            let highResCoords: { latitude: number, longitude: number }[] = [];
            
            if (leg.steps && leg.steps.length > 0) {
              leg.steps.forEach((step: any) => {
                if (step.polyline && step.polyline.points) {
                  highResCoords.push(...decodeGooglePolyline(step.polyline.points));
                }
              });
            } else {
              highResCoords = decodeGooglePolyline(route.overview_polyline.points);
            }
            
            // Ép điểm đích tuyệt đối vào cuối mảng để nét vẽ chạm mốc 100%
            setRouteCoordinates([
              { latitude: startLat, longitude: startLng },
              ...highResCoords,
              { latitude: destLat, longitude: destLng } 
            ]);
          } catch (err) {
            console.error("Error decoding Polyline:", err);
          }

          setRealStats({
            distance: (leg.distance.value / 1000).toFixed(1),
            duration: Math.round(leg.duration.value / 60)
          });
        }

        setAddresses({
          origin: getShortAddress(oriData) || 'Your Location',
          destination: getShortAddress(destData) || 'Scanned Point'
        });

        setIsFetchingRoute(false);
      } catch (e) {
        if (isMounted) setIsFetchingRoute(false);
      }
    };

    const initializeDataAndMap = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        
        let curLat: number | null = null;
        let curLng: number | null = null;

        if (status === 'granted') {
          // BẬT WATCHER NGAY LẬP TỨC ĐỂ TRÁNH MẤT DỮ LIỆU GPS
          locationSubscription = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 5 },
            (newLocation) => {
              if (isMounted) {
                currentLocRef.current = { lat: newLocation.coords.latitude, lng: newLocation.coords.longitude };
                setCurrentLoc(currentLocRef.current);
                
                // 🌟 FIX LỖI 2: MẤT ĐƯỜNG ĐI (Do miss GPS ở lần đầu, sẽ fetch bù ở đây)
                if (isFetchingRoute) {
                  fetchDirections(newLocation.coords.latitude, newLocation.coords.longitude);
                }
              }
            }
          );

          try {
            let location = await Location.getLastKnownPositionAsync();
            if (!location) location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            
            if (location) {
              curLat = location.coords.latitude;
              curLng = location.coords.longitude;
              currentLocRef.current = { lat: curLat, lng: curLng };
              setCurrentLoc(currentLocRef.current);
            }
          } catch (locationError) {
            console.warn("Error getting GPS:", locationError);
          }
        }

        if (!isMounted) return;

        if (curLat && curLng) {
          // Nếu lấy được vị trí ngay lập tức, gọi fetch vẽ đường
          setIsGpsReady(true);
          await fetchDirections(curLat, curLng);
        } else {
          // Không return early như code cũ, giữ trạng thái isFetchingRoute=true để Watcher có thể fetch bù
          setIsGpsReady(true);
        }

      } catch (error) {
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

  // 🌟 HÀM XỬ LÝ NÚT LIÊN HỆ ĐÃ ĐƯỢC SỬA LẠI ĐỂ MỞ MODAL
  const handleContact = () => {
    if (scannerPhone) {
      setIsContactModalVisible(true);
    } else {
      Alert.alert("Notice", "No phone number available for this contact.");
    }
  };

  const handleOpenMaps = () => {
    const url = Platform.select({
      ios: `maps://app?saddr=${currentLoc.lat},${currentLoc.lng}&daddr=${displayLocation.lat},${displayLocation.lng}`,
      android: `google.navigation:q=${displayLocation.lat},${displayLocation.lng}`
    });
    Linking.openURL(url!);
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
                <Text className="text-[20px] font-semibold text-black tracking-tight">{pageTitle}</Text>
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
            mapPadding={dynamicMapPadding}
            onRegionChangeComplete={handleRegionChangeComplete} 

            // 🌟 THÊM DÒNG NÀY: Thoát trạng thái focus khi user tự vuốt bản đồ
            onPanDrag={() => updateLocationMode('NONE')}
            
            initialRegion={{
              latitude: currentLoc.lat,
              longitude: currentLoc.lng,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            {radius > 0 && (
              <Circle
                center={{ latitude: displayLocation.lat, longitude: displayLocation.lng }}
                radius={radius}
                fillColor={pageTitle === 'Reported as Lost' ? 'rgba(218, 90, 90, 0.25)' : 'rgba(232, 155, 90, 0.25)'}
                strokeColor={pageTitle === 'Reported as Lost' ? 'rgba(218, 90, 90, 0.6)' : 'rgba(232, 155, 90, 0.6)'}
                strokeWidth={1.5}
              />
            )}

            {routeCoordinates.length > 0 && (
              <>
                <Polyline coordinates={routeCoordinates} strokeColor="#1d4ed8" strokeWidth={8} lineCap="round" lineJoin="round" zIndex={10} />
                <Polyline coordinates={routeCoordinates} strokeColor="#3b82f6" strokeWidth={5} lineCap="round" lineJoin="round" zIndex={11} />
              </>
            )}

            <Marker 
              coordinate={{ latitude: displayLocation.lat, longitude: displayLocation.lng }} 
              title={pageTitle === 'Reported as Lost' ? 'Lost Location' : 'Scanned Point'} 
              zIndex={50}
            >
              <View style={{ 
                width: 48, height: 48, borderRadius: 24, 
                backgroundColor: pageTitle === 'Reported as Lost' ? 'rgba(218, 90, 90, 0.25)' : 'rgba(232, 155, 90, 0.25)', 
                justifyContent: 'center', alignItems: 'center' 
              }}>
                <View style={{ 
                  width: 22, height: 22, borderRadius: 11, 
                  backgroundColor: pageTitle === 'Reported as Lost' ? '#DA5A5A' : '#E89B5A', 
                  borderWidth: 2, borderColor: '#FFFFFF',
                  shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2, shadowRadius: 3, elevation: 4, 
                }} />
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

        {/* --- CỤM NÚT ĐIỀU KHIỂN BÊN PHẢI BẢN ĐỒ --- */}
        <View 
          className="absolute right-4 z-50 flex-col items-center" 
          style={{ top: 140, gap: 16 }}
        >
          

          {/* 2. CỤM NÚT ZOOM (+/-) */}
          <View
            className="bg-white rounded-[8px] overflow-hidden"
            style={{ width: 42, shadowColor: '#000', shadowOffset: { width: 0, height: 1.5 }, shadowOpacity: 0.25, shadowRadius: 3, elevation: 4 }}
          >
            <TouchableOpacity activeOpacity={0.7} className="w-full h-[42px] items-center justify-center border-b border-gray-200" onPress={() => handleZoom(true)}>
              <Feather name="plus" size={22} color="#666666" />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} className="w-full h-[42px] items-center justify-center" onPress={() => handleZoom(false)}>
              <Feather name="minus" size={22} color="#666666" />
            </TouchableOpacity>
          </View>


          {/* 1. LA BÀN THẬT (Hiển thị góc xoay chi tiết) */}
          {(locationMode === 'COMPASS' || Math.abs(mapHeading) > 2) && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              mapRef.current?.animateCamera({ heading: 0, pitch: 0 }, { duration: 500 });
              setMapHeading(0);
              updateLocationMode('NONE');
            }}
            style={{
              width: 46, height: 46,
              borderRadius: 23,
              backgroundColor: '#FFFFFF',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 5,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <CompassWidget
              heading={locationMode === 'COMPASS' ? deviceHeading : mapHeading}
            />
          </TouchableOpacity>
        )}
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleMyLocationPress}
          className="absolute right-4 top-[305px] w-[42px] h-[42px] bg-white rounded-[8px] items-center justify-center z-40"
          style={{
            shadowColor: '#000', shadowOffset: { width: 0, height: 1.5 },
            shadowOpacity: 0.25, shadowRadius: 3, elevation: 4,
          }}
        >
           {/* Vẽ icon "Target" y hệt Google Maps bằng View thuần cực nét */}
           <View className="w-[18px] h-[18px] rounded-full border-[2px] border-[#666666] items-center justify-center">
              <View className="w-[8px] h-[8px] rounded-full bg-[#3B82F6]" />
              <View className="absolute top-[-6px] w-[2px] h-[4px] bg-[#666666]" />
              <View className="absolute bottom-[-6px] w-[2px] h-[4px] bg-[#666666]" />
              <View className="absolute left-[-6px] w-[4px] h-[2px] bg-[#666666]" />
              <View className="absolute right-[-6px] w-[4px] h-[2px] bg-[#666666]" />
           </View>
        </TouchableOpacity>

        {/* 🌟 THÊM 2: NÚT LA BÀN (Chỉ hiện khi bản đồ bị xoay lệch hướng Bắc) */}
        {Math.abs(mapHeading) > 1 && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              mapRef.current?.animateCamera({ heading: 0, pitch: 0 }, { duration: 500 });
              setMapHeading(0);
            }}
            className="absolute right-4 top-[145px] w-[42px] h-[42px] bg-white rounded-full items-center justify-center z-40"
            style={{
              shadowColor: '#000', shadowOffset: { width: 0, height: 1.5 },
              shadowOpacity: 0.25, shadowRadius: 3, elevation: 4,
            }}
          >
            {/* Vòng quay của la bàn, sẽ phản chiếu nghịch với góc xoay của map */}
            <View style={{ transform: [{ rotate: `${-mapHeading}deg` }], alignItems: 'center', justifyContent: 'center' }}>
               {/* Kim Đỏ (Hướng Bắc) */}
               <View style={{ width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderBottomWidth: 12, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#EF4444' }} />
               {/* Kim Xám (Hướng Nam) */}
               <View style={{ width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 12, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#9CA3AF' }} />
            </View>
          </TouchableOpacity>
        )}
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
                <View className="flex-row justify-between items-end mb-2">
                  <Text className="text-[12px] font-regular text-[#757575]">
                    Distance
                  </Text>

                  <Text className="text-[12px] font-regular text-[#757575] mr-7">
                    {!isVi ? "Arrive by" : "Đến trước"} <Text className="text-[14px] font-bold text-black">{arriveByTime}</Text>
                  </Text>
                </View>

                <View className="flex-row justify-between items-end">

                  <Text className="text-[40px] font-bold text-black leading-[40px]">
                    {realStats.distance}<Text className="text-[16px] font-medium text-black">km</Text>
                  </Text>

                  <View className="flex-row items-center ml-3 mr-7 pb-1">
                    <View className="flex-row items-center">
                      <Image
                        source={require('../assets/icon/drive-moto.png')}
                        style={{ width: 10, height: 16 }}
                        resizeMode="cover"
                      />
                      <Text className="text-[12px] font-regular ml-2 text-[#757575]">
                        {formatMinutes(realStats.duration, isVi)}
                      </Text>
                    </View>

                    <View className="flex-row items-center ml-4">
                      <Image
                        source={require('../assets/icon/drive-car.png')}
                        style={{ width: 20, height: 16 }}
                        resizeMode="cover"
                      />
                      <Text className="text-[12px] font-regular ml-2 text-[#757575]">
                        {formatMinutes(Math.max(1, Math.round(realStats.duration * 0.7)), isVi)}
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
                      <View className={`w-[18px] h-[18px] rounded-full border-[3px] border-[#FFECDB] ${pageTitle === 'Reported as Lost' ? 'bg-[#DA5A5A]' : 'bg-[#E89B5A]'}`} />
                    </View>
                  </View>
                  <View className="flex-1">
                    <Text className="text-[14px] font-bold text-black">
                      {pageTitle === 'Reported as Lost' ? 'Lost Location' : 'Scanned Point'}
                    </Text>
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
        
        {/* 🌟 THÊM MODAL LIÊN HỆ */}
        <ShelterContactModal
          isVisible={isContactModalVisible}
          onClose={() => setIsContactModalVisible(false)}
          shelterData={{ 
            name: scannerName, 
            phone: scannerPhone,
            avatarUrl: 'https://ui-avatars.com/api/?name=' + scannerName + '&background=E89B5A&color=fff', // Fake avatar bằng chữ cái đầu
            note: scannerMessage // Truyền thêm message quét thẻ vào làm note
          }}
        />
    </View>
  );
}