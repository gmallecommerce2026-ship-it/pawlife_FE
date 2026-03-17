// app/fill-profile.tsx
import { Text } from '@/components/AppText';
import { AuthContext } from '@/contexts/AuthContext';
import { useImageUpload } from '@/hooks/useImageUpload'; // Đảm bảo đúng đường dẫn hook của bạn
import DateTimePicker from '@react-native-community/datetimepicker';
import { Href, useRouter } from 'expo-router';
import { Calendar, Camera, CheckCircle, ChevronDown, ChevronLeft, Lock, Mail, User } from 'lucide-react-native';
import React, { useContext, useState } from 'react';
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
  View,
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
  // Thêm các quốc gia khác nếu cần...
];

const InputField = ({ 
  placeholder, icon, isDropdown = false, value, onChangeText, 
  secureTextEntry, autoCapitalize = 'none', keyboardType = 'default',
  error, onPress
}: any) => (
  <View className="mb-4">
    <TouchableOpacity 
      activeOpacity={isDropdown || onPress ? 0.7 : 1} 
      onPress={onPress}
      className={`flex-row items-center bg-gray-50 px-4 py-4 rounded-2xl border ${error ? 'border-red-500' : 'border-gray-100'}`}
    >
      <TextInput 
        placeholder={placeholder} 
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        editable={!isDropdown && !onPress}
        pointerEvents={isDropdown || onPress ? "none" : "auto"}
        className="flex-1 text-base text-gray-700 h-6" 
        placeholderTextColor="#9CA3AF"
      />
      {icon && <View className="ml-2">{icon}</View>}
      {isDropdown && <ChevronDown size={20} color="#9CA3AF" className="ml-2" />}
    </TouchableOpacity>
    {error && <Text className="text-red-500 text-xs mt-1 ml-2">{error}</Text>}
  </View>
);

