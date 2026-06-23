// app/shelter-profile.tsx
import { Text } from '@/components/AppText';
import { useLanguage } from '@/contexts/LanguageContext';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { getLocalizedField } from '@/utils/localization';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, DeviceEventEmitter, Dimensions, Image, Keyboard, Linking, Modal, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
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

export default function ShelterProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const shelterId = params.id as string;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { t, language } = useLanguage();
  const isVi = language === 'vi';

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

  const [selectedGender, setSelectedGender] = useState<string | null>(null);
  const [selectedAge, setSelectedAge] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedSterilized, setSelectedSterilized] = useState<boolean | null>(null);
  const [isfilterVisible, setIsFilterVisible] = useState(false);

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
      const previousState = isFollowing;
      const newFollowingState = !isFollowing;

      toggleShelterFollow(shelterId);

      queryClient.setQueryData(['shelter-profile', shelterId, debouncedSearch], (oldData: any) => {
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
      toggleShelterFollow(shelterId);
      if (context) {
        queryClient.setQueryData(['shelter-profile', shelterId, debouncedSearch], (oldData: any) => {
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
          <Animated.Text style={headerTitleStyle} className="text-[20px] font-semibold text-black tracking-[0.5px]">
            {shelterInfo?.name}
          </Animated.Text>
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
                    style={{ fontFamily: 'Urbanist' }}
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
              <Text className="text-[20px] font-semibold text-black mb-2 tracking-[0.5px]" numberOfLines={1}>
                {shelterInfo?.name}
              </Text>
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
                {shelterInfo?.description || t("Saving lives and finding forever home 🐾")}
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
                <Text className="ml-2 text-[12px] text-[#8E8E93] flex-1 leading-4 tracking-[0.06px]">{shelterInfo?.address || t('Not updated')}</Text>
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
                  <Text className="text-[14px] text-[#8E8E93]">{t("Based in")} {shelterInfo?.address || t("Vietnam")}</Text>
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
                rowGap: 16
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
    </View>
  );
}