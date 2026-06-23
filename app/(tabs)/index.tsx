// app/(tabs)/index.tsx
import { Text } from '@/components/AppText';
import { AuthContext } from '@/contexts/AuthContext';
// import { useInfiniteSlider } from '@/hooks/useInfiniteSlider'; 
import { useLanguage } from '@/contexts/LanguageContext';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Dimensions, FlatList, Image, PixelRatio, ScrollView, TouchableOpacity, View } from 'react-native';
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
const VI_MONTHS_SHORT = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];

const formatMonthShort = (date: Date, isVi: boolean) => {
    if (isVi) {
        return VI_MONTHS_SHORT[date.getMonth()];
    }
    return date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
};
// Component hiển thị loading inline mượt mà không phá vỡ UI
const SectionLoader = () => (
    <View className="w-full h-32 items-center justify-center">
        <ActivityIndicator size="small" color="#E89B5A" />
    </View>
);
const { width: SCREEN_WIDTH } = Dimensions.get('window');
export default function HomeScreen() {
    const { t, language } = useLanguage();
    const router = useRouter();
    const isVi = language === 'vi';
    const [data, setData] = useState(null);
    const insets = useSafeAreaInsets();
    const { user } = useContext(AuthContext);
    const { location, errorMsg, isLocationLoaded } = useLocation();
    const rotation = useSharedValue(0);
    const translateY = useSharedValue(0);
    const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
    const [greetingSubtitle, setGreetingSubtitle] = useState('');

    const generateGreeting = useCallback((petName = '') => {
        const isVi = language === 'vi';
        const defaultPetNameVi = petName || 'các bé';
        const defaultPetNameEn = petName || 'the furry friends';

        const currentPetName = isVi ? defaultPetNameVi : defaultPetNameEn;

        const hour = new Date().getHours();
        // Buổi tối từ 18:00 đến 04:59 sáng hôm sau
        const isEvening = hour >= 18 || hour < 5;

        if (isEvening) {
            const eveningPhrasesVi = [
                "Lướt một chút thôi trước khi nghỉ ngơi nhé",
                "Cùng thư giãn với PawLife nào",
                "Một chút thời gian chill chill~",
                "Hôm nay của bạn thế nào rồi?",
                "Xem thử có gì mới trước khi ngủ hem?",
                `Dành chút thời gian cho ${currentPetName} nhé`
            ];
            const eveningPhrasesEn = [
                "A quick scroll before you rest?",
                "Time to unwind with PawLife.",
                "Just a little chill time~",
                "How was your day today?",
                "Catch up on what's new before bedtime.",
                `Spend a little evening time with ${currentPetName}.`
            ];
            const list = isVi ? eveningPhrasesVi : eveningPhrasesEn;
            return list[Math.floor(Math.random() * list.length)];
        }

        // --- BAN NGÀY ---
        const rand = Math.random() * 100;

        if (rand <= 50) {
            const group1Vi = [
                `Hôm nay bạn muốn làm gì cùng ${currentPetName} nè?`,
                "Khám phá xem hôm nay có gì cho bạn nào",
                "Bạn muốn bắt đầu từ đâu nhỉ?",
                "Có vài điều hay ho đang chờ bạn đó",
                "Lướt một chút xem có gì mới nào",
                "Cùng xem hôm nay PawLife có gì nào"
            ];
            const group1En = [
                `What's the plan for today with ${currentPetName}?`,
                "Let's see what's waiting for you today!",
                "Where should we start today?",
                "Exciting things are waiting for you!",
                "Let's dive in and see what's new.",
                "Ready to explore PawLife today?"
            ];
            const list = isVi ? group1Vi : group1En;
            return list[Math.floor(Math.random() * list.length)];

        } else if (rand <= 85) {
            const group2Vi = [
                "Chúc bạn ngày mới tốt lành nha",
                "Mong là hôm nay thật dịu dàng với bạn",
                `Dành chút thời gian cho ${currentPetName} nhé`
            ];
            const group2En = [
                "Wishing you a wonderful day ahead!",
                "Hope today is treating you well.",
                `Take a little moment for ${currentPetName} today.`
            ];
            const list = isVi ? group2Vi : group2En;
            return list[Math.floor(Math.random() * list.length)];

        } else {
            const group3Vi = [
                "Các bé đang chờ bạn đó 🐾",
                "Có vài người bạn nhỏ muốn gặp bạn lắm ý",
                "Hôm nay bạn muốn ngắm ai nè?"
            ];
            const group3En = [
                "The furry friends are waiting for you 🐾",
                "Some little buddies really want to see you!",
                "Who do you want to check on today?"
            ];
            const list = isVi ? group3Vi : group3En;
            return list[Math.floor(Math.random() * list.length)];
        }
    }, [language]);

    useEffect(() => {
        const fetchSubtitle = async () => {
            let selectedPetName = '';

            try {
                // Chỉ gọi API nếu user đã đăng nhập
                if (user?.id) {
                    // Gọi API lấy danh sách pet giống y hệt file my-pets.tsx
                    const myPets = await petService.getMyPets();

                    // Nếu user có pet
                    if (myPets && myPets.length > 0) {
                        // Random bốc 1 pet bất kỳ trong mảng
                        const randomIndex = Math.floor(Math.random() * myPets.length);
                        selectedPetName = myPets[randomIndex].name;
                    }
                }
            } catch (error) {
                console.log('Lỗi lấy pet name cho header:', error);
            }

            // Truyền tên pet vừa random được vào hàm sinh câu chào
            setGreetingSubtitle(generateGreeting(selectedPetName));
        };

        fetchSubtitle();
    }, [language, generateGreeting, user?.id]);

    const [heroImage, setHeroImage] = useState(() => {
        const hour = new Date().getHours();
        return (hour >= 6 && hour < 18)
            ? require('../../assets/images/home_hero_1.png')
            : require('../../assets/images/home_hero_2.png');
    });

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                const hour = new Date().getHours();
                const newImage = (hour >= 6 && hour < 18)
                    ? require('../../assets/images/home_hero_1.png')
                    : require('../../assets/images/home_hero_2.png');
                setHeroImage((currentImage: any) => currentImage !== newImage ? newImage : currentImage);
            }
        });
        return () => subscription.remove();
    }, []);

    const [pets, setPets] = useState<any[]>([]);
    const [shelters, setShelters] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);

    // Đổi logic loading: Tách riêng initialLoading để phục vụ hiển thị UI mượt
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [hasUnread, setHasUnread] = useState(false);
    const bounceY = useSharedValue(0);

    const handleScanPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push('/scan');
    };

    useEffect(() => {
        bounceY.value = withRepeat(
            withSequence(
                withDelay(5000, withTiming(-12, { duration: 120, easing: Easing.out(Easing.ease) })),
                withTiming(0, { duration: 400, easing: Easing.bounce })
            ),
            -1, false
        );
    }, []);

    const bounceStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bounceY.value }] }));

    const HEADER_MAX_HEIGHT = 320;
    const CURVE_HEIGHT = 28;
    const HEADER_MIN_HEIGHT = insets.top + 116;
    const SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;
    const scrollY = useSharedValue(0);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => { scrollY.value = event.contentOffset.y; },
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
        const translateY = interpolate(scrollY.value, [0, SCROLL_DISTANCE], [0, targetY], Extrapolation.CLAMP);
        const translateX = interpolate(scrollY.value, [0, SCROLL_DISTANCE], [0, targetX], Extrapolation.CLAMP);
        const scale = interpolate(scrollY.value, [0, SCROLL_DISTANCE], [1, 0.9], Extrapolation.CLAMP);

        // Đổi maxWidth thành width và trừ hao nhiều hơn do chữ bị tịnh tiến sang phải (translateX)
        const dynamicWidth = interpolate(
            scrollY.value,
            [0, SCROLL_DISTANCE],
            [SCREEN_WIDTH - 48, SCREEN_WIDTH - 190], // Ép chiều rộng nhỏ lại đủ không gian cho 3 icon
            Extrapolation.CLAMP
        );

        return {
            transform: [{ translateY }, { translateX }, { scale }],
            width: dynamicWidth // QUAN TRỌNG: Dùng width thay vì maxWidth
        };
    });

    const subtitleAnimatedStyle = useAnimatedStyle(() => {
        const opacity = interpolate(scrollY.value, [0, SCROLL_DISTANCE * 0.35], [1, 0], Extrapolation.CLAMP);
        const height = interpolate(scrollY.value, [0, SCROLL_DISTANCE * 0.35], [20, 0], Extrapolation.CLAMP);
        const marginTop = interpolate(scrollY.value, [0, SCROLL_DISTANCE * 0.35], [4, 0], Extrapolation.CLAMP);
        return { opacity, height, marginTop };
    });

    const backgroundImageAnimatedStyle = useAnimatedStyle(() => {
        const translateY = interpolate(scrollY.value, [0, SCROLL_DISTANCE], [0, -132], Extrapolation.CLAMP);
        return { transform: [{ translateY }] };
    });

    useFocusEffect(
        useCallback(() => {
            const checkUnreadNotifications = async () => {
                if (!user?.id) return;
                try {
                    // Gọi silent request cho đếm thông báo
                    const res = await axiosClient.get('/notifications?page=1&limit=10', { headers: { 'X-Silent-Request': 'true' } });
                    const notifications = res.data.data || [];
                    setHasUnread(notifications.some((item: any) => !item.isRead));
                } catch (error) {
                    // console.error("Lỗi thông báo:", error);
                }
            };
            checkUnreadNotifications();

            // Xóa loadHomeData ở đây nếu nó gây gọi API đúp khi vừa mở app
            // Giữ lại nếu bạn muốn refresh data ngầm mỗi khi chuyển tab
            if (isLocationLoaded && !isInitialLoading) {
                loadHomeData(location?.lat, location?.lng, true);
            }
        }, [isLocationLoaded, location, user?.id, isInitialLoading])
    );

    const loadHomeData = async (currentLat?: number, currentLng?: number, isSilentRefresh = false) => {
        try {
            // Không set trạng thái loading nếu đây là Silent Refresh
            if (!isSilentRefresh && pets.length === 0) setIsInitialLoading(true);

            // ĐÃ XÓA: Lệnh setTimeout 2000ms gây chậm app vô lý. API bao nhiêu ms thì trả về bấy nhiêu ms.

            // Gợi ý: Nếu trong service bạn cấu hình truyền được headers, hãy thêm X-Silent-Request: 'true' 
            // vào tham số nếu isSilentRefresh = true để không chớp Global Loader.
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
            setIsInitialLoading(false);
        }
    };

    useEffect(() => {
        if (!isLocationLoaded) return;
        const initLoad = async () => {
            await loadHomeData(location?.lat, location?.lng);
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
        const opacity = interpolate(scrollY.value, [SCROLL_DISTANCE * 0.3, SCROLL_DISTANCE], [0, 1], Extrapolation.CLAMP);
        return { opacity };
    });

    const getItemLayout = useCallback((data: any, index: number) => ({ length: 140, offset: 140 * index, index }), []);

    const renderPetItem = useCallback(({ item: pet }: { item: any }) => {
        const petImageUrl = (pet.images && pet.images.length > 0) ? pet.images[0]?.url : 'https://via.placeholder.com/200x300.png?text=No+Image';
        const fullAddress = pet.location || pet.shelter?.address;
        let displayCity = 'not updated';
        if (fullAddress) {
            const addressParts = fullAddress.split(',');
            displayCity = addressParts[addressParts.length - 1].trim();
        }

        const isFemale = pet.gender?.toUpperCase() === 'FEMALE' || pet.gender?.toUpperCase() === 'CÁI';
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
                    years--; months += 12;
                }
                if (years > 0) return `${years}`;
                if (months > 0) return `${months}T`;
                return '1T';
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
                    params: { id: pet.id, name: pet.name, gender: pet.gender || 'male', distance: displayCity, image: petImageUrl, age: displayAge, breed: pet.breed || 'Unknown Breed' }
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

    // QUAN TRỌNG: Đã xóa cục if (isLoading) return <ActivityIndicator /> chặn ngang UI tại đây.
    // UI bây giờ sẽ render Bộ Header NGAY LẬP TỨC.

    return (
        <View className="flex-1 bg-white ">
            <Animated.ScrollView
                showsVerticalScrollIndicator={false}
                style={{ flex: 1, zIndex: 1 }}
                contentContainerStyle={{ paddingBottom: 60 }}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}
            >
                <View style={{ height: HEADER_MAX_HEIGHT }} />

                <View className="bg-white pb-6">
                    <LinearGradient colors={['#FFFFFF', '#FCF8ED']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} className="pb-6">
                        <View className="px-6 mt-2">
                            <Animated.View style={[bounceStyle, {}]}>
                                <TouchableOpacity activeOpacity={0.8} onPress={handleScanPress}>
                                    <View className="relative p-[20px] rounded-[32px] flex-row items-center bg-white/50" style={{ shadowColor: '#E89B5A5D', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 5, elevation: 4 }}>
                                        <LinearGradient colors={['#FFFFFF', '#FCF8ED']} locations={[0.3, 0.8]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 32 }} />
                                        <View className="w-16 h-16 rounded-2xl overflow-hidden items-center justify-center mr-5">
                                            <LinearGradient colors={['rgb(255, 244, 230)', 'rgba(255, 232, 204, 0.52)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
                                            <Image source={require('../../assets/icon/scan-index.png')} style={{ width: 21, height: 21 }} resizeMode="cover" />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="font-semibold text-gray-900 text-lg">{t('Found A Lost Pet?')}</Text>
                                            <Text className="text-gray-500 text-sm mt-1 leading-5">{t('Scan to help them find a way home')}</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            </Animated.View>

                            <View className="mt-[38px]">
                                <Text className="text-[16px] font-semibold text-gray-900 mb-4">{t('Pawcare')}</Text>
                                <View className="flex-row justify-between">
                                    {CATEGORIES.map((cat) => (
                                        <TouchableOpacity key={cat.id} className="items-center w-[22%] -ml-1" activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} onPress={() => router.push({ pathname: '/pawcare/[category]', params: { category: cat.label } })}>
                                            <View className="w-20 h-20 bg-white rounded-full items-center justify-center mb-3" style={{ shadowColor: '#E89B5A', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 }}>
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
                            {isInitialLoading && pets.length === 0 ? (
                                <SectionLoader />
                            ) : pets.length === 0 ? (
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
                            <SectionHeader title="Adoption Shelters" onLinkPress={() => router.push({ pathname: '/search', params: { type: 'Shelter' } })} t={t} />
                            {isInitialLoading && shelters.length === 0 ? (
                                <SectionLoader />
                            ) : shelters.length === 0 ? (
                                <Text className="text-center text-gray-400 mt-2 mb-4">Chưa có trạm cứu hộ nào</Text>
                            ) : (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 16 }} nestedScrollEnabled={true}>
                                    {shelters.map((shelter) => (
                                        <TouchableOpacity
                                            key={shelter.id}
                                            className="w-72 bg-white -ml-1 p-3 rounded-[20px] mb-3 mt-1 flex-row items-center active:opacity-70"
                                            style={{ shadowColor: '#E89B5A', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 6 }}
                                            onPress={() => router.push({ pathname: '/shelter-profile', params: { id: shelter.id, name: shelter.name, address: shelter.address || 'Updating', image: shelter.avatarUrl || shelter.coverUrl || 'https://via.placeholder.com/150' } })}
                                        >
                                            <Image source={{ uri: shelter.avatarUrl || shelter.coverUrl || 'https://via.placeholder.com/150' }} className="w-14 h-14 rounded-full bg-gray-200 mr-3" resizeMode="cover" />
                                            <View className="flex-1">
                                                <Text className="font-medium text-black text-[14px]" numberOfLines={1}>{shelter.name}</Text>
                                                <View className="flex-row items-center mt-2">
                                                    <Image source={require('../../assets/icon/location-solid-gray.png')} style={{ width: 10, height: 10 }} resizeMode="cover" />
                                                    <Text className="text-[#8E8E93] font-regular text-[12px] ml-1 flex-1" numberOfLines={1}>{shelter.address || (isVi ? 'Đang cập nhật' : 'Updating')}</Text>
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
                            {isInitialLoading && events.length === 0 ? (
                                <SectionLoader />
                            ) : events.length === 0 ? (
                                <Text className="text-center text-gray-400 mt-2 mb-4">Chưa có sự kiện nào sắp tới</Text>
                            ) : (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 16 }} nestedScrollEnabled={true}>
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
                                                            <Text className="text-[12px] font-regular text-[#8E8E93] tracking-[0.06px] mt-0.5">{formatMonthShort(d, isVi)}</Text>
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

            <Animated.View style={[headerAnimatedStyle, { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, backgroundColor: '#FFDDA2', overflow: 'hidden' }]} pointerEvents="box-none">
                <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, left: 0, width: '100%', height: HEADER_MAX_HEIGHT }, backgroundImageAnimatedStyle]}>
                    <Image source={heroImage} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                </Animated.View>

                <Animated.View pointerEvents="none" style={[cornerOverlayAnimatedStyle, { position: 'absolute', top: 0, left: 0, right: 0, bottom: CURVE_HEIGHT + 14, borderBottomLeftRadius: 40, zIndex: 2, overflow: 'hidden', borderWidth: 2.5, borderColor: 'rgba(234, 164, 100, 0.5)' }]}>
                    <BlurView tint="light" intensity={7} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(232, 155, 90, 0.15)' }} />
                </Animated.View>

                <View className="px-6 w-full h-full" pointerEvents="box-none" style={{ paddingTop: insets.top + 10, zIndex: 10 }}>
                    <View className="flex-row justify-between content-center items-start z-20" pointerEvents="box-none">
                        <View className="flex-row items-center flex-1" pointerEvents="box-none">
                            <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/edit-profile')}>
                                <Animated.View style={[avatarAnimatedStyle, { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 1, elevation: 8, zIndex: 50 }]}>
                                    <View style={{ flex: 1, backgroundColor: '#ffedd5', overflow: 'hidden', borderWidth: 2.5, borderColor: '#FFFFFF', borderRadius: 1000 }}>
                                        <Image source={{ uri: user?.avatarUrl || 'https://i.pravatar.cc/150?img=32' }} className="w-full h-full" />
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
                                {hasUnread && <View className="absolute top-0 right-0.5 w-2.5 h-2.5 bg-[#E89B5A] rounded-full border border-white" />}
                            </TouchableOpacity>

                            <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/profile-settings')} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                                <Feather name="menu" size={26} color="white" style={{ textShadowColor: 'rgba(0,0,0,0.15)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Animated.View
                        pointerEvents="none"
                        style={[textContainerAnimatedStyle, { position: 'absolute', bottom: CURVE_HEIGHT + 83, left: 24, zIndex: 10 }]}
                        className="-ml-1" // Đã xoá w-[60%]
                    >
                        {/* Vẫn giữ nguyên numberOfLines={1} và ellipsizeMode="tail" nhé */}
                        <Text
                            className="text-white font-semibold text-[20px] shadow-black/10"
                            style={{ transformOrigin: 'left center' }}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                        >
                            {t('Hello,')} {user?.name || t('User')}!
                        </Text>

                        <Animated.Text
                            style={[subtitleAnimatedStyle]}
                            className="text-white text-[14px] font-medium tracking-tight overflow-hidden"
                            numberOfLines={1}
                            ellipsizeMode="tail"
                        >
                            {greetingSubtitle}
                        </Animated.Text>
                    </Animated.View>
                </View>

                <View className="absolute bottom-0 w-full bg-[#FFFFFF] rounded-t-[60px]" style={{ height: CURVE_HEIGHT - 5, zIndex: 0 }} pointerEvents="none" />
            </Animated.View>
        </View>
    );
}