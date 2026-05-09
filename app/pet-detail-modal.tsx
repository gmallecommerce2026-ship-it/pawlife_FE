// app/pet-detail-modal.tsx
import { Text } from '@/components/AppText';
import { Feather, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState, useMemo } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, LayoutAnimation, Linking, Platform, TouchableOpacity, UIManager, View, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { petService } from '../services/petService';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';

export default function PetDetailModal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [pet, setPet] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const { width, height } = Dimensions.get('window');

  // --- MOCK DATA GIỮ NGUYÊN ---
  const MOCK_IMAGES: string[] = [
    'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1517849845537-4d257902454a?q=80&w=800&auto=format&fit=crop'
  ];

  const baseImage: string = 'https://images.unsplash.com/photo-1600804340584-c7db2eacf0bf?q=80&w=800&auto=format&fit=crop';
  const CLONED_IMAGES: string[] = Array(3).fill(baseImage);
  const petImages = MOCK_IMAGES; // Hoặc dùng CLONED_IMAGES / pet.images tùy ý

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

  // --- CẤU HÌNH BOTTOM SHEET ---
  // Thẻ bắt đầu ở 60% màn hình, và khi kéo lên tối đa sẽ chiếm 85% màn hình
  const snapPoints = useMemo(() => ['55%', '85%'], []);

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
        setPet(res.data || res);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
  }, [params.id]);

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
        style={{ top: insets.top + 10, zIndex: 50 }}
        className="absolute left-5 w-10 h-10 bg-black/20 rounded-full items-center justify-center"
      >
        <Ionicons name="chevron-back" size={24} color="white" />
      </TouchableOpacity>

      {/* --- LAYER 1: BACKGROUND TĨNH CỦA SLIDER ẢNH --- */}
      <View style={{ height: IMAGE_HEIGHT, position: 'absolute', top: 0, width: '100%' }}>
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

        {/* Pagination Dots */}
        <View className="absolute bottom-[20%] w-full flex-row justify-center gap-2">
          {petImages.map((_: string, index: number) => (
            <View
              key={index}
              className={`h-1.5 rounded-full ${index === activeIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`}
            />
          ))}
        </View>
      </View>

      {/* --- LAYER 2: BOTTOM SHEET FOREGROUND --- */}
      <BottomSheet
        index={0} // Bắt đầu ở snapPoint đầu tiên (60%)
        snapPoints={snapPoints}
        backgroundStyle={{ backgroundColor: 'white', borderRadius: 30 }}
        handleIndicatorStyle={{ backgroundColor: '#E5E5EA', width: 48, height: 6 }}
      >
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }} // Chừa chỗ cho Footer
        >
          {/* --- NỘI DUNG THẺ TRẮNG --- */}
          <View className="bg-white px-[25px] pt-2">

            {/* Header Info */}
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

            {/* Thuộc tính Pet */}
            <View className="flex-row justify-between mt-6 gap-[10px]">
              <View className={`flex-1 ${pet.gender === 'Male' ? 'bg-[#E2EFF8]' : 'bg-[#FAE8ED]'} py-[12px] rounded-[16px] items-center`}>
                <Text className="text-[#8E8E93] text-[12px] font-regular mb-1">Gender</Text>
                <Text className="text-black text-[14px] font-semibold">{pet.gender}</Text>
              </View>
              <View className="flex-1 bg-[#FCF8D6] py-[12px] rounded-[16px] items-center">
                <Text className="text-[#8E8E93] text-[12px] font-regular mb-1">Age</Text>
                <Text className="text-black text-[14px] font-semibold">Young</Text>
              </View>
              <View className="flex-1 bg-[#E8F9E6] py-[12px] rounded-[16px] items-center">
                <Text className="text-[#8E8E93] text-[12px] font-regular mb-1">Size</Text>
                <Text className="text-black text-[14px] font-semibold">Large</Text>
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

            {/* Description */}
            <View>
              <Text className="text-[16px] font-medium text-black mb-2">About {pet.name}</Text>
              <Text className="text-[14px] text-[#8E8E93] leading-[22px] font-regular tracking-[0.06px]">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec a efficitur lorem, a vulputate odio. Vestibulum gravida commodo turpis sed finibus. Quisque vel porttitor quam
              </Text>
              <View className="flex-row gap-2 mt-[6px]">
                <View className="bg-[#FFF4E8] px-3.5 py-0.5 rounded-full"><Text className="text-[#F3B27B] text-[12px] font-medium">Playful</Text></View>
                <View className="bg-[#EBF4FE] px-3.5 py-0.5 rounded-full"><Text className="text-[#88B2F3] text-[12px] font-medium">Clingy</Text></View>
                <View className="bg-[#EAF8EF] px-3.5 py-0.5 rounded-full"><Text className="text-[#8FD49D] text-[12px] font-medium">Friendly</Text></View>
              </View>
            </View>

            {/* Behavior */}
            <View className="mt-6">
              <Text className="text-[16px] font-medium text-black mb-2">{pet.name}'s Behavior</Text>
              <View className="flex-row items-start mb-1">
                <View className="flex-row items-center mr-2 mt-[2px]">
                  <Image source={require('../assets/icon/Check.png')} style={{ width: 12, height: 12 }} resizeMode="cover" />
                  <Text className="ml-1.5 text-[14px] text-[#77C852] font-medium">Good with:</Text>
                </View>
                <Text className="flex-1 text-[14px] text-[#8E8E93] leading-[22px]">Children, Seniors, Dogs, Cats.</Text>
              </View>
              <View className="flex-row items-start">
                <View className="flex-row items-center mr-2 mt-[2px]">
                  <Image source={require('../assets/icon/X.png')} style={{ width: 12, height: 12 }} resizeMode="cover" />
                  <Text className="ml-1.5 text-[14px] text-[#FE7D66] font-medium">Not suitable:</Text>
                </View>
                <Text className="flex-1 text-[14px] text-[#8E8E93] leading-[22px]">Children, Seniors, Dogs, Cats.</Text>
              </View>
            </View>

            {/* Ideal Home */}
            <View className="mt-6 mb-6">
              <Text className="text-[16px] font-medium text-black mb-2">Ideal Home</Text>
              <Text className="text-[14px] text-[#8E8E93] leading-[22px]">
                {pet.idealHome || "This pet needs a loving home with space to run and play."}
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
        style={{ paddingBottom: insets.bottom + 10 }}
        className="absolute bottom-0 w-full px-[25px] pt-4 bg-white flex-row items-center gap-4"
      >
        <TouchableOpacity className="w-[56px] h-[56px] rounded-full border border-[#E5E5EA] items-center justify-center bg-white shadow-sm shadow-gray-200">
          <Feather name="heart" size={24} color="#F2A465" />
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