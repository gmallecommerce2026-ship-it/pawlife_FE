import axiosClient from '@/api/axiosClient';
import AddMedicalRecordModal from '@/components/AddMedicalRecordModal';
import { Text } from '@/components/AppText';
import { TextInput } from '@/components/AppTextInput';
import { useLanguage } from '@/contexts/LanguageContext';
import { petService } from '@/services/petService';
import { useModalStore } from '@/store/useModalStore';
import { getLocalizedField } from '@/utils/localization';
import { Feather, Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
// 🚀 FIX 1: Import thêm useCallback và memo từ React
import { OTHER_BREED_VALUE, SPECIES_BILINGUAL, buildBreedBilingual, getBreedOptions } from '@/constants/breedData';
import { buildBilingualOnSubmit } from '@/utils/autoTranslate';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  TouchableOpacity,
  View
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useImageUpload } from '../hooks/useImageUpload';

type GenderType = 'MALE' | 'FEMALE' | 'UNKNOWN';
type SpeciesType = 'Dog' | 'Cat';
type SizeType = 'SMALL' | 'MEDIUM' | 'LARGE';

const { width: SCREEN_WIDTH } = Dimensions.get('window');




interface AddPetFormData {
  name: string;
  species: SpeciesType;
  breed: string;
  color: string;
  weight: string;
  size: SizeType;
  dob: string;
  microchip: string;
  description: string;
  gender: GenderType;
  imageUrl: string;
  contactName: string;
  contactPhone: string;
  contactAddress: string;
  vaccinationRecordUrls: string[];
  qrCodeUrl: string;
  sterilized: boolean | null;
  hasNextDueDate?: boolean;
  nextDueDate?: string;
  vaccineName?: string;
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
      className="w-full bg-white border border-[#E5E5E5] rounded-[16px] px-4 text-black h-14"
      placeholder={placeholder}
      placeholderTextColor="#9CA3AF"
      value={value}
      onChangeText={onChangeText}
      style={{ fontFamily: "Urbanist-Regular" }}
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
        className={`w-full bg-white border border-[#E5E5E5] rounded-[16px] h-14 px-4 flex-row items-center justify-between ${isOpen ? 'border-[#E89B5A]' : ''}`}
      >
        <Text className={`${value ? 'text-black' : 'text-[#9CA3AF]'} text-[14px] font-medium`} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Feather name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color="#9CA3AF" />
      </TouchableOpacity>

