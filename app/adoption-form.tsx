// app/adoption-form.tsx
import axiosClient from '@/api/axiosClient';
import { Text } from '@/components/AppText';
import { TextInput } from '@/components/AppTextInput';
import { AuthContext } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { petService } from '@/services/petService';
import { calculateAge } from '@/utils/dateHelper';
import { getLocalizedField } from '@/utils/localization';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useModalStore } from '../store/useModalStore';

// --- DATA CONSTANTS ---
const HOUSING_TYPES_EN = [
  "House",
  "House with a garden",
  "Apartment (allows pet ownership)",
  "Apartment (pets not allowed, but willing to keep a pet discreetly)",
  "Rented house",
  "Other"
];
const HOUSING_TYPES_VI = [
  "Nhà riêng",
  "Nhà có sân vườn",
  "Căn hộ (cho phép nuôi thú cưng)",
  "Căn hộ (không cho phép nhưng vẫn muốn nuôi)",
  "Nhà thuê",
  "Khác"
];

const PET_EXPERIENCES_EN = [
  "Yes, I used to have one",
  "My pet is still living with me now",
  "No, I haven't"
];
const PET_EXPERIENCES_VI = [
  "Có, tôi đã từng nuôi",
  "Thú cưng vẫn đang sống cùng tôi",
  "Chưa bao giờ"
];

const EMPLOYMENT_STATUSES_EN = [
  "Currently employed",
  "Currently employed (occasionally travels for work)",
  "Currently employed (frequently travels for work)",
  "Self-employed",
  "Student (without a stable income)",
  "Pupil"
];
const EMPLOYMENT_STATUSES_VI = [
  "Đang đi làm",
  "Đang đi làm (thỉnh thoảng công tác)",
  "Đang đi làm (thường xuyên công tác)",
  "Tự kinh doanh",
  "Sinh viên (chưa có thu nhập ổn định)",
  "Học sinh"
];

const ADOPTION_REASONS_EN = [
  "Garden guarding",
  "Parking lot guarding",
  "Breeding",
  "Gift for children",
  "Because I want to give them a forever home",
  "Other"
];
const ADOPTION_REASONS_VI = [
  "Trông coi nhà/sân vườn",
  "Giữ xe/bãi đỗ",
  "Nhân giống",
  "Quà tặng cho trẻ em",
  "Vì tôi muốn cho chúng một mái ấm mãi mãi",
  "Khác"
];
const ERROR_MESSAGES: Record<string, { vi: string; en: string }> = {
  'error.application_limit_reached': {
    vi: 'Bạn đang có 5 đơn đăng ký chờ xử lý. Vui lòng đợi kết quả hoặc đóng đơn cũ trước khi nộp đơn mới.',
    en: 'You have 5 pending applications. Please wait for the results or close your old applications before submitting a new one.',
  },
  'error.application_already_submitted': {
    vi: 'Bạn đã gửi đơn đăng ký cho thú cưng này rồi.',
    en: 'You have already submitted an application for this pet.',
  },
  'error.application_not_found': {
    vi: 'Không tìm thấy đơn đăng ký nhận nuôi này.',
    en: 'This adoption application was not found!',
  },
  'error.application_no_info_needed': {
    vi: 'Đơn đăng ký hiện không yêu cầu bổ sung thông tin.',
    en: 'The application currently requires no additional information.',
  },
  'error.application_cannot_withdraw': {
    vi: 'Không thể rút đơn ở trạng thái hiện tại.',
    en: 'The application cannot be withdrawn in this status!',
  },
};

