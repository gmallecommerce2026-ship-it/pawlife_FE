import axiosClient from '@/api/axiosClient';
import { Text } from '@/components/AppText';
import { AuthContext } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIncomingTransferListener } from '@/hooks/useIncomingTransferListener';
import { useLocalizedData } from '@/hooks/useLocalizedData';
import { authService } from '@/services/authService';
import { Feather } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, TouchableOpacity, View } from 'react-native';
import ReportIssueModal, { ReportSubmitData } from './ReportIssueModal';

const defaultPetImage = 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&q=80';

export default function IncomingTransferModal() {
    const router = useRouter();
    const pathname = usePathname();

    const { isAuthenticated } = useContext(AuthContext);
    const { language } = useLanguage();
    const isVi = language === 'vi';
    const { l } = useLocalizedData();

    const { incomingRequest, dismiss, refetchPending } = useIncomingTransferListener(isAuthenticated);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isReportModalVisible, setIsReportModalVisible] = useState(false);
    const [showPostDeclinePrompt, setShowPostDeclinePrompt] = useState(false);
    const [showTransferSuccessPrompt, setShowTransferSuccessPrompt] = useState(false); // ✅ MỚI
    const [localRequest, setLocalRequest] = useState<typeof incomingRequest | null>(null);



    // 🆕 Đánh dấu report đã submit thành công, đang chờ ReportSuccessModal hiển thị & user đóng nó
    const [isReportSubmitted, setIsReportSubmitted] = useState(false);

    const trackedTransferIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (!incomingRequest) return;

        const isGenuinelyNewRequest = incomingRequest.transferId !== trackedTransferIdRef.current;

        if (isGenuinelyNewRequest) {
            setShowPostDeclinePrompt(false);
            setIsReportModalVisible(false);
            setIsReportSubmitted(false);
            setLocalRequest(incomingRequest);
            trackedTransferIdRef.current = incomingRequest.transferId;
        } else if (!showPostDeclinePrompt) {
            setLocalRequest(incomingRequest);
        }
    }, [incomingRequest?.transferId]);

    const activeRequest = (showPostDeclinePrompt || isReportSubmitted || showTransferSuccessPrompt)
        ? localRequest
        : (incomingRequest || localRequest);

    const isAlreadyOnThatScreen =
        pathname?.includes('transfer-ownership') &&
        pathname?.includes(activeRequest?.petId || '__none__');

    if (!activeRequest || (isAlreadyOnThatScreen && !showPostDeclinePrompt && !isReportSubmitted && !showTransferSuccessPrompt)) return null;

    const { transferId, petId, pet, senderName } = activeRequest;
    const petName = pet?.name || (isVi ? 'thú cưng' : 'this pet');

    const getAge = (dob?: string) => {
        if (!dob) return isVi ? 'Không rõ tuổi' : 'Unknown age';
        const birthDate = new Date(dob);
        const years = Math.abs(new Date(Date.now() - birthDate.getTime()).getUTCFullYear() - 1970);
        return years > 0 ? `${years} ${isVi ? 'tuổi' : 'years'}` : (isVi ? 'Dưới 1 tuổi' : 'Under 1 year');
    };

    const resetFlowState = () => {
        setShowPostDeclinePrompt(false);
        setShowTransferSuccessPrompt(false);
        setIsReportModalVisible(false);
        setIsReportSubmitted(false);
        setLocalRequest(null);
        trackedTransferIdRef.current = null;
    };

    const handleViewDetails = () => {
        resetFlowState();
        dismiss();
        router.push(`/transfer-ownership?petId=${petId}`);
    };

    const handleConfirmNow = async () => {
        setIsSubmitting(true);
        try {
            await axiosClient.post(`/pets/transfer-confirm/${transferId}`);
            // ✅ Giữ data lại để render success card, KHÔNG dismiss/reset/navigate ngay
            setLocalRequest(activeRequest);
            setShowTransferSuccessPrompt(true);
        } catch (error: any) {
            await refetchPending();
        } finally {
            setIsSubmitting(false);
        }
    };
    const handleViewProfileAfterTransfer = () => {
        const targetPetId = petId;
        const targetPetName = pet?.name;
        const targetImage = pet?.avatarUrl || pet?.images?.[0]?.url;
        const targetBreed = pet?.breed;

        resetFlowState();
        dismiss();

        router.push({
            pathname: '/pet-profile-detail',
            params: {
                id: targetPetId,
                name: targetPetName,
                image: targetImage,
                breed: targetBreed,
            },
        });
    };


    const handleDeclineNow = async () => {
        setIsSubmitting(true);
        try {
            await axiosClient.post(`/pets/${petId}/cancel-transfer`);
            setLocalRequest(activeRequest);
            setShowPostDeclinePrompt(true);
        } catch (error: any) {
            const msg = error?.response?.data?.message;
            Alert.alert(
                isVi ? 'Lỗi' : 'Error',
                msg || (isVi ? 'Yêu cầu này có thể đã được xử lý trước đó.' : 'This request may have already been processed.')
            );
            resetFlowState();
            dismiss();
            await refetchPending();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSkipPostDecline = () => {
        resetFlowState();
        dismiss();
    };

    // 🆕 SỬA: chỉ gọi API report, KHÔNG dismiss/reset ở đây nữa
    // Để ReportIssueModal tự đóng nó (onClose) rồi tự mở ReportSuccessModal theo timing nội bộ của nó
    const handleSubmitReport = async (data: ReportSubmitData) => {
        if (!pet?.ownerId) return;

        await authService.reportUser(pet.ownerId, {
            reason: data.reason,
            detail: data.details,
            isBlockRequested: data.isBlockRequested,
        });

        // Đánh dấu đã submit xong -> giữ activeRequest sống cho tới khi
        // ReportSuccessModal (bên trong ReportIssueModal) tự đóng.
        setIsReportSubmitted(true);
        // ❌ KHÔNG gọi setIsReportModalVisible(false) ở đây nữa.
    };


    // 🆕 Được gọi khi ReportSuccessModal đã đóng (user bấm Done/Close trên success modal)
    const handleReportFlowFinished = async () => {
        resetFlowState();
        dismiss();
        await refetchPending();
    };

    return (
        <>
            <Modal
                visible={!isReportModalVisible && !isReportSubmitted}
                transparent
                animationType="fade"
                statusBarTranslucent
            >
                <View className="flex-1 justify-center items-center bg-black/50 px-9">
                    <View
                        className="w-full bg-white rounded-[14px] items-center"
                        style={{
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.1,
                            shadowRadius: 12,
                            elevation: 5,
                        }}
                    >
                        {showTransferSuccessPrompt ? (
                            // ✅ MỚI — layout y hệt card yêu cầu ban đầu, chỉ đổi title/button
                            <>
                                <View className="flex-row w-full items-center justify-center mb-[6px] relative mt-[21px]">
                                    <Text className="text-[16px] font-semibold text-gray-900 tracking-tight text-center">
                                        {isVi ? 'Chuyển nhượng thành công' : 'Transfer Completed'}
                                    </Text>
                                </View>

                                <View className="w-full bg-white rounded-[24px] items-center px-[51px]">
                                    <Text className="text-[12px] font-regular text-[#8E8E93] text-center tracking-[-0.08px] mb-[23px]">
                                        {isVi
                                            ? `${senderName || 'Chủ cũ'} đã chuyển nhượng ${petName} cho bạn.`
                                            : `${senderName || 'The previous owner'} has transferred ${petName} to you.`}
                                    </Text>

                                    <View className="w-[104px] h-[104px] rounded-full justify-center items-center mb-[9px]">
                                        <Image
                                            source={{ uri: pet?.avatarUrl || pet?.images?.[0]?.url || defaultPetImage }}
                                            className="w-[104px] h-[104px] rounded-full"
                                        />
                                    </View>

                                    <Text className="text-[16px] font-semibold text-gray-900 mb-[9px] text-center">
                                        {petName}
                                    </Text>

                                    <Text className="text-[12px] font-regular text-[#8E8E93] tracking-[0.5px] mb-[14px]">
                                        {getAge(pet?.dob)} · {l(pet?.breed) || (isVi ? 'Chưa rõ giống' : 'Unknown breed')}
                                    </Text>

                                    {/* ✅ 1 nút duy nhất thay cho Confirm/Decline */}
                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        onPress={handleViewProfileAfterTransfer}
                                        className="bg-[#E89B5A] flex-row w-full h-[48px] rounded-full justify-center items-center mb-2"
                                    >
                                        <Text className="text-[14px] font-semibold text-white">
                                            {isVi ? `Xem hồ sơ của ${petName}` : `View ${petName} Profile`}
                                        </Text>
                                    </TouchableOpacity>

                                    <Text className="text-[10px] text-[#8E8E93] italic text-center mb-[21px] mt-[21px] px-2">
                                        {isVi
                                            ? 'Giao dịch này sẽ được ghi vào PawHistory sau 3 ngày.'
                                            : 'This transfer will be recorded in PawHistory in 3 days.'}
                                    </Text>
                                </View>
                            </>
                        ) : !showPostDeclinePrompt ? (
                            <>
                                <View className="flex-row w-full items-center justify-center mb-[6px] relative mt-[21px]">
                                    <Text className="text-[16px] font-semibold text-gray-900 tracking-tight text-center">
                                        {isVi ? 'Yêu cầu chuyển nhượng' : 'Transfer Request'}
                                    </Text>
                                </View>

                                <View className="w-full bg-white rounded-[24px] items-center px-[51px]">
                                    <Text className="text-[12px] font-regular text-[#8E8E93] text-center tracking-[-0.08px] mb-[23px]">
                                        {isVi
                                            ? `${senderName || 'Chủ hiện tại'} muốn chuyển nhượng ${petName} cho bạn.`
                                            : `${senderName || 'The current owner'} wants to transfer ${petName} to you.`}
                                    </Text>

                                    <View className="w-[104px] h-[104px] rounded-full justify-center items-center mb-[9px]">
                                        <Image
                                            source={{ uri: pet?.avatarUrl || pet?.images?.[0]?.url || defaultPetImage }}
                                            className="w-[104px] h-[104px] rounded-full"
                                        />
                                    </View>

                                    <Text className="text-[16px] font-semibold text-gray-900 mb-[9px] text-center">
                                        {petName}
                                    </Text>

                                    <Text className="text-[12px] font-regular text-[#8E8E93] tracking-[0.5px] mb-[14px]">
                                        {getAge(pet?.dob)} · {l(pet?.breed) || (isVi ? 'Chưa rõ giống' : 'Unknown breed')}
                                    </Text>

                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        onPress={handleConfirmNow}
                                        disabled={isSubmitting}
                                        className="bg-[#E89B5A] flex-row w-full h-[48px] rounded-full justify-center items-center mb-2"
                                    >
                                        {isSubmitting ? (
                                            <ActivityIndicator color="white" />
                                        ) : (
                                            <Text className="text-[14px] font-semibold text-white">
                                                {isVi ? 'Xác nhận ngay' : 'Confirm Now'}
                                            </Text>
                                        )}
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        onPress={handleDeclineNow}
                                        disabled={isSubmitting}
                                        className="bg-white border border-[#E5E5E5] flex-row w-full h-[48px] rounded-full justify-center items-center mb-2"
                                    >
                                        {isSubmitting ? (
                                            <ActivityIndicator color="#8E8E93" />
                                        ) : (
                                            <Text className="text-[14px] font-medium text-[#8E8E93]">
                                                {isVi ? 'Từ chối' : 'Decline'}
                                            </Text>
                                        )}
                                    </TouchableOpacity>

                                    <Text className="text-[10px] text-[#8E8E93] italic text-center mb-[21px] mt-[21px] px-2">
                                        {isVi
                                            ? 'Giao dịch này sẽ được ghi vào PawHistory sau 3 ngày.'
                                            : 'This transfer will be recorded in PawHistory in 3 days.'}
                                    </Text>
                                </View>
                            </>
                        ) : (
                            <View className="w-full bg-white rounded-[24px] items-center px-[51px] pt-[21px] pb-[21px]">
                                <View className="w-[56px] h-[56px] rounded-full bg-orange-50 items-center justify-center mb-[16px] border border-orange-100">
                                    <Feather name="alert-triangle" size={24} color="#E89B5A" />
                                </View>

                                <Text className="text-[14px] font-semibold text-gray-900 mb-[8px] text-center">
                                    {isVi ? 'Có gì đó bất thường?' : 'Was something unusual?'}
                                </Text>

                                <Text className="text-[12px] font-regular text-[#8E8E93] text-center tracking-[-0.08px] mb-[24px] leading-5">
                                    {isVi
                                        ? `Bạn muốn báo cáo người dùng này (${senderName || 'chủ hiện tại'})?`
                                        : `Would you like to report this user (${senderName || 'the current owner'})?`}
                                </Text>

                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={() => setIsReportModalVisible(true)}
                                    className="bg-[#E89B5A] flex-row w-full h-[48px] rounded-full justify-center items-center mb-2"
                                >
                                    <Text className="text-[14px] font-semibold text-white">
                                        {isVi ? 'Báo cáo người này' : 'Report this user'}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={handleSkipPostDecline}
                                    className="bg-white border border-[#E5E5E5] flex-row w-full h-[48px] rounded-full justify-center items-center"
                                >
                                    <Text className="text-[14px] font-medium text-[#8E8E93]">
                                        {isVi ? 'Bỏ qua' : 'Skip'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            <ReportIssueModal
                isVisible={isReportModalVisible}
                onClose={() => setIsReportModalVisible(false)}
                onSubmit={handleSubmitReport}
                onSuccessModalClose={handleReportFlowFinished} // 🆕 dọn dẹp + dismiss chỉ khi success modal đóng
                context="transfer"
                targetName={senderName}
            />
        </>
    );
}