// app/shelter-pet-detail.tsx
import { Text } from '@/components/AppText';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, Modal, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { petService } from '../services/petService';

// Lấy chiều rộng màn hình để làm Slider full width (trừ padding)
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDER_WIDTH = SCREEN_WIDTH - 50; // 25px padding mỗi bên

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

export default function PetProfileDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const petId = params.id as string;
  // Nhận thêm params khoảng cách (nếu được truyền từ màn Home)
  const distance = params.distance as string; 
  
  const [petData, setPetData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavourite, setIsFavourite] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [isViewerVisible, setIsViewerVisible] = useState(false);

    // Hàm mở viewer
  const openImageViewer = (index: number) => {
      const urls = petImages.map((img: any) => img.url);
      setViewerImages(urls);
      setIsViewerVisible(true);
  };

  useFocusEffect(
    useCallback(() => {
      const fetchPetDetail = async () => {
        if (!petId) return;
        try {
          setIsLoading(true);
          const data = await petService.getPetById(petId);
          setPetData(data);
          setIsFavourite(!!data.isFavorited); 
        } catch (error) {
          console.error("Lỗi khi tải thông tin thú cưng:", error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchPetDetail();
    }, [petId]) 
  );

  const handleFavourite = async () => {
    const previousState = isFavourite;
    setIsFavourite(!previousState); 

    try {
      if (previousState) {
        await petService.unfavoritePet(petId);
        Toast.show({ type: 'success', text1: 'Removed from Favorites', visibilityTime: 2000 });
      } else {
        await petService.favoritePet(petId);
        Toast.show({ type: 'success', text1: 'Added to Favorites', visibilityTime: 2000 });
      }
    } catch (error) {
      setIsFavourite(previousState); 
      Toast.show({ type: 'error', text1: 'Failed to update favorite', visibilityTime: 2000 });
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#F2A465" />
      </View>
    );
  }

  const displayName = petData?.name || 'Unknown Name';
  const displayBreed = petData?.breed || 'Unknown Breed';
  const displayAge = getAge(petData?.dob);
  const displayGender = formatCapitalize(petData?.gender);
  
  // Logic lấy mảng ảnh
  const petImages = petData?.images && petData.images.length > 0 
    ? petData.images 
    : [{ url: petData?.avatarUrl || 'https://images.unsplash.com/photo-1600804340584-c7db2eacf0bf?q=80&w=800&auto=format&fit=crop' }];

  const isFemale = petData?.gender?.toUpperCase() === 'FEMALE';
  const genderBgClass = isFemale ? 'bg-[#FAE8ED]' : 'bg-[#EAF4FB]'; 

  // Xử lý sự kiện scroll để đổi chấm tròn Pagination cho Slider
  const onScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    setActiveImageIndex(Math.round(index));
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      <SafeAreaView className="flex-1" edges={['top']}>
        
        {/* --- HEADER --- */}
        <View className="flex-row items-center justify-between px-5 pt-2 pb-3 bg-white">
            <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
                <Feather name="chevron-left" size={24} color="#1C1C1E" />
            </TouchableOpacity>
            <Text className="text-[24px] font-semibold text-[#1C1C1E]">Pet Detail</Text>
            {/* <TouchableOpacity className="p-2 -mr-2">
                <Feather name="share-2" size={20} color="#1C1C1E" />
            </TouchableOpacity> */}
            <View style={{ width: 32 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            
            {/* --- HERO IMAGE SLIDER (FIXED) --- */}
            <View className="px-[25px] mt-[19px] relative">
                <View className="w-full h-[267px] rounded-[28px] overflow-hidden">
                    <ScrollView 
                        horizontal 
                        pagingEnabled 
                        showsHorizontalScrollIndicator={false}
                        onScroll={onScroll}
                        scrollEventThrottle={16}
                    >
                        {petImages.map((img: any, index: number) => (
                            <TouchableOpacity 
                                key={index} 
                                activeOpacity={0.9}
                                onPress={() => openImageViewer(index)}
                            >
                                <Image 
                                    source={{ uri: img.url }} 
                                    style={{ width: SLIDER_WIDTH, height: 267 }}
                                    resizeMode="cover"
                                />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
                
                {/* Pagination Dots */}
                {petImages.length > 1 && (
                    <View className="absolute bottom-4 left-0 right-0 flex-row justify-center items-center gap-1.5">
                        {petImages.map((_: any, index: any) => (
                            <View 
                                key={index} 
                                className={`h-2 rounded-full transition-all ${index === activeImageIndex ? 'w-5 bg-[#F2A465]' : 'w-2 bg-white/70'}`} 
                            />
                        ))}
                    </View>
                )}
            </View>

            {/* --- NAME & LOCATION --- */}
            <View className="px-[25px] mt-[19px]">
                <View className="flex-row items-baseline">
                    <Text className="text-[24px] font-semibold text-[#1C1C1E]">{displayName}</Text>
                    <Text className="text-[16px] text-[#8E8E93] ml-2 font-regular mb-[2px]">({displayBreed})</Text>
                </View>
                
                {/* FIXED: Dùng dữ liệu thật thay vì 1.2 km */}
                {(distance || petData?.shelter?.address) && (
                  <View className="flex-row items-center mt-1.5">
                      <Feather name="map-pin" size={14} color="#F2A465" />
                      <Text className="text-[12px] text-[#8E8E93] ml-1.5 font-regular flex-1" numberOfLines={1}>
                          {distance ? `${distance} away` : petData?.shelter?.address}
                      </Text>
                  </View>
                )}
            </View>

            {/* --- STATS BADGES --- */}
            <View className="px-[25px] flex-row justify-between mt-6 gap-[10px]">
                <View className={`flex-1 py-[12px] rounded-[16px] items-center ${genderBgClass}`}>
                    <Text className="text-[#8E8E93] text-[12px] font-regular mb-1">Gender</Text>
                    <Text className="text-[#1C1C1E] text-[14px] font-semibold">{displayGender}</Text>
                </View>
                
                <View className="flex-1 bg-[#FCF8D6] py-[12px] rounded-[16px] items-center">
                    <Text className="text-[#8E8E93] text-[12px] font-regular mb-1">Age</Text>
                    <Text className="text-[#1C1C1E] text-[14px] font-semibold">{displayAge}</Text>
                </View>
                
                <View className="flex-1 bg-[#EAF4FB] py-[12px] rounded-[16px] items-center">
                    <Text className="text-[#8E8E93] text-[12px] font-regular mb-1">{petData?.weight ? 'Weight' : 'Size'}</Text>
                    <Text className="text-[#1C1C1E] text-[14px] font-semibold">
                        {petData?.weight ? `${petData.weight} kg` : (petData?.size ? formatCapitalize(petData.size) : 'N/A')}
                    </Text>
                </View>
            </View>

            {/* --- SHELTER INFO (FIXED HARDCODE) --- */}
            <TouchableOpacity 
                activeOpacity={0.7}
                onPress={() => petData?.shelter?.id && router.push(`/shelter-profile?id=${petData.shelter.id}`)}
                className="px-[25px] mt-[30px] flex-row items-center justify-between"
            >
                <View className="flex-row items-center flex-1">
                    <View className="w-[46px] h-[46px] rounded-full border border-gray-200 overflow-hidden items-center justify-center bg-white shadow-sm shadow-gray-100">
                        <Image 
                            source={{ uri: petData?.shelter?.avatarUrl || 'https://cdn-icons-png.flaticon.com/512/3592/3592182.png' }} 
                            className="w-[46px] h-[46px]" 
                            resizeMode="cover" 
                        />
                    </View>
                    <View className="ml-3 flex-1 pr-4">
                        <Text className="text-[15px] font-medium text-[#1C1C1E]" numberOfLines={1}>
                            {petData?.shelter?.name || 'Private Owner'} 
                        </Text>
                        <Text className="text-[13px] text-[#8E8E93] font-normal mt-0.5" numberOfLines={1}>
                            {petData?.shelter?.address || 'not updated địa chỉ'}
                        </Text>
                    </View>
                </View>
                {petData?.shelter?.id && (
                  <View>
                    <Feather name="chevron-right" size={20} color="#1C1C1E" />
                  </View>
                )}
            </TouchableOpacity>

            {/* --- ABOUT & TRAITS SECTION --- */}
            <View className="px-[25px] mt-[30px]">
                <Text className="text-[17px] font-medium text-[#1C1C1E] mb-[12px]">About {displayName}</Text>
                <Text className="text-[14px] text-[#8E8E93] leading-[22px] font-normal">
                    {petData?.description || "Hiện chưa có thông tin mô tả chi tiết cho bé."}
                </Text>
                
                {/* Dynamic Traits List */}
                {(petData?.traitsList?.length > 0 || petData?.traits?.length > 0) && (
                    <View className="flex-row flex-wrap gap-2 mt-[12px]">
                        {(petData?.traitsList || petData?.traits).map((traitItem: any, index: number) => {
                            const traitName = typeof traitItem === 'string' ? traitItem : traitItem.name;
                            if (!traitName) return null;

                            const colorStyles = [
                                { bg: 'bg-[#FFF4E8]', text: 'text-[#F3B27B]' }, 
                                { bg: 'bg-[#EBF4FE]', text: 'text-[#88B2F3]' }, 
                                { bg: 'bg-[#EAF8EF]', text: 'text-[#8FD49D]' }, 
                                { bg: 'bg-[#F3E8FF]', text: 'text-[#A855F7]' }  
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

            {/* --- BEHAVIOR SECTION --- */}
            {(petData?.goodWith?.length > 0 || petData?.badWith?.length > 0) && (
                <View className="px-[25px] mt-[24px]">
                    <Text className="text-[17px] font-medium text-[#1C1C1E] mb-[12px]">{displayName}'s Behavior</Text>
                    
                    {petData?.goodWith?.length > 0 && (
                        <View className="flex-row items-start mb-2">
                            <View className="flex-row items-center mr-1 mt-[2px]">
                                <Feather name="check-circle" size={14} color="#77C852" />
                                <Text className="ml-1.5 text-[14px] text-[#77C852] font-medium w-[90px]">Good with:</Text>
                            </View>
                            <Text className="flex-1 text-[14px] text-[#8E8E93] leading-[22px]">
                                {Array.isArray(petData.goodWith) ? petData.goodWith.join(', ') : petData.goodWith}
                            </Text>
                        </View>
                    )}

                    {petData?.badWith?.length > 0 && (
                        <View className="flex-row items-start">
                            <View className="flex-row items-center mr-1 mt-[2px]">
                                <Feather name="x-circle" size={14} color="#FE7D66" />
                                <Text className="ml-1.5 text-[14px] text-[#FE7D66] font-medium w-[90px]">Not suitable:</Text>
                            </View>
                            <Text className="flex-1 text-[14px] text-[#8E8E93] leading-[22px]">
                                {Array.isArray(petData.badWith) ? petData.badWith.join(', ') : petData.badWith}
                            </Text>
                        </View>
                    )}
                </View>
            )}

            {/* --- IDEAL HOME SECTION --- */}
            {petData?.idealHome && (
              <View className="px-[25px] mt-[24px] mb-2">
                  <Text className="text-[17px] font-medium text-[#1C1C1E] mb-[12px]">Ideal Home</Text>
                  <Text className="text-[14px] text-[#8E8E93] leading-[22px] font-normal">
                      {petData.idealHome}
                  </Text>
              </View>
            )}

        </ScrollView>

        {/* --- BOTTOM ACTION BAR --- */}
        <View className="px-[25px] pt-3 pb-6 bg-white flex-row items-center gap-4 border-t border-gray-100">
            <TouchableOpacity 
                onPress={handleFavourite}
                activeOpacity={0.7}
                className={`w-[56px] h-[56px] rounded-full border items-center justify-center bg-white transition-all ${isFavourite ? 'border-[#F2A465]' : 'border-[#E5E5EA]'}`}
            >
                <Image 
                    source={isFavourite ? require('../assets/icon/heart-filled-pawdoption.png') : require('../assets/icon/heart-pawdoption.png')}
                    style={{ width: 27, height: 27, tintColor: isFavourite ? '#F2A465' : '#1C1C1E' }} 
                    resizeMode="cover" 
                />
            </TouchableOpacity>

            <TouchableOpacity 
                className="flex-1 bg-[#F2A465] h-[56px] rounded-full items-center justify-center shadow-sm shadow-orange-200"
                activeOpacity={0.8}
                onPress={() => {
                  router.push({
                    pathname: '/adoption-form',
                    params: {
                      id: petId,
                      name: displayName,
                      breed: displayBreed,
                      image: petImages[0].url,
                      age: displayAge, 
                    }
                  });
                }}
            >
                <Text className="text-white font-semibold text-[16px]">Apply to Adopt</Text>
            </TouchableOpacity>
        </View>
        {/* --- IMAGE VIEWER MODAL --- */}
        <Modal 
            visible={isViewerVisible} 
            transparent={true} 
            animationType="fade"
            onRequestClose={() => setIsViewerVisible(false)}
        >
            <View className="flex-1 bg-black justify-center items-center">
                <TouchableOpacity 
                    className="absolute top-12 right-5 z-50 p-3" 
                    onPress={() => setIsViewerVisible(false)}
                >
                    <Feather name="x" size={30} color="white" />
                </TouchableOpacity>

                <ScrollView 
                    horizontal 
                    pagingEnabled 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ alignItems: 'center' }}
                >
                    {viewerImages.map((url, index) => (
                        <Image 
                            key={index}
                            source={{ uri: url }} 
                            style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }} // Hoặc chỉnh chiều cao theo ý muốn
                            resizeMode="contain"
                        />
                    ))}
                </ScrollView>
            </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}