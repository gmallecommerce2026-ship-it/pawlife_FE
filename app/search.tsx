// app/search.tsx
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { memo, useEffect, useState } from 'react';
import { ActivityIndicator, DeviceEventEmitter, Dimensions, FlatList, Image, StatusBar, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
        className="bg-transparent mb-[21px]"
        style={{ width: COLUMN_WIDTH }}
        activeOpacity={0.9}
        onPress={() => onPress(item)}
    >
        <View className="relative">
            <Image 
                source={{ uri: item.images?.[0]?.url || item.image || 'https://via.placeholder.com/600' }} 
                // Xóa h-40, thay bằng aspect-square (hoặc dùng height: COLUMN_WIDTH ở dưới)
                className="w-full aspect-square rounded-[24px] bg-gray-100" 
                // Backup nếu NativeWind bản cũ không nhận aspect-square
                style={{ height: COLUMN_WIDTH }} 
                resizeMode="cover" 
            />
            {item.sticker && (
                <View className="absolute top-1/2 left-1/2 -ml-8 -mt-4 opacity-90">
                    <MaterialCommunityIcons name="glasses" size={60} color="white" />
                </View>
            )}
        </View>
        <View className="pt-[12px]">
            <Text className="text-gray-900 font-semibold text-[16px] mb-1">{item.name}</Text>
            <View className="flex-row items-center">
                <Text className="text-gray-400 text-[12px] font-regular">{item.age || '2 years'} · {item.breed || 'Unknown'}</Text>
            </View>
        </View>
    </TouchableOpacity>
));

const ShelterCard = memo(({ item, onPress, onToggleFollow }: { item: any; onPress: (item: any) => void; onToggleFollow: (item: any) => void }) => (
    <TouchableOpacity 
        className="flex-row items-center mb-[21px] bg-white"
        activeOpacity={0.7}
        onPress={() => onPress(item)}
    >
        <Image 
            source={{ uri: item.avatarUrl || item.avatar || item.img || 'https://via.placeholder.com/200' }} 
            className="w-[54px] h-[54px] rounded-full bg-gray-200" 
        />
        <View className="flex-1 ml-[14px] pr-2 justify-center">
            <Text className="text-black font-semibold text-[16px] mb-[3px]" numberOfLines={1}>
                {item.name}
            </Text>
            {/* Cập nhật dòng dưới đây để nối thêm số lượng pet và dấu chấm cách điệu (·) */}
            <Text className="text-[#8E8E93] text-[12px] font-regular" numberOfLines={1}>
                {item.address || item.loc || 'Unknown location'} · {item.petCount || item.totalPets || 20} pets
            </Text>
        </View>
        
        {/* Nút Follow được gắn sự kiện onPress và đổi style động */}
        <TouchableOpacity 
            onPress={() => onToggleFollow(item)}
            className={`px-5 py-[3.5px] rounded-full shadow-sm ${
                item.isFollowed ? 'bg-[#F8F8F8] shadow-gray-100' : 'bg-[#E89B5A] shadow-orange-100'
            }`}
        >
            <Text className={`text-[14px] font-semibold ${
                item.isFollowed ? 'text-[#8E8E93]' : 'text-white'
            }`}>
                {item.isFollowed ? 'Following' : 'Follow'}
            </Text>
        </TouchableOpacity>
    </TouchableOpacity>
));

