// app/organizer-profile.tsx
import { Text } from '@/components/AppText';
import { AuthContext } from '@/contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { memo, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { shelterService } from '../services/shelterService'; // Import chuẩn service của bạn

const { width } = Dimensions.get('window');

const TABS = ['Events', 'About'] as const;
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
                    <Text className="text-gray-900 font-bold text-[16px] leading-[22px] mb-1" numberOfLines={2}>
                        {item.title || 'Weekend Animal Event'}
                    </Text>
                    <Text className="text-[#8E8E93] text-[13px] font-regular" numberOfLines={1}>
                        {item.locationName || item.address || 'District, City'}
                    </Text>
                    <TouchableOpacity className="absolute -top-1 right-0" hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                        <Feather name="bookmark" size={20} color="#9CA3AF" />
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
                        <Text className="text-[#8E8E93] text-[9px] font-regular ml-1">
                            + {item.interestedCount || 0} interested
                        </Text>
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
    const router = useRouter();
    const { id: organizerId } = useLocalSearchParams();
    const { user } = useContext(AuthContext);

    const [activeTab, setActiveTab] = useState<TabType>('Events');
    const [organizer, setOrganizer] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);

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
            <View className="w-full h-[180px] absolute top-0 left-0 right-0">
                <Image 
                    source={
                        organizer.coverUrl 
                            ? { uri: organizer.coverUrl } 
                            : require('../assets/images/default-cover.png') // Nên dùng ảnh local thay vì link placeholder ngoài
                    } 
                    className="w-full h-full opacity-90" 
                    resizeMode="cover" 
                />
                <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent']} style={StyleSheet.absoluteFillObject} />
            </View>

            <SafeAreaView className="flex-1" edges={['top']}>
                <View className="flex-row items-center justify-between px-4 py-3 relative z-20">
                    <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-black/20 backdrop-blur-md rounded-full items-center justify-center border border-white/20">
                        <Feather name="chevron-left" size={24} color="white" />
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={activeTab === 'Events' ? organizer.events : []}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
                    ListHeaderComponent={
                        <View className="mt-[60px]">
                            <View className="bg-white rounded-t-[32px] pt-[50px] pb-6 px-5" style={{ minHeight: 180 }}>
                                <View className="absolute -top-[46px] self-center w-[92px] h-[92px] z-10">
                                    <View style={{ position: 'absolute', width: 140, height: 90, bottom: 46, left: -24, overflow: 'hidden' }}>
                                        <View 
                                            style={{ 
                                                width: 92, height: 92, borderRadius: 46, 
                                                bottom: -46, left: 24, 
                                                backgroundColor: '#FFFFFF', 
                                                borderWidth: 1, borderColor: '#F3F4F6',
                                                shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
                                                shadowOpacity: SHADOW_OPACITY, shadowRadius: SHADOW_RADIUS, elevation: ELEVATION 
                                            }}
                                        />
                                    </View>
                                    <View style={{ position: 'absolute', width: 92, height: 46, top: 46, left: 0, overflow: 'hidden' }}>
                                        <View style={{ width: 92, height: 92, borderRadius: 46, top: -46, left: 0, backgroundColor: '#FFFFFF' }} />
                                    </View>
                                    <View className="absolute inset-0 items-center justify-center pointer-events-none">
                                        {organizer.avatarUrl ? (
                                            <Image 
                                                source={{ uri: organizer.avatarUrl }} 
                                                className="w-[80px] h-[80px] rounded-full border-[1.5px] border-white bg-gray-200" 
                                                resizeMode="cover" 
                                            />
                                        ) : (
                                            <View className="w-[80px] h-[80px] rounded-full border-[1.5px] border-white bg-[#FDF5EF] items-center justify-center">
                                                <Text className="text-[#E89B5A] text-[32px] font-bold">
                                                    {organizer.name?.charAt(0).toUpperCase() || 'P'}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                <View className="absolute top-4 left-0 right-0 flex-row justify-between px-12">
                                    <View className="items-center">
                                        <Text className="text-[16px] font-bold text-gray-900">{organizer.followers?.toLocaleString() || 0}</Text>
                                        <Text className="text-[12px] text-[#8E8E93] mt-0.5">Followers</Text>
                                    </View>
                                    <View className="items-center">
                                        <Text className="text-[16px] font-bold text-gray-900">{organizer.totalEvents || 0}</Text>
                                        <Text className="text-[12px] text-[#8E8E93] mt-0.5">Events</Text>
                                    </View>
                                </View>

                                <View className="items-center mt-2">
                                    <Text className="text-[20px] font-bold text-gray-900 mb-1">{organizer.name}</Text>
                                    <Text className="text-[14px] text-[#8E8E93] mb-5">{organizer.handle}</Text>
                                    
                                    <TouchableOpacity 
                                        onPress={handleToggleFollow}
                                        className={`px-8 py-3 rounded-full flex-row items-center justify-center min-w-[140px] ${
                                            isFollowing ? 'bg-gray-100' : 'bg-[#E89B5A]'
                                        }`}
                                    >
                                        <Text className={`text-[15px] font-semibold ${isFollowing ? 'text-gray-900' : 'text-white'}`}>
                                            {isFollowing ? 'Following' : 'Follow'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

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
                                            <Text className={`font-semibold text-[15px] ${isActive ? 'text-[#E89B5A]' : 'text-gray-400'}`}>
                                                {tab}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                            
                            {activeTab === 'Events' && <View className="h-5 bg-white" />}
                            
                            {activeTab === 'About' && (
                                <View className="p-6 bg-white">
                                    <Text className="text-[16px] font-bold text-gray-900 mb-3">About Organizer</Text>
                                    <Text className="text-[15px] text-gray-600 leading-6 text-justify">
                                        {organizer.about}
                                    </Text>
                                </View>
                            )}
                        </View>
                    }
                    renderItem={({ item }) => {
                        if (activeTab !== 'Events') return null;
                        return (
                            <View className="px-5 bg-white">
                                <EventCard item={item} onPress={handleEventPress} />
                            </View>
                        );
                    }}
                    ListEmptyComponent={
                        activeTab === 'Events' ? (
                            <View className="items-center justify-center py-10 bg-white">
                                <Text className="text-gray-400">Không có sự kiện nào sắp tới.</Text>
                            </View>
                        ) : null
                    }
                />
            </SafeAreaView>
        </View>
    );
}