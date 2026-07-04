// app/pet-detail-modal.tsx
import { Text } from '@/components/AppText';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLocalizedData } from '@/hooks/useLocalizedData';
import { Feather } from '@expo/vector-icons';
import BottomSheet, { BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Image, ImageSourcePropType, LayoutAnimation, Modal, Platform, TouchableOpacity, UIManager, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import ReportIssueModal from '../components/ReportIssueModal'; // ⬅️ THÊM MỚI
import { ADOPTION_REQUIREMENT_ICONS, DEFAULT_REQUIREMENT_ICON } from '../constants/adoptionRequirementIcons';
import { petService } from '../services/petService';
import { shelterService } from '../services/shelterService';

type PawHistoryType =
  | 'CREATED' | 'BIRTH' | 'QR_LINKED' | 'TRANSFER'
  | 'VACCINE' | 'DENTAL_CARE' | 'ANNUAL_CHECKUP'
  | 'UNDER_SHELTER_CARE' | 'WAS_UNDER_SHELTER_CARE'
  | 'CURRENT_OWNER' | 'PREVIOUS_OWNER';

type HistoryUIConfig = {
  icon: ImageSourcePropType;
  iconBgColor: string;
  lineColor: string;
};

const PAW_HISTORY_UI_CONFIG: Record<PawHistoryType, HistoryUIConfig> = {
  DENTAL_CARE: {
    icon: require('../assets/icon/teeth-icon.png'),
    iconBgColor: '#E8FFD8',
    lineColor: '#D5F5C6',
  },
  ANNUAL_CHECKUP: {
    icon: require('../assets/icon/anual-icon.png'),
    iconBgColor: '#E8FFD8',
    lineColor: '#D5F5C6',
  },
  UNDER_SHELTER_CARE: {
    icon: require('../assets/icon/home-heart.png'),
    iconBgColor: '#FFE4F0',
    lineColor: '#F8BBD0',
  },
  WAS_UNDER_SHELTER_CARE: {
    icon: require('../assets/icon/home-heart-2.png'),
    iconBgColor: '#FFE4F0',
    lineColor: '#F8BBD0',
  },
  CURRENT_OWNER: {
    icon: require('../assets/icon/owner.png'),
    iconBgColor: '#FFE9B8',
    lineColor: '#FFD88A',
  },
  PREVIOUS_OWNER: {
    icon: require('../assets/icon/owner-2.png'),
    iconBgColor: '#FFE9B8',
    lineColor: '#FFD88A',
  },
  VACCINE: {
    icon: require('../assets/icon/vaccine.png'),
    iconBgColor: '#E3F0FF',
    lineColor: '#BFD9FF',
  },
  QR_LINKED: {
    icon: require('../assets/icon/qr-icon.png'),
    iconBgColor: '#EAE7FF',
    lineColor: '#D3CCFF',
  },
  BIRTH: {
    icon: require('../assets/icon/birth-date.png'),
    iconBgColor: '#DFFFF7',
    lineColor: '#BDF5EA',
  },
  CREATED: {
    icon: require('../assets/icon/qr-icon.png'), // dùng tạm, đổi sang icon phù hợp
    iconBgColor: '#EAE7FF',
    lineColor: '#D3CCFF',
  },
  TRANSFER: {
    icon: require('../assets/icon/home-heart.png'),
    iconBgColor: '#E8FFD8',
    lineColor: '#D5F5C6',
  },
};

const DEFAULT_HISTORY_UI: HistoryUIConfig = {
  icon: require('../assets/icon/birth-date.png'),
  iconBgColor: '#F5F5F5',
  lineColor: '#E0E0E0',
};

const resolvePawHistoryText = (
  item: any,
  isVi: boolean,
): { title: string; description: string } => {
  const { type, i18n, title: fallbackTitle, description: fallbackDesc } = item;

  // Map i18n key → bilingual text
  const I18N_MAP: Record<string, { vi: string; en: string }> = {
    'pawHistory.current_owner_title': { vi: 'Chủ sở hữu hiện tại', en: 'Current Owner' },
    'pawHistory.current_owner_body': { vi: 'Quyền sở hữu đã được chuyển giao cho {name}', en: 'Ownership transferred to {name}' },
    'pawHistory.previous_owner_title': { vi: 'Chủ trước', en: 'Previous Owner' },
    'pawHistory.previous_owner_body': { vi: 'Từng được chăm sóc bởi {name}', en: 'Previously cared for by {name}' },
    'pawHistory.under_shelter_title': { vi: 'Đang ở trạm cứu hộ', en: "Under Shelter's Care" },
    'pawHistory.under_shelter_body': { vi: 'Hiện đang được chăm sóc tại {shelterName}', en: 'Currently under the care of {shelterName}' },
    'pawHistory.was_under_shelter_title': { vi: 'Từng ở trạm cứu hộ', en: "Was Under Shelter's Care" },
    'pawHistory.was_under_shelter_body': { vi: 'Trước đây được chăm sóc tại {shelterName}', en: 'Previously cared by {shelterName}' },
    'pawHistory.transfer_title': { vi: 'Chuyển giao quyền sở hữu', en: 'Ownership Transferred' },
    'pawHistory.transfer_body': { vi: 'Đã chuyển giao cho {receiverName}', en: 'Transferred to {receiverName}' },
    'pawHistory.vaccine_title': { vi: '{recordNameVi}', en: '{recordNameEn}' },
    'pawHistory.vaccine_body': { vi: 'Đã hoàn thành mũi tiêm', en: 'Vaccination completed' },
    'pawHistory.dental_title': { vi: 'Khám răng miệng', en: 'Dental Care' },
    'pawHistory.dental_body': { vi: 'Đã hoàn thành khám tại {clinicName}', en: 'Teeth cleaning completed at {clinicName}' },
    'pawHistory.checkup_title': { vi: 'Khám tổng quát định kỳ', en: 'Annual Checkup' },
    'pawHistory.checkup_body': { vi: 'Đã hoàn thành khám tại {clinicName}', en: 'Checkup completed at {clinicName}' },
    'pawHistory.qr_registered_title': { vi: 'Kích hoạt thẻ QR PawLife', en: 'QR Tag Registered' },
    'pawHistory.qr_registered_body': { vi: 'Thẻ đã được kích hoạt và sẵn sàng sử dụng', en: 'PawLife QR tag is now active and ready to use' },
    'pawHistory.qr_replaced_title': { vi: 'Thay thẻ QR PawLife', en: 'QR Tag Replaced' },
    'pawHistory.qr_replaced_body': { vi: 'Thẻ QR cũ đã được thay thế', en: 'Old QR tag has been replaced' },
    'pawHistory.birth_title': { vi: 'Ngày sinh', en: 'Date of Birth' },
    'pawHistory.birth_body': { vi: 'Mừng ngày {petName} chào đời', en: 'Celebrate {petName} was born' },
    'pawHistory.joined_title': { vi: 'Gia nhập PawLife', en: 'Joined PawLife' },
    'pawHistory.joined_body': { vi: 'Hồ sơ của {petName} được tạo trên hệ thống', en: 'Profile for {petName} was created' },
  };

  const interpolate = (template: string, params: Record<string, any> = {}) =>
    template.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? `{${key}}`);

  if (i18n?.titleKey) {
    const titleTpl = I18N_MAP[i18n.titleKey];
    const bodyTpl = I18N_MAP[i18n.bodyKey];
    return {
      title: titleTpl ? interpolate(isVi ? titleTpl.vi : titleTpl.en, i18n.params) : fallbackTitle,
      description: bodyTpl ? interpolate(isVi ? bodyTpl.vi : bodyTpl.en, i18n.params) : fallbackDesc,
    };
  }

  return { title: fallbackTitle, description: fallbackDesc };
};

