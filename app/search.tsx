// app/search.tsx
import { Text } from '@/components/AppText';
import { TextInput } from '@/components/AppTextInput';
import { AuthContext } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLocalizedData } from '@/hooks/useLocalizedData';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { memo, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, DeviceEventEmitter, Dimensions, FlatList, Image, LayoutAnimation, StatusBar, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { eventService } from '../services/eventService';
import { petService } from '../services/petService';
import { shelterService } from '../services/shelterService';
import { useEngagementStore } from '../store/useEngagementStore';
const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48 - 16) / 2;

// --- CẬP NHẬT HÀM GETAGE HỖ TRỢ SONG NGỮ BẰNG isVi ---
const getAge = (dobString?: string, isVi?: boolean) => {
    if (!dobString) return isVi ? 'Không rõ' : 'Unknown';
    const dob = new Date(dobString);
    const diff_ms = Date.now() - dob.getTime();
    const age_dt = new Date(diff_ms);
    const years = Math.abs(age_dt.getUTCFullYear() - 1970);
    const months = age_dt.getUTCMonth();

    if (years > 0) return `${years} ${isVi ? 'tuổi' : (years > 1 ? 'years' : 'year')}`;
    if (months > 0) return `${months} ${isVi ? 'tháng' : (months > 1 ? 'months' : 'month')}`;
    return isVi ? 'sơ sinh' : 'newborn';
};

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

const formatBreed = (breed?: any) => {
    if (!breed) return '';
    const breedStr = typeof breed === 'string' ? breed : (breed.vi || breed.en || '');
    if (!breedStr) return '';
    if (breedStr.length <= 15) return breedStr;
    const words = breedStr.split(' ');
    if (words.length > 1) {
        const firstLetter = words[0][0];
        const restOfWords = words.slice(1).join(' ');
        return `${firstLetter}. ${restOfWords}`;
    }
    return `${breedStr.substring(0, 15)}...`;
};


