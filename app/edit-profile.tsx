// app/edit-profile.tsx
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import React, { useContext, useEffect, useRef, useState } from 'react';
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
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// IMPORT CONTEXT AND HOOKS
import { Text } from '@/components/AppText';
import { useLanguage } from '@/contexts/LanguageContext';
import { disconnectSocket } from '@/utils/socket';
import { AuthContext } from '../contexts/AuthContext';
import { useImageUpload } from '../hooks/useImageUpload';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --- CONSTANTS ---
const COUNTRY_CODES = [
  { code: 'VN', dial_code: '+84', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'US', dial_code: '+1', name: 'United States', flag: '🇺🇸' },
  { code: 'UK', dial_code: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'JP', dial_code: '+81', name: 'Japan', flag: '🇯🇵' },
];

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];

// --- REUSABLE PROFILE ITEM COMPONENT ---
const ProfileItem = ({
  icon,
  label,
  value,
  onPressRow,
  onSave,
  isEditing = false,
  isLoading = false,
  editable = true,
  isInput = false,
  onChangeText,
  keyboardType = 'default',
  customRightView
}: any) => {
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (isEditing && isInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  return (
    <TouchableOpacity
      className={`flex-row items-center justify-between py-[6px] bg-white ${isEditing ? 'bg-[#FFF7ED]' : ''}`}
      onPress={onPressRow}
      disabled={!editable}
      activeOpacity={0.7}
    >
      <View className="flex-row items-center py-2">
        <View className="w-8 items-start justify-center">
          {icon}
        </View>
        <Text className="text-[16px] text-black font-regular">
          {label}
        </Text>
      </View>

      <View className="flex-row items-center flex-1 justify-end pl-4">
        {isEditing && customRightView ? (
          customRightView
        ) : isEditing && isInput ? (
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={onChangeText}
            keyboardType={keyboardType}
            className="text-[16px] text-[#111827] text-right p-0 flex-1 font-thin"
            style={{ fontFamily: 'Urbanist-Regular' }}
            placeholder={`Enter ${label.toLowerCase()}`}
            placeholderTextColor="#9CA3AF"
            returnKeyType="done"
            onSubmitEditing={onSave}
          />
        ) : (
          <Text
            className={`text-[16px] text-right shrink ${isEditing ? 'text-[#F97316] font-medium' : 'text-[#9CA3AF]'}`}
            numberOfLines={1}
          >
            {value || 'Not set'}
          </Text>
        )}

        {editable && (
          <TouchableOpacity
            className="ml-3"
            onPress={isEditing ? onSave : onPressRow}
            disabled={isLoading}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#F97316" />
            ) : (
              <Feather
                name={isEditing ? "check" : "chevron-right"}
                size={20}
                color={isEditing ? "#D1D5DB" : "#D1D5DB"}
              />
            )}
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default function EditProfileScreen() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { logout, user, updateUser } = useContext(AuthContext);
  const { pickAndUploadImage, isUploading } = useImageUpload();
  const isVi = language === 'vi';
  // --- FORM STATE ---
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [phoneOnly, setPhoneOnly] = useState('');

  const [editingField, setEditingField] = useState<string | null>(null);
  const [savingField, setSavingField] = useState<string | null>(null);

  // DatePicker State (Android)
  const [dob, setDob] = useState(new Date());
  const [hasSelectedDate, setHasSelectedDate] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  // Gender State
  const [gender, setGender] = useState('');
  const [showGenderModal, setShowGenderModal] = useState(false);

  // Country Code State
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [showCountryModal, setShowCountryModal] = useState(false);

  // --- NÂNG CẤP: DATE PICKER STATES & REFS (IOS) ---
  const scrollViewRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const dobRef = useRef<View>(null);

  const [activePicker, setActivePicker] = useState<'dob' | null>(null);
  const [pickerLayout, setPickerLayout] = useState({ x: 0, y: 0, width: 340 });
  const pickerOpacity = useRef(new Animated.Value(0)).current;
  const pickerTranslateY = useRef(new Animated.Value(-8)).current;

  useEffect(() => {
    if (user) {
      setNickname(user.name || '');
      setEmail(user.email || '');

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

      if (user.dob) {
        setDob(new Date(user.dob));
        setHasSelectedDate(true);
      }

      if (user.gender) {
        setGender(user.gender);
      }
    }
  }, [user]);

  // --- HANDLERS CHO DROPDOWN KÍNH MỜ ---
  const openDropdownPicker = (type: 'dob') => {
    Keyboard.dismiss();
    setEditingField('dob');

    if (contentRef.current && dobRef.current) {
      dobRef.current.measureLayout(
        contentRef.current,
        (left, top, width, height) => {
          // Tự động cuộn mượt mà để chừa không gian hiển thị Picker
          scrollViewRef.current?.scrollTo({ y: Math.max(0, top - 120), animated: true });

          setTimeout(() => {
            dobRef.current?.measureInWindow((x, windowY, w, h) => {
              const dropdownWidth = 340;
              const finalX = (SCREEN_WIDTH - dropdownWidth) / 2; // Căn giữa màn hình

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
    ]).start(() => {
      setActivePicker(null);
      setEditingField(null);
    });
  };

  const handleLogout = () => {
    Alert.alert(
      t('Log Out'),
      t('Are you sure you want to log out of this account?'),
      [
        { text: t('Cancel'), style: "cancel" },
        {
          text: t('Log Out'),
          style: "destructive",
          onPress: async () => {
            try {
              if (logout) await logout();

              disconnectSocket();

              router.replace('/');
            } catch (error) {
              Alert.alert(t('Error'), t('Unable to log out. Please try again!'));
            }
          }
        }
      ]
    );
  };

  const handleSaveField = async (field: string) => {
    if (field === 'name' && !nickname.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    try {
      setSavingField(field);
      let updatePayload: any = {};

      if (field === 'name') updatePayload.name = nickname;
      if (field === 'phone') {
        const formattedPhone = phoneOnly.startsWith('0') ? phoneOnly.substring(1) : phoneOnly;
        updatePayload.phone = `${selectedCountry.dial_code}${formattedPhone}`;
      }
      if (field === 'dob') updatePayload.dob = hasSelectedDate ? dob.toISOString() : undefined;
      if (field === 'gender') updatePayload.gender = gender || undefined;

      await updateUser(updatePayload);
      setEditingField(null);

    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSavingField(null);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (event.type === 'set' && selectedDate) {
      setDob(selectedDate);
      setHasSelectedDate(true);
      if (Platform.OS === 'android') {
        handleSaveField('dob');
      }
    } else if (event.type === 'dismissed') {
      setShowPicker(false);
      setEditingField(null);
    }
  };

  const handleUpdateAvatar = async () => {
    const imageUrl = await pickAndUploadImage({ folder: 'avatars', aspect: [1, 1] });
    if (imageUrl) {
      try {
        await updateUser({ avatarUrl: imageUrl });
      } catch (error) {
        Alert.alert('Error', 'Failed to update avatar.');
      }
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#ffffff]" edges={['top', 'bottom']}>
      {/* --- HEADER --- */}
      <View className="flex-row items-center justify-between px-4 py-4 bg-[#ffffff]">
        <TouchableOpacity onPress={() => router.back()} className="p-1 -ml-1">
          <Feather name="chevron-left" size={28} color="#111827" />
        </TouchableOpacity>
        <Text className="text-[20px] font-semibold text-[#000000]">Edit Profile</Text>
        <View className="w-[36px]" />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Mốc để tính toán tọa độ cuộn màn hình */}
          <View ref={contentRef} collapsable={false}>
            {/* --- AVATAR SECTION --- */}
            <View className="items-center my-8">
              <TouchableOpacity
                className="relative"
                onPress={handleUpdateAvatar}
                disabled={isUploading}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: user?.avatarUrl || 'https://i.pravatar.cc/150?img=32' }}
                  className="w-[106px] h-[106px] rounded-[50px] border border-[#F3F4F6] bg-[#E5E7EB]"
                  resizeMode="cover"
                />
                {isUploading && (
                  <View className="absolute inset-0 bg-black/50 rounded-[50px] items-center justify-center">
                    <ActivityIndicator size="large" color="#ffffff" />
                  </View>
                )}
              </TouchableOpacity>

              <Text className="mt-4 font-semibold text-gray-900 text-lg">
                {nickname || 'Not set'}
              </Text>

              {email ? (
                <Text className="mt-1 text-gray-500 text-sm tracking-[0.2px]">
                  {email}
                </Text>
              ) : null}
            </View>

            {/* --- FORM CARD LIST --- */}
            <View className="px-5">
              {/* NHÓM 1: THÔNG TIN CÁ NHÂN */}
              <View
                className="bg-[#FFFFFF] rounded-[20px] overflow-hidden border border-[#F3F4F6] px-[20px]"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <ProfileItem
                  icon={<Image
                    className=''
                    source={require('../assets/icon/user-edit.png')}
                    style={{ width: 17, height: 17 }}
                    resizeMode="cover"
                  />}
                  label="Name"
                  value={nickname}
                  isEditing={editingField === 'name'}
                  isLoading={savingField === 'name'}
                  onPressRow={() => setEditingField('name')}
                  onSave={() => handleSaveField('name')}
                  isInput={true}
                  onChangeText={setNickname}
                />
                <View className="h-[1px] bg-[#F3F4F6]" />

                <ProfileItem
                  icon={<Image
                    className=''
                    source={require('../assets/icon/phone-edit.png')}
                    style={{ width: 17, height: 17 }}
                    resizeMode="cover"
                  />}
                  label="Phone"
                  value={phoneOnly ? `${selectedCountry.dial_code} ${phoneOnly}` : ''}
                  isEditing={editingField === 'phone'}
                  isLoading={savingField === 'phone'}
                  onPressRow={() => setEditingField('phone')}
                  onSave={() => handleSaveField('phone')}
                  customRightView={
                    <View className="flex-row items-center flex-1 justify-end">
                      <TouchableOpacity onPress={() => setShowCountryModal(true)} className="flex-row items-center mr-3 bg-[#F3F4F6] px-[10px] py-[6px] rounded-lg">
                        <Text className="text-[18px]">{selectedCountry.flag}</Text>
                        <Feather name="chevron-down" size={14} color="#6B7280" style={{ marginLeft: 4 }} />
                      </TouchableOpacity>
                      <TextInput
                        value={phoneOnly}
                        onChangeText={setPhoneOnly}
                        keyboardType="phone-pad"
                        className="text-[16px] text-[#111827] text-right p-0 flex-1 font-medium"
                        placeholder="000 000 000"
                        placeholderTextColor="#9CA3AF"
                        autoFocus={true}
                        onSubmitEditing={() => handleSaveField('phone')}
                      />
                    </View>
                  }
                />
                <View className="h-[1px] bg-[#F3F4F6]" />

                {/* Bọc Ref vào ProfileItem của phần Ngày Sinh để đo tọa độ popup */}
                <View ref={dobRef} collapsable={false}>
                  <ProfileItem
                    icon={<Image
                      className=''
                      source={require('../assets/icon/birthday-edit.png')}
                      style={{ width: 17, height: 17 }}
                      resizeMode="cover"
                    />}
                    label={language === 'vi' ? "Ngày sinh" : "Birthday"}
                    value={hasSelectedDate
                      ? dob.toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                      : ''}
                    isEditing={editingField === 'dob'}
                    isLoading={savingField === 'dob'}
                    onPressRow={() => {
                      if (Platform.OS === 'ios') {
                        openDropdownPicker('dob');
                      } else {
                        setEditingField('dob');
                        setShowPicker(true);
                      }
                    }}
                    onSave={() => handleSaveField('dob')}
                  />
                </View>
                <View className="h-[1px] bg-[#F3F4F6]" />

                <ProfileItem
                  icon={<Image
                    className=''
                    source={require('../assets/icon/gender-edit.png')}
                    style={{ width: 17, height: 17 }}
                    resizeMode="cover"
                  />}
                  label="Gender"
                  value={gender != "UNKNOWN" ? gender : "Unknown"}
                  isEditing={editingField === 'gender'}
                  isLoading={savingField === 'gender'}
                  onPressRow={() => {
                    setEditingField('gender');
                    setShowGenderModal(true);
                  }}
                  onSave={() => handleSaveField('gender')}
                />
              </View>

              {/* --- NHÓM 2: LOGOUT --- */}
              <View
                className="mt-6 bg-[#FFFFFF] rounded-[20px] overflow-hidden border border-[#F3F4F6]"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <TouchableOpacity
                  className="flex-row items-center justify-between py-4 px-[20px] bg-white"
                  onPress={handleLogout}
                  activeOpacity={0.7}
                >
                  <View className=" flex-row items-center">
                    <View className="rounded-[10px] items-center justify-center mr-[9px]">
                      <Image
                        className=''
                        source={require('../assets/icon/logout.png')}
                        style={{ width: 17, height: 17 }}
                        resizeMode="cover"
                      />
                    </View>
                    <Text className="text-[16px] font-medium text-[#AC0000]">{t('Log Out')}</Text>
                  </View>
                </TouchableOpacity>
              </View>

            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ================= MODALS & PICKERS ================= */}

      {/* ANDROID GỐC DATE PICKER CHO NGÀY SINH */}
      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker value={dob} mode="date" display="default" maximumDate={new Date()} onChange={onDateChange} />
      )}

      {/* --- KÍNH MỜ DROPDOWN FIX CHIỀU CAO VÀ MÀU CAM (IOS) - CHO NGÀY SINH --- */}
      {Platform.OS === 'ios' && activePicker === 'dob' && (
        <View className="absolute inset-0 z-[100]">
          <TouchableOpacity
            activeOpacity={1}
            className="absolute inset-0"
            onPress={() => {
              closeDropdownPicker();
            }}
          />

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
              <TouchableOpacity onPress={() => closeDropdownPicker()}>
                <Text className="text-[16px] text-[#A1A1AA] font-medium">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  closeDropdownPicker();
                  handleSaveField('dob'); // Tự động lưu sau khi ấn Done
                }}
              >
                <Text className="text-[16px] font-semibold text-[#E89B5A]">Done</Text>
              </TouchableOpacity>
            </View>

            <View style={{ paddingTop: 4, paddingBottom: 4, paddingHorizontal: 10, alignItems: 'center' }} className="relative z-10">
              <DateTimePicker
                value={dob}
                mode="date"
                display="inline"
                themeVariant="dark"
                locale={language === 'vi' ? "vi-VN" : "en-US"}
                maximumDate={new Date()}
                style={{ width: 320, height: 315, alignSelf: 'center' }}
                accentColor="#E89B5A"
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setDob(selectedDate);
                    setHasSelectedDate(true);
                  }
                }}
              />
            </View>
          </Animated.View>
        </View>
      )}

      <Modal visible={showGenderModal} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => {
          setShowGenderModal(false);
          setEditingField(null);
        }}>
          <View className="flex-1 justify-center bg-black/40 px-6">
            <TouchableWithoutFeedback>
              <View className="bg-[#FFFFFF] rounded-[24px] overflow-hidden">
                <View className="py-[18px] items-center border-b border-[#F3F4F6] bg-[#FAFAFA]">
                  <Text className="text-[18px] font-bold text-[#111827]">Select Gender</Text>
                </View>
                <FlatList
                  data={GENDER_OPTIONS}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      className={`flex-row justify-between items-center py-[18px] px-6 border-b border-[#F3F4F6] ${gender === item ? 'bg-[#FFF7ED]' : ''}`}
                      onPress={() => {
                        setGender(item);
                        setShowGenderModal(false);
                        handleSaveField('gender');
                      }}
                    >
                      <Text className={`text-[16px] ${gender === item ? 'text-[#F97316] font-semibold' : 'text-[#374151]'}`}>
                        {item}
                      </Text>
                      {gender === item && <Feather name="check" size={20} color="#F97316" />}
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
          <View className="flex-1 justify-center bg-black/40 px-6">
            <TouchableWithoutFeedback>
              <View className="bg-[#FFFFFF] rounded-[24px] overflow-hidden" style={{ maxHeight: '60%' }}>
                <View className="py-[18px] items-center border-b border-[#F3F4F6] bg-[#FAFAFA]">
                  <Text className="text-[18px] font-bold text-[#111827]">Select Country Code</Text>
                </View>
                <FlatList
                  data={COUNTRY_CODES}
                  keyExtractor={(item) => item.code}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      className="flex-row items-center py-4 px-6 border-b border-[#F3F4F6]"
                      onPress={() => {
                        setSelectedCountry(item);
                        setShowCountryModal(false);
                      }}
                    >
                      <Text className="text-[24px] mr-4">{item.flag}</Text>
                      <Text className="flex-1 text-[16px] text-[#374151]">{item.name}</Text>
                      <Text className="text-[16px] font-semibold text-[#6B7280]">{item.dial_code}</Text>
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