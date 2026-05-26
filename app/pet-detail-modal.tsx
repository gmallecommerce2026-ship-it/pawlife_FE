// app/pet-detail-modal.tsx
import { Text } from '@/components/AppText';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import BottomSheet, { BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Image, LayoutAnimation, Linking, Platform, TouchableOpacity, UIManager, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { petService } from '../services/petService';

const getAge = (dobString?: string) => {
  if (!dobString) return 'Unknown';
  const dob = new Date(dobString);
  const diff_ms = Date.now() - dob.getTime();
  const age_dt = new Date(diff_ms);
  const years = Math.abs(age_dt.getUTCFullYear() - 1970);
  const months = age_dt.getUTCMonth();

  if (years > 0) return `${years} year${years > 1 ? 's' : ''}`;
  if (months > 0) return `${months} month${months > 1 ? 's' : ''}`;
  return 'Newborn';
};

const formatCapitalize = (str?: string) => {
  if (!str) return 'Unknown';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};
export default function PetDetailModal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [pet, setPet] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const { width, height } = Dimensions.get('window');
  const [headerHeight, setHeaderHeight] = useState(100);
  const BOTTOM_BAR_HEIGHT = 100;
  const [isFavourite, setIsFavourite] = useState(false);

  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

  // 1. Dùng animatedPosition để lấy chính xác tọa độ Y của Bottom Sheet
  const animatedPosition = useSharedValue(SCREEN_HEIGHT);

  // 2. Tính toán chiều cao ảnh
  const animatedImageStyle = useAnimatedStyle(() => {
    const overlapHeight = SCREEN_HEIGHT * 0.03;
    const minHeight = SCREEN_HEIGHT * 0.48;
    // animatedPosition.value chính là khoảng trống từ trên cùng màn hình đến mép Bottom Sheet.
    // VD: BottomSheet ở 25% (đáy) -> Tọa độ Y mép trên là 75% màn hình.
    // Chúng ta chỉ cần cho chiều cao ảnh bằng đúng tọa độ Y này!
    // Tuy nhiên, bạn muốn DỪNG co ảnh ở mốc 55% (tức là khi mép trên ở tọa độ 45% màn hình).

    return {
      // Dùng Math.max để đảm bảo ảnh luôn co giãn theo Bottom Sheet, nhưng không bao giờ nhỏ hơn minHeight
      height: Math.max(animatedPosition.value + overlapHeight, minHeight),
    };
  });

  const displayImages = useMemo(() => {
    return pet?.images?.length > 0 
      ? pet.images.map((img: any) => img.url) 
      : [pet?.avatarUrl || 'https://images.unsplash.com/photo-1600804340584-c7db2eacf0bf?q=80&w=800&auto=format&fit=crop'];
  }, [pet]);
  
  const MOCK_PAW_HISTORY = [
    {
      id: '1',
      title: 'Current Owner',
      date: '01/01/2026',
      description: 'Ownership transferred to Jane Doe',
      icon: 'user',
      color: '#F2A465', // Cam
      bgColor: '#FFF4EC'
    },
    {
      id: '2',
      title: 'Annual Checkup',
      date: '01/01/2026',
      description: 'Health examination completed',
      icon: 'check',
      color: '#77C582', // Xanh lá
      bgColor: '#EBFFE2'
    },
    {
      id: '3',
      title: 'DHPP Vaccination',
      date: '01/01/2026',
      description: 'Vaccinated: hepatitis, rabies, parvo, and parainfluenza',
      icon: 'user', // Bạn có thể đổi thành 'syringe' cho hợp ngữ cảnh y tế
      color: '#5A90DA', // Xanh dương
      bgColor: '#E8F1FF'
    },
    {
      id: '4',
      title: 'QR Code Registered',
      date: '01/01/2026',
      description: 'PawLife QR tag activated and linked to Luna',
      icon: 'expand',
      color: '#885BF2', // Tím
      bgColor: '#EAE7FB'
    },
    {
      id: '5',
      title: 'Date of Birth',
      date: '01/01/2026',
      description: 'Luna was born',
      icon: 'user',
      color: '#F2A465', // Vàng cam
      bgColor: '#FFF4EC'
    }
  ];

  // Cấu hình chiều cao ảnh nền (để đủ cover khoảng trống phía sau thẻ)
  const IMAGE_HEIGHT = height * 0.55;
  const REQUIRED_TOP_INSET = insets.top + 44 + 21;
  // --- CẤU HÌNH BOTTOM SHEET ---
  const snapPoints = useMemo(() => {
    // Mốc cao nhất: Dưới nút back 21px
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
    const fetchDetail = async () => {
      try {
        const res = await petService.getPetById(params.id as string);
        const petData = res.data || res;
        setPet(petData);
        // Giả sử API trả về field isFavorited (boolean) để biết user đã tim chưa
        setIsFavourite(!!petData.isFavorited); 
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
  }, [params.id]);

  // Áp dụng Optimistic UI cho nút tim
  const handleFavourite = async () => {
    const previousState = isFavourite;
    // 1. Cập nhật UI ngay lập tức để tạo cảm giác mượt mà
    setIsFavourite(!previousState);

    try {
      if (previousState) {
        // Đang tim -> Bỏ tim
        await petService.unfavoritePet(pet.id);
        Toast.show({
          type: 'custom_badge',
          props: { petName: pet.name || 'This pet', actionText: ' has been removed from Favourite' },
          visibilityTime: 2500, autoHide: true,
        });
      } else {
        // Chưa tim -> Tim
        await petService.favoritePet(pet.id);
        Toast.show({
          type: 'custom_badge',
          props: { petName: pet.name || 'This pet', actionText: ' has been added to Favourite' },
          visibilityTime: 2500, autoHide: true,
        });
      }
    } catch (error) {
      // 2. Nếu API lỗi, rollback lại trạng thái cũ
      setIsFavourite(previousState);
      Toast.show({
        type: 'error',
        text1: 'Oops!',
        text2: 'Something went wrong. Please try again.',
        visibilityTime: 2500, autoHide: true,
      });
      console.error("Lỗi thả tim:", error);
    }
  };

  if (isLoading || !pet) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator color="#F2A465" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />

      {/* --- NÚT BACK (Luôn nằm trên cùng, z-index cao nhất) --- */}

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
            backgroundColor: 'rgba(255, 255, 255, 0.1)', // Nền hơi mờ để bạn dễ nhìn thấy viền
          }}>
          <LinearGradient
            colors={['rgba(221, 221, 221, 0.1)', 'rgba(247, 247, 247, 0.5)', '#FFFFFF']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            locations={[0, 0.3, 1]}

            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 9999 }}
          />
          <Feather name="chevron-left" size={20} color="#00000" />
        </View>
      </TouchableOpacity>

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
        className="absolute right-5 w-10 h-10 rounded-full items-center justify-center"
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
            backgroundColor: 'rgba(255, 255, 255, 0.1)', // Nền hơi mờ để bạn dễ nhìn thấy viền
          }}>
          <LinearGradient
            colors={['rgba(221, 221, 221, 0.1)', 'rgba(247, 247, 247, 0.5)', '#FFFFFF']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            locations={[0, 0.3, 1]}

            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 9999 }}
          />
          <Image
            className=''
            source={require('../assets/icon/share.png')}
            style={{ width: 16, height: 16 }}
            resizeMode="cover"
          />
        </View>
      </TouchableOpacity>



      {/* --- LAYER 1: BACKGROUND TĨNH CỦA SLIDER ẢNH --- */}
      <Animated.View style={[{ width: SCREEN_WIDTH }, animatedImageStyle]}>

        {/* FlatList chứa các ảnh thú cưng */}
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
            // Dùng height: '100%' để ảnh tự khít với chiều cao của container khi co giãn
            <Image
              source={{ uri: item }}
              style={{ width: SCREEN_WIDTH, height: '100%' }}
              resizeMode="cover"
            />
          )}
        />

        {/* Lớp phủ đen mờ phía dưới ảnh (giúp dễ nhìn nút hơn) */}
        {/* <LinearGradient
           colors={['transparent', 'rgba(0,0,0,0.5)']}
           style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%' }}
        /> */}

        {displayImages.length > 1 && (
          <View 
            style={{
              position: 'absolute',
              bottom: 40,
              left: 0,
              right: 0,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 6, // Khoảng cách giữa các chấm
              zIndex: 10
            }}
          >
            {displayImages.map((_: any, index: any) => (
              <View
                key={index}
                className={`h-2 rounded-full transition-all ${
                  activeIndex === index 
                    ? 'w-6 bg-[#E89B5A]'  // Chấm đang active (dài hơn)
                    : 'w-2 bg-white/60'   // Chấm inactive (tròn)
                }`}
              />
            ))}
          </View>
        )}

      </Animated.View>

      {/* --- LAYER 2: BOTTOM SHEET FOREGROUND --- */}
      <BottomSheet
        index={1} // Bắt đầu ở snapPoint đầu tiên (60%)
        snapPoints={snapPoints}
        enableOverDrag={false}
        animatedPosition={animatedPosition}
        topInset={REQUIRED_TOP_INSET}
        backgroundStyle={{ backgroundColor: 'white', borderRadius: 30 }}
        handleIndicatorStyle={{ backgroundColor: '#E5E5EA', width: 48, height: 6 }}
        style={{
          shadowColor: '#000000',
          shadowOffset: {
            width: 0,
            height: -10
          },
          shadowOpacity: 0.25,
          shadowRadius: 10,
          elevation: 10,
        }}
      >
        <BottomSheetView className="px-[25px] pt-[12px] pb-[16px] bg-white z-10"
          onLayout={(event) => {
            const { height } = event.nativeEvent.layout;
            if (height > 0) {
              setHeaderHeight(height); // Cập nhật chiều cao thực tế vào state
            }
          }}
          style={{
            shadowColor: '#000000',
            shadowOffset: {
              width: 0,
              height: 4
            },
            shadowOpacity: 0.1,
            shadowRadius: 10,
            elevation: 10,
          }}>
          <View className="flex-1 justify-between items-start">
            <View className="flex-row items-baseline">
              <Text className="text-[24px] font-semibold text-black">{pet.name}</Text>
              <Text className="text-[14px] text-[#8E8E93] ml-2 font-regular mb-[2px]">({pet.breed})</Text>
            </View>
            <View className="flex-row items-center mt-1.5">
              <Image
                source={require('../assets/icon/location_solid.png')}
                style={{ width: 16, height: 16 }}
                resizeMode="cover"
              />
              <Text className="text-[12px] text-[#8E8E93] ml-1.5 font-regular">1.2 km away</Text>
            </View>
          </View>
        </BottomSheetView>
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100, paddingTop: 55 }} // Chừa chỗ cho Footer
        >
          {/* --- NỘI DUNG THẺ TRẮNG --- */}
          <View className="bg-white px-[25px] pt-2">
            {/* Thuộc tính Pet */}
            <View className="flex-row justify-between mt-6 gap-[10px]">
              {/* Gender */}
              <View className={`flex-1 ${pet?.gender?.toUpperCase() === 'FEMALE' ? 'bg-[#FAE8ED]' : 'bg-[#EAF4FB]'} py-[12px] rounded-[16px] items-center`}>
                <Text className="text-[#8E8E93] text-[12px] font-regular mb-1">Gender</Text>
                <Text className="text-black text-[14px] font-semibold">{formatCapitalize(pet?.gender)}</Text>
              </View>

              {/* Age */}
              <View className="flex-1 bg-[#FCF8D6] py-[12px] rounded-[16px] items-center">
                <Text className="text-[#8E8E93] text-[12px] font-regular mb-1">Age</Text>
                <Text className="text-black text-[14px] font-semibold">{getAge(pet?.dob)}</Text>
              </View>

              {/* Weight / Size */}
              <View className="flex-1 bg-[#E8F9E6] py-[12px] rounded-[16px] items-center">
                <Text className="text-[#8E8E93] text-[12px] font-regular mb-1">Weight</Text>
                <Text className="text-black text-[14px] font-semibold">
                  {pet?.weight ? `${pet.weight} kg` : (pet?.size ? formatCapitalize(pet.size) : 'N/A')}
                </Text>
              </View>
            </View>

            {/* Shelter Info */}
            <View className="flex-row items-center my-6">
              <Image
                source={{ uri: pet.shelter?.avatarUrl || 'https://cdn-icons-png.flaticon.com/512/3592/3592182.png' }}
                className="w-[45px] h-[45px] rounded-full border border-gray-200 overflow-hidden items-center justify-center bg-white shadow-sm shadow-gray-100"
              />
              <View className="flex-1 mr-2 ml-3">
                <Text className="text-[14px] font-medium text-black mb-[6px]" numberOfLines={1}>
                  {pet?.shelter?.name || 'Pawlife Shelter'}
                </Text>
                <Text className="text-[12px] text-[#8E8E93]" numberOfLines={1}>
                  {pet?.shelter?.address || 'District 7, HCM'}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <TouchableOpacity
                  activeOpacity={0.7}
                  className="w-[41px] h-[41px] rounded-full bg-[#FDF5EF] items-center justify-center"
                  onPress={async () => {
                    const phoneNumber = pet?.shelter?.phone;
                    if (phoneNumber) {
                      const webUrl = `https://zalo.me/${phoneNumber}`;
                      const appUrl = Platform.OS === 'ios'
                        ? `zalo://`
                        : `intent://zalo.me/${phoneNumber}#Intent;package=com.zing.zalo;scheme=https;end`;
                      try {
                        const canOpenApp = await Linking.canOpenURL(Platform.OS === 'ios' ? 'zalo://' : appUrl);
                        if (canOpenApp) {
                          await Linking.openURL(Platform.OS === 'ios' ? webUrl : appUrl);
                        } else {
                          await Linking.openURL(webUrl);
                        }
                      } catch (error) {
                        await Linking.openURL(webUrl);
                      }
                    } else {
                      Alert.alert("Thông báo", "Trạm cứu hộ này chưa cung cấp số điện thoại Zalo.");
                    }
                  }}
                >
                  <Image source={require('../assets/icon/message.png')} style={{ width: 24, height: 24 }} resizeMode="cover" />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  className="w-[36px] h-[36px] items-center justify-center"
                  onPress={() => router.push({ pathname: '/shelter-profile', params: { id: pet?.shelter?.id } })}
                >
                  <Feather name="chevron-right" size={18} color="#8E8E93" />
                </TouchableOpacity>
              </View>
            </View>

            <View>
              <Text className="text-[16px] font-medium text-black mb-2">About {pet.name}</Text>
              <Text className="text-[14px] text-[#8E8E93] leading-[20px] font-regular tracking-[0.06px]">
                {pet?.description || "There is no description available for this pet yet."}
              </Text>
              
              {/* Dynamic Traits List */}
                {/* Đọc từ petData.traitsList (như db seed) hoặc fallback về petData.traits */}
                {(pet?.traitsList?.length > 0 || pet?.traits?.length > 0) && (
                    <View className="flex-row flex-wrap gap-2 mt-[12px]">
                        {(pet?.traitsList || pet?.traits).map((traitItem: any, index: number) => {
                            // Xử lý linh hoạt: Nếu là Object (từ DB) thì lấy .name, nếu là String thì lấy luôn
                            const traitName = typeof traitItem === 'string' ? traitItem : traitItem.name;
                            
                            if (!traitName) return null;

                            const colorStyles = [
                                { bg: 'bg-[#FFF4E8]', text: 'text-[#F3B27B]' }, // Cam
                                { bg: 'bg-[#EBF4FE]', text: 'text-[#88B2F3]' }, // Xanh dương
                                { bg: 'bg-[#EAF8EF]', text: 'text-[#8FD49D]' }, // Xanh lá
                                { bg: 'bg-[#F3E8FF]', text: 'text-[#A855F7]' }  // Tím
                            ];
                            const style = colorStyles[index % colorStyles.length];
                            
                            return (
                                <View key={index} className={`${style.bg} px-3.5 py-1 rounded-full`}>
                                    <Text className={`${style.text} text-[12px] font-medium`}>{traitName}</Text>
                                </View>
                            );
                        })}
                    </View>
                )}
            </View>

            {/* Behavior (Good with / Not suitable) */}
            <View className="mt-6">
              <Text className="text-[16px] font-medium text-black mb-3">{pet.name}'s Behavior</Text>
              
              {/* Kiểm tra cả pet (từ danh sách) và fullPet (từ API chi tiết) */}
              {((pet?.goodWith)?.length > 0 || (pet?.badWith)?.length > 0) ? (
                <View>
                  {/* Good With */}
                  {(pet?.goodWith)?.length > 0 && (
                    <View className="flex-row items-start mb-2">
                      <View className="flex-row items-center mr-1 mt-[2px]">
                        <Image source={require('../assets/icon/Check.png')} style={{ width: 12, height: 12 }} resizeMode="cover" />
                        <Text className="ml-1.5 text-[14px] text-[#77C852] font-medium w-[90px]">Good with:</Text>
                      </View>
                      <Text className="flex-1 text-[14px] text-[#8E8E93] leading-[22px]">
                        {Array.isArray(pet?.goodWith) 
                          ? (pet?.goodWith).join(', ') 
                          : (pet?.goodWith)}
                      </Text>
                    </View>
                  )}

                  {/* Not Suitable */}
                  {(pet?.badWith)?.length > 0 && (
                    <View className="flex-row items-start mt-1">
                      <View className="flex-row items-center mr-1 mt-[2px]">
                        <Image source={require('../assets/icon/X.png')} style={{ width: 12, height: 12 }} resizeMode="cover" />
                        <Text className="ml-1.5 text-[14px] text-[#FE7D66] font-medium w-[90px]">Not suitable:</Text>
                      </View>
                      <Text className="flex-1 text-[14px] text-[#8E8E93] leading-[22px]">
                        {Array.isArray(pet?.badWith) 
                          ? (pet?.badWith).join(', ') 
                          : (pet?.badWith)}
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                /* Hiển thị khi không có dữ liệu */
                <Text className="text-[14px] text-[#8E8E93] italic">Behavioral details have not been updated.</Text>
              )}
            </View>

            {/* Ideal Home */}
            <View className="mt-6 mb-6">
              <Text className="text-[16px] font-medium text-black mb-2">Ideal Home</Text>
              <Text className="text-[14px] text-[#8E8E93] leading-[22px]">
                {pet?.idealHome || "The shelter hasn't specified the ideal home conditions for this pet yet. Contact them for more details."}
              </Text>
            </View>

            {/* Paw History Section */}
            <View className="mb-10">
              <View className="flex-row justify-between items-center mb-5">
                <Text className="text-[16px] font-medium text-black">Paw History</Text>
                <TouchableOpacity
                  onPress={toggleHistory}
                  activeOpacity={0.6}
                  className="flex-row items-center px-3 py-1.5 rounded-full"
                >
                  <Text className="text-[13px] text-[#F2A465] font-medium mr-1">{showHistory ? 'Hide' : 'View'}</Text>
                  <Feather name={showHistory ? "chevron-up" : "chevron-down"} size={16} color="#F2A465" />
                </TouchableOpacity>
              </View>

              {showHistory && (
                <View className="p-[20px] border border-[#E5E5EA] rounded-[20px] bg-white">
                  {MOCK_PAW_HISTORY.map((item, index) => {
                    const isLastItem = index === MOCK_PAW_HISTORY.length - 1;

                    return (
                      <View key={item.id} className="flex-row">
                        {/* Cột trái: Chứa Icon và Line nối */}
                        <View className="items-center mr-4 w-[32px]">
                          {/* Icon Container */}
                          <View
                            className="w-[32px] h-[32px] rounded-full items-center justify-center z-10"
                            style={{ backgroundColor: item.bgColor }}
                          >
                            <FontAwesome5 name={item.icon} size={13} color={item.color} />
                          </View>

                          {/* Vertical Line nối xuống node tiếp theo */}
                          {!isLastItem && (
                            <View
                              className="w-[2px] flex-1 my-1"
                              style={{ backgroundColor: item.color }}
                            />
                          )}
                        </View>

                        {/* Cột phải: Chứa Text content */}
                        {/* Thêm padding-bottom để tạo khoảng cách giữa các khối, trừ item cuối cùng */}
                        <View className={`flex-1 pt-1 ${!isLastItem ? 'pb-6' : ''}`}>
                          <View className="flex-row justify-between items-start">
                            <Text className="text-[16px] font-medium text-black">
                              {item.title}
                            </Text>
                            <Text className="text-[13px] text-[#8E8E93] font-regular">
                              {item.date}
                            </Text>
                          </View>
                          <Text className="text-[13px] text-[#8E8E93] mt-1 leading-[18px]">
                            {item.description}
                          </Text>
                        </View>
                      </View>
                    );
                  })}

                  <View className='flex-row py-[8px] items-center justify-center gap-2 mt-4 bg-[#F5F5F5] rounded-[8px]'>
                    <Image
                      source={require('../assets/icon/lock.png')}
                      style={{ width: 12, height: 12 }}
                      resizeMode="cover"
                    />
                    <Text className='font-regular text-[12px] text-[#8E8E93]'>This timeline is permanent and append-only.</Text>
                  </View>
                </View>
              )}
            </View>

          </View>
        </BottomSheetScrollView>
      </BottomSheet>

      {/* --- FOOTER CTA NẰM NGOÀI CÙNG (Fixed ở dưới) --- */}
      <View
        style={{ paddingBottom: 21 }}
        className="absolute bottom-0 w-full px-[25px] pt-4 bg-white flex-row items-center gap-4"
      >
        <TouchableOpacity className={`w-[55px] h-[55px] rounded-full border-2 items-center justify-center bg-white ${isFavourite ? "border-[#E89B5A]/50" : "border-[#E5E5EA]"}`}
          onPress={handleFavourite}
          style={
            isFavourite ? {
              shadowColor: '#E89B5A',
              shadowOpacity: 0.3,
              shadowOffset: { width: 0, height: 4 },
              shadowRadius: 8,
              elevation: 5
            } : {}
          }
        >
          {/* Cấu trúc hiển thị icon Filled hoặc Outline tuỳ thuộc vào state isFavourite */}
          <Image 
            source={isFavourite ? require('../assets/icon/heart-filled-pawdoption.png') : require('../assets/icon/heart-pawdoption.png')}
            style={{ width: 27, height: 27, tintColor: isFavourite ? '#E89B5A' : '#8E8E93' }} 
            resizeMode="cover" 
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push({ pathname: '/adoption-form', params: { id: pet.id } })}
          className="flex-1 bg-[#F2A465] h-[56px] rounded-full items-center justify-center shadow-sm"
        >
          <Text className="text-white text-[16px] font-bold">Apply to Adopt</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}