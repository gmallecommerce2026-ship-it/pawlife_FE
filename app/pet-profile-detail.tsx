import AddMedicalRecordModal from '@/components/AddMedicalRecordModal';
import { Text } from '@/components/AppText';
import ReportIssueModal, { ReportSubmitData } from '@/components/ReportIssueModal';
import { getMedicalRecordIcon } from '@/constants/medicalRecordIcons';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLocalizedData } from '@/hooks/useLocalizedData';
import { useTotalImageSize } from '@/hooks/useTotalImageSize';
import { normalizePet } from '@/utils/petNormalize';
import { Feather, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, DeviceEventEmitter, Dimensions, Image, ImageSourcePropType, InteractionManager, LayoutAnimation, Modal, Platform, ScrollView, Switch, TouchableOpacity, UIManager, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { petService } from '../services/petService';

// Kích hoạt LayoutAnimation cho Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type PawHistoryUIType =
  | 'CREATED'
  | 'BIRTH'
  | 'QR_LINKED'
  | 'TRANSFER'
  | 'VACCINE'
  | 'DENTAL_CARE'
  | 'ANNUAL_CHECKUP'
  | 'UNDER_SHELTER_CARE'
  | 'WAS_UNDER_SHELTER_CARE'
  | 'CURRENT_OWNER'
  | 'PREVIOUS_OWNER';

type PawHistoryUIConfig = {
  icon: ImageSourcePropType;
  iconBgColor: string;
  lineColor: string;
};

const PAW_HISTORY_UI_CONFIG: Record<PawHistoryUIType, PawHistoryUIConfig> = {
  DENTAL_CARE: {
    icon: require('../assets/icon/teeth-icon.png'),
    iconBgColor: '#E8FFD8',
    lineColor: '#D5F5C6',
  },
  ANNUAL_CHECKUP: {
    icon: require('../assets/icon/anual-icon.png'),
    iconBgColor: '#E8FFD8',
    lineColor: '#D5F5C6',
  },
  UNDER_SHELTER_CARE: {
    icon: require('../assets/icon/home-heart.png'),
    iconBgColor: '#FFE4F0',
    lineColor: '#F8BBD0',
  },
  WAS_UNDER_SHELTER_CARE: {
    icon: require('../assets/icon/home-heart-2.png'),
    iconBgColor: '#FFE4F0',
    lineColor: '#F8BBD0',
  },
  CURRENT_OWNER: {
    icon: require('../assets/icon/owner.png'),
    iconBgColor: '#FFE9B8',
    lineColor: '#FFD88A',
  },
  PREVIOUS_OWNER: {
    icon: require('../assets/icon/owner-2.png'),
    iconBgColor: '#FFE9B8',
    lineColor: '#FFD88A',
  },
  VACCINE: {
    icon: require('../assets/icon/vaccine.png'),
    iconBgColor: '#E3F0FF',
    lineColor: '#BFD9FF',
  },
  QR_LINKED: {
    icon: require('../assets/icon/qr-icon.png'),
    iconBgColor: '#EAE7FF',
    lineColor: '#D3CCFF',
  },
  BIRTH: {
    icon: require('../assets/icon/birth-date.png'),
    iconBgColor: '#DFFFF7',
    lineColor: '#BDF5EA',
  },
  CREATED: {
    icon: require('../assets/icon/qr-icon.png'),
    iconBgColor: '#EAE7FF',
    lineColor: '#D3CCFF',
  },
  TRANSFER: {
    icon: require('../assets/icon/home-heart.png'),
    iconBgColor: '#E8FFD8',
    lineColor: '#D5F5C6',
  },
};

const DEFAULT_HISTORY_UI: PawHistoryUIConfig = {
  icon: require('../assets/icon/birth-date.png'),
  iconBgColor: '#F5F5F5',
  lineColor: '#E0E0E0',
};

// ─────────────────────────────────────────────────────────────────────────────
// BƯỚC 2: Thêm helper resolvePawHistoryText (giống pet-detail-modal)
// Đặt sau PAW_HISTORY_UI_CONFIG, trước component
// ─────────────────────────────────────────────────────────────────────────────

const I18N_MAP: Record<string, { vi: string; en: string }> = {
  'pawHistory.current_owner_title': { vi: 'Chủ sở hữu hiện tại', en: 'Current Owner' },
  'pawHistory.current_owner_body': { vi: 'Quyền sở hữu đã chuyển cho {name}', en: 'Ownership transferred to {name}' },
  'pawHistory.previous_owner_title': { vi: 'Chủ trước', en: 'Previous Owner' },
  'pawHistory.previous_owner_body': { vi: 'Từng được chăm sóc bởi {name}', en: 'Previously cared for by {name}' },
  'pawHistory.under_shelter_title': { vi: 'Đang ở trạm cứu hộ', en: "Under Shelter's Care" },
  'pawHistory.under_shelter_body': { vi: 'Đang được chăm sóc tại {shelterName}', en: 'Currently under the care of {shelterName}' },
  'pawHistory.was_under_shelter_title': { vi: 'Từng ở trạm cứu hộ', en: "Was Under Shelter's Care" },
  'pawHistory.was_under_shelter_body': { vi: 'Trước đây chăm sóc tại {shelterName}', en: 'Previously cared by {shelterName}' },
  'pawHistory.transfer_title': { vi: 'Chuyển giao quyền sở hữu', en: 'Ownership Transferred' },
  'pawHistory.transfer_body': { vi: 'Đã chuyển giao cho {receiverName}', en: 'Transferred to {receiverName}' },
  'pawHistory.vaccine_title': { vi: '{recordNameVi}', en: '{recordNameEn}' },
  'pawHistory.vaccine_body': { vi: 'Đã hoàn thành mũi tiêm', en: 'Vaccination completed' },
  'pawHistory.dental_title': { vi: 'Khám răng miệng', en: 'Dental Care' },
  'pawHistory.dental_body': { vi: 'Đã hoàn thành khám tại {clinicName}', en: 'Completed at {clinicName}' },
  'pawHistory.checkup_title': { vi: 'Khám tổng quát định kỳ', en: 'Annual Checkup' },
  'pawHistory.checkup_body': { vi: 'Đã hoàn thành khám tại {clinicName}', en: 'Completed at {clinicName}' },
  'pawHistory.qr_registered_title': { vi: 'Kích hoạt thẻ QR PawLife', en: 'QR Tag Registered' },
  'pawHistory.qr_registered_body': { vi: 'Thẻ đã được kích hoạt', en: 'PawLife QR tag is now active' },
  'pawHistory.qr_replaced_title': { vi: 'Thay thẻ QR PawLife', en: 'QR Tag Replaced' },
  'pawHistory.qr_replaced_body': { vi: 'Thẻ QR cũ đã được thay thế', en: 'Old QR tag has been replaced' },
  'pawHistory.birth_title': { vi: 'Ngày sinh', en: 'Date of Birth' },
  'pawHistory.birth_body': { vi: 'Mừng ngày {petName} chào đời', en: 'Celebrate {petName} was born' },
  'pawHistory.joined_title': { vi: 'Gia nhập PawLife', en: 'Joined PawLife' },
  'pawHistory.joined_body': { vi: 'Hồ sơ {petName} được tạo', en: 'Profile for {petName} was created' },
};

const interpolate = (template: string, params: Record<string, any> = {}): string =>
  template.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? `{${key}}`);

