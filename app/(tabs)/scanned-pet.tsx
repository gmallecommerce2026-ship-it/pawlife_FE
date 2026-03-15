// app/scanned-pet.tsx
import axiosClient from '@/api/axiosClient';
import { Text } from '@/components/AppText';
import { AntDesign, Feather, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, TouchableOpacity, View } from 'react-native';
export default function ScannedPetScreen() {
  const router = useRouter();
  // Lấy tagId (mã vòng cổ) từ trang Scan gửi sang
  const { tagId } = useLocalSearchParams(); 
  
  // State quản lý dữ liệu và trạng thái tải
  const [pet, setPet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPetData = async () => {
      try {
        setLoading(true);
        // Gọi API backend NestJS: GET /tags/:tagId/scan
        const response = await axiosClient.get(`/tags/${tagId}/scan`);
        setPet(response.data);
      } catch (error: any) {
        // Kiểm tra xem lỗi có phải do Axios trả về 404 Not Found không
        if (error.response && error.response.status === 404) {
           console.log(`Mã QR [${tagId}] không tồn tại trong hệ thống.`);
        } else {
           // Các lỗi khác như sập server (500), mất mạng, v.v. mới in ra lỗi đỏ
           console.error("Lỗi hệ thống khi tải dữ liệu QR:", error);
        }
        setPet(null); // Gán null để UI hiển thị màn hình "Không tìm thấy"
      } finally {
        setLoading(false);
      }
    };

    if (tagId) {
      fetchPetData();
    } else {
      setLoading(false);
    }
  }, [tagId]);

  // Giao diện khi đang tải dữ liệu
  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#ffa053" />
        <Text className="text-gray-500 font-medium mt-4">Đang kiểm tra vòng cổ...</Text>
      </View>
    );
  }

  // Giao diện khi mã QR không hợp lệ hoặc lỗi
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

  const isLost = pet.status === 'lost';

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      
      {/* --- HEADER CONTROLS (Close Button) --- */}
      <View className="absolute top-12 right-6 z-50">
        <TouchableOpacity 
          onPress={() => router.push('/')}
          className="w-8 h-8 bg-white/50 rounded-full items-center justify-center backdrop-blur-md shadow-sm"
        >
          <AntDesign name="close" size={20} color="#374151" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* --- 1. HERO IMAGE SECTION --- */}
        {isLost ? (
           // === LAYOUT FOR LOST PET ===
           <View className="relative w-full h-[400px]">
              <Image source={{ uri: pet.image }} className="w-full h-full" resizeMode="cover" />
              
              {/* Gradient Overlay để text dễ đọc */}
              <View className="absolute inset-0 bg-black/20" />
              <View className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-black/60 to-transparent" />

              {/* Badge LOST DOG / LOST CAT */}
              <View className="absolute top-14 left-6 bg-[#F97316] px-4 py-2 rounded-full border-2 border-white shadow-sm">
                <Text className="text-white font-extrabold text-xs uppercase tracking-wider">LOST PET</Text>
              </View>

              {/* Pet Info Overlay */}
              <View className="absolute bottom-8 w-full items-center">
                <Text className="text-white text-4xl font-extrabold uppercase tracking-tight shadow-md">{pet.name}</Text>
                <Text className="text-white/90 text-sm font-medium mt-1">{pet.breed}</Text>
              </View>
           </View>
        ) : (
            // === LAYOUT FOR SAFE PET ===
            <View className="items-center pt-16 px-6">
                <View className="w-full h-64 rounded-[32px] overflow-hidden shadow-lg shadow-black/10 bg-gray-100">
                    <Image source={{ uri: pet.image }} className="w-full h-full" resizeMode="cover" />
                </View>
                <Text className="text-2xl font-bold text-gray-800 mt-6">Meet {pet.name}!</Text>
                <Text className="text-gray-500 text-sm mt-1">This pet is safe and sound with their owner</Text>
            </View>
        )}

        {/* --- 2. INFORMATION BODY --- */}
        <View className="px-5 mt-6">
            
            {/* CARD: Owner Info (HIỂN THỊ KHI ĐI LẠC) */}
            {isLost && pet.owner ? (
                <View className="bg-white border border-orange-100 rounded-[24px] p-5 shadow-sm shadow-orange-100">
                    <View className="flex-row items-center gap-2 mb-6">
                        <Feather name="user" size={20} color="#ffa053" />
                        <Text className="text-gray-600 font-medium text-lg">Owner Contact Information</Text>
                    </View>

                    {/* Info Rows */}
                    <View className="space-y-5">
                        <View className="flex-row gap-4">
                            <View className="w-10 h-10 bg-orange-50 rounded-full items-center justify-center">
                                <Feather name="user" size={18} color="#ffa053" />
                            </View>
                            <View>
                                <Text className="text-orange-400 text-xs font-medium">Owner Name</Text>
                                <Text className="text-gray-700 text-base font-medium mt-0.5">{pet.owner.name}</Text>
                            </View>
                        </View>

                        <View className="flex-row gap-4">
                            <View className="w-10 h-10 bg-orange-50 rounded-full items-center justify-center">
                                <Ionicons name="location-outline" size={20} color="#ffa053" />
                            </View>
                            <View>
                                <Text className="text-orange-400 text-xs font-medium">Address</Text>
                                <Text className="text-gray-700 text-base font-medium mt-0.5 w-64">{pet.owner.address}</Text>
                            </View>
                        </View>

                        <View className="flex-row gap-4">
                            <View className="w-10 h-10 bg-orange-50 rounded-full items-center justify-center">
                                <Feather name="phone" size={18} color="#ffa053" />
                            </View>
                            <View>
                                <Text className="text-orange-400 text-xs font-medium">Phone Number</Text>
                                <Text className="text-gray-700 text-base font-medium mt-0.5">{pet.owner.phone}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Alert Box */}
                    <View className="mt-6 bg-[#FFF1F2] border border-red-100 rounded-2xl p-4 flex-row items-center">
                        <AntDesign name="heart" size={14} color="#F43F5E" />
                        <Text className="ml-2 text-gray-700 text-xs flex-1">
                            Please contact <Text className="font-bold text-gray-900">{pet.owner.name}</Text> ASAP
                        </Text>
                    </View>
                </View>
            ) : (
                // CARD: Pet Info (HIỂN THỊ KHI AN TOÀN)
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
                            <Text className="text-gray-700 font-semibold capitalize">{pet.gender}</Text>
                        </View>
                         <View className="flex-row justify-between border-b border-gray-50 pb-3">
                            <Text className="text-gray-400 font-medium">Breed</Text>
                            <Text className="text-gray-700 font-semibold">{pet.breed}</Text>
                        </View>
                         <View className="flex-row justify-between pb-1">
                            <Text className="text-gray-400 font-medium">Color</Text>
                            <Text className="text-gray-700 font-semibold">{pet.color}</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* --- 3. BOTTOM ACTIONS --- */}
            <View className="mt-6">
                {isLost ? (
                    <View className="gap-3">
                        <TouchableOpacity className="w-full bg-[#FF9C56] py-4 rounded-2xl flex-row justify-center items-center shadow-md shadow-orange-300">
                             <Feather name="phone-call" size={20} color="white" />
                             <Text className="text-white font-bold text-lg ml-2">Contact Owner</Text>
                        </TouchableOpacity>

                         <TouchableOpacity className="w-full bg-white border border-gray-200 py-4 rounded-2xl flex-row justify-center items-center">
                             <Ionicons name="location-outline" size={20} color="#4B5563" />
                             <Text className="text-gray-700 font-bold text-base ml-2">Share My Location</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                     <View className="bg-gray-50 p-6 rounded-[24px] items-center">
                        <Text className="text-center text-gray-500 text-xs leading-5">
                            For privacy, owner contact information is only shown when a pet is marked as lost.
                        </Text>
                     </View>
                )}
            </View>

        </View>
      </ScrollView>
    </View>
  );
}