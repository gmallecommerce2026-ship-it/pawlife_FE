// app/(tabs)/index.tsx
import { Text } from '@/components/AppText';
import { AuthContext } from '@/contexts/AuthContext';
// Đã tạm tắt hook useInfiniteSlider để khắc phục lỗi liệt cảm ứng do re-render loop
// import { useInfiniteSlider } from '@/hooks/useInfiniteSlider'; 
import { Feather, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';
import React, { useCallback, useContext, useEffect, useState } from 'react';
// Sử dụng components chuẩn của React Native để NativeWind (Tailwind) nhận diện được className
import * as Haptics from 'expo-haptics';
import { ActivityIndicator, FlatList, Image, PixelRatio, ScrollView, TouchableOpacity, View } from 'react-native';
import Animated, {
    Easing,
    Extrapolation,
    interpolate,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axiosClient from '../../api/axiosClient';
import { useLocation } from '../../hooks/useLocation';
import { eventService } from '../../services/eventService';
import { petService } from '../../services/petService';
import { shelterService } from '../../services/shelterService';

const CATEGORIES = [
    { id: 1, label: 'Training', icon: require('../../assets/images/training-icon.png') },
    { id: 2, label: 'Nutrition', icon: require('../../assets/images/nutrition-icon.png') },
    { id: 3, label: 'Health', icon: require('../../assets/images/health-icon.png') },
    { id: 4, label: 'Beauty', icon: require('../../assets/images/beauty-icon.png') },
];

const SectionHeader = ({ title, onLinkPress, t }: { title: string, onLinkPress?: () => void, t: any }) => (
    <View className="flex-row justify-between items-center mb-4 px-6">
        <Text className="text-[16px] font-semibold text-black">{t(title)}</Text>
        <TouchableOpacity onPress={onLinkPress} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text className="text-[#E89B5A] text-sm font-extralight text-[14px]">{t('View all')}</Text>
        </TouchableOpacity>
    </View>
);

export default function HomeScreen() {
    const { t } = useLanguage();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useContext(AuthContext);
    const { location, errorMsg, isLocationLoaded } = useLocation();
    const rotation = useSharedValue(0);
    const translateY = useSharedValue(0);
    const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

    const [pets, setPets] = useState<any[]>([]);
    const [shelters, setShelters] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasUnread, setHasUnread] = useState(false);
    const bounceY = useSharedValue(0);
    const handleScanPress = () => {
        // Rung mức độ Medium để tạo cảm giác chạm dứt khoát
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push('/scan');
    };
    useEffect(() => {
        bounceY.value = withRepeat(
            withSequence(
                withDelay(
                    5000,
                    withTiming(-12, { duration: 120, easing: Easing.out(Easing.ease) })
                ),
                withTiming(0, { duration: 400, easing: Easing.bounce })
            ),
            -1,
            false
        );
    }, []);

    const bounceStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: bounceY.value }],
    }));

    const HEADER_MAX_HEIGHT = 320;
    const CURVE_HEIGHT = 28;
    const HEADER_MIN_HEIGHT = insets.top + 116;
    const SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

    const scrollY = useSharedValue(0);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
        },
    });

    const headerAnimatedStyle = useAnimatedStyle(() => {
        const height = interpolate(scrollY.value, [0, SCROLL_DISTANCE], [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT], Extrapolation.CLAMP);
        return { height };
    });

    const avatarAnimatedStyle = useAnimatedStyle(() => {
        const size = interpolate(scrollY.value, [0, SCROLL_DISTANCE], [76, 42], Extrapolation.CLAMP);
        return { width: size, height: size, borderRadius: size / 2 };
    });

    const targetY = PixelRatio.roundToNearestPixel(38);
    const targetX = PixelRatio.roundToNearestPixel(50);

    const textContainerAnimatedStyle = useAnimatedStyle(() => {
        const translateY = interpolate(
            scrollY.value,
            [0, SCROLL_DISTANCE],
            [0, targetY],
            Extrapolation.CLAMP
        );

        const translateX = interpolate(
            scrollY.value,
            [0, SCROLL_DISTANCE],
            [0, targetX],
            Extrapolation.CLAMP
        );

        const scale = interpolate(
            scrollY.value,
            [0, SCROLL_DISTANCE],
            [1, 0.9],
            Extrapolation.CLAMP
        );

        return { transform: [{ translateY }, { translateX }, { scale }] };
    });

    const subtitleAnimatedStyle = useAnimatedStyle(() => {
        const opacity = interpolate(scrollY.value, [0, SCROLL_DISTANCE * 0.35], [1, 0], Extrapolation.CLAMP);
        const height = interpolate(scrollY.value, [0, SCROLL_DISTANCE * 0.35], [20, 0], Extrapolation.CLAMP);
        const marginTop = interpolate(scrollY.value, [0, SCROLL_DISTANCE * 0.35], [4, 0], Extrapolation.CLAMP);
        return { opacity, height, marginTop };
    });

    const backgroundImageAnimatedStyle = useAnimatedStyle(() => {
        const translateY = interpolate(
            scrollY.value,
            [0, SCROLL_DISTANCE],
            [0, -132],
            Extrapolation.CLAMP
        );
        return { transform: [{ translateY }] };
    });


    useFocusEffect(
        useCallback(() => {
            const checkUnreadNotifications = async () => {
                if (!user?.id) return;
                try {
                    const res = await axiosClient.get('/notifications?page=1&limit=10');
                    const notifications = res.data.data || [];
                    setHasUnread(notifications.some((item: any) => !item.isRead));
                } catch (error) {
                    console.error("Lỗi thông báo:", error);
                }
            };
            checkUnreadNotifications();
            if (isLocationLoaded) {
                loadHomeData(location?.lat, location?.lng, true);
            }
        }, [isLocationLoaded, location, user?.id])
    );

    const loadHomeData = async (currentLat?: number, currentLng?: number, isSilentRefresh = false) => {
        try {
            if (!isSilentRefresh) setIsLoading(true);
            const [eventsRes, petsRes, sheltersRes] = await Promise.all([
                eventService.getUpcomingEvents(5),
                petService.getFeed(10, currentLat, currentLng),
                (currentLat && currentLng)
                    ? shelterService.getSheltersNearBy(currentLat, currentLng, 5)
                    : shelterService.getShelters({ limit: 5 })
            ]);
            setEvents(eventsRes?.data || eventsRes || []);

            let fetchedPets = petsRes?.data || petsRes || [];
            if (fetchedPets.length > 0) {
                let infinitePetsData: any[] = [];
                for (let i = 0; i < 50; i++) {
                    infinitePetsData = infinitePetsData.concat(
                        fetchedPets.map((p: any) => ({ ...p, fakeId: `${p.id}_clone_${i}` }))
                    );
                }
                fetchedPets = infinitePetsData;
            }
            setPets(fetchedPets);

            const fetchedShelters = sheltersRes?.data?.data || sheltersRes?.data || sheltersRes || [];
            setShelters(Array.isArray(fetchedShelters) ? fetchedShelters : []);
        } catch (error: any) {
            if (error?.response?.status === 401) {
                setPets([]); setEvents([]); setShelters([]);
            }
        } finally {
            if (!isSilentRefresh) setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!isLocationLoaded) return;
        const initLoad = async () => {
            setIsLoading(true);
            await loadHomeData(location?.lat, location?.lng);
            setIsLoading(false);
        };
        initLoad();
    }, [isLocationLoaded, location, errorMsg, user?.id]);

    useEffect(() => {
        rotation.value = withRepeat(
            withDelay(4000, withSequence(
                withTiming(-1, { duration: 80, easing: Easing.linear }),
                withTiming(1, { duration: 80, easing: Easing.linear }),
                withTiming(-1, { duration: 80, easing: Easing.linear }),
                withTiming(1, { duration: 80, easing: Easing.linear }),
                withTiming(0, { duration: 80, easing: Easing.linear })
            )), -1, false);

        translateY.value = withRepeat(
            withDelay(4000, withSequence(
                withTiming(-4, { duration: 120, easing: Easing.out(Easing.ease) }),
                withTiming(0, { duration: 120, easing: Easing.bounce }),
                withTiming(-2, { duration: 120, easing: Easing.out(Easing.ease) }),
                withTiming(0, { duration: 120, easing: Easing.bounce })
            )), -1, false);
    }, []);


    const cornerOverlayAnimatedStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            scrollY.value,
            [SCROLL_DISTANCE * 0.3, SCROLL_DISTANCE],
            [0, 1],
            Extrapolation.CLAMP
        );
        return { opacity };
    });

    const getItemLayout = useCallback((data: any, index: number) => ({
        length: 140, offset: 140 * index, index,
    }), []);

    const renderPetItem = useCallback(({ item: pet }: { item: any }) => {
        const petImageUrl = (pet.images && pet.images.length > 0) ? pet.images[0]?.url : 'https://via.placeholder.com/200x300.png?text=No+Image';
        const fullAddress = pet.location || pet.shelter?.address;
        let displayCity = 'not updated';
        if (fullAddress) {
            const addressParts = fullAddress.split(',');
            displayCity = addressParts[addressParts.length - 1].trim();
        }

        const isFemale = pet.gender?.toUpperCase() === 'FEMALE' || pet.gender?.toUpperCase() === 'CÁ';

        const displayAge = (() => {
            if (pet.age) {
                if (typeof pet.age === 'number' || !isNaN(Number(pet.age))) return `${pet.age}`;
                return pet.age;
            }

            if (pet.dob) {
                const birthDate = new Date(pet.dob);
                const today = new Date();
                let years = today.getFullYear() - birthDate.getFullYear();
                let months = today.getMonth() - birthDate.getMonth();

                if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
                    years--;
                    months += 12;
                }

                if (years > 0) return `${years}`; // Ví dụ: '2'
                if (months > 0) return `${months}T`; // Ví dụ: '3T' (3 tháng) để fit với UI nhỏ
                return '1T'; // Bé xíu (< 1 tháng)
            }

            return 'N/A';
        })();

        return (
            <TouchableOpacity
                className="w-[128px] h-56 rounded-[24px] bg-white mt-1 mr-3"
                activeOpacity={0.85}
                style={{ shadowColor: '#E89B5A', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 6 }}
                onPress={() => router.push({
                    pathname: '/pet-detail-modal',
                    params: {
                        id: pet.id,
                        name: pet.name,
                        gender: pet.gender || 'male', // Truyền nguyên bản hoặc format chuẩn về detail modal
                        distance: displayCity,
                        image: petImageUrl,
                        age: displayAge, // Truyền tuổi đã xử lý động
                        breed: pet.breed || 'Unknown Breed'
                    }
                })}
            >
                <View className="w-full h-full rounded-[24px] overflow-hidden relative">
                    <Image source={{ uri: petImageUrl }} className="w-full h-full absolute" resizeMode="cover" />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.7)']}
                        locations={[0.1, 0.2, 1]}
                        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', justifyContent: 'flex-end', paddingHorizontal: 12, paddingBottom: 14 }}
                    >
                        <View className="flex-row items-center mb-1">
                            <Text className="text-white text-[17px] font-semibold tracking-tight shrink mb-0.5" numberOfLines={1}>{pet.name}</Text>

                            {/* KHẮC PHỤC LỖI HARDCODE TẠI ĐÂY */}
                            <View className="flex-row items-center ml-2 px-2 py-0.5 rounded-full shrink-0 border border-white/40 overflow-hidden bg-white/20 backdrop-blur-md">
                                <Ionicons name={isFemale ? 'female' : 'male'} size={12} color="#ffffff" />
                                <Text className="text-white text-[11px] font-bold ml-1">{displayAge}</Text>
                            </View>
                        </View>
                        <View className="flex-row items-center">
                            <Ionicons name="location-sharp" size={13} color="#ffffff" />
                            <Text className="text-white/95 text-xs font-medium ml-1 flex-1" numberOfLines={1}>{displayCity}</Text>
                        </View>
                    </LinearGradient>
                </View>
            </TouchableOpacity>
        );
    }, [router]);

    if (isLoading) {
        return (
            <View className="flex-1 bg-white justify-center items-center">
                <ActivityIndicator size="large" color="#FF8C42" />
                <Text className="mt-4 text-gray-500 font-medium">{t('Loading data...')}</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-white ">
            <Animated.ScrollView
                showsVerticalScrollIndicator={false}
                style={{
                    flex: 1, zIndex: 1
                }}
                contentContainerStyle={{ paddingBottom: 60 }}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}
            >
                <View style={{ height: HEADER_MAX_HEIGHT }} />

                <View className="bg-white pb-6">
                    <LinearGradient
                        colors={['#FFFFFF', '#FCF8ED']}
                        start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
                        className="pb-6"
                    >
                        <View className="px-6 mt-2">
                            <Animated.View style={[bounceStyle, {}]}>

                                <TouchableOpacity activeOpacity={0.8} onPress={handleScanPress}>
                                    <View
                                        className="relative p-[20px] rounded-[32px] flex-row items-center bg-white/50"
                                        style={{
                                            shadowColor: '#E89B5A5D', shadowOffset: { width: 0, height: 0 },
                                            shadowOpacity: 0.6, shadowRadius: 5, elevation: 4,
                                        }}
                                    >
                                        <LinearGradient
                                            colors={['#FFFFFF', '#FCF8ED']} locations={[0.3, 0.8]}
                                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 32 }}
                                        />
                                        <View className="w-16 h-16 rounded-2xl overflow-hidden items-center justify-center mr-5">
                                            <LinearGradient
                                                colors={['rgb(255, 244, 230)', 'rgba(255, 232, 204, 0.52)']}
                                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                                            />
                                            <Image source={require('../../assets/icon/scan-index.png')} style={{ width: 21, height: 21 }} resizeMode="cover" />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="font-semibold text-gray-900 text-lg">{t('Found A Lost Pet?')}</Text>
                                            <Text className="text-gray-500 text-sm mt-1 leading-5">{t('Scan to help them find a way home')}</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            </Animated.View>

                            {/* PAWCARE */}
                            <View className="mt-[38px]">
                                <Text className="text-[16px] font-semibold text-gray-900 mb-4">{t('Pawcare')}</Text>
                                <View className="flex-row justify-between">
                                    {CATEGORIES.map((cat) => (
                                        <TouchableOpacity
                                            key={cat.id}
                                            className="items-center w-[22%] -ml-1"
                                            activeOpacity={0.7}
                                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                            onPress={() => router.push({ pathname: '/pawcare/[category]', params: { category: cat.label } })}
                                        >
                                            <View
                                                className="w-20 h-20 bg-white rounded-full items-center justify-center mb-3"
                                                style={{ shadowColor: '#E89B5A', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 }}
                                            >
                                                <Image source={cat.icon} className="w-11 h-11" />
                                            </View>
                                            <Text className="text-gray-500 text-xs font-medium">{t(cat.label)}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </View>

                        {/* --- PETS NEAR YOU TỪ API --- */}
                        <View className="mt-[38px]">
                            <SectionHeader title="Pets Near You" onLinkPress={() => router.push({ pathname: '/search', params: { type: 'Pet' } })} t={t} />
                            {pets.length === 0 ? (
                                <Text className="text-center text-gray-400 mt-2 mb-4">Chưa có thú cưng nào gần đây</Text>
                            ) : (
                                <FlatList
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    nestedScrollEnabled={true}
                                    automaticallyAdjustContentInsets={false}
                                    contentContainerStyle={{ paddingRight: 24, marginBottom: 5 }}
                                    ListHeaderComponent={<View style={{ width: 24 }} />}
                                    data={pets}
                                    keyExtractor={(item, index) => item.fakeId ? item.fakeId : item.id.toString() + index}
                                    getItemLayout={getItemLayout}
                                    renderItem={renderPetItem}
                                    initialNumToRender={7}
                                    maxToRenderPerBatch={5}
                                    windowSize={7}
                                    removeClippedSubviews={false}
                                    decelerationRate="fast"
                                    snapToInterval={140}
                                    snapToAlignment="start"
                                    overScrollMode="never"
                                />
                            )}
                        </View>

                        {/* --- ADOPTION SHELTERS TỪ API --- */}
                        <View className="mt-[38px]">
                                <SectionHeader title="Adoption Shelters" onLinkPress={() => router.push({ pathname: '/search', params: { type: 'Shelter' } })} t={t} />                            {shelters.length === 0 ? (
                                <Text className="text-center text-gray-400 mt-2 mb-4">Chưa có trạm cứu hộ nào</Text>
                            ) : (
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ paddingHorizontal: 24, gap: 16 }}
                                    nestedScrollEnabled={true}
                                >
                                    {shelters.map((shelter) => (
                                        <TouchableOpacity
                                            key={shelter.id}
                                            className="w-72 bg-white -ml-1 p-3 rounded-[20px] mb-3 mt-1 flex-row items-center active:opacity-70"
                                            style={{ shadowColor: '#E89B5A', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 6 }}
                                            onPress={() => router.push({ pathname: '/shelter-profile', params: { id: shelter.id, name: shelter.name, address: shelter.address || 'Đang cập nhật', image: shelter.avatarUrl || shelter.coverUrl || 'https://via.placeholder.com/150' } })}
                                        >
                                            <Image source={{ uri: shelter.avatarUrl || shelter.coverUrl || 'https://via.placeholder.com/150' }} className="w-14 h-14 rounded-full bg-gray-200 mr-3" resizeMode="cover" />
                                            <View className="flex-1">
                                                <Text className="font-medium text-black text-[14px]" numberOfLines={1}>
                                                    {shelter.name}
                                                </Text>
                                                <View className="flex-row items-center mt-2">
                                                    <Image source={require('../../assets/icon/location-solid-gray.png')} style={{ width: 10, height: 10 }} resizeMode="cover" />
                                                    <Text className="text-[#8E8E93] font-regular text-[12px] ml-1 flex-1" numberOfLines={1}>{shelter.address || 'Đang cập nhật'}</Text>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}
                        </View>

                        {/* --- UPCOMING EVENTS TỪ API --- */}
                        <View className="mt-[38px] mb-6">
                            <SectionHeader title="Upcoming Events" onLinkPress={() => router.push({ pathname: '/search', params: { type: 'Event' } })} t={t} />
                            {events.length === 0 ? (
                                <Text className="text-center text-gray-400 mt-2 mb-4">Chưa có sự kiện nào sắp tới</Text>
                            ) : (
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ paddingHorizontal: 24, gap: 16 }}
                                    nestedScrollEnabled={true}
                                >
                                    {events.map((event) => {
                                        const d = new Date(event.startDate);
                                        return (
                                            <TouchableOpacity
                                                key={event.id}
                                                className="w-[300px] h-[60px] mb-3 mt-1 bg-white rounded-[20px] active:scale-[0.98]"
                                                style={{ shadowColor: '#E89B5A', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 6 }}
                                                activeOpacity={0.85}
                                                onPress={() => router.push(`/event-detail?id=${event.id}`)}
                                            >
                                                <View className="flex-1 flex-row rounded-[20px] overflow-hidden">
                                                    <Image source={{ uri: event.bannerUrl || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=300&auto=format&fit=crop' }} className="w-[98px] h-full bg-gray-100" resizeMode="cover" />
                                                    <View className="flex-1 flex-row items-center pl-3 pr-4 py-3">
                                                        <View className="flex-1 my-[15px] items-center justify-center h-full pr-3">
                                                            <View>
                                                                <Text className="font-medium text-gray-800 text-[14px] leading-tight mb-0.5 tracking-[0.06px]" numberOfLines={1}>{event.title}</Text>
                                                                <View className="flex-row items-center mt-1.5">
                                                                    <Image source={require('../../assets/icon/location-solid-gray.png')} style={{ width: 10, height: 10 }} resizeMode="cover" />
                                                                    <Text className="text-[#8E8E93] text-[12px] ml-1 flex-1 tracking-[0.06px]" numberOfLines={1}>{event.locationName || event.address}</Text>
                                                                </View>
                                                            </View>

                                                        </View>
                                                        <View className="items-center justify-center shrink-0 min-w-[32px]">
                                                            <Text className="text-[20px] font-semibold text-black leading-tight">{d.getDate().toString().padStart(2, '0')}</Text>
                                                            <Text className="text-[12px] font-regular text-[#8E8E93] tracking-[0.06px] mt-0.5">{d.toLocaleString('en-US', { month: 'short' }).toUpperCase()}</Text>
                                                        </View>
                                                    </View>
                                                </View>
                                            </TouchableOpacity>
                                        )
                                    })}
                                </ScrollView>
                            )}
                        </View>
                    </LinearGradient>
                </View>

            </Animated.ScrollView>

            {/* SỬA LỖI: Header được trả về thuộc tính an toàn nhất */}
            <Animated.View style={[headerAnimatedStyle, { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, backgroundColor: '#FFDDA2', overflow: 'hidden' }]} pointerEvents="box-none">

                <Animated.View
                    pointerEvents="none"
                    style={[
                        { position: 'absolute', top: 0, left: 0, width: '100%', height: HEADER_MAX_HEIGHT },
                        backgroundImageAnimatedStyle
                    ]}
                >
                    <Image
                        source={require('../../assets/images/home-tab.png')}
                        style={{ width: '100%', height: '100%' }} // Sửa thành style nội tuyến
                        resizeMode="cover"
                    />
                </Animated.View>

                <Animated.View
                    pointerEvents="none"
                    style={[
                        cornerOverlayAnimatedStyle,
                        {
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: CURVE_HEIGHT + 14,
                            borderBottomLeftRadius: 40,
                            zIndex: 2,
                            overflow: 'hidden', // Cực kỳ quan trọng để cắt gọt kính theo bo góc
                            borderWidth: 2.5,
                            borderColor: 'rgba(234, 164, 100, 0.5)',
                        }
                    ]}
                >
                    {/* Lớp 1: Kính mờ nguyên bản (KHÔNG cho màu vào đây) */}
                    <BlurView
                        tint="light"
                        intensity={7}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                    />

                    {/* Lớp 2: Lớp phủ màu cam mờ đè lên trên tấm kính */}
                    <View
                        style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: 'rgba(232, 155, 90, 0.15)'
                        }}
                    />
                </Animated.View>

                <View className="px-6 w-full h-full" pointerEvents="box-none" style={{ paddingTop: insets.top + 10, zIndex: 10 }}>
                    <View className="flex-row justify-between content-center items-start z-20" pointerEvents="box-none">
                        <View className="flex-row items-center flex-1" pointerEvents="box-none">
                            {/* AVATAR */}
                            <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/edit-profile')}>
                                <Animated.View
                                    style={[
                                        avatarAnimatedStyle,
                                        {
                                            // Shadow cho iOS
                                            shadowColor: '#000',
                                            shadowOffset: { width: 0, height: 4 },
                                            shadowOpacity: 0.1,
                                            shadowRadius: 1,
                                            // Shadow cho Android
                                            elevation: 8,
                                            zIndex: 50,
                                        }
                                    ]}
                                >
                                    {/* View con xử lý clipping và border */}
                                    <View
                                        style={{
                                            flex: 1,
                                            backgroundColor: '#ffedd5',
                                            overflow: 'hidden',
                                            borderWidth: 2.5,
                                            borderColor: '#FFFFFF',
                                            borderRadius: 1000, // Đảm bảo luôn bo tròn theo kích thước của cha
                                        }}
                                    >
                                        <Image
                                            source={{ uri: user?.avatarUrl || 'https://i.pravatar.cc/150?img=32' }}
                                            className="w-full h-full"
                                        />
                                    </View>
                                </Animated.View>
                            </TouchableOpacity>

                        </View>

                        <View className="flex-row gap-5 items-center mt-2" pointerEvents="box-none">
                            <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/search')} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                                <Feather name="search" size={26} color="white" style={{ textShadowColor: 'rgba(0,0,0,0.15)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }} />
                            </TouchableOpacity>

                            <TouchableOpacity activeOpacity={0.7} className="relative" onPress={() => router.push('/notifications')} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                                <Ionicons name="notifications" size={26} color="white" style={{ textShadowColor: 'rgba(0,0,0,0.15)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }} />
                                {hasUnread && (
                                    <View className="absolute top-0 right-0.5 w-2.5 h-2.5 bg-[#E89B5A] rounded-full border border-white" />
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/profile-settings')} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                                <Feather name="menu" size={26} color="white" style={{ textShadowColor: 'rgba(0,0,0,0.15)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Animated.View
                        pointerEvents="none"
                        style={[
                            textContainerAnimatedStyle,
                            { position: 'absolute', bottom: CURVE_HEIGHT + 83, left: 24, zIndex: 10 }
                        ]}
                        className={'-ml-1'}
                    >
                        <Text className="text-white font-semibold text-[20px] shadow-black/10" style={{ transformOrigin: 'left center' }}>
                            {t('Hello,')} {user?.name || t('User')}!
                        </Text>
                        <Animated.Text style={[subtitleAnimatedStyle]} className="text-white text-[14px] font-medium tracking-tight overflow-hidden">
                            <Text>
                                {t('Let’s dive into your account')}
                            </Text>
                        </Animated.Text>
                    </Animated.View>
                </View>

                <View
                    className="absolute bottom-0 w-full bg-[#FFFFFF] rounded-t-[60px]"
                    style={{ height: CURVE_HEIGHT - 5, zIndex: 0 }}
                    pointerEvents="none"
                />
            </Animated.View>

        </View>
    );
}