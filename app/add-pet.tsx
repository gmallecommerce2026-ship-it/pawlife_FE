import axiosClient from '@/api/axiosClient';
import AddMedicalRecordModal from '@/components/AddMedicalRecordModal';
import { Text } from '@/components/AppText';
import { useLanguage } from '@/contexts/LanguageContext';
import { petService } from '@/services/petService';
import { useModalStore } from '@/store/useModalStore';
import { AntDesign, Feather, Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useImageUpload } from '../hooks/useImageUpload';
import { TextInput } from '@/components/AppTextInput';

type GenderType = 'MALE' | 'FEMALE' | 'UNKNOWN';
type SpeciesType = 'Dog' | 'Cat';
type SizeType = 'SMALL' | 'MEDIUM' | 'LARGE';

const BREED_OPTIONS = {
  Dog: [
    { label: 'Unknown Breed', value: 'Unknown Breed' },
    { label: 'Mixed Breed', value: 'Mixed Breed' },
    { label: 'VN Local Dog', value: 'VN Local Dog' },
    { label: 'Poodle', value: 'Poodle' },
    { label: 'Pomeranian', value: 'Pomeranian' },
    { label: 'Corgi', value: 'Corgi' },
    { label: 'Golden Retriever', value: 'Golden Retriever' },
    { label: 'Labrador Retriever', value: 'Labrador Retriever' },
    { label: 'Chihuahua', value: 'Chihuahua' },
    { label: 'French Bulldog', value: 'French Bulldog' },
    { label: 'Husky', value: 'Husky' },
    { label: 'Shiba Inu', value: 'Shiba Inu' },
    { label: 'Samoyed', value: 'Samoyed' },
    { label: 'Dachshund', value: 'Dachshund' },
    { label: 'Beagle', value: 'Beagle' },
    { label: 'Pug', value: 'Pug' },
    { label: 'Border Collie', value: 'Border Collie' },
    { label: 'Maltese', value: 'Maltese' },
    { label: 'Yorkshire Terrier', value: 'Yorkshire Terrier' },
    { label: 'Schnauzer', value: 'Schnauzer' },
    { label: 'Chow Chow', value: 'Chow Chow' },
    { label: 'Alaskan Malamute', value: 'Alaskan Malamute' },
    { label: 'Akita', value: 'Akita' },
    { label: 'Doberman', value: 'Doberman' },
    { label: 'Rottweiler', value: 'Rottweiler' },
    { label: 'German Shepherd', value: 'German Shepherd' },
    { label: 'Phu Quoc Ridgeback', value: 'Phu Quoc Ridgeback' },
    { label: 'Bac Ha Dog', value: 'Bac Ha Dog' },
    { label: 'H’Mong Bobtail', value: 'H’Mong Bobtail' },
  ],
  Cat: [
    { label: 'Unknown Breed', value: 'Unknown Breed' },
    { label: 'Mixed Breed', value: 'Mixed Breed' },
    { label: 'Domestic Cat', value: 'Domestic Cat' },
    { label: 'British Shorthair', value: 'British Shorthair' },
    { label: 'Scottish Fold', value: 'Scottish Fold' },
    { label: 'Munchkin', value: 'Munchkin' },
    { label: 'Persian', value: 'Persian' },
    { label: 'Ragdoll', value: 'Ragdoll' },
    { label: 'Maine Coon', value: 'Maine Coon' },
    { label: 'Bengal', value: 'Bengal' },
    { label: 'Sphynx', value: 'Sphynx' },
    { label: 'Russian Blue', value: 'Russian Blue' },
    { label: 'Siamese', value: 'Siamese' },
    { label: 'Exotic Shorthair', value: 'Exotic Shorthair' },
    { label: 'Tabby Cat', value: 'Tabby Cat' },
    { label: 'Orange Cat', value: 'Orange Cat' },
    { label: 'Black Cat', value: 'Black Cat' },
    { label: 'White Cat', value: 'White Cat' },
    { label: 'Calico Cat', value: 'Calico Cat' },
    { label: 'Tuxedo Cat', value: 'Tuxedo Cat' },
    { label: 'Siamese Mix', value: 'Siamese Mix' },
    { label: 'Long Hair', value: 'Long Hair' },
    { label: 'Short Hair', value: 'Short Hair' },
  ]
};

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
  const [visible, setVisible] = useState(false);

  return (
    <View>
      <TouchableOpacity
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
        className={`w-full bg-white border border-[#E5E5E5] rounded-[16px] h-14 px-4 flex-row items-center justify-between ${visible ? 'border-[#E89B5A]' : ''}`}
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
  
  const speciesData = [
    { label: isVi ? 'Chó' : 'Dog', value: 'Dog' },
    { label: isVi ? 'Mèo' : 'Cat', value: 'Cat' },
  ];

  const genderData = [
    { label: isVi ? 'Đực' : 'Male', value: 'MALE' },
    { label: isVi ? 'Cái' : 'Female', value: 'FEMALE' },
    { label: isVi ? 'Không rõ' : 'Unknown', value: 'UNKNOWN' },
  ];

  const { pickAndUploadImage: pickAvatar, isUploading: isUploadingAvatar } = useImageUpload();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // State quản lý Vaccine UI
  const [isUploadingVaccine, setIsUploadingVaccine] = useState(false);
  const [isVaccineModalVisible, setVaccineModalVisible] = useState(false);
  const [showVaccineDatePicker, setShowVaccineDatePicker] = useState(false);

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

  const onVaccineDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowVaccineDatePicker(false);
    if (event.type === 'set' && selectedDate) {
      handleChange('nextDueDate', selectedDate.toISOString());
    } else if (event.type === 'dismissed') {
      setShowVaccineDatePicker(false);
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
      // 1. XỬ LÝ UPLOAD ẢNH CHO MEDICAL RECORDS
      let processedMedicalRecords: any[] = [];
      
      if (medicalRecords.length > 0) {
        setIsUploadingVaccine(true); // Tận dụng state này làm cờ loading

        processedMedicalRecords = await Promise.all(
          medicalRecords.map(async (record) => {
            if (!record.images || record.images.length === 0) return record;

            const uploadedUrls = await Promise.all(
              record.images.map(async (uri: string) => {
                if (uri.startsWith('http')) return uri; // Bỏ qua nếu đã là link mạng

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

            return { ...record, images: uploadedUrls.filter(Boolean) };
          })
        );
      }

      // 2. KHAI BÁO PAYLOAD MỚI
      const payload = {
        name: formData.name,
        species: formData.species,
        breed: formData.breed || undefined,
        gender: formData.gender !== 'UNKNOWN' ? formData.gender : undefined,
        color: formData.color || undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        size: formData.size,
        description: formData.description || undefined,
        contactName: formData.contactName || undefined,
        contactPhone: formData.contactPhone || undefined,
        contactAddress: formData.contactAddress || undefined,
        images: formData.imageUrl ? [formData.imageUrl] : [],
        
        // Truyền mảng Medical Records đã được upload ảnh
        medicalRecords: processedMedicalRecords, 
        
        ...(formData.dob && { dob: formData.dob }),
        isSpayedNeutered: formData.sterilized !== null ? formData.sterilized : undefined,
        ...(tagId && { tagId: (tagId as string).trim() }),
        ...(rawQrData && { qrCodeUrl: rawQrData }),
      };

      const newPet = await petService.addPet(payload);
      const realPetId = newPet?.id || newPet?.data?.id;

      router.push(`/pet-profile-detail?id=${realPetId}`);

      showModal({
        title: isVi ? 'Thành công' : 'Success',
        message: tagId
          ? (isVi ? 'Tạo hồ sơ thú cưng thành công! Vòng cổ đã được kích hoạt.' : 'Pet profile created successfully! Collar is activated.')
          : (isVi ? 'Tạo hồ sơ thành công!\n(Profile hiện chưa có QR code, bạn có thể cập nhật và gán vòng cổ sau).' : 'Profile created successfully!\n(Currently no QR code, you can update and assign a collar later).'),
        buttonText: 'OK',
        onConfirm: () => { }
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
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 60, paddingHorizontal: 20 }}
            className="flex-1"
          >
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
                      data={formData.species ? BREED_OPTIONS[formData.species as 'Dog' | 'Cat'] : []}
                      disable={!formData.species}
                      maxHeight={200}
                      labelField="label"
                      valueField="value"
                      placeholder={formData.species ? (isVi ? "Chọn Giống" : "Select breed") : (isVi ? "Hãy chọn loài trước" : "Select type first")}
                      value={formData.breed}
                      onChange={(item) => handleChange('breed', item.value)}
                    />
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
                  <View className="flex-1">
                    <Text className="text-[14px] text-black font-medium mb-1.5">{isVi ? 'Ngày sinh' : 'Birthday'}</Text>
                    <TouchableOpacity
                      onPress={() => setShowDatePicker(true)}
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

            {/* MEDICAL RECORDS SECTION (THAY THẾ CHỖ VACCINATION CŨ) */}
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

              {/* Danh sách các record đã được add qua Modal */}
              {medicalRecords.length === 0 ? (
                <Text className="text-gray-400 text-[14px] italic">
                  {isVi ? 'Chưa có hồ sơ y tế nào.' : 'No medical records yet.'}
                </Text>
              ) : (
                medicalRecords.map((record, index) => (
                  <View key={index} className="p-4 bg-[#FAFAFA] rounded-[12px] mb-3 border border-[#E5E5EA] flex-row items-center justify-between">
                    <View>
                      <Text className="font-semibold text-[#111827] text-[15px] mb-1">
                        {record.recordName || (isVi ? "Hồ sơ không tên" : "Unnamed Record")}
                      </Text>
                      <Text className="text-[#6B7280] text-[13px]">
                        {isVi ? 'Loại' : 'Type'}: {record.type} | {isVi ? 'Ngày' : 'Date'}: {new Date(record.recordDate).toLocaleDateString('vi-VN')}
                      </Text>
                      {record.hasNextDueDate && (
                        <Text className="text-[#E89B5A] text-[12px] mt-1 font-medium">
                          {isVi ? 'Lịch hẹn tiếp theo' : 'Next due'}: {new Date(record.nextDueDate).toLocaleDateString('vi-VN')} ({record.nextDueName})
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity 
                      onPress={() => {
                        setMedicalRecords(prev => prev.filter((_, i) => i !== index));
                      }}
                      className="p-2"
                    >
                      <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
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
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* ================= MODALS & PICKERS ================= */}

      {/* Date Picker cho Sinh nhật */}
      {Platform.OS === 'ios' ? (
        <Modal visible={showDatePicker} transparent animationType="slide">
          <View className="flex-1 justify-end bg-black/40">
            <View className="bg-white rounded-t-3xl p-4 pb-8">
              <View className="flex-row justify-between items-center mb-4 border-b border-gray-100 pb-3">
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text className="text-gray-500 font-medium text-lg px-2">{isVi ? 'Hủy' : 'Cancel'}</Text>
                </TouchableOpacity>
                <Text className="font-bold text-gray-900 text-lg">{isVi ? 'Ngày sinh' : 'Date of Birth'}</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text className="text-[#EFA062] font-bold text-lg px-2">{isVi ? 'Xong' : 'Done'}</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={formData.dob ? new Date(formData.dob) : new Date()}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={onDateChange}
                textColor="black"
              />
            </View>
          </View>
        </Modal>
      ) : (
        showDatePicker && (
          <DateTimePicker
            value={formData.dob ? new Date(formData.dob) : new Date()}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={onDateChange}
          />
        )
      )}

      {/* Date Picker cho Next Due Date Vaccine */}
      {Platform.OS === 'ios' ? (
        <Modal visible={showVaccineDatePicker} transparent animationType="slide">
          <View className="flex-1 justify-end bg-black/40">
            <View className="bg-white rounded-t-3xl p-4 pb-8">
              <View className="flex-row justify-between items-center mb-4 border-b border-gray-100 pb-3">
                <TouchableOpacity onPress={() => setShowVaccineDatePicker(false)}>
                  <Text className="text-gray-500 font-medium text-lg px-2">{isVi ? 'Hủy' : 'Cancel'}</Text>
                </TouchableOpacity>
                <Text className="font-bold text-gray-900 text-lg">{isVi ? 'Ngày hẹn tiếp theo' : 'Next Due Date'}</Text>
                <TouchableOpacity onPress={() => setShowVaccineDatePicker(false)}>
                  <Text className="text-[#EFA062] font-bold text-lg px-2">{isVi ? 'Xong' : 'Done'}</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={formData.nextDueDate ? new Date(formData.nextDueDate) : new Date()}
                mode="date"
                display="spinner"
                minimumDate={new Date()}
                onChange={onVaccineDateChange}
                textColor="black"
              />
            </View>
          </View>
        </Modal>
      ) : (
        showVaccineDatePicker && (
          <DateTimePicker
            value={formData.nextDueDate ? new Date(formData.nextDueDate) : new Date()}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={onVaccineDateChange}
          />
        )
      )}

      {/* Modal Chọn Phương thức Upload Ảnh (Camera / Gallery) */}
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