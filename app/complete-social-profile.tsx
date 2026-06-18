// app/complete-social-profile.tsx
import { Text } from '@/components/AppText';
import { TextInput } from '@/components/AppTextInput';
import { AuthContext } from '@/contexts/AuthContext';
import { useImageUpload } from '@/hooks/useImageUpload';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { User } from 'lucide-react-native';
import React, { useContext, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ==========================================
// 1. COMPONENT INPUT & DATA (Đồng bộ từ fill-profile)
// ==========================================
const COUNTRY_CODES = [
  { code: 'VN', dial_code: '+84', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'US', dial_code: '+1', name: 'United States', flag: '🇺🇸' },
  { code: 'UK', dial_code: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'JP', dial_code: '+81', name: 'Japan', flag: '🇯🇵' },
];

// Map value cho Backend và label cho UI
const GENDER_OPTIONS = [
  { label: 'Male', value: 'MALE' },
  { label: 'Female', value: 'FEMALE' },
  { label: 'Other', value: 'OTHER' },
];

const InputField = ({ 
  label, placeholder, value, onChangeText, 
  secureTextEntry, autoCapitalize = 'none', keyboardType = 'default',
  error, onPress, containerStyle = 'mb-[12px]'
}: any) => (
  <View className={containerStyle}>
    {label && <Text className="text-[16px] font-medium text-black mb-[6px]">{label}</Text>}
    <TouchableOpacity 
      activeOpacity={onPress ? 0.7 : 1} 
      onPress={onPress}
      className={`flex-row items-center bg-[#FAFAFA] px-5 py-4 rounded-[16px] border ${error ? 'border-red-500' : 'border-[#E5E5E5]'} h-[48px]`}
    >
      <TextInput 
        placeholder={placeholder} 
        value={value}
        style={{fontFamily: 'Urbanist'}}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        editable={!onPress} 
        pointerEvents={onPress ? "none" : "auto"}
        className="flex-1 text-[16px] text-gray-800 p-0 m-0 leading-tight" 
        placeholderTextColor="#9CA3AF"
      />
    </TouchableOpacity>
    {error && <Text className="text-red-500 text-xs mt-1.5 ml-1">{error}</Text>}
  </View>
);

// ==========================================
// 2. MAIN SCREEN
// ==========================================
export default function CompleteSocialProfileScreen() {
  const router = useRouter();

  const { updateUser, user: currentUser } = useContext(AuthContext) as any;
  const { pickAndUploadImage, isUploading: isImageUploading, uploadError } = useImageUpload();

  // --- FORM STATES ---
  const [avatar, setAvatar] = useState<string | null>(currentUser?.avatarUrl || null);
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  
  // Gender
  const [gender, setGender] = useState<string>(currentUser?.gender !== 'UNKNOWN' ? currentUser?.gender : '');
  const [showGenderModal, setShowGenderModal] = useState(false);

  // DOB
  const [dob, setDob] = useState<Date>(currentUser?.dob ? new Date(currentUser.dob) : new Date());
  const [hasSelectedDate, setHasSelectedDate] = useState(!!currentUser?.dob);
  const [showPicker, setShowPicker] = useState(false);

  // Country Code
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [showCountryModal, setShowCountryModal] = useState(false);

  // Status
  const [isLoading, setIsLoading] = useState(false);

  // Lấy label Gender để hiển thị trên UI
  const getGenderLabel = () => {
    const found = GENDER_OPTIONS.find(g => g.value === gender);
    return found ? found.label : '';
  };

  // --- HANDLERS ---
  const handleOpenDatePicker = () => setShowPicker(true);

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    
    if (event.type === 'set' && selectedDate) {
      setDob(selectedDate);
      setHasSelectedDate(true);
    } else if (event.type === 'dismissed') {
      setShowPicker(false);
    }
  };

  const handlePickImage = async () => {
    const uploadedUrl = await pickAndUploadImage({
      folder: 'avatars',
      aspect: [1, 1],
      quality: 0.8,
    });

    if (uploadedUrl) {
      setAvatar(uploadedUrl); 
    }
  };

  const handleSave = async () => {
    if (!name || !phone || !gender) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    try {
      setIsLoading(true);
        const formattedPhone = phone.startsWith('0') ? phone.substring(1) : phone;
        // Tránh duplicate mã quốc gia nếu user đã có sẵn trong DB
        const fullPhone = phone.includes('+') ? phone : `${selectedCountry.dial_code}${formattedPhone}`;
        const DEFAULT_AVATAR_URL = 'https://pub-35c6d59c9e96467b9783df2a4e890a09.r2.dev/default-avatar.jpg';
        await updateUser({
        name,
        phone: fullPhone,
        gender, // Gửi lên BE dạng 'MALE', 'FEMALE', 'OTHER'
        dob: dob.toISOString(),
        avatarUrl: avatar || DEFAULT_AVATAR_URL || '/assets/images/default-avatar.jpg',
        });
      

      // Định dạng số điện thoại giống với logic bên fill-profile

      // Guard ở RootLayoutNavGuard sẽ tự động xử lý redirect
      Alert.alert('Thành công', 'Hồ sơ đã được cập nhật!');
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Có lỗi xảy ra khi lưu thông tin.');
    } finally {
      setIsLoading(false);
    }
  };
  const getAvatarSource = (avatarUrl: string | null) => {
    if (!avatarUrl || avatarUrl === '/assets/images/default-avatar.jpg') {
        // Trả về require cục bộ của React Native nếu là ảnh mặc định
        return require('@/assets/images/default-avatar.jpg');
    }
    // Trả về uri mạng nếu là ảnh người dùng upload lên đám mây
    return { uri: avatarUrl };
    };
  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header UI đồng bộ với fill-profile */}
      <View className="flex-row items-center px-4 py-3 mb-2">
        <TouchableOpacity onPress={() => router.back()} disabled={isLoading} className="p-2 -ml-2">
          <Feather name="chevron-left" size={35} color="#000000" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-[24px] font-semibold text-black mr-8">Your Profile</Text>
      </View>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
          <ScrollView 
            className="flex-1 px-6" 
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Avatar Upload */}
            <View className="items-center mb-6 mt-2">
              <TouchableOpacity 
                onPress={handlePickImage} 
                activeOpacity={0.8} 
                className="relative w-[118px] h-[118px] bg-[#FAFAFA] rounded-full items-center justify-center overflow-hidden"
                disabled={isImageUploading || isLoading} 
              >
                {avatar ? (
                  <Image source={getAvatarSource(avatar)} className="w-full h-full rounded-full" resizeMode="cover" />
                ) : (
                  <User size={40} color="#D1D5DB" />
                )}

                {isImageUploading && (
                  <View className="absolute inset-0 bg-black/30 items-center justify-center rounded-full">
                    <ActivityIndicator color="#ffffff" size="large" />
                  </View>
                )}
              </TouchableOpacity>
              
              {uploadError && <Text className="text-red-500 text-xs mt-3 text-center">{uploadError}</Text>}
            </View>

            {/* Inputs đồng bộ layout với fill-profile */}
            <InputField 
              label="Your Name"
              placeholder="Enter your name" 
              value={name} 
              onChangeText={setName} 
              autoCapitalize="words"
            />
            
            {/* Gender & DOB Row Layout */}
            <View className="flex-row justify-between mb-5">
              <View className="flex-1 mr-2">
                <InputField 
                  label="Gender"
                  placeholder="Select Gender" 
                  value={getGenderLabel()} 
                  onPress={() => setShowGenderModal(true)}
                  containerStyle=""
                />
              </View>

              <View className="flex-1 ml-2">
                <InputField 
                  label="Date of Birth"
                  placeholder="Select DOB" 
                  value={hasSelectedDate ? dob.toLocaleDateString('en-GB') : ''} 
                  onPress={handleOpenDatePicker}
                  containerStyle=""
                />
              </View>
            </View>

            {/* Phone Number Layout */}
            <View className="mb-8">
              <Text className="text-[16px] font-medium text-gray-900 mb-2">Phone Number</Text>
              <View className="flex-row gap-3">
                  <TouchableOpacity 
                    onPress={() => setShowCountryModal(true)}
                    className="w-[90px] bg-[#FAFAFA] px-2 py-4 rounded-2xl border border-gray-100 flex-row items-center justify-center h-[56px]"
                  >
                    <Text className="text-[18px] mr-1.5">{selectedCountry.flag}</Text>
                    <Text className="font-regular text-gray-800 text-[15px]">{selectedCountry.dial_code}</Text>
                  </TouchableOpacity>
                  <View className="flex-1">
                    <View className="flex-row items-center bg-[#FAFAFA] px-5 py-4 rounded-2xl border border-gray-100 h-[56px]">
                      <TextInput 
                        placeholder="Phone Number" 
                        keyboardType="phone-pad"
                        style={{fontFamily: "Urbanist"}}
                        value={phone}
                        onChangeText={setPhone}
                        className="flex-1 text-[16px] text-gray-800 p-0 m-0 leading-tight"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  </View>
              </View>
            </View>
            
            {/* Save Button */}
            <TouchableOpacity 
              className={`w-full h-[56px] rounded-full flex-row justify-center items-center mt-4 mb-10 ${isLoading || isImageUploading ? 'bg-orange-300' : 'bg-[#E89B5A]'}`}
              onPress={handleSave}
              disabled={isLoading || isImageUploading} 
            >
              {isLoading && <ActivityIndicator color="white" className="mr-2" />}
              <Text className="text-center text-white font-bold text-[18px]">
                {isLoading ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>

          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>

      {/* ================= MODALS & PICKERS (Copy y hệt từ fill-profile) ================= */}
      {Platform.OS === 'ios' ? (
        <Modal visible={showPicker} transparent animationType="fade">
          <TouchableWithoutFeedback onPress={() => setShowPicker(false)}>
            <View className="flex-1 bg-black/40 justify-center px-8">
              <TouchableWithoutFeedback>
                <View className="bg-white rounded-3xl overflow-hidden shadow-2xl">
                  <View className="bg-gray-50 py-4 px-6 flex-row justify-between items-center border-b border-gray-100">
                    <TouchableOpacity onPress={() => setShowPicker(false)}>
                      <Text className="text-gray-500 font-medium text-[16px]">Cancel</Text>
                    </TouchableOpacity>
                    <Text className="font-bold text-gray-900 text-[18px]">Select Date</Text>
                    <TouchableOpacity onPress={() => setShowPicker(false)}>
                      <Text className="text-[#F97316] font-bold text-[16px]">Done</Text>
                    </TouchableOpacity>
                  </View>
                  <View className="py-2 bg-white">
                    <DateTimePicker
                      value={dob}
                      mode="date"
                      display="spinner"
                      maximumDate={new Date()}
                      onChange={onDateChange}
                      textColor="black"
                    />
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      ) : (
        showPicker && (
          <DateTimePicker
            value={dob}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={onDateChange}
          />
        )
      )}

      {/* Gender Modal */}
      <Modal visible={showGenderModal} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowGenderModal(false)}>
          <View className="flex-1 bg-black/40 justify-center px-8">
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-3xl overflow-hidden shadow-2xl">
                <View className="bg-gray-50 py-5 items-center border-b border-gray-100">
                  <Text className="font-bold text-gray-900 text-[18px]">Select Gender</Text>
                </View>
                <FlatList
                  data={GENDER_OPTIONS}
                  keyExtractor={(item) => item.value}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      className="py-4 px-6 border-b border-gray-50 active:bg-orange-50"
                      onPress={() => {
                        setGender(item.value);
                        setShowGenderModal(false);
                      }}
                    >
                      <Text className={`text-center text-[16px] ${gender === item.value ? 'text-[#F97316] font-bold' : 'text-gray-700'}`}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Country Code Modal */}
      <Modal visible={showCountryModal} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowCountryModal(false)}>
          <View className="flex-1 bg-black/40 justify-center px-8">
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-3xl overflow-hidden shadow-2xl max-h-[50%]">
                <View className="bg-gray-50 py-5 items-center border-b border-gray-100">
                  <Text className="font-bold text-gray-900 text-[18px]">Select Country</Text>
                </View>
                <FlatList
                  data={COUNTRY_CODES}
                  keyExtractor={(item) => item.code}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      className="py-4 px-6 border-b border-gray-50 flex-row items-center active:bg-orange-50"
                      onPress={() => {
                        setSelectedCountry(item);
                        setShowCountryModal(false);
                      }}
                    >
                      <Text className="text-[24px] mr-4">{item.flag}</Text>
                      <Text className="flex-1 text-[16px] text-gray-800">{item.name}</Text>
                      <Text className="font-bold text-gray-800 text-[16px]">{item.dial_code}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </SafeAreaView>
  );
}