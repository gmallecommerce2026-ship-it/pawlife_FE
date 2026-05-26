// app/edit-pet.tsx
import { Text } from '@/components/AppText';
import { useModalStore } from '@/store/useModalStore';
import { AntDesign, Feather, Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
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
  TextInput,
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
  ]
};

const speciesData = [
  { label: 'Dog', value: 'Dog' },
  { label: 'Cat', value: 'Cat' },
];

const genderData = [
  { label: 'Male', value: 'MALE' },
  { label: 'Female', value: 'FEMALE' },
  { label: 'Unknown', value: 'UNKNOWN' },
];

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
  vaccinationRecordUrls: string[];
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
      className="w-full bg-white border border-[#E5E5E5] rounded-2xl px-4 text-black h-14"
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

export default function EditPetScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const showModal = useModalStore((state) => state.showModal);

  const { pickAndUploadImage: pickAvatar, isUploading: isUploadingAvatar } = useImageUpload();
  const { pickAndUploadImage: pickQR, isUploading: isUploadingQR } = useImageUpload();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // State quản lý Modal Vaccine
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 28 });
  const [showVaccineMenu, setShowVaccineMenu] = useState(false);
  const [selectedVaccineIndex, setSelectedVaccineIndex] = useState<number | null>(null);
  const [isUploadingVaccine, setIsUploadingVaccine] = useState(false);

  // State quản lý Address Popup
  const [showAddressPopup, setShowAddressPopup] = useState(false);
  const [addressDataAPI, setAddressDataAPI] = useState<any[]>([]);
  const [tempCity, setTempCity] = useState('');
  const [tempDistrict, setTempDistrict] = useState('');
  const [tempWard, setTempWard] = useState('');
  const [tempDetail, setTempDetail] = useState('');

  useEffect(() => {
    fetch('https://provinces.open-api.vn/api/?depth=3')
      .then(res => res.json())
      .then(data => setAddressDataAPI(data))
      .catch(e => console.error("Lỗi fetch địa chỉ:", e));
  }, []);

  const cityOptions = addressDataAPI.map((c: any) => c.name);
  const districtOptions = tempCity 
    ? addressDataAPI.find((c: any) => c.name === tempCity)?.districts?.map((d: any) => d.name) || [] 
    : [];
  const wardOptions = tempDistrict 
    ? addressDataAPI.find((c: any) => c.name === tempCity)?.districts?.find((d: any) => d.name === tempDistrict)?.wards?.map((w: any) => w.name) || [] 
    : [];

  const handleConfirmAddress = () => {
    if (!tempCity || !tempDistrict || !tempWard || !tempDetail.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng chọn đầy đủ Tỉnh/Thành, Quận/Huyện, Phường/Xã và nhập địa chỉ chi tiết.");
      return;
    }
    const fullAddress = `${tempDetail.trim()}, ${tempWard}, ${tempDistrict}, ${tempCity}`;
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
    vaccinationRecordUrls: [],
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
          size: data.size,
          weight: data.weight ? data.weight.toString() : '',
          dob: data.dob ? new Date(data.dob).toISOString() : '',
          microchip: data.microchipNumber || '',
          description: data.description || '',
          gender: (data.gender as GenderType) || 'UNKNOWN',
          imageUrl: data.avatarUrl || data.images?.[0]?.url || '',
          contactName: data.contactName || '',
          contactPhone: data.contactPhone || '',
          contactAddress: data.contactAddress || '',
          vaccinationRecordUrls: data.vaccinationRecordUrls
            ? data.vaccinationRecordUrls
            : (data.vaccinationRecordUrl ? [data.vaccinationRecordUrl] : []),
          qrCodeUrl: data.qrCodeUrl || '',
          sterilized: data.isSpayedNeutered !== undefined ? data.isSpayedNeutered : null,
        });
      } catch (error) {
        Alert.alert("Error", "Could not load pet information.");
        router.back();
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchPet();
  }, [id]);

  const handlePickAvatar = async () => {
    const uploadedUrl = await pickAvatar({ folder: 'pets', aspect: [1, 1], quality: 0.8 });
    if (uploadedUrl) handleChange('imageUrl', uploadedUrl);
  };

  const handlePickVaccine = async () => {
    try {
      const remainingSlots = 5 - formData.vaccinationRecordUrls.length;
      if (remainingSlots <= 0) {
        Alert.alert("Giới hạn", "Bạn chỉ được tải lên tối đa 5 tài liệu.");
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newLocalUrls = result.assets.slice(0, remainingSlots).map(asset => asset.uri);
        handleChange('vaccinationRecordUrls', [
          ...formData.vaccinationRecordUrls,
          ...newLocalUrls
        ]);
      }
    } catch (error) {
      console.error("Lỗi khi chọn ảnh:", error);
      Alert.alert("Lỗi", "Không thể mở thư viện ảnh.");
    }
  };

  const handlePickQR = async () => {
    const uploadedUrl = await pickQR({ folder: 'qr-codes', aspect: [1, 1], quality: 0.8 });
    if (uploadedUrl) handleChange('qrCodeUrl', uploadedUrl);
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
      Alert.alert('Missing Information', "Please enter the pet's name.");
      return;
    }

    try {
      setIsSubmitting(true);
      
      const payload: any = {
        name: formData.name,
        species: formData.species,
        breed: formData.breed || null,
        gender: formData.gender !== 'UNKNOWN' ? formData.gender : null,
        color: formData.color || null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        microchipNumber: formData.microchip || null,
        description: formData.description || null,
        contactName: formData.contactName || null,
        contactPhone: formData.contactPhone || null,
        contactAddress: formData.contactAddress || null,
        images: formData.imageUrl ? [formData.imageUrl] : [],
        // Chú ý: Cần update logic upload R2 cho mảng này giống màn Add Pet trước khi gọi hàm dưới
        vaccinationRecordUrls: formData.vaccinationRecordUrls.length > 0 ? formData.vaccinationRecordUrls : [],
        qrCodeUrl: formData.qrCodeUrl || null,
        isSpayedNeutered: formData.sterilized !== null ? formData.sterilized : null,
      };

      if (formData.dob) {
        payload.dob = formData.dob;
      }

      await petService.updatePet(id as string, payload);

      showModal({
        title: 'Success',
        message: 'Pet profile updated successfully! ',
        buttonText: 'Back',
        onConfirm: () => router.back(),
      });

    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update pet. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#EFA062" />
        <Text className="text-gray-500 mt-4 font-medium">Loading information...</Text>
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
            <Text className="text-[18px] font-semibold text-[#000000]">Edit Pet Profile</Text>
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
              <Text className="text-[16px] font-semibold text-black mb-3">Pet Information</Text>

              <View className="bg-white p-6 rounded-[20px] border border-gray-200">

                {/* 1. Name & Type Row */}
                <View className="flex-row gap-3 mb-5">
                  <View className="flex-1">
                    <Text className="text-[14px] text-black font-medium mb-1.5">Name</Text>
                    <TextInput
                      style={inputFontStyle}
                      className="h-[34px] border border-[#E5E5E5] rounded-[12px] px-3.5 text-black text-[14px]"
                      value={formData.name}
                      onChangeText={(text) => handleChange('name', text)}
                      placeholder="Pet name"
                      placeholderTextColor="#A1A1AA"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[14px] text-black font-medium mb-1.5">Type</Text>
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
                      placeholder="Select type"
                      value={formData.species}
                      onChange={(item) => {
                        handleChange('species', item.value);
                        handleChange('breed', '');
                      }}
                    />
                  </View>
                </View>

                {/* 2. Gender & Sterilized Row */}
                <View className="flex-row gap-3 mb-5">
                  <View className="flex-1">
                    <Text className="text-[14px] text-black font-medium mb-1.5">Gender</Text>
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
                      placeholder="Select gender"
                      value={formData.gender}
                      onChange={(item) => handleChange('gender', item.value)}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[14px] text-black font-medium mb-2.5">Sterilized</Text>
                    <View className="flex-row items-center gap-8 h-[30px]">
                      <TouchableOpacity onPress={() => handleChange('sterilized', true)} className="flex-row items-center">
                        <View className={`w-4 h-4 rounded-full border items-center justify-center mr-2 ${formData.sterilized === true ? 'border-[#EFA062]' : ' border-[#E5E7EB]'}`}>
                          {formData.sterilized === true && <View className="w-2.5 h-2.5 rounded-full bg-[#EFA062]" />}
                        </View>
                        <Text className="text-[14px] text-black">Yes</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleChange('sterilized', false)} className="flex-row items-center">
                        <View className={`w-4 h-4 rounded-full border items-center justify-center mr-2 ${formData.sterilized === false ? 'border-[#EFA062]' : ' border-[#E5E7EB]'}`}>
                          {formData.sterilized === false && <View className="w-2.5 h-2.5 rounded-full bg-[#EFA062]" />}
                        </View>
                        <Text className="text-[14px] text-black">No</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* 3. Breed & Color Row */}
                <View className="flex-row gap-3 mb-5">
                  <View className="flex-1">
                    <Text className="text-[14px] text-black font-medium mb-1.5">Breed</Text>
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
                      placeholder="Select breed"
                      value={formData.breed}
                      onChange={(item) => handleChange('breed', item.value)}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[14px] text-black font-medium mb-1.5">Color</Text>
                    <TextInput
                      style={inputFontStyle}
                      className="h-[34px] border border-[#E5E5E5] rounded-[12px] px-3.5 text-black text-[14px]"
                      value={formData.color}
                      onChangeText={(text) => handleChange('color', text)}
                      placeholder="Color"
                      placeholderTextColor="#A1A1AA"
                    />
                  </View>
                </View>

                {/* 4. Birthday & Weight Row */}
                <View className="flex-row gap-3 mb-5">
                  <View className="flex-1">
                    <Text className="text-[14px] text-black font-medium mb-1.5">Birthday</Text>
                    <TouchableOpacity onPress={() => setShowDatePicker(true)} className="h-[34px] border border-[#E5E5E5] rounded-[12px] px-3.5 justify-center bg-white">
                      <Text className={`text-[14px] ${formData.dob ? 'text-black' : 'text-[#A1A1AA]'}`}>
                        {formData.dob ? new Date(formData.dob).toLocaleDateString('en-GB') : 'DD/MM/YYYY'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View className="flex-1">
                    <Text className="text-[14px] text-black font-medium mb-1.5">Weight</Text>
                    <TextInput
                      style={inputFontStyle}
                      className="h-[34px] border border-[#E5E5E5] rounded-[12px] px-3.5 text-black text-[14px]"
                      value={formData.weight}
                      onChangeText={(text) => handleChange('weight', text.replace(/[^0-9.]/g, ''))}
                      keyboardType="decimal-pad"
                      placeholder="Weight (kg)"
                      placeholderTextColor="#A1A1AA"
                    />
                  </View>
                </View>

                <View className="h-[1px] bg-gray-100 my-5" />

                <View>
                  <Text className="text-[14px] text-black font-medium mb-1.5">Notes</Text>
                  <TextInput
                    style={[inputFontStyle, { paddingTop: 12 }]}
                    className="border border-[#E5E5E5] rounded-[12px] px-3.5 pb-3 text-black text-[14px] min-h-[80px]"
                    value={formData.description}
                    onChangeText={(text) => handleChange('description', text)}
                    placeholder="Loves belly rubs and playing fetch..."
                    placeholderTextColor="#A1A1AA"
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              </View>
            </View>

            {/* Owner Information Section */}
            <View className="mb-6">
              <Text className="text-[16px] font-semibold text-black mb-3">Owner Information</Text>

              <View className="bg-white rounded-[20px] border border-gray-200 px-4 py-2">
                <View className="flex-row items-center py-3 border-b border-gray-100">
                  <Text className="text-[16px] font-medium text-black w-[80px]">Name</Text>
                  <TextInput
                    style={inputFontStyle}
                    className="flex-1 text-right text-[14px] text-[#8E8E93] p-0"
                    value={formData.contactName}
                    onChangeText={(text) => handleChange('contactName', text)}
                    placeholder="Full Name"
                    placeholderTextColor="#A1A1AA"
                  />
                </View>

                <View className="flex-row items-center py-3 border-b border-gray-100">
                  <Text className="text-[16px] font-medium text-black w-[80px]">Phone</Text>
                  <TextInput
                    style={inputFontStyle}
                    className="flex-1 text-right text-[14px] text-[#8E8E93] p-0"
                    value={formData.contactPhone}
                    onChangeText={(text) => handleChange('contactPhone', text.replace(/[^0-9]/g, ''))}
                    keyboardType="phone-pad"
                    placeholder="Phone Number"
                    placeholderTextColor="#A1A1AA"
                    maxLength={15}
                  />
                </View>

                <View className="flex-row items-center py-4">
                  <Text className="text-[14px] font-medium text-black w-[80px]">Address</Text>
                  <TouchableOpacity onPress={() => setShowAddressPopup(true)} className="flex-1 items-end justify-center">
                    <Text 
                      style={inputFontStyle}
                      className={`text-right text-[14px] p-0 ${formData.contactAddress ? 'text-black' : 'text-[#A1A1AA]'}`} 
                      numberOfLines={1}
                    >
                      {formData.contactAddress || "Street Address, District, City"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Vaccination Record Section */}
            <View className="mb-8">
              <Text className="text-[16px] font-semibold text-[#111827] mb-3">
                Vaccination Record ({formData.vaccinationRecordUrls.length}/5)
              </Text>

              {formData.vaccinationRecordUrls.length < 5 && (
                <TouchableOpacity
                  onPress={handlePickVaccine}
                  activeOpacity={0.7}
                  className="bg-white border border-dashed border-[#D1D5DB] rounded-[12px] py-6 items-center justify-center"
                >
                  <View className="items-center justify-center mb-2">
                    <Image source={require('../assets/icon/upload-black.png')} style={{ width: 16, height: 16 }} resizeMode="cover" />
                  </View>
                  <Text className="text-[16px] text-[#292D32] font-medium mb-[10px]">
                    Choose a file to upload
                  </Text>
                  <Text className="text-[14px] text-[#A9ACB4]">JPEG, PNG formats, up to 50MB</Text>
                </TouchableOpacity>
              )}

              {isUploadingVaccine && (
                <View className="h-[73px] rounded-[16px] p-3 bg-[#F8F8F8] mt-2">
                  <View className='flex-row items-center mb-3'>
                    <Image source={require('../assets/icon/file.png')} style={{ width: 28, height: 28 }} resizeMode="cover" />
                    <View className="flex-1 ml-3">
                      <View className="flex-row justify-between items-center">
                        <Text className="text-[12px] text-[#000000] font-medium leading-[13px]" numberOfLines={1}>Uploading file...</Text>
                      </View>
                      <View className="flex-row items-center mt-1">
                        <View className="flex-row items-center">
                          <ActivityIndicator color="#E89B5A" style={{ transform: [{ scaleX: 0.6 }, { scaleY: 0.6 }] }} />
                          <Text className="text-[10px] text-black ml-1 font-regular tracking-[0.5px] leading-[13px]">Please wait...</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <View className="h-1.5 bg-[#E3E3E4] rounded-full ">
                    <View className="h-full bg-[#EFA062] rounded-full" style={{ width: '45%' }} />
                  </View>
                </View>
              )}

              {/* LIST FILE THÔNG MINH KẾT HỢP HAI LOẠI ICON */}
              {formData.vaccinationRecordUrls.map((url, index) => {
                // Kiểm tra nếu url không chứa http (Tức là file vừa chọn dưới dạng local file://)
                const isLocalFile = !url.startsWith('http');

                return (
                  <View key={index} className="border border-[#E5E5E5] rounded-[16px] pl-3 pt-3 pb-3 flex-row items-center bg-[#FFFF] shadow-sm shadow-orange-100/50 mt-3">
                    <Image source={require('../assets/icon/file.png')} style={{ width: 28, height: 28 }} resizeMode="cover" />
                    <View className="flex-1 mx-3">
                      <View className="flex-row justify-between items-center">
                        <Text className="text-[12px] text-[#000000] font-medium leading-[13px]" numberOfLines={1}>
                          vaccination_record_{index + 1}.jpg
                        </Text>
                        
                        {/* =========================================== */}
                        {/* HIỂN THỊ LOGIC TÙY CHỌN DỰA THEO LOẠI FILE */}
                        {/* =========================================== */}
                        {isLocalFile ? (
                          // File vừa tải lên -> Icon thùng rác xóa nhanh
                          <TouchableOpacity
                            onPress={() => {
                              const newUrls = formData.vaccinationRecordUrls.filter((_, i) => i !== index);
                              handleChange('vaccinationRecordUrls', newUrls);
                            }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Image source={require('../assets/icon/trash.png')} style={{ width: 10, height: 10 }} resizeMode="cover" />
                          </TouchableOpacity>
                        ) : (
                          // File cũ từ máy chủ -> Icon 3 chấm mở Modal
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              const { pageY } = e.nativeEvent;
                              setMenuPosition({ top: pageY + 10, right: 32 });
                              setSelectedVaccineIndex(index);
                              setShowVaccineMenu(true);
                            }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Image source={require('../assets/icon/more-vertical.png')} style={{ width: 10, height: 10 }} resizeMode="cover" />
                          </TouchableOpacity>
                        )}

                      </View>
                      <View className="flex-row items-center mt-1">
                        <Text className="text-[10px] text-[#8E8E93] tracking-[0.5px] leading-[13px]">
                          {isLocalFile ? 'Local File • ' : '1.2 MB • '}
                        </Text>
                        <View className="flex-row items-center">
                          {!isLocalFile && <Feather name="check" size={12} color="#EFA062" />}
                          <Text className="text-[10px] text-black ml-1 font-regular tracking-[0.5px] leading-[13px]">
                            {isLocalFile ? 'Ready to upload' : 'Completed'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            <View className="space-y-3 mb-10">
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isSubmitting || isUploadingAvatar || isUploadingVaccine || isUploadingQR}
                className="bg-[#EFA062] h-[52px] rounded-2xl items-center justify-center flex-row shadow-sm"
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-white font-semibold text-[16px]">Save Changes</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.back()}
                disabled={isSubmitting}
                className="bg-white border border-gray-200 h-[52px] rounded-2xl items-center justify-center mt-5"
              >
                <Text className="text-[#9CA3AF] font-medium text-[16px]">Cancel</Text>
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
                  <Text className="text-gray-500 font-medium text-lg px-2">Cancel</Text>
                </TouchableOpacity>
                <Text className="font-bold text-gray-900 text-lg">Date of Birth</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text className="text-[#EFA062] font-bold text-lg px-2">Done</Text>
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

      {/* --- MENU MODAL (CHỈ HIỂN THỊ CHO FILE ĐÃ CÓ TRÊN SERVER) --- */}
      <Modal
        visible={showVaccineMenu}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowVaccineMenu(false)}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={() => setShowVaccineMenu(false)}
        >
          <View
            className="absolute bg-white rounded-xl border border-gray-100 w-36"
            style={{
              top: menuPosition.top,
              right: menuPosition.right,
              elevation: 8,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 10
            }}
          >
            {/* Option 1: Replace */}
            <TouchableOpacity
              className="flex-row items-center px-2 py-3"
              activeOpacity={0.6}
              disabled={isUploadingVaccine}
              onPress={async () => {
                setShowVaccineMenu(false);
                if (selectedVaccineIndex === null) return;

                try {
                  let result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images'],
                    quality: 0.8,
                  });

                  if (!result.canceled && result.assets) {
                    const newUrl = result.assets[0].uri;
                    
                    const newUrlsList = [...formData.vaccinationRecordUrls];
                    newUrlsList[selectedVaccineIndex] = newUrl;
                    
                    handleChange('vaccinationRecordUrls', newUrlsList);
                  }
                } catch (error) {
                  Alert.alert("Lỗi", "Không thể tải lên lúc này.");
                }
              }}
            >
              <Text className="text-[14px] text-gray-700 ml-3 font-regular">Replace file</Text>
            </TouchableOpacity>

            {/* Option 2: View */}
            <TouchableOpacity
              className="flex-row items-center px-2 py-3"
              activeOpacity={0.6}
              onPress={() => {
                setShowVaccineMenu(false);
                if (selectedVaccineIndex !== null && formData.vaccinationRecordUrls[selectedVaccineIndex]) {
                  const urlToView = formData.vaccinationRecordUrls[selectedVaccineIndex];
                  if (urlToView.startsWith('http')) {
                    Linking.openURL(urlToView).catch(() => Alert.alert("Lỗi", "Không thể mở file này."));
                  } else {
                    Alert.alert("Thông báo", "Vui lòng Save Changes để có thể xem file trực tuyến.");
                  }
                }
              }}
            >
              <Text className="text-[14px] text-gray-700 ml-3 font-regular">View file</Text>
            </TouchableOpacity>

            {/* Option 3: Delete */}
            <TouchableOpacity
              className="flex-row items-center px-2 py-3"
              activeOpacity={0.6}
              onPress={() => {
                setShowVaccineMenu(false);
                if (selectedVaccineIndex !== null) {
                  const newUrls = formData.vaccinationRecordUrls.filter((_, i) => i !== selectedVaccineIndex);
                  handleChange('vaccinationRecordUrls', newUrls);
                }
              }}
            >
              <Text className="text-[14px] text-[#FF3B30] ml-3 font-regular">Delete</Text>
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
                Địa chỉ của bạn
              </Text>
              
              <Label text="Thành phố / Tỉnh" required />
              <CustomDropdown
                placeholder="Chọn Tỉnh/Thành phố"
                value={tempCity}
                options={cityOptions}
                onSelect={(val) => {
                  setTempCity(val);
                  setTempDistrict('');
                  setTempWard('');
                }}
              />

              <Label text="Quận / Huyện" required />
              <CustomDropdown
                placeholder="Chọn Quận/Huyện"
                value={tempDistrict}
                options={districtOptions}
                onSelect={(val) => {
                  setTempDistrict(val);
                  setTempWard('');
                }}
              />

              <Label text="Phường / Xã" required />
              <CustomDropdown
                placeholder="Chọn Phường/Xã"
                value={tempWard}
                options={wardOptions}
                onSelect={setTempWard}
              />

              <Label text="Địa chỉ chi tiết" required />
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
      </Modal>
    </SafeAreaView>
  );
}