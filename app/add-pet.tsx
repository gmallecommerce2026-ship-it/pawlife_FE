// app/add-pet.tsx
import { Text } from '@/components/AppText';
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
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useImageUpload } from '../hooks/useImageUpload';
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
    { label: 'aHusky', value: 'Husky' },
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

const speciesData = [
  { label: 'Dog', value: 'Dog' },
  { label: 'Cat', value: 'Cat' },
];

const genderData = [
  { label: 'Male', value: 'MALE' },
  { label: 'Female', value: 'FEMALE' },
  { label: 'Unknown', value: 'UNKNOWN' },
];

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
  vaccinationRecordUrls: string[];
  qrCodeUrl: string;
  sterilized: boolean | null;
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
  // --- ADDRESS POPUP STATE & LOGIC ---
  const [showAddressPopup, setShowAddressPopup] = useState(false);
  const [addressDataAPI, setAddressDataAPI] = useState<any[]>([]);
  const [tempCity, setTempCity] = useState('');
  const [tempDistrict, setTempDistrict] = useState('');
  const [tempWard, setTempWard] = useState('');
  const [tempDetail, setTempDetail] = useState('');

  // Fetch dữ liệu Tỉnh/Thành
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
    
    // Lưu vào form data của bạn
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

  // 1. Thêm state quản lý loading riêng cho việc upload nhiều file
  const [isUploadingRecords, setIsUploadingRecords] = useState(false);

  // 2. Sửa lại hàm handlePickVaccine
  const handlePickVaccine = async () => {
    try {
      // Tính toán số lượng ảnh được phép chọn thêm
      const currentCount = formData.vaccinationRecordUrls.length;
      const remainingSlots = 5 - currentCount;

      if (remainingSlots <= 0) {
        Alert.alert("Giới hạn", "Bạn chỉ được tải lên tối đa 5 tài liệu tiêm chủng.");
        return;
      }

      // Mở thư viện ảnh
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots, // Giới hạn số lượng chọn (hỗ trợ iOS 14+ / Android 13+)
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        // Cắt mảng phòng trường hợp hệ điều hành cũ không support selectionLimit
        const selectedAssets = result.assets.slice(0, remainingSlots);
        
        setIsUploadingRecords(true);

        try {
          // BƯỚC QUAN TRỌNG: Gọi API Upload từng ảnh lên R2
          const uploadPromises = selectedAssets.map(async (asset) => {
            // ==========================================
            // TODO: GỌI API UPLOAD CỦA BẠN Ở ĐÂY
            // Dưới đây là đoạn code mẫu dùng fetch và FormData chuẩn của React Native
            // Bạn có thể thay bằng storageService / petService tương ứng trong dự án
            // ==========================================
            
            const filename = asset.uri.split('/').pop() || `vaccine-${Date.now()}.jpg`;
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : `image/jpeg`;

            const data = new FormData();
            data.append('file', { uri: asset.uri, name: filename, type } as any);

            // GỌI API (Thay 'YOUR_API_URL/storage/upload' bằng endpoint thật của backend)
            /*
            const response = await fetch('YOUR_API_URL/storage/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'multipart/form-data' },
              body: data,
            });
            const responseData = await response.json();
            return responseData.url; // URL thực tế từ R2: https://...
            */

            // TẠM THỜI trả về uri local ĐỂ BẠN HIỂU LUỒNG (Hãy đổi thành code gọi API ở trên)
            // Nếu dùng local URI backend sẽ báo lỗi validation IsUrl hoặc không xem được ảnh.
            return asset.uri; 
          });

          // Chờ tất cả ảnh upload xong
          const uploadedUrls = await Promise.all(uploadPromises);

          // Lọc bỏ các url bị lỗi (undefined/null) và đưa vào state
          const validUrls = uploadedUrls.filter(url => url);
          
          handleChange('vaccinationRecordUrls', [
            ...formData.vaccinationRecordUrls,
            ...validUrls
          ]);

        } catch (uploadError) {
          console.error("Lỗi khi upload lên R2:", uploadError);
          Alert.alert("Lỗi Upload", "Có lỗi xảy ra khi tải ảnh lên máy chủ R2. Vui lòng thử lại.");
        } finally {
          setIsUploadingRecords(false);
        }
      }
    } catch (error) {
      console.error("Lỗi picker:", error);
      Alert.alert("Lỗi", "Không thể mở thư viện ảnh.");
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
        title: 'Missing Information',
        message: "Please enter the pet's name.",
        buttonText: 'OK',
        onConfirm: () => { }
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
        vaccinationRecordUrls: formData.vaccinationRecordUrls.length > 0 ? formData.vaccinationRecordUrls : undefined,
        ...(formData.dob && { dob: formData.dob }),
        
        // Bổ sung field này để map với Backend
        isSpayedNeutered: formData.sterilized !== null ? formData.sterilized : undefined,

        // QUAN TRỌNG: Đẩy thẳng tagId xuống Backend trong cùng 1 cục payload
        ...(tagId && { tagId: (tagId as string).trim() }),
        ...(rawQrData && { qrCodeUrl: rawQrData }),
      };

      // 1. Chỉ gọi duy nhất 1 API (Backend sẽ tự xử lý việc gán QR bằng Transaction)
      const newPet = await petService.addPet(payload);
      const realPetId = newPet?.id || newPet?.data?.id;

      // 2. Chuyển trang thẳng
      router.replace(`/pet-profile-detail?id=${realPetId}`);

      // 3. Hiển thị thông báo (SỬA LẠI ĐOẠN NÀY)
      showModal({
        title: 'Success',
        message: tagId
          ? 'Tạo hồ sơ thú cưng thành công! Vòng cổ đã được kích hoạt.'
          : 'Tạo hồ sơ thành công!\n(Profile hiện chưa có QR code, bạn có thể cập nhật và gán vòng cổ sau).', // Nhắc nhở người dùng
        buttonText: 'OK',
        onConfirm: () => { }
      });

    } catch (error: any) {
      showModal({
        title: 'Error',
        message: error.response?.data?.message || error.message || 'Failed to add pet. Please try again.',
        buttonText: 'Try Again',
        onConfirm: () => { }
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
              <Text className="text-[16px] font-semibold text-black mb-[20px] tracking-[0.06px]">Pet Information</Text>

              <View className="bg-white p-6 rounded-[20px] border border-[#E5E5E5]">
                <View className="flex-row gap-3 mb-5">
                  <View className="flex-1">
                    <Text className="text-[14px] text-black font-medium mb-1.5">Name</Text>
                    <TextInput
                      style={inputFontStyle}
                      className="h-[34px] border border-[#E5E5E5] rounded-[12px] px-3.5 text-black text-[14px]"
                      value={formData.name}
                      onChangeText={(text) => handleChange('name', text)}
                      placeholder="Enter name"
                      placeholderTextColor="#A1A1AA"
                    />
                  </View>

                  <View className="flex-1">
                    <Text className="text-[14px] text-black font-medium mb-1.5">Type</Text>

                    <Dropdown
                      style={{
                        height: 34,
                        borderColor: '#E5E7EB',
                        borderWidth: 1,
                        borderRadius: 12,
                        paddingHorizontal: 16,
                        backgroundColor: '#FFFFFF',
                      }}
                      containerStyle={{
                        borderRadius: 12,
                        overflow: 'hidden',
                        marginTop: 2,
                        borderColor: '#E5E7EB',
                        borderWidth: 1,
                      }}
                      placeholderStyle={{ fontSize: 14, color: '#9CA3AF', fontFamily: 'Urbanist' }}
                      selectedTextStyle={{ fontSize: 14, color: '#000000', fontFamily: 'Urbanist' }}
                      itemTextStyle={{
                        fontSize: 14,
                        color: '#000000',
                        fontFamily: 'Urbanist'
                      }}
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

                {/* Gender & Sterilized Row */}
                <View className="flex-row gap-3 mb-5">
                  <View className="flex-1">
                    <Text className="text-[14px] text-black font-medium mb-1.5">Gender</Text>

                    <Dropdown
                      style={{
                        height: 34,
                        borderColor: '#E5E7EB',
                        borderWidth: 1,
                        borderRadius: 12,
                        paddingHorizontal: 16,
                        backgroundColor: '#FFFFFF',
                      }}

                      containerStyle={{
                        borderRadius: 12,
                        overflow: 'hidden',
                        marginTop: 4,
                        borderColor: '#E5E7EB',
                        borderWidth: 1,
                      }}

                      placeholderStyle={{ fontSize: 14, color: '#9CA3AF', fontFamily: 'Urbanist' }}
                      selectedTextStyle={{ fontSize: 14, color: '#000000', fontFamily: 'Urbanist' }}
                      itemTextStyle={{
                        fontSize: 14,
                        color: '#000000',
                        fontFamily: 'Urbanist'
                      }}
                      data={genderData}
                      maxHeight={200}
                      labelField="label"
                      valueField="value"
                      placeholder="Select gender"
                      value={formData.gender}
                      onChange={(item) => {
                        handleChange('gender', item.value);
                      }}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[14px] text-black font-medium mb-2.5">Sterilized</Text>

                    <View className="flex-row items-center gap-8 h-[30px]">

                      {/* --- Nút YES --- */}
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleChange('sterilized', true)}
                        className="flex-row items-center"
                      >
                        {/* Vòng tròn outer */}
                        <View className={`w-[16px] h-[16px] rounded-full border items-center justify-center mr-2 ${formData.sterilized === true ? 'border-[#E89B5A]' : 'border-[#E5E5E5]'
                          }`}>
                          {/* Dấu chấm inner (Chỉ hiện khi được chọn) */}
                          {formData.sterilized === true && (
                            <View className="w-2.5 h-2.5 rounded-full bg-[#E89B5A]" />
                          )}
                        </View>
                        <Text className={`text-[14px] text-[#8E8E93]`}>
                          Yes
                        </Text>
                      </TouchableOpacity>

                      {/* --- Nút NO --- */}
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleChange('sterilized', false)}
                        className="flex-row items-center"
                      >
                        <View className={`w-[16px] h-[16px] rounded-full border items-center justify-center mr-2  ${formData.sterilized === false ? 'border-[#E89B5A]' : 'border-[#E5E5E5]'
                          }`}>
                          {formData.sterilized === false && (
                            <View className="w-2.5 h-2.5 rounded-full bg-[#E89B5A]" />
                          )}
                        </View>
                        <Text className={`text-[14px] text-[#8E8E93]`}>
                          No
                        </Text>
                      </TouchableOpacity>

                    </View>
                  </View>
                </View>

                {/* Color & Breed Row */}
                <View className="flex-row gap-3 mb-5">
                  <View className="flex-1">
                    <Text className="text-[14px] text-black font-medium mb-1.5">Breed</Text>

                    <Dropdown
                      style={{
                        height: 34,
                        borderColor: '#E5E7EB',
                        borderWidth: 1,
                        borderRadius: 12,
                        paddingHorizontal: 16,
                        backgroundColor: formData.species ? '#FFFFFF' : '#F9FAFB',
                      }}
                      containerStyle={{
                        borderRadius: 12,
                        overflow: 'hidden',
                        marginTop: 4,
                        borderColor: '#E5E7EB',
                        borderWidth: 1,
                      }}
                      placeholderStyle={{ fontSize: 14, color: '#9CA3AF', fontFamily: 'Urbanist' }}
                      selectedTextStyle={{ fontSize: 14, color: '#000000', fontFamily: 'Urbanist' }}
                      itemTextStyle={{
                        fontSize: 14,
                        color: '#000000',
                        fontFamily: 'Urbanist'
                      }}
                      data={formData.species ? BREED_OPTIONS[formData.species as 'Dog' | 'Cat'] : []}
                      disable={!formData.species}
                      maxHeight={200}
                      labelField="label"
                      valueField="value"
                      placeholder={formData.species ? "Select breed" : "Select type first"}
                      value={formData.breed}
                      onChange={(item) => {
                        handleChange('breed', item.value);
                      }}
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

                {/* Birthday & Weight Row */}
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Text className="text-[14px] text-black font-medium mb-1.5">Birthday</Text>
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

                {/* Notes */}
                <View>
                  <Text className="text-[14px] text-black font-medium mb-1.5">Notes</Text>
                  <TextInput
                    style={[inputFontStyle, { paddingTop: 12 }]}
                    className="border border-[#E5E5E5] rounded-[12px] px-3.5 pb-3 text-black text-[14px] min-h-[59px]"
                    value={formData.description}
                    onChangeText={(text) => handleChange('description', text)}
                    placeholder="Share a few things that make your pet special..."
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
              <Text className="text-[16px] font-semibold text-black mb-[20px] tracking-[0.06px]">Owner Information</Text>

              <View className="bg-white rounded-[16px] border border-[#E5E5E5] px-[18px] py-[3px]">
                {/* Name */}
                <View className="flex-row items-center py-4 border-b border-gray-100">
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
                <View className="flex-row items-center py-4 border-b border-gray-100">
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

            <Text className="text-[16px] font-semibold text-[#111827] mb-[20px] tracking-[0.06px]">
              Vaccination Record ({formData.vaccinationRecordUrls.length}/5)
            </Text>
            <View className="mb-[38px] flex-col gap-3">
              
              {/* 1. Nút Upload: CHỈ HIỂN THỊ KHI CHƯA ĐỦ 5 ẢNH */}
              {formData.vaccinationRecordUrls.length < 5 && (
                <TouchableOpacity
                  onPress={handlePickVaccine}
                  activeOpacity={0.7}
                  disabled={isUploadingRecords}
                  className={`bg-white border border-dashed border-[#D1D5DB] rounded-[12px] py-6 items-center justify-center ${isUploadingRecords ? 'opacity-50' : ''}`}
                >
                  <View className="items-center justify-center mb-2">
                    <Image source={require('../assets/icon/upload-black.png')} style={{ width: 16, height: 16 }} resizeMode="cover" />
                  </View>
                  <Text className="text-[16px] text-[#292D32] font-medium mb-[10px]">
                    Choose files to upload
                  </Text>
                  <Text className="text-[14px] text-[#A9ACB4]">JPEG, PNG formats, up to 50MB</Text>
                </TouchableOpacity>
              )}

              {/* 2. Trạng thái Đang tải lên (Uploading File Item) */}
              {isUploadingRecords && (
                <View className="h-[73px] rounded-[16px] p-3 bg-[#F8F8F8] mt-2">
                  <View className='flex-row items-center mb-3'>
                    <Image source={require('../assets/icon/file.png')} style={{ width: 28, height: 28 }} resizeMode="cover" />
                    <View className="flex-1 ml-3">
                      <View className="flex-row justify-between items-center">
                        <Text className="text-[12px] text-[#000000] font-medium leading-[13px]" numberOfLines={1}>Uploading files...</Text>
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
                    <View className="h-full bg-[#EFA062] rounded-full" style={{ width: '100%' }} />
                  </View>
                </View>
              )}

              {/* 3. Danh sách File đã tải lên xong */}
              {formData.vaccinationRecordUrls.map((url, index) => (
                <View key={index}>
                  <View className="h-[57px] rounded-[16px] p-3 flex-row items-center bg-[#F8F8F8] mt-2">
                    <Image source={require('../assets/icon/file.png')} style={{ width: 28, height: 28 }} resizeMode="cover" />
                    <View className="flex-1 ml-3">
                      <View className="flex-row justify-between items-center">
                        <Text className="text-[12px] text-[#000000] font-medium leading-[13px]" numberOfLines={1}>
                          vaccination_record_{index + 1}.jpg
                        </Text>
                        <TouchableOpacity
                          onPress={() => {
                            const newUrls = formData.vaccinationRecordUrls.filter((_, i) => i !== index);
                            handleChange('vaccinationRecordUrls', newUrls);
                          }}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Image source={require('../assets/icon/trash.png')} style={{ width: 10, height: 10 }} resizeMode="cover" />
                        </TouchableOpacity>
                      </View>
                      <View className="flex-row items-center mt-1">
                        <View className="flex-row items-center">
                          <Feather name="check" size={12} color="#EFA062" />
                          <Text className="text-[10px] text-black ml-1 font-regular tracking-[0.5px] leading-[13px]">Completed</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* Action Buttons */}
            <View className="space-y-3">
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isSubmitting || isUploadingAvatar || isUploadingVaccine}
                className="bg-[#E89B5A] h-[52px] rounded-[16px] items-center justify-center flex-row"
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-white font-semibold text-[16px]">Save</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.back()}
                disabled={isSubmitting}
                className="bg-white border border-[#E5E5E5] h-[52px] rounded-[16px] items-center justify-center mt-4"
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