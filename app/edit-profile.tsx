// app/edit-profile.tsx
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useContext, useEffect, useRef, useState } from 'react';
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
// IMPORT CONTEXT AND HOOKS
import { Text } from '@/components/AppText';
import { useLanguage } from '@/contexts/LanguageContext';
import { disconnectSocket } from '@/utils/socket';
import { AuthContext } from '../contexts/AuthContext';
import { useImageUpload } from '../hooks/useImageUpload';

// --- CONSTANTS ---
const COUNTRY_CODES = [
  { code: 'VN', dial_code: '+84', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'US', dial_code: '+1', name: 'United States', flag: '🇺🇸' },
  { code: 'UK', dial_code: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'JP', dial_code: '+81', name: 'Japan', flag: '🇯🇵' },
];

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];

// --- REUSABLE PROFILE ITEM COMPONENT ---
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
      className={`flex-row items-center justify-between py-[6px] px-4 bg-white ${isEditing ? 'bg-[#FFF7ED]' : ''}`}
      onPress={onPressRow}
      disabled={!editable}
      activeOpacity={0.7}
    >
      <View className="flex-row items-center">
        <View className="w-[36px] h-[36px] rounded-[10px] items-center justify-center">
          {/* CỐ ĐỊNH MÀU XÁM CHO ICON TRÁI */}
          <Feather name={icon} size={20} color="#111827" />
        </View>
        <Text className="text-[16px] text-[#374151] font-medium px-2">{label}</Text>
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
            style={{fontFamily: 'Urbanist-Regular'}}
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
  
  // --- FORM STATE ---
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [phoneOnly, setPhoneOnly] = useState(''); 

  const [editingField, setEditingField] = useState<string | null>(null);
  const [savingField, setSavingField] = useState<string | null>(null);

  // DatePicker State
  const [dob, setDob] = useState(new Date());
  const [hasSelectedDate, setHasSelectedDate] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  // Gender State
  const [gender, setGender] = useState('');
  const [showGenderModal, setShowGenderModal] = useState(false);

  // Country Code State
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [showCountryModal, setShowCountryModal] = useState(false);

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
                if (logout) await logout(); // Xóa auth data/token
                
                // BỔ SUNG: Ngắt kết nối socket ngay lập tức
                disconnectSocket();
                
                router.push('/');
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
    } else if (event.type === 'dismissed') {
      setShowPicker(false);
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
        <Text className="text-[24px] font-semibold text-[#000000]">Edit Profile</Text>
        <View className="w-[36px]" />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
          
          {/* --- AVATAR SECTION --- */}
          <View className="items-center my-8">
            <TouchableOpacity 
              className="relative"
              onPress={handleUpdateAvatar}
              disabled={isUploading}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: user?.avatarUrl || 'https://pub-35c6d59c9e96467b9783df2a4e890a09.r2.dev/default-avatar.jpg' || '/assets/images/default-avatar.jpg' }}
                className="w-[106px] h-[106px] rounded-[50px] border border-[#F3F4F6] bg-[#E5E7EB]"
                resizeMode="cover"
              />
              {isUploading && (
                <View className="absolute inset-0 bg-black/50 rounded-[50px] items-center justify-center">
                  <ActivityIndicator size="large" color="#ffffff" />
                </View>
              )}
            </TouchableOpacity>
            
            {/* HIỂN THỊ TÊN (CẬP NHẬT REALTIME THEO STATE NICKNAME) */}
            <Text className="mt-4 font-semibold text-gray-900 text-lg">
              {nickname || 'Not set'}
            </Text>

            {/* HIỂN THỊ EMAIL DƯỚI TÊN */}
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
              className="bg-[#FFFFFF] rounded-[20px] overflow-hidden border border-[#F3F4F6]"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <ProfileItem 
                icon="user" 
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
                icon="phone" 
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
                      <Feather name="chevron-down" size={14} color="#6B7280" style={{marginLeft: 4}}/>
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

              <ProfileItem 
                icon="calendar" 
                label="Birthday" 
                value={hasSelectedDate ? dob.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''} 
                isEditing={editingField === 'dob'}
                isLoading={savingField === 'dob'}
                onPressRow={() => {
                  setEditingField('dob');
                  setShowPicker(true);
                }}
                onSave={() => handleSaveField('dob')}
              />
              <View className="h-[1px] bg-[#F3F4F6]" />

              <ProfileItem 
                icon="users" 
                label="Gender" 
                value={gender} 
                isEditing={editingField === 'gender'}
                isLoading={savingField === 'gender'}
                onPressRow={() => {
                  setEditingField('gender');
                  setShowGenderModal(true);
                }}
                onSave={() => handleSaveField('gender')}
              />
            </View>

            {/* --- NHÓM 2: LOGOUT (NẰM Ở CARD RIÊNG) --- */}
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
                className="flex-row items-center justify-between py-2 px-4 bg-white"
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center">
                  <View className="w-[36px] h-[36px] rounded-[10px] items-center justify-center mr-[14px]">
                    <Feather name="log-out" size={20} color="#EF4444" />
                  </View>
                  <Text className="text-[16px] font-medium text-[#EF4444]">{t('Log Out')}</Text>
                </View>
              </TouchableOpacity>
            </View>
            
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ================= MODALS & PICKERS ================= */}
      {Platform.OS === 'ios' ? (
        <Modal visible={showPicker} transparent animationType="slide">
          <View className="flex-1 justify-end bg-black/40">
            <View className="bg-[#FFFFFF] rounded-t-[24px]" style={{ paddingBottom: 32 }}>
              <View className="flex-row justify-between items-center px-5 py-4 border-b border-[#F3F4F6]">
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text className="text-[16px] text-[#6B7280] font-medium">Cancel</Text>
                </TouchableOpacity>
                <Text className="text-[18px] font-bold text-[#111827]">Select Date</Text>
                <TouchableOpacity onPress={() => { setShowPicker(false); handleSaveField('dob'); }}>
                  <Text className="text-[16px] text-[#F97316] font-semibold">Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker value={dob} mode="date" display="spinner" maximumDate={new Date()} onChange={onDateChange} textColor="black" />
            </View>
          </View>
        </Modal>
      ) : (
        showPicker && (
          <DateTimePicker value={dob} mode="date" display="default" maximumDate={new Date()} onChange={onDateChange} />
        )
      )}

      <Modal visible={showGenderModal} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowGenderModal(false)}>
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