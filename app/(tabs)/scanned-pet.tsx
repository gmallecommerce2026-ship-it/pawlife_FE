import axiosClient from '@/api/axiosClient';
import { Text } from '@/components/AppText';
import { AntDesign, Feather, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  ScrollView,
  TouchableOpacity,
  View
} from 'react-native';

import LostModeShareModal, { FormData } from '@/components/LostModeShareModal';
import ReportIssueModal from '@/components/ReportIssueModal';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function ScannedPetScreen() {
  const router = useRouter();
  const { tagId } = useLocalSearchParams();

  const [pet, setPet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [hasReported, setHasReported] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReportVisible, setIsReportVisible] = useState(false);

  useEffect(() => {
    const fetchPetData = async () => {
      try {
        setLoading(true);
        const response = await axiosClient.get(`/tags/${tagId}/scan`);
        const petData = response.data;
        setPet(petData);

        const isPetLost = petData.isLost || petData.status?.toUpperCase() === 'LOST';

        // Tự động bật Modal nếu thú cưng đi lạc
        if (isPetLost && !hasReported) {
          setTimeout(() => {
            setIsModalVisible(true);
          }, 500);
        }
      } catch (error: any) {
        setPet(null);
      } finally {
        setLoading(false);
      }
    };

    if (tagId) fetchPetData();
    else setLoading(false);
  }, [tagId]);

  // HÀM XỬ LÝ GỌI API DUY NHẤT
  const handleShareLocation = async (location: any, formData: FormData, isSkipped: boolean) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const finalTagId = Array.isArray(tagId) ? tagId[0] : tagId;
      const lat = location?.latitude || null;
      const lng = location?.longitude || null;

      const payload = isSkipped ? {
        tagId: finalTagId,
        latitude: lat,
        longitude: lng,
      } : {
        tagId: finalTagId,
        scannedBy: formData.scannedBy.trim() || undefined,
        phoneNumber: formData.phoneNumber.trim(),
        message: formData.message.trim() || undefined,
        latitude: lat,
        longitude: lng,
      };

      await axiosClient.post('/tags/report', payload);

      setIsModalVisible(false);
      setHasReported(true);

      if (!isSkipped) {
        Alert.alert(
          'Thành công',
          'Đã gửi thông báo cùng vị trí GPS của bạn đến ứng dụng của chủ thú cưng!',
          [{ text: 'Đóng' }]
        );
      } else {
        Alert.alert('Đã báo cáo', 'Vị trí ẩn danh đã được ghi nhận.');
      }
    } catch (error: any) {
      const errorData = error.response?.data;
      const serverMsg = errorData?.message;
      const displayMsg = Array.isArray(serverMsg) ? serverMsg.join('\n') : serverMsg;
      Alert.alert('Gửi thất bại', displayMsg || 'Không thể gửi thông báo. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCallOwner = () => {
    if (pet?.owner?.phone) {
      Linking.openURL(`tel:${pet.owner.phone}`);
    } else {
      Alert.alert('Lỗi', 'Không tìm thấy số điện thoại của chủ nhân.');
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#ffa053" />
        <Text className="text-gray-500 font-medium mt-4">Đang kiểm tra vòng cổ...</Text>
      </View>
    );
  }

  if (!pet) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-6">
        <AntDesign name="close" size={60} color="#F43F5E" />
        <Text className="text-2xl font-bold text-gray-800 mt-4 text-center">Không tìm thấy</Text>
        <Text className="text-gray-500 text-center mt-2 mb-8">
          Mã QR này không hợp lệ hoặc vòng cổ chưa được đăng ký trên hệ thống.
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/')}
          className="bg-gray-100 px-8 py-3 rounded-full"
        >
          <Text className="text-gray-700 font-bold">Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isLost = pet.isLost || pet.status?.toUpperCase() === 'LOST';
  // const isLost = false;

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      <View className="absolute top-12 right-6 z-40">
        <TouchableOpacity
          onPress={() => router.push('/')}
          className="w-8 h-8 items-center justify-center"
        >
          <Image
            source={require('../../assets/icon/close.png')}
            style={{ width: 10, height: 10 }}
            resizeMode="cover"
          />
        </TouchableOpacity>
      </View>
      <View className="w-full h-20 mx-auto" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

        {/* --- 1. HERO IMAGE SECTION --- */}
        {isLost ? (
          <View className="px-5 pt-4">
            <View className="bg-white rounded-[32px] z-10"
              style={{
                shadowColor: '#E89B5A',                  // Color: 000000
                shadowOffset: { width: 4, height: 4 },   // Position: X 4, Y 4
                shadowOpacity: 0.4,                     // Opacity: 25%
                shadowRadius: 4,                        // Blur: 10
                elevation: 3,
              }}>

              <View className="relative rounded-[24px] overflow-hidden bg-gray-200 " style={{
                height: 210, shadowColor: '#000', shadowOffset: { width: 10, height: 10 },
                shadowOpacity: 0.6, shadowRadius: 15, elevation: 4,
              }}>
                <Image
                  source={{ uri: pet.image || pet.images?.[0]?.url }}
                  style={{ width: width - 20, height: 300 }}
                  resizeMode="cover"

                />
                <View className="bottom-0 left-0 right-0 h-[105px] w-full absolute rounded-2xl overflow-hidden items-center justify-center">
                  <LinearGradient
                    colors={['rgba(232, 155, 90, 0.8)', 'transparent']}
                    start={{ x: 0.5, y: 1 }} end={{ x: 0.5, y: 0 }}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                  />
                </View>

                {isLost && (
                  <View className="absolute top-5 right-5 bg-[#E89B5A] px-4 py-1 rounded-full z-10">
                    <Text className="text-white font-extrabold text-[12px] tracking-[0.5px] leading-5 uppercase">Lost</Text>
                  </View>
                )}

                <View className="absolute bottom-0 left-0 right-0 mb-4 items-center">
                  <Text
                    className="text-white text-[24px] font-bold text-center capitalize mb-3"
                  >
                    {pet?.name.toLowerCase()}
                  </Text>
                  <Text
                    className="text-white text-[12px] font-medium text-center"
                  >
                    {pet?.age || 'Unknown'} years old • {pet?.breed}
                  </Text>
                </View>
              </View>
            </View>
          </View>


        ) : (
          <View className="pt-4 px-6">
            <View className="bg-white rounded-[32px]" style={{
              shadowColor: '#000000',                  // Color: 000000
              shadowOffset: { width: 4, height: 4 },   // Position: X 4, Y 4
              shadowOpacity: 0.25,                     // Opacity: 25%
              shadowRadius: 5,                        // Blur: 10

              elevation: 3,
            }}>

              <View className="w-full h-64 rounded-[24px]  overflow-hidden shadow-lg shadow-black/10 bg-gray-100rounded-[24px] bg-gray-200" style={{ height: 210 }}>
                <Image
                  source={{ uri: pet.image || pet.images?.[0]?.url }}
                  style={{ width: width - 20, height: 300 }}
                  resizeMode="cover"
                />
              </View>
            </View>
            <View className='items-center'>
              <Text className="text-[24px] font-medium text-gray-800 py-5">Meet {pet.name}!</Text>
            </View>
          </View>
        )}

        {/* --- 2. INFORMATION BODY --- */}
        <View className="px-5">

          {isLost && pet.owner ? (
            <View className="bg-white">
              <Text className="text-[16px] font-semibold text-[#AB5C1A] my-[21px] leading-[16px]">Owner Information</Text>
              <View className="flex justify-center items-center mb-4">
                <View className='bg-white border w-full border-[#E89B5A] rounded-[16px] px-4 pt-[21px] pb-[23.15px]'>
                  <View className="space-y-5 mx-4">
                    <View className="flex-row gap-4 pb-[12.15px]">
                      <View className="justify-center mb-5">
                        <Image
                          source={require('../../assets/icon/person.png')}
                          style={{ width: 16, height: 16 }}
                          resizeMode="cover"
                        />
                      </View>
                      <View className="flex-1 justify-center -mx-1">
                        <Text className="text-[#AB5C1A] text-[16px] font-semibold leading-[16px] mb-[7px]">Owner Name</Text>
                        <Text className="text-[#8E8E93] text-[14px] font-regular leading-[16px]">{pet.owner.name}</Text>
                      </View>
                    </View>

                    {pet.owner.phone && (
                      <View className="flex-row gap-4 pb-[12.15px]">
                        <View className="justify-center mb-5">
                          <Image
                            source={require('../../assets/icon/phone.png')}
                            style={{ width: 16, height: 16 }}
                            resizeMode="cover"
                          />
                        </View>
                        <View className="flex-1 justify-center -mx-1">
                          <Text className="text-[#AB5C1A] text-[16px] font-semibold  leading-[16px] mb-[7px]">Phone Number</Text>
                          <Text className="text-[#8E8E93] text-[14px] font-regular mt leading-[16px]">{pet.owner.phone}</Text>
                        </View>
                      </View>
                    )}

                    <View className="flex-row gap-4 pb-[12.15px]">
                      <View className="justify-center mb-5">
                        <Image
                          source={require('../../assets/icon/address-marker.png')}
                          style={{ width: 18, height: 18 }}
                          resizeMode="cover"
                        />
                      </View>
                      <View className="flex-1 justify-center -mx-1">
                        <Text className="text-[#AB5C1A] text-[16px] font-semibold leading-[16px] mb-[7px]">Address</Text>
                        <Text className="text-[#8E8E93] text-[14px] ffont-regular leading-[16px]">
                          {pet.owner.address}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                <View className="flex items-center w-4/5 bg-[#FFF8F5] px-2.5 rounded-full border border-[#E89B5A] bottom-5">
                  <Text className="text-[#AB5C1A] text-[14px] font-regular leading-[20px] py-[6px]">
                    "Please contact me ASAP"
                  </Text>
                </View>
              </View>
            </View>

          ) : (
            <View className='flex justify-center items-center'>
              <View className="bg-white border border-[#D9D9D9] rounded-[16px] px-7 pt-5 pb-9">
                <View className="flex-row justify-between gap-2 mb-7">
                  <View className="w-1/2">
                    <Text className="font-medium text-[16px] mb-[12.5px]" >Gender</Text>
                    <Text className="text-[#8E8E93] font-regular text-[14px] capitalize">{pet.gender.toLowerCase() || 'Unknown'}</Text>
                  </View>
                  <View className="w-1/2">
                    <Text className="font-medium text-[16px] mb-[12.5px] ">Breed</Text>
                    <Text className="text-[#8E8E93] font-regular text-[14px]">{pet.breed}</Text>
                  </View>
                </View >
                <View className="flex-row justify-between items-center gap-2">
                  <View className="w-1/2">
                    <Text className="font-medium text-[16px] mb-[12.5px]" >Color</Text>
                    <Text className="text-[#8E8E93] font-regular text-[14px] capitalize">{pet.color.toLowerCase() || 'Unknown'}</Text>
                  </View>
                  <View className="w-1/2">
                    <Text className="font-medium text-[16px] mb-[12.5px]" >Birthday</Text>
                    <Text className="text-[#8E8E93] font-regular text-[14px]">July 12, 2020</Text>
                  </View>
                </View >
              </View>

              <View className="flex items-center w-4/5 bg-[#FAFAFA] px-2.5 py-[6px] rounded-full border border-[#D9D9D9] bottom-5" >
                <Text className="text-[#757575] text-[14px] font-regular leading-5">
                  This pet is safe and sound with their owner
                </Text>
              </View>

            </View>
          )}

          {/* --- 3. BOTTOM ACTIONS --- */}
          <View className="-mt-4 mb-5">
            {isLost ? (
              <View className="gap-3">
                <TouchableOpacity
                  onPress={handleCallOwner}
                  className="w-full bg-[#E89B5A] py-4 rounded-2xl flex-row justify-center items-center"
                >
                  <Image
                    source={require('../../assets/icon/phone-white.png')}
                    style={{ width: 16, height: 16 }}
                    resizeMode="cover"
                  />
                  <Text className="text-white font-semibold text-[16px] ml-2">Contact Owner</Text>
                </TouchableOpacity>

                {!hasReported && (
                  <TouchableOpacity
                    onPress={() => setIsModalVisible(true)}
                    className="w-full border border-[#E5E5E5] py-4 rounded-2xl flex-row justify-center items-center"
                  >
                    <Image
                      source={require('../../assets/icon/location-gray.png')}
                      style={{ width: 10, height: 14 }}
                      resizeMode="cover"
                    />
                    <Text className="text-[#8E8E93] font-medium text-[16px] leading-5 ml-2">Share My Location</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View className="bg-[#FAFAFA] w-full px-9 py-[13px] rounded-[16px] border border-[#D9D9D9] items-center mt-5">
                <Text className="text-center text-[#757575] font-regular text-[14px] leading-6 tracking-[0.5px] ">
                  For privacy, owner’s contact information is only available when a pet is marked as lost.
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={() => setIsReportVisible(true)}
            className="items-center justify-center">
            <Text className="text-center text-[#8E8E93] text-[14px] font-regular leading-13 underline">
              Something isn't right? Report here
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ReportIssueModal
        isVisible={isReportVisible}
        onClose={() => setIsReportVisible(false)}
      />

      {/* Render duy nhất Modal mới */}
      <LostModeShareModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onConfirm={handleShareLocation}
      />
    </View>
  );
}