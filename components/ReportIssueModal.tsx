// components/ReportIssueModal.tsx
import React, { useState } from 'react';
import {
    Modal,
    View,
    TouchableOpacity,
    TextInput,
    TouchableWithoutFeedback,
    Image,
    Platform,
    KeyboardAvoidingView,
    Keyboard
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Text } from './AppText';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

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

export default function ReportIssueModal({ isVisible, onClose }: Props) {
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [otherReason, setOtherReason] = useState('');

    // --- STATE QUẢN LÝ NGÀY GIỜ VÀ LUỒNG (FLOW) ---
    const [date, setDate] = useState<Date>(new Date());
    const [tempDate, setTempDate] = useState<Date>(new Date());
    const [isDatePickerVisible, setDatePickerVisible] = useState(false);

    // Thêm state quản lý bước: 'date' (Ngày) -> 'time' (Giờ)
    const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

    const openDatePicker = () => {
        setTempDate(new Date());
        setPickerMode('date'); // Luôn bắt đầu từ bước chọn ngày
        Keyboard.dismiss();
        setDatePickerVisible(true);
    };

    // Hàm xử lý nút bên phải (Next / Done)
    const handleNextOrDone = () => {
        if (pickerMode === 'date') {
            // Đang ở chọn ngày -> chuyển sang chọn giờ
            setPickerMode('time');
        } else {
            // Đang ở chọn giờ -> xác nhận toàn bộ và đóng
            setDate(tempDate);
            setDatePickerVisible(false);
        }
    };

    // Hàm xử lý nút bên trái (Cancel / Back)
    const handleCancelOrBack = () => {
        if (pickerMode === 'time') {
            // Đang ở chọn giờ -> quay lại chọn ngày
            setPickerMode('date');
        } else {
            // Đang ở chọn ngày -> hủy bỏ
            setDatePickerVisible(false);
        }
    };

    const formattedDate = date.toLocaleString('en-US', {
        month: '2-digit', day: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
    }).replace(',', ' at');

    return (
        <Modal visible={isVisible} transparent animationType="fade">
            <TouchableWithoutFeedback onPress={onClose}>
                <BlurView intensity={30} tint="dark" className="flex-1 bg-black/50 justify-center px-6">
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <View className="bg-white rounded-[32px] overflow-hidden p-6 relative">

                                <View className="relative items-center justify-center mb-[30px] pt-2">
                                    <Text className="text-[18px] font-bold text-[#1C1C1E]">Report concern</Text>
                                    <TouchableOpacity onPress={onClose} className="absolute right-0" style={{ padding: 4 }}>
                                        <Ionicons name="close" size={24} color="#8E8E93" />
                                    </TouchableOpacity>
                                </View>

                                <Text className="font-semibold mb-[15px] text-[16px]">
                                    Why are you concerned? <Text className="text-[#EF4444]"> *</Text>
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
                                                    <Text className={`ml-3 text-[14px] ${isSelected ? 'font-bold text-[#1C1C1E]' : 'text-black font-regular'}`}>
                                                        {option}
                                                    </Text>
                                                </TouchableOpacity>

                                                {/* Conditional Rendering: Chỉ hiện Input khi option là 'Other' và đang được chọn */}
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

                                <Text className="font-semibold mb-[15px] text-[16px]">Where did you see Princess?</Text>

                                <View className='mb-[30px] rounded-[16px] border border-[#E5E5E5]'>
                                    <View className='flex-row border-b border-[#E5E5E5] py-3 px-2 mx-2 items-center'>
                                        <Image source={require('../assets/icon/location-gray-icon.png')} style={{ width: 9, height: 11 }} resizeMode="cover" />
                                        <Text className="text-[13px] font-medium text-[#8E8E93] px-1">Location</Text>
                                        <TextInput placeholder="123 Street, District, City" placeholderTextColor="#9CA3AF" className="flex-1 text-[13px] text-[#1C1C1E] p-0 text-right" />
                                    </View>

                                    {/* Mở Date Picker */}
                                    <TouchableOpacity onPress={openDatePicker} className='flex-row border-b border-[#E5E5E5] py-3 px-2 mx-2 items-center'>
                                        <Image source={require('../assets/icon/date-time-gray-icon.png')} style={{ width: 9, height: 9 }} resizeMode="cover" />
                                        <Text className="text-[13px] font-medium text-[#8E8E93] px-1">Date & Time</Text>
                                        <Text className="flex-1 text-[13px] text-[#1C1C1E] text-right">{formattedDate}</Text>
                                    </TouchableOpacity>

                                    <View className='flex-row py-3 px-2 mx-2 items-center'>
                                        <Image source={require('../assets/icon/note-gray.png')} style={{ width: 9, height: 9 }} resizeMode="cover" />
                                        <Text className="text-[13px] font-medium text-[#8E8E93] px-1">Note (optional)</Text>
                                        <TextInput placeholder="Tell us what happened" placeholderTextColor="#9CA3AF" className="flex-1 text-[13px] text-[#1C1C1E] p-0 text-right" />
                                    </View>
                                </View>

                                <View className='w-full justify-center items-center mb-[12px]'>
                                    <TouchableOpacity
                                        // Nút sẽ bị disable nếu: Chưa chọn option HOẶC (Chọn Other nhưng chưa nhập text) HOẶC chưa confirm
                                        disabled={!selectedOption || (selectedOption === 'Other' && !otherReason.trim()) || !isConfirmed}
                                        className={`w-[80%] py-3 rounded-2xl items-center justify-center ${selectedOption && (selectedOption !== 'Other' || otherReason.trim() !== '') ? 'bg-[#F2A465]' : 'bg-gray-200'
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
    );
}