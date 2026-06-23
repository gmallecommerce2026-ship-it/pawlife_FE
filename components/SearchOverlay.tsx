// app/search.tsx
import { AuthContext } from '@/contexts/AuthContext';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { memo, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Image, Modal, StatusBar, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { eventService } from '../services/eventService';
import { petService } from '../services/petService';
import { shelterService } from '../services/shelterService';
import { useEngagementStore } from '../store/useEngagementStore';

import { Text } from '@/components/AppText';
import { useLanguage } from '@/contexts/LanguageContext';
import { TextInput } from './AppTextInput';
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
            <Text className="text-black font-semibold text-[16px] mb-1">{item.name}</Text>
            <View className="flex-row items-center">
                <Text className="text-gray-400 text-[12px] font-regular">{item.age || '2 years'} · {item.breed || 'Unknown'}</Text>
            </View>
        </View>
    </TouchableOpacity>
));

const ShelterCard = memo(({ item, onPress }: { item: any; onPress: (item: any) => void }) => {
    const { user } = useContext(AuthContext);

    // Lấy state từ Zustand
    const isFollowed = useEngagementStore(state => state.followedShelters[item.id] ?? item.isFollowed);
    const toggleShelterFollow = useEngagementStore(state => state.toggleShelterFollow);

    useEffect(() => {
        if (item.isFollowed !== undefined) {
            useEngagementStore.getState().setInitialShelterFollow(item.id, item.isFollowed);
        }
    }, [item.id, item.isFollowed]);

    const handleToggleFollow = async (e: any) => {
        // CỰC KỲ QUAN TRỌNG: Chặn click lan lên thẻ cha
        if (e && e.stopPropagation) e.stopPropagation();

        toggleShelterFollow(item.id); // Optimistic UI

        try {
            await shelterService.toggleFollow(item.id);
        } catch (error) {
            // console.error("Lỗi khi toggle follow:", error);
            toggleShelterFollow(item.id); // Rollback nếu lỗi
        }
    };

    return (
        <TouchableOpacity
            className="flex-row items-center mb-[21px] bg-white"
            activeOpacity={0.7}
            onPress={() => onPress(item)}
        >
            <Image
                source={{ uri: item.avatarUrl || item.avatar || 'https://via.placeholder.com/200' }}
                className="w-[54px] h-[54px] rounded-full bg-gray-200"
            />
            <View className="flex-1 ml-[14px] pr-2 justify-center">
                <Text className="text-black font-semibold text-[16px] mb-[3px]" numberOfLines={1}>
                    {item.name}
                </Text>
                <Text className="text-[#8E8E93] text-[12px] font-regular" numberOfLines={1}>
                    {item.address || 'Unknown location'} · {item.petCount || 0} pets
                </Text>
            </View>

            {/* Nút Follow */}
            <TouchableOpacity
                onPress={handleToggleFollow}
                style={{ zIndex: 10, elevation: 10 }}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                className={`px-5 py-[3.5px] rounded-full shadow-sm ${isFollowed ? 'bg-[#F8F8F8]' : 'bg-[#E89B5A]'
                    }`}
            >
                <Text className={`text-[14px] font-semibold ${isFollowed ? 'text-[#8E8E93]' : 'text-white'
                    }`}>
                    {isFollowed ? 'Following' : 'Follow'}
                </Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );
});

