// app/adoption-form.tsx
import axiosClient from '@/api/axiosClient';
import { Text } from '@/components/AppText';
import { AuthContext } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { petService } from '@/services/petService';
import { calculateAge } from '@/utils/dateHelper';
import { AntDesign, Feather, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useModalStore } from '../store/useModalStore';

// --- DATA CONSTANTS ---
const HOUSING_TYPES = [
  "House",
  "House with a garden",
  "Apartment (allows pet ownership)",
  "Apartment (pets not allowed, but willing to keep a pet discreetly)",
  "Rented house",
  "Other"
];

const PET_EXPERIENCES = [
  "Yes, I used to have one",
  "My pet is still living with me now",
  "No, I haven't"
];

const EMPLOYMENT_STATUSES = [
  "Currently employed",
  "Currently employed (occasionally travels for work)",
  "Currently employed (frequently travels for work)",
  "Self-employed",
  "Student (without a stable income)",
  "Pupil"
];

const ADOPTION_REASONS = [
  "Garden guarding",
  "Parking lot guarding",
  "Breeding",
  "Gift for children",
  "Because I want to give them a forever home",
  "Other"
];

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
  isPristine = false, // Thêm prop này
}: {
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: any;
  isPristine?: boolean; // Thêm type
}) => (
  <View className="">
    <TextInput
      className={`w-full bg-white border border-gray-200 rounded-2xl px-4 ${
        isPristine ? 'text-gray-400' : 'text-gray-800' // Đổi màu mờ nếu đang pristine
      } ${multiline ? 'h-24 py-3' : 'h-14'}`}
      placeholder={placeholder}
      placeholderTextColor="#9CA3AF"
      value={value}
      onChangeText={onChangeText}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
      keyboardType={keyboardType}
      // Ép con trỏ về đầu dòng khi chưa có tương tác nhập mới
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
  const [visible, setVisible] = useState(false);

  return (
    <View className="">
      <TouchableOpacity
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
        className={`w-full bg-white border border-gray-200 rounded-2xl h-14 px-4 flex-row items-center justify-between ${visible ? 'border-orange-400' : ''}`}
      >
        <Text className={`${value ? 'text-gray-900' : 'text-gray-400'} text-sm font-medium`} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Feather name={visible ? "chevron-up" : "chevron-down"} size={20} color="#9CA3AF" />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setVisible(false)}>
          <View className="flex-1 bg-black/40 justify-center px-6">
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-3xl max-h-[60%] overflow-hidden shadow-2xl">
                <View className="px-5 py-4 border-b border-gray-100 flex-row justify-between items-center bg-gray-50">
                  <Text className="font-bold text-gray-700 text-base">{placeholder}</Text>
                  <TouchableOpacity onPress={() => setVisible(false)}>
                    <AntDesign name="close" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={options}
                  keyExtractor={(item) => item}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => {
                    const isSelected = item === value;
                    return (
                      <TouchableOpacity
                        className={`px-5 py-4 border-b border-gray-50 flex-row items-center justify-between ${isSelected ? 'bg-blue-50' : 'active:bg-gray-50'}`}
                        onPress={() => {
                          if (onSelect) onSelect(item);
                          setVisible(false);
                        }}
                      >
                        <Text className={`text-sm ${isSelected ? 'text-blue-600 font-bold' : 'text-gray-700'}`}>
                          {item}
                        </Text>
                        {isSelected && <Ionicons name="checkmark" size={18} color="#2563EB" />}
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
            : 'bg-white  border-[#E5E5E5]'
            }`}
        >
          <Text
            className={`font-semibold text-[14px] ${isActive ? 'text-white' : 'text-[#757575]'
              }`}
          >
            {opt}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

export default function AdoptionFormScreen() {
  const { user } = useContext(AuthContext);
  const { language } = useLanguage();
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
  
  const [location, setLocation] = useState(''); // Lưu chuỗi địa chỉ cuối cùng
  const [housing, setHousing] = useState('Apartment (allows pet ownership)');
  const [otherHousing, setOtherHousing] = useState('');
  const [exp, setExp] = useState('Yes, I used to have one');
  const [job, setJob] = useState('Currently employed');
  const [reason, setReason] = useState('Because I want to give them a forever home');
  const [otherReason, setOtherReason] = useState('');
  const [prevPetHistory, setPrevPetHistory] = useState("My previous dog passed away due to old age after 12 wonderful years together.");
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

  // --- ADDRESS POPUP STATE & LOGIC ---
  const [showAddressPopup, setShowAddressPopup] = useState(false);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [wardOptions, setWardOptions] = useState<string[]>([]);
  const [tempCity, setTempCity] = useState('');
  const [tempWard, setTempWard] = useState(''); // Gom quận/huyện và phường/xã
  const [tempDetail, setTempDetail] = useState('');
  const [addressDataAPI, setAddressDataAPI] = useState<any[]>([]);
  const [tempDistrict, setTempDistrict] = useState('');
  useEffect(() => {
    if (user) {
      if (user.name) {
        setFullName(user.name);
        setIsNamePristine(true);
      }
      if (user.phone) {
        setPhone(user.phone);
        setIsPhonePristine(true);
        
        // Mặc định số Zalo trùng hoàn toàn với số điện thoại profile
        setZalo(user.phone); 
        setIsZaloPristine(true);
      }
    }
  }, [user]);
  const handleNameChange = (text: string) => {
    if (isNamePristine) {
      // Nếu user bấm xoá (độ dài giảm), set rỗng luôn. Nếu gõ thêm, lấy kí tự mới gõ.
      const newText = text.length < fullName.length ? '' : text.replace(fullName, '') || text.slice(-1);
      setFullName(newText);
      setIsNamePristine(false);
    } else {
      setFullName(text);
    }
  };

  const handlePhoneChange = (text: string) => {
    let finalPhone = text;
    if (isPhonePristine) {
      finalPhone = text.length < phone.length ? '' : text.replace(phone, '') || text.slice(-1);
      setPhone(finalPhone);
      setIsPhonePristine(false);
    } else {
      setPhone(text);
    }

    // Nếu ô Zalo vẫn chưa bị chạm vào, đồng bộ giá trị theo ô Phone luôn
    if (isZaloPristine) {
      setZalo(finalPhone);
    }
  };

  const handleZaloChange = (text: string) => {
    if (isZaloPristine) {
      // Nếu xóa ký tự, clear trắng hoàn toàn. Nếu gõ ký tự mới, đè lên ký tự cũ.
      const newText = text.length < zalo.length ? '' : text.replace(zalo, '') || text.slice(-1);
      setZalo(newText);
      setIsZaloPristine(false); // Đánh dấu đã qua chỉnh sửa, tắt chế độ pristine
    } else {
      setZalo(text);
    }
  };
  // Tự động load danh sách Tỉnh thành khi vào form
  useEffect(() => {
    fetch('https://provinces.open-api.vn/api/v2/p/')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const hanoi = data.find((p: any) => p.codename === 'ha_noi');
          const hcm = data.find((p: any) => p.codename === 'ho_chi_minh');
          
          const remainingProvinces = data.filter(
            (p: any) => p.codename !== 'ha_noi' && p.codename !== 'ho_chi_minh'
          );

          const priorityProvinces = [];
          if (hanoi) priorityProvinces.push(hanoi);
          if (hcm) priorityProvinces.push(hcm);

          setProvinces([...priorityProvinces, ...remainingProvinces]);
        }
      })
      .catch(e => console.error("Lỗi fetch tỉnh/thành:", e));
  }, []);

  const cityOptions = provinces.map((c: any) => c.name);

  // 2. Fetch danh sách Phường/Xã khi chọn Tỉnh
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
            const allWards = data.map((ward: any) => ward.name);
            setWardOptions(allWards);
          }
        })
        .catch(e => console.error("Lỗi fetch chi tiết phường/xã:", e));
    }
  }, [tempCity, provinces]);

  const handleConfirmAddress = () => {
    // Chỉ check Tỉnh/Thành và Phường/Xã
    if (!tempCity || !tempWard) {
      Alert.alert("Thiếu thông tin", "Vui lòng chọn đầy đủ Tỉnh/Thành phố và Phường/Xã.");
      return;
    }
    
    // Nối chuỗi, nếu có detail thì thêm dấu phẩy, không thì bỏ qua
    const detailPart = tempDetail.trim() ? `${tempDetail.trim()}, ` : '';
    const fullAddress = `${detailPart}${tempWard}, ${tempCity}`;
    
    setLocation(fullAddress);
    setShowAddressPopup(false); 
  };

  // --- USE EFFECT CHECK LIMIT ---
  useEffect(() => {
    const checkLimit = async () => {
      try {
        const response = await axiosClient.get('/applications/my-applications');
        const applications = response.data?.data || [];
        const activeApps = applications.filter(
          (app: any) => app.status !== 'CLOSED' && app.status !== 'ADOPTION_COMPLETED'
        );
        if (activeApps.length >= 5) {
          setShowLimitModal(true);
        }
      } catch (error) {
        console.error("Failed to check application limit", error);
      } finally {
        setIsCheckingLimit(false);
      }
    };
    checkLimit();
  }, []);

  if (loading || !petData) {
    return <ActivityIndicator size="large" color="#F99C2E" />;
  }

  const petInfo = {
    name: petData?.name || 'Pet',
    age: petData?.dob ? calculateAge(petData.dob) : 'Unknown',
    breed: petData?.breed || 'Unknown',
    shelterName: petData?.shelter?.name || 'Sân Nhà Nhiều Chó',
    image: petData?.avatarUrl || 'https://images.unsplash.com/default_pet.jpg',
  };

  const handleSubmit = async () => {
    if (!petId) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin thú cưng.');
      return;
    }
    if (!fullName || !phone || !zalo || !location) {
      Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ thông tin liên lạc và địa chỉ cư trú.');
      return;
    }

    try {
      setIsLoading(true);
      const finalHousing = housing === 'Other' ? otherHousing : housing;
      const finalReason = reason === 'Other' ? otherReason : reason;

      const payload = {
        petId,
        fullName,
        phone,
        zalo,
        adoptFor,
        location, // Gửi chuỗi location đã nối
        housing: finalHousing,
        children,
        cage,
        petExperience: exp,
        prevPetHistory,
        employmentStatus: job,
        adoptionReason: finalReason,
        commitments: {
          vaccine,
          medical,
          expenses,
          updateStatus,
          homeVisit,
          provideID
        }
      };

      await axiosClient.post('/applications', payload);
      showModal({
        title: 'Terms of Service!',
        message: 'Thanks For Your Application. We will review your application and contact you soon. Please be patient and make sure to keep your phone available for our call.',
        buttonText: 'Back',
        onConfirm: () => {
          router.dismissAll();
          router.push({
            pathname: '/(tabs)/matching',
            params: { returnFromSuccess: '1' }
          });
        }
      });
    } catch (error: any) {
      Alert.alert('Gửi đơn thất bại', error.response?.data?.message || 'Đã có lỗi xảy ra.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingLimit) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#F99C2E" />
        <Text className="text-gray-500 mt-4 font-medium">Đang kiểm tra dữ liệu...</Text>
      </View>
    );
  }

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
                Update your address
              </Text>
              
              <Label text={isVi ? "Thành phố / Tỉnh" : "City / Province"} required />
              <CustomDropdown
                placeholder={isVi ? "Chọn Tỉnh/Thành phố" : "Select City / Province"}
                value={tempCity}
                options={cityOptions}
                onSelect={(val) => {
                  setTempCity(val);
                  setTempWard(''); // Reset phường/xã (Ward/District)
                }}
              />

              {/* Gộp Quận/Huyện & Phường/Xã */}
              <Label text={isVi ? "Quận/Huyện & Phường/Xã" : "District & Ward"} required />
              <CustomDropdown
                placeholder={isVi ? "Chọn Phường/Xã" : "Select Ward"}
                value={tempWard}
                options={wardOptions}
                onSelect={setTempWard}
              />

              <Label text={isVi ? "Địa chỉ chi tiết" : "Detailed Address"} />
              <CustomInput
                placeholder={isVi ? "Số nhà, tên ngõ, tên đường... (Không bắt buộc)" : "House number, alley name, street name... (Optional)"} // Thêm gợi ý
                value={tempDetail}
                onChangeText={setTempDetail}
              />

              <View className="flex-row gap-3 mt-8 mb-4">
                <TouchableOpacity
                  className="flex-1 py-4 rounded-xl border border-gray-200 items-center bg-gray-50"
                  onPress={() => setShowAddressPopup(false)}
                >
                  <Text className="text-gray-600 font-bold">{isVi ? "Hủy bỏ" : "Cancel"}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 py-4 rounded-xl bg-[#E89B5A] items-center shadow-sm"
                  onPress={handleConfirmAddress}
                >
                  <Text className="text-white font-bold">{isVi ? "Xác nhận" : "Confirm"}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        {/* --- CUSTOM LIMIT MODAL --- */}
        <Modal visible={showLimitModal} transparent animationType="fade">
          {/* Nội dung giữ nguyên */}
          <View className="flex-1 bg-black/50 justify-center items-center px-6">
            <View className="bg-white w-full rounded-[28px] p-6 items-center shadow-2xl">
              <View className="w-16 h-16 bg-red-50 rounded-full items-center justify-center mb-5">
                <Ionicons name="warning-outline" size={32} color="#EF4444" />
              </View>
              <Text className="text-xl font-bold text-gray-900 mb-2 text-center">
                {isVi ? "Đạt giới hạn đăng ký" : "Reached Registration Limit"}
              </Text>
              <Text className="text-gray-500 text-center mb-6 leading-6 text-sm">
                {isVi
                  ? "Bạn đang có 5 đơn đăng ký chờ xử lý. Vui lòng đợi kết quả của các đơn cũ trước khi nộp thêm hồ sơ mới nhé!"
                  : "You have 5 pending adoption applications. Please wait for the results of your previous applications before submitting a new one!"}
              </Text>
              <TouchableOpacity
                className="w-full bg-[#F99C2E] py-4 rounded-xl items-center shadow-sm"
                activeOpacity={0.8}
                onPress={() => {
                  setShowLimitModal(false);
                  router.back();
                }}
              >
                <Text className="text-white font-bold text-base">{isVi ? "Quay lại" : "Go Back"}</Text>
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
                {isVi ? "Chính sách nhận nuôi" : "Adoption Policy"}
              </Text>
              <TouchableOpacity onPress={() => setShowPolicyModal(false)} className="w-10 items-end py-1.5">
                <Feather name="x" size={22} color="#374151" />
              </TouchableOpacity>
            </View>
            <ScrollView className="flex-1 px-[35px] pt-[50px]" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              <View className="mb-4">
                <PolicyItem number="1" title={isVi ? "Yêu thương và chăm sóc thú cưng suốt đời" : "Love and care for your pet for life"} content={isVi ? "Không được bỏ rơi, gây hại hoặc sử dụng thú cưng cho bất kỳ mục đích bất hợp pháp hay vô nhân đạo nào." : "Do not abandon, harm, or use the pet for any illegal or inhumane purposes."} />
                <PolicyItem number="2" title={isVi ? "Cung cấp môi trường sống an toàn và phù hợp" : "Provide a safe and suitable living environment"} content={isVi ? "Điều này bao gồm thức ăn phù hợp, nơi trú ẩn, sự chú ý và chăm sóc thú y khi cần thiết." : "This includes proper food, shelter, attention, and veterinary care when needed."} />
                <PolicyItem number="3" title={isVi ? "Chăm sóc sức khỏe của thú cưng" : "Take care of your pet's health"} content={isVi ? "Khám sức khỏe định kỳ, tiêm phòng và tiêm vacxin dại theo khuyến cáo." : "Check-ups, vaccinations, and rabies shots as recommended."} />
                <PolicyItem number="4" title={isVi ? "Giữ liên lạc" : "Stay in touch"} content={isVi ? "Trong 6 tháng đầu tiên, chia sẻ các cập nhật để đảm bảo thú cưng đang được chăm sóc tốt." : "During the first 6 months, share updates to ensure pet is doing well."} />
                <PolicyItem number="5" title={isVi ? "Không được chuyển nhượng thú cưng" : "Do not transfer your pet"} content={isVi ? "Liên hệ PawLife nếu bạn không còn khả năng chăm sóc thú cưng." : "Contact PawLife if you can no longer care for the pet."} />
                <PolicyItem number="6" title={isVi ? "Cung cấp thông tin cá nhân chính xác" : "Provide truthful personal information"} content={isVi ? "Thông tin cơ bản giúp đảm bảo an toàn cho thú cưng của bạn." : "Basic info helps ensure your pet's safety."} />
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
            {isVi ? "Đơn đăng ký nhận nuôi" : "Adoption Application"}
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
            <SectionTitle title="Section A – Contact Information" />
            <Label text="Full Name" required />
            <CustomInput 
              value={fullName} 
              onChangeText={handleNameChange} // Gọi handler tự tạo thay vì set state trực tiếp
            />

            <Label text="Phone Number" required />
            <CustomInput 
              value={phone} 
              onChangeText={handlePhoneChange} 
              keyboardType="phone-pad"
              isPristine={isPhonePristine} // Thêm dòng này
            />

            <Label text="Zalo/WhatsApp number" required />
            <CustomInput 
              value={zalo} 
              onChangeText={handleZaloChange} 
              keyboardType="phone-pad"
              isPristine={isZaloPristine} // Thêm dòng này
            />

            <Label text={`Are you filling out this form to adopt ${petInfo.name} for yourself or on behalf of someone else?`} required />
            <OptionGroup options={['Myself', 'Someone else']} selected={adoptFor} onSelect={setAdoptFor} />

            {/* SECTION B */}
            <SectionTitle title="Section B – Living Conditions" />

            <Label text="Where will your pet stay?" required />
            {/* NÚT MỞ POPUP CHỌN ĐỊA CHỈ */}
            <TouchableOpacity 
              onPress={() => setShowAddressPopup(true)}
              className="w-full bg-white border border-gray-200 rounded-2xl h-14 px-4 flex-row items-center justify-between"
            >
              <Text className={`${location ? 'text-gray-900 font-medium' : 'text-gray-400'}`} numberOfLines={1}>
                {location || "Nhấn để nhập địa chỉ chi tiết..."}
              </Text>
              <Feather name="map-pin" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <Label text="Specify your type of housing" required />
            <CustomDropdown
              placeholder="Select housing type"
              value={housing}
              options={HOUSING_TYPES}
              onSelect={setHousing}
            />
            {housing === 'Other' && (
              <CustomInput
                placeholder="Please specify your housing type"
                value={otherHousing}
                onChangeText={setOtherHousing}
              />
            )}

            <Label text="Are there children in your household?" required />
            <AdviceText text="Some pets in the rescue center are not suitable for living with children" />
            <OptionGroup options={['Yes', 'No']} selected={children} onSelect={setChildren} />

            <Label text="Are you planning to keep the pet in a cage?" required />
            <OptionGroup options={['Yes', 'No', 'Sometimes']} selected={cage} onSelect={setCage} />

            {/* SECTION C */}
            <SectionTitle title="Section C – Pet Experience" />
            <Label text="Have you raised any pet before?" required />
            <AdviceText text="Some pets in the rescue center are not suitable for living with other pets" />
            <CustomDropdown
              placeholder="Select an option"
              value={exp}
              options={PET_EXPERIENCES}
              onSelect={setExp}
            />

            <Label text="If your pet(s) is no longer with you, what happened to them?" required />
            <CustomInput multiline value={prevPetHistory} onChangeText={setPrevPetHistory} />

            {/* SECTION D */}
            <SectionTitle title="Section D – Employment & Personal" />
            <Label text="Specify your employment status?" required />
            <CustomDropdown
              placeholder="Select employment status"
              value={job}
              options={EMPLOYMENT_STATUSES}
              onSelect={setJob}
            />

            {/* SECTION E */}
            <SectionTitle title="Section E – Adoption Commitment" />
            <Label text="Reason of adoption" required />
            <CustomDropdown
              placeholder="Select reason"
              value={reason}
              options={ADOPTION_REASONS}
              onSelect={setReason}
            />
            {reason === 'Other' && (
              <CustomInput placeholder="Please specify your reason" value={otherReason} onChangeText={setOtherReason} multiline={true} />
            )}

            <Label text="Are you willing to provide yearly vaccinations and medical care for the pet?" required />
            <OptionGroup options={['Yes', 'No']} selected={vaccine} onSelect={setVaccine} />

            <Label text="Are you willing to take your dog/cat to the hospital and pay all the costs of treatment?" required />
            <AdviceText text="Adopted animals may sometimes get sick, especially older ones, and require hospital care" />
            <OptionGroup options={['Yes', 'No']} selected={medical} onSelect={setMedical} />

            <Label text="To adopt the pets, are you willing to cover certain expenses to ensure their health and hygiene before rehoming them?" required />
            <AdviceText text="SNNC does not collect any fees related to the adoption process; these costs - such as spaying/neutering, medical check-ups, or grooming - are paid directly by the adopter to the service providers" />
            <OptionGroup options={['Yes', 'No']} selected={expenses} onSelect={setExpenses} />

            <Label text="Are you willing to update the pet status on Zalo/Facebook/etc. for the first 6 months?" required />
            <OptionGroup options={['Yes', 'No']} selected={updateStatus} onSelect={setUpdateStatus} />

            <Label text="Would you allow SNNC representatives visiting your home for follow-ups?" required />
            <OptionGroup options={['Yes', 'No']} selected={homeVisit} onSelect={setHomeVisit} />

            <Label text="In accordance with SNNC's regulations and to ensure proper management of adopted pets, are you willing to provide your ID details and your exact address where the pet will be kept?" required />
            <OptionGroup options={['Yes', 'No']} selected={provideID} onSelect={setProvideID} />

            {/* SUBMIT BUTTON */}
            <View className="flex-row items-center mt-[50px] mb-[21px]">
              <TouchableOpacity onPress={() => setIsAgreed(!isAgreed)} className="mr-3" activeOpacity={0.7}>
                <Ionicons name={isAgreed ? "checkbox" : "square-outline"} size={24} color={isAgreed ? "#E89B5A" : "#9CA3AF"} />
              </TouchableOpacity>
              <Text className="flex-1 text-gray-600 text-[14px] leading-5">
                I agree to {" "}
                <Text className="text-[#E89B5A] font-bold" onPress={() => setShowPolicyModal(true)}>
                  conditions of PawLife Adoption Policy.
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
                  Send Application
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}