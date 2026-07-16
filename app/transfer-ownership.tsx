import axiosClient from '@/api/axiosClient';
import { Text } from '@/components/AppText';
import { TextInput } from '@/components/AppTextInput';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLocalizedData } from '@/hooks/useLocalizedData';
import { socket } from '@/utils/socket';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TransferOwnershipScreen() {
  const router = useRouter();
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const { t, language } = useLanguage();
  const isVi = language === 'vi';
  const { l } = useLocalizedData();
  const [contactValue, setContactValue] = useState('');

  const [petInfo, setPetInfo] = useState<any>(null);
  const [ownerInfo, setOwnerInfo] = useState<any>(null);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successPayload, setSuccessPayload] = useState<any>(null); // Thêm state này
  const [transferRole, setTransferRole] = useState<'none' | 'sender' | 'receiver'>('none');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isTransferUnsuccessful, setIsTransferUnsuccessful] = useState(false);
  const [isPending, setIsPending] = useState(true)
  const [inputType, setInputType] = useState<'email' | 'phone'>('email');
  const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [targetReportUserId, setTargetReportUserId] = useState<string | null>(null);
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
        if (data.receiver === myUserId) {
          setTransferRole('receiver');
        } else if (data.senderId === myUserId || data.ownerId === myUserId) {
          setTransferRole('sender');
          setContactValue(data.pendingContact || '');
        }
        setIsTransferUnsuccessful(false);
      } else if (data.transferStatus === 'REJECTED' || data.transferStatus === 'CANCELED') {
        if (data.senderId === myUserId || data.ownerId === myUserId) setTransferRole('sender');
        if (data.receiver === myUserId) setTransferRole('receiver');
        setIsTransferUnsuccessful(true);
        setIsPending(false)
      } else {
        setTransferRole('none');
        setIsTransferUnsuccessful(false);
      }


    } catch (error: any) {
      console.error(isVi ? "Lỗi tải thông tin:" : "Failed to load information:", error);
      Alert.alert(isVi ? 'Lỗi' : 'Error', isVi ? 'Không thể tải thông tin thú cưng' : 'Failed to load pet information');
    } finally {
      setIsFetchingData(false);
    }
  }, [petId]);

  useEffect(() => {
    if (!petId) {
      Alert.alert(isVi ? 'Lỗi' : 'Error', isVi ? 'Không tìm thấy ID Thú cưng!' : 'Pet ID not found!');
      router.back();
      return;
    }
    fetchPetDetails();
  }, [fetchPetDetails, petId]);

  // THÊM MỚI: Lắng nghe thêm sự kiện transfer_cancelled từ socket
  useEffect(() => {
    // Nhận thêm `data` đầy đủ từ backend
    const handleTransferComplete = async (data: any) => {
      if (data.petId === petId) {
        setSuccessPayload(data); // Lưu role và targetName vào state
        await fetchPetDetails();
        setIsSuccessModalVisible(true);
      }
    };

    const handleTransferCancelled = async (data: { petId: string }) => {
      if (data.petId === petId) {
        await fetchPetDetails(); // Cập nhật lại UI từ Pending -> Canceled lập tức
        setIsTransferUnsuccessful(true);
        setIsPending(false);
      }
    };

    socket.on('transfer_completed', handleTransferComplete);
    socket.on('transfer_cancelled', handleTransferCancelled);

    return () => {
      socket.off('transfer_completed', handleTransferComplete);
      socket.off('transfer_cancelled', handleTransferCancelled);
    };
  }, [petId, fetchPetDetails]);
  const handleReportUser = async () => {
    if (!reportReason.trim()) return Alert.alert('Lỗi', 'Vui lòng nhập lý do!');
    try {
      // Thay endpoint bằng endpoint report user của bạn
      await axiosClient.post('/reports', {
        targetId: targetReportUserId,
        type: 'user',
        reason: reportReason
      });
      Alert.alert('Thành công', 'Cảm ơn bạn đã báo cáo. Chúng tôi sẽ xem xét ngay lập tức.');
      setIsReportModalVisible(false);
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể gửi báo cáo lúc này.');
    }
  }
  const handleSendConfirmation = async () => {
    const inputValue = contactValue.trim();
    if (!inputValue) {
      Alert.alert(isVi ? `Vui lòng nhập ${inputType === 'email' ? 'Email' : 'Số điện thoại'} người nhận!` : `Please enter the recipient's ${inputType === 'email' ? 'email' : 'phone number'}!`);
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
      Alert.alert(isVi ? 'Lỗi' : 'Error', error.response?.data?.message || (isVi ? 'Không tìm thấy người dùng hoặc có lỗi xảy ra.' : 'User not found or an error occurred.'));
    } finally {
      setIsSubmitting(false);
      setIsPending(false)
    }
  };

  const handleCancelTransfer = async () => {
    const title = transferRole === 'receiver' ? "Decline Request" : "Cancel Request";
    const msg = transferRole === 'receiver'
      ? "Bạn có chắc chắn muốn từ chối nhận bé thú cưng này không?"
      : "Bạn có chắc chắn muốn hủy yêu cầu chuyển nhượng này không?";

    Alert.alert(title, msg, [
      { text: isVi ? "Không" : "No", style: "cancel" },
      {
        text: isVi ? "Có" : "Yes",
        style: "destructive",
        onPress: async () => {
          setIsSubmitting(true);
          try {
            await axiosClient.post(`/pets/${petId}/cancel-transfer`);
            // THAY ĐỔI: Không setTransferRole('none') và không router.back()
            // Chuyển UI sang trạng thái Unsuccessful
            setIsTransferUnsuccessful(true);
          } catch (error: any) {
            Alert.alert(isVi ? 'Lỗi' : 'Error', error.response?.data?.message || (isVi ? 'Không thể hủy yêu cầu lúc này.' : 'You cannot cancel the request at this time.'));
          } finally {
            setIsSubmitting(false);
            setIsPending(false)

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
      Alert.alert(isVi ? 'Lỗi' : 'Error', error.response?.data?.message || (isVi ? 'Không thể xác nhận chuyển nhượng lúc này.' : 'The transfer cannot be confirmed at this time.'));
      setIsSubmitting(false);
      setIsPending(false)
    }
  };

  const handleBackNavigation = () => {
    if (transferRole === 'sender') {
      router.back(); // Trở về Pet Profile
    } else {
      router.push('/(tabs)'); // Trở về Home Screen
    }
  };

  const getAge = (dob?: string, isVi?: boolean) => {
    if (!dob) return isVi ? "Không rõ tuổi" : 'Unknown age';
    const birthDate = new Date(dob);
    const difference = Date.now() - birthDate.getTime();
    const years = Math.abs(new Date(difference).getUTCFullYear() - 1970);
    return years > 0 ? `${years} ${isVi ? "tuổi" : "years"}` : (isVi ? "Dưới 1 tuổi" : 'Under 1 year');
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
    <View className='flex-1 bg-white'>
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>

        <View style={{ height: 44, justifyContent: 'center', marginBottom: 16, marginTop: 8 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.8}
            style={{
              shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1, shadowRadius: 5, elevation: 3,
            }}
            className="absolute left-5 w-10 h-10 rounded-full items-center justify-center"
          >
            <View className="overflow-hidden rounded-full items-center justify-center"
              style={{
                width: 36, height: 36, borderRadius: 28, borderWidth: 0.5,
                borderTopColor: 'white', borderLeftColor: 'white',
                borderBottomColor: 'transparent', borderRightColor: 'transparent',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }}>
              <LinearGradient
                colors={['rgba(221, 221, 221, 0.5)', 'rgba(247, 247, 247, 0.8)', '#FFFFFF']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} locations={[0, 0.3, 1]}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 9999 }}
              />
              <Feather name="chevron-left" size={20} color="#000000" />
            </View>
          </TouchableOpacity>
          <View style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center', pointerEvents: 'none' }}>
            <Text className="text-[24px] font-semibold text-black">Transfer Ownership</Text>
          </View>
        </View>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        // keyboardVerticalOffset={20} // Mở comment này nếu bàn phím vẫn hơi che mất 1 tí do SafeArea
        >
          <ScrollView
            contentContainerStyle={{ alignItems: 'center', paddingTop: 10, backgroundColor: '#FFFFFF', paddingBottom: 40, paddingHorizontal: 20 }}
            showsVerticalScrollIndicator={false}
            className="flex-1 bg-white"
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}

            {/* Pet Info Card (Giữ nguyên) */}
            <View className='w-full'
              style={{
                shadowColor: '#000000',
                shadowOffset: { width: 1, height: 1 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 5,
              }}>
              <View className='rounded-[16px] mb-[24px] w-full overflow-hidden bg-white'>
                <LinearGradient
                  colors={['rgba(251,240,246,0.6)', 'rgba(249,236,243,1)', 'rgba(248,232,241,1)']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  className="flex-row items-center w-full h-[92px] px-[14px] rounded-[16px] mb-[24px]"
                >
                  <View className='flex-row w-full p-[14px] rounded-[16px]'>
                    <Image source={{ uri: petInfo?.avatarUrl || defaultPetImage }} className="w-[64px] h-[64px] rounded-[12px]" />
                    <View className="flex-1 flex-col justify-center ml-[12px] h-[64px]">
                      <Text className="text-[16px] font-semibold text-black" numberOfLines={1}>{petInfo?.name || 'Unknown Name'}</Text>
                      <Text className="text-[12px] font-regular text-[#8E8E93] mt-[6px] tracking-[0.5px]">{getAge(petInfo?.dob, isVi)} • {l(petInfo?.breed) || 'Unknown Breed'}</Text>
                      <Text className="text-[12px] font-regular text-[#8E8E93] mt-[2px] tracking-[0.5px]">ID: {petInfo?.id?.substring(0, 8).toUpperCase()}</Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            </View>

            <View className='mt-[24px] w-full'>
              <LinearGradient
                colors={['#FFF9F0', '#FFFFFF']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                style={{ borderRadius: 16 }} className="w-full rounded-[16px] border border-[#FFE4CC] mb-8"
              >
                {/* Top Row - Hiển thị Avatar */}
                <View className="flex-row justify-between items-start w-full pb-[21px] px-[22px] pt-[30px] border-t border-l border-r rounded-t-[16px] border-[#FFE4CC]">
                  <View className="items-center w-[80px] relative">
                    <Image
                      source={{ uri: ownerInfo?.avatarUrl || defaultAvatar }}
                      className="w-[68px] h-[68px] rounded-full border-[2px] border-[#FF9F5A] mb-2"
                    />
                    {ownerInfo?.id && ownerInfo.id !== currentUserId && (
                      <TouchableOpacity
                        className="absolute top-0 right-0 bg-white p-1 rounded-full shadow-sm"
                        onPress={() => { setTargetReportUserId(ownerInfo.id); setIsReportModalVisible(true); }}
                      >
                        <Feather name="flag" size={12} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                    <Text className="text-[14px] font-medium text-black text-center" numberOfLines={1}>{ownerInfo?.name || 'Current Owner'}</Text>
                    <Text className="text-[12px] text-[#8E8E93] text-center mt-0.5 tracking-[0.06px] ">Current Owner</Text>
                  </View>

                  <View className="flex-1 items-center justify-center px-2 mt-6">
                    <View className="w-full h-[2px] bg-[#FFE4CC] absolute top-[11px]" >
                      <LinearGradient
                        colors={[isTransferUnsuccessful ? '#FE7D66' : '#FFA562', '#E5E5E5']}
                        locations={[0, 0.8]}
                        start={{ x: 0.0, y: 0.5 }}
                        end={{ x: 1.0, y: 0.5 }}
                        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '100%', justifyContent: 'flex-end' }}
                      ></LinearGradient>
                    </View>
                    <View className={`justify-center items-center w-[24px] h-[24px] rounded-full z-10 ${isTransferUnsuccessful ? 'bg-[#FE7D66]' : 'bg-[#FEA766]'}`}>
                      {isPending ? (
                        <Image
                          source={require('../assets/icon/pause-white.png')}
                          className="w-[11px] h-[11px]"
                        />
                      ) : (
                        <Image
                          source={isTransferUnsuccessful ? require('../assets/icon/close-white.png') : require('../assets/icon/arrow-right-white.png')}
                          className="w-[11px] h-[11px]"
                        />
                      )}
                    </View>

                    {/* 3. THAY ĐỔI TEXT THEO ĐÚNG ROLE */}
                    <Text className={`text-[12px] font-semibold text-center mt-1 tracking-[0.06px] ${isTransferUnsuccessful ? 'text-[#FF4D4D]' : 'text-[#FEA766]'}`}>
                      {isTransferUnsuccessful ? 'Canceled' : (
                        transferRole === 'none' ? 'Pending...' :
                          transferRole === 'sender' ? 'Transferring' : 'Confirming'
                      )}
                    </Text>
                  </View>

                  <View className="items-center w-[80px] relative">
                    {petInfo?.receiver ? (
                      <Image
                        source={{ uri: petInfo.receiver.avatarUrl || defaultAvatar }}
                        className={`w-[60px] h-[60px] rounded-full border-[2px] border-dashed mb-2 ${isTransferUnsuccessful ? 'border-[#FF4D4D]' : 'border-[#FF9F5A]'}`}
                      />
                    ) : (
                      <View className="w-[68px] h-[68px] rounded-full border-[2px] border-dashed border-[#757575] bg-[#E5E5E5] justify-center items-center mb-2">
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
                    <View className="flex-row items-center pt-[21px] px-[22px] border-l border-r border-[#FFE4CC]">
                      <Ionicons
                        name="close"
                        size={18}
                        color="#FE7D66"
                      />
                      <Text className="text-[16px] font-semibold text-[#FF4D4D] ml-1">Transfer unsuccessful</Text>
                    </View>
                    <View className="w-full px-[30px] border-b border-l border-r rounded-b-[16px] border-[#FFE4CC] pt-[16px] pb-[30px] items-center">
                      <Text className="text-[12px] text-[#8E8E93] leading-[16px] tracking-[0.06px] ml-3">
                        {
                          isVi
                            ? `Tôi hiểu rằng sau khi hoàn tất, việc chuyển nhượng này sẽ không thể hoàn tác và toàn bộ hồ sơ của ${petInfo?.name || 'thú cưng'} sẽ được chuyển cho ${receiverName}.`
                            : `I understand that once completed, this transfer cannot be undone and all records for ${petInfo?.name || 'the pet'} will be transferred to ${receiverName}.`
                        }
                      </Text>
                    </View>
                  </>
                ) : (
                  /* Content bình thường khi chưa thất bại */
                  <>
                    {transferRole === 'none' && (
                      <>
                        <View className="flex-row items-center pt-[21px] px-[22px] border-l border-r border-[#FFE4CC]">
                          <Image
                            source={require('../assets/icon/user.png')}
                            style={{ width: 16, height: 16 }} // Sửa thành style nội tuyến
                            resizeMode="cover"
                            className='mr-2'
                          />
                          <Text className="text-[16px] font-semibold text-[#FEA766]">New Owner Contact</Text>
                        </View>

                        <View className="w-full px-[22px] border-b border-l border-r rounded-b-[16px] border-[#FFE4CC] pb-[30px] pt-[16px]">

                          {/* 1. THANH CHUYỂN ĐỔI (SEGMENTED CONTROL) */}
                          <View className="flex-row bg-[#787880]/10 p-1 rounded-[12px] w-full h-[44px] items-center mb-[16px]">
                            {/* Tab Email */}
                            <TouchableOpacity
                              activeOpacity={0.8}
                              onPress={() => {
                                setInputType('email');
                                setContactValue(''); // (Tuỳ chọn) Reset input khi đổi tab
                              }}
                              className={`flex-1 h-full flex-row justify-center items-center rounded-[7px] ${inputType === 'email' ? 'bg-white' : 'bg-transparent'
                                }`}
                              style={inputType === 'email' ? { elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } } : {}}
                            >
                              <Image
                                source={
                                  inputType === 'email'
                                    ? require('../assets/icon/mail-black.png') // Ảnh màu Active
                                    : require('../assets/icon/mail-gray.png') // Ảnh màu Inactive
                                }
                                style={{ width: 16, height: 16 }}
                                resizeMode="cover"
                                className="mr-2" // Khoảng cách giữa Icon và Chữ
                              />
                              <Text className={`text-[14px] ${inputType === 'email' ? 'text-black font-semibold' : 'text-[#8E8E93] font-regular'}`}>
                                Email
                              </Text>
                            </TouchableOpacity>

                            {/* Tab Phone Number */}
                            <TouchableOpacity
                              activeOpacity={0.8}
                              onPress={() => {
                                setInputType('phone');
                                setContactValue('');
                              }}
                              className={`flex-1 h-full flex-row justify-center items-center rounded-[10px] ${inputType === 'phone' ? 'bg-white' : 'bg-transparent'
                                }`}
                              style={inputType === 'phone' ? { elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } } : {}}
                            >
                              <Image
                                source={
                                  inputType === 'phone'
                                    ? require('../assets/icon/phone-black.png') // Ảnh màu Active
                                    : require('../assets/icon/phone-gray-icon.png') // Ảnh màu Inactive
                                }
                                style={{ width: 16, height: 16 }}
                                resizeMode="cover"
                                className="mr-2" // Khoảng cách giữa Icon và Chữ
                              />
                              <Text className={`text-[14px] ${inputType === 'phone' ? 'text-black font-semibold' : 'text-[#8E8E93] font-regular'}`}>
                                Phone
                              </Text>
                            </TouchableOpacity>
                          </View>

                          <Text className="text-[12px] font-medium text-black mb-3">{isVi ? "" : "New Owner’s"} {inputType === 'phone' ? (isVi ? "Điện thoại của chủ mới" : 'Phone') : (isVi ? "Email của chủ mới" : 'Email Address')}</Text>

                          {/* 2. Ô NHẬP LIỆU (TEXT INPUT) */}
                          <View className="bg-white justify-center w-full h-[48px] rounded-[16px] border border-[#E5E5E5] px-4">
                            <TextInput
                              className="text-[14px] text-black w-full"
                              placeholder={inputType === 'email' ? "Newowner@email.com" : "0987654321"}
                              value={contactValue}
                              onChangeText={setContactValue}
                              placeholderTextColor="#B8B8B8"
                              autoCapitalize="none"
                              keyboardType={inputType === 'email' ? "email-address" : "phone-pad"}
                            />
                          </View>
                        </View>
                      </>
                    )}

                    {transferRole === 'sender' && (
                      <>
                        <View className="flex-row items-center pt-[21px] px-[22px] border-l border-r border-[#FFE4CC]">
                          <ActivityIndicator color="#FEA766" className='mr-2' />
                          <Text className="text-[16px] font-semibold text-[#FEA766]">Waiting for confirmation</Text>
                        </View>
                        <View className="w-full px-[30px] border-b border-l border-r rounded-b-[16px] border-[#FFE4CC] pt-[27px] pb-[30px] items-center">
                          <Text className="text-[12px] text-[#8E8E93] font-regular text-center leading-[22px]">
                            {isVi ? 'Một yêu cầu xác nhận đã được gửi đến' : 'A confirmation request has been sent to'}{'\n'}
                            <Text className="font-medium text-black">{contactValue}</Text>.{'\n'}
                            {isVi ? 'Đang chờ họ chấp nhận yêu cầu chuyển nhượng.' : 'Waiting for them to accept the transfer.'}
                          </Text>
                        </View>
                      </>
                    )}

                    {transferRole === 'receiver' && (
                      <>
                        <View className="flex-row items-center pt-[21px] px-[22px] border-l border-r border-[#FFE4CC]">
                          <Image
                            source={require('../assets/icon/check-circle.png')}
                            className="w-[13px] h-[13px]"
                          />
                          <Text className="text-[16px] font-semibold text-[#FEA766] ml-2">Confirm Transfer Ownership</Text>
                        </View>
                        <View className="w-full flex-row px-[22px] border-b border-l border-r rounded-b-[16px] border-[#FFE4CC] pt-[16px] pb-[30px]">
                          <Image
                            source={require('../assets/icon/check-square.png')}
                            className="w-[13px] h-[13px] mr-2"
                          />
                          <Text className="text-[12px] text-[#8E8E93] leading-[16px] italic ">
                            {
                              isVi
                                ? `Tôi hiểu rằng sau khi hoàn tất, việc chuyển nhượng này sẽ không thể hoàn tác và toàn bộ hồ sơ của ${petInfo?.name || 'thú cưng'} sẽ được chuyển cho ${receiverName}.`
                                : `I understand that once completed, this transfer cannot be undone and all records for ${petInfo?.name || 'the pet'} will be transferred to ${receiverName}.`
                            }
                          </Text>
                        </View>
                      </>
                    )}
                  </>
                )}
              </LinearGradient>
            </View>

            {/* Button Actions */}
            <View className="w-full mt-[38px] mb-[20px]">
              {/* Nút Action khi Canceled/Rejected */}
              {isTransferUnsuccessful && (
                <TouchableOpacity
                  className="w-full h-[52px] rounded-[16px] flex-row justify-center items-center"
                  onPress={handleBackNavigation}
                >
                  <Text className="text-[16px] font-medium text-[#8E8E93]">
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
                      <Image
                        source={require('../assets/icon/send-confirm-icon.png')}
                        style={{ width: 16, height: 16 }} // Sửa thành style nội tuyến
                        resizeMode="cover"
                      />
                      <Text className="text-[16px] font-bold text-white ml-2">Send Confirmation</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {!isTransferUnsuccessful && transferRole === 'sender' && (
                <TouchableOpacity
                  className="bg-white w-full h-[52px] rounded-[16px] flex-row justify-center items-center border border-[#E5E5E5]"
                  onPress={handleCancelTransfer} disabled={isSubmitting}
                >
                  {isSubmitting ? <ActivityIndicator color="white" /> : (
                    <>
                      <Text className="text-[16px] font-medium text-[#8E8E93]">Cancel</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {!isTransferUnsuccessful && transferRole === 'receiver' && (
                <>
                  <TouchableOpacity
                    className="bg-[#FEA766] w-full h-[52px] rounded-[16px] flex-row justify-center items-center mb-3"
                    onPress={handleConfirmTransfer} disabled={isSubmitting}
                  >
                    {isSubmitting ? <ActivityIndicator color="white" /> : (
                      <>
                        <Text className="text-[16px] font-semibold text-white ml-2">Complete Transfer Ownership</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="bg-white border border-[#E5E5E5] w-full h-[52px] rounded-[16px] flex-row justify-center items-center"
                    onPress={handleCancelTransfer} disabled={isSubmitting}
                  >
                    <Text className="text-[16px] font-medium text-[#8E8E93]">Cancel</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
        <Modal
          visible={isSuccessModalVisible}
          transparent={true}
          animationType="fade" // Hiệu ứng hiện lên mờ dần nhẹ nhàng
          statusBarTranslucent={true} // Tràn qua cả thanh trạng thái cho đẹp
        >
          {/* Lớp nền mờ tối phía sau (Backdrop) */}
          <View className="flex-1 justify-center items-center bg-black/50 px-9">

            {/* Khung nội dung chính của Modal (Căn giữa hoàn hảo) */}
            <View
              className="w-full bg-white rounded-[24px] items-center"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 5, // Đổ bóng trên Android
              }}
            >
              <View className="flex-row w-full items-center justify-center mb-2 relative mt-[21px]">
                <Text className="text-[20px] font-semibold text-gray-900 tracking-tight text-center">
                  Transfer Completed
                </Text>

                <TouchableOpacity
                  onPress={() => setIsSuccessModalVisible(false)}
                  className="p-2 absolute right-5"
                  activeOpacity={0.7}
                >
                  <Feather name="x" size={16} color="#000000" />
                </TouchableOpacity>
              </View>
              <View className="w-full bg-white rounded-[24px] items-center px-[51px]">

                {/* 1. TEXT THÔNG BÁO ĐỘNG THEO ROLE */}
                <Text className="text-[14px] font-regular text-[#8E8E93] text-center tracking-[-0.08px] mb-[23px]">
                  {successPayload?.role === 'sender'
                    ? (isVi
                      ? `Bạn đã chuyển nhượng thành công thú cưng ${petInfo?.name || ''} cho ${successPayload?.targetName}.`
                      : `You have successfully transferred ${petInfo?.name || 'the pet'} to ${successPayload?.targetName}.`)
                    : (isVi
                      ? `${successPayload?.targetName || ownerInfo?.name || 'Chủ cũ'} đã chuyển nhượng ${petInfo?.name || 'thú cưng'} cho bạn.`
                      : `${successPayload?.targetName || ownerInfo?.name || 'Old Owner'} has transferred ${petInfo?.name || 'Unknown Name'} to you.`)
                  }
                </Text>

                <View className="w-[104px] h-[104px] rounded-full justify-center items-center mb-2">
                  <Image source={{ uri: petInfo?.avatarUrl || defaultPetImage }} className="w-[104px] h-[104px] rounded-full" />
                </View>

                <Text
                  className="text-[20px] font-semibold text-gray-900 mb-2 text-center"
                  style={{ fontFamily: 'Urbanist' }}
                >
                  {petInfo?.name || 'Unknown Name'}
                </Text>
                <Text className="text-[14px] font-regular text-[#8E8E93] tracking-[0.5px] mb-3">{getAge(petInfo?.dob, isVi)} • {l(petInfo?.breed) || 'Unknown Breed'}</Text>

                {/* 2. NÚT BẤM ĐỘNG THEO ROLE */}
                {successPayload?.role === 'sender' ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      setIsSuccessModalVisible(false);
                      router.push('/(tabs)'); // Sender không còn sở hữu -> Đẩy về màn chính
                    }}
                    className="bg-[#E89B5A] flex-row w-full h-[48px] mx-[15px] rounded-[16px] justify-center items-center mb-2"
                  >
                    <Text className="text-[16px] font-semibold text-white" style={{ fontFamily: 'Urbanist' }}>
                      {isVi ? 'Trở về trang chủ' : 'Back to Home'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      setIsSuccessModalVisible(false);
                      router.back();
                    }}
                    className="bg-[#E89B5A] flex-row w-full h-[48px] mx-[15px] rounded-[16px] justify-center items-center mb-2"
                  >
                    <Text className="text-[16px] font-semibold text-white" style={{ fontFamily: 'Urbanist' }}>
                      {isVi
                        ? `Xem hồ sơ của ${petInfo?.name || 'thú cưng'}`
                        : `View ${petInfo?.name || 'New pet'} Profile`
                      }
                    </Text>
                    <Feather name="chevron-right" size={18} color="white" />
                  </TouchableOpacity>
                )}

                <Text
                  className="text-[12px] text-[#8E8E93] font-regular text-center mb-6 leading-[16px] px-2 italic tracking-[0.5px]"
                  style={{ fontFamily: 'Urbanist' }}
                >
                  {isVi
                    ? 'Giao dịch chuyển nhượng này sẽ được lưu vào PawHistory sau 3 ngày.'
                    : 'This transfer will be recorded in PawHistory in 3 days.'}
                </Text>
              </View>

              {/* 4. NÚT BẤM "GREAT!" ĐỂ ĐÓNG/CHUYỂN TRANG */}

            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}