/** Đọc lỗi từ response BE, ưu tiên i18n.key qua t() có sẵn; fallback message gốc nếu không có i18n. */
function resolveErrorMessage(error: any, t: (key: string, params?: Record<string, string | number>) => string): string | null {
  const data = error?.response?.data;
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

// --- COMPONENTS ---
const SectionTitle = ({ title }: { title: string }) => (
  <Text className="text-gray-900 font-semibold text-[16px] mt-[50px]">{title}</Text>
);

const Label = ({ text, required = false }: { text: string; required?: boolean }) => (
  <Text className="text-gray-600 text-[14px] font-regular mb-2 mt-[21px]">
    {text} {required && <Text className="text-red-500">*</Text>}
  </Text>
);

const AdviceText = ({ text }: { text: string }) => (
  <Text className="text-gray-400 text-xs mb-3 italic">{text}</Text>
);

const CustomInput = ({
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = 'default',
  isPristine = false,
}: {
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: any;
  isPristine?: boolean;
}) => (
  <View className="">
    <TextInput
      className={`w-full bg-white border border-gray-200 rounded-2xl px-4 ${isPristine ? 'text-gray-400' : 'text-gray-800'
        } ${multiline ? 'h-24 py-3' : 'h-14'}`}
      placeholder={placeholder}
      placeholderTextColor="#9CA3AF"
      value={value}
      onChangeText={onChangeText}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
      keyboardType={keyboardType}
      selection={isPristine ? { start: 0, end: 0 } : undefined}
    />
  </View>
);

const CustomDropdown = ({
  placeholder,
  value,
  options = [],
  onSelect
}: {
  placeholder: string;
  value?: string;
  options?: string[];
  onSelect?: (val: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View className="">
      <TouchableOpacity
        onPress={() => setIsOpen((prev) => !prev)}
        activeOpacity={0.7}
        className={`w-full bg-white border border-gray-200 rounded-2xl h-14 px-4 flex-row items-center justify-between ${isOpen ? 'border-orange-400' : ''}`}
      >
        <Text className={`${value ? 'text-gray-900' : 'text-gray-400'} text-sm font-medium`} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={20} color="#9CA3AF" />
      </TouchableOpacity>

      {isOpen && (
        <View
          className="w-full bg-white border border-gray-200 rounded-2xl mt-2 overflow-hidden"
          style={{ maxHeight: 220 }}
        >
          {options.length === 0 ? (
            <View className="px-4 py-4">
              <Text className="text-[13px] text-gray-400 italic">Không có lựa chọn nào</Text>
            </View>
          ) : (
            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
              {options.map((item) => {
                const isSelected = item === value;
                return (
                  <TouchableOpacity
                    key={item}
                    className={`px-4 py-3.5 border-b border-gray-50 flex-row items-center justify-between ${isSelected ? 'bg-blue-50' : ''}`}
                    onPress={() => {
                      if (onSelect) onSelect(item);
                      setIsOpen(false);
                    }}
                  >
                    <Text className={`text-sm ${isSelected ? 'text-blue-600 font-bold' : 'text-gray-700'}`}>
                      {item}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={18} color="#2563EB" />}
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


const PolicyItem = ({ number, title, content }: { number: string; title: string; content: string }) => (
  <View className="flex-row items-start mb-5">
    <Text className="font-medium text-[16px] text-gray-900 w-5 mt-0.5">{number}.</Text>
    <View className="flex-1">
      <Text className="text-gray-800 font-medium text-[16px] mb-1">{title}</Text>
      <Text className="text-gray-500 font-regular text-[14px] leading-4">{content}</Text>
    </View>
  </View>
);

const OptionGroup = ({
  options,
  selected,
  onSelect,
}: {
  options: string[];
  selected: string;
  onSelect: (opt: string) => void;
}) => (
  <View className="flex-row gap-3 mt-[12px]">
    {options.map((opt) => {
      const isActive = selected === opt;
      return (
        <TouchableOpacity
          key={opt}
          onPress={() => onSelect(opt)}
          activeOpacity={0.9}
          className={`flex-1 py-[9px] rounded-[12px] items-center border ${isActive
            ? 'bg-[#E89B5A] border-[#E5E5E5]/0'
            : 'bg-white border-[#E5E5E5]'
            }`}
        >
          <Text className={`font-semibold text-[14px] ${isActive ? 'text-white' : 'text-[#757575]'}`}>
            {opt}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

export default function AdoptionFormScreen() {
  const { user } = useContext(AuthContext);
  const { language, t } = useLanguage();
  const showModal = useModalStore((state) => state.showModal);
  const router = useRouter();
  const rawParams = useLocalSearchParams();
  const petId = rawParams.id as string;
  const insets = useSafeAreaInsets();

  const [petData, setPetData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingLimit, setIsCheckingLimit] = useState(true);
  const [showLimitModal, setShowLimitModal] = useState(false);

  const isVi = language === 'vi';

  // Localised option lists — index stays in sync with EN for payload
  const HOUSING_TYPES = isVi ? HOUSING_TYPES_VI : HOUSING_TYPES_EN;
  const PET_EXPERIENCES = isVi ? PET_EXPERIENCES_VI : PET_EXPERIENCES_EN;
  const EMPLOYMENT_STATUSES = isVi ? EMPLOYMENT_STATUSES_VI : EMPLOYMENT_STATUSES_EN;
  const ADOPTION_REASONS = isVi ? ADOPTION_REASONS_VI : ADOPTION_REASONS_EN;

  useEffect(() => {
    const fetchPetDetail = async () => {
      try {
        if (petId) {
          const data = await petService.getPetById(petId);
          setPetData(data);
        }
      } catch (err) {
        console.error("Lỗi lấy chi tiết thú cưng:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPetDetail();
  }, [petId]);

  // --- STATE FOR FORM ---
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [zalo, setZalo] = useState('');
  const [isNamePristine, setIsNamePristine] = useState(false);
  const [isPhonePristine, setIsPhonePristine] = useState(false);
  const [isZaloPristine, setIsZaloPristine] = useState(false);
  const [adoptFor, setAdoptFor] = useState('Myself');

  const [location, setLocation] = useState('');
  const [housing, setHousing] = useState(HOUSING_TYPES[2]); // "Apartment (allows...)"
  const [otherHousing, setOtherHousing] = useState('');
  const [exp, setExp] = useState(PET_EXPERIENCES[0]);
  const [job, setJob] = useState(EMPLOYMENT_STATUSES[0]);
  const [reason, setReason] = useState(ADOPTION_REASONS[4]);
  const [otherReason, setOtherReason] = useState('');
  const [prevPetHistory, setPrevPetHistory] = useState(
    isVi
      ? "Chú chó trước của tôi đã qua đời vì tuổi già sau 12 năm tuyệt vời bên nhau."
      : "My previous dog passed away due to old age after 12 wonderful years together."
  );
  const [children, setChildren] = useState('No');
  const [cage, setCage] = useState('No');
  const [vaccine, setVaccine] = useState('Yes');
  const [medical, setMedical] = useState('Yes');
  const [expenses, setExpenses] = useState('Yes');
  const [updateStatus, setUpdateStatus] = useState('Yes');
  const [homeVisit, setHomeVisit] = useState('Yes');
  const [provideID, setProvideID] = useState('Yes');
  const [isAgreed, setIsAgreed] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  // --- ADDRESS POPUP STATE ---
  const [showAddressPopup, setShowAddressPopup] = useState(false);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [wardOptions, setWardOptions] = useState<string[]>([]);
  const [tempCity, setTempCity] = useState('');
  const [tempWard, setTempWard] = useState('');
  const [tempDetail, setTempDetail] = useState('');
  const [tempDistrict, setTempDistrict] = useState('');

  useEffect(() => {
    if (user) {
      if (user.name) { setFullName(user.name); setIsNamePristine(true); }
      if (user.phone) {
        setPhone(user.phone); setIsPhonePristine(true);
        setZalo(user.phone); setIsZaloPristine(true);
      }
    }
  }, [user]);

  const handleNameChange = (text: string) => {
    if (isNamePristine) {
      const newText = text.length < fullName.length ? '' : text.replace(fullName, '') || text.slice(-1);
      setFullName(newText); setIsNamePristine(false);
    } else { setFullName(text); }
  };

  const handlePhoneChange = (text: string) => {
    let finalPhone = text;
    if (isPhonePristine) {
      finalPhone = text.length < phone.length ? '' : text.replace(phone, '') || text.slice(-1);
      setPhone(finalPhone); setIsPhonePristine(false);
    } else { setPhone(text); }
    if (isZaloPristine) setZalo(finalPhone);
  };

  const handleZaloChange = (text: string) => {
    if (isZaloPristine) {
      const newText = text.length < zalo.length ? '' : text.replace(zalo, '') || text.slice(-1);
      setZalo(newText); setIsZaloPristine(false);
    } else { setZalo(text); }
  };

  useEffect(() => {
    fetch('https://provinces.open-api.vn/api/v2/p/')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const processed = data.map((p: any) => ({
            ...p,
            cleanName: p.name.replace(/^(Tỉnh|Thành phố)\s+/i, '').trim()
          })).sort((a, b) => a.cleanName.localeCompare(b.cleanName, 'vi'));
          setProvinces(processed);
        }
      })
      .catch(e => console.error("Lỗi fetch tỉnh/thành:", e));
  }, []);

  const cityOptions = provinces.map((c: any) => c.cleanName);

  useEffect(() => {
    if (!tempCity) { setWardOptions([]); return; }
    const selectedProvince = provinces.find((p: any) => p.cleanName === tempCity);
    if (selectedProvince?.code) {
      fetch(`https://provinces.open-api.vn/api/v2/w/?province=${selectedProvince.code}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setWardOptions(data.map((w: any) => w.name).sort((a, b) => a.localeCompare(b, 'vi')));
          }
        })
        .catch(e => console.error("Lỗi fetch phường/xã:", e));
    }
  }, [tempCity, provinces]);

  const handleConfirmAddress = () => {
    if (!tempCity || !tempWard) {
      Alert.alert(
        isVi ? "Thiếu thông tin" : "Missing information",
        isVi ? "Vui lòng chọn đầy đủ Tỉnh/Thành phố và Phường/Xã." : "Please select both City/Province and Ward."
      );
      return;
    }
    const detailPart = tempDetail.trim() ? `${tempDetail.trim()}, ` : '';
    setLocation(`${detailPart}${tempWard}, ${tempCity}`);
    setShowAddressPopup(false);
  };

  useEffect(() => {
    const checkLimit = async () => {
      try {
        const response = await axiosClient.get('/applications/my-applications');
        const applications = response.data?.data || [];
        const activeApps = applications.filter(
          (app: any) => app.status !== 'CLOSED' && app.status !== 'ADOPTION_COMPLETED'
        );
        if (activeApps.length >= 5) setShowLimitModal(true);
      } catch (error) {
        console.error("Failed to check application limit", error);
      } finally {
        setIsCheckingLimit(false);
      }
    };
    checkLimit();
  }, []);

  if (loading || !petData) return <ActivityIndicator size="large" color="#F99C2E" />;

  const petInfo = {
    name: petData?.name || 'Pet',
    age: petData?.dob ? calculateAge(petData.dob) : (isVi ? 'Không rõ' : 'Unknown'),
    breed: getLocalizedField(petData?.breed, isVi ? 'vi' : 'en') || (isVi ? 'Không rõ' : 'Unknown'),
    shelterName: petData?.shelter?.name || 'Sân Nhà Nhiều Chó',
    image: petData?.avatarUrl || 'https://images.unsplash.com/default_pet.jpg',
  };

  // Map displayed option back to EN value for API payload
  const toEnValue = (displayed: string, enList: string[], localList: string[]) => {
    const idx = localList.indexOf(displayed);
    return idx >= 0 ? enList[idx] : displayed;
  };

  const handleSubmit = async () => {
    if (!petId) {
      Alert.alert(isVi ? 'Lỗi' : 'Error', isVi ? 'Không tìm thấy thông tin thú cưng.' : 'Pet information not found.');
      return;
    }
    if (!fullName || !phone || !zalo || !location) {
      Alert.alert(
        isVi ? 'Thiếu thông tin' : 'Missing information',
        isVi ? 'Vui lòng điền đầy đủ thông tin liên lạc và địa chỉ cư trú.' : 'Please fill in all contact and address fields.'
      );
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      setIsLoading(true);
      const finalHousing = housing === (isVi ? 'Khác' : 'Other') ? otherHousing : toEnValue(housing, HOUSING_TYPES_EN, HOUSING_TYPES_VI);
      const finalReason = reason === (isVi ? 'Khác' : 'Other') ? otherReason : toEnValue(reason, ADOPTION_REASONS_EN, ADOPTION_REASONS_VI);

      const payload = {
        petId,
        fullName,
        phone,
        zalo,
        adoptFor,
        location,
        housing: finalHousing,
        children,
        cage,
        petExperience: toEnValue(exp, PET_EXPERIENCES_EN, PET_EXPERIENCES_VI),
        prevPetHistory,
        employmentStatus: toEnValue(job, EMPLOYMENT_STATUSES_EN, EMPLOYMENT_STATUSES_VI),
        adoptionReason: finalReason,
        commitments: { vaccine, medical, expenses, updateStatus, homeVisit, provideID }
      };

      await axiosClient.post('/applications', payload);
      showModal({
        title: isVi ? 'Gửi đơn thành công!' : 'Application Submitted!',
        message: isVi
          ? 'Cảm ơn bạn đã gửi đơn. Chúng tôi sẽ xem xét và liên hệ sớm nhất. Hãy giữ điện thoại luôn sẵn sàng nhé!'
          : 'Thanks for your application. We will review it and contact you soon. Please keep your phone available!',
        buttonText: isVi ? 'Quay lại' : 'Back',
        onConfirm: () => {
          router.dismissAll();
          router.push({ pathname: '/(tabs)/matching', params: { returnFromSuccess: '1' } });
        }
      });
    } catch (error: any) {
      console.log('FULL ERROR:', JSON.stringify(error.response?.data, null, 2));

      const displayMsg = resolveErrorMessage(error, t);
      Alert.alert(
        isVi ? 'Gửi đơn thất bại' : 'Submission Failed',
        displayMsg || (isVi ? 'Đã có lỗi xảy ra. Vui lòng thử lại sau.' : 'Something went wrong. Please try again.')
      );

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingLimit) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#F99C2E" />
        <Text className="text-gray-500 mt-4 font-medium">
          {isVi ? 'Đang kiểm tra dữ liệu...' : 'Checking data...'}
        </Text>
      </View>
    );
  }

  const yesNo = isVi ? ['Có', 'Không'] : ['Yes', 'No'];
  const yesNoSometimes = isVi ? ['Có', 'Không', 'Đôi khi'] : ['Yes', 'No', 'Sometimes'];
  const myselfSomeone = isVi ? ['Cho bản thân', 'Cho người khác'] : ['Myself', 'Someone else'];

  return (
    <View className="flex-1 bg-white">
      {/* --- ADDRESS POPUP MODAL --- */}
      {showAddressPopup && (
        <View
          className="absolute inset-0 bg-black/50 justify-center px-4"
          style={{ zIndex: 999, elevation: 999, paddingTop: insets.top }}
        >
          <View className="bg-white rounded-3xl p-6 shadow-2xl max-h-[85%]">
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text className="text-xl font-bold text-gray-900 mb-2 text-center">
                {isVi ? 'Cập nhật địa chỉ của bạn' : 'Update your address'}
              </Text>

              <Label text={isVi ? "Thành phố / Tỉnh" : "City / Province"} required />
              <CustomDropdown
                placeholder={isVi ? "Chọn Tỉnh/Thành phố" : "Select City / Province"}
                value={tempCity}
                options={cityOptions}
                onSelect={(val) => { setTempCity(val); setTempWard(''); }}
              />

              <Label text={isVi ? "Quận/Huyện & Phường/Xã" : "District & Ward"} required />
              <CustomDropdown
                placeholder={isVi ? "Chọn Phường/Xã" : "Select Ward"}
                value={tempWard}
                options={wardOptions}
                onSelect={setTempWard}
              />

              <Label text={isVi ? "Địa chỉ chi tiết" : "Detailed Address"} />
              <CustomInput
                placeholder={isVi ? "Số nhà, tên ngõ, tên đường... (Không bắt buộc)" : "House number, alley, street... (Optional)"}
                value={tempDetail}
                onChangeText={setTempDetail}
              />

              <View className="flex-row gap-3 mt-8 mb-4">
                <TouchableOpacity
                  className="flex-1 py-4 rounded-xl border border-gray-200 items-center bg-gray-50"
                  onPress={() => setShowAddressPopup(false)}
                >
                  <Text className="text-gray-600 font-bold">{isVi ? 'Hủy bỏ' : 'Cancel'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 py-4 rounded-xl bg-[#E89B5A] items-center shadow-sm"
                  onPress={handleConfirmAddress}
                >
                  <Text className="text-white font-bold">{isVi ? 'Xác nhận' : 'Confirm'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        {/* --- LIMIT MODAL --- */}
        <Modal visible={showLimitModal} transparent animationType="fade">
          <View className="flex-1 bg-black/50 justify-center items-center px-6">
            <View className="bg-white w-full rounded-[28px] p-6 items-center shadow-2xl">
              <View className="w-16 h-16 bg-red-50 rounded-full items-center justify-center mb-5">
                <Ionicons name="warning-outline" size={32} color="#EF4444" />
              </View>
              <Text className="text-xl font-bold text-gray-900 mb-2 text-center">
                {isVi ? 'Đạt giới hạn đăng ký' : 'Reached Registration Limit'}
              </Text>
              <Text className="text-gray-500 text-center mb-6 leading-6 text-sm">
                {isVi
                  ? 'Bạn đang có 5 đơn đăng ký chờ xử lý. Vui lòng đợi kết quả các đơn cũ trước khi nộp thêm hồ sơ mới nhé!'
                  : 'You have 5 pending adoption applications. Please wait for the results before submitting a new one!'}
              </Text>
              <TouchableOpacity
                className="w-full bg-[#F99C2E] py-4 rounded-xl items-center shadow-sm"
                activeOpacity={0.8}
                onPress={() => { setShowLimitModal(false); router.back(); }}
              >
                <Text className="text-white font-bold text-base">{isVi ? 'Quay lại' : 'Go Back'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* --- POLICY MODAL --- */}
        <Modal visible={showPolicyModal} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setShowPolicyModal(false)}>
          <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
            <View className="flex-row items-center justify-between px-4 pt-3">
              <View className="w-10" />
              <Text className="flex-1 text-center font-semibold text-[24px] text-gray-900 tracking-wide">
                {isVi ? 'Chính sách nhận nuôi' : 'Adoption Policy'}
              </Text>
              <TouchableOpacity onPress={() => setShowPolicyModal(false)} className="w-10 items-end py-1.5">
                <Feather name="x" size={22} color="#374151" />
              </TouchableOpacity>
            </View>
            <ScrollView className="flex-1 px-[35px] pt-[50px]" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              <View className="mb-4">
                <PolicyItem number="1"
                  title={isVi ? 'Yêu thương và chăm sóc thú cưng suốt đời' : 'Love and care for your pet for life'}
                  content={isVi ? 'Không được bỏ rơi, gây hại hoặc sử dụng thú cưng cho bất kỳ mục đích bất hợp pháp hay vô nhân đạo nào.' : 'Do not abandon, harm, or use the pet for any illegal or inhumane purposes.'} />
                <PolicyItem number="2"
                  title={isVi ? 'Cung cấp môi trường sống an toàn và phù hợp' : 'Provide a safe and suitable living environment'}
                  content={isVi ? 'Bao gồm thức ăn phù hợp, nơi trú ẩn, sự chú ý và chăm sóc thú y khi cần thiết.' : 'This includes proper food, shelter, attention, and veterinary care when needed.'} />
                <PolicyItem number="3"
                  title={isVi ? 'Chăm sóc sức khỏe của thú cưng' : "Take care of your pet's health"}
                  content={isVi ? 'Khám sức khỏe định kỳ, tiêm phòng và tiêm vacxin dại theo khuyến cáo.' : 'Regular check-ups, vaccinations, and rabies shots as recommended.'} />
                <PolicyItem number="4"
                  title={isVi ? 'Giữ liên lạc' : 'Stay in touch'}
                  content={isVi ? 'Trong 6 tháng đầu, chia sẻ các cập nhật để đảm bảo thú cưng đang được chăm sóc tốt.' : 'During the first 6 months, share updates to ensure the pet is doing well.'} />
                <PolicyItem number="5"
                  title={isVi ? 'Không được chuyển nhượng thú cưng' : 'Do not transfer your pet'}
                  content={isVi ? 'Liên hệ PawLife nếu bạn không còn khả năng chăm sóc thú cưng.' : 'Contact PawLife if you can no longer care for the pet.'} />
                <PolicyItem number="6"
                  title={isVi ? 'Cung cấp thông tin cá nhân chính xác' : 'Provide truthful personal information'}
                  content={isVi ? 'Thông tin cơ bản giúp đảm bảo an toàn cho thú cưng của bạn.' : "Basic info helps ensure your pet's safety."} />
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* --- HEADER --- */}
        <View className="flex-row items-center px-4 py-3 border-b border-gray-50 bg-white">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <Feather name="chevron-left" size={24} color="#000000" />
          </TouchableOpacity>
          <Text className="flex-1 text-center font-semibold text-[24px] text-gray-900 mr-8">
            {isVi ? 'Đơn đăng ký nhận nuôi' : 'Adoption Application'}
          </Text>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
            className="px-5 pt-6 bg-white"
          >
            {/* PET INFO CARD */}
            <View className="bg-[#EFF8FF] p-4 rounded-2xl flex-row items-center border border-blue-50">
              <Image source={{ uri: petInfo.image }} className="w-16 h-16 rounded-xl" />
              <View className="ml-4 flex-1">
                <Text className="text-gray-900 font-bold text-lg">{petInfo.name}</Text>
                <Text className="text-gray-500 text-xs">{petInfo.age} · {petInfo.breed}</Text>
                <Text className="text-[#F97316] text-xs font-bold">{petInfo.shelterName}</Text>
              </View>
            </View>

            {/* SECTION A */}
            <SectionTitle title={isVi ? 'Mục A – Thông tin liên lạc' : 'Section A – Contact Information'} />

            <Label text={isVi ? 'Họ và tên' : 'Full Name'} required />
            <CustomInput value={fullName} onChangeText={handleNameChange} />

            <Label text={isVi ? 'Số điện thoại' : 'Phone Number'} required />
            <CustomInput value={phone} onChangeText={handlePhoneChange} keyboardType="phone-pad" isPristine={isPhonePristine} />

            <Label text={isVi ? 'Số Zalo/WhatsApp' : 'Zalo/WhatsApp number'} required />
            <CustomInput value={zalo} onChangeText={handleZaloChange} keyboardType="phone-pad" isPristine={isZaloPristine} />

            <Label
              text={isVi
                ? `Bạn điền form này để nhận nuôi ${petInfo.name} cho bản thân hay thay mặt người khác?`
                : `Are you filling out this form to adopt ${petInfo.name} for yourself or on behalf of someone else?`}
              required
            />
            <OptionGroup options={myselfSomeone} selected={adoptFor} onSelect={setAdoptFor} />

            {/* SECTION B */}
            <SectionTitle title={isVi ? 'Mục B – Điều kiện sinh sống' : 'Section B – Living Conditions'} />

            <Label text={isVi ? 'Thú cưng sẽ ở đâu?' : 'Where will your pet stay?'} required />
            <TouchableOpacity
              onPress={() => setShowAddressPopup(true)}
              className="w-full bg-white border border-gray-200 rounded-2xl h-14 px-4 flex-row items-center justify-between"
            >
              <Text className={`${location ? 'text-gray-900 font-medium' : 'text-gray-400'}`} numberOfLines={1}>
                {location || (isVi ? 'Nhấn để nhập địa chỉ chi tiết...' : 'Tap to enter your address...')}
              </Text>
              <Feather name="map-pin" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <Label text={isVi ? 'Loại nhà ở của bạn' : 'Specify your type of housing'} required />
            <CustomDropdown
              placeholder={isVi ? 'Chọn loại nhà ở' : 'Select housing type'}
              value={housing}
              options={HOUSING_TYPES}
              onSelect={setHousing}
            />
            {housing === (isVi ? 'Khác' : 'Other') && (
              <CustomInput
                placeholder={isVi ? 'Vui lòng mô tả loại nhà ở của bạn' : 'Please specify your housing type'}
                value={otherHousing}
                onChangeText={setOtherHousing}
              />
            )}

            <Label text={isVi ? 'Trong nhà có trẻ nhỏ không?' : 'Are there children in your household?'} required />
            <AdviceText text={isVi
              ? 'Một số thú cưng tại trung tâm không phù hợp để sống cùng trẻ nhỏ'
              : 'Some pets in the rescue center are not suitable for living with children'} />
            <OptionGroup options={yesNo} selected={children} onSelect={setChildren} />

            <Label text={isVi ? 'Bạn có định nhốt thú cưng trong chuồng không?' : 'Are you planning to keep the pet in a cage?'} required />
            <OptionGroup options={yesNoSometimes} selected={cage} onSelect={setCage} />

            {/* SECTION C */}
            <SectionTitle title={isVi ? 'Mục C – Kinh nghiệm nuôi thú cưng' : 'Section C – Pet Experience'} />

            <Label text={isVi ? 'Bạn đã từng nuôi thú cưng chưa?' : 'Have you raised any pet before?'} required />
            <AdviceText text={isVi
              ? 'Một số thú cưng không phù hợp để sống cùng các con vật khác'
              : 'Some pets in the rescue center are not suitable for living with other pets'} />
            <CustomDropdown
              placeholder={isVi ? 'Chọn một lựa chọn' : 'Select an option'}
              value={exp}
              options={PET_EXPERIENCES}
              onSelect={setExp}
            />

            <Label text={isVi ? 'Nếu thú cưng trước không còn, chuyện gì đã xảy ra?' : 'If your pet(s) is no longer with you, what happened to them?'} required />
            <CustomInput multiline value={prevPetHistory} onChangeText={setPrevPetHistory} />

            {/* SECTION D */}
            <SectionTitle title={isVi ? 'Mục D – Việc làm & Cá nhân' : 'Section D – Employment & Personal'} />

            <Label text={isVi ? 'Tình trạng việc làm của bạn?' : 'Specify your employment status?'} required />
            <CustomDropdown
              placeholder={isVi ? 'Chọn tình trạng việc làm' : 'Select employment status'}
              value={job}
              options={EMPLOYMENT_STATUSES}
              onSelect={setJob}
            />

            {/* SECTION E */}
            <SectionTitle title={isVi ? 'Mục E – Cam kết nhận nuôi' : 'Section E – Adoption Commitment'} />

            <Label text={isVi ? 'Lý do nhận nuôi' : 'Reason of adoption'} required />
            <CustomDropdown
              placeholder={isVi ? 'Chọn lý do' : 'Select reason'}
              value={reason}
              options={ADOPTION_REASONS}
              onSelect={setReason}
            />
            {reason === (isVi ? 'Khác' : 'Other') && (
              <CustomInput
                placeholder={isVi ? 'Vui lòng nêu rõ lý do của bạn' : 'Please specify your reason'}
                value={otherReason}
                onChangeText={setOtherReason}
                multiline
              />
            )}

            <Label text={isVi
              ? 'Bạn có sẵn sàng tiêm phòng hàng năm và chăm sóc y tế cho thú cưng không?'
              : 'Are you willing to provide yearly vaccinations and medical care for the pet?'} required />
            <OptionGroup options={yesNo} selected={vaccine} onSelect={setVaccine} />

            <Label text={isVi
              ? 'Bạn có sẵn sàng đưa thú cưng đến bệnh viện và chi trả toàn bộ chi phí điều trị không?'
              : 'Are you willing to take your dog/cat to the hospital and pay all costs of treatment?'} required />
            <AdviceText text={isVi
              ? 'Động vật nhận nuôi đôi khi bị bệnh, đặc biệt là những con lớn tuổi, cần được chăm sóc y tế'
              : 'Adopted animals may sometimes get sick, especially older ones, and require hospital care'} />
            <OptionGroup options={yesNo} selected={medical} onSelect={setMedical} />

            <Label text={isVi
              ? 'Bạn có sẵn sàng chi trả các khoản cần thiết để đảm bảo sức khỏe và vệ sinh cho thú cưng trước khi về nhà không?'
              : 'Are you willing to cover certain expenses to ensure their health and hygiene before rehoming them?'} required />
            <AdviceText text={isVi
              ? 'SNNC không thu bất kỳ phí nào liên quan đến quá trình nhận nuôi; các chi phí này do người nhận nuôi thanh toán trực tiếp cho nhà cung cấp dịch vụ'
              : 'SNNC does not collect any adoption fees; these costs are paid directly by the adopter to the service providers'} />
            <OptionGroup options={yesNo} selected={expenses} onSelect={setExpenses} />

            <Label text={isVi
              ? 'Bạn có sẵn sàng cập nhật tình trạng thú cưng trên Zalo/Facebook trong 6 tháng đầu không?'
              : 'Are you willing to update the pet status on Zalo/Facebook/etc. for the first 6 months?'} required />
            <OptionGroup options={yesNo} selected={updateStatus} onSelect={setUpdateStatus} />

            <Label text={isVi
              ? 'Bạn có cho phép đại diện SNNC đến thăm nhà để theo dõi không?'
              : 'Would you allow SNNC representatives to visit your home for follow-ups?'} required />
            <OptionGroup options={yesNo} selected={homeVisit} onSelect={setHomeVisit} />

            <Label text={isVi
              ? 'Bạn có sẵn sàng cung cấp thông tin CCCD và địa chỉ chính xác nơi thú cưng sẽ được nuôi giữ không?'
              : 'Are you willing to provide your ID details and exact address where the pet will be kept?'} required />
            <OptionGroup options={yesNo} selected={provideID} onSelect={setProvideID} />

            {/* SUBMIT */}
            <View className="flex-row items-center mt-[50px] mb-[21px]">
              <TouchableOpacity onPress={() => setIsAgreed(!isAgreed)} className="mr-3" activeOpacity={0.7}>
                <Ionicons name={isAgreed ? "checkbox" : "square-outline"} size={24} color={isAgreed ? "#E89B5A" : "#9CA3AF"} />
              </TouchableOpacity>
              <Text className="flex-1 text-gray-600 text-[14px] leading-5">
                {isVi ? 'Tôi đồng ý với ' : 'I agree to '}
                <Text className="text-[#E89B5A] font-bold" onPress={() => setShowPolicyModal(true)}>
                  {isVi ? 'điều khoản Chính sách Nhận nuôi của PawLife.' : 'conditions of PawLife Adoption Policy.'}
                </Text>
              </Text>
            </View>

            <TouchableOpacity
              className="w-full py-4 rounded-full mt-4 mb-8 flex-row justify-center items-center"
              style={{ backgroundColor: isLoading ? '#fcd3a0' : (!isAgreed ? '#F6F6F6' : '#E89B5A') }}
              activeOpacity={0.8}
              onPress={handleSubmit}
              disabled={isLoading || !isAgreed}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className={`font-bold text-center text-lg ${!isAgreed ? 'text-[#B8B8B8]' : 'text-white'}`}>
                  {isVi ? 'Gửi đơn đăng ký' : 'Send Application'}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}