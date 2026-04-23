import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/AppText';
import { AuthContext } from '@/contexts/AuthContext';
import { eventService } from '../services/eventService';

export default function InterestedEventsScreen() {
    const router = useRouter();
    const { user } = useContext(AuthContext);
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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
    const handleRemoveInterest = async (eventId: string | number) => {
        // 1. Xóa tạm khỏi UI ngay lập tức cho mượt (Optimistic Update)
        setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));

        try {
            // 2. Gọi API để bỏ follow/interest trên server 
            // (Giả sử bạn có hàm này trong eventService, bạn nhớ đổi tên cho đúng thực tế API của bạn)
            //await eventService.removeInterestedEvent(eventId); 
        } catch (error) {
            console.error("Lỗi khi hủy quan tâm event:", error);
            // Nếu API lỗi, có thể bạn sẽ muốn fetch lại data để đồng bộ lại UI
        }
    };
    const renderEventItem = ({ item }: { item: any }) => {
        // Format lại ngày tháng giống định dạng trong ảnh
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
                            {/* Icon màu cam để thể hiện event đã được lưu */}
                            <Feather name="bookmark" size={20} color="#E89B5A" />
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
                <View className="flex-row items-center px-4 py-3 relative bg-white z-10">
                    <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 z-10">
                        <Feather name="chevron-left" size={24} color="#000000" />
                    </TouchableOpacity>
                    <View className="absolute left-0 right-0 items-center justify-center pointer-events-none">
                        <Text className="text-[24px] font-semibold text-black">Interested Events</Text>
                    </View>
                </View>

                {loading ? (
                    <View className="flex-1 justify-center items-center">
                        <ActivityIndicator size="large" color="#ffa053" />
                    </View>
                ) : events.length === 0 ? (
                    // --- EMPTY STATE CONTENT --- 
                    <View className="flex items-center justify-center px-6 pb-20 mt-20">
                        <Image
                            source={require('../assets/images/cat-sleepy.png')}
                            resizeMode="contain"
                            className="top-7 z-10"
                            style={{
                                width: 330,
                                height: 280,
                                
                            }}
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
                ) : (
                    // --- LIST CONTENT --- 
                    <FlatList
                        data={events}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={renderEventItem}
                        // Đồng bộ padding giống bên search.tsx để danh sách hiển thị đẹp mắt hơn
                        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 13, paddingBottom: 20 }}
                        showsVerticalScrollIndicator={false}
                    />
                )}

            </SafeAreaView>
        </View>
    );
}