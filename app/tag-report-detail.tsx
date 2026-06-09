import { Text } from '@/components/AppText';
import ReportUGCModal from '@/components/ReportUGCModal';
import ShelterContactModal from '@/components/ShelterContactModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTimeAgo } from '@/utils/date.util';
import { normalizeRadius } from '@/utils/map.util';
import { Feather, Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  TouchableWithoutFeedback as RNTouchableWithoutFeedback,
  ScrollView,
  Share,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axiosClient from '../api/axiosClient';
import { petService } from '../services/petService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_WIDTH = Math.round(SCREEN_WIDTH);
const BACKGROUND_MAP_HEIGHT = SCREEN_HEIGHT;

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
  routeData?: {
    displayLat: number;
    displayLng: number;
    originalLat: number;
    originalLng: number;
    radius: number;
  };
}

const TimelineItem = ({ item, isLast, onLocationPress, onContactPress }: { item: ActivityProp; isLast: boolean, onLocationPress?: (item: ActivityProp) => void, onContactPress?: (item: ActivityProp) => void }) => {
  const handleCallPress = () => {
    if (onContactPress && item.contactPhone) {
      onContactPress(item);
    } else if (item.contactPhone) {
      const phoneNumber = `tel:${item.contactPhone}`;
      Linking.canOpenURL(phoneNumber)
        .then((supported) => {
          if (supported) Linking.openURL(phoneNumber);
          else Alert.alert("Error", "Device does not support phone calls.");
        })
        .catch((err) => console.error("Error opening Linking:", err));
    }
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
          <TouchableOpacity 
            className="flex-row items-start mt-1" 
            activeOpacity={item.routeData ? 0.6 : 1}
            onPress={() => item.routeData && onLocationPress && onLocationPress(item)}
          >
            <Image className='top-[3px]' source={require('../assets/icon/location-gray-icon.png')} style={{ width: 8, height: 10 }} resizeMode="cover" />
            <Text className={`${item.routeData ? 'text-[#8E8E93] underline' : 'text-[#8E8E93]'} text-[12px] ml-1 font-regular leading-5 flex-1`}>
              {item.location}
            </Text>
          </TouchableOpacity>
        )}

        {item.note && (
          <View className="flex-row items-start mt-1">
            <Image className='top-[3px]' source={require('../assets/icon/note-gray.png')} style={{ width: 9, height: 9 }} resizeMode="cover" />
            <Text className="text-[#8E8E93] text-[12px] ml-1 font-regular italic leading-5">{item.note}</Text>
          </View>
        )}

        {item.contactPhone && (
          <TouchableOpacity className="flex-row items-center mt-1" onPress={handleCallPress} activeOpacity={0.6}>
            <Image className='top-[1px] mr-[1px]' source={require('../assets/icon/phone-gray.png')} style={{ width: 10, height: 10 }} resizeMode="contain" />
            <Text className="text-[#8E8E93] text-[12px] ml-1 font-regular underline decoration-[#8E8E93]">
              Contact {item.contactName}
            </Text>
          </TouchableOpacity>
        )}

        {item.type === 'LOCATION' && item.images && item.images.length > 0 && (
          <ScrollView
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            className="mt-3 flex-row"
          >
            {item.images.map((imgUrl, index) => (
              <Image
                key={`${item.id}-img-${index}`}
                source={{ uri: imgUrl }}
                className="w-[100px] h-[74px] rounded-[12px] bg-gray-100"
                style={{ marginRight: 8 }}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const seededRandom = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++)
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
};

const generateFixedPointInCircle = (lat: number, lng: number, radius: number, seed: string) => {
  if (!radius || radius <= 0) return { lat, lng };
  
  const rand1 = seededRandom(seed + "A");
  const rand2 = seededRandom(seed + "B");
  
  const theta = 2 * Math.PI * rand1;
  const distance = radius * Math.sqrt(rand2);
  
  const latOffset = (distance * Math.cos(theta)) / 111320;
  const lngOffset = (distance * Math.sin(theta)) / (111320 * Math.cos(lat * (Math.PI / 180)));
  
  return { 
    lat: lat + latOffset, 
    lng: lng + lngOffset 
  };
};

// ====================================================================
// 🌟 COMPONENT: FIX TRIỆT ĐỂ BẰNG CÁCH BỎ RNAnimated + QUẢN LÝ CACHE BITMAP
// ====================================================================
const AnimatedMapPin = ({ 
  isLostPin, 
  coordinate, 
  currentRegion, 
  // isMapMoving, // KHÔNG CẦN DÙNG NỮA, BẠN CÓ THỂ BỎ PROP NÀY Ở MAPVIEW
  timeAgo, 
  titleText,
  iconName,
  pinColor,
  onPress 
}: any) => {
  const dLat = coordinate.latitude - currentRegion.latitude;
  const dLng = coordinate.longitude - currentRegion.longitude;
  const distance = Math.sqrt(dLat * dLat + dLng * dLng);
  
  const ZOOM_THRESHOLD = 0.0035;
  const isZoomedIn = currentRegion.longitudeDelta < ZOOM_THRESHOLD;
  const focusRadius = currentRegion.latitudeDelta / 3;
  const isFocused = distance <= focusRadius;

  const [trackChanges, setTrackChanges] = useState(true);
  const timeoutRef = useRef<any>(null);

  // LOGIC FIX: Chỉ cho phép vẽ lại (trackChanges=true) khi trạng thái UI thật sự thay đổi
  // Không snapshot liên tục, không dùng Animated
  useEffect(() => {
    setTrackChanges(true);
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    // Đợi 300ms cho View React render xong UI tĩnh, sau đó khóa Texture lại (false)
    timeoutRef.current = setTimeout(() => {
      setTrackChanges(false);
    }, 300);

    return () => clearTimeout(timeoutRef.current);
  }, [isZoomedIn, isFocused, titleText, timeAgo]); 

  // Tính toán UI tĩnh thay vì dùng Animated
  const markerScale = isZoomedIn ? (isFocused ? 1 : 0.85) : 0.75;
  const markerOpacity = isZoomedIn ? (isFocused ? 1 : 0.7) : 1;
  const titleOpacity = isZoomedIn ? 1 : 0;

  return (
    <Marker
      coordinate={coordinate}
      zIndex={isFocused ? 999 : 100}
      tracksViewChanges={trackChanges} 
      anchor={{ x: 0.5, y: 1 }}
      onPress={onPress}
      // Dùng key động cực kỳ quan trọng: Ép Native vẽ lại từ đầu nếu nó "lỡ" tàng hình
      // nhưng chỉ thay đổi key khi trạng thái thực sự đổi để tránh giật lag
      key={`${coordinate.latitude}-${coordinate.longitude}-${isZoomedIn}-${isFocused}`}
    >
      <View 
        collapsable={false} 
        style={{ 
          width: 140, 
          height: 115, 
          alignItems: 'center', 
          justifyContent: 'flex-end' 
        }}
      >
        <View 
          collapsable={false} 
          style={{ 
            alignItems: 'center', 
            width: '100%',
            opacity: markerOpacity,
            transform: [{ scale: markerScale }]
          }}
        >
          {/* Box Text */}
          <View style={{ width: '100%', alignItems: 'center', opacity: titleOpacity }}>
            <View className="bg-[#FFFFFF] px-3 py-1.5 rounded-lg shadow-md w-full">
              <Text className="text-black text-[13px] font-medium tracking-[0.06px] text-center">
                {titleText}
              </Text>
              <Text className="text-[#8E8E93] text-[11px] font-regular tracking-[0.06px] text-center">
                {timeAgo}
              </Text>
            </View>
            <View style={{ width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 6, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#FFFFFF' }} />
            <View className="h-1.5" />
          </View>

          {/* Icon Pin */}
          <View style={{ borderColor: pinColor, borderWidth: 2.5 }} className="w-11 h-11 bg-white rounded-full items-center justify-center shadow-sm">
            <Ionicons name={iconName} size={20} color={pinColor} />
          </View>

          <View style={{ width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 9, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: pinColor }} />
        </View>
      </View>
    </Marker>
  );
};

export default function TagReportDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { reportId, openFrom } = params;
  const mapRef = useRef<MapView>(null);
  const isMapMovingRef = useRef(false);
  const [isMapMoving, setIsMapMoving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const { language } = useLanguage();
  const isVi = language === 'vi';
  const [isOptionsVisible, setIsOptionsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  
  const [isContactModalVisible, setIsContactModalVisible] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);

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
    const lowestSnapPoint = headerHeight + insets.bottom;
    const middleSnapPoint = SCREEN_HEIGHT / 2;
    return [lowestSnapPoint, middleSnapPoint, highestSnapPoint];
  }, [headerHeight, SCREEN_HEIGHT, insets.top]);

  const getAge = (dobString?: string | Date | null) => {
    if (!dobString) return !isVi ? "? years old" : "? tuổi";
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return !isVi ? "? years old" : "? tuổi";
    
    const diff_ms = Date.now() - dob.getTime();
    const age_dt = new Date(diff_ms);
    const years = Math.abs(age_dt.getUTCFullYear() - 1970);
    const months = age_dt.getUTCMonth();

    if (years > 0) return `${years} ${isVi ? "tuổi" : "year"}${years > 1 && !isVi ? 's' : ''} ${isVi ? "" : "old"}`;
    if (months > 0) return `${months} ${isVi ? "tháng" : "month"}${months > 1 && !isVi ? 's' : ''} ${isVi ? "" : "old"}`;
    return 'Newborn';
  };

  useFocusEffect(
    useCallback(() => {
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
    }, [reportId])
  );

  const handleMarkAsFound = () => {
    const petId = reportData?.tag?.pet?.id;
    if (!petId) {
      Alert.alert("Error", "Pet data not found.");
      return;
    }

    Alert.alert(
      "Confirm",
      `Have you found ${reportData?.tag?.pet?.name || 'your pet'}? Lost mode will be turned off and a thank you message will be sent to the scanner.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Mark as Found", 
          style: "default",
          onPress: async () => {
            try {
              setIsSubmitting(true);
              await petService.toggleLostMode(petId, { isLost: false });
              
              Alert.alert("Success!", "Lost mode has been turned off.");
              
              router.replace({
                pathname: '/pet-profile-detail',
                params: { id: petId }
              });
            } catch (error) {
              Alert.alert("Error", "Unable to update status. Please try again.");
            } finally {
              setIsSubmitting(false);
            }
          }
        }
      ]
    );
  };
  
  const pet = reportData?.tag?.pet || {};
  
  const lat = parseFloat(reportData?.latitude || reportData?.lat || '10.762622');
  const lng = parseFloat(reportData?.longitude || reportData?.lng || '106.660172');
  
  const lostLat = pet?.lostLatitude ? parseFloat(pet.lostLatitude) : null;
  const lostLng = pet?.lostLongitude ? parseFloat(pet.lostLongitude) : null;

  const isSameAsLostLocation = 
    lostLat !== null && 
    lostLng !== null && 
    Math.abs(lat - lostLat) < 0.0005 && 
    Math.abs(lng - lostLng) < 0.0005;

  const ownerInfo = pet.shelter || pet.owner || {};
  const ownerName = pet.contactName || ownerInfo.name;
  const ownerPhone = pet.contactPhone || ownerInfo.phone;
  const [currentRegion, setCurrentRegion] = useState({
    latitude: lat,
    longitude: lng,
    latitudeDelta: 0.025,  // 🌟 Sửa từ 0.008 thành 0.025
    longitudeDelta: 0.025, // 🌟 Sửa từ 0.008 thành 0.025
  });
  
  const handleZoom = (isZoomIn: boolean) => {
    if (!currentRegion) return;

    const ZOOM_FACTOR = 1.5;
    const newLatDelta = isZoomIn ? currentRegion.latitudeDelta / ZOOM_FACTOR : currentRegion.latitudeDelta * ZOOM_FACTOR;
    const newLngDelta = isZoomIn ? currentRegion.longitudeDelta / ZOOM_FACTOR : currentRegion.longitudeDelta * ZOOM_FACTOR;

    const currentScan = processedScans.find(scan => scan.id === reportId);
    const fakeScanLat = currentScan ? currentScan.displayLat : lat;
    const fakeScanLng = currentScan ? currentScan.displayLng : lng;

    let baseLat = fakeScanLat;
    let baseLng = fakeScanLng;

    if (openFrom === 'profile' && fakeLostPos) {
      baseLat = fakeLostPos.lat;
      baseLng = fakeLostPos.lng;
    }

    const latOffset = newLatDelta * 0.25; 

    const newRegion = {
      latitude: baseLat - latOffset,
      longitude: baseLng,
      latitudeDelta: newLatDelta,
      longitudeDelta: newLngDelta,
    };

    mapRef.current?.animateToRegion(newRegion, 300);
    setCurrentRegion(newRegion);
  };
  
  const getRadius = (data: any) => {
    if (!data || data.radius === null || data.radius === undefined) return 0;
    const r = parseFloat(data.radius);
    return isNaN(r) ? 0 : r;
  };

  const isOwnerScan = (data: any) => {
    if (!data) return false;
    const hasOwnerName = data.scannedBy && ownerName && data.scannedBy === ownerName;
    const hasOwnerPhone = data.phoneNumber && ownerPhone && data.phoneNumber === ownerPhone;
    return hasOwnerName || hasOwnerPhone;
  };

  const checkIsPointZero = (data: any, itemLat: number, itemLng: number) => {
    if (!data) return true;
    const isSystemLostReport = 
      data.message?.includes('Báo mất') || 
      data.message === 'Chủ nhân đã báo mất thú cưng';
      
    if (isSystemLostReport) return true;
    if (data.type === 'LOST') return true;

    const isSameAsLost = 
      lostLat !== null && lostLng !== null && 
      Math.abs(itemLat - lostLat) < 0.0001 && 
      Math.abs(itemLng - lostLng) < 0.0001;

    if (isSameAsLost && isOwnerScan(data)) return true;
    return false;
  };

  const isPointZeroReport = checkIsPointZero(reportData, lat, lng);
  const lostDate = pet.lostDate ? new Date(pet.lostDate).getTime() : 0;
  const filteredScanHistory = (reportData?.scanHistory || []).filter((hist: any) => {
    const scannedAt = new Date(hist.scannedAt || hist.createdAt).getTime();
    return scannedAt > lostDate;
  });

  const scanHistory = reportData?.scanHistory || [];
  const activeScansForMap: any[] = [];

  if (!isPointZeroReport && reportData) {
    activeScansForMap.push({
      id: reportData.id,
      type: 'SCAN', 
      latitude: lat,
      longitude: lng,
      radius: getRadius(reportData),
      scannedBy: reportData.scannedBy || 'Anonymous',
      message: reportData.message || 'Found your pet in this area!',
      phoneNumber: reportData.phoneNumber || '',
      scannedAt: reportData.scannedAt || reportData.createdAt,
      images: reportData.images 
    });
  }

  filteredScanHistory.forEach((hist: any) => {
    const histLat = parseFloat(hist.latitude || hist.lat || '0');
    const histLng = parseFloat(hist.longitude || hist.lng || '0');
    
    if (!checkIsPointZero(hist, histLat, histLng)) {
      activeScansForMap.push({
        id: hist.id,
        type: 'SCAN', 
        latitude: histLat,
        longitude: histLng,
        scannedBy: hist.scannedBy || 'Anonymous',
        message: hist.message || 'Found your pet in this area!',
        phoneNumber: hist.phoneNumber || '',
        scannedAt: hist.scannedAt || hist.createdAt,
        radius: normalizeRadius(hist.radius),
        images: hist.images 
      });
    }
  });

  const rawRadius = parseFloat(reportData?.lostRadius) || 100;

  const fakeLostPos = useMemo(() => {
    if (!lostLat || !lostLng) return null;
    const seed = reportData?.id ? `lost-${reportData.id}` : 'default-lost-seed';
    return generateFixedPointInCircle(lostLat, lostLng, rawRadius, seed);
  }, [lostLat, lostLng, rawRadius, reportData?.id]);
  
  const processedScans = useMemo(() => {
    const result: any[] = [];
    
    [...activeScansForMap] 
      .sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime())
      .forEach((scan) => {
        const originalLat = parseFloat(scan.latitude) || 0;
        const originalLng = parseFloat(scan.longitude) || 0;
        const r = parseFloat(scan.radius) || 0;
        
        const fakePos = generateFixedPointInCircle(originalLat, originalLng, r, String(scan.id));
        let displayLat = fakePos.lat;
        let displayLng = fakePos.lng;
        
        let overlapIndex = 0;

        if (fakeLostPos && Math.abs(displayLat - fakeLostPos.lat) < 0.00015 && Math.abs(displayLng - fakeLostPos.lng) < 0.00015) {
          overlapIndex++;
        }

        result.forEach((p) => {
          if (Math.abs(displayLat - p.displayLat) < 0.00015 && Math.abs(displayLng - p.displayLng) < 0.00015) {
            overlapIndex++;
          }
        });
        
        if (overlapIndex > 0) {
          const angle = overlapIndex * (Math.PI / 4); 
          const currentRadius = 0.0003 + (Math.floor(overlapIndex / 8) * 0.00015);
          displayLat += Math.cos(angle) * currentRadius;
          displayLng += Math.sin(angle) * currentRadius;
        }
        
        result.push({
          ...scan,
          originalLat, 
          originalLng,
          displayLat,  
          displayLng,
          radius: r
        });
      });
      
    return result;
  }, [activeScansForMap, fakeLostPos]);
  
  const [addressMap, setAddressMap] = useState<Record<string, string>>({});
  
  useEffect(() => {
    let isMounted = true;
    
    const fetchAddresses = async () => {
      const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!GOOGLE_API_KEY) return;

      const newAddressMap: Record<string, string> = { ...addressMap };
      let hasChanges = false;

      for (const scan of processedScans) {
        if (!newAddressMap[scan.id]) {
          try {
            const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${scan.displayLat},${scan.displayLng}&language=en&key=${GOOGLE_API_KEY}`;
            const res = await fetch(url);
            const data = await res.json();
            
            if (!isMounted) return;

            if (data?.status === 'OK' && data.results?.[0]) {
              const formatted = data.results[0].formatted_address;
              const parts = formatted.split(', ');
              newAddressMap[scan.id] = parts.slice(0, 3).join(', ');
            } else {
              newAddressMap[scan.id] = `Lat: ${scan.displayLat.toFixed(4)}, Lng: ${scan.displayLng.toFixed(4)}`;
            }
            hasChanges = true;
          } catch (e) {
            newAddressMap[scan.id] = `Lat: ${scan.displayLat.toFixed(4)}, Lng: ${scan.displayLng.toFixed(4)}`;
            hasChanges = true;
          }
        }
      }

      if (hasChanges && isMounted) {
        setAddressMap(newAddressMap);
      }
    };

    if (processedScans.length > 0) {
      fetchAddresses();
    }

    return () => { isMounted = false; };
  }, [processedScans]);

  const handleSheetChanges = useCallback((index: number) => {
    if (!mapRef.current) return;

    let bottomPadding = headerHeight + insets.bottom; 
    if (index === 1) bottomPadding = SCREEN_HEIGHT / 2; 
    if (index === 2) bottomPadding = SCREEN_HEIGHT - REQUIRED_TOP_INSET; 

    const currentScan = processedScans.find(scan => scan.id === reportId);
    const targetLat = openFrom === 'profile' && fakeLostPos ? fakeLostPos.lat : (currentScan ? currentScan.displayLat : lat);
    const targetLng = openFrom === 'profile' && fakeLostPos ? fakeLostPos.lng : (currentScan ? currentScan.displayLng : lng);

    if (index === 1) {
      const latDelta = 0.025; // 🌟 Sửa từ 0.004 thành 0.025 (rộng ra)
      const coveredRatio = bottomPadding / SCREEN_HEIGHT; 
      const latOffset = latDelta * coveredRatio * 0.6; 

      mapRef.current.animateToRegion({
        latitude: targetLat - latOffset,
        longitude: targetLng,
        latitudeDelta: latDelta,
        longitudeDelta: latDelta,
      }, 400);

    } else if (index === 0) {
      const latDelta = 0.025;
      const coveredRatio = bottomPadding / SCREEN_HEIGHT; 
      const latOffset = latDelta * coveredRatio * 0.5; 

      mapRef.current.animateToRegion({
        latitude: targetLat - latOffset,
        longitude: targetLng,
        latitudeDelta: latDelta,
        longitudeDelta: latDelta,
      }, 400);

    } else if (index === 2) {
      if (processedScans.length > 0 && lostLat && lostLng) {
        const coordinates = [{ latitude: fakeLostPos?.lat || lostLat, longitude: fakeLostPos?.lng || lostLng }];
        processedScans.forEach(scan => {
          coordinates.push({ latitude: scan.displayLat, longitude: scan.displayLng });
        });

        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { 
            top: 120, 
            right: 60, 
            bottom: bottomPadding + 40, 
            left: 60 
          },
          animated: true
        });
      } else if (lostLat && lostLng) {
        mapRef.current.animateToRegion({
          latitude: fakeLostPos?.lat || lostLat,
          longitude: fakeLostPos?.lng || lostLng,
          latitudeDelta: 0.02, 
          longitudeDelta: 0.02,
        }, 400);
      }
    }
  }, [processedScans, reportId, lat, lng, openFrom, fakeLostPos, headerHeight, insets.bottom, lostLat, lostLng, REQUIRED_TOP_INSET]);
  
  const hasInitializedMap = useRef(false);

  useEffect(() => {
    if (!reportData || hasInitializedMap.current) return;

    if (mapRef.current) {
      const timer = setTimeout(() => {
        handleSheetChanges(1); 
        hasInitializedMap.current = true; 
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [reportData]);

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
  
  const radius = pet.lostRadius ? parseFloat(pet.lostRadius) : 100;

  const handleShareLocation = () => {
    setIsOptionsVisible(false);
    
    setTimeout(async () => {
      const currentScan = processedScans.find(scan => scan.id === reportId);
      const shareLat = currentScan ? currentScan.displayLat : (fakeLostPos?.lat || lat);
      const shareLng = currentScan ? currentScan.displayLng : (fakeLostPos?.lng || lng);
      
      const mapUrl = `https://maps.google.com/?q=${shareLat},${shareLng}`;

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

  const lostTimeAgo = getTimeAgo(pet.lostDate, isVi);
  const displayContactName = pet.contactName || ownerInfo.name || 'N/A';
  const displayContactPhone = pet.contactPhone || ownerInfo.phone || 'N/A';
  const displayContactAddress = pet.contactAddress || ownerInfo.address || 'Address not provided';
  const petImage = pet.images?.[0]?.url || 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=150&q=80';

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Just now';
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }) + ' at ' + d.toLocaleDateString('en-GB');
  };

  const activities: ActivityProp[] = [];

  processedScans.forEach((scan) => {
    let parsedImages: string[] = [];
    if (scan.images) {
      try {
        const rawImages = typeof scan.images === 'string' ? JSON.parse(scan.images) : scan.images;
        if (Array.isArray(rawImages)) {
          parsedImages = rawImages
            .map((img: any) => typeof img === 'string' ? img : img?.url)
            .filter((url: string) => typeof url === 'string' && url.trim() !== '');
        }
      } catch (e) {
        console.warn("Lỗi parse images:", e);
      }
    }

    const isLocationType = parsedImages.length > 0;

    activities.push({
      id: scan.id,
      type: isLocationType ? 'LOCATION' : 'SCAN',
      // Dịch luôn title cho đồng bộ
      title: scan.scannedBy !== 'Anonymous' 
          ? (isVi ? `Được quét bởi ${scan.scannedBy}` : `Tag Scanned by ${scan.scannedBy}`) 
          : (isVi ? 'Quét thẻ ẩn danh' : 'Tag Scanned Anonymously'),
      time: getTimeAgo(scan.scannedAt, isVi), // <--- Thêm isVi vào đây
      location: addressMap[scan.id] || (isVi ? 'Đang định vị...' : `Locating address...`),
      note: scan.message || undefined,
      contactName: scan.scannedBy !== 'Anonymous' ? scan.scannedBy : undefined,
      contactPhone: scan.phoneNumber || undefined,
      images: parsedImages, 
      routeData: {
        displayLat: scan.displayLat,
        displayLng: scan.displayLng,
        originalLat: scan.originalLat,
        originalLng: scan.originalLng,
        radius: scan.radius
      }
    });
  });

  if (reportData.tag?.status === 'LOST') {
    activities.push({
      id: 'report-lost-origin',
      type: 'REPORT',
      title: `${pet.name || 'Pet'} ${!isVi ? 'reported as lost by' : 'đã được báo cáo mất bởi'} ${displayContactName}`,
      time: lostTimeAgo, 
      location: displayContactAddress,
    });
  }

  const handleLostPinPress = () => {
    if (!lostLat || !lostLng || !fakeLostPos) return;
    router.push({
      pathname: '/tag-route-details',
      params: {
        targetLat: fakeLostPos.lat.toString(),
        targetLng: fakeLostPos.lng.toString(),
        centerLat: lostLat.toString(),
        centerLng: lostLng.toString(),
        radius: rawRadius.toString(),
        scannerName: displayContactName,
        scannerMessage: pet.lostDetails || 'Reported pet as lost here.',
        scannerPhone: displayContactPhone,
        timeAgo: lostTimeAgo,
        pageTitle: 'Reported as Lost'
      }
    });
  };

  const handleTimelineLocationPress = (item: ActivityProp) => {
    if (!item.routeData) return;
    router.push({
      pathname: '/tag-route-details',
      params: {
        targetLat: item.routeData.displayLat.toString(),
        targetLng: item.routeData.displayLng.toString(),
        centerLat: item.routeData.originalLat.toString(), 
        centerLng: item.routeData.originalLng.toString(), 
        radius: item.routeData.radius.toString(),         
        scannerName: item.contactName || 'Anonymous',
        scannerMessage: item.note || 'Scanned your pet tag',
        scannerPhone: item.contactPhone || '',
        timeAgo: item.time,
        pageTitle: 'Scanned Tag'
      }
    });
  };

  const handleTimelineContactPress = (item: ActivityProp) => {
    setSelectedContact({
      name: item.contactName || 'Pet finder',
      phone: item.contactPhone || '',
      avatarUrl: 'https://ui-avatars.com/api/?name=' + (item.contactName || 'N') + '&background=E89B5A&color=fff',
      note: item.note
    });
    setIsContactModalVisible(true);
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
      <View
        className="absolute top-20 right-5 w-[42px] bg-white rounded-[8px] z-50"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1.5 },
          shadowOpacity: 0.25,
          shadowRadius: 3,
          elevation: 4,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          className="w-full h-[42px] items-center justify-center border-b border-gray-200"
          onPress={() => handleZoom(true)}
        >
          <Feather name="plus" size={22} color="#666666" />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          className="w-full h-[42px] items-center justify-center"
          onPress={() => handleZoom(false)}
        >
          <Feather name="minus" size={22} color="#666666" />
        </TouchableOpacity>
      </View>
      <View style={{ height: BACKGROUND_MAP_HEIGHT, width: MAP_WIDTH, position: 'absolute', top: 0 }}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={{ flex: 1 }}
          onRegionChangeComplete={(region) => setCurrentRegion(region)} // Chỉ cần dòng này
          initialRegion={{
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.008,
            longitudeDelta: 0.008,
          }}
        >
          {processedScans.map((scanPoint) => {
            const r = parseFloat(scanPoint.radius) || 0;
            if (r > 0) {
              return (
                <Circle
                  key={`circle-${scanPoint.id}-${scanPoint.displayLat}-${scanPoint.displayLng}-${r}`}
                  center={{ latitude: scanPoint.displayLat, longitude: scanPoint.displayLng }}
                  radius={r}
                  fillColor="rgba(232, 155, 90, 0.25)"
                  strokeColor="rgba(232, 155, 90, 0.6)"
                  strokeWidth={2}
                  zIndex={999} 
                />
              );
            }
            return null;
          })}
          
          {fakeLostPos && lostLat && lostLng && radius > 0 && (
            <Circle
              center={{ latitude: fakeLostPos.lat, longitude: fakeLostPos.lng }}
              radius={radius}
              fillColor="rgba(218, 90, 90, 0.25)"
              strokeColor="rgba(218, 90, 90, 0.6)"
              strokeWidth={2}
            />
          )}

          {fakeLostPos && lostLat && lostLng && (
            <AnimatedMapPin
              isLostPin={true}
              isMapMoving={isMapMoving} // <--- TRUYỀN THÊM VÀO ĐÂY
              coordinate={{ latitude: fakeLostPos.lat, longitude: fakeLostPos.lng }}
              currentRegion={currentRegion}
              timeAgo={lostTimeAgo}
              titleText="Reported as Lost"
              iconName="alert-outline"
              pinColor="#DA5A5A"
              onPress={handleLostPinPress}
            />
          )}

          {processedScans.map((scanPoint) => (
             <AnimatedMapPin
               key={`marker-scan-${scanPoint.id}`}
               isLostPin={false}
               isMapMoving={isMapMoving}
               coordinate={{ latitude: scanPoint.displayLat, longitude: scanPoint.displayLng }}
               currentRegion={currentRegion}
               timeAgo={getTimeAgo(scanPoint.scannedAt, isVi)} // <--- Thêm isVi vào đây
               titleText={isVi ? "Đã quét thẻ" : "Tag Scanned"}
               iconName="scan-outline"
               pinColor="#FFC28F"
               onPress={() => {
                 router.push({
                   pathname: '/tag-route-details',
                   params: {
                     targetLat: scanPoint.displayLat.toString(),
                     targetLng: scanPoint.displayLng.toString(),
                     centerLat: scanPoint.originalLat.toString(), 
                     centerLng: scanPoint.originalLng.toString(), 
                     radius: scanPoint.radius.toString(),         
                     scannerName: scanPoint.scannedBy,
                     scannerMessage: scanPoint.message,
                     scannerPhone: scanPoint.phoneNumber,
                     // ĐỔI formatDate THÀNH getTimeAgo Ở ĐÂY 👇
                     timeAgo: getTimeAgo(scanPoint.scannedAt),
                     pageTitle: 'Scanned Tag'
                   }
                 });
               }}
             />
          ))}
        </MapView>
      </View>

      <BottomSheet
        index={1}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        enableOverDrag={false}
        animatedPosition={animatedPosition}
        enablePanDownToClose={false}
        topInset={REQUIRED_TOP_INSET}
        backgroundStyle={{ backgroundColor: 'white', borderRadius: 26 }}
        handleIndicatorStyle={{ backgroundColor: '#E5E5EA', width: 48, height: 6 }}
      >
        <BottomSheetView className="pt-[12px] bg-white z-10"
          onLayout={(event) => {
            const { height } = event.nativeEvent.layout;
            if (height > 0) {
              setHeaderHeight(height);
            }
          }}
        >
          <Animated.View style={headerAnimatedStyle}>
            <View className="flex-row items-center justify-between flex-1 mx-[20px] pb-[12px]">
              <Image source={{ uri: petImage }} className="rounded-full mr-4" style={{ width: 60, height: 60 }} />
              <View className="flex-1">
                <View className="flex-row justify-between items-center">
                  <View className="flex-row items-center mb-2">
                    <Text className="text-[16px] font-bold text-black mr-2">{pet.name || 'Unknown Pet'}</Text>
                    <View className="bg-[#FFE8E8] border border-[#DA5A5A]/25 py-1 px-[10px] rounded-full">
                      <Text className="text-[#DA5A5A] text-[10px] font-regular">
                        {reportData.status === 'PENDING' ? 'Missing / Pending' : 'Resolved'}
                      </Text>
                    </View>
                  </View>
                </View>
                
                <Text className="text-[12px] text-[#757575] font-regular mb-2">
                  {getAge(pet.dob)} • {pet.breed || 'Unknown breed'}
                </Text>
                
                <TouchableOpacity onPress={() => {
                  if (pet?.id) {
                    router.push(`/edit-pet?id=${pet.id}`);
                  } else {
                    Alert.alert("Notice", "Pet identity information not found.");
                  }
                }}>
                  <View className='flex-row items-center'>
                    <Image className='bottom-1 mr-1' source={require('../assets/icon/pen.png')} style={{ width: 7, height: 8 }} resizeMode="cover" />
                    <Text className="text-[10px] text-[#8E8E93] mb-2 underline tracking-[0.06px]">Edit pet information</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </BottomSheetView>

        <BottomSheetScrollView
          onScroll={handleScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20, paddingHorizontal: 24, paddingTop: 130 }}
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
                      <Text className="text-[#8E8E93] text-[12px] font-regular leading-[16px]">{displayContactName}</Text>
                    </View>
                  </View>

                  <View className="flex-row items-center pr-8 mb-6">
                    <Image className='mr-3 top-1' source={require('../assets/icon/phone-gray.png')} style={{ width: 15, height: 15 }} resizeMode="cover" />
                    <View className='flex-row border-b border-[#E5E5E5] w-full pt-2 pb-1 justify-between'>
                      <Text className="text-black text-[14px] font-medium leading-[16px]">Phone</Text>
                      <Text className="text-[#8E8E93] text-[12px] font-regular leading-[16px]">{displayContactPhone}</Text>
                    </View>
                  </View>

                  <View className="flex-row items-center pr-8 mb-4">
                    <Image className='mr-4 top-1' source={require('../assets/icon/location-gray.png')} style={{ width: 11, height: 15 }} resizeMode="cover" />
                    <View className='flex-row border-b border-[#E5E5E5] w-full pt-2 pb-1 justify-between'>
                      <Text className="text-black text-[14px] font-medium leading-[16px]">Address</Text>
                      <Text className="text-[#8E8E93] text-[12px] font-regular leading-[16px]" numberOfLines={2}>{displayContactAddress}</Text>
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
              <TimelineItem 
                key={activity.id} 
                item={activity} 
                isLast={index === array.length - 1} 
                onLocationPress={handleTimelineLocationPress}
                onContactPress={handleTimelineContactPress} 
              />
            ))}
          </View>
        </BottomSheetScrollView>
      </BottomSheet>

      <Modal
        visible={isOptionsVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOptionsVisible(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.1)' }}
          activeOpacity={1}
          onPressOut={() => setIsOptionsVisible(false)}
        >
          <RNTouchableWithoutFeedback>
            <View
              className="absolute top-[45%] right-[24px] w-[180px] bg-white rounded-[12px] border border-[#E5E5E5] overflow-hidden"
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
                  setIsOptionsVisible(false);
                  setTimeout(() => {
                    setIsReportModalVisible(true);
                  }, 200); 
                }}
              >
                <Text className="ml-3 text-[13px] font-medium text-[#EF4444]">Report</Text>
              </TouchableOpacity>
            </View>
          </RNTouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      <ReportUGCModal 
        isVisible={isReportModalVisible} 
        onClose={() => setIsReportModalVisible(false)}
        reportTargetName={reportData?.scannedBy || 'Anonymous'}
      />

      {selectedContact && (
        <ShelterContactModal
          isVisible={isContactModalVisible}
          onClose={() => setIsContactModalVisible(false)}
          shelterData={selectedContact}
        />
      )}
    </View>
  );
}