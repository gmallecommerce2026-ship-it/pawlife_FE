// app/pet-detail-modal.tsx
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActionSheetIOS, Alert, Image, Platform, ScrollView, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/AppText';
export default function PetDetailModal() {
  const router = useRouter();
  const params = useLocalSearchParams(); 
  const insets = useSafeAreaInsets();

  // 1. Thêm id vào đối tượng pet (lấy từ params của màn hình trước đó)
  const pet = {
    id: params.id, // Đảm bảo lấy ID từ params truyền vào modal
    name: params.name || 'Max',
    age: params.age || '2 years',
    gender: params.gender || 'Male',
    breed: params.breed || 'Labrador Retriever', 
    image: params.image || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=1000&auto=format&fit=crop',
    distance: params.distance || '1.2km',
    tags: ['Playful', 'Energetic']
  };

  const handleInterest = () => {
    // 2. Phải truyền ID sang Adoption Form
    router.push({
      pathname: '/adoption-form',
      params: {
        id: pet.id, // QUAN TRỌNG: Thêm dòng này
        name: pet.name,
        age: pet.age,
        breed: pet.breed,
        image: pet.image,
      }
    });
  };

  const handleReport = () => {
    const options = ['Cancel', 'Report this post', 'Block this user'];
    const destructiveButtonIndex = [1, 2];
    const cancelButtonIndex = 0;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex, destructiveButtonIndex },
        (selectedIndex) => {
          if (selectedIndex === 1) {
            Alert.alert("Reported", "Thank you for reporting. Our team will review this content within 24 hours.");
          } else if (selectedIndex === 2) {
            Alert.alert("Blocked", "You will no longer see posts from this user.");
            router.back();
          }
        }
      );
    } else {
      Alert.alert(
        "Content Options",
        "What would you like to do?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Report Post", onPress: () => Alert.alert("Reported") },
          { text: "Block User", onPress: () => { router.back(); } }
        ]
      );
    }
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <StatusBar style="dark" />

      {/* --- NEW HEADER: Phù hợp với slide_from_right --- */}
      <View className="flex-row justify-between items-center px-6 py-3">
        <TouchableOpacity 
          onPress={() => router.back()} 
          className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center border border-gray-100"
        >
          <Feather name="chevron-left" size={24} color="#374151" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={handleReport} 
          className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center border border-gray-100"
        >
          <MaterialCommunityIcons name="dots-horizontal" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6 pt-2" showsVerticalScrollIndicator={false}>
        
        {/* --- TÊN & TAGS --- */}
        <View className="flex-row items-center gap-3 mb-2 flex-wrap">
            <Text className="text-4xl font-bold text-gray-900 tracking-tight">{pet.name}</Text>
            {pet.tags.map((tag, index) => (
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
                source={{ uri: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?q=80&w=200&auto=format&fit=crop' }} 
                className="w-12 h-12 rounded-full mr-3 border border-gray-200"
            />
            <View className="flex-1">
                <View className="flex-row items-center justify-between">
                     <Text className="font-bold text-gray-900 text-base" numberOfLines={1}>Happy Paws Rescue Center</Text>
                </View>
                <View className="flex-row items-center mt-1">
                    <Ionicons name="location-outline" size={14} color="#9CA3AF" />
                    <Text className="text-gray-500 text-xs ml-1 flex-1" numberOfLines={1}>
                      {pet.distance} • 123 Rescue Street, SF, CA
                    </Text>
                </View>
            </View>
        </View>

        {/* --- SECTIONS --- */}
        <View className="space-y-6 mb-8">
            <View>
                <Text className="text-lg font-bold text-gray-900 mb-2">About {pet.name}</Text>
                <Text className="text-gray-500 leading-6 text-[15px]">
                    {pet.name} is a wonderful {pet.breed} looking for a loving home. He is playful, energetic, and friendly.
                </Text>
            </View>

            <View>
                <Text className="text-lg font-bold text-gray-900 mb-2">Personality Traits</Text>
                <Text className="text-gray-500 leading-6 text-[15px]">
                    {pet.name} is known for being playful, energetic, friendly. They love spending time with their human companions.
                </Text>
            </View>

            <View>
                <Text className="text-lg font-bold text-gray-900 mb-2">Ideal Home</Text>
                <Text className="text-gray-500 leading-6 text-[15px]">
                    The perfect home for {pet.name} would be one with plenty of love and attention.
                </Text>
            </View>
        </View>

        {/* --- FOOTER ACTION --- */}
        <View className="pb-10 pt-2 items-center">
            <TouchableOpacity 
                className="w-full bg-[#F99C2E] py-4 rounded-full shadow-lg shadow-orange-200 items-center"
                activeOpacity={0.8}
                onPress={handleInterest} 
            >
                <Text className="text-white font-bold text-lg">I'm Interested</Text>
            </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}