const resolvePawHistoryText = (
  item: any,
  isVi: boolean,
): { title: string; description: string } => {
  let title = item.title ?? '';
  let description = item.description ?? '';

  if (item?.i18n?.titleKey) {
    const titleTpl = I18N_MAP[item.i18n.titleKey];
    const bodyTpl = I18N_MAP[item.i18n.bodyKey];

    // Gán title và description theo template mặc định
    title = titleTpl ? interpolate(isVi ? titleTpl.vi : titleTpl.en, item.i18n.params ?? {}) : title;
    description = bodyTpl ? interpolate(isVi ? bodyTpl.vi : bodyTpl.en, item.i18n.params ?? {}) : description;

    // --- BẮT ĐẦU: LOGIC XỬ LÝ RIÊNG CHO VACCINE (BÓC TÁCH MŨI TIÊM) ---
    if (item.type === 'VACCINE' || item.i18n.titleKey === 'pawHistory.vaccine_title') {
      const params = item?.i18n?.params || {};
      const recNameVi = params.recordNameVi || title;
      const recNameEn = params.recordNameEn || title;

      let doseNumber = params.dose; // Dùng nếu Backend có truyền riêng tham số { dose: 1 }
      let pureVaccineNameVi = recNameVi;
      let pureVaccineNameEn = recNameEn;

      // Nếu không có tham số dose rời, tiến hành bóc tách bằng Regex từ tên (VD: "Vaccine 7 bệnh (Mũi 1)" hoặc "Mũi 1 - 7 Bệnh")
      if (!doseNumber) {
        const regexVi = /(?:-\s*|\(\s*)?(mũi)\s*(\d+)(?:\s*\))?/i;
        const matchVi = recNameVi.match(regexVi);
        if (matchVi) {
          doseNumber = matchVi[2];
          // Cắt bỏ chữ Mũi 1, Mũi 2... và các dấu dư thừa ra khỏi tên vaccine
          pureVaccineNameVi = recNameVi.replace(regexVi, '').trim().replace(/^[-()]+|[-()]+$/g, '').trim();
        }

        const regexEn = /(?:-\s*|\(\s*)?(dose)\s*(\d+)(?:\s*\))?/i;
        const matchEn = recNameEn.match(regexEn);
        if (matchEn) {
          if (!doseNumber) doseNumber = matchEn[2];
          pureVaccineNameEn = recNameEn.replace(regexEn, '').trim().replace(/^[-()]+|[-()]+$/g, '').trim();
        }
      } else {
        // Nếu backend trả về vaccineName riêng
        pureVaccineNameVi = params.vaccineName || recNameVi;
        pureVaccineNameEn = params.vaccineName || recNameEn;
      }

      // Format lại Description thành "Đã hoàn thành mũi 1/2/3 (Tên vaccine)"
      if (doseNumber) {
        description = isVi
          ? `Đã hoàn thành mũi ${doseNumber} (${pureVaccineNameVi})`
          : `Completed dose ${doseNumber} (${pureVaccineNameEn})`;
      } else {
        // Fallback nếu người dùng chọn loại Vaccine không phân mũi (VD: Vaccine Dại 1 mũi duy nhất)
        description = isVi
          ? `Đã hoàn thành mũi tiêm (${pureVaccineNameVi})`
          : `Completed vaccination (${pureVaccineNameEn})`;
      }
    }
    // --- KẾT THÚC ---
  }

  return { title, description };
};


