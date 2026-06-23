// app/pet-detail-modal.tsx
import { Text } from '@/components/AppText';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLocalizedData } from '@/hooks/useLocalizedData';
import { resolvePawHistoryItem } from '@/utils/pawHistory';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import BottomSheet, { BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Image, LayoutAnimation, Platform, TouchableOpacity, UIManager, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { petService } from '../services/petService';

const getAge = (dobString?: string, isVi?: boolean) => {
  if (!dobString) return isVi ? 'Không rõ' : 'Unknown';

  const dob = new Date(dobString);
  const diff_ms = Date.now() - dob.getTime();
  const age_dt = new Date(diff_ms);
  const years = Math.abs(age_dt.getUTCFullYear() - 1970);
  const months = age_dt.getUTCMonth();

  if (years > 0) return `${years}`;
  if (months > 0) return isVi ? `${months} tháng` : `${months} month${months > 1 ? 's' : ''}`;

  return isVi ? 'Mới sinh' : 'Newborn';
};

const formatCapitalize = (str?: string) => {
  if (!str) return 'Unknown';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

const getGenderLabel = (gender?: string, isVi?: boolean) => {
  const g = gender?.toUpperCase();
  if (isVi) {
    switch (g) {
      case 'MALE': return 'Đực';
      case 'FEMALE': return 'Cái';
      default: return 'Không rõ';
    }
  }
  switch (g) {
    case 'MALE': return 'Male';
    case 'FEMALE': return 'Female';
    default: return 'Unknown';
  }
};

export default function PetDetailModal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { t, language } = useLanguage();
  const { l } = useLocalizedData();
  const isVi = language === 'vi';

  const [showHistory, setShowHistory] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
  const [headerHeight, setHeaderHeight] = useState(100);
  const BOTTOM_BAR_HEIGHT = 100;
  const [isFavourite, setIsFavourite] = useState(false);

  const scrollY = useSharedValue(0);

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const isScrolled = scrollY.value > 20;
    return {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: withTiming(isScrolled ? 0.08 : 0, { duration: 200 }),
      shadowRadius: 4,
      elevation: withTiming(isScrolled ? 6 : 0, { duration: 200 }),
      backgroundColor: '#FFFFFF',
    };
  });

  const handleScroll = (event: any) => {
    scrollY.value = event.nativeEvent.contentOffset.y;
  };

  const animatedPosition = useSharedValue(SCREEN_HEIGHT);

  const animatedImageStyle = useAnimatedStyle(() => {
    const overlapHeight = SCREEN_HEIGHT * 0.03;
    const minHeight = SCREEN_HEIGHT * 0.48;
    return {
      height: Math.max(animatedPosition.value + overlapHeight, minHeight),
    };
  });

  const getHistoryUIConfig = (type: string) => {
    switch (type) {
      case 'BIRTH':
        return { icon: 'birthday-cake', color: '#F2A465', bgColor: '#FFF4EC' };
      case 'CREATED':
        return { icon: 'paw', color: '#885BF2', bgColor: '#EAE7FB' };
      case 'QR_LINKED':
        return { icon: 'qrcode', color: '#5A90DA', bgColor: '#E8F1FF' };
      case 'TRANSFER':
        return { icon: 'home', color: '#77C582', bgColor: '#EBFFE2' };
      case 'VACCINE':
        return { icon: 'syringe', color: '#EF4444', bgColor: '#FEE2E2' };
      default:
        return { icon: 'history', color: '#8E8E93', bgColor: '#F5F5F5' };
    }
  };

  const { data: pet, isLoading } = useQuery({
    queryKey: ['pet-detail', params.id],
    queryFn: async () => {
      const res = await petService.getPetById(params.id as string);
      return res.data || res;
    }
  });

  const displayImages = useMemo(() => {
    return pet?.images?.length > 0
      ? pet.images.map((img: any) => img.url)
      : [pet?.avatarUrl || 'https://images.unsplash.com/photo-1600804340584-c7db2eacf0bf?q=80&w=800&auto=format&fit=crop'];
  }, [pet]);

  const REQUIRED_TOP_INSET = insets.top + 44 + 21;
  const snapPoints = useMemo(() => {
    const highestSnapPoint = SCREEN_HEIGHT - REQUIRED_TOP_INSET;
    const lowestSnapPoint = headerHeight + BOTTOM_BAR_HEIGHT;
    const middleSnapPoint = SCREEN_HEIGHT / 2;
    return [lowestSnapPoint, middleSnapPoint, highestSnapPoint];
  }, [headerHeight, SCREEN_HEIGHT, insets.top]);

  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  const toggleHistory = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowHistory(!showHistory);
  };

  useEffect(() => {
    if (pet) {
      setIsFavourite(!!pet.isFavorited);
    }
  }, [pet]);

  const toggleFavoriteMutation = useMutation({
    mutationFn: async (currentlyFavorited: boolean) => {
      if (currentlyFavorited) {
        return petService.unfavoritePet(pet.id);
      }
      return petService.favoritePet(pet.id);
    },
    onSuccess: (_, currentlyFavorited) => {
      queryClient.invalidateQueries({ queryKey: ['favorite-pets'] });
      Toast.show({
        type: 'custom_badge',
        props: {
          petName: pet.name || 'This pet',
          actionText: currentlyFavorited ? (isVi ? ' đã xoá khỏi danh sách yêu thích' : ' has been removed from Favourite') : (isVi ? ' đã thêm vào danh sách yêu thích' : ' has been added to Favourite')
        },
        visibilityTime: 2500, autoHide: true,
      });
    },
    onError: () => {
      setIsFavourite(prev => !prev);
      Toast.show({
        type: 'error',
        text1: isVi ? 'Lỗi!' : 'Oops!',
        text2: isVi ? 'Đã có lỗi xảy ra. Vui lòng thử lại.' : 'Something went wrong. Please try again.',
        visibilityTime: 2500, autoHide: true,
      });
    }
  });

  const handleFavourite = () => {
    const previousState = isFavourite;
    setIsFavourite(!previousState);
    toggleFavoriteMutation.mutate(previousState);
  };

  if (isLoading || !pet) {
    return <View className="flex-1 bg-black justify-center items-center"><ActivityIndicator size="large" color="#e9a353" /></View>;
  }

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />

      <TouchableOpacity
        onPress={() => router.back()}
        activeOpacity={0.7}
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 5,
          elevation: 3,
          top: insets.top + 10, zIndex: 50
        }}
        className="absolute left-5 w-10 h-10 rounded-full items-center justify-center"
      >
        <View className="overflow-hidden rounded-full w-[36px] h-[36px] items-center justify-center"
          style={{
            borderWidth: 0.5,
            borderTopColor: 'white',
            borderLeftColor: 'white',
            borderBottomColor: 'transparent',
            borderRightColor: 'transparent',
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

      <Animated.View style={[{ width: SCREEN_WIDTH }, animatedImageStyle]}>
        <FlatList
          data={displayImages}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setActiveIndex(index);
          }}
          renderItem={({ item }) => (
            <Image source={{ uri: item }} style={{ width: SCREEN_WIDTH, height: '100%' }} resizeMode="cover" />
          )}
        />
        {displayImages.length > 1 && (
          <View style={{ position: 'absolute', bottom: 40, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, zIndex: 10 }}>
            {displayImages.map((_: any, index: any) => (
              <View key={index} className={`h-2 rounded-full transition-all ${activeIndex === index ? 'w-6 bg-white' : 'w-2 bg-white/60'}`} />
            ))}
          </View>
        )}
      </Animated.View>

      <BottomSheet
        index={1}
        snapPoints={snapPoints}
        enableOverDrag={false}
        animatedPosition={animatedPosition}
        topInset={REQUIRED_TOP_INSET}
        backgroundStyle={{ backgroundColor: 'white', borderRadius: 30 }}
        handleIndicatorStyle={{ backgroundColor: '#E5E5EA', width: 48, height: 6 }}
        style={{ shadowColor: '#000000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 10 }}
      >
        <BottomSheetView className="pt-[12px] bg-white z-10" onLayout={(event) => {
          const { height } = event.nativeEvent.layout;
          if (height > 0) setHeaderHeight(height);
        }}>
          <Animated.View style={headerAnimatedStyle}>
            <View className="flex-1 justify-between items-start px-[25px] pb-[16px]">
              <View className="flex-row items-baseline">
                <Text className="text-[24px] font-semibold text-black">{pet.name}</Text>
                <Text className="text-[14px] text-[#8E8E93] ml-2 font-regular mb-[2px]">({l(pet.breed)})</Text>
              </View>
              <View className="flex-row items-center mt-1.5">
                <Image source={require('../assets/icon/location_solid.png')} style={{ width: 16, height: 16 }} resizeMode="cover" />
                <Text className="text-[12px] text-[#8E8E93] ml-1.5 font-regular" numberOfLines={1} ellipsizeMode="tail" style={{ maxWidth: '55%' }}>
                  {pet?.shelter?.address || (isVi ? 'Chưa cập nhật địa chỉ' : 'Address not available')}
                </Text>

                <Image source={require('../assets/icon/idcardicon.png')} style={{ width: 16, height: 16, marginLeft: 10 }} resizeMode="contain" />
                <Text className="text-[12px] text-[#8E8E93] ml-1.5 font-regular" numberOfLines={1}>
                  {pet?.idSetByShelter || '—'}
                </Text>
              </View>
            </View>
          </Animated.View>
        </BottomSheetView>

        <BottomSheetScrollView showsVerticalScrollIndicator={false} onScroll={handleScroll} contentContainerStyle={{ paddingBottom: insets.bottom + 100, paddingTop: 70 }}>
          <View className="bg-white px-[25px]">
            <View className="flex-row justify-between mt-6 gap-[10px]">
              <View className={`flex-1 ${pet?.gender?.toUpperCase() === 'FEMALE' ? 'bg-[#FAE8ED]' : 'bg-[#EAF4FB]'} py-[12px] rounded-[16px] items-center`}>
                <Text className="text-[#8E8E93] text-[12px] font-regular mb-1">{isVi ? 'Giới tính' : 'Gender'}</Text>
                <Text className="text-black text-[14px] font-semibold">{getGenderLabel(pet?.gender, isVi)}</Text>
              </View>

              <View className="flex-1 bg-[#FCF8D6] py-[12px] rounded-[16px] items-center">
                <Text className="text-[#8E8E93] text-[12px] font-regular mb-1">{isVi ? 'Tuổi' : 'Age'}</Text>
                <Text className="text-black text-[14px] font-semibold">{getAge(pet?.dob, isVi)}</Text>
              </View>

              <View className="flex-1 bg-[#E8F9E6] py-[12px] rounded-[16px] items-center">
                <Text className="text-[#8E8E93] text-[12px] font-regular mb-1">{isVi ? 'Cân nặng' : 'Weight'}</Text>
                <Text className="text-black text-[14px] font-semibold">
                  {pet?.weight ? `${pet.weight} kg` : (pet?.size ? l(pet.size) || formatCapitalize(pet.size) : 'N/A')}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center my-6">
              <Image source={{ uri: pet.shelter?.avatarUrl || 'https://cdn-icons-png.flaticon.com/512/3592/3592182.png' }} className="w-[45px] h-[45px] rounded-full border border-gray-200 overflow-hidden items-center justify-center bg-white shadow-sm shadow-gray-100" />
              <View className="flex-1 mr-2 ml-3">
                <Text className="text-[14px] font-medium text-black mb-[6px]" numberOfLines={1}>{pet?.shelter?.name || 'Pawlife Shelter'}</Text>
                <Text className="text-[12px] text-[#8E8E93]" numberOfLines={1}>
                  {pet?.shelter?.shelterType ? t(pet.shelter.shelterType) : (isVi ? 'Trạm cứu hộ động vật' : 'Animal Shelter & Rescue')}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <TouchableOpacity activeOpacity={0.7} className="w-[36px] h-[36px] items-center justify-center" onPress={() => router.push({ pathname: '/shelter-profile', params: { id: pet?.shelter?.id } })}>
                  <Feather name="chevron-right" size={18} color="#8E8E93" />
                </TouchableOpacity>
              </View>
            </View>

            <View>
              <Text className="text-[16px] font-medium text-black mb-2">{isVi ? `Về ${pet.name}` : `About ${pet.name}`}</Text>
              <Text className="text-[14px] text-[#8E8E93] leading-[20px] font-regular tracking-[0.06px]">
                {l(pet?.description) || (isVi ? "Chưa có thông tin mô tả chi tiết cho bé." : "There is no description available for this pet yet.")}
              </Text>

              {(pet?.traitsList?.length > 0 || pet?.traits?.length > 0) && (
                <View className="flex-row flex-wrap gap-2 mt-[12px]">
                  {(pet?.traitsList || pet?.traits).map((traitItem: any, index: number) => {
                    const rawName = typeof traitItem === 'string' ? traitItem : traitItem?.name;
                    const traitName = l(rawName) || rawName;

                    if (!traitName) return null;

                    const colorStyles = [
                      { bg: 'bg-[#FFF4E8]', text: 'text-[#F3B27B]', border: 'border-[#E8A53C]/25' },
                      { bg: 'bg-[#EBF4FE]', text: 'text-[#88B2F3]', border: 'border-[#5A90DA]/25' },
                      { bg: 'bg-[#EAF8EF]', text: 'text-[#8FD49D]', border: 'border-[#83DA5A]/25' },
                    ];
                    const style = colorStyles[index % colorStyles.length];

                    return (
                      <View key={index} className={`${style.bg} ${style.border} border px-3.5 py-1 rounded-full`}>
                        <Text className={`${style.text} text-[12px] font-medium`}>{traitName}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <View className="mt-6">
              <Text className="text-[16px] font-medium text-black mb-3">
                {isVi ? `Tính cách của ${pet.name}` : `${pet.name}'s Behavior`}
              </Text>

              {/* Sử dụng dấu check truthy thay vì .length > 0 */}
              {(pet?.goodWith || pet?.badWith) ? (
                <View>
                  {pet?.goodWith && (
                    <View className="flex-row items-start">
                      <View className="flex-row items-center mr-1 mt-[2px]">
                        <Image source={require('../assets/icon/Check.png')} style={{ width: 12, height: 12 }} resizeMode="cover" />
                        <Text className="ml-1.5 text-[14px] text-[#77C852] font-medium">{isVi ? 'Hợp với:' : 'Good with:'}</Text>
                      </View>
                      {/* Vì BE đã trả về {vi: "...", en: "..."} nên chỉ cần l() là mở được */}
                      <Text className="flex-1 text-[14px] text-[#8E8E93] leading-[22px]">
                        {l(pet.goodWith)}
                      </Text>
                    </View>
                  )}

                  {pet?.badWith && (
                    <View className="flex-row items-start mt-2">
                      <View className="flex-row items-center mr-1 mt-[2px]">
                        <Image source={require('../assets/icon/X.png')} style={{ width: 12, height: 12 }} resizeMode="cover" />
                        <Text className="ml-1.5 text-[14px] text-[#FE7D66] font-medium">{isVi ? 'Không hợp với:' : 'Not suitable:'}</Text>
                      </View>
                      <Text className="flex-1 text-[14px] text-[#8E8E93] leading-[22px]">
                        {l(pet.badWith)}
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <Text className="text-[14px] text-[#8E8E93] italic">
                  {isVi ? 'Thông tin hành vi chưa được cập nhật.' : 'Behavioral details have not been updated.'}
                </Text>
              )}
            </View>

            <View className="mt-6 mb-6">
              <Text className="text-[16px] font-medium text-black mb-2">{isVi ? 'Ngôi nhà lý tưởng' : 'Ideal Home'}</Text>
              <Text className="text-[14px] text-[#8E8E93] leading-[22px]">
                {l(pet?.idealHome) || (isVi ? "Trạm cứu hộ chưa thiết lập tiêu chí nhà ở cho bé. Hãy liên hệ trực tiếp để biết thêm chi tiết." : "The shelter hasn't specified the ideal home conditions for this pet yet. Contact them for more details.")}
              </Text>
            </View>

            <View className="mb-10">
              <View className="flex-row justify-between items-center mb-5">
                <Text className="text-[16px] font-medium text-black">{isVi ? 'Lịch sử hoạt động' : 'Paw History'}</Text>
                <TouchableOpacity onPress={toggleHistory} activeOpacity={0.6} className="flex-row items-center px-3 py-1.5 rounded-full">
                  <Text className="text-[13px] text-[#F2A465] font-medium mr-1">
                    {showHistory ? (isVi ? 'Ẩn' : 'Hide') : (isVi ? 'Xem' : 'View')}
                  </Text>
                  <Feather name={showHistory ? "chevron-up" : "chevron-down"} size={16} color="#F2A465" />
                </TouchableOpacity>
              </View>

              {showHistory && pet?.pawHistory && (
                <View className="p-[20px] border border-[#E5E5EA] rounded-[20px] bg-white">
                  {pet.pawHistory.map((item: any, index: number) => {
                    const isLastItem = index === pet.pawHistory.length - 1;
                    const uiConfig = getHistoryUIConfig(item.type);
                    const formattedDate = new Date(item.date).toLocaleDateString(isVi ? 'vi-VN' : 'en-GB');

                    return (
                      <View key={item.id} className="flex-row">
                        {(() => {
                          const { title: resolvedTitle, description: resolvedDesc } = resolvePawHistoryItem(item, t, l, language);
                          return (
                            <>
                              <View className="items-center mr-4 w-[32px]">
                                <View className="w-[32px] h-[32px] rounded-full items-center justify-center z-10" style={{ backgroundColor: uiConfig.bgColor }}>
                                  <FontAwesome5 name={uiConfig.icon} size={13} color={uiConfig.color} />
                                </View>
                                {!isLastItem && <View className="w-[2px] flex-1 my-1" style={{ backgroundColor: uiConfig.color }} />}
                              </View>
                              <View className={`flex-1 pt-1 ${!isLastItem ? 'pb-6' : ''}`}>
                                <View className="flex-row justify-between items-start gap-2">
                                  {/* Thêm flex-1 để title tự động bẻ dòng, không đẩy date ra ngoài */}
                                  <Text className="flex-1 text-[16px] font-medium text-black">
                                    {resolvePawHistoryItem(item, t, l, language).title}
                                  </Text>

                                  {/* Có thể thêm mt-[2px] nếu date bị lệch so với title do line-height */}
                                  <Text className="text-[13px] text-[#8E8E93] font-regular mt-[2px]">
                                    {formattedDate}
                                  </Text>
                                </View>
                                {/* Chuyển từ t() sang l() để đọc JSON */}
                                <Text className="text-[13px] text-[#8E8E93] mt-1 leading-[18px]">{resolvePawHistoryItem(item, t, l, language).description}</Text>
                              </View>
                            </>
                          );
                        })()}
                      </View>
                    );
                  })}

                  {pet.pawHistory.length === 0 && (
                    <Text className="text-center text-gray-400 py-4 font-regular text-[13px]">
                      {isVi ? 'Chưa có lịch sử hoạt động.' : 'No history available yet.'}
                    </Text>
                  )}

                  <View className='flex-row py-[8px] items-center justify-center gap-2 mt-4 bg-[#F5F5F5] rounded-[8px]'>
                    <Image source={require('../assets/icon/lock.png')} style={{ width: 12, height: 12 }} resizeMode="cover" />
                    <Text className='font-regular text-[12px] text-[#8E8E93]'>
                      {isVi ? 'Dòng thời gian này được tạo tự động và không thể chỉnh sửa.' : 'This timeline is auto-generated and append-only.'}
                    </Text>
                  </View>
                </View>
              )}
            </View>

          </View>
        </BottomSheetScrollView>
      </BottomSheet>

      <View style={{ paddingBottom: 21 }} className="absolute bottom-0 w-full px-[25px] pt-4 bg-white flex-row items-center gap-4">
        <TouchableOpacity
          className={`w-[55px] h-[55px] rounded-full border-2 items-center justify-center bg-white ${isFavourite ? "border-[#E89B5A]/50" : "border-[#E5E5EA]"}`}
          onPress={handleFavourite}
          style={isFavourite ? { shadowColor: '#E89B5A', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, elevation: 5 } : {}}
        >
          <Image source={isFavourite ? require('../assets/icon/heart-filled-pawdoption.png') : require('../assets/icon/heart-pawdoption.png')} style={{ width: 27, height: 27 }} resizeMode="cover" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push({ pathname: '/adoption-form', params: { id: pet.id } })} className="flex-1 bg-[#F2A465] h-[56px] rounded-full items-center justify-center shadow-sm">
          <Text className="text-white text-[16px] font-bold">{isVi ? 'Đăng ký nhận nuôi' : 'Apply to Adopt'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}