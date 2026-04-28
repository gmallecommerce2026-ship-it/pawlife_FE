import axiosClient from '@/api/axiosClient';
import { Text } from '@/components/AppText';
import { socket } from '@/utils/socket';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, TextInput, TouchableOpacity, View } from 'react-native';

export default function TransferOwnershipScreen() {
  const router = useRouter();
  const { petId } = useLocalSearchParams<{ petId: string }>(); 
  
  const [contactValue, setContactValue] = useState('');
  
  const [petInfo, setPetInfo] = useState<any>(null);
  const [ownerInfo, setOwnerInfo] = useState<any>(null);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [transferRole, setTransferRole] = useState<'none' | 'sender' | 'receiver'>('none');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isTransferUnsuccessful, setIsTransferUnsuccessful] = useState(false);

  // 1. TÁCH HÀM FETCH DATA RA NGOÀI ĐỂ TÁI SỬ DỤNG
  const fetchPetDetails = useCallback(async () => {
    try {
      const userRes = await axiosClient.get('/auth/me'); 
      const myUserId = userRes.data.id;
      setCurrentUserId(myUserId);

      const response = await axiosClient.get(`/pets/${petId}`);
      const data = response.data;
      
      setPetInfo(data);
      setOwnerInfo(data.owner);
      
      if (data.transferStatus === 'PENDING') {
          if (data.receiverId === myUserId) {
              setTransferRole('receiver');
          } else if (data.senderId === myUserId || data.ownerId === myUserId) {
              setTransferRole('sender');
              setContactValue(data.pendingContact || '');
          }
          setIsTransferUnsuccessful(false);
      } else if (data.transferStatus === 'REJECTED' || data.transferStatus === 'CANCELED') {
          if (data.senderId === myUserId || data.ownerId === myUserId) setTransferRole('sender');
          if (data.receiverId === myUserId) setTransferRole('receiver');
          setIsTransferUnsuccessful(true);
      } else {
          setTransferRole('none');
          setIsTransferUnsuccessful(false);
      }
    } catch (error: any) {
      console.error("Lỗi tải thông tin:", error);
      Alert.alert('Lỗi', 'Không thể tải thông tin thú cưng');
    } finally {
      setIsFetchingData(false);
    }
  }, [petId]);

  useEffect(() => {
    if (!petId) {
      Alert.alert('Lỗi', 'Không tìm thấy ID Thú cưng!');
      router.back();
      return;
    }
    fetchPetDetails();
  }, [fetchPetDetails, petId]);

  // THÊM MỚI: Lắng nghe thêm sự kiện transfer_cancelled từ socket
  useEffect(() => {
    const handleTransferComplete = (data: { petId: string }) => {
      if (data.petId === petId) {
        router.push({
          pathname: '/(tabs)/my-pets',
          params: { showTransferComplete: 'true', transferredPetId: petId }
        });
      }
    };

    const handleTransferCancelled = (data: { petId: string }) => {
      if (data.petId === petId) setIsTransferUnsuccessful(true);
    };

    socket.on('transfer_completed', handleTransferComplete);
    socket.on('transfer_cancelled', handleTransferCancelled);

    return () => {
      socket.off('transfer_completed', handleTransferComplete);
      socket.off('transfer_cancelled', handleTransferCancelled);
    };
  }, [petId]);

  const handleSendConfirmation = async () => {
    const inputValue = contactValue.trim();
    if (!inputValue) {
      Alert.alert('Lỗi', 'Vui lòng nhập Email hoặc Số điện thoại của người nhận!');
      return;
    }

    // Regex cơ bản để check xem chuỗi có phải là email không (chứa ký tự @)
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputValue);
    
    // Tạo payload động tùy thuộc vào kiểu dữ liệu
    const payload = isEmail ? { email: inputValue } : { phone: inputValue };

    setIsSubmitting(true);
    try {
      await axiosClient.post(`/pets/${petId}/transfer-request`, payload);
      await fetchPetDetails(); // Cập nhật lại thông tin sau khi request thành công
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không tìm thấy người dùng hoặc có lỗi xảy ra.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelTransfer = async () => {
    const title = transferRole === 'receiver' ? "Decline Request" : "Cancel Request";
    const msg = transferRole === 'receiver' 
        ? "Bạn có chắc chắn muốn từ chối nhận bé thú cưng này không?" 
        : "Bạn có chắc chắn muốn hủy yêu cầu chuyển nhượng này không?";

    Alert.alert(title, msg, [
        { text: "Không", style: "cancel" },
        { 
          text: "Có", 
          style: "destructive",
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await axiosClient.post(`/pets/${petId}/cancel-transfer`);
              // THAY ĐỔI: Không setTransferRole('none') và không router.back()
              // Chuyển UI sang trạng thái Unsuccessful
              setIsTransferUnsuccessful(true);
            } catch (error: any) {
              Alert.alert('Lỗi', error.response?.data?.message || 'Không thể hủy yêu cầu lúc này.');
            } finally {
              setIsSubmitting(false);
            }
          }
        }
    ]);
  };

  const handleConfirmTransfer = async () => {
    setIsSubmitting(true);
    try {
      await axiosClient.post(`/pets/transfer-confirm/${petInfo.transferRequestId}`);
      setIsSubmitting(false);
      router.push({
        pathname: '/(tabs)/my-pets',
        params: { showTransferComplete: 'true', transferredPetId: petId }
      });
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể xác nhận chuyển nhượng lúc này.');
      setIsSubmitting(false);
    }
  };

  const handleBackNavigation = () => {
    if (transferRole === 'sender') {
      router.back(); // Trở về Pet Profile
    } else {
      router.replace('/(tabs)'); // Trở về Home Screen
    }
  };

  const getAge = (dob?: string) => {
    if (!dob) return 'Unknown age';
    const birthDate = new Date(dob);
    const difference = Date.now() - birthDate.getTime();
    const years = Math.abs(new Date(difference).getUTCFullYear() - 1970);
    return years > 0 ? `${years} years` : 'Under 1 year';
  };

  if (isFetchingData) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#FEA766" />
        <Text className="mt-2 text-[#8E8E93]">Đang tải thông tin...</Text>
      </View>
    );
  }

  const defaultPetImage = 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&q=80';
  const defaultAvatar = 'https://i.pravatar.cc/150';
  const receiverName = petInfo?.receiver?.name || contactValue || 'New Owner';

  return (
    <ScrollView 
      contentContainerStyle={{ alignItems: 'center', paddingTop: 60, backgroundColor: '#FFFFFF', paddingBottom: 40, paddingHorizontal: 20 }}
      showsVerticalScrollIndicator={false}
      className="flex-1 bg-white"
    >
      {/* Header */}
      <View className="flex-row items-center w-full mb-6">
        <TouchableOpacity className="p-2 -ml-2" onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="black" />
        </TouchableOpacity>
        <Text className="flex-1 text-[20px] font-semibold text-center mr-8 text-black">
          Transfer Ownership
        </Text>
      </View>

      {/* Pet Info Card (Giữ nguyên) */}
      <LinearGradient
        colors={['rgba(251,240,246,0.6)', 'rgba(249,236,243,1)', 'rgba(248,232,241,1)']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        className="flex-row items-center w-full h-[92px] px-[14px] rounded-[16px] mb-[24px]"
      >
        <View className='flex-row w-full p-[14px] rounded-[16px]'>
            <Image source={{ uri: petInfo?.avatarUrl || defaultPetImage }} className="w-[64px] h-[64px] rounded-[12px]" />
            <View className="flex-1 flex-col justify-center ml-[12px] h-[64px]">
              <Text className="text-[16px] font-semibold text-black" numberOfLines={1}>{petInfo?.name || 'Unknown Name'}</Text>
              <Text className="text-[12px] font-normal text-[#8E8E93] mt-[6px]">{getAge(petInfo?.dob)} • {petInfo?.breed || 'Unknown Breed'}</Text>
              <Text className="text-[12px] font-normal text-[#8E8E93] mt-[2px]">ID: {petInfo?.id?.substring(0, 8).toUpperCase()}</Text>
            </View>
        </View>
      </LinearGradient>

      <View className='mt-[24px] w-full'>
        <LinearGradient
            colors={['#FFF9F0', '#FFFFFF']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            style={{borderRadius: 16}} className="w-full rounded-[16px] border border-[#FFE4CC] mb-8"
        >
            {/* Top Row - Hiển thị Avatar */}
            <View className="flex-row justify-between items-start w-full pb-[21px] px-[22px] pt-[30px] border-t border-l border-r rounded-t-[16px] border-[#FFE4CC]">
                <View className="items-center w-[80px]">
                    <Image 
                      source={{ uri: ownerInfo?.avatarUrl || defaultAvatar }} 
                      className="w-[60px] h-[60px] rounded-full border-[2px] border-[#FF9F5A] mb-2"
                    />
                    <Text className="text-[14px] font-medium text-black text-center" numberOfLines={1}>{ownerInfo?.name || 'Current Owner'}</Text>
                    <Text className="text-[11px] text-[#8E8E93] text-center mt-0.5">Current Owner</Text>
                </View>

                <View className="flex-1 items-center justify-center px-2 mt-4">
                    <View className="w-full h-[2px] bg-[#FFE4CC] absolute top-[11px]" />
                    <View className={`justify-center items-center w-[24px] h-[24px] rounded-full z-10 ${isTransferUnsuccessful ? 'bg-[#FFE5E5]' : 'bg-[#FFF9F0]'}`}>
                        <Ionicons 
                            name={isTransferUnsuccessful ? "close" : "time"} 
                            size={16} 
                            color={isTransferUnsuccessful ? "#FF4D4D" : "#FEA766"} 
                        />
                    </View>
                    
                    {/* 3. THAY ĐỔI TEXT THEO ĐÚNG ROLE */}
                    <Text className={`text-[12px] font-semibold text-center mt-2 ${isTransferUnsuccessful ? 'text-[#FF4D4D]' : 'text-[#FEA766]'}`}>
                        {isTransferUnsuccessful ? 'Failed' : (
                            transferRole === 'none' ? 'Transfer' : 
                            transferRole === 'sender' ? 'Transferring' : 'Confirming'
                        )}
                    </Text>
                </View>

                <View className="items-center w-[80px]">
                    {petInfo?.receiver ? (
                        <Image 
                            source={{ uri: petInfo.receiver.avatarUrl || defaultAvatar }} 
                            className={`w-[60px] h-[60px] rounded-full border-[2px] border-dashed mb-2 ${isTransferUnsuccessful ? 'border-[#FF4D4D]' : 'border-[#FF9F5A]'}`}
                        />
                    ) : (
                        <View className="w-[60px] h-[60px] rounded-full border-[2px] border-dashed border-[#757575] bg-[#E5E5E5] justify-center items-center mb-2">
                            <Ionicons name="person" size={24} color="#757575" />
                        </View>
                    )}
                    <Text className="text-[14px] font-medium text-black text-center" numberOfLines={1}>
                        {receiverName}
                    </Text>
                    <Text className="text-[11px] text-[#8E8E93] text-center mt-0.5">
                        {isTransferUnsuccessful ? 'Rejected' : (transferRole === 'none' ? 'Awaiting' : 'Confirming')}
                    </Text>
                </View>
            </View>
            
            <View className='w-full h-[1px]'>
                <View className='mx-[22px] h-full items-center justify-center bg-[#FFE4CC]'></View>
            </View>

            {/* LUỒNG UI KHI THẤT BẠI (CANCEL/REJECT) */}
            {isTransferUnsuccessful ? (
              <>
                <View className="flex-row items-center justify-center pt-[21px] px-[22px] border-l border-r border-[#FFE4CC]">
                    <Text className="text-[16px] font-semibold text-[#FF4D4D]">Transfer unsuccessful</Text>
                </View>
                <View className="w-full px-[30px] border-b border-l border-r rounded-b-[16px] border-[#FFE4CC] pt-[16px] pb-[40px] items-center">
                    <Text className="text-[14px] text-[#4A4A4A] text-center leading-[24px]">
                        I acknowledge this transfer is permanent and all <Text className="font-bold text-black">{petInfo?.name}'s</Text> profile will be transferred to <Text className="font-bold text-black">{receiverName}</Text>.
                    </Text>
                </View>
              </>
            ) : (
              /* Content bình thường khi chưa thất bại */
              <>
                {transferRole === 'none' && (
                  <>
                    <View className="flex-row items-center pt-[21px] px-[22px] border-l border-r border-[#FFE4CC]">
                        <Ionicons name="person-add" size={16} color="#FEA766" className="mr-2" />
                        <Text className="text-[16px] font-semibold text-[#FEA766]">Thông tin người nhận</Text>
                    </View>

                    {/* Bỏ cụm tab chọn Email / Phone, thay thẳng bằng 1 Box duy nhất */}
                    <View className="w-full px-[22px] border-b border-l border-r rounded-b-[16px] border-[#FFE4CC] pb-[30px] pt-[16px]">
                      <Text className="text-[13px] font-medium text-black mb-[12px]">
                          Nhập Email hoặc Số điện thoại
                      </Text>
                      <View className="bg-white justify-center w-full h-[48px] rounded-[12px] border border-[#E5E5E5] px-4">
                          <TextInput 
                            className="text-[14px] text-black w-full" 
                            placeholder="Ví dụ: newowner@email.com hoặc 0987654321" 
                            value={contactValue} 
                            onChangeText={setContactValue}
                            autoCapitalize="none"
                            keyboardType="default" 
                          />
                      </View>
                    </View>
                  </>
                )}

                {transferRole === 'sender' && (
                  <>
                    <View className="flex-row items-center justify-center pt-[21px] px-[22px] border-l border-r border-[#FFE4CC]">
                        <Text className="text-[16px] font-semibold text-[#FEA766]">Waiting for confirmation</Text>
                    </View>
                    <View className="w-full px-[30px] border-b border-l border-r rounded-b-[16px] border-[#FFE4CC] pt-[16px] pb-[40px] items-center">
                        <Text className="text-[14px] text-[#8E8E93] text-center leading-[22px]">
                            A confirmation request has been sent to{'\n'}
                            <Text className="font-bold text-black">{contactValue}</Text>.{'\n'}
                            Waiting for them to accept the transfer.
                        </Text>
                    </View>
                  </>
                )}

                {transferRole === 'receiver' && (
                  <>
                    <View className="flex-row items-center justify-center pt-[21px] px-[22px] border-l border-r border-[#FFE4CC]">
                        <Text className="text-[16px] font-semibold text-[#FEA766]">Confirm Transfer Ownership</Text>
                    </View>
                    <View className="w-full px-[30px] border-b border-l border-r rounded-b-[16px] border-[#FFE4CC] pt-[16px] pb-[40px] items-center">
                        <Text className="text-[14px] text-[#4A4A4A] text-center leading-[24px]">
                            I acknowledge this transfer is permanent and all <Text className="font-bold text-black">{petInfo?.name}'s</Text> profile will be transferred to <Text className="font-bold text-black">{receiverName}</Text>.
                        </Text>
                    </View>
                  </>
                )}
            </>
            )}
        </LinearGradient>
      </View>

      {/* Button Actions */}
      <View className="w-full mt-[10px] mb-[20px]">
        {/* Nút Action khi Canceled/Rejected */}
        {isTransferUnsuccessful && (
            <TouchableOpacity 
                className="bg-[#FFF0E5] border border-[#FEA766] w-full h-[52px] rounded-[16px] flex-row justify-center items-center shadow-sm"
                onPress={handleBackNavigation} 
            >
                <Text className="text-[16px] font-bold text-[#FEA766]">
                    {transferRole === 'sender' ? 'Back to pet profile' : 'Back to home screen'}
                </Text>
            </TouchableOpacity>
        )}

        {/* Các nút hiện tại (chỉ hiện khi chưa thất bại) */}
        {!isTransferUnsuccessful && transferRole === 'none' && (
            <TouchableOpacity 
                className="bg-[#FEA766] w-full h-[52px] rounded-[16px] flex-row justify-center items-center shadow-sm"
                onPress={handleSendConfirmation} disabled={isSubmitting}
            >
                {isSubmitting ? <ActivityIndicator color="white" /> : (
                <>
                    <Ionicons name="paper-plane-outline" size={18} color="white" />
                    <Text className="text-[16px] font-bold text-white ml-2">Send Confirmation</Text>
                </>
                )}
            </TouchableOpacity>
        )}

        {!isTransferUnsuccessful && transferRole === 'sender' && (
            <TouchableOpacity 
                className="bg-[#FF4D4D] w-full h-[52px] rounded-[16px] flex-row justify-center items-center shadow-sm"
                onPress={handleCancelTransfer} disabled={isSubmitting}
            >
                {isSubmitting ? <ActivityIndicator color="white" /> : (
                <>
                    <Ionicons name="close-circle-outline" size={18} color="white" />
                    <Text className="text-[16px] font-bold text-white ml-2">Cancel Request</Text>
                </>
                )}
            </TouchableOpacity>
        )}

        {!isTransferUnsuccessful && transferRole === 'receiver' && (
            <>
                <TouchableOpacity 
                    className="bg-[#FEA766] w-full h-[52px] rounded-[16px] flex-row justify-center items-center mb-3 shadow-sm"
                    onPress={handleConfirmTransfer} disabled={isSubmitting}
                >
                    {isSubmitting ? <ActivityIndicator color="white" /> : (
                    <>
                        <Ionicons name="checkmark-circle-outline" size={20} color="white" />
                        <Text className="text-[16px] font-bold text-white ml-2">Complete Transfer Ownership</Text>
                    </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity 
                    className="bg-[#FFF0E5] border border-[#FFE4CC] w-full h-[52px] rounded-[16px] flex-row justify-center items-center"
                    onPress={handleCancelTransfer} disabled={isSubmitting}
                >
                    <Text className="text-[16px] font-bold text-[#FF4D4D]">Cancel</Text>
                </TouchableOpacity>
            </>
        )}
      </View>
    </ScrollView>
  );
}