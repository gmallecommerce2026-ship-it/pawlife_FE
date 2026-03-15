// app/search.tsx
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { memo, useEffect, useState } from 'react';
import { ActivityIndicator, DeviceEventEmitter, Dimensions, FlatList, Image, SafeAreaView, StatusBar, TextInput, TouchableOpacity, View } from 'react-native';
import { eventService } from '../services/eventService';
import { petService } from '../services/petService';
import { shelterService } from '../services/shelterService';

import { Text } from '@/components/AppText';
const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48 - 15) / 2;

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// =========================================================================
// 1. PURE COMPONENTS
// =========================================================================

const PetCard = memo(({ item, onPress }: { item: any; onPress: (item: any) => void }) => (
    <TouchableOpacity 
        className="bg-transparent mb-5"
        style={{ width: COLUMN_WIDTH }}
        activeOpacity={0.9}
        onPress={() => onPress(item)}
    >
        <View className="relative">
            <Image 
                source={{ uri: item.images?.[0]?.url || item.image || 'https://via.placeholder.com/600' }} 
                className="w-full h-40 rounded-[20px] bg-gray-100" 
                resizeMode="cover" 
            />
            {item.sticker && (
                <View className="absolute top-1/2 left-1/2 -ml-8 -mt-4 opacity-90">
                    <MaterialCommunityIcons name="glasses" size={60} color="white" />
                </View>
            )}
        </View>
        <View className="pt-3">
            <Text className="text-gray-900 font-bold text-base mb-1">{item.name}</Text>
            <View className="flex-row items-center">
                <Ionicons name="location-sharp" size={12} color="#ffa053" />
                <Text className="text-gray-400 text-xs ml-1 font-medium">{item.distance || '1.0 km'} · {item.breed || 'Unknown'}</Text>
            </View>
        </View>
    </TouchableOpacity>
));

const ShelterCard = memo(({ item, onPress, onToggleFollow }: { item: any; onPress: (item: any) => void; onToggleFollow: (item: any) => void }) => (
    <TouchableOpacity 
        className="flex-row items-center mb-6 bg-white"
        activeOpacity={0.7}
        onPress={() => onPress(item)}
    >
        <Image 
            source={{ uri: item.avatarUrl || item.avatar || item.img || 'https://via.placeholder.com/200' }} 
            className="w-14 h-14 rounded-full bg-gray-200 border border-gray-50" 
        />
        <View className="flex-1 ml-4 justify-center">
            <Text className="text-gray-900 font-bold text-[15px] mb-0.5" numberOfLines={1}>{item.name}</Text>
            <Text className="text-gray-400 text-xs font-medium">{item.address || item.loc || 'Unknown location'}</Text>
        </View>
        
        {/* Nút Follow được gắn sự kiện onPress và đổi style động */}
        <TouchableOpacity 
            onPress={() => onToggleFollow(item)}
            className={`px-5 py-1.5 rounded-full shadow-sm ${
                item.isFollowed ? 'bg-gray-200 shadow-gray-100' : 'bg-[#FF9C56] shadow-orange-100'
            }`}
        >
            <Text className={`text-xs font-bold ${
                item.isFollowed ? 'text-gray-600' : 'text-white'
            }`}>
                {item.isFollowed ? 'Đang theo dõi' : 'Theo dõi'}
            </Text>
        </TouchableOpacity>
    </TouchableOpacity>
));