      {isOpen && (
        <View
          className="w-full bg-white border border-[#E5E5E5] rounded-[16px] mt-2 overflow-hidden"
          style={{ maxHeight: 220 }}
        >
          {options.length === 0 ? (
            <View className="px-4 py-4">
              <Text className="text-[13px] text-[#9CA3AF] italic">
                Không có lựa chọn nào
              </Text>
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

// =====================================================================
// 🚀 FIX 2: Tách Component MedicalRecordItem và bọc React.memo
// =====================================================================
interface MedicalRecordItemProps {
  record: any;
  index: number;
  isVi: boolean;
  onDelete: (index: number) => void;
}

const MedicalRecordItem = memo(({ record, index, isVi, onDelete }: MedicalRecordItemProps) => {
  const formattedRecordDate = record.recordDate ? new Date(record.recordDate).toLocaleDateString(isVi ? 'vi-VN' : 'en-US') : '';
  const formattedNextDueDate = record.nextDueDate ? new Date(record.nextDueDate).toLocaleDateString(isVi ? 'vi-VN' : 'en-US') : '';
  const recordNameText = getLocalizedField(record.recordName, isVi ? 'vi' : 'en');
  const nextDueNameText = getLocalizedField(record.nextDueName, isVi ? 'vi' : 'en');

  return (
    <View className="p-4 bg-[#FAFAFA] rounded-[12px] mb-3 border border-[#E5E5EA] flex-row items-center justify-between">
      <View>
        <Text className="font-semibold text-[#111827] text-[15px] mb-1">
          {recordNameText || (isVi ? "Hồ sơ không tên" : "Unnamed Record")}
        </Text>
        <Text className="text-[#6B7280] text-[13px]">
          {isVi ? 'Loại' : 'Type'}: {record.type} | {isVi ? 'Ngày' : 'Date'}: {formattedRecordDate}
        </Text>
        {record.hasNextDueDate && (
          <Text className="text-[#E89B5A] text-[12px] mt-1 font-medium">
            {isVi ? 'Lịch tiếp theo' : 'Next due'}: {formattedNextDueDate} ({nextDueNameText})
          </Text>
        )}
      </View>
      <TouchableOpacity
        onPress={() => onDelete(index)}
        className="p-2"
      >
        <Ionicons name="trash-outline" size={12} color="#7e7e7e" />
      </TouchableOpacity>
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.record === nextProps.record &&
    prevProps.isVi === nextProps.isVi &&
    prevProps.index === nextProps.index
  );
});
// =====================================================================

export default function AddPetScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const tagId = params.tagId as string;
  const rawQrData = params.rawQrData as string;
  const { t, language } = useLanguage();
  const isVi = language === 'vi';
  const showModal = useModalStore((state) => state.showModal);

  const [showMedicalModal, setShowMedicalModal] = useState(false);
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);

  // 🚀 FIX 3: Dùng useCallback cho hàm xóa Record
  const handleDeleteMedicalRecord = useCallback((indexToDelete: number) => {
    setMedicalRecords(prev => prev.filter((_, i) => i !== indexToDelete));
  }, []);

  const speciesData = [
    { label: isVi ? 'Chó' : 'Dog', value: 'Dog' },
    { label: isVi ? 'Mèo' : 'Cat', value: 'Cat' },
  ];

  const genderData = [
    { label: isVi ? 'Đực' : 'Male', value: 'MALE' },
    { label: isVi ? 'Cái' : 'Female', value: 'FEMALE' },
  ];

  const { pickAndUploadImage: pickAvatar, isUploading: isUploadingAvatar } = useImageUpload();

  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- STATE CHO DATE PICKER GỐC CỦA ANDROID ---
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isCustomBreed, setIsCustomBreed] = useState(false);

  // --- STATE QUẢN LÝ VACCINE UI (Chỉ cho upload gallery modal) ---
  const [isUploadingVaccine, setIsUploadingVaccine] = useState(false);
  const [isVaccineModalVisible, setVaccineModalVisible] = useState(false);

  // --- STATE CHO IOS GLASSMORPHISM DATE PICKER ---
  const dobRef = useRef<View>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const [activePicker, setActivePicker] = useState<'dob' | null>(null);
  const [pickerLayout, setPickerLayout] = useState({ x: 0, y: 0, width: 340 });
  const pickerOpacity = useRef(new Animated.Value(0)).current;
  const pickerTranslateY = useRef(new Animated.Value(-8)).current;

  const openDropdownPicker = (type: 'dob') => {
    Keyboard.dismiss(); // Đóng bàn phím nếu đang mở

    // Đo tọa độ của dobRef dựa trên contentRef (Native Component chuẩn)
    if (contentRef.current && dobRef.current) {
      dobRef.current.measureLayout(
        contentRef.current,
        (left, top, width, height) => {
          // Cuộn ScrollView đến vị trí vừa đo (trừ đi 120px để chừa chỗ phía trên)
          scrollViewRef.current?.scrollTo({ y: Math.max(0, top - 120), animated: true });

          // Chờ animation cuộn xong (350ms) rồi mới tính toạ độ trên màn hình để mở Picker
          setTimeout(() => {
            dobRef.current?.measureInWindow((x, windowY, w, h) => {
              const dropdownWidth = 340;
              const finalX = (SCREEN_WIDTH - dropdownWidth) / 2; // Luôn căn giữa tuyệt đối

              setPickerLayout({ x: finalX, y: windowY + h + 8, width: dropdownWidth });
              setActivePicker(type);

              Animated.parallel([
                Animated.timing(pickerOpacity, { toValue: 1, duration: 200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                Animated.timing(pickerTranslateY, { toValue: 0, duration: 250, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true })
              ]).start();
            });
          }, 350);
        },
        () => console.log('Lỗi không thể đo kích thước layout')
      );
    }
  };

  const closeDropdownPicker = () => {
    Animated.parallel([
      Animated.timing(pickerOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(pickerTranslateY, { toValue: -8, duration: 150, useNativeDriver: true })
    ]).start(() => setActivePicker(null));
  };
  // ------------------------------------------------

  // --- ADDRESS POPUP STATE & LOGIC ---
  const [showAddressPopup, setShowAddressPopup] = useState(false);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [wardOptions, setWardOptions] = useState<string[]>([]);
  const [tempCity, setTempCity] = useState('');
  const [tempWard, setTempWard] = useState('');
  const [tempDetail, setTempDetail] = useState('');

  const cleanAdminPrefix = (name: string) => {
    if (!name) return '';
    return name.replace(/^(Thành phố|Tỉnh|Quận|Huyện|Thị xã|Phường|Xã|Thị trấn)\s+/i, '').trim();
  };

  useEffect(() => {
    fetch('https://provinces.open-api.vn/api/v2/p/')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const formattedProvinces = data
            .map((p: any) => ({
              ...p,
              name: cleanAdminPrefix(p.name)
            }))
            .sort((a: any, b: any) => a.name.localeCompare(b.name, 'vi'));
          setProvinces([...formattedProvinces]);
        }
      })
      .catch(e => console.error(isVi ? "Lỗi fetch tỉnh/thành:" : "Error fetching provinces:", e));
  }, [isVi]);

  const cityOptions = provinces.map((c: any) => c.name);

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
            const sortedWards = data
              .map((ward: any) => cleanAdminPrefix(ward.name))
              .sort((a: string, b: string) => a.localeCompare(b, 'vi'));
            setWardOptions(sortedWards);
          }
        })
        .catch(e => console.error(isVi ? "Lỗi fetch chi tiết phường/xã:" : "Error fetching wards:", e));
    }
  }, [tempCity, provinces, isVi]);

  const handleConfirmAddress = () => {
    if (!tempCity || !tempWard) {
      Alert.alert(
        isVi ? "Thiếu thông tin" : "Missing Information",
        isVi ? "Vui lòng chọn Tỉnh/Thành phố và Phường/Xã." : "Please select City/Province and Ward/District."
      );
      return;
    }
    let fullAddress = `${tempWard}, ${tempCity}`;
    if (tempDetail.trim()) {
      fullAddress = `${tempDetail.trim()}, ${fullAddress}`;
    }
    handleChange('contactAddress', fullAddress);
    setShowAddressPopup(false);
  };

  const [formData, setFormData] = useState<AddPetFormData>({
    name: '',
    species: 'Dog',
    size: 'MEDIUM',
    breed: '',
    color: '',
    weight: '',
    dob: '',
    microchip: '',
    description: '',
    gender: 'UNKNOWN',
    imageUrl: '',
    contactName: '',
    contactPhone: '',
    contactAddress: '',
    vaccinationRecordUrls: [],
    qrCodeUrl: '',
    sterilized: null,
    hasNextDueDate: false,
    nextDueDate: '',
    vaccineName: ''
  });

  const inputFontStyle = { fontFamily: 'Urbanist-Regular' };

  const handlePickAvatar = async () => {
    const uploadedUrl = await pickAvatar({
      folder: 'pets',
      aspect: [1, 1],
      quality: 0.8,
    });
    if (uploadedUrl) {
      handleChange('imageUrl', uploadedUrl);
    }
  };

  const handlePickVaccine = async (mode: 'camera' | 'gallery') => {
    setVaccineModalVisible(false);
    try {
      const currentCount = formData.vaccinationRecordUrls.length;
      const remainingSlots = 5 - currentCount;

      if (remainingSlots <= 0) {
        Alert.alert(isVi ? "Giới hạn" : "Limit Reached", isVi ? "Bạn chỉ được tải lên tối đa 5 tài liệu tiêm chủng." : "You can upload up to 5 vaccination documents.");
        return;
      }

      let result;
      if (mode === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(isVi ? 'Lỗi' : 'Error', isVi ? 'Cần cấp quyền truy cập máy ảnh!' : 'Camera access permission is required!');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          selectionLimit: remainingSlots,
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets) {
        const newLocalUrls = result.assets.slice(0, remainingSlots).map(asset => asset.uri);
        handleChange('vaccinationRecordUrls', [
          ...formData.vaccinationRecordUrls,
          ...newLocalUrls
        ]);
      }
    } catch (error) {
      console.error(isVi ? "Lỗi picker:" : "Picker error:", error);
      Alert.alert(isVi ? "Lỗi" : "Error", isVi ? "Không thể lấy ảnh." : "Cannot pick image.");
    }
  };

  const handleChange = (field: keyof AddPetFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'set' && selectedDate) {
      handleChange('dob', selectedDate.toISOString());
    } else if (event.type === 'dismissed') {
      setShowDatePicker(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      showModal({
        title: isVi ? 'Thiếu thông tin' : 'Missing Information',
        message: isVi ? "Vui lòng nhập tên thú cưng." : "Please enter the pet's name.",
        buttonText: 'OK',
        onConfirm: () => { }
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const species = (formData.species as 'Dog' | 'Cat') || 'Dog';
      const [colorBilingual, descriptionBilingual, breedBilingual] = await Promise.all([
        buildBilingualOnSubmit(formData.color, { vi: '', en: '' }, isVi),
        buildBilingualOnSubmit(formData.description, { vi: '', en: '' }, isVi),
        formData.breed
          ? (buildBreedBilingual(formData.breed, species) ??
            buildBilingualOnSubmit(formData.breed, { vi: '', en: '' }, isVi))
          : Promise.resolve(null),
      ]);


      // 1. XỬ LÝ UPLOAD ẢNH CHO MEDICAL RECORDS
      let processedMedicalRecords: any[] = [];

      if (medicalRecords.length > 0) {
        setIsUploadingVaccine(true);

        processedMedicalRecords = await Promise.all(
          medicalRecords.map(async (record) => {
            // 🚀 FIX: Ép thành chuỗi JSON để lọt qua vòng ValidationPipe của NestJS an toàn
            const formattedRecordName = typeof record.recordName === 'object' ? JSON.stringify(record.recordName) : record.recordName;
            const formattedNextDueName = record.nextDueName && typeof record.nextDueName === 'object' ? JSON.stringify(record.nextDueName) : record.nextDueName;

            // Nếu không có ảnh, trả về record kèm tên đã format
            if (!record.images || record.images.length === 0) {
              return { ...record, recordName: formattedRecordName, nextDueName: formattedNextDueName };
            }

            const uploadedUrls = await Promise.all(
              record.images.map(async (uri: string) => {
                if (uri.startsWith('http')) return uri;
                try {
                  const filename = uri.split('/').pop() || `record-${Date.now()}.jpg`;
                  const type = filename.toLowerCase().endsWith('png') ? 'image/png' : 'image/jpeg';
                  const presignedRes = await axiosClient.post('/storage/presigned-url', {
                    fileName: filename, fileType: type, folder: 'medical-records'
                  });
                  const localFileFetch = await fetch(uri);
                  const fileBlob = await localFileFetch.blob();
                  const uploadRes = await fetch(presignedRes.data.uploadUrl, {
                    method: 'PUT', headers: { 'Content-Type': type }, body: fileBlob
                  });
                  if (!uploadRes.ok) throw new Error('Upload R2 failed');
                  return presignedRes.data.fileUrl;
                } catch (error) {
                  console.error("Lỗi upload file y tế:", error);
                  return null;
                }
              })
            );

            return {
              ...record,
              images: uploadedUrls.filter(Boolean),
              recordName: formattedRecordName,
              nextDueName: formattedNextDueName
            };
          })
        );
      }

      // 2. KHAI BÁO PAYLOAD MỚI
      const payload = {
        name: formData.name,
        species: SPECIES_BILINGUAL[species],
        breed: breedBilingual ?? undefined,
        gender: formData.gender !== 'UNKNOWN' ? formData.gender : undefined,
        color: colorBilingual ?? undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        size: formData.size,
        description: descriptionBilingual ?? undefined,
        contactName: formData.contactName || undefined,
        contactPhone: formData.contactPhone || undefined,
        contactAddress: formData.contactAddress || undefined,
        images: formData.imageUrl ? [formData.imageUrl] : [],

        medicalRecords: processedMedicalRecords,

        ...(formData.dob && { dob: formData.dob }),
        isSpayedNeutered: formData.sterilized !== null ? formData.sterilized : undefined,
        ...(tagId && { tagId: (tagId as string).trim() }),
        ...(rawQrData && { qrCodeUrl: rawQrData }),
      };

      const newPet = await petService.addPet(payload);
      const realPetId = newPet?.id || newPet?.data?.id;

      setIsSubmitting(false); // Tắt loading ngay lập tức
      setIsUploadingVaccine(false);

      showModal({
        title: isVi ? 'Thành công' : 'Success',
        message: tagId
          ? (isVi ? 'Tạo hồ sơ thú cưng thành công! Vòng cổ đã được kích hoạt.' : 'Pet profile created successfully! Collar is activated.')
          : (isVi ? 'Tạo hồ sơ thành công!\n(Profile hiện chưa có QR code, bạn có thể cập nhật và gán vòng cổ sau).' : 'Profile created successfully!\n(Currently no QR code, you can update and assign a collar later).'),
        buttonText: 'OK',
        onConfirm: () => {
          // Thêm delay nhỏ (100-300ms) để modal kịp đóng hiệu ứng mượt mà trước khi chuyển trang
          setTimeout(() => {
            router.replace(`/pet-profile-detail?id=${realPetId}`);
            // Lời khuyên: Dùng router.replace thay vì push để User bấm Back không bị quay lại màn form thêm mới
          }, 150);
        }
      });

    } catch (error: any) {
      showModal({
        title: isVi ? 'Lỗi' : 'Error',
        message: error.response?.data?.message || error.message || (isVi ? 'Thêm thú cưng thất bại. Vui lòng thử lại.' : 'Failed to add pet. Please try again.'),
        buttonText: isVi ? 'Thử lại' : 'Try Again',
        onConfirm: () => { }
      });
    } finally {
      setIsSubmitting(false);
      setIsUploadingVaccine(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1">
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-4 bg-white z-10">
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
            <Text className="text-[18px] font-semibold text-[#000000]">{isVi ? 'Thêm thú cưng' : 'Add Pet'}</Text>
            <View className="w-8" />
          </View>

          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 60, paddingHorizontal: 20 }}
            className="flex-1"
          >
            <View ref={contentRef} collapsable={false}>

              {/* Avatar Section */}
              <View className="items-center mt-6 mb-8">
                <TouchableOpacity
                  onPress={handlePickAvatar}
                  disabled={isUploadingAvatar}
                  className="w-[128px] h-[128px] rounded-full bg-[#E5E5E5] border border-[#E5E5E5] items-center justify-center overflow-hidden shadow-sm"
                >
                  {isUploadingAvatar ? (
                    <ActivityIndicator size="large" color="#EFA062" />
                  ) : formData.imageUrl ? (
                    <Image
                      source={{ uri: formData.imageUrl }}
                      className="w-full h-full"
                    />
                  ) : (
                    <Image source={require('../assets/icon/image.png')} style={{ width: 56, height: 56 }} resizeMode="cover" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Pet Information Section */}
              <View className="mb-[38px]">
                <Text className="text-[16px] font-semibold text-black mb-[20px] tracking-[0.06px]">{isVi ? 'Thông tin thú cưng' : 'Pet Information'}</Text>

                <View className="bg-white p-6 rounded-[20px] border border-[#E5E5E5]">
                  <View className="flex-row gap-3 mb-5">
                    <View className="flex-1">
                      <Text className="text-[14px] text-black font-medium mb-1.5">{isVi ? 'Tên' : 'Name'}</Text>
                      <TextInput
                        style={inputFontStyle}
                        className="h-[34px] border border-[#E5E5E5] rounded-[12px] px-3.5 text-black text-[14px]"
                        value={formData.name}
                        onChangeText={(text) => handleChange('name', text)}
                        placeholder={isVi ? "Tên thú cưng" : "Pet name"}
                        placeholderTextColor="#A1A1AA"
                      />
                    </View>

                    <View className="flex-1">
                      <Text className="text-[14px] text-black font-medium mb-1.5">{isVi ? 'Loài' : 'Type'}</Text>
                      <Dropdown
                        style={{
                          height: 34,
                          borderColor: '#E5E7EB',
                          borderWidth: 1,
                          borderRadius: 12,
                          paddingHorizontal: 16,
                          backgroundColor: '#FFFFFF',
                        }}
                        containerStyle={{ borderRadius: 12, overflow: 'hidden', marginTop: 2, borderColor: '#E5E7EB', borderWidth: 1 }}
                        placeholderStyle={{ fontSize: 14, color: '#9CA3AF', fontFamily: 'Urbanist' }}
                        selectedTextStyle={{ fontSize: 14, color: '#000000', fontFamily: 'Urbanist' }}
                        itemTextStyle={{ fontSize: 14, color: '#000000', fontFamily: 'Urbanist' }}
                        data={speciesData}
                        maxHeight={200}
                        labelField="label"
                        valueField="value"
                        placeholder={isVi ? 'Chọn loài' : 'Select type'}
                        value={formData.species}
                        onChange={(item) => {
                          handleChange('species', item.value);
                          handleChange('breed', '');
                        }}
                      />
                    </View>
                  </View>

                  {/* Gender & Sterilized Row */}
                  <View className="flex-row gap-3 mb-5">
                    <View className="flex-1">
                      <Text className="text-[14px] text-black font-medium mb-1.5">{isVi ? 'Giới tính' : 'Gender'}</Text>
                      <Dropdown
                        style={{
                          height: 34,
                          borderColor: '#E5E7EB',
                          borderWidth: 1,
                          borderRadius: 12,
                          paddingHorizontal: 16,
                          backgroundColor: '#FFFFFF',
                        }}
                        containerStyle={{ borderRadius: 12, overflow: 'hidden', marginTop: 4, borderColor: '#E5E7EB', borderWidth: 1 }}
                        placeholderStyle={{ fontSize: 14, color: '#9CA3AF', fontFamily: 'Urbanist' }}
                        selectedTextStyle={{ fontSize: 14, color: '#000000', fontFamily: 'Urbanist' }}
                        itemTextStyle={{ fontSize: 14, color: '#000000', fontFamily: 'Urbanist' }}
                        data={genderData}
                        maxHeight={200}
                        labelField="label"
                        valueField="value"
                        placeholder={isVi ? 'Chọn giới tính' : 'Select gender'}
                        value={formData.gender}
                        onChange={(item) => handleChange('gender', item.value)}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[14px] text-black font-medium mb-2.5">{isVi ? 'Đã triệt sản' : 'Sterilized'}</Text>
                      <View className="flex-row items-center gap-8 h-[30px]">
                        <TouchableOpacity activeOpacity={0.7} onPress={() => handleChange('sterilized', true)} className="flex-row items-center">
                          <View className={`w-[16px] h-[16px] rounded-full border items-center justify-center mr-2 ${formData.sterilized === true ? 'border-[#E89B5A]' : 'border-[#E5E5E5]'}`}>
                            {formData.sterilized === true && <View className="w-2.5 h-2.5 rounded-full bg-[#E89B5A]" />}
                          </View>
                          <Text className="text-[14px] text-[#8E8E93]">{isVi ? 'Có' : 'Yes'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity activeOpacity={0.7} onPress={() => handleChange('sterilized', false)} className="flex-row items-center">
                          <View className={`w-[16px] h-[16px] rounded-full border items-center justify-center mr-2  ${formData.sterilized === false ? 'border-[#E89B5A]' : 'border-[#E5E5E5]'}`}>
                            {formData.sterilized === false && <View className="w-2.5 h-2.5 rounded-full bg-[#E89B5A]" />}
                          </View>
                          <Text className="text-[14px] text-[#8E8E93]">{isVi ? 'Không' : 'No'}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Color & Breed Row */}
                  <View className="flex-row gap-3 mb-5">
                    <View className="flex-1">
                      <Text className="text-[14px] text-black font-medium mb-1.5">{isVi ? 'Giống' : 'Breed'}</Text>
                      <Dropdown
                        style={{
                          height: 34,
                          borderColor: '#E5E7EB',
                          borderWidth: 1,
                          borderRadius: 12,
                          paddingHorizontal: 16,
                          backgroundColor: formData.species ? '#FFFFFF' : '#F9FAFB',
                        }}
                        containerStyle={{ borderRadius: 12, overflow: 'hidden', marginTop: 4, borderColor: '#E5E7EB', borderWidth: 1 }}
                        placeholderStyle={{ fontSize: 14, color: '#9CA3AF', fontFamily: 'Urbanist' }}
                        selectedTextStyle={{ fontSize: 14, color: '#000000', fontFamily: 'Urbanist' }}
                        itemTextStyle={{ fontSize: 14, color: '#000000', fontFamily: 'Urbanist' }}
                        data={formData.species ? getBreedOptions(formData.species, isVi) : []}
                        disable={!formData.species}
                        maxHeight={250}
                        labelField="label"
                        valueField="value"
                        placeholder={formData.species ? (isVi ? "Chọn Giống" : "Select breed") : (isVi ? "Hãy chọn loài trước" : "Select type first")}
                        value={isCustomBreed ? OTHER_BREED_VALUE : formData.breed}
                        onChange={(item) => {
                          if (item.value === OTHER_BREED_VALUE) {
                            setIsCustomBreed(true);
                            handleChange('breed', '');
                          } else {
                            setIsCustomBreed(false);
                            handleChange('breed', item.value);
                          }
                        }}
                      />

                      {isCustomBreed && (
                        <TextInput
                          style={inputFontStyle}
                          className="h-[34px] border border-[#E89B5A] rounded-[12px] px-3.5 text-black text-[14px] mt-2"
                          value={formData.breed}
                          onChangeText={(text) => handleChange('breed', text)}
                          placeholder={isVi ? "Nhập tên giống..." : "Enter breed name..."}
                          placeholderTextColor="#A1A1AA"
                          autoFocus
                        />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="text-[14px] text-black font-medium mb-1.5">{isVi ? 'Màu sắc' : 'Color'}</Text>
                      <TextInput
                        style={inputFontStyle}
                        className="h-[34px] border border-[#E5E5E5] rounded-[12px] px-3.5 text-black text-[14px]"
                        value={formData.color}
                        onChangeText={(text) => handleChange('color', text)}
                        placeholder={isVi ? "Màu sắc" : "Color"}
                        placeholderTextColor="#A1A1AA"
                      />
                    </View>
                  </View>

                  {/* Birthday & Weight Row */}
                  <View className="flex-row gap-3">
                    <View className="flex-1" ref={dobRef} collapsable={false}>
                      <Text className="text-[14px] text-black font-medium mb-1.5">{isVi ? 'Ngày sinh' : 'Birthday'}</Text>
                      <TouchableOpacity
                        onPress={() => Platform.OS === 'ios' ? openDropdownPicker('dob') : setShowDatePicker(true)}
                        className="h-[34px] border border-[#E5E5E5] rounded-[12px] px-3.5 justify-center bg-white"
                      >
                        <Text className={`text-[14px] ${formData.dob ? 'text-black' : 'text-[#A1A1AA]'}`}>
                          {formData.dob ? new Date(formData.dob).toLocaleDateString('en-GB') : 'DD/MM/YYYY'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View className="flex-1">
                      <Text className="text-[14px] text-black font-medium mb-1.5">{isVi ? 'Cân nặng' : 'Weight'}</Text>
                      <TextInput
                        style={inputFontStyle}
                        className="h-[34px] border border-[#E5E5E5] rounded-[12px] px-3.5 text-black text-[14px]"
                        value={formData.weight}
                        onChangeText={(text) => handleChange('weight', text.replace(/[^0-9.]/g, ''))}
                        keyboardType="decimal-pad"
                        placeholder={isVi ? "Cân nặng (kg)" : "Weight (kg)"}
                        placeholderTextColor="#A1A1AA"
                      />
                    </View>
                  </View>

                  <View className="h-[1px] bg-gray-100 my-5" />

                  {/* Notes */}
                  <View>
                    <Text className="text-[14px] text-black font-medium mb-1.5">{isVi ? 'Ghi chú' : 'Notes'}</Text>
                    <TextInput
                      style={[inputFontStyle, { paddingTop: 12 }]}
                      className="border border-[#E5E5E5] rounded-[12px] px-3.5 pb-3 text-black text-[14px] min-h-[59px]"
                      value={formData.description}
                      onChangeText={(text) => handleChange('description', text)}
                      placeholder={isVi ? "Hãy chia sẻ một vài điều khiến thú cưng của bạn trở nên đặc biệt..." : "Share a few things that make your pet special..."}
                      placeholderTextColor="#A1A1AA"
                      multiline
                      textAlignVertical="top"
                      numberOfLines={1}
                    />
                  </View>
                </View>
              </View>

              {/* Owner Information Section */}
              <View className="mb-[38px]">
                <Text className="text-[16px] font-semibold text-black mb-[20px] tracking-[0.06px]">{isVi ? 'Thông tin chủ nuôi' : 'Owner Information'}</Text>

                <View className="bg-white rounded-[16px] border border-[#E5E5E5] px-[18px] py-[3px]">
                  {/* Name */}
                  <View className="flex-row items-center py-4 border-b border-gray-100">
                    <Text className="text-[14px] font-medium text-black w-[80px]">{isVi ? 'Tên' : 'Name'}</Text>
                    <TextInput
                      style={inputFontStyle}
                      className="flex-1 text-right text-[14px] text-black p-0"
                      value={formData.contactName}
                      onChangeText={(text) => handleChange('contactName', text)}
                      placeholder={isVi ? "Họ Và Tên" : "Full Name"}
                      placeholderTextColor="#A1A1AA"
                    />
                  </View>

                  {/* Phone */}
                  <View className="flex-row items-center py-4 border-b border-gray-100">
                    <Text className="text-[14px] font-medium text-black w-[80px]">{isVi ? 'SĐT' : 'Phone'}</Text>
                    <TextInput
                      style={inputFontStyle}
                      className="flex-1 text-right text-[14px] text-black p-0"
                      value={formData.contactPhone}
                      onChangeText={(text) => handleChange('contactPhone', text.replace(/[^0-9]/g, ''))}
                      keyboardType="phone-pad"
                      placeholder={isVi ? "Số Điện Thoại" : "Phone Number"}
                      placeholderTextColor="#A1A1AA"
                      maxLength={15}
                    />
                  </View>

                  {/* Address */}
                  <View className="flex-row items-center py-4">
                    <Text className="text-[14px] font-medium text-black w-[80px]">{isVi ? 'Địa chỉ' : 'Address'}</Text>
                    <TouchableOpacity onPress={() => setShowAddressPopup(true)} className="flex-1 items-end justify-center">
                      <Text
                        style={inputFontStyle}
                        className={`text-right text-[14px] p-0 ${formData.contactAddress ? 'text-black' : 'text-[#A1A1AA]'}`}
                        numberOfLines={1}
                      >
                        {formData.contactAddress || (isVi ? "Địa chỉ của bạn" : "Street Address, District, City")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* MEDICAL RECORDS SECTION */}
              <View className="mb-[38px]">
                <View className="flex-row justify-between items-center mb-[20px]">
                  <Text className="text-[16px] font-semibold text-[#111827] tracking-[0.06px]">
                    {isVi ? 'Hồ sơ y tế' : 'Medical Records'} ({medicalRecords.length})
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowMedicalModal(true)}
                    className="bg-[#FFF8F0] px-4 py-2 rounded-full border border-[#E89B5A]/30"
                  >
                    <Text className="text-[#E89B5A] font-medium text-[13px]">{isVi ? '+ Thêm hồ sơ' : '+ Add Record'}</Text>
                  </TouchableOpacity>
                </View>

                {/* 🚀 FIX 4: Thay thế khối code cũ bằng Component MedicalRecordItem đã được memoize */}
                {medicalRecords.length === 0 ? (
                  <Text className="text-gray-400 text-[14px] italic">
                    {isVi ? 'Chưa có hồ sơ y tế nào.' : 'No medical records yet.'}
                  </Text>
                ) : (
                  medicalRecords.map((record, index) => (
                    <MedicalRecordItem
                      key={record.id || `medical-record-${index}`}
                      record={record}
                      index={index}
                      isVi={isVi}
                      onDelete={handleDeleteMedicalRecord}
                    />
                  ))
                )}
              </View>

              {/* Action Buttons */}
              <View className="space-y-3">
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={isSubmitting || isUploadingAvatar || isUploadingVaccine}
                  className={`bg-[#E89B5A] h-[52px] rounded-[16px] items-center justify-center flex-row ${(isSubmitting || isUploadingVaccine) ? 'opacity-70' : ''}`}
                >
                  {(isSubmitting || isUploadingVaccine) ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text className="text-white font-semibold text-[16px]">{isVi ? 'Lưu' : 'Save'}</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.back()}
                  disabled={isSubmitting || isUploadingVaccine}
                  className="bg-white border border-[#E5E5E5] h-[52px] rounded-[16px] items-center justify-center mt-4"
                >
                  <Text className="text-[#9CA3AF] font-medium text-[16px]">{isVi ? 'Hủy' : 'Cancel'}</Text>
                </TouchableOpacity>
              </View>

            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* ================= MODALS & PICKERS ================= */}

      {/* ANDROID GỐC DATE PICKER CHO NGÀY SINH */}
      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={formData.dob ? new Date(formData.dob) : new Date()}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={onDateChange}
        />
      )}

      {/* --- KÍNH MỜ DROPDOWN FIX CHIỀU CAO VÀ MÀU CAM (IOS) - CHO NGÀY SINH --- */}
      {Platform.OS === 'ios' && activePicker === 'dob' && (
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
                value={formData.dob ? new Date(formData.dob) : new Date()}
                mode="date"
                display="inline"
                themeVariant="dark"
                locale={isVi ? "vi-VN" : "en-US"}
                maximumDate={new Date()}
                style={{ width: 320, height: 315, alignSelf: 'center' }}
                accentColor="#E89B5A"
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    handleChange('dob', selectedDate.toISOString());
                  }
                }}
              />
            </View>
          </Animated.View>
        </View>
      )}

      {/* Modal Chọn Phương thức Upload Ảnh (Camera / Gallery) - Cho Vaccine (cũ) */}
      <Modal visible={isVaccineModalVisible} transparent animationType="fade">
        <TouchableOpacity
          className="flex-1 bg-black/40 justify-end"
          activeOpacity={1}
          onPress={() => setVaccineModalVisible(false)}
        >
          <View className="bg-white rounded-t-[24px] px-5 py-6 pb-10">
            <Text className="text-[18px] font-bold mb-4 text-center text-[#111827]">{isVi ? 'Tải ảnh lên' : 'Upload photo'}</Text>

            <TouchableOpacity
              className="flex-row items-center py-4 px-2"
              onPress={() => handlePickVaccine('camera')}
            >
              <Ionicons name="camera-outline" size={24} color="#374151" />
              <Text className="text-[16px] ml-4 text-[#374151] font-medium">{isVi ? 'Chụp ảnh mới' : 'Take new photo'}</Text>
            </TouchableOpacity>

            <View className="h-[1px] bg-[#F3F4F6] my-1" />

            <TouchableOpacity
              className="flex-row items-center py-4 px-2"
              onPress={() => handlePickVaccine('gallery')}
            >
              <Ionicons name="images-outline" size={24} color="#374151" />
              <Text className="text-[16px] ml-4 text-[#374151] font-medium">{isVi ? 'Chọn từ thư viện' : 'Choose from gallery'}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* --- POPUP ADDRESS MODAL --- */}
      <Modal visible={showAddressPopup} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center px-4">
          <View className="bg-white rounded-[24px] p-6 shadow-2xl max-h-[85%]">
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text className="text-[20px] font-semibold text-black mb-2 text-center">
                {isVi ? 'Địa chỉ của bạn' : 'Your Address'}
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
                  <Text className="text-[#8E8E93] font-bold text-[14px]">{isVi ? 'Hủy bỏ' : 'Cancel'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 py-4 rounded-xl bg-[#E89B5A] items-center shadow-sm"
                  onPress={handleConfirmAddress}
                >
                  <Text className="text-white font-bold text-[14px]">{isVi ? 'Xác nhận' : 'Confirm'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Gọi component Modal Medical Record */}
      <AddMedicalRecordModal
        visible={showMedicalModal}
        onClose={() => setShowMedicalModal(false)}
        species={formData.species as 'Dog' | 'Cat'}
        onSubmit={(data) => {
          setMedicalRecords(prev => [...prev, data]);
        }}
      />
    </SafeAreaView>
  );
}