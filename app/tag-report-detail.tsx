import { Text } from '@/components/AppText';
import ReportUGCModal from '@/components/ReportUGCModal';
import ShelterContactModal from '@/components/ShelterContactModal';
import { AuthContext } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTimeAgo } from '@/utils/date.util';
import { getLocalizedField } from '@/utils/localization';
import { normalizeRadius } from '@/utils/map.util';
import { Feather, Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
  View,
} from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axiosClient from '../api/axiosClient';
import { petService } from '../services/petService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_WIDTH = Math.round(SCREEN_WIDTH);
const BACKGROUND_MAP_HEIGHT = SCREEN_HEIGHT;
const MINIMAL_MAP_STYLE = [
  {
    "featureType": "poi", // Ẩn các điểm đánh dấu (Points of Interest)
    "elementType": "labels",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "transit", // Ẩn các trạm giao thông công cộng
    "elementType": "labels",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "road", // Giảm độ nổi bật của đường xá
    "elementType": "geometry",
    "stylers": [{ "lightness": 100 }, { "visibility": "simplified" }]
  },
  {
    "featureType": "landscape", // Chuyển nền đất thành màu xám nhạt/trắng sạch sẽ
    "elementType": "geometry",
    "stylers": [{ "color": "#f5f5f5" }]
  }
];
// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const ZOOM_THRESHOLD = 0.0035;

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
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
  routeData?: { displayLat: number; displayLng: number; originalLat: number; originalLng: number; radius: number; isEstimated: boolean; };
  tagReportId?: string;
}

