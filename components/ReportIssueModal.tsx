// components/ReportIssueModal.tsx
import { AntDesign, Feather, Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import React, { useEffect, useRef, useState } from 'react';
import {
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
    Switch,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { Text } from './AppText';
import { TextInput } from './AppTextInput';
import ReportSuccessModal from './ReportSuccessModal';

// --- BỔ SUNG IMPORT NGÔN NGỮ ---
import { useLanguage } from '@/contexts/LanguageContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --- INTERFACE UPDATE ĐỂ TRUYỀN DỮ LIỆU LÊN CHA ---
export interface ReportSubmitData {
    reason: string;
    details: string;
    location: string;
    date: Date;
    isBlockRequested: boolean;
}

interface Props {
    isVisible: boolean;
    onClose: () => void;
    onSubmit?: (data: ReportSubmitData) => Promise<void>;
}

// Cấu trúc lại REPORT_OPTIONS để hỗ trợ song ngữ
const REPORT_OPTIONS = [
    { key: "Inappropriate content or photos", en: "Inappropriate content or photos", vi: "Hình ảnh hoặc nội dung phản cảm" },
    { key: "Abusive language or hate speech", en: "Abusive language or hate speech", vi: "Ngôn từ quấy rối hoặc thù ghét" },
    { key: "Spam, scam or fake profile", en: "Spam, scam or fake profile", vi: "Spam, lừa đảo hoặc giả mạo" },
    { key: "Signs of neglect", en: "Signs of neglect", vi: "Dấu hiệu bị bỏ bê" },
    { key: "Signs of abuse", en: "Signs of abuse", vi: "Dấu hiệu bị bạo hành" },
    { key: "I found this tag without the pet", en: "I found this tag without the pet", vi: "Tôi tìm thấy thẻ này nhưng không thấy thú cưng" },
    { key: "Other", en: "Other", vi: "Khác" },
];

// --- CÁC COMPONENT PHỤ TRỢ CHO POPUP ĐỊA CHỈ ---
const Label = ({ text, required = false }: { text: string; required?: boolean }) => (
    <Text className="text-[#8E8E93] text-[14px] font-medium mb-2 mt-4">
        {text} {required && <Text className="text-red-500">*</Text>}
    </Text>
);

const CustomInput = ({ value, onChangeText, placeholder }: { value?: string; onChangeText?: (text: string) => void; placeholder?: string }) => (
    <View>
        <TextInput
            className="w-full bg-white border border-[#E5E5E5] rounded-2xl px-4 text-black h-14"
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            value={value}
            onChangeText={onChangeText}
            style={{ fontFamily: "Urbanist" }}
        />
    </View>
);

const CustomDropdown = ({ placeholder, value, options = [], onSelect }: { placeholder: string; value?: string; options?: string[]; onSelect?: (val: string) => void }) => {
    const [visible, setVisible] = useState(false);

    return (
        <View>
            <TouchableOpacity
                onPress={() => setVisible(true)}
                activeOpacity={0.7}
                className={`w-full bg-white border border-[#E5E5E5] rounded-2xl h-14 px-4 flex-row items-center justify-between ${visible ? 'border-[#E89B5A]' : ''}`}
            >
                <Text className={`${value ? 'text-black' : 'text-[#9CA3AF]'} text-[14px] font-medium`} numberOfLines={1}>
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
                                                className={`px-5 py-4 border-b border-gray-50 flex-row items-center justify-between ${isSelected ? 'bg-orange-50' : 'active:bg-gray-50'}`}
                                                onPress={() => {
                                                    if (onSelect) onSelect(item);
                                                    setVisible(false);
                                                }}
                                            >
                                                <Text className={`text-[14px] ${isSelected ? 'text-[#E89B5A] font-bold' : 'text-gray-700'}`}>
                                                    {item}
                                                </Text>
                                                {isSelected && <Ionicons name="checkmark" size={18} color="#E89B5A" />}
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


export default function ReportIssueModal({ isVisible, onClose, onSubmit }: Props) {
    // --- LẤY NGÔN NGỮ HIỆN TẠI ---
    const { t, language } = useLanguage();
    const isVi = language === 'vi';

    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [otherReason, setOtherReason] = useState('');
    const [isBlockRequested, setIsBlockRequested] = useState(false); // Thêm state Block
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [isSuccessVisible, setIsSuccessVisible] = useState(false);
    const [submittedAt, setSubmittedAt] = useState<Date | null>(null);

    const handleSubmit = async () => {
        if (!selectedOption) return;

        try {
            setIsSubmitting(true);
            const finalReason = selectedOption === 'Other' ? otherReason : selectedOption;

            if (onSubmit) {
                await onSubmit({
                    reason: finalReason,
                    details: otherReason,
                    location,
                    date,
                    isBlockRequested
                });
            }

            // 1. Đóng report modal trước
            onClose();

            // 2. Nếu CHỌN BLOCK -> Không cần hiện popup Success, màn hình cha tự ẩn.
            // Ngược lại, hiện popup Success.
            if (!isBlockRequested) {
                setTimeout(() => {
                    setSubmittedAt(new Date());
                    setIsSuccessVisible(true);
                }, 350);
            } else {
                handleResetState(); // Reset ngầm
            }
        } catch (e) {
            Alert.alert(
                isVi ? 'Lỗi' : 'Error',
                isVi ? 'Không thể gửi báo cáo. Vui lòng thử lại.' : 'Failed to submit report. Please try again.'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResetState = () => {
        setSelectedOption(null);
        setOtherReason('');
        setIsBlockRequested(false);
        setLocation('');
        setDate(new Date());
    }

    const handleSuccessClose = () => {
        setIsSuccessVisible(false);
        handleResetState();
    };

    const [location, setLocation] = useState('');

    // --- STATE QUẢN LÝ NGÀY GIỜ ---
    const [date, setDate] = useState<Date>(new Date());
    const [tempDate, setTempDate] = useState<Date>(new Date()); // Dành cho Android
    const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date'); // Dành cho Android
    const [isDatePickerVisible, setDatePickerVisible] = useState(false); // Dành cho Android

    // --- STATE CHO IOS GLASSMORPHISM DATE PICKER ---
    const datetimeRef = useRef<View>(null);
    const [activePicker, setActivePicker] = useState<'datetime' | null>(null);
    const [pickerLayout, setPickerLayout] = useState({ x: 0, y: 0, width: 340 });
    const pickerOpacity = useRef(new Animated.Value(0)).current;
    const pickerTranslateY = useRef(new Animated.Value(-8)).current;

    // --- ADDRESS POPUP STATE & LOGIC ---
    const [showAddressPopup, setShowAddressPopup] = useState(false);
    const [provinces, setProvinces] = useState<any[]>([]);
    const [wardOptions, setWardOptions] = useState<string[]>([]);

    const [tempCity, setTempCity] = useState('');
    const [tempWard, setTempWard] = useState('');
    const [tempDetail, setTempDetail] = useState('');

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
                isVi ? "Thiếu thông tin" : "Missing Info",
                isVi ? "Vui lòng chọn Tỉnh/Thành phố và Phường/Xã." : "Please select City/Province and Ward/Commune."
            );
            return;
        }

        let fullAddress = `${tempWard}, ${tempCity}`;
        if (tempDetail.trim()) {
            fullAddress = `${tempDetail.trim()}, ${fullAddress}`;
        }

        setLocation(fullAddress);
        setShowAddressPopup(false);
    };

    // --- HANDLERS CHO DROPDOWN KÍNH MỜ (IOS) ---
    const openDropdownPicker = (type: 'datetime') => {
        Keyboard.dismiss();
        datetimeRef.current?.measureInWindow((x, y, width, height) => {
            const dropdownWidth = 340;
            const finalX = (SCREEN_WIDTH - dropdownWidth) / 2; // Căn giữa tuyệt đối ngang

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

    // Định dạng ngày giờ tự động theo ngôn ngữ
    const formattedDate = date.toLocaleString(isVi ? 'vi-VN' : 'en-US', {
        month: '2-digit', day: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: !isVi
    }).replace(',', isVi ? ' lúc' : ' at');

    return (
        <>
            <Modal visible={isVisible} transparent animationType="fade">
                <View style={{ flex: 1 }}>
                    <TouchableWithoutFeedback onPress={onClose}>
                        <BlurView intensity={30} tint="dark" className="absolute inset-0 bg-black/50 justify-center px-6" />
                    </TouchableWithoutFeedback>

                    <View className="flex-1 justify-center px-6" pointerEvents="box-none">
                        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                                <View className="bg-white rounded-[32px] overflow-hidden p-6 relative">

                                    <View className="relative items-center justify-center mb-[30px] pt-2">
                                        <Text className="text-[20px] font-semibold text-[#1C1C1E]">
                                            {isVi ? 'Báo cáo vấn đề' : 'Report Concern'}
                                        </Text>
                                        <TouchableOpacity onPress={onClose} className="absolute right-0" style={{ padding: 4 }}>
                                            <Ionicons name="close" size={24} color="#8E8E93" />
                                        </TouchableOpacity>
                                    </View>

                                    <Text className="font-semibold mb-[15px] text-[16px]">
                                        {isVi ? 'Tại sao bạn lo lắng?' : 'Why are you concerned?'}
                                    </Text>

                                    <View className="mx-4 gap-y-3 mb-[30px]">
                                        {REPORT_OPTIONS.map((option) => {
                                            const isSelected = selectedOption === option.key;
                                            const displayLabel = isVi ? option.vi : option.en;

                                            return (
                                                <View key={option.key} className="flex-col">
                                                    <TouchableOpacity
                                                        onPress={() => setSelectedOption(option.key)}
                                                        className='flex-row items-center'
                                                    >
                                                        <View className={`w-4 h-4 rounded-[4px] border-[1px] items-center justify-center ${isSelected ? 'bg-[#F2A465] border-[#F2A465]' : 'bg-white border-[#E5E5E5]'}`}>
                                                            {isSelected && <Ionicons name="checkmark" size={12} color="white" />}
                                                        </View>
                                                        <Text className={`ml-3 text-[14px] text-black font-regular`}>
                                                            {displayLabel}
                                                        </Text>
                                                    </TouchableOpacity>

                                                    {isSelected && option.key === 'Other' && (
                                                        <TextInput
                                                            placeholder={isVi ? 'Vui lòng mô tả chi tiết vấn đề...' : 'Please specify your concern...'}
                                                            placeholderTextColor="#9CA3AF"
                                                            value={otherReason}
                                                            onChangeText={setOtherReason}
                                                            className=" ml-7 p-3 border-b border-[#E5E5E5] rounded-[10px] text-[13px] text-[#1C1C1E]"
                                                            multiline
                                                        />
                                                    )}
                                                </View>
                                            );
                                        })}
                                    </View>

                                    <Text className="font-semibold mb-[15px] text-[16px] tracking-[0.06px]">
                                        {isVi ? 'Bạn đã thấy thú cưng ở đâu?' : 'Where did you see the pet?'}
                                    </Text>

                                    <View className='mb-[20px] rounded-[16px] border border-[#E5E5E5]'>
                                        <View className='flex-row border-b border-[#E5E5E5] py-3 mx-4 items-center'>
                                            <Image source={require('../assets/icon/location-gray-icon.png')} style={{ width: 9, height: 11 }} resizeMode="cover" />
                                            <Text className="text-[13px] font-medium text-[#8E8E93] px-2">
                                                {isVi ? 'Địa điểm' : 'Location'}
                                            </Text>
                                            <TouchableOpacity onPress={() => setShowAddressPopup(true)} className="flex-1 items-end justify-center">
                                                <Text className={`font-regular text-[13px] text-right tracking-[0.06px] ${location ? 'text-[#1C1C1E]' : 'text-[#9CA3AF]'}`} numberOfLines={1}>
                                                    {location || (isVi ? "Nhấn để chọn địa chỉ..." : "Tap to select address...")}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>

                                        <View ref={datetimeRef} collapsable={false}>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    if (Platform.OS === 'ios') {
                                                        openDropdownPicker('datetime');
                                                    } else {
                                                        setTempDate(date);
                                                        setPickerMode('date');
                                                        setDatePickerVisible(true);
                                                    }
                                                }}
                                                className='flex-row border-b border-[#E5E5E5] py-3 mx-4 items-center'
                                            >
                                                <Image source={require('../assets/icon/date-time-gray-icon.png')} style={{ width: 9, height: 9 }} resizeMode="cover" />
                                                <Text className="text-[13px] font-medium text-[#8E8E93] px-2">
                                                    {isVi ? 'Ngày & Giờ' : 'Date & Time'}
                                                </Text>
                                                <Text className="flex-1 text-[13px] text-[#1C1C1E] text-right">{formattedDate}</Text>
                                            </TouchableOpacity>
                                        </View>

                                        <View className='flex-row py-3 mx-4 items-center'>
                                            <Image source={require('../assets/icon/note-gray.png')} style={{ width: 9, height: 9 }} resizeMode="cover" />
                                            <Text className="text-[13px] font-medium text-[#8E8E93] px-2">
                                                {isVi ? 'Ghi chú (tùy chọn)' : 'Note (optional)'}
                                            </Text>
                                            <TextInput
                                                placeholder={isVi ? 'Kể cho chúng tôi chuyện gì đã xảy ra' : 'Tell us what happened'}
                                                placeholderTextColor="#9CA3AF"
                                                style={{ fontFamily: "Urbanist" }}
                                                className="font-regular flex-1 text-[12px] text-[#1C1C1E] p-0 text-right tracking-[0.06px]"
                                            />
                                        </View>
                                    </View>

                                    {/* BỔ SUNG SWITCH ẨN NỘI DUNG VÀO ĐÚNG UI CỦA BẠN */}
                                    <View className="flex-row items-center justify-between mb-[20px] px-2">
                                        <View className="flex-1 mr-4">
                                            <Text className="font-semibold text-[14px] text-[#1C1C1E]">
                                                {isVi ? "Ẩn nội dung từ người này" : "Block content from this user"}
                                            </Text>
                                            <Text className="text-[12px] text-[#8E8E93] mt-0.5">
                                                {isVi ? "Bạn sẽ không còn thấy thú cưng của người dùng này nữa." : "You will no longer see pets from this owner."}
                                            </Text>
                                        </View>
                                        <Switch
                                            value={isBlockRequested}
                                            onValueChange={setIsBlockRequested}
                                            trackColor={{ false: '#E5E5E5', true: '#F2A465' }}
                                            thumbColor={'#FFFFFF'}
                                            style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
                                        />
                                    </View>

                                    <View className='w-full justify-center items-center mb-[12px]'>
                                        <TouchableOpacity
                                            onPress={handleSubmit}
                                            disabled={!selectedOption || (selectedOption === 'Other' && !otherReason.trim()) || isSubmitting}
                                            className={`w-[80%] py-3 rounded-2xl items-center justify-center ${selectedOption && (selectedOption !== 'Other' || otherReason.trim())
                                                ? 'bg-[#F2A465]'
                                                : 'bg-gray-200'
                                                }`}
                                        >
                                            <Text className="text-white font-bold text-[16px]">
                                                {isSubmitting
                                                    ? (isVi ? 'Đang gửi...' : 'Submitting...')
                                                    : (isVi ? 'Gửi báo cáo' : 'Submit Concern')
                                                }
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    <View className='items-center justify-center'>
                                        <Text className='text-center text-[#8E8E93] text-[12px] leading-5 px-8 italic'>
                                            {isVi
                                                ? 'Báo cáo sẽ được xem xét và không tự động đánh dấu thú cưng là đi lạc'
                                                : 'The report will be reviewed and does not automatically mark pet as lost'}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableWithoutFeedback>
                        </KeyboardAvoidingView>
                    </View>

                    {/* --- ADDRESS POPUP MODAL (ABSOLUTE OVERLAY) --- */}
                    {showAddressPopup && (
                        <View
                            className="absolute inset-0 bg-black/50 justify-center px-4"
                            style={{ zIndex: 9999, elevation: 9999 }}
                        >
                            <View className="bg-white rounded-[24px] p-6 shadow-2xl max-h-[85%]">
                                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                    <Text className="text-[20px] font-semibold text-black mb-2 text-center">
                                        {isVi ? 'Địa điểm phát hiện' : 'Discovery Location'}
                                    </Text>

                                    <Label text={isVi ? 'Thành phố / Tỉnh' : 'City / Province'} required />
                                    <CustomDropdown
                                        placeholder={isVi ? 'Chọn Tỉnh/Thành phố' : 'Select City/Province'}
                                        value={tempCity}
                                        options={cityOptions}
                                        onSelect={(val) => {
                                            setTempCity(val);
                                            setTempWard('');
                                        }}
                                    />

                                    <Label text={isVi ? 'Quận/Huyện & Phường/Xã' : 'District & Ward'} required />
                                    <CustomDropdown
                                        placeholder={isVi ? 'Chọn Phường/Xã' : 'Select Ward/Commune'}
                                        value={tempWard}
                                        options={wardOptions}
                                        onSelect={setTempWard}
                                    />

                                    <Label text={isVi ? 'Địa chỉ chi tiết (Tùy chọn)' : 'Detailed Address (Optional)'} />
                                    <CustomInput
                                        placeholder={isVi ? 'Số nhà, tên ngõ, tên đường...' : 'House number, street name...'}
                                        value={tempDetail}
                                        onChangeText={setTempDetail}
                                    />

                                    <View className="flex-row gap-3 mt-8 mb-4">
                                        <TouchableOpacity
                                            className="flex-1 py-4 rounded-xl border border-[#E5E5E5] items-center bg-[#F9FAFB]"
                                            onPress={() => setShowAddressPopup(false)}
                                        >
                                            <Text className="text-[#8E8E93] font-bold">
                                                {isVi ? 'Hủy bỏ' : 'Cancel'}
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            className="flex-1 py-4 rounded-xl bg-[#E89B5A] items-center shadow-sm"
                                            onPress={handleConfirmAddress}
                                        >
                                            <Text className="text-white font-bold">
                                                {isVi ? 'Xác nhận' : 'Confirm'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </ScrollView>
                            </View>
                        </View>
                    )}

                    {/* --- KÍNH MỜ DROPDOWN CĂN GIỮA VÀ MÀU CAM (IOS) --- */}
                    {Platform.OS === 'ios' && activePicker === 'datetime' && (
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
                                        <Text className="text-[16px] text-[#A1A1AA] font-medium">
                                            {isVi ? 'Hủy' : 'Cancel'}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={closeDropdownPicker}>
                                        <Text className="text-[16px] font-semibold text-[#E89B5A]">
                                            {isVi ? 'Xong' : 'Done'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={{ paddingTop: 4, paddingBottom: 4, paddingHorizontal: 10, alignItems: 'center' }} className="relative z-10">
                                    <DateTimePicker
                                        value={date}
                                        mode="datetime"
                                        display="inline"
                                        themeVariant="dark"
                                        maximumDate={new Date()}
                                        style={{ width: 320, height: 350, alignSelf: 'center' }}
                                        accentColor="#E89B5A"
                                        onChange={(event, selectedDate) => {
                                            if (selectedDate) setDate(selectedDate);
                                        }}
                                    />
                                </View>
                            </Animated.View>
                        </View>
                    )}

                    {/* --- ANDROID NATIVE DATE & TIME PICKER FLOW --- */}
                    {Platform.OS === 'android' && isDatePickerVisible && (
                        <DateTimePicker
                            value={tempDate}
                            mode={pickerMode}
                            display="default"
                            maximumDate={new Date()}
                            onChange={(event, selectedDate) => {
                                if (event.type === 'set' && selectedDate) {
                                    if (pickerMode === 'date') {
                                        setTempDate(selectedDate);
                                        setPickerMode('time'); // Đã chọn Ngày xong -> Tự chuyển sang bảng chọn Giờ
                                    } else {
                                        setDate(selectedDate); // Đã chọn Giờ xong -> Lưu và Đóng
                                        setDatePickerVisible(false);
                                        setPickerMode('date');
                                    }
                                } else {
                                    setDatePickerVisible(false);
                                    setPickerMode('date');
                                }
                            }}
                        />
                    )}

                </View>
            </Modal>

            <ReportSuccessModal
                isVisible={isSuccessVisible}
                onClose={handleSuccessClose}
                reason={selectedOption === 'Other' ? otherReason : (selectedOption || '')}
                submittedAt={submittedAt}
            />
        </>
    );
}