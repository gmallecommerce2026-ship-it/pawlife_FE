// app/pet-detail-modal.tsx
import { Text } from '@/components/AppText';
import { Feather, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, LayoutAnimation, Linking, Platform, TouchableOpacity, UIManager, View } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { petService } from '../services/petService';

export default function PetDetailModal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [pet, setPet] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const { width, height } = Dimensions.get('window');

  const baseImage: string = 'https://images.unsplash.com/photo-1600804340584-c7db2eacf0bf?q=80&w=800&auto=format&fit=crop';

  const CLONED_IMAGES: string[] = Array(3).fill(baseImage);
  const images = CLONED_IMAGES;

  const handleScroll = (event: any) => {
    const scrollOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollOffset / width);
    setActiveIndex(index);
  };

  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  // --- REANIMATED SHARED VALUES ---
  const scrollY = useSharedValue(0);

  // Khoảng cách chừa lại ở trên cùng để thấy mặt Pet
  const GAP = insets.top + 60;
  const IMAGE_HEIGHT = height * 0.45;
  // Giới hạn cuộn tối đa của ảnh trước khi thẻ kẹt lại
  const MAX_SCROLL = IMAGE_HEIGHT - GAP - 30;

  const toggleHistory = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowHistory(!showHistory);
  };

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await petService.getPetById(params.id as string);
        setPet(res.data || res);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
  }, [params.id]);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const imageAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(scrollY.value, [-100, 0, MAX_SCROLL], [1.2, 1, 0.85], Extrapolation.CLAMP);
    const translateY = interpolate(scrollY.value, [0, MAX_SCROLL], [0, -20], Extrapolation.CLAMP);
    const opacity = interpolate(scrollY.value, [0, MAX_SCROLL], [1, 0.6], Extrapolation.CLAMP);
    return { transform: [{ scale }, { translateY }], opacity };
  });

  const dotsAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, MAX_SCROLL / 2], [1, 0], Extrapolation.CLAMP);
    return { opacity };
  });

  if (isLoading || !pet) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator color="#F2A465" />
      </View>
    );
  }

  const petImages = pet.images?.length > 0
    ? pet.images.map((img: any) => img.url)
    : [pet.imageUrl || 'https://images.unsplash.com/photo-1600804340584-c7db2eacf0bf?q=80&w=800'];



  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />
      <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, height: IMAGE_HEIGHT }, imageAnimatedStyle]}>
        <FlatList
          data={petImages}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / width);
            setActiveIndex(index);
          }}
          renderItem={({ item }) => (
            <Image source={{ uri: item }} style={{ width, height: IMAGE_HEIGHT }} resizeMode="cover" />
          )}
          keyExtractor={(_, index) => index.toString()}
        />

        {/* Pagination Dots (Mờ dần khi kéo thẻ lên) */}
        <Animated.View style={[dotsAnimatedStyle]} className="absolute bottom-10 w-full flex-row justify-center gap-2">
          {petImages.map((_: string, index: number) => (
            <View
              key={index}
              className={`h-1.5 rounded-full ${index === activeIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`}
            />
          ))}
        </Animated.View>
      </Animated.View>

      <TouchableOpacity
        onPress={() => router.back()}
        style={{ top: insets.top + 10 }}
        className="absolute left-5 w-10 h-10 bg-black/20 rounded-full items-center justify-center z-50"
      >
        <Ionicons name="chevron-back" size={24} color="white" />
      </TouchableOpacity>
      <Animated.ScrollView style={{ flex: 1, marginTop: GAP,borderTopLeftRadius: 30, 
          borderTopRightRadius: 30, 
           }}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        stickyHeaderIndices={[1]}>
        <View style={{ height: MAX_SCROLL }} />
        <View className="bg-white rounded-t-[30px] pt-4 pb-2 px-[25px]">
          <View className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-3" />

          <View className="flex-1 justify-between items-start mb-2">
            <View className="flex-row items-baseline">
              <Text className="text-[24px] font-semibold text-[#1C1C1E]">{pet.name}</Text>
              <Text className="text-[16px] text-[#8E8E93] ml-2 font-regular mb-[2px]">({pet.breed})</Text>
            </View>
            <View className="flex-row items-center mt-1.5">
              <Feather name="map-pin" size={14} color="#F2A465" />
              <Text className="text-[12px] text-[#8E8E93] ml-1.5 font-regular">1.2 km away</Text>
            </View>
          </View>
        </View>

        <View className="bg-white px-[25px] pb-10 min-h-screen">

          <View className="flex-row justify-between mt-6 gap-[10px]">
            <View className="flex-1 bg-[#EAF4FB] py-[12px] rounded-[16px] items-center">
              <Text className="text-[#8E8E93] text-[12px] font-regular mb-1">Gender</Text>
              <Text className="text-[#1C1C1E] text-[14px] font-semibold">Male</Text>
            </View>
            <View className="flex-1 bg-[#FCF8D6] py-[12px] rounded-[16px] items-center">
              <Text className="text-[#8E8E93] text-[12px] font-regular mb-1">Age</Text>
              <Text className="text-[#1C1C1E] text-[14px] font-semibold">Young</Text>
            </View>
            <View className="flex-1 bg-[#FAE8ED] py-[12px] rounded-[16px] items-center">
              <Text className="text-[#8E8E93] text-[12px] font-regular mb-1">Size</Text>
              <Text className="text-[#1C1C1E] text-[14px] font-semibold">Large</Text>
            </View>
          </View>

          {/* --- SHELTER INFO SECTION --- */}
          <View className="flex-row items-center py-4 my-4">
            {/* 1. Avatar */}
            <Image
              source={{ uri: pet.shelter?.avatar || 'https://cdn-icons-png.flaticon.com/512/3592/3592182.png' }}
              className="w-[46px] h-[46px] rounded-full border border-gray-200 overflow-hidden items-center justify-center bg-white shadow-sm shadow-gray-100"
            />

            <View className="flex-1 mr-2 ml-3">
              <Text className="text-[16px] font-semibold text-[#1C1C1E]" numberOfLines={1}>
                {pet?.shelter?.name || 'Pawlife Shelter'}
              </Text>
              <Text className="text-[13px] text-[#8E8E93] mt-[2px]" numberOfLines={1}>
                {pet?.shelter?.address || 'District 7, HCM'}
              </Text>
            </View>

            <View className="flex-row items-center gap-2">

              {/* Nút Gửi tin nhắn */}
              <TouchableOpacity
                activeOpacity={0.7}
                className="w-[36px] h-[36px] rounded-full bg-[#FFF4EC] items-center justify-center"
                onPress={async () => {
                  // Lấy số điện thoại từ data
                  const phoneNumber = pet?.shelter?.phone; 

                  if (phoneNumber) {
                    // 1. Link Zalo Web/Universal (Mặc định)
                    const webUrl = `https://zalo.me/${phoneNumber}`;
                    
                    // 2. App Scheme Zalo (Ép mở ứng dụng Zalo)
                    // Cú pháp này trên Android/iOS sẽ ép gọi thẳng vào gói ứng dụng Zalo
                    const appUrl = Platform.OS === 'ios' 
                      ? `zalo://` // Mở app Zalo trên iOS
                      : `intent://zalo.me/${phoneNumber}#Intent;package=com.zing.zalo;scheme=https;end`; // Ép Intent trên Android

                    try {
                      // Cố gắng kiểm tra xem máy có cài app Zalo không
                      const canOpenApp = await Linking.canOpenURL(Platform.OS === 'ios' ? 'zalo://' : appUrl);

                      if (canOpenApp) {
                        // Nếu có cài app Zalo -> Ưu tiên mở App
                        await Linking.openURL(Platform.OS === 'ios' ? webUrl : appUrl);
                      } else {
                        // Nếu không cài App -> Mở link Zalo trên nền Web
                        await Linking.openURL(webUrl);
                      }
                    } catch (error) {
                      // Fallback an toàn nếu có lỗi
                      await Linking.openURL(webUrl);
                    }
                  } else {
                    Alert.alert("Thông báo", "Trạm cứu hộ này chưa cung cấp số điện thoại Zalo.");
                  }
                }}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={18} color="#F2A465" />
              </TouchableOpacity>

              {/* Nút Xem trang cá nhân */}
              <TouchableOpacity
                activeOpacity={0.7}
                className="w-[36px] h-[36px] rounded-full bg-[#FFF4EC] items-center justify-center"
                onPress={() => {
                  router.push({ pathname: '/shelter-profile', params: { id: pet?.shelter?.id } });
                }}
              >
                <Feather name="chevron-right" size={20} color="#F2A465" />
              </TouchableOpacity>

            </View>
          </View>

          {/* --- DESCRIPTION --- */}
          <View>
            <Text className="text-[16px] font-medium text-[#1C1C1E] mb-2">About {pet.name}</Text>
            <Text className="text-[14px] text-[#8E8E93] leading-[22px] font-normal">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec a efficitur lorem, a vulputate odio. Vestibulum gravida commodo turpis sed finibus. Quisque vel porttitor quam
            </Text>

            <View className="flex-row gap-2 mt-[9px]">
              <View className="bg-[#FFF4E8] px-3.5 py-0.5 rounded-full">
                <Text className="text-[#F3B27B] text-[12px] font-medium">Playful</Text>
              </View>
              <View className="bg-[#EBF4FE] px-3.5 py-0.5 rounded-full">
                <Text className="text-[#88B2F3] text-[12px] font-medium">Clingy</Text>
              </View>
              <View className="bg-[#EAF8EF] px-3.5 py-0.5 rounded-full">
                <Text className="text-[#8FD49D] text-[12px] font-medium">Friendly</Text>
              </View>
            </View>
          </View>


          {/* --- BEHAVIOR --- */}
          <View className="mt-6 mb-2">
            <Text className="text-[16px] font-medium text-[#1C1C1E] mb-2">{pet.name}'s Behavior</Text>
            <View className="flex-row items-start mb-1">
              <View className="flex-row items-center mr-2 mt-[2px]">
                <FontAwesome5 name="check" size={14} color="#77C852" />
                <Text className="ml-1.5 text-[15px] text-[#77C852]">
                  Good with:
                </Text>
              </View>

              <Text className="flex-1 text-[15px] text-[#8E8E93] leading-[22px]">
                Children, Seniors, Dogs, Cats.
              </Text>
            </View>

            <View className="flex-row items-start">
              <View className="flex-row items-center mr-2 mt-[2px]">
                <FontAwesome5 name="times" size={14} color="#FE7D66" />
                <Text className="ml-2.5 text-[15px] text-[#FE7D66]">
                  Not suitable:
                </Text>
              </View>

              <Text className="flex-1 text-[15px] text-[#8E8E93] leading-[22px]">
                Children, Seniors, Dogs, Cats.
              </Text>
            </View>
          </View>

          {/* --- IDEAL HOME --- */}
          <View className="mt-6 mb-6">
            <Text className="text-[16px] font-medium text-[#1C1C1E] mb-2">Ideal Home</Text>
            <Text className="text-[14px] text-[#8E8E93] leading-[22px]">
              {pet.idealHome || "This pet needs a loving home with space to run and play."}
            </Text>
          </View>

          {/* --- PAW HISTORY SECTION --- */}
          <View className="mb-10">

            {/* 1. HEADER*/}
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-[18px] font-medium text-[#1C1C1E]">Paw History</Text>

              <TouchableOpacity
                onPress={toggleHistory}
                activeOpacity={0.6}
                className="flex-row items-center bg-[#F2A465]/10 px-3 py-1.5 rounded-full"
              >
                <Text className="text-[13px] text-[#F2A465] font-bold mr-1">
                  {showHistory ? 'Hide' : 'View'}
                </Text>
                <Feather
                  name={showHistory ? "chevron-up" : "chevron-down"}
                  size={16}
                  color="#F2A465"
                />
              </TouchableOpacity>
            </View>

            {/* 2. CONTENT CARD */}
            {showHistory && (
              <View className="p-[20px] border border-[#E5E5EA] rounded-[20px] bg-white shadow-sm overflow-hidden">

                {/* Code các mốc timeline của bạn */}
                <View className="relative">
                  <View
                    className="absolute left-[15px] top-[10px] bottom-[20px] w-[2px] bg-[#F2A465]/30"
                  />

                  <View className="flex-row mb-8">
                    <View className="w-[32px] h-[32px] rounded-full bg-[#FFF4EC] items-center justify-center z-10 border-[3px] border-white shadow-sm">
                      <FontAwesome5 name="user" size={13} color="#F2A465" />
                    </View>

                    <View className="ml-4 flex-1 pt-1">
                      <View className="flex-row justify-between items-start">
                        <Text className="text-[16px] font-semibold text-[#1C1C1E]">Current Owner</Text>
                        <Text className="text-[13px] text-[#8E8E93] font-medium">01/01/2026</Text>
                      </View>
                      <Text className="text-[13px] text-[#8E8E93] mt-1">Ownership transferred to Jane Doe</Text>
                    </View>
                  </View>

                  <View className="flex-row mb-8">
                    <View className="w-[32px] h-[32px] rounded-full bg-[#EBFFE2] items-center justify-center z-10 border-[3px] border-white shadow-sm">
                      <FontAwesome5 name="check" size={13} color="#77C582" />
                    </View>

                    <View className="ml-4 flex-1 pt-1">
                      <View className="flex-row justify-between items-start">
                        <Text className="text-[16px] font-semibold text-[#1C1C1E]">Anual Checkup</Text>
                        <Text className="text-[13px] text-[#8E8E93] font-medium">01/01/2026</Text>
                      </View>
                      <Text className="text-[13px] text-[#8E8E93] mt-1">Vaccinated: hepatitis, rabies, parvo, and parainfluenza</Text>
                    </View>
                  </View>

                  <View className="flex-row mb-8">
                    <View className="w-[32px] h-[32px] rounded-full bg-[#E8F1FF] items-center justify-center z-10 border-[3px] border-white shadow-sm">
                      <FontAwesome5 name="user" size={13} color="#5A90DA" />
                    </View>

                    <View className="ml-4 flex-1 pt-1">
                      <View className="flex-row justify-between items-start">
                        <Text className="text-[16px] font-semibold text-[#1C1C1E]">DHPP Vaccination</Text>
                        <Text className="text-[13px] text-[#8E8E93] font-medium">01/01/2026</Text>
                      </View>
                      <Text className="text-[13px] text-[#8E8E93] mt-1">Vaccinated: hepatitis, rabies, parvo, and parainfluenza</Text>
                    </View>
                  </View>

                  <View className="flex-row mb-8">
                    <View className="w-[32px] h-[32px] rounded-full bg-[#EAE7FB] items-center justify-center z-10 border-[3px] border-white shadow-sm">
                      <FontAwesome5 name="expand" size={14} color="#885BF2" />
                    </View>

                    <View className="ml-4 flex-1 pt-1">
                      <View className="flex-row justify-between items-start">
                        <Text className="text-[16px] font-semibold text-[#1C1C1E]">QR Code Registered</Text>
                        <Text className="text-[13px] text-[#8E8E93] font-medium">01/01/2026</Text>
                      </View>
                      <Text className="text-[13px] mt-1 font-medium italic">
                        Pawlife QR tag activated and liked to Luna
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row">
                    <View className="w-[32px] h-[32px] rounded-full bg-[#FFF4EC] items-center justify-center z-10 border-[3px] border-white shadow-sm">
                      <FontAwesome5 name="user" size={14} color="#F2A465" />
                    </View>

                    <View className="ml-4 flex-1 pt-1">
                      <View className="flex-row justify-between items-start">
                        <Text className="text-[16px] font-semibold text-[#1C1C1E]">Date of Birth</Text>
                        <Text className="text-[13px] text-[#8E8E93] font-medium">01/01/2026</Text>
                      </View>
                      <Text className="text-[13px] mt-1 font-medium italic">
                        Luna was born
                      </Text>
                    </View>
                  </View>

                </View>
              </View>
            )}
          </View>
        </View>
      </Animated.ScrollView>
      <View
        style={{ paddingBottom: insets.bottom + 10 }}
        className="px-[25px] pt-4 bg-white flex-row items-center gap-4 border-t border-gray-100"
      >
        <TouchableOpacity className="w-[56px] h-[56px] rounded-full border border-[#E5E5EA] items-center justify-center bg-white">
          <Feather name="heart" size={24} color="#F2A465" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push({ pathname: '/adoption-form', params: { id: pet.id } })}
          className="flex-1 bg-[#F2A465] h-[56px] rounded-full items-center justify-center"
        >
          <Text className="text-white text-[16px] font-bold">Apply to Adopt</Text>
        </TouchableOpacity>
      </View>
    </View>
    
  );
}