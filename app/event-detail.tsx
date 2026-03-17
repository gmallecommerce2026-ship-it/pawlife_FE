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
import { eventService } from '../services/eventService';

const { width } = Dimensions.get('window');

// Đã loại bỏ hoàn toàn SIMILAR_EVENTS hardcode

export default function EventDetailScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();
    const eventId = params.id as string;
    const { user } = useContext(AuthContext);

    const [eventData, setEventData] = useState<any>(null);
    const [similarEvents, setSimilarEvents] = useState<any[]>([]); // Thêm state cho Similar Events
    const [loading, setLoading] = useState(true);
    const [isNotFound, setIsNotFound] = useState(false); // Thêm state xử lý lỗi
    const [isInterested, setIsInterested] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // Đã loại bỏ đối tượng const event hardcode

    const onShare = async () => {
        if (!eventData) return;
        try {
            const result = await Share.share({
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
                
                // 1. Lấy chi tiết sự kiện
                const res = await eventService.getEventDetail(eventId, user?.id);
                if (res && res.data) {
                    setEventData(res.data);
                    if (res.data.isInterested !== undefined) {
                        setIsInterested(res.data.isInterested);
                    }
                } else {
                    // Nếu gọi API thành công nhưng data rỗng/null
                    setIsNotFound(true);
                }

                // 2. Lấy danh sách sự kiện tương tự (Dùng API upcoming events)
                // Tuỳ thuộc vào function trong eventService của bạn, giả sử nó tên là getUpcomingEvents
                const resSimilar = await eventService.getUpcomingEvents(5);
                if (resSimilar.data) {
                    // Lọc bỏ sự kiện hiện tại ra khỏi danh sách gợi ý
                    const filteredEvents = resSimilar.data.filter((ev: any) => ev.id !== eventId);
                    setSimilarEvents(filteredEvents);
                }

            } catch (error: any) {
                console.error("Lỗi lấy chi tiết sự kiện:", error);
                // Bắt lỗi 404 từ server hoặc các lỗi khác
                if (error.response?.status === 404 || error.response?.status === 403) {
                    setIsNotFound(true);
                } else {
                    setIsNotFound(true); 
                }
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [eventId, user?.id]);

    const handleInterest = async () => {
        if (actionLoading || !eventData) return;
        try {
            setActionLoading(true);
            const res = await eventService.toggleInterest(eventId, user?.id || 'guest');
            if (res.success) {
                setIsInterested(res.isInterested);
                setEventData((prev: any) => ({
                    ...prev,
                    interestedCount: res.isInterested ? prev.interestedCount + 1 : prev.interestedCount - 1
                }));
            }
        } catch (error) {
            console.log("Lỗi bấm quan tâm:", error);
        } finally {
            setActionLoading(false);
        }
    };

    // 1. GIAO DIỆN LOADING
    if (loading) {
        return (
            <View className="flex-1 bg-white justify-center items-center">
                <ActivityIndicator size="large" color="#ffa053" />
            </View>
        );
    }

    // 2. GIAO DIỆN LỖI (NOT FOUND) KHI DỮ LIỆU KHÔNG TỒN TẠI
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
                    Sự kiện này có thể đã bị xóa, hết hạn hoặc bạn không có quyền truy cập. Vui lòng quay lại màn hình trước.
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

    // Formatting Date logic (Dựa trên dữ liệu thật)
    const startDate = new Date(eventData.startDate);
    const dayName = startDate.toLocaleDateString('en-US', { weekday: 'long' });
    const monthName = startDate.toLocaleDateString('en-US', { month: 'short' }); // Đổi thành 'short' để hiển thị Mar, Apr cho gọn
    const day = startDate.getDate();
    const year = startDate.getFullYear();
    const timeString = startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // Ưu tiên bannerUrl, nếu không có thì lấy ảnh đầu tiên trong mảng images, cuối cùng là ảnh dự phòng local
    const bannerImage = eventData.bannerUrl || eventData.images?.[0]?.url || 'https://via.placeholder.com/800x400.png?text=No+Image';

    return (
        <View className="flex-1 bg-white">
            <StatusBar style="light" />
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }} bounces={false}>
                {/* 1. HERO HEADER */}
                <View className="w-full h-[350px] relative">
                    <ImageBackground source={{ uri: bannerImage }} className="w-full h-full" resizeMode="cover">
                        <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120 }} />
                        <View className="flex-row justify-between items-center px-6" style={{ marginTop: insets.top + 10 }}>
                            <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full items-center justify-center border border-white/30">
                                <Feather name="chevron-left" size={24} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={onShare} className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full items-center justify-center border border-white/30">
                                <Feather name="share-2" size={20} color="white" />
                            </TouchableOpacity>
                        </View>
                    </ImageBackground>
                </View>

                {/* 2. MAIN CONTENT BODY */}
                <View className="-mt-10 bg-white rounded-t-[40px] px-6 pt-8 pb-4 shadow-2xl shadow-black/10">
                    <Text className="text-2xl font-bold text-gray-900 leading-8 mb-4">{eventData.title}</Text>

                    <View className="flex-row items-center mb-6">
                        {eventData.category && (
                            <View className="border border-orange-200 bg-orange-50 px-3 py-1 rounded-full mr-3">
                                <Text className="text-xs font-bold text-orange-600">{eventData.category}</Text>
                            </View>
                        )}
                        <Text className="text-gray-400 text-xs font-medium">{eventData.interestedCount || 0} Interested</Text>
                    </View>

                    {/* INFO CARD */}
                    <View className="bg-white border border-gray-100 rounded-[24px] p-5 shadow-sm shadow-gray-200 mb-8">
                        <View className="flex-row items-start mb-5">
                            <View className="w-12 h-12 bg-orange-50 rounded-2xl items-center justify-center mr-4">
                                <Feather name="calendar" size={22} color="#ffa053" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-gray-900 font-bold text-base">{dayName}, {monthName} {day}, {year}</Text>
                                <Text className="text-gray-400 text-xs mt-1 font-medium">{timeString} (Start time)</Text>
                            </View>
                        </View>

                        <View className="flex-row items-start">
                            <View className="w-12 h-12 bg-orange-50 rounded-2xl items-center justify-center mr-4">
                                <Ionicons name="location-outline" size={24} color="#ffa053" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-gray-900 font-bold text-base">{eventData.locationName}</Text>
                                <Text className="text-gray-400 text-xs mt-1 font-medium">{eventData.address}</Text>
                            </View>
                        </View>
                    </View>

                    {/* ORGANIZER PROFILE */}
                    {eventData.shelter && (
                        <TouchableOpacity
                            className="flex-row items-center justify-between mb-8 active:bg-gray-50 p-2 -mx-2 rounded-xl"
                            onPress={() => router.push({ pathname: '/shelter-profile', params: { id: eventData.shelter.id } })}
                        >
                            <View className="flex-row items-center">
                                <Image
                                    source={{ uri: eventData.shelter.avatarUrl || 'https://via.placeholder.com/150.png?text=No+Avatar' }}
                                    className="w-12 h-12 rounded-full mr-3 border border-gray-100"
                                />
                                <View>
                                    <Text className="text-gray-900 font-bold text-base">{eventData.shelter.name}</Text>
                                    <Text className="text-gray-400 text-xs">Organizer</Text>
                                </View>
                            </View>
                            <Feather name="chevron-right" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                    )}

                    {/* ABOUT EVENT */}
                    <View className="mb-8">
                        <Text className="text-lg font-bold text-gray-900 mb-3">About Event</Text>
                        <Text className="text-gray-500 leading-6 text-[15px] text-justify">
                            {eventData.description || "Chưa có mô tả cho sự kiện này."}
                        </Text>
                    </View>

                    {/* GALLERY (PRE-EVENT) */}
                    {eventData.images && eventData.images.length > 0 && (
                        <View className="mb-8">
                            <Text className="text-lg font-bold text-gray-900 mb-4">Gallery</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                                {eventData.images.map((img: any) => (
                                    <TouchableOpacity key={img.id} activeOpacity={0.9}>
                                        <Image source={{ uri: img.url }} className="w-28 h-28 rounded-2xl bg-gray-100" resizeMode="cover" />
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* LOCATION MAP */}
                    <View className="mb-8">
                        <Text className="text-lg font-bold text-gray-900 mb-2">Location</Text>
                        <View className="flex-row items-center mb-4">
                            <Ionicons name="location-sharp" size={16} color="#ffa053" />
                            <Text className="text-gray-500 text-sm ml-1">{eventData.address || eventData.locationName}</Text>
                        </View>
                    </View>

                    {/* MORE EVENTS */}
                    {similarEvents.length > 0 && (
                        <View className="mb-4">
                            <View className="flex-row justify-between items-end mb-4">
                                <Text className="text-lg font-bold text-gray-900">More Events</Text>
                                <TouchableOpacity onPress={() => router.push('/(tabs)') /* Điều hướng tới tab Events */}>
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
                                            className="w-64 bg-white border border-gray-100 rounded-2xl p-3 shadow-sm flex-row items-center"
                                        >
                                            <Image
                                                source={{ uri: ev.bannerUrl || ev.images?.[0]?.url || 'https://via.placeholder.com/100.png' }}
                                                className="w-16 h-16 rounded-xl bg-gray-200"
                                            />
                                            <View className="ml-3 flex-1">
                                                <Text className="font-bold text-gray-900 text-sm mb-1" numberOfLines={1}>{ev.title}</Text>
                                                <View className="flex-row items-center mb-1">
                                                    <Ionicons name="location-outline" size={10} color="#9CA3AF" />
                                                    <Text className="text-gray-400 text-[10px] ml-1" numberOfLines={1}>{ev.locationName}</Text>
                                                </View>
                                                <View className="flex-row justify-between items-center">
                                                    <Text className="text-xs text-orange-500">{ev.interestedCount} Interested</Text>
                                                    <View className="items-center">
                                                        <Text className="text-xs font-bold text-gray-800">{evDate.getDate()}</Text>
                                                        <Text className="text-[8px] text-gray-500 uppercase">{evDate.toLocaleDateString('en-US', { month: 'short' })}</Text>
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

            {/* 3. STICKY FOOTER BUTTON */}
            <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-50 px-6 pt-4" style={{ paddingBottom: insets.bottom + 10 }}>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleInterest}
                    disabled={actionLoading}
                    className={`w-full py-4 rounded-full shadow-lg items-center ${isInterested ? 'bg-gray-800' : 'bg-[#FF9C56] shadow-orange-200'}`}
                >
                    {actionLoading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white font-bold text-lg">
                            {isInterested ? 'Interested ✓' : 'Interesting'}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}