import axiosClient from '@/api/axiosClient';
import AddMedicalRecordModal from '@/components/AddMedicalRecordModal';
import { Text } from '@/components/AppText';
import { TextInput } from '@/components/AppTextInput';
import ReportIssueModal, { ReportSubmitData } from '@/components/ReportIssueModal';
import { buildBreedBilingual, getBreedOptions, resolveBreedValue, resolveSpeciesValue, SPECIES_BILINGUAL } from '@/constants/breedData';
import { getMedicalRecordIcon } from '@/constants/medicalRecordIcons';
import { useLanguage } from '@/contexts/LanguageContext';
import { useModalStore } from '@/store/useModalStore';
import { buildBilingualOnSubmit } from '@/utils/autoTranslate';
import { displayBilingual, parseBilingual } from '@/utils/bilingualField';
import { Feather, Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  TouchableOpacity,
  View
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useImageUpload } from '../hooks/useImageUpload';
import { useTotalImageSize } from '../hooks/useTotalImageSize';
import { petService } from '../services/petService';
type GenderType = 'MALE' | 'FEMALE' | 'UNKNOWN';
type SpeciesType = 'Dog' | 'Cat';
type SizeType = 'SMALL' | 'MEDIUM' | 'LARGE';

const { width: SCREEN_WIDTH } = Dimensions.get('window');


// 🚀 NÂNG CẤP 1: Thêm các trường ngày tháng vào interface
interface EditPetFormData {
  name: string;
  species: SpeciesType | string;
  breed: string;
  color: string;
  weight: string;
  size: SizeType | string;
  dob: string;
  microchip: string;
  description: string;
  gender: GenderType;
  imageUrl: string;
  contactName: string;
  contactPhone: string;
  contactAddress: string;
  qrCodeUrl: string;
  sterilized: boolean | null;
  createdAt?: string;
  adoptedAt?: string;
  nameLastUpdatedAt?: string;
  status?: string;
}
function resolveErrorMessage(error: any, t: (key: string, params?: Record<string, string | number>) => string): string | null {
  const data = error;
  if (!data) return null;

  // BE trả { message, i18n: { key, params? } } NGAY ở top-level của response.data
  // (NestJS dùng trực tiếp object exception, không lồng thêm 1 lớp .message)
  const i18nKey = data.i18n?.key;
  if (i18nKey) {
    return t(i18nKey, data.i18n?.params || {});
  }

  // Không có i18n -> rơi về message gốc (luôn tiếng Anh, ví dụ lỗi validate DTO của class-validator)
  if (Array.isArray(data.message)) return data.message.join('\n');
  if (typeof data.message === 'string') return data.message;

  return null;
}

// =====================================================================
// 🚀 ĐỒNG BỘ UI: Helper lấy text bilingual an toàn cho recordName/nextDueName
// (Giống hệt getSafeBilingualText trong pet-profile-detail)
// =====================================================================
const getSafeBilingualText = (val: any, isVi: boolean) => {
  if (!val) return '';
  if (typeof val === 'string') {
    if (val.trim().startsWith('{')) {
      try {
        const p = JSON.parse(val);
        return isVi ? (p.vi || p.en) : (p.en || p.vi);
      } catch { return val; }
    }
    return val;
  }
  if (typeof val === 'object') {
    return isVi ? (val.vi || val.en) : (val.en || val.vi);
  }
  return String(val);
};

// =====================================================================
// 🚀 ĐỒNG BỘ UI: Badge config GIỐNG HỆT getMedicalRecordBadgeConfig
// trong pet-profile-detail (cùng màu sắc, icon, label cho từng trạng thái)
// =====================================================================
const getMedicalRecordBadgeConfig = (status: string | undefined, isVi: boolean) => {
  if (status === 'DISPUTED') {
    return {
      bgColor: '#FFEAF2',
      borderColor: '#F7BFD8',
      color: '#D6447A',
      icon: 'alert-triangle' as const,
      label: isVi ? 'Cần xem xét' : 'Disputed',
    };
  }
  if (status === 'VERIFIED') {
    return {
      bgColor: '#EBFFE2',
      borderColor: '#D1F5BF',
      color: '#77C852',
      icon: 'check-circle' as const,
      label: isVi ? 'Đã xác minh' : 'Verified',
    };
  }
  // PENDING hoặc chưa có status
  return {
    bgColor: '#FBF7EB',
    borderColor: '#F3E1AE',
    color: '#E8A53C',
    icon: 'info' as const,
    label: isVi ? 'Đang xác minh' : 'Reviewing',
  };
};

const Label = ({ text, required = false }: { text: string; required?: boolean }) => (
  <Text className="text-[#8E8E93] text-[14px] font-medium mb-2 mt-4">
    {text} {required && <Text className="text-red-500">*</Text>}
  </Text>
);

const CustomInput = ({ value, onChangeText, placeholder }: { value?: string; onChangeText?: (text: string) => void; placeholder?: string }) => (
  <View>
    <TextInput
      className="w-full bg-white border border-[#E5E5E5] rounded-[16px] px-4 text-black h-14"
      placeholder={placeholder}
      placeholderTextColor="#9CA3AF"
      value={value}
      onChangeText={onChangeText}
      style={{ fontFamily: "Urbanist-Regular" }}
    />
  </View>
);

