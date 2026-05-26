// app/event-detail.tsx
import { Text } from '@/components/AppText';
import { AuthContext } from '@/contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AlertCircle } from 'lucide-react-native';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, Modal, ScrollView, Share, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { eventService } from '../services/eventService';
import { useEngagementStore } from '../store/useEngagementStore';
const { width } = Dimensions.get('window');
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function EventDetailScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();
    const eventId = params.id as string;
    const { user } = useContext(AuthContext);
    const isInterested = useEngagementStore(state => state.interestedEvents[eventId] ?? eventData?.isInterested);
    const toggleEventInterest = useEngagementStore(state => state.toggleEventInterest);

    const bottomSheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['60%', '95%'], []);

    const [eventData, setEventData] = useState<any>(null);
    const [similarEvents, setSimilarEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isNotFound, setIsNotFound] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);

    // Hàm mở xem ảnh
    const handleOpenImageViewer = (index: number) => {
        setSelectedImageIndex(index);
        setIsImageViewerVisible(true);
    };

    const onShare = async () => {
        if (actionLoading || !eventData) return;

        const startDate = new Date(eventData.startDate);
        const day = startDate.getDate();
        const monthName = startDate.toLocaleDateString('en-US', { month: 'short' });
        const year = startDate.getFullYear();
        const timeString = startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        const title = eventData.title || 'Sự kiện từ PawLife';
        const organizer = eventData.organizer?.name || 'PawLife';
        const location = [eventData.locationName, eventData.address].filter(Boolean).join(', ');
        const date = `${day} ${monthName}, ${year} at ${timeString}`;
        const interested = eventData.interestedCount ?? 0;
        const description = eventData.description
            ? eventData.description.length > 120
                ? eventData.description.substring(0, 120) + '...'
                : eventData.description
            : null;

        const lines = [
            `🐾 ${title}`,
            ``,
            `📅 ${date}`,
            `📍 ${location}`,
            `🏠 Organizer: ${organizer}`,
            `👥 ${interested} people interested`,
            description ? `\n📝 ${description}` : null,
        ].filter(Boolean).join('\n');

        try {
            await Share.share(
                { message: lines, title },
                { dialogTitle: `Share: ${title}`, subject: `PawLife Event: ${title}`, tintColor: '#ffa053' }
            );
        } catch (error: any) {
            Alert.alert('Lỗi', 'Không thể chia sẻ lúc này. Vui lòng thử lại sau.');
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
                    // Map chuẩn dữ liệu Shelter từ Backend (KHÔNG DÙNG FALLBACK IMAGE RÁC)
                    // ==========================================
                    if (res.data.shelter) {
                        res.data.organizer = {
                            id: res.data.shelter.id,
                            name: res.data.shelter.name,
                            avatarUrl: res.data.shelter.avatarUrl // Map thủ công ở đây
                        };
                    }

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

    // Chỉ dùng URL thực, nếu không có sẽ render UI thay thế bên dưới
    const bannerImage = eventData.bannerUrl || eventData.images?.[0]?.url;

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
        <View className='flex-1 '>
            <StatusBar style="light" />
            <View style={{ height: SCREEN_HEIGHT * 0.45, width: '100%', backgroundColor: '#F3F4F6' }}>
                {bannerImage ? (
                    <Image
                        source={{ uri: bannerImage }}
                        className="w-full h-full"
                        resizeMode="cover"
                    />
                ) : (
                    // UI Xử lý khi không có banner
                    <View className="w-full h-full items-center justify-center bg-[#FDF5EF]">
                        <Feather name="image" size={48} color="#E89B5A" style={{ opacity: 0.5 }} />
                    </View>
                )}

                {/* OVERLAY HEADER: 3 nút bấm nổi trên nền ảnh */}
                <SafeAreaView edges={['top']} className="absolute top-0 left-0 right-0 z-10">
                    <View className="flex-row items-center justify-between px-5 mt-2 h-[44px]">

                        {/* BÊN TRÁI: Nút Back */}
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
                            className="w-10 h-10 rounded-full items-center justify-center"
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
                                    colors={['rgba(221, 221, 221, 0.1)', 'rgba(247, 247, 247, 0.5)', '#FFFFFF']}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                    locations={[0, 0.3, 1]}
                                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 9999 }}
                                />
                                <Feather name="chevron-left" size={20} color="#000000" />
                            </View>
                        </TouchableOpacity>

                        {/* BÊN PHẢI: Nút Share & Mark */}
                        <View className="flex-row items-center">
                            {/* Nút Mark */}
                            <TouchableOpacity
                                onPress={handleInterest}
                                activeOpacity={0.7}
                                style={{
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.1,
                                    shadowRadius: 5,
                                    elevation: 3,
                                }}
                                className="w-10 h-10 rounded-full items-center justify-center mr-3"
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
                                        colors={['rgba(221, 221, 221, 0.1)', 'rgba(247, 247, 247, 0.5)', '#FFFFFF']}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                        locations={[0, 0.3, 1]}
                                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 9999 }}
                                    />
                                    <Image
                                        source={isInterested ? require('../assets/icon/book-mark.png') : require('../assets/icon/bookmark-black.png')}
                                        style={{ width: 10, height: 13 }}
                                        resizeMode="cover"
                                    />
                                </View>
                            </TouchableOpacity>

                            {/* Nút Share */}
                            <TouchableOpacity
                                onPress={onShare}
                                activeOpacity={0.7}
                                style={{
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.1,
                                    shadowRadius: 5,
                                    elevation: 3,
                                }}
                                className="w-10 h-10 rounded-full items-center justify-center"
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
                                        colors={['rgba(221, 221, 221, 0.1)', 'rgba(247, 247, 247, 0.5)', '#FFFFFF']}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                        locations={[0, 0.3, 1]}
                                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 9999 }}
                                    />
                                    <Image
                                        source={require('../assets/icon/share.png')}
                                        style={{ width: 16, height: 16 }}
                                        resizeMode="cover"
                                    />
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </View>

            <BottomSheet
                ref={bottomSheetRef}
                index={0}
                snapPoints={snapPoints}
                backgroundStyle={{ borderRadius: 32, backgroundColor: '#FFFFFF' }}
                handleIndicatorStyle={{ backgroundColor: '#999999', width: 40, height: 5 }}
            >
                <BottomSheetScrollView showsVerticalScrollIndicator={false}>
                    <View className="-mt-10 bg-white rounded-t-[24px] px-[20px] pt-[37px] pb-12 shadow-2xl">

                        {/* CATEGORY */}
                        {eventData.category && (
                            <View className="flex-row mb-[20px]">
                                <View className="bg-[#E89B5A]/10 border border-[#E89B5A]/50 px-3 py-1.5 rounded-[12px]">
                                    <Text className="text-[14px] font-medium text-[#E89B5A] tracking-wider">
                                        {eventData.category}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* TITLE */}
                        <Text className="text-[24px] font-semibold text-black leading-8 mb-[15px]">
                            {eventData.title}
                        </Text>

                        {/* THỜI GIAN VÀ ĐỊA ĐIỂM */}
                        <View className='mb-[30px]'>
                            <View className="flex-row items-center mb-[15px]">
                                <View className="items-center justify-center mr-2">
                                    <Image
                                        source={require('../assets/icon/location-gray-icon.png')}
                                        style={{ width: 10, height: 12 }}
                                        resizeMode="cover"
                                    />
                                </View>
                                <View>
                                    <Text className="text-[#8E8E93] font-regular text-[16px]" numberOfLines={1}>
                                        {eventData.locationName} Mall, {eventData.address}
                                    </Text>
                                </View>
                            </View>
                            {/* Cột Thời Gian */}
                            <View className="flex-row items-center flex-1 mr-2">
                                <View className="items-center justify-center mr-2">
                                    <Image
                                        source={require('../assets/icon/calendar-orange.png')}
                                        style={{ width: 12.3, height: 12.3 }}
                                        resizeMode="cover"
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-[#E89B5A] font-regular text-[14px]">
                                        {day} {monthName}, {year} at {timeString}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* ABOUT EVENT */}
                        <View className="mb-[30px]">
                            <Text className="text-[16px] font-medium text-black mb-[12px]">About Event</Text>
                            <Text className="text-[#8E8E93] font-regular leading-relaxed text-[14px] text-justify">
                                {eventData.description || "Chưa có mô tả cho sự kiện này."}
                            </Text>
                        </View>

                        {/* ORGANIZER PROFILE */}
                        {eventData.organizer && (
                            <View className="mb-[30px]">
                                <Text className="text-[16px] font-medium text-black mb-[20px]">Organizer</Text>

                                <View className="flex-row items-center">
                                    {eventData.organizer.avatarUrl ? (
                                        <Image
                                            source={{ uri: eventData.organizer.avatarUrl }}
                                            className="w-[53px] h-[53px] rounded-full border border-gray-200 overflow-hidden items-center justify-center bg-white shadow-sm shadow-gray-100"
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <View className="w-[53px] h-[53px] rounded-full border border-gray-200 bg-[#FDF5EF] items-center justify-center shadow-sm shadow-gray-100">
                                            <Text className="text-[#E89B5A] text-[20px] font-bold">
                                                {eventData.organizer.name?.charAt(0).toUpperCase() || 'P'}
                                            </Text>
                                        </View>
                                    )}

                                    <View className="flex-1 mr-2 ml-3">
                                        <Text className="text-[14px] font-medium text-black mb-[6px]" numberOfLines={1}>
                                            {eventData.organizer.name || 'Pawlife Organizer'}
                                        </Text>
                                        <Text className="text-[12px] text-[#8E8E93]" numberOfLines={1}>
                                            Event Organize
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        activeOpacity={0.7}
                                        className="w-[41px] h-[41px] rounded-full bg-[#FDF5EF] items-center justify-center"
                                    >
                                        <Image source={require('../assets/icon/message.png')} style={{ width: 24, height: 24 }} resizeMode="cover" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        activeOpacity={0.7}
                                        className="w-[36px] h-[36px] items-center justify-center ml-2"
                                        onPress={() => router.push({
                                            pathname: '/organizer-profile',
                                            params: { id: eventData.organizer.id }
                                        })}
                                    >
                                        <Feather name="chevron-right" size={18} color="black" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* LOCATION MAP */}
                        <View className="mb-[32px]">
                            <View className='flex-row justify-between'>
                                <Text className="text-[16px] font-medium text-black mb-[12px]">Location</Text>
                                <Text className="text-[14px] font-regular text-[#E89B5A] mb-[12px]">View on Map</Text>
                            </View>

                            <View className="mb-[12px]">
                                <Text className="text-[#8E8E93] text-[14px] font-regular flex-1 mb-[6px]" numberOfLines={2}>
                                    {eventData.locationName} Mall
                                </Text>
                                <Text className="text-[#8E8E93] text-[14px] font-regular flex-1" numberOfLines={2}>
                                    {eventData.address}
                                </Text>
                            </View>

                            {/* MapView Container dùng WebView */}
                            <View className="w-full h-[145px] rounded-[16px] overflow-hidden border border-gray-200 bg-gray-100 relative pointer-events-none">
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
                                <View className="flex-row justify-between">
                                    {eventData.images.slice(0, 4).map((img: any, index: number) => {
                                        const isLastImage = index === 3;
                                        const remainingCount = eventData.images.length - 4;

                                        return (
                                            <TouchableOpacity
                                                key={img.id || index}
                                                activeOpacity={0.8}
                                                onPress={() => handleOpenImageViewer(index)}
                                                className="w-[22%] aspect-square rounded-[16px] relative"
                                                style={{
                                                    shadowColor: '#E89B5A',
                                                    shadowOffset: { width: 2, height: 2 },
                                                    shadowOpacity: 0.15,
                                                    shadowRadius: 6.8,
                                                    elevation: 4,
                                                }}
                                            >
                                                <Image source={{ uri: img.url }} className="w-full h-full rounded-[16px]" resizeMode="cover" />

                                                {/* Overlay đen mờ và số lượng ảnh còn lại */}
                                                {isLastImage && remainingCount > 0 && (
                                                    <View className="absolute inset-0 bg-black/50 items-center justify-center rounded-[16px] overflow-hidden">
                                                        <Text className="text-white text-[20px] font-bold tracking-wider">
                                                            +{remainingCount}
                                                        </Text>
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {/* MORE EVENTS */}
                        {similarEvents.length > 0 && (
                            <View className="mb-4">
                                <View className="flex-row justify-between items-center mb-4">
                                    <Text className="text-[16px] font-medium text-black">More Events</Text>
                                </View>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingVertical: 8, paddingHorizontal: 4 }}>
                                    {similarEvents.map(ev => {
                                        const evDate = new Date(ev.startDate);
                                        return (
                                            <TouchableOpacity
                                                key={ev.id}
                                                className="w-[300px] h-[56px] mb-3 mt-1 bg-white rounded-[20px] active:scale-[0.98]"
                                                style={{ shadowColor: '#E89B5A', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 6 }}
                                                activeOpacity={0.85}
                                                onPress={() => router.push(`/event-detail?id=${ev.id}`)}
                                            >
                                                <View className="flex-1 flex-row rounded-[20px] overflow-hidden">
                                                    {/* Bỏ ảnh rác ở Event Card */}
                                                    {ev.bannerUrl ? (
                                                        <Image source={{ uri: ev.bannerUrl }} className="w-[98px] h-full bg-gray-100" resizeMode="cover" />
                                                    ) : (
                                                        <View className="w-[80px] h-full bg-[#FDF5EF] items-center justify-center">
                                                            <Feather name="image" size={24} color="#E89B5A" opacity={0.5} />
                                                        </View>
                                                    )}

                                                    <View className="flex-1 flex-row items-center pl-3 pr-4 py-3 bg-slate-200">
                                                        <View className="flex-1 justify-between h-full pr-3">
                                                            <View>
                                                                <Text className="font-medium text-gray-800 text-[14px] leading-tight mb-0.5 tracking-[0.06px]" numberOfLines={1}>{ev.title}</Text>
                                                                <View className="flex-row items-center mt-1.5">
                                                                    <Image source={require('../assets/icon/location-solid-gray.png')} style={{ width: 10, height: 10 }} resizeMode="cover" />
                                                                    <Text className="text-[#8E8E93] text-[12px] ml-1 flex-1 tracking-[0.06px]" numberOfLines={1}>{ev.locationName || ev.address}</Text>
                                                                </View>
                                                            </View>
                                                            
                                                        </View>
                                                        <View className="items-center justify-center shrink-0 min-w-[32px]">
                                                            <Text className="text-[20px] font-semibold text-black leading-tight">{evDate.getDate().toString().padStart(2, '0')}</Text>
                                                            <Text className="text-[12px] font-regular text-[#8E8E93] tracking-[0.06px] mt-0.5">{evDate.toLocaleString('en-US', { month: 'short' }).toUpperCase()}</Text>
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
                    <Modal
                        visible={isImageViewerVisible}
                        transparent={true}
                        animationType="fade"
                        onRequestClose={() => setIsImageViewerVisible(false)}
                    >
                        <View className="flex-1 bg-black">
                            <SafeAreaView className="flex-1">
                                <View className="flex-row items-center justify-between px-4 py-2 z-10 absolute top-12 left-0 right-0">
                                    <TouchableOpacity
                                        onPress={() => setIsImageViewerVisible(false)}
                                        className="p-2 bg-black/40 rounded-full"
                                    >
                                        <Feather name="x" size={24} color="white" />
                                    </TouchableOpacity>
                                    <View className="bg-black/40 px-3 py-1 rounded-full">
                                        <Text className="text-white text-[14px] font-medium">
                                            {selectedImageIndex + 1} / {eventData.images?.length || 0}
                                        </Text>
                                    </View>
                                    <View className="w-10" />
                                </View>

                                <ScrollView
                                    horizontal
                                    pagingEnabled
                                    showsHorizontalScrollIndicator={false}
                                    contentOffset={{ x: selectedImageIndex * width, y: 0 }}
                                    onMomentumScrollEnd={(event) => {
                                        const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
                                        setSelectedImageIndex(newIndex);
                                    }}
                                >
                                    {eventData.images?.map((img: any, index: number) => (
                                        <View key={index} style={{ width: width, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                            <Image
                                                source={{ uri: img.url }}
                                                style={{ width: width, height: SCREEN_HEIGHT * 0.7 }}
                                                resizeMode="contain"
                                            />
                                        </View>
                                    ))}
                                </ScrollView>
                            </SafeAreaView>
                        </View>
                    </Modal>

                </BottomSheetScrollView>
            </BottomSheet>

        </View>
    );
}