import { useLanguage } from '@/contexts/LanguageContext';
import { Feather, Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  Platform,
  ScrollView,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from './AppText';
import { TextInput } from './AppTextInput';
import axiosClient from '@/api/axiosClient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
function buildBilingual(sourceText: string): { vi: string; en: string } {
  const trimmed = sourceText?.trim() || '';
  return { vi: trimmed, en: trimmed };
}


const formatShortDate = (date: Date, isVi: boolean) => {
  const day = date.getDate();
  const year = date.getFullYear();
  if (isVi) {
    return `${day} Thg ${date.getMonth() + 1}, ${year}`;
  }
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${day}, ${year}`;
};

const RECORD_OPTIONS = [
  {
    id: 'vaccination',
    titleEn: 'Vaccination', descEn: 'Core & non-core vaccines',
    titleVi: 'Tiêm phòng', descVi: 'Vaccine cơ bản & mở rộng',
    icon: 'medkit-outline',
  },
  {
    id: 'examination',
    titleEn: 'Examination', descEn: 'Regular check-ups and exam',
    titleVi: 'Khám bệnh', descVi: 'Khám và kiểm tra sức khỏe định kỳ',
    icon: 'stethoscope-outline',
  },
  {
    id: 'dental',
    titleEn: 'Dental', descEn: 'Teeth cleaning and dental care',
    titleVi: 'Răng miệng', descVi: 'Vệ sinh và chăm sóc răng miệng',
    icon: 'happy-outline',
  },
  {
    id: 'other',
    titleEn: 'Other', descEn: 'Other medical records',
    titleVi: 'Khác', descVi: 'Các hồ sơ y tế khác',
    icon: 'document-text-outline',
  },
];

const VACCINE_OPTIONS = {
  Dog: [
    { id: 'DOG_DHP', label: 'DHP (3in1)' },
    { id: 'DOG_DHPP', label: 'DHPP (5/7in1)' },
    { id: 'DOG_RABIES', label: 'Rabies (Dại)' },
    { id: 'DOG_LEPTO', label: 'Lepto' },
    { id: 'DOG_BORDETELLA', label: 'Bordetella' },
    { id: 'DOG_CIV', label: 'CIV' },
  ],
  Cat: [
    { id: 'CAT_FVRCP', label: 'FVRCP (3/4in1)' },
    { id: 'CAT_RABIES', label: 'Rabies (Dại)' },
    { id: 'CAT_FELV', label: 'FeLV' },
  ]
};

const OPTION_ROW_H = 62;
const BASE_HEIGHT = 52 + 21 + 29 + (OPTION_ROW_H * 4) + 21;

interface AddMedicalRecordModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  species?: 'Dog' | 'Cat';
}

export default function AddMedicalRecordModal({
  visible,
  onClose,
  onSubmit,
  species = 'Dog'
}: AddMedicalRecordModalProps) {
  const { language } = useLanguage();
  const isVi = language === 'vi';
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedType, setSelectedType] = useState<string | null>(null);

  const [recordName, setRecordName] = useState('');
  const [recordDate, setRecordDate] = useState(new Date());
  const [showRecordDatePicker, setShowRecordDatePicker] = useState(false);
  const [images, setImages] = useState<string[]>([]);

  const [vaccineType, setVaccineType] = useState<string>('');
  const [showVaccineDropdown, setShowVaccineDropdown] = useState(false);
  const [doseNumber, setDoseNumber] = useState<1 | 2 | 3>(1);

  const [hasNextDueDate, setHasNextDueDate] = useState(false);
  const [nextDueName, setNextDueName] = useState('');
  const [nextDueDate, setNextDueDate] = useState(new Date());
  const [showNextDatePicker, setShowNextDatePicker] = useState(false);

  const modalHeight = useRef(new Animated.Value(BASE_HEIGHT)).current;
  const detailsFade = useRef(new Animated.Value(0)).current;
  const nextDueFade = useRef(new Animated.Value(0)).current;
  const imagesFade = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // --- STATE VÀ REF CHO DROPDOWN KÍNH MỜ ---
  const recordDateRef = useRef<View>(null);
  const nextDateRef = useRef<View>(null);

  const [activePicker, setActivePicker] = useState<'record' | 'next' | null>(null);
  const [pickerLayout, setPickerLayout] = useState({ x: 0, y: 0, width: 340 });
  const pickerOpacity = useRef(new Animated.Value(0)).current;
  const pickerTranslateY = useRef(new Animated.Value(-8)).current;

  const openDropdownPicker = (type: 'record' | 'next') => {
    const ref = type === 'record' ? recordDateRef : nextDateRef;
    ref.current?.measureInWindow((x, y, width, height) => {
      const dropdownWidth = 340;

      // SỬA Ở ĐÂY: Thay thế khối if-else bằng công thức căn giữa tuyệt đối
      const finalX = (SCREEN_WIDTH - dropdownWidth) / 2;

      setPickerLayout({ x: finalX, y: y + height + 8, width: dropdownWidth });
      setActivePicker(type);

      Animated.parallel([
        Animated.timing(pickerOpacity, { toValue: 1, duration: 200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pickerTranslateY, { toValue: 0, duration: 250, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true })
      ]).start();
    });
  };

  const closeDropdownPicker = () => {
    Animated.parallel([
      Animated.timing(pickerOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(pickerTranslateY, { toValue: -8, duration: 150, useNativeDriver: true })
    ]).start(() => setActivePicker(null));
  };
  // ------------------------------------------

  const optionHeights = useRef(
    RECORD_OPTIONS.reduce<Record<string, Animated.Value>>((acc, opt) => {
      acc[opt.id] = new Animated.Value(OPTION_ROW_H);
      return acc;
    }, {})
  ).current;

  useEffect(() => {
    if (selectedType === 'vaccination' && vaccineType) {
      setHasNextDueDate(true);
      const nextDate = new Date(recordDate);

      if (vaccineType === 'DOG_RABIES' || vaccineType === 'CAT_RABIES') {
        nextDate.setDate(nextDate.getDate() + 365);
      } else if (vaccineType === 'DOG_BORDETELLA') {
        nextDate.setDate(nextDate.getDate() + 180);
      } else {
        if (doseNumber === 1 || doseNumber === 2) {
          nextDate.setDate(nextDate.getDate() + 28);
        } else {
          nextDate.setDate(nextDate.getDate() + 365);
        }
      }

      setNextDueDate(nextDate);

      const vName = VACCINE_OPTIONS[species].find(v => v.id === vaccineType)?.label || '';
      setNextDueName(isVi ? `Nhắc lại ${vName}` : `${vName} Booster`);
    }
  }, [selectedType, vaccineType, recordDate, doseNumber, species, isVi]);

  useEffect(() => {
    if (selectedType && selectedType !== 'vaccination') {
      if (recordName.trim()) {
        setNextDueName(isVi ? `Nhắc lại ${recordName}` : `${recordName} Reminder`);
      } else {
        setNextDueName('');
      }
    }
  }, [selectedType, recordName, isVi]);

  const animateTo = (anim: Animated.Value, toValue: number, duration = 260) =>
    Animated.timing(anim, {
      toValue,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });

  const animateHeight = (toValue: number) =>
    Animated.timing(modalHeight, {
      toValue,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });

  useEffect(() => {
    RECORD_OPTIONS.forEach(opt => {
      Animated.timing(optionHeights[opt.id], {
        toValue: !selectedType || selectedType === opt.id ? OPTION_ROW_H : 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    });

    const optionsH = selectedType ? OPTION_ROW_H : OPTION_ROW_H * 4;
    let target = 52 + 21 + 29 + optionsH;

    if (!selectedType) {
      target += 6.5;
    } else {
      let detailsH = 43;
      detailsH += 48;

      if (selectedType === 'vaccination') {
        if (showVaccineDropdown) {
          const itemsCount = VACCINE_OPTIONS[species].length;
          detailsH += Math.min(160, itemsCount * 41 + 2) + 12;
        }
        if (vaccineType && vaccineType !== 'DOG_RABIES' && vaccineType !== 'CAT_RABIES' && vaccineType !== 'DOG_BORDETELLA') {
          detailsH += 46;
        }
      }

      detailsH += 56;
      if (images.length > 0) {
        detailsH += Math.ceil(images.length / 3) * 94;
      }

      detailsH += 13;
      detailsH += 30;

      if (hasNextDueDate) detailsH += 36;

      target += detailsH;
      target += 70;
    }

    animateHeight(target).start();
  }, [selectedType, images.length, hasNextDueDate, vaccineType, doseNumber, showVaccineDropdown, species]);

  useEffect(() => { animateTo(detailsFade, selectedType ? 1 : 0).start(); }, [selectedType]);
  useEffect(() => { animateTo(imagesFade, images.length > 0 ? 1 : 0, 200).start(); }, [images.length]);
  useEffect(() => { animateTo(nextDueFade, hasNextDueDate ? 1 : 0).start(); }, [hasNextDueDate]);

  useEffect(() => {
    if (visible) {
      RECORD_OPTIONS.forEach(opt => {
        optionHeights[opt.id].setValue(OPTION_ROW_H);
      });

      setSelectedType(null);
      setRecordName('');
      setRecordDate(new Date());
      setVaccineType('');
      setShowVaccineDropdown(false);
      setDoseNumber(1);
      setImages([]);
      setHasNextDueDate(false);
      setNextDueName('');
      setNextDueDate(new Date());
      setIsSubmitting(false);

      animateTo(backdropOpacity, 1, 220).start();
    } else {
      backdropOpacity.setValue(0);
      setActivePicker(null);
    }
  }, [visible]);

  const handleClose = () => {
    onClose();
  };

  const handleUploadPhotos = async () => {
    const remainingSlots = 3 - images.length;
    if (remainingSlots <= 0) {
      Alert.alert(isVi ? 'Giới hạn' : 'Limit', isVi ? 'Tối đa 3 ảnh!' : 'Max 3 photos!');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 0.8,
    });
    if (!result.canceled && result.assets) {
      setImages(prev => [...prev, ...result.assets.map(a => a.uri)]);
    }
  };

  const handleSubmit = () => {
    if (!selectedType) return;
    if (selectedType === 'vaccination' && !vaccineType) {
      Alert.alert('Lỗi', isVi ? 'Vui lòng chọn loại Vaccine' : 'Please select a Vaccine');
      return;
    }
    const recordNameBilingual = selectedType === 'vaccination'
      ? buildBilingual(VACCINE_OPTIONS[species].find(v => v.id === vaccineType)?.label || '')
      : buildBilingual(recordName);


    const nextDueNameBilingual = hasNextDueDate
      ? buildBilingual(nextDueName)
      : null;

    onSubmit({
      type: selectedType,
      recordName: recordNameBilingual,
      vaccineType: selectedType === 'vaccination' ? vaccineType : undefined,
      doseNumber: selectedType === 'vaccination' ? doseNumber : undefined,
      recordDate: recordDate.toISOString(),
      images,
      hasNextDueDate,
      nextDueName: nextDueNameBilingual ?? undefined,
      nextDueDate: hasNextDueDate ? nextDueDate.toISOString() : undefined,
    });
    handleClose();
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View style={{ opacity: backdropOpacity }} className="absolute inset-0 bg-black/50" />

      <View className="flex-1 justify-center items-center px-4">
        <Animated.View
          style={{ height: modalHeight }}
          className="bg-white rounded-[22px] w-[320px] overflow-hidden shadow-xl relative"
        >
          <TouchableOpacity
            onPress={handleClose}
            className="absolute z-50 p-1"
            style={{ top: 36, right: 23 }}
          >
            <Ionicons name="close" size={16} color="#000000" />
          </TouchableOpacity>

          <View className="flex-row items-center justify-center pt-[26px]">
            <Text className="text-[18px] font-semibold text-[#000000]">
              {isVi ? 'Thêm hồ sơ y tế' : 'Add Medical Record'}
            </Text>
          </View>

          <View className={`px-[22px] pt-[21px] ${!selectedType ? 'pb-[22.5px]' : ''}`}>
            <Text className="text-[14px] font-semibold text-[#000000] mb-[9px]">
              {isVi ? 'Loại hồ sơ' : 'Type of Medical Record'}
            </Text>

            {(selectedType ? RECORD_OPTIONS.filter(o => o.id === selectedType) : RECORD_OPTIONS).map(item => {
              const isActive = selectedType === item.id;
              return (
                <Animated.View key={item.id} style={{ height: optionHeights[item.id], overflow: 'hidden' }}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedType(isActive ? null : item.id);
                      setRecordName('');
                      setVaccineType('');
                      setShowVaccineDropdown(false);
                      setDoseNumber(1);
                      setImages([]);
                      setHasNextDueDate(false);
                      setNextDueName('');
                      setNextDueDate(new Date());
                    }}
                    className={`flex-row items-center px-[12px] py-[11px] rounded-[12px] border ${isActive ? 'border-[#E89B5A]/50 bg-[#FFD0A8]/25' : 'border-[#E89B5A]/0 bg-white'}`}
                  >
                    <View className={`w-9 h-9 rounded-[100px] items-center justify-center mr-3 ${isActive ? 'bg-[#E89B5A]/20' : 'bg-gray-100'}`}>
                      <Ionicons name={item.icon as any} size={18} color={isActive ? '#E89B5A' : '#6B7280'} />
                    </View>
                    <View className="flex-1">
                      <Text className={`text-[12px] font-medium mb-0.5 ${isActive ? 'text-[#E89B5A]' : 'text-[#111827]'}`}>
                        {isVi ? item.titleVi : item.titleEn}
                      </Text>
                      <Text className="text-[10px] font-regular text-[#8E8E93]">{isVi ? item.descVi : item.descEn}</Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}

            <Animated.View style={{ opacity: detailsFade }}>
              {selectedType && (
                <>
                  <Text className="text-[14px] font-semibold text-[#111827] mb-[9px] mt-[14px]">
                    {isVi ? 'Chi tiết hồ sơ' : 'Vaccination Details'}
                  </Text>

                  <View className="flex-row gap-2.5 mb-3">
                    <View style={{ flex: 2 }}>
                      {selectedType === 'vaccination' ? (
                        <TouchableOpacity
                          onPress={() => setShowVaccineDropdown(!showVaccineDropdown)}
                          activeOpacity={0.8}
                          className="h-[36px] border border-[#E5E5EA] rounded-[12px] px-[14px] flex-row items-center justify-between bg-white relative z-10"
                        >
                          <Text className={`${vaccineType ? 'text-black' : 'text-[#8E8E93]'} text-[14px] font-regular flex-1`} numberOfLines={1}>
                            {VACCINE_OPTIONS[species].find(v => v.id === vaccineType)?.label || (isVi ? 'Chọn vắc-xin...' : 'Select vaccination...')}
                          </Text>
                          <Feather name={showVaccineDropdown ? "chevron-up" : "chevron-down"} size={16} color="#8E8E93" />
                        </TouchableOpacity>
                      ) : (
                        <TextInput
                          style={{ fontFamily: 'Urbanist-Regular' }}
                          className="h-[36px] border border-[#E5E5EA] rounded-[12px] px-[14px] text-[14px] font-regular text-black bg-white"
                          placeholder={isVi ? 'Nhập tên...' : 'Enter name...'}
                          placeholderTextColor="#A1A1AA"
                          value={recordName}
                          onChangeText={setRecordName}
                        />
                      )}
                    </View>

                    {/* REF ĐO TỌA ĐỘ VÀ GỌI KÍNH MỜ CHO NGÀY HỒ SƠ */}
                    <View style={{ flex: 1 }} ref={recordDateRef} collapsable={false}>
                      <TouchableOpacity
                        onPress={() => Platform.OS === 'ios' ? openDropdownPicker('record') : setShowRecordDatePicker(true)}
                        className="h-[36px] border border-[#E5E5E5] rounded-[12px] px-1 justify-center items-center bg-white"
                      >
                        <Text className="text-[14px] font-regular text-black text-center" numberOfLines={1} adjustsFontSizeToFit>
                          {formatShortDate(recordDate, isVi)}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {selectedType === 'vaccination' && showVaccineDropdown && (
                    <View className="bg-gray-50 border border-[#E5E5EA] rounded-[12px] mb-3 max-h-[160px] overflow-hidden">
                      <ScrollView
                        showsVerticalScrollIndicator={true}
                        nestedScrollEnabled={true}
                        keyboardShouldPersistTaps="handled"
                      >
                        {VACCINE_OPTIONS[species].map((item) => {
                          const isSelected = vaccineType === item.id;
                          return (
                            <TouchableOpacity
                              key={item.id}
                              activeOpacity={0.7}
                              className={`p-[12px] border-b border-gray-100 ${isSelected ? 'bg-[#FFD0A8]/10' : ''}`}
                              onPress={() => {
                                setVaccineType(item.id);
                                setShowVaccineDropdown(false);
                              }}
                            >
                              <Text className={`text-[13px] ${isSelected ? 'text-[#E89B5A] font-medium' : 'text-[#4B5563] font-regular'}`}>
                                {item.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}

                  {selectedType === 'vaccination' && vaccineType && vaccineType !== 'DOG_RABIES' && vaccineType !== 'CAT_RABIES' && vaccineType !== 'DOG_BORDETELLA' && (
                    <View className="flex-row items-center justify-between mb-3 bg-[#FAFAFA] px-[12px] py-[10px] rounded-[12px] border border-[#E5E5EA]">
                      {[1, 2, 3].map((dose) => {
                        const isSelected = doseNumber === dose;
                        return (
                          <TouchableOpacity
                            key={dose}
                            activeOpacity={0.7}
                            onPress={() => setDoseNumber(dose as 1 | 2 | 3)}
                            className="flex-row items-center"
                          >
                            <Ionicons
                              name={isSelected ? "radio-button-on" : "radio-button-off"}
                              size={20}
                              color={isSelected ? "#E89B5A" : "#9CA3AF"}
                            />
                            <Text className={`text-[13px] ml-1.5 ${isSelected ? 'text-[#E89B5A] font-medium' : 'text-[#4B5563] font-regular'}`}>
                              {isVi ? `Mũi ${dose}` : `${dose}${dose === 1 ? 'st' : dose === 2 ? 'nd' : 'rd'} Dose`}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  <TouchableOpacity
                    onPress={handleUploadPhotos}
                    activeOpacity={0.7}
                    className="flex-row border border-dashed border-[#E5E5E5] rounded-[12px] py-[12px] items-center justify-center mb-[17px]"
                  >
                    <Ionicons name="cloud-upload-outline" size={20} color="#9CA3AF" />
                    <Text className="text-[12px] text-[#000000] font-regular ml-2">
                      {isVi ? 'Tải ảnh lên (Tối đa 3)' : 'Upload Photos (Max 3)'}
                    </Text>
                  </TouchableOpacity>

                  <Animated.View style={{ opacity: imagesFade }}>
                    {images.length > 0 && (
                      <View className="flex-row flex-wrap gap-2 mb-3">
                        {images.map((url, index) => (
                          <View key={index} style={{ width: '31%', aspectRatio: 1 }} className="relative">
                            <Image source={{ uri: url }} className="w-full h-full rounded-[4px] border border-[#E5E5EA]" />
                            <TouchableOpacity
                              onPress={() => setImages(prev => prev.filter((_, i) => i !== index))}
                              className="absolute -top-1.5 -right-1.5 bg-white rounded-full"
                            >
                              <Ionicons name="close-circle" size={18} color="#FF3B30" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                  </Animated.View>

                  <View className="flex-row justify-between items-center mb-[6px]">
                    <Text className="text-[14px] font-semibold text-[#111827]">
                      {isVi ? 'Ngày hẹn tiếp theo' : 'Next Due Date'}
                    </Text>
                    <Switch
                      style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                      value={hasNextDueDate}
                      onValueChange={setHasNextDueDate}
                      trackColor={{ false: '#E5E5EA', true: '#E89B5A' }}
                      thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
                    />
                  </View>

                  <Animated.View style={{ opacity: nextDueFade }}>
                    {hasNextDueDate && (
                      <View className="flex-row gap-2.5">
                        <View style={{ flex: 2 }}>
                          <TextInput
                            style={{ fontFamily: 'Urbanist-Regular' }}
                            className="h-[36px] border border-[#E5E5EA] rounded-[12px] px-[14px] text-[14px] font-regular text-black bg-white"
                            placeholder={isVi ? 'Ghi chú / Tên...' : 'Note / Name...'}
                            placeholderTextColor="#A1A1AA"
                            value={nextDueName}
                            onChangeText={setNextDueName}
                          />
                        </View>

                        {/* REF ĐO TỌA ĐỘ VÀ GỌI KÍNH MỜ CHO NGÀY NHẮC LẠI */}
                        <View style={{ flex: 1 }} ref={nextDateRef} collapsable={false}>
                          <TouchableOpacity
                            onPress={() => Platform.OS === 'ios' ? openDropdownPicker('next') : setShowNextDatePicker(true)}
                            className="h-[36px] border border-[#E5E5E5] rounded-[12px] px-1 justify-center items-center bg-white"
                          >
                            <Text className="text-[14px] font-regular text-black text-center" numberOfLines={1} adjustsFontSizeToFit>
                              {formatShortDate(nextDueDate, isVi)}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </Animated.View>
                </>
              )}
            </Animated.View>
          </View>

          {selectedType && (
            <View className="bg-white items-center" style={{ paddingTop: 17 }}>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isSubmitting}
                className={`h-[37px] w-2/3 rounded-[1000px] items-center justify-center bg-[#E89B5A] ${isSubmitting ? 'opacity-60' : ''}`}
              >
                <Text className="font-medium text-[14px] text-white">
                  {isSubmitting ? (isVi ? 'Đang lưu...' : 'Saving...') : (isVi ? 'Lưu hồ sơ' : 'Submit Record')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </View>

      {/* --- KÍNH MỜ DROPDOWN FIX CHIỀU CAO VÀ MÀU CAM (IOS) --- */}
      {Platform.OS === 'ios' && activePicker && (
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
                <Text className="text-[16px] text-[#A1A1AA] font-medium">{isVi ? 'Huỷ' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={closeDropdownPicker}>
                <Text className="text-[16px] font-semibold text-[#E89B5A]">{isVi ? 'Xong' : 'Done'}</Text>
              </TouchableOpacity>
            </View>

            {/* Đã giới hạn strict height và giảm padding để xoá bỏ khoảng trắng to đùng ở dưới đáy */}
            <View style={{ paddingTop: 4, paddingBottom: 4, paddingHorizontal: 10, alignItems: 'center' }} className="relative z-10">
              <DateTimePicker
                value={activePicker === 'record' ? recordDate : nextDueDate}
                mode="date"
                display="inline"
                themeVariant="dark"
                locale={isVi ? "vi-VN" : "en-US"}
                minimumDate={activePicker === 'next' ? new Date() : undefined}
                // Giới hạn cứng chiều cao để iOS không sinh thêm padding thừa
                style={{ width: 320, height: 315, alignSelf: 'center' }}
                // Đổi toàn bộ các nút xanh mặc định của DatePicker sang màu cam chuẩn
                accentColor="#E89B5A"
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    if (activePicker === 'record') setRecordDate(selectedDate);
                    if (activePicker === 'next') setNextDueDate(selectedDate);
                  }
                }}
              />
            </View>
          </Animated.View>
        </View>
      )}

      {/* --- ANDROID CHUẨN GỐC --- */}
      {Platform.OS === 'android' && showRecordDatePicker && (
        <DateTimePicker
          value={recordDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowRecordDatePicker(false);
            if (event.type === 'set' && selectedDate) setRecordDate(selectedDate);
          }}
        />
      )}
      {Platform.OS === 'android' && showNextDatePicker && (
        <DateTimePicker
          value={nextDueDate}
          mode="date"
          minimumDate={new Date()}
          display="default"
          onChange={(event, selectedDate) => {
            setShowNextDatePicker(false);
            if (event.type === 'set' && selectedDate) setNextDueDate(selectedDate);
          }}
        />
      )}
    </Modal>
  );
}