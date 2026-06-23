import { Text } from '@/components/AppText';
import { TextInput } from '@/components/AppTextInput';
import { useLanguage } from '@/contexts/LanguageContext';
import { useImageUpload } from '@/hooks/useImageUpload';
import { petService } from '@/services/petService';
import { Feather, Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useQueryClient } from '@tanstack/react-query';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  DeviceEventEmitter,
  Dimensions,
  Easing,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useModalStore } from '../store/useModalStore';

interface LocItem {
  code: number;
  name: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_GAP = 8; // tương ứng gap-2
const PHOTO_COLUMNS = 5;
const PHOTO_SECTION_PADDING = 40; // px-20 (20px mỗi bên) của ScrollView contentContainerStyle
const PHOTO_SIZE = (SCREEN_WIDTH - PHOTO_SECTION_PADDING - PHOTO_GAP * (PHOTO_COLUMNS - 1)) / PHOTO_COLUMNS;

// Yêu cầu 1: Không ép Google Maps trên iOS, fallback về Apple Maps native (nhẹ, không tốn OpenGL context).
const MAP_PROVIDER = Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined;

// --- CÁC COMPONENT PHỤ TRỢ CHO POPUP ĐỊA CHỈ ---
const Label = ({ text, required = false }: { text: string; required?: boolean }) => (
  <Text className="text-[#8E8E93] text-[14px] font-medium mb-2 mt-4">
    {text} {required && <Text className="text-red-500">*</Text>}
  </Text>
);

const CustomInput = ({ value, onChangeText, placeholder }: { value?: string; onChangeText?: (text: string) => void; placeholder?: string }) => (
  <View>
    <TextInput
      className="w-full bg-white border border-[#E5E5E5] rounded-2xl px-4 text-black h-14"
      placeholder={placeholder}
      placeholderTextColor="#9CA3AF"
      value={value}
      onChangeText={onChangeText}
      style={{ fontFamily: "Urbanist" }}
    />
  </View>
);

const CustomDropdown = ({ placeholder, value, options = [], onSelect }: { placeholder: string; value?: string; options?: string[]; onSelect?: (val: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View>
      <TouchableOpacity
        onPress={() => setIsOpen((prev) => !prev)}
        activeOpacity={0.7}
        className={`w-full bg-white border border-[#E5E5E5] rounded-2xl h-14 px-4 flex-row items-center justify-between ${isOpen ? 'border-[#E89B5A]' : ''}`}
      >
        <Text className={`${value ? 'text-black' : 'text-[#9CA3AF]'} text-[14px] font-medium`} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={20} color="#9CA3AF" />
      </TouchableOpacity>

      {isOpen && (
        <View
          className="w-full bg-white border border-[#E5E5E5] rounded-2xl mt-2 overflow-hidden"
          style={{ maxHeight: 220 }}
        >
          {options.length === 0 ? (
            <View className="px-4 py-4">
              <Text className="text-[13px] text-[#9CA3AF] italic">Không có lựa chọn nào</Text>
            </View>
          ) : (
            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
              {options.map((item) => {
                const isSelected = item === value;
                return (
                  <TouchableOpacity
                    key={item}
                    className={`px-4 py-3.5 border-b border-gray-50 flex-row items-center justify-between ${isSelected ? 'bg-orange-50' : ''}`}
                    onPress={() => {
                      if (onSelect) onSelect(item);
                      setIsOpen(false);
                    }}
                  >
                    <Text className={`text-[14px] ${isSelected ? 'text-[#E89B5A] font-bold' : 'text-gray-700'}`}>
                      {item}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={18} color="#E89B5A" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
};


export default function ReportLostPetScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { t, language } = useLanguage();
  const isVi = language === 'vi';
  const showModal = useModalStore((state) => state.showModal);

  // --- API State ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { pickAndUploadImage, isUploading } = useImageUpload();

  // --- Form States ---
  const [location, setLocation] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [details, setDetails] = useState('');

  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerAddress, setOwnerAddress] = useState('');
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  // --- NÂNG CẤP: DATE PICKER STATES & REFS (IOS & ANDROID) ---
  const [lostDate, setLostDate] = useState<Date>(new Date());

  // Dành riêng cho Android Native Modal
  const [isAndroidDatePickerVisible, setAndroidDatePickerVisibility] = useState(false);

  // Dành riêng cho iOS Glassmorphism
  const scrollViewRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const datetimeRef = useRef<View>(null);

  const [activePicker, setActivePicker] = useState<'datetime' | null>(null);
  const [pickerLayout, setPickerLayout] = useState({ x: 0, y: 0, width: 340 });
  const pickerOpacity = useRef(new Animated.Value(0)).current;
  const pickerTranslateY = useRef(new Animated.Value(-8)).current;

  // --- ADDRESS POPUP STATE & LOGIC ---
  const [showAddressPopup, setShowAddressPopup] = useState(false);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [wardOptions, setWardOptions] = useState<string[]>([]);

  const [tempCity, setTempCity] = useState('');
  const [tempWard, setTempWard] = useState('');
  const [tempDetail, setTempDetail] = useState('');

  // Yêu cầu 2: Unmount "ép buộc" MapView của màn hình này trước khi push sang select-last-seen-location,
  // tránh việc 2 MapView (1 ở đây, 1 ở màn đích) cùng tồn tại trong lúc animation chuyển trang trên iOS.
  const [isNavigatingAway, setIsNavigatingAway] = useState(false);

  // Khi quay lại màn hình này (back từ select-last-seen-location), reset để map hiện lại.
  useFocusEffect(
    useCallback(() => {
      setIsNavigatingAway(false);
      return () => { };
    }, [])
  );

  const handleGoToMap = () => {
    setIsNavigatingAway(true);

    setTimeout(() => {
      router.push({
        pathname: '/select-last-seen-location',
        params: { petId, petName, petAvatar, petBreed, petAge, lostDateStr: lostDate.toISOString() }
      });
    }, 80);
  };

  // 1. Fetch danh sách Tỉnh/Thành
  useEffect(() => {
    fetch('https://provinces.open-api.vn/api/v2/p/')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const formattedProvinces = data
            .map((p: any) => ({
              ...p,
              name: p.name.replace(/^(Thành phố |Tỉnh )/i, '')
            }))
            .sort((a: any, b: any) => a.name.localeCompare(b.name, 'vi'));

          setProvinces(formattedProvinces);
        }
      })
      .catch(e => console.error(isVi ? "Lỗi fetch tỉnh/thành phố:" : "Error fetching province/city:", e));
  }, []);

  const cityOptions = provinces.map((c: any) => c.name);

  // 2. Fetch danh sách Phường/Xã
  useEffect(() => {
    if (!tempCity) {
      setWardOptions([]);
      return;
    }

    const selectedProvince = provinces.find((p: any) => p.name === tempCity);

    if (selectedProvince && selectedProvince.code) {
      fetch(`https://provinces.open-api.vn/api/v2/w/?province=${selectedProvince.code}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            const allWards = data.map((ward: any) => ward.name);
            setWardOptions(allWards);
          }
        })
        .catch(e => console.error(isVi ? "Lỗi fetch chi tiết phường/xã:" : "Error fetching ward/commune details:", e));
    }
  }, [tempCity, provinces]);

  const handleConfirmAddress = () => {
    if (!tempCity || !tempWard) {
      Alert.alert(isVi ? "Thiếu thông tin" : "Missing information", isVi ? "Vui lòng chọn Tỉnh/Thành phố và Phường/Xã." : "Please select Province/City and Ward/Commune.");
      return;
    }

    let fullAddress = `${tempWard}, ${tempCity}`;
    if (tempDetail.trim()) {
      fullAddress = `${tempDetail.trim()}, ${fullAddress}`;
    }

    setOwnerAddress(fullAddress);
    setShowAddressPopup(false);
  };

  const {
    petId, petName, petAvatar, petBreed, petAge,
    petShelterName,
    petShelterPhone,
    petShelterAddress,
    selectedMapAddress,
    selectedLatitude,
    selectedLongitude,
    selectedRadius
  } = useLocalSearchParams<{
    petId: string;
    petName: string;
    petAvatar: string;
    petBreed?: string;
    petAge?: string;
    petShelterName?: string;
    petShelterPhone?: string;
    petShelterAddress?: string;
    selectedMapAddress?: string;
    selectedLatitude?: string;
    selectedLongitude?: string;
    selectedRadius?: string;
  }>();

  const [mapLat, setMapLat] = useState<number | null>(null);
  const [mapLng, setMapLng] = useState<number | null>(null);
  const [mapRadius, setMapRadius] = useState<number>(500);
  const [mapAddress, setMapAddress] = useState<string>('');

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('onLocationSelected', (data) => {
      if (data) {
        setMapLat(data.latitude ? parseFloat(data.latitude) : null);
        setMapLng(data.longitude ? parseFloat(data.longitude) : null);
        setMapRadius(data.radius ? parseFloat(data.radius) : 500);
        setMapAddress(data.address || '');
        setLocation(data.address || '');
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (petShelterName && petShelterName !== 'not updated') setOwnerName(petShelterName);
    if (petShelterPhone && petShelterPhone !== 'not updated') setOwnerPhone(petShelterPhone);
    if (petShelterAddress && petShelterAddress !== 'not updated') setOwnerAddress(petShelterAddress);
  }, [petShelterName, petShelterPhone, petShelterAddress]);

  useEffect(() => {
    if (selectedMapAddress) setLocation(selectedMapAddress);
  }, [selectedMapAddress]);

  // --- HANDLERS CHO DROPDOWN KÍNH MỜ (IOS) ---
  const openDropdownPicker = (type: 'datetime') => {
    Keyboard.dismiss();

    if (contentRef.current && datetimeRef.current) {
      datetimeRef.current.measureLayout(
        contentRef.current,
        (left, top, width, height) => {
          // Tự động cuộn ScrollView (trừ đi 120px)
          scrollViewRef.current?.scrollTo({ y: Math.max(0, top - 120), animated: true });

          setTimeout(() => {
            datetimeRef.current?.measureInWindow((x, windowY, w, h) => {
              const dropdownWidth = 340;
              const finalX = (SCREEN_WIDTH - dropdownWidth) / 2; // Luôn căn giữa tuyệt đối ngang

              setPickerLayout({ x: finalX, y: windowY + h + 8, width: dropdownWidth });
              setActivePicker(type);

              Animated.parallel([
                Animated.timing(pickerOpacity, { toValue: 1, duration: 200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                Animated.timing(pickerTranslateY, { toValue: 0, duration: 250, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true })
              ]).start();
            });
          }, 350);
        },
        () => console.log(isVi ? 'Lỗi không thể đo kích thước layout' : 'Failed to measure layout')
      );
    }
  };

  const closeDropdownPicker = () => {
    Animated.parallel([
      Animated.timing(pickerOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(pickerTranslateY, { toValue: -8, duration: 150, useNativeDriver: true })
    ]).start(() => setActivePicker(null));
  };

  const updateDateTimeString = (date: Date) => {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const MM = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    setDateTime(`${hh}:${mm} - ${dd}/${MM}/${yyyy}`);
  };

  const handleConfirmAndroidDateTime = (date: Date) => {
    setLostDate(date);
    updateDateTimeString(date);
    setAndroidDatePickerVisibility(false);
  };

  useEffect(() => {
    updateDateTimeString(lostDate);
  }, [lostDate]);

  const isFormValid = location && dateTime && details && ownerName && ownerPhone && ownerAddress;

  const handleAddPhoto = async () => {
    const remainingSlots = 5 - photos.length;

    if (remainingSlots <= 0) {
      Alert.alert(isVi ? "Giới hạn ảnh" : "Photo limit", isVi ? "Bạn chỉ được tải lên tối đa 5 ảnh." : "You can upload a maximum of 5 photos.");
      return;
    }

    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newLocalUrls = result.assets.map(asset => asset.uri);
        setPhotos((prev) => {
          const combined = [...prev, ...newLocalUrls];
          return combined.slice(0, 5);
        });
      }
    } catch (error) {
      console.error(isVi ? "Lỗi khi chọn ảnh:" : "Error selecting image: ", error);
      Alert.alert(isVi ? "Lỗi" : "Error", isVi ? "Không thể mở thư viện ảnh." : "Cannot open photo library.");
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    if (petId) {
      router.push(`/pet-profile-detail?id=${petId}`);
    } else {
      router.push('/(tabs)/my-pets');
    }
  };

  const handleActivateLostMode = async () => {
    if (!petId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSubmitting(true);
    try {
      await petService.toggleLostMode(petId, {
        isLost: true,
        location: location || "",
        dateTime: dateTime || "",
        details: details || "",
        ownerName: ownerName || "",
        ownerPhone: ownerPhone || "",
        ownerAddress: ownerAddress || "",
        note: note || "",
        photos: photos || [],
        latitude: mapLat,
        longitude: mapLng,
        radius: mapRadius > 0 ? mapRadius : 500,
        lostDate: lostDate.toISOString(),
      });

      DeviceEventEmitter.emit('LOST_MODE_ACTIVATED', { petId });

      Alert.alert(
        isVi ? 'Báo lạc thành công' : 'Reported lost successfully',
        isVi ? `Đã kích hoạt chế độ báo lạc cho ${petName || 'thú cưng'}.` : `Lost Mode activated for ${petName || 'pet'}.`,
        [
          {
            text: "OK",
            onPress: () => {
              DeviceEventEmitter.emit('LOST_MODE_ACTIVATED', { petId });
              setTimeout(() => {
                router.back();
              }, 100);
            }
          }
        ]
      );
    } catch (error: any) {
      const errorMsg = error?.message || isVi ? 'Lỗi hệ thống, vui lòng thử lại.' : 'System error, please try again.';
      Alert.alert(isVi ? 'Lỗi' : 'Error', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* --- POPUP ADDRESS MODAL --- */}
      {showAddressPopup && (
        <View
          className="absolute inset-0 bg-black/50 justify-center px-4"
          style={{ zIndex: 9999, elevation: 9999, paddingTop: insets.top }}
        >
          <View className="bg-white rounded-[24px] p-6 shadow-2xl max-h-[85%]">
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text className="text-[20px] font-semibold text-black mb-2 text-center">
                {isVi ? 'Vị trí của bạn' : 'Your Location'}
              </Text>

              <Label text={isVi ? "Thành phố / Tỉnh" : "City / Province"} required />
              <CustomDropdown
                placeholder={isVi ? "Chọn Tỉnh/Thành phố" : "Select City/Province"}
                value={tempCity}
                options={cityOptions}
                onSelect={(val) => {
                  setTempCity(val);
                  setTempWard('');
                }}
              />

              <Label text={isVi ? "Quận/Huyện & Phường/Xã" : "District & Ward"} required />
              <CustomDropdown
                placeholder={isVi ? "Chọn Phường/Xã" : "Select Ward"}
                value={tempWard}
                options={wardOptions}
                onSelect={setTempWard}
              />

              <Label text={isVi ? "Địa chỉ chi tiết (Tùy chọn)" : "Detailed Address (Optional)"} />
              <CustomInput
                placeholder={isVi ? "Số nhà, tên ngõ, tên đường..." : "House number, street name..."}
                value={tempDetail}
                onChangeText={setTempDetail}
              />

              <View className="flex-row gap-3 mt-8 mb-4">
                <TouchableOpacity
                  className="flex-1 py-4 rounded-xl border border-[#E5E5E5] items-center bg-[#F9FAFB]"
                  onPress={() => setShowAddressPopup(false)}
                >
                  <Text className="text-[#8E8E93] font-bold text-[14px]">
                    {isVi ? 'Hủy bỏ' : 'Cancel'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 py-4 rounded-xl bg-[#E89B5A] items-center shadow-sm"
                  onPress={handleConfirmAddress}
                >
                  <Text className="text-white font-bold text-[14px]">
                    {isVi ? 'Xác nhận' : 'Confirm'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, paddingTop: insets.top }}
      >
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 20,
            paddingBottom: insets.bottom
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View ref={contentRef} collapsable={false}>
            {/* HEADER */}
            <View className="w-full flex-row items-center justify-center relative py-4 px-5 mb-5 bg-white">
              <View className="items-center justify-center pr-6 pl-6">
                <Text className="text-[20px] font-semibold text-black text-center">
                  {isVi ? 'Báo cáo thú cưng lạc' : 'Report lost pet'}
                </Text>
                <Text className="text-[13px] text-[#8E8E93] text-center mt-0.5">
                  {isVi ? 'Vui lòng xác nhận thông tin bên dưới' : 'Please confirm the information below'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => router.back()}
                activeOpacity={0.7}
                style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 }}
                className="absolute right-0 p-2 rounded-full"
              >
                <View className="overflow-hidden rounded-full w-[36px] h-[36px] items-center justify-center"
                  style={{
                    width: 36, height: 36, borderRadius: 28, borderWidth: 0.5, borderTopColor: 'white',
                    borderLeftColor: 'white', borderBottomColor: 'transparent', borderRightColor: 'transparent',
                    justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  }}>
                  <LinearGradient
                    colors={['rgba(221, 221, 221, 0.3)', 'rgba(247, 247, 247, 0.7)', '#FFFFFF']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} locations={[0, 0.3, 1]}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 9999 }}
                  />
                  <Feather name="x" size={20} color="#1F2937" />
                </View>
              </TouchableOpacity>
            </View>

            {/* PET INFO */}
            <View className="items-center mb-[21px]">
              <Image
                source={{ uri: petAvatar && petAvatar !== 'undefined' ? petAvatar : 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=300&auto=format&fit=crop' }}
                className="w-[128px] h-[128px] rounded-full border-[4px] border-[#F9FAFB]"
                resizeMode="cover"
              />
              <Text className="text-[20px] font-semibold text-[#111827] mt-[30px] tracking-[0.06px]">
                {petName || (isVi ? 'Thú cưng' : 'Pet')}
              </Text>
              <Text className="text-[14px] text-[#B8B8B8] mt-[8px] font-regular tracking-[0.5px]">
                {petAge ? `${petAge} ${isVi ? 'Tuổi' : 'Years'} • ` : ''}{petBreed || (isVi ? 'Chưa xác định giống' : 'Unidentified species')}
              </Text>
            </View>

            {/* LAST SEEN INFORMATION */}
            <View className="mb-8">
              <Text className="text-[14px] font-semibold text-black mb-3 ">
                {isVi ? 'Thông tin nhìn thấy lần cuối' : 'Last seen information'}
              </Text>
              <Text className="text-[14px] font-medium text-[#8E8E93] mb-1 ">
                {isVi ? 'Vị trí thất lạc' : 'Lost Location'}
              </Text>

              {mapLat && mapLng ? (
                <View className="bg-white">
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleGoToMap}
                    className="flex-row items-center justify-between"
                  >
                    <View className="flex-1 border-b border-[#E5E5E5] mb-2">
                      <Text className="text-[14px] font-semibold text-black mb-1 tracking-[0.06px]" numberOfLines={1}>
                        {mapAddress} {mapRadius < 1000 ? `(${Math.round(mapRadius)}m)` : `(${(mapRadius / 1000).toFixed(1)}km)`}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <View className="h-[150px] w-full mt-2" style={{ position: 'relative' }}>
                    {!isNavigatingAway && (() => {
                      const latDelta = (mapRadius * 2.5) / 111320;
                      const lngDelta = latDelta / Math.cos(mapLat * (Math.PI / 180));

                      return (
                        <MapView
                          provider={MAP_PROVIDER}
                          style={{ height: 150, borderRadius: 22 }}
                          region={{
                            latitude: mapLat,
                            longitude: mapLng,
                            latitudeDelta: latDelta,
                            longitudeDelta: lngDelta
                          }}
                          scrollEnabled={false}
                          zoomEnabled={false}
                          pitchEnabled={false}
                          rotateEnabled={false}
                        >
                          <Circle
                            center={{ latitude: mapLat, longitude: mapLng }}
                            radius={mapRadius}
                            fillColor="rgba(218, 90, 90, 0.15)"
                            strokeColor="rgba(218, 90, 90, 0.6)"
                            strokeWidth={1}
                          />
                          <Marker
                            coordinate={{ latitude: mapLat, longitude: mapLng }}
                            anchor={{ x: 0.5, y: 1 }}
                            tracksViewChanges={false}
                          >
                            {/* Container kích thước CỐ ĐỊNH (44x53) — anchor chỉ tính dựa trên khối này */}
                            <View style={{ width: 44, height: 53, alignItems: 'center' }} collapsable={false}>
                              {/* Label nổi: absolute, KHÔNG nằm trong luồng layout nên không ảnh hưởng anchor */}
                              <View
                                style={{
                                  position: 'absolute',
                                  bottom: 53 + 8, // chiều cao pin (53) + khoảng cách (8)
                                  width: 135,
                                  left: -45.5, // (135 - 44) / 2 để căn giữa label so với pin
                                  alignItems: 'center',
                                }}
                              >
                                <View className="bg-[#FFFFFF] px-3 py-1.5 rounded-lg shadow-md w-full">
                                  <Text className="text-black text-[13px] font-medium tracking-[0.06px] text-center">
                                    {isVi ? 'Đã báo mất' : 'Reported as Lost'}
                                  </Text>
                                  <Text className="text-[#8E8E93] text-[11px] font-regular tracking-[0.06px] text-center">
                                    {isVi ? 'Vị trí đã chọn' : 'Selected Location'}
                                  </Text>
                                </View>
                                <View style={{ width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 6, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#FFFFFF' }} />
                              </View>

                              {/* Pin thật — kích thước cố định, đáy của tam giác đỏ = điểm anchor (0.5, 1) */}
                              <View style={{ borderColor: '#DA5A5A', borderWidth: 2.5 }} className="w-11 h-11 bg-white rounded-full items-center justify-center shadow-sm">
                                <Ionicons name="alert-outline" size={20} color="#DA5A5A" />
                              </View>
                            </View>
                          </Marker>
                        </MapView>
                      );
                    })()}

                    {/* Overlay trong suốt bắt sự kiện tap, vì MapView native chặn gesture của TouchableOpacity cha */}
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={handleGoToMap}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        borderRadius: 22,
                      }}
                    />
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleGoToMap}
                  className="w-full py-1 border-b border-[#E5E5E5] bg-white"
                >
                  <Text className="text-[14px] text-[#8E8E93] font-regular tracking-[0.06p]" numberOfLines={1}>
                    {isVi ? 'Chọn vị trí' : 'Choose a location'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* DATE & TIME (IOS DÙNG CÙNG 1 ROW VỚI DATETIME MODE) */}
              <View className="mt-4 mb-2" ref={datetimeRef} collapsable={false}>
                <View className="flex-row justify-between gap-5">
                  <View className="flex-1">
                    <Text className="text-[#8E8E93] font-medium text-[14px]">
                      {isVi ? 'Ngày' : 'Date'}
                    </Text>

                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => Platform.OS === 'ios' ? openDropdownPicker('datetime') : setAndroidDatePickerVisibility(true)}
                      className="flex-row items-center justify-between py-2 border-b border-[#E5E5E5] bg-white"
                    >
                      <Text className="text-[14px] text-black font-semibold">
                        {lostDate.toLocaleDateString(isVi ? 'vi-VN' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View className="flex-1">
                    <Text className="text-[#8E8E93] font-medium text-[14px]">
                      {isVi ? 'Thời gian' : 'Time'}
                    </Text>

                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => Platform.OS === 'ios' ? openDropdownPicker('datetime') : setAndroidDatePickerVisibility(true)}
                      className="flex-row items-center justify-between py-2 border-b border-[#E5E5E5] bg-white"
                    >
                      <Text className="text-[14px] text-black font-semibold">
                        {lostDate.toLocaleTimeString(isVi ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View className='mb-[30px] mt-2'>
                <Text className="text-[#8E8E93] font-medium text-[14px]">
                  {isVi ? 'Nhận dạng' : 'Description'}
                </Text>
                <TextInput
                  style={{ fontFamily: 'Urbanist' }}
                  value={details}
                  onChangeText={setDetails}
                  placeholder={
                    isVi
                      ? `Mô tả ngoại hình, đặc điểm nhận dạng, tính cách và tình trạng của ${petName || 'thú cưng'} khi bị lạc...`
                      : `Describe ${petName || 'the pet'}'s appearance, identifying features, temperament, and condition when lost...`
                  }
                  placeholderTextColor="#9CA3AF"
                  multiline
                  className="w-full border-b border-[#E5E5E5] py-2 text-[14px] text-[#111827] font-regular bottom-1"
                  textAlignVertical="top"
                  cursorColor="#EF4444"
                />
              </View>

              {/* PHOTOS */}
              <View className="mb-[30px]">
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-[14px] font-semibold text-black tracking-[0.06px]">
                    {isVi ? 'Hình ảnh ' : 'Photos '} <Text className="text-[#8E8E93] text-[12px] font-medium">{isVi ? '(Tùy chọn)' : '(Optional)'}</Text>
                  </Text>
                  <Text className="text-[13px] font-regular text-[#9CA3AF]">{photos.length}/5</Text>
                </View>

                <View className="flex-row flex-wrap gap-2">
                  {photos.length === 0 ? (
                    <TouchableOpacity
                      onPress={handleAddPhoto}
                      activeOpacity={0.7}
                      disabled={isUploading}
                      className="w-full flex-row h-[60px] border-[1.5px] border-dashed border-[#D1D5DB] rounded-[16px] items-center justify-center"
                    >
                      {isUploading ? (
                        <ActivityIndicator size="small" color="#9CA3AF" className="mr-1" />
                      ) : (
                        <Image source={require('../assets/icon/upload-gray.png')} className="w-[18px] h-[18px]" />
                      )}
                      <Text className="ml-[11px] text-[14px] font-regular text-black">
                        {isUploading ? (isVi ? 'Đang tải lên...' : 'Uploading...') : (isVi ? 'Tải ảnh lên' : 'Upload photos')}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      {photos.map((uri, index) => (
                        <View key={index} style={{ width: PHOTO_SIZE, height: PHOTO_SIZE }} className="relative">
                          <Image source={{ uri }} className="w-full h-full rounded-[14px] bg-[#F3F4F6]" />
                          <TouchableOpacity
                            onPress={() => handleRemovePhoto(index)}
                            activeOpacity={0.7}
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full items-center justify-center"
                            style={{ elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3 }}
                          >
                            <LinearGradient colors={['rgba(221, 221, 221, 0.3)', 'rgba(247, 247, 247, 0.7)', '#FFFFFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} locations={[0, 0.3, 1]} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 9999 }} />
                            <X size={10} color="#000000" strokeWidth={3} />
                          </TouchableOpacity>
                        </View>
                      ))}
                      {photos.length < 5 && (
                        <TouchableOpacity
                          onPress={handleAddPhoto}
                          activeOpacity={0.7}
                          disabled={isUploading}
                          style={{ width: PHOTO_SIZE, height: PHOTO_SIZE }}
                          className="bg-[#F9FAFB] border-[1.5px] border-dashed border-[#E5E5E5] rounded-[14px] items-center justify-center"
                        >
                          {isUploading ? <ActivityIndicator size="small" color="#9CA3AF" /> : <Image source={require('../assets/icon/upload-gray.png')} className="w-[18px] h-[18px] mr-1" />}
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>
              </View>

              {/* OWNER INFORMATION */}
              <View className="mb-[20px]">
                <Text className="text-[14px] font-semibold text-black mb-3 tracking-[0.06px]">
                  {isVi ? 'Thông tin chủ sở hữu' : 'Owner Information'}
                </Text>
                <View className="flex justify-center items-center">
                  <View className='w-full rounded-[16px] border border-[#E5E5E5] pb-[14px]'>

                    <View className='flex-row border-b border-[#E5E5E5] py-[13px] mx-4 items-center'>
                      <Image source={require('../assets/icon/user-form.png')} style={{ width: 14, height: 14 }} resizeMode="cover" />
                      <Text className="text-[14px] font-medium text-[#8E8E93] px-2">{isVi ? 'Họ tên' : 'Name'}</Text>
                      <TextInput
                        value={ownerName}
                        onChangeText={setOwnerName}
                        placeholder="Sarah Johnson"
                        placeholderTextColor="#9CA3AF"
                        style={{ fontFamily: "Urbanist" }}
                        className="flex-1 text-[13px] text-black p-0 text-right tracking-[0.06px]"
                        selectTextOnFocus={true}
                      />
                    </View>

                    <View className='flex-row py-[13px] mx-4 border-b border-[#E5E5E5] items-center'>
                      <Image source={require('../assets/icon/phone-form.png')} style={{ width: 14, height: 14 }} resizeMode="cover" />
                      <Text className="text-[14px] font-medium text-[#8E8E93] px-2">{isVi ? 'Số điện thoại' : 'Phone'}</Text>
                      <TextInput
                        value={ownerPhone}
                        onChangeText={setOwnerPhone}
                        placeholder="01234567890"
                        placeholderTextColor="#9CA3AF"
                        style={{ fontFamily: "Urbanist" }}
                        className="flex-1 text-[13px] text-black p-0 text-right tracking-[0.06px]"
                        keyboardType="phone-pad"
                        selectTextOnFocus={true}
                      />
                    </View>

                    <View className='flex-row py-[13px] mx-4 items-center'>
                      <Image source={require('../assets/icon/location-form.png')} style={{ width: 14, height: 14 }} resizeMode="cover" />
                      <Text className="text-[14px] font-medium text-[#8E8E93] px-2">{isVi ? 'Địa chỉ' : 'Address'}</Text>
                      <TouchableOpacity onPress={() => setShowAddressPopup(true)} className="flex-1 items-end justify-center">
                        <Text className={`font-regular text-[12px] text-right tracking-[0.06px] ${ownerAddress ? 'text-black' : 'text-[#9CA3AF]'}`} numberOfLines={1}>
                          {ownerAddress || (isVi ? "Nhấn để chọn địa chỉ..." : "Tap to select address...")}
                        </Text>
                      </TouchableOpacity>
                    </View>

                  </View>

                  <View className="flex items-center justify-center w-4/5 bg-[#FAFAFA] px-2.5 py-1 rounded-full border border-[#D9D9D9] bottom-5">
                    <Text className="text-[#AB5C1A] text-[14px] text-center font-regular leading-[20px] py-[6px]">
                      <TextInput
                        value={note}
                        onChangeText={setNote}
                        placeholder={isVi ? '"Nhập ghi chú của bạn tại đây"' : '"Leave your note here"'}
                        placeholderTextColor="#757575"
                        style={{ fontFamily: "Urbanist" }}
                        className="font-regular flex-1 text-[12px] text-black p-0 text-center tracking-[0.06px]"
                      />
                    </Text>
                  </View>
                </View>
              </View>

              {/* FOOTER BUTTONS */}
              <View className="gap-y-3">
                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={!isFormValid || isSubmitting || isUploading}
                  onPress={handleActivateLostMode}
                  className={`w-full h-[48px] rounded-[16px] items-center justify-center flex-row ${isFormValid && !isSubmitting && !isUploading ? 'bg-[#E85A5A]' : 'bg-[#FFB4B4]'}`}
                  style={isFormValid && !isSubmitting && !isUploading ? { shadowColor: '#FF0000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 } : {}}
                >
                  <Image source={require('../assets/icon/bell.png')} style={{ width: 14, height: 17 }} resizeMode="cover" className='mr-2' />
                  {isSubmitting && <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />}
                  <Text className="text-white font-semibold text-[16px] tracking-[-0.3px]">
                    {isSubmitting ? (isVi ? 'Đang kích hoạt...' : 'Activating...') : (isVi ? 'Kích hoạt Chế độ Báo lạc' : 'Activate Lost Mode')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleClose}
                  disabled={isSubmitting}
                  className="w-full h-[48px] rounded-[16px] items-center justify-center border border-[#E5E5E5]"
                >
                  <Text className="text-[#8E8E93] font-medium text-[16px] tracking-[-0.3px]">
                    {isVi ? 'Hủy' : 'Cancel'}
                  </Text>
                </TouchableOpacity>
              </View>

            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ================= MODALS & PICKERS ================= */}

      {/* ANDROID NATIVE DATE PICKER */}
      {Platform.OS === 'android' && (
        <DateTimePickerModal
          isVisible={isAndroidDatePickerVisible}
          mode="datetime"
          date={lostDate}
          display="default"
          locale={isVi ? "vi_VN" : "en_US"}
          maximumDate={new Date()}
          onConfirm={handleConfirmAndroidDateTime}
          onCancel={() => setAndroidDatePickerVisibility(false)}
        />
      )}

      {/* --- KÍNH MỜ DROPDOWN FIX CHIỀU CAO VÀ MÀU CAM (IOS) --- */}
      {Platform.OS === 'ios' && activePicker === 'datetime' && (
        <View className="absolute inset-0 z-[100]">
          <TouchableOpacity activeOpacity={1} className="absolute inset-0" onPress={closeDropdownPicker} />

          <Animated.View
            style={{
              position: 'absolute',
              top: pickerLayout.y,
              left: pickerLayout.x,
              width: pickerLayout.width,
              opacity: pickerOpacity,
              transform: [{ translateY: pickerTranslateY }],
              borderRadius: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.25,
              shadowRadius: 16,
              elevation: 10,
              overflow: 'hidden'
            }}
          >
            <BlurView tint="dark" intensity={65} style={{ position: 'absolute', inset: 0 }} />
            <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15, 15, 15, 0.45)' }} />

            <View className="flex-row justify-between items-center px-[16px] py-[12px] border-b border-white/10 relative z-10">
              <TouchableOpacity onPress={closeDropdownPicker}>
                <Text className="text-[16px] text-[#A1A1AA] font-medium">{isVi ? 'Huỷ' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={closeDropdownPicker}>
                <Text className="text-[16px] font-semibold text-[#E89B5A]">{isVi ? 'Xong' : 'Done'}</Text>
              </TouchableOpacity>
            </View>

            <View style={{ paddingTop: 4, paddingBottom: 4, paddingHorizontal: 10, alignItems: 'center' }} className="relative z-10">
              <DateTimePicker
                value={lostDate}
                mode="datetime"
                display="inline"
                themeVariant="dark"
                locale={isVi ? "vi-VN" : "en-US"}
                maximumDate={new Date()}
                style={{ width: 320, height: 350, alignSelf: 'center' }}
                accentColor="#E89B5A"
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setLostDate(selectedDate);
                  }
                }}
              />
            </View>
          </Animated.View>
        </View>
      )}
    </View>
  );
}