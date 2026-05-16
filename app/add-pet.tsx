// app/add-pet.tsx
import { Text } from '@/components/AppText';
import { petService } from '@/services/petService';
import { useModalStore } from '@/store/useModalStore';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
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

type GenderType = 'MALE' | 'FEMALE' | 'UNKNOWN';
type SpeciesType = 'Dog' | 'Cat';
type SizeType = 'SMALL' | 'MEDIUM' | 'LARGE';
const BREED_OPTIONS = {
  Dog: [
    { label: 'Poodle', value: 'Poodle' },
    { label: 'Phú Quốc', value: 'Phu Quoc' },
    { label: 'Golden Retriever', value: 'Golden' },
    { label: 'Husky', value: 'Husky' },
    { label: 'Other', value: 'Other' },
  ],
  Cat: [
    { label: 'British Shorthair', value: 'British Shorthair' },
    { label: 'Scottish Fold', value: 'Scottish Fold' },
    { label: 'Persian', value: 'Persian' },
    { label: 'Sphynx', value: 'Sphynx' },
    { label: 'Other', value: 'Other' },
  ]
};
interface AddPetFormData {
  name: string;
  species: SpeciesType;
  breed: string;
  color: string;
  weight: string; // Vẫn để string ở form để dễ handle TextInput
  size: SizeType; // Thêm trường size
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
}

export default function AddPetScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const tagId = params.tagId as string;
  const rawQrData = params.rawQrData as string;

  const showModal = useModalStore((state) => state.showModal);
  // Tách biệt hook upload cho Avatar và Vaccination Record
  const { pickAndUploadImage: pickAvatar, isUploading: isUploadingAvatar } = useImageUpload();
  const { pickAndUploadImage: pickVaccine, isUploading: isUploadingVaccine } = useImageUpload();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
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
    vaccinationRecordUrl: '',
    qrCodeUrl: '',
  });

  const inputFontStyle = { fontFamily: 'Urbanist-Regular' };
  const handleSelectOption = (title: string, options: { label: string, value: any }[], field: keyof AddPetFormData) => {
    Alert.alert(
      title,
      "Vui lòng chọn",
      [
        ...options.map(opt => ({
          text: opt.label,
          onPress: () => handleChange(field, opt.value)
        })),
        { text: "Cancel", style: "cancel" }
      ],
      { cancelable: true }
    );
  };
  const handlePickBreed = () => {
    const currentSpecies = formData.species; // 'Dog' hoặc 'Cat'
    const options = BREED_OPTIONS[currentSpecies];

    handleSelectOption(
      `Select ${currentSpecies} Breed`,
      options,
      'breed'
    );
  };
  // Xử lý upload Avatar
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

  // Xử lý upload Vaccination Record
  const handlePickVaccine = async () => {
    const uploadedUrl = await pickVaccine({ 
      folder: 'vaccines', 
      aspect: [4, 3], // Tỉ lệ ngang phù hợp cho giấy tờ
      quality: 0.8,
    });
    
    if (uploadedUrl) {
      handleChange('vaccinationRecordUrl', uploadedUrl);
    }
  };

  const handleChange = (field: keyof AddPetFormData, value: string) => {
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
        title: 'Missing Information',
        message: "Please enter the pet's name.",
        buttonText: 'OK',
        onConfirm: () => {}
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
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
        vaccinationRecordUrl: formData.vaccinationRecordUrl || undefined,
        ...(formData.dob && { dob: formData.dob }),
        // QUAN TRỌNG: Đẩy thẳng tagId xuống Backend trong cùng 1 cục payload
        ...(tagId && { tagId: (tagId as string).trim() }),
        ...(rawQrData && { qrCodeUrl: rawQrData }),
      };

      // 1. Chỉ gọi duy nhất 1 API (Backend sẽ tự xử lý việc gán QR bằng Transaction)
      const newPet = await petService.addPet(payload); 
      const realPetId = newPet?.id || newPet?.data?.id;

      // 2. Chuyển trang thẳng
      router.replace(`/pet-profile-detail?id=${realPetId}`);

      // 3. Hiển thị thông báo
      showModal({
        title: 'Success',
        message: tagId 
          ? 'Pet profile created successfully! Vòng cổ đã được kích hoạt.' 
          : 'Pet profile created successfully!',
        buttonText: 'OK',
        onConfirm: () => {}
      });

    } catch (error: any) {
      showModal({
        title: 'Error',
        message: error.response?.data?.message || error.message || 'Failed to add pet. Please try again.',
        buttonText: 'Try Again',
        onConfirm: () => {}
      });
    } finally {
      setIsSubmitting(false);
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
                className="w-8 h-8 items-start justify-center"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="chevron-left" size={24} color="#000000" />
              </TouchableOpacity>
              <Text className="text-[18px] font-semibold text-[#000000]">Add Pet</Text>
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
                <Text className="text-[15px] font-semibold text-black mb-3">Pet Information</Text>
                
                <View className="bg-white p-6 rounded-[20px] border border-gray-200">
                  {/* Name */}
                  <View className="flex-row gap-3 mb-4">
                    {/* Cột 1: Name (Input) */}
                    <View className="flex-1">
                      <Text className="text-[13px] text-black font-medium mb-1.5">Name</Text>
                      <TextInput
                        style={inputFontStyle}
                        className="h-[44px] border border-gray-200 rounded-[12px] px-3.5 text-black text-[14px]"
                        value={formData.name}
                        onChangeText={(text) => handleChange('name', text)}
                        placeholder="Enter name"
                        placeholderTextColor="#A1A1AA"
                      />
                    </View>

                    {/* Cột 2: Type (Dropdown select) */}
                    <View className="flex-1">
                      <Text className="text-[13px] text-black font-medium mb-1.5">Type</Text>
                      {/* Thường thì Type (Species) nên dùng dropdown để giới hạn lựa chọn (Chó/Mèo) */}
                      <TouchableOpacity 
                        className="h-[44px] border border-gray-200 rounded-[12px] px-3.5 flex-row items-center justify-between bg-white"
                        onPress={() => handleSelectOption("Select Type", [
                          { label: 'Dog', value: 'Dog' },
                          { label: 'Cat', value: 'Cat' }
                        ], 'species')}
                      >
                        <Text className="text-black text-[14px]">{formData.species}</Text>
                        <Feather name="chevron-down" size={16} color="#A1A1AA" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Gender & Breed Row */}
                  <View className="flex-row gap-3 mb-4">
                    <View className="flex-1">
                      <Text className="text-[13px] text-black font-medium mb-1.5">Gender</Text>
                      <TouchableOpacity 
                        className="h-[44px] border border-gray-200 rounded-[12px] px-3.5 flex-row items-center justify-between bg-white"
                        onPress={() => handleSelectOption("Select Gender", [
                          { label: 'Male', value: 'MALE' },
                          { label: 'Female', value: 'FEMALE' },
                          { label: 'Unknown', value: 'UNKNOWN' }
                        ], 'gender')}
                      >
                        <Text className={formData.gender !== 'UNKNOWN' ? "text-black text-[14px]" : "text-[#A1A1AA] text-[14px]"}>
                          {formData.gender === 'UNKNOWN' ? 'Select' : formData.gender}
                        </Text>
                        <Feather name="chevron-down" size={16} color="#A1A1AA" />
                      </TouchableOpacity>
                    </View>
                    <View className="flex-1">
                      <Text className="text-[13px] text-black font-medium mb-1.5">Breed</Text>
                      <TouchableOpacity 
                        onPress={handlePickBreed}
                        className="h-[44px] border border-gray-200 rounded-[12px] px-3.5 flex-row items-center justify-between bg-white"
                      >
                        <Text className={formData.breed ? "text-black text-[14px]" : "text-[#A1A1AA] text-[14px]"}>
                          {formData.breed || 'Select'}
                        </Text>
                        <Feather name="chevron-down" size={16} color="#A1A1AA" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Color & Weight Row */}
                  <View className="flex-row gap-3 mb-4">
                    <View className="flex-1">
                      <Text className="text-[13px] text-black font-medium mb-1.5">Color</Text>
                      <TextInput
                        style={inputFontStyle}
                        className="h-[44px] border border-gray-200 rounded-[12px] px-3.5 text-black text-[14px]"
                        value={formData.color}
                        onChangeText={(text) => handleChange('color', text)}
                        placeholder="e.g. Brown"
                        placeholderTextColor="#A1A1AA"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[13px] text-black font-medium mb-1.5">Weight (kg)</Text>
                      <TextInput
                        style={inputFontStyle}
                        className="h-[44px] border border-gray-200 rounded-[12px] px-3.5 text-black text-[14px]"
                        value={formData.weight}
                        onChangeText={(text) => handleChange('weight', text.replace(/[^0-9.]/g, ''))}
                        keyboardType="decimal-pad"
                        placeholder="0.0"
                        placeholderTextColor="#A1A1AA"
                      />
                    </View>
                  </View>

                  {/* Birthday & Microchip Row */}
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Text className="text-[13px] text-black font-medium mb-1.5">Birthday</Text>
                      <TouchableOpacity
                        onPress={() => setShowDatePicker(true)}
                        className="h-[44px] border border-gray-200 rounded-[12px] px-3.5 justify-center bg-white"
                      >
                        <Text className={`text-[14px] ${formData.dob ? 'text-black' : 'text-[#A1A1AA]'}`}>
                          {formData.dob ? new Date(formData.dob).toLocaleDateString('en-GB') : 'DD/MM/YYYY'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View className="flex-1">
                      <Text className="text-[13px] text-black font-medium mb-1.5">Microchip</Text>
                      <TextInput
                        style={inputFontStyle}
                        className="h-[44px] border border-gray-200 rounded-[12px] px-3.5 text-black text-[14px]"
                        value={formData.microchip}
                        onChangeText={(text) => handleChange('microchip', text)}
                        placeholder="ID Number"
                        placeholderTextColor="#A1A1AA"
                      />
                    </View>
                  </View>

                  {/* Divider */}
                  <View className="h-[1px] bg-gray-100 my-5" />

                  {/* Notes */}
                  <View>
                    <Text className="text-[13px] text-black font-medium mb-1.5">Notes</Text>
                    <TextInput
                      style={[inputFontStyle, { paddingTop: 12 }]}
                      className="border border-gray-200 rounded-[12px] px-3.5 pb-3 text-black text-[14px] min-h-[80px]"
                      value={formData.description}
                      onChangeText={(text) => handleChange('description', text)}
                      placeholder="Loves belly rubs and playing fetch. Very friendly with children."
                      placeholderTextColor="#A1A1AA"
                      multiline
                      textAlignVertical="top"
                    />
                  </View>
                </View>
              </View>

              {/* Owner Information Section */}
              <View className="mb-6">
                <Text className="text-[15px] font-semibold text-black mb-3">Owner Information</Text>
                
                <View className="bg-white rounded-[20px] border border-gray-200 px-4 py-2">
                  {/* Name */}
                  <View className="flex-row items-center py-3 border-b border-gray-100">
                    <Text className="text-[14px] font-medium text-black w-[80px]">Name</Text>
                    <TextInput
                      style={inputFontStyle}
                      className="flex-1 text-right text-[14px] text-black p-0"
                      value={formData.contactName}
                      onChangeText={(text) => handleChange('contactName', text)}
                      placeholder="Full Name"
                      placeholderTextColor="#A1A1AA"
                    />
                  </View>

                  {/* Phone */}
                  <View className="flex-row items-center py-3 border-b border-gray-100">
                    <Text className="text-[14px] font-medium text-black w-[80px]">Phone</Text>
                    <TextInput
                      style={inputFontStyle}
                      className="flex-1 text-right text-[14px] text-black p-0"
                      value={formData.contactPhone}
                      onChangeText={(text) => handleChange('contactPhone', text.replace(/[^0-9]/g, ''))}
                      keyboardType="phone-pad"
                      placeholder="Phone Number"
                      placeholderTextColor="#A1A1AA"
                      maxLength={15}
                    />
                  </View>

                  {/* Address */}
                  <View className="flex-row items-center py-3">
                    <Text className="text-[14px] font-medium text-black w-[80px]">Address</Text>
                    <TextInput
                      style={inputFontStyle}
                      className="flex-1 text-right text-[14px] text-black p-0"
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
                <Text className="text-[15px] font-semibold text-[#111827] mb-3">Vaccination Record</Text>
                
                {/* 1. Upload Khu vực kéo thả / Click (Dropzone) */}
                <TouchableOpacity
                  onPress={handlePickVaccine}
                  activeOpacity={0.7}
                  className="bg-white border border-dashed border-[#D1D5DB] rounded-[12px] py-6 items-center justify-center mb-4"
                >
                  <View className="w-10 h-10 bg-[#F3F4F6] rounded-full items-center justify-center mb-2">
                    <Feather name="upload-cloud" size={20} color="#6B7280" />
                  </View>
                  <Text className="text-[14px] text-[#374151] font-medium mb-1">
                    <Text className="text-[#EFA062]">Click to upload</Text> or drag and drop
                  </Text>
                  <Text className="text-[12px] text-[#9CA3AF]">SVG, PNG, JPG or GIF (max. 800x400px)</Text>
                </TouchableOpacity>

                {/* 2. Trạng thái Đang tải lên (Uploading File Item) */}
                {isUploadingVaccine && (
                  <View className="border border-[#E5E7EB] rounded-[12px] p-3 flex-row items-center mb-3 bg-white shadow-sm shadow-gray-100">
                    <View className="w-10 h-10 rounded-lg bg-[#F3F4F6] items-center justify-center">
                      <Feather name="file" size={20} color="#9CA3AF" />
                    </View>
                    <View className="flex-1 mx-3">
                      <View className="flex-row justify-between items-center mb-1.5">
                        <Text className="text-[13px] text-[#111827] font-medium" numberOfLines={1}>Uploading_document...</Text>
                        <Text className="text-[12px] text-[#6B7280]">45%</Text>
                      </View>
                      <View className="h-1.5 w-full bg-[#F3F4F6] rounded-full overflow-hidden">
                        <View className="h-full bg-[#EFA062] rounded-full" style={{ width: '45%' }} />
                      </View>
                    </View>
                    <TouchableOpacity className="p-1">
                      <Feather name="x" size={16} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* 3. Trạng thái Đã tải lên xong (Uploaded File Item) */}
                {formData.vaccinationRecordUrl ? (
                  <View className="border border-[#EFA062] rounded-[12px] p-3 flex-row items-center bg-[#FEF3EB]/30 shadow-sm shadow-orange-100/50">
                    <Image 
                      source={{ uri: formData.vaccinationRecordUrl }} 
                      className="w-10 h-10 rounded-lg bg-[#F3F4F6]" 
                      resizeMode="cover"
                    />
                    <View className="flex-1 mx-3">
                      <View className="flex-row justify-between items-center mb-0.5">
                        <Text className="text-[13px] text-[#111827] font-medium" numberOfLines={1}>vaccination_record.jpg</Text>
                      </View>
                      <View className="flex-row items-center">
                        <Text className="text-[12px] text-[#6B7280] mr-2">1.2 MB</Text>
                        <View className="flex-row items-center">
                           <Feather name="check-circle" size={12} color="#EFA062" />
                           <Text className="text-[12px] text-[#EFA062] ml-1 font-medium">Completed</Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity 
                      onPress={() => handleChange('vaccinationRecordUrl', '')}
                      className="p-1"
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Feather name="trash-2" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>

              {/* Action Buttons */}
              <View className="space-y-3 mb-10">
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={isSubmitting || isUploadingAvatar || isUploadingVaccine}
                  className="bg-[#EFA062] h-[52px] rounded-2xl items-center justify-center flex-row shadow-sm"
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text className="text-white font-semibold text-[16px]">Save Profile</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.back()}
                  disabled={isSubmitting}
                  className="bg-white border border-gray-200 h-[52px] rounded-2xl items-center justify-center mt-4"
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
    </SafeAreaView>
  );
}