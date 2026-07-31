import { useLanguage } from '@/contexts/LanguageContext';
import { Feather, Ionicons } from '@expo/vector-icons';
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
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from './AppText';
import { TextInput } from './AppTextInput';
import CalendarPopupField from './CalendarPopupField';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function buildBilingual(sourceText: string): { vi: string; en: string } {
  const trimmed = sourceText?.trim() || '';
  return { vi: trimmed, en: trimmed };
}

// Lấy text hiển thị theo ngôn ngữ hiện tại từ field recordName/nextDueName
// (field này có thể là string thường, JSON string "{...}", hoặc object {vi, en})
function extractBilingualText(val: any, isVi: boolean): string {
  if (!val) return '';
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        return (isVi ? parsed.vi : parsed.en) || parsed.en || parsed.vi || '';
      } catch {
        return val;
      }
    }
    return val;
  }
  if (typeof val === 'object') {
    return (isVi ? val.vi : val.en) || val.en || val.vi || '';
  }
  return String(val);
}

const formatShortDate = (date: Date, isVi?: boolean) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};


const RECORD_OPTIONS = [
  {
    id: 'vaccination',
    titleEn: 'Vaccination',
    descEn: 'Shots, booster, and immunizations',
    titleVi: 'Tiêm phòng',
    descVi: 'Lưu mũi tiêm và đặt lịch tiếp theo',
    iconUnselected: require('../assets/icon/vacc-icon.png'),
    iconSelected: require('../assets/icon/vacc-icon-selected.png'),
  },
  {
    id: 'examination',
    titleEn: 'Examination',
    descEn: 'Regular check-ups and exam',
    titleVi: 'Khám bệnh',
    descVi: 'Kiểm tra sức khỏe định kì hằng năm',
    iconUnselected: require('../assets/icon/exam-vacc-icon.png'),
    iconSelected: require('../assets/icon/exam-icon-selected.png'),
  },
  {
    id: 'dental',
    titleEn: 'Dental',
    descEn: 'Teeth cleaning and dental care',
    titleVi: 'Răng miệng',
    descVi: 'Vệ sinh cao răng và kiểm tra nướu',
    iconUnselected: require('../assets/icon/dental-vacc-icon.png'),
    iconSelected: require('../assets/icon/dental-icon-selected.png'),
  },
  {
    id: 'other',
    titleEn: 'Other',
    descEn: 'Other medical records',
    titleVi: 'Khác',
    descVi: 'Hồ sơ y tế khác',
    iconUnselected: require('../assets/icon/other-vacc-icon.png'),
    iconSelected: require('../assets/icon/other-icon-selected.png'),
  },
];

const VACCINE_OPTIONS: Record<'Dog' | 'Cat', { id: string; label: string }[]> = {
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

// Chuẩn hoá bất kỳ giá trị species nào (string 'Dog'/'DOG'/'dog', hoặc object
// bilingual {vi:'Chó', en:'Dog'} từ Prisma Json field, hoặc JSON string) về
// đúng key 'Dog' | 'Cat' dùng làm index cho VACCINE_OPTIONS.
// Luôn fallback về 'Dog' để KHÔNG BAO GIỜ trả về undefined — đây chính là
// nguồn gây lỗi "Cannot read property 'find' of undefined".
function resolveSpeciesKey(species: any): 'Dog' | 'Cat' {
  if (!species) return 'Dog';

  let raw = species;
  if (typeof raw === 'object') {
    raw = raw.en || raw.vi || '';
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        raw = parsed.en || parsed.vi || '';
      } catch {
        // giữ raw nguyên bản nếu parse lỗi
      }
    }
  }

  const normalized = String(raw).toLowerCase();
  if (normalized.includes('cat') || normalized.includes('mèo') || normalized.includes('meo')) {
    return 'Cat';
  }
  return 'Dog';
}

const OPTION_ROW_H = 64;
const BASE_HEIGHT = 52 + 21 + 29 + (OPTION_ROW_H * 4) + 21;

// Map từ id RECORD_OPTIONS <-> record.type lưu ở backend (vaccination/examination/dental/other
// đang được dùng làm cả "selectedType" UI lẫn giá trị gửi lên BE qua field `type`,
// nên khi edit ta chỉ cần map ngược lại đúng id nếu type khớp, fallback 'other').
function resolveSelectedTypeFromRecord(record: any): string {
  const t = (record?.type || '').toLowerCase();
  const known = RECORD_OPTIONS.map(o => o.id);
  if (known.includes(t)) return t;
  return 'other';
}