const EventCard = memo(({ item, onPress }: { item: any; onPress: (item: any) => void }) => {
    // Format lại ngày tháng giống định dạng trong ảnh (VD: Jan 1, 2026 at 7:00 a.m)
    let displayDate = 'Đang cập nhật';
    if (item.startDate) {
        const d = new Date(item.startDate);
        const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        // Lấy giờ phút, chuyển sang chữ thường (a.m / p.m)
        const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
        // Thêm dấu chấm chuẩn format như ảnh: "a.m" / "p.m"
        const formattedTime = timePart.replace('am', 'a.m').replace('pm', 'p.m');
        displayDate = `${datePart} at ${formattedTime}`;
    }

    // Mock dữ liệu avatar xếp chồng (có thể thay bằng item.interestedUsers từ API nếu có)
    const mockAvatars = [
        'https://i.pravatar.cc/100?img=12', // Thay bằng link avatar thú cưng/người dùng thực tế
        'https://i.pravatar.cc/100?img=13'
    ];

    return (
        <TouchableOpacity 
            className="bg-white rounded-[20px] flex-row shadow-sm border border-[#F3F4F6] mb-4 overflow-hidden"
            activeOpacity={0.8}
            onPress={() => onPress(item)}
        >
            {/* Ảnh cover bên trái, bo tròn theo viền component cha */}
            <Image 
                source={{ uri: item.bannerUrl || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=300&auto=format&fit=crop' }} 
                className="w-[110px] min-h-[120px] bg-gray-200"
                resizeMode="cover" 
            />
            
            {/* Cột nội dung bên phải */}
            <View className="flex-1 p-[14px] justify-between">
                <View className="pr-6 relative"> 
                    <Text className="text-gray-900 font-bold text-[16px] leading-[22px] mb-1" numberOfLines={2}>
                        {item.title || 'Weekend Animal Event'}
                    </Text>
                    <Text className="text-[#8E8E93] text-[13px] font-regular" numberOfLines={1}>
                        {item.locationName || item.address || 'District, City'}
                    </Text>
                    
                    {/* Icon Bookmark - Dùng position absolute để gắn góc phải */}
                    <TouchableOpacity 
                        className="absolute -top-1 right-0" 
                        hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                    >
                        {/* Đổi icon thành dạng filled màu cam nếu event đã được lưu */}
                        <Feather name="bookmark" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                </View>
                
                {/* Dòng dưới cùng chứa thời gian & số lượng quan tâm */}
                <View className="flex-row items-center justify-between mt-4">
                    {/* Thời gian */}
                    <View className="flex-row items-center flex-1 pr-2">
                        <Feather name="calendar" size={13} color="#E89B5A" />
                        <Text className="text-[#E89B5A] text-[9px] font-medium ml-1.5" numberOfLines={1}>
                            {displayDate}
                        </Text>
                    </View>
                    
                    {/* Avatars & Lượt interested */}
                    <View className="flex-row items-center">
                        <View className="flex-row">
                            {mockAvatars.map((avatar, index) => (
                                <Image 
                                    key={index}
                                    source={{ uri: avatar }} 
                                    className={`w-[18px] h-[18px] rounded-full border-2 border-white ${index > 0 ? '-ml-2' : ''}`}
                                />
                            ))}
                        </View>
                        <Text className="text-[#8E8E93] text-[9px] font-regular ml-1">
                            + {item.interestedCount || 123} interested
                        </Text>
                    </View>
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
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 }}
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
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 13, paddingBottom: 20 }}
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
  const initialTab = (type as 'Pet' | 'Shelter' | 'Event') || 'Pet';
  const [activeTab, setActiveTab] = useState<'Pet' | 'Shelter' | 'Event'>(initialTab);
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

  const TabButton = ({ title }: { title: 'Pet' | 'Shelter' | 'Event' }) => {
      const isActive = activeTab === title;
      return (
          <TouchableOpacity 
            onPress={() => setActiveTab(title)}
            className={`flex-1 items-center pb-3 border-b-2 ${isActive ? 'border-[#E89B5A]' : 'border-transparent'}`}
            activeOpacity={0.8}
          >
              <Text className={`text-[16px] ${isActive ? 'text-[#E89B5A] font-semibold' : 'text-gray-400 font-regular'}`}>{title}</Text>
          </TouchableOpacity>
      )
  };

  return (
    <SafeAreaView className="flex-1 bg-white" style={{ paddingTop: StatusBar.currentHeight }}>
      <View className="flex-row items-center px-6 pt-3 gap-3">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
              <Feather name="chevron-left" size={26} color="#1F2937" />
          </TouchableOpacity>
          <View className="flex-1 flex-row items-center bg-[#F9FAFB] rounded-full px-4 h-12 border border-gray-100">
              <Feather name="search" size={18} color="#8E8E93" />
              <TextInput 
                className="flex-1 ml-3 text-[14px] text-gray-800 font-regular"
                placeholder="Search shelters, pets..."
                placeholderTextColor="#8E8E93"
                value={searchInput}
                style={{fontFamily: "Urbanist"}}
                onChangeText={setSearchInput}
                autoFocus={false} 
              />
              <TouchableOpacity onPress={() => router.push('/filter-modal')} activeOpacity={0.6} className="p-1">
                    <Ionicons name="options-outline" size={20} color="#8E8E93" />
              </TouchableOpacity>
          </View>
      </View>

      <View className="flex-row px-6 border-b pt-[38px] border-gray-100">
          <TabButton title="Pet" />
          <TabButton title="Shelter" />
          <TabButton title="Event" />
      </View>

      <View className="flex-1 bg-white">
          {activeTab === 'Pet' && <PetsSection searchQuery={debouncedSearchQuery} onDetailPress={handlePetPress} />}
          {activeTab === 'Shelter' && <SheltersSection searchQuery={debouncedSearchQuery} onProfilePress={handleShelterPress} />}
          {activeTab === 'Event' && <EventsSection searchQuery={debouncedSearchQuery} onEventPress={handleEventPress} />}
      </View>
    </SafeAreaView>
  );
}