// ==========================================
// 2. MAIN SCREEN
// ==========================================
export default function FillProfileScreen() {
  const router = useRouter();
  
  // SỬ DỤNG CONTEXT & HOOK
  const { register, requestOtp } = useContext(AuthContext);
  const { pickAndUploadImage, isUploading: isImageUploading, uploadError } = useImageUpload();
  
  // --- FORM STATES ---
  const [avatar, setAvatar] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // OTP
  const [otp, setOtp] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);

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

  // BƯỚC 1: XÁC THỰC FORM VÀ GỬI OTP
  const handleRegister = async () => {
    if (!validateForm()) return;

    try {
      setIsLoading(true);
      
      // Gọi hàm requestOtp từ AuthContext thay vì axios thuần
      await requestOtp({
        email: email,
        type: 'SIGNUP' as any
      });

      setShowOtpModal(true);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to send OTP email. Please try again.";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // BƯỚC 2: NHẬP OTP VÀ ĐĂNG KÝ
  const submitRegistration = async () => {
    if (!otp || otp.length !== 6) {
      setErrors({ ...errors, otp: 'Please enter a 6-digit OTP' });
      return;
    }

    try {
      setIsLoading(true);
      
      // Ghép mã quốc gia với số điện thoại
      const formattedPhone = phone.startsWith('0') ? phone.substring(1) : phone;
      const fullPhone = `${selectedCountry.dial_code}${formattedPhone}`;

      // Gọi API đăng ký qua AuthContext
      await register({ 
        email, 
        password, 
        name, 
        phone: fullPhone, 
        gender, 
        dob: dob.toISOString(), 
        avatarUrl: avatar || undefined, // Nếu chưa upload, không gửi string rỗng
        otp 
      });

      setShowOtpModal(false);
      setShowSuccessModal(true);
      
      // Tự động chuyển trang sau 1.5s
      setTimeout(() => {
        setShowSuccessModal(false);
        setTimeout(() => {
          router.replace('/sign-in' as Href); 
        }, 350); 
      }, 1500);

    } catch (error: any) {
      Alert.alert("Registration Failed", error.message || "Invalid or expired OTP!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center px-4 py-2 mb-2">
        <TouchableOpacity onPress={() => router.back()} disabled={isLoading} className="p-2 -ml-2">
          <ChevronLeft size={28} color="black" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-xl font-bold mr-8">Register</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          
          <View className="items-center mb-8 mt-4">
            <TouchableOpacity 
              onPress={handlePickImage} 
              activeOpacity={0.8} 
              className="relative"
              disabled={isImageUploading || isLoading} 
            >
              <View className="w-28 h-28 bg-gray-100 rounded-full items-center justify-center border-2 border-dashed border-gray-300 overflow-hidden relative">
                 {avatar ? (
                   <Image source={{ uri: avatar }} className="w-full h-full" resizeMode="cover" />
                 ) : (
                   <User size={40} color="#9CA3AF" />
                 )}

                 {/* HIỆU ỨNG LOADING MỜ KHI ĐANG UPLOAD ẢNH LÊN R2 */}
                 {isImageUploading && (
                   <View className="absolute inset-0 bg-black/40 items-center justify-center">
                     <ActivityIndicator color="#ffffff" size="large" />
                   </View>
                 )}
              </View>

              {!isImageUploading && (
                <View className="absolute bottom-0 right-0 bg-[#F97316] p-2.5 rounded-full border-4 border-white shadow-sm">
                  <Camera size={18} color="white" />
                </View>
              )}
            </TouchableOpacity>
            
            {uploadError && <Text className="text-red-500 text-xs mt-2 text-center">{uploadError}</Text>}
            {errors.form && <Text className="text-red-500 font-medium mt-4 text-center">{errors.form}</Text>}
          </View>

          <InputField 
            placeholder="Full Name / Nickname" 
            value={name} 
            onChangeText={(text: string) => { setName(text); setErrors({...errors, name: ''}) }} 
            autoCapitalize="words"
            error={errors.name}
          />
          
          <InputField 
            placeholder="Gender" 
            value={gender} 
            isDropdown={true} 
            onPress={() => setShowGenderModal(true)}
            error={errors.gender}
          />

          <InputField 
            placeholder="Date of Birth (DD/MM/YYYY)" 
            value={hasSelectedDate ? dob.toLocaleDateString('en-GB') : ''} 
            icon={<Calendar size={20} color="#9CA3AF" />} 
            onPress={handleOpenDatePicker}
            error={errors.dob}
          />

          <InputField 
            placeholder="Email" 
            value={email} 
            onChangeText={(text: string) => { setEmail(text); setErrors({...errors, email: ''}) }}
            icon={<Mail size={20} color="#9CA3AF" />} 
            keyboardType="email-address"
            error={errors.email}
          />

          <InputField 
            placeholder="Password" 
            value={password} 
            onChangeText={(text: string) => { setPassword(text); setErrors({...errors, password: ''}) }}
            secureTextEntry={true}
            icon={<Lock size={20} color="#9CA3AF" />} 
            error={errors.password}
          />
          
          <View className="mb-6">
            <View className="flex-row gap-3">
                <TouchableOpacity 
                  onPress={() => setShowCountryModal(true)}
                  className="w-[30%] bg-gray-50 px-2 py-4 rounded-2xl border border-gray-100 flex-row items-center justify-center"
                >
                  <Text className="text-lg mr-1">{selectedCountry.flag}</Text>
                  <Text className="font-bold text-gray-700 text-base">{selectedCountry.dial_code}</Text>
                  <ChevronDown size={14} color="#9CA3AF" />
                </TouchableOpacity>
                <View className="flex-1">
                  <View className={`flex-row items-center bg-gray-50 px-4 py-4 rounded-2xl border ${errors.phone ? 'border-red-500' : 'border-gray-100'}`}>
                    <TextInput 
                      placeholder="Phone number..." 
                      keyboardType="phone-pad"
                      value={phone}
                      onChangeText={(text) => { setPhone(text); setErrors({...errors, phone: ''}) }}
                      className="flex-1 text-base text-gray-700 h-6"
                    />
                  </View>
                </View>
            </View>
            {errors.phone && <Text className="text-red-500 text-xs mt-1 ml-2">{errors.phone}</Text>}
          </View>

          <TouchableOpacity className="items-center mb-8" onPress={() => router.replace('/sign-in')}>
              <Text className="text-gray-500 font-medium">Already have an account? <Text className="text-[#F97316] font-bold underline">Log in now</Text></Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            className={`w-full py-4 rounded-full flex-row justify-center items-center ${(isLoading || isImageUploading) ? 'bg-orange-300' : 'bg-[#F97316]'}`}
            onPress={handleRegister}
            disabled={isLoading || isImageUploading} 
          >
            {isLoading && <ActivityIndicator color="white" className="mr-2" />}
            <Text className="text-center text-white font-bold text-lg">
              {isLoading ? 'Processing...' : 'Sign Up'}
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ================= MODALS & PICKERS ================= */}

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

      {/* Modal chọn Giới tính */}
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
                        setErrors({...errors, gender: ''});
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

      {/* BỔ SUNG: Modal chọn Mã quốc gia */}
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

      {/* Modal đăng ký thành công */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/50 px-6">
          <View className="bg-white rounded-3xl p-8 items-center w-full shadow-2xl">
            <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-6">
              <CheckCircle size={40} color="#22C55E" />
            </View>
            <Text className="text-2xl font-bold text-gray-900 mb-2">Success!</Text>
            <Text className="text-gray-500 text-center text-base">
              Your account has been created successfully. Redirecting to login page...
            </Text>
            <ActivityIndicator size="large" color="#ffa053" className="mt-6" />
          </View>
        </View>
      </Modal>

      {/* Modal xác minh OTP */}
      <Modal visible={showOtpModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-3xl p-6 shadow-2xl pb-10">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-xl font-bold text-gray-900">Email Verification</Text>
                <TouchableOpacity onPress={() => setShowOtpModal(false)} disabled={isLoading}>
                  <Text className="text-gray-500 text-base">Close</Text>
                </TouchableOpacity>
              </View>
              
              <Text className="text-gray-500 mb-4 text-center">
                A 6-digit verification code has been sent to <Text className="font-bold text-[#F97316]">{email}</Text>
              </Text>

              <TextInput
                placeholder="Enter 6 digits"
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={(text) => { setOtp(text); setErrors({...errors, otp: ''}) }}
                className={`bg-gray-50 px-4 py-4 rounded-2xl border text-center text-2xl tracking-[10px] font-bold ${errors.otp ? 'border-red-500' : 'border-gray-100'}`}
              />
              {errors.otp && <Text className="text-red-500 text-sm mt-2 text-center">{errors.otp}</Text>}

              <TouchableOpacity 
                className={`w-full py-4 rounded-full flex-row justify-center items-center mt-6 ${isLoading ? 'bg-orange-300' : 'bg-[#F97316]'}`}
                onPress={submitRegistration}
                disabled={isLoading}
              >
                {isLoading && <ActivityIndicator color="white" className="mr-2" />}
                <Text className="text-center text-white font-bold text-lg">
                  {isLoading ? 'Verifying...' : 'Verify & Sign Up'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}