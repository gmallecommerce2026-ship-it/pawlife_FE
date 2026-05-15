import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useContext, useEffect, useState, useRef, useMemo } from 'react';
import { ActivityIndicator, FlatList, Image, TouchableOpacity, View, TextInput, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    interpolate,
    interpolateColor
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { Text } from '@/components/AppText';
import { AuthContext } from '@/contexts/AuthContext';
import { eventService } from '../services/eventService';

const { width } = Dimensions.get('window');
const AnimatedFeather = Animated.createAnimatedComponent(Feather);

export default function InterestedEventsScreen() {
    const router = useRouter();
    const { user } = useContext(AuthContext);
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // --- LOGIC SEARCH & ANIMATION ---
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

    // --- ANIMATED STYLES ---
    const backButtonStyle = useAnimatedStyle(() => ({
        opacity: interpolate(searchAnimation.value, [0, 0.5], [1, 0]),
        transform: [{ scale: interpolate(searchAnimation.value, [0, 1], [1, 0.8]) }],
        zIndex: isSearching ? -1 : 10,
    }));

    const headerTitleStyle = useAnimatedStyle(() => ({
        opacity: interpolate(searchAnimation.value, [0, 0.5], [1, 0]),
        transform: [{ translateX: interpolate(searchAnimation.value, [0, 1], [0, -20]) }]
    }));

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
            backgroundColor, borderTopColor, borderLeftColor, borderBottomColor, borderRightColor,
        };
    });

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

    // --- FETCH DATA ---
    useEffect(() => {
        const fetchInterestedEvents = async () => {
            if (!user?.id) {
                setLoading(false);
                return;
            }
            try {
                const res = await eventService.getInterestedEvents(user.id);
                if (res.success) {
                    setEvents(res.data);
                }
            } catch (error) {
                console.error("Lỗi tải danh sách sự kiện quan tâm:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchInterestedEvents();
    }, [user?.id]);

    // --- LỌC DỮ LIỆU KHI TÌM KIẾM ---
    const filteredEvents = useMemo(() => {
        if (!searchQuery.trim()) return events;
        return events.filter(event =>
            (event.title || '').toLowerCase().includes(searchQuery.toLowerCase().trim())
        );
    }, [events, searchQuery]);

    const handleRemoveInterest = async (eventId: string | number) => {
        setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
        try {
            // await eventService.removeInterestedEvent(eventId); 
        } catch (error) {
            console.error("Lỗi khi hủy quan tâm event:", error);
        }
    };

    const renderEventItem = ({ item }: { item: any }) => {
        let displayDate = 'Đang cập nhật';
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
                onPress={() => router.push({
                    pathname: '/event-detail',
                    params: {
                        id: item.id,
                        title: item.title,
                        location: item.locationName || item.address,
                        date: item.startDate,
                        image: item.bannerUrl
                    }
                })}
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

                        <TouchableOpacity
                            className="absolute -top-1 right-0"
                            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                            onPress={() => handleRemoveInterest(item.id)}
                        >
                            <Image
                                source={require('../assets/icon/book-mark.png')}
                                style={{ width: 10, height: 14 }}
                                resizeMode="cover"
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
    };

    return (
        <View className="flex-1 bg-white">
            <SafeAreaView className="flex-1" edges={['top', 'bottom']}>

                {/* --- HEADER --- */}
                <View style={{ height: 44, justifyContent: 'center', marginBottom: 16, marginTop: 8 }}>
                    {/* NÚT BACK */}
                    <Animated.View style={[backButtonStyle, { position: 'absolute', left: 20 }]}>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            activeOpacity={0.8}
                            style={{
                                shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.1, shadowRadius: 5, elevation: 3,
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
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} locations={[0, 0.3, 1]}
                                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 9999 }}
                                />
                                <Feather name="chevron-left" size={20} color="#000000" />
                            </View>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* TITLE */}
                    <Animated.View style={[headerTitleStyle, { position: 'absolute', left: 0, right: 0, alignItems: 'center', pointerEvents: 'none' }]}>
                        <Text className="text-[20px] font-semibold text-black">Interested Events</Text>
                    </Animated.View>

                    {/* NÚT SEARCH KÍNH MỜ -> THANH SEARCH */}
                    <View style={{ position: 'absolute', right: 20, height: 40, justifyContent: 'center', alignItems: 'flex-end', zIndex: 100 }}>
                        <TouchableOpacity
                            onPress={isSearching ? undefined : handleOpenSearch}
                            activeOpacity={isSearching ? 1 : 0.8}
                            style={{
                                shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.1, shadowRadius: 5, elevation: 3,
                            }}
                        >
                            <Animated.View
                                className="overflow-hidden flex-row items-center"
                                style={[{ height: 36, borderRadius: 28 }, searchContainerStyle]}
                            >
                                <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, gradientStyle]}>
                                    <LinearGradient
                                        colors={['rgba(221, 221, 221, 0.5)', 'rgba(247, 247, 247, 0.8)', '#FFFFFF']}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} locations={[0, 0.3, 1]}
                                        style={{ flex: 1, borderRadius: 9999 }}
                                    />
                                </Animated.View>

                                <AnimatedFeather name="search" size={18} style={searchIconStyle} />

                                <Animated.View style={[searchInputStyle, { flexDirection: 'row', alignItems: 'center', flex: 1 }]}>
                                    <TextInput
                                        ref={inputRef}
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        placeholder="Search events..."
                                        placeholderTextColor="#8E8E93"
                                        className="flex-1 text-[14px] text-black"
                                    />
                                    {isSearching && (
                                        <TouchableOpacity onPress={handleCloseSearch} className="ml-1 px-1">
                                            <Ionicons name="close-circle" size={20} color="#8E8E93" />
                                        </TouchableOpacity>
                                    )}
                                </Animated.View>
                            </Animated.View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* --- BODY (LOADING / EMPTY / LIST) --- */}
                {loading ? (
                    <View className="flex-1 justify-center items-center">
                        <ActivityIndicator size="large" color="#ffa053" />
                    </View>
                ) : (
                    <FlatList
                        data={filteredEvents} // Chạy danh sách đã lọc
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={renderEventItem}
                        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 13, paddingBottom: 20 }}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={() => {
                            // TRẠNG THÁI 1: CHƯA QUAN TÂM EVENT NÀO
                            if (events.length === 0) {
                                return (
                                    <View className="flex items-center justify-center px-6 pb-20 mt-20">
                                        <Image
                                            source={require('../assets/images/cat-sleepy.png')}
                                            resizeMode="contain"
                                            className="top-7 z-10"
                                            style={{ width: 330, height: 280 }}
                                        />
                                        <Text className="text-gray-800 text-lg font-bold mt-4">A little empty here</Text>
                                        <Text className="text-gray-400 text-center mt-2 mb-4">Look like we missing a paw...</Text>
                                        <TouchableOpacity
                                            className="w-full bg-white py-5 rounded-[24px] border border-dashed border-orange-300 flex-row justify-center items-center active:bg-orange-50 mt-2"
                                            activeOpacity={0.7}
                                            onPress={() => router.push('/')}
                                        >
                                            <Text className="text-[#F59E0B] font-thin text-base">Upcoming events</Text>
                                        </TouchableOpacity>
                                    </View>
                                );
                            }

                            // TRẠNG THÁI 2: SEARCH KHÔNG RA KẾT QUẢ
                            return (
                                <View className="flex-1 items-center justify-center mt-[100px]">
                                    <View className="w-20 h-20 bg-gray-50 rounded-full items-center justify-center mb-4">
                                        <Feather name="search" size={32} color="#9CA3AF" />
                                    </View>
                                    <Text className="text-black text-[18px] font-bold">No results found</Text>
                                    <Text className="text-gray-400 text-[14px] text-center mt-2 px-10">
                                        We couldn't find any events matching "{searchQuery}"
                                    </Text>
                                </View>
                            );
                        }}
                    />
                )}
            </SafeAreaView>
        </View>
    );
}