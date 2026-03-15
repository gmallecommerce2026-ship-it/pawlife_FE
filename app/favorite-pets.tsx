// app/favorite-pets.tsx
import { Text } from '@/components/AppText';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { petService } from '../services/petService';
const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48 - 16) / 2;

export default function FavoritePetsScreen() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const res = await petService.getFavorites();
      
      let favoritesArray = [];
      if (Array.isArray(res)) {
        favoritesArray = res;
      } else if (res && Array.isArray(res.data)) {
        favoritesArray = res.data;
      } else if (res && Array.isArray(res.items)) {
        favoritesArray = res.items;
      } else if (res && Array.isArray(res.favorites)) {
        favoritesArray = res.favorites; 
      }

      setFavorites(favoritesArray);
    } catch (error) {
      console.error('Lỗi khi tải danh sách yêu thích:', error);
      setFavorites([]); 
    } finally {
      setLoading(false);
    }
  };

  const handleUnfavorite = async (petId: string) => {
    const previousFavorites = [...favorites];
    setFavorites((prev) => prev.filter((pet) => pet.id !== petId));

    try {
      await petService.unfavoritePet(petId);
    } catch (error) {
      setFavorites(previousFavorites);
      console.error('Lỗi khi bỏ yêu thích:', error);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-6 py-4 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <AntDesign name="left" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 flex-1 text-center mr-6">
          Favorite Pets
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#ffa053" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, paddingTop: 20 }}>
          {favorites.length === 0 ? (
            <Text className="text-center text-gray-500 mt-10">Bạn chưa có thú cưng yêu thích nào.</Text>
          ) : (
            <View className="px-6 flex-row flex-wrap justify-between">
              {favorites.map((pet) => {
                // Xử lý an toàn để lấy đúng URL hình ảnh từ cấu trúc trả về của NestJS
                const imageUrl = pet.images && pet.images.length > 0 
                  ? pet.images[0].url 
                  : (pet.avatarUrl || 'https://via.placeholder.com/150');

                return (
                  <TouchableOpacity 
                    key={pet.id} 
                    style={{ width: COLUMN_WIDTH }}
                    className="bg-white rounded-[20px] mb-4 shadow-sm shadow-gray-200 border border-gray-100 overflow-hidden pb-3 relative"
                    // Điều hướng sang trang chi tiết thú cưng khi nhấn vào thẻ
                    onPress={() => router.push({ pathname: '/shelter-pet-detail', params: { id: pet.id } })}
                  >
                    <Image source={{ uri: imageUrl }} className="w-full h-40 bg-gray-100" resizeMode="cover" />
                    
                    {/* Nút bỏ tim */}
                    <TouchableOpacity 
                      onPress={() => handleUnfavorite(pet.id)}
                      className="absolute top-2 right-2 bg-white/80 p-2 rounded-full z-10"
                    >
                      <AntDesign name="heart" size={20} color="#EF4444" />
                    </TouchableOpacity>

                    <View className="px-3 pt-3">
                      <Text className="text-gray-900 font-bold text-base mb-1" numberOfLines={1}>{pet.name}</Text>
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          <Ionicons name="location-sharp" size={10} color="#ffa053" />
                          <Text className="text-gray-400 text-[10px] ml-1">{pet.distance || 'Gần đây'}</Text>
                        </View>
                        <Text className="text-gray-500 text-[10px] font-medium" numberOfLines={1}>• {pet.breed}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}