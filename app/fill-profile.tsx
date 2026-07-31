// app/new-fill-profile.tsx
import { Text } from '@/components/AppText';
import { TextInput } from '@/components/AppTextInput';
import { AuthContext } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useImageUpload } from '@/hooks/useImageUpload';
import { Feather, Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Lock, Mail, User } from 'lucide-react-native';
import React, { useContext, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ==========================================
// 1. COMPONENT INPUT & DATA
// ==========================================
const COUNTRY_CODES = [
  { code: 'VN', dial_code: '+84', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'US', dial_code: '+1', name: 'United States', flag: '🇺🇸' },
  { code: 'UK', dial_code: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'JP', dial_code: '+81', name: 'Japan', flag: '🇯🇵' },
];

// 🌟 Label hỗ trợ hiển thị "(Không bắt buộc)" cạnh tiêu đề field — dùng cho Gender / DOB / Phone
const OptionalTitle = ({ text, isVi }: { text: string; isVi: boolean }) => (
  <Text className="text-[16px] mb-[12px] font-medium">
    {text} <Text className="text-gray-400 text-[13px] font-regular">{isVi ? '(Không bắt buộc)' : '(Optional)'}</Text>
  </Text>
);

const InputField = ({
  label, placeholder, icon, value, onChangeText,
  secureTextEntry, isPassword, autoCapitalize = 'none', keyboardType = 'default', error, maxLength, title, onPress, large, renderLabel,
}: any) => {
  const [isSecure, setIsSecure] = useState(isPassword ? true : secureTextEntry);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <TouchableOpacity className="mb-[18px]"
      disabled={!onPress}
      onPress={onPress}>
      {renderLabel ? renderLabel : (
        <>
          {title &&
            <Text className='text-[16px] mb-[12px] font-semibold'>{title}</Text>
          }
          {label &&
            <Text className='text-[16px] mb-[12px] font-medium'>{label}</Text>
          }
        </>
      )}
      <View
        className={`flex-row items-center ${large ? 'px-5 py-4 border-[1.5px] bg-[#FAFAFA]' : 'px-5 py-2 border bg-white'} rounded-[16px]  ${error ? 'border-red-500 bg-red-50' : isFocused ? 'border-[#E5E5E5]' : 'border-[#E5E5E5]'
          }`}
      >
        {icon && (
          <View className="mr-3">
            {React.cloneElement(icon, { color: error ? '#B8B8B8' : isFocused ? '#B8B8B8' : '#B8B8B8' })}
          </View>
        )}
        <TextInput
          placeholder={placeholder} value={value} onChangeText={onChangeText}
          secureTextEntry={isPassword ? isSecure : secureTextEntry}
          autoCapitalize={autoCapitalize} keyboardType={keyboardType} maxLength={maxLength}
          onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}
          pointerEvents={onPress ? "none" : "auto"}
          editable={!onPress}
          className="flex-1 text-[16px] text-[#B8B8B8] h-9 font-regular" placeholderTextColor="#9CA3AF"
          style={{ fontFamily: 'Urbanist' }}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setIsSecure(!isSecure)} className="ml-2 p-1" activeOpacity={0.7}>
            {isSecure ? <Image
              source={require('../assets/icon/eye-off.png')}
              style={{ width: 20, height: 20 }}
              resizeMode="cover"
            /> : <Image
              source={require('../assets/icon/eye-gray.png')}
              style={{ width: 20, height: 20 }}
              resizeMode="cover"
            />}
          </TouchableOpacity>
        )}
      </View>
      {error && <Text className="text-red-500 text-[13px] font-regular mt-1.5 ml-2">{error}</Text>}
    </TouchableOpacity>
  );
};

type SignupStep = 'ACCOUNT' | 'PROFILE' | 'SUCCESS';

