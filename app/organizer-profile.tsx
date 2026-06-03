// app/organizer-profile.tsx
import { Text } from '@/components/AppText';
import { AuthContext } from '@/contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { memo, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { shelterService } from '../services/shelterService'; // Import chuẩn service của bạn
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const TABS = ['Events', 'Contact'] as const;
type TabType = typeof TABS[number];

// =========================================================================
// REUSABLE COMPONENTS (Giữ nguyên giao diện)
// =========================================================================

const EventCard = memo(({ item, onPress }: { item: any; onPress: (item: any) => void }) => {
    let displayDate = 'Đang cập nhật';
    if (item.startDate) {
        const d = new Date(item.startDate);
        const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
        const formattedTime = timePart.replace('am', 'a.m').replace('pm', 'p.m');
        displayDate = `${datePart} at ${formattedTime}`;
    }

    const interestedUsers = item.interestedUsers || [];

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
                    <Text className="text-gray-900 font-semibold text-[14px] leading-[22px] mb-1" numberOfLines={2}>
                        {item.title || 'Weekend Animal Event'}
                    </Text>
                    <Text className="text-[#8E8E93] text-[12px] font-regular" numberOfLines={1}>
                        {item.locationName || item.address || 'District, City'}
                    </Text>

                    <TouchableOpacity className="absolute top-1 right-0" hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                        <Image
                            source={require('../assets/icon/book-mark-solid.png')}
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
                    <View className="flex-row items-center">
                        {interestedUsers.length > 0 && (
                            <View className="flex-row">
                                {interestedUsers.slice(0, 3).map((user: any, index: number) => {
                                    if (user.avatarUrl) {
                                        return (
                                            <Image
                                                key={user.id || index}
                                                source={{ uri: user.avatarUrl }}
                                                className={`w-[18px] h-[18px] rounded-full border-2 border-white bg-gray-200 ${index > 0 ? '-ml-2' : ''}`}
                                            />
                                        );
                                    }
                                    // Thay vì dùng require() ảnh local, vẽ luôn một View xám chứa icon User
                                    return (
                                        <View
                                            key={user.id || index}
                                            className={`w-[18px] h-[18px] rounded-full border-2 border-white bg-gray-200 items-center justify-center ${index > 0 ? '-ml-2' : ''}`}
                                        >
                                            <Feather name="user" size={10} color="#9CA3AF" />
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
});

// =========================================================================
// MAIN SCREEN
// =========================================================================

const SHADOW_OPACITY = 0.05;
const SHADOW_RADIUS = 8;
const ELEVATION = 3;

export default function OrganizerProfileScreen() {
    const insets = useSafeAreaInsets();

    const router = useRouter();
    const { id: organizerId } = useLocalSearchParams();
    const { user } = useContext(AuthContext);

    const [activeTab, setActiveTab] = useState<TabType>('Events');
    const [organizer, setOrganizer] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);

    const SCROLL_THRESHOLD = 90;
    const HEADER_HEIGHT = insets.top + 50; // Chiều cao header
    const scrollY = useSharedValue(0);
    const { height: SCREEN_HEIGHT } = Dimensions.get('window');

    const headerBarStyle = useAnimatedStyle(() => {
        const opacity = interpolate(scrollY.value, [SCROLL_THRESHOLD - 50, SCROLL_THRESHOLD], [0, 1], Extrapolation.CLAMP);
        return { opacity, height: HEADER_HEIGHT, backgroundColor: 'white' };
    });

    const headerTitleStyle = useAnimatedStyle(() => {
        const translateY = interpolate(scrollY.value, [SCROLL_THRESHOLD - 30, SCROLL_THRESHOLD], [10, 0], Extrapolation.CLAMP);
        const opacity = interpolate(scrollY.value, [SCROLL_THRESHOLD - 30, SCROLL_THRESHOLD], [0, 1], Extrapolation.CLAMP);
        return { opacity, transform: [{ translateY }], fontFamily:"Urbanist" };
    });

    const scrollHandler = useAnimatedScrollHandler((event) => {
        scrollY.value = event.contentOffset.y;
    });

    // FETCH DỮ LIỆU QUA SHELTER SERVICE
    useEffect(() => {
        const fetchOrganizerProfile = async () => {
            if (!organizerId) return;
            try {
                setLoading(true);
                const response = await shelterService.getOrganizerProfile(organizerId as string, user?.id);

                if (response?.success) {
                    setOrganizer(response.data);
                    setIsFollowing(response.data.isFollowing);
                }
            } catch (error) {
                console.error("Lỗi fetch organizer profile:", error);
                Alert.alert("Lỗi", "Không thể tải thông tin ban tổ chức lúc này.");
            } finally {
                setLoading(false);
            }
        };

        fetchOrganizerProfile();
    }, [organizerId, user?.id]);

    const handleEventPress = (item: any) => {
        router.push({ pathname: '/event-detail', params: { id: item.id } });
    };

    const handleToggleFollow = async () => {
        if (!user) {
            Alert.alert("Yêu cầu đăng nhập", "Bạn cần đăng nhập để theo dõi trạm cứu hộ.");
            return;
        }

        // Optimistic UI Update
        const prevFollowState = isFollowing;
        setIsFollowing(!isFollowing);
        setOrganizer((prev: any) => ({
            ...prev,
            followers: prevFollowState ? prev.followers - 1 : prev.followers + 1
        }));

        try {
            // Dùng hàm toggleFollow có sẵn của bạn
            await shelterService.toggleFollow(organizerId as string);
        } catch (error) {
            // Revert nếu API lỗi
            setIsFollowing(prevFollowState);
            setOrganizer((prev: any) => ({
                ...prev,
                followers: prevFollowState ? prev.followers + 1 : prev.followers - 1
            }));
            Alert.alert("Lỗi", "Không thể thực hiện thao tác. Vui lòng thử lại.");
        }
    };

    if (loading) {
        return (
            <View className="flex-1 bg-white justify-center items-center">
                <ActivityIndicator size="large" color="#E89B5A" />
            </View>
        );
    }

    if (!organizer) {
        return (
            <View className="flex-1 bg-white justify-center items-center">
                <Text>Không tìm thấy thông tin ban tổ chức.</Text>
                <TouchableOpacity onPress={() => router.back()} className="mt-4 p-2">
                    <Text className="text-[#E89B5A]">Quay lại</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-white">
            <Animated.View
                style={[headerBarStyle, { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 10, paddingHorizontal: 20 }]}
            >
                <View className="flex-1 items-center">
                    <Animated.Text style={headerTitleStyle} className="text-[20px] font-semibold text-black tracking-[0.5px]">
                        {organizer.name}
                    </Animated.Text>
                </View>
            </Animated.View>

            <View style={{ top: insets.top + 10, zIndex: 110 }} className="absolute left-5 right-5 flex-row justify-between items-center">
                <View
                    className="absolute left-1 right-1 flex-row justify-between z-30"
                >
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
                        className="absolute w-10 h-10 rounded-full items-center justify-center"
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
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            }}>
                            <LinearGradient
                                colors={['rgba(221, 221, 221, 0.5)', 'rgba(247, 247, 247, 0.8)', '#FFFFFF']}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                locations={[0, 0.3, 1]}

                                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 9999 }}
                            />
                            <Feather name="chevron-left" size={20} color="#00000" />
                        </View>
                    </TouchableOpacity>

                    <View style={{ position: 'absolute', right: 0, height: 40, justifyContent: 'center', alignItems: 'flex-end' }}>

                    </View>
                </View>
            </View>

            <Animated.ScrollView
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                stickyHeaderIndices={[]}
            >
                <Image
                    source={
                        organizer.coverUrl
                            ? { uri: organizer.coverUrl }
                            : require('../assets/images/default-cover.png') // Nên dùng ảnh local thay vì link placeholder ngoài
                    }
                    style={{ width: width, height: SCREEN_HEIGHT * 0.22 }}
                    resizeMode="cover"
                />

                <View className="bg-white rounded-t-[24px] bottom-[32px] pb-6 min-h-screen"
                    style={{
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: -7 },
                        shadowOpacity: 0.2,
                        shadowRadius: 10,
                        elevation: 5 // Bóng mờ nhẹ giúp avatar nổi bật khỏi cover phía sau
                    }}>
                    <View className="flex-row justify-between w-full px-2">
                        <View className="flex-1 items-center mt-[20px]">
                            <Text className="text-[20px] font-semibold text-black">
                                {organizer.followers?.toLocaleString() || 0}
                            </Text>
                            <Text className="text-[16px] font-regular text-[#8E8E93] mt-0.5">
                                Followers
                            </Text>
                        </View>

                        <View className="w-[132px] items-center z-10">
                            <View className="h-[66px] w-full">
                                <View
                                    className="absolute -top-[66px] left-0 w-[132px] h-[132px] bg-white rounded-full items-center justify-center"
                                >
                                    <Image
                                        source={{ uri: organizer?.avatar || 'https://via.placeholder.com/132' }}
                                        style={{ width: 120, height: 120, borderRadius: 60 }}
                                        resizeMode="cover"
                                    />
                                </View>
                            </View>
                        </View>

                        <View className="flex-1 items-center mt-[20px]">
                            <Text className="text-[20px] font-semibold text-black">
                                {organizer.totalEvents || 0}
                            </Text>
                            <Text className="text-[16px] font-regular text-[#8E8E93] mt-0.5">
                                Events
                            </Text>
                        </View>
                    </View>

                    <View className="items-center mt-4 mb-4">
                        <Text className="text-[20px] font-semibold text-black mb-2">{organizer.name}</Text>
                        <Text className="text-[16px] text-[#8E8E93] mb-3">{organizer.handle}</Text>

                        <TouchableOpacity
                            onPress={handleToggleFollow}
                            className={`px-11 py-2 rounded-full flex-row items-center justify-center min-w-[140px] ${isFollowing ? 'bg-gray-200' : 'bg-[#E89B5A]'
                                }`}
                        >
                            <Text className={`text-[16px] font-semibold ${isFollowing ? 'text-gray-900' : 'text-white'}`}>
                                {isFollowing ? 'Following' : 'Follow'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View className='px-[20px]'>

                        <View className="flex-row border-b border-gray-100 bg-white">
                            {TABS.map((tab) => {
                                const isActive = activeTab === tab;
                                return (
                                    <TouchableOpacity
                                        key={tab}
                                        onPress={() => setActiveTab(tab)}
                                        className={`flex-1 items-center py-4 border-b-2 ${isActive ? 'border-[#E89B5A]' : 'border-transparent'}`}
                                        activeOpacity={0.7}
                                    >
                                        <Text className={`text-[16px] ${isActive ? 'text-[#E89B5A] font-semibold' : 'text-gray-400 font-regular'}`}>
                                            {tab}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {activeTab === 'Contact' ? (
                           
                            <View className="mt-[21px]">
                                {/* About Shelter */}
                                <Text className="text-[16px] font-medium text-black mb-2">About Shelter</Text>
                                <Text className="text-[14px] text-[#8E8E93] leading-5 mb-5">
                                    {organizer.about || "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec a efficitur lorem, a vulputate odio. Vestibulum gravida commodo turpis sed finibus. Quisque vel porttitor quam"}
                                </Text>

                                {/* Contact Info */}
                                <Text className="text-[16px] font-medium text-black mb-2">Contact Info</Text>
                                <View className="gap-y-3 mb-5">
                                    <View className="flex-row items-center gap-x-3">
                                        <Image
                                            source={require('../assets/icon/message.png')}
                                            style={{ width: 13, height: 13 }}
                                            resizeMode="cover"
                                        />
                                        <Text className="text-[14px] text-[#8E8E93]">Send message</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => { }} className="flex-row items-center gap-x-3">
                                        <Image
                                            source={require('../assets/icon/phone-info.png')}
                                            style={{ width: 13, height: 13 }}
                                            resizeMode="cover"
                                        />
                                        <Text className="text-[14px] text-[#8E8E93]">(+84) 0912345678</Text>
                                    </TouchableOpacity>
                                    <View className="flex-row items-center gap-x-3">
                                        <Image
                                            source={require('../assets/icon/email.png')}
                                            style={{ width: 13, height: 10 }}
                                            resizeMode="cover"
                                        />
                                        <Text className="text-[14px] text-[#8E8E93]">sannhanhieucho@email.com</Text>
                                    </View>
                                </View>

                                {/* More Info */}
                                <Text className="text-[16px] font-medium text-black mb-2">More Info</Text>
                                <View className="gap-y-3">
                                    <View className="flex-row items-center gap-x-3">
                                        <Image source={require('../assets/icon/earth.png')} style={{ width: 13, height: 13 }} resizeMode="cover" />
                                        {/* Sử dụng dữ liệu thật */}
                                        <Text className="text-[14px] text-[#8E8E93]">Based in Vietnam"</Text>
                                    </View>
                                    <View className="flex-row items-center gap-x-3">
                                        <Image source={require('../assets/icon/info.png')} style={{ width: 13, height: 13 }} resizeMode="cover" />
                                        {/* Sử dụng ngày tạo thật từ DB */}
                                        <Text className="text-[14px] text-[#8E8E93]">Joined Jan 1, 2023</Text>
                                    </View>

                                    {/* Render theo trạng thái verified */}
                                    <View className="flex-row items-center gap-x-3">
                                        <Image source={require('../assets/icon/verified.png')} style={{ width: 13, height: 13 }} resizeMode="cover" />
                                        <Text className="text-[14px] text-[#8E8E93]">Verified Jan 1, 2023</Text>
                                    </View>
                                </View>
                            </View>
                        ) : (
                            <View className="flex-1 items-center bg-white mt-[21px]" >
                                {organizer.events.length > 0 ? (
                                    organizer.events.map((items: any) => (
                                        <View key={items.id} className="w-full">
                                            <EventCard item={items} onPress={handleEventPress} />
                                        </View>
                                    ))

                                ) : (
                                    <View className="items-center justify-center py-10 bg-white">
                                        <Text className="text-gray-400">Không có sự kiện nào sắp tới.</Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {activeTab === 'Events' && <View className="h-5 bg-white" />}
                    </View>

                </View>

            </Animated.ScrollView>
        </View>
    );
}