import { useLanguage } from '@/contexts/LanguageContext'; // Đảm bảo import đúng đường dẫn
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useState } from 'react';
import {
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import ReportSuccessModal from './ReportSuccessModal';

interface Props {
    isVisible: boolean;
    onClose: () => void;
    reportTargetName?: string;
}

const UGC_REPORT_OPTIONS_EN = [
    "Spam, advertising, or scams",
    "Harassment, threats, or hate speech",
    "Sensitive or inappropriate content",
    "Intentionally reporting fake locations (Fake sighting)",
    "Unreasonable demands for pet ransom",
    "Other reasons",
];

const UGC_REPORT_OPTIONS_VI = [
    "Spam, quảng cáo, hoặc lừa đảo",
    "Quấy rối, đe dọa, hoặc phát ngôn thù ghét",
    "Nội dung nhạy cảm hoặc không phù hợp",
    "Cố ý báo cáo địa điểm giả (Fake sighting)",
    "Yêu cầu tiền chuộc thú cưng vô lý",
    "Lý do khác",
];

export default function ReportUGCModal({ isVisible, onClose, reportTargetName = "this user" }: Props) {
    const { language } = useLanguage();
    const isVi = language === 'vi';
    
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [otherReason, setOtherReason] = useState('');
    const [isSuccessVisible, setIsSuccessVisible] = useState(false);
    const [submittedAt, setSubmittedAt] = useState<Date | null>(null);

    const UGC_REPORT_OPTIONS = isVi ? UGC_REPORT_OPTIONS_VI : UGC_REPORT_OPTIONS_EN;

    const handleSubmit = async () => {
        try {
            // TODO: Tích hợp API gửi report ở đây
            setSubmittedAt(new Date());
            onClose();
            
            setTimeout(() => {
                setIsSuccessVisible(true);
            }, 350);
        } catch (e) {
            Alert.alert(
                isVi ? 'Lỗi' : 'Error', 
                isVi ? 'Không thể gửi báo cáo. Vui lòng thử lại sau.' : 'Unable to send report. Please try again later.'
            );
        }
    };

    const handleSuccessClose = () => {
        setIsSuccessVisible(false);
        setSelectedOption(null);
        setOtherReason('');
    };

    return (
        <>
            <Modal visible={isVisible} transparent animationType="fade">
                <TouchableWithoutFeedback onPress={onClose}>
                    <BlurView intensity={30} tint="dark" className="flex-1 bg-black/50 justify-center px-6">
                        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                                <View className="bg-white rounded-[32px] overflow-hidden p-6 relative">
                                    
                                    {/* Header */}
                                    <View className="relative items-center justify-center mb-[20px] pt-2">
                                        <Text className="text-[20px] font-semibold text-[#1C1C1E]">
                                            {isVi ? 'Báo cáo' : 'Report'}
                                        </Text>
                                        <TouchableOpacity onPress={onClose} className="absolute right-0" style={{ padding: 4 }}>
                                            <Ionicons name="close" size={24} color="#8E8E93" />
                                        </TouchableOpacity>
                                    </View>

                                    <Text className="font-regular text-[#757575] text-center mb-[25px] text-[14px]">
                                        {isVi 
                                            ? `Tại sao bạn muốn báo cáo tin nhắn/hành động của ${reportTargetName}?` 
                                            : `Why do you want to report the messages/actions of ${reportTargetName}?`}
                                    </Text>

                                    {/* Danh sách lý do */}
                                    <View className="mx-2 gap-y-3 mb-[30px]">
                                        {UGC_REPORT_OPTIONS.map((option) => {
                                            const isSelected = selectedOption === option;
                                            return (
                                                <View key={option} className="flex-col">
                                                    <TouchableOpacity
                                                        onPress={() => setSelectedOption(option)}
                                                        className='flex-row items-center py-1'
                                                    >
                                                        <View className={`w-4 h-4 rounded-[4px] border-[1px] items-center justify-center ${isSelected ? 'bg-[#F2A465] border-[#F2A465]' : 'bg-white border-[#E5E5E5]'}`}>
                                                            {isSelected && <Ionicons name="checkmark" size={12} color="white" />}
                                                        </View>
                                                        <Text className={`ml-3 text-[14px] text-black font-regular flex-1`}>
                                                            {option}
                                                        </Text>
                                                    </TouchableOpacity>

                                                    {isSelected && (option === 'Other reasons' || option === 'Lý do khác') && (
                                                        <TextInput
                                                            placeholder={isVi ? "Vui lòng mô tả chi tiết vấn đề..." : "Please describe the issue in detail..."}
                                                            placeholderTextColor="#9CA3AF"
                                                            value={otherReason}
                                                            onChangeText={setOtherReason}
                                                            className="ml-7 mt-2 p-3 border border-[#E5E5E5] rounded-[12px] text-[13px] text-[#1C1C1E] bg-[#FAFAFA]"
                                                            multiline
                                                            numberOfLines={3}
                                                            style={{ minHeight: 80, textAlignVertical: 'top' }}
                                                        />
                                                    )}
                                                </View>
                                            );
                                        })}
                                    </View>

                                    {/* Submit Button */}
                                    <View className='w-full justify-center items-center mb-[12px]'>
                                        <TouchableOpacity
                                            onPress={handleSubmit}
                                            disabled={!selectedOption || ((selectedOption === 'Other reasons' || selectedOption === 'Lý do khác') && !otherReason.trim())}
                                            className={`w-[80%] py-3.5 rounded-[16px] items-center justify-center ${
                                                selectedOption && ((selectedOption !== 'Other reasons' && selectedOption !== 'Lý do khác') || otherReason.trim())
                                                    ? 'bg-[#E89B5A]'
                                                    : 'bg-gray-200'
                                            }`}
                                        >
                                            <Text className="text-white font-bold text-[16px]">
                                                {isVi ? 'Gửi báo cáo' : 'Submit Report'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    <View className='items-center justify-center'>
                                        <Text className='text-center text-[#8E8E93] text-[12px] leading-5 px-4 italic'>
                                            {isVi 
                                                ? 'Đội ngũ kiểm duyệt sẽ xem xét báo cáo này một cách bảo mật để bảo vệ bạn và cộng đồng.' 
                                                : 'Our moderation team will review this report confidentially to protect you and the community.'}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableWithoutFeedback>
                        </KeyboardAvoidingView>
                    </BlurView>
                </TouchableWithoutFeedback>
            </Modal>

            <ReportSuccessModal
                isVisible={isSuccessVisible}
                onClose={handleSuccessClose}
                reason={selectedOption}
                submittedAt={submittedAt}
            />
        </>
    );
}