const getAge = (pet?: any, isVi?: boolean) => {
  if (pet?.dob) {
    const dob = new Date(pet.dob);
    const today = new Date();
    let years = today.getFullYear() - dob.getFullYear();
    let months = today.getMonth() - dob.getMonth();

    if (months < 0 || (months === 0 && today.getDate() < dob.getDate())) {
      years--;
      months += 12;
    }

    if (years > 0) return isVi ? `${years} tuổi` : `${years} year${years > 1 ? 's' : ''}`;
    if (months > 0) return isVi ? `${months} tháng` : `${months} month${months > 1 ? 's' : ''}`;

    return isVi ? 'Mới sinh' : 'Newborn';
  }

  // Phòng hờ trường hợp Backend không trả về dob mà trả về age
  if (pet?.age) {
    return isVi ? `${pet.age} tuổi` : `${pet.age} years`;
  }

  return isVi ? 'Không rõ' : 'Unknown';
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
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 25 });
  const [showReportModal, setShowReportModal] = useState(false);
  const [showHideModal, setShowHideModal] = useState(false);
  const [showBlockShelterModal, setShowBlockShelterModal] = useState(false);
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

  type BilingualText = {
    vi: string;
    en: string;
  };
  type TimelineItem = {
    id: string;
    title: BilingualText;
    description: BilingualText;
    date: string;
    icon: ImageSourcePropType;
    iconBgColor: string;
    lineColor: string;
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
  // 1. Mutation Ẩn thú cưng
  const hidePetMutation = useMutation({
    mutationFn: () => {
      if (!pet?.id) throw new Error("Pet ID missing");
      return petService.hidePet(pet.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      setShowHideModal(false);
      Toast.show({
        type: 'success',
        text1: isVi ? 'Đã ẩn thú cưng' : 'Pet Hidden',
      });
      router.back();
    },
    onError: (error) => {
      console.error("Hide Pet Error:", error); // 👈 BẮT BUỘC LOG LỖI RA CONSOLE ĐỂ DEBUG
      setShowHideModal(false);
      Toast.show({
        type: 'error',
        text1: isVi ? 'Có lỗi xảy ra' : 'An error occurred',
        text2: isVi ? 'Không thể ẩn lúc này.' : 'Cannot hide right now.',
      });
    }
  });

  // 2. Mutation Chặn Shelter
  const blockShelterMutation = useMutation({
    mutationFn: () => shelterService.blockShelter(pet.shelter.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      setShowBlockShelterModal(false);
      Toast.show({
        type: 'success',
        text1: isVi ? 'Đã chặn trạm cứu hộ' : 'Shelter Blocked',
        text2: isVi ? `Đã chặn ${pet.shelter.name}` : `Blocked ${pet.shelter.name}`,
      });
      router.back();
    },
    onError: () => {
      setShowBlockShelterModal(false);
      Toast.show({
        type: 'error',
        text1: isVi ? 'Có lỗi xảy ra' : 'An error occurred',
        text2: isVi ? 'Không thể chặn trạm lúc này.' : 'Cannot block shelter right now.',
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
              <View className="flex-row items-center justify-between w-full">
                <View className="flex-row items-baseline flex-1 mr-2">
                  <Text className="text-[24px] font-semibold text-black" numberOfLines={1}>{pet.name}</Text>
                  <Text className="text-[14px] text-[#8E8E93] ml-2 font-regular mb-[2px]" numberOfLines={1}>({l(pet.breed)})</Text>
                </View>

                {/* ⬇️ NÚT MORE: mở dropdown View Shelter / Report */}
                <TouchableOpacity
                  onPress={(e) => {
                    const { pageY } = e.nativeEvent;
                    setMenuPosition({ top: pageY + 14, right: 25 });
                    setShowOptionsMenu(true);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  className="p-1"
                >
                  <Image
                    source={require('../assets/icon/more-vertical.png')}
                    style={{ width: 16, height: 16 }}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
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
                <Text className="text-black text-[14px] font-semibold">{getAge(pet, isVi)}</Text>
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

                    // Mảng cấu hình màu (Mỗi item là 1 nhóm chứa 2 option màu)
                    const colorGroups = [
                      [ // Nhóm 1: Cam (Cũ) / Hồng (Mới)
                        { bg: 'bg-[#FFF4E8]', text: 'text-[#F3B27B]', border: 'border-[#E8A53C]/25' },
                        { bg: 'bg-[#FFEFF6]', text: 'text-[#F40C6D]', border: 'border-[#F40C6D]/25' }
                      ],
                      [ // Nhóm 2: Xanh dương (Cũ) / Tím (Mới)
                        { bg: 'bg-[#EBF4FE]', text: 'text-[#88B2F3]', border: 'border-[#5A90DA]/25' },
                        { bg: 'bg-[#FDF1FF]', text: 'text-[#C75ADA]', border: 'border-[#C75ADA]/25' }
                      ],
                      [ // Nhóm 3: Xanh lá (Cũ) / Xanh ngọc (Mới)
                        { bg: 'bg-[#EAF8EF]', text: 'text-[#8FD49D]', border: 'border-[#83DA5A]/25' },
                        { bg: 'bg-[#E7FFF9]', text: 'text-[#1DB08E]', border: 'border-[#38DFB8]/25' }
                      ],
                    ];

                    // Hàm Hash để tạo random cố định dựa trên tên trait
                    const getStableRandomVariant = (str: string) => {
                      if (!str || typeof str !== 'string') return 0;
                      let hash = 0;
                      for (let i = 0; i < str.length; i++) {
                        hash = str.charCodeAt(i) + ((hash << 5) - hash);
                      }
                      return Math.abs(hash) % 2; // Trả về 0 hoặc 1
                    };

                    const groupIndex = index % colorGroups.length;
                    const variantIndex = getStableRandomVariant(traitName);
                    const style = colorGroups[groupIndex][variantIndex];

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
                        <Text className="ml-1.5 text-[14px] text-[#77C852] font-medium">{isVi ? 'Thân thiện:' : 'Good with:'}</Text>
                      </View>
                      <Text className="flex-1 text-[14px] text-[#8E8E93] leading-[22px]">
                        {Array.isArray(pet.goodWith)
                          ? pet.goodWith.map((item: any) => l(item) || item).filter(Boolean).join(', ')
                          : l(pet.goodWith)}
                      </Text>
                    </View>
                  )}

                  {pet?.badWith && (
                    <View className="flex-row items-start">
                      <View className="flex-row items-center mr-1 mt-[2px]">
                        <Image source={require('../assets/icon/X.png')} style={{ width: 12, height: 12 }} resizeMode="cover" />
                        <Text className="ml-1.5 text-[14px] text-[#FE7D66] font-medium">{isVi ? 'Nên cân nhắc:' : 'Not suitable:'}</Text>
                      </View>
                      <Text className="flex-1 text-[14px] text-[#8E8E93] leading-[22px]">
                        {Array.isArray(pet.badWith)
                          ? pet.badWith.map((item: any) => l(item) || item).filter(Boolean).join(', ')
                          : l(pet.badWith)}
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

            <View className="mt-6">
              <Text className="text-[16px] font-medium text-black mb-4">
                {isVi ? 'Chăm sóc sức khỏe' : 'Health Care'}
              </Text>

              {/* DYNAMIC HEALTH CARE SECTION BẮT ĐẦU */}
              {(() => {
                // 1. Phân loại thú cưng
                const speciesStr = JSON.stringify(pet?.species || {}).toLowerCase();
                const isDog = speciesStr.includes('dog') || speciesStr.includes('chó') || pet?.species === 'Dog';

                // 2. Lấy danh sách vaccine hiện có
                const vaccinations = Array.isArray(pet?.medicalRecords)
                  ? pet.medicalRecords.filter((r: any) => r.type === 'VACCINATION' || r.type === 'vaccination')
                  : [];

                // Đếm mũi Dại
                const rabiesCount = vaccinations.filter((r: any) => {
                  if (r.vaccineCategory === 'RABIES') return true;
                  const name = JSON.stringify(r.recordName || {}).toLowerCase();
                  return name.includes('dại') || name.includes('rabies');
                }).length;

                // Đếm mũi Lõi
                const coreCount = vaccinations.filter((r: any) => {
                  if (r.vaccineCategory === 'CORE') return true;
                  const name = JSON.stringify(r.recordName || {}).toLowerCase();
                  if (isDog) return name.includes('5 bệnh') || name.includes('7 bệnh') || name.includes('dhpp') || name.includes('in-1');
                  return name.includes('3 bệnh') || name.includes('fvrcp') || name.includes('in-1');
                }).length;

                // 3. Tính toán tổng số mũi còn thiếu
                const missingRabies = Math.max(0, 1 - rabiesCount);
                const missingCore = Math.max(0, 3 - coreCount);
                const totalMissing = missingRabies + missingCore;

                const isFullyVaccinated = pet?.isVaccinated || totalMissing === 0;

                // 4. Giữ nguyên format text gốc của bạn (Missing + số lượng)
                const vaccineText = isFullyVaccinated
                  ? (isVi ? 'Đầy đủ' : 'Fully vaccinated')
                  : (isVi ? `Thiếu ${totalMissing}` : `Missing ${totalMissing}`);

                const spayedText = pet?.isSpayedNeutered
                  ? (isVi ? 'Đã triệt sản' : 'Neutered')
                  : (isVi ? 'Chưa triệt sản' : 'Intact');

                return (
                  <View className="flex-row gap-2 w-full mb-6">
                    {/* VACCINATION CARD */}
                    <View className="flex-1 flex-row rounded-[44px] bg-[#F7F7F7] h-[50px] items-center px-[5px]">
                      <View className="bg-white w-[40px] h-[40px] items-center justify-center rounded-full">
                        <Image
                          source={isFullyVaccinated ? require('../assets/icon/fully-icon.png') : require('../assets/icon/missing-icon.png')}
                          style={{ width: 20, height: 20 }}
                          resizeMode="cover"
                        />
                      </View>
                      <View className="ml-[5px] flex-1">
                        <Text className="font-regular text-[12px] text-[#8E8E93]" numberOfLines={1}>
                          {isVi ? 'Tiêm chủng' : 'Vaccination'}
                        </Text>
                        <Text className="font-medium text-[14px] text-black" numberOfLines={1}>
                          {vaccineText}
                        </Text>
                      </View>
                    </View>

                    {/* SPAYED/NEUTERED CARD */}
                    <View className="flex-1 flex-row rounded-[44px] bg-[#F7F7F7] h-[50px] items-center px-[5px]">
                      <View className="bg-white w-[40px] h-[40px] items-center justify-center rounded-full">
                        <Image
                          source={pet?.isSpayedNeutered ? require('../assets/icon/neutered-icon.png') : require('../assets/icon/intact-icon.png')}
                          style={{ width: 20, height: 20 }}
                          resizeMode="cover"
                        />
                      </View>
                      <View className="ml-[5px] flex-1">
                        <Text className="font-regular text-[12px] text-[#8E8E93]" numberOfLines={1}>
                          {isVi ? 'Trạng thái' : 'Status'}
                        </Text>
                        <Text className="font-medium text-[14px] text-black" numberOfLines={1}>
                          {spayedText}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })()}
              {/* DYNAMIC HEALTH CARE SECTION KẾT THÚC */}
            </View>

            <View className="mt-3 mb-6">
              <Text className="text-[17px] font-medium text-black mb-3">
                {isVi ? 'Yêu cầu nhận nuôi' : 'Adoption Requirements'}
              </Text>
              {pet?.adoptionRequirements?.length > 0 ? (
                <View className="flex-row flex-wrap gap-2">
                  {pet.adoptionRequirements.map((item: any) => (
                    <View
                      key={item.id}
                      className="flex-row items-center px-3 h-[25px] rounded-full bg-white border border-[#E5E5E5]"
                      style={{
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.1,
                        shadowRadius: 2,
                        elevation: 1,
                      }}
                    >
                      <Image
                        source={ADOPTION_REQUIREMENT_ICONS[item.iconKey] || DEFAULT_REQUIREMENT_ICON}
                        style={{ width: 14, height: 14 }}
                        resizeMode="contain"
                      />
                      <Text className="text-[12x] text-[#8E8E93] font-regular ml-1.5">
                        {l(item.label)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text className="text-[13px] text-[#8E8E93] italic">
                  {isVi ? 'Chưa có yêu cầu nhận nuôi cụ thể.' : 'No specific adoption requirements yet.'}
                </Text>
              )}
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

              {showHistory && Array.isArray(pet?.pawHistory) && pet.pawHistory.length > 0 && (
                <View className="p-[20px] border border-[#E5E5EA] rounded-[20px] bg-white">
                  {pet.pawHistory.map((item: any, index: number) => {
                    const isLast = index === pet.pawHistory.length - 1;
                    const uiConfig =
                      PAW_HISTORY_UI_CONFIG[item.type as PawHistoryType] ?? DEFAULT_HISTORY_UI;
                    const { title, description } = resolvePawHistoryText(item, isVi);
                    const formattedDate = new Date(item.date).toLocaleDateString(
                      isVi ? 'vi-VN' : 'en-GB',
                      { day: '2-digit', month: '2-digit', year: 'numeric' },
                    );

                    return (
                      <View key={item.id} className="flex-row min-h-[54px]">
                        {/* Timeline line + icon */}
                        <View className="w-[40px] relative">
                          {!isLast && (
                            <View
                              className="absolute w-[1.5px]"
                              style={{
                                top: 24,
                                bottom: -2,
                                left: 10.25,
                                backgroundColor: uiConfig.lineColor,
                              }}
                            />
                          )}
                          <View
                            className="w-[22px] h-[22px] rounded-full items-center justify-center z-10"
                            style={{ backgroundColor: uiConfig.iconBgColor }}
                          >
                            <Image
                              source={uiConfig.icon}
                              style={{ width: 12, height: 12 }}
                              resizeMode="contain"
                            />
                          </View>
                        </View>

                        {/* Content */}
                        <View className="flex-1 pb-4 pr-3">
                          <Text
                            className="text-[15px] font-medium text-black leading-[18px]"
                            numberOfLines={1}
                          >
                            {title}
                          </Text>
                          <Text
                            className="text-[12px] font-regular text-[#9B9B9B] mt-[2px] leading-[15px]"
                          >
                            {item.displayDescription}
                          </Text>
                        </View>

                        {/* Date */}
                        <Text className="text-[11px] font-regular text-[#8E8E93] pt-[2px]">
                          {formattedDate}
                        </Text>
                      </View>
                    );
                  })}

                  {/* Footer badge */}
                  <View className="flex-row py-[8px] items-center justify-center gap-2 bg-[#F5F5F5] rounded-[8px]">
                    <Image
                      source={require('../assets/icon/lock.png')}
                      style={{ width: 12, height: 12 }}
                      resizeMode="cover"
                    />
                    <Text className="font-regular text-[12px] text-[#8E8E93]">
                      {isVi
                        ? 'Dòng thời gian này được tạo tự động và không thể chỉnh sửa.'
                        : 'This timeline is auto-generated and append-only.'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Empty state khi pawHistory rỗng */}
              {showHistory && (!pet?.pawHistory || pet.pawHistory.length === 0) && (
                <Text className="text-[13px] text-[#8E8E93] italic text-center py-4">
                  {isVi ? 'Chưa có lịch sử hoạt động.' : 'No history available yet.'}
                </Text>
              )}
              {/* <View className="p-[20px] border border-[#E5E5EA] rounded-[20px] bg-white">
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
                                <Text className="flex-1 text-[16px] font-medium text-black">
                                  {resolvePawHistoryItem(item, t, l, language).title}
                                </Text>

                                <Text className="text-[13px] text-[#8E8E93] font-regular mt-[2px]">
                                  {formattedDate}
                                </Text>
                              </View>
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
              </View> */}
            </View>

          </View>
        </BottomSheetScrollView>
      </BottomSheet>
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
            {/* 1. NÚT ẨN THÚ CƯNG (HIDE PET) */}
            <TouchableOpacity
              className="flex-row items-center px-4 py-3"
              activeOpacity={0.6}
              onPress={() => {
                setShowOptionsMenu(false);
                setShowHideModal(true);
              }}
            >
              <Feather name="eye-off" size={15} color="#374151" />
              <Text className="text-[14px] text-gray-700 ml-3 font-medium">
                {isVi ? `Ẩn ${pet.name}` : `Hide ${pet.name}`}
              </Text>
            </TouchableOpacity>

            {/* 2. NÚT CHẶN TRẠM CỨU HỘ (BLOCK SHELTER) */}
            {pet?.shelter?.id && (
              <TouchableOpacity
                className="flex-row items-center px-4 py-3 border-t border-gray-50"
                activeOpacity={0.6}
                onPress={() => {
                  setShowOptionsMenu(false);
                  setShowBlockShelterModal(true);
                }}
              >
                <Feather name="shield" size={15} color="#374151" />
                <Text className="text-[14px] text-gray-700 ml-3 font-medium">
                  {isVi ? 'Chặn trạm cứu hộ' : 'Block Shelter'}
                </Text>
              </TouchableOpacity>
            )}

            {/* 3. NÚT BÁO CÁO (REPORT) */}
            <TouchableOpacity
              className="flex-row items-center px-4 py-3 border-t border-gray-50"
              activeOpacity={0.6}
              onPress={() => {
                setShowOptionsMenu(false);
                setShowReportModal(true);
              }}
            >
              <Feather name="flag" size={15} color="#EF4444" />
              <Text className="text-[14px] text-red-600 ml-3 font-medium">
                {isVi ? 'Báo cáo thú cưng' : 'Report Pet'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      {/* MODAL XÁC NHẬN CHẶN THÚ CƯNG */}
      <Modal visible={showHideModal} animationType="fade" transparent={true} onRequestClose={() => !hidePetMutation.isPending && setShowHideModal(false)}>
        <View className="flex-1 justify-center items-center bg-black/60 px-5">
          <View className="bg-white w-full rounded-[28px] p-7 items-center shadow-2xl">
            <View className="w-16 h-16 rounded-full bg-gray-50 items-center justify-center mb-5 border border-gray-100">
              <Feather name="eye-off" size={26} color="#6B7280" />
            </View>
            <Text className="text-[20px] font-bold text-gray-900 text-center mb-3 tracking-tight">
              {isVi ? `Ẩn ${pet?.name}?` : `Hide ${pet?.name}?`}
            </Text>
            <Text className="text-[15px] text-gray-500 text-center mb-8 leading-6 px-1">
              {isVi
                ? `Hồ sơ của ${pet?.name} sẽ bị ẩn đi và không còn xuất hiện trong danh sách thú cưng của bạn nữa.`
                : `Profile of ${pet?.name} will be hidden and will no longer appear in your feed.`}
            </Text>
            <View className="w-full flex-col gap-3.5">
              <TouchableOpacity
                className="w-full bg-[#374151] py-4 rounded-[14px] items-center"
                activeOpacity={0.8}
                disabled={hidePetMutation.isPending}
                onPress={() => hidePetMutation.mutate()}
              >
                {hidePetMutation.isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-[15px]">{isVi ? 'Xác nhận ẩn' : 'Confirm Hide'}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                className="w-full bg-gray-50 py-4 rounded-[14px] items-center border border-gray-100"
                activeOpacity={0.7}
                disabled={hidePetMutation.isPending}
                onPress={() => setShowHideModal(false)}
              >
                <Text className="text-gray-600 font-bold text-[15px]">{isVi ? 'Hủy bỏ' : 'Cancel'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. MODAL XÁC NHẬN CHẶN SHELTER */}
      <Modal visible={showBlockShelterModal} animationType="fade" transparent={true} onRequestClose={() => !blockShelterMutation.isPending && setShowBlockShelterModal(false)}>
        <View className="flex-1 justify-center items-center bg-black/60 px-5">
          <View className="bg-white w-full rounded-[28px] p-7 items-center shadow-2xl">
            <View className="w-16 h-16 rounded-full bg-red-50 items-center justify-center mb-5 border border-red-100">
              <Feather name="shield-off" size={26} color="#EF4444" />
            </View>
            <Text className="text-[20px] font-bold text-gray-900 text-center mb-3 tracking-tight">
              {isVi ? `Chặn ${pet?.shelter?.name}?` : `Block ${pet?.shelter?.name}?`}
            </Text>
            <Text className="text-[15px] text-gray-500 text-center mb-8 leading-6 px-1">
              {isVi
                ? `Bạn sẽ không thấy bất kỳ bài đăng hoặc thú cưng nào từ trạm cứu hộ này nữa.`
                : `You won't see any posts or pets from this shelter anymore.`}
            </Text>
            <View className="w-full flex-col gap-3.5">
              <TouchableOpacity
                className="w-full bg-[#EF4444] py-4 rounded-[14px] items-center shadow-sm shadow-red-200"
                activeOpacity={0.8}
                disabled={blockShelterMutation.isPending}
                onPress={() => blockShelterMutation.mutate()}
              >
                {blockShelterMutation.isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-[15px]">{isVi ? 'Xác nhận chặn' : 'Confirm Block'}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                className="w-full bg-gray-50 py-4 rounded-[14px] items-center border border-gray-100"
                activeOpacity={0.7}
                disabled={blockShelterMutation.isPending}
                onPress={() => setShowBlockShelterModal(false)}
              >
                <Text className="text-gray-600 font-bold text-[15px]">{isVi ? 'Hủy bỏ' : 'Cancel'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* --- REPORT SHELTER MODAL --- */}
      <ReportIssueModal
        isVisible={showReportModal}
        context="matching"
        targetName={pet?.name}
        onClose={() => setShowReportModal(false)}
        onSubmit={async (data) => {
          await petService.reportPet(pet.id, {
            reason: data.reason,
            detail: data.details,
            isBlockRequested: data.isBlockRequested
          });

          if (data.isBlockRequested) {
            queryClient.setQueryData(['feed'], (oldData: any) => {
              return oldData?.filter((p: any) => p.id !== pet.id) || [];
            });
          }
          queryClient.invalidateQueries({ queryKey: ['feed'] });
        }}
      />
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