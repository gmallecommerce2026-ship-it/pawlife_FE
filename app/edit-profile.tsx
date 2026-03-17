// app/edit-profile.tsx
import { Text } from '@/components/AppText';
import { AntDesign, Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';

// IMPORT CONTEXT VÀ HOOK CỦA BẠN
import { AuthContext } from '../contexts/AuthContext';
import { useImageUpload } from '../hooks/useImageUpload';

// --- DANH SÁCH QUỐC GIA & GIỚI TÍNH ---
const COUNTRY_CODES = [
  { code: 'VN', dial_code: '+84', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'US', dial_code: '+1', name: 'United States', flag: '🇺🇸' },
  { code: 'UK', dial_code: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'JP', dial_code: '+81', name: 'Japan', flag: '🇯🇵' },
];

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];

// --- REUSABLE INPUT COMPONENT ---
const InputField = ({ 
  value, 
  placeholder, 
  icon, 
  isDropdown = false,
  isDate = false,
  onChangeText,
  keyboardType = 'default',
  onPress
}: { 
  value?: string, 
  placeholder?: string, 
  icon?: React.ReactNode, 
  isDropdown?: boolean,
  isDate?: boolean,
  onChangeText?: (text: string) => void,
  keyboardType?: any,
  onPress?: () => void
}) => (
  <TouchableOpacity 
    activeOpacity={isDropdown || isDate || onPress ? 0.7 : 1}
    onPress={onPress}
    className="flex-row items-center bg-gray-50 rounded-2xl px-4 py-4 mb-5 border border-transparent focus:border-orange-200"
  >
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9CA3AF"
      keyboardType={keyboardType}
      className="flex-1 text-base font-semibold text-gray-900"
      editable={!isDropdown && !isDate && !onPress} 
      pointerEvents={(isDropdown || isDate || onPress) ? "none" : "auto"}
    />
    {icon && (
      <View className="ml-2">
          {icon}
      </View>
    )}
    {isDropdown && !icon && (
       <Feather name="chevron-down" size={20} color="#6B7280" />
    )}
  </TouchableOpacity>
);

