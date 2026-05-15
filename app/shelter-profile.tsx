// app/shelter-profile.tsx
import { AntDesign, Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, DeviceEventEmitter, Dimensions, Image, Linking, Modal, ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { shelterService } from '../services/shelterService';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
  withTiming,
  runOnJS,
  interpolateColor
} from 'react-native-reanimated';

import { Text } from '@/components/AppText';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48 - 16) / 2;

const PetCard = ({ pet, formatBreed }: { pet: any, formatBreed: (breed: string) => string }) => {
  const router = useRouter();

  // Xử lý dữ liệu
  const imageUrl = pet.images && pet.images.length > 0
    ? pet.images[0].url
    : 'https://via.placeholder.com/400';
  const isFemale = pet.gender?.toLowerCase() === 'female';

  return (
    <TouchableOpacity
      className="bg-transparent mb-[14px]"
      style={{ width: 160.25 }}
      activeOpacity={0.9}
      onPress={() => router.push(`/shelter-pet-detail?id=${pet.id}`)}
    >
      <View className="relative">
        <Image
          source={{ uri: imageUrl }}
          className="w-full aspect-square rounded-[24px] bg-gray-100"
          style={{ height: 160.25 }}
          resizeMode="cover"
        />
        {pet.isFavorite && (
          <View className="absolute top-3.5 right-3.5">
            <Ionicons name="heart" size={22} color="#E89B5F" />
          </View>
        )}
      </View>

      <View className="pt-[12px]">
        <Text className="text-black font-semibold text-[16px] mb-1">{pet.name}</Text>
        <View className="flex-row items-start">
          {/* Icon Giới tính */}
          <Image
            className='top-1'
            source={isFemale ? require('../assets/icon/female.png') : require('../assets/icon/male.png')}
            style={{ width: 10, height: 10 }}
            resizeMode="cover"
          />

          <Text
            className="text-[12px] text-[#8E8E93] text-center mt-0.5 ml-1.5"
            numberOfLines={1}
          >
            {pet.age || '1 years'} · {formatBreed ? formatBreed(pet.breed) : (pet.breed || 'Unknown')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Sử dụng React.memo để tối ưu hóa, tránh render lại thẻ pet không cần thiết khi gõ phím tìm kiếm

export default function ShelterProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const shelterId = params.id as string;
  const insets = useSafeAreaInsets();

  const [shelterInfo, setShelterInfo] = useState<any>(null);
  const [pets, setPets] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  // === THÊM STATE CHO SEARCH TẠI ĐÂY ===
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { height: SCREEN_HEIGHT } = Dimensions.get('window');
  const [activeTab, setActiveTab] = useState<'pets' | 'info'>('pets');
  const COLUMN_WIDTH = (width - 48 - 16) / 2;

  const scrollY = useSharedValue(0);
  const HEADER_HEIGHT = insets.top + 50; // Chiều cao header
  const SCROLL_THRESHOLD = 200; // Khoảng cách để header hiện ra hoàn toàn
  const AnimatedIonicons = Animated.createAnimatedComponent(Ionicons);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });


  // 1. Style cho thanh Header trắng (mờ ảo rồi hiện rõ)
  const headerBarStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [SCROLL_THRESHOLD - 50, SCROLL_THRESHOLD], [0, 1], Extrapolation.CLAMP);
    return { opacity, height: HEADER_HEIGHT, backgroundColor: 'white' };
  });

  // 2. Style cho tên Shelter trong Header
  const headerTitleStyle = useAnimatedStyle(() => {
    const translateY = interpolate(scrollY.value, [SCROLL_THRESHOLD - 30, SCROLL_THRESHOLD], [10, 0], Extrapolation.CLAMP);
    const opacity = interpolate(scrollY.value, [SCROLL_THRESHOLD - 30, SCROLL_THRESHOLD], [0, 1], Extrapolation.CLAMP);
    return { opacity, transform: [{ translateY }] };
  });

  // 3. Style biến đổi nút Back và Search (Mất viền tròn, mất nền trắng)
  const iconButtonStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolate(scrollY.value, [SCROLL_THRESHOLD - 50, SCROLL_THRESHOLD], [1, 0]); // 1 là bg-white/80, 0 là transparent
    const borderWidth = interpolate(scrollY.value, [SCROLL_THRESHOLD - 50, SCROLL_THRESHOLD], [0.5, 0]);

    return {
      backgroundColor: `rgba(255, 255, 255, ${backgroundColor * 0.8})`,
      borderWidth: borderWidth,
      borderColor: 'rgba(255, 255, 255, 0.5)',
    };
  });

  const inputRef = useRef<TextInput>(null);
  const searchAnimation = useSharedValue(0);

  const handleOpenSearch = () => {
    setIsSearching(true);
    // Animation giãn nở thanh search mượt mà
    searchAnimation.value = withTiming(1, { duration: 300 });
    // Focus sau khi animation chạy được một chút hoặc hoàn tất
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  // Hàm đóng search
  const handleCloseSearch = () => {
    searchAnimation.value = withTiming(0, { duration: 250 }, () => {
      runOnJS(setIsSearching)(false);
      runOnJS(setSearchQuery)("");
    });
  };

  const backButtonStyle = useAnimatedStyle(() => ({
    opacity: interpolate(searchAnimation.value, [0, 0.2], [1, 0]),
    transform: [{ scale: interpolate(searchAnimation.value, [0, 0.2], [1, 0.8]) }],
  }));

  // 1. Style cho Container: Chuyển đổi màu nền và màu viền
  const glassSearchContainerStyle = useAnimatedStyle(() => {
    // Chuyển từ trắng mờ (0.1) sang trắng đặc (#FFFFFF)
    const backgroundColor = interpolateColor(
      searchAnimation.value,
      [0, 1],
      ['rgba(255, 255, 255, 0.1)', '#F8F8F8']
    );

    // Chuyển từ viền trắng mờ sang viền xám #EBEBEB
    const borderColor = interpolateColor(
      searchAnimation.value,
      [0, 1],
      ['rgba(255, 255, 255, 0.5)', '#EBEBEB']
    );

    return {
      width: interpolate(searchAnimation.value, [0, 1], [36, width - 40]),
      backgroundColor,
      borderColor,
      paddingLeft: interpolate(searchAnimation.value, [0, 1], [8.5, 12]),
      paddingRight: interpolate(searchAnimation.value, [0, 1], [0, 12]),
      borderWidth: 1, // Để viền hiện rõ ở trạng thái search
    };
  });

  // 2. Style cho lớp Gradient: Biến mất khi thanh search mở ra
  const gradientStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(searchAnimation.value, [0, 0.5], [1, 0]),
    };
  });

  // 3. Style cho TextInput
  const textInputStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(searchAnimation.value, [0, 0.8, 1], [0, 0, 1]),
      marginLeft: interpolate(searchAnimation.value, [0, 1], [0, 8]),
    };
  });


  // 1. Style cho Icon Search: Chuyển từ đen (trạng thái đóng) sang #8E8E93 (trạng thái mở)
  const searchIconStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      searchAnimation.value,
      [0, 1],
      ['#000000', '#8E8E93'] // Từ đen sang xám 8E8E93
    );
    return { color };
  });

  const filteredPets = useMemo(() => {
    if (!searchQuery.trim()) return pets;
    return pets.filter(pet =>
      pet.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [pets, searchQuery]);



  const [modalConfig, setModalConfig] = useState({
    visible: false,
    title: '',
    content: '',
    type: ''
  });

  // Gọi API mỗi khi có shelterId hoặc khi người dùng gõ tìm kiếm
  const [isNotFound, setIsNotFound] = useState(false);

  useEffect(() => {
    const isValidId = shelterId &&
      typeof shelterId === 'string' &&
      shelterId !== 'undefined' &&
      shelterId !== 'null';

    if (!isValidId) {
      setLoading(false);
      setIsNotFound(true);
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      fetchShelterDetail(searchQuery);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [shelterId, searchQuery]);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('SHELTER_FOLLOW_TOGGLED', (data) => {
      // Thêm dòng này: Bỏ qua nếu sự kiện do chính màn hình này phát ra
      if (data.source === 'SHELTER_PROFILE') return;

      if (data.shelterId === shelterId && isFollowing !== data.isFollowed) {
        setIsFollowing(data.isFollowed);
        setShelterInfo((prev: any) => {
          if (!prev) return prev;
          const currentFollowers = prev?._count?.followers || 0;
          return {
            ...prev,
            _count: {
              ...prev._count,
              followers: data.isFollowed ? currentFollowers + 1 : Math.max(0, currentFollowers - 1),
            },
          };
        });
      }
    });
    return () => subscription.remove();
  }, [shelterId, isFollowing]);

  const fetchShelterDetail = async (query = '') => {
    try {
      if (!shelterInfo) setLoading(true);
      const data = await shelterService.getShelterDetail(shelterId, query);
      setShelterInfo(data);
      setPets(data.pets || []);
      setIsFollowing(data.isFollowed || false);
      setIsNotFound(false); // Reset lỗi nếu thành công
    } catch (error: any) {
      console.error('Lỗi khi tải chi tiết trạm:', error);
      // 2. Bắt chính xác lỗi 404 từ backend
      if (error?.statusCode === 404 || error?.message?.includes('404')) {
        setIsNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFollow = async () => {
    const prevFollowingState = isFollowing;
    const newFollowingState = !isFollowing;

    // Optimistic UI Update
    setIsFollowing(newFollowingState);
    setShelterInfo((prev: any) => {
      const currentFollowers = prev?._count?.followers || 0;
      return {
        ...prev,
        _count: {
          ...(prev?._count || {}),
          followers: newFollowingState
            ? currentFollowers + 1
            : Math.max(0, currentFollowers - 1),
        },
      };
    });

    const filteredPets = useMemo(() => {
      if (!searchQuery.trim()) return pets;
      return pets.filter(pet =>
        pet.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }, [pets, searchQuery]);

    // BẮN SỰ KIỆN ĐỒNG BỘ RA TOÀN APP (Kèm thêm source)
    DeviceEventEmitter.emit('SHELTER_FOLLOW_TOGGLED', {
      shelterId,
      isFollowed: newFollowingState,
      source: 'SHELTER_PROFILE' // <-- Thêm cái này
    });

    try {
      const response = await shelterService.toggleFollow(shelterId);
      // Giữ nguyên logic cũ...
    } catch (error) {
      // Revert lại nếu lỗi API
      setIsFollowing(prevFollowingState);
      setShelterInfo((prev: any) => {
        // ... logic revert cũ giữ nguyên ...
      });
      console.error('Lỗi khi thay đổi trạng thái theo dõi:', error);

      // Bắn sự kiện rollback (Kèm thêm source)
      DeviceEventEmitter.emit('SHELTER_FOLLOW_TOGGLED', {
        shelterId,
        isFollowed: prevFollowingState,
        source: 'SHELTER_PROFILE' // <-- Thêm cái này
      });
    }
  };

  const formatBreed = (breed?: string) => {
    if (!breed) return '';

    // Nếu dưới hoặc bằng 15 ký tự thì giữ nguyên toàn bộ
    if (breed.length <= 15) return breed;

    // Nếu trên 15 ký tự, tiến hành tách từ dựa vào khoảng trắng
    const words = breed.split(' ');

    // Nếu có từ 2 từ trở lên (VD: Golden Retriever)
    if (words.length > 1) {
      // Lấy chữ cái đầu tiên của từ thứ nhất, cộng thêm dấu chấm, và ghép với các từ còn lại
      const firstLetter = words[0][0];
      const restOfWords = words.slice(1).join(' ');

      return `${firstLetter}. ${restOfWords}`;
    }

    // Fallback: Trong trường hợp hiếm hoi tên chỉ có 1 từ viết liền dính vào nhau mà dài hơn 15 ký tự
    return `${breed.substring(0, 15)}...`;
  };

  const openPolicy = () => {
    setModalConfig({
      visible: true,
      title: 'Adoption Policy',
      content: shelterInfo?.policy || 'The shelter has not updated the adoption policy yet.',
      type: 'policy'
    });
  };

  const openContact = () => {
    setModalConfig({
      visible: true,
      title: 'Contact Information',
      content: `📞 Phone: ${shelterInfo?.contactInfo || 'Not provided'}\n\n📍 Address: ${shelterInfo?.address || 'Not provided'}`,
      type: 'contact'
    });
  };

  const handleCall = () => {
    if (shelterInfo?.contactInfo) {
      Linking.openURL(`tel:${shelterInfo.contactInfo}`);
    }
  };

  const StatItem = ({ value, label }: { value: string | number, label: string }) => (
    <View className="flex-row items-center">
      <Text className="text-[14px] font-bold text-black tracking-[0.5px]">{value}</Text>
      <Text className="text-[14px] text-black font-regular ml-1 tracking-[0.5px]">{label}</Text>
    </View>
  );

  if (loading || !shelterInfo) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#ffa053" />
      </SafeAreaView>
    );
  }

  if (isNotFound) {
    return (
      <SafeAreaView className="flex-1 bg-[#FAFAFA] justify-center items-center">
        <MaterialCommunityIcons name="home-off" size={64} color="#E5E7EB" />
        <Text className="text-gray-800 text-lg font-bold mt-4">Không tìm thấy trạm cứu hộ</Text>
        <Text className="text-gray-500 text-sm mt-2 text-center px-6">
          Dữ liệu trạm có thể đã bị xóa hoặc đường dẫn không chính xác.
        </Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-6 bg-orange-100 px-6 py-3 rounded-full">
          <Text className="text-orange-600 font-bold">Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      {/* --- STICKY HEADER (Luôn nằm trên cùng) --- */}
      <Animated.View
        style={[headerBarStyle, { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 10, paddingHorizontal: 20 }]}
      >
        <View className="flex-1 items-center">
          <Animated.Text style={headerTitleStyle} className="text-[20px] font-semibold text-black tracking-[0.5px]">
            {shelterInfo?.name}
          </Animated.Text>
        </View>
      </Animated.View>

      {/* --- NÚT BẤM ĐIỀU HƯỚNG --- */}
      <View style={{ top: insets.top + 10, zIndex: 110 }} className="absolute left-5 right-5 flex-row justify-between items-center">
        <View
          className="absolute left-1 right-1 flex-row justify-between z-30"
        >
          <Animated.View style={backButtonStyle}>
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.8}
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 5,
                elevation: 3,
              }}
              className="absolute w-10 h-10 rounded-full items-center justify-center"
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
                  colors={['rgba(221, 221, 221, 0.5)', 'rgba(247, 247, 247, 0.8)', '#FFFFFF']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  locations={[0, 0.3, 1]}

                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 9999 }}
                />
                <Feather name="chevron-left" size={20} color="#00000" />
              </View>
            </TouchableOpacity>
          </Animated.View>

          <View style={{ position: 'absolute', right: 0, height: 40, justifyContent: 'center', alignItems: 'flex-end' }}>
            <TouchableOpacity
              onPress={isSearching ? undefined : handleOpenSearch}
              activeOpacity={isSearching ? 1 : 0.8}
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 5,
                elevation: 3,
              }}
            >
              <Animated.View
                className="overflow-hidden flex-row items-center"
                style={[
                  {
                    height: 36,
                    borderRadius: 28,
                    borderWidth: 0.5,
                  },
                  glassSearchContainerStyle
                ]}
              >
                {/* LỚP KÍNH MỜ CỦA BẠN: Sẽ biến mất dần khi trượt ra */}
                <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, gradientStyle]}>
                  <LinearGradient
                    colors={['rgba(221, 221, 221, 0.5)', 'rgba(247, 247, 247, 0.8)', '#FFFFFF']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    locations={[0, 0.3, 1]}
                    style={{ flex: 1, borderRadius: 9999 }}
                  />
                </Animated.View>

                {/* Icon Search */}
                <AnimatedIonicons name="search" size={19} style={searchIconStyle} />

                {/* TextInput và Nút X */}
                <Animated.View style={[textInputStyle, { flexDirection: 'row', alignItems: 'center', flex: 1 }]}>
                  <TextInput
                    ref={inputRef}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search pets..."
                    placeholderTextColor="#8E8E93"
                    className="flex-1 text-[14px] text-black"
                    style={{ fontFamily: 'Urbanist' }}
                  />
                  {isSearching && (
                    <TouchableOpacity onPress={handleCloseSearch} className="ml-1 px-1">
                      <Image className='ml-2' source={require('../assets/icon/sliders-gray.png')} style={{ width: 12, height: 12 }} resizeMode="cover" />
                    </TouchableOpacity>
                  )}
                </Animated.View>
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>
      </View>



      {/* --- VÙNG CUỘN CHÍNH --- */}
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[]}
      >
        {/* 1. Ảnh Cover (Kéo được) */}
        <Image
          source={{ uri: shelterInfo?.avatarUrl || 'https://via.placeholder.com/400x300' }}
          style={{ width: width, height: SCREEN_HEIGHT * 0.22 }}
          resizeMode="cover"
        />

        {/* 2. THẺ TRẮNG (Bắt đầu từ đây và kéo dài xuống hết pet list) */}
        <View className="bg-white rounded-t-[24px] bottom-[32px] pb-6 min-h-screen">
          <View className='flex-row items-center px-3 -top-[15px]'>
            <View className="bg-white p-1 rounded-full">
              <Image
                source={{ uri: shelterInfo?.avatarUrl || 'https://via.placeholder.com/150' }}
                className="w-[80px] h-[80px] rounded-full"
              />
            </View>
            <View className="ml-4 flex-1 justify-center mt-4">
              <Text className="text-[20px] font-semibold text-black mb-2 tracking-[0.5px]" numberOfLines={1}>
                {shelterInfo?.name}
              </Text>
              <View className="flex-row items-center">
                <StatItem value={shelterInfo._count?.pets || pets.length} label="pets" />
                <Text className='text-[12px] px-2 font-extrabold'>•</Text>

                <StatItem value={shelterInfo._count?.followers || 0} label="followers" />
                <Text className='text-[12px] px-2 font-extrabold'>•</Text>

                <StatItem value={shelterInfo.adoptedCount || 0} label="adopted" />
              </View>
            </View>
          </View>

          <View className='mx-[20px]' style={{ top: -5 }}>
            <View className="mb-3">
              <Text className="text-[#8E8E93] text-[12px] font-regular mb-1 leading-4 tracking-[0.06px]">Animal Shelter & Rescue</Text>
              <Text className="text-[14px] text-black font-regular leading-5 tracking-[0.06px]">
                {shelterInfo?.description || "Saving lives and finding forever home 🐾"}
              </Text>
              <View className="flex-row items-center mt-1">
                <Image
                  source={require('../assets/icon/link-icon.png')}
                  style={{ width: 12, height: 12 }}
                  resizeMode="cover"
                />
                <Text className="ml-1 text-[14px] text-[#E89B5A] leading-4 tracking-[0.06px]">{shelterInfo?.emailAddress || 'pawlife@example.com'}</Text>
              </View>

              <View className="flex-row items-center mt-1">
                <Image
                  source={require('../assets/icon/location-gray-icon.png')}
                  style={{ width: 7, height: 9 }}
                  resizeMode="cover"
                />
                <Text className="ml-2 text-[12px] text-[#8E8E93] flex-1 leading-4 tracking-[0.06px]">{shelterInfo?.address}</Text>
              </View>

              <View className="flex-row items-center mt-2">

                {/* --- 1. HIỆU ỨNG AVATAR STACK --- */}
                <View className="flex-row items-center">
                  <View>
                    {/* Avatar 1: Nằm dưới cùng, không có margin âm */}
                    <Image
                      source={{ uri: 'https://i.pravatar.cc/100?img=1' }}
                      className="w-4 h-4 rounded-full border-[1px] border-white z-10"
                    />
                  </View>

                  <View style={{ elevation: 2, marginLeft: -8 }}>
                    {/* Avatar 2: Bị kéo lùi sang trái (-ml-2.5) để đè lên Avatar 1 */}
                    <Image
                      source={{ uri: 'https://i.pravatar.cc/100?img=2' }}
                      className="w-4 h-4 rounded-full border-[1px] border-white z-20"
                    />
                  </View>

                  <View style={{ elevation: 2, marginLeft: -8 }}>
                    {/* Avatar 3: Tiếp tục kéo lùi sang trái đè lên Avatar 2 */}
                    <Image
                      source={{ uri: 'https://i.pravatar.cc/100?img=3' }}
                      className="w-4 h-4 rounded-full border-[1px] border-white z-30"
                    />
                  </View>
                </View>

                {/* --- 2. DÒNG TEXT TRỘN NHIỀU STYLE --- */}
                {/* Thẻ Text cha bọc ngoài cùng sẽ định dạng màu xám mặc định */}
                <Text className="ml-1 text-[12px] text-[#8E8E93] flex-1">
                  Followed by{' '}
                  {/* Các thẻ Text con lồng bên trong để bôi đen chữ */}
                  <Text className="font-medium text-black">john doe</Text>,{' '}
                  <Text className="font-medium text-black">james doe</Text>,{' '}
                  <Text className="font-medium text-black">jane doe</Text> and{' '}
                  <Text className="font-medium text-black">79 others</Text>
                </Text>

              </View>
            </View>
            <View className="flex-row gap-4 mb-3">
              <TouchableOpacity
                onPress={handleToggleFollow}
                className={`flex-1 py-2 rounded-full items-center justify-center shadow-sm ${isFollowing ? 'bg-gray-200 shadow-gray-100' : 'bg-[#E89B5A] shadow-orange-200'
                  }`}
              >
                <Text className={`font-semibold text-[14px] ${isFollowing ? 'text-gray-700' : 'text-white'}`}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab(prev => prev === 'pets' ? 'info' : 'pets')}
                className={`flex-1 py-2 rounded-full items-center justify-center ${activeTab === 'info' ? 'bg-orange-100' : 'bg-[#F6F6F6]'
                  }`}
              >
                <Text className={`font-semibold text-[14px] ${activeTab === 'info' ? 'text-orange-500' : 'text-gray-600'
                  }`}>
                  {activeTab === 'pets' ? 'Contact' : 'View Pets'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {activeTab === 'info' ? (
            <View className="px-[20px]">
              {/* About Shelter */}
              <Text className="text-[16px] font-medium text-black mb-2">About Shelter</Text>
              <Text className="text-[14px] text-[#8E8E93] leading-5 mb-5">
                {shelterInfo?.description || "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec a efficitur lorem, a vulputate odio. Vestibulum gravida commodo turpis sed finibus. Quisque vel porttitor quam"}
              </Text>

              {/* Contact Info */}
              <Text className="text-[16px] font-medium text-black mb-2">Contact Info</Text>
              <View className="gap-y-3 mb-5">
                <View className="flex-row items-center gap-x-3">
                  <Image
                    source={require('../assets/icon/message.png')}
                    style={{ width: 13, height: 13 }}
                    resizeMode="cover"
                  />
                  <Text className="text-[14px] text-[#8E8E93]">Send message</Text>
                </View>
                <TouchableOpacity onPress={handleCall} className="flex-row items-center gap-x-3">
                  <Image
                    source={require('../assets/icon/phone-info.png')}
                    style={{ width: 13, height: 13 }}
                    resizeMode="cover"
                  />
                  <Text className="text-[14px] text-[#8E8E93]">{shelterInfo?.contactInfo || "(+84) 0912345678"}</Text>
                </TouchableOpacity>
                <View className="flex-row items-center gap-x-3">
                  <Image
                    source={require('../assets/icon/email.png')}
                    style={{ width: 13, height: 10 }}
                    resizeMode="cover"
                  />
                  <Text className="text-[14px] text-[#8E8E93]">{shelterInfo?.emailAddress || "sannhanhieucho@email.com"}</Text>
                </View>
              </View>

              {/* More Info */}
              <Text className="text-[16px] font-medium text-black mb-2">More Info</Text>
              <View className="gap-y-3">
                <View className="flex-row items-center gap-x-3">
                  <Image
                    source={require('../assets/icon/earth.png')}
                    style={{ width: 13, height: 13 }}
                    resizeMode="cover"
                  />
                  <Text className="text-[14px] text-[#8E8E93]">Based in {shelterInfo?.address || "Vietnam"}</Text>
                </View>
                <View className="flex-row items-center gap-x-3">
                  <Image
                    source={require('../assets/icon/info.png')}
                    style={{ width: 13, height: 13 }}
                    resizeMode="cover"
                  />
                  <Text className="text-[14px] text-[#8E8E93]">Joined Jan 1, 2023</Text>
                </View>
                <View className="flex-row items-center gap-x-3">
                  <Image
                    source={require('../assets/icon/verified.png')}
                    style={{ width: 13, height: 13 }}
                    resizeMode="cover"
                  />
                  <Text className="text-[14px] text-[#8E8E93]">Verified Jan 1, 2023</Text>
                </View>
              </View>
            </View>

          ) : (

            <View className="flex-row flex-wrap gap-3 justify-between mx-[20px]">
              {filteredPets.length > 0 ? (
                filteredPets.map((pet) => (
                  <PetCard key={pet.id} pet={pet} formatBreed={formatBreed} />
                ))
              ) : (
                <View className="flex-1 items-center justify-center py-10">
                  <Text className="text-gray-500">No pets found matching "{searchQuery}"</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </Animated.ScrollView>
    </View>
  );
}