// app/add-pet.tsx
import { Text } from '@/components/AppText';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useImageUpload } from '../hooks/useImageUpload';
import { petService } from '../services/petService';

type GenderType = 'MALE' | 'FEMALE' | 'UNKNOWN';
type SpeciesType = 'Dog' | 'Cat';

interface AddPetFormData {
  name: string;
  species: SpeciesType;
  breed: string;
  color: string;
  dob: string;
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
  const { pickAndUploadImage, isUploading: isUploadingImage } = useImageUpload();
  const { pickAndUploadImage: uploadAvatar, isUploading: isUploadingAvatar } = useImageUpload();
  const { pickAndUploadImage: uploadVaccine, isUploading: isUploadingVaccine } = useImageUpload();
  const { pickAndUploadImage: uploadQR, isUploading: isUploadingQR } = useImageUpload();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [formData, setFormData] = useState<AddPetFormData>({
    name: '',
    species: 'Dog',
    breed: '',
    color: '',
    dob: '',
    description: '',
    gender: 'UNKNOWN',
    imageUrl: '',
    contactName: '',
    contactPhone: '',
    contactAddress: '',
    vaccinationRecordUrl: '',
    qrCodeUrl: '',
  });

  const handlePickImage = async () => {
    const uploadedUrl = await pickAndUploadImage({ 
      folder: 'pets', 
      aspect: [1, 1],
      quality: 0.8,
    });
    
    if (uploadedUrl) {
      handleChange('imageUrl', uploadedUrl);
    }
  };

  const handlePickAvatar = async () => {
    const url = await uploadAvatar({ folder: 'pets/avatars', aspect: [1, 1], quality: 0.8 });
    if (url) handleChange('imageUrl', url);
  };

  const handlePickVaccine = async () => {
    const url = await uploadVaccine({ folder: 'pets/paw-history', aspect: [3, 4], quality: 0.8 });
    if (url) handleChange('vaccinationRecordUrl', url);
  };

