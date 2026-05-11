import { Text } from '@/components/AppText';
import { Feather } from '@expo/vector-icons';
import { Slider } from '@miblanchard/react-native-slider';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import Svg, { Rect } from 'react-native-svg';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const MODAL_MAP_WIDTH = Math.round(SCREEN_WIDTH * 0.9 - 48);
const MODAL_MAP_HEIGHT = 178; // Tương ứng h-[178px]
const getMetersPerPixel = (latitude: number, zoom: number) => {
  return (156543.03392 * Math.cos((latitude * Math.PI) / 180)) / Math.pow(2, zoom);
};
const getOptimalZoom = (radius: number, latitude: number, mapWidth: number) => {
  if (radius <= 5) return 15;
  const targetDiameterPx = mapWidth * 0.7;
  const targetMetersPerPx = (radius * 2) / targetDiameterPx;
  const zoom = Math.log2((156543.03392 * Math.cos((latitude * Math.PI) / 180)) / targetMetersPerPx);
  return Math.max(10, Math.min(16, zoom));
};
export interface FormData {
  scannedBy: string;
  phoneNumber: string;
  message: string;
}

// Bổ sung Type cho Location thay vì dùng `any`
export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface LostModeShareModalProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: (location: LocationCoords & { radius: number }, formData: FormData, isSkipped: boolean) => void;
}

export default function LostModeShareModal({ isVisible, onClose, onConfirm }: LostModeShareModalProps) {
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [radius, setRadius] = useState<number>(500);
  const [loadingMap, setLoadingMap] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false); // Tránh double-click

  const [formData, setFormData] = useState<FormData>({
    scannedBy: '',
    phoneNumber: '',
    message: '',
  });

  const fetchLocation = async (isMounted: boolean = true) => {
    setLoadingMap(true);

    try {
      let { status } = await Location.getForegroundPermissionsAsync();

      if (status !== 'granted') {
        const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
        status = newStatus;
      }

      if (status !== 'granted') {
        Alert.alert(
          "Cấp quyền vị trí",
          "Ứng dụng cần quyền truy cập vị trí để chia sẻ. Vui lòng bật trong Cài đặt.",
          [
            { text: "Hủy", style: "cancel" },
            { text: "Mở Cài đặt", onPress: () => Linking.openSettings() }
          ]
        );
        if (isMounted) setLoadingMap(false);
        return;
      }

      const locationPromise = Location.getCurrentPositionAsync({});
      // Giảm timeout xuống 8s để UX tốt hơn, tránh user đợi quá lâu
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 8000));

      const currentLocation: any = await Promise.race([locationPromise, timeoutPromise]);

      if (isMounted) {
        setLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });
      }

    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert("Lỗi", "Không thể lấy vị trí hiện tại. Vui lòng thử lại.");
    } finally {
      if (isMounted) setLoadingMap(false);
    }
  };

  useEffect(() => {
    let isMounted = true; // Cleanup function pattern để tránh memory leak
    if (isVisible) {
      fetchLocation(isMounted);
    } else {
      // Reset state khi đóng modal
      setFormData({ scannedBy: '', phoneNumber: '', message: '' });
      setRadius(500);
    }

    return () => {
      isMounted = false;
    };
  }, [isVisible]);

  const handleConfirm = () => {
    Keyboard.dismiss(); // Ẩn bàn phím trước khi xử lý

    // Validate dữ liệu đầu vào bắt buộc
    if (!formData.phoneNumber.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập Số điện thoại để chủ thú cưng có thể liên hệ.");
      return;
    }

    if (!location) {
      Alert.alert("Thiếu vị trí", "Đang tải vị trí hoặc không thể lấy vị trí của bạn.");
      return;
    }

    if (isSubmitting) return; // Chặn spam click

    setIsSubmitting(true);
    const locationData = { ...location, radius };

    // Gọi callback, parent component (như Scan Screen) sẽ xử lý gọi API NestJS ở đây
    onConfirm(locationData, formData, false);
    setIsSubmitting(false);
  };

  const handleSliderChange = (value: number | number[]) => {
    const numericValue = Array.isArray(value) ? value[0] : value;
    setRadius(numericValue);
  };

  const currentLat = location?.latitude || 21.028511;
  const currentLng = location?.longitude || 105.804817;
  const zoomLevel = 14;

  const metersPerPx = getMetersPerPixel(currentLat, zoomLevel);
  const exactCircleSize = (radius / metersPerPx) * 2;
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <BlurView
          intensity={30}
          tint="dark"
          className="flex-1 justify-center items-center bg-black/40 px-6">

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="w-full items-center"
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View className="bg-white w-[90%] rounded-[30px] relative mt-8 border border-[#FF9C56]">
                <View className="px-5 items-center mt-6 relative">
                  <Text className="text-[18px] font-semibold text-black text-center leading-[22px] w-full z-10">Share My Location</Text>
                </View>
                {/* ICON HEADER */}
                <View className="absolute -top-[35px] self-center w-[73px] h-[73px] -z-10">
                  <View className="absolute top-0 w-[73px] h-[36.5px] bg-white border-t-[1px] border-l-[1px] border-r-[1px] border-[#E89B5A] rounded-t-[40px]" />
                  <View className="absolute bottom-0 w-[73px] h-[36.6px] bg-white border-b-[1px] border-l-[1px] border-r-[1px] border-white rounded-b-[40px]" />
                  <View className="absolute inset-0 items-center justify-center">
                    <Image
                      className='left-[1px] bottom-1'
                      source={require('../assets/icon/share-location-icon.png')}
                      style={{ width: 31.5, height: 31.5 }}
                      resizeMode="cover"
                    />
                  </View>
                </View>



                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20, paddingTop: 15 }}
                  keyboardShouldPersistTaps="handled" // Giúp bấm nút Send không bị miss khi đang mở bàn phím
                >
                  {/* MAP VIEW */}
                  <View className="px-6">
                    <View className="bg-white rounded-[24px]" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2, elevation: 8 }}>
                      <View className="w-full h-[178px] rounded-[20px] overflow-hidden bg-gray-100 relative justify-center items-center border border-gray-100">
                        {loadingMap ? (
                          <View className="items-center justify-center p-4">
                            <ActivityIndicator color="#FF9C56" size="small" />
                            <Text className="text-gray-400 text-xs mt-2 text-center">Fetching location...</Text>
                          </View>
                        ) : location ? (
                          <>
                            <Image
                              source={{
                                // Thay số 14 ở link Mapbox thành biến ZOOM_LEVEL
                                uri: `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+EF4444(${location.longitude},${location.latitude})/${location.longitude},${location.latitude},${zoomLevel},0/400x200@2x?access_token=${process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN}`
                              }}
                              style={{ width: '100%', height: '100%', position: 'absolute' }}
                            />
                            <View
                              style={{
                                // Dùng exactCircleSize thay vì circleSize
                                width: exactCircleSize,
                                height: exactCircleSize,
                                borderRadius: exactCircleSize / 2,
                                backgroundColor: 'rgba(255, 156, 86, 0.2)',
                                borderColor: 'rgba(255, 156, 86, 0.6)',
                                borderWidth: 1.5,
                                position: 'absolute',
                              }}
                            />
                          </>
                        ) : (
                          <TouchableOpacity activeOpacity={0.7} className="items-center justify-center p-4 w-full h-full" onPress={() => fetchLocation(true)}>
                            <View className="w-12 h-12 rounded-full bg-gray-200/70 items-center justify-center mb-2">
                              <Feather name="map-pin" size={20} color="#9CA3AF" />
                            </View>
                            <Text className="text-gray-400 text-xs font-medium text-center px-4">Tap to enable location services</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* SLIDER RADIUS */}
                  <View className="px-12">
                    {(() => {
                      const percent = ((radius - 100) / 4900) * 100;
                      return (
                        <View style={{ height: 40, justifyContent: 'center', position: 'relative' }}>
                          <LinearGradient
                            colors={['#FFD8B2', '#FF9C56', '#D84315']}
                            start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
                            style={{ position: 'absolute', left: 0, right: 0, height: 2, borderRadius: 1 }}
                          />
                          <View style={{ position: 'absolute', right: 0, width: `${100 - percent}%`, height: 2, backgroundColor: '#E5E7EB', borderRadius: 1 }} />
                          <Slider
                            value={radius}
                            minimumValue={100} maximumValue={5000} step={100}
                            onValueChange={handleSliderChange}
                            minimumTrackTintColor="transparent" maximumTrackTintColor="transparent"
                            trackStyle={{ height: 2, backgroundColor: 'transparent' }}
                            thumbStyle={{ width: 14.35, height: 14.35, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.25, shadowRadius: 2, elevation: 4 }}
                          />
                        </View>
                      );
                    })()}
                    <Text className="text-[#8E8E93] font-regular text-[10px] text-center -mt-2">
                      {radius < 1000 ? `${Math.round(radius)}m` : `${(radius / 1000).toFixed(1)} km`}
                    </Text>
                  </View>

                  {/* FORM INPUTS */}
                  <View className="px-5 mt-3 gap-y-3">
                    {/* Phone Number */}
                    <View className="flex-row items-center pr-8">
                      <Image className='mr-3 top-1' source={require('../assets/icon/phone-gray.png')} style={{ width: 15, height: 15 }} resizeMode="cover" />
                      <View className='flex-row border-b border-gray-300 w-full pt-2 pb-1'>
                        <Text className="text-[14px] font-medium text-black">Phone Number<Text className="text-[#EF4444]"> *</Text></Text>
                        <TextInput
                          placeholder="0123456789"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="phone-pad" // Hiển thị bàn phím số
                          className="flex-1 text-[14px] text-[#1C1C1E] p-0 text-right"
                          value={formData.phoneNumber}
                          onChangeText={(t) => setFormData({ ...formData, phoneNumber: t })}
                          style={{ fontFamily: "Urbanist" }}
                        />
                      </View>
                    </View>

                    {/* Name */}
                    <View className="flex-row items-center pr-8 mt-1">
                      <Image className='mr-3 top-1' source={require('../assets/icon/person-gray.png')} style={{ width: 15, height: 15 }} resizeMode="cover" />
                      <View className='flex-row border-b border-gray-300 w-full pt-2 pb-1'>
                        <Text className="text-[14px] font-medium text-black">Your Name</Text>
                        <TextInput
                          placeholder="Sarah John"
                          placeholderTextColor="#9CA3AF"
                          className="flex-1 text-[14px] text-[#1C1C1E] p-0 text-right"
                          value={formData.scannedBy}
                          onChangeText={(t) => setFormData({ ...formData, scannedBy: t })}
                          style={{ fontFamily: "Urbanist" }}
                        />
                      </View>
                    </View>

                    {/* Message */}
                    <View className="flex-row items-center pr-8 mt-2">
                      <Image className='mr-3' source={require('../assets/icon/note-gray.png')} style={{ width: 15, height: 15 }} resizeMode="cover" />
                      <View className='flex-row border-b border-gray-300 w-full pt-2 pb-1'>
                        <Text className="text-[14px] font-medium text-black">Notes</Text>
                        <TextInput
                          placeholder="Leave a short note"
                          placeholderTextColor="#9CA3AF"
                          className="flex-1 text-[14px] text-[#1C1C1E] p-0 text-right"
                          value={formData.message}
                          onChangeText={(t) => setFormData({ ...formData, message: t })}
                          style={{ fontFamily: "Urbanist" }}
                        />
                      </View>
                    </View>


                    <View className='mt-1'>
                      <TouchableOpacity
                        onPress={() => { }}
                        activeOpacity={0.7}
                        // Xóa các class border cũ đi, thêm relative để chứa SVG
                        className="bg-white rounded-[12px] items-center justify-center mt-1 relative overflow-hidden"
                      >
                        {/* --- BẮT ĐẦU: KHỐI SVG VẼ VIỀN NÉT ĐỨT --- */}
                        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                          <Svg width="100%" height="100%">
                            <Rect
                              width="100%"
                              height="100%"
                              fill="none"
                              stroke="#D1D5DB" // Màu viền
                              strokeWidth={2}  // Độ dày của viền (tùy chỉnh)
                              rx={16}          // Độ bo góc (phải khớp với rounded-[12px])
                              // THẦN CHÚ NẰM Ở ĐÂY: [Chiều dài nét đứt, Khoảng cách gap]
                              strokeDasharray="5, 5"
                            />
                          </Svg>
                        </View>
                        {/* --- KẾT THÚC --- */}

                        {/* Nội dung bên trong giữ nguyên */}
                        <View className="flex-row items-center justify-center py-5">
                          <Image
                            className='mr-3'
                            source={require('../assets/icon/upload.png')}
                            style={{ width: 15, height: 15 }}
                            resizeMode="cover"
                          />
                          <Text className="text-[12px] text-black font-medium">
                            Upload photos
                          </Text>
                        </View>

                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* BUTTONS */}
                  <View className="px-5 mt-6 flex-row gap-3">
                    <TouchableOpacity onPress={onClose} className="flex-1 rounded-[16px] border border-[#E5E5E5] py-3.5 items-center">
                      <Text className="text-[#8E8E93] text-[14px] font-regular">Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleConfirm} className="flex-1 bg-[#E89B5A] py-3.5 rounded-[16px] items-center" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <Text className="text-white text-[14px] font-semibold">Send</Text>
                      )}
                    </TouchableOpacity>
                  </View>

                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </BlurView>
      </TouchableWithoutFeedback>
    </Modal>
  );
}