// --- CẬP NHẬT PETCARD NHẬN THÊM PROPS isVi ---
const PetCard = memo(({ item, onPress, isVi }: { item: any; onPress: (item: any) => void; isVi: boolean }) => {
    const { l } = useLocalizedData(); // 👈 thêm

    return (

        <TouchableOpacity
            className="bg-transparent mb-[21px]"
            style={{ width: COLUMN_WIDTH }}
            activeOpacity={0.9}
            onPress={() => onPress(item)}
        >
            <View className="relative">
                <Image
                    source={{ uri: item.images?.[0]?.url || item.image || 'https://via.placeholder.com/600' }}
                    className="w-full aspect-square rounded-[24px] bg-gray-100"
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
                <View className="flex-row items-start">
                    <Image
                        className='top-1'
                        source={item.gender?.toLowerCase() === 'female' ? require('../assets/icon/female.png') : require('../assets/icon/male.png')}
                        style={{ width: 10, height: 10 }}
                        resizeMode="cover"
                    />

                    <Text
                        className="text-[12px] text-[#8E8E93] text-center mt-0.5 ml-1.5"
                        numberOfLines={1}
                    >
                        {item.age || getAge(item.dob, isVi)} · {formatBreed(l(item.breed)) || (isVi ? 'Không rõ' : 'Unknown')}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
});

const ShelterCard = memo(({ item, onPress }: { item: any; onPress: (item: any) => void }) => {
    const { user } = useContext(AuthContext);
    const [isLoading, setIsLoading] = useState(false);
    const queryClient = useQueryClient();
    const isFollowed = useEngagementStore(state => state.followedShelters[item.id] ?? item.isFollowed);
    const toggleShelterFollow = useEngagementStore(state => state.toggleShelterFollow);

    useEffect(() => {
        const subscription = DeviceEventEmitter.addListener('SHELTER_FOLLOW_TOGGLED', (event) => {
            if (event.shelterId === item.id) {
                useEngagementStore.getState().setInitialShelterFollow(item.id, event.isFollowed);
            }
        });
        return () => subscription.remove();
    }, [item.id]);

    useEffect(() => {
        if (item.isFollowed !== undefined) {
            useEngagementStore.getState().setInitialShelterFollow(item.id, item.isFollowed);
        }
    }, [item.id, item.isFollowed]);

    const handleToggleFollow = async (e: any) => {
        if (e && e.stopPropagation) e.stopPropagation();
        if (isLoading) return;

        setIsLoading(true);
        toggleShelterFollow(item.id);

        try {
            await shelterService.toggleFollow(item.id);
            DeviceEventEmitter.emit('SHELTER_FOLLOW_TOGGLED', { shelterId: item.id, isFollowed: !isFollowed });
            queryClient.invalidateQueries({ queryKey: ['followed-shelters'] });
        } catch (error) {
            console.error("Lỗi khi toggle follow:", error);
            toggleShelterFollow(item.id);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <TouchableOpacity
            className="flex-row items-center mb-[21px] bg-white"
            activeOpacity={0.7}
            onPress={() => onPress(item)}
        >
            <Image
                source={{ uri: item.avatarUrl || item.coverUrl || 'https://via.placeholder.com/200' }}
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

            <TouchableOpacity
                onPress={handleToggleFollow}
                disabled={isLoading}
                style={{ zIndex: 10, elevation: 10, opacity: isLoading ? 0.7 : 1 }}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                className={`px-5 py-[3.5px] rounded-full shadow-sm ${isFollowed ? 'bg-[#F8F8F8]' : 'bg-[#E89B5A]'}`}
            >
                <Text className={`text-[14px] font-semibold ${isFollowed ? 'text-[#8E8E93]' : 'text-white'}`}>
                    {isFollowed ? 'Following' : 'Follow'}
                </Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );
});

const EventCard = memo(({ item, onPress }: { item: any; onPress: (item: any) => void }) => {
    const { user } = useContext(AuthContext);
    const queryClient = useQueryClient();
    const { language } = useLanguage();
    const { l } = useLocalizedData();
    const isVi = language === 'vi';

    const isInterested = useEngagementStore(state => state.interestedEvents[item.id] ?? item.isInterested);
    const toggleEventInterest = useEngagementStore(state => state.toggleEventInterest);

    useEffect(() => {
        if (item.isInterested !== undefined) {
            useEngagementStore.getState().setInitialEventInterest(item.id, item.isInterested);
        }
    }, [item.id, item.isInterested]);

    const handleToggle = async (e: any) => {
        if (e && e.stopPropagation) {
            e.stopPropagation();
        }

        toggleEventInterest(item.id);

        try {
            const res = await eventService.toggleInterest(item.id, user?.id || 'guest');
            if (!res.success) throw new Error("API failed");
            queryClient.invalidateQueries({ queryKey: ['interested-events', user?.id] });
        } catch (error) {
            console.error("Lỗi khi bookmark:", error);
            toggleEventInterest(item.id);
        }
    };

    let displayDate = isVi ? 'Đang cập nhật' : 'Upcoming';
    if (item.startDate) {
        const d = new Date(item.startDate);
        if (isVi) {
            const datePart = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const timePart = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
            displayDate = `${timePart} - ${datePart}`;
        } else {
            const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
            const formattedTime = timePart.replace('am', 'a.m').replace('pm', 'p.m');
            displayDate = `${datePart} at ${formattedTime}`;
        }
    }

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
                    <Text className="text-gray-900 font-bold text-[16px] leading-[22px] mb-1 -top-1" numberOfLines={2}>
                        {l(item.title) || (isVi ? 'Sự kiện thú cưng' : 'Weekend Animal Event')}
                    </Text>
                    <Text className="text-[#8E8E93] text-[13px] font-regular" numberOfLines={1}>
                        {l(item.locationName) || l(item.address) || (isVi ? 'Đang cập nhật vị trí' : 'Unknown location')}
                    </Text>

                    <TouchableOpacity
                        className="absolute right-0"
                        style={{ zIndex: 10, elevation: 10 }}
                        hitSlop={{ top: 20, right: 20, bottom: 20, left: 20 }}
                        onPress={handleToggle}
                    >
                        <Image
                            source={isInterested ? require('../assets/icon/book-mark.png') : require('../assets/icon/book-mark-solid.png')}
                            style={{ width: 10, height: 14 }}
                            resizeMode="cover"
                        />
                    </TouchableOpacity>
                </View>

                <View className="flex-row items-center justify-between mt-4">
                    <View className="flex-row items-center flex-1 pr-2">
                        <Feather name="calendar" size={13} color="#E89B5A" />
                        <Text className="text-[#E89B5A] text-[12px] font-medium ml-1.5" numberOfLines={1}>
                            {displayDate}
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

// --- TRUYỀN isVi VÀO PETS SECTION VÀ PETCARD ---
const PetsSection = ({ searchQuery, onDetailPress, isVi }: { searchQuery: string, onDetailPress: (item: any) => void, isVi: boolean }) => {
    const [pets, setPets] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeType, setActiveType] = useState<'All' | 'Dog' | 'Cat'>('All');

    useEffect(() => {
        const fetchPets = async () => {
            setLoading(true);
            try {
                const params: any = { search: searchQuery };

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
    }, [searchQuery, activeType]);

    return (
        <View className="flex-1 px-6 pt-4">
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
                            <Text className="text-gray-400">{isVi ? 'Không tìm thấy thú cưng nào' : 'No pets found'}</Text>
                        </View>
                    )}
                    renderItem={({ item }) => <PetCard item={item} onPress={onDetailPress} isVi={isVi} />}
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
            console.error("Lỗi khi toggle interest:", error);
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
// 3. MAIN COMPONENT 
// =========================================================================

export default function SearchScreen() {
    const router = useRouter();
    const { type } = useLocalSearchParams();
    const initialTab = (type as 'Pet' | 'Shelter' | 'Event') || 'Pet';
    const [activeTab, setActiveTab] = useState<'Pet' | 'Shelter' | 'Event'>(initialTab);
    const [searchInput, setSearchInput] = useState('');
    const debouncedSearchQuery = useDebounce(searchInput, 500);

    // Lấy language để dùng song ngữ nội tuyến
    const { language } = useLanguage();
    const { l } = useLocalizedData();
    const isVi = language === 'vi';

    const [isFocused, setIsFocused] = useState(false);
    const handleFocus = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsFocused(true);
    };

    const handleBlur = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsFocused(false);
    };

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
                image: item.avatarUrl || item.coverUrl || item.img
            }
        });
    };


    const handleEventPress = (item: any) => {
        router.push({
            pathname: '/event-detail',
            params: {
                id: item.id,
                title: l(item.title) || item.title,
                location: l(item.locationName) || item.address,
                date: item.startDate,
                image: item.bannerUrl
            }
        });
    };



    const TabButton = ({ title }: { title: 'Pet' | 'Shelter' | 'Event' }) => {
        const isActive = activeTab === title;

        const getDisplayTitle = () => {
            if (isVi) {
                switch (title) {
                    case 'Pet': return 'Thú cưng';
                    case 'Shelter': return 'Trạm cứu hộ';
                    case 'Event': return 'Sự kiện';
                    default: return title;
                }
            }
            return title;
        };

        return (
            <TouchableOpacity
                onPress={() => setActiveTab(title)}
                className="flex-1 items-center justify-center pb-3 relative"
            >
                <Text
                    className={`text-[16px]  ${isActive ? 'text-[#E89B5A] font-semibold' : 'text-[#8E8E93] font-regular'
                        }`}
                >
                    {getDisplayTitle()}
                </Text>

                {isActive && (
                    <View
                        className="absolute bottom-[-1px] w-full h-[3px] bg-[#E89B5A] rounded-full"
                    />
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-white" style={{ paddingTop: StatusBar.currentHeight }}>
            <View className="flex-row items-center px-6 pt-3 gap-3">
                {!isFocused && (
                    <TouchableOpacity
                        onPress={() => router.back()}
                        activeOpacity={0.7}
                        style={{
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 5,
                            elevation: 3,
                        }}
                    >
                        <View className="overflow-hidden rounded-full w-[36px] h-[36px] items-center justify-center"
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 28,
                                borderWidth: 0.5,
                                borderTopColor: 'white',
                                borderLeftColor: 'white',
                                borderBottomColor: 'transparent',
                                borderRightColor: 'transparent',
                                justifyContent: 'center',
                                alignItems: 'center',
                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            }}>
                            <LinearGradient
                                colors={['rgba(221, 221, 221, 0.3)', 'rgba(247, 247, 247, 0.7)', '#FFFFFF']}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                locations={[0, 0.3, 1]}

                                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 9999 }}
                            />
                            <Feather name="chevron-left" size={20} color="#1F2937" />
                        </View>
                    </TouchableOpacity>
                )}
                <View className="flex-1 flex-row items-center bg-[#F8F8F8] rounded-full px-4 h-12 border border-[#EBEBEB]">
                    <Feather name="search" size={18} color="#8E8E93" />
                    <TextInput
                        className="flex-1 ml-3 text-[14px] text-gray-800 font-regular"
                        placeholder={isVi ? 'Tìm kiếm trạm cứu hộ, thú cưng...' : 'Search shelters, pets...'}
                        placeholderTextColor="#8E8E93"
                        value={searchInput}
                        style={{ fontFamily: "Urbanist" }}
                        onChangeText={setSearchInput}
                        autoFocus={false}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                    />
                    {searchInput.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchInput('')} activeOpacity={0.6} className="p-1 ml-2">
                            <Feather name="x-circle" size={16} color="#8E8E93" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            <View className='px-[20px] mb-[6px]'>
                <View className="flex-row border-b pt-[38px] border-[#545456]/35" style={{ borderBottomWidth: 0.33 }}>
                    <TabButton title="Pet" />
                    <TabButton title="Shelter" />
                    <TabButton title="Event" />
                </View>
            </View>

            <View className="flex-1 bg-white">
                {activeTab === 'Pet' && <PetsSection searchQuery={debouncedSearchQuery} onDetailPress={handlePetPress} isVi={isVi} />}
                {activeTab === 'Shelter' && <SheltersSection searchQuery={debouncedSearchQuery} onProfilePress={handleShelterPress} />}
                {activeTab === 'Event' && <EventsSection searchQuery={debouncedSearchQuery} onEventPress={handleEventPress} />}
            </View>
        </SafeAreaView>
    );
}