// ─────────────────────────────────────────────
// TimelineItem
// ─────────────────────────────────────────────
const TimelineItem = ({
  item, isLast, onLocationPress, onContactPress, onReportPress,
}: {
  item: ActivityProp;
  isLast: boolean;
  onLocationPress?: (item: ActivityProp) => void;
  onContactPress?: (item: ActivityProp) => void;
  onReportPress?: (item: ActivityProp) => void;
}) => {
  const handleCallPress = () => {
    if (onContactPress && item.contactPhone) {
      onContactPress(item);
    } else if (item.contactPhone) {
      const phoneNumber = `tel:${item.contactPhone}`;
      Linking.canOpenURL(phoneNumber)
        .then((supported) => {
          if (supported) Linking.openURL(phoneNumber);
          else Alert.alert('Error', 'Device does not support phone calls.');
        })
        .catch((err) => console.error('Error opening Linking:', err));
    }
  };

  const renderIcon = () => {
    switch (item.type) {
      case 'SCAN':
        return (
          <Image
            source={require('../assets/icon/scan-orange.png')}
            style={{ width: 13, height: 13 }}
            resizeMode="cover"
          />
        );
      case 'LOCATION':
        return (
          <Image
            source={require('../assets/icon/location-purple.png')}
            style={{ width: 16, height: 13 }}
            resizeMode="cover"
          />
        );
      case 'REPORT':
        return (
          <Image
            source={require('../assets/icon/noti-red.png')}
            style={{ width: 13, height: 13 }}
            resizeMode="cover"
          />
        );
      default:
        return <View className="w-2 h-2 bg-gray-400 rounded-full" />;
    }
  };

  return (
    <View className="flex-row">
      <View className="items-center mr-4 relative">
        <View className="w-6 h-6 rounded-full bg-white items-center justify-center z-10">
          {renderIcon()}
        </View>
        {!isLast && (
          <View className="absolute top-6 bottom-[-16px] w-[1px] bg-[#8E8E93] z-0" />
        )}
      </View>
      <View className="flex-1 pb-6">
        <View className="flex-row justify-between items-center mb-1 h-6">
          <Text className="text-black text-[14px] font-medium flex-1 pr-2 leading-5" numberOfLines={1}>
            {item.title}
          </Text>
          <View className="flex-row items-center">
            <Text className="text-[#8E8E93] font-regular text-[12px] tracking-[0.06px] mr-1">
              {item.time}
            </Text>
            {(item.type === 'SCAN' || item.type === 'LOCATION') && onReportPress && (
              <TouchableOpacity
                onPress={() => onReportPress(item)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.6}
                className="ml-1.5 w-6 h-6 items-center justify-center rounded-full"
                accessibilityRole="button"
                accessibilityLabel="Report this content"
              >
                <Feather name="flag" size={13} color="#B0B0B5" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Đã thêm !! để chặn lỗi chuỗi rỗng */}
        {!!item.location && (
          <TouchableOpacity
            className="flex-row items-center mt-1.5"
            activeOpacity={item.routeData ? 0.6 : 1}
            onPress={() => item.routeData && onLocationPress && onLocationPress(item)}
          >
            <Image
              source={require('../assets/icon/location-gray-icon.png')}
              style={{ width: 8, height: 10 }}
              resizeMode="cover"
            />
            <Text className="text-[#8E8E93] text-[12px] ml-1.5 font-regular flex-1">
              {item.location}
            </Text>
          </TouchableOpacity>
        )}

        {/* Đã thêm !! để chặn lỗi chuỗi rỗng */}
        {!!item.note && (
          <View className="flex-row items-center mt-1.5">
            <Image
              source={require('../assets/icon/note-gray.png')}
              style={{ width: 9, height: 9 }}
              resizeMode="cover"
            />
            <Text className="text-[#8E8E93] text-[12px] ml-1.5 font-regular flex-1">
              "{item.note}"
            </Text>
          </View>
        )}

        {/* Đã thêm !! để chặn lỗi chuỗi rỗng */}
        {!!item.contactPhone && (
          <TouchableOpacity
            className="flex-row items-center mt-1.5"
            onPress={handleCallPress}
            activeOpacity={0.6}
          >
            <Image
              className="mr-[2px]"
              source={require('../assets/icon/phone-gray.png')}
              style={{ width: 10, height: 10 }}
              resizeMode="contain"
            />
            <Image
              className="mr-[2px]"
              source={require('../assets/icon/message-gray.png')}
              style={{ width: 10, height: 10 }}
              resizeMode="contain"
            />
            <Text className="text-[#8E8E93] text-[12px] ml-1 font-regular underline italic decoration-[#8E8E93]">
              Contact {item.contactName}
            </Text>
          </TouchableOpacity>
        )}

        {/* Chỉnh lại logic kiểm tra mảng an toàn hơn */}
        {item.type === 'LOCATION' && Array.isArray(item.images) && item.images.length > 0 && (
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

// ═══════════════════════════════════════════════════════════════════
//  MapPin — Thiết kế dứt điểm, không còn tracksViewChanges dynamic
//
//  CHIẾN LƯỢC MỚI: "Freeze-by-key" thay vì "Timer-based tracking"
//
//  Vấn đề gốc rễ của mọi timer approach:
//    Native Bridge snapshot là một side-effect bất đồng bộ của hệ thống.
//    Không có cách nào từ JS biết chính xác khi nào Native đã vẽ xong.
//    Mọi setTimeout đều là đoán mò → race condition không thể tránh.
//
//  Giải pháp dứt điểm:
//  1. tracksViewChanges={true} TOÀN BỘ khi map đang chuyển động (isMapMoving).
//     → Native Bridge liên tục cập nhật bitmap, không bao giờ bị stale.
//
//  2. Khi map DỪNG HẲN (isMapMoving=false), thay vì dùng timer để đóng
//     tracksViewChanges, ta dùng `key` prop để FORCE REMOUNT component.
//     React unmount instance cũ (state=true) và mount instance mới
//     với tracksViewChanges=true ngay từ đầu, render đúng visual hiện tại,
//     rồi sau 1 frame (requestAnimationFrame) tự chốt false.
//     → Không có stale closure, không có race condition, không có timer.
//
//  3. "Freeze key" = `${id}-${isZoomedIn}-${isFocused}-${isRead}`
//     Mỗi khi visual state thay đổi, key đổi → remount sạch → snapshot đúng.
//     Đây là pattern "controlled remount" chuẩn cho Custom Marker Native Bridge.
//
//  4. Bỏ hoàn toàn animation transition. Scale/opacity là giá trị tĩnh tức thì.
//     Không còn Animated.timing, không còn fluid scale — bỏ đi giúp giảm
//     số lần Native cần chụp bitmap xuống tối thiểu.
// ═══════════════════════════════════════════════════════════════════

interface MapPinProps {
  id: string;
  coordinate: { latitude: number; longitude: number };
  timeAgo: string;
  titleText: string;
  iconName: string;
  pinColor: string;
  isRead: boolean;
  isZoomedIn: boolean;
  isFocused: boolean;
  hasRadius?: boolean;
  mapStopEpoch: number; // <--- Thêm prop này, xóa isMapMoving
  onPress?: () => void;
  onZoomRequest?: (coord: { latitude: number; longitude: number }) => void;
}

// ─────────────────────────────────────────────
//  Wrapper: "Freeze-by-key" controlled remount
//
//  key = `${id}-${isZoomedIn}-${isFocused}-${isRead}-${freezeEpoch}`
//
//  freezeEpoch: số nguyên tăng dần, chỉ tăng khi map DỪNG HẲN.
//  Mỗi lần map dừng → freezeEpoch++ → React unmount instance cũ,
//  mount instance mới với tracksViewChanges=true ban đầu, visual đúng,
//  rồi RAF tự đóng về false sau khi Native commit.
//
//  Cơ chế này đảm bảo:
//  ✅ Không bao giờ chụp snapshot khi map đang bay
//  ✅ Không bao giờ có stale bitmap từ lần zoom trước
//  ✅ Không có timer race condition
//  ✅ Visual state mới luôn được chụp đúng
// ─────────────────────────────────────────────
const PinIcon = React.memo(({
  id, coordinate, iconName, pinColor, hasRadius = false,
  onPress, onZoomRequest, isZoomedIn,
}: {
  id: string;
  coordinate: { latitude: number; longitude: number };
  iconName: string;
  pinColor: string;
  hasRadius?: boolean;
  isZoomedIn: boolean;
  onPress?: () => void;
  onZoomRequest?: (coord: { latitude: number; longitude: number }) => void;
}) => {
  const [tracks, setTracks] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setTracks(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const handlePress = (e: any) => {
    e.stopPropagation();
    if (!isZoomedIn && onZoomRequest) {
      onZoomRequest(coordinate);
    } else if (onPress) {
      onPress();
    }
  };

  // Tinh chỉnh Anchor: 
  // - 0.5 là tâm toán học. 
  // - Nâng nhẹ lên 0.53 (hoặc 0.55) sẽ kéo Pin nhích lên trên một chút để bù trừ ảo giác quang học
  const anchorY = hasRadius ? 0.53 : 0.5;

  return (
    <Marker
      coordinate={coordinate}
      tracksViewChanges={tracks}
      anchor={{ x: 0.5, y: anchorY }} // 0.5 hoặc 0.53 để nhấc nhẹ lên như mình đề cập ở trên
      onPress={handlePress}
      zIndex={1000}
    >

      <View
        collapsable={false}
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          width: 60,
          height: 60
        }}
      >
        <View
          style={{ borderColor: pinColor, borderWidth: 2.5 }}
          className="w-11 h-11 bg-white rounded-full items-center justify-center shadow-sm"
        >
          <Ionicons name={iconName as any} size={20} color={pinColor} />
        </View>
      </View>
    </Marker>
  );
}, (prev, next) =>
  prev.id === next.id &&
  prev.hasRadius === next.hasRadius &&
  prev.pinColor === next.pinColor &&
  prev.iconName === next.iconName &&
  prev.isZoomedIn === next.isZoomedIn &&
  prev.coordinate.latitude === next.coordinate.latitude &&
  prev.coordinate.longitude === next.coordinate.longitude
);

// ─────────────────────────────────────────────
//  PinBadge — card thông tin, chỉ MOUNT khi isZoomedIn && isFocused
//  Vì mount mới hoàn toàn → snapshot luôn đúng ngay từ đầu, không cần freeze logic
// ─────────────────────────────────────────────
const PinBadge = React.memo(({
  coordinate, timeAgo, titleText, isRead, hasRadius = false, onPress,
}: {
  coordinate: { latitude: number; longitude: number };
  timeAgo: string;
  titleText: string;
  isRead: boolean;
  hasRadius?: boolean;
  onPress?: () => void;
}) => {
  const [tracks, setTracks] = useState(true);

  useEffect(() => {
    setTracks(true);
    const timer = setTimeout(() => setTracks(false), 500);
    return () => clearTimeout(timer);
  }, [isRead]);

  return (
    <Marker
      coordinate={coordinate}
      tracksViewChanges={tracks}
      anchor={{ x: 0.5, y: 1 }} // Canh gốc vào đáy thẻ view
      zIndex={9999}
      onPress={onPress}
    >
      <View collapsable={false} style={{ alignItems: 'center', width: 260, paddingBottom: 28, paddingTop: 16, paddingHorizontal: 16 }}>
        <View
          style={{ maxWidth: 220 }} // Đã có vùng đệm 16px hai bên nên giảm max-width một chút để cân đối
          className="bg-white px-3 py-1.5 rounded-lg shadow-md items-center relative"
        >
          <View
            style={{
              position: 'absolute',
              top: -6, right: -6,
              width: 11, height: 11, borderRadius: 5.5,
              backgroundColor: '#E89B5A', borderWidth: 1.5, borderColor: 'white',
              zIndex: 10, opacity: isRead ? 0 : 1,
            }}
          />
          <Text className="text-black text-[13px] font-medium tracking-[0.06px] text-center" allowFontScaling={false}>
            {titleText}
          </Text>
          <Text className="text-[#8E8E93] text-[11px] font-regular tracking-[0.06px] text-center" allowFontScaling={false}>
            {timeAgo}
          </Text>
        </View>
        <View
          style={{
            width: 0, height: 0,
            borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 6,
            borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#FFFFFF',
          }}
        />
      </View>
    </Marker>
  );
});

const getEdgeCoordinateByBearing = (centerLat: number, centerLng: number, radiusInMeters: number, bearingDeg: number) => {
  const R = 6378137; // bán kính trái đất (m)
  const bearing = (bearingDeg * Math.PI) / 180;
  const lat1 = (centerLat * Math.PI) / 180;
  const lng1 = (centerLng * Math.PI) / 180;
  const angDist = radiusInMeters / R;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angDist) +
    Math.cos(lat1) * Math.sin(angDist) * Math.cos(bearing)
  );
  const lng2 = lng1 + Math.atan2(
    Math.sin(bearing) * Math.sin(angDist) * Math.cos(lat1),
    Math.cos(angDist) - Math.sin(lat1) * Math.sin(lat2)
  );

  return {
    latitude: (lat2 * 180) / Math.PI,
    longitude: (lng2 * 180) / Math.PI,
  };
};
const globalReadPins = new Set<string>();

// ─────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────
export default function TagReportDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useContext(AuthContext);
  const { reportId, openFrom } = params;
  const mapRef = useRef<MapView>(null);
  const isMapMovingRef = useRef(false);
  const headingPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isMapMoving, setIsMapMoving] = useState(false);
  const readPinsRef = useRef<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const { language } = useLanguage();
  const isVi = language === 'vi';
  const [isOptionsVisible, setIsOptionsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [isContactModalVisible, setIsContactModalVisible] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [readPins, setReadPins] = useState<string[]>(
    Array.from(globalReadPins)
  );

  const [focusedPinId, setFocusedPinId] = useState<string | null>(null);
  const [mapHeading, setMapHeading] = useState(0);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [reportTarget, setReportTarget] = useState<ActivityProp | null>(null);

  const handleReportSubmit = async (
    reason: string,
    details: string | undefined,
    isHideRequested: boolean,
    isBlockRequested: boolean
  ) => {
    if (!reportTarget) return;
    await axiosClient.post('/interactions/report-tag-report', {
      tagReportId: reportTarget.id,
      reason,
      details,
      isHideRequested,
      isBlockRequested,
    });
    if (isHideRequested) {
      setHiddenIds((prev) => [...prev, reportTarget.id]);
    }
  };



  const handleReportPress = (item: ActivityProp) => {
    setReportTarget(item);
  };



  const submitReportAndHide = async (item: ActivityProp, hide: boolean, reason = 'inappropriate_content', details?: string) => {
    try {
      await axiosClient.post('/interactions/report-tag-report', {
        tagReportId: item.id,
        reason,
        details,
        isHideRequested: hide,
      });
      if (hide) setHiddenIds((prev) => [...prev, item.id]);
      Alert.alert(
        isVi ? 'Đã ghi nhận' : 'Done',
        isVi ? 'Nội dung đã được xử lý.' : 'Content has been processed.'
      );
    } catch {
      Alert.alert('Error', isVi ? 'Không thể xử lý. Vui lòng thử lại.' : 'Could not process. Please try again.');
    }
  };

  useEffect(() => {
    return () => {
      if (headingPollRef.current) clearInterval(headingPollRef.current);
    };
  }, []);


  const markPinAsRead = useCallback((pinId: string) => {
    if (globalReadPins.has(pinId)) return;
    globalReadPins.add(pinId);
    setReadPins(Array.from(globalReadPins));
  }, []);



  const handleZoomToPin = useCallback(
    async (coordinate: { latitude: number; longitude: number }) => {
      if (!mapRef.current) return;

      // 1. Lấy camera hiện tại
      const camera = await mapRef.current.getCamera();
      const currentHeading = camera.heading || 0;

      // 2. Định nghĩa độ zoom tương đương latDelta: 0.002
      // Zoom 18 là rất gần, phù hợp với latDelta: 0.002
      const TARGET_ZOOM = 18.5;

      // 3. Tính toán offset theo hướng camera (đã giải thích ở trên)
      // Cần một hệ số tỉ lệ phù hợp với mức zoom 18
      const offsetMagnitude = 0.0006; // Điều chỉnh con số này nếu muốn pin cao/thấp hơn
      const rad = (currentHeading * Math.PI) / 180;

      const offsetLat = offsetMagnitude * Math.cos(rad);
      const offsetLng = offsetMagnitude * Math.sin(rad);

      // 4. Thực hiện animateCamera
      mapRef.current.animateCamera(
        {
          center: {
            latitude: coordinate.latitude - offsetLat,
            longitude: coordinate.longitude - offsetLng,
          },
          heading: currentHeading,
          zoom: TARGET_ZOOM,
        },
        { duration: 400 }
      );
    },
    []
  );

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

    // Fix crash: Đảm bảo snapPoints luôn được sắp xếp tăng dần và không trùng lặp
    const points = [lowestSnapPoint, middleSnapPoint, highestSnapPoint].sort((a, b) => a - b);
    return Array.from(new Set(points));
  }, [headerHeight, SCREEN_HEIGHT, insets.top, insets.bottom, REQUIRED_TOP_INSET]);

  const getAge = (dobString?: string | Date | null) => {
    if (!dobString) return !isVi ? '? years old' : '? tuổi';
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return !isVi ? '? years old' : '? tuổi';
    const diff_ms = Date.now() - dob.getTime();
    const age_dt = new Date(diff_ms);
    const years = Math.abs(age_dt.getUTCFullYear() - 1970);
    const months = age_dt.getUTCMonth();
    if (years > 0)
      return `${years} ${isVi ? 'tuổi' : 'year'}${years > 1 && !isVi ? 's' : ''} ${isVi ? '' : 'old'}`;
    if (months > 0)
      return `${months} ${isVi ? 'tháng' : 'month'}${months > 1 && !isVi ? 's' : ''} ${isVi ? '' : 'old'}`;
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
          console.error('Error loading report details:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchReportDetail();
    }, [reportId])
  );

  const handleMarkAsFound = () => {
    const petId = reportData?.tag?.pet?.id;
    if (!petId) { Alert.alert('Error', 'Pet data not found.'); return; }
    Alert.alert(
      'Confirm',
      `Have you found ${reportData?.tag?.pet?.name || 'your pet'}? Lost mode will be turned off and a thank you message will be sent to the scanner.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark as Found',
          style: 'default',
          onPress: async () => {
            try {
              setIsSubmitting(true);
              await petService.toggleLostMode(petId, { isLost: false });
              Alert.alert('Success!', 'Lost mode has been turned off.');
              router.replace({ pathname: '/pet-profile-detail', params: { id: petId } });
            } catch {
              Alert.alert('Error', 'Unable to update status. Please try again.');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const pet = reportData?.tag?.pet || {};
  const breedText = getLocalizedField(pet.breed, isVi ? 'vi' : 'en');
  const lostDetailsText = getLocalizedField(pet.lostDetails, isVi ? 'vi' : 'en');

  const lat = parseFloat(reportData?.latitude || reportData?.lat || '10.762622');
  const lng = parseFloat(reportData?.longitude || reportData?.lng || '106.660172');
  const lostLat = pet?.lostLatitude ? parseFloat(pet.lostLatitude) : null;
  const lostLng = pet?.lostLongitude ? parseFloat(pet.lostLongitude) : null;

  const ownerInfo = pet.shelter || pet.owner || {};
  const ownerName = pet.contactName || ownerInfo.name;
  const ownerPhone = pet.contactPhone || ownerInfo.phone;

  const [currentRegion, setCurrentRegion] = useState({
    latitude: lat,
    longitude: lng,
    latitudeDelta: 0.025,
    longitudeDelta: 0.025,
  });

  const getRadius = (data: any) => {
    if (!data || data.radius === null || data.radius === undefined) return 0;
    const r = parseFloat(data.radius);
    return isNaN(r) ? 0 : r;
  };

  const isOwnerScan = (data: any) => {
    if (!data) return false;
    return (
      (data.scannedBy && ownerName && data.scannedBy === ownerName) ||
      (data.phoneNumber && ownerPhone && data.phoneNumber === ownerPhone)
    );
  };

  const checkIsPointZero = (data: any, itemLat: number, itemLng: number) => {
    if (!data) return true;
    if (data.message?.includes('Báo mất') || data.message === 'Chủ nhân đã báo mất thú cưng') return true;
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
    return new Date(hist.scannedAt || hist.createdAt).getTime() > lostDate;
  });

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
      images: reportData.images,
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
        images: hist.images,
        isEstimated: hist.isEstimated,
      });
    }
  });

  const rawRadius = parseFloat(reportData?.lostRadius) || 100;
  const isOwner = reportData?.isOwner ?? false;

  const fakeLostPos = useMemo(() => {
    if (!lostLat || !lostLng) return null;
    return { lat: lostLat, lng: lostLng };
  }, [lostLat, lostLng]);

  const processedScans = useMemo(() => {
    const result: any[] = [];
    [...activeScansForMap]
      .sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime())
      .forEach((scan) => {
        let displayLat = parseFloat(scan.latitude) || 0;
        let displayLng = parseFloat(scan.longitude) || 0;
        const r = parseFloat(scan.radius) || 0;
        let overlapIndex = 0;
        if (fakeLostPos &&
          Math.abs(displayLat - fakeLostPos.lat) < 0.00015 &&
          Math.abs(displayLng - fakeLostPos.lng) < 0.00015) {
          overlapIndex++;
        }
        result.forEach((p) => {
          if (Math.abs(displayLat - p.displayLat) < 0.00015 &&
            Math.abs(displayLng - p.displayLng) < 0.00015) {
            overlapIndex++;
          }
        });
        if (overlapIndex > 0) {
          const angle = overlapIndex * (Math.PI / 4);
          const cr = 0.0003 + (Math.floor(overlapIndex / 8) * 0.00015);
          displayLat += Math.cos(angle) * cr;
          displayLng += Math.sin(angle) * cr;
        }
        const isEstimated = scan.id === reportData?.id
          ? !reportData?.isExactLocation
          : (scan.isEstimated ?? true);
        result.push({
          ...scan,
          originalLat: parseFloat(scan.latitude) || 0,
          originalLng: parseFloat(scan.longitude) || 0,
          displayLat,
          displayLng,
          radius: r,
          isEstimated,
        });
      });
    return result;
  }, [activeScansForMap, fakeLostPos, reportData]);

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
              const parts = data.results[0].formatted_address.split(', ');
              newAddressMap[scan.id] = parts.slice(0, 3).join(', ');
            } else {
              newAddressMap[scan.id] = `Lat: ${scan.displayLat.toFixed(4)}, Lng: ${scan.displayLng.toFixed(4)}`;
            }
            hasChanges = true;
          } catch {
            newAddressMap[scan.id] = `Lat: ${scan.displayLat.toFixed(4)}, Lng: ${scan.displayLng.toFixed(4)}`;
            hasChanges = true;
          }
        }
      }
      if (hasChanges && isMounted) setAddressMap(newAddressMap);
    };
    if (processedScans.length > 0) fetchAddresses();
    return () => { isMounted = false; };
  }, [processedScans]);

  const handleZoom = (isZoomIn: boolean) => {
    if (!currentRegion) return;
    const ZOOM_FACTOR = 1.5;
    const newLatDelta = isZoomIn
      ? currentRegion.latitudeDelta / ZOOM_FACTOR
      : currentRegion.latitudeDelta * ZOOM_FACTOR;
    const newLngDelta = isZoomIn
      ? currentRegion.longitudeDelta / ZOOM_FACTOR
      : currentRegion.longitudeDelta * ZOOM_FACTOR;
    const currentScan = processedScans.find((s) => s.id === reportId);
    let baseLat = currentScan ? currentScan.displayLat : lat;
    let baseLng = currentScan ? currentScan.displayLng : lng;
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

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (!mapRef.current) return;
      let bottomPadding = headerHeight + insets.bottom;
      if (index === 1) bottomPadding = SCREEN_HEIGHT / 2;
      if (index === 2) bottomPadding = SCREEN_HEIGHT - REQUIRED_TOP_INSET;

      const currentScan = processedScans.find((s) => s.id === reportId);
      const targetLat = openFrom === 'profile' && fakeLostPos
        ? fakeLostPos.lat
        : currentScan ? currentScan.displayLat : lat;
      const targetLng = openFrom === 'profile' && fakeLostPos
        ? fakeLostPos.lng
        : currentScan ? currentScan.displayLng : lng;

      if (index === 1) {
        const latDelta = 0.025;
        const latOffset = latDelta * (bottomPadding / SCREEN_HEIGHT) * 0.6;
        mapRef.current.animateToRegion(
          { latitude: targetLat - latOffset, longitude: targetLng, latitudeDelta: latDelta, longitudeDelta: latDelta },
          400
        );
      } else if (index === 0) {
        if (processedScans.length > 0 && lostLat && lostLng) {
          const coords = [{ latitude: fakeLostPos?.lat || lostLat, longitude: fakeLostPos?.lng || lostLng }];
          processedScans.forEach((s) => coords.push({ latitude: s.displayLat, longitude: s.displayLng }));
          mapRef.current.fitToCoordinates(coords, {
            edgePadding: { top: 120, right: 60, bottom: bottomPadding + 40, left: 60 },
            animated: true,
          });
        } else if (lostLat && lostLng) {
          mapRef.current.animateToRegion(
            { latitude: fakeLostPos?.lat || lostLat, longitude: fakeLostPos?.lng || lostLng, latitudeDelta: 0.02, longitudeDelta: 0.02 },
            400
          );
        }
      } else if (index === 2) {
        const latDelta = 0.025;
        const latOffset = latDelta * (bottomPadding / SCREEN_HEIGHT) * 0.45;
        mapRef.current.animateToRegion(
          { latitude: targetLat - latOffset, longitude: targetLng, latitudeDelta: latDelta, longitudeDelta: latDelta },
          400
        );
      }
    },
    [processedScans, reportId, lat, lng, openFrom, fakeLostPos, headerHeight, insets.bottom, lostLat, lostLng, REQUIRED_TOP_INSET]
  );

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

  // Tính toán derived booleans tại parent — KHÔNG truyền currentRegion xuống Marker
  const isZoomedIn = currentRegion.longitudeDelta < ZOOM_THRESHOLD;
  const radius = pet.lostRadius ? parseFloat(pet.lostRadius) : 100;

  const isFocusingEstimatedPin = useMemo(() => {
    // 1. Chỉ check nếu zoom đủ gần
    if (currentRegion.longitudeDelta > 0.005) return false;

    // 2. Xử lý nếu Pin đang focus là Pin Mất tích (Lost Pin)
    if (focusedPinId === 'lost-pin') {
      const lostHasRadius = radius > 0;
      // NẾU CÓ HIỂN THỊ BÁN KÍNH => KHÔNG HIỆN TEXT CẢNH BÁO
      if (lostHasRadius) return false;

      if (!fakeLostPos) return false;
      const dLat = Math.abs(fakeLostPos.lat - currentRegion.latitude);
      const dLng = Math.abs(fakeLostPos.lng - currentRegion.longitude);
      return dLat < currentRegion.latitudeDelta && dLng < currentRegion.longitudeDelta;
    }

    // 3. Xử lý nếu Pin đang focus là Pin Lịch sử quét (Scan pins)
    const focusedPin = processedScans.find(s => s.id === focusedPinId);
    if (!focusedPin) return false;

    const r = parseFloat(focusedPin.radius) || 0;
    const hasRadius = r > 0 && !focusedPin.isEstimated;

    // NẾU CÓ HIỂN THỊ BÁN KÍNH => KHÔNG HIỆN TEXT CẢNH BÁO
    if (hasRadius) return false;

    // 4. Nếu KHÔNG có bán kính, kiểm tra xem Pin có đang nằm trong khung nhìn màn hình không
    const pinCoord = { latitude: focusedPin.displayLat, longitude: focusedPin.displayLng };
    const dLat = Math.abs(pinCoord.latitude - currentRegion.latitude);
    const dLng = Math.abs(pinCoord.longitude - currentRegion.longitude);

    return dLat < currentRegion.latitudeDelta && dLng < currentRegion.longitudeDelta;
  }, [currentRegion, processedScans, focusedPinId, radius, fakeLostPos]);

  const warningAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: animatedPosition.value - 38 }],
    opacity: withTiming(isFocusingEstimatedPin ? 1 : 0, { duration: 300 }),
  }));

  // Early returns — sau tất cả hooks
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


  const handleShareLocation = () => {
    setIsOptionsVisible(false);
    setTimeout(async () => {
      const currentScan = processedScans.find((s) => s.id === reportId);
      const shareLat = currentScan ? currentScan.displayLat : (fakeLostPos?.lat || lat);
      const shareLng = currentScan ? currentScan.displayLng : (fakeLostPos?.lng || lng);

      // Fix crash: Sửa lại format URL chuẩn của Google Maps
      const mapUrl = `https://maps.google.com/?q=${shareLat},${shareLng}`;

      try {
        await Share.share(
          {
            message: Platform.OS === 'android' ? `Pet location scanned here:\n${mapUrl}` : `Pet location scanned here:`,
            url: mapUrl,
            title: 'Pet Location',
          },
          { dialogTitle: 'Share Pet Location', subject: 'Pet Location' }
        );
      } catch {
        Alert.alert('Error', 'Unable to share location.');
      }
    }, 300);
  };

  const lostTimeAgo = getTimeAgo(pet.lostDate, isVi);
  const displayContactName = pet.contactName || ownerInfo.name || 'N/A';
  const displayContactPhone = pet.contactPhone || ownerInfo.phone || 'N/A';
  const displayContactAddress = pet.contactAddress || ownerInfo.address || 'Address not provided';
  const petImage =
    pet.images?.[0]?.url ||
    'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=150&q=80';

  const activities: ActivityProp[] = [];
  processedScans.forEach((scan) => {
    let parsedImages: string[] = [];
    if (scan.images) {
      try {
        const rawImages = typeof scan.images === 'string' ? JSON.parse(scan.images) : scan.images;
        if (Array.isArray(rawImages)) {
          parsedImages = rawImages
            .map((img: any) => (typeof img === 'string' ? img : img?.url))
            .filter((url: string) => typeof url === 'string' && url.trim() !== '');
        }
      } catch (e) { console.warn('Parse images error:', e); }
    }
    activities.push({
      id: scan.id,
      type: parsedImages.length > 0 ? 'LOCATION' : 'SCAN',
      title: scan.scannedBy !== 'Anonymous'
        ? (isVi ? `Được quét bởi ${scan.scannedBy}` : `Tag Scanned by ${scan.scannedBy}`)
        : (isVi ? 'Quét thẻ ẩn danh' : 'Tag Scanned Anonymously'),
      time: getTimeAgo(scan.scannedAt, isVi),
      location: addressMap[scan.id] || (isVi ? 'Đang định vị...' : 'Locating address...'),
      note: scan.message || undefined,
      contactName: scan.scannedBy !== 'Anonymous' ? scan.scannedBy : undefined,
      contactPhone: scan.phoneNumber || undefined,
      images: parsedImages,
      routeData: {
        displayLat: scan.displayLat,
        displayLng: scan.displayLng,
        originalLat: scan.originalLat,
        originalLng: scan.originalLng,
        radius: scan.radius,
        isEstimated: scan.isEstimated,
      },
    });
  });

  if (reportData.tag?.status === 'LOST') {
    activities.push({
      id: 'report-lost-origin',
      type: 'REPORT',
      title: `${pet.name || 'Pet'} ${!isVi ? 'reported as lost' : 'đã được báo cáo mất'}`,
      time: lostTimeAgo,
      location: displayContactAddress,
    });
  }
  const visibleActivities = activities.filter(a => !hiddenIds.includes(a.id));

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
        scannerMessage: lostDetailsText || 'Reported pet as lost here.',
        scannerPhone: displayContactPhone,
        timeAgo: lostTimeAgo,
        pageTitle: 'Reported as Lost',
        isEstimated: (!isOwner).toString(),
      },
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
        pageTitle: 'Scanned Tag',
        isEstimated: (item.routeData.isEstimated ?? false).toString(),
      },
    });
  };

  const handleTimelineContactPress = (item: ActivityProp) => {
    setSelectedContact({
      name: item.contactName || 'Pet finder',
      phone: item.contactPhone || '',
      avatarUrl: 'https://ui-avatars.com/api/?name=' + (item.contactName || 'N') + '&background=E89B5A&color=fff',
      note: item.note,
    });
    setIsContactModalVisible(true);
  };

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <View className="flex-1 bg-white relative">
      <TouchableOpacity
        className="absolute top-12 left-5 z-50 w-10 h-10 rounded-full items-center justify-center shadow-sm"
        onPress={() => router.back()}
        activeOpacity={0.7}
        style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 1 }}
      >
        <View style={{
          width: 36, height: 36, borderRadius: 28,
          borderWidth: 0.5, borderTopColor: 'white', borderLeftColor: 'white',
          borderBottomColor: 'transparent', borderRightColor: 'transparent',
          justifyContent: 'center', alignItems: 'center',
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

      {/* Zoom controls */}
      <View
        className="absolute top-20 right-5 w-[42px] bg-white rounded-[8px] z-10"
        style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1.5 }, shadowOpacity: 0.25, shadowRadius: 3, elevation: 1 }}
      >
        <TouchableOpacity activeOpacity={0.7} className="w-full h-[42px] items-center justify-center border-b border-gray-200" onPress={() => handleZoom(true)}>
          <Feather name="plus" size={22} color="#666666" />
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7} className="w-full h-[42px] items-center justify-center" onPress={() => handleZoom(false)}>
          <Feather name="minus" size={22} color="#666666" />
        </TouchableOpacity>
      </View>

      {/* Map */}
      <View style={{ height: BACKGROUND_MAP_HEIGHT, width: MAP_WIDTH, position: 'absolute', top: 0 }}>
        <MapView
          ref={mapRef}
          customMapStyle={isZoomedIn ? [] : MINIMAL_MAP_STYLE}
          provider={PROVIDER_GOOGLE}
          style={{ flex: 1 }}
          onRegionChange={() => {
            if (!isMapMovingRef.current) {
              isMapMovingRef.current = true;
              setIsMapMoving(true);
            }
          }}
          onPanDrag={() => {
            if (headingPollRef.current) return;
            const id = setInterval(async () => {
              const camera = await mapRef.current?.getCamera();
              if (camera) setMapHeading(camera.heading || 0);
            }, 50);
            headingPollRef.current = id;
          }}
          onRegionChangeComplete={async (region) => {
            if (headingPollRef.current) {
              clearInterval(headingPollRef.current);
              headingPollRef.current = null;
            }
            isMapMovingRef.current = false;
            setIsMapMoving(false);
            setCurrentRegion(region);
            const camera = await mapRef.current?.getCamera();
            if (camera) setMapHeading(camera.heading || 0);
          }}
          initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.008, longitudeDelta: 0.008 }}
        >
          {/* Circles scan */}
          {processedScans.map((scanPoint) => {
            const r = parseFloat(scanPoint.radius) || 0;
            if (r <= 0 || scanPoint.isEstimated) return null;
            return (
              <Circle
                key={`circle-${scanPoint.id}`}
                center={{ latitude: scanPoint.displayLat, longitude: scanPoint.displayLng }}
                radius={r}
                fillColor="rgba(232, 155, 90, 0.15)"
                strokeColor="rgba(232, 155, 90, 0.6)"
                strokeWidth={1.5}
                zIndex={1}
              />
            );
          })}

          {fakeLostPos && lostLat && lostLng && radius > 0 && (
            <Circle
              center={{ latitude: fakeLostPos.lat, longitude: fakeLostPos.lng }}
              radius={!isOwner ? Math.max(radius, 1000) : radius}
              fillColor="rgba(218, 90, 90, 0.15)"
              strokeColor="rgba(218, 90, 90, 0.6)"
              strokeWidth={1.5}
              lineDashPattern={isOwner ? undefined : [5, 5]}
              zIndex={1}
            />
          )}



          {/* LOST PIN - Cập nhật: Chỉ hiện pin nếu radius <= 0 */}
          {fakeLostPos && lostLat && lostLng && (() => {
            const lostHasRadius = radius > 0;
            // LUÔN LẤY TÂM
            const lostCoordinate = { latitude: fakeLostPos.lat, longitude: fakeLostPos.lng };

            const lostIsFocused = focusedPinId === 'lost-pin';

            return (
              <React.Fragment>
                <PinIcon
                  id="lost-pin"
                  coordinate={lostCoordinate}
                  hasRadius={lostHasRadius}
                  isZoomedIn={isZoomedIn}
                  iconName="alert-outline"
                  pinColor="#DA5A5A"
                  onZoomRequest={(coord) => {
                    setFocusedPinId('lost-pin');
                    handleZoomToPin(coord);
                  }}
                  onPress={() => {
                    markPinAsRead('lost-pin');
                    setFocusedPinId('lost-pin');
                    handleLostPinPress();
                  }}
                />
                {isZoomedIn && lostIsFocused && (
                  <PinBadge
                    key={`badge-lost-${readPins.includes('lost-pin')}`} // ← thêm vào đây
                    coordinate={lostCoordinate}
                    hasRadius={lostHasRadius}
                    isRead={readPins.includes('lost-pin')}
                    timeAgo={lostTimeAgo}
                    titleText="Reported as Lost"
                    onPress={() => {
                      markPinAsRead('lost-pin');
                      handleLostPinPress();
                    }}
                  />
                )}

              </React.Fragment>
            );
          })()}

          {/* Scan pins */}
          {processedScans.map((scanPoint) => {
            const r = parseFloat(scanPoint.radius) || 0;
            const hasRadius = r > 0 && !scanPoint.isEstimated;

            // LUÔN LẤY TÂM
            const pinCoordinate = { latitude: scanPoint.displayLat, longitude: scanPoint.displayLng };

            const isFocused = focusedPinId === scanPoint.id;

            return (
              <React.Fragment key={`pin-${scanPoint.id}`}>
                <PinIcon
                  id={scanPoint.id}
                  coordinate={pinCoordinate}
                  hasRadius={hasRadius}
                  isZoomedIn={isZoomedIn}
                  iconName="scan-outline"
                  pinColor="#FFC28F"
                  onZoomRequest={(coord) => {
                    setFocusedPinId(scanPoint.id);
                    handleZoomToPin(coord);
                  }}
                  onPress={() => {
                    markPinAsRead(scanPoint.id);
                    setFocusedPinId(scanPoint.id);
                    router.push({
                      pathname: '/tag-route-details',
                      params: {
                        targetLat: scanPoint.displayLat.toString(),
                        targetLng: scanPoint.displayLng.toString(),
                        centerLat: scanPoint.originalLat.toString(),
                        centerLng: scanPoint.originalLng.toString(),
                        radius: scanPoint.radius.toString(),
                        scannerName: scanPoint.scannedBy !== 'Anonymous' ? scanPoint.scannedBy : 'Anonymous',
                        scannerMessage: scanPoint.message || 'Scanned your pet tag',
                        scannerPhone: scanPoint.phoneNumber || '',
                        timeAgo: getTimeAgo(scanPoint.scannedAt, isVi),
                        pageTitle: 'Scanned Tag',
                        isEstimated: (scanPoint.isEstimated ?? false).toString(),
                      },
                    });
                  }}
                />
                {isZoomedIn && isFocused && (
                  <PinBadge
                    key={`badge-${scanPoint.id}-${readPins.includes(scanPoint.id)}`} // ← thêm isRead vào key
                    coordinate={pinCoordinate}
                    hasRadius={hasRadius}
                    isRead={readPins.includes(scanPoint.id)}
                    timeAgo={getTimeAgo(scanPoint.scannedAt, isVi)}
                    titleText={isVi ? 'Đã quét thẻ' : 'Tag Scanned'}
                    onPress={() => {
                      markPinAsRead(scanPoint.id);
                      router.push({
                        pathname: '/tag-route-details',
                        params: {
                          targetLat: scanPoint.displayLat.toString(),
                          targetLng: scanPoint.displayLng.toString(),
                          centerLat: scanPoint.originalLat.toString(),
                          centerLng: scanPoint.originalLng.toString(),
                          radius: scanPoint.radius.toString(),
                          scannerName: scanPoint.scannedBy !== 'Anonymous' ? scanPoint.scannedBy : 'Anonymous',
                          scannerMessage: scanPoint.message || 'Scanned your pet tag',
                          scannerPhone: scanPoint.phoneNumber || '',
                          timeAgo: getTimeAgo(scanPoint.scannedAt, isVi),
                          pageTitle: 'Scanned Tag',
                          isEstimated: (scanPoint.isEstimated ?? false).toString(),
                        },
                      });
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}

        </MapView>
      </View>

      {/* Estimated location warning */}
      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 9999, elevation: 99 },
          warningAnimatedStyle,
        ]}
      >
        <View style={{
          borderRadius: 100, overflow: 'hidden',
          shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
          borderWidth: 1, borderColor: 'rgb(255, 255, 255)',
        }}>
          <BlurView intensity={80} tint="light" style={{
            backgroundColor: 'rgba(255, 255, 255, 0.6)',
            paddingHorizontal: 20, paddingVertical: 6,
            flexDirection: 'row', alignItems: 'center',
          }}>
            <Text className="text-[12px] font-medium text-[#757575] tracking-[0.1px]">
              {isVi
                ? 'Vị trí này được ước lượng dựa trên bán kính chia sẻ'
                : 'This location is estimated based on shared radius'}
            </Text>
          </BlurView>
        </View>
      </Animated.View>

      {/* Bottom Sheet */}
      <BottomSheet
        index={1}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        enableOverDrag={false}
        animatedPosition={animatedPosition}
        enablePanDownToClose={false}
        topInset={REQUIRED_TOP_INSET}
        backgroundStyle={{
          backgroundColor: 'white', borderRadius: 26, elevation: 20,
          shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1, shadowRadius: 10,
        }}
        handleIndicatorStyle={{ backgroundColor: '#E5E5EA', width: 48, height: 6 }}
        containerStyle={{ zIndex: 100, elevation: 100 }}
      >
        {isFocusingEstimatedPin && (
          <View className="absolute left-0 right-0 items-center justify-center" style={{ top: -65, zIndex: 9999, elevation: 99 }}>
            <LinearGradient
              colors={['#FFDDA2', '#FCF8ED']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{
                paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100,
                flexDirection: 'row', alignItems: 'center',
                shadowColor: '#E89B5A', shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3, shadowRadius: 6, elevation: 6,
                borderWidth: 1.5, borderColor: '#FFFFFF',
              }}
            >
              <Ionicons name="location" size={16} color="#E89B5A" style={{ marginRight: 6 }} />
              <Text className="text-[12px] font-medium text-black tracking-[0.1px]">
                {isVi
                  ? 'Vị trí này được ước lượng dựa trên bán kính chia sẻ'
                  : 'This location is estimated based on shared radius'}
              </Text>
            </LinearGradient>
          </View>
        )}

        <BottomSheetView
          className="pt-[12px] bg-white z-10"
          onLayout={(event) => {
            const { height } = event.nativeEvent.layout;
            if (height > 0) setHeaderHeight(height);
          }}
        >
          <Animated.View style={headerAnimatedStyle}>
            <View className="flex-row items-center justify-between flex-1 mx-[20px] pb-[12px]">
              <Image source={{ uri: petImage }} className="rounded-full mr-4" style={{ width: 60, height: 60 }} />
              <View className="flex-1">
                <View className="flex-row justify-between items-center">
                  <View className="flex-row items-center mb-2">
                    <Text className="text-[16px] font-semibold text-black mr-2">{pet.name || 'Unknown Pet'}</Text>
                    <View className="bg-[#FFE8E8] border border-[#DA5A5A]/25 py-1 px-[10px] rounded-full">
                      <Text className="text-[#DA5A5A] text-[10px] font-regular">
                        {reportData.status === 'PENDING' ? 'Lost' : 'Resolved'}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text className="text-[12px] text-[#757575] font-regular mb-2">
                  {getAge(pet.dob)} • {breedText || (isVi ? 'Chưa rõ giống' : 'Unknown breed')}
                </Text>
                <TouchableOpacity onPress={() => {
                  if (pet?.id) router.push(`/edit-pet?id=${pet.id}`);
                  else Alert.alert('Notice', 'Pet identity information not found.');
                }}>
                  <View className="flex-row items-center">
                    <Image className="bottom-1 mr-1" source={require('../assets/icon/pen.png')} style={{ width: 7, height: 8 }} resizeMode="cover" />
                    <Text className="text-[10px] text-[#8E8E93] mb-2 underline tracking-[0.06px]">
                      Edit pet information
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </BottomSheetView>

        <BottomSheetScrollView
          onScroll={handleScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20, paddingHorizontal: 24, paddingTop: 110 }}
        >
          <View className="bg-white">
            <Text className="text-[14px] font-semibold text-black leading-[16px] mb-[10px]">
              Owner Information
            </Text>
            <View className="flex justify-center items-center mb-4">
              <View className="bg-white border w-full border-[#E5E5E5] rounded-[16px] pt-[15px] pb-[21.15px]">
                <View className="mx-[15px]">
                  <View className="flex-row items-center pr-8 mb-6">
                    <Image className="mr-3 top-1" source={require('../assets/icon/person-gray.png')} style={{ width: 15, height: 15 }} resizeMode="cover" />
                    <View className="flex-row border-b border-[#E5E5E5] w-full pt-2 pb-1 justify-between">
                      <Text className="text-black text-[14px] font-medium leading-[16px]">Name</Text>
                      <Text className="text-[#8E8E93] text-[12px] font-regular leading-[16px]">{displayContactName}</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center pr-8 mb-6">
                    <Image className="mr-3 top-1" source={require('../assets/icon/phone-gray.png')} style={{ width: 15, height: 15 }} resizeMode="cover" />
                    <View className="flex-row border-b border-[#E5E5E5] w-full pt-2 pb-1 justify-between">
                      <Text className="text-black text-[14px] font-medium leading-[16px]">Phone</Text>
                      <Text className="text-[#8E8E93] text-[12px] font-regular leading-[16px]">{displayContactPhone}</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center pr-8 mb-4">
                    <Image className="mr-4 top-1" source={require('../assets/icon/location-gray.png')} style={{ width: 11, height: 15 }} resizeMode="cover" />
                    <View className="flex-row border-b border-[#E5E5E5] w-full pt-2 pb-1 justify-between">
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

          <Text className="text-[14px] font-semibold text-black mb-4 mt-2">Scan Activity</Text>
          <View className="ml-1 mb-6">
            {visibleActivities.map((activity, index, array) => (
              <TimelineItem
                key={activity.id}
                item={activity}
                isLast={index === array.length - 1}
                onLocationPress={handleTimelineLocationPress}
                onContactPress={handleTimelineContactPress}
                onReportPress={handleReportPress}
              />
            ))}
          </View>
        </BottomSheetScrollView>
      </BottomSheet>

      {/* Options modal */}
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
              style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 }}
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
                  setTimeout(() => setIsReportModalVisible(true), 200);
                }}
              >
                <Feather name="flag" size={14} color="#EF4444" style={{ marginRight: 8 }} />
                <Text className="ml-1 text-[13px] font-medium text-[#EF4444]">
                  {isVi ? 'Báo cáo nội dung này' : 'Report this content'}
                </Text>
              </TouchableOpacity>
            </View>
          </RNTouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      <ReportUGCModal
        isVisible={!!reportTarget}
        onClose={() => setReportTarget(null)}
        reportTargetName={reportTarget?.contactName || (isVi ? 'người dùng này' : 'this user')}
        allowModeration={isOwner}
        onSubmit={handleReportSubmit}
      />

      {
        selectedContact && (
          <ShelterContactModal
            isVisible={isContactModalVisible}
            onClose={() => setIsContactModalVisible(false)}
            shelterData={selectedContact}
          />
        )
      }
    </View >
  );
}