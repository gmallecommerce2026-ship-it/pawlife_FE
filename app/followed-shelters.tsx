import { Text } from '@/components/AppText';
import { shelterService } from '@/services/shelterService';
import { AntDesign, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// 1. Định nghĩa Type cho Shelter (Nên tách ra file types riêng trong dự án thực tế)
export interface FollowedShelter {
  id: string;
  name: string;
  address: string;
  imageUrl: string;
  isFollowing: boolean;
}

export default function FollowedSheltersScreen() {
  const router = useRouter();
  
  // 2. Quản lý các State cần thiết
  const [shelters, setShelters] = useState<FollowedShelter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 3. Hàm giả lập lấy dữ liệu (Thay thế bằng API Call thực tế như axios hoặc React Query)
  const fetchFollowedShelters = async () => {
    try {
      setIsLoading(true);
      
      // XOÁ ĐOẠN MOCK DATA CŨ ĐI VÀ GỌI API THẬT CỦA BẠN:
      // Lưu ý: Thay `getFollowedShelters` bằng tên hàm chính xác trong file services/shelterService.ts của bạn
      const response = await shelterService.getFollowedShelters();
      
      // Tuỳ thuộc vào cấu trúc response trả về từ backend của bạn (response.data hay trực tiếp là mảng)
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

  // Hàm xử lý khi kéo xuống để refresh
  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchFollowedShelters();
  }, []);

  // Hàm xử lý bỏ theo dõi
  const handleUnfollow = (id: string) => {
    // Gọi API Unfollow ở đây
    // Sau đó cập nhật lại state UI (Optimistic Update)
    setShelters(prev => prev.filter(shelter => shelter.id !== id));
  };

  // 4. Component hiển thị từng phần tử trong danh sách
  const renderShelterItem = ({ item }: { item: FollowedShelter }) => (
    <TouchableOpacity 
      className="bg-white p-4 mx-4 mb-3 rounded-2xl flex-row items-center shadow-sm border border-gray-100"
      onPress={() => router.push({ pathname: '/shelter-profile', params: { id: item.id } })}
      activeOpacity={0.7}
    >
      <Image 
        source={{ uri: item.imageUrl }} 
        className="w-16 h-16 rounded-full bg-gray-200"
      />
      <View className="flex-1 ml-4 justify-center">
        <Text className="text-lg font-bold text-gray-900 mb-1" numberOfLines={1}>{item.name}</Text>
        <View className="flex-row items-center">
          <Ionicons name="location-outline" size={14} color="#6B7280" />
          <Text className="text-sm text-gray-500 ml-1" numberOfLines={1}>{item.address}</Text>
        </View>
      </View>
      
      <TouchableOpacity 
        className="bg-gray-100 px-3 py-2 rounded-full ml-2"
        onPress={() => handleUnfollow(item.id)}
      >
        <Text className="text-sm font-medium text-gray-700">Unfollow</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // 5. Component hiển thị khi danh sách trống (Đã giữ lại code cũ của bạn)
  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center px-6 pb-20 mt-20">
      <View className="w-32 h-32 bg-orange-100 rounded-full items-center justify-center mb-6">
        <MaterialCommunityIcons name="office-building-marker-outline" size={64} color="#ffa053" />
      </View>
      <Text className="text-2xl font-bold text-gray-900 mb-3 text-center">
        No followed shelters yet
      </Text>
      <Text className="text-base text-gray-500 text-center mb-10 px-4 leading-6">
        Start following shelters to stay updated.
      </Text>
      <TouchableOpacity 
        className="bg-[#F97316] w-full py-4 rounded-full items-center shadow-sm"
        onPress={() => router.push({ pathname: '/search', params: { type: 'Shelters' } })}
        activeOpacity={0.8}
      >
        <Text className="text-white text-lg font-bold">Find Shelters</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View className="flex-1 bg-[#F9FAFB]">
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        
        {/* --- HEADER --- */}
        <View className="flex-row items-center px-4 py-2 relative bg-white pb-4 shadow-sm z-10 border-b border-gray-100">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 z-10">
            <AntDesign name="left" size={24} color="#1F2937" />
          </TouchableOpacity>
          <View className="absolute left-0 right-0 items-center justify-center pointer-events-none">
            {/* Cập nhật số lượng dynamic */}
            <Text className="text-xl font-bold text-gray-900">
              Followed Shelters {!isLoading && `(${shelters.length})`}
            </Text>
          </View>
        </View>

        {/* --- MAIN CONTENT --- */}
        {isLoading ? (
          // Hiển thị vòng xoay loading khi đang tải dữ liệu
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#ffa053" />
          </View>
        ) : (
          // Danh sách FlatList tối ưu
          <FlatList
            data={shelters}
            keyExtractor={(item) => item.id}
            renderItem={renderShelterItem}
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={{ flexGrow: 1, paddingTop: 16, paddingBottom: 24 }}
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