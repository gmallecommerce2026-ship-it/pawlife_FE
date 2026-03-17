// app/(tabs)/scanned-pet.tsx
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
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// Import hook lấy vị trí 
import { useLocation } from '../../hooks/useLocation';

export default function ScannedPetScreen() {
  const router = useRouter();
  const { tagId } = useLocalSearchParams(); 
  const { location, errorMsg } = useLocation();

  const [pet, setPet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // State quản lý Modal và form
  const [showModal, setShowModal] = useState(false);
  const [hasReported, setHasReported] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    scannedBy: '',
    phoneNumber: '',
    message: ''
  });

  useEffect(() => {
    const fetchPetData = async () => {
      try {
        setLoading(true);
        const response = await axiosClient.get(`/tags/${tagId}/scan`);
        const petData = response.data;
        setPet(petData);

        // Lấy cờ isLost từ Backend (đã xử lý ở service trả về) hoặc dự phòng check status
        const isPetLost = petData.isLost || petData.status?.toUpperCase() === 'LOST';

        // Nếu thú cưng đang đi lạc, tự động hiện form báo cáo sau khi load xong 0.5s
        if (isPetLost) {
          setTimeout(() => {
            setShowModal(true);
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

  const handleSendReport = async (isSkipped = false) => {
    if (!isSkipped && !formData.phoneNumber) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập số điện thoại để chủ thú cưng có thể liên hệ với bạn.');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalTagId = Array.isArray(tagId) ? tagId[0] : tagId;
      const lat = location?.lat || null;
      const lng = location?.lng || null;

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
      
      if (!isSkipped) {
        Alert.alert(
          'Thành công', 
          'Đã gửi thông báo cùng vị trí GPS của bạn đến ứng dụng của chủ thú cưng!',
          [{ text: 'Đóng' }]
        );
      }
      
      setHasReported(true);
      setShowModal(false);
      setFormData({ scannedBy: '', phoneNumber: '', message: '' });
    } catch (error: any) {
      if (!isSkipped) {
        const errorData = error.response?.data;
        const serverMsg = errorData?.message;
        const displayMsg = Array.isArray(serverMsg) ? serverMsg.join('\n') : serverMsg;
        Alert.alert('Gửi thất bại', displayMsg || 'Không thể gửi thông báo. Vui lòng thử lại sau.');
      } else {
        setShowModal(false);
      }
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

  // Cập nhật lấy biến isLost đồng bộ với API trả về
  const isLost = pet.isLost || pet.status?.toUpperCase() === 'LOST';

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      
      {/* --- HEADER CONTROLS --- */}
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
            
            {/* CARD: Owner Info */}
            {isLost && pet.owner ? (
                <View className="bg-white border border-orange-100 rounded-[24px] p-5 shadow-sm shadow-orange-100">
                    <View className="flex-row items-center gap-2 mb-6">
                        <Feather name="user" size={20} color="#ffa053" />
                        <Text className="text-gray-600 font-medium text-lg">Owner Contact Information</Text>
                    </View>

                    <View className="space-y-5">
                      {/* Tên chủ nhân */}
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

                      {/* ĐỊA CHỈ (Thêm lại đoạn này) */}
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

                      {/* Số điện thoại */}
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
                      
                      {/* Ghi chú: Đã xóa phần Address vì User Schema không có trường address */}
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
                            onPress={() => setShowModal(true)}
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

      {/* --- MODAL --- */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => handleSendReport(true)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end bg-black/60"
        >
          <View className="bg-white rounded-t-[32px] p-6 pb-10 shadow-lg">
            
            <View className="items-center mb-5">
              <View className="w-12 h-1.5 bg-gray-200 rounded-full mb-4" />
              <View className="w-12 h-12 bg-red-100 rounded-full items-center justify-center mb-3">
                <Ionicons name="warning" size={24} color="#EF4444" />
              </View>
              <Text className="text-xl font-black text-gray-900 text-center">Bé đang đi lạc!</Text>
              <Text className="text-gray-500 text-sm text-center mt-2 leading-5">
                Vui lòng nhập SĐT để chủ nhân dễ dàng liên hệ với bạn. Nếu bạn bấm "Bỏ qua", chúng tôi vẫn sẽ gửi vị trí ẩn danh.
              </Text>
            </View>

            <View className="space-y-3 mb-6">
              <TextInput
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-800"
                  placeholder="Tên của bạn (Không bắt buộc)"
                  placeholderTextColor="#9CA3AF"
                  value={formData.scannedBy}
                  onChangeText={(text) => setFormData({...formData, scannedBy: text})}
              />
              <TextInput
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-800"
                  placeholder="Số điện thoại của bạn *"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  value={formData.phoneNumber}
                  onChangeText={(text) => setFormData({...formData, phoneNumber: text})}
              />
              <TextInput
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-800 h-20"
                  placeholder="Lời nhắn cho chủ nhân..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  textAlignVertical="top"
                  value={formData.message}
                  onChangeText={(text) => setFormData({...formData, message: text})}
              />
            </View>

            <TouchableOpacity 
              onPress={() => handleSendReport(false)}
              disabled={isSubmitting || !location}
              className={`w-full py-4 rounded-full flex-row justify-center items-center mb-3 ${
                (isSubmitting || !location) ? 'bg-gray-400' : 'bg-gray-900'
              }`}
            >
              {isSubmitting ? (
                 <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">
                  {location ? 'Gửi cho chủ nhân' : 'Đang lấy tọa độ...'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => handleSendReport(true)}
              disabled={isSubmitting}
              className="w-full py-3 rounded-full justify-center items-center"
            >
              <Text className="text-gray-500 font-bold text-sm">Bỏ qua (Chỉ báo vị trí ẩn danh)</Text>
            </TouchableOpacity>
            
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}