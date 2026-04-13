// app/edit-pet.tsx
import { Text } from '@/components/AppText';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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

type GenderType = 'MALE' | 'FEMALE' | 'UNKNOWN';

interface EditPetFormData {
  name: string;
  species: string;
  breed: string;
  color: string;
  weight: string;
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

export default function EditPetScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  
  // Tách biệt hook upload cho 3 loại ảnh
  const { pickAndUploadImage: pickAvatar, isUploading: isUploadingAvatar } = useImageUpload();
  const { pickAndUploadImage: pickVaccine, isUploading: isUploadingVaccine } = useImageUpload();
  const { pickAndUploadImage: pickQR, isUploading: isUploadingQR } = useImageUpload();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [formData, setFormData] = useState<EditPetFormData>({
    name: '',
    species: 'Dog',
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

  const handleChange = (field: keyof EditPetFormData, value: string) => {
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
      Alert.alert('Success', 'Pet profile updated successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
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
                <Text className="text-[15px] font-semibold text-black mb-3">Pet Information</Text>
                
                <View className="bg-white p-6 rounded-[20px] border border-gray-200">
                  {/* Name & Type Row */}
                  <View className="flex-row gap-3 mb-4">
                    <View className="flex-1">
                      <Text className="text-[13px] text-black font-medium mb-1.5">Name</Text>
                      <TextInput
                        style={inputFontStyle}
                        className="h-[44px] border border-gray-200 rounded-[12px] px-3.5 text-black text-[14px]"
                        value={formData.name}
                        onChangeText={(text) => handleChange('name', text)}
                        placeholder="Enter pet name"
                        placeholderTextColor="#A1A1AA"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[13px] text-black font-medium mb-1.5">Type</Text>
                      <TouchableOpacity 
                        className="h-[44px] border border-gray-200 rounded-[12px] px-3.5 flex-row items-center justify-between bg-white"
                        onPress={() => Alert.alert("Select Type", "Tính năng chọn Chó/Mèo đang được phát triển.")}
                      >
                        <Text className="text-black text-[14px]">
                          {formData.species === 'Cat' ? 'Cat' : 'Dog'}
                        </Text>
                        <Feather name="chevron-down" size={16} color="#A1A1AA" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Gender & Breed Row */}
                  <View className="flex-row gap-3 mb-4">
                    <View className="flex-1">
                      <Text className="text-[13px] text-black font-medium mb-1.5">Gender</Text>
                      <TouchableOpacity className="h-[44px] border border-gray-200 rounded-[12px] px-3.5 flex-row items-center justify-between bg-white">
                        <Text className="text-[#A1A1AA] text-[14px] capitalize">
                          {formData.gender === 'UNKNOWN' ? 'Select' : formData.gender.toLowerCase()}
                        </Text>
                        <Feather name="chevron-down" size={16} color="#A1A1AA" />
                      </TouchableOpacity>
                    </View>
                    <View className="flex-1">
                      <Text className="text-[13px] text-black font-medium mb-1.5">Breed</Text>
                      <TextInput
                        style={inputFontStyle}
                        className="h-[44px] border border-gray-200 rounded-[12px] px-3.5 text-black text-[14px]"
                        value={formData.breed}
                        onChangeText={(text) => handleChange('breed', text)}
                        placeholder="e.g. Corgi"
                        placeholderTextColor="#A1A1AA"
                      />
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
                
                {/* 1. Dropzone LUÔN HIỂN THỊ để chuẩn bị cho multiple uploads/PDF sau này */}
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
                  {/* Cập nhật thêm PDF vào text hướng dẫn */}
                  <Text className="text-[12px] text-[#9CA3AF]">SVG, PNG, JPG, GIF or PDF (max. 10MB)</Text>
                </TouchableOpacity>

                {/* 2. Trạng thái Đang tải lên */}
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

                {/* 3. Trạng thái Đã tải lên xong */}
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


              {/* QR Code Section (Áp dụng style Dropzone giống hệt) */}
              {/* <View className="mb-8">
                <Text className="text-[15px] font-semibold text-[#111827] mb-3">Smart Tag / QR Code</Text>
                
                {!formData.qrCodeUrl && !isUploadingQR && (
                  <TouchableOpacity
                    onPress={handlePickQR}
                    activeOpacity={0.7}
                    className="bg-white border border-dashed border-[#D1D5DB] rounded-[12px] py-6 items-center justify-center mb-4"
                  >
                    <View className="w-10 h-10 bg-[#F3F4F6] rounded-full items-center justify-center mb-2">
                      <Feather name="maximize" size={20} color="#6B7280" />
                    </View>
                    <Text className="text-[14px] text-[#374151] font-medium mb-1">
                      <Text className="text-[#3B82F6]">Click to upload QR</Text> or drag and drop
                    </Text>
                    <Text className="text-[12px] text-[#9CA3AF]">SVG, PNG, JPG (max. 800x400px)</Text>
                  </TouchableOpacity>
                )}

                {isUploadingQR && (
                  <View className="border border-[#E5E7EB] rounded-[12px] p-3 flex-row items-center mb-3 bg-white shadow-sm shadow-gray-100">
                    <View className="w-10 h-10 rounded-lg bg-[#F3F4F6] items-center justify-center">
                      <Feather name="file" size={20} color="#9CA3AF" />
                    </View>
                    <View className="flex-1 mx-3">
                      <View className="flex-row justify-between items-center mb-1.5">
                        <Text className="text-[13px] text-[#111827] font-medium" numberOfLines={1}>Uploading_QR...</Text>
                        <Text className="text-[12px] text-[#6B7280]">Uploading...</Text>
                      </View>
                      <View className="h-1.5 w-full bg-[#F3F4F6] rounded-full overflow-hidden">
                        <View className="h-full bg-[#3B82F6] rounded-full w-1/2" />
                      </View>
                    </View>
                  </View>
                )}

                {formData.qrCodeUrl ? (
                  <View className="border border-[#3B82F6] rounded-[12px] p-3 flex-row items-center bg-[#EFF6FF] shadow-sm shadow-blue-100/50">
                    <Image 
                      source={{ uri: formData.qrCodeUrl }} 
                      className="w-10 h-10 rounded-lg bg-[#F3F4F6]" 
                      resizeMode="cover"
                    />
                    <View className="flex-1 mx-3">
                      <View className="flex-row justify-between items-center mb-0.5">
                        <Text className="text-[13px] text-[#111827] font-medium" numberOfLines={1}>qr_code.jpg</Text>
                      </View>
                      <View className="flex-row items-center">
                        <View className="flex-row items-center">
                           <Feather name="check-circle" size={12} color="#3B82F6" />
                           <Text className="text-[12px] text-[#3B82F6] ml-1 font-medium">Completed</Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity 
                      onPress={() => handleChange('qrCodeUrl', '')}
                      className="p-1"
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Feather name="trash-2" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View> */}

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