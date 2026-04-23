// app/event-detail.tsx
import { Text } from '@/components/AppText';
import { AuthContext } from '@/contexts/AuthContext';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AlertCircle } from 'lucide-react-native';
import React, { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, ImageBackground, ScrollView, Share, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { eventService } from '../services/eventService';
import { useEngagementStore } from '../store/useEngagementStore';

const { width } = Dimensions.get('window');

export default function EventDetailScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();
    const eventId = params.id as string;
    const { user } = useContext(AuthContext);
    const isInterested = useEngagementStore(state => state.interestedEvents[eventId] ?? eventData?.isInterested);
    const toggleEventInterest = useEngagementStore(state => state.toggleEventInterest);


    const [eventData, setEventData] = useState<any>(null);
    const [similarEvents, setSimilarEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isNotFound, setIsNotFound] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const onShare = async () => {
        if (!eventData) return;
        try {
            await Share.share({
                message: `Hãy xem sự kiện thú vị này: ${eventData.title} diễn ra tại ${eventData.locationName || eventData.address}!`,
            });
        } catch (error: any) {
            Alert.alert('Lỗi khi chia sẻ', error.message);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!eventId) {
                setIsNotFound(true);
                setLoading(false);
                return;
            }
            try {
                setLoading(true);

                const res = await eventService.getEventDetail(eventId, user?.id);
                if (res && res.data) {

                    // ==========================================
                    // 🚨 HARD MOCK DATA ORGANIZER ĐỂ TEST UI
                    // ==========================================
                    res.data.organizer = {
                        id: 'org_1', // Khớp với ID bên trang Organizer Profile
                        name: 'Pet Art Collective',
                        avatarUrl: 'https://images.unsplash.com/photo-1517260739337-6799d239ce83?q=80&w=500&auto=format&fit=crop'
                    };
                    // ==========================================

                    setEventData(res.data);
                    if (res.data.isInterested !== undefined) {
                        useEngagementStore.getState().setInitialEventInterest(eventId, res.data.isInterested);
                    }
                } else {
                    setIsNotFound(true);
                }

                const resSimilar = await eventService.getUpcomingEvents(5);
                if (resSimilar.data) {
                    const filteredEvents = resSimilar.data.filter((ev: any) => ev.id !== eventId);
                    setSimilarEvents(filteredEvents);
                }
            } catch (error: any) {
                console.error("Lỗi lấy chi tiết sự kiện:", error);
                setIsNotFound(true);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [eventId, user?.id]);

    const handleInterest = async () => {
        if (actionLoading || !eventData) return;
        setActionLoading(true);
        toggleEventInterest(eventId);
        setEventData((prev: any) => ({
            ...prev,
            interestedCount: !isInterested ? prev.interestedCount + 1 : prev.interestedCount - 1
        }));
        try {
            setActionLoading(true);
            const res = await eventService.toggleInterest(eventId, user?.id || 'guest');
            if (!res.success) throw new Error("API Failed");
        } catch (error) {
            // Rollback UI
            toggleEventInterest(eventId);
            setEventData((prev: any) => ({
                ...prev,
                interestedCount: isInterested ? prev.interestedCount + 1 : prev.interestedCount - 1
            }));
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 bg-white justify-center items-center">
                <ActivityIndicator size="large" color="#ffa053" />
            </View>
        );
    }

    if (isNotFound || !eventData) {
        return (
            <View className="flex-1 bg-white px-6 items-center justify-center">
                <View className="w-24 h-24 bg-red-50 rounded-full items-center justify-center mb-6">
                    <AlertCircle size={48} color="#EF4444" />
                </View>
                <Text className="text-2xl font-bold text-gray-900 mb-3 text-center">
                    Sự kiện không tồn tại
                </Text>
                <Text className="text-gray-500 text-center mb-8 px-4 leading-6">
                    Sự kiện này có thể đã bị xóa, hết hạn hoặc không có quyền truy cập. Vui lòng quay lại màn hình trước.
                </Text>
                <TouchableOpacity
                    className="bg-[#ffa053] px-8 py-4 rounded-full flex-row items-center shadow-sm shadow-orange-200"
                    onPress={() => router.back()}
                    activeOpacity={0.8}
                >
                    <Feather name="chevron-left" size={20} color="white" />
                    <Text className="text-white font-bold text-base ml-2">Quay lại</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const startDate = new Date(eventData.startDate);
    const dayName = startDate.toLocaleDateString('en-US', { weekday: 'long' });
    const monthName = startDate.toLocaleDateString('en-US', { month: 'short' });
    const day = startDate.getDate();
    const year = startDate.getFullYear();
    const timeString = startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const bannerImage = eventData.bannerUrl || eventData.images?.[0]?.url || 'https://via.placeholder.com/800x400.png?text=No+Image';

    // Tọa độ mặc định (Hà Nội) nếu API không trả về
    const mapLatitude = eventData.latitude || 21.028511;
    const mapLongitude = eventData.longitude || 105.804817;

    // Tạo URL embed cho Google Maps
    const mapHtml = `
    <html>
        <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <style>
            body { margin: 0; padding: 0; }
            iframe { width: 100%; height: 100%; border: none; }
        </style>
        </head>
        <body>
        <iframe 
            src="https://maps.google.com/maps?q=${mapLatitude},${mapLongitude}&z=15&output=embed" 
            allowfullscreen>
        </iframe>
        </body>
    </html>
    `;

    return (
        <View className="flex-1 bg-white">
            <StatusBar style="light" />
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false} bounces={false}>
                {/* 1. HERO HEADER */}
                <View className="w-full h-[350px] relative">
                    <ImageBackground source={{ uri: bannerImage }} className="w-full h-full" resizeMode="cover">
                        <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 140 }} />
                        <View className="flex-row justify-between items-center px-6" style={{ marginTop: insets.top + 10 }}>
                            <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-black/20 backdrop-blur-md rounded-full items-center justify-center border border-white/20">
                                <Feather name="chevron-left" size={24} color="white" />
                            </TouchableOpacity>

                            {/* Nút Share & Cờ */}
                            <View className="flex-row items-center space-x-3 gap-3">

                                <TouchableOpacity
                                    onPress={handleInterest}
                                    disabled={actionLoading}
                                    className={`w-10 h-10 backdrop-blur-md rounded-full items-center justify-center border ${isInterested ? 'bg-orange-500 border-orange-500' : 'bg-black/20 border-white/20'}`}
                                >
                                    {actionLoading ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <Ionicons name={isInterested ? "bookmark" : "bookmark-outline"} size={20} color="white" />
                                    )}
                                </TouchableOpacity>
                                <TouchableOpacity onPress={onShare} className="w-10 h-10 bg-black/20 backdrop-blur-md rounded-full items-center justify-center border border-white/20">
                                    <Feather name="share-2" size={20} color="white" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ImageBackground>
                </View>

                {/* 2. MAIN CONTENT BODY */}
                <View className="-mt-10 bg-white rounded-t-[24px] px-[21px] pt-[37px] pb-12 shadow-2xl shadow-black/10">

                    {/* CATEGORY - Căn lề trái, ôm khít nội dung */}
                    {eventData.category && (
                        <View className="flex-row mb-[20px]">
                            <View className="bg-orange-50 px-3 py-1.5 rounded-full">
                                <Text className="text-[14px] font-medium text-orange-600 tracking-wider">
                                    {eventData.category}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* TITLE */}
                    <Text className="text-[24px] font-semibold text-black leading-8 mb-[20px]">
                        {eventData.title}
                    </Text>

                    {/* THỜI GIAN VÀ ĐỊA ĐIỂM (Layout ngang, icon nhỏ gọn, không border) */}
                    <View className="flex-row items-center justify-between mb-6">

                        {/* Cột Địa Điểm */}
                        <View className="flex-row items-center flex-1 ml-2">
                            <View className="w-10 h-10 items-center justify-center mr-3">
                                <Ionicons name="location-sharp" size={18} color="#ffa053" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-[#8E8E93] font-regular text-[16px]" numberOfLines={1}>
                                    {eventData.locationName}
                                </Text>
                                <Text className="text-[#8E8E93] font-regular text-[16px]" numberOfLines={1}>
                                    {eventData.address}
                                </Text>
                            </View>
                        </View>
                        {/* Cột Thời Gian */}
                        <View className="flex-row items-center flex-1 mr-2">
                            <View className="w-10 h-10 items-center justify-center mr-3">
                                <Feather name="calendar" size={18} color="#ffa053" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-[#E89B5A] font-medium text-[16px]">
                                    {day} {monthName}, {year} at {timeString}
                                </Text>
                            </View>
                        </View>

                    </View>

                    {/* NGƯỜI QUAN TÂM (Overlapping Avatars) */}
                    <View className="flex-row items-center mb-[43px]">
                        <View className="flex-row items-center mr-3">
                            {/* Chú ý: Ở đây dùng ảnh placeholder, bạn có thể map dữ liệu thực tế từ API nếu có mảng users */}
                            <Image
                                source={{ uri: 'https://i.pravatar.cc/100?img=1' }}
                                className="w-[40px] h-[40px] rounded-full border-2 border-white z-30 bg-gray-200"
                            />
                            <Image
                                source={{ uri: 'https://i.pravatar.cc/100?img=2' }}
                                className="w-[40px] h-[40px] rounded-full border-2 border-white -ml-3 z-20 bg-gray-200"
                            />
                            <Image
                                source={{ uri: 'https://i.pravatar.cc/100?img=3' }}
                                className="w-[40px] h-[40px] rounded-full border-2 border-white -ml-3 z-10 bg-gray-200"
                            />
                        </View>
                        <Text className="text-[#8E8E93] text-[16px] font-regular">
                            <Text className="text-[#8E8E93] font-regular">+ {eventData.interestedCount || 0} </Text>
                            Interested
                        </Text>
                    </View>



                    {/* ABOUT EVENT */}
                    <View className="mb-[32px]">
                        <Text className="text-[16px] font-medium text-black mb-[12px]">About Event</Text>
                        <Text className="text-[#8E8E93] font-regular leading-relaxed text-[14px] text-justify">
                            {eventData.description || "Chưa có mô tả cho sự kiện này."}
                        </Text>
                    </View>



                    {/* ORGANIZER PROFILE */}
                    {eventData.organizer && (
                        <View className="mb-[32px]">
                            <Text className="text-[16px] font-medium text-black mb-[20px]">Organizer</Text>
                            <TouchableOpacity
                                className="flex-row items-center justify-between"
                                activeOpacity={0.7}
                                onPress={() => router.push({
                                    pathname: '/organizer-profile',
                                    params: { id: eventData.organizer.id }
                                })}
                            >
                                <View className="flex-row items-center">
                                    <Image
                                        source={{ uri: eventData.organizer.avatarUrl || 'https://via.placeholder.com/150.png?text=No+Avatar' }}
                                        className="w-12 h-12 rounded-full mr-3 border border-gray-200"
                                    />
                                    <View>
                                        <Text className="text-black font-medium text-[14px]">{eventData.organizer.name}</Text>
                                        <Text className="text-[#8E8E93] font-regular text-[12px] mt-0.5">Event Organizer</Text>
                                    </View>
                                </View>
                                <View className="w-8 h-8 items-center justify-center">
                                    <Feather name="chevron-right" size={18} color="#000000" />
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* LOCATION MAP */}
                    <View className="mb-[32px]">
                        <Text className="text-[16px] font-medium text-black mb-[12px]">Location</Text>
                        <View className="flex-row items-center mb-[12px]">
                            <Ionicons name="location-sharp" size={18} color="#ffa053" />
                            <Text className="text-gray-600 text-sm ml-2 font-medium flex-1" numberOfLines={2}>
                                {eventData.address || eventData.locationName}
                            </Text>
                        </View>

                        {/* MapView Container dùng WebView */}
                        <View className="w-full h-[145px] rounded-[12px] overflow-hidden border border-gray-200 bg-gray-100 relative pointer-events-none">
                            <WebView
                                originWhitelist={['*']}
                                source={{ html: mapHtml }}
                                style={{ flex: 1 }}
                                scrollEnabled={false}
                                showsHorizontalScrollIndicator={false}
                                showsVerticalScrollIndicator={false}
                                bounces={false}
                            />
                            {/* Lớp phủ trong suốt để chặn thao tác vuốt trượt làm lỗi cuộn trang */}
                            <View className="absolute inset-0 z-10" />
                        </View>
                    </View>
                    {/* GALLERY */}
                    {eventData.images && eventData.images.length > 0 && (
                        <View className="mb-8">
                            <Text className="text-[16px] font-medium text-black mb-[20px]">Photo Gallery</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                                {eventData.images.map((img: any) => (
                                    <TouchableOpacity key={img.id} className='pb-4'
                                        style={{
                                            shadowColor: '#E89B5A', // Màu cam nhạt của bạn
                                            shadowOffset: { width: 2, height: 3 }, // Quan trọng nhất: Cả 2 chiều bằng 0 để bóng tỏa đều 4 hướng
                                            shadowOpacity: 0.25, // Độ đậm của bóng (từ 0 đến 1)
                                            shadowRadius: 3, // Độ lan rộng của bóng
                                            elevation: 4, // Đổ bóng cho Android (Android tự động tỏa khá đều)
                                        }} activeOpacity={0.9}>
                                        <Image source={{ uri: img.url }} className="w-[81px] h-[81px] rounded-[16px] bg-gray-100" resizeMode="cover" />
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}



                    {/* MORE EVENTS */}
                    {similarEvents.length > 0 && (
                        <View className="mb-4">
                            <View className="flex-row justify-between items-center mb-4">
                                <Text className="text-lg font-bold text-gray-900">More Events</Text>
                                <TouchableOpacity onPress={() => router.push('/(tabs)')}>
                                    <Text className="text-orange-500 text-sm font-bold">See All</Text>
                                </TouchableOpacity>
                            </View>

                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingVertical: 8, paddingHorizontal: 4 }}>
                                {similarEvents.map(ev => {
                                    const evDate = new Date(ev.startDate);
                                    return (
                                        <TouchableOpacity
                                            key={ev.id}
                                            activeOpacity={0.8}
                                            onPress={() => router.push({ pathname: '/event-detail', params: { id: ev.id } })}
                                            className="w-64 bg-white border border-gray-100 rounded-2xl p-3 shadow-sm shadow-gray-100 flex-row items-center"
                                        >
                                            <Image
                                                source={{ uri: ev.bannerUrl || ev.images?.[0]?.url || 'https://via.placeholder.com/100.png' }}
                                                className="w-16 h-16 rounded-xl bg-gray-200"
                                            />
                                            <View className="ml-3 flex-1">
                                                <Text className="font-bold text-gray-900 text-sm mb-1" numberOfLines={1}>{ev.title}</Text>
                                                <View className="flex-row items-center mb-2">
                                                    <Ionicons name="location-outline" size={12} color="#9CA3AF" />
                                                    <Text className="text-gray-400 text-[11px] ml-1 flex-1" numberOfLines={1}>{ev.locationName}</Text>
                                                </View>
                                                <View className="flex-row justify-between items-center">
                                                    <Text className="text-xs font-medium text-orange-500">{ev.interestedCount} Interested</Text>
                                                    <View className="items-center bg-gray-50 px-2 py-1 rounded-lg">
                                                        <Text className="text-xs font-bold text-gray-800">{evDate.getDate()}</Text>
                                                        <Text className="text-[8px] font-bold text-gray-500 uppercase">{evDate.toLocaleDateString('en-US', { month: 'short' })}</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    )
                                })}
                            </ScrollView>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}