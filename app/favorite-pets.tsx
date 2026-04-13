// app/favorite-pets.tsx
import { Text } from '@/components/AppText';
import { AntDesign, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Image, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { petService } from '../services/petService';

const { width } = Dimensions.get('window');
// Đồng bộ chính xác margin/padding với màn hình Search (width - paddingX - gap) / 2
const COLUMN_WIDTH = (width - 48 - 15) / 2; 

type TabType = 'All' | 'Dog' | 'Cat';

// =========================================================================
// 1. PURE COMPONENTS (Tối ưu render lại với memo)
// =========================================================================

const FavoritePetCard = memo(({ item, onPress, onUnfavorite }: { item: any; onPress: (item: any) => void; onUnfavorite: (id: string) => void }) => (
  <TouchableOpacity 
      className="bg-transparent mb-[21px]"
      style={{ width: COLUMN_WIDTH }}
      activeOpacity={0.9}
      onPress={() => onPress(item)}
  >
      <View className="relative">
          <Image 
              source={{ uri: item.images?.[0]?.url || item.avatarUrl || 'https://via.placeholder.com/600' }} 
              className="w-full aspect-square rounded-[24px] bg-gray-100" 
              style={{ height: COLUMN_WIDTH }} // Backup cho aspect-square
              resizeMode="cover" 
          />
          
          {/* Sticker giống bên Search */}
          {item.sticker && (
              <View className="absolute top-1/2 left-1/2 -ml-8 -mt-4 opacity-90">
                  <MaterialCommunityIcons name="glasses" size={60} color="white" />
              </View>
          )}

          {/* Nút Unfavorite (Trái tim) được thiết kế lại gọn gàng góc phải */}
          <TouchableOpacity 
            onPress={() => onUnfavorite(item.id)}
            className="absolute top-3 right-3 bg-white/80 p-2 rounded-full z-10 shadow-sm shadow-gray-200"
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <AntDesign name="heart" size={16} color="#E89B5A" />
          </TouchableOpacity>
      </View>
      
      <View className="pt-[12px]">
          <Text className="text-gray-900 font-semibold text-[16px] mb-1" numberOfLines={1}>
            {item.name}
          </Text>
          <View className="flex-row items-center">
              <Text className="text-gray-400 text-[12px] font-regular" numberOfLines={1}>
                {item.age || '2 years'} · {item.breed || 'Unknown'}
              </Text>
          </View>
      </View>
  </TouchableOpacity>
));

const FilterTab = memo(({ title, isActive, onPress }: { title: TabType; isActive: boolean; onPress: (tab: TabType) => void }) => (
  <TouchableOpacity 
    onPress={() => onPress(title)}
    className={`flex-1 items-center pb-3 border-b-2 ${isActive ? 'border-[#E89B5A]' : 'border-transparent'}`}
    activeOpacity={0.8}
  >
      <Text className={`text-[16px] ${isActive ? 'text-[#E89B5A] font-semibold' : 'text-gray-400 font-regular'}`}>
        {title}
      </Text>
  </TouchableOpacity>
));

// =========================================================================
// 2. MAIN SCREEN
// =========================================================================

export default function FavoritePetsScreen() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('All');

  const fetchFavorites = useCallback(async () => {
    try {
      setLoading(true);
      const res = await petService.getFavorites();
      
      let favoritesArray = [];
      if (Array.isArray(res)) favoritesArray = res;
      else if (res?.data && Array.isArray(res.data)) favoritesArray = res.data;
      else if (res?.items && Array.isArray(res.items)) favoritesArray = res.items;
      else if (res?.favorites && Array.isArray(res.favorites)) favoritesArray = res.favorites; 

      setFavorites(favoritesArray);
    } catch (error) {
      console.error('Lỗi khi tải danh sách yêu thích:', error);
      setFavorites([]); 
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  // Lọc dữ liệu Local thông qua useMemo (Tối ưu hiệu năng, không gọi lại logic lọc nếu data/tab không đổi)
  const filteredFavorites = useMemo(() => {
    if (activeTab === 'All') return favorites;
    // Giả định API trả về field type là 'DOG' hoặc 'CAT'
    return favorites.filter(pet => pet.type?.toUpperCase() === activeTab.toUpperCase());
  }, [favorites, activeTab]);

  // Sử dụng useCallback để tránh việc Card bị re-render không cần thiết
  const handlePetPress = useCallback((item: any) => {
    router.push({ pathname: '/shelter-pet-detail', params: { id: item.id } });
  }, [router]);

  const handleUnfavorite = useCallback(async (petId: string) => {
    // Cập nhật UI ngay lập tức (Optimistic UI Update)
    setFavorites((prev) => {
      const petExists = prev.find(p => p.id === petId);
      if (!petExists) return prev;

      // Gọi API ngầm ở background
      petService.unfavoritePet(petId).catch((error) => {
        console.error('Lỗi khi bỏ yêu thích:', error);
        // Nếu API lỗi, fetch lại data để đảm bảo tính đồng bộ
        fetchFavorites();
      });

      return prev.filter((pet) => pet.id !== petId);
    });
  }, [fetchFavorites]);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-6 py-4">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2" hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <Feather name="chevron-left" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-[24px] font-semibold text-black flex-1 text-center mr-6">
          Favorite Pets
        </Text>
      </View>

      {/* Tabs Filter (Giống màn hình Search) */}
      <View className="flex-row px-6 border-b border-gray-100 pt-2">
          <FilterTab title="All" isActive={activeTab === 'All'} onPress={setActiveTab} />
          <FilterTab title="Dog" isActive={activeTab === 'Dog'} onPress={setActiveTab} />
          <FilterTab title="Cat" isActive={activeTab === 'Cat'} onPress={setActiveTab} />
      </View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#E89B5A" />
        </View>
      ) : (
        <FlatList 
          data={filteredFavorites}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View className="flex-1 items-center justify-center mt-20">
              <AntDesign name="heart" size={48} color="#D1D5DB" className="mb-4" />
              <Text className="text-center text-gray-400 mt-4 text-[14px]">
                {activeTab === 'All' 
                  ? 'Bạn chưa có thú cưng yêu thích nào.' 
                  : `Bạn chưa lưu bé ${activeTab} nào.`}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <FavoritePetCard 
              item={item} 
              onPress={handlePetPress} 
              onUnfavorite={handleUnfavorite} 
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}