const getSafeBilingualText = (val: any, isVi: boolean, logPrefix: string = '') => {
  console.log(`\n[DEBUG_MEDICAL_RECORD - ${logPrefix}] Type: ${typeof val} | Value:`, val);

  if (!val) return '';
  if (typeof val === 'string') {
    if (val === '[object Object]') {
      console.log(`⚠️ CẢNH BÁO: Dữ liệu Medical Record đã bị ép thành [object Object] từ trước!`);
    }
    if (val.trim().startsWith('{')) {
      try {
        const p = JSON.parse(val);
        const res = isVi ? (p.vi || p.en) : (p.en || p.vi);
        console.log(`[DEBUG_MEDICAL_RECORD] Parsed JSON String ->`, res);
        return res;
      } catch { return val; }
    }
    return val;
  }
  if (typeof val === 'object') {
    const res = isVi ? (val.vi || val.en) : (val.en || val.vi);
    console.log(`[DEBUG_MEDICAL_RECORD] Parsed Object ->`, res);
    return res;
  }
  return String(val);
};
const MedicalRecordSubtitle = ({
  images, recordDate, isVi
}: {
  images: string[]; recordDate: string; isVi: boolean;
}) => {
  const sizeKB = useTotalImageSize(images);
  const formatted = recordDate
    ? new Date(recordDate).toLocaleDateString(isVi ? 'vi-VN' : 'en-US')
    : '';
  return (
    <Text className="text-[10px] font-regular text-[#8E8E93] tracking-[0.5px]">
      {sizeKB !== null ? `${sizeKB}KB • ` : ''}
      {isVi ? 'Gửi lúc' : 'Submitted on'} {formatted}
    </Text>
  );
};
export default function PetProfileDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const petId = params.id as string;
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();
  const isVi = language === 'vi';
  const { l } = useLocalizedData();

  const queryClient = useQueryClient();
  // --- STATE ---
  const [petData, setPetData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLostMode, setIsLostMode] = useState(false);
  const lockLostStatusRef = useRef(false);
  const [showHistory, setShowHistory] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingLostMode, setIsTogglingLostMode] = useState(false);
  const [showLostModeModal, setShowLostModeModal] = useState(false);
  const [pendingLostMode, setPendingLostMode] = useState<boolean>(false);
  const [showVaccineMenu, setShowVaccineMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 28 });
  const [selectedVaccineIndex, setSelectedVaccineIndex] = useState<number | null>(null);
  const [showEditMedicalModal, setShowEditMedicalModal] = useState(false);
  const [showViewMedicalModal, setShowViewMedicalModal] = useState(false);
  const [viewingMedicalRecord, setViewingMedicalRecord] = useState<any | null>(null);
  const [editingMedicalRecord, setEditingMedicalRecord] = useState<any | null>(null);
  const [isSavingMedicalRecord, setIsSavingMedicalRecord] = useState(false);
  const [showReportMedicalRecordModal, setShowReportMedicalRecordModal] = useState(false);
  const [reportingMedicalRecord, setReportingMedicalRecord] = useState<any | null>(null);


  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);
  const [tooltipAnchor, setTooltipAnchor] = useState({ x: 0, y: 0 });

  // KHỞI TẠO BIẾN ANIMATION
  const tooltipAnim = useRef(new Animated.Value(0)).current;
  // State quản lý việc xem ảnh full màn hình trong App
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [currentImageList, setCurrentImageList] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1552053831-71594a27632d?q=80&w=600&auto=format&fit=crop';
  const displayAvatar = petData?.avatarUrl || petData?.images?.[0]?.url || FALLBACK_AVATAR;
  console.log(petData);


  const getHistoryUIConfig = (type: string) => {
    switch (type) {
      case 'BIRTH':
        return { icon: 'birthday-cake', color: '#F2A465', bgColor: '#FFF4EC' };
      case 'CREATED':
        return { icon: 'paw', color: '#885BF2', bgColor: '#EAE7FB' };
      case 'QR_LINKED':
        return { icon: 'qrcode', color: '#5A90DA', bgColor: '#E8F1FF' };
      case 'TRANSFER':
        return { icon: 'home', color: '#77C582', bgColor: '#EBFFE2' };
      case 'VACCINE':
        return { icon: 'syringe', color: '#EF4444', bgColor: '#FEE2E2' };
      default:
        return { icon: 'history', color: '#8E8E93', bgColor: '#F5F5F5' };
    }
  };

  const handleUpdateNextDueOnly = async (
    recordId: string,
    payload: any // 🚀 Đổi thành any để nhận thêm hasNextDueDate
  ) => {
    try {
      setIsSavingMedicalRecord(true);

      await petService.updateMedicalRecord(petId, recordId, {
        nextDueName: payload.nextDueName,
        nextDueDate: payload.nextDueDate,
        hasNextDueDate: payload.hasNextDueDate, // 🚀 Sử dụng cờ bật/tắt từ Modal truyền ra
      });

      setPetData((prev: any) => {
        if (!prev) return prev;
        const updatedRecords = (prev.medicalRecords || []).map((r: any) =>
          r.id === recordId
            ? {
              ...r,
              hasNextDueDate: payload.hasNextDueDate, // 🚀 Cập nhật trạng thái switch vào UI
              nextDueName: payload.nextDueName,
              nextDueDate: payload.nextDueDate
            }
            : r
        );
        return { ...prev, medicalRecords: updatedRecords };
      });

      queryClient.invalidateQueries({ queryKey: ['pet', petId] });

      Alert.alert(
        isVi ? 'Thành công' : 'Success',
        isVi ? 'Đã cập nhật lịch hẹn tiếp theo!' : 'Next due date updated!'
      );
    } catch (error: any) {
      Alert.alert(
        isVi ? 'Lỗi' : 'Error',
        error?.response?.data?.message || error?.message ||
        (isVi ? 'Không thể cập nhật lịch tiếp theo.' : 'Unable to update next due date.')
      );
    } finally {
      setIsSavingMedicalRecord(false);
      setViewingMedicalRecord(null);
    }
  };


  const getMedicalRecordIconConfig = (type: string) => {
    const t = (type || '').toUpperCase();
    switch (t) {
      case 'VACCINE':
      case 'VACCINATION':
        return { icon: 'syringe' };
      case 'CHECKUP':
        return { icon: 'stethoscope' };
      case 'SURGERY':
        return { icon: 'procedures' };
      case 'DEWORMING':
        return { icon: 'pills' };
      default:
        return { icon: 'file-medical' };
    }
  };
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


  const handleRemovePet = () => {
    Alert.alert(
      "Delete Pet",
      `Are you sure you want to delete the profile of ${petData?.name}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setIsDeleting(true);
              await petService.deletePet(petId);
              Alert.alert("Success", "Pet profile deleted successfully!");
              router.push('/(tabs)/my-pets');
            } catch (error: any) {
              Alert.alert("Error", error.message || "Unable to delete pet at this time.");
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  // 2. ✅ THÊM HOOK NÀY: Lắng nghe event từ màn hình Report
  React.useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('LOST_MODE_ACTIVATED', (data) => {
      if (data.petId === petId) {
        // Bật khóa: Không cho phép API GET ghi đè trạng thái lost mode
        lockLostStatusRef.current = true;

        setIsLostMode(true);
        setPetData((prev: any) =>
          prev ? { ...prev, status: 'LOST', isLost: true } : prev
        );

        // Tự động mở khóa sau 5 giây (Thời gian dư dả để Backend đồng bộ xong Cache/DB)
        setTimeout(() => {
          lockLostStatusRef.current = false;
        }, 5000);
      }
    });

    return () => subscription.remove();
  }, [petId]);

  // 2. USEFOCUSEFFECT: Chỉ nhận trạng thái từ API nếu không bị khóa
  // Tìm đến đoạn useFocusEffect và sửa lại như sau:

  useFocusEffect(
    useCallback(() => {
      let task: any; // Lưu lại reference của task để dọn dẹp

      const fetchPetDetail = async () => {
        if (!petId) return;
        console.log(petId);
        try {
          setPetData((prev: any) => {
            if (!prev) setIsLoading(true);
            return prev;
          });

          const data = await petService.getPetById(petId);

          if (lockLostStatusRef.current) {
            setPetData({ ...normalizePet(data, language), status: 'LOST', isLost: true });
          } else {
            setPetData(normalizePet(data, language));

            const isCurrentlyLost =
              data.tags?.some((tag: any) => tag.status === 'LOST') ||
              data.status === 'LOST' ||
              data.isLost === true;

            setIsLostMode(!!isCurrentlyLost);
          }
        } catch (error) {
          console.error("Error when loading pet information:", error);
        } finally {
          setIsLoading(false);
        }
      };

      // CHỈ GỌI API KHI HIỆU ỨNG CHUYỂN MÀN HÌNH ĐÃ KẾT THÚC
      task = InteractionManager.runAfterInteractions(() => {
        fetchPetDetail();
      });

      // Cleanup function để tránh memory leak nếu user thoát màn hình quá nhanh
      return () => {
        if (task && task.cancel) {
          task.cancel();
        }
      };
    }, [petId, language])
  );

  const HISTORY_DATA = [
    {
      id: 1, type: 'highlight', variant: 'orange',
      title: 'Current Owner', date: 'Jan 15, 2026', desc: 'Ownership transferred to current owner',
      icon: <MaterialIcons name="verified" size={16} color="white" />
    },
    {
      id: 2, type: 'normal', color: '#10B981',
      title: 'Vaccination', date: 'Dec 8, 2025', desc: 'Annual rabies & DHPP vaccination completed',
      icon: <MaterialCommunityIcons name="needle" size={14} color="#10B981" />
    },
    {
      id: 3, type: 'normal', color: '#EF4444',
      title: 'Lost & Found', date: 'Nov 22, 2025', desc: 'Found after 2 days - Scanned at Oak Park',
      icon: <Feather name="alert-circle" size={14} color="#EF4444" />
    }
  ];

  // --- LOGIC HANDLERS ---
  const handleLostModeToggle = (value: boolean) => {
    if (value === true) {
      // 1. Tính toán tuổi chính xác từ ngày sinh (dob) trước khi truyền đi
      let calculatedAge = petData?.age?.toString();

      if (petData?.dob) {
        const birthDate = new Date(petData.dob);
        const today = new Date();
        let years = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();

        // Trừ đi 1 năm nếu chưa đến tháng sinh, hoặc cùng tháng nhưng chưa đến ngày sinh
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          years--;
        }

        // Nếu nhỏ hơn 1 tuổi thì để là '0'
        calculatedAge = years > 0 ? years.toString() : '0';
      }

      router.push({
        pathname: '/report-lost-pet' as any,
        params: {
          petId: petId,
          petName: petData?.name,
          petAvatar: displayAvatar,

          // 2. BỔ SUNG TRUYỀN THÊM petBreed VÀ petAge VÀO PARAMS
          petBreed: petData?.breed,
          petAge: calculatedAge,

          petShelterName: petData?.contactName || ownerInfo?.name || 'not updated',
          petShelterPhone: petData?.contactPhone || ownerInfo?.phone || 'not updated',
          petShelterAddress: petData?.contactAddress || ownerInfo?.address || 'not updated'
        }
      });
    } else {
      setPendingLostMode(false);
      setShowLostModeModal(true);
    }
  };

  const executeToggleMode = async () => {
    const isLost = pendingLostMode;
    try {
      setShowLostModeModal(false);
      setIsTogglingLostMode(true);

      await petService.toggleLostMode(petId, { isLost: isLost });
      setIsLostMode(isLost);
    } catch (error: any) {
      Alert.alert(t('error.title'), error.message || t('error.toggleModeFailed'));
      setIsLostMode(!isLost);
    } finally {
      setIsTogglingLostMode(false);
    }
  };

  const closeTooltip = () => {
    // Hiệu ứng Fade Out + Move Down
    Animated.timing(tooltipAnim, {
      toValue: 0,
      duration: 150, // Tốc độ đóng nhanh hơn mở một chút cho tự nhiên
      useNativeDriver: true, // Ép chạy trên UI Thread (mượt 60fps)
    }).start(() => setActiveTooltipId(null));
  };

  const handleToggleTooltip = (id: string, x: number, y: number) => {
    if (activeTooltipId === id) {
      closeTooltip();
    } else {
      // Mở popup mới
      setTooltipAnchor({ x, y });
      setActiveTooltipId(id);
      tooltipAnim.setValue(0); // Reset về trạng thái tàng hình + nằm bên dưới

      // Hiệu ứng Fade In + Move Up
      Animated.timing(tooltipAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  };

  const toggleHistory = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowHistory(!showHistory);
  };

  const combinedHistory = React.useMemo(() => {
    if (!petData?.pawHistory?.length) return [];

    return petData.pawHistory
      // --- THÊM DÒNG NÀY ĐỂ LỌC BỎ SỰ KIỆN JOINED PAWLIFE ---
      .filter((item: any) => item?.i18n?.titleKey !== 'pawHistory.joined_title' && item?.type !== 'CREATED')
      // -----------------------------------------------------
      .map((item: any) => {
        const { title, description } = resolvePawHistoryText(item, isVi);

        // Pending check: chỉ áp dụng cho VACCINE — khớp với medical record
        let isPending = false;
        if (item.type === 'VACCINE' || item.type === 'DENTAL_CARE' || item.type === 'ANNUAL_CHECKUP') {
          const matchingRecord = petData.medicalRecords?.find((mr: any) => {
            const mrName = getSafeBilingualText(mr.recordName, isVi, 'pawHistory_match');
            return mrName === title || title.includes(mrName);
          });
          if (matchingRecord) {
            isPending =
              matchingRecord.verificationStatus === 'PENDING' ||
              matchingRecord.verificationStatus === 'DISPUTED' || // 🆕
              !matchingRecord.verificationStatus;
          }
        }

        return { ...item, displayTitle: title, displayDescription: description, isPending };
      })
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [petData, isVi]);


  // --- SUB-COMPONENTS ---
  const InfoRow = ({ label1, value1, label2, value2 }: any) => (
    <View className="flex-row justify-between mb-5">
      <View className="flex-1">
        <Text className="text-black text-[14px] font-medium mb-1">{label1}</Text>
        <Text className="text-[#8E8E93] text-[14px] font-regular">{value1}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-black text-[14px] font-medium mb-1">{label2}</Text>
        <Text className="text-[#8E8E93] text-[14px] font-regular">{value2}</Text>
      </View>
    </View>
  );

  const InfoRow2 = ({ label1, value1, label2, value2 }: any) => (
    <View className="flex-row justify-between mb-8">
      <View className="flex-1">
        <Text className="text-black text-[14px] font-medium mb-1">{label1}</Text>
        <Text className="text-[#8E8E93] text-[14px] font-regular">{value1}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-black text-[14px] font-medium mb-1">{label2}</Text>
        <Text className="text-[#8E8E93] text-[14px] font-regular">{value2}</Text>
      </View>
    </View>
  );

  const OwnerRow = ({ label, value, isLast = false }: any) => (
    <View className={`flex-row justify-between items-center py-4 ${!isLast ? 'border-b border-gray-200' : ''}`}>
      <Text className="text-black text-[14px] font-medium">
        {label}
      </Text>
      <Text className="text-[#8E8E93] text-[14px] font-regular flex-1 text-right ml-4" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );

  if (isLoading) {
    return <ActivityIndicator size="small" color="#e9a353" />;
  }

  if (!petData) {
    return (
      <View className="flex-1 justify-center items-center bg-[#FAFAFA]">
        <MaterialCommunityIcons name="paw-off" size={64} color="#E5E7EB" />
        <Text className="text-gray-800 text-lg font-bold mt-4">Information not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-6 bg-orange-100 px-6 py-2 rounded-full">
          <Text className="text-orange-600 font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ownerInfo = petData.shelter || petData.owner || {};
  const isShelter = !!petData.shelter;
  const displayContactName = petData.contactName || ownerInfo.name || 'not updated';
  const displayContactPhone = petData.contactPhone || ownerInfo.phone || 'not updated';
  const displayContactAddress = petData.contactAddress || ownerInfo.address || 'not updated';

  const displayId = petData.code || petData.id?.substring(0, 8).toUpperCase() || petId.substring(0, 8).toUpperCase();
  const hasValidQRCode = !!petData.qrCodeUrl && petData.qrVerificationStatus === 'VERIFIED';
  const qrCodeId = petData.qrCode || petData.tags?.[0]?.code || petData.code;
  const selectedMedicalRecord = selectedVaccineIndex !== null
    ? petData?.medicalRecords?.[selectedVaccineIndex]
    : null;
  const selectedMedicalRecordIsPending = !!selectedMedicalRecord && (
    selectedMedicalRecord.verificationStatus === 'PENDING' || !selectedMedicalRecord.verificationStatus
  );
  const selectedMedicalRecordIsVerified = selectedMedicalRecord?.verificationStatus === 'VERIFIED';
  const selectedMedicalRecordIsDisputed = selectedMedicalRecord?.verificationStatus === 'DISPUTED';


  const handleDownloadImage = async (url: string, fileName: string) => {
    try {
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      const downloadRes = await FileSystem.downloadAsync(url, fileUri);

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

      await MediaLibrary.saveToLibraryAsync(downloadRes.uri);

      Alert.alert(
        isVi ? 'Thành công' : 'Success',
        isVi ? 'Ảnh đã được lưu vào thư viện ảnh!' : 'Image has been saved to your photos!'
      );
    } catch (error) {
      console.error("Lỗi tải file:", error);
      Alert.alert(
        isVi ? 'Lỗi' : 'Error',
        isVi ? 'Không thể tải xuống ảnh này lúc này.' : 'Unable to download this image right now.'
      );
    }
  };
  const handleDownloadMultipleImages = async (urls: string[]) => {
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
          const fileUri = `${FileSystem.documentDirectory}medical_record_${Date.now()}_${i}.jpg`;
          const downloadRes = await FileSystem.downloadAsync(urls[i], fileUri);
          await MediaLibrary.saveToLibraryAsync(downloadRes.uri);
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
      console.error("Lỗi tải nhiều ảnh:", error);
      Alert.alert(
        isVi ? 'Lỗi' : 'Error',
        isVi ? 'Không thể tải xuống ảnh lúc này.' : 'Unable to download images right now.'
      );
    }

  };
  const handleUpdateMedicalRecord = async (recordId: string, payload: any) => {
    try {
      setIsSavingMedicalRecord(true);

      // Upload các ảnh local (file://) lên storage trước khi gửi lên BE,
      // giữ nguyên các ảnh http(s) cũ
      const uploadedImages: string[] = [];
      for (const uri of payload.images) {
        if (uri.startsWith('http')) {
          uploadedImages.push(uri);
          continue;
        }
        try {
          const filename = uri.split('/').pop() || `medical-record-${Date.now()}.jpg`;
          const match = /\.(\w+)$/.exec(filename);
          const ext = match ? match[1].toLowerCase() : 'jpeg';
          let type = 'image/jpeg';
          if (ext === 'png') type = 'image/png';
          else if (ext === 'webp') type = 'image/webp';

          const presignedRes = await axiosClient.post('/storage/presigned-url', {
            fileName: filename, fileType: type, folder: 'medical-records',
          });
          const { uploadUrl, fileUrl } = presignedRes.data;
          const localFileFetch = await fetch(uri);
          const fileBlob = await localFileFetch.blob();
          const uploadRes = await fetch(uploadUrl, {
            method: 'PUT', headers: { 'Content-Type': type }, body: fileBlob,
          });
          if (!uploadRes.ok) throw new Error('Upload R2 failed');
          uploadedImages.push(fileUrl);
        } catch (err) {
          console.error(`[Upload Lỗi] Không thể upload ảnh ${uri}:`, err);
        }
      }

      await petService.updateMedicalRecord(petId, recordId, {
        type: payload.type,
        recordName: payload.recordName,
        recordDate: payload.recordDate,
        images: uploadedImages,
        hasNextDueDate: payload.hasNextDueDate,
        nextDueDate: payload.hasNextDueDate ? payload.nextDueDate : null,
        nextDueName: payload.hasNextDueDate ? payload.nextDueName : null,
      });

      // Cập nhật lại UI tại chỗ, không cần load lại cả trang
      setPetData((prev: any) => {
        if (!prev) return prev;
        const updatedRecords = (prev.medicalRecords || []).map((r: any) =>
          r.id === recordId
            ? {
              ...r,
              type: payload.type,
              recordName: payload.recordName,
              recordDate: payload.recordDate,
              images: uploadedImages,
              hasNextDueDate: payload.hasNextDueDate,
              nextDueDate: payload.hasNextDueDate ? payload.nextDueDate : null,
              nextDueName: payload.hasNextDueDate ? payload.nextDueName : null,
              verificationStatus: 'PENDING', // BE đã set lại PENDING sau khi sửa
            }
            : r
        );
        return { ...prev, medicalRecords: updatedRecords };
      });

      // Pet detail cache ở BE đã bị invalidate (redisService.del trong service),
      // invalidate luôn react-query cache nếu bạn dùng nó cho list khác
      queryClient.invalidateQueries({ queryKey: ['pet', petId] });

      Alert.alert(
        isVi ? 'Thành công' : 'Success',
        isVi ? 'Đã cập nhật hồ sơ y tế!' : 'Medical record updated!'
      );
    } catch (error: any) {
      Alert.alert(
        isVi ? 'Lỗi' : 'Error',
        error?.response?.data?.message || error?.message ||
        (isVi ? 'Không thể cập nhật hồ sơ.' : 'Unable to update the record.')
      );
    } finally {
      setIsSavingMedicalRecord(false);
      setEditingMedicalRecord(null);
    }
  };
  const handleReportMedicalRecord = async (data: ReportSubmitData) => {
    if (!reportingMedicalRecord) return;

    await petService.reportMedicalRecord(petId, reportingMedicalRecord.id, {
      reason: data.reason,
      details: data.details,
    });

    // 🆕 Optimistic update: verified -> disputed ngay tại UI, không cần đợi refetch
    setPetData((prev: any) => {
      if (!prev) return prev;
      const updatedRecords = (prev.medicalRecords || []).map((r: any) =>
        r.id === reportingMedicalRecord.id
          ? { ...r, verificationStatus: 'DISPUTED' }
          : r
      );
      return { ...prev, medicalRecords: updatedRecords };
    });

    queryClient.invalidateQueries({ queryKey: ['pet', petId] });
  };



  return (
    <View
      className="flex-1 bg-[#FFFFFF]"
      onTouchStart={() => {
        if (activeTooltipId !== null) {
          closeTooltip(); // Gọi hàm tắt có animation
        }
      }}
    >
      <StatusBar style="dark" />
      <SafeAreaView className="flex-1" edges={['top']}>

        {/* --- HEADER --- */}
        <View className="flex-row items-center justify-between px-4 py-2 bg-[#FFFFFF]">
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)/my-pets')}
            activeOpacity={0.7}
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 5,
              elevation: 3,
            }}
          >
            <View className="overflow-hidden left-0 rounded-full w-[36px] h-[36px] items-center justify-center"
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
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
              }}>
              <LinearGradient
                colors={['rgba(221, 221, 221, 0.3)', 'rgba(247, 247, 247, 0.7)', '#FFFFFF']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                locations={[0, 0.3, 1]}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 9999 }}
              />
              <Feather name="chevron-left" size={20} color="#1F2937" />
            </View>
          </TouchableOpacity>
          <Text className="text-[18px] font-semibold text-[#000000]">
            {isVi ? `Hồ sơ của ${petData.name}` : `${petData.name} Profile`}
          </Text>
          <View className="w-10" />
        </View>
        {petData?.needsQrReplacement && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              router.push({
                pathname: '/(tabs)/scan',
                params: { replacePetId: petId }
              });
            }}
            className="w-full flex-row bg-[#FDF5E8] py-[6px] items-center justify-center"
          >
            <View className="mr-2">
              <Image source={require('../assets/icon/alert.png')} style={{ width: 15, height: 15 }} />
            </View>
            <Text className="text-[13px] font-semibold text-[#CF7900] underline">
              {isVi ? 'Thẻ này cần thay thế ngay!' : 'This Tag Needs Replacement ASAP!'}
            </Text>
          </TouchableOpacity>
        )}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 30 }}
          scrollEventThrottle={16}
          onScroll={() => {
            if (activeTooltipId !== null) {
              closeTooltip(); // Gọi hàm tắt có animation
            }
          }}
        >

          {/* --- AVATAR & ID SECTION --- */}
          <View className="items-center mt-6 mb-[12px]">
            <View className="w-32 h-32 rounded-full bg-[#FFFFFF] border border-gray-200 items-center justify-center overflow-hidden shadow-sm">
              <Image
                source={{ uri: displayAvatar }}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
            <Text className="text-[18px] font-semibold text-gray-900 mt-[23px] mb-[12px]">{petData.name}</Text>

            {/* Pet ID Tag */}
            {hasValidQRCode && (
              <View className="bg-[#F3F4F6] px-3 py-[3px] rounded-full mb-[6px] border border-[#E5E7EB]">
                <Text className="text-[#6B7280] font-medium text-[12px] tracking-wider">
                  ID: {displayId}
                </Text>
              </View>
            )}
          </View>

          {/* --- LOST MODE / QR REQUIRED SECTION --- */}
          {hasValidQRCode ? (
            <View>
              {/* <View>
                {petData?.needsQrReplacement && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      router.push({
                        pathname: '/(tabs)/scan',
                        params: { replacePetId: petId }
                      });
                    }}
                    className="mx-[20px] mb-8 flex-row bg-[#FDF5E8] border border-[#FFAA33] rounded-[20px] p-[17px]"
                  >
                    <View className="mr-2">
                      <Image source={require('../assets/icon/alert.png')} style={{ width: 15, height: 15 }} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[16px] font-semibold text-[#CF7900] mb-1">
                        This Tag Needs Replacement ASAP!
                      </Text>
                      <Text className="text-[14px] text-[#CF7900]">
                        A damaged tag may make it harder to access important info.
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View> */}
              <View
                className="mx-[20px] mb-8 rounded-[20px]"
                style={isLostMode
                  ? {
                    shadowColor: '#8B546B1A',
                    shadowOffset: { width: 5, height: 5 },
                    shadowOpacity: 1,
                    shadowRadius: 2,
                    elevation: 3,
                    backgroundColor: isLostMode ? '#FEF2F2' : '#FFFFFF'
                  } : {}}
              >
                <View
                  className={`rounded-[20px] p-[18px] py-[21px] flex-row items-center justify-between overflow-hidden ${isLostMode
                    ? 'bg-[#FEF2F2] border border-[#FFE5E5]'
                    : 'bg-white border border-gray-200'
                    }`}
                >
                  {isLostMode && (
                    <>
                      <LinearGradient
                        colors={['#FFF8F1', '#FFF8F1', '#FFEEF0']}
                        locations={[0, 0.15, 0.35]}
                        start={{ x: 1, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{
                          position: 'absolute',
                          top: 0, left: 0, right: 0,
                          height: 3,
                          zIndex: 1,
                        }}
                      />
                      <LinearGradient
                        colors={['#FFF8F1', '#FFEEF0']}
                        locations={[0.3, 1]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                      />
                    </>
                  )}

                  <View className="flex-row items-start flex-1 mr-4 z-10">
                    {isLostMode && (
                      <View className="mt-[1px] mr-3">
                        <Feather
                          name="alert-circle"
                          size={20}
                          color="#8B3A3A"
                        />
                      </View>
                    )}
                    <View className="flex-1">
                      <Text className={`font-medium text-[16px] leading-6 ${isLostMode ? 'text-[#8B3A3A]' : 'text-[#000000]'}`}>
                        Lost Pet Mode
                      </Text>
                      <Text className={`text-[14px] mt-0.5 font-light ${isLostMode ? 'text-[#8B3A3ACC]' : 'text-gray-400'}`}>
                        {isLostMode ? (
                          <Text>
                            {isVi ? "Bật" : "Turn on"} •{' '}
                            <Text
                              className="underline font-medium"
                              onPress={() => {
                                // Ưu tiên lấy reportId của lần quét gần nhất
                                // Nếu chưa có ai quét (chỉ mới báo mất), thì backend của bạn CẦN TRẢ VỀ reportId của chính event báo mất đó
                                const reportId = petData?.latestReportId || petData?.tags?.[0]?.latestReportId;

                                if (reportId) {
                                  router.push({
                                    pathname: '/tag-report-detail',
                                    params: {
                                      reportId: reportId,
                                      openFrom: 'profile'
                                    }
                                  });
                                } else {
                                  Alert.alert("Notice", "Your pet hasn't been scanned by anyone yet. Keep your phone nearby for notifications!");
                                }
                              }}
                            >
                              See Pet's Activity
                            </Text>
                          </Text>
                        ) : (
                          isVi ? "Tắt • Bé đang an toàn" : "Turn Off • Pet is save"
                        )}
                      </Text>
                    </View>
                  </View>

                  <View className="justify-center z-10">
                    <Switch
                      disabled={isTogglingLostMode}
                      trackColor={{ false: '#E5E7EB', true: '#8B3A3A' }}
                      thumbColor={'#FFFFFF'}
                      ios_backgroundColor="#E5E7EB"
                      onValueChange={handleLostModeToggle}
                      value={isLostMode}
                      style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }}
                    />
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push({ pathname: '/(tabs)/scan', params: { linkPetId: petId } })}
              className="mx-[20px] mb-8 flex-row bg-[#FDFCE8] border border-[#FDF094] rounded-[20px] p-[17px]"
            >
              <View className="mr-2">
                <Image
                  source={require('../assets/icon/scan-icon.png')}
                  style={{ width: 15, height: 15 }}
                  resizeMode="cover"
                />
              </View>
              <View className="flex-1">
                <Text className="text-[16px] font-bold text-[#AC8530] mb-1">QR Code Required</Text>
                <Text className="text-[14px] text-[#AC8530] leading-5">
                  Scan QR tag to enable PawHistory & Lost Pet functions.
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* --- PET INFORMATION CARD --- */}
          <View className="mx-[20px] mb-8 ">
            <View className=''>
              <Text className="font-semibold text-[16px] text-black mb-5">Pet Information</Text>
            </View>
            <View className='bg-white rounded-[24px] p-6 border border-gray-200'>

              <InfoRow
                label1={isVi ? "Giới tính" : "Gender"}
                value1={
                  petData.gender
                    ? (['nam', 'male'].includes(petData.gender.trim().toLowerCase())
                      ? (isVi ? "Đực" : "Male")
                      : ['nữ', 'nu', 'female'].includes(petData.gender.trim().toLowerCase())
                        ? (isVi ? "Cái" : "Female")
                        : (petData.gender.charAt(0).toUpperCase() + petData.gender.slice(1).toLowerCase()))
                    : (isVi ? "Chưa cập nhật" : "Not updated")
                }
                label2={isVi ? "Triệt sản" : "Sterilized"}
                value2={
                  petData.isSpayedNeutered === true ? (isVi ? 'Có' : 'Yes') :
                    petData.isSpayedNeutered === false ? (isVi ? 'Không' : 'No') :
                      (isVi ? 'Chưa cập nhật' : 'Not updated')
                }
              />
              <InfoRow
                label1="Breed"
                value1={petData.breed || 'Not updated'}
                label2="Color" value2={petData.color || 'Not updated'}
              />
              <InfoRow2
                label1="Birthday"
                value1={
                  petData.dob
                    ? new Date(petData.dob).toLocaleDateString('en-GB')
                    : (petData.age ? `${petData.age} tuổi` : 'Not updated')
                }
                label2="Weight" value2={petData.weight != null ? `${petData.weight} kg` : 'Not updated'}
              />
              <View className="h-[1px] bg-gray-200 w-full mb-5" />
              <Text className="text-black text-[14px] font-medium mb-2">Notes</Text>
              <Text className="text-[#8E8E93] text-[14px] leading-5">
                {petData.description || 'Loves Belly rubs and playing fetch. Very friendly with children'}
              </Text>

            </View>
          </View>

          {/* --- OWNER / SHELTER INFORMATION CARD --- */}
          <View className="mx-[20px] mb-8">
            <Text className="font-semibold text-[16px] text-black mb-5">
              {isShelter ? 'Shelter Information' : 'Owner Information'}
            </Text>

            <View className="bg-white rounded-[20px] border border-gray-200 px-5">
              <OwnerRow
                label="Full Name"
                value={displayContactName}
              />
              <OwnerRow
                label="Phone"
                value={displayContactPhone}
              />
              <OwnerRow
                label="Address"
                value={displayContactAddress}
                isLast={true}
              />
            </View>
          </View>

          <View className="mx-[20px] mb-8">
            <View className="flex-row justify-between items-center mb-5">
              <View className="flex-row items-center">
                <Text className="text-[16px] font-semibold text-black">
                  {isVi ? 'PawHistory' : 'PawHistory'}
                </Text>
                <Text className="text-[16px] font-semibold text-[#D1D1D6] mx-2">|</Text>
                <Text className="text-[16px] font-regular text-[#8E8E93]">
                  {isVi ? 'Hành trình' : 'Journey'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={toggleHistory}
                activeOpacity={0.6}
                className="flex-row items-center px-3 py-1.5 rounded-full"
              >
                <Text className="text-[13px] text-[#F2A465] font-medium mr-1">
                  {showHistory ? (isVi ? 'Ẩn' : 'Hide') : (isVi ? 'Xem' : 'View')}
                </Text>
                <Feather name={showHistory ? 'chevron-up' : 'chevron-down'} size={16} color="#F2A465" />
              </TouchableOpacity>
            </View>

            {showHistory && (
              <View className="py-[20px] px-[12px] border border-[#E5E5EA] rounded-[20px] bg-white">

                {combinedHistory.length > 0 ? (
                  combinedHistory.map((item: any, index: number) => {
                    const isLastItem = index === combinedHistory.length - 1;
                    const uiConfig = PAW_HISTORY_UI_CONFIG[item.type as PawHistoryUIType] ?? DEFAULT_HISTORY_UI;
                    const formattedDate = new Date(item.date).toLocaleDateString(
                      isVi ? 'vi-VN' : 'en-GB',
                      { day: '2-digit', month: '2-digit', year: 'numeric' },
                    );

                    return (
                      <View key={item.id ?? index} className="flex-row min-h-[54px]">

                        {/* Cột trái: icon + line */}
                        <View className="w-[36px] relative mr-[5px]">

                          {/* Vertical line — nét đứt nếu pending, nét liền bình thường */}
                          {!isLastItem && (
                            item.isPending ? (
                              <View
                                className="absolute overflow-hidden items-center"
                                style={{ top: 24, bottom: -2, left: 14.25, width: 1.5 }}
                              >
                                {Array.from({ length: 20 }).map((_, i) => (
                                  <View
                                    key={i}
                                    style={{
                                      width: 1.5,
                                      height: 4,
                                      backgroundColor: uiConfig.lineColor,
                                      marginBottom: 4,
                                    }}
                                  />
                                ))}
                              </View>
                            ) : (
                              <View
                                className="absolute w-[1.5px]"
                                style={{
                                  top: 24,
                                  bottom: -2,
                                  left: 14.25,
                                  backgroundColor: uiConfig.lineColor,
                                }}
                              />
                            )
                          )}

                          {/* Icon tròn */}
                          <View
                            className="w-[30px] h-[30px] rounded-full items-center justify-center z-10"
                            style={{ backgroundColor: uiConfig.iconBgColor }}
                          >
                            <Image
                              source={uiConfig.icon}
                              style={{ width: 16, height: 16 }}
                              resizeMode="contain"
                            />
                          </View>
                        </View>

                        {/* Cột phải: nội dung */}
                        {/* Đã xóa pr-3 ở đây để ngày tháng bo sát mép 12px của khung ngoài */}
                        <View className={`flex-1 ${!isLastItem ? 'pb-4' : ''}`}>

                          {/* Title + pending badge + date */}
                          <View className="flex-row justify-between items-start">
                            <View className="flex-1 flex-row flex-wrap items-center pr-2">
                              <Text
                                className="text-[14px] font-medium text-black leading-[18px]"
                                numberOfLines={1}
                              >
                                {item.displayTitle}
                              </Text>

                              {/* Icon chấm than (pending) */}
                              {item.isPending && (
                                <Text
                                  suppressHighlighting
                                  onPress={(e) => {
                                    const { pageX, pageY } = e.nativeEvent;
                                    handleToggleTooltip(item.id, pageX, pageY);
                                  }}
                                  style={{ marginLeft: 4 }}
                                >
                                  <Feather
                                    name="alert-circle"
                                    size={13}
                                    color="#BBB4B5"
                                  />
                                </Text>
                              )}
                            </View>

                            <Text
                              className="text-[11px] font-regular text-[#8E8E93] pt-[2px]"
                              style={{ flexShrink: 0 }}
                            >
                              {formattedDate}
                            </Text>
                          </View>

                          {/* Description */}
                          <Text
                            className="text-[12px] font-regular text-[#9B9B9B] mt-[2px] leading-[15px]"
                          >
                            {item.displayDescription}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <Text className="text-center text-[#8E8E93] py-4 font-regular text-[13px] italic">
                    {isVi ? 'Chưa có lịch sử hoạt động.' : 'No history available yet.'}
                  </Text>
                )}

                {/* Footer badge */}
                {/* Thêm mx-[8px] để bo gọn lại xíu */}
                <View className="flex-row py-[8px] items-center justify-center gap-2 mt-4 bg-[#F5F5F5] rounded-[8px] mx-[8px]">
                  <Image
                    source={require('../assets/icon/lock.png')}
                    style={{ width: 12, height: 12 }}
                    resizeMode="cover"
                  />
                  <Text className="font-regular text-[12px] text-[#8E8E93]">
                    {isVi
                      ? 'Dòng thời gian này được tạo tự động và không thể chỉnh sửa.'
                      : 'This timeline is auto-generated and append-only.'}
                  </Text>
                </View>

              </View>
            )}
          </View>

          {/* --- VACCINATION & MEDICAL RECORD SECTION --- */}
          <View className="mx-[20px] mb-8">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-[16px] font-semibold text-[#111827] tracking-[0.06px]">
                {isVi ? 'Hồ sơ y tế' : 'Medical Records'}
              </Text>
            </View>

            {petData?.medicalRecords && petData.medicalRecords.length > 0 ? (
              <View className="flex-col gap-3">
                {petData.medicalRecords.map((record: any, index: number) => {
                  const isPending = record.verificationStatus === 'PENDING' || !record.verificationStatus;
                  const isDisputed = record.verificationStatus === 'DISPUTED';
                  const badge = getMedicalRecordBadgeConfig(record.verificationStatus, isVi);
                  const recordIcon = getMedicalRecordIcon(record.type);


                  const formattedRecordDate = record.recordDate
                    ? new Date(record.recordDate).toLocaleDateString(isVi ? 'vi-VN' : 'en-US')
                    : '';

                  const formattedNextDueDate = record.nextDueDate
                    ? new Date(record.nextDueDate).toLocaleDateString(isVi ? 'vi-VN' : 'en-US')
                    : '';

                  const shouldShowNextDueDate = record.hasNextDueDate && !!record.nextDueDate;
                  const imageList = Array.isArray(record.images) ? record.images.filter(Boolean) : [];

                  return (
                    <View key={record.id || index} className="border border-[#E5E5E5] rounded-[16px] p-3 flex-row items-start bg-[#FFFF] shadow-sm shadow-orange-100/50">

                      {/* ICON TRUNG TÍNH: border ghi đậm, nền ghi nhạt, không tô màu theo loại */}
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
                          {/* TITLE + CHIP nằm chung 1 khối, tự wrap xuống dòng cùng nhau nếu tên dài */}
                          <View className="flex-1 flex-row flex-wrap items-center pr-2">
                            <Text className="text-[14px] text-[#000000] font-medium leading-[16px] mr-2" numberOfLines={1}>
                              {getSafeBilingualText(record.recordName, isVi)}
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

                          {/* NÚT MORE OPTIONS: hiện khi có ảnh hoặc record đang pending để có thể Edit Record */}
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              const { pageY } = e.nativeEvent;
                              const imageList = Array.isArray(record.images) ? record.images.filter(Boolean) : [];
                              setMenuPosition({ top: pageY + 10, right: 32 });
                              setSelectedVaccineIndex(index);
                              setCurrentImageList(imageList);
                              setCurrentImageIndex(0);
                              setShowVaccineMenu(true);
                            }}

                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Image source={require('../assets/icon/more-vertical.png')} style={{ width: 11.1, height: 11.1 }} resizeMode="cover" />
                          </TouchableOpacity>
                        </View>

                        <View className="mt-[2px]">
                          <Text className="text-[12px] font-regular text-[#8E8E93]">
                            {isVi ? 'Loại' : 'Type'}: {record.type ? (record.type.charAt(0).toUpperCase() + record.type.slice(1).toLowerCase()) : ''} | {isVi ? 'Ngày' : 'Date'}: {formattedRecordDate}
                          </Text>
                          {shouldShowNextDueDate && (
                            <Text className="text-[12px] font-medium text-[#E89B5A] mt-[2px]">
                              {isVi ? 'Lịch tiếp theo' : 'Next due date'}: {formattedNextDueDate}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View className="bg-white border border-dashed border-[#E5E5E5] rounded-[12px] py-5 items-center justify-center">
                <View className="rounded-full items-center justify-center mb-2">
                  <Image source={require('../assets/icon/file.png')} style={{ width: 17, height: 17 }} resizeMode="cover" />
                </View>
                <Text className="text-[16px] text-black font-medium mb-2">{isVi ? "Chưa có hồ sơ y tế" : "No medical records yet"}</Text>
                <Text className="text-[14px] text-[#A9ACB4] font-regular">{isVi ? "Các hồ sơ được thêm vào sẽ hiển thị ở đây." : "Records added to PawLife will be shown here."}</Text>
              </View>
            )}
          </View>

          {/* --- ACTION BUTTONS --- */}
          <View className="mx-[20px] gap-3">
            <TouchableOpacity
              className="w-full bg-[#E89B5A] py-5 rounded-[16px] shadow-md shadow-orange-200 items-center overflow-hidden"
              onPress={() => router.push(`/edit-pet?id=${petId}`)}
            >
              <Text className="text-white font-semibold text-[16px]">Edit Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (hasValidQRCode) {
                  router.push(`/view-qr-code?id=${petId}`);
                } else {
                  router.push({ pathname: '/(tabs)/scan', params: { linkPetId: petId } });
                }
              }}
              activeOpacity={0.7}
              className="w-full py-5 rounded-[16px] items-center bg-white border border-[#FF9C56]"
            >
              <View className="flex-row items-center gap-2">
                <Text className="font-medium text-[16px] text-[#E89B5A]">
                  {hasValidQRCode ? "View QR Code" : "Scan QR Code"}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              className="w-full py-4 rounded-full items-center mt-2 active:opacity-70"
              onPress={handleRemovePet}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator color="#FF0000" size="small" />
              ) : (
                <Text className="text-red-500 font-ligter text-[16px]">Remove Pet</Text>
              )}
            </TouchableOpacity>
          </View>

        </ScrollView>
      </SafeAreaView>

      {/* --- LOST MODE TOGGLE MODAL --- */}
      <Modal
        visible={showLostModeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLostModeModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/60 px-5">
          <View className="bg-white rounded-[24px] p-6 w-full items-center shadow-xl">

            <View className={`w-16 h-16 rounded-full items-center justify-center mb-4 border-[4px] ${pendingLostMode ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'
              }`}>
              <Feather
                name={pendingLostMode ? "alert-triangle" : "check-circle"}
                size={32}
                color={pendingLostMode ? "#EF4444" : "#10B981"}
              />
            </View>

            <Text className="text-xl font-bold text-gray-900 text-center mb-2">
              {pendingLostMode ? t('lostMode.titleOn') : t('lostMode.titleOff')}
            </Text>

            <Text className="text-gray-500 text-center text-sm mb-8 leading-5 px-2">
              {pendingLostMode ? t('lostMode.descOn') : t('lostMode.descOff')}
            </Text>

            <View className="flex-row w-full gap-3">
              <TouchableOpacity
                className="flex-1 bg-gray-100 py-3.5 rounded-full items-center"
                onPress={() => setShowLostModeModal(false)}
              >
                <Text className="text-gray-600 font-bold text-base">
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`flex-1 py-3.5 rounded-full items-center shadow-sm ${pendingLostMode ? 'bg-[#EF4444] shadow-red-200' : 'bg-[#10B981] shadow-green-200'
                  }`}
                onPress={executeToggleMode}
              >
                <Text className="text-white font-bold text-base">
                  {pendingLostMode ? t('lostMode.confirmOn') : t('lostMode.confirmOff')}
                </Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

      {/* --- MENU MODAL --- */}
      {/* --- MENU MODAL --- */}
      <Modal
        visible={showVaccineMenu}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setShowVaccineMenu(false);
          setSelectedVaccineIndex(null);
        }}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={() => {
            setShowVaccineMenu(false);
            setSelectedVaccineIndex(null);
          }}
        >
          <View
            className="absolute bg-white rounded-xl border border-gray-100 w-44"
            style={{
              top: menuPosition.top,
              right: menuPosition.right,
              elevation: 8,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 10
            }}
          >
            {/* View record: LUÔN hiện, dùng chung cho cả record pending và verified */}
            <TouchableOpacity
              className="flex-row items-center px-4 py-3"
              activeOpacity={0.6}
              onPress={() => {
                setShowVaccineMenu(false);
                const record = selectedVaccineIndex !== null ? petData?.medicalRecords?.[selectedVaccineIndex] : null;
                if (record) {
                  setViewingMedicalRecord(record);
                  setShowViewMedicalModal(true);
                }
                setSelectedVaccineIndex(null);
              }}
            >
              <Text className="text-[14px] text-gray-700 ml-3 font-medium">
                {isVi ? 'Xem hồ sơ' : 'View record'}
              </Text>
            </TouchableOpacity>

            {/* Record đã VERIFIED -> chỉ cho Report */}
            {selectedMedicalRecordIsVerified && (
              <TouchableOpacity
                className="flex-row items-center px-4 py-3 border-t border-gray-50"
                activeOpacity={0.6}
                onPress={() => {
                  setShowVaccineMenu(false);
                  const record = selectedVaccineIndex !== null ? petData?.medicalRecords?.[selectedVaccineIndex] : null;
                  if (record) {
                    setReportingMedicalRecord(record);
                    setShowReportMedicalRecordModal(true);
                  }
                  setSelectedVaccineIndex(null);
                }}
              >
                <Text className="text-[14px] text-red-600 ml-3 font-medium">
                  {isVi ? 'Báo cáo' : 'Report'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Record đang PENDING -> cho Edit + Delete */}
            {selectedMedicalRecordIsPending && (
              <>
                <TouchableOpacity
                  className="flex-row items-center px-4 py-3 border-t border-gray-50"
                  activeOpacity={0.6}
                  onPress={() => {
                    setShowVaccineMenu(false);
                    const record = selectedVaccineIndex !== null ? petData?.medicalRecords?.[selectedVaccineIndex] : null;
                    if (record) {
                      setEditingMedicalRecord(record);
                      setShowEditMedicalModal(true);
                    }
                    setSelectedVaccineIndex(null);
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
                    setShowVaccineMenu(false);
                    // TODO: handle delete medical record
                    setSelectedVaccineIndex(null);
                  }}
                >
                  <Text className="text-[14px] text-red-600 ml-3 font-medium">
                    {isVi ? 'Xóa' : 'Delete'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {selectedMedicalRecordIsDisputed && (
              <View className="px-4 py-3 border-t border-gray-50">
                <Text className="text-[12px] text-[#8E8E93] italic leading-[16px]">
                  {isVi
                    ? 'Hồ sơ đang được PawLife xem xét lại sau báo cáo của bạn.'
                    : 'This record is being reviewed by PawLife following your report.'}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ========================================================= */}
      {/* IN-APP FULLSCREEN IMAGE VIEWER MODAL (CÓ USE SafeAreaInsets CỦA IOS) */}
      {/* ========================================================= */}
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
              {isVi ? 'Hồ sơ y tế' : 'Vaccination Record'}
              {currentImageList.length > 1 ? `  ${currentImageIndex + 1}/${currentImageList.length}` : ''}
            </Text>
            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                className="p-2.5 bg-white/20 rounded-full"
                onPress={async () => {
                  const currentUri = currentImageList[currentImageIndex];
                  if (currentUri) {
                    await handleDownloadImage(currentUri, `medical_record_${Date.now()}.jpg`);
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

          {currentImageList.length > 0 && (
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
              {currentImageList.map((uri, idx) => (
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

          {/* Chấm tròn báo trang hiện tại, chỉ hiện khi có >1 ảnh */}
          {currentImageList.length > 1 && (
            <View className="absolute bottom-10 flex-row gap-2">
              {currentImageList.map((_, idx) => (
                <View
                  key={idx}
                  className={`w-2 h-2 rounded-full ${idx === currentImageIndex ? 'bg-white' : 'bg-white/30'}`}
                />
              ))}
            </View>
          )}
        </View>
      </Modal>
      {/* --- PAW HISTORY PENDING TOOLTIP (popup luôn căn giữa ngay trên icon, mũi tên cố định ở giữa popup) --- */}
      {activeTooltipId !== null && (
        <Animated.View
          onTouchStart={(e) => e.stopPropagation()}
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            top: tooltipAnchor.y - 95,
            left: tooltipAnchor.x - 85, // 85 = nửa chiều rộng popup (170/2), để icon luôn nằm giữa popup
            width: 170,
            backgroundColor: 'white',
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.12,
            shadowRadius: 4,
            elevation: 8,
            zIndex: 999,

            opacity: tooltipAnim,
            transform: [
              {
                translateY: tooltipAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              },
            ],
          }}
        >
          <Text className="text-[12px] text-[#333333] leading-[18px] text-left">
            {isVi
              ? "Hồ sơ sẽ được thêm vào hành trình sau khi xác minh hoàn tất."
              : "The record will be added to the timeline once verification is complete."}
          </Text>

          {/* Mũi tên tam giác chỉ xuống - LUÔN nằm chính giữa popup (170/2 = 85) */}
          <View
            style={{
              position: 'absolute',
              bottom: -6,
              left: 85,
              marginLeft: -6, // Kéo lùi lại bằng viền border (6px) để đỉnh nhọn nhắm thẳng tâm
              width: 0,
              height: 0,
              borderLeftWidth: 6,
              borderRightWidth: 6,
              borderTopWidth: 6,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderTopColor: '#FFFFFF',
            }}
          />
        </Animated.View>
      )}
      <AddMedicalRecordModal
        visible={showEditMedicalModal}
        mode="edit"
        initialRecord={editingMedicalRecord}
        species={(petData?.species as 'Dog' | 'Cat') || 'Dog'}
        onClose={() => {
          setShowEditMedicalModal(false);
          setEditingMedicalRecord(null);
        }}
        onSubmit={() => { }} // không dùng ở edit mode, nhưng prop bắt buộc nên truyền no-op
        onSubmitEdit={(recordId, payload) => {
          setShowEditMedicalModal(false);
          handleUpdateMedicalRecord(recordId, payload);
        }}
      />
      <AddMedicalRecordModal
        visible={showViewMedicalModal}
        mode="view"
        initialRecord={viewingMedicalRecord}
        species={(petData?.species as 'Dog' | 'Cat') || 'Dog'}
        onClose={() => {
          setShowViewMedicalModal(false);
          setViewingMedicalRecord(null);
        }}
        onSubmit={() => { }}
        onSubmitNextDueOnly={(recordId, payload) => {
          setShowViewMedicalModal(false);
          handleUpdateNextDueOnly(recordId, payload);
        }}
      />
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
    </View>
  );
}