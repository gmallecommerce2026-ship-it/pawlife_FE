// app/shelter-profile.tsx
import { Text } from '@/components/AppText';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLocalizedField } from '@/utils/localization';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, DeviceEventEmitter, Dimensions, Image, Keyboard, Linking, Modal, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import ReportIssueModal from '../components/ReportIssueModal';
import { shelterService } from '../services/shelterService';
import { useEngagementStore } from '../store/useEngagementStore';

const { width } = Dimensions.get('window');

// 2. Sử dụng isVi để xử lý logic song ngữ cho tuổi thú cưng
const getAge = (dobString?: string, isVi?: boolean) => {
  if (!dobString) return isVi ? 'Không rõ' : 'Unknown';
  const dob = new Date(dobString);
  const diff_ms = Date.now() - dob.getTime();
  const age_dt = new Date(diff_ms);
  const years = Math.abs(age_dt.getUTCFullYear() - 1970);
  const months = age_dt.getUTCMonth();

  if (years > 0) return `${years} ${isVi ? 'tuổi' : (years > 1 ? 'years' : 'year')}`;
  if (months > 0) return `${months} ${isVi ? 'tháng' : (months > 1 ? 'months' : 'month')}`;
  return isVi ? 'sơ sinh' : 'newborn';
};

// 3. Truyền isVi vào PetCard
const PetCard = ({ pet, formatBreed, t, isVi }: { pet: any, formatBreed: (breed: any, isVi?: boolean) => string, t: any, isVi: boolean }) => {
  const router = useRouter();

  const imageUrl = pet.images && pet.images.length > 0
    ? pet.images[0].url
    : 'https://via.placeholder.com/400';
  const isFemale = pet.gender?.toUpperCase() === 'FEMALE';

  return (
    <TouchableOpacity
      className="bg-transparent mb-[14px]"
      style={{ width: '100%' }}
      activeOpacity={0.9}
      onPress={() => router.push({
        pathname: '/pet-detail-modal',
        params: { id: pet.id }
      })}
    >
      <View className="relative">
        <Image
          source={{ uri: imageUrl }}
          className="w-full aspect-square rounded-[24px] bg-gray-100"
          style={{ width: '100%' }}
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
          <Image
            className='top-1'
            source={isFemale ? require('../assets/icon/female.png') : require('../assets/icon/male.png')}
            style={{ width: 12, height: 12 }}
            resizeMode="cover"
          />

          <Text
            className="text-[12px] text-[#8E8E93] text-center mt-0.5 ml-1.5"
            numberOfLines={1}
          >
            {getAge(pet.dob, isVi)} · {formatBreed ? formatBreed(pet.breed, isVi) : (getLocalizedField(pet.breed, isVi ? 'vi' : 'en') || (isVi ? 'Chưa rõ' : 'Unknown'))}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const SectionLabel = ({ title, optionalText }: { title: string, optionalText?: string }) => (
  <View className="flex-row items-baseline">
    <Text className="text-black font-semibold text-[14px] tracking-[0.06px]">
      {title}
    </Text>
    {optionalText && (
      <Text className="text-[#8E8E93] font-regular text-[14px] ml-1 tracking-[0.06px]">
        {optionalText}
      </Text>
    )}
  </View>
);

const FilterChip = ({ label, selected, onPress, iconSource }: any) => {
  const containerStyle = selected
    ? "border-[#E89B5A]"
    : "border border-[#E5E5E5]";
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className={`flex-1 py-2.5 border rounded-full flex-row items-center justify-center ${containerStyle}`}
    >
      {iconSource && (
        <Image
          source={iconSource}
          className="w-[16px] h-[16px] mr-2"
          resizeMode="contain"
        />
      )}
      <Text className={`text-[14px] text-black font-regular`}>{label}</Text>
    </TouchableOpacity>
  );
};
// Hàm xử lý rút gọn địa chỉ
const formatShortAddress = (fullAddress?: string) => {
  if (!fullAddress) return 'Chưa cập nhật địa chỉ'; // Hoặc nội dung mặc định

  // Tách địa chỉ bằng dấu phẩy và loại bỏ khoảng trắng thừa
  const parts = fullAddress.split(',').map(part => part.trim());

  // Nếu địa chỉ đã ngắn sẵn (<= 2 phần), trả về nguyên vẹn
  if (parts.length <= 2) return fullAddress;

  // Lấy 2 phần cuối cùng (Ví dụ: "Đà Nẵng, Việt Nam" hoặc "Quận 1, Hồ Chí Minh")
  return parts.slice(-2).join(', ');
};
export default function ShelterProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const shelterId = params.id as string;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { t, language } = useLanguage();
  const isVi = language === 'vi';
  const [pendingBlockBack, setPendingBlockBack] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const { height: SCREEN_HEIGHT } = Dimensions.get('window');
  const [activeTab, setActiveTab] = useState<'pets' | 'info'>('pets');
  const COLUMN_WIDTH = (width - 40 - 13) / 2;

  const scrollY = useSharedValue(0);
  const HEADER_HEIGHT = insets.top + 60;
  const SCROLL_THRESHOLD = 100;
  const AnimatedIonicons = Animated.createAnimatedComponent(Ionicons);
  const AnimatedAppText = Animated.createAnimatedComponent(Text);
  const [selectedGender, setSelectedGender] = useState<string | null>(null);
  const [selectedAge, setSelectedAge] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedSterilized, setSelectedSterilized] = useState<boolean | null>(null);
  const [isfilterVisible, setIsFilterVisible] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 20 });
  const [showReportModal, setShowReportModal] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  useEffect(() => {
    const unblockSub = DeviceEventEmitter.addListener('REFETCH_DATA_AFTER_UNBLOCK', () => {
      setIsBlocked(false);
      queryClient.refetchQueries({ queryKey: ['shelter-profile', shelterId], type: 'all' });
    });
    return () => unblockSub.remove();
  }, [shelterId]);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const headerBarStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [SCROLL_THRESHOLD - 50, SCROLL_THRESHOLD], [0, 1], Extrapolation.CLAMP);
    return { opacity, height: HEADER_HEIGHT, backgroundColor: 'white' };
  });

  const headerTitleStyle = useAnimatedStyle(() => {
    const translateY = interpolate(scrollY.value, [SCROLL_THRESHOLD - 30, SCROLL_THRESHOLD], [10, 0], Extrapolation.CLAMP);
    const opacity = interpolate(scrollY.value, [SCROLL_THRESHOLD - 30, SCROLL_THRESHOLD], [0, 1], Extrapolation.CLAMP);
    return { opacity, transform: [{ translateY }] };
  });

  const iconButtonStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolate(scrollY.value, [SCROLL_THRESHOLD - 50, SCROLL_THRESHOLD], [1, 0]);
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
    setIsSearchActive(true);
    searchAnimation.value = withTiming(1, { duration: 300 });
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  const handleOutsidePress = () => {
    Keyboard.dismiss();
    setIsSearchActive(false);
    searchAnimation.value = withTiming(0, { duration: 250 }, () => {
      runOnJS(setIsSearching)(false);
    });
  };

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

  const glassSearchContainerStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      searchAnimation.value,
      [0, 1],
      ['rgba(255, 255, 255, 0.1)', '#F8F8F8']
    );

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
      borderWidth: 1,
    };
  });

  const gradientStyle = useAnimatedStyle(() => ({
    opacity: interpolate(searchAnimation.value, [0, 0.5], [1, 0]),
  }));

  const textInputStyle = useAnimatedStyle(() => ({
    opacity: interpolate(searchAnimation.value, [0, 0.8, 1], [0, 0, 1]),
    marginLeft: interpolate(searchAnimation.value, [0, 1], [0, 8]),
  }));

  const searchIconStyle = useAnimatedStyle(() => {
    const color = interpolateColor(searchAnimation.value, [0, 1], ['#000000', '#8E8E93']);
    return { color };
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: shelterInfo, isLoading: loading, isError: isNotFound } = useQuery({
    queryKey: ['shelter-profile', shelterId],
    queryFn: async () => {

      const data = await shelterService.getShelterDetail(shelterId);
      console.log('shelter detail response:', data);
      if (data.isFollowed !== undefined) {
        useEngagementStore.getState().setInitialShelterFollow(shelterId, data.isFollowed);
      }
      return data;
    },
    enabled: !!shelterId && shelterId !== 'undefined' && shelterId !== 'null',
    retry: false,
  });

  const pets = shelterInfo?.pets || [];
  const globalIsFollowed = useEngagementStore(state => state.followedShelters[shelterId]);
  const toggleShelterFollow = useEngagementStore(state => state.toggleShelterFollow);

  const isFollowing = globalIsFollowed ?? shelterInfo?.isFollowed ?? false;

  const filteredPets = useMemo(() => {
    if (!searchQuery.trim()) return pets;
    return pets.filter((pet: any) =>
      pet.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [pets, searchQuery]);

  const toggleFollowMutation = useMutation({
    mutationFn: () => shelterService.toggleFollow(shelterId),
    onMutate: async () => {
      // 1. Cancel query đang chạy để tránh đụng độ
      await queryClient.cancelQueries({ queryKey: ['shelter-profile', shelterId] });

      const previousState = isFollowing;
      const newFollowingState = !isFollowing;

      // Cập nhật state Global (Zustand)
      toggleShelterFollow(shelterId);

      // 2. SỬA LẠI ĐÚNG QUERY KEY: Xóa bỏ debouncedSearch
      queryClient.setQueryData(['shelter-profile', shelterId], (oldData: any) => {
        if (!oldData) return oldData;
        const currentFollowers = oldData?._count?.followers || 0;
        return {
          ...oldData,
          isFollowed: newFollowingState,
          _count: {
            ...oldData._count,
            followers: newFollowingState ? currentFollowers + 1 : Math.max(0, currentFollowers - 1)
          }
        };
      });

      return { previousState };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followed-shelters'] });
      DeviceEventEmitter.emit('SHELTER_FOLLOW_TOGGLED', {
        shelterId,
        isFollowed: !isFollowing,
        source: 'SHELTER_PROFILE'
      });
    },
    onError: (err, variables, context) => {
      console.error('Lỗi khi thay đổi trạng thái theo dõi:', err);
      // Rollback Zustand
      toggleShelterFollow(shelterId);

      // SỬA LẠI ĐÚNG QUERY KEY CHO PHẦN ROLLBACK
      if (context) {
        queryClient.setQueryData(['shelter-profile', shelterId], (oldData: any) => {
          if (!oldData) return oldData;
          const currentFollowers = oldData?._count?.followers || 0;
          return {
            ...oldData,
            isFollowed: context.previousState,
            _count: {
              ...oldData._count,
              followers: context.previousState ? currentFollowers + 1 : Math.max(0, currentFollowers - 1)
            }
          };
        });
      }
    }
  });

  const blockShelterMutation = useMutation({
    mutationFn: () => {
      console.log('[BLOCK] shelterId:', shelterId);
      return shelterService.blockShelter(shelterId);
    },
    onMutate: () => setIsBlocking(true),
    onSuccess: (res) => {
      console.log('[BLOCK] Success response:', res);
      setIsBlocked(true);
      setShowBlockModal(false);

      // ✅ THÊM 2 DÒNG NÀY — đây là phần còn thiếu
      queryClient.invalidateQueries({ queryKey: ['pets-feed'] }); // Cho Home và Matching
      queryClient.invalidateQueries({ queryKey: ['shelters-nearby'] }); // Cho Home
      queryClient.invalidateQueries({ queryKey: ['pets-list'] }); // Cho màn Search Pet
      queryClient.invalidateQueries({ queryKey: ['search-shelters'] }); // Cho màn Search Shelter
      queryClient.invalidateQueries({ queryKey: ['followed-shelters'] });
      queryClient.invalidateQueries({ queryKey: ['favorite-pets'] });

      // Bắn event để Home Screen tự cập nhật UI mượt mà không bị giật (nhờ code ở Bước 1)
      DeviceEventEmitter.emit('SHELTER_BLOCKED', { shelterId });

      Toast.show({
        type: 'success',
        text1: isVi ? 'Đã chặn thành công' : 'Blocked Successfully',
        text2: isVi ? `Bạn sẽ không thấy nội dung từ ${shelterInfo?.name} nữa` : `You won't see content from ${shelterInfo?.name} again`,
        position: 'top',
        topOffset: insets.top + 10,
      });


      router.back();
    },

    onError: (err) => {
      console.log('[BLOCK] Error:', JSON.stringify(err));
    },
    onSettled: () => setIsBlocking(false),
  });


  // 2. Mutation xử lý Report Shelter
  const reportShelterMutation = useMutation({
    mutationFn: (reportData: any) => shelterService.reportShelter(shelterId, reportData),
    onSuccess: () => {
      setShowReportModal(false);
      // Không cần Toast/Alert ở đây nữa — ReportIssueModal tự hiện ReportSuccessModal
      queryClient.invalidateQueries({ queryKey: ['shelter-profile', shelterId] });
    },
    onError: (err) => {
      console.error('[REPORT] Error:', err); // chỉ log, không Alert
    }
  });



  const handleBlockShelter = () => {
    Alert.alert(
      isVi ? 'Ẩn trạm cứu hộ này?' : 'Block this shelter?',
      isVi
        ? `Bạn sẽ không còn thấy thú cưng từ "${shelterInfo?.name}" nữa. Bạn có thể bỏ ẩn trong phần Cài đặt.`
        : `You will no longer see pets from "${shelterInfo?.name}". You can unblock later in Settings.`,
      [
        { text: isVi ? 'Hủy' : 'Cancel', style: 'cancel' },
        {
          text: isVi ? 'Ẩn' : 'Block',
          style: 'destructive',
          onPress: () => blockShelterMutation.mutate()
        }
      ]
    );
  };

  const handleToggleFollow = () => {
    toggleFollowMutation.mutate();
  };

  const formatBreed = (breed: any, isVi?: boolean) => {
    const breedText = getLocalizedField(breed, isVi ? 'vi' : 'en');
    if (!breedText) return '';
    if (breedText.length <= 15) return breedText;
    const words = breedText.split(' ');

    if (words.length > 1) {
      const firstLetter = words[0][0];
      const restOfWords = words.slice(1).join(' ');
      return `${firstLetter}. ${restOfWords}`;
    }
    return `${breedText.substring(0, 15)}...`;
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

  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return t('Pending');
    return new Date(dateString).toLocaleDateString(isVi ? 'vi-VN' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };


  if (isNotFound) {
    return (
      <SafeAreaView className="flex-1 bg-[#FAFAFA] justify-center items-center">
        <MaterialCommunityIcons name="home-off" size={64} color="#E5E7EB" />
        <Text className="text-gray-800 text-lg font-bold mt-4">{t('Shelter not found')}</Text>
        <Text className="text-gray-500 text-sm mt-2 text-center px-6">
          {t('Shelter data might have been removed or the link is incorrect.')}
        </Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-6 bg-orange-100 px-6 py-3 rounded-full">
          <Text className="text-orange-600 font-bold">{t('Go back')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (loading || !shelterInfo) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#ffa053" />
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      {isSearchActive && (
        <TouchableWithoutFeedback onPress={handleOutsidePress}>
          <View
            className="absolute inset-0 z-40 bg-transparent"
          />
        </TouchableWithoutFeedback>
      )}
      <Animated.View
        style={[headerBarStyle, { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 20, paddingHorizontal: 20 }]}
      >
        <View className="flex-1 items-center">
          {/* SỬ DỤNG AnimatedAppText VÀ GIỮ NGUYÊN CLASS TỪ TAILWIND */}
          <AnimatedAppText
            style={headerTitleStyle}
            className="text-[20px] font-semibold text-black tracking-[0.5px]"
          >
            {shelterInfo?.name}
          </AnimatedAppText>
        </View>
      </Animated.View>

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
                <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, gradientStyle]}>
                  <LinearGradient
                    colors={['rgba(221, 221, 221, 0.5)', 'rgba(247, 247, 247, 0.8)', '#FFFFFF']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    locations={[0, 0.3, 1]}
                    style={{ flex: 1, borderRadius: 9999 }}
                  />
                </Animated.View>

                <AnimatedIonicons name="search" size={19} style={searchIconStyle} />

                <Animated.View style={[textInputStyle, { flexDirection: 'row', alignItems: 'center', flex: 1 }]}>
                  <TextInput
                    ref={inputRef}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder={t("Search pets...")}
                    placeholderTextColor="#8E8E93"
                    className="flex-1 text-[14px] text-black"
                    style={{ fontFamily: isVi ? 'BeVietnamPro-Regular' : 'Urbanist-Regular' }}
                  />
                </Animated.View>
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[]}
      >
        <Image
          source={{
            uri: shelterInfo?.coverUrl || shelterInfo?.avatarUrl || 'https://via.placeholder.com/400x300'
          }}
          style={{ width: width, height: SCREEN_HEIGHT * 0.22 }}
          resizeMode="cover"
        />

        <View className="bg-white rounded-t-[24px] bottom-[32px] pb-6 min-h-screen">
          <View className='flex-row items-center px-3 -top-[15px]'>
            <View className="bg-white p-1 rounded-full">
              <Image
                source={{ uri: shelterInfo?.avatarUrl || 'https://via.placeholder.com/150' }}
                className="w-[80px] h-[80px] rounded-full"
              />
            </View>
            <View className="ml-4 flex-1 justify-center mt-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-[20px] font-semibold text-black mb-2 tracking-[0.5px] flex-1 mr-2" numberOfLines={1}>
                  {shelterInfo?.name}
                </Text>

                {/* ⬇️ NÚT MORE: mở dropdown Report / Block */}
                <TouchableOpacity
                  onPress={(e) => {
                    const { pageY } = e.nativeEvent;
                    setMenuPosition({ top: pageY + 14, right: 20 });
                    setShowOptionsMenu(true);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  className="p-1 mb-2"
                >
                  <Image
                    source={require('../assets/icon/more-vertical.png')}
                    style={{ width: 16, height: 16 }}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              </View>
              <View className="flex-row items-center">
                <StatItem value={shelterInfo._count?.pets || pets.length} label={t("pets")} />
                <Text className='text-[12px] px-2 font-extrabold'>•</Text>

                <StatItem value={shelterInfo.adoptedCount || 0} label={t("adopted")} />
              </View>
            </View>
          </View>

          <View className='mx-[20px]' style={{ top: -5 }}>
            <View className="mb-3">
              <Text className="text-[#8E8E93] text-[12px] font-regular mb-1 leading-4 tracking-[0.06px]">
                {shelterInfo?.shelterType ? t(shelterInfo.shelterType) : t("Animal Shelter & Rescue")}
              </Text>
              <Text className="text-[14px] text-black font-regular leading-5 tracking-[0.06px]">
                {shelterInfo?.bio || t("Saving lives and finding forever home 🐾")}
              </Text>
              <View className="flex-row items-center mt-1">
                <Image
                  source={require('../assets/icon/link-icon.png')}
                  style={{ width: 12, height: 12 }}
                  resizeMode="cover"
                />
                <Text className="ml-1 text-[14px] text-[#E89B5A] leading-4 tracking-[0.06px]">{shelterInfo?.emailAddress || t('Not updated')}</Text>
              </View>

              <View className="flex-row items-center mt-1">
                <Image
                  source={require('../assets/icon/location-gray-icon.png')}
                  style={{ width: 7, height: 9 }}
                  resizeMode="cover"
                />
                <Text className="ml-2 text-[12px] text-[#8E8E93] flex-1 leading-4 tracking-[0.06px]">
                  {shelterInfo?.address ? formatShortAddress(shelterInfo.address) : t('Not updated')}
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
                  {isFollowing ? t('Following') : t('Follow')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab(prev => prev === 'pets' ? 'info' : 'pets')}
                className={`flex-1 py-2 rounded-full items-center justify-center ${activeTab === 'info' ? 'bg-[#E89B5A]' : 'bg-[#F6F6F6]'
                  }`}
              >
                <Text className={`font-semibold text-[14px] ${activeTab === 'info' ? 'text-white' : 'text-gray-600'
                  }`}>
                  {activeTab === 'pets' ? t('Contact') : t('View pets')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {activeTab === 'info' ? (
            <View className="px-[20px]">
              <Text className="text-[16px] font-medium text-black mb-2">{t("About Shelter")}</Text>
              <Text className="text-[14px] text-[#8E8E93] leading-5 mb-5">
                {shelterInfo?.description || t("No description provided.")}
              </Text>

              <Text className="text-[16px] font-medium text-black mb-2">{t("Contact Info")}</Text>
              <View className="gap-y-3 mb-5">
                <View className="flex-row items-center gap-x-3">
                  <Image
                    source={require('../assets/icon/message.png')}
                    style={{ width: 13, height: 13 }}
                    resizeMode="cover"
                  />
                  <Text className="text-[14px] text-[#8E8E93]">{t("Send message")}</Text>
                </View>
                <TouchableOpacity onPress={handleCall} className="flex-row items-center gap-x-3">
                  <Image
                    source={require('../assets/icon/phone-info.png')}
                    style={{ width: 13, height: 13 }}
                    resizeMode="cover"
                  />
                  <Text className="text-[14px] text-[#8E8E93]">{shelterInfo?.contactInfo || t("Not updated")}</Text>
                </TouchableOpacity>
                <View className="flex-row items-center gap-x-3">
                  <Image
                    source={require('../assets/icon/email.png')}
                    style={{ width: 13, height: 10 }}
                    resizeMode="cover"
                  />
                  <Text className="text-[14px] text-[#8E8E93]">{shelterInfo?.emailAddress || t("Not updated")}</Text>
                </View>
              </View>

              <Text className="text-[16px] font-medium text-black mb-2">{t("More Info")}</Text>
              <View className="gap-y-3">
                <View className="flex-row items-center gap-x-3">
                  <Image source={require('../assets/icon/earth.png')} style={{ width: 13, height: 13 }} resizeMode="cover" />
                  <Text className="text-[14px] text-[#8E8E93]">{t("Based in")} {t("Vietnam")}</Text>
                </View>
                <View className="flex-row items-center gap-x-3">
                  <Image source={require('../assets/icon/info.png')} style={{ width: 13, height: 13 }} resizeMode="cover" />
                  <Text className="text-[14px] text-[#8E8E93]">{t("Joined")} {formatDate(shelterInfo?.createdAt)}</Text>
                </View>

                {shelterInfo?.isVerified && (
                  <View className="flex-row items-center gap-x-3">
                    <Image source={require('../assets/icon/verified.png')} style={{ width: 13, height: 13 }} resizeMode="cover" />
                    <Text className="text-[14px] text-[#8E8E93]">{t("Verified")} {formatDate(shelterInfo?.verifiedAt)}</Text>
                  </View>
                )}
              </View>
            </View>

          ) : (

            <View
              className="flex-row flex-wrap w-full"
              style={{
                paddingHorizontal: 20,
                columnGap: 13,
                rowGap: 16,
              }}
            >
              {filteredPets.length > 0 ? (
                filteredPets.map((pet: any) => (
                  <View key={pet.id} style={{ width: COLUMN_WIDTH }}>
                    <PetCard pet={pet} formatBreed={formatBreed} t={t} isVi={isVi} />
                  </View>
                ))
              ) : (
                <View className="flex-1 items-center justify-center py-10">
                  <Text className="text-gray-500">{t("No pets found")}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </Animated.ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={isfilterVisible}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setIsFilterVisible(false)}
          className="flex-1 bg-black/50 justify-center items-center px-5"
        >
          <TouchableWithoutFeedback>
            <View className="bg-white w-full rounded-[32px] overflow-hidden max-h-[80%] shadow-2xl pt-8">

              <View className='mx-[20px]'>
                <View className="">
                  <View className="flex-row items-center justify-between">
                    <SectionLabel title={t("Pet Type")} />

                    <TouchableOpacity onPress={() => setIsFilterVisible(false)} className="p-2.5 -mt-1 -mr-1">
                      <Feather name="x" size={16} color="#111827" />
                    </TouchableOpacity>
                  </View>
                  <View className="flex-row justify-between gap-3 mt-3">
                    <FilterChip
                      label={t("All")}
                      selected={selectedType === 'all'}
                      onPress={() => setSelectedType('all')}
                      iconSource={require('../assets/icon/all-filter.png')}
                    />
                    <FilterChip
                      label={t("Cat")}
                      selected={selectedType === 'cat'}
                      onPress={() => setSelectedType('cat')}
                      iconSource={require('../assets/icon/cat-filter.png')}
                    />
                    <FilterChip
                      label={t("Dog")}
                      selected={selectedType === 'dog'}
                      onPress={() => setSelectedType('dog')}
                      iconSource={require('../assets/icon/dog-filter.png')}
                    />
                  </View>
                </View>

                <View className="mt-5">
                  <SectionLabel title={t("Gender")} optionalText={t("(Optional)")} />
                  <View className="flex-row flex-wrap justify-between gap-3 mt-3">
                    <FilterChip
                      label={t("Female")}
                      selected={selectedGender === 'female'}
                      onPress={() => setSelectedGender('female')}
                      iconSource={require('../assets/icon/female-filter.png')}
                    />
                    <FilterChip
                      label={t("Male")}
                      selected={selectedGender === 'male'}
                      onPress={() => setSelectedGender('male')}
                      iconSource={require('../assets/icon/male-filter.png')}
                    />
                  </View>
                </View>

                <View className="mt-5">
                  <SectionLabel title={t("Sterilized")} optionalText={t("(Optional)")} />
                  <View className="flex-row flex-wrap justify-between gap-3 mt-3">
                    <FilterChip
                      label={t("Yes")}
                      selected={selectedSterilized === true}
                      onPress={() => setSelectedSterilized(true)}
                    />
                    <FilterChip
                      label={t("No")}
                      selected={selectedSterilized === false}
                      onPress={() => setSelectedSterilized(false)}
                    />
                  </View>
                </View>

                <View className="mt-5">
                  <SectionLabel title={t("Age")} optionalText={t("(Optional)")} />
                  <View className="flex-row flex-wrap justify-between gap-3 mt-3">
                    <FilterChip
                      label={t("Baby")}
                      selected={selectedAge === 'baby'}
                      onPress={() => setSelectedAge('baby')}
                    />
                    <FilterChip
                      label={t("Young")}
                      selected={selectedAge === 'young'}
                      onPress={() => setSelectedAge('young')}
                    />
                    <FilterChip
                      label={t("Adult")}
                      selected={selectedAge === 'adult'}
                      onPress={() => setSelectedAge('adult')}
                    />
                    <FilterChip
                      label={t("Senior")}
                      selected={selectedAge === 'senior'}
                      onPress={() => setSelectedAge('senior')}
                    />
                  </View>
                </View>
                <View className="mt-5">
                  <SectionLabel title={t("Size")} optionalText={t("(Optional)")} />
                  <View className="flex-row flex-wrap justify-between gap-3 mt-3">
                    <FilterChip
                      label={t("Small")}
                      selected={selectedSize === 'small'}
                      onPress={() => setSelectedSize('small')}
                    />
                    <FilterChip
                      label={t("Medium")}
                      selected={selectedSize === 'medium'}
                      onPress={() => setSelectedSize('medium')}
                    />
                    <FilterChip
                      label={t("Large")}
                      selected={selectedSize === 'large'}
                      onPress={() => setSelectedSize('large')}
                    />
                  </View>
                </View>


                <View className="flex-row items-center justify-between py-6">
                  <TouchableOpacity
                    onPress={() => { }}
                    className="w-full bg-[#E89B5A] py-4 rounded-full items-center active:bg-[#D68A4A]"
                  >
                    <Text className="text-white font-semibold text-[16px]">{t("Apply")}</Text>
                  </TouchableOpacity>
                </View>
              </View>

            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
      <Modal
        visible={showOptionsMenu}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowOptionsMenu(false)}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={() => setShowOptionsMenu(false)}
        >
          <View
            className="absolute bg-white rounded-xl border border-gray-100 w-56"
            style={{
              top: menuPosition.top,
              right: menuPosition.right,
              elevation: 8,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 10,
            }}
          >
            {/* NÚT CHẶN (BLOCK) Ở TRÊN */}
            <TouchableOpacity
              className="flex-row items-center px-4 py-3"
              activeOpacity={0.6}
              onPress={() => {
                setShowOptionsMenu(false); // Đóng menu
                setShowBlockModal(true);   // Mở Modal xác nhận
              }}
            >
              <Feather name="slash" size={14} color="#374151" />
              <Text className="text-[14px] text-gray-700 ml-3 font-medium">
                {isVi ? 'Chặn' : 'Block'}
              </Text>
            </TouchableOpacity>

            {/* NÚT BÁO CÁO (REPORT) Ở DƯỚI, MÀU ĐỎ */}
            <TouchableOpacity
              className="flex-row items-center px-4 py-3 border-t border-gray-50"
              activeOpacity={0.6}
              onPress={() => {
                setShowOptionsMenu(false);
                setShowReportModal(true);
              }}
            >
              <Feather name="flag" size={14} color="#EF4444" />
              <Text className="text-[14px] text-red-600 ml-3 font-medium">
                {isVi ? 'Báo cáo' : 'Report'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      <Modal
        visible={showBlockModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowBlockModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/60 px-5">
          <View className="bg-white w-full rounded-[28px] p-7 items-center shadow-2xl">
            {/* Icon cảnh báo */}
            <View className="w-16 h-16 rounded-full bg-red-50 items-center justify-center mb-5 border border-red-100">
              <Feather name="slash" size={26} color="#EF4444" />
            </View>

            <Text className="text-[20px] font-bold text-gray-900 text-center mb-3 tracking-tight">
              {isVi ? `Chặn ${shelterInfo?.name}?` : `Block ${shelterInfo?.name}?`}
            </Text>

            <Text className="text-[15px] text-gray-500 text-center mb-8 leading-6 px-1">
              {isVi
                ? `Nếu bạn chặn, bạn sẽ không còn thấy bất kỳ bài đăng hay thú cưng nào từ ${shelterInfo?.name} nữa.`
                : `If you block, you will no longer see any posts or pets from ${shelterInfo?.name}.`}
            </Text>

            <View className="w-full flex-col gap-3.5">
              {/* Nút Xác nhận chặn */}
              <TouchableOpacity
                className={`w-full py-4 rounded-[14px] items-center shadow-sm shadow-red-200 ${blockShelterMutation.isPending ? 'bg-red-300' : 'bg-[#EF4444]'}`}
                activeOpacity={0.8}
                disabled={blockShelterMutation.isPending}
                onPress={() => {
                  // Gọi thực tế API thay vì hardcode
                  blockShelterMutation.mutate();
                }}
              >
                {blockShelterMutation.isPending ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text className="text-white font-bold text-[15px] tracking-wide">
                    {isVi ? 'Xác nhận chặn' : 'Confirm Block'}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Nút Hủy */}
              <TouchableOpacity
                className="w-full bg-gray-50 py-4 rounded-[14px] items-center border border-gray-100"
                activeOpacity={0.7}
                onPress={() => setShowBlockModal(false)}
              >
                <Text className="text-gray-600 font-bold text-[15px]">
                  {isVi ? 'Hủy bỏ' : 'Cancel'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* --- REPORT SHELTER MODAL --- */}
      <ReportIssueModal
        isVisible={showReportModal}
        onClose={() => setShowReportModal(false)}
        context="shelter"
        targetName={shelterInfo?.name}
        onSubmit={async (data: any) => {
          const { location, date, isBlockRequested, details, ...rest } = data;
          const payload = { ...rest, detail: details, isBlockRequested };
          await reportShelterMutation.mutateAsync(payload);
          if (isBlockRequested) setIsBlocked(true); // chỉ set state, KHÔNG router.back() ở đây
        }}
      />
    </View>
  );
}