export default function EditProfileScreen() {
  const router = useRouter();
  
  // --- LẤY DỮ LIỆU TỪ GLOBAL STATE ---
  const { user, updateUser } = useContext(AuthContext);
  const { pickAndUploadImage, isUploading } = useImageUpload();

  // --- STATE DỮ LIỆU FORM ---
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [phoneOnly, setPhoneOnly] = useState(''); 
  const [isSaving, setIsSaving] = useState(false);

  // States cho DatePicker (Ngày sinh)
  const [dob, setDob] = useState(new Date());
  const [hasSelectedDate, setHasSelectedDate] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  // States cho Gender
  const [gender, setGender] = useState('');
  const [showGenderModal, setShowGenderModal] = useState(false);

  // States cho Country Code
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [showCountryModal, setShowCountryModal] = useState(false);

  // --- ĐỒNG BỘ DỮ LIỆU KHI MỞ MÀN HÌNH ---
  useEffect(() => {
    if (user) {
      setNickname(user.name || '');
      setEmail(user.email || '');
      
      // Xử lý an toàn cho phone (Khắc phục lỗi TS18048)
      const currentPhone = user.phone;
      if (currentPhone) {
        const matchedCountry = COUNTRY_CODES.find(c => currentPhone.startsWith(c.dial_code));
        if (matchedCountry) {
          setSelectedCountry(matchedCountry);
          setPhoneOnly(currentPhone.substring(matchedCountry.dial_code.length));
        } else {
          setPhoneOnly(currentPhone);
        }
      }

      // Khắc phục lỗi báo thiếu type dob, gender (Sau khi đã update interface ở Bước 1)
      if (user.dob) {
        setDob(new Date(user.dob));
        setHasSelectedDate(true);
      }

      if (user.gender) {
        setGender(user.gender);
      }
    }
  }, [user]);

  // --- HANDLERS CHO CÁC MODALS & PICKERS ---
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

  // --- XỬ LÝ UPLOAD ẢNH ĐẠI DIỆN ---
  const handleUpdateAvatar = async () => {
    const imageUrl = await pickAndUploadImage({ folder: 'avatars', aspect: [1, 1] });
    
    if (imageUrl) {
      try {
        await updateUser({ avatarUrl: imageUrl });
        Alert.alert('Thành công', 'Đã cập nhật ảnh đại diện!');
      } catch (error) {
        Alert.alert('Lỗi', 'Không thể lưu ảnh đại diện vào hệ thống.');
      }
    }
  };

  // --- XỬ LÝ LƯU THÔNG TIN PROFILE ---
  const handleSaveProfile = async () => {
    if (!nickname.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên/nickname của bạn');
      return;
    }

    try {
      setIsSaving(true);
      
      // Ghép mã vùng và số điện thoại lại
      const formattedPhone = phoneOnly.startsWith('0') ? phoneOnly.substring(1) : phoneOnly;
      const fullPhone = `${selectedCountry.dial_code}${formattedPhone}`;

      await updateUser({ 
          name: nickname,
          phone: fullPhone,
          dob: hasSelectedDate ? dob.toISOString() : undefined,
          gender: gender || undefined
      } as any);

      Alert.alert('Thành công', 'Thông tin của bạn đã được cập nhật!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
      
    } catch (error) {
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi lưu thông tin. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        
        {/* --- HEADER --- */}
        <View className="flex-row items-center px-4 py-2 mb-4 relative z-10">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2" disabled={isSaving}>
            <AntDesign name="left" size={24} color="#1F2937" />
          </TouchableOpacity>
          <View className="absolute left-0 right-0 items-center pointer-events-none">
            <Text className="text-xl font-bold text-gray-900">Edit Profile</Text>
          </View>
        </View>

        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            className="flex-1"
        >
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
            
            {/* --- AVATAR UPLOAD SECTION --- */}
            <View className="items-center mt-2 mb-8">
              <View className="relative">
                <Image
                  source={{ uri: user?.avatarUrl || 'https://i.pravatar.cc/150?img=32' }}
                  className="w-32 h-32 rounded-full bg-gray-200"
                  resizeMode="cover"
                />

                {isUploading && (
                  <View className="absolute inset-0 bg-black/40 rounded-full items-center justify-center">
                    <ActivityIndicator size="large" color="#ffffff" />
                  </View>
                )}
                
                <TouchableOpacity 
                    onPress={handleUpdateAvatar}
                    disabled={isUploading || isSaving}
                    activeOpacity={0.8}
                    className="absolute bottom-0 right-1 bg-[#F97316] p-2 rounded-xl border-[3px] border-white items-center justify-center"
                >
                    <Ionicons name="camera-outline" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            {/* --- FORM FIELDS --- */}
            <View className="px-6">
                
                {/* 1. Nickname */}
                <InputField 
                    placeholder="Nickname / Full Name" 
                    value={nickname}
                    onChangeText={setNickname}
                />

                {/* 2. Gender (Dropdown) */}
                <InputField 
                    placeholder="Select Gender"
                    value={gender}
                    isDropdown={true}
                    onPress={() => setShowGenderModal(true)}
                />

                {/* 3. Date of Birth */}
                <InputField 
                    placeholder="Date of Birth"
                    value={hasSelectedDate ? dob.toLocaleDateString('en-GB') : ''}
                    isDate={true}
                    icon={<Feather name="calendar" size={20} color="#6B7280" />}
                    onPress={handleOpenDatePicker}
                />

                {/* 4. Email (Disabled) */}
                <InputField 
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    icon={<MaterialCommunityIcons name="email-outline" size={20} color="#6B7280" />}
                    // Email thường không cho đổi trực tiếp tại đây, có thể set readonly bằng cách truyền onPress trống hoặc chặn
                />

                {/* 5. Phone Number (Custom Layout) */}
                <View className="flex-row gap-3 mb-5">
                    {/* Country Code Selector */}
                    <TouchableOpacity 
                      onPress={() => setShowCountryModal(true)}
                      className="w-[30%] bg-gray-50 px-2 py-4 rounded-2xl border border-transparent flex-row items-center justify-center"
                    >
                        <Text className="text-lg mr-1">{selectedCountry.flag}</Text>
                        <Text className="font-bold text-gray-700 text-base">{selectedCountry.dial_code}</Text>
                        <Feather name="chevron-down" size={14} color="#6B7280" className="ml-1" />
                    </TouchableOpacity>

                    {/* Phone Input */}
                    <View className="flex-1">
                      <View className="flex-row items-center bg-gray-50 px-4 py-4 rounded-2xl border border-transparent focus:border-orange-200">
                          <TextInput 
                              value={phoneOnly}
                              onChangeText={setPhoneOnly}
                              className="flex-1 text-base font-semibold text-gray-900"
                              keyboardType="phone-pad"
                              placeholder="Phone Number"
                          />
                      </View>
                    </View>
                </View>

            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* --- BOTTOM BUTTON --- */}
        <View className="absolute bottom-0 left-0 right-0 px-6 py-4 bg-white border-t border-gray-50">
            <TouchableOpacity 
                className={`w-full py-4 rounded-full shadow-lg items-center flex-row justify-center ${isSaving ? 'bg-orange-300 shadow-transparent' : 'bg-[#F97316] shadow-orange-200'}`}
                onPress={handleSaveProfile}
                disabled={isSaving || isUploading}
            >
                {isSaving && <ActivityIndicator color="white" className="mr-2" />}
                <Text className="text-white font-bold text-lg">{isSaving ? 'Đang lưu...' : 'Update'}</Text>
            </TouchableOpacity>
        </View>

      </SafeAreaView>

      {/* ================= MODALS & PICKERS ================= */}

      {/* 1. DatePicker Modal */}
      {Platform.OS === 'ios' ? (
        <Modal visible={showPicker} transparent animationType="slide">
          <View className="flex-1 justify-end bg-black/40">
            <View className="bg-white rounded-t-3xl p-4 pb-8">
              <View className="flex-row justify-between items-center mb-4 border-b border-gray-100 pb-2">
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text className="text-gray-500 font-medium text-lg px-2">Cancel</Text>
                </TouchableOpacity>
                <Text className="font-bold text-gray-800 text-lg">Select Date</Text>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text className="text-[#F97316] font-bold text-lg px-2">Done</Text>
                </TouchableOpacity>
              </View>
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

      {/* 2. Modal chọn Giới tính */}
      <Modal visible={showGenderModal} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowGenderModal(false)}>
          <View className="flex-1 bg-black/40 justify-center px-8">
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-3xl overflow-hidden shadow-2xl">
                <View className="bg-gray-50 py-4 items-center border-b border-gray-100">
                  <Text className="font-bold text-gray-800 text-lg">Select Gender</Text>
                </View>
                <FlatList
                  data={GENDER_OPTIONS}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      className="py-4 px-6 border-b border-gray-50 active:bg-orange-50"
                      onPress={() => {
                        setGender(item);
                        setShowGenderModal(false);
                      }}
                    >
                      <Text className={`text-center text-base ${gender === item ? 'text-[#F97316] font-bold' : 'text-gray-700'}`}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* 3. Modal chọn Mã quốc gia */}
      <Modal visible={showCountryModal} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowCountryModal(false)}>
          <View className="flex-1 bg-black/40 justify-center px-8">
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-3xl overflow-hidden shadow-2xl max-h-[50%]">
                <View className="bg-gray-50 py-4 items-center border-b border-gray-100">
                  <Text className="font-bold text-gray-800 text-lg">Select Country</Text>
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
                      <Text className="text-2xl mr-4">{item.flag}</Text>
                      <Text className="flex-1 text-base text-gray-700">{item.name}</Text>
                      <Text className="font-bold text-gray-700">{item.dial_code}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}