const CustomDropdown = ({ placeholder, value, options = [], onSelect, isVi }: { placeholder: string; value?: string; options?: string[]; onSelect?: (val: string) => void; isVi: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Các biến font động
  const fontMedium = isVi ? 'BeVietnamPro-Medium' : 'Urbanist-Medium';
  const fontRegular = isVi ? 'BeVietnamPro-Regular' : 'Urbanist-Regular';
  const fontBold = isVi ? 'BeVietnamPro-Bold' : 'Urbanist-Bold';

  return (
    <View>
      <TouchableOpacity
        onPress={() => setIsOpen((prev) => !prev)}
        activeOpacity={0.7}
        className={`w-full bg-white border border-[#E5E5E5] rounded-[16px] h-14 px-4 flex-row items-center justify-between ${isOpen ? 'border-[#E89B5A]' : ''}`}
      >
        <Text
          className={`${value ? 'text-black' : 'text-[#9CA3AF]'} text-[14px] font-medium`}
          numberOfLines={1}
          style={{ fontFamily: fontMedium }} // DÙNG BIẾN ĐỘNG
        >
          {value || placeholder}
        </Text>
        <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={20} color="#9CA3AF" />
      </TouchableOpacity>

      {isOpen && (
        <View
          className="w-full bg-white border border-[#E5E5E5] rounded-[16px] mt-2 overflow-hidden"
          style={{ maxHeight: 220 }}
        >
          {options.length === 0 ? (
            <View className="px-4 py-4">
              <Text className="text-[13px] text-[#9CA3AF] italic">Không có lựa chọn nào</Text>
            </View>
          ) : (
            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
              {options.map((item) => {
                const isSelected = item === value;
                return (
                  <TouchableOpacity
                    key={item}
                    className={`px-4 py-3.5 border-b border-gray-50 flex-row items-center justify-between ${isSelected ? 'bg-orange-50' : ''}`}
                    onPress={() => {
                      if (onSelect) onSelect(item);
                      setIsOpen(false);
                    }}
                  >
                    <Text
                      className={`text-[14px] ${isSelected ? 'text-[#E89B5A] font-bold' : 'text-gray-700'}`}
                      style={{ fontFamily: isSelected ? fontBold : fontRegular }} // DÙNG BIẾN ĐỘNG
                    >
                      {item}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={18} color="#E89B5A" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
};

// =====================================================================
// 🚀 FIX 2: Tách riêng Component MedicalRecordItem và bọc React.memo
// Component này chỉ render lại khi props của chính nó thay đổi,
// giúp tránh việc tính toán Date nặng nề khi người dùng đang gõ tên.
//
// 🚀 ĐỒNG BỘ UI: Layout + badge giống hệt khối render medicalRecords.map
// trong pet-profile-detail (không còn chú thích DISPUTED hiển thị inline
// dưới card — chú thích này giờ chỉ hiện trong menu, giống pet-profile-detail).
// =====================================================================
interface MedicalRecordItemProps {
  record: any;
  index: number;
  isVi: boolean;
  onOpenMenu: (index: number, images: string[], pageY: number, status: string) => void;
}

const MedicalRecordItem = memo(({ record, index, isVi, onOpenMenu }: MedicalRecordItemProps) => {
  const formattedRecordDate = record.recordDate ? new Date(record.recordDate).toLocaleDateString(isVi ? 'vi-VN' : 'en-US') : '';
  const formattedNextDueDate = record.nextDueDate ? new Date(record.nextDueDate).toLocaleDateString(isVi ? 'vi-VN' : 'en-US') : '';
  const displayRecordName = getSafeBilingualText(record.recordName, isVi) || displayBilingual(parseBilingual(record.recordName), isVi);

  const status = record.verificationStatus || 'PENDING';
  const imageList = Array.isArray(record.images) ? record.images.filter(Boolean) : [];
  const shouldShowNextDueDate = record.hasNextDueDate && !!record.nextDueDate;

  const badge = getMedicalRecordBadgeConfig(status, isVi);
  const sizeKB = useTotalImageSize(imageList);
  const recordIcon = getMedicalRecordIcon(record.type);

  return (
    <View className="mb-4">
      {/* Chuyển flex-row thành flex-col để chứa nhiều block dọc */}
      <View className="border border-[#E5E5E5] rounded-[16px] p-3 flex-col items-start bg-[#FFFF] shadow-sm shadow-orange-100/50">

        {/* --- KHỐI THÔNG TIN CHÍNH CỦA RECORD --- */}
        <View className="flex-row items-start w-full">
          <View
            className="w-[30px] h-[30px] rounded-[100px] items-center justify-center"
            style={{ backgroundColor: '#EDEDED' }}
          >
            <Image
              source={getMedicalRecordIcon(record.type)}
              style={{ width: 18, height: 18, tintColor: '#999999' }}
              resizeMode="contain"
            />
          </View>
          <View className="flex-1 mx-3">
            <View className="flex-row justify-between items-center">
              <View className="flex-1 flex-row flex-wrap items-center pr-2">
                <Text className="text-[14px] text-[#000000] font-medium leading-[16px] mr-2" numberOfLines={1}>
                  {displayRecordName || (isVi ? "Hồ sơ vô danh" : "Unnamed Record")}
                </Text>
                <View
                  className="flex-row items-center px-2 py-[3px] rounded-full border"
                  style={{ backgroundColor: badge.bgColor, borderColor: badge.borderColor }}
                >
                  <Feather
                    name={badge.icon}
                    size={10}
                    color={badge.color}
                  />
                  <Text
                    className="text-[10px] font-medium ml-1"
                    style={{ color: badge.color }}
                  >
                    {badge.label}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onOpenMenu(index, imageList, e.nativeEvent.pageY, status);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Image source={require('../assets/icon/more-vertical.png')} style={{ width: 11.1, height: 11.1 }} resizeMode="cover" />
              </TouchableOpacity>
            </View>
            <Text className="text-[10px] font-regular text-[#8E8E93] tracking-[0.5px]">
              {sizeKB !== null ? `${sizeKB}KB • ` : ''}
              {isVi ? 'Gửi lúc' : 'Submitted on'} {formattedRecordDate}
            </Text>
          </View>
        </View>

        {/* --- KHỐI CHI TIẾT TIÊM PHÒNG (READ-ONLY) --- */}
        {record.vaccineDoses && record.vaccineDoses.length > 0 && (
          <View className="w-full mt-3 bg-[#F9FAFB] border border-[#E5E5E5] rounded-[4px] p-2.5">
            <Text className="text-[12px] font-semibold text-[#6B7280] mb-2">
              {isVi ? 'Chi tiết mũi tiêm (Chỉ xem)' : 'Vaccination Details (Read-only)'}
            </Text>

            {record.vaccineDoses.slice(0, 3).map((dose: any, idx: number) => (
              <View
                key={idx}
                className={`flex-row justify-between items-center py-1.5 ${idx !== Math.min(record.vaccineDoses.length - 1, 2) ? 'border-b border-[#F3F4F6]' : ''
                  }`}
              >
                <View className="flex-row items-center">
                  <Feather
                    name="check-circle"
                    size={12}
                    color={dose.status === 'COMPLETED' ? '#E89B5A' : '#D1D5DB'}
                  />
                  <Text className="text-[13px] text-[#4B5563] ml-2 font-medium">
                    {isVi ? `Mũi ${idx + 1}` : `Dose ${idx + 1}`}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-[13px] font-semibold text-[#111827]">
                    {dose.name || '-'}
                  </Text>
                  <Text className="text-[11px] text-[#9CA3AF] mt-0.5">
                    {dose.date || '-'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.record === nextProps.record &&
    prevProps.isVi === nextProps.isVi &&
    prevProps.index === nextProps.index
  );
});
// =====================================================================


export default function EditPetScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const id = params.id as string;

  const openMedicalModalParam = Array.isArray(params.openMedicalModal)
    ? params.openMedicalModal[0]
    : params.openMedicalModal;

  const shouldAutoOpenMedicalModal = openMedicalModalParam === '1';
  const showModal = useModalStore((state) => state.showModal);
  const { t, language } = useLanguage();
  const isVi = language === 'vi';
  const defaultFont = isVi ? 'BeVietnamPro-Regular' : 'Urbanist-Regular';
  const insets = useSafeAreaInsets();

  const { pickAndUploadImage: pickAvatar, isUploading: isUploadingAvatar } = useImageUpload();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State Android Picker
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isCustomBreed, setIsCustomBreed] = useState(false);

  // State quản lý Medical Records mới
  const [showMedicalModal, setShowMedicalModal] = useState(false);
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [isUploadingRecords, setIsUploadingRecords] = useState(false);
  const hasAutoOpenedMedicalModal = useRef(false);
  const [showMedicalRecordMenu, setShowMedicalRecordMenu] = useState(false);
  const [medicalRecordMenuPosition, setMedicalRecordMenuPosition] = useState({ top: 0, right: 32 });
  const [selectedMedicalRecordIndex, setSelectedMedicalRecordIndex] = useState<number | null>(null);
  const [currentMedicalRecordImages, setCurrentMedicalRecordImages] = useState<string[]>([]);
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedRecordStatus, setSelectedRecordStatus] = useState<string>('PENDING');

  // 🚀 ĐỒNG BỘ UI: State View / Edit / Report cho 1 medical record — giống hệt pet-profile-detail
  const [showViewMedicalModal, setShowViewMedicalModal] = useState(false);
  const [viewingMedicalRecord, setViewingMedicalRecord] = useState<any | null>(null);
  const [showEditMedicalRecordModal, setShowEditMedicalRecordModal] = useState(false);
  const [editingMedicalRecord, setEditingMedicalRecord] = useState<any | null>(null);
  const [showReportMedicalRecordModal, setShowReportMedicalRecordModal] = useState(false);
  const [reportingMedicalRecord, setReportingMedicalRecord] = useState<any | null>(null);
  const [isSavingMedicalRecord, setIsSavingMedicalRecord] = useState(false);

  const handleOpenMedicalRecordMenu = useCallback((index: number, images: string[], pageY: number, status: string) => {
    setMedicalRecordMenuPosition({ top: pageY + 10, right: 32 });
    setSelectedMedicalRecordIndex(index);
    setCurrentMedicalRecordImages(images);
    setSelectedRecordStatus(status); // Lưu trạng thái hiện tại
    setCurrentImageIndex(0);
    setShowMedicalRecordMenu(true);
  }, []);
  useEffect(() => {
    if (isLoading) return;
    if (!shouldAutoOpenMedicalModal) return;
    if (hasAutoOpenedMedicalModal.current) return;

    hasAutoOpenedMedicalModal.current = true;

    requestAnimationFrame(() => {
      setShowMedicalModal(true);
    });
  }, [isLoading, shouldAutoOpenMedicalModal]);

  // 🚀 FIX 3: Khai báo hàm xoá record với useCallback để tránh tạo function mới mỗi lần render
  const handleDeleteMedicalRecord = useCallback((indexToDelete: number) => {
    setMedicalRecords(prev => prev.filter((_, i) => i !== indexToDelete));
  }, []);

  // 🚀 ĐỒNG BỘ UI: Sửa hồ sơ y tế (record đang PENDING) — cập nhật state local,
  // sẽ được gửi lên Backend khi người dùng bấm "Lưu thay đổi" của toàn màn hình.
  const handleUpdateMedicalRecordLocal = useCallback((recordId: string | undefined, recordIndex: number, payload: any) => {
    setMedicalRecords(prev => prev.map((r, i) => {
      const matches = recordId ? r.id === recordId : i === recordIndex;
      if (!matches) return r;
      return {
        ...r,
        type: payload.type,
        recordName: payload.recordName,
        recordDate: payload.recordDate,
        images: payload.images,
        hasNextDueDate: payload.hasNextDueDate,
        nextDueDate: payload.hasNextDueDate ? payload.nextDueDate : null,
        nextDueName: payload.hasNextDueDate ? payload.nextDueName : null,
      };
    }));
    setShowEditMedicalRecordModal(false);
    setEditingMedicalRecord(null);
  }, []);

  // 🚀 ĐỒNG BỘ UI: Cập nhật riêng "Lịch tiếp theo" từ modal View — giống pet-profile-detail
  const handleUpdateNextDueOnlyLocal = useCallback((recordId: string | undefined, recordIndex: number, payload: any) => {
    setMedicalRecords(prev => prev.map((r, i) => {
      const matches = recordId ? r.id === recordId : i === recordIndex;
      if (!matches) return r;

      // 🚀 Lấy cờ hasNextDueDate từ payload thay vì gán cứng true
      return {
        ...r,
        hasNextDueDate: payload.hasNextDueDate,
        nextDueName: payload.nextDueName,
        nextDueDate: payload.nextDueDate
      };
    }));
    setShowViewMedicalModal(false);
    setViewingMedicalRecord(null);
  }, []);

  // 🚀 ĐỒNG BỘ UI: Báo cáo hồ sơ y tế đã VERIFIED — gọi API ngay (giống pet-profile-detail)
  // vì hồ sơ đã tồn tại trên Backend (có id thật), không cần đợi "Lưu thay đổi".
  const handleReportMedicalRecord = useCallback(async (data: ReportSubmitData) => {
    if (!reportingMedicalRecord?.id) return;

    await petService.reportMedicalRecord(id as string, reportingMedicalRecord.id, {
      reason: data.reason,
      details: data.details,
    });

    setMedicalRecords(prev => prev.map((r) =>
      r.id === reportingMedicalRecord.id ? { ...r, verificationStatus: 'DISPUTED' } : r
    ));
  }, [reportingMedicalRecord, id]);

  const handleDownloadMedicalRecordImage = async (url: string, fileName: string) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          isVi ? 'Thiếu quyền' : 'Permission Required',
          isVi
            ? 'Cần cấp quyền truy cập thư viện ảnh để lưu ảnh.'
            : 'Photo library permission is required to save the image.'
        );
        return;
      }

      if (url.startsWith('file://') || url.startsWith('content://')) {
        await MediaLibrary.saveToLibraryAsync(url);
      } else {
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        const downloadRes = await FileSystem.downloadAsync(url, fileUri);
        await MediaLibrary.saveToLibraryAsync(downloadRes.uri);
      }

      Alert.alert(
        isVi ? 'Thành công' : 'Success',
        isVi ? 'Ảnh đã được lưu vào thư viện ảnh!' : 'Image has been saved to your photos!'
      );
    } catch (error) {
      console.error('Lỗi tải file:', error);
      Alert.alert(
        isVi ? 'Lỗi' : 'Error',
        isVi ? 'Không thể tải xuống ảnh này lúc này.' : 'Unable to download this image right now.'
      );
    }
  };

  const handleDownloadMedicalRecordImages = async (urls: string[]) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          isVi ? 'Thiếu quyền' : 'Permission Required',
          isVi
            ? 'Cần cấp quyền truy cập thư viện ảnh để lưu ảnh.'
            : 'Photo library permission is required to save images.'
        );
        return;
      }

      let successCount = 0;

      for (let i = 0; i < urls.length; i++) {
        try {
          const url = urls[i];
          if (url.startsWith('file://') || url.startsWith('content://')) {
            await MediaLibrary.saveToLibraryAsync(url);
          } else {
            const fileUri = `${FileSystem.documentDirectory}medical_record_${Date.now()}_${i}.jpg`;
            const downloadRes = await FileSystem.downloadAsync(url, fileUri);
            await MediaLibrary.saveToLibraryAsync(downloadRes.uri);
          }
          successCount++;
        } catch (err) {
          console.error(`Lỗi tải ảnh ${i}:`, err);
        }
      }

      if (successCount === urls.length) {
        Alert.alert(
          isVi ? 'Thành công' : 'Success',
          isVi
            ? `Đã lưu ${successCount} ảnh vào thư viện ảnh!`
            : `Saved ${successCount} image(s) to your photos!`
        );
      } else if (successCount > 0) {
        Alert.alert(
          isVi ? 'Hoàn tất một phần' : 'Partially Completed',
          isVi
            ? `Đã lưu ${successCount}/${urls.length} ảnh. Một số ảnh không thể tải.`
            : `Saved ${successCount}/${urls.length} image(s). Some images failed to download.`
        );
      } else {
        Alert.alert(
          isVi ? 'Lỗi' : 'Error',
          isVi ? 'Không thể tải xuống ảnh.' : 'Unable to download images.'
        );
      }
    } catch (error) {
      console.error('Lỗi tải nhiều ảnh:', error);
      Alert.alert(
        isVi ? 'Lỗi' : 'Error',
        isVi ? 'Không thể tải xuống ảnh lúc này.' : 'Unable to download images right now.'
      );
    }
  };

  // 🚀 NÂNG CẤP 2: Thêm state quản lý UI khóa
  const [lockStatus, setLockStatus] = useState({
    isCoreLocked: false,
    isNameLocked: false,
    nameLockDaysLeft: 0
  });

  // 2. ĐỒNG BỘ POPUP ADDRESS (API V2)
  const [showAddressPopup, setShowAddressPopup] = useState(false);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [wardOptions, setWardOptions] = useState<string[]>([]);

  const [tempCity, setTempCity] = useState('');
  const [tempWard, setTempWard] = useState('');
  const [tempDetail, setTempDetail] = useState('');

  const speciesData = [
    { label: isVi ? 'Chó' : 'Dog', value: 'Dog' },
    { label: isVi ? 'Mèo' : 'Cat', value: 'Cat' },
  ];

  const genderData = [
    { label: isVi ? 'Đực' : 'Male', value: 'MALE' },
    { label: isVi ? 'Cái' : 'Female', value: 'FEMALE' },
  ];

  const scrollViewRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const dobRef = useRef<View>(null);

  const [activePicker, setActivePicker] = useState<'dob' | null>(null);
  const [pickerLayout, setPickerLayout] = useState({ x: 0, y: 0, width: 340 });
  const pickerOpacity = useRef(new Animated.Value(0)).current;
  const pickerTranslateY = useRef(new Animated.Value(-8)).current;

  const openDropdownPicker = (type: 'dob') => {
    Keyboard.dismiss();

    if (contentRef.current && dobRef.current) {
      dobRef.current.measureLayout(
        contentRef.current,
        (left, top, width, height) => {
          scrollViewRef.current?.scrollTo({ y: Math.max(0, top - 120), animated: true });

          setTimeout(() => {
            dobRef.current?.measureInWindow((x, windowY, w, h) => {
              const dropdownWidth = 340;
              const finalX = (SCREEN_WIDTH - dropdownWidth) / 2;

              setPickerLayout({ x: finalX, y: windowY + h + 8, width: dropdownWidth });
              setActivePicker(type);

              Animated.parallel([
                Animated.timing(pickerOpacity, { toValue: 1, duration: 200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                Animated.timing(pickerTranslateY, { toValue: 0, duration: 250, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true })
              ]).start();
            });
          }, 350);
        },
        () => console.log('Lỗi không thể đo kích thước layout')
      );
    }
  };

  const closeDropdownPicker = () => {
    Animated.parallel([
      Animated.timing(pickerOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(pickerTranslateY, { toValue: -8, duration: 150, useNativeDriver: true })
    ]).start(() => setActivePicker(null));
  };

  useEffect(() => {
    fetch('https://provinces.open-api.vn/api/v2/p/')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const formattedProvinces = data
            .map((p: any) => ({
              ...p,
              name: p.name.replace(/^(Thành phố |Tỉnh )/i, '')
            }))
            .sort((a: any, b: any) => a.name.localeCompare(b.name, 'vi'));

          setProvinces(formattedProvinces);
        }
      })
      .catch(e => console.error(isVi ? "Lỗi fetch tỉnh/thành phố:" : "Error fetching provinces:", e));
  }, [isVi]);

  const cityOptions = provinces.map((c: any) => c.name);

  useEffect(() => {
    if (!tempCity) {
      setWardOptions([]);
      return;
    }

    const selectedProvince = provinces.find((p: any) => p.name === tempCity);

    if (selectedProvince && selectedProvince.code) {
      fetch(`https://provinces.open-api.vn/api/v2/w/?province=${selectedProvince.code}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            const sortedWards = data
              .sort((a: any, b: any) => a.name.localeCompare(b.name, 'vi'))
              .map((ward: any) => ward.name);

            setWardOptions(sortedWards);
          }
        })
        .catch(e => console.error(isVi ? "Lỗi fetch phường/xã:" : "Error fetching wards:", e));
    }
  }, [tempCity, provinces, isVi]);

  const handleConfirmAddress = () => {
    if (!tempCity || !tempWard) {
      Alert.alert(
        isVi ? "Thiếu thông tin" : "Missing Information",
        isVi ? "Vui lòng chọn Tỉnh/Thành phố và Phường/Xã." : "Please select City/Province and Ward/District."
      );
      return;
    }
    let fullAddress = `${tempWard}, ${tempCity}`;
    if (tempDetail.trim()) {
      fullAddress = `${tempDetail.trim()}, ${fullAddress}`;
    }
    handleChange('contactAddress', fullAddress);
    setShowAddressPopup(false);
  };

  const [formData, setFormData] = useState<EditPetFormData>({
    name: '',
    species: 'UNKNOWN',
    breed: '',
    color: '',
    weight: '',
    size: 'MEDIUM',
    dob: '',
    microchip: '',
    description: '',
    gender: 'UNKNOWN',
    imageUrl: '',
    contactName: '',
    contactPhone: '',
    contactAddress: '',
    qrCodeUrl: '',
    sterilized: null,
  });
  const [originalBilingual, setOriginalBilingual] = useState<{ color: BilingualValue; description: BilingualValue }>({
    color: { vi: '', en: '' },
    description: { vi: '', en: '' },
  });

  const inputFontStyle = { fontFamily: 'Urbanist-Regular' };

  // Fetch dữ liệu thú cưng
  useEffect(() => {
    const fetchPet = async () => {
      try {
        const data = await petService.getPetById(id as string);
        const colorBi = parseBilingual(data.color);
        const descBi = parseBilingual(data.description);
        setOriginalBilingual({ color: colorBi, description: descBi });

        const resolvedSpecies = resolveSpeciesValue(data.species);
        const resolvedBreed = resolveBreedValue(data.breed, resolvedSpecies);


        setFormData({
          name: data.name || '',
          species: resolvedSpecies,
          breed: resolvedBreed.value,
          color: displayBilingual(colorBi, isVi),
          size: data.size || 'MEDIUM',
          weight: data.weight ? data.weight.toString() : '',
          dob: data.dob ? new Date(data.dob).toISOString() : '',
          microchip: data.microchipNumber || '',
          description: displayBilingual(descBi, isVi),
          gender: (data.gender as GenderType) || 'UNKNOWN',
          imageUrl: data.avatarUrl || data.images?.[0]?.url || '',
          contactName: data.contactName || '',
          contactPhone: data.contactPhone || '',
          contactAddress: data.contactAddress || '',
          qrCodeUrl: data.qrCodeUrl || '',
          sterilized: data.isSpayedNeutered !== undefined ? data.isSpayedNeutered : null,
          createdAt: data.createdAt,
          adoptedAt: data.adoptedAt,
          nameLastUpdatedAt: data.nameLastUpdatedAt,
          status: data.status,
        });
        setIsCustomBreed(resolvedBreed.isCustom);

        if (data.medicalRecords && Array.isArray(data.medicalRecords)) {
          setMedicalRecords(data.medicalRecords);
        }

        // 🚀 NÂNG CẤP 3: Xử lý tính toán ngày và trạng thái khóa
        const now = new Date();
        const createdAtDate = new Date(data.createdAt || now);
        const daysSinceCreation = Math.floor((now.getTime() - createdAtDate.getTime()) / (1000 * 60 * 60 * 24));

        const isCoreLocked = daysSinceCreation >= 7;

        let isNameLocked = false;
        let nameLockDaysLeft = 0;

        const isAdopted = data.status === 'ADOPTED';
        const daysSinceAdoption = data.adoptedAt
          ? Math.floor((now.getTime() - new Date(data.adoptedAt).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        if (!(isAdopted && daysSinceAdoption <= 30)) {
          if (data.nameLastUpdatedAt) {
            const daysSinceNameUpdate = Math.floor((now.getTime() - new Date(data.nameLastUpdatedAt).getTime()) / (1000 * 60 * 60 * 24));
            if (daysSinceNameUpdate < 14) {
              isNameLocked = true;
              nameLockDaysLeft = 14 - daysSinceNameUpdate;
            }
          }
        }

        setLockStatus({ isCoreLocked, isNameLocked, nameLockDaysLeft });

      } catch (error) {
        Alert.alert(isVi ? "Lỗi" : "Error", isVi ? "Không thể tải thông tin thú cưng." : "Could not load pet information.");
        router.back();
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchPet();
  }, [id, isVi]);

  const handlePickAvatar = async () => {
    const uploadedUrl = await pickAvatar({ folder: 'pets', aspect: [1, 1], quality: 0.8 });
    if (uploadedUrl) handleChange('imageUrl', uploadedUrl);
  };

  const handleChange = useCallback((field: keyof EditPetFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);
  const currentBreedOptions = useMemo(() => {
    return getBreedOptions((formData.species as string) || 'Dog', isVi);
  }, [formData.species, isVi]);
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
      Alert.alert(isVi ? 'Thiếu thông tin' : 'Missing Information', isVi ? 'Vui lòng nhập tên thú cưng.' : "Please enter the pet's name.");
      return;
    }

    try {
      setIsSubmitting(true);
      setIsUploadingRecords(true);
      const species = (formData.species as 'Dog' | 'Cat') || 'Dog';
      const [colorBilingual, descriptionBilingual, breedBilingual] = await Promise.all([
        buildBilingualOnSubmit(formData.color, originalBilingual.color, isVi),
        buildBilingualOnSubmit(formData.description, originalBilingual.description, isVi),
        formData.breed
          ? (buildBreedBilingual(formData.breed, species) ??
            buildBilingualOnSubmit(formData.breed, { vi: '', en: '' }, isVi))
          : Promise.resolve(null),
      ]);

      const finalMedicalRecords = await Promise.all(
        medicalRecords.map(async (record) => {
          // 🚀 FIX: Chủ động stringify các object đa ngôn ngữ
          const formattedRecordName = typeof record.recordName === 'object' ? JSON.stringify(record.recordName) : record.recordName;
          const formattedNextDueName = record.nextDueName && typeof record.nextDueName === 'object' ? JSON.stringify(record.nextDueName) : record.nextDueName;

          if (!record.images || record.images.length === 0) {
            return { ...record, recordName: formattedRecordName, nextDueName: formattedNextDueName };
          }

          const uploadedImages = await Promise.all(
            record.images.map(async (uri: string) => {
              if (uri.startsWith('http')) return uri;
              try {
                const filename = uri.split('/').pop() || `medical-record-${Date.now()}.jpg`;
                const match = /\.(\w+)$/.exec(filename);
                const ext = match ? match[1].toLowerCase() : 'jpeg';
                let type = 'image/jpeg';
                if (ext === 'png') type = 'image/png';
                else if (ext === 'webp') type = 'image/webp';

                const presignedRes = await axiosClient.post('/storage/presigned-url', {
                  fileName: filename, fileType: type, folder: 'medical-records'
                });
                const { uploadUrl, fileUrl } = presignedRes.data;
                const localFileFetch = await fetch(uri);
                const fileBlob = await localFileFetch.blob();
                const uploadRes = await fetch(uploadUrl, {
                  method: 'PUT', headers: { 'Content-Type': type }, body: fileBlob
                });
                if (!uploadRes.ok) throw new Error('Upload R2 failed');
                return fileUrl;
              } catch (fileError) {
                console.error(`[Upload Lỗi] Không thể upload ảnh ${uri}:`, fileError);
                return null;
              }
            })
          );

          return {
            ...record,
            images: uploadedImages.filter(Boolean),
            recordName: formattedRecordName,
            nextDueName: formattedNextDueName
          };
        })
      );

      setMedicalRecords(finalMedicalRecords);

      const payload: any = {
        name: formData.name,
        species: SPECIES_BILINGUAL[species],
        breed: breedBilingual,
        gender: formData.gender !== 'UNKNOWN' ? formData.gender : null,
        color: colorBilingual,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        size: formData.size || null,
        microchipNumber: formData.microchip || null,
        description: descriptionBilingual,
        contactName: formData.contactName || null,
        contactPhone: formData.contactPhone || null,
        contactAddress: formData.contactAddress || null,
        images: formData.imageUrl ? [formData.imageUrl] : [],
        qrCodeUrl: formData.qrCodeUrl || null,
        isSpayedNeutered: formData.sterilized !== null ? formData.sterilized : null,
        medicalRecords: finalMedicalRecords,
      };

      if (formData.dob) {
        payload.dob = formData.dob;
      }

      await petService.updatePet(id as string, payload);

      showModal({
        title: isVi ? 'Thành công' : 'Success',
        message: isVi ? 'Cập nhật hồ sơ thú cưng thành công!' : 'Pet profile updated successfully!',
        buttonText: isVi ? 'Trở lại' : 'Back',
        onConfirm: () => router.back(),
      });

    } catch (error: any) {
      // Bắt lỗi từ Backend và hiển thị Alert lên UI
      const displayMsg = resolveErrorMessage(error, t) || error.message || (isVi ? 'Cập nhật thất bại. Vui lòng thử lại.' : 'Failed to update pet. Please try again.');
      Alert.alert(isVi ? 'Lỗi' : 'Error', displayMsg);
    } finally {
      setIsSubmitting(false);
      setIsUploadingRecords(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#EFA062" />
      </View>
    );
  }

  const selectedMedicalRecord = selectedMedicalRecordIndex !== null
    ? medicalRecords[selectedMedicalRecordIndex]
    : null;
  const selectedMedicalRecordIsPending = !!selectedMedicalRecord && (
    selectedMedicalRecord.verificationStatus === 'PENDING' || !selectedMedicalRecord.verificationStatus
  );
  const selectedMedicalRecordIsVerified = selectedRecordStatus === 'VERIFIED';
  const selectedMedicalRecordIsDisputed = selectedRecordStatus === 'DISPUTED';

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
              className="w-8 h-8 items-start justify-center"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="chevron-left" size={24} color="#000000" />
            </TouchableOpacity>
            <Text className="text-[18px] font-semibold text-[#000000]">{isVi ? 'Chỉnh sửa hồ sơ' : 'Edit Pet Profile'}</Text>
            <View className="w-8" />
          </View>

          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 60, paddingHorizontal: 20 }}
            className="flex-1"
          >
            {/* Wrapper lấy tọa độ để căn scroll */}
            <View ref={contentRef} collapsable={false}>

              {/* Avatar Section */}
              <View className="items-center mt-6 mb-8">
                <TouchableOpacity
                  onPress={handlePickAvatar}
                  disabled={isUploadingAvatar}
                  className="w-32 h-32 rounded-full bg-[#FAFAFA] border border-gray-200 items-center justify-center overflow-hidden shadow-sm"
                >
                  {isUploadingAvatar ? (
                    <ActivityIndicator size="large" color="#EFA062" />
                  ) : formData.imageUrl ? (
                    <Image
                      source={{ uri: formData.imageUrl }}
                      className="w-full h-full"
                    />
                  ) : (
                    <Feather name="camera" size={32} color="#9CA3AF" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Pet Information Section */}
              <View className="mb-6">
                <Text className="text-[16px] font-semibold text-black mb-3">{isVi ? 'Thông tin thú cưng' : 'Pet Information'}</Text>

                <View className="bg-white p-6 rounded-[20px] border border-gray-200">

                  {/* 1. Name & Type Row */}
                  <View className="flex-row gap-3 mb-5">
                    <View className="flex-1">
                      {/* 🚀 NÂNG CẤP 4: UI báo hiệu KHÓA TÊN */}
                      <View className="flex-row items-center mb-1.5">
                        <Text className="text-[14px] text-black font-medium">{isVi ? 'Tên' : 'Name'}</Text>
                        {lockStatus.isNameLocked && <Feather name="lock" size={12} color="#9CA3AF" style={{ marginLeft: 4 }} />}
                      </View>
                      <TextInput
                        style={inputFontStyle}
                        editable={!lockStatus.isNameLocked}
                        className={`h-[34px] border rounded-[12px] px-3.5 text-[14px] ${lockStatus.isNameLocked ? 'bg-[#F9FAFB] border-transparent text-[#9CA3AF]' : 'bg-white border-[#E5E5E5] text-black'}`}
                        value={formData.name}
                        onChangeText={(text) => handleChange('name', text)}
                        placeholder={isVi ? "Tên thú cưng" : "Pet name"}
                        placeholderTextColor="#A1A1AA"
                      />
                      {lockStatus.isNameLocked && (
                        <Text className="text-[10px] text-[#E89B5A] mt-1 font-medium italic">
                          {isVi ? `Có thể đổi sau ${lockStatus.nameLockDaysLeft} ngày nữa` : `Changeable in ${lockStatus.nameLockDaysLeft} days`}
                        </Text>
                      )}
                    </View>
                    <View className="flex-1">
                      {/* 🚀 NÂNG CẤP 5: UI báo hiệu KHÓA LOÀI */}
                      <View className="flex-row items-center mb-1.5">
                        <Text className="text-[14px] text-black font-medium">{isVi ? 'Loài' : 'Type'}</Text>
                        {(lockStatus.isCoreLocked && formData.species && formData.species !== 'UNKNOWN') && <Feather name="lock" size={12} color="#9CA3AF" style={{ marginLeft: 4 }} />}
                      </View>
                      <Dropdown
                        disable={lockStatus.isCoreLocked && !!formData.species && formData.species !== 'UNKNOWN'}
                        style={{ height: 34, borderColor: (lockStatus.isCoreLocked && !!formData.species && formData.species !== 'UNKNOWN') ? 'transparent' : '#E5E7EB', borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, backgroundColor: (lockStatus.isCoreLocked && !!formData.species && formData.species !== 'UNKNOWN') ? '#F9FAFB' : '#FFFFFF' }}
                        containerStyle={{ borderRadius: 12, overflow: 'hidden', marginTop: 2, borderColor: '#E5E7EB', borderWidth: 1 }}
                        placeholderStyle={{ fontSize: 14, color: '#9CA3AF', fontFamily: defaultFont }}
                        selectedTextStyle={{ fontSize: 14, color: (lockStatus.isCoreLocked && !!formData.species && formData.species !== 'UNKNOWN') ? '#9CA3AF' : '#000000', fontFamily: defaultFont }}
                        itemTextStyle={{ fontSize: 14, color: '#000000', fontFamily: defaultFont }}
                        data={speciesData}
                        maxHeight={200}
                        labelField="label"
                        valueField="value"
                        placeholder={isVi ? 'Chọn loài' : 'Select type'}
                        value={formData.species}
                        onChange={(item) => {
                          handleChange('species', item.value);
                          handleChange('breed', '');
                        }}
                      />
                    </View>
                  </View>

                  {/* 2. Gender & Sterilized Row */}
                  <View className="flex-row gap-3 mb-5">
                    <View className="flex-1">
                      {/* 🚀 NÂNG CẤP 6: UI báo hiệu KHÓA GIỚI TÍNH */}
                      <View className="flex-row items-center mb-1.5">
                        <Text className="text-[14px] text-black font-medium">{isVi ? 'Giới tính' : 'Gender'}</Text>
                        {(lockStatus.isCoreLocked && formData.gender && formData.gender !== 'UNKNOWN') && <Feather name="lock" size={12} color="#9CA3AF" style={{ marginLeft: 4 }} />}
                      </View>
                      <Dropdown
                        disable={lockStatus.isCoreLocked && !!formData.gender && formData.gender !== 'UNKNOWN'}
                        style={{ height: 34, borderColor: (lockStatus.isCoreLocked && !!formData.gender && formData.gender !== 'UNKNOWN') ? 'transparent' : '#E5E7EB', borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, backgroundColor: (lockStatus.isCoreLocked && !!formData.gender && formData.gender !== 'UNKNOWN') ? '#F9FAFB' : '#FFFFFF' }}
                        containerStyle={{ borderRadius: 12, overflow: 'hidden', marginTop: 4, borderColor: '#E5E7EB', borderWidth: 1 }}
                        placeholderStyle={{ fontSize: 14, color: '#9CA3AF', fontFamily: defaultFont }}
                        selectedTextStyle={{ fontSize: 14, color: (lockStatus.isCoreLocked && !!formData.gender && formData.gender !== 'UNKNOWN') ? '#9CA3AF' : '#000000', fontFamily: defaultFont }}
                        itemTextStyle={{ fontSize: 14, color: '#000000', fontFamily: defaultFont }}
                        data={genderData}
                        maxHeight={200}
                        labelField="label"
                        valueField="value"
                        placeholder={isVi ? 'Chọn giới tính' : 'Select gender'}
                        value={formData.gender}
                        onChange={(item) => handleChange('gender', item.value)}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[14px] text-black font-medium mb-2.5">{isVi ? 'Đã triệt sản' : 'Sterilized'}</Text>
                      <View className="flex-row items-center gap-8 h-[30px]">
                        <TouchableOpacity onPress={() => handleChange('sterilized', true)} className="flex-row items-center">
                          <View className={`w-4 h-4 rounded-full border items-center justify-center mr-2 ${formData.sterilized === true ? 'border-[#EFA062]' : ' border-[#E5E7EB]'}`}>
                            {formData.sterilized === true && <View className="w-2.5 h-2.5 rounded-full bg-[#EFA062]" />}
                          </View>
                          <Text className="text-[14px] text-black">{isVi ? 'Có' : 'Yes'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleChange('sterilized', false)} className="flex-row items-center">
                          <View className={`w-4 h-4 rounded-full border items-center justify-center mr-2 ${formData.sterilized === false ? 'border-[#EFA062]' : ' border-[#E5E7EB]'}`}>
                            {formData.sterilized === false && <View className="w-2.5 h-2.5 rounded-full bg-[#EFA062]" />}
                          </View>
                          <Text className="text-[14px] text-black">{isVi ? 'Không' : 'No'}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* 3. Breed & Color Row */}
                  <View className="flex-row gap-3 mb-5">
                    <View className="flex-1">
                      {/* 🚀 NÂNG CẤP 7: UI báo hiệu KHÓA GIỐNG */}
                      <View className="flex-row items-center mb-1.5">
                        <Text className="text-[14px] text-black font-medium">{isVi ? 'Giống' : 'Breed'}</Text>
                        {(lockStatus.isCoreLocked && !!formData.breed) && <Feather name="lock" size={12} color="#9CA3AF" style={{ marginLeft: 4 }} />}
                      </View>
                      <Dropdown
                        disable={lockStatus.isCoreLocked && !!formData.breed}
                        style={{ height: 34, borderColor: (lockStatus.isCoreLocked && !!formData.breed) ? 'transparent' : '#E5E7EB', borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, backgroundColor: (lockStatus.isCoreLocked && !!formData.breed) ? '#F9FAFB' : '#FFFFFF' }}
                        containerStyle={{ borderRadius: 12, overflow: 'hidden', marginTop: 2, borderColor: '#E5E7EB', borderWidth: 1 }}
                        placeholderStyle={{ fontSize: 14, color: '#9CA3AF', fontFamily: defaultFont }}
                        selectedTextStyle={{ fontSize: 14, color: (lockStatus.isCoreLocked && !!formData.breed) ? '#9CA3AF' : '#000000', fontFamily: defaultFont }}
                        itemTextStyle={{ fontSize: 14, color: '#000000', fontFamily: defaultFont }}
                        data={currentBreedOptions}
                        maxHeight={250}
                        labelField="label"
                        valueField="value"
                        placeholder={isVi ? 'Chọn giống' : 'Select breed'}
                        value={formData.breed}
                        onChange={(item) => handleChange('breed', item.value)}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[14px] text-black font-medium mb-1.5">{isVi ? 'Màu sắc' : 'Color'}</Text>
                      <TextInput
                        style={inputFontStyle}
                        className="h-[34px] border border-[#E5E5E5] rounded-[12px] px-3.5 text-black text-[14px]"
                        value={formData.color}
                        onChangeText={(text) => handleChange('color', text)}
                        placeholder={isVi ? "Màu sắc" : "Color"}
                        placeholderTextColor="#A1A1AA"
                      />
                    </View>
                  </View>

                  {/* 4. Birthday & Weight Row */}
                  <View className="flex-row gap-3 mb-5">
                    <View className="flex-1" ref={dobRef} collapsable={false}>
                      {/* 🚀 NÂNG CẤP 8: UI báo hiệu KHÓA NGÀY SINH */}
                      <View className="flex-row items-center mb-1.5">
                        <Text className="text-[14px] text-black font-medium">{isVi ? 'Ngày sinh' : 'Birthday'}</Text>
                        {(lockStatus.isCoreLocked && !!formData.dob) && <Feather name="lock" size={12} color="#9CA3AF" style={{ marginLeft: 4 }} />}
                      </View>
                      <TouchableOpacity
                        disabled={lockStatus.isCoreLocked && !!formData.dob}
                        onPress={() => Platform.OS === 'ios' ? openDropdownPicker('dob') : setShowDatePicker(true)}
                        className={`h-[34px] border rounded-[12px] px-3.5 justify-center ${(lockStatus.isCoreLocked && !!formData.dob) ? 'bg-[#F9FAFB] border-transparent' : 'bg-white border-[#E5E5E5]'}`}
                      >
                        <Text className={`text-[14px] ${formData.dob ? ((lockStatus.isCoreLocked && !!formData.dob) ? 'text-[#9CA3AF]' : 'text-black') : 'text-[#A1A1AA]'}`}>
                          {formData.dob ? new Date(formData.dob).toLocaleDateString('en-GB') : 'DD/MM/YYYY'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View className="flex-1">
                      <Text className="text-[14px] text-black font-medium mb-1.5">{isVi ? 'Cân nặng' : 'Weight'}</Text>
                      <TextInput
                        style={inputFontStyle}
                        className="h-[34px] border border-[#E5E5E5] rounded-[12px] px-3.5 text-black text-[14px]"
                        value={formData.weight}
                        onChangeText={(text) => handleChange('weight', text.replace(/[^0-9.]/g, ''))}
                        keyboardType="decimal-pad"
                        placeholder={isVi ? "Cân nặng (kg)" : "Weight (kg)"}
                        placeholderTextColor="#A1A1AA"
                      />
                    </View>
                  </View>

                  <View className="h-[1px] bg-gray-100 my-5" />

                  <View>
                    <Text className="text-[14px] text-black font-medium mb-1.5">{isVi ? 'Ghi chú' : 'Notes'}</Text>
                    <TextInput
                      style={[inputFontStyle, { paddingTop: 12 }]}
                      className="border border-[#E5E5E5] rounded-[12px] px-3.5 pb-3 text-black text-[14px] min-h-[80px]"
                      value={formData.description}
                      onChangeText={(text) => handleChange('description', text)}
                      placeholder={isVi ? "Thích được xoa bụng và chơi trò ném đồ..." : "Loves belly rubs and playing fetch..."}
                      placeholderTextColor="#A1A1AA"
                      multiline
                      textAlignVertical="top"
                    />
                  </View>
                </View>
              </View>

              {/* Owner Information Section */}
              <View className="mb-6">
                <Text className="text-[16px] font-semibold text-black mb-3">{isVi ? 'Thông tin chủ nuôi' : 'Owner Information'}</Text>

                <View className="bg-white rounded-[20px] border border-gray-200 px-4 py-2">
                  <View className="flex-row items-center py-3 border-b border-gray-100">
                    <Text className="text-[16px] font-medium text-black w-[80px]">{isVi ? 'Tên' : 'Name'}</Text>
                    <TextInput
                      style={inputFontStyle}
                      className="flex-1 text-right text-[14px] text-[#8E8E93] p-0"
                      value={formData.contactName}
                      onChangeText={(text) => handleChange('contactName', text)}
                      placeholder={isVi ? "Họ Và Tên" : "Full Name"}
                      placeholderTextColor="#A1A1AA"
                    />
                  </View>

                  <View className="flex-row items-center py-3 border-b border-gray-100">
                    <Text className="text-[16px] font-medium text-black w-[80px]">{isVi ? 'SĐT' : 'Phone'}</Text>
                    <TextInput
                      style={inputFontStyle}
                      className="flex-1 text-right text-[14px] text-[#8E8E93] p-0"
                      value={formData.contactPhone}
                      onChangeText={(text) => handleChange('contactPhone', text.replace(/[^0-9]/g, ''))}
                      keyboardType="phone-pad"
                      placeholder={isVi ? "Số Điện Thoại" : "Phone Number"}
                      placeholderTextColor="#A1A1AA"
                      maxLength={15}
                    />
                  </View>

                  <View className="flex-row items-center py-4">
                    <Text className="text-[16px] font-medium text-black w-[80px]">{isVi ? 'Địa chỉ' : 'Address'}</Text>
                    <TouchableOpacity onPress={() => setShowAddressPopup(true)} className="flex-1 items-end justify-center">
                      <Text
                        style={inputFontStyle}
                        className={`text-right text-[14px] p-0 ${formData.contactAddress ? 'text-[#8E8E93]' : 'text-[#A1A1AA]'}`}
                        numberOfLines={1}
                      >
                        {formData.contactAddress || (isVi ? "Địa chỉ của bạn" : "Street Address, District, City")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* MEDICAL RECORDS SECTION */}
              <View className="mb-8">
                <View className="flex-row justify-between items-center mb-[20px]">
                  <Text className="text-[16px] font-semibold text-[#111827] tracking-[0.06px]">
                    {isVi ? 'Hồ sơ y tế' : 'Medical Records'} ({medicalRecords.length})
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowMedicalModal(true)}
                    className="bg-[#FFF8F0] px-4 py-2 rounded-full border border-[#E89B5A]/30"
                  >
                    <Text className="text-[#E89B5A] font-medium text-[13px]">{isVi ? 'Thêm hồ sơ' : 'Add Record'}</Text>
                  </TouchableOpacity>
                </View>

                {/* Progress UI */}
                {isUploadingRecords && (
                  <View className="h-[73px] rounded-[16px] p-3 bg-[#F8F8F8] mb-4">
                    <View className='flex-row items-center mb-3'>
                      <Image source={require('../assets/icon/file.png')} style={{ width: 28, height: 28 }} resizeMode="cover" />
                      <View className="flex-1 ml-3">
                        <View className="flex-row justify-between items-center">
                          <Text className="text-[12px] text-[#000000] font-medium leading-[13px]" numberOfLines={1}>
                            {isVi ? 'Đang tải ảnh y tế lên...' : 'Uploading medical photos...'}
                          </Text>
                        </View>
                        <View className="flex-row items-center mt-1">
                          <ActivityIndicator color="#E89B5A" style={{ transform: [{ scaleX: 0.6 }, { scaleY: 0.6 }] }} />
                          <Text className="text-[10px] text-black ml-1 font-regular tracking-[0.5px] leading-[13px]">
                            {isVi ? 'Vui lòng đợi...' : 'Please wait...'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View className="h-1.5 bg-[#E3E3E4] rounded-full ">
                      <View className="h-full bg-[#EFA062] rounded-full" style={{ width: '100%' }} />
                    </View>
                  </View>
                )}

                {/* 🚀 FIX 4: Thay thế khối code cũ bằng Component MedicalRecordItem đã được memoize */}
                {medicalRecords.length === 0 ? (
                  <View className="bg-white border border-dashed border-[#E5E5E5] rounded-[12px] py-5 items-center justify-center">
                    <View className="rounded-full items-center justify-center mb-2">
                      <Image source={require('../assets/icon/file.png')} style={{ width: 17, height: 17 }} resizeMode="cover" />
                    </View>
                    <Text className="text-[16px] text-black font-medium mb-2">{isVi ? "Chưa có hồ sơ y tế" : "No medical records yet"}</Text>
                    <Text className="text-[14px] text-[#A9ACB4] font-regular">{isVi ? "Các hồ sơ được thêm vào sẽ hiển thị ở đây." : "Records added to PawLife will be shown here."}</Text>
                  </View>
                ) : (
                  medicalRecords.map((record, index) => (
                    <MedicalRecordItem
                      key={record.id || `medical-record-${index}`}
                      record={record}
                      index={index}
                      isVi={isVi}
                      onOpenMenu={handleOpenMedicalRecordMenu}
                    />
                  ))
                )}
              </View>

              <View className="space-y-3 mb-10">
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={isSubmitting || isUploadingAvatar || isUploadingRecords}
                  className={`bg-[#EFA062] h-[52px] rounded-2xl items-center justify-center flex-row shadow-sm ${(isSubmitting || isUploadingRecords) ? 'opacity-70' : ''}`}
                >
                  {(isSubmitting || isUploadingRecords) ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text className="text-white font-semibold text-[16px]">{isVi ? 'Lưu thay đổi' : 'Save Changes'}</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.back()}
                  disabled={isSubmitting || isUploadingRecords}
                  className="bg-white border border-gray-200 h-[52px] rounded-2xl items-center justify-center mt-5"
                >
                  <Text className="text-[#9CA3AF] font-medium text-[16px]">{isVi ? 'Hủy' : 'Cancel'}</Text>
                </TouchableOpacity>
              </View>

            </View>
            {/* Hết Wrapper */}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* ================= MODALS & PICKERS ================= */}

      {/* ANDROID NATIVE DATE PICKER */}
      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={formData.dob ? new Date(formData.dob) : new Date()}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={onDateChange}
        />
      )}

      {/* --- IOS GLASSMORPHISM DATE PICKER --- */}
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
                <Text className="text-[16px] text-[#A1A1AA] font-medium">{isVi ? 'Huỷ' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={closeDropdownPicker}>
                <Text className="text-[16px] font-semibold text-[#E89B5A]">{isVi ? 'Xong' : 'Done'}</Text>
              </TouchableOpacity>
            </View>

            <View style={{ paddingTop: 4, paddingBottom: 4, paddingHorizontal: 10, alignItems: 'center' }} className="relative z-10">
              <DateTimePicker
                value={formData.dob ? new Date(formData.dob) : new Date()}
                mode="date"
                display="inline"
                themeVariant="dark"
                locale={isVi ? "vi-VN" : "en-US"}
                maximumDate={new Date()}
                style={{ width: 320, height: 315, alignSelf: 'center' }}
                accentColor="#E89B5A"
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    handleChange('dob', selectedDate.toISOString());
                  }
                }}
              />
            </View>
          </Animated.View>
        </View>
      )}

      {/* --- POPUP ADDRESS MODAL (API V2) --- */}
      <Modal visible={showAddressPopup} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center px-4">
          <View className="bg-white rounded-[24px] p-6 shadow-2xl max-h-[85%]">
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text className="text-[20px] font-semibold text-black mb-2 text-center">
                {isVi ? 'Địa chỉ của bạn' : 'Your Address'}
              </Text>

              <Label text={isVi ? "Thành phố / Tỉnh" : "City / Province"} required />
              <CustomDropdown
                placeholder={isVi ? "Chọn Tỉnh/Thành phố" : "Select City/Province"}
                value={tempCity}
                options={cityOptions}
                onSelect={(val) => {
                  setTempCity(val);
                  setTempWard('');
                }}
              />

              <Label text={isVi ? "Quận/Huyện & Phường/Xã" : "District & Ward"} required />
              <CustomDropdown
                placeholder={isVi ? "Chọn Phường/Xã" : "Select Ward"}
                value={tempWard}
                options={wardOptions}
                onSelect={setTempWard}
              />

              <Label text={isVi ? "Địa chỉ chi tiết (Tùy chọn)" : "Detailed Address (Optional)"} />
              <CustomInput
                placeholder={isVi ? "Số nhà, tên ngõ, tên đường..." : "House number, street name..."}
                value={tempDetail}
                onChangeText={setTempDetail}
              />

              <View className="flex-row gap-3 mt-8 mb-4">
                <TouchableOpacity
                  className="flex-1 py-4 rounded-xl border border-[#E5E5E5] items-center bg-[#F9FAFB]"
                  onPress={() => setShowAddressPopup(false)}
                >
                  <Text className="text-[#8E8E93] font-bold text-[14px]">{isVi ? 'Hủy bỏ' : 'Cancel'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 py-4 rounded-xl bg-[#E89B5A] items-center shadow-sm"
                  onPress={handleConfirmAddress}
                >
                  <Text className="text-white font-bold text-[14px]">{isVi ? 'Xác nhận' : 'Confirm'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* --- MEDICAL RECORD MENU MODAL ---
          🚀 ĐỒNG BỘ UI: Cấu trúc menu GIỐNG HỆT pet-profile-detail:
          1. Xem hồ sơ (luôn hiện)
          2. Báo cáo (chỉ khi VERIFIED)
          3. Sửa hồ sơ + Xóa (chỉ khi PENDING)
          4. Chú thích tranh chấp (chỉ khi DISPUTED) — thay cho text inline dưới card cũ
      */}
      <Modal
        visible={showMedicalRecordMenu}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setShowMedicalRecordMenu(false);
          setSelectedMedicalRecordIndex(null);
        }}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={() => {
            setShowMedicalRecordMenu(false);
            setSelectedMedicalRecordIndex(null);
          }}
        >
          <View
            className="absolute bg-white rounded-xl border border-gray-100 w-44"
            style={{
              top: medicalRecordMenuPosition.top,
              right: medicalRecordMenuPosition.right,
              elevation: 8,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 10
            }}
          >
            {/* 1. Xem hồ sơ — luôn hiện, dùng chung cho record pending và verified */}
            <TouchableOpacity
              className="flex-row items-center px-4 py-3"
              activeOpacity={0.6}
              onPress={() => {
                setShowMedicalRecordMenu(false);
                const record = selectedMedicalRecordIndex !== null ? medicalRecords[selectedMedicalRecordIndex] : null;
                if (record) {
                  setViewingMedicalRecord(record);
                  setShowViewMedicalModal(true);
                }
              }}
            >
              <Text className="text-[14px] text-gray-700 ml-3 font-medium">
                {isVi ? 'Xem hồ sơ' : 'View record'}
              </Text>
            </TouchableOpacity>

            {/* 2. Record đã VERIFIED -> chỉ cho Báo cáo */}
            {selectedMedicalRecordIsVerified && (
              <TouchableOpacity
                className="flex-row items-center px-4 py-3 border-t border-gray-50"
                activeOpacity={0.6}
                onPress={() => {
                  setShowMedicalRecordMenu(false);
                  const record = selectedMedicalRecordIndex !== null ? medicalRecords[selectedMedicalRecordIndex] : null;
                  if (record) {
                    setReportingMedicalRecord(record);
                    setShowReportMedicalRecordModal(true);
                  }
                }}
              >
                <Text className="text-[14px] text-red-600 ml-3 font-medium">
                  {isVi ? 'Báo cáo' : 'Report'}
                </Text>
              </TouchableOpacity>
            )}

            {/* 3. Record đang PENDING -> cho Sửa + Xóa */}
            {selectedMedicalRecordIsPending && (
              <>
                <TouchableOpacity
                  className="flex-row items-center px-4 py-3 border-t border-gray-50"
                  activeOpacity={0.6}
                  onPress={() => {
                    setShowMedicalRecordMenu(false);
                    const record = selectedMedicalRecordIndex !== null ? medicalRecords[selectedMedicalRecordIndex] : null;
                    if (record) {
                      setEditingMedicalRecord(record);
                      setShowEditMedicalRecordModal(true);
                    }
                  }}
                >
                  <Text className="text-[14px] text-gray-700 ml-3 font-medium">
                    {isVi ? 'Sửa hồ sơ' : 'Edit Record'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-row items-center px-4 py-3 border-t border-gray-50"
                  activeOpacity={0.6}
                  onPress={() => {
                    const indexToDelete = selectedMedicalRecordIndex;
                    setShowMedicalRecordMenu(false);
                    setSelectedMedicalRecordIndex(null);
                    if (indexToDelete !== null) handleDeleteMedicalRecord(indexToDelete);
                  }}
                >
                  <Text className="text-[14px] text-red-600 ml-3 font-medium">
                    {isVi ? 'Xóa' : 'Delete'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* 4. Record đang DISPUTED -> chú thích, giống hệt pet-profile-detail */}
            {selectedMedicalRecordIsDisputed && (
              <View className="px-4 py-3 border-t border-gray-50">
                <Text className="text-[12px] text-[#8E8E93] italic leading-[16px]">
                  {isVi
                    ? 'Hồ sơ này đang bị báo cáo và chờ quản trị viên xem xét. Bạn không thể chỉnh sửa lúc này.'
                    : 'This record is reported and under review by admins. You cannot edit it at this time.'}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* --- IN-APP FULLSCREEN IMAGE VIEWER MODAL --- */}
      <Modal
        visible={isImageViewerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsImageViewerVisible(false)}
      >
        <View className="flex-1 bg-black/95 justify-center items-center">
          <View
            className="absolute top-0 w-full z-50 flex-row justify-between items-center px-4 pb-4"
            style={{
              paddingTop: Math.max(insets.top, 20),
              backgroundColor: 'rgba(0,0,0,0.3)'
            }}
          >
            <Text className="text-white font-medium text-lg drop-shadow-md">
              {isVi ? 'Hồ sơ y tế' : 'Medical Record'}
              {currentMedicalRecordImages.length > 1 ? `  ${currentImageIndex + 1}/${currentMedicalRecordImages.length}` : ''}
            </Text>
            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                className="p-2.5 bg-white/20 rounded-full"
                onPress={async () => {
                  const currentUri = currentMedicalRecordImages[currentImageIndex];
                  if (currentUri) {
                    await handleDownloadMedicalRecordImage(currentUri, `medical_record_${Date.now()}.jpg`);
                  }
                }}
              >
                <Feather name="download" size={22} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                className="p-2.5 bg-white/20 rounded-full"
                onPress={() => setIsImageViewerVisible(false)}
              >
                <Feather name="x" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {currentMedicalRecordImages.length > 0 && (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentOffset={{ x: currentImageIndex * Dimensions.get('window').width, y: 0 }}
              onMomentumScrollEnd={(e) => {
                const newIndex = Math.round(
                  e.nativeEvent.contentOffset.x / Dimensions.get('window').width
                );
                setCurrentImageIndex(newIndex);
              }}
              style={{ width: '100%' }}
            >
              {currentMedicalRecordImages.map((uri, idx) => (
                <View
                  key={idx}
                  style={{ width: Dimensions.get('window').width, justifyContent: 'center', alignItems: 'center' }}
                >
                  <Image
                    source={{ uri }}
                    style={{ width: '100%', height: '80%' }}
                    resizeMode="contain"
                  />
                </View>
              ))}
            </ScrollView>
          )}

          {currentMedicalRecordImages.length > 1 && (
            <View className="absolute bottom-10 flex-row gap-2">
              {currentMedicalRecordImages.map((_, idx) => (
                <View
                  key={idx}
                  className={`w-2 h-2 rounded-full ${idx === currentImageIndex ? 'bg-white' : 'bg-white/30'}`}
                />
              ))}
            </View>
          )}
        </View>
      </Modal>

      {/* Gọi component Modal Medical Record — THÊM hồ sơ mới */}
      <AddMedicalRecordModal
        visible={showMedicalModal}
        onClose={() => setShowMedicalModal(false)}
        species={(formData.species as 'Dog' | 'Cat') || 'Dog'}
        onSubmit={(record) => {
          setMedicalRecords(prev => [...prev, record]);
          setShowMedicalModal(false);
        }}
      />

      {/* 🚀 ĐỒNG BỘ UI: Modal XEM hồ sơ y tế — giống hệt pet-profile-detail */}
      <AddMedicalRecordModal
        visible={showViewMedicalModal}
        mode="view"
        initialRecord={viewingMedicalRecord}
        species={(formData.species as 'Dog' | 'Cat') || 'Dog'}
        onClose={() => {
          setShowViewMedicalModal(false);
          setViewingMedicalRecord(null);
        }}
        onSubmit={() => { }}
        onSubmitNextDueOnly={(recordId, payload) => {
          const idx = medicalRecords.findIndex(r => (recordId ? r.id === recordId : r === viewingMedicalRecord));
          handleUpdateNextDueOnlyLocal(recordId, idx, payload);
        }}
      />

      {/* 🚀 ĐỒNG BỘ UI: Modal SỬA hồ sơ y tế (record đang PENDING) — giống hệt pet-profile-detail */}
      <AddMedicalRecordModal
        visible={showEditMedicalRecordModal}
        mode="edit"
        initialRecord={editingMedicalRecord}
        species={(formData.species as 'Dog' | 'Cat') || 'Dog'}
        onClose={() => {
          setShowEditMedicalRecordModal(false);
          setEditingMedicalRecord(null);
        }}
        onSubmit={() => { }}
        onSubmitEdit={(recordId, payload) => {
          const idx = medicalRecords.findIndex(r => (recordId ? r.id === recordId : r === editingMedicalRecord));
          handleUpdateMedicalRecordLocal(recordId, idx, payload);
        }}
      />

      {/* 🚀 ĐỒNG BỘ UI: Modal BÁO CÁO hồ sơ y tế đã VERIFIED — giống hệt pet-profile-detail */}
      <ReportIssueModal
        isVisible={showReportMedicalRecordModal}
        context="medicalRecord"
        targetName={reportingMedicalRecord ? getSafeBilingualText(reportingMedicalRecord.recordName, isVi) : undefined}
        onClose={() => {
          setShowReportMedicalRecordModal(false);
          setReportingMedicalRecord(null);
        }}
        onSubmit={handleReportMedicalRecord}
        onSuccessModalClose={() => setReportingMedicalRecord(null)}
      />
    </SafeAreaView>
  );
}