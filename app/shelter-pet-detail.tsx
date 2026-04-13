import { Text } from '@/components/AppText';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { petService } from '../services/petService';

export default function PetProfileDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const petId = params.id as string;
  
  const [petData, setPetData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- FETCH DATA TỪ API ---
  useFocusEffect(
    useCallback(() => {
      const fetchPetDetail = async () => {
        if (!petId) return;
        try {
          setIsLoading(true);
          const data = await petService.getPetById(petId);
          setPetData(data);
        } catch (error) {
          console.error("Lỗi khi tải thông tin thú cưng:", error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchPetDetail();
    }, [petId]) 
  );

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#F2A465" />
      </View>
    );
  }

  // Fallback data hardcode y hệt thiết kế 
  const displayImage = petData?.avatarUrl || 'https://images.unsplash.com/photo-1600804340584-c7db2eacf0bf?q=80&w=800&auto=format&fit=crop';
  const displayName = petData?.name || 'Max';
  const displayBreed = petData?.breed || 'Labrador Retriever';
  const handleAdopt = () => {
    router.push({
      pathname: '/adoption-form',
      params: {
        id: petId,
        name: displayName,
        breed: displayBreed,
        image: displayImage,
        age: petData?.age || 'Young', // Lấy tuổi nếu có, không thì để default
      }
    });
  };
  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      <SafeAreaView className="flex-1" edges={['top']}>
        
        {/* --- HEADER --- */}
        <View className="flex-row items-center justify-between px-5 pt-2 pb-3 bg-white">
            <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
                <Feather name="chevron-left" size={24} color="#1C1C1E" />
            </TouchableOpacity>
            <Text className="text-[24px] font-semibold text-[#1C1C1E]">Pet Detail</Text>
            <TouchableOpacity className="p-2 -mr-2">
                <Feather name="share-2" size={20} color="#1C1C1E" />
            </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            
            {/* --- HERO IMAGE --- */}
            <View className="px-[25px] mt-[19px]">
                <Image 
                    source={{ uri: displayImage }} 
                    className="w-full h-[267px] rounded-[28px]"
                    resizeMode="cover"
                />
            </View>

            {/* --- NAME & LOCATION --- */}
            <View className="px-[25px] mt-[19px]">
                <View className="flex-row items-baseline">
                    <Text className="text-[24px] font-semibold text-[#1C1C1E]">{displayName}</Text>
                    <Text className="text-[16px] text-[#8E8E93] ml-2 font-regular mb-[2px]">({displayBreed})</Text>
                </View>
                
                <View className="flex-row items-center mt-1.5">
                    <Feather name="map-pin" size={14} color="#F2A465" />
                    <Text className="text-[12px] text-[#8E8E93] ml-1.5 font-regular">1.2 km away</Text>
                </View>
            </View>

            {/* --- STATS BADGES --- */}
            <View className="px-[25px] flex-row justify-between mt-6 gap-[10px]">
                <View className="flex-1 bg-[#EAF4FB] py-[12px] rounded-[16px] items-center">
                    <Text className="text-[#8E8E93] text-[12px] font-regular mb-1">Gender</Text>
                    <Text className="text-[#1C1C1E] text-[14px] font-semibold">Male</Text>
                </View>
                <View className="flex-1 bg-[#FCF8D6] py-[12px] rounded-[16px] items-center">
                    <Text className="text-[#8E8E93] text-[12px] font-regular mb-1">Age</Text>
                    <Text className="text-[#1C1C1E] text-[14px] font-semibold">Young</Text>
                </View>
                <View className="flex-1 bg-[#FAE8ED] py-[12px] rounded-[16px] items-center">
                    <Text className="text-[#8E8E93] text-[12px] font-regular mb-1">Size</Text>
                    <Text className="text-[#1C1C1E] text-[14px] font-semibold">Large</Text>
                </View>
            </View>

            {/* --- SHELTER INFO --- */}
            <View className="px-[25px] mt-[30px] flex-row items-center justify-between">
                <View className="flex-row items-center">
                    <View className="w-[46px] h-[46px] rounded-full border border-gray-200 overflow-hidden items-center justify-center bg-white shadow-sm shadow-gray-100">
                        {/* Fake logo matching screenshot style */}
                        <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3592/3592182.png' }} className="w-[28px] h-[28px] opacity-80" resizeMode="contain" />
                    </View>
                    <View className="ml-3">
                        <Text className="text-[15px] font-medium text-[#1C1C1E]">San Nha Nhieu Cho</Text>
                        <Text className="text-[13px] text-[#8E8E93] font-normal mt-0.5">Hanoi, Vietnam</Text>
                    </View>
                </View>
                <TouchableOpacity>
                  <Feather name="chevron-right" size={20} color="#1C1C1E" />
                </TouchableOpacity>
            </View>

            {/* --- ABOUT SECTION --- */}
            <View className="px-[25px] mt-[30px]">
                <Text className="text-[17px] font-medium text-[#1C1C1E] mb-[12px]">About {displayName}</Text>
                <Text className="text-[14px] text-[#8E8E93] leading-[22px] font-normal">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec a efficitur lorem, a vulputate odio. Vestibulum gravida commodo turpis sed finibus. Quisque vel porttitor quam
                </Text>
                
                <View className="flex-row gap-2 mt-[9px]">
                    <View className="bg-[#FFF4E8] px-3.5 py-1 rounded-full">
                        <Text className="text-[#F3B27B] text-[12px] font-medium">Playful</Text>
                    </View>
                    <View className="bg-[#EBF4FE] px-3.5 py-1 rounded-full">
                        <Text className="text-[#88B2F3] text-[12px] font-medium">Clingy</Text>
                    </View>
                    <View className="bg-[#EAF8EF] px-3.5 py-1 rounded-full">
                        <Text className="text-[#8FD49D] text-[12px] font-medium">Friendly</Text>
                    </View>
                </View>
            </View>

            {/* --- IDEAL HOME SECTION --- */}
            <View className="px-[25px] mt-[21px] mb-2">
                <Text className="text-[17px] font-medium text-[#1C1C1E] mb-[12px]">Ideal Home</Text>
                <Text className="text-[14px] text-[#8E8E93] leading-[22px] font-normal">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec a efficitur lorem, a vulputate odio. Vestibulum gravida commodo turpis sed finibus. Quisque vel porttitor quam
                </Text>
            </View>

        </ScrollView>

        {/* --- BOTTOM ACTION BAR --- */}
        <View className="px-[25px] pt-3 pb-6 bg-white flex-row items-center gap-4 border-t border-gray-100">
            <TouchableOpacity className="w-[56px] h-[56px] rounded-full border border-[#E5E5EA] items-center justify-center bg-white">
                <Feather name="heart" size={24} color="#F2A465" />
            </TouchableOpacity>

            {/* --- SỬA LẠI NÚT NÀY THÊM onPress --- */}
            <TouchableOpacity 
                className="flex-1 bg-[#F2A465] h-[56px] rounded-full items-center justify-center"
                activeOpacity={0.8}
                onPress={handleAdopt}
            >
                <Text className="text-white font-semibold text-[16px]">Apply to Adopt</Text>
            </TouchableOpacity>
        </View>

      </SafeAreaView>
    </View>
  );
}