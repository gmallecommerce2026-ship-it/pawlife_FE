// app/organizer-profile.tsx
import { Text } from '@/components/AppText';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { memo, useState } from 'react';
import { Dimensions, FlatList, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// =========================================================================
// 1. TYPES & MOCK DATA (Chuẩn hóa)
// =========================================================================

interface Organizer {
    id: string;
    name: string;
    handle: string;
    avatar: string;
    coverImg: string;
    followers: number;
    totalEvents: number;
    about: string;
}

const ORGANIZER: Organizer = {
    id: 'org_1',
    name: 'Pet Art Collective',
    handle: '@petartcollective',
    avatar: 'https://images.unsplash.com/photo-1517260739337-6799d239ce83?q=80&w=500&auto=format&fit=crop',
    coverImg: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?q=80&w=1000&auto=format&fit=crop', // Cần ảnh bìa để làm nổi bật hiệu ứng cắt lòi avatar
    followers: 1250,
    totalEvents: 34,
    about: 'We are a dedicated group organizing the best pet-friendly art events, workshops, and exhibitions across the country. Our mission is to bond humans and pets through creativity.'
};

const ORGANIZER_EVENTS = [
    {
        id: 'ev_1',
        title: 'Dog art therapy & painting class',
        locationName: 'New York Central Park',
        startDate: '2026-12-23T07:00:00Z',
        bannerUrl: 'https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?q=80&w=400&auto=format&fit=crop',
        interestedCount: 245
    },
    {
        id: 'ev_2',
        title: 'Pet portrait photography workshop',
        locationName: 'Washington DC Studio',
        startDate: '2026-12-16T15:30:00Z',
        bannerUrl: null,
        interestedCount: 112
    },
];

const TABS = ['Events', 'About'] as const;
type TabType = typeof TABS[number];

// =========================================================================
// 2. REUSABLE COMPONENTS (Đảm bảo 100% giống search.tsx)
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
// 3. MAIN SCREEN
// =========================================================================

const SHADOW_OPACITY = 0.05;
const SHADOW_RADIUS = 8;
const ELEVATION = 3;

export default function OrganizerProfileScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabType>('Events');
    const [isFollowing, setIsFollowing] = useState(false);

    const handleEventPress = (item: any) => {
        router.push({ pathname: '/event-detail', params: { id: item.id } });
    };

    return (
        <View className="flex-1 bg-white">
            {/* Ảnh bìa Cover Image */}
            <View className="w-full h-[180px] absolute top-0 left-0 right-0">
                <Image source={{ uri: ORGANIZER.coverImg }} className="w-full h-full opacity-90" resizeMode="cover" />
                <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent']} style={StyleSheet.absoluteFillObject} />
            </View>

            <SafeAreaView className="flex-1" edges={['top']}>
                {/* --- HEADER --- */}
                <View className="flex-row items-center justify-between px-4 py-3 relative z-20">
                    <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-black/20 backdrop-blur-md rounded-full items-center justify-center border border-white/20">
                        <Feather name="chevron-left" size={24} color="white" />
                    </TouchableOpacity>
                </View>

                {/* --- MAIN CONTENT SCROLL --- */}
                <FlatList
                    data={activeTab === 'Events' ? ORGANIZER_EVENTS : []}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
                    ListHeaderComponent={
                        <View className="mt-[60px]">
                            {/* KHUNG THÔNG TIN CÓ AVATAR LÒI LÊN */}
                            <View className="bg-white rounded-t-[32px] pt-[50px] pb-6 px-5" style={{ minHeight: 180 }}>
                                
                                {/* -- AVATAR CUTOUT Y HỆT VIEW-QR-CODE -- */}
                                <View className="absolute -top-[46px] self-center w-[92px] h-[92px] z-10">
                                    {/* LAYER 1: Nửa trên bo tròn bóng đổ */}
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
                                    {/* LAYER 2: Nửa dưới */}
                                    <View style={{ position: 'absolute', width: 92, height: 46, top: 46, left: 0, overflow: 'hidden' }}>
                                        <View style={{ width: 92, height: 92, borderRadius: 46, top: -46, left: 0, backgroundColor: '#FFFFFF' }} />
                                    </View>
                                    {/* LAYER 3: ẢNH AVATAR */}
                                    <View className="absolute inset-0 items-center justify-center pointer-events-none">
                                        <Image source={{ uri: ORGANIZER.avatar }} className="w-[80px] h-[80px] rounded-full bg-gray-200" resizeMode="cover" />
                                    </View>
                                </View>

                                {/* -- STATS (Followers & Events) NẰM 2 BÊN AVATAR -- */}
                                <View className="absolute top-4 left-0 right-0 flex-row justify-between px-8">
                                    <View className="items-center">
                                        <Text className="text-[16px] font-bold text-gray-900">{ORGANIZER.followers.toLocaleString()}</Text>
                                        <Text className="text-[12px] text-[#8E8E93] mt-0.5">Followers</Text>
                                    </View>
                                    <View className="items-center">
                                        <Text className="text-[16px] font-bold text-gray-900">{ORGANIZER.totalEvents}</Text>
                                        <Text className="text-[12px] text-[#8E8E93] mt-0.5">Events</Text>
                                    </View>
                                </View>

                                {/* -- NAME, ID & BUTTON FOLLOW -- */}
                                <View className="items-center mt-2">
                                    <Text className="text-[20px] font-bold text-gray-900 mb-1">{ORGANIZER.name}</Text>
                                    <Text className="text-[14px] text-[#8E8E93] mb-5">{ORGANIZER.handle}</Text>
                                    
                                    <TouchableOpacity 
                                        onPress={() => setIsFollowing(!isFollowing)}
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

                            {/* --- TABS --- */}
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
                            
                            {/* Khoảng trống để list item không bị sát mép tab */}
                            {activeTab === 'Events' && <View className="h-5 bg-white" />}
                            
                            {/* --- ABOUT TAB CONTENT --- */}
                            {activeTab === 'About' && (
                                <View className="p-6 bg-white">
                                    <Text className="text-[16px] font-bold text-gray-900 mb-3">About Organizer</Text>
                                    <Text className="text-[15px] text-gray-600 leading-6 text-justify">
                                        {ORGANIZER.about}
                                    </Text>
                                </View>
                            )}
                        </View>
                    }
                    // --- EVENTS TAB CONTENT (Render items) ---
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
                                <Text className="text-gray-400">No events currently hosted.</Text>
                            </View>
                        ) : null
                    }
                />
            </SafeAreaView>
        </View>
    );
}