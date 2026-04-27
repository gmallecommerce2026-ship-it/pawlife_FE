// components/ReportIssueModal.tsx
import React, { useState } from 'react';
import {
    Modal,
    View,
    TouchableOpacity,
    TextInput,
    TouchableWithoutFeedback,
    KeyboardAvoidingView,
    Platform,
    Image
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Text } from './AppText';
import { Ionicons, Feather } from '@expo/vector-icons';

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
    const [details, setDetails] = useState('');
    const [isConfirmed, setIsConfirmed] = useState(false);

    return (
        <Modal visible={isVisible} transparent animationType="fade">
            <TouchableWithoutFeedback onPress={onClose}>
                <BlurView intensity={30} // Độ mờ (từ 1 đến 100)
                    tint="dark" className="flex-1 bg-black/50 justify-center px-6">
                    <TouchableWithoutFeedback>
                        <View className="bg-white rounded-[32px] overflow-hidden p-6">
                            {/* Header */}
                            <View className="relative items-center justify-center mb-[30px] pt-2">
                                <Text className="text-[18px] font-bold text-[#1C1C1E]">
                                    Report concern
                                </Text>

                                <TouchableOpacity
                                    onPress={onClose}
                                    className="absolute right-0"
                                    style={{ padding: 4 }}
                                >
                                    <Ionicons name="close" size={24} color="#8E8E93" />
                                </TouchableOpacity>
                            </View>

                            <Text className="font-semibold mb-[15px] text-[16px]">
                                Why are you concernrd? <Text className="text-[#EF4444]"> *</Text>
                            </Text>

                            {/* Danh sách các option (Radio list) */}
                            <View className="mx-4 gap-y-3 mb-[30px]">
                                {REPORT_OPTIONS.map((option) => {
                                    const isSelected = selectedOption === option;
                                    return (
                                        <TouchableOpacity
                                            key={option}
                                            onPress={() => setSelectedOption(option)}
                                            className='flex-row items-center'
                                        >
                                            <View className={`w-4 h-4 rounded-[4px] border-[1px] items-center justify-center ${isSelected ? 'bg-[#F2A465] border-[#F2A465]' : 'bg-white border-[#E5E5E5]'
                                                }`}>
                                                {isSelected && <Ionicons name="checkmark" size={14} color="white" />}
                                            </View>
                                            <Text className={`ml-3 text-[14px] ${isSelected ? 'font-bold text-[#1C1C1E]' : 'text-black'}`}>
                                                {option}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <Text className="font-semibold mb-[15px] text-[16px]">
                                Where did you see Princess? <Text className="text-[#EF4444]"> *</Text>
                            </Text>

                            <View className='mb-[30px] rounded-[16px] border border-[#E5E5E5]'>

                                <View className='flex-row border-b border-[#E5E5E5] py-3 px-2 mx-2 items-center'>
                                    <Image
                                        source={require('../assets/icon/location-gray-icon.png')}
                                        style={{ width: 9, height: 11 }}
                                        resizeMode="cover"
                                    />
                                    <Text className="text-[13px] font-medium text-[#8E8E93] px-1">Location</Text>
                                    <TextInput
                                        placeholder="123 Happy Land District, City"
                                        placeholderTextColor="#9CA3AF"
                                        className="flex-1 text-[13px] text-[#1C1C1E] p-0 text-right"
                                    />
                                </View>
                                <View className='flex-row border-b border-[#E5E5E5] py-3 px-2 mx-2 items-center'>
                                    <Image
                                        source={require('../assets/icon/date-time-gray-icon.png')}
                                        style={{ width: 9, height: 9 }}
                                        resizeMode="cover"
                                    />
                                    <Text className="text-[13px] font-medium text-[#8E8E93] px-1">Date & Time</Text>
                                    <TextInput
                                        placeholder="01/01/2026 at 12:00 AM"
                                        placeholderTextColor="#9CA3AF"
                                        className="flex-1 text-[13px] text-[#1C1C1E] p-0 text-right"
                                    />
                                </View>
                                <View className='flex-row py-3 px-2 mx-2 items-center'>
                                    <Image
                                        source={require('../assets/icon/note-gray.png')}
                                        style={{ width: 9, height: 9 }}
                                        resizeMode="cover"
                                    />
                                    <Text className="text-[13px] font-medium text-[#8E8E93] px-1">Note (optional)</Text>
                                    <TextInput
                                        placeholder="123 Oak St, Ha Noi, Vietnam"
                                        placeholderTextColor="#9CA3AF"
                                        className="flex-1 text-[13px] text-[#1C1C1E] p-0 text-right"
                                    />
                                </View>
                            </View>

                            {/* Nút Submit */}
                            <View className='w-full justify-center items-center mb-[12px]'>
                                <TouchableOpacity
                                    disabled={!selectedOption || !isConfirmed}
                                    className={`w-[80%] py-3 rounded-2xl items-center justify-center ${selectedOption ? 'bg-[#F2A465]' : 'bg-gray-200'
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
                </BlurView>
            </TouchableWithoutFeedback>
        </Modal>
    );
}