const EventCard = memo(({ item, onPress }: { item: any; onPress: (item: any) => void }) => {
    const { user } = useContext(AuthContext);
    const { t, language } = useLanguage();
    const isVi = language === 'vi';
    // Lấy state từ Zustand
    const isInterested = useEngagementStore(state => state.interestedEvents[item.id] ?? item.isInterested);
    const toggleEventInterest = useEngagementStore(state => state.toggleEventInterest);

    useEffect(() => {
        if (item.isInterested !== undefined) {
            useEngagementStore.getState().setInitialEventInterest(item.id, item.isInterested);
        }
    }, [item.id, item.isInterested]);

    // Thêm event "e" vào đây
    const handleToggle = async (e: any) => {
        // 1. NGĂN CHẶN thẻ cha nhận click (tránh việc vừa lưu vừa bị đẩy sang trang detail)
        if (e && e.stopPropagation) {
            e.stopPropagation();
        }

        // 2. Optimistic Update (Đổi màu ngay lập tức)
        toggleEventInterest(item.id);

        try {
            // 3. Sửa lại logic user y hệt trang event detail
            const res = await eventService.toggleInterest(item.id, user?.id || 'guest');
            if (!res.success) throw new Error("API failed");
        } catch (error) {
            // console.error("Lỗi khi bookmark:", error);
            // Rollback nếu API báo lỗi
            toggleEventInterest(item.id);
        }
    };

    let displayDate = isVi ? 'Đang cập nhật' : 'Updating';
    if (item.startDate) {
        const d = new Date(item.startDate);
        const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
        const formattedTime = timePart.replace('am', 'a.m').replace('pm', 'p.m');
        displayDate = `${datePart} at ${formattedTime}`;
    }

    const mockAvatars = [
        'https://i.pravatar.cc/100?img=12',
        'https://i.pravatar.cc/100?img=13'
    ];

    return (
        <TouchableOpacity
            className="bg-white rounded-[20px] flex-row shadow-sm border border-[#F3F4F6] mb-4 overflow-hidden"
            activeOpacity={0.8}
            onPress={() => onPress(item)}
        >
            <Image
                source={{ uri: item.bannerUrl || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=300&auto=format&fit=crop' }}
                className="w-[110px] min-h-[120px] bg-gray-200"
                resizeMode="cover"
            />

            <View className="flex-1 p-[14px] justify-between">
                <View className="pr-6 relative">
                    <Text className="text-gray-900 font-bold text-[16px] leading-[22px] mb-1" numberOfLines={2}>
                        {item.title || 'Weekend Animal Event'}
                    </Text>
                    <Text className="text-[#8E8E93] text-[13px] font-regular" numberOfLines={1}>
                        {item.locationName || item.address || 'District, City'}
                    </Text>

                    {/* QUAN TRỌNG: Thêm zIndex, elevation và gọi hàm với (e) */}
                    <TouchableOpacity
                        className="absolute -top-1 right-0"
                        style={{ zIndex: 10, elevation: 10 }}
                        hitSlop={{ top: 20, right: 20, bottom: 20, left: 20 }}
                        onPress={handleToggle}
                    >
                        <Feather
                            name="bookmark"
                            size={20}
                            color={isInterested ? "#E89B5A" : "#9CA3AF"}
                        />
                    </TouchableOpacity>
                </View>

                <View className="flex-row items-center justify-between mt-4">
                    <View className="flex-row items-center flex-1 pr-2">
                        <Feather name="calendar" size={13} color="#E89B5A" />
                        <Text className="text-[#E89B5A] text-[9px] font-medium ml-1.5" numberOfLines={1}>
                            {displayDate}
                        </Text>
                    </View>

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
    const { user } = useContext(AuthContext);

    useEffect(() => {
        const fetchShelters = async () => {
            setLoading(true);
            try {
                // TRUYỀN USER ID VÀO ĐÂY
                const response = await shelterService.getShelters({
                    search: searchQuery,
                    userId: user?.id
                });
                const responseData = response?.data?.data || response?.data || response;
                setShelters(Array.isArray(responseData) ? responseData : []);
            } catch (error) {
                console.error("Error fetching shelters:", error);
                setShelters([]);
            } finally {
                setLoading(false);
            }
        };
        fetchShelters();
    }, [searchQuery, user?.id]);

    if (loading) return <ActivityIndicator size="large" color="#ffa053" style={{ marginTop: 40 }} />;

    return (
        <FlatList
            data={shelters}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 }}
            renderItem={({ item }) => <ShelterCard item={item} onPress={onProfilePress} />}
        />
    );
};

const EventsSection = ({ searchQuery, onEventPress }: { searchQuery: string, onEventPress: (item: any) => void }) => {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const { user } = useContext(AuthContext);
    const handleToggleInterest = async (item: any) => {
        const eventId = item.id;
        const previousStatus = item.isInterested;
        setEvents(prev => prev.map(ev =>
            ev.id === eventId
                ? {
                    ...ev,
                    isInterested: !previousStatus,
                    interestedCount: !previousStatus ? (ev.interestedCount + 1) : (ev.interestedCount - 1)
                }
                : ev
        ));

        try {
            const res = await eventService.toggleInterest(eventId, user?.id || 'guest');
            if (!res.success) {
                throw new Error("API failed");
            }
        } catch (error) {
            // console.error("Lỗi khi toggle interest:", error);
            setEvents(prev => prev.map(ev =>
                ev.id === eventId
                    ? {
                        ...ev,
                        isInterested: previousStatus,
                        interestedCount: previousStatus ? (ev.interestedCount + 1) : (ev.interestedCount - 1)
                    }
                    : ev
            ));
        }
    };
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
// 2. MAIN OVERLAY COMPONENT
// =========================================================================

interface SearchOverlayProps {
    visible: boolean;
    onClose: () => void;
}

export default function SearchOverlay({ visible, onClose }: SearchOverlayProps) {
    const router = useRouter();

    // State quản lý tab và input
    const [activeTab, setActiveTab] = useState<'Pet' | 'Shelter' | 'Event'>('Pet');
    const [searchInput, setSearchInput] = useState('');

    // Giả sử bạn có hook useDebounce, nếu không hãy tự implement lại
    const debouncedSearchQuery = useDebounce(searchInput, 500);
    // const debouncedSearchQuery = searchInput; // Tạm thời dùng trực tiếp nếu chưa có hook

    // Hàm xử lý đóng Modal và clear state
    const handleClose = () => {
        setSearchInput(''); // Xóa text tìm kiếm khi đóng để lần sau mở lên là màn hình sạch
        onClose();
    };

    // Các hàm xử lý navigation (Giữ nguyên logic của bạn)
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

    // Component Tab Button (Giữ nguyên design)
    const TabButton = ({ title }: { title: 'Pet' | 'Shelter' | 'Event' }) => {
        const isActive = activeTab === title;
        return (
            <TouchableOpacity
                onPress={() => setActiveTab(title)}
                className={`flex-1 items-center pb-3 border-b-2 ${isActive ? 'border-[#E89B5A]' : 'border-transparent'
                    }`}
                activeOpacity={0.8}
            >
                <Text
                    className={`text-[16px] ${isActive ? 'text-[#E89B5A] font-semibold' : 'text-gray-400 font-regular'
                        }`}
                >
                    {title}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={handleClose} // Hỗ trợ nút Back cứng trên thiết bị Android
        >
            <SafeAreaView
                className="flex-1 bg-white"
                style={{ paddingTop: StatusBar.currentHeight }}
            >
                {/* HEADER & SEARCH BAR (Giữ nguyên design) */}
                <View className="flex-row items-center px-6 pt-3 gap-3">
                    {/* Nút đóng Overlay thay vì router.back() */}
                    <TouchableOpacity
                        onPress={handleClose}
                        className="p-2 -ml-2"
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Feather name="chevron-down" size={26} color="#1F2937" />
                    </TouchableOpacity>

                    <View className="flex-1 flex-row items-center bg-[#F9FAFB] rounded-full px-4 h-12 border border-gray-100">
                        <Feather name="search" size={18} color="#8E8E93" />
                        <TextInput
                            className="flex-1 ml-3 text-[14px] text-gray-800 font-regular"
                            placeholder="Search shelters, pets..."
                            placeholderTextColor="#8E8E93"
                            value={searchInput}
                            style={{ fontFamily: "Urbanist" }} // Đảm bảo bạn đã load font này trong app
                            onChangeText={setSearchInput}
                            autoFocus={true} // Tự động bật bàn phím khi mở Modal
                        />
                        <TouchableOpacity
                            onPress={() => router.push('/filter-modal')}
                            activeOpacity={0.6}
                            className="p-1"
                        >
                            <Ionicons name="options-outline" size={20} color="#8E8E93" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* TABS (Giữ nguyên design) */}
                <View className="flex-row px-6 border-b pt-[38px] border-gray-100">
                    <TabButton title="Pet" />
                    <TabButton title="Shelter" />
                    <TabButton title="Event" />
                </View>

                {/* CONTENT AREA (Giữ nguyên logic render) */}
                <View className="flex-1 bg-white">
                    {/* Bỏ comment và sử dụng các component của bạn sau khi đã paste code vào phần 1 */}


                    {activeTab === 'Pet' && <PetsSection searchQuery={debouncedSearchQuery} onDetailPress={handlePetPress} />}
                    {activeTab === 'Shelter' && <SheltersSection searchQuery={debouncedSearchQuery} onProfilePress={handleShelterPress} />}
                    {activeTab === 'Event' && <EventsSection searchQuery={debouncedSearchQuery} onEventPress={handleEventPress} />}

                </View>
            </SafeAreaView>
        </Modal>
    );
}