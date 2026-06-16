import { Text } from '@/components/AppText';
import { useLanguage } from '@/contexts/LanguageContext';
import { useImageUpload } from '@/hooks/useImageUpload';
import { petService } from '@/services/petService';
import { AntDesign, Feather, Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
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
  const [visible, setVisible] = useState(false);

  return (
    <View>
      <TouchableOpacity
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
        className={`w-full bg-white border border-[#E5E5E5] rounded-2xl h-14 px-4 flex-row items-center justify-between ${visible ? 'border-[#E89B5A]' : ''}`}
      >
        <Text className={`${value ? 'text-black' : 'text-[#9CA3AF]'} text-[14px] font-medium`} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Feather name={visible ? "chevron-up" : "chevron-down"} size={20} color="#9CA3AF" />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setVisible(false)}>
          <View className="flex-1 bg-black/40 justify-center px-6">
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-3xl max-h-[60%] overflow-hidden shadow-2xl">
                <View className="px-5 py-4 border-b border-gray-100 flex-row justify-between items-center bg-gray-50">
                  <Text className="font-bold text-gray-700 text-base">{placeholder}</Text>
                  <TouchableOpacity onPress={() => setVisible(false)}>
                    <AntDesign name="close" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={options}
                  keyExtractor={(item) => item}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => {
                    const isSelected = item === value;
                    return (
                      <TouchableOpacity
                        className={`px-5 py-4 border-b border-gray-50 flex-row items-center justify-between ${isSelected ? 'bg-orange-50' : 'active:bg-gray-50'}`}
                        onPress={() => {
                          if (onSelect) onSelect(item);
                          setVisible(false);
                        }}
                      >
                        <Text className={`text-[14px] ${isSelected ? 'text-[#E89B5A] font-bold' : 'text-gray-700'}`}>
                          {item}
                        </Text>
                        {isSelected && <Ionicons name="checkmark" size={18} color="#E89B5A" />}
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
  const [location, setLocation] = useState(''); // Lưu chuỗi địa chỉ cuối cùng đã gộp
  const [dateTime, setDateTime] = useState('');
  const [details, setDetails] = useState('');

  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerAddress, setOwnerAddress] = useState('');
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  // --- Date Picker States ---
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

  // --- ADDRESS POPUP STATE & LOGIC ---
  const [showAddressPopup, setShowAddressPopup] = useState(false);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [wardOptions, setWardOptions] = useState<string[]>([]);
  
  const [tempCity, setTempCity] = useState('');
  const [tempWard, setTempWard] = useState('');
  const [tempDetail, setTempDetail] = useState('');

  // 1. Fetch danh sách Tỉnh/Thành (API v2) và đẩy Hà Nội, TP.HCM lên đầu
  useEffect(() => {
    fetch('https://provinces.open-api.vn/api/v2/p/')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const formattedProvinces = data
            .map((p: any) => ({
              ...p,
              // Xóa chữ "Thành phố " hoặc "Tỉnh " ở đầu chuỗi
              name: p.name.replace(/^(Thành phố |Tỉnh )/i, '')
            }))
            // Sort alphabet chuẩn theo tiếng Việt
            .sort((a: any, b: any) => a.name.localeCompare(b.name, 'vi'));

          setProvinces(formattedProvinces);
        }
      })
      .catch(e => console.error("Lỗi fetch tỉnh/thành phố:", e));
  }, []);

  const cityOptions = provinces.map((c: any) => c.name);

  // 2. Fetch danh sách Phường/Xã khi user chọn 1 Tỉnh (CHUẨN API V2)
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
        .catch(e => console.error("Lỗi fetch chi tiết phường/xã:", e));
    }
  }, [tempCity, provinces]);

  const handleConfirmAddress = () => {
    if (!tempCity || !tempWard) {
      Alert.alert("Thiếu thông tin", "Vui lòng chọn Tỉnh/Thành phố và Phường/Xã.");
      return;
    }
    
    let fullAddress = `${tempWard}, ${tempCity}`; 
    if (tempDetail.trim()) {
      fullAddress = `${tempDetail.trim()}, ${fullAddress}`;
    }
    
    // Gán vào state của form Lost Pet
    setOwnerAddress(fullAddress);
    setShowAddressPopup(false);
  };

  const {
    petId, petName, petAvatar, petBreed, petAge,
    petShelterName, 
    petShelterPhone, 
    petShelterAddress,
    selectedMapAddress, // Địa chỉ chữ chữ map trả về
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
        setLocation(data.address || ''); // Gắn luôn vào State location của Form để validate
      }
    });

    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (petShelterName && petShelterName !== 'not updated') {
      setOwnerName(petShelterName);
    }
    if (petShelterPhone && petShelterPhone !== 'not updated') {
      setOwnerPhone(petShelterPhone);
    }
    if (petShelterAddress && petShelterAddress !== 'not updated') {
      setOwnerAddress(petShelterAddress);
    }
  }, [petShelterName, petShelterPhone, petShelterAddress]);

  useEffect(() => {
    if (selectedMapAddress) {
      setLocation(selectedMapAddress);
    }
  }, [selectedMapAddress]);

  const [lostDate, setLostDate] = useState<Date>(new Date());

  const showDateTimePicker = () => setDatePickerVisibility(true);
  const hideDateTimePicker = () => setDatePickerVisibility(false);

  const handleConfirmDateTime = (date: Date) => {
    setLostDate(date);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    setDateTime(`${hours}:${minutes} - ${day}/${month}/${year}`);
    hideDateTimePicker();
  };

  useEffect(() => {
    const formatDateTime = (date: Date) => {
      const hh = String(date.getHours()).padStart(2, '0');
      const mm = String(date.getMinutes()).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const MM = String(date.getMonth() + 1).padStart(2, '0');
      const yyyy = date.getFullYear();
      return `${hh}:${mm} - ${dd}/${MM}/${yyyy}`;
    };
    setDateTime(formatDateTime(lostDate));
  }, [lostDate]);

  const isFormValid = location && dateTime && details && ownerName && ownerPhone && ownerAddress;

  const handleAddPhoto = async () => {
    // 1. Tính toán số lượng ảnh còn lại có thể chọn
    const remainingSlots = 5 - photos.length;
    
    // Nếu đã đủ 5 ảnh thì báo lỗi và không cho mở thư viện
    if (remainingSlots <= 0) {
      Alert.alert("Giới hạn ảnh", "Bạn chỉ được tải lên tối đa 5 ảnh.");
      return;
    }

    try {
      // 2. Mở thư viện với tính năng chọn nhiều ảnh
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,  // 🔴 Cho phép chọn nhiều
        selectionLimit: remainingSlots, // 🔴 Khóa số lượng tối đa được chọn bằng đúng số slot còn trống
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        // 3. Lấy ra mảng các đường dẫn URI của ảnh
        const newLocalUrls = result.assets.map(asset => asset.uri);

        // 4. Lưu vào state, cắt mảng đúng 5 phần tử (phòng hờ trường hợp lỗi OS trả về lố ảnh)
        setPhotos((prev) => {
          const combined = [...prev, ...newLocalUrls];
          return combined.slice(0, 5);
        });
      }
    } catch (error) {
      console.error("Lỗi khi chọn ảnh:", error);
      Alert.alert("Lỗi", "Không thể mở thư viện ảnh.");
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

      // 🔴 BỎ DÒNG NÀY VÌ DETAIL SCREEN KHÔNG DÙNG USEQUERY:
      // queryClient.invalidateQueries({ queryKey: ['pet-detail', petId] });

      // ✅ THÊM DÒNG NÀY: Bắn event để màn hình Detail cập nhật ngay lập tức
      DeviceEventEmitter.emit('LOST_MODE_ACTIVATED', { petId });

      Alert.alert(
        'Báo lạc thành công',
        `Đã kích hoạt chế độ báo lạc cho ${petName || 'thú cưng'}.`,
        [
          {
            text: "OK",
            onPress: () => {
              // Bắn event ngay khoảnh khắc user bấm OK (chuẩn bị back)
              DeviceEventEmitter.emit('LOST_MODE_ACTIVATED', { petId });
              
              // Delay nhẹ 1 chút (100ms) để BE kịp commit transaction vào DB
              setTimeout(() => {
                router.back(); 
              }, 100);
            }
          }
        ]
      );
    } catch (error: any) {
      const errorMsg = error?.message || 'Lỗi hệ thống, vui lòng thử lại.';
      Alert.alert('Lỗi', errorMsg);
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
                Your Location
              </Text>
              
              <Label text="Thành phố / Tỉnh" required />
              <CustomDropdown
                placeholder="Chọn Tỉnh/Thành phố"
                value={tempCity}
                options={cityOptions}
                onSelect={(val) => {
                  setTempCity(val);
                  setTempWard(''); // Xoá trắng dữ liệu xã khi đổi tỉnh
                }}
              />

              <Label text="Quận/Huyện & Phường/Xã" required />
              <CustomDropdown
                placeholder="Chọn Phường/Xã"
                value={tempWard}
                options={wardOptions}
                onSelect={setTempWard}
              />

              <Label text="Địa chỉ chi tiết (Tùy chọn)" />
              <CustomInput
                placeholder="Số nhà, tên ngõ, tên đường..."
                value={tempDetail}
                onChangeText={setTempDetail}
              />

              <View className="flex-row gap-3 mt-8 mb-4">
                <TouchableOpacity
                  className="flex-1 py-4 rounded-xl border border-[#E5E5E5] items-center bg-[#F9FAFB]"
                  onPress={() => setShowAddressPopup(false)}
                >
                  <Text className="text-[#8E8E93] font-bold text-[14px]">Hủy bỏ</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 py-4 rounded-xl bg-[#E89B5A] items-center shadow-sm"
                  onPress={handleConfirmAddress}
                >
                  <Text className="text-white font-bold text-[14px]">Xác nhận</Text>
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
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 20,
            paddingBottom: insets.bottom
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* HEADER */}
          <View className="w-full flex-row items-center justify-center relative py-4 px-5 mb-5 bg-white">
            <View className="items-center justify-center pr-6 pl-6">
              <Text className="text-[20px] font-semibold text-black text-center">
                Report Lost Pet
              </Text>
              <Text className="text-[13px] text-[#8E8E93] text-center mt-0.5">
                Please confirm the information below
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
              {petName || 'Thú cưng'}
            </Text>
            <Text className="text-[14px] text-[#B8B8B8] mt-[8px] font-regular tracking-[0.5px]">
              {petAge ? `${petAge} Years • ` : ''}{petBreed || 'Unidentified species'}
            </Text>
          </View>

          {/* LAST SEEN INFORMATION */}
          <View className="mb-8">
            <Text className="text-[14px] font-semibold text-black mb-3 ">
              Last Seen Information
            </Text>
            <Text className="text-[14px] font-medium text-[#8E8E93] mb-1 ">
              Lost Location
            </Text>

            {mapLat && mapLng ? (
              <View className="bg-white">
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => router.push({ pathname: '/select-last-seen-location', params: { petId, petName, petAvatar, petBreed, petAge, lostDateStr: lostDate.toISOString() } })}
                  className="flex-row items-center justify-between"
                >
                  <View className="flex-1 border-b border-[#E5E5E5] mb-2">
                    <Text className="text-[14px] font-semibold text-black mb-1 tracking-[0.06px]" numberOfLines={1}>
                      {mapAddress} {mapRadius < 1000 ? `(${Math.round(mapRadius)}m)` : `(${(mapRadius / 1000).toFixed(1)}km)`}
                    </Text>
                  </View>
                </TouchableOpacity>

                <View className="h-[150px] w-full">
                  {/* --- TÍNH TOÁN ĐỘ ZOOM TỰ ĐỘNG DỰA TRÊN RADIUS --- */}
                  {(() => {
                    // Nhân 2.5 để tạo khoảng trống (padding) cho viền xung quanh vòng tròn
                    const latDelta = (mapRadius * 2.5) / 111320; 
                    // Longitude thu hẹp dần về hai cực, nên cần chia cho cos(latitude)
                    const lngDelta = latDelta / Math.cos(mapLat * (Math.PI / 180));

                    return (
                      <MapView
                        provider={PROVIDER_GOOGLE}
                        style={{ height: 150, borderRadius: 22 }}
                        // Dùng `region` thay cho `initialRegion` để update ngay lập tức khi radius thay đổi
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
                          fillColor="rgba(232, 155, 90, 0.2)" 
                          strokeColor="rgba(232, 155, 90, 0.8)" 
                          strokeWidth={1} 
                        />
                        <Marker coordinate={{ latitude: mapLat, longitude: mapLng }}>
                          <View style={{ alignItems: 'center', width: 135 }}>
                            <View className="bg-[#FFFFFF] px-3 py-1.5 rounded-lg shadow-md w-full">
                              <Text className="text-black text-[13px] font-medium tracking-[0.06px] text-center">Reported as Lost</Text>
                              <Text className="text-[#8E8E93] text-[11px] font-regular tracking-[0.06px] text-center">
                                Selected Location
                              </Text>
                            </View>
                            <View style={{ width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 6, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#FFFFFF' }} />
                            <View className="h-1.5" />
                            <View style={{ borderColor: '#DA5A5A', borderWidth: 2.5 }} className="w-11 h-11 bg-white rounded-full items-center justify-center shadow-sm">
                              <Ionicons name="alert-outline" size={20} color="#DA5A5A" />
                            </View>
                            <View style={{ width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 9, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#DA5A5A' }} />
                          </View>
                        </Marker>
                      </MapView>
                    );
                  })()}
                </View>
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/select-last-seen-location', params: { petId, petName, petAvatar, petBreed, petAge, lostDateStr: lostDate.toISOString() } })}
                className="w-full py-1 border-b border-[#E5E5E5] bg-white"
              >
                <Text className="text-[14px] text-[#8E8E93] font-regular tracking-[0.06p]" numberOfLines={1}>
                  Choose a location
                </Text>
              </TouchableOpacity>
            )}

            <View className="mt-2 mb-2">
              <View className="flex-row justify-between gap-5">
                <View className="flex-1">
                  <Text className="text-[#8E8E93] font-medium text-[14px]">
                    Date
                  </Text>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={showDateTimePicker}
                    className="flex-row items-center justify-between py-2 border-b border-[#E5E5E5] bg-white"
                  >
                    <Text className="text-[14px] text-black font-semibold">
                      {lostDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View className="flex-1">
                  <Text className="text-[#8E8E93] font-medium text-[14px]">
                    Time
                  </Text>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={showDateTimePicker}
                    className="flex-row items-center justify-between py-2 border-b border-[#E5E5E5] bg-white"
                  >
                    <Text className="text-[14px] text-black font-semibold">
                      {lostDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <DateTimePickerModal
              isVisible={isDatePickerVisible}
              mode="datetime"
              date={lostDate}
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              locale="vi_VN"
              maximumDate={new Date()}
              onConfirm={handleConfirmDateTime}
              onCancel={hideDateTimePicker}
              confirmTextIOS="Confirm"
              cancelTextIOS="Cancel"
            />
            
            <View className='mb-[30px]'>
              <Text className="text-[#8E8E93] font-medium text-[14px]">Description</Text>
              <TextInput
                style={{ fontFamily: 'Urbanist' }}
                value={details}
                onChangeText={setDetails}
                placeholder={isVi ? "Hãy mô tả thú cưng này trông như thế nào khi bị mất tích..." : "Describe what this pet looks like when gone missing..."}
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
                  Photos <Text className="text-[#8E8E93] text-[12px] font-medium">(Optional)</Text>
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
                      {isUploading ? 'Uploading...' : 'Upload photos'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    {photos.map((uri, index) => (
                      <View key={index} className="relative w-[60px] h-[60px]">
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
                      <TouchableOpacity onPress={handleAddPhoto} activeOpacity={0.7} disabled={isUploading} className="w-[60px] h-[60px] bg-[#F9FAFB] border-[1.5px] border-dashed border-[#E5E5E5] rounded-[14px] items-center justify-center">
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
                Owner Information
              </Text>
              <View className="flex justify-center items-center">
                <View className='w-full rounded-[16px] border border-[#E5E5E5] pb-[14px]'>

                  <View className='flex-row border-b border-[#E5E5E5] py-[13px] mx-4 items-center'>
                    <Image source={require('../assets/icon/user-form.png')} style={{ width: 14, height: 14 }} resizeMode="cover" />
                    <Text className="text-[14px] font-medium text-[#8E8E93] px-2">Name</Text>
                    <TextInput 
                      value={ownerName} 
                      onChangeText={setOwnerName} 
                      placeholder="Sarah Johnson" 
                      placeholderTextColor="#9CA3AF" 
                      style={{ fontFamily: "Urbanist" }} 
                      className="flex-1 text-[13px] text-black p-0 text-right tracking-[0.06px]" 
                      selectTextOnFocus={true} // BỔ SUNG DÒNG NÀY
                    />
                  </View>

                  <View className='flex-row py-[13px] mx-4 border-b border-[#E5E5E5] items-center'>
                    <Image source={require('../assets/icon/phone-form.png')} style={{ width: 14, height: 14 }} resizeMode="cover" />
                    <Text className="text-[14px] font-medium text-[#8E8E93] px-2">Phone</Text>
                    <TextInput 
                      value={ownerPhone} 
                      onChangeText={setOwnerPhone} 
                      placeholder="01234567890" 
                      placeholderTextColor="#9CA3AF" 
                      style={{ fontFamily: "Urbanist" }} 
                      className="flex-1 text-[13px] text-black p-0 text-right tracking-[0.06px]" 
                      keyboardType="phone-pad" 
                      selectTextOnFocus={true} // BỔ SUNG DÒNG NÀY
                    />
                  </View>

                  {/* THAY THẾ NÚT NHẬP ĐỊA CHỈ TẠI ĐÂY */}
                  <View className='flex-row py-[13px] mx-4 items-center'>
                    <Image source={require('../assets/icon/location-form.png')} style={{ width: 14, height: 14 }} resizeMode="cover" />
                    <Text className="text-[14px] font-medium text-[#8E8E93] px-2">Address</Text>
                    <TouchableOpacity onPress={() => setShowAddressPopup(true)} className="flex-1 items-end justify-center">
                      <Text className={`font-regular text-[12px] text-right tracking-[0.06px] ${ownerAddress ? 'text-black' : 'text-[#9CA3AF]'}`} numberOfLines={1}>
                        {ownerAddress || "Nhấn để chọn địa chỉ..."}
                      </Text>
                    </TouchableOpacity>
                  </View>

                </View>
                
                <View className="flex items-center justify-center w-4/5 bg-[#FAFAFA] px-2.5 py-1 rounded-full border border-[#D9D9D9] bottom-5">
                  <Text className="text-[#AB5C1A] text-[14px] text-center font-regular leading-[20px] py-[6px]">
                    <TextInput value={note} onChangeText={setNote} placeholder={isVi ? '"Nhập ghi chú của bạn tại đây"' : '"Leave your note here"'} placeholderTextColor="#757575" style={{ fontFamily: "Urbanist" }} className="font-regular flex-1 text-[12px] text-black p-0 text-center tracking-[0.06px]" />
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
                  {isSubmitting ? 'Activating...' : 'Activate Lost Mode'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleClose}
                disabled={isSubmitting}
                className="w-full h-[48px] rounded-[16px] items-center justify-center border border-[#E5E5E5]"
              >
                <Text className="text-[#8E8E93] font-medium text-[16px] tracking-[-0.3px]">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}