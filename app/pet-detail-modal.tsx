// app/pet-detail-modal.tsx
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActionSheetIOS, ActivityIndicator, Alert, Image, Platform, ScrollView, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/AppText';
import { petService } from '../services/petService'; // Import petService

export default function PetDetailModal() {
  const router = useRouter();
  const params = useLocalSearchParams(); 
  const insets = useSafeAreaInsets();

  // State lưu trữ dữ liệu chi tiết gọi từ API
  const [fullPetData, setFullPetData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPetDetail = async () => {
      if (!params.id) return;
      try {
        const res = await petService.getPetById(params.id as string);
        setFullPetData(res.data || res);
      } catch (error) {
        console.error("Lỗi tải chi tiết thú cưng:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPetDetail();
  }, [params.id]);
  const rawPersonalityTags = fullPetData?.personalityTags || [];
  const safeTagsArray = Array.isArray(rawPersonalityTags) ? rawPersonalityTags : [];
  // Merge dữ liệu params truyền sang và dữ liệu lấy từ API
  const pet = {
    id: params.id, 
    name: params.name || fullPetData?.name || 'Thú cưng',
    age: params.age || fullPetData?.age || 'Đang cập nhật',
    gender: params.gender || fullPetData?.gender || 'Unknown',
    breed: params.breed || fullPetData?.breed || 'Đang cập nhật', 
    image: params.image || fullPetData?.images?.[0]?.url || 'https://via.placeholder.com/400x600?text=No+Image',
    distance: params.distance || fullPetData?.distance || 'Gần bạn',
    tags: safeTagsArray.length > 0 ? safeTagsArray : ['Chưa có tag'],
    description: fullPetData?.description || 'Chưa có thông tin mô tả chi tiết.',
    traits: fullPetData?.traits || 'Chưa cập nhật đặc điểm tính cách.',
    idealHome: fullPetData?.idealHome || 'Vui lòng liên hệ trạm cứu hộ để biết thêm chi tiết.',
    shelter: fullPetData?.shelter || null
  };

  const handleInterest = () => {
    router.push({
      pathname: '/adoption-form',
      params: {
        id: pet.id,
        name: pet.name,
        age: pet.age,
        breed: pet.breed,
        image: pet.image,
      }
    });
  };

  const handleReport = () => {
    // ... Giữ nguyên logic handleReport cũ
    const options = ['Cancel', 'Report this post', 'Block this user'];
    const destructiveButtonIndex = [1, 2];
    const cancelButtonIndex = 0;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex, destructiveButtonIndex },
        (selectedIndex) => {
          if (selectedIndex === 1) Alert.alert("Reported", "Thank you for reporting.");
          else if (selectedIndex === 2) { Alert.alert("Blocked"); router.back(); }
        }
      );
    } else {
      Alert.alert("Content Options", "What would you like to do?", [
        { text: "Cancel", style: "cancel" },
        { text: "Report Post", onPress: () => Alert.alert("Reported") },
        { text: "Block User", onPress: () => router.back() }
      ]);
    }
  };

  const shelterName = pet.shelter?.name || 'Trạm cứu hộ chưa cập nhật';
  const shelterAddress = pet.shelter?.address || 'Địa chỉ chưa cập nhật';
  const shelterAvatar = pet.shelter?.avatarUrl || pet.shelter?.coverUrl || 'https://via.placeholder.com/150';

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <StatusBar style="dark" />

      <View className="flex-row justify-between items-center px-6 py-3">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center border border-gray-100">
          <Feather name="chevron-left" size={24} color="#374151" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleReport} className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center border border-gray-100">
          <MaterialCommunityIcons name="dots-horizontal" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6 pt-2" showsVerticalScrollIndicator={false}>
        
        {/* --- TÊN & TAGS --- */}
        <View className="flex-row items-center gap-3 mb-2 flex-wrap">
            <Text className="text-4xl font-bold text-gray-900 tracking-tight">{pet.name}</Text>
            {isLoading ? <ActivityIndicator size="small" color="#F97316" /> : pet.tags.map((tag: string, index: number) => (
                <View key={index} className="bg-orange-100 px-3 py-1 rounded-full border border-orange-200 mt-1">
                    <Text className="text-orange-500 text-[10px] font-bold uppercase tracking-wide">{tag}</Text>
                </View>
            ))}
        </View>

        {/* --- SUB INFO --- */}
        <View className="flex-row items-center gap-2 mb-6">
            <Feather name="calendar" size={14} color="#6B7280" />
            <Text className="text-gray-500 text-sm font-medium">{pet.age}</Text>
            <Text className="text-gray-300">•</Text>
            <Text className="text-gray-500 text-sm font-medium capitalize">{pet.gender}</Text>
            <Text className="text-gray-300">•</Text>
            <Text className="text-gray-500 text-sm font-medium">{pet.breed}</Text>
        </View>

        {/* --- SHELTER INFO --- */}
        <View className="flex-row items-center mb-8 bg-gray-50 p-3 rounded-2xl border border-gray-100">
            <Image 
                source={{ uri: shelterAvatar }} 
                className="w-12 h-12 rounded-full mr-3 border border-gray-200 bg-gray-200"
            />
            <View className="flex-1">
                <View className="flex-row items-center justify-between">
                     <Text className="font-bold text-gray-900 text-base" numberOfLines={1}>{shelterName}</Text>
                </View>
                <View className="flex-row items-center mt-1">
                    <Ionicons name="location-outline" size={14} color="#9CA3AF" />
                    <Text className="text-gray-500 text-xs ml-1 flex-1" numberOfLines={1}>
                      {pet.distance} • {shelterAddress}
                    </Text>
                </View>
            </View>
        </View>

        {/* --- SECTIONS --- */}
        <View className="space-y-6 mb-8">
            <View>
                <Text className="text-lg font-bold text-gray-900 mb-2">Về {pet.name}</Text>
                <Text className="text-gray-500 leading-6 text-[15px]">{pet.description}</Text>
            </View>

            <View>
                <Text className="text-lg font-bold text-gray-900 mb-2">Đặc điểm tính cách</Text>
                <Text className="text-gray-500 leading-6 text-[15px]">{pet.traits}</Text>
            </View>

            <View>
                <Text className="text-lg font-bold text-gray-900 mb-2">Ngôi nhà lý tưởng</Text>
                <Text className="text-gray-500 leading-6 text-[15px]">{pet.idealHome}</Text>
            </View>
        </View>

        {/* --- FOOTER ACTION --- */}
        <View className="pb-10 pt-2 items-center">
            <TouchableOpacity 
                className="w-full bg-[#F99C2E] py-4 rounded-full shadow-lg shadow-orange-200 items-center"
                activeOpacity={0.8}
                onPress={handleInterest} 
            >
                <Text className="text-white font-bold text-lg">Tôi muốn nhận nuôi</Text>
            </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}