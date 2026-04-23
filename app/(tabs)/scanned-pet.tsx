import axiosClient from '@/api/axiosClient';
import { Text } from '@/components/AppText';
import { AntDesign, Feather, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  TouchableOpacity,
  View
} from 'react-native';

import LostModeShareModal, { FormData } from '@/components/LostModeShareModal';

export default function ScannedPetScreen() {
  const router = useRouter();
  const { tagId } = useLocalSearchParams(); 
  
  const [pet, setPet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [hasReported, setHasReported] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      
      <View className="absolute top-12 right-6 z-40">
        <TouchableOpacity 
          onPress={() => router.push('/')}
          className="w-8 h-8 bg-white/50 rounded-full items-center justify-center backdrop-blur-md shadow-sm"
        >
          <AntDesign name="close" size={20} color="#374151" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        
        {/* --- 1. HERO IMAGE SECTION --- */}
        {isLost ? (
           <View className="relative w-full h-[400px]">
              <Image source={{ uri: pet.image || pet.images?.[0]?.url }} className="w-full h-full" resizeMode="cover" />
              <View className="absolute inset-0 bg-black/20" />
              <View className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
              <View className="absolute top-14 left-6 bg-[#F97316] px-4 py-2 rounded-full border-2 border-white shadow-sm">
                <Text className="text-white font-extrabold text-xs uppercase tracking-wider">LOST PET</Text>
              </View>
              <View className="absolute bottom-8 w-full items-center">
                <Text className="text-white text-4xl font-extrabold uppercase tracking-tight shadow-md">{pet.name}</Text>
                <Text className="text-white/90 text-sm font-medium mt-1">{pet.breed}</Text>
              </View>
           </View>
        ) : (
            <View className="items-center pt-16 px-6">
                <View className="w-full h-64 rounded-[32px] overflow-hidden shadow-lg shadow-black/10 bg-gray-100">
                    <Image source={{ uri: pet.image || pet.images?.[0]?.url }} className="w-full h-full" resizeMode="cover" />
                </View>
                <Text className="text-2xl font-bold text-gray-800 mt-6">Meet {pet.name}!</Text>
                <Text className="text-gray-500 text-sm mt-1">This pet is safe and sound with their owner</Text>
            </View>
        )}

        {/* --- 2. INFORMATION BODY --- */}
        <View className="px-5 mt-6">
            
            {isLost && pet.owner ? (
                <View className="bg-white border border-orange-100 rounded-[24px] p-5 shadow-sm shadow-orange-100">
                    <View className="flex-row items-center gap-2 mb-6">
                        <Feather name="user" size={20} color="#ffa053" />
                        <Text className="text-gray-600 font-medium text-lg">Owner Contact Information</Text>
                    </View>

                    <View className="space-y-5">
                      <View className="flex-row gap-4">
                          <View className="w-10 h-10 bg-orange-50 rounded-full items-center justify-center overflow-hidden">
                              {pet.owner.avatarUrl ? (
                                <Image source={{ uri: pet.owner.avatarUrl }} className="w-full h-full" />
                              ) : (
                                <Feather name="user" size={18} color="#ffa053" />
                              )}
                          </View>
                          <View className="flex-1 justify-center">
                              <Text className="text-orange-400 text-xs font-medium">Owner Name</Text>
                              <Text className="text-gray-700 text-base font-medium mt-0.5">{pet.owner.name}</Text>
                          </View>
                      </View>

                      {pet.owner.address && pet.owner.address !== 'Chưa cập nhật địa chỉ' && (
                        <View className="flex-row gap-4">
                            <View className="w-10 h-10 bg-orange-50 rounded-full items-center justify-center">
                                <Ionicons name="location-outline" size={20} color="#ffa053" />
                            </View>
                            <View className="flex-1 justify-center">
                                <Text className="text-orange-400 text-xs font-medium">Address</Text>
                                <Text className="text-gray-700 text-base font-medium mt-0.5 leading-6">
                                    {pet.owner.address}
                                </Text>
                            </View>
                        </View>
                      )}

                      {pet.owner.phone && (
                        <View className="flex-row gap-4">
                            <View className="w-10 h-10 bg-orange-50 rounded-full items-center justify-center">
                                <Feather name="phone" size={18} color="#ffa053" />
                            </View>
                            <View className="flex-1 justify-center">
                                <Text className="text-orange-400 text-xs font-medium">Phone Number</Text>
                                <Text className="text-gray-700 text-base font-medium mt-0.5">{pet.owner.phone}</Text>
                            </View>
                        </View>
                      )}
                  </View>
                </View>
            ) : (
                <View className="bg-white border border-gray-100 rounded-[24px] p-6 shadow-sm">
                     <View className="flex-row items-center gap-2 mb-6">
                        <Feather name="info" size={20} color="#4B5563" />
                        <Text className="text-gray-800 font-bold text-lg">Pet Information</Text>
                    </View>
                    <View className="space-y-4">
                        <View className="flex-row justify-between border-b border-gray-50 pb-3">
                            <Text className="text-gray-400 font-medium">Name</Text>
                            <Text className="text-blue-500 font-semibold">{pet.name}</Text>
                        </View>
                        <View className="flex-row justify-between border-b border-gray-50 pb-3">
                            <Text className="text-gray-400 font-medium">Gender</Text>
                            <Text className="text-gray-700 font-semibold capitalize">{pet.gender?.toLowerCase() || 'Unknown'}</Text>
                        </View>
                         <View className="flex-row justify-between border-b border-gray-50 pb-3">
                            <Text className="text-gray-400 font-medium">Breed</Text>
                            <Text className="text-gray-700 font-semibold">{pet.breed}</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* --- 3. BOTTOM ACTIONS --- */}
            <View className="mt-6">
                {isLost ? (
                    <View className="gap-4">
                        <TouchableOpacity 
                          onPress={handleCallOwner}
                          className="w-full bg-[#FF9C56] py-4 rounded-2xl flex-row justify-center items-center shadow-md shadow-orange-300"
                        >
                             <Feather name="phone-call" size={20} color="white" />
                             <Text className="text-white font-bold text-lg ml-2">Contact Owner</Text>
                        </TouchableOpacity>

                        {!hasReported && (
                          <TouchableOpacity 
                            onPress={() => setIsModalVisible(true)}
                            className="w-full bg-gray-100 py-4 rounded-2xl flex-row justify-center items-center"
                          >
                               <Ionicons name="location" size={20} color="#4B5563" />
                               <Text className="text-gray-700 font-bold text-base ml-2">Gửi kèm lời nhắn & SĐT</Text>
                          </TouchableOpacity>
                        )}
                    </View>
                ) : (
                     <View className="bg-gray-50 p-6 rounded-[24px] items-center">
                        <Text className="text-center text-gray-500 text-xs leading-5">
                            Vì lý do bảo mật, thông tin chủ nhân chỉ hiển thị khi thú cưng được đánh dấu là đi lạc.
                        </Text>
                     </View>
                )}
            </View>

        </View>
      </ScrollView>

      {/* Render duy nhất Modal mới */}
      <LostModeShareModal 
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onConfirm={handleShareLocation}
      />
    </View>
  );
}