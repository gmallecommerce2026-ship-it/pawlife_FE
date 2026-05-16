import { Text } from '@/components/AppText';
import { shelterService } from '@/services/shelterService';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, DeviceEventEmitter, FlatList, Image, RefreshControl, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// 1. Mở rộng Type để khớp với data từ search.tsx (cần thêm số lượng pet và các field ảnh fallback)
export interface FollowedShelter {
  id: string;
  name: string;
  address?: string;
  loc?: string;
  imageUrl?: string;
  avatarUrl?: string;
  avatar?: string;
  img?: string;
  petCount?: number;
  totalPets?: number;
  isFollowing: boolean;
}

export default function FollowedSheltersScreen() {
  const router = useRouter();

  const [shelters, setShelters] = useState<FollowedShelter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchFollowedShelters = async () => {
    try {
      setIsLoading(true);
      const response = await shelterService.getFollowedShelters();
      const fetchedShelters = response?.data || response || [];
      setShelters(fetchedShelters);
    } catch (error) {
      console.error('Failed to fetch followed shelters:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFollowedShelters();
  }, []);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchFollowedShelters();
  }, []);

  // Xử lý Unfollow và BẮT BUỘC phải emit event để tab Search cập nhật real-time
  const handleUnfollow = async (id: string) => {
    // 1. Optimistic Update cho UI hiện tại mượt mà
    setShelters(prev => prev.filter(shelter => shelter.id !== id));

    // 2. Bắn event báo cho hệ thống (tab Search) biết shelter này đã bị unfollow
    DeviceEventEmitter.emit('SHELTER_FOLLOW_TOGGLED', { shelterId: id, isFollowed: false });

    try {
      // Gọi API thực tế ở đây, ví dụ:
      // await shelterService.toggleFollow(id);
    } catch (error) {
      console.error('Failed to unfollow:', error);
      // Rollback UI nếu API lỗi
      fetchFollowedShelters();
      DeviceEventEmitter.emit('SHELTER_FOLLOW_TOGGLED', { shelterId: id, isFollowed: true });
    }
  };

  // 2. Render UI giống HỆT ShelterCard bên search.tsx (Pixel-perfect)
  const renderShelterItem = ({ item }: { item: FollowedShelter }) => {
    // Xử lý fallback data y hệt bên search
    const imageSource = item.imageUrl || item.avatarUrl || item.avatar || item.img || 'https://via.placeholder.com/200';
    const locationInfo = item.address || item.loc || 'Unknown location';
    const petAmount = item.petCount || item.totalPets || 20; // Default 20 như logic cũ

    return (
      <TouchableOpacity
        className="flex-row items-center mb-[21px] bg-transparent"
        activeOpacity={0.7}
        onPress={() => router.push({
          pathname: '/shelter-profile',
          params: { id: item.id, name: item.name, address: locationInfo, image: imageSource }
        })}
      >
        <Image
          source={{ uri: imageSource }}
          className="w-[54px] h-[54px] rounded-full bg-gray-200"
        />
        <View className="flex-1 ml-[14px] pr-2 justify-center">
          <Text className="text-black font-semibold text-[16px] mb-[3px]" numberOfLines={1}>
            {item.name}
          </Text>
          <Text className="text-[#8E8E93] text-[12px] font-regular" numberOfLines={1}>
            {locationInfo} · {petAmount} pets
          </Text>
        </View>

        {/* Nút có style của trạng thái "Đang Follow" - Bấm vào sẽ Unfollow */}
        <TouchableOpacity
          onPress={() => handleUnfollow(item.id)}
          className="px-5 py-[3.5px] rounded-full shadow-sm bg-[#F8F8F8] shadow-gray-100"
        >
          <Text className="text-[14px] font-semibold text-[#8E8E93]">
            Following
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View className="flex items-center justify-center px-6 pb-20 mt-20">
     <Image
          source={require('../assets/images/cat-in-house.png')}
          resizeMode="contain"
          className=""
          style={{
            width: 362,
            height: 242,
          }}
        />

      <Text className="text-gray-800 text-lg font-bold mt-8">A little empty here</Text>
      <Text className="text-gray-400 text-center mt-2 mb-8">Look like we missing a paw...</Text>

      <TouchableOpacity
        className="px-10 bg-white py-5 rounded-[16px] border border-[#E5E5E5] flex-row justify-center items-center active:bg-orange-50 mt-4"
        activeOpacity={0.7}
        onPress={() => router.push('/')}
      >
        
        <Text className="text-[#8E8E93] font-medium">Browse shelters</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>

        {/* HEADER */}
        <View className="flex-row items-center px-4 py-3 relative bg-white z-10">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 z-10">
            <Feather name="chevron-left" size={24} color="#000000" />
          </TouchableOpacity>
          <View className="absolute left-0 right-0 items-center justify-center pointer-events-none">
            <Text className="text-[24px] font-semibold text-black">
              Following Shelters
            </Text>
          </View>
        </View>

        {/* MAIN CONTENT */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#ffa053" />
          </View>
        ) : (
          <FlatList
            data={shelters}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderShelterItem}
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 24
            }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                tintColor="#ffa053"
                colors={['#ffa053']}
              />
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}