interface AddMedicalRecordModalProps {
  visible: boolean;
  onClose: () => void;
  /** Gọi khi tạo record mới (mode === 'create') */
  onSubmit: (data: any) => void;
  /** Gọi khi sửa record có sẵn (mode === 'edit'). Nhận (recordId, data) */
  onSubmitEdit?: (recordId: string, data: any) => void;
  /**
   * Gọi khi đang ở mode === 'view' và người dùng chỉ đổi Next Due Date/Name.
   * Nhận (recordId, { nextDueName, nextDueDate }) — KHÔNG gửi các field khác,
   * để tránh ghi đè nhầm dữ liệu đã verify ở các field còn lại.
   */
  onSubmitNextDueOnly?: (recordId: string, data: { nextDueName: string; nextDueDate: string }) => void;
  species?: 'Dog' | 'Cat';
  /** 'create' (mặc định), 'edit' (sửa toàn bộ), hoặc 'view' (chỉ xem, chỉ sửa được Next Due Date) */
  mode?: 'create' | 'edit' | 'view';
  /** Record gốc cần sửa/xem, bắt buộc khi mode === 'edit' | 'view' */
  initialRecord?: any | null;
}

export default function AddMedicalRecordModal({
  visible,
  onClose,
  onSubmit,
  onSubmitEdit,
  onSubmitNextDueOnly,
  species = 'Dog',
  mode = 'create',
  initialRecord = null,
}: AddMedicalRecordModalProps) {
  const { language } = useLanguage();
  const isVi = language === 'vi';
  const isEditMode = mode === 'edit' && !!initialRecord;
  const isViewMode = mode === 'view' && !!initialRecord;
  const isReadOnly = isViewMode; // alias cho dễ đọc ở JSX phía dưới
  // species có thể được truyền vào sai kiểu (object bilingual {vi,en}, chuỗi khác hoa/thường, ...)
  // resolveSpeciesKey luôn trả về đúng 'Dog' | 'Cat', không bao giờ undefined.
  const safeSpecies = resolveSpeciesKey(species);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Lưu giá trị GỐC của nextDueName/nextDueDate lúc mở modal (chỉ dùng ở view mode)
  // để so sánh và biết người dùng có thực sự thay đổi gì không → quyết định hiện/ẩn nút Update.
  const originalNextDueRef = useRef<{ name: string; date: Date | null }>({ name: '', date: null });

  const [selectedType, setSelectedType] = useState<string | null>(null);

  const [recordName, setRecordName] = useState('');
  const [recordDate, setRecordDate] = useState(new Date());
  // images: có thể là local file:// uri (ảnh mới chọn) hoặc http(s) url (ảnh cũ đã upload)
  const [images, setImages] = useState<string[]>([]);

  const [vaccineType, setVaccineType] = useState<string>('');
  const [showVaccineDropdown, setShowVaccineDropdown] = useState(false);
  const [doseNumber, setDoseNumber] = useState<1 | 2 | 3>(1);


  const [hasNextDueDate, setHasNextDueDate] = useState(false);
  const [nextDueName, setNextDueName] = useState('');
  const [nextDueDate, setNextDueDate] = useState(new Date());
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const imageScrollRef = useRef<ScrollView>(null);
  const [activeDatePicker, setActiveDatePicker] = useState<'record' | 'next' | null>(null);

  // 🚀 THAY ĐỔI: không còn dùng <Modal> để bọc component này nữa, nên không
  // cần "claim" quyền host qua registerModalHost — GlobalDatePickerContext ở
  // root luôn là nơi DUY NHẤT render DateTimePicker native, không có 2 native
  // window nào tranh chấp nhau nữa.


  // 🚀 THAY ĐỔI: giữ component mount thêm một khoảng ngắn sau khi visible=false
  // để animation đóng (backdropOpacity) có thời gian chạy mượt trước khi thực
  // sự gỡ nội dung ra khỏi cây view.
  const [shouldRender, setShouldRender] = useState(visible);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => setShouldRender(false), 250);
      return () => clearTimeout(timer);
    }
  }, [visible]);





  const hasNextDueChanged = isViewMode && (() => {
    const original = originalNextDueRef.current;
    const originalHasNextDue = !!original.date;

    // Trạng thái bật/tắt bị thay đổi -> Chắc chắn là có sửa
    if (hasNextDueDate !== originalHasNextDue) return true;

    // Nếu đang bật, thì kiểm tra xem text hoặc ngày có bị sửa không
    if (hasNextDueDate) {
      const nameChanged = nextDueName.trim() !== (original.name || '').trim();
      const dateChanged = original.date ? nextDueDate.getTime() !== original.date.getTime() : true;
      return nameChanged || dateChanged;
    }

    return false;
  })();

  // Cờ này để tắt các useEffect "tự tính toán nextDueDate/nextDueName" khi vừa prefill
  // dữ liệu edit vào, tránh việc auto-overwrite giá trị gốc người dùng đã lưu trước đó.
  const skipAutoCalcRef = useRef(false);

  const modalHeight = useRef(new Animated.Value(BASE_HEIGHT)).current;
  const detailsFade = useRef(new Animated.Value(0)).current;
  const nextDueFade = useRef(new Animated.Value(0)).current;
  const imagesFade = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // --- STATE VÀ REF CHO DROPDOWN KÍNH MỜ ---


  const optionHeights = useRef(
    RECORD_OPTIONS.reduce<Record<string, Animated.Value>>((acc, opt) => {
      acc[opt.id] = new Animated.Value(OPTION_ROW_H);
      return acc;
    }, {})
  ).current;

  // Auto-tính nextDueDate/nextDueName cho vaccine — CHỈ áp dụng khi đang tạo mới
  // hoặc khi user tự đổi vaccine/dose trong lúc edit (không chạy ngay sau khi prefill)
  useEffect(() => {
    if (selectedType !== 'vaccination') return;
    if (skipAutoCalcRef.current) {
      skipAutoCalcRef.current = false;
      return;
    }
    if (vaccineType) {
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

      const vName = VACCINE_OPTIONS[safeSpecies].find(v => v.id === vaccineType)?.label || '';
      setNextDueName(isVi ? `${vName}` : `${vName} Booster`);
    }
  }, [selectedType, vaccineType, recordDate, doseNumber, safeSpecies, isVi]);

  // Auto-tính Next Due cho Examination (1 năm) / Dental (6 tháng) — Other thì ẨN HẲN section
  useEffect(() => {
    if (!selectedType || selectedType === 'vaccination') return;
    if (skipAutoCalcRef.current) {
      skipAutoCalcRef.current = false;
      return;
    }

    if (selectedType === 'other') {
      setHasNextDueDate(false);
      setNextDueName('');
      return;
    }

    setHasNextDueDate(true);

    const nextDate = new Date(recordDate);
    if (selectedType === 'examination') {
      nextDate.setFullYear(nextDate.getFullYear() + 1); // 1 năm/lần
    } else if (selectedType === 'dental') {
      nextDate.setMonth(nextDate.getMonth() + 6); // 6 tháng/lần
    }
    setNextDueDate(nextDate);

    const baseName = recordName.trim()
      || (selectedType === 'examination'
        ? (isVi ? 'Khám bệnh' : 'Examination')
        : (isVi ? 'Khám răng' : 'Dental Checkup'));

    setNextDueName(isVi ? `${baseName}` : `${baseName} Reminder`);
  }, [selectedType, recordName, recordDate, isVi]);

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
        if (showVaccineDropdown && !isReadOnly) {
          const itemsCount = VACCINE_OPTIONS[safeSpecies].length;
          detailsH += Math.min(160, itemsCount * 41 + 2) + 12;
        }
        if (!isReadOnly && vaccineType && vaccineType !== 'DOG_RABIES' && vaccineType !== 'CAT_RABIES' && vaccineType !== 'DOG_BORDETELLA') {
          detailsH += 46;
        }
        if (isReadOnly && initialRecord?.vaccineDoses && initialRecord.vaccineDoses.length > 0) {
          // Tính toán nhẩm: padding (24) + title (20) + mỗi item khoảng 40px + margin bottom (12)
          detailsH += 36 + (initialRecord.vaccineDoses.length * 40) + 12;
        }
      }

      // Khối "Upload Photos" (đường viền nét đứt) chỉ tồn tại khi KHÔNG readonly
      if (!isReadOnly && images.length < 3) {
        detailsH += 56; // Chỉ cộng khi khối Upload Photos thực sự còn hiển thị
      }

      if (images.length > 0) {
        detailsH += Math.ceil(images.length / 3) * 94;
      }

      const showNextDue = selectedType !== 'other';

      if (showNextDue) {
        detailsH += 13;
        detailsH += 30;
        if (hasNextDueDate) detailsH += 36;
      }


      target += detailsH;

      // 🚀 FIX: Thêm khoảng bù trừ 16px (buffer) cho các margin/padding bị thiếu trong công thức tính detailsH
      const BOTTOM_BUFFER = 38;

      if (!isReadOnly) {
        // Chế độ Create/Edit: nút Submit (17 top + 37 height + 30 bottom = 84)
        target += 75;
      } else {
        // Chế độ View: giữ nguyên logic cũ
        if (hasNextDueChanged) {
          target += BOTTOM_BUFFER + 71;
        } else {
          target += BOTTOM_BUFFER + 24;
        }
      }

    }

    animateHeight(target).start();
  }, [selectedType, images.length, hasNextDueDate, vaccineType, doseNumber, showVaccineDropdown, safeSpecies, isReadOnly, hasNextDueChanged]);

  useEffect(() => { animateTo(detailsFade, selectedType ? 1 : 0).start(); }, [selectedType]);
  useEffect(() => { animateTo(imagesFade, images.length > 0 ? 1 : 0, 200).start(); }, [images.length]);
  useEffect(() => { animateTo(nextDueFade, hasNextDueDate ? 1 : 0).start(); }, [hasNextDueDate]);

  // Reset (create) hoặc Prefill (edit) mỗi khi modal mở
  useEffect(() => {
    if (visible) {
      RECORD_OPTIONS.forEach(opt => {
        optionHeights[opt.id].setValue(OPTION_ROW_H);
      });

      if ((isEditMode || isViewMode) && initialRecord) {
        // Ngăn các useEffect auto-calc ghi đè giá trị gốc ngay sau khi set state dưới đây
        skipAutoCalcRef.current = true;

        const typeId = resolveSelectedTypeFromRecord(initialRecord);
        setSelectedType(typeId);

        if (typeId === 'vaccination') {
          // record.vaccineType có thể không được lưu trực tiếp; cố gắng suy ra từ recordName
          const nameText = extractBilingualText(initialRecord.recordName, isVi);
          const matched = VACCINE_OPTIONS[safeSpecies].find(
            v => v.label.toLowerCase() === nameText.toLowerCase()
          );
          setVaccineType(initialRecord.vaccineType || matched?.id || '');
          setDoseNumber(initialRecord.doseNumber || 1);
          setRecordName('');
        } else {
          setRecordName(extractBilingualText(initialRecord.recordName, isVi));
          setVaccineType('');
          setDoseNumber(1);
        }

        setRecordDate(initialRecord.recordDate ? new Date(initialRecord.recordDate) : new Date());
        setShowVaccineDropdown(false);

        const existingImages = Array.isArray(initialRecord.images)
          ? initialRecord.images.filter(Boolean)
          : [];
        setImages(existingImages);

        const initialHasNextDue = !!initialRecord.hasNextDueDate;
        const initialNextDueName = extractBilingualText(initialRecord.nextDueName, isVi);
        const initialNextDueDate = initialRecord.nextDueDate ? new Date(initialRecord.nextDueDate) : new Date();

        setHasNextDueDate(initialHasNextDue);
        setNextDueName(initialNextDueName);
        setNextDueDate(initialNextDueDate);

        // Lưu mốc gốc để view mode so sánh, biết người dùng có thực sự sửa gì không
        originalNextDueRef.current = {
          name: initialNextDueName,
          date: initialHasNextDue ? initialNextDueDate : null,
        };
      } else {
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
      }

      setIsSubmitting(false);
      animateTo(backdropOpacity, 1, 220).start();
    } else {
      backdropOpacity.setValue(0);
    }
  }, [visible, isEditMode, isViewMode, initialRecord]);

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

    // 🚀 Bắt buộc phải có ít nhất 1 ảnh mới được submit/update
    if (images.length === 0) {
      Alert.alert(
        isVi ? 'Thiếu ảnh' : 'Missing Photo',
        isVi ? 'Vui lòng tải lên ít nhất 1 ảnh trước khi lưu hồ sơ' : 'Please upload at least 1 photo before saving the record'
      );
      return;
    }

    const recordNameBilingual = selectedType === 'vaccination'
      ? buildBilingual(VACCINE_OPTIONS[safeSpecies].find(v => v.id === vaccineType)?.label || '')
      : buildBilingual(recordName);


    const nextDueNameBilingual = hasNextDueDate
      ? buildBilingual(nextDueName)
      : null;

    const payload = {
      type: selectedType,
      recordName: recordNameBilingual,
      vaccineType: selectedType === 'vaccination' ? vaccineType : undefined,
      doseNumber: selectedType === 'vaccination' ? doseNumber : undefined,
      recordDate: recordDate.toISOString(),
      images,
      hasNextDueDate,
      nextDueName: nextDueNameBilingual ?? undefined,
      nextDueDate: hasNextDueDate ? nextDueDate.toISOString() : undefined,
    };

    if (isEditMode) {
      onSubmitEdit?.(initialRecord.id, payload);
    } else {
      onSubmit(payload);
    }
    handleClose();
  };

  // Dành riêng cho view mode: chỉ gửi nextDueName/nextDueDate, không đụng các field khác
  // của record (giữ nguyên type, recordName, recordDate, images, verificationStatus...).
  const handleSubmitNextDueOnly = () => {
    if (!isViewMode || !initialRecord) return;

    // Nếu bật lịch nhắc nhưng không nhập tên thì báo lỗi
    if (hasNextDueDate && !nextDueName.trim()) {
      Alert.alert('Lỗi', isVi ? 'Vui lòng nhập tên/ghi chú nhắc lịch' : 'Please enter a reminder name');
      return;
    }
    const nextDueNameBilingual = hasNextDueDate ? buildBilingual(nextDueName) : null;

    // 🚀 CẬP NHẬT: Gửi thêm hasNextDueDate và cho phép date null
    onSubmitNextDueOnly?.(initialRecord.id, {
      hasNextDueDate: hasNextDueDate,
      nextDueName: nextDueNameBilingual as any,
      nextDueDate: hasNextDueDate ? nextDueDate.toISOString() : null,
    } as any);

    handleClose();
  };


  // 🚀 THAY ĐỔI CỐT LÕI: không còn <Modal transparent animationType="none">
  // bọc ngoài nữa. Thay bằng 1 View overlay tuyệt đối phủ toàn màn hình,
  // KHÔNG tạo native window/UIViewController mới — nhờ đó DateTimePicker của
  // GlobalDatePickerContext (cũng render tuyệt đối ở root) không bao giờ phải
  // di chuyển qua lại giữa các window khác nhau, loại bỏ hoàn toàn nguồn gốc
  // gây crash native khi mở/đóng modal này lồng nhau với DOB picker.
  if (!shouldRender) return null;

  return (
    <View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        StyleSheet.absoluteFillObject,
        { zIndex: 9999, elevation: 9999 }, // 🚀 FIX: đảm bảo luôn nằm trên mọi header/z-10 khác trong screen
      ]}

    >
      <Animated.View style={{ opacity: backdropOpacity }} className="absolute inset-0 bg-black/50" />


      <View className="flex-1 justify-center items-center px-4">
        <Animated.View
          style={{ height: modalHeight }}
          className="bg-white rounded-[22px] w-[350px] overflow-hidden shadow-xl relative"
        >
          <TouchableOpacity
            onPress={handleClose}
            className="absolute z-50 p-1"
            style={{ top: 28, right: 23 }}
          >
            <Ionicons name="close" size={16} color="#000000" />
          </TouchableOpacity>

          <View className="flex-row items-center justify-center pt-[26px]">
            <Text className="text-[16px] font-semibold text-[#000000]">
              {isViewMode
                ? (isVi ? 'Xem hồ sơ y tế' : 'View Medical Record')
                : isEditMode
                  ? (isVi ? 'Sửa hồ sơ y tế' : 'Edit Medical Record')
                  : (isVi ? 'Thêm hồ sơ y tế' : 'Add Medical Record')}
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
                    activeOpacity={isReadOnly ? 1 : 0.7}
                    disabled={isReadOnly}
                    onPress={() => {
                      if (isReadOnly) return;
                      const newType = isActive ? null : item.id;
                      setSelectedType(newType);

                      // 🚀 Tự động điền text mặc định cho Examination / Dental
                      let defaultName = '';
                      if (newType === 'examination') {
                        defaultName = isVi ? 'Khám bệnh' : 'Examination';
                      } else if (newType === 'dental') {
                        defaultName = isVi ? 'Khám răng' : 'Dental Checkup';
                      }
                      setRecordName(defaultName);

                      setVaccineType('');
                      setShowVaccineDropdown(false);
                      setDoseNumber(1);
                      setImages([]);
                      setHasNextDueDate(false);
                      setNextDueName('');
                      setNextDueDate(new Date());
                    }}
                    className={`flex-row items-center px-[12px] py-[11px] rounded-[12px] border ${isActive && !isReadOnly
                      ? 'border-[#E89B5A]/50 bg-[#FFD0A8]/25'
                      : (isActive && isReadOnly ? 'border-[#E5E5E5] bg-[#F9FAFB]' : 'border-transparent bg-white')
                      }`}
                  >
                    <View className="w-[30px] h-[30px] rounded-[100px] items-center justify-center mr-3">
                      <Image
                        // 🚀 2. Dùng Icon xám (Unselected) nếu đang ở chế độ Xem
                        source={isActive && !isReadOnly ? item.iconSelected : item.iconUnselected}
                        style={{ width: 30, height: 30 }}
                        resizeMode="contain"
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`text-[14px] mb-0.5 ${isActive && !isReadOnly ? 'text-black font-semibold' : 'text-[#4B5563] font-medium'}`}
                        numberOfLines={1}
                      >
                        {isVi ? item.titleVi : item.titleEn}
                      </Text>
                      <Text className="text-[12px] font-lighter text-[#8E8E93]" numberOfLines={1}>
                        {isVi ? item.descVi : item.descEn}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}

            <Animated.View style={{ opacity: detailsFade }}>
              {selectedType && (
                <>
                  <Text className="text-[14px] font-semibold text-black mb-[9px] mt-[14px]">
                    {isVi ? 'Chi tiết hồ sơ' : 'Vaccination Details'}
                  </Text>

                  <View className="flex-row gap-2.5 mb-3">
                    <View style={{ flex: 2 }}>
                      {selectedType === 'vaccination' ? (
                        <TouchableOpacity
                          onPress={() => !isReadOnly && setShowVaccineDropdown(!showVaccineDropdown)}
                          activeOpacity={isReadOnly ? 1 : 0.8}
                          disabled={isReadOnly}
                          className={`h-[36px] border border-[#E5E5EA] rounded-[12px] px-[14px] flex-row items-center justify-between relative z-10 ${isReadOnly ? 'bg-[#F9FAFB]' : 'bg-white'}`}
                        >
                          <Text className={`${vaccineType ? (isReadOnly ? 'text-[#6B7280]' : 'text-black') : 'text-[#8E8E93]'} text-[14px] font-regular flex-1`} numberOfLines={1}>
                            {VACCINE_OPTIONS[safeSpecies].find(v => v.id === vaccineType)?.label || (isVi ? 'Chọn vắc-xin...' : 'Select vaccination...')}
                          </Text>
                          {!isReadOnly && <Feather name={showVaccineDropdown ? "chevron-up" : "chevron-down"} size={16} color="#8E8E93" />}
                        </TouchableOpacity>
                      ) : (
                        <TextInput
                          style={{ fontFamily: 'Urbanist-Regular' }}
                          editable={!isReadOnly}
                          className={`h-[36px] border border-[#E5E5EA] rounded-[12px] px-[14px] text-[14px] font-regular ${isReadOnly ? 'bg-[#F9FAFB] text-[#6B7280]' : 'bg-white text-black'}`}
                          placeholder={isVi ? 'Nhập tên...' : 'Enter name...'}
                          placeholderTextColor="#A1A1AA"
                          value={recordName}
                          onChangeText={setRecordName}
                        />
                      )}
                    </View>

                    <View style={{ flex: 1 }} >
                      <View style={{ flex: 1 }}>
                        <TouchableOpacity
                          onPress={() => !isReadOnly && setActiveDatePicker('record')}
                          activeOpacity={isReadOnly ? 1 : 0.7}
                          disabled={isReadOnly}
                          className={`h-[36px] border border-[#E5E5E5] rounded-[12px] px-1 justify-center items-center ${isReadOnly ? 'bg-[#F9FAFB]' : 'bg-white'}`}
                        >
                          <Text className={`text-[14px] font-regular text-center ${isReadOnly ? 'text-[#6B7280]' : 'text-black'}`} numberOfLines={1} adjustsFontSizeToFit>
                            {formatShortDate(recordDate, isVi)}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {selectedType === 'vaccination' && showVaccineDropdown && !isReadOnly && (
                    <View className="bg-gray-50 border border-[#E5E5EA] rounded-[12px] mb-3 max-h-[160px] overflow-hidden">
                      <ScrollView
                        showsVerticalScrollIndicator={true}
                        nestedScrollEnabled={true}
                        keyboardShouldPersistTaps="handled"
                      >
                        {VACCINE_OPTIONS[safeSpecies].map((item) => {
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
                            activeOpacity={isReadOnly ? 1 : 0.7}
                            disabled={isReadOnly}
                            onPress={() => setDoseNumber(dose as 1 | 2 | 3)}
                            // 🚀 Thêm logic làm mờ opacity-50 nếu đang ở chế độ xem (isReadOnly)
                            className={`flex-row items-center ${isReadOnly ? 'opacity-50' : ''}`}
                          >
                            <Ionicons
                              name={isSelected ? "radio-button-on" : "radio-button-off"}
                              size={20}
                              // 🚀 Có thể làm nhạt màu viền xám một chút cho đồng bộ nếu muốn
                              color={isSelected ? "#E89B5A" : (isReadOnly ? "#D1D5DB" : "#9CA3AF")}
                            />
                            <Text className={`text-[13px] ml-1.5 ${isSelected ? 'text-[#E89B5A] font-medium' : (isReadOnly ? 'text-[#9CA3AF]' : 'text-[#4B5563]')}`}>
                              {isVi ? `Mũi ${dose}` : `${dose}${dose === 1 ? 'st' : dose === 2 ? 'nd' : 'rd'} Dose`}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                  {isViewMode && selectedType === 'vaccination' && initialRecord?.vaccineDoses && initialRecord.vaccineDoses.length > 0 && (
                    <View className="w-full mb-3 bg-[#F9FAFB] border border-[#E5E5E5] rounded-[12px] p-3">
                      <Text className="text-[14px] font-semibold text-[#4B5563] mb-3">
                        {isVi ? 'Chi tiết mũi tiêm' : 'Vaccination Details'}
                      </Text>

                      {initialRecord.vaccineDoses.map((dose: any, idx: number) => {
                        const isLast = idx === initialRecord.vaccineDoses.length - 1;
                        return (
                          <View
                            key={idx}
                            className={`flex-row justify-between items-center py-2 ${!isLast ? 'border-b border-[#F3F4F6]' : ''
                              }`}
                          >
                            <View className="flex-row items-center">
                              <Feather
                                name="check-circle"
                                size={16}
                                color={dose.status === 'COMPLETED' ? '#E89B5A' : '#D1D5DB'}
                              />
                              <Text className="text-[14px] text-[#4B5563] ml-2 font-medium">
                                {isVi ? `Mũi ${idx + 1}` : `Dose ${idx + 1}`}
                              </Text>
                            </View>
                            <View className="items-end">
                              <Text className="text-[14px] font-semibold text-[#111827]">
                                {dose.name || '-'}
                              </Text>
                              <Text className="text-[12px] text-[#9CA3AF] mt-0.5">
                                {dose.date || '-'}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                  {!isReadOnly && images.length < 3 && (
                    <TouchableOpacity
                      onPress={handleUploadPhotos}
                      activeOpacity={0.7}
                      className="flex-row border border-dashed border-[#E5E5E5] rounded-[12px] py-[12px] items-center justify-center mb-[17px]"
                    >
                      <Ionicons name="cloud-upload-outline" size={20} color="#9CA3AF" />
                      <Text className="text-[12px] text-[#000000] font-regular ml-2">
                        {selectedType === 'vaccination'
                          ? (isVi ? 'Tải sổ tiêm phòng (Tối đa 3)' : 'Upload Vaccination Book (Max 3)')
                          : (isVi ? 'Tải ảnh lên (Tối đa 3)' : 'Upload Photos (Max 3)')}
                      </Text>
                    </TouchableOpacity>
                  )}


                  <Animated.View style={{ opacity: imagesFade }}>
                    {images.length > 0 && (
                      <View className="flex-row flex-wrap gap-2 mb-3 ">
                        {images.map((url, index) => (
                          <View key={index} style={{ width: '31%', aspectRatio: 1 }} className="relative">
                            <TouchableOpacity
                              activeOpacity={0.85}
                              onPress={() => {
                                setImageViewerIndex(index);
                                setImageViewerVisible(true);
                              }}
                              className="w-full h-full"
                            >
                              <Image source={{ uri: url }} className="w-full h-full rounded-[12px]" />
                            </TouchableOpacity>
                            {!isReadOnly && (
                              <TouchableOpacity
                                onPress={() => setImages(prev => prev.filter((_, i) => i !== index))}
                                className="absolute -top-1.5 -right-1.5 bg-white rounded-full"
                              >
                                <Ionicons name="close-circle" size={18} color="#FF3B30" />
                              </TouchableOpacity>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                  </Animated.View>

                  {selectedType !== 'other' && (
                    <>
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
                                onPress={() => setActiveDatePicker('next')}
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
                </>
              )}
            </Animated.View>
          </View>

          {/* Nút submit dưới đáy modal:
              - create/edit mode: luôn hiện khi đã chọn loại record (selectedType)
              - view mode: CHỈ hiện khi người dùng thực sự sửa Next Due Name/Date
                so với giá trị gốc — đúng yêu cầu "ẩn nút update, chỉ hiện khi có
                chỉnh sửa Next Due" */}
          {!isViewMode && selectedType && (
            // 🚀 Đổi style thành paddingTop và paddingBottom bằng nhau
            <View className="bg-white items-center" style={{ paddingTop: 17, paddingBottom: 30 }}>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isSubmitting}
                className={`h-[37px] w-2/3 rounded-[1000px] items-center justify-center bg-[#E89B5A] ${isSubmitting ? 'opacity-60' : ''}`}
              >
                <Text className="font-semibold text-[14px] text-white">
                  {isSubmitting
                    ? (isVi ? 'Đang lưu...' : 'Saving...')
                    : isEditMode
                      ? (isVi ? 'Cập nhật' : 'Update Record')
                      : (isVi ? 'Lưu hồ sơ' : 'Submit Record')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {isViewMode && hasNextDueChanged && (
            // 🚀 Đổi style thành paddingTop và paddingBottom bằng nhau
            <View className="bg-white items-center" style={{ paddingTop: 17, paddingBottom: 17 }}>
              <TouchableOpacity
                onPress={handleSubmitNextDueOnly}
                disabled={isSubmitting}
                className={`h-[37px] w-2/3 rounded-[1000px] items-center justify-center bg-[#E89B5A] ${isSubmitting ? 'opacity-60' : ''}`}
              >
                <Text className="font-semibold text-[14px] text-white">
                  {isSubmitting
                    ? (isVi ? 'Đang lưu...' : 'Saving...')
                    : (isVi ? 'Cập nhật lịch tiếp theo' : 'Update Next Due')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </View>

      <CalendarPopupField
        visible={activeDatePicker !== null}
        title={
          activeDatePicker === 'record'
            ? (isVi ? 'Chọn ngày ghi nhận' : 'Select Record Date')
            : (isVi ? 'Chọn ngày hẹn tiếp theo' : 'Select Next Due Date')
        }
        value={activeDatePicker === 'record' ? recordDate : nextDueDate}
        minDate={activeDatePicker === 'next' ? (nextDueDate < new Date() ? nextDueDate : new Date()) : undefined}
        isVi={isVi}
        onChange={(d) => {
          if (activeDatePicker === 'record') setRecordDate(d);
          else setNextDueDate(d);
          setActiveDatePicker(null);
        }}
        onRequestClose={() => setActiveDatePicker(null)}
      />

      <Modal
        visible={imageViewerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImageViewerVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' }}>
          {/* Nút đóng góc trên bên phải */}
          <TouchableOpacity
            onPress={() => setImageViewerVisible(false)}
            style={{
              position: 'absolute',
              top: 50,
              right: 20,
              zIndex: 100,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(255,255,255,0.15)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Slide ảnh vuốt ngang */}
          <ScrollView
            ref={imageScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: imageViewerIndex * SCREEN_WIDTH, y: 0 }}
            onMomentumScrollEnd={(e) => {
              const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setImageViewerIndex(newIndex);
            }}
            style={{ flex: 1 }}
          >
            {images.map((url, index) => (
              <View
                key={index}
                style={{
                  width: SCREEN_WIDTH,
                  height: '100%',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingTop: 110,   // chừa chỗ cho nút Close phía trên
                  paddingBottom: 90, // chừa chỗ cho dot phía dưới
                  paddingHorizontal: 24,
                }}
              >
                <Image
                  source={{ uri: url }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                />
              </View>
            ))}
          </ScrollView>

          {/* Dot timeline phía dưới */}
          {images.length > 1 && (
            <View
              style={{
                position: 'absolute',
                bottom: 50,
                left: 0,
                right: 0,
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {images.map((_, index) => (
                <View
                  key={index}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    marginHorizontal: 4,
                    backgroundColor: index === imageViewerIndex ? '#FFFFFF' : 'rgba(255,255,255,0.35)',
                  }}
                />
              ))}
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}