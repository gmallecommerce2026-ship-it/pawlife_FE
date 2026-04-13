// app/fill-profile.tsx
import { Text } from '@/components/AppText';
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
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ==========================================
// 1. COMPONENT INPUT & DATA
// ==========================================
const COUNTRY_CODES = [
  { code: 'VN', dial_code: '+84', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'US', dial_code: '+1', name: 'United States', flag: '🇺🇸' },
  { code: 'UK', dial_code: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'JP', dial_code: '+81', name: 'Japan', flag: '🇯🇵' },
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
export default function FillProfileScreen() {
  const router = useRouter();
  
  const { requestOtp } = useContext(AuthContext);
  const { pickAndUploadImage, isUploading: isImageUploading, uploadError } = useImageUpload();
  
  // --- FORM STATES ---
  const [avatar, setAvatar] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Gender
  const [gender, setGender] = useState('');
  const [showGenderModal, setShowGenderModal] = useState(false);
  const GENDER_OPTIONS = ['Male', 'Female', 'Other'];

  // DOB
  const [dob, setDob] = useState(new Date()); 
  const [hasSelectedDate, setHasSelectedDate] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  // Country Code
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [showCountryModal, setShowCountryModal] = useState(false);

  // Status
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // --- HANDLERS ---
  const handleOpenDatePicker = () => setShowPicker(true);

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    
    if (event.type === 'set' && selectedDate) {
      setDob(selectedDate);
      setHasSelectedDate(true);
      setErrors({ ...errors, dob: '' });
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

  const validateForm = () => {
    let newErrors: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^(0?)(3|5|7|8|9)[0-9]{8}$/;

    if (!name.trim()) newErrors.name = 'Please enter your full name/nickname.';
    if (!gender) newErrors.gender = 'Please select your gender.';
    if (!hasSelectedDate) newErrors.dob = 'Please select your date of birth.';
    
    if (!email.trim()) {
      newErrors.email = 'Please enter your email.';
    } else if (!emailRegex.test(email)) {
      newErrors.email = 'Invalid email format.';
    }

    if (!password) {
      newErrors.password = 'Please enter a password.';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }

    if (!phone.trim()) {
      newErrors.phone = 'Please enter your phone number.';
    } else if (!phoneRegex.test(phone)) {
      newErrors.phone = 'Invalid phone number format.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    try {
      setIsLoading(true);
      await requestOtp({
        email: email,
        type: 'SIGNUP' as any
      });
      
      const formattedPhone = phone.startsWith('0') ? phone.substring(1) : phone;
      const fullPhone = `${selectedCountry.dial_code}${formattedPhone}`;

      // Chuyển hướng sang màn hình verify OTP và truyền dữ liệu đăng ký qua params
      router.push({
        pathname: '/verify-otp',
        params: {
          email,
          password,
          name,
          phone: fullPhone,
          gender,
          dob: dob.toISOString(),
          avatarUrl: avatar || ''
        }
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to send OTP email. Please try again.";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
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
            
            <View className="items-center mb-6 mt-2">
              <TouchableOpacity 
                onPress={handlePickImage} 
                activeOpacity={0.8} 
                className="relative w-[118px] h-[118px] bg-[#FAFAFA] rounded-full items-center justify-center overflow-hidden"
                disabled={isImageUploading || isLoading} 
              >
                   {avatar ? (
                     <Image source={{ uri: avatar }} className="w-full h-full rounded-full" resizeMode="cover" />
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
              {errors.form && <Text className="text-red-500 font-medium mt-3 text-center">{errors.form}</Text>}
            </View>

            <InputField 
              label="Your Name"
              placeholder="Enter your name" 
              value={name} 
              onChangeText={(text: string) => { setName(text); setErrors({...errors, name: ''}) }} 
              autoCapitalize="words"
              error={errors.name}
            />
            
            <View className="flex-row justify-between mb-5">
              <View className="flex-1 mr-2">
                <InputField 
                  label="Gender"
                  placeholder="Select Gender" 
                  value={gender} 
                  onPress={() => setShowGenderModal(true)}
                  error={errors.gender}
                  containerStyle=""
                />
              </View>

              <View className="flex-1 ml-2">
                <InputField 
                  label="Date of Birth"
                  placeholder="Select DOB" 
                  value={hasSelectedDate ? dob.toLocaleDateString('en-GB') : ''} 
                  onPress={handleOpenDatePicker}
                  error={errors.dob}
                  containerStyle=""
                />
              </View>
            </View>

            <InputField 
              label="Email"
              placeholder="Enter your email" 
              value={email} 
              onChangeText={(text: string) => { setEmail(text); setErrors({...errors, email: ''}) }}
              keyboardType="email-address"
              error={errors.email}
            />

            <InputField 
              label="Password"
              placeholder="Enter your password" 
              value={password} 
              onChangeText={(text: string) => { setPassword(text); setErrors({...errors, password: ''}) }}
              secureTextEntry={true}
              error={errors.password}
            />
            
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
                    <View className={`flex-row items-center bg-[#FAFAFA] px-5 py-4 rounded-2xl border ${errors.phone ? 'border-red-500' : 'border-gray-100'} h-[56px]`}>
                      <TextInput 
                        placeholder="Phone Number" 
                        keyboardType="phone-pad"
                        style={{fontFamily: "Urbanist"}}
                        value={phone}
                        onChangeText={(text) => { setPhone(text); setErrors({...errors, phone: ''}) }}
                        className="flex-1 text-[16px] text-gray-800 p-0 m-0 leading-tight"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  </View>
              </View>
              {errors.phone && <Text className="text-red-500 text-xs mt-1.5 ml-1">{errors.phone}</Text>}
            </View>
            
            <TouchableOpacity 
              className={`w-full h-[56px] rounded-full flex-row justify-center items-center mt-4 mb-10 ${isLoading || isImageUploading ? 'bg-orange-300' : 'bg-[#E89B5A]'}`}
              onPress={handleRegister}
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

      {/* ================= MODALS & PICKERS ================= */}
      {Platform.OS === 'ios' ? (
        <Modal visible={showPicker} transparent animationType="fade">
          {/* Giữ nguyên Picker cũ */}
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
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      className="py-4 px-6 border-b border-gray-50 active:bg-orange-50"
                      onPress={() => {
                        setGender(item);
                        setErrors({...errors, gender: ''});
                        setShowGenderModal(false);
                      }}
                    >
                      <Text className={`text-center text-[16px] ${gender === item ? 'text-[#F97316] font-bold' : 'text-gray-700'}`}>
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