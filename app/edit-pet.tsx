// app/edit-pet.tsx
import { Text } from '@/components/AppText';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Dropdown } from 'react-native-element-dropdown';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useImageUpload } from '../hooks/useImageUpload';
import { petService } from '../services/petService';
import { useModalStore } from '@/store/useModalStore';

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

const sizeData = [
  { label: 'Small', value: 'SMALL' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'Large', value: 'LARGE' },
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
  vaccinationRecordUrl: string;
  qrCodeUrl: string;
  sterilized: boolean | null;
}

export default function EditPetScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const showModal = useModalStore((state) => state.showModal);

  // Tách biệt hook upload cho 3 loại ảnh
  const { pickAndUploadImage: pickAvatar, isUploading: isUploadingAvatar } = useImageUpload();
  const { pickAndUploadImage: pickVaccine, isUploading: isUploadingVaccine } = useImageUpload();
  const { pickAndUploadImage: pickQR, isUploading: isUploadingQR } = useImageUpload();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 28 });
  const [showVaccineMenu, setShowVaccineMenu] = useState(false);



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
    vaccinationRecordUrl: '',
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
          vaccinationRecordUrl: data.vaccinationRecordUrl || '',
          qrCodeUrl: data.qrCodeUrl || '',
          sterilized: data.sterilized || null,
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

  // Xử lý upload Avatar
  const handlePickAvatar = async () => {
    const uploadedUrl = await pickAvatar({ folder: 'pets', aspect: [1, 1], quality: 0.8 });
    if (uploadedUrl) handleChange('imageUrl', uploadedUrl);
  };

  // Xử lý upload Vaccination Record
  const handlePickVaccine = async () => {
    const uploadedUrl = await pickVaccine({ folder: 'vaccines', aspect: [4, 3], quality: 0.8 });
    if (uploadedUrl) handleChange('vaccinationRecordUrl', uploadedUrl);
  };

  // Xử lý upload QR Code
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
        vaccinationRecordUrl: formData.vaccinationRecordUrl || null,
        qrCodeUrl: formData.qrCodeUrl || null,
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

                {/* Divider */}
                <View className="h-[1px] bg-gray-100 my-5" />

                {/* 6. Notes */}
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

                <View className="flex-row items-center py-3">
                  <Text className="text-[16px] font-medium text-black w-[80px]">Address</Text>
                  <TextInput
                    style={inputFontStyle}
                    className="flex-1 text-right text-[14px] text-[#8E8E93] p-0"
                    value={formData.contactAddress}
                    onChangeText={(text) => handleChange('contactAddress', text)}
                    placeholder="Street, District, City"
                    placeholderTextColor="#A1A1AA"
                  />
                </View>
              </View>
            </View>

            {/* Vaccination Record Section */}
            {/* Vaccination Record Section */}
            <View className="mb-8">
              <Text className="text-[16px] font-semibold text-[#111827] mb-3">Vaccination Record</Text>

              {/* 1. Dropzone LUÔN HIỂN THỊ để chuẩn bị cho multiple uploads/PDF sau này */}
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
                <Text className="text-[14px] text-[#A9ACB4]">JPEG, PNG, PDG, and MP4 formats, up to 50MB</Text>
              </TouchableOpacity>

              {/* 2. Trạng thái Đang tải lên */}
              {isUploadingVaccine && (
                <View className="h-[73px] rounded-[16px] p-3 bg-[#F8F8F8] mt-2">
                  <View className='flex-row items-center mb-3'>
                    <Image source={require('../assets/icon/file.png')} style={{ width: 28, height: 28 }} resizeMode="cover" />
                    <View className="flex-1 ml-3">
                      <View className="flex-row justify-between items-center">
                        <Text className="text-[12px] text-[#000000] font-medium leading-[13px]" numberOfLines={1}>vaccination_record.jpg</Text>
                        <TouchableOpacity
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Feather name="x" size={10} color="#9CA3AF" />
                        </TouchableOpacity>
                      </View>
                      <View className="flex-row items-center mt-1">
                        <Text className="text-[10px] text-[#8E8E93] tracking-[0.5px] leading-[13px]">60KB of 120 KB • </Text>
                        <View className="flex-row items-center">
                          <ActivityIndicator color="#E89B5A" style={{ transform: [{ scaleX: 0.6 }, { scaleY: 0.6 }] }} />
                          <Text className="text-[10px] text-black ml-1 font-regular tracking-[0.5px] leading-[13px]">Uploading...</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <View className="h-1.5 bg-[#E3E3E4] rounded-full ">
                    <View className="h-full bg-[#EFA062] rounded-full" style={{ width: '45%' }} />
                  </View>
                </View>
              )}

              {/* 3. Trạng thái Đã tải lên xong */}
              {formData.vaccinationRecordUrl ? (
                <View>
                  <View className="h-[57px] rounded-[16px] p-3 flex-row items-center bg-[#F8F8F8] mt-2">
                    <Image source={require('../assets/icon/file.png')} style={{ width: 28, height: 28 }} resizeMode="cover" />
                    <View className="flex-1 ml-3">
                      <View className="flex-row justify-between items-center">
                        <Text className="text-[12px] text-[#000000] font-medium leading-[13px]" numberOfLines={1}>vaccination_record.jpg</Text>
                        <TouchableOpacity
                          onPress={() => handleChange('vaccinationRecordUrl', '')}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Image source={require('../assets/icon/trash.png')} style={{ width: 10, height: 10 }} resizeMode="cover" />
                        </TouchableOpacity>
                      </View>
                      <View className="flex-row items-center mt-1">
                        <Text className="text-[10px] text-[#8E8E93] tracking-[0.5px] leading-[13px]">1.2 MB • </Text>
                        <View className="flex-row items-center">
                          <Feather name="check" size={12} color="#EFA062" />
                          <Text className="text-[10px] text-black ml-1 font-regular tracking-[0.5px] leading-[13px]">Completed</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              ) : null}

              {/* 3. Trạng thái cho các bản ghi có sẵn*/}
              <View className="border border-[#E5E5E5] rounded-[16px] pl-3 pt-3 pb-3 flex-row items-center bg-[#FFFF] shadow-sm shadow-orange-100/50 mt-3">
                <Image source={require('../assets/icon/file.png')} style={{ width: 28, height: 28 }} resizeMode="cover" />
                <View className="flex-1 mx-3">
                  <View className="flex-row justify-between items-center">
                    <Text className="text-[12px] text-[#000000] font-medium leading-[13px]" numberOfLines={1}>vaccination_record.jpg</Text>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        const { pageY } = e.nativeEvent;
                        setMenuPosition({ top: pageY + 10, right: 32 });
                        setShowVaccineMenu(true);
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Image source={require('../assets/icon/more-vertical.png')} style={{ width: 10, height: 10 }} resizeMode="cover" />
                    </TouchableOpacity>
                  </View>
                  <View className="flex-row items-center mt-1">
                    <Text className="text-[10px] text-[#8E8E93] tracking-[0.5px] leading-[13px]">1.2 MB • </Text>
                    <View className="flex-row items-center">
                      <Text className="text-[10px] text-[#8E8E93] tracking-[0.5px] leading-[13px]">Submitted on 01/01/2026</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
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

      <Modal
        visible={showVaccineMenu}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowVaccineMenu(false)}
      >
        {/* Lớp phủ tàng hình, click vào đây sẽ đóng menu */}
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={() => setShowVaccineMenu(false)}
        >
          {/* Menu Dropdown sử dụng toạ độ động */}
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
            {/* Option 1: Upload */}
            <TouchableOpacity
              className="flex-row items-center px-2 py-3"
              activeOpacity={0.6}
              onPress={() => {
                setShowVaccineMenu(false);
                console.log("Trigger Upload File");
              }}
            >
              <Text className="text-[14px] text-gray-700 ml-3 font-regular">Upload new file</Text>
            </TouchableOpacity>

            {/* Option 2: Report */}
            <TouchableOpacity
              className="flex-row items-center px-2 py-3"
              activeOpacity={0.6}
              onPress={() => {
                setShowVaccineMenu(false);
                console.log("Trigger downlpad");
              }}
            >
              <Text className="text-[14px] text-gray-700 ml-3 font-regular">Download</Text>
            </TouchableOpacity>

            {/* Option 3: Delete */}
            <TouchableOpacity
              className="flex-row items-center px-2 py-3"
              activeOpacity={0.6}
              onPress={() => {
                setShowVaccineMenu(false);
                // Delay một chút để Modal đóng mượt mà trước khi hiện Alert
                setTimeout(() => {
                  Alert.alert(
                    "Delete Record",
                    "Are you sure you want to delete this vaccination record?",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Delete", style: "destructive", onPress: () => console.log("Deleted") }
                    ]
                  );
                }, 150);
              }}
            >
              <Text className="text-[14px] text-[#FF3B30] ml-3 font-regular">Report</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}