const EventCard = memo(({ item, onPress }: { item: any; onPress: (item: any) => void }) => {
    // Format lại ngày tháng giống định dạng dễ đọc (VD: 15/12/2023)
    let displayDate = 'Đang cập nhật';
    if (item.startDate) {
        const d = new Date(item.startDate);
        displayDate = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    return (
        <TouchableOpacity 
            className="bg-white p-3 rounded-[24px] flex-row shadow-sm border border-gray-100 mb-4 items-start"
            activeOpacity={0.8}
            onPress={() => onPress(item)}
        >
            <Image 
                // Đồng bộ field ảnh với Home tab (dùng bannerUrl)
                source={{ uri: item.bannerUrl || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=300&auto=format&fit=crop' }} 
                className="w-24 h-24 rounded-2xl bg-gray-200" 
                resizeMode="cover" 
            />
            <View className="flex-1 ml-3 h-24 py-1 justify-between">
                <View className="pr-6 relative"> 
                    <Text className="text-gray-900 font-bold text-[15px] leading-5 mb-1" numberOfLines={2}>
                        {item.title}
                    </Text>
                    {/* Đồng bộ field địa điểm với Home tab */}
                    <Text className="text-gray-400 text-xs font-medium" numberOfLines={1}>
                        {item.locationName || item.address || 'Đang cập nhật địa điểm'}
                    </Text>
                    <View className="absolute -top-1 -right-2">
                        <Feather name="bookmark" size={18} color="#9CA3AF" />
                    </View>
                </View>
                <View className="flex-row items-center">
                    <Feather name="calendar" size={14} color="#ffa053" />
                    <Text className="text-gray-400 text-[11px] font-medium ml-1.5">
                        {/* Đồng bộ field số người tham gia (interestedCount) */}
                        {displayDate} <Text className="text-gray-300">|</Text> {item.interestedCount || 0} attending
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
});


// =========================================================================
// 2. SECTIONS CHÍNH
// =========================================================================

const PetsSection = ({ searchQuery, onDetailPress }: { searchQuery: string, onDetailPress: (item: any) => void }) => {
    const [pets, setPets] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    // Thêm state để quản lý filter chip đang được chọn
    const [activeType, setActiveType] = useState<'All' | 'Dog' | 'Cat'>('All');

    useEffect(() => {
        const fetchPets = async () => {
            setLoading(true);
            try {
                // Chuẩn bị params gửi lên API
                const params: any = { search: searchQuery };
                
                // Nếu không phải 'All', thêm param 'type' (DOG hoặc CAT)
                if (activeType !== 'All') {
                    params.type = activeType.toUpperCase();
                }

                const response = await petService.searchPets(params);
                setPets(response?.data || response || []);
            } catch (error) {
                console.error("Error fetching pets:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPets();
    }, [searchQuery, activeType]); // Thêm activeType vào dependency array để gọi lại API khi đổi filter

    return (
        <View className="flex-1 px-6 pt-4">
            {/* Giao diện Group Button Filter Chip */}
            <View className="flex-row gap-3 mb-5">
                {['All', 'Dog', 'Cat'].map((type) => {
                    const isActive = activeType === type;
                    return (
                        <TouchableOpacity
                            key={type}
                            onPress={() => setActiveType(type as any)}
                            activeOpacity={0.8}
                            className={`px-5 py-2 rounded-full border ${
                                isActive 
                                    ? 'bg-[#F97316] border-[#F97316]' 
                                    : 'bg-white border-gray-200'
                            }`}
                        >
                            <Text className={`font-semibold text-[13px] ${
                                isActive ? 'text-white' : 'text-gray-600'
                            }`}>
                                {type}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Danh sách Pets */}
            {loading ? (
                <View className="flex-1 items-center justify-center mt-10">
                    <ActivityIndicator size="large" color="#ffa053" />
                </View>
            ) : (
                <FlatList 
                    data={pets}
                    keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                    numColumns={2}
                    columnWrapperStyle={{ justifyContent: 'space-between' }}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    ListEmptyComponent={() => (
                        <View className="items-center justify-center mt-10">
                            <Text className="text-gray-400">No pets found</Text>
                        </View>
                    )}
                    renderItem={({ item }) => <PetCard item={item} onPress={onDetailPress} />}
                />
            )}
        </View>
    );
};

const SheltersSection = ({ searchQuery, onProfilePress }: { searchQuery: string, onProfilePress: (item: any) => void }) => {
    const [shelters, setShelters] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        const subscription = DeviceEventEmitter.addListener('SHELTER_FOLLOW_TOGGLED', (eventData) => {
            setShelters(prevShelters => 
                prevShelters.map(shelter => 
                    shelter.id === eventData.shelterId 
                        ? { ...shelter, isFollowed: eventData.isFollowed } 
                        : shelter
                )
            );
        });

        // Cleanup listener khi component unmount
        return () => subscription.remove();
    }, []);
    useEffect(() => {
        const fetchShelters = async () => {
            setLoading(true);
            try {
                const response = await shelterService.getShelters({ search: searchQuery });
                const responseData = response?.data?.data || response?.data || response;
                
                if (Array.isArray(responseData)) {
                    setShelters(responseData);
                } else {
                    setShelters([]);
                }
            } catch (error) {
                console.error("Error fetching shelters:", error);
                setShelters([]);
            } finally {
                setLoading(false);
            }
        };
        fetchShelters();
    }, [searchQuery]);

    // Thêm hàm xử lý hành động Follow/Unfollow
    const handleToggleFollow = async (item: any) => {
        const newFollowStatus = !item.isFollowed;

        // 1. Cập nhật UI lập tức
        setShelters(prevShelters => 
            prevShelters.map(shelter => 
                shelter.id === item.id ? { ...shelter, isFollowed: newFollowStatus } : shelter
            )
        );
        
        // 2. Phát sự kiện cho các màn hình khác biết
        DeviceEventEmitter.emit('SHELTER_FOLLOW_TOGGLED', { shelterId: item.id, isFollowed: newFollowStatus });

        try {
            await shelterService.toggleFollow(item.id);
        } catch (error) {
            console.error("Lỗi khi toggle follow:", error);
            // 3. Rollback nếu API lỗi
            setShelters(prevShelters => 
                prevShelters.map(shelter => 
                    shelter.id === item.id ? { ...shelter, isFollowed: !newFollowStatus } : shelter
                )
            );
            // Phát sự kiện rollback
            DeviceEventEmitter.emit('SHELTER_FOLLOW_TOGGLED', { shelterId: item.id, isFollowed: !newFollowStatus });
        }
    };

    if (loading) return <ActivityIndicator size="large" color="#ffa053" style={{ marginTop: 40 }} />;

    return (
        <FlatList 
            data={shelters}
            keyExtractor={(item, index) => item.id?.toString() || index.toString()}
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
                <View className="items-center justify-center mt-10">
                    <Text className="text-gray-400">No shelters found</Text>
                </View>
            )}
            renderItem={({ item }) => (
                <ShelterCard 
                    item={item} 
                    onPress={onProfilePress} 
                    onToggleFollow={handleToggleFollow} // Truyền hàm xuống ShelterCard
                />
            )}
        />
    );
};

const EventsSection = ({ searchQuery, onEventPress }: { searchQuery: string, onEventPress: (item: any) => void }) => {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchEvents = async () => {
            setLoading(true);
            try {
                const response = await eventService.searchEvents({ search: searchQuery });
                setEvents(response?.data || response || []);
            } catch (error) {
                console.error("Error fetching events:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, [searchQuery]);

    if (loading) return <ActivityIndicator size="large" color="#ffa053" style={{ marginTop: 40 }} />;

    return (
        <FlatList 
            data={events}
            keyExtractor={(item, index) => item.id?.toString() || index.toString()}
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
                <View className="items-center justify-center mt-10">
                    <Text className="text-gray-400">No events found</Text>
                </View>
            )}
            renderItem={({ item }) => <EventCard item={item} onPress={onEventPress} />}
        />
    );
};

// =========================================================================
// 3. MAIN COMPONENT 
// =========================================================================

export default function SearchScreen() {
  const router = useRouter(); 
  const { type } = useLocalSearchParams();
  const initialTab = (type as 'Pets' | 'Shelters' | 'Events') || 'Pets';
  const [activeTab, setActiveTab] = useState<'Pets' | 'Shelters' | 'Events'>(initialTab);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearchQuery = useDebounce(searchInput, 500);

  useEffect(() => {
      if (type && ['Pets', 'Shelters', 'Events'].includes(type as string)) {
          setActiveTab(type as any);
      }
  }, [type]);

  const handlePetPress = (item: any) => {
      router.push({
          pathname: '/pet-detail-modal',
          params: { 
              id: item.id, 
              name: item.name, 
              image: item.images?.[0]?.url || item.image,
              distance: item.distance,
              breed: item.breed
          }
      });
  };

  const handleShelterPress = (item: any) => {
      router.push({
          pathname: '/shelter-profile',
          params: { 
            id: item.id, 
            name: item.name, 
            address: item.address || item.loc, 
            // Cập nhật field
            image: item.avatarUrl || item.avatar || item.img 
          }
      });
  };

  const handleEventPress = (item: any) => {
      router.push({
          pathname: '/event-detail',
          params: { 
            id: item.id,
            title: item.title, 
            // Cập nhật mapping dữ liệu chuẩn từ API
            location: item.locationName || item.address, 
            date: item.startDate,
            image: item.bannerUrl 
          }
      });
  };

  const TabButton = ({ title }: { title: 'Pets' | 'Shelters' | 'Events' }) => {
      const isActive = activeTab === title;
      return (
          <TouchableOpacity 
            onPress={() => setActiveTab(title)}
            className={`flex-1 items-center py-3 border-b-2 ${isActive ? 'border-[#F97316]' : 'border-transparent'}`}
            activeOpacity={0.8}
          >
              <Text className={`text-sm ${isActive ? 'text-[#F97316] font-bold' : 'text-gray-400 font-medium'}`}>{title}</Text>
          </TouchableOpacity>
      )
  };

  return (
    <SafeAreaView className="flex-1 bg-white" style={{ paddingTop: StatusBar.currentHeight }}>
      <View className="flex-row items-center px-4 py-3 gap-3">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
              <Feather name="chevron-left" size={26} color="#1F2937" />
          </TouchableOpacity>
          <View className="flex-1 flex-row items-center bg-[#F9FAFB] rounded-full px-4 h-12 border border-gray-100">
              <Feather name="search" size={18} color="#9CA3AF" />
              <TextInput 
                className="flex-1 ml-3 text-[15px] text-gray-800 font-medium"
                placeholder="Search shelters, pets..."
                placeholderTextColor="#9CA3AF"
                value={searchInput}
                onChangeText={setSearchInput}
                autoFocus={false} 
              />
              <TouchableOpacity onPress={() => router.push('/filter-modal')} activeOpacity={0.6} className="p-1">
                    <Ionicons name="options-outline" size={20} color="#9CA3AF" />
              </TouchableOpacity>
          </View>
      </View>

      <View className="flex-row px-6 border-b border-gray-50 mb-2">
          <TabButton title="Pets" />
          <TabButton title="Shelters" />
          <TabButton title="Events" />
      </View>

      <View className="flex-1 bg-white">
          {activeTab === 'Pets' && <PetsSection searchQuery={debouncedSearchQuery} onDetailPress={handlePetPress} />}
          {activeTab === 'Shelters' && <SheltersSection searchQuery={debouncedSearchQuery} onProfilePress={handleShelterPress} />}
          {activeTab === 'Events' && <EventsSection searchQuery={debouncedSearchQuery} onEventPress={handleEventPress} />}
      </View>
    </SafeAreaView>
  );
}