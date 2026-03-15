// app/shelter-pet-detail.tsx
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { petService } from '../services/petService';

import { Text } from '@/components/AppText';
export default function ShelterPetDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const petId = params.id as string;

  const [petData, setPetData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPetDetail = async () => {
      if (!petId) return;
      try {
        setIsLoading(true);
        const data = await petService.getPetById(petId);
        setPetData(data);
      } catch (error) {
        console.error("Error loading pet information:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPetDetail();
  }, [petId]);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#FAFAFA]">
        <ActivityIndicator size="large" color="#ffa053" />
        <Text className="mt-4 text-gray-500">Loading pet profile...</Text>
      </View>
    );
  }

  if (!petData) {
    return (
      <View className="flex-1 justify-center items-center bg-[#FAFAFA]">
        <MaterialCommunityIcons name="paw-off" size={64} color="#E5E7EB" />
        <Text className="text-gray-800 text-lg font-bold mt-4">Information not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-6 bg-orange-100 px-6 py-2 rounded-full">
          <Text className="text-orange-600 font-bold">Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const shelterInfo = petData.shelter || {};

  const InfoRow = ({ label1, value1, label2, value2 }: any) => (
    <View className="flex-row justify-between mb-5">
      <View className="flex-1">
        <Text className="text-gray-400 text-xs font-medium mb-1">{label1}</Text>
        <Text className="text-gray-800 text-sm font-semibold">{value1}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-gray-400 text-xs font-medium mb-1">{label2}</Text>
        <Text className="text-gray-800 text-sm font-semibold">{value2}</Text>
      </View>
    </View>
  );

  const handleCallShelter = () => {
    if (shelterInfo.phone) {
      Linking.openURL(`tel:${shelterInfo.phone}`);
    }
  };

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <StatusBar style="dark" />
      <SafeAreaView className="flex-1" edges={['top']}>
        
        {/* --- HEADER --- */}
        <View className="flex-row items-center justify-between px-4 py-2 bg-[#FAFAFA]">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Feather name="chevron-left" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900">Pet Details</Text>
          <View className="w-10" /> 
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          
          {/* --- AVATAR & BASIC INFO --- */}
          <View className="items-center mt-4 mb-6">
            <View className="p-1.5 bg-white rounded-full shadow-sm shadow-gray-200">
              <Image 
                source={{ uri: petData.avatarUrl || petData.images?.[0]?.url || 'https://via.placeholder.com/150' }} 
                className="w-32 h-32 rounded-full"
                resizeMode="cover"
              />
            </View>
            <Text className="text-2xl font-bold text-gray-900 mt-4">{petData.name}</Text>
            <View className="flex-row items-center mt-2 bg-orange-50 px-3 py-1 rounded-full">
              <Text className="text-orange-600 text-xs font-bold">{petData.breed || 'Unknown breed'}</Text>
            </View>
          </View>

          {/* --- PET INFORMATION CARD --- */}
          <View className="mx-5 mb-5 bg-white rounded-[24px] p-6 shadow-sm shadow-gray-100 border border-gray-50">
            <Text className="text-base font-bold text-gray-900 mb-6">Pet Information</Text>
            <InfoRow 
              label1="Gender" value1={petData.gender || 'Not updated'} 
              label2="Age" value2={petData.age ? `${petData.age} years old` : 'Not updated'} 
            />
            <InfoRow 
              label1="Color" value1={petData.color || 'Not updated'} 
              label2="Status" value2={petData.status || 'Ready for adoption'} 
            />
            <View className="h-[1px] bg-gray-100 w-full mb-5" />
            <Text className="text-gray-400 text-xs font-medium mb-2">Description</Text>
            <Text className="text-gray-600 text-sm leading-5">
              {petData.description || 'The shelter has not updated a detailed description for this pet.'}
            </Text>
          </View>

          {/* --- SHELTER INFORMATION CARD --- */}
          <View className="mx-5 mb-8 bg-white rounded-[24px] p-6 shadow-sm shadow-gray-100 border border-gray-50">
            <Text className="text-base font-bold text-gray-900 mb-6">Shelter Information</Text>
            
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 bg-[#FFF8F0] rounded-full items-center justify-center mr-4">
                <Feather name="home" size={18} color="#ffa053" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-400 text-xs font-medium mb-0.5">Shelter Name</Text>
                <Text className="text-gray-800 text-sm font-medium">{shelterInfo.name || 'Not updated yet'}</Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-[#FFF8F0] rounded-full items-center justify-center mr-4">
                <Ionicons name="location-outline" size={20} color="#2563EB" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-400 text-xs font-medium mb-0.5">Address</Text>
                <Text className="text-gray-800 text-sm font-medium" numberOfLines={2}>
                  {shelterInfo.address || 'Not updated yet'}
                </Text>
              </View>
            </View>
          </View>

          {/* --- ACTION BUTTON --- */}
          <View className="mx-5">
            <TouchableOpacity 
              className="w-full bg-[#FF9C56] py-4 rounded-full shadow-md shadow-orange-200 items-center flex-row justify-center gap-2"
              onPress={handleCallShelter}
            >
              <Feather name="phone-call" size={18} color="white" />
              <Text className="text-white font-bold text-base">Contact for Adoption</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}