// ==========================================
// 2. MAIN SCREEN
// ==========================================
export default function FillProfileScreen() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const isVi = language === 'vi';
  const { requestOtp } = useContext(AuthContext);
  const { pickAndUploadImage, isUploading: isImageUploading, uploadError } = useImageUpload();

  // --- UI STATE ---
  const [currentStep, setCurrentStep] = useState<SignupStep>('ACCOUNT');

  // --- FORM STATES ---
  const [avatar, setAvatar] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [isAgree, setIsAgree] = useState(false);

  // Gender — value stays in English (sent to backend), label is translated for display
  const [gender, setGender] = useState('');
  const [showGenderModal, setShowGenderModal] = useState(false);
  const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
  const GENDER_LABELS_VI: Record<string, string> = { Male: 'Nam', Female: 'Nữ', Other: 'Khác' };
  const getGenderLabel = (value: string) => (isVi ? GENDER_LABELS_VI[value] ?? value : value);

  // Country Code
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [showCountryModal, setShowCountryModal] = useState(false);

  // Status
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // --- NÂNG CẤP: DATE PICKER STATES & REFS ---
  const [dob, setDob] = useState(new Date());
  const [hasSelectedDate, setHasSelectedDate] = useState(false);
  const [showPicker, setShowPicker] = useState(false); // Dành cho Android

  const scrollViewRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const dobRef = useRef<View>(null);

  const [activePicker, setActivePicker] = useState<'dob' | null>(null);
  const [pickerLayout, setPickerLayout] = useState({ x: 0, y: 0, width: 340 });
  const pickerOpacity = useRef(new Animated.Value(0)).current;
  const pickerTranslateY = useRef(new Animated.Value(-8)).current;

  // --- HANDLERS CHO DROPDOWN KÍNH MỜ ---
  const openDropdownPicker = (type: 'dob') => {
    Keyboard.dismiss();

    if (contentRef.current && dobRef.current) {
      dobRef.current.measureLayout(
        contentRef.current,
        (left, top, width, height) => {
          // Tự động cuộn màn hình để tránh Picker bị che mất
          scrollViewRef.current?.scrollTo({ y: Math.max(0, top - 120), animated: true });

          setTimeout(() => {
            dobRef.current?.measureInWindow((x, windowY, w, h) => {
              const dropdownWidth = 340;
              const finalX = (SCREEN_WIDTH - dropdownWidth) / 2; // Căn giữa tuyệt đối

              setPickerLayout({ x: finalX, y: windowY + h + 8, width: dropdownWidth });
              setActivePicker(type);

              Animated.parallel([
                Animated.timing(pickerOpacity, { toValue: 1, duration: 200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                Animated.timing(pickerTranslateY, { toValue: 0, duration: 250, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true })
              ]).start();
            });
          }, 350);
        },
        () => console.log(isVi ? 'Lỗi không thể đo kích thước layout' : 'Failed to measure layout')
      );
    }
  };

  const closeDropdownPicker = () => {
    Animated.parallel([
      Animated.timing(pickerOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(pickerTranslateY, { toValue: -8, duration: 150, useNativeDriver: true })
    ]).start(() => setActivePicker(null));
  };

  // Android Native Date Change
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

  const handleAgree = async () => {
    setIsAgree(!isAgree);
  }

  // --- VALIDATION ---
  const validateAccountStep = () => {
    let newErrors: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      newErrors.email = isVi ? 'Vui lòng nhập email của bạn.' : 'Please enter your email.';
    } else if (!emailRegex.test(email)) {
      newErrors.email = isVi ? 'Định dạng email không hợp lệ.' : 'Invalid email format.';
    }

    if (!password) {
      newErrors.password = isVi ? 'Vui lòng nhập mật khẩu.' : 'Please enter a password.';
    } else if (password.length < 6) {
      newErrors.password = isVi ? 'Mật khẩu phải có ít nhất 6 ký tự.' : 'Password must be at least 6 characters.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = isVi ? 'Vui lòng xác nhận mật khẩu.' : 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = isVi ? 'Mật khẩu không khớp.' : 'Passwords do not match.';
    }

    if (!isAgree) {
      Alert.alert(
        isVi ? 'Yêu cầu' : 'Required',
        isVi ? 'Vui lòng đồng ý với Điều khoản & Điều kiện Bảo mật.' : 'Please agree to the Policy Terms & Privacy Conditions.'
      );
      return false;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ==========================================
  // 🌟 FIX 5.1.1(v): Gender / DOB / Phone không còn bắt buộc để hoàn tất đăng ký.
  // Chỉ giữ Tên (Name) là bắt buộc — Apple không liệt kê Tên trong danh sách reject.
  // Số điện thoại chỉ validate định dạng NẾU người dùng có nhập, không bắt buộc nhập.
  // ==========================================
  const validateProfileStep = () => {
    let newErrors: Record<string, string> = {};
    const phoneRegex = /^(0?)(3|5|7|8|9)[0-9]{8}$/;

    if (!name.trim()) newErrors.name = isVi ? 'Vui lòng nhập họ tên/biệt danh của bạn.' : 'Please enter your full name/nickname.';

    // Gender & DOB: không còn bắt buộc — bỏ qua validate required

    // Phone: không bắt buộc, nhưng nếu có nhập thì phải đúng định dạng
    if (phone.trim() && !phoneRegex.test(phone)) {
      newErrors.phone = isVi ? 'Định dạng số điện thoại không hợp lệ.' : 'Invalid phone number format.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // --- SUBMIT HANDLERS ---
  const handleNextToProfile = () => {
    if (validateAccountStep()) {
      setCurrentStep('PROFILE');
    }
  }

  const handleRegister = async () => {
    if (!validateProfileStep()) return;

    try {
      setIsLoading(true);
      await requestOtp({
        email: email,
        type: 'SIGNUP'
      });

      // Chỉ format & gửi số điện thoại nếu người dùng có nhập
      let fullPhone: string | undefined = undefined;
      if (phone.trim()) {
        const formattedPhone = phone.startsWith('0') ? phone.substring(1) : phone;
        fullPhone = `${selectedCountry.dial_code}${formattedPhone}`;
      }

      const DEFAULT_AVATAR_URL = 'https://pub-35c6d59c9e96467b9783df2a4e890a09.r2.dev/default-avatar.jpg';

      router.push({
        pathname: '/verify-otp',
        params: {
          email: email.trim(),
          password,
          name: name.trim(),
          // Chỉ đính kèm nếu có giá trị, không ép buộc gửi chuỗi rỗng
          ...(fullPhone ? { phone: fullPhone } : {}),
          ...(gender ? { gender } : {}),
          ...(hasSelectedDate ? { dob: dob.toISOString() } : {}),
          avatarUrl: avatar || DEFAULT_AVATAR_URL
        }
      });
    } catch (error: any) {
      let errorMessage = isVi ? "Không thể gửi mã OTP. Vui lòng thử lại sau." : "Cannot send OTP. Please try again later.";
      if (error?.message) {
        errorMessage = Array.isArray(error.message) ? error.message[0] : error.message;
      } else if (error?.statusCode === 429) {
        errorMessage = isVi ? "Bạn đã yêu cầu quá nhiều lần. Vui lòng đợi 1 phút." : "You have made too many requests. Please wait 1 minute.";
      }
      Alert.alert(isVi ? "Lỗi" : "Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // --- RENDERERS ---
  const renderSuccess = () => (
    <>
      <View className='flex-1 items-center justify-center mt-20'>
        <Image
          source={require('../assets/icon/set.png')}
          style={{ width: 105, height: 105 }}
          resizeMode="cover"
          className='mb-[38px]'
        />
        <Text className='text-[30px] font-semibold mb-[24px]'>
          {isVi ? "Bạn đã sẵn sàng!" : "You're All Set!"}
        </Text>
        <Text className='text-[16px] font-regular text-[#8E8E93] mb-[24px]'>
          {isVi ? "Hành trình cùng PawLife của bạn bắt đầu từ bây giờ." : "Your PawLife journey begins now."}
        </Text>
      </View>
    </>
  )

  const renderProfile = () => (
    <>
      <View className="items-center mb-[57px] mt-3">
        <TouchableOpacity
          onPress={handlePickImage}
          activeOpacity={0.8}
          className="relative w-[118px] h-[118px] bg-[#FAFAFA] rounded-full items-center justify-center overflow-hidden border border-[#E5E5E5]"
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
        label={isVi ? "Tên của bạn" : "Your Name"}
        placeholder={isVi ? "Nhập tên của bạn" : "Your Name"}
        value={name}
        onChangeText={(text: string) => { setName(text); setErrors({ ...errors, name: '' }) }}
        autoCapitalize="words"
        error={errors.name}
        large={false}
      />

      {/* 🌟 Gender & DOB — đã gắn nhãn "(Không bắt buộc)" */}
      <View className="flex-row justify-between">
        <View className="flex-1 mr-2">
          <InputField
            renderLabel={<OptionalTitle text={isVi ? "Giới tính" : "Gender"} isVi={isVi} />}
            placeholder={isVi ? "Chọn giới tính" : "Select Gender"}
            value={gender ? getGenderLabel(gender) : ''}
            onPress={() => setShowGenderModal(true)}
            error={errors.gender}
            containerStyle=""
            large={false}
          />
        </View>

        <View className="flex-1 ml-2" ref={dobRef} collapsable={false}>
          <InputField
            renderLabel={<OptionalTitle text={isVi ? "Ngày sinh" : "Date of Birth"} isVi={isVi} />}
            placeholder={isVi ? "Chọn ngày" : "Select DOB"}
            value={hasSelectedDate ? dob.toLocaleDateString('en-GB') : ''}
            onPress={() => Platform.OS === 'ios' ? openDropdownPicker('dob') : setShowPicker(true)}
            error={errors.dob}
            containerStyle=""
            large={false}
          />
        </View>
      </View>

      {/* 🌟 Phone Number — đã gắn nhãn "(Không bắt buộc)" */}
      <View className="mb-8">
        <OptionalTitle text={isVi ? "Số điện thoại" : "Phone Number"} isVi={isVi} />
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => setShowCountryModal(true)}
            className="w-[90px] bg-white px-2 py-4 rounded-2xl border border-gray-100 flex-row items-center justify-center h-[56px]"
          >
            <Text className="text-[18px] mr-1.5">{selectedCountry.flag}</Text>
            <Text className="font-regular text-gray-800 text-[15px]">{selectedCountry.dial_code}</Text>
          </TouchableOpacity>
          <View className="flex-1">
            <View className={`flex-row items-center bg-white px-5 py-4 rounded-2xl border ${errors.phone ? 'border-red-500' : 'border-gray-100'} h-[56px]`}>
              <TextInput
                placeholder={isVi ? "Số điện thoại" : "Phone Number"}
                keyboardType="phone-pad"
                style={{ fontFamily: "Urbanist" }}
                value={phone}
                onChangeText={(text) => { setPhone(text); setErrors({ ...errors, phone: '' }) }}
                className="flex-1 text-[16px] text-gray-800 p-0 m-0 leading-tight"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>
        </View>
        {errors.phone && <Text className="text-red-500 text-xs mt-1.5 ml-1">{errors.phone}</Text>}
      </View>
    </>
  )

  const renderSignUp = () => (
    <>
      <View className="mb-[35px] mt-3">
        <Text className="text-[30px] font-semibold text-black mb-[26px] tracking-[0.06px]">
          {isVi ? "Tham gia PawLife ngay hôm nay 🐾" : "Join PawLife Today 🐾"}
        </Text>
        <Text className="text-[#8E8E93] font-medium text-[16px] tracking-[0.06px]">
          {isVi ? "Một thế giới đầy những điều thú vị đang chờ bạn." : "A world of furry possibilities awaits you."}
        </Text>
      </View>

      <InputField
        placeholder="Email" value={email} onChangeText={(t: string) => { setEmail(t); setErrors({ ...errors, email: '' }) }}
        icon={<Mail size={22} />} keyboardType="email-address" error={errors.email} title={"Email"} large={true}
      />
      <InputField
        placeholder={isVi ? "Mật khẩu" : "Password"} value={password} onChangeText={(t: string) => { setPassword(t); setErrors({ ...errors, password: '' }) }}
        isPassword={true} icon={<Lock size={22} />} error={errors.password} title={isVi ? "Mật khẩu" : "Password"} large={true}
      />

      <InputField
        placeholder={isVi ? "Xác nhận mật khẩu của bạn" : "Confirm your password"}
        value={confirmPassword}
        onChangeText={(t: string) => {
          setConfirmPassword(t);
          setErrors({ ...errors, confirmPassword: '' })
        }}
        isPassword={true}
        icon={<Lock size={22} />}
        error={errors.confirmPassword}
        title={isVi ? "Xác nhận mật khẩu" : "Confirm Password"}
        large={true}
      />

      <TouchableOpacity className="flex-row items-center py-2" onPress={() => handleAgree()} activeOpacity={0.7}>
        <Ionicons
          name={isAgree ? "checkbox" : "square-outline"}
          size={22}
          color={isAgree ? "#E89B5A" : "#9CA3AF"}
        />
        <Text className="text-black font-medium ml-2 text-[14px] tracking-[0.06px]">
          {isVi ? "Tôi đồng ý với " : "I agree to "}
          <Text
            onPress={() => router.push('/terms-of-service')}
            className='text-[#E89B5A]'
          >
            {isVi ? "Điều khoản & Điều kiện Bảo mật" : "Policy Terms & Privacy Conditions"}
          </Text>
          .
        </Text>
      </TouchableOpacity>
    </>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        {currentStep !== 'SUCCESS' &&
          <View className="flex-row items-center px-4 py-3 relative mb-[20px] z-10">
            <TouchableOpacity
              onPress={() => {
                if (currentStep === 'PROFILE') {
                  setCurrentStep('ACCOUNT');
                } else {
                  router.back();
                }
              }}
              activeOpacity={0.7}
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 5,
                elevation: 3,
              }}
              className="w-10 h-10 rounded-full items-center justify-center"
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
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }}>
                <LinearGradient
                  colors={['rgba(221, 221, 221, 0.1)', 'rgba(247, 247, 247, 0.5)', '#FFFFFF']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  locations={[0, 0.3, 1]}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 9999 }}
                />
                <Feather name="chevron-left" size={20} color="#000000" />
              </View>
            </TouchableOpacity>
            {currentStep === "PROFILE" && <View
              className="absolute left-0 right-0 items-center justify-center"
              pointerEvents="none"
            >
              <Text className="text-[18px] font-semibold text-gray-900">
                {isVi ? "Hồ sơ của bạn" : "Your Profile"}
              </Text>
            </View>}
          </View>
        }

        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-[20px]"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View ref={contentRef} collapsable={false} style={{ flex: 1 }}>
            {currentStep === 'ACCOUNT' && renderSignUp()}
            {currentStep === 'PROFILE' && renderProfile()}
            {currentStep === 'SUCCESS' && renderSuccess()}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View className="mt-auto mx-[22px] py-4">
        {currentStep === 'ACCOUNT' &&
          <Text className='text-center text-[14px] font-regular mb-4'>
            {isVi ? "Bạn đã có tài khoản? " : "Already have an account? "}
            <Text onPress={() => router.push('/sign-in')} className='text-[#E89B5A]'>
              {isVi ? "Đăng nhập" : "Log in"}
            </Text>
          </Text>
        }

        {currentStep === "ACCOUNT" &&
          <TouchableOpacity
            className="w-full py-[21px] rounded-[100px] items-center bg-[#E89B5A]"
            onPress={handleNextToProfile} disabled={isLoading} activeOpacity={0.8}
            style={{ opacity: isLoading ? 0.7 : 1 }}
          >
            {isLoading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-[16px]">{isVi ? "Đăng ký" : "Sign up"}</Text>}
          </TouchableOpacity>
        }
        {currentStep === 'PROFILE' &&
          <TouchableOpacity
            className="w-full py-[21px] rounded-[100px] items-center bg-[#E89B5A]"
            onPress={handleRegister} disabled={isLoading || isImageUploading} activeOpacity={0.8}
            style={{ opacity: isLoading || isImageUploading ? 0.7 : 1 }}
          >
            {isLoading || isImageUploading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-[16px]">{isVi ? "Lưu" : "Save"}</Text>}
          </TouchableOpacity>
        }
        {currentStep === 'SUCCESS' &&
          <TouchableOpacity
            className="w-full py-[21px] rounded-[100px] items-center bg-[#E89B5A]"
            onPress={() => router.push('/')} disabled={isLoading} activeOpacity={0.8}
            style={{ opacity: isLoading ? 0.7 : 1 }}
          >
            <Text className="text-white font-bold text-[16px]">{isVi ? "Cùng PawLife nào!" : "Let's PawLife!"}</Text>
          </TouchableOpacity>
        }
      </View>

      {/* ================= MODALS & PICKERS ================= */}

      {/* ANDROID NATIVE DATE PICKER */}
      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={dob}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={onDateChange}
        />
      )}

      {/* --- KÍNH MỜ DROPDOWN FIX CHIỀU CAO VÀ MÀU CAM (IOS) --- */}
      {Platform.OS === 'ios' && activePicker === 'dob' && (
        <View className="absolute inset-0 z-[100]">
          <TouchableOpacity activeOpacity={1} className="absolute inset-0" onPress={closeDropdownPicker} />

          <Animated.View
            style={{
              position: 'absolute',
              top: pickerLayout.y,
              left: pickerLayout.x,
              width: pickerLayout.width,
              opacity: pickerOpacity,
              transform: [{ translateY: pickerTranslateY }],
              borderRadius: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.25,
              shadowRadius: 16,
              elevation: 10,
              overflow: 'hidden'
            }}
          >
            <BlurView tint="dark" intensity={65} style={{ position: 'absolute', inset: 0 }} />
            <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15, 15, 15, 0.45)' }} />

            <View className="flex-row justify-between items-center px-[16px] py-[12px] border-b border-white/10 relative z-10">
              <TouchableOpacity onPress={closeDropdownPicker}>
                <Text className="text-[16px] text-[#A1A1AA] font-medium">{isVi ? "Hủy" : "Cancel"}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={closeDropdownPicker}>
                <Text className="text-[16px] font-semibold text-[#E89B5A]">{isVi ? "Xong" : "Done"}</Text>
              </TouchableOpacity>
            </View>

            <View style={{ paddingTop: 4, paddingBottom: 4, paddingHorizontal: 10, alignItems: 'center' }} className="relative z-10">
              <DateTimePicker
                value={dob}
                mode="date"
                display="inline"
                themeVariant="dark"
                maximumDate={new Date()}
                locale={isVi ? 'vi-VN' : 'en-US'}
                style={{ width: 320, height: 315, alignSelf: 'center' }}
                accentColor="#E89B5A"
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setDob(selectedDate);
                    setHasSelectedDate(true);
                    setErrors({ ...errors, dob: '' });
                  }
                }}
              />
            </View>
          </Animated.View>
        </View>
      )}

      {/* Gender Modal */}
      <Modal visible={showGenderModal} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowGenderModal(false)}>
          <View className="flex-1 bg-black/40 justify-center px-8">
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-3xl overflow-hidden shadow-2xl">
                <View className="bg-gray-50 py-5 items-center border-b border-gray-100">
                  <Text className="font-bold text-gray-900 text-[18px]">{isVi ? "Chọn giới tính" : "Select Gender"}</Text>
                </View>
                <FlatList
                  data={GENDER_OPTIONS}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      className="py-4 px-6 border-b border-gray-50 active:bg-orange-50"
                      onPress={() => {
                        setGender(item);
                        setErrors({ ...errors, gender: '' });
                        setShowGenderModal(false);
                      }}
                    >
                      <Text className={`text-center text-[16px] ${gender === item ? 'text-[#F97316] font-bold' : 'text-gray-700'}`}>
                        {getGenderLabel(item)}
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
                  <Text className="font-bold text-gray-900 text-[18px]">{isVi ? "Chọn quốc gia" : "Select Country"}</Text>
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