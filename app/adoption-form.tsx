// app/adoption-form.tsx
import axiosClient from '@/api/axiosClient';
import { Text } from '@/components/AppText';
import { AntDesign, Feather, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useModalStore } from '../store/useModalStore';
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

// --- DATA CONSTANTS ---
const LOCATIONS = [
  "Quận Ba Đình", "Quận Đống Đa", "Quận Hoàn Kiếm", "Quận Tây Hồ",
  "Quận Long Biên", "Quận Cầu Giấy", "Quận Hoàng Mai", "Quận Thanh Xuân",
  "Quận Bắc Từ Liêm", "Quận Nam Từ Liêm", "Ngoại thành Hà Nội"
];

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

interface AdoptionFormParams {
  id?: string;
  petId?: string;
  name?: string;
  age?: string;
  breed?: string;
  image?: string;
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
}: {
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) => (
  <View className="">
    <TextInput
      className={`w-full bg-white border border-gray-200 rounded-2xl px-4 text-gray-800 ${multiline ? 'h-24 py-3' : 'h-14'
        }`}
      placeholder={placeholder}
      placeholderTextColor="#9CA3AF"
      value={value}
      onChangeText={onChangeText}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
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
  const showModal = useModalStore((state) => state.showModal);
  const router = useRouter();
  const rawParams = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const params = rawParams as unknown as {
    id?: string;
    petId?: string;
    name?: string;
    age?: string;
    breed?: string;
    image?: string;
  };

  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingLimit, setIsCheckingLimit] = useState(true);
  const [showLimitModal, setShowLimitModal] = useState(false); // <--- State mới cho popup custom

  const petId = params.id || params.petId;

  const pet = {
    name: params.name || 'Max',
    age: params.age || '2 years',
    breed: params.breed || 'Labrador Retriever',
    shelter: 'Sân Nhà Nhiều Chó',
    image: (params.image as string) || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=1000&auto=format&fit=crop',
  };

  // --- STATE ---
  const [fullName, setFullName] = useState('Test User');
  const [phone, setPhone] = useState('+84 1234567890');
  const [zalo, setZalo] = useState('+84 1234567890');
  const [adoptFor, setAdoptFor] = useState('Myself');
  const [location, setLocation] = useState('Quận Cầu Giấy');
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

  // --- SUBMIT HANDLER ---
  const handleSubmit = async () => {
    if (!petId) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin thú cưng.');
      return;
    }
    if (!fullName || !phone || !zalo || !location) {
      Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ thông tin liên lạc.');
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
        location,
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
        message: 'Mauris id massa quis odio egestas interdum eget at felis. ',
        buttonText: 'Back',
        onConfirm: () => {
          router.dismissAll();
          router.replace({
            pathname: '/(tabs)/matching',
            params: { returnFromSuccess: '1' }
          });
          console.log('User bấm OK');
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
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        {/* --- CUSTOM LIMIT MODAL --- */}
        <Modal visible={showLimitModal} transparent animationType="fade">
          <View className="flex-1 bg-black/50 justify-center items-center px-6">
            <View className="bg-white w-full rounded-[28px] p-6 items-center shadow-2xl">
              <View className="w-16 h-16 bg-red-50 rounded-full items-center justify-center mb-5">
                <Ionicons name="warning-outline" size={32} color="#EF4444" />
              </View>

              <Text className="text-xl font-bold text-gray-900 mb-2 text-center">
                Đạt giới hạn đăng ký
              </Text>
              <Text className="text-gray-500 text-center mb-6 leading-6 text-sm">
                Bạn đang có 5 đơn đăng ký chờ xử lý. Vui lòng đợi kết quả của các đơn cũ trước khi nộp thêm hồ sơ mới nhé!
              </Text>

              <TouchableOpacity
                className="w-full bg-[#F99C2E] py-4 rounded-xl items-center shadow-sm"
                activeOpacity={0.8}
                onPress={() => {
                  setShowLimitModal(false);
                  router.back();
                }}
              >
                <Text className="text-white font-bold text-base">Quay lại</Text>
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
                Adoption Pawlicy
              </Text>
              <TouchableOpacity
                onPress={() => setShowPolicyModal(false)}
                className="w-10 items-end py-1.5"
              >
                <Feather name="x" size={22} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-[35px] pt-[50px]" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              <View className="mb-4">
                <PolicyItem number="1" title="Love and care for your pet for life" content="Do not abandon, harm, or use the pet for any illegal or inhumane purposes." />
                <PolicyItem number="2" title="Provide a safe and suitable living environment" content="This includes proper food, shelter, attention, and veterinary care when needed." />
                <PolicyItem number="3" title="Take care of your pet's health" content="Check-ups, vaccinations, and rabies shots as recommended." />
                <PolicyItem number="4" title="Stay in touch" content="During the first 6 months, share updates to ensure pet is doing well." />
                <PolicyItem number="5" title="Do not transfer your pet" content="Contact PawLife if you can no longer care for the pet." />
                <PolicyItem number="6" title="Provide truthful personal information" content="Basic info helps ensure your pet's safety." />
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
            Adoption Application
          </Text>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
            className="px-5 pt-6 bg-white"
          >
            {/* --- PET INFO CARD --- */}
            <View className="bg-[#EFF8FF] p-4 rounded-2xl flex-row items-center border border-blue-50">
              <Image source={{ uri: pet.image }} className="w-16 h-16 rounded-xl bg-gray-200" resizeMode="cover" />
              <View className="ml-4 flex-1">
                <Text className="text-gray-900 font-bold text-lg">{pet.name}</Text>
                <Text className="text-gray-500 text-xs mt-0.5">{pet.age} · {pet.breed}</Text>
                <Text className="text-[#F97316] text-xs font-bold mt-1">{pet.shelter}</Text>
              </View>
            </View>

            {/* --- SECTION A --- */}
            <SectionTitle title="Section A – Contact Information" />

            <Label text="Full Name" required />
            <CustomInput value={fullName} onChangeText={setFullName} />

            <Label text="Phone Number" required />
            <CustomInput value={phone} onChangeText={setPhone} />

            <Label text="Zalo/WhatsApp number" required />
            <CustomInput value={zalo} onChangeText={setZalo} />

            <Label text={`Are you filling out this form to adopt ${pet.name} for yourself or on behalf of someone else?`} required />
            <OptionGroup options={['Myself', 'Someone else']} selected={adoptFor} onSelect={setAdoptFor} />

            {/* --- SECTION B --- */}
            <SectionTitle title="Section B – Living Conditions" />

            <Label text="Where will your pet stay?" required />
            <CustomDropdown
              placeholder="Select district"
              value={location}
              options={LOCATIONS}
              onSelect={setLocation}
            />

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

            {/* --- SECTION C --- */}
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

            {/* --- SECTION D --- */}
            <SectionTitle title="Section D – Employment & Personal" />
            <Label text="Specify your employment status?" required />
            <CustomDropdown
              placeholder="Select employment status"
              value={job}
              options={EMPLOYMENT_STATUSES}
              onSelect={setJob}
            />

            {/* --- SECTION E --- */}
            <SectionTitle title="Section E – Adoption Commitment" />

            <Label text="Reason of adoption" required />
            <CustomDropdown
              placeholder="Select reason"
              value={reason}
              options={ADOPTION_REASONS}
              onSelect={setReason}
            />
            {reason === 'Other' && (
              <CustomInput
                placeholder="Please specify your reason"
                value={otherReason}
                onChangeText={setOtherReason}
                multiline={true}
              />
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

            {/* --- SUBMIT BUTTON --- */}
            <View className="flex-row items-center mt-[50px] mb-[21px]">
              <TouchableOpacity
                onPress={() => setIsAgreed(!isAgreed)}
                className="mr-3" // Xóa mt-0.5 ở đây
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isAgreed ? "checkbox" : "square-outline"}
                  size={24}
                  color={isAgreed ? "#E89B5A" : "#9CA3AF"}
                />
              </TouchableOpacity>
              <Text className="flex-1 text-gray-600 text-[14px] leading-5">
                I agree to {" "}
                <Text
                  className="text-[#E89B5A] font-bold"
                  onPress={() => setShowPolicyModal(true)}
                >
                  conditions of PawLife Adoption Policy.
                </Text>
              </Text>
            </View>

            {/* --- SUBMIT BUTTON --- */}
            <TouchableOpacity
              // Bỏ các class bg- ra khỏi className
              className="w-full py-4 rounded-full mt-4 mb-8 flex-row justify-center items-center"
              style={{
                // Quản lý màu nền trực tiếp qua style
                backgroundColor: isLoading
                  ? '#fcd3a0'
                  : (!isAgreed ? '#F6F6F6' : '#E89B5A') // #D1D5DB tương đương bg-gray-300
              }}
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