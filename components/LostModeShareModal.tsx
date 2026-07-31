import axiosClient from '@/api/axiosClient';
import { Text } from '@/components/AppText';
import { useImageUpload } from '@/hooks/useImageUpload';
import { Feather } from '@expo/vector-icons';
import { Slider } from '@miblanchard/react-native-slider';
import { BlurView } from 'expo-blur';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
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
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View
} from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Svg, { Rect } from 'react-native-svg';
import { TextInput } from './AppTextInput';

// Thêm import LanguageContext
import { useLanguage } from '@/contexts/LanguageContext';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const MODAL_MAP_WIDTH = Math.round(SCREEN_WIDTH * 0.9 - 48);
const MODAL_MAP_HEIGHT = 178; // Tương ứng h-[178px]
const MIN_RADIUS = 100;
const MAX_RADIUS = 2000;
const RADIUS_STEP = 100;

// Yêu cầu 1: Không ép Google Maps trên iOS. Modal map nhẹ + bản đồ ở report-lost-pet đang active
// cùng lúc là tổ hợp dễ gây OOM OpenGL nhất trên iOS, nên modal map BẮT BUỘC phải dùng Apple Maps.
const MAP_PROVIDER = Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined;

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
  images?: string[];
}

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
  // Khởi tạo ngôn ngữ
  const { t, language } = useLanguage();
  const isVi = language === 'vi';

  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [radius, setRadius] = useState<number>(500);
  const [loadingMap, setLoadingMap] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const { width } = useWindowDimensions();
  const imageSize = (width - 40 - 48) / 5;
  const { pickAndUploadImage, isUploading } = useImageUpload();
  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };
  const [photos, setPhotos] = useState<string[]>([]);
  const [formData, setFormData] = useState<FormData>({
    scannedBy: '',
    phoneNumber: '',
    message: '',
  });

  const handleAddPhoto = async () => {
    const remainingSlots = 4 - photos.length;

    if (remainingSlots <= 0) {
      Alert.alert(
        isVi ? "Giới hạn ảnh" : "Photo Limit",
        isVi ? "Bạn chỉ có thể chọn tối đa 5 ảnh." : "You can only select up to 5 photos."
      );
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newUris = result.assets.map(asset => asset.uri);
        setPhotos((prev) => [...prev, ...newUris]);
      }
    } catch (error) {
      console.error(isVi ? "Lỗi khi chọn ảnh: " : "Error selecting photo: ", error);
      Alert.alert(
        isVi ? "Lỗi" : "Error",
        isVi ? "Không thể mở thư viện ảnh." : "Cannot open photo library."
      );
    }
  };

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
          isVi ? "Cấp quyền vị trí" : "Location Permission",
          isVi ? "Ứng dụng cần quyền truy cập vị trí để chia sẻ. Vui lòng bật trong Cài đặt." : "App needs location access to share. Please enable it in Settings.",
          [
            { text: isVi ? "Hủy" : "Cancel", style: "cancel" },
            { text: isVi ? "Mở Cài đặt" : "Open Settings", onPress: () => Linking.openSettings() }
          ]
        );
        if (isMounted) setLoadingMap(false);
        return;
      }

      const locationPromise = Location.getCurrentPositionAsync({});
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 8000));

      const currentLocation: any = await Promise.race([locationPromise, timeoutPromise]);

      if (isMounted) {
        setLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });
      }

    } catch (error) {
      console.error(isVi ? "Lỗi khi lấy vị trí:" : "Error getting location:", error);
      Alert.alert(
        isVi ? "Lỗi" : "Error",
        isVi ? "Không thể lấy vị trí hiện tại. Vui lòng thử lại." : "Cannot get current location. Please try again."
      );
    } finally {
      if (isMounted) setLoadingMap(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (isVisible) {
      fetchLocation(isMounted);
    } else {
      // Reset state khi đóng modal. Vì MapView bên dưới chỉ render khi isVisible === true,
      // việc set isVisible=false ở component cha sẽ unmount luôn MapView của modal,
      // giải phóng OpenGL context trên iOS ngay khi đóng.
      setFormData({ scannedBy: '', phoneNumber: '', message: '' });
      setRadius(500);
      setLocation(null);
    }

    return () => {
      isMounted = false;
    };
  }, [isVisible]);

  const handleConfirm = async () => {
    Keyboard.dismiss();

    if (!location) {
      Alert.alert(
        isVi ? "Thiếu vị trí" : "Missing Location",
        isVi ? "Đang tải vị trí hoặc không thể lấy vị trí của bạn." : "Fetching location or cannot get your location."
      );
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const uploadedImageUrls: string[] = [];

      for (const uri of photos) {
        if (uri.startsWith('http')) {
          uploadedImageUrls.push(uri);
        } else {
          const fileName = uri.split('/').pop() || `scan-${Date.now()}.jpg`;
          const match = /\.(\w+)$/.exec(fileName);
          const ext = match ? match[1].toLowerCase() : 'jpg';
          const fileType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

          const presignedRes = await axiosClient.post('/storage/presigned-url', {
            fileName,
            fileType,
            folder: 'tag-reports',
          });

          const { uploadUrl, fileUrl } = presignedRes.data;

          const response = await fetch(uri);
          const blob = await response.blob();

          const uploadRes = await FileSystem.uploadAsync(uploadUrl, uri, {
            httpMethod: 'PUT',
            headers: {
              'Content-Type': fileType,
            },
          });

          if (uploadRes.status !== 200 && uploadRes.status !== 201) {
            throw new Error(`Upload to R2 failed: ${uploadRes.status}`);
          }

          uploadedImageUrls.push(fileUrl);
        }
      }

      const finalFormData: FormData = {
        ...formData,
        images: uploadedImageUrls,
      };

      const locationData = { ...location, radius };

      onConfirm(locationData, finalFormData, false);

    } catch (error) {
      console.error(isVi ? "Lỗi upload ảnh R2:" : "Error uploading to R2:", error);
      Alert.alert(
        isVi ? "Lỗi" : "Error",
        isVi ? "Không thể tải ảnh lên hệ thống lưu trữ. Vui lòng thử lại." : "Failed to upload photos to storage. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSliderChange = (value: number | number[]) => {
    const numericValue = Array.isArray(value) ? value[0] : value;
    setRadius(numericValue);
  };

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
                  <Text className="text-[18px] font-semibold text-black text-center leading-[22px] w-full z-10">
                    {isVi ? 'Chia sẻ vị trí của tôi' : 'Share My Location'}
                  </Text>
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
                  keyboardShouldPersistTaps="handled"
                >
                  {/* MAP VIEW */}
                  <View className="px-6">
                    <View className="bg-white rounded-[24px]" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2, elevation: 8 }}>
                      <View className="w-full h-[178px] rounded-[20px] overflow-hidden bg-gray-100 relative justify-center items-center border border-gray-100">
                        {loadingMap ? (
                          <View className="items-center justify-center p-4">
                            <ActivityIndicator color="#FF9C56" size="small" />
                            <Text className="text-gray-400 text-xs mt-2 text-center">
                              {isVi ? 'Đang tải vị trí...' : 'Fetching location...'}
                            </Text>
                          </View>
                        ) : location && isVisible ? (
                          // isVisible gate đảm bảo MapView chỉ tồn tại khi modal đang mở thật sự,
                          // tránh map này tồn tại song song với map full-screen của report-lost-pet trên iOS.
                          <MapView
                            provider={MAP_PROVIDER}
                            mapType="standard"
                            userInterfaceStyle="light"
                            showsMyLocationButton={false}
                            showsCompass={false}
                            showsBuildings={true}
                            style={{ width: '100%', height: '100%' }}
                            region={{
                              latitude: location.latitude,
                              longitude: location.longitude,
                              latitudeDelta: (radius / 111320) * 3,
                              longitudeDelta: (radius / 111320) * 3,
                            }}
                            scrollEnabled={false}
                            zoomEnabled={false}
                            pitchEnabled={false}
                            rotateEnabled={false}
                            showsUserLocation={false}
                          >
                            <Circle
                              center={{ latitude: location.latitude, longitude: location.longitude }}
                              radius={radius}
                              fillColor="rgba(255, 156, 86, 0.2)"
                              strokeColor="rgba(255, 156, 86, 0.8)"
                              strokeWidth={1.5}
                            />
                            <Marker coordinate={{ latitude: location.latitude, longitude: location.longitude }}>
                              <View className="w-4 h-4 bg-[#EF4444] rounded-full border-2 border-white" style={{ elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3 }} />
                            </Marker>
                          </MapView>
                        ) : (
                          <TouchableOpacity activeOpacity={0.7} className="items-center justify-center p-4 w-full h-full" onPress={() => fetchLocation(true)}>
                            <View className="w-12 h-12 rounded-full bg-gray-200/70 items-center justify-center mb-2">
                              <Feather name="map-pin" size={20} color="#9CA3AF" />
                            </View>
                            <Text className="text-gray-400 text-xs font-medium text-center px-4">
                              {isVi ? 'Chạm để bật dịch vụ vị trí' : 'Tap to enable location services'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* SLIDER RADIUS */}
                  <View className="px-12">
                    {(() => {
                      const percent = ((radius - MIN_RADIUS) / (MAX_RADIUS - MIN_RADIUS)) * 100;
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
                            minimumValue={MIN_RADIUS} maximumValue={MAX_RADIUS} step={RADIUS_STEP}
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
                    <View className="flex-row items-center pr-8">
                      <Image className='mr-3 top-1' source={require('../assets/icon/phone-gray.png')} style={{ width: 15, height: 15 }} resizeMode="cover" />
                      <View className='flex-row border-b border-gray-300 w-full pt-2 pb-1'>
                        <Text className="text-[14px] font-medium text-black">
                          {isVi ? 'Số điện thoại' : 'Phone Number'}<Text className="text-[#EF4444]"></Text>
                        </Text>
                        <TextInput
                          placeholder="0123456789"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="phone-pad"
                          className="flex-1 text-[14px] text-[#1C1C1E] p-0 text-right"
                          value={formData.phoneNumber}
                          onChangeText={(t) => setFormData({ ...formData, phoneNumber: t })}
                          style={{ fontFamily: "Urbanist" }}
                        />
                      </View>
                    </View>

                    <View className="flex-row items-center pr-8 mt-1">
                      <Image className='mr-3 top-1' source={require('../assets/icon/person-gray.png')} style={{ width: 15, height: 15 }} resizeMode="cover" />
                      <View className='flex-row border-b border-gray-300 w-full pt-2 pb-1'>
                        <Text className="text-[14px] font-medium text-black">
                          {isVi ? 'Tên của bạn' : 'Your Name'}
                        </Text>
                        <TextInput
                          placeholder={isVi ? "Nguyễn Văn A" : "Sarah John"}
                          placeholderTextColor="#9CA3AF"
                          className="flex-1 text-[14px] text-[#1C1C1E] p-0 text-right"
                          value={formData.scannedBy}
                          onChangeText={(t) => setFormData({ ...formData, scannedBy: t })}
                          style={{ fontFamily: "Urbanist" }}
                        />
                      </View>
                    </View>

                    <View className="flex-row items-center pr-8 mt-2">
                      <Image className='mr-3' source={require('../assets/icon/note-gray.png')} style={{ width: 15, height: 15 }} resizeMode="cover" />
                      <View className='flex-row border-b border-gray-300 w-full pt-2 pb-1'>
                        <Text className="text-[14px] font-medium text-black">
                          {isVi ? 'Ghi chú' : 'Notes'}
                        </Text>
                        <TextInput
                          placeholder={isVi ? "Để lại một ghi chú ngắn" : "Leave a short note"}
                          placeholderTextColor="#9CA3AF"
                          className="flex-1 text-[14px] text-[#1C1C1E] p-0 text-right"
                          value={formData.message}
                          onChangeText={(t) => setFormData({ ...formData, message: t })}
                          style={{ fontFamily: "Urbanist" }}
                        />
                      </View>
                    </View>

                    <View className='mt-1 flex-row flex-wrap gap-3 mt-2"'>
                      {photos.length === 0 ? (
                        <TouchableOpacity
                          onPress={handleAddPhoto}
                          activeOpacity={0.7}
                          className="bg-white w-full rounded-[12px] items-center justify-center mt-1 relative overflow-hidden"
                        >
                          <View className="w-full" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                            <Svg width="100%" height="100%">
                              <Rect
                                width="100%"
                                height="100%"
                                fill="none"
                                stroke="#D1D5DB"
                                strokeWidth={2}
                                rx={16}
                                strokeDasharray="5, 5"
                              />
                            </Svg>
                          </View>

                          <View className="flex-row items-center justify-center py-5">
                            <Image
                              className='mr-3'
                              source={require('../assets/icon/upload.png')}
                              style={{ width: 15, height: 15 }}
                              resizeMode="cover"
                            />
                            <Text className="text-[12px] text-black font-medium">
                              {isVi ? 'Tải ảnh lên' : 'Upload photos'}
                            </Text>
                          </View>

                        </TouchableOpacity>
                      ) : (
                        <>
                          {photos.map((uri, index) => (
                            <View key={index} className="relative" style={{ width: imageSize, height: imageSize }}>
                              <Image
                                source={{ uri }}
                                className="w-full h-full rounded-[14px] bg-[#F3F4F6]"
                              />
                              <TouchableOpacity
                                onPress={() => handleRemovePhoto(index)}
                                activeOpacity={0.7}
                                className="absolute -top-2 -right-2 w-6 h-6 rounded-full items-center justify-center"
                                style={{ elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3 }}
                              >
                                <LinearGradient
                                  colors={['rgba(221, 221, 221, 0.3)', 'rgba(247, 247, 247, 0.7)', '#FFFFFF']}
                                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                  locations={[0, 0.3, 1]}

                                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 9999 }}
                                />
                                <X size={10} color="#000000" strokeWidth={3} />
                              </TouchableOpacity>
                            </View>
                          ))}

                          {photos.length < 4 && (
                            <TouchableOpacity
                              onPress={handleAddPhoto}
                              activeOpacity={0.7}
                              disabled={isUploading}
                              className="bg-[#F9FAFB] border-[1.5px] border-dashed border-[#E5E5E5] rounded-[14px] items-center justify-center"
                              style={{ width: imageSize, height: imageSize }}
                            >
                              {isUploading ? (
                                <ActivityIndicator size="small" color="#9CA3AF" />
                              ) : (
                                <Image
                                  source={require('../assets/icon/upload-gray.png')}
                                  className="w-[18px] h-[18px]"
                                />
                              )}
                            </TouchableOpacity>
                          )}
                        </>
                      )}

                    </View>
                  </View>

                  {/* BUTTONS */}
                  <View className="px-5 mt-6 flex-row gap-3">
                    <TouchableOpacity onPress={onClose} className="flex-1 rounded-[16px] border border-[#E5E5E5] py-3.5 items-center">
                      <Text className="text-[#8E8E93] text-[14px] font-regular">
                        {isVi ? 'Hủy' : 'Cancel'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleConfirm} className="flex-1 bg-[#E89B5A] py-3.5 rounded-[16px] items-center justify-center" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <Text className="text-white text-[14px] font-semibold items-center">
                          {isVi ? 'Gửi' : 'Send'}
                        </Text>
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