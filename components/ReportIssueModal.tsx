// components/ReportIssueModal.tsx
import { AntDesign, Feather, Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { Text } from './AppText';
import ReportSuccessModal from './ReportSuccessModal';

interface Props {
    isVisible: boolean;
    onClose: () => void;
}

const REPORT_OPTIONS = [
    "Seen alone multiple times without owner",
    "Appears lost or disoriented",
    "Wearing a damage/broken QR tag",
    "Seems sick or injured",
    "Signs of neglect",
    "Signs of abuse",
    "I found this tag without the pet",
    "Other",
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


export default function ReportIssueModal({ isVisible, onClose }: Props) {
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [otherReason, setOtherReason] = useState('');
    const [isSuccessVisible, setIsSuccessVisible] = useState(false);
    const [submittedAt, setSubmittedAt] = useState<Date | null>(null);
    const handleSubmit = async () => {
        try {
            // TODO: await yourApiCall(...)
            setSubmittedAt(new Date());
            
            // 1. Đóng report modal trước
            onClose();
            
            // 2. Đợi animation đóng xong (~300ms) rồi mới mở success
            setTimeout(() => {
                setIsSuccessVisible(true);
            }, 350);
        } catch (e) {
            Alert.alert('Error', 'Failed to submit report. Please try again.');
        }
    };
    const handleSuccessClose = () => {
        setIsSuccessVisible(false);
        // Reset form — KHÔNG gọi onClose() ở đây nữa vì đã gọi ở handleSubmit
        setSelectedOption(null);
        setOtherReason('');
        setLocation('');
        setDate(new Date());
    };


    // Khai báo state lưu địa chỉ sau khi gộp
    const [location, setLocation] = useState('');

    // --- STATE QUẢN LÝ NGÀY GIỜ VÀ LUỒNG (FLOW) ---
    const [date, setDate] = useState<Date>(new Date());
    const [tempDate, setTempDate] = useState<Date>(new Date());
    const [isDatePickerVisible, setDatePickerVisible] = useState(false);
    const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

    // --- ADDRESS POPUP STATE & LOGIC ---
    const [showAddressPopup, setShowAddressPopup] = useState(false);
    const [addressDataAPI, setAddressDataAPI] = useState<any[]>([]);
    const [tempCity, setTempCity] = useState('');
    const [tempDistrict, setTempDistrict] = useState('');
    const [tempWard, setTempWard] = useState('');
    const [tempDetail, setTempDetail] = useState('');

    useEffect(() => {
        // Chỉ fetch data nếu Modal đang hiển thị (tối ưu hóa)
        if (isVisible) {
            fetch('https://provinces.open-api.vn/api/?depth=3')
                .then(res => res.json())
                .then(data => setAddressDataAPI(data))
                .catch(e => console.error("Lỗi fetch địa chỉ:", e));
        }
    }, [isVisible]);

    const cityOptions = addressDataAPI.map((c: any) => c.name);
    const districtOptions = tempCity
        ? addressDataAPI.find((c: any) => c.name === tempCity)?.districts?.map((d: any) => d.name) || []
        : [];
    const wardOptions = tempDistrict
        ? addressDataAPI.find((c: any) => c.name === tempCity)?.districts?.find((d: any) => d.name === tempDistrict)?.wards?.map((w: any) => w.name) || []
        : [];

    const handleConfirmAddress = () => {
        if (!tempCity || !tempDistrict || !tempWard || !tempDetail.trim()) {
            Alert.alert("Thiếu thông tin", "Vui lòng chọn đầy đủ Tỉnh/Thành, Quận/Huyện, Phường/Xã và nhập địa chỉ chi tiết.");
            return;
        }
        const fullAddress = `${tempDetail.trim()}, ${tempWard}, ${tempDistrict}, ${tempCity}`;
        setLocation(fullAddress);
        setShowAddressPopup(false);
    };

    const openDatePicker = () => {
        setTempDate(new Date());
        setPickerMode('date');
        Keyboard.dismiss();
        setDatePickerVisible(true);
    };

    const handleNextOrDone = () => {
        if (pickerMode === 'date') {
            setPickerMode('time');
        } else {
            setDate(tempDate);
            setDatePickerVisible(false);
        }
    };

    const handleCancelOrBack = () => {
        if (pickerMode === 'time') {
            setPickerMode('date');
        } else {
            setDatePickerVisible(false);
        }
    };

    const formattedDate = date.toLocaleString('en-US', {
        month: '2-digit', day: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
    }).replace(',', ' at');

    return (
        <>
        <Modal visible={isVisible} transparent animationType="fade">
            <TouchableWithoutFeedback onPress={onClose}>
                <BlurView intensity={30} tint="dark" className="flex-1 bg-black/50 justify-center px-6">
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <View className="bg-white rounded-[32px] overflow-hidden p-6 relative">

                                <View className="relative items-center justify-center mb-[30px] pt-2">
                                    <Text className="text-[20px] font-semibold text-[#1C1C1E]">Report Concern</Text>
                                    <TouchableOpacity onPress={onClose} className="absolute right-0" style={{ padding: 4 }}>
                                        <Ionicons name="close" size={24} color="#8E8E93" />
                                    </TouchableOpacity>
                                </View>

                                <Text className="font-semibold mb-[15px] text-[16px]">
                                    Why are you concerned?
                                </Text>

                                <View className="mx-4 gap-y-3 mb-[30px]">
                                    {REPORT_OPTIONS.map((option) => {
                                        const isSelected = selectedOption === option;
                                        return (
                                            <View key={option} className="flex-col">
                                                <TouchableOpacity
                                                    onPress={() => setSelectedOption(option)}
                                                    className='flex-row items-center'
                                                >
                                                    <View className={`w-4 h-4 rounded-[4px] border-[1px] items-center justify-center ${isSelected ? 'bg-[#F2A465] border-[#F2A465]' : 'bg-white border-[#E5E5E5]'}`}>
                                                        {isSelected && <Ionicons name="checkmark" size={12} color="white" />}
                                                    </View>
                                                    <Text className={`ml-3 text-[14px] text-black font-regular`}>
                                                        {option}
                                                    </Text>
                                                </TouchableOpacity>

                                                {isSelected && option === 'Other' && (
                                                    <TextInput
                                                        placeholder="Please specify your concern..."
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

                                <Text className="font-semibold mb-[15px] text-[16px] tracking-[0.06px]">Where did you see Princess?</Text>

                                <View className='mb-[30px] rounded-[16px] border border-[#E5E5E5]'>
                                    {/* NÚT BẤM ĐỂ MỞ POPUP ĐỊA CHỈ */}
                                    <View className='flex-row border-b border-[#E5E5E5] py-3 mx-4 items-center'>
                                        <Image source={require('../assets/icon/location-gray-icon.png')} style={{ width: 9, height: 11 }} resizeMode="cover" />
                                        <Text className="text-[13px] font-medium text-[#8E8E93] px-2">Location</Text>
                                        <TouchableOpacity onPress={() => setShowAddressPopup(true)} className="flex-1 items-end justify-center">
                                            <Text className={`font-regular text-[13px] text-right tracking-[0.06px] ${location ? 'text-[#1C1C1E]' : 'text-[#9CA3AF]'}`} numberOfLines={1}>
                                                {location || "Nhấn để chọn địa chỉ..."}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Mở Date Picker */}
                                    <TouchableOpacity onPress={openDatePicker} className='flex-row border-b border-[#E5E5E5] py-3 mx-4 items-center'>
                                        <Image source={require('../assets/icon/date-time-gray-icon.png')} style={{ width: 9, height: 9 }} resizeMode="cover" />
                                        <Text className="text-[13px] font-medium text-[#8E8E93] px-2">Date & Time</Text>
                                        <Text className="flex-1 text-[13px] text-[#1C1C1E] text-right">{formattedDate}</Text>
                                    </TouchableOpacity>

                                    <View className='flex-row py-3 mx-4 items-center'>
                                        <Image source={require('../assets/icon/note-gray.png')} style={{ width: 9, height: 9 }} resizeMode="cover" />
                                        <Text className="text-[13px] font-medium text-[#8E8E93] px-2">Note (optional)</Text>
                                        <TextInput placeholder="Tell us what happened" placeholderTextColor="#9CA3AF" style={{ fontFamily: "Urbanist" }} className="font-regular flex-1 text-[12px] text-[#1C1C1E] p-0 text-right tracking-[0.06px]" />
                                    </View>
                                </View>

                                <View className='w-full justify-center items-center mb-[12px]'>
                                    <TouchableOpacity
                                        onPress={handleSubmit}
                                        disabled={!selectedOption || (selectedOption === 'Other' && !otherReason.trim())}
                                        className={`w-[80%] py-3 rounded-2xl items-center justify-center ${
                                            selectedOption && (selectedOption !== 'Other' || otherReason.trim())
                                                ? 'bg-[#F2A465]'
                                                : 'bg-gray-200'
                                        }`}
                                    >
                                        <Text className="text-white font-bold text-[16px]">Submit Concern</Text>
                                    </TouchableOpacity>
                                </View>

                                <View className='items-center justify-center'>
                                    <Text className='text-center text-[#8E8E93] text-[12px] leading-5 px-8 italic'>
                                        The report will be reviewed and does not automatically mark pet as lost
                                    </Text>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </KeyboardAvoidingView>
                </BlurView>
            </TouchableWithoutFeedback>

            {/* --- ADDRESS POPUP MODAL (ABSOLUTE OVERLAY) --- */}
            {showAddressPopup && (
                <View
                    className="absolute inset-0 bg-black/50 justify-center px-4"
                    style={{ zIndex: 9999, elevation: 9999 }}
                >
                    <View className="bg-white rounded-[24px] p-6 shadow-2xl max-h-[85%]">
                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            <Text className="text-[20px] font-semibold text-black mb-2 text-center">
                                Địa điểm phát hiện
                            </Text>

                            <Label text="Thành phố / Tỉnh" required />
                            <CustomDropdown
                                placeholder="Chọn Tỉnh/Thành phố"
                                value={tempCity}
                                options={cityOptions}
                                onSelect={(val) => {
                                    setTempCity(val);
                                    setTempDistrict('');
                                    setTempWard('');
                                }}
                            />

                            <Label text="Quận / Huyện" required />
                            <CustomDropdown
                                placeholder="Chọn Quận/Huyện"
                                value={tempDistrict}
                                options={districtOptions}
                                onSelect={(val) => {
                                    setTempDistrict(val);
                                    setTempWard('');
                                }}
                            />

                            <Label text="Phường / Xã" required />
                            <CustomDropdown
                                placeholder="Chọn Phường/Xã"
                                value={tempWard}
                                options={wardOptions}
                                onSelect={setTempWard}
                            />

                            <Label text="Địa chỉ chi tiết" required />
                            <CustomInput
                                placeholder="Số nhà, tên ngõ, tên đường..."
                                value={tempDetail}
                                onChangeText={setTempDetail}
                            />

                            <View className="flex-row gap-3 mt-8 mb-4">
                                <TouchableOpacity
                                    className="flex-1 py-4 rounded-xl border border-[#E5E5E5] items-center bg-[#F9FAFB]"
                                    onPress={() => setShowAddressPopup(false)}
                                >
                                    <Text className="text-[#8E8E93] font-bold">Hủy bỏ</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    className="flex-1 py-4 rounded-xl bg-[#E89B5A] items-center shadow-sm"
                                    onPress={handleConfirmAddress}
                                >
                                    <Text className="text-white font-bold">Xác nhận</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            )}

            {/* --- OVERLAY CHỌN NGÀY VÀ GIỜ --- */}
            {isDatePickerVisible && (
                <View className="absolute inset-0 justify-end z-50">
                    <TouchableWithoutFeedback onPress={() => setDatePickerVisible(false)}>
                        <View className="flex-1" />
                    </TouchableWithoutFeedback>

                    <View className="bg-[#F2F2F7] rounded-t-3xl pb-8 shadow-2xl">

                        {/* Dynamic Header dựa trên state pickerMode */}
                        <View className="flex-row justify-between items-center px-6 py-4 bg-white border-b border-[#E5E5E5] rounded-t-3xl">
                            <TouchableOpacity onPress={handleCancelOrBack}>
                                <Text className="text-[16px] text-[#8E8E93]">
                                    {pickerMode === 'time' ? 'Back' : 'Cancel'}
                                </Text>
                            </TouchableOpacity>

                            <Text className="text-[16px] font-bold text-[#1C1C1E]">
                                {pickerMode === 'date' ? 'Select Date' : 'Select Time'}
                            </Text>

                            <TouchableOpacity onPress={handleNextOrDone}>
                                <Text className="text-[16px] font-bold text-[#F2A465]">
                                    {pickerMode === 'date' ? 'Next' : 'Done'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View className="pt-4 items-center">
                            <DateTimePicker
                                textColor="#000000"
                                themeVariant="light"
                                value={tempDate}
                                // Prop mode sẽ tự động thay đổi giữa 'date' và 'time'
                                mode={pickerMode}
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={(_event, selectedDate) => {
                                    if (selectedDate) setTempDate(selectedDate);
                                }}
                                maximumDate={new Date()}
                            />
                        </View>
                    </View>
                </View>
            )}
           


        </Modal>
         <ReportSuccessModal
                isVisible={isSuccessVisible}
                onClose={handleSuccessClose}
                reason={selectedOption === 'Other' ? otherReason : selectedOption}
                submittedAt={submittedAt}
            />
        </>
    );
}