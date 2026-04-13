// app/(tabs)/index.tsx
import { Text } from '@/components/AppText';
import { AuthContext } from '@/contexts/AuthContext';
import { Feather, FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Image, ImageBackground, ScrollView, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// --- IMPORT API SERVICES & HOOKS ---
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback } from 'react';
import { FlatList } from 'react-native-gesture-handler';
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
import axiosClient from '../../api/axiosClient';
import { useLocation } from '../../hooks/useLocation';
import { eventService } from '../../services/eventService';
import { petService } from '../../services/petService';
import { shelterService } from '../../services/shelterService';
// --- DATA CONSTANTS ---
const CATEGORIES = [
  { id: 1, label: 'Training', icon: 'graduation-cap' },
  { id: 2, label: 'Nutrition', icon: 'apple-alt' },
  { id: 3, label: 'Health', icon: 'heartbeat' },
  { id: 4, label: 'Beauty', icon: 'cut' },
];
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
const SectionHeader = ({ title, onLinkPress }: { title: string, onLinkPress?: () => void }) => (
  <View className="flex-row justify-between items-center mb-4 px-6">
    <Text className="text-[16px] font-semibold text-gray-900 ">{title}</Text>
    <TouchableOpacity onPress={onLinkPress}>
      <Text className="text-[#F59E0B] text-sm font-extralight">View All {' >'}</Text>
    </TouchableOpacity>
  </View>
);

export default function HomeScreen() {
  const router = useRouter(); 
  const insets = useSafeAreaInsets();
  const { user } = useContext(AuthContext);
  const { location, errorMsg, isLocationLoaded } = useLocation();
  const rotation = useSharedValue(0);
  const translateY = useSharedValue(0);
  const [originalPets, setOriginalPets] = useState<any[]>([]);
  
  // --- STATES CHO API ---
  const [pets, setPets] = useState<any[]>([]);
  const [shelters, setShelters] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasUnread, setHasUnread] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // --- THÔNG SỐ HEADER ---
  const HEADER_MAX_HEIGHT = 340; // Chiều cao ảnh bìa ban đầu
  const CURVE_HEIGHT = 56; // Chiều cao của đoạn bo cong trắng
  const HEADER_MIN_HEIGHT = insets.top + 116; // Đảm bảo đủ chỗ cho: Status bar + Avatar 40px + Curve 56px
  const SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // 1. Header chỉ co chiều cao, KHÔNG làm phẳng góc bo tròn
  const headerAnimatedStyle = useAnimatedStyle(() => {
    const height = interpolate(scrollY.value, [0, SCROLL_DISTANCE], [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT], Extrapolation.CLAMP);
    return { height };
  });

  // 2. Avatar co lại từ 68 -> 40
  const avatarAnimatedStyle = useAnimatedStyle(() => {
    const size = interpolate(scrollY.value, [0, SCROLL_DISTANCE], [68, 40], Extrapolation.CLAMP);
    return { width: size, height: size, borderRadius: size / 2 };
  });

  // 3. User name dịch ngang 56px và kéo lên chính xác -76px để Center với Avatar 40px
  const textContainerAnimatedStyle = useAnimatedStyle(() => {
    // Kéo lên trên: Khoảng cách kéo lên phải bù lại độ cao của Avatar to và khoảng cách ban đầu
    const translateY = interpolate(scrollY.value, [0, SCROLL_DISTANCE], [0, -72], Extrapolation.CLAMP);
    
    // Dịch sang phải: 40px (chiều rộng avatar khi thu nhỏ) + 12px (khoảng cách gap) = 52px
    const translateX = interpolate(scrollY.value, [0, SCROLL_DISTANCE], [0, 45], Extrapolation.CLAMP);
    
    // Thu nhỏ text một chút xíu (10%) để thanh Header nhìn thanh thoát hơn, không bị chật chội
    const scale = interpolate(scrollY.value, [0, SCROLL_DISTANCE], [1, 0.9], Extrapolation.CLAMP);

    return { 
      transform: [
        { translateY }, 
        { translateX },
        { scale }
      ],
      // Nếu RN version hỗ trợ, thêm dòng này để scale không làm lệch text sang trái
      // transformOrigin: 'left center' 
    };
  });

  // 4. Subtitle: Mờ đi và xẹp xuống NHANH HƠN (nhân với 0.35 thay vì 0.5) 
  // để dọn đường cho User Name trượt sang phải gọn gàng, không bị dính chữ.
  const subtitleAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, SCROLL_DISTANCE * 0.35], [1, 0], Extrapolation.CLAMP);
    const height = interpolate(scrollY.value, [0, SCROLL_DISTANCE * 0.35], [20, 0], Extrapolation.CLAMP);
    const marginTop = interpolate(scrollY.value, [0, SCROLL_DISTANCE * 0.35], [4, 0], Extrapolation.CLAMP);
    return { opacity, height, marginTop };
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
      
      if (fetchedPets.length > 0 && fetchedPets.length < 5) {
          fetchedPets = [
              ...fetchedPets, 
              ...fetchedPets.map((p: any) => ({...p, fakeId: p.id + '_clone1'})),
              ...fetchedPets.map((p: any) => ({...p, fakeId: p.id + '_clone2'}))
          ];
      }
      setPets(fetchedPets);
      
      const fetchedShelters = sheltersRes?.data?.data || sheltersRes?.data || sheltersRes || [];
      setShelters(Array.isArray(fetchedShelters) ? fetchedShelters : []);

    } catch (error: any) {
      if (error?.response?.status === 401) {
          setPets([]); setEvents([]); setShelters([]);
      } else {
          console.error("Lỗi khi tải dữ liệu màn hình chính:", error);
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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHomeData(location?.lat, location?.lng); 
    setRefreshing(false);
  };

  useEffect(() => {
    rotation.value = withRepeat(
        withDelay(
            4000, 
            withSequence(
            withTiming(-1, { duration: 80, easing: Easing.linear }),
            withTiming(1, { duration: 80, easing: Easing.linear }),
            withTiming(-1, { duration: 80, easing: Easing.linear }),
            withTiming(1, { duration: 80, easing: Easing.linear }),
            withTiming(0, { duration: 80, easing: Easing.linear })
            )
        ),
        -1, 
        false
        );

    translateY.value = withRepeat(
      withDelay(
        4000,
        withSequence(
          withTiming(-4, { duration: 120, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 120, easing: Easing.bounce }),
          withTiming(-2, { duration: 120, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 120, easing: Easing.bounce })
        )
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
    ],
  }));

  if (isLoading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#FF8C42" />
        <Text className="mt-4 text-gray-500 font-medium">Đang tải dữ liệu...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#ffffff]"> {/* Background cam để khi kéo pull-to-refresh không bị lộ viền */}
      
      {/* --- 1. HEADER CỐ ĐỊNH (ABSOLUTE) NỔI TRÊN CÙNG --- */}
      <Animated.View style={[headerAnimatedStyle, { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, backgroundColor: '#FFDDA2', overflow: 'hidden' }]}>
        <ImageBackground 
            source={require('../../assets/images/home_tab.jpg')} 
            className="w-full h-full"
            style={{ paddingTop: insets.top + 10 }}
            resizeMode="cover"
        >
            <View className="px-6 relative h-full">
                {/* Hàng ngang chứa Avatar và 3 Icon */}
                <View className="flex-row justify-between items-start z-20">
                    <AnimatedTouchableOpacity 
                        activeOpacity={0.8}
                        onPress={() => router.push('/edit-profile')}
                        style={[avatarAnimatedStyle, { backgroundColor: '#ffedd5', overflow: 'hidden' }]}
                    >
                        <Image source={{ uri: user?.avatarUrl || 'https://i.pravatar.cc/150?img=32' }} className="w-full h-full" />
                    </AnimatedTouchableOpacity>

                    {/* TRẢ LẠI 3 NÚT TẠI ĐÂY */}
                    <View className="flex-row gap-5 items-center mt-2">
                        <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/search')}>
                            <Feather name="search" size={26} color="white" style={{ textShadowColor: 'rgba(0,0,0,0.15)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 3 }} />
                        </TouchableOpacity>
                        
                        <TouchableOpacity activeOpacity={0.7} className="relative" onPress={() => router.push('/notifications')} >
                            <Ionicons name="notifications" size={26} color="white" style={{ textShadowColor: 'rgba(0,0,0,0.15)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 3 }} />
                            {hasUnread && (
                                <View className="absolute top-0 right-0.5 w-2.5 h-2.5 bg-[#F59E0B] rounded-full border border-white" />
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/profile-settings')} >
                            <Feather name="menu" size={26} color="white" style={{ textShadowColor: 'rgba(0,0,0,0.15)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 3 }} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Khối Text - Sử dụng insets.top để đo vị trí chính xác trên mọi thiết bị */}
                <Animated.View style={[
                    textContainerAnimatedStyle, 
                    { 
                        position: 'absolute', 
                        top: insets.top + 21, /* <-- Sửa 94 thành 82 để kéo text gần sát vào gốc Avatar */
                        left: 24, 
                        zIndex: 10 
                    }
                ]}>
                    <Text 
                        className="text-white font-semibold text-[20px] shadow-black/10"
                        style={{ transformOrigin: 'left center' }} // Giúp khi scale text không bị thụt lùi về tâm
                    >
                        Hello, {user?.name || 'Người dùng'}!
                    </Text>
                    <Animated.Text 
                        style={[subtitleAnimatedStyle]} 
                        className="text-white text-[14px] font-medium shadow-sm tracking-tight overflow-hidden"
                    >
                        Let’s dive into your account
                    </Animated.Text>
                </Animated.View>
            </View>
        </ImageBackground>

        {/* 🏔️ LỚP GIẢ LẬP ĐƯỜNG CONG (FAKE CURVE) 🏔️ */}
        {/* Lớp này luôn bám dưới đáy Header, giữ nguyên hình dạng cong đè lên ảnh. Nó liền mạch hoàn toàn với ScrollView bên dưới */}
        <View className="absolute bottom-0 w-full h-[56px] bg-white rounded-t-[40px]" />
      </Animated.View>

      {/* --- 2. MAIN CONTENT SCROLLVIEW --- */}
      <Animated.ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingTop: HEADER_MAX_HEIGHT, paddingBottom: 120 }} // Bắt đầu nối tiếp đúng ngay dưới điểm 340px của Header
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        <View className="flex-1 bg-white">
            <LinearGradient
                colors={['#FFFFFF', '#FFFBF5', '#FFF9F0']} 
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="flex-1 pt-2 pb-6"
            >
                <View className="px-6">
                    {/* KHỐI QUÉT MÃ FOUND A LOST PET */}
                    <AnimatedTouchableOpacity 
                        activeOpacity={0.8} 
                        onPress={() => router.push('/scan')}
                    >
                        <View 
                            className="relative p-6 rounded-[32px] flex-row items-center mt-6 bg-white/50"
                            style={{
                                shadowColor: '#F59E0B5d', shadowOffset: { width: 0, height: 0 }, 
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
                                <MaterialCommunityIcons name="line-scan" size={32} color="#F59E0B" />
                            </View>
                            <View className="flex-1">
                                <Text className="font-semibold text-gray-900 text-lg">Found A Lost Pet?</Text>
                                <Text className="text-gray-500 text-sm mt-1 leading-5">Scan to help them find a way home</Text>
                            </View>
                        </View>
                    </AnimatedTouchableOpacity>

                    {/* PAWCARE */}
                    <View className="mt-[38px]">
                        <Text className="text-[16px] font-semibold text-gray-900 mb-4">Pawcare</Text>
                        <View className="flex-row justify-between">
                            {CATEGORIES.map((cat) => (
                                <TouchableOpacity 
                                    key={cat.id} 
                                    className="items-center w-[22%]" 
                                    activeOpacity={0.7}
                                    onPress={() => router.push({ pathname: '/pawcare/[category]', params: { category: cat.label } })}
                                >
                                    <View 
                                        className="w-20 h-20 bg-white rounded-full items-center justify-center mb-3 border border-gray-50"
                                        style={{ shadowColor: '#E89B5A', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 2, elevation: 4 }}
                                    >
                                        <FontAwesome5 name={cat.icon as any} size={26} color="#F59E0B" />
                                    </View>
                                    <Text className="text-gray-500 text-xs font-medium">{cat.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>

                {/* --- PETS NEAR YOU TỪ API --- */}
                <View className="mt-[38px]">
                    <SectionHeader 
                        title="Pets Near You" 
                        onLinkPress={() => router.push({ pathname: '/search', params: { type: 'Pet' }})}
                    />
                    {pets.length === 0 ? (
                        <Text className="text-center text-gray-400 mt-2 mb-4">Chưa có thú cưng nào gần đây</Text>
                    ) : (
                        <FlatList
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: 24, gap: 4 }}
                            data={pets}
                            keyExtractor={(item, index) => item.fakeId ? item.fakeId : item.id.toString() + index} 
                            initialNumToRender={4}
                            maxToRenderPerBatch={4}
                            windowSize={5}
                            
                            renderItem={({ item: pet }) => {
                                const petImageUrl = (pet.images && pet.images.length > 0) 
                                    ? pet.images[0]?.url : 'https://via.placeholder.com/200x300.png?text=No+Image';

                                // Xử lý lấy Tỉnh/Thành phố
                                const fullAddress = pet.location || pet.shelter?.address;
                                let displayCity = 'Chưa cập nhật';
                                if (fullAddress) {
                                    const addressParts = fullAddress.split(',');
                                    displayCity = addressParts[addressParts.length - 1].trim();
                                }
                                const displayLocation = displayCity;

                                const isFemale = pet.gender?.toUpperCase() === 'FEMALE';

                                return (
                                    <TouchableOpacity 
                                        className="w-[128px] h-56 rounded-[24px] bg-white mt-1 mr-3"
                                        activeOpacity={0.85}
                                        style={{
                                            shadowColor: '#E89B5A',
                                            shadowOffset: { width: 3, height: 3 }, 
                                            shadowOpacity: 0.3, 
                                            shadowRadius: 4, 
                                            elevation: 6, 
                                        }}
                                        onPress={() => router.push({
                                            pathname: '/pet-detail-modal',
                                            params: { 
                                                id: pet.id, name: pet.name, gender: pet.gender || 'male', 
                                                distance: displayLocation, image: petImageUrl,
                                                age: pet.age || 'Unknown', breed: pet.breed || 'Unknown Breed'
                                            }
                                        })}
                                    >
                                        <View className="w-full h-full rounded-[24px] overflow-hidden relative">
                                            {/* Ảnh Cover */}
                                            <Image 
                                                source={{ uri: petImageUrl }} 
                                                className="w-full h-full absolute" 
                                                resizeMode="cover" 
                                            />
                                            
                                            <LinearGradient
                                                colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.7)']}
                                                locations={[0.1, 0.2, 1]}
                                                style={{
                                                    position: 'absolute',
                                                    bottom: 0,
                                                    left: 0,
                                                    right: 0,
                                                    height: '50%',
                                                    justifyContent: 'flex-end',
                                                    paddingHorizontal: 12,
                                                    paddingBottom: 14,
                                                }}
                                            >
                                                {/* Dòng 1: Tên + [Icon Giới tính + Tuổi (Hiệu ứng Blur)] */}
                                                <View className="flex-row items-center mb-1">
                                                    <Text 
                                                        className="text-white text-[17px] font-semibold tracking-tight shrink mb-0.5" 
                                                        numberOfLines={1}
                                                    >
                                                        {pet.name}
                                                    </Text>
                                                    
                                                    {/* Thẻ Giới tính + Tuổi CÓ kính mờ */}
                                                    <View className="flex-row items-center ml-2 px-2 py-0.5 rounded-full shrink-0 border border-white/40 overflow-hidden bg-white/20 backdrop-blur-md">
                                                        <Ionicons 
                                                            name={isFemale ? 'female' : 'male'} 
                                                            size={12} 
                                                            color="#ffffff" 
                                                        />
                                                        <Text className="text-white text-[11px] font-bold ml-1">
                                                            {pet.age || '1'}
                                                        </Text>
                                                    </View>
                                                </View>

                                                {/* Dòng 2: Location (Trở về thiết kế không viền, không blur như cũ) */}
                                                <View className="flex-row items-center">
                                                    <Ionicons name="location-sharp" size={13} color="#ffffff" />
                                                    <Text 
                                                        className="text-white/95 text-xs font-medium ml-1 flex-1" 
                                                        numberOfLines={1}
                                                    >
                                                        {displayLocation}
                                                    </Text>
                                                </View>
                                            </LinearGradient>
                                        </View>
                                    </TouchableOpacity>
                                )
                            }}
                        />
                    )}
                </View>

                {/* --- ADOPTION SHELTERS TỪ API --- */}
                <View className="mt-[38px]">
                    <SectionHeader 
                        title="Adoption Shelters" 
                        onLinkPress={() => router.push({ pathname: '/search', params: { type: 'Shelter' }})}
                    />
                    {shelters.length === 0 ? (
                        <Text className="text-center text-gray-400 mt-2 mb-4">Chưa có trạm cứu hộ nào</Text>
                    ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 16 }}>
                            {shelters.map((shelter) => {
                                const shelterImageUrl = shelter.avatarUrl || shelter.coverUrl || 'https://via.placeholder.com/150';

                                return (
                                    <TouchableOpacity 
                                        key={shelter.id} 
                                        className="w-72 bg-white p-3 rounded-[20px] flex-row items-center active:opacity-70"
                                        style={{
                                            shadowColor: '#E89B5A',
                                            shadowOffset: { width: 3, height: 3 }, 
                                            shadowOpacity: 0.25, 
                                            shadowRadius: 4, 
                                            elevation: 6, 
                                        }}
                                        onPress={() => router.push({
                                            pathname: '/shelter-profile',
                                            params: { 
                                                id: shelter.id, name: shelter.name, 
                                                address: shelter.address || 'Đang cập nhật', image: shelterImageUrl
                                            }
                                        })}
                                    >
                                        <Image source={{ uri: shelterImageUrl }} className="w-14 h-14 rounded-2xl bg-gray-200 mr-3" resizeMode="cover" />
                                        <View className="flex-1">
                                            <Text className="font-semibold text-gray-800 text-sm " numberOfLines={1}>{shelter.name}</Text>
                                            <View className="flex-row items-center mt-2">
                                                <Ionicons name="location-outline" size={12} color="#9CA3AF" />
                                                <Text className="text-gray-400 text-xs ml-1 flex-1" numberOfLines={1}>
                                                    {shelter.address || 'Đang cập nhật'}
                                                </Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                )
                            })}
                        </ScrollView>
                    )}
                </View>

                {/* --- UPCOMING EVENTS TỪ API --- */}
                {/* --- UPCOMING EVENTS TỪ API --- */}
                <View className="mt-[38px] mb-6"> 
                    <SectionHeader 
                        title="Upcoming Events" 
                        onLinkPress={() => router.push({ pathname: '/search', params: { type: 'Event' }})}
                    />
                    {events.length === 0 ? (
                        <Text className="text-center text-gray-400 mt-2 mb-4">Chưa có sự kiện nào sắp tới</Text>
                    ) : (
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 8, gap: 16 }}
                    >
                        {events.map((event) => {
                            const d = new Date(event.startDate);
                            const dayStr = d.getDate().toString().padStart(2, '0');
                            const monthStr = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();

                            return (
                            <TouchableOpacity 
                                key={event.id} 
                                // LAYER 1: Thẻ này CHỈ giữ shadow và kích thước, KHÔNG để overflow-hidden
                                className="w-[340px] h-[79px] bg-white rounded-[20px] active:scale-[0.98]"
                                style={{
                                    shadowColor: '#E89B5A',
                                    shadowOffset: { width: 3, height: 3 }, 
                                    shadowOpacity: 0.25, 
                                    shadowRadius: 4, 
                                    elevation: 6, 
                                }}
                                activeOpacity={0.85}
                                onPress={() => router.push(`/event-detail?id=${event.id}`)}
                            >
                                <View className="flex-1 flex-row rounded-[20px] overflow-hidden">

                                    {/* 1. BÊN TRÁI: Ảnh Thumbnail */}
                                    <Image 
                                        source={{ uri: event.bannerUrl || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=300&auto=format&fit=crop' }} 
                                        className="w-[98px] h-full bg-gray-100" 
                                        resizeMode="cover"
                                    />
                                    
                                    {/* 2. NỘI DUNG VÀ NGÀY THÁNG */}
                                    <View className="flex-1 flex-row items-center pl-6 pr-4 py-3">
                                        
                                        {/* THÔNG TIN & NGƯỜI THAM GIA */}
                                        <View className="flex-1 justify-between h-full pr-2">
                                            <View>
                                                <Text 
                                                    className="font-semibold text-gray-800 text-sm leading-tight mb-0.5" 
                                                    numberOfLines={2}
                                                >
                                                    {event.title}
                                                </Text>
                                                <View className="flex-row items-center mt-1.5">
                                                    <Ionicons name="location" size={12} color="#9CA3AF" />
                                                    <Text className="text-gray-400 text-xs ml-1 flex-1" numberOfLines={1}>
                                                        {event.locationName || event.address}
                                                    </Text>
                                                </View>
                                            </View>
                                            
                                            {/* Người tham gia */}
                                            <View className="flex-row mt-2 items-center">
                                                <View className="flex-row">
                                                    {/* Ảnh 1: Đứng đầu, thứ tự layer cao nhất để đè lên ảnh sau */}
                                                    <Image 
                                                        source={{ uri: 'https://i.pravatar.cc/100?img=1' }} 
                                                        className="w-[15px] h-[15px] rounded-full border-[1.5px] border-white bg-gray-200 z-30" 
                                                    />
                                                    
                                                    {/* Ảnh 2: Thêm -ml-1.5 (âm margin-left) để kéo lùi sang trái, đè một phần xuống dưới ảnh 1 */}
                                                    <Image 
                                                        source={{ uri: 'https://i.pravatar.cc/100?img=5' }} 
                                                        className="w-[15px] h-[15px] rounded-full border-[1.5px] border-white bg-gray-200 -ml-1.5 z-20" 
                                                    />
                                                    
                                                    {/* Ảnh 3: Tương tự ảnh 2 */}
                                                    <Image 
                                                        source={{ uri: 'https://i.pravatar.cc/100?img=8' }} 
                                                        className="w-[15px] h-[15px] rounded-full border-[1.5px] border-white bg-gray-200 -ml-1.5 z-10" 
                                                    />
                                                </View>
                                            </View>
                                        </View>
                                        
                                        {/* 3. BÊN PHẢI: Khối Ngày Tháng */}
                                        <View className="items-center justify-center shrink-0 min-w-[32px]">
                                            <Text className="text-[18px] font-black text-gray-800 leading-tight">
                                                {dayStr}
                                            </Text>
                                            <Text className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">
                                                {monthStr}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        )})}
                    </ScrollView>
                    )}
                </View>
            </LinearGradient>
        </View>

      </Animated.ScrollView>
    </View>
  );
}