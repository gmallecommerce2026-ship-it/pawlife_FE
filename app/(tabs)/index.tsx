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
  <View className="flex-row justify-between items-end mb-4 px-6">
    <Text className="text-xl font-bold text-gray-900">{title}</Text>
    <TouchableOpacity onPress={onLinkPress}>
      <Text className="text-[#ffc99e] font-bold text-sm">View All {' >'}</Text>
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
          withTiming(-2, { duration: 80, easing: Easing.linear }),
          withTiming(2, { duration: 80, easing: Easing.linear }),
          withTiming(-2, { duration: 80, easing: Easing.linear }),
          withTiming(2, { duration: 80, easing: Easing.linear }),
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
    <View className="flex-1 bg-[#ffead9]">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        
        {/* --- 1. HEADER IMAGE BACKGROUND --- */}
        <View className="h-[340px] w-full bg-[#FFDDA2]"> 
            <ImageBackground 
                source={require('../../assets/images/home_tab.jpg')} 
                className="flex-1"
                style={{ paddingTop: insets.top + 10 }}
                resizeMode="cover"
            >
                <View className="px-6">
                    <View className="flex-row justify-between items-start">
                        <TouchableOpacity 
                            activeOpacity={0.8}
                            onPress={() => router.push('/edit-profile')}
                            className="w-14 h-14 rounded-full border-[3px] border-white shadow-sm overflow-hidden bg-orange-100"
                        >
                            <Image source={{ uri: user?.avatarUrl || 'https://i.pravatar.cc/150?img=32' }} className="w-full h-full" />
                        </TouchableOpacity>

                        <View className="flex-row gap-5 items-center mt-2">
                             <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/search')}>
                                <Feather name="search" size={26} color="white" style={{ textShadowColor: 'rgba(0,0,0,0.15)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 3 }} />
                             </TouchableOpacity>
                             
                             <TouchableOpacity activeOpacity={0.7} className="relative" onPress={() => router.push('/notifications')} >
                                <Ionicons name="notifications" size={26} color="white" style={{ textShadowColor: 'rgba(0,0,0,0.15)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 3 }} />
                                {hasUnread && (
                                    <View className="absolute top-0 right-0.5 w-2.5 h-2.5 bg-orange-500 rounded-full border border-white" />
                                )}
                            </TouchableOpacity>

                             <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/profile-settings')} >
                                <Feather name="menu" size={26} color="white" style={{ textShadowColor: 'rgba(0,0,0,0.15)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 3 }} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View className="mt-4">
                        <Text className="text-white font-bold text-lg shadow-black/10">Hello,</Text>
                        <Text className="text-white text-2xl font-extrabold shadow-sm tracking-tight">
                            {user?.name || 'Người dùng'}
                        </Text>
                    </View>
                </View>
            </ImageBackground>
        </View>

        {/* --- 2. MAIN CONTENT BODY --- */}
        {/* FIX TẠI ĐÂY: Dùng View bọc ngoài để lấy lại góc bo tròn và overflow-hidden */}
        <View className="flex-1 rounded-t-[40px] -mt-14 overflow-hidden bg-white">
            <LinearGradient
                colors={['#FFFFFF', '#FFF5EC', '#ffead9']} 
                className="flex-1 pt-2 pb-6"
            >
                <View className="px-6">
                    <AnimatedTouchableOpacity 
                        activeOpacity={0.8} 
                        onPress={() => router.push('/scan')}
                        style={animatedStyle}
                    >
                        <View className="bg-[#fffbf4] p-6 rounded-[32px] shadow-sm shadow-orange-100 flex-row items-center border border-orange-100 mt-6">
                            <View className="w-16 h-16 bg-[#ffebce] rounded-2xl items-center justify-center mr-5 shadow-lg shadow-orange-200">
                                <MaterialCommunityIcons name="line-scan" size={32} color="#ffa053" />
                            </View>
                            <View className="flex-1">
                                <Text className="font-bold text-gray-900 text-lg">Found A Lost Pet?</Text>
                                <Text className="text-gray-500 text-sm mt-1 leading-5">Scan to help them find a way home</Text>
                            </View>
                        </View>
                    </AnimatedTouchableOpacity>
                    
                    <View className="mt-8 mb-4">
                        <Text className="text-xl font-bold text-gray-900 mb-6">Pawcare</Text>
                        <View className="flex-row justify-between">
                            {CATEGORIES.map((cat) => (
                                <TouchableOpacity 
                                    key={cat.id} 
                                    className="items-center w-[22%]" 
                                    activeOpacity={0.7}
                                    onPress={() => router.push({ pathname: '/pawcare/[category]', params: { category: cat.label } })}
                                >
                                    <View className="w-18 h-18 aspect-square w-full bg-white rounded-full items-center justify-center shadow-sm shadow-gray-100 mb-3 border border-gray-50">
                                        <FontAwesome5 name={cat.icon as any} size={24} color="#ff9b49" />
                                    </View>
                                    <Text className="text-gray-500 text-xs font-medium">{cat.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>

                {/* --- PETS NEAR YOU TỪ API --- */}
                <View className="mt-4">
                    <SectionHeader 
                        title="Pets Near You" 
                        onLinkPress={() => router.push({ pathname: '/search', params: { type: 'Pets' }})}
                    />
                    {pets.length === 0 ? (
                        <Text className="text-center text-gray-400 mt-2 mb-4">Chưa có thú cưng nào gần đây</Text>
                    ) : (
                        <FlatList
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: 24, gap: 16 }}
                            data={pets}
                            keyExtractor={(item, index) => item.fakeId ? item.fakeId : item.id.toString() + index} 
                            initialNumToRender={4}
                            maxToRenderPerBatch={4}
                            windowSize={5}
                            
                            renderItem={({ item: pet }) => {
                                const petImageUrl = (pet.images && pet.images.length > 0) 
                                    ? pet.images[0]?.url : 'https://via.placeholder.com/200x300.png?text=No+Image';

                                const displayLocation = pet.distance 
                                    ? `${pet.distance}` 
                                    : (pet.location || pet.city || 'Chưa cập nhật');

                                return (
                                    <TouchableOpacity 
                                        className="w-40 h-52 rounded-[24px] overflow-hidden relative bg-gray-200 shadow-sm" 
                                        activeOpacity={0.9}
                                        onPress={() => router.push({
                                            pathname: '/pet-detail-modal',
                                            params: { 
                                                id: pet.id, name: pet.name, gender: pet.gender || 'male', 
                                                distance: displayLocation, image: petImageUrl,
                                                age: pet.age || 'Unknown', breed: pet.breed || 'Unknown Breed'
                                            }
                                        })}
                                    >
                                        <Image source={{ uri: petImageUrl }} className="w-full h-full" resizeMode="cover" />
                                        
                                        <LinearGradient
                                            colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.95)']}
                                            locations={[0, 0.4, 1]}
                                            style={{
                                                position: 'absolute',
                                                bottom: 0,
                                                left: 0,
                                                right: 0,
                                                paddingHorizontal: 12,
                                                paddingBottom: 12,
                                                paddingTop: 50,
                                            }}
                                        >
                                            <View className="flex-row items-center justify-between">
                                                <Text className="text-white font-bold text-lg">{pet.name}</Text>
                                                <View className="bg-white/30 px-1.5 py-0.5 rounded-md overflow-hidden">
                                                    <Ionicons name={pet.gender === 'FEMALE' ? 'female' : 'male'} size={12} color="white" />
                                                </View>
                                            </View>
                                            <View className="flex-row items-center mt-1">
                                                <Ionicons name="location-sharp" size={12} color="#FB923C" />
                                                <Text className="text-gray-200 text-xs ml-1 flex-1" numberOfLines={1}>
                                                    {displayLocation}
                                                </Text>
                                            </View>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                )
                            }}
                        />
                    )}
                </View>

                {/* --- ADOPTION SHELTERS TỪ API --- */}
                <View className="mt-8">
                    <SectionHeader 
                        title="Adoption Shelters" 
                        onLinkPress={() => router.push({ pathname: '/search', params: { type: 'Shelters' }})}
                    />
                    {shelters.length === 0 ? (
                        <Text className="text-center text-gray-400 mt-2 mb-4">Chưa có trạm cứu hộ nào</Text>
                    ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 5, gap: 16 }}>
                            {shelters.map((shelter) => {
                                const shelterImageUrl = shelter.avatarUrl || shelter.coverUrl || 'https://via.placeholder.com/150';

                                return (
                                    <TouchableOpacity 
                                        key={shelter.id} 
                                        className="w-72 bg-white p-3 rounded-[20px] flex-row items-center shadow-sm border border-gray-50 active:opacity-70"
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
                                            <Text className="font-bold text-gray-800 text-sm" numberOfLines={1}>{shelter.name}</Text>
                                            <View className="flex-row items-center mt-1">
                                                <Ionicons name="location-outline" size={12} color="#9CA3AF" />
                                                <Text className="text-gray-400 text-xs ml-1 flex-1" numberOfLines={1}>
                                                    {shelter.distance ? `Cách ${shelter.distance} - ` : ''}{shelter.address || 'Đang cập nhật'}
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
                <View className="mt-8 mb-6"> 
                    <SectionHeader 
                        title="Upcoming Events" 
                        onLinkPress={() => router.push({ pathname: '/search', params: { type: 'Events' }})}
                    />
                    {events.length === 0 ? (
                        <Text className="text-center text-gray-400 mt-2 mb-4">Chưa có sự kiện nào sắp tới</Text>
                    ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 5, gap: 16 }}>
                        {events.map((event) => {
                            const d = new Date(event.startDate);
                            const dayStr = d.getDate().toString().padStart(2, '0');
                            const monthStr = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();

                            return (
                            <TouchableOpacity 
                                key={event.id} 
                                className="w-[310px] bg-white p-3 rounded-[24px] flex-row shadow-sm border border-gray-50 active:scale-[0.98]"
                                activeOpacity={0.9}
                                onPress={() => router.push(`/event-detail?id=${event.id}`)}
                            >
                                <View className="relative">
                                    <Image 
                                        source={{ uri: event.bannerUrl || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=300&auto=format&fit=crop' }} 
                                        className="w-24 h-24 rounded-2xl bg-gray-200" 
                                        resizeMode="cover"
                                    />
                                    <View className="absolute top-2 left-2 bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg items-center shadow-sm">
                                        <Text className="text-xs font-bold text-orange-500 uppercase">{monthStr}</Text>
                                        <Text className="text-lg font-black text-gray-800 leading-5">{dayStr}</Text>
                                    </View>
                                </View>
                                
                                <View className="flex-1 ml-4 justify-between py-1">
                                    <View>
                                        <Text className="font-bold text-gray-800 text-base leading-tight" numberOfLines={2}>
                                            {event.title}
                                        </Text>
                                        <View className="flex-row items-center mt-1.5">
                                            <Ionicons name="location-outline" size={14} color="#9CA3AF" />
                                            <Text className="text-gray-400 text-xs ml-1 flex-1" numberOfLines={1}>
                                                {event.locationName || event.address}
                                            </Text>
                                        </View>
                                    </View>
                                    
                                    <View className="flex-row items-center justify-between mt-2">
                                        <View className="flex-row items-center">
                                            <View className="flex-row -space-x-2">
                                                <Image source={{ uri: 'https://i.pravatar.cc/100?img=1' }} className="w-6 h-6 rounded-full border-2 border-white" />
                                                <Image source={{ uri: 'https://i.pravatar.cc/100?img=5' }} className="w-6 h-6 rounded-full border-2 border-white" />
                                                <Image source={{ uri: 'https://i.pravatar.cc/100?img=8' }} className="w-6 h-6 rounded-full border-2 border-white" />
                                            </View>
                                            <Text className="text-gray-400 text-[10px] ml-2 font-medium">+{event.interestedCount} joined</Text>
                                        </View>
                                        
                                        <View className="bg-orange-50 p-1.5 rounded-full">
                                            <Feather name="arrow-right" size={14} color="#F97316" />
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

      </ScrollView>
    </View>
  );
}