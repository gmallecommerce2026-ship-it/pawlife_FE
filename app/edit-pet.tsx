import axiosClient from '@/api/axiosClient';
import AddMedicalRecordModal from '@/components/AddMedicalRecordModal';
import { Text } from '@/components/AppText';
import { TextInput } from '@/components/AppTextInput';
import { useLanguage } from '@/contexts/LanguageContext';
import { useModalStore } from '@/store/useModalStore';
import { AntDesign, Feather, Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
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
import { petService } from '../services/petService';

type GenderType = 'MALE' | 'FEMALE' | 'UNKNOWN';
type SpeciesType = 'Dog' | 'Cat';
type SizeType = 'SMALL' | 'MEDIUM' | 'LARGE';

// 1. ĐỒNG BỘ DANH SÁCH BREED
const BREED_OPTIONS: Record<string, { label: string; value: string }[]> = {
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

interface EditPetFormData {
  name: string;
  species: SpeciesType | string;
  breed: string;
  color: string;
  weight: string;
  size: SizeType | string;
  dob: string;
  microchip: string;
  description: string;
  gender: GenderType;
  imageUrl: string;
  contactName: string;
  contactPhone: string;
  contactAddress: string;
  qrCodeUrl: string;
  sterilized: boolean | null;
}

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

export default function EditPetScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const showModal = useModalStore((state) => state.showModal);
  const { t, language } = useLanguage();
  const isVi = language === 'vi';
  
  const { pickAndUploadImage: pickAvatar, isUploading: isUploadingAvatar } = useImageUpload();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // State quản lý Medical Records mới
  const [showMedicalModal, setShowMedicalModal] = useState(false);
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [isUploadingRecords, setIsUploadingRecords] = useState(false);

  // 2. ĐỒNG BỘ POPUP ADDRESS (API V2)
  const [showAddressPopup, setShowAddressPopup] = useState(false);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [wardOptions, setWardOptions] = useState<string[]>([]);
  
  const [tempCity, setTempCity] = useState('');
  const [tempWard, setTempWard] = useState('');
  const [tempDetail, setTempDetail] = useState('');
  
  const speciesData = [
    { label: isVi ? 'Chó' : 'Dog', value: 'Dog' },
    { label: isVi ? 'Mèo' : 'Cat', value: 'Cat' },
  ];

  const genderData = [
    { label: isVi ? 'Đực' : 'Male', value: 'MALE' },
    { label: isVi ? 'Cái' : 'Female', value: 'FEMALE' },
    { label: isVi ? 'Không rõ' : 'Unknown', value: 'UNKNOWN' },
  ];

  // Fetch Tỉnh/Thành
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
      .catch(e => console.error(isVi ? "Lỗi fetch tỉnh/thành phố:" : "Error fetching provinces:", e));
  }, [isVi]);

  const cityOptions = provinces.map((c: any) => c.name);

  // Fetch Phường/Xã (Đã sort Alphabet)
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
              .sort((a: any, b: any) => a.name.localeCompare(b.name, 'vi'))
              .map((ward: any) => ward.name);
              
            setWardOptions(sortedWards);
          }
        })
        .catch(e => console.error(isVi ? "Lỗi fetch phường/xã:" : "Error fetching wards:", e));
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

  const [formData, setFormData] = useState<EditPetFormData>({
    name: '',
    species: 'Dog',
    breed: '',
    color: '',
    weight: '',
    size: 'MEDIUM',
    dob: '',
    microchip: '',
    description: '',
    gender: 'UNKNOWN',
    imageUrl: '',
    contactName: '',
    contactPhone: '',
    contactAddress: '',
    qrCodeUrl: '',
    sterilized: null,
  });

  const inputFontStyle = { fontFamily: 'Urbanist-Regular' };

  // Fetch dữ liệu thú cưng
  useEffect(() => {
    const fetchPet = async () => {
      try {
        const data = await petService.getPetById(id as string);
        setFormData({
          name: data.name || '',
          species: data.species || 'Dog',
          breed: data.breed || '',
          color: data.color || '',
          size: data.size || 'MEDIUM',
          weight: data.weight ? data.weight.toString() : '',
          dob: data.dob ? new Date(data.dob).toISOString() : '',
          microchip: data.microchipNumber || '',
          description: data.description || '',
          gender: (data.gender as GenderType) || 'UNKNOWN',
          imageUrl: data.avatarUrl || data.images?.[0]?.url || '',
          contactName: data.contactName || '',
          contactPhone: data.contactPhone || '',
          contactAddress: data.contactAddress || '',
          qrCodeUrl: data.qrCodeUrl || '',
          sterilized: data.isSpayedNeutered !== undefined ? data.isSpayedNeutered : null,
        });

        // Set danh sách medical records nếu backend trả về
        if (data.medicalRecords && Array.isArray(data.medicalRecords)) {
          setMedicalRecords(data.medicalRecords);
        }
      } catch (error) {
        Alert.alert(isVi ? "Lỗi" : "Error", isVi ? "Không thể tải thông tin thú cưng." : "Could not load pet information.");
        router.back();
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchPet();
  }, [id, isVi]);

  const handlePickAvatar = async () => {
    const uploadedUrl = await pickAvatar({ folder: 'pets', aspect: [1, 1], quality: 0.8 });
    if (uploadedUrl) handleChange('imageUrl', uploadedUrl);
  };

  const handleChange = (field: keyof EditPetFormData, value: any) => {
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
      Alert.alert(isVi ? 'Thiếu thông tin' : 'Missing Information', isVi ? 'Vui lòng nhập tên thú cưng.' : "Please enter the pet's name.");
      return;
    }

    try {
      setIsSubmitting(true);
      setIsUploadingRecords(true);

      // 3. THỰC THI UPLOAD FILE:// CHO TỪNG BẢN GHI Y TẾ
      const finalMedicalRecords = await Promise.all(
        medicalRecords.map(async (record) => {
          if (!record.images || record.images.length === 0) return record;

          const uploadedImages = await Promise.all(
            record.images.map(async (uri: string) => {
              if (uri.startsWith('http')) return uri; // Đã là link mạng thì bỏ qua
              
              try {
                const filename = uri.split('/').pop() || `medical-record-${Date.now()}.jpg`;
                const match = /\.(\w+)$/.exec(filename);
                const ext = match ? match[1].toLowerCase() : 'jpeg';

                let type = 'image/jpeg';
                if (ext === 'png') type = 'image/png';
                else if (ext === 'webp') type = 'image/webp';

                // Gọi API lấy Presigned URL
                const presignedRes = await axiosClient.post('/storage/presigned-url', {
                  fileName: filename,
                  fileType: type,
                  folder: 'medical-records'
                });

                const { uploadUrl, fileUrl } = presignedRes.data;

                const localFileFetch = await fetch(uri);
                const fileBlob = await localFileFetch.blob();

                // PUT thẳng lên R2
                const uploadRes = await fetch(uploadUrl, {
                  method: 'PUT',
                  headers: { 'Content-Type': type },
                  body: fileBlob
                });

                if (!uploadRes.ok) throw new Error('Upload R2 failed');

                return fileUrl;
              } catch (fileError) {
                console.error(`[Upload Lỗi] Không thể upload ảnh ${uri}:`, fileError);
                return null; // Bỏ qua file bị lỗi
              }
            })
          );
          
          return { ...record, images: uploadedImages.filter(Boolean) };
        })
      );

      // Cập nhật state để không bị upload lại nếu bấm Submit lần sau
      setMedicalRecords(finalMedicalRecords);

      // ----------------------------------------------------------- //

      const payload: any = {
        name: formData.name,
        species: formData.species,
        breed: formData.breed || null,
        gender: formData.gender !== 'UNKNOWN' ? formData.gender : null,
        color: formData.color || null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        size: formData.size || null,
        microchipNumber: formData.microchip || null,
        description: formData.description || null,
        contactName: formData.contactName || null,
        contactPhone: formData.contactPhone || null,
        contactAddress: formData.contactAddress || null,
        images: formData.imageUrl ? [formData.imageUrl] : [],
        qrCodeUrl: formData.qrCodeUrl || null,
        isSpayedNeutered: formData.sterilized !== null ? formData.sterilized : null,
        
        // Đẩy thẳng mảng record vào đây, backend sẽ lo phần update
        medicalRecords: finalMedicalRecords.length > 0 ? finalMedicalRecords : undefined, 
      };

      if (formData.dob) {
        payload.dob = formData.dob;
      }

      await petService.updatePet(id as string, payload);

      showModal({
        title: isVi ? 'Thành công' : 'Success',
        message: isVi ? 'Cập nhật hồ sơ thú cưng thành công!' : 'Pet profile updated successfully!',
        buttonText: isVi ? 'Trở lại' : 'Back',
        onConfirm: () => router.back(),
      });

    } catch (error: any) {
      Alert.alert(isVi ? 'Lỗi' : 'Error', error.message || (isVi ? 'Cập nhật thất bại. Vui lòng thử lại.' : 'Failed to update pet. Please try again.'));
    } finally {
      setIsSubmitting(false);
      setIsUploadingRecords(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#EFA062" />
      </View>
    );
  }

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
              className="w-8 h-8 items-start justify-center"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="chevron-left" size={24} color="#000000" />
            </TouchableOpacity>
            <Text className="text-[18px] font-semibold text-[#000000]">{isVi ? 'Chỉnh sửa hồ sơ' : 'Edit Pet Profile'}</Text>
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
                className="w-32 h-32 rounded-full bg-[#FAFAFA] border border-gray-200 items-center justify-center overflow-hidden shadow-sm"
              >
                {isUploadingAvatar ? (
                  <ActivityIndicator size="large" color="#EFA062" />
                ) : formData.imageUrl ? (
                  <Image
                    source={{ uri: formData.imageUrl }}
                    className="w-full h-full"
                  />
                ) : (
                  <Feather name="camera" size={32} color="#9CA3AF" />
                )}
              </TouchableOpacity>
            </View>

            {/* Pet Information Section */}
            <View className="mb-6">
              <Text className="text-[16px] font-semibold text-black mb-3">{isVi ? 'Thông tin thú cưng' : 'Pet Information'}</Text>

              <View className="bg-white p-6 rounded-[20px] border border-gray-200">

                {/* 1. Name & Type Row */}
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
                      style={{ height: 34, borderColor: '#E5E7EB', borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, backgroundColor: '#FFFFFF' }}
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
                        handleChange('breed', ''); // Reset breed khi đổi loại
                      }}
                    />
                  </View>
                </View>

                {/* 2. Gender & Sterilized Row */}
                <View className="flex-row gap-3 mb-5">
                  <View className="flex-1">
                    <Text className="text-[14px] text-black font-medium mb-1.5">{isVi ? 'Giới tính' : 'Gender'}</Text>
                    <Dropdown
                      style={{ height: 34, borderColor: '#E5E7EB', borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, backgroundColor: '#FFFFFF' }}
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
                      <TouchableOpacity onPress={() => handleChange('sterilized', true)} className="flex-row items-center">
                        <View className={`w-4 h-4 rounded-full border items-center justify-center mr-2 ${formData.sterilized === true ? 'border-[#EFA062]' : ' border-[#E5E7EB]'}`}>
                          {formData.sterilized === true && <View className="w-2.5 h-2.5 rounded-full bg-[#EFA062]" />}
                        </View>
                        <Text className="text-[14px] text-black">{isVi ? 'Có' : 'Yes'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleChange('sterilized', false)} className="flex-row items-center">
                        <View className={`w-4 h-4 rounded-full border items-center justify-center mr-2 ${formData.sterilized === false ? 'border-[#EFA062]' : ' border-[#E5E7EB]'}`}>
                          {formData.sterilized === false && <View className="w-2.5 h-2.5 rounded-full bg-[#EFA062]" />}
                        </View>
                        <Text className="text-[14px] text-black">{isVi ? 'Không' : 'No'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* 3. Breed & Color Row */}
                <View className="flex-row gap-3 mb-5">
                  <View className="flex-1">
                    <Text className="text-[14px] text-black font-medium mb-1.5">{isVi ? 'Giống' : 'Breed'}</Text>
                    <Dropdown
                      style={{ height: 34, borderColor: '#E5E7EB', borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, backgroundColor: '#FFFFFF' }}
                      containerStyle={{ borderRadius: 12, overflow: 'hidden', marginTop: 2, borderColor: '#E5E7EB', borderWidth: 1 }}
                      placeholderStyle={{ fontSize: 14, color: '#9CA3AF', fontFamily: 'Urbanist' }}
                      selectedTextStyle={{ fontSize: 14, color: '#000000', fontFamily: 'Urbanist' }}
                      itemTextStyle={{ fontSize: 14, color: '#000000', fontFamily: 'Urbanist' }}
                      data={BREED_OPTIONS[formData.species as string] || BREED_OPTIONS['Dog']}
                      maxHeight={250}
                      labelField="label"
                      valueField="value"
                      placeholder={isVi ? 'Chọn giống' : 'Select breed'}
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

                {/* 4. Birthday & Weight Row */}
                <View className="flex-row gap-3 mb-5">
                  <View className="flex-1">
                    <Text className="text-[14px] text-black font-medium mb-1.5">{isVi ? 'Ngày sinh' : 'Birthday'}</Text>
                    <TouchableOpacity onPress={() => setShowDatePicker(true)} className="h-[34px] border border-[#E5E5E5] rounded-[12px] px-3.5 justify-center bg-white">
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

                <View>
                  <Text className="text-[14px] text-black font-medium mb-1.5">{isVi ? 'Ghi chú' : 'Notes'}</Text>
                  <TextInput
                    style={[inputFontStyle, { paddingTop: 12 }]}
                    className="border border-[#E5E5E5] rounded-[12px] px-3.5 pb-3 text-black text-[14px] min-h-[80px]"
                    value={formData.description}
                    onChangeText={(text) => handleChange('description', text)}
                    placeholder={isVi ? "Thích được xoa bụng và chơi trò ném đồ..." : "Loves belly rubs and playing fetch..."}
                    placeholderTextColor="#A1A1AA"
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              </View>
            </View>

            {/* Owner Information Section */}
            <View className="mb-6">
              <Text className="text-[16px] font-semibold text-black mb-3">{isVi ? 'Thông tin chủ nuôi' : 'Owner Information'}</Text>

              <View className="bg-white rounded-[20px] border border-gray-200 px-4 py-2">
                <View className="flex-row items-center py-3 border-b border-gray-100">
                  <Text className="text-[16px] font-medium text-black w-[80px]">{isVi ? 'Tên' : 'Name'}</Text>
                  <TextInput
                    style={inputFontStyle}
                    className="flex-1 text-right text-[14px] text-[#8E8E93] p-0"
                    value={formData.contactName}
                    onChangeText={(text) => handleChange('contactName', text)}
                    placeholder={isVi ? "Họ Và Tên" : "Full Name"}
                    placeholderTextColor="#A1A1AA"
                  />
                </View>

                <View className="flex-row items-center py-3 border-b border-gray-100">
                  <Text className="text-[16px] font-medium text-black w-[80px]">{isVi ? 'SĐT' : 'Phone'}</Text>
                  <TextInput
                    style={inputFontStyle}
                    className="flex-1 text-right text-[14px] text-[#8E8E93] p-0"
                    value={formData.contactPhone}
                    onChangeText={(text) => handleChange('contactPhone', text.replace(/[^0-9]/g, ''))}
                    keyboardType="phone-pad"
                    placeholder={isVi ? "Số Điện Thoại" : "Phone Number"}
                    placeholderTextColor="#A1A1AA"
                    maxLength={15}
                  />
                </View>

                <View className="flex-row items-center py-4">
                  <Text className="text-[16px] font-medium text-black w-[80px]">{isVi ? 'Địa chỉ' : 'Address'}</Text>
                  <TouchableOpacity onPress={() => setShowAddressPopup(true)} className="flex-1 items-end justify-center">
                    <Text 
                      style={inputFontStyle}
                      className={`text-right text-[14px] p-0 ${formData.contactAddress ? 'text-[#8E8E93]' : 'text-[#A1A1AA]'}`} 
                      numberOfLines={1}
                    >
                      {formData.contactAddress || (isVi ? "Địa chỉ của bạn" : "Street Address, District, City")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* MEDICAL RECORDS SECTION */}
            <View className="mb-8">
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

              {/* Progress UI hiển thị khi ấn Save Changes và đang upload */}
              {isUploadingRecords && (
                <View className="h-[73px] rounded-[16px] p-3 bg-[#F8F8F8] mb-4">
                  <View className='flex-row items-center mb-3'>
                    <Image source={require('../assets/icon/file.png')} style={{ width: 28, height: 28 }} resizeMode="cover" />
                    <View className="flex-1 ml-3">
                      <View className="flex-row justify-between items-center">
                        <Text className="text-[12px] text-[#000000] font-medium leading-[13px]" numberOfLines={1}>
                          {isVi ? 'Đang tải ảnh y tế lên...' : 'Uploading medical photos...'}
                        </Text>
                      </View>
                      <View className="flex-row items-center mt-1">
                        <ActivityIndicator color="#E89B5A" style={{ transform: [{ scaleX: 0.6 }, { scaleY: 0.6 }] }} />
                        <Text className="text-[10px] text-black ml-1 font-regular tracking-[0.5px] leading-[13px]">
                          {isVi ? 'Vui lòng đợi...' : 'Please wait...'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View className="h-1.5 bg-[#E3E3E4] rounded-full ">
                    <View className="h-full bg-[#EFA062] rounded-full" style={{ width: '100%' }} />
                  </View>
                </View>
              )}

              {/* Danh sách các record */}
              {medicalRecords.length === 0 ? (
                <Text className="text-gray-400 text-[14px] italic">
                  {isVi ? 'Chưa có hồ sơ y tế nào.' : 'No medical records yet.'}
                </Text>
              ) : (
                medicalRecords.map((record, index) => (
                  <View key={index} className="p-4 bg-[#FAFAFA] rounded-[12px] mb-3 border border-[#E5E5EA] flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="font-semibold text-[#111827] text-[15px] mb-1">
                        {record.recordName || (isVi ? "Hồ sơ không tên" : "Unnamed Record")}
                      </Text>
                      <Text className="text-[#6B7280] text-[13px]">
                        {isVi ? 'Loại' : 'Type'}: {record.type} | {isVi ? 'Ngày' : 'Date'}: {new Date(record.recordDate).toLocaleDateString('vi-VN')}
                      </Text>
                      
                      {/* Trạng thái ảnh */}
                      {record.images && record.images.length > 0 && (
                        <Text className="text-[#9CA3AF] text-[12px] mt-1">
                          {isVi ? `Đính kèm: ${record.images.length} ảnh` : `Attachments: ${record.images.length} photos`}
                        </Text>
                      )}

                      {record.hasNextDueDate && (
                        <Text className="text-[#E89B5A] text-[12px] mt-1 font-medium">
                          {isVi ? 'Lịch tiếp theo' : 'Next due'}: {new Date(record.nextDueDate).toLocaleDateString('vi-VN')} ({record.nextDueName})
                        </Text>
                      )}
                    </View>

                    <View className="flex-row items-center gap-2">
                      {/* Nút Xem Chi Tiết Nếu Có Link */}
                      {record.images && record.images.length > 0 && record.images[0].startsWith('http') && (
                        <TouchableOpacity 
                          onPress={() => Linking.openURL(record.images[0]).catch(() => Alert.alert("Lỗi", "Không thể mở file."))}
                          className="p-2 bg-gray-100 rounded-full"
                        >
                          <Feather name="eye" size={18} color="#6B7280" />
                        </TouchableOpacity>
                      )}

                      {/* Nút Xóa Record */}
                      <TouchableOpacity 
                        onPress={() => setMedicalRecords(prev => prev.filter((_, i) => i !== index))}
                        className="p-2 bg-red-50 rounded-full"
                      >
                        <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View className="space-y-3 mb-10">
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isSubmitting || isUploadingAvatar || isUploadingRecords}
                className={`bg-[#EFA062] h-[52px] rounded-2xl items-center justify-center flex-row shadow-sm ${(isSubmitting || isUploadingRecords) ? 'opacity-70' : ''}`}
              >
                {(isSubmitting || isUploadingRecords) ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-white font-semibold text-[16px]">{isVi ? 'Lưu thay đổi' : 'Save Changes'}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.back()}
                disabled={isSubmitting || isUploadingRecords}
                className="bg-white border border-gray-200 h-[52px] rounded-2xl items-center justify-center mt-5"
              >
                <Text className="text-[#9CA3AF] font-medium text-[16px]">{isVi ? 'Hủy' : 'Cancel'}</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* ================= MODALS & PICKERS ================= */}
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

      {/* --- POPUP ADDRESS MODAL (API V2) --- */}
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