// components/ReportSuccessModal.tsx
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Modal, TouchableOpacity, View } from 'react-native';
import { Text } from './AppText';

interface Props {
    isVisible: boolean;
    onClose: () => void;
    reason?: string | null;
    submittedAt?: Date | null;
    // Tuỳ chọn: action phụ (VD: "Replace Now" ở ViewQrCode)
    secondaryAction?: {
        label: string;
        onPress: () => void;
    };
}

export default function ReportSuccessModal({
    isVisible,
    onClose,
    reason,
    submittedAt,
    secondaryAction,
}: Props) {
    const formattedDate = submittedAt?.toLocaleString('en-US', {
        month: '2-digit', day: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
    }).replace(',', ' at') ?? '';

    return (
        <Modal visible={isVisible} transparent animationType="fade">
            <BlurView intensity={30} tint="dark" className="flex-1 bg-black/50 justify-center px-6">
                <View className="bg-white rounded-[32px] p-6 items-center">

                    {/* Icon */}
                    <View className="w-[72px] h-[72px] rounded-full bg-orange-300 items-center justify-center mb-5">
                        <View className="w-[72px] h-[72px] rounded-full items-center justify-center">
                            <Ionicons name="checkmark" size={26} color="white" />
                        </View>
                    </View>

                    <Text className="text-[20px] font-semibold text-[#1C1C1E] mb-2">
                        Report submitted
                    </Text>
                    <Text className="text-[14px] text-[#8E8E93] text-center leading-6 mb-6 px-2">
                        Thank you for your concern. Our team will review it and follow up if needed.
                    </Text>

                    {/* Summary card — chỉ render nếu có data */}
                    {(reason || submittedAt) && (
                        <View className="w-full bg-[#F9FAFB] rounded-2xl px-4 py-3 mb-6 border border-[#E5E5E5]">
                            <Text className="text-[11px] text-[#9CA3AF] uppercase tracking-widest mb-1">
                                Report details
                            </Text>
                            {reason && (
                                <Text className="text-[13px] font-semibold text-[#1C1C1E]">
                                    {reason}
                                </Text>
                            )}
                            {submittedAt && (
                                <Text className="text-[12px] text-[#8E8E93] mt-0.5">
                                    {formattedDate}
                                </Text>
                            )}
                        </View>
                    )}

                    {/* Actions */}
                    <View className={`w-full ${secondaryAction ? 'flex-row gap-3' : ''}`}>
                        <TouchableOpacity
                            onPress={onClose}
                            className={`py-[14px] rounded-2xl items-center ${
                                secondaryAction
                                    ? 'flex-1 bg-gray-100'
                                    : 'w-full bg-[#F2A465]'
                            }`}
                        >
                            <Text className={`font-bold text-[16px] ${
                                secondaryAction ? 'text-[#8E8E93]' : 'text-white'
                            }`}>
                                Done
                            </Text>
                        </TouchableOpacity>

                        {secondaryAction && (
                            <TouchableOpacity
                                onPress={secondaryAction.onPress}
                                className="flex-1 py-[14px] rounded-2xl bg-[#F2A465] items-center"
                            >
                                <Text className="text-white font-bold text-[16px]">
                                    {secondaryAction.label}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <Text className="text-[11px] text-[#9CA3AF] text-center italic leading-5 px-6 mt-3">
                        The report will be reviewed and does not automatically mark pet as lost
                    </Text>
                </View>
            </BlurView>
        </Modal>
    );
}