import { useLanguage } from '@/contexts/LanguageContext';
import { Feather, Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Image,
  Modal,
  Platform,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from './AppText';
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
    id: 'deworming',
    titleEn: 'Deworming', descEn: 'Internal parasite control',
    titleVi: 'Tẩy giun', descVi: 'Kiểm soát ký sinh trùng ruột',
    icon: 'bug-outline',
  },
  {
    id: 'flea_tick',
    titleEn: 'Flea & Tick', descEn: 'External parasite prevention',
    titleVi: 'Trị ve rận', descVi: 'Phòng ngừa ký sinh ngoài da',
    icon: 'shield-checkmark-outline',
  },
  {
    id: 'general',
    titleEn: 'General Checkup', descEn: 'Routine health exam',
    titleVi: 'Khám tổng quát', descVi: 'Khám sức khỏe định kỳ',
    icon: 'stethoscope-outline',
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

  const [selectedType, setSelectedType] = useState<string | null>(null);

  const [recordName, setRecordName] = useState('');
  const [recordDate, setRecordDate] = useState(new Date());
  const [showRecordDatePicker, setShowRecordDatePicker] = useState(false);
  const [images, setImages] = useState<string[]>([]);

  const [vaccineType, setVaccineType] = useState<string>('');
  const [showVaccineDropdown, setShowVaccineDropdown] = useState(false);
  const [isSeries, setIsSeries] = useState<boolean>(true);

  const [hasNextDueDate, setHasNextDueDate] = useState(false);
  const [nextDueName, setNextDueName] = useState('');
  const [nextDueDate, setNextDueDate] = useState(new Date());
  const [showNextDatePicker, setShowNextDatePicker] = useState(false);

  const modalHeight = useRef(new Animated.Value(BASE_HEIGHT)).current;
  const detailsFade = useRef(new Animated.Value(0)).current;
  const nextDueFade = useRef(new Animated.Value(0)).current;
  const imagesFade = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

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
        if (isSeries) {
          nextDate.setDate(nextDate.getDate() + 28);
        } else {
          nextDate.setDate(nextDate.getDate() + 365);
        }
      }

      setNextDueDate(nextDate);

      const vName = VACCINE_OPTIONS[species].find(v => v.id === vaccineType)?.label || '';
      setNextDueName(isVi ? `Nhắc lại ${vName}` : `${vName} Booster`);
    }
  }, [selectedType, vaccineType, recordDate, isSeries]);

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
      // Đổi từ 21 thành 22.5 để cách mí dưới modal 22.5px khi chưa chọn loại hồ sơ
      target += 6.5;
    } else {
      let detailsH = 43;
      detailsH += 48;

      if (selectedType === 'vaccination') {
        if (showVaccineDropdown) {
          const itemsCount = VACCINE_OPTIONS[species].length;
          detailsH += Math.min(160, itemsCount * 41 + 2);
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
      // Tổng chiều cao khu vực Submit: pt (21px) + button height (37px) + pb (21px) = 79px
      target += 70;
    }

    animateHeight(target).start();
  }, [selectedType, images.length, hasNextDueDate, vaccineType, isSeries, showVaccineDropdown, species]);

  useEffect(() => { animateTo(detailsFade, selectedType ? 1 : 0).start(); }, [selectedType]);
  useEffect(() => { animateTo(imagesFade, images.length > 0 ? 1 : 0, 200).start(); }, [images.length]);
  useEffect(() => { animateTo(nextDueFade, hasNextDueDate ? 1 : 0).start(); }, [hasNextDueDate]);
  useEffect(() => {
    if (visible) animateTo(backdropOpacity, 1, 220).start();
    else backdropOpacity.setValue(0);
  }, [visible]);

  const handleClose = () => {
    setSelectedType(null);
    setRecordName('');
    setVaccineType('');
    setShowVaccineDropdown(false);
    setIsSeries(true);
    setImages([]);
    setHasNextDueDate(false);
    onClose();
  };

  const handleUploadPhotos = async () => {
    const remainingSlots = 5 - images.length;
    if (remainingSlots <= 0) {
      Alert.alert(isVi ? 'Giới hạn' : 'Limit', isVi ? 'Tối đa 5 ảnh!' : 'Max 5 photos!');
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

    onSubmit({
      type: selectedType,
      recordName: selectedType === 'vaccination'
        ? VACCINE_OPTIONS[species].find(v => v.id === vaccineType)?.label
        : recordName,
      vaccineType: selectedType === 'vaccination' ? vaccineType : undefined,
      isSeries: selectedType === 'vaccination' ? isSeries : undefined,
      recordDate: recordDate.toISOString(),
      images,
      hasNextDueDate,
      nextDueName: hasNextDueDate ? nextDueName : undefined,
      nextDueDate: hasNextDueDate ? nextDueDate.toISOString() : undefined,
    });
    handleClose();
  };

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={{ opacity: backdropOpacity }} className="absolute inset-0 bg-black/50" />

      {/* --- KHU VỰC NỘI DUNG CHÍNH CỦA MODAL --- */}
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
                    onPress={() => setSelectedType(isActive ? null : item.id)}
                    className={`flex-row items-center px-[12px] py-[11px] rounded-[12px] border ${isActive ? 'border-[#E89B5A]/50 bg-[#FFD0A8]/25' : 'border-[#E89B5A]/0 bg-white'
                      }`}
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
                          className="h-[36px] border border-[#E5E5EA] rounded-[12px] px-[14px] flex-row items-center justify-between bg-white"
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

                    <View style={{ flex: 1 }}>
                      <TouchableOpacity
                        onPress={() => setShowRecordDatePicker(true)}
                        className="h-[36px] border border-[#E5E5E5] rounded-[12px] px-1 justify-center items-center bg-white"
                      >
                        <Text className="text-[14px] font-regular text-black text-center" numberOfLines={1} adjustsFontSizeToFit>
                          {formatShortDate(recordDate, isVi)}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {selectedType === 'vaccination' && showVaccineDropdown && (
                    <View className="bg-gray-50 border border-[#E5E5EA] rounded-[4px] mb-3 max-h-[160px]">
                      <View>
                        {VACCINE_OPTIONS[species].map((item) => (
                          <TouchableOpacity
                            key={item.id}
                            className="p-3 border-b border-gray-100"
                            onPress={() => { setVaccineType(item.id); setShowVaccineDropdown(false); }}
                          >
                            <Text className={`text-[12px] ${vaccineType === item.id ? 'text-[#E89B5A] font-bold' : 'text-gray-700'}`}>
                              {item.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {selectedType === 'vaccination' && vaccineType && vaccineType !== 'DOG_RABIES' && vaccineType !== 'CAT_RABIES' && vaccineType !== 'DOG_BORDETELLA' && (
                    <View className="flex-row items-center justify-between mb-3 bg-[#FAFAFA] p-2 rounded-[4px] border border-[#E5E5EA]">
                      <Text className="text-[12px] text-[#4B5563]">{isVi ? 'Đang trong Series / Lần đầu?' : 'In Series / First Dose?'}</Text>
                      <Switch
                        style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] }}
                        value={isSeries}
                        onValueChange={setIsSeries}
                        trackColor={{ false: '#E5E5EA', true: '#E89B5A' }}
                      />
                    </View>
                  )}

                  <TouchableOpacity
                    onPress={handleUploadPhotos}
                    activeOpacity={0.7}
                    className="flex-row border border-dashed border-[#E5E5E5] rounded-[12px] py-[12px] items-center justify-center mb-[17px]"
                  >
                    <Ionicons name="cloud-upload-outline" size={20} color="#9CA3AF" />
                    <Text className="text-[12px] text-[#000000] font-regular ml-2">
                      {isVi ? 'Tải ảnh lên (Tối đa 5)' : 'Upload Photos (Max 5)'}
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

                        <View style={{ flex: 1 }}>
                          <TouchableOpacity
                            onPress={() => setShowNextDatePicker(true)}
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
                className="h-[37px] w-2/3 rounded-[1000px] items-center justify-center bg-[#E89B5A]"
              >
                <Text className="font-medium text-[14px] text-white">
                  {isVi ? 'Lưu hồ sơ' : 'Submit Record'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </View>

      {/* --- XỬ LÝ DATE PICKER (Bypass lỗi Modal lồng nhau) --- */}

      {/* 1. iOS FIX: Tạo lớp overlay hiển thị giữa màn hình giống iOS Native */}
      {Platform.OS === 'ios' && (showRecordDatePicker || showNextDatePicker) && (
        <View className="absolute inset-0 z-[100] justify-center items-center">
          {/* Lớp nền tối mờ - Dùng inline style rgba để đảm bảo 100% ăn màu đen trong suốt giống Apple */}
          <TouchableOpacity
            activeOpacity={1}
            style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onPress={() => {
              setShowRecordDatePicker(false);
              setShowNextDatePicker(false);
            }}
          />
          
          {/* Container Picker - Tăng width lên 340 và dùng inline style để không bao giờ bị xén mép */}
          <Animated.View 
            style={{ width: 340, backgroundColor: '#ffffff', borderRadius: 14 }} 
            className="shadow-2xl relative z-10 overflow-hidden"
          >
            {/* Header với nút Huỷ / Xong */}
            <View className="flex-row justify-between items-center px-[16px] py-[12px] border-b border-[#E5E5EA]">
              <TouchableOpacity onPress={() => {
                setShowRecordDatePicker(false);
                setShowNextDatePicker(false);
              }}>
                <Text className="text-[16px] text-[#8E8E93]">{isVi ? 'Huỷ' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                setShowRecordDatePicker(false);
                setShowNextDatePicker(false);
              }}>
                <Text className="text-[16px] font-semibold text-[#E89B5A]">{isVi ? 'Xong' : 'Done'}</Text>
              </TouchableOpacity>
            </View>
            
            {/* Khối chứa lịch - Set alignSelf 'center' và căn đúng width native của iOS */}
            <View style={{ paddingTop: 8, paddingBottom: 12, alignItems: 'center' }}>
              <DateTimePicker
                value={showRecordDatePicker ? recordDate : nextDueDate}
                mode="date"
                display="inline" 
                themeVariant="light"
                locale={isVi ? "vi-VN" : "en-US"}
                minimumDate={showNextDatePicker ? new Date() : undefined}
                style={{ width: 320, alignSelf: 'center' }} // Cố định chiều rộng của riêng tờ lịch
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    if (showRecordDatePicker) setRecordDate(selectedDate);
                    if (showNextDatePicker) setNextDueDate(selectedDate);
                  }
                }}
              />
            </View>
          </Animated.View>
        </View>
      )}
      {/* 2. ANDROID: Render Dialog mặc định (Hệ điều hành tự nổi lên trên Modal) */}
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