// app/favorite-pets.tsx
import { Text } from '@/components/AppText';
import { AntDesign, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Image, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { petService } from '../services/petService';

const { width } = Dimensions.get('window');
// Đồng bộ chính xác margin/padding với màn hình Search (width - paddingX - gap) / 2
const COLUMN_WIDTH = (width - 48 - 15) / 2;

type TabType = 'All' | 'Dog' | 'Cat';

const AnimatedFeather = Animated.createAnimatedComponent(Feather);



// =========================================================================
// 1. PURE COMPONENTS (Tối ưu render lại với memo)
// =========================================================================

const FavoritePetCard = memo(({ item, onPress, onUnfavorite }: { item: any; onPress: (item: any) => void; onUnfavorite: (id: string) => void }) => {
  
  // 1. TÍNH TOÁN TUỔI TỪ NGÀY SINH (dob)
  const petAge = useMemo(() => {
    if (!item.dob) return 'Unknown age';
    
    const dob = new Date(item.dob);
    const today = new Date();
    
    let years = today.getFullYear() - dob.getFullYear();
    let months = today.getMonth() - dob.getMonth();
    
    if (months < 0 || (months === 0 && today.getDate() < dob.getDate())) {
      years--;
      months += 12;
    }

    if (years > 0) return `${years} year${years > 1 ? 's' : ''}`;
    if (months > 0) return `${months} month${months > 1 ? 's' : ''}`;
    
    // Nếu dưới 1 tháng tuổi
    const days = Math.floor((today.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24));
    return days > 0 ? `${days} day${days > 1 ? 's' : ''}` : 'Newborn';
  }, [item.dob]);

  // 2. CHUẨN HÓA GIỚI TÍNH (Đưa về IN HOA để khớp với DB Enum MALE/FEMALE)
  const isMale = item.gender?.toUpperCase() === 'MALE';

  return (
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
          style={{ height: COLUMN_WIDTH }}
          resizeMode="cover"
        />

        {item.sticker && (
          <View className="absolute top-1/2 left-1/2 -ml-8 -mt-4 opacity-90">
            <MaterialCommunityIcons name="glasses" size={60} color="white" />
          </View>
        )}

        <TouchableOpacity
          onPress={() => onUnfavorite(item.id)}
          className="absolute top-3 right-3 p-2 rounded-full z-10 shadow-sm"
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
          
          <Image
            source={isMale ? require('../assets/icon/male.png') : require('../assets/icon/female.png')}
            style={{ width: 10, height: 10 }}
            resizeMode="cover"
          />
          
          <Text className="text-gray-400 text-[12px] font-regular mt-0.5 ml-1.5" numberOfLines={1}>
            {petAge} · {item.breed || 'Unknown'}
          </Text>
          
        </View>
      </View>
    </TouchableOpacity>
  );
});

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
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>('All');
  // 1. State cho Search
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const searchAnimation = useSharedValue(0);

  const handleOpenSearch = () => {
    setIsSearching(true);
    searchAnimation.value = withTiming(1, { duration: 300 });
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  const handleCloseSearch = () => {
    setSearchQuery('');
    searchAnimation.value = withTiming(0, { duration: 300 });
    setTimeout(() => setIsSearching(false), 300);
  };

  // 2. Animated Styles
  const backButtonStyle = useAnimatedStyle(() => ({
    opacity: interpolate(searchAnimation.value, [0, 0.5], [1, 0]),
    transform: [{ scale: interpolate(searchAnimation.value, [0, 1], [1, 0.8]) }],
    zIndex: isSearching ? -1 : 10, // Ẩn hoàn toàn khỏi luồng bấm khi search
  }));

  const headerTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(searchAnimation.value, [0, 0.5], [1, 0]),
    transform: [{ translateX: interpolate(searchAnimation.value, [0, 1], [0, -20]) }]
  }));

  // Style biến đổi khung Search
  const searchContainerStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      searchAnimation.value, [0, 1], ['rgba(255, 255, 255, 0.1)', '#F8F8F8']
    );
    const borderTopColor = interpolateColor(searchAnimation.value, [0, 1], ['white', '#EBEBEB']);
    const borderLeftColor = interpolateColor(searchAnimation.value, [0, 1], ['white', '#EBEBEB']);
    const borderBottomColor = interpolateColor(searchAnimation.value, [0, 1], ['transparent', '#EBEBEB']);
    const borderRightColor = interpolateColor(searchAnimation.value, [0, 1], ['transparent', '#EBEBEB']);

    return {
      width: interpolate(searchAnimation.value, [0, 1], [36, width - 40]),
      borderWidth: interpolate(searchAnimation.value, [0, 1], [0.5, 1]),
      paddingLeft: interpolate(searchAnimation.value, [0, 1], [8.5, 12]),
      paddingRight: interpolate(searchAnimation.value, [0, 1], [0, 12]),
      backgroundColor,
      borderTopColor,
      borderLeftColor,
      borderBottomColor,
      borderRightColor,
    };
  });

  // Mờ dần lớp kính Gradient khi search
  const gradientStyle = useAnimatedStyle(() => ({
    opacity: interpolate(searchAnimation.value, [0, 0.5], [1, 0]),
  }));

  const searchIconStyle = useAnimatedStyle(() => ({
    color: interpolateColor(searchAnimation.value, [0, 1], ['#000000', '#8E8E93']),
  }));

  const searchInputStyle = useAnimatedStyle(() => ({
    opacity: interpolate(searchAnimation.value, [0, 0.8, 1], [0, 0, 1]),
    marginLeft: interpolate(searchAnimation.value, [0, 1], [0, 8]),
  }));

  // 3. REACT QUERY: Fetch Favorites
  const { data: favorites = [], isLoading: loading } = useQuery({
    queryKey: ['favorite-pets'],
    queryFn: async () => {
      const res = await petService.getFavorites();
      let favoritesArray = [];
      if (Array.isArray(res)) favoritesArray = res;
      else if (res?.data && Array.isArray(res.data)) favoritesArray = res.data;
      else if (res?.items && Array.isArray(res.items)) favoritesArray = res.items;
      else if (res?.favorites && Array.isArray(res.favorites)) favoritesArray = res.favorites;
      return favoritesArray;
    }
  });

  // 4. Lọc dữ liệu
  const filteredPets = useMemo(() => {
    return favorites.filter((pet: any) => {
      const matchesTab = activeTab === 'All' 
        ? true 
        : (pet.species || pet.type)?.toUpperCase() === activeTab.toUpperCase();
      
      const safeName = pet.name || '';
      const matchesSearch = safeName.toLowerCase().includes(searchQuery.toLowerCase().trim());
      
      return matchesTab && matchesSearch;
    });
  }, [favorites, activeTab, searchQuery]);

  // Sử dụng useCallback để tránh việc Card bị re-render không cần thiết
  const handlePetPress = useCallback((item: any) => {
    router.push({ pathname: '/pet-detail-modal', params: { id: item.id } });
  }, [router]);

  // 5. REACT QUERY MUTATION: Handle Unfavorite
  const unfavoriteMutation = useMutation({
    mutationFn: (petId: string) => petService.unfavoritePet(petId),
    onMutate: async (deletedId) => {
      // Dừng các query đang fetch
      await queryClient.cancelQueries({ queryKey: ['favorite-pets'] });
      // Lưu lại cache cũ
      const previousFavorites = queryClient.getQueryData(['favorite-pets']);
      // Cập nhật Optimistic
      queryClient.setQueryData(['favorite-pets'], (old: any[]) => 
        old ? old.filter((pet) => pet.id !== deletedId) : []
      );
      return { previousFavorites };
    },
    onError: (err, variables, context) => {
      // Rollback nếu có lỗi
      console.error('Lỗi khi bỏ yêu thích:', err);
      if (context?.previousFavorites) {
        queryClient.setQueryData(['favorite-pets'], context.previousFavorites);
      }
    },
    onSettled: () => {
      // Sync lại với server sau khi kết thúc
      queryClient.invalidateQueries({ queryKey: ['favorite-pets'] });
    }
  });

  const handleUnfavorite = useCallback((petId: string) => {
    unfavoriteMutation.mutate(petId);
  }, [unfavoriteMutation]);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View style={{ height: 44, justifyContent: 'center', marginBottom: 16, marginTop: 8 }}>

        {/* 1. NÚT BACK */}
        <Animated.View style={[backButtonStyle, { position: 'absolute', left: 20 }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.8}
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 5,
              elevation: 3,
            }}
            className="w-10 h-10 rounded-full items-center justify-center"
          >
            <View className="overflow-hidden rounded-full items-center justify-center"
              style={{
                width: 36, height: 36, borderRadius: 28, borderWidth: 0.5,
                borderTopColor: 'white', borderLeftColor: 'white',
                borderBottomColor: 'transparent', borderRightColor: 'transparent',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }}>
              <LinearGradient
                colors={['rgba(221, 221, 221, 0.5)', 'rgba(247, 247, 247, 0.8)', '#FFFFFF']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                locations={[0, 0.3, 1]}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 9999 }}
              />
              <Feather name="chevron-left" size={20} color="#000000" />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* 2. TITLE */}
        <Animated.View style={[headerTitleStyle, { position: 'absolute', left: 0, right: 0, alignItems: 'center', pointerEvents: 'none' }]}>
          <Text className="text-[20px] font-semibold text-black">Favorite Pets</Text>
        </Animated.View>

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
          data={filteredPets}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => {
            if (favorites.length === 0) {
              return (
                <View className="flex-1 items-center justify-center mt-20">
                  <Image
                    source={require('../assets/images/my-pet-empty.png')}
                    resizeMode="contain"
                    className=""
                    style={{
                      width: 230,
                      height: 232,
                    }}
                  />
                  <Text className="text-black text-[16px] font-medium mt-6">You don't have any pets yet</Text>
                  <Text className="text-[#8E8E93] text-[14px] text-center mt-2 mb-8">Add your pet or adopt a new friend!</Text>
    
                  <TouchableOpacity
                    className="px-10 bg-white py-5 rounded-[16px] border border-[#E5E5E5] flex-row justify-center items-center active:bg-orange-50"
                    activeOpacity={0.7}
                    onPress={() => router.push({ pathname: '/search', params: { type: 'Pet' } })}
                  >
                    <Text className="text-[#8E8E93] font-medium">Browse pets</Text>
                  </TouchableOpacity>
                </View>
              );
            }
          }}
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