  const handlePickQR = async () => {
    const url = await uploadQR({ folder: 'pets/qr-codes', aspect: [1, 1], quality: 0.8 });
    if (url) handleChange('qrCodeUrl', url);
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

      await petService.addPet(payload);
      Alert.alert('Success', 'Pet profile added successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add pet. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderGenderChip = (label: string, value: GenderType) => {
    const isSelected = formData.gender === value;
    return (
      <TouchableOpacity
        onPress={() => handleChange('gender', value)}
        className={`flex-1 items-center justify-center py-3.5 rounded-xl border ${
          isSelected 
            ? 'bg-orange-50 border-orange-500' 
            : 'bg-white border-gray-200'
        }`}
      >
        <Text className={`font-semibold ${isSelected ? 'text-orange-600' : 'text-gray-500'}`}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSpeciesChip = (label: string, value: SpeciesType) => {
    const isSelected = formData.species === value;
    return (
      <TouchableOpacity
        onPress={() => handleChange('species', value)}
        className={`flex-1 items-center justify-center py-3.5 rounded-xl border ${
          isSelected 
            ? 'bg-blue-50 border-blue-500' 
            : 'bg-white border-gray-200'
        }`}
      >
        <Text className={`font-semibold ${isSelected ? 'text-blue-600' : 'text-gray-500'}`}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View className="flex-1">
            {/* Header */}
            <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-gray-100 z-10">
              <TouchableOpacity 
                onPress={() => router.back()} 
                className="w-10 h-10 items-start justify-center"
              >
                <Feather name="chevron-left" size={28} color="#1F2937" />
              </TouchableOpacity>
              <Text className="text-lg font-bold text-gray-900">Add Pet</Text>
              <View className="w-10" />
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 100 }}
              className="px-4 pt-6"
            >
              {/* Avatar Section */}
              <View className="items-center mb-8">
                <View className="relative shadow-sm">
                  {formData.imageUrl ? (
                    <Image 
                      source={{ uri: formData.imageUrl }} 
                      className="w-32 h-32 rounded-full bg-gray-100 border-4 border-white"
                    />
                  ) : (
                    <View className="w-32 h-32 rounded-full bg-orange-50 items-center justify-center border-4 border-white">
                      <Ionicons name="paw" size={48} color="#ffa053" />
                    </View>
                  )}
                  
                  <TouchableOpacity 
                    onPress={handlePickImage}
                    disabled={isUploadingImage}
                    className="absolute bottom-1 right-1 bg-orange-500 w-10 h-10 rounded-full items-center justify-center border-4 border-white shadow-md"
                  >
                    {isUploadingImage ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Feather name="camera" size={16} color="white" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Form Section 1: Basic Info */}
              <View className="bg-white p-5 rounded-3xl mb-4 shadow-sm">
                <View className="mb-5">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">Pet Name <Text className="text-red-500">*</Text></Text>
                  <TextInput
                    className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-gray-900 text-base font-medium"
                    value={formData.name}
                    onChangeText={(text) => handleChange('name', text)}
                    placeholder="e.g. Max, Bella"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View className="mb-5">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">Species</Text>
                  <View className="flex-row gap-3">
                    {renderSpeciesChip('Dog', 'Dog')}
                    {renderSpeciesChip('Cat', 'Cat')}
                  </View>
                </View>

                <View>
                  <Text className="text-sm font-semibold text-gray-700 mb-2">Gender</Text>
                  <View className="flex-row gap-3">
                    {renderGenderChip('Đực', 'MALE')}
                    {renderGenderChip('Cái', 'FEMALE')}
                    {renderGenderChip('Không rõ', 'UNKNOWN')}
                  </View>
                </View>
              </View>

              {/* Form Section 2: Details */}
              <View className="bg-white p-5 rounded-3xl mb-4 shadow-sm">
                <View className="flex-row gap-4 mb-5">
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-gray-700 mb-2">Breed</Text>
                    <TextInput
                      className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-gray-900 text-base font-medium"
                      value={formData.breed}
                      onChangeText={(text) => handleChange('breed', text)}
                      placeholder="e.g. Corgi"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                  
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-gray-700 mb-2">Date of Birth</Text>
                    <TouchableOpacity
                      onPress={() => setShowDatePicker(true)}
                      className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 flex-row items-center justify-between"
                    >
                      <Text className={`text-base font-medium ${formData.dob ? 'text-gray-900' : 'text-[#9CA3AF]'}`}>
                        {formData.dob ? new Date(formData.dob).toLocaleDateString('en-GB') : 'Select Date'}
                      </Text>
                      <Feather name="calendar" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View className="mb-5">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">Color</Text>
                  <TextInput
                    className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-gray-900 text-base font-medium"
                    value={formData.color}
                    onChangeText={(text) => handleChange('color', text)}
                    placeholder="e.g. Golden, Black & White"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View>
                  <Text className="text-sm font-semibold text-gray-700 mb-2">Description & Notes</Text>
                  <TextInput
                    className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-gray-900 text-base font-medium min-h-[100px]"
                    value={formData.description}
                    onChangeText={(text) => handleChange('description', text)}
                    placeholder="Any unique traits, medical notes, or fun facts..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              </View>

              {/* --- FORM SECTION: PAW HISTORY (MEDICAL) --- */}
              <View className="bg-white p-5 rounded-3xl mb-4 shadow-sm">
                <View className="flex-row items-center mb-2">
                  <MaterialCommunityIcons name="medical-bag" size={24} color="#10B981" />
                  <Text className="text-lg font-bold text-gray-900 ml-2">Paw History (Medical)</Text>
                </View>
                <Text className="text-sm text-gray-500 mb-5 leading-5">
                  Upload vaccination record images. This information needs to be verified by our Veterinary (Vet) team.
                </Text>

                <View className="w-full">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">Vaccination Book</Text>
                  <TouchableOpacity 
                    onPress={handlePickVaccine}
                    disabled={isUploadingVaccine}
                    className="bg-gray-50 border border-gray-200 border-dashed rounded-2xl h-40 items-center justify-center overflow-hidden"
                  >
                    {isUploadingVaccine ? (
                      <ActivityIndicator size="small" color="#10B981" />
                    ) : formData.vaccinationRecordUrl ? (
                      <Image source={{ uri: formData.vaccinationRecordUrl }} className="w-full h-full" resizeMode="cover" />
                    ) : (
                      <View className="items-center">
                        <Feather name="upload-cloud" size={28} color="#9CA3AF" />
                        <Text className="text-sm text-gray-500 mt-2">Upload Vaccination Record</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* --- FORM SECTION: SMART TAG / QR CODE --- */}
              <View className="bg-white p-5 rounded-3xl mb-4 shadow-sm">
                <View className="flex-row items-center mb-2">
                  <MaterialCommunityIcons name="qrcode-scan" size={24} color="#3B82F6" />
                  <Text className="text-lg font-bold text-gray-900 ml-2">Smart Tag / QR Code</Text>
                </View>
                <Text className="text-sm text-gray-500 mb-5 leading-5">
                  Upload the pet's collar QR code. This data will be verified by the system or the Management team to activate the search feature.
                </Text>

                <View className="w-full">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">Pet QR Code</Text>
                  <TouchableOpacity 
                    onPress={handlePickQR}
                    disabled={isUploadingQR}
                    className="bg-gray-50 border border-gray-200 border-dashed rounded-2xl h-40 items-center justify-center overflow-hidden"
                  >
                    {isUploadingQR ? (
                      <ActivityIndicator size="small" color="#3B82F6" />
                    ) : formData.qrCodeUrl ? (
                      <Image source={{ uri: formData.qrCodeUrl }} className="w-full h-full" resizeMode="contain" />
                    ) : (
                      <View className="items-center">
                        <MaterialCommunityIcons name="qrcode-plus" size={28} color="#9CA3AF" />
                        <Text className="text-sm text-gray-500 mt-2">Upload QR Code</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Form Section 3: Owner Information */}
              <View className="bg-white p-5 rounded-3xl mb-8 shadow-sm">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="person-circle" size={24} color="#ffa053" />
                  <Text className="text-lg font-bold text-gray-900 ml-2">Contact Info</Text>
                </View>
                <Text className="text-sm text-gray-500 mb-5 leading-5">
                  Crucial details for others to reach you if your pet gets lost or is in an emergency.
                </Text>

                <View className="space-y-5">
                  <View>
                    <Text className="text-sm font-semibold text-gray-700 mb-2">Owner Name</Text>
                    <TextInput
                      className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-gray-900 text-base font-medium"
                      value={formData.contactName}
                      onChangeText={(text) => handleChange('contactName', text)}
                      placeholder="e.g. John Doe"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  <View>
                    <Text className="text-sm font-semibold text-gray-700 mb-2">Phone Number</Text>
                    <TextInput
                      className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-gray-900 text-base font-medium"
                      value={formData.contactPhone}
                      onChangeText={(text) => handleChange('contactPhone', text.replace(/[^0-9]/g, ''))}
                      keyboardType="phone-pad"
                      placeholder="e.g. 0912345678"
                      placeholderTextColor="#9CA3AF"
                      maxLength={15}
                    />
                  </View>

                  <View>
                    <Text className="text-sm font-semibold text-gray-700 mb-2">Address</Text>
                    <TextInput
                      className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-gray-900 text-base font-medium min-h-[80px]"
                      value={formData.contactAddress}
                      onChangeText={(text) => handleChange('contactAddress', text)}
                      placeholder="e.g. 123 Main St, Apartment 4B..."
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                </View>
              </View>

            </ScrollView>

            {/* Sticky Bottom Action Button */}
            <View className="absolute bottom-0 w-full px-5 py-4 bg-white border-t border-gray-100 pb-8">
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isSubmitting || isUploadingImage || !formData.name}
                className={`w-full py-4 rounded-2xl items-center justify-center flex-row shadow-sm ${
                  (isSubmitting || isUploadingImage || !formData.name) ? 'bg-orange-400' : 'bg-orange-500'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <ActivityIndicator size="small" color="white" />
                    <Text className="text-white font-bold text-lg ml-2">Saving...</Text>
                  </>
                ) : (
                  <Text className="text-white font-bold text-lg">Save Profile</Text>
                )}
              </TouchableOpacity>
            </View>

          </View>
        </TouchableWithoutFeedback>
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
                  <Text className="text-orange-500 font-bold text-lg px-2">Done</Text>
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