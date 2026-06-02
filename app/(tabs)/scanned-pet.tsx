import axiosClient from '@/api/axiosClient';
import { Text } from '@/components/AppText';
import { AntDesign } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  ScrollView,
  TouchableOpacity,
  View
} from 'react-native';

import LostModeShareModal, { FormData } from '@/components/LostModeShareModal';
import ReportIssueModal from '@/components/ReportIssueModal';
import { LinearGradient } from 'expo-linear-gradient';
import ShelterContactModal from '@/components/ShelterContactModal';

const { width } = Dimensions.get('window');

// --- COMPONENT XỬ LÝ ẢNH CÓ LOADING (MỚI) ---
const ImageWithLoading = ({ uri, imgWidth }: { uri: string; imgWidth: number }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  return (
    <View style={{ width: imgWidth, height: 210, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' }}>
      {isLoading && !isError && (
        <ActivityIndicator size="small" color="#E89B5A" style={{ position: 'absolute' }} />
      )}
      <Image
        source={{ uri: isError ? 'https://images.unsplash.com/photo-1552053831-71594a27632d?q=80&w=600&auto=format&fit=crop' : uri }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setIsError(true);
        }}
      />
    </View>
  );
};

export default function ScannedPetScreen() {
  const router = useRouter();
  const { tagId } = useLocalSearchParams();

  const [pet, setPet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [hasReported, setHasReported] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReportVisible, setIsReportVisible] = useState(false);
  const [shelterData, setShelterData] = useState<any>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isContactModalVisible, setIsContactModalVisible] = useState(false);

  const displayImages = React.useMemo(() => {
    // 1. Kiểm tra nếu pet chưa load xong
    if (!pet) return ['https://images.unsplash.com/photo-1552053831-71594a27632d?q=80&w=600&auto=format&fit=crop'];

    const isLost = pet.isLost || pet.status?.toUpperCase() === 'LOST';
    let images: string[] = [];

    // 2. Xử lý ảnh Lost (từ lostPhotos)
    if (isLost && pet.lostPhotos) {
      try {
        const parsed = JSON.parse(pet.lostPhotos);
        if (Array.isArray(parsed)) {
          images = parsed.filter(url => typeof url === 'string' && url.trim() !== '');
        }
      } catch (e) {
        console.warn("Lỗi parse lostPhotos:", e);
      }
    }

    // 3. Nếu không có ảnh Lost, xử lý ảnh mặc định (từ pet.images)
    if (images.length === 0) {
      const imagesArray = Array.isArray(pet.images) ? pet.images : [];
      images = imagesArray
        .map((img: any) => (typeof img === 'string' ? img : img?.url))
        .filter((url: any) => typeof url === 'string' && url.trim() !== '');
    }

    // 4. Nếu pet.image là string đơn lẻ (fallback cho dữ liệu cũ)
    if (images.length === 0 && typeof pet.image === 'string' && pet.image.trim() !== '') {
      images = [pet.image];
    }

    // 5. Fallback cuối cùng
    return images.length > 0
      ? images
      : ['https://images.unsplash.com/photo-1552053831-71594a27632d?q=80&w=600&auto=format&fit=crop'];
  }, [pet]);
  const calculateAgeDisplay = (dob: string | Date | undefined | null): string => {
    if (!dob) return 'Unknown age';

    const birthDate = new Date(dob);
    // Validate date hợp lệ
    if (isNaN(birthDate.getTime())) return 'Unknown age';

    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();

    if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
      years--;
      months += 12;
    }

    if (years > 0) return `${years} year${years > 1 ? 's' : ''} old`;
    if (months > 0) return `${months} month${months > 1 ? 's' : ''} old`;
    return 'Less than 1 month old';
  };


  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchPetData = async () => {
        try {
          setLoading(true);
          setHasReported(false);
          setCurrentImageIndex(0);

          const response = await axiosClient.get(`/tags/${tagId}/scan?t=${Date.now()}`);

          if (!isActive) return;

          const petData = response.data;

          // DEBUG - xóa sau khi fix xong
          console.log('=== PET DATA RAW ===', JSON.stringify(petData, null, 2));
          console.log('=== DOB VALUE ===', petData?.dob);
          console.log('=== AGE VALUE ===', petData?.age);
          console.log('=== DOB TYPE ===', typeof petData?.dob);
          console.log(petData.owner);

          setShelterData(petData.owner);
          setPet(petData);


          const isPetLost = petData.isLost || petData.status?.toUpperCase() === 'LOST';

          if (isPetLost) {
            setTimeout(() => {
              if (isActive) setIsModalVisible(true);
            }, 500);
          }
        } catch (error: any) {
          if (isActive) setPet(null);
        } finally {
          if (isActive) setLoading(false);
        }
      };

      if (tagId) fetchPetData();

      return () => {
        isActive = false;
      };
    }, [tagId])
  );


  const handleShareLocation = async (location: any, formData: FormData, isSkipped: boolean) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const finalTagId = Array.isArray(tagId) ? tagId[0] : tagId;
      const lat = location?.latitude || null;
      const lng = location?.longitude || null;
      const radius = location?.radius || null;

      const payload = isSkipped ? {
        tagId: finalTagId,
        latitude: lat,
        longitude: lng,
        radius: radius,
      } : {
        tagId: finalTagId,
        scannedBy: formData.scannedBy.trim() || undefined,
        phoneNumber: formData.phoneNumber.trim(),
        message: formData.message.trim() || undefined,
        latitude: lat,
        longitude: lng,
        radius: radius,
      };

      await axiosClient.post('/tags/report', payload);

      setIsModalVisible(false);
      setHasReported(true);

      if (!isSkipped) {
        Alert.alert(
          'Thành công',
          'Đã gửi thông báo cùng vị trí GPS của bạn đến ứng dụng của chủ thú cưng!',
          [{ text: 'Đóng' }]
        );
      } else {
        Alert.alert('Đã báo cáo', 'Vị trí ẩn danh đã được ghi nhận.');
      }
    } catch (error: any) {
      const errorData = error.response?.data;
      const serverMsg = errorData?.message;
      const displayMsg = Array.isArray(serverMsg) ? serverMsg.join('\n') : serverMsg;
      Alert.alert('Gửi thất bại', displayMsg || 'Không thể gửi thông báo. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCallOwner = () => {
    if (pet?.owner?.phone) {
      Linking.openURL(`tel:${pet.owner.phone}`);
    } else {
      Alert.alert('Lỗi', 'Không tìm thấy số điện thoại của chủ nhân.');
    }
  };

  const onImageScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
    setCurrentImageIndex(index);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#ffa053" />
        <Text className="text-gray-500 font-medium mt-4">Đang kiểm tra vòng cổ...</Text>
      </View>
    );
  }

  if (!pet) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-6">
        <AntDesign name="close" size={60} color="#F43F5E" />
        <Text className="text-2xl font-bold text-gray-800 mt-4 text-center">Không tìm thấy</Text>
        <Text className="text-gray-500 text-center mt-2 mb-8">
          Mã QR này không hợp lệ hoặc vòng cổ chưa được đăng ký trên hệ thống.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/')}
          className="bg-gray-100 px-8 py-3 rounded-full"
        >
          <Text className="text-gray-700 font-bold">Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isLost = pet.isLost || pet.status?.toUpperCase() === 'LOST';
  const rawDob = pet?.dob
    ?? pet?.birthDate
    ?? pet?.birthday
    ?? pet?.dateOfBirth
    ?? null;

  const displayAge = calculateAgeDisplay(rawDob);



  const displayOwnerName = pet?.lostInfo?.ownerName || pet?.ownerName || pet?.owner?.name || 'Unknown Owner';
  const displayOwnerPhone = pet?.lostInfo?.ownerPhone || pet?.ownerPhone || pet?.owner?.phone || null;
  const displayOwnerAddress = pet?.lostInfo?.ownerAddress || pet?.ownerAddress || pet?.owner?.address || 'No address provided';
  const displayNote = pet?.lostInfo?.note || pet?.note || "Please contact me ASAP";






  const lostImageWidth = width - 40;
  const safeImageWidth = width - 48;

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      <View className="absolute top-12 right-6 z-40">
        <TouchableOpacity
          onPress={() => router.replace('/')}
          className="w-8 h-8 items-center justify-center"
        >
          <Image
            source={require('../../assets/icon/close.png')}
            style={{ width: 10, height: 10 }}
            resizeMode="cover"
          />
        </TouchableOpacity>
      </View>
      <View className="w-full h-20 mx-auto" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

        {/* --- 1. HERO IMAGE SECTION --- */}
        {isLost ? (
          <View className="px-5 pt-4">
            <View className="bg-white rounded-[32px] z-10"
              style={{
                shadowColor: '#E89B5A',
                shadowOffset: { width: 4, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 4,
                elevation: 3,
              }}>

              <View className="relative rounded-[24px] overflow-hidden bg-gray-200 " style={{
                height: 210, shadowColor: '#000', shadowOffset: { width: 10, height: 10 },
                shadowOpacity: 0.6, shadowRadius: 15, elevation: 4,
              }}>

                {/* --- SLIDER ẢNH --- */}
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={onImageScroll}
                  style={{ width: '100%', height: 210 }}
                >
                  {displayImages.map((uri, index) => (
                    <ImageWithLoading key={`lost-${index}`} uri={uri} imgWidth={lostImageWidth} />
                  ))}
                </ScrollView>

                {/* Dấu chấm (Pagination Dots) đè lên ảnh */}
                {displayImages.length > 1 && (
                  <View className="absolute bottom-[90px] w-full flex-row justify-center z-20" pointerEvents="none">
                    {displayImages.map((_, index) => (
                      <View
                        key={index}
                        className={`h-1.5 rounded-full mx-1 transition-all ${index === currentImageIndex ? 'w-4 bg-[#E89B5A]' : 'w-1.5 bg-white/70'}`}
                      />
                    ))}
                  </View>
                )}

                {/* Overlays LinearGradient */}
                <View pointerEvents="none" className="bottom-0 left-0 right-0 h-[105px] w-full absolute rounded-2xl overflow-hidden items-center justify-center z-10">
                  <LinearGradient
                    colors={['rgba(232, 155, 90, 0.8)', 'transparent']}
                    start={{ x: 0.5, y: 1 }} end={{ x: 0.5, y: 0 }}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                  />
                </View>

                {/* Badge Lost */}
                <View className="absolute top-5 right-5 bg-[#E89B5A] px-4 py-1 rounded-full z-20" pointerEvents="none">
                  <Text className="text-white font-extrabold text-[16px] tracking-[0.5px] leading-5 uppercase">Lost</Text>
                </View>

                {/* Tên & Tuổi thú cưng */}
                <View className="absolute bottom-0 left-0 right-0 mb-4 items-center z-20" pointerEvents="none">
                  <Text className="text-white text-[24px] font-bold text-center capitalize mb-2">
                    {pet?.name?.toLowerCase() || 'pet'}
                  </Text>
                  <Text className="text-white text-[14px] font-regular text-center tracking-[0.5px]">
                    {displayAge !== 'Unknown' ? `${displayAge}` : 'Age unknown'} • {pet?.breed || 'Unknown breed'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          /* TRẠNG THÁI SAFE (KHÔNG BÁO MẤT) */
          <View className="pt-4 px-6">
            <View className="bg-white rounded-[32px]" style={{
              shadowColor: '#000000',
              shadowOffset: { width: 4, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 5,
              elevation: 3,
            }}>
              <View className="w-full rounded-[24px] overflow-hidden shadow-lg shadow-black/10 bg-gray-200" style={{ height: 210 }}>
                {/* --- SLIDER ẢNH --- */}
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={onImageScroll}
                  style={{ width: '100%', height: 210 }}
                >
                  {displayImages.map((uri, index) => (
                    <ImageWithLoading key={`safe-${index}`} uri={uri} imgWidth={safeImageWidth} />
                  ))}
                </ScrollView>

                {/* Dấu chấm (Pagination Dots) đè lên ảnh */}
                {displayImages.length > 1 && (
                  <View className="absolute bottom-3 w-full flex-row justify-center z-20" pointerEvents="none">
                    {displayImages.map((_, index) => (
                      <View
                        key={index}
                        className={`h-1.5 rounded-full mx-1 transition-all ${index === currentImageIndex ? 'w-4 bg-[#E89B5A]' : 'w-1.5 bg-white/50'}`}
                      />
                    ))}
                  </View>
                )}
              </View>
            </View>
            <View className='items-center'>
              <Text className="text-[24px] font-medium text-gray-800 py-5">Meet {pet?.name}!</Text>
            </View>
          </View>
        )}

        {/* --- 2. INFORMATION BODY --- */}
        <View className="px-5">
          {isLost ? (
            <View className="bg-white">
              <Text className="text-[18px] font-semibold text-[#AB5C1A] my-[21px]">Owner Information</Text>
              <View className="flex justify-center items-center mb-4">
                <View className='bg-white border w-full border-[#E89B5A] rounded-[16px] px-4 pt-[21px] pb-[23.15px]'>
                  <View className="space-y-5 mx-4">
                    <View className="flex-row gap-4 pb-[12.15px]">
                      <View className="justify-center mb-5 bottom-1">
                        <Image
                          source={require('../../assets/icon/person.png')}
                          style={{ width: 16, height: 16 }}
                          resizeMode="cover"
                        />
                      </View>
                      <View className="flex-1 justify-center">
                        <Text className="text-[#AB5C1A] text-[16px] font-semibold leading-[16px] mb-[7px]">Owner Name</Text>
                        <Text className="text-[#8E8E93] text-[14px] font-regular leading-[16px]">{displayOwnerName}</Text>
                      </View>
                    </View>

                    {displayOwnerPhone && (
                      <View className="flex-row gap-4 pb-[12.15px]">
                        <View className="justify-center mb-5 bottom-1">
                          <Image
                            source={require('../../assets/icon/phone.png')}
                            style={{ width: 16, height: 16 }}
                            resizeMode="cover"
                          />
                        </View>
                        <View className="flex-1 justify-center">
                          <Text className="text-[#AB5C1A] text-[16px] font-semibold  leading-[16px] mb-[7px]">Phone Number</Text>
                          <Text className="text-[#8E8E93] text-[14px] font-regular mt leading-[16px]">{displayOwnerPhone}</Text>
                        </View>
                      </View>
                    )}

                    <View className="flex-row gap-4 pb-[12.15px]">
                      <View className="justify-center mb-5 bottom-1">
                        <Image
                          source={require('../../assets/icon/address-marker.png')}
                          style={{ width: 18, height: 18 }}
                          resizeMode="cover"
                        />
                      </View>
                      <View className="flex-1 justify-center -mx-1">
                        <Text className="text-[#AB5C1A] text-[16px] font-semibold leading-[16px] mb-[7px]">Address</Text>
                        <Text className="text-[#8E8E93] text-[14px] font-regular leading-[16px]">
                          {displayOwnerAddress}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                <View className="flex items-center w-4/5 bg-[#FFF8F5] px-2.5 rounded-full border border-[#E89B5A] bottom-5">
                  <Text className="text-[#AB5C1A] text-[14px] text-center font-regular leading-[20px] py-[6px]">
                    {displayNote}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View className='flex justify-center items-center'>
              <View className="bg-white border border-[#D9D9D9] rounded-[16px] px-7 pt-5 pb-9">
                <View className="flex-row justify-between gap-2 mb-7">
                  <View className="w-1/2">
                    <Text className="font-medium text-[16px] mb-[12.5px]" >Gender</Text>
                    <Text className="text-[#8E8E93] font-regular text-[14px] capitalize">{pet.gender?.toLowerCase() || 'Unknown'}</Text>
                  </View>
                  <View className="w-1/2">
                    <Text className="font-medium text-[16px] mb-[12.5px] ">Breed</Text>
                    <Text className="text-[#8E8E93] font-regular text-[14px]">{pet.breed}</Text>
                  </View>
                </View >
                <View className="flex-row justify-between items-center gap-2">
                  <View className="w-1/2">
                    <Text className="font-medium text-[16px] mb-[12.5px]" >Color</Text>
                    <Text className="text-[#8E8E93] font-regular text-[14px] capitalize">{pet.color?.toLowerCase() || 'Unknown'}</Text>
                  </View>
                  <View className="w-1/2">
                    <Text className="font-medium text-[16px] mb-[12.5px]" >Birthday</Text>
                    <Text className="text-[#8E8E93] font-regular text-[14px]">July 12, 2020</Text>
                  </View>
                </View >
              </View>

              <View className="flex items-center w-4/5 bg-[#FAFAFA] px-2.5 py-[6px] rounded-full border border-[#D9D9D9] bottom-5" >
                <Text className="text-[#757575] text-[14px] font-regular leading-5">
                  This pet is safe and sound with their owner
                </Text>
              </View>
            </View>
          )}

          {/* --- 3. BOTTOM ACTIONS --- */}
          <View className="-mt-4 mb-5">
            {isLost ? (
              <View className="gap-3">
                <TouchableOpacity
                  onPress={() => setIsContactModalVisible(true)}
                  className="w-full bg-[#E89B5A] py-4 rounded-2xl flex-row justify-center items-center"
                >
                  <Image
                    source={require('../../assets/icon/phone-white.png')}
                    style={{ width: 16, height: 16 }}
                    resizeMode="cover"
                  />
                  <Text className="text-white font-semibold text-[16px] ml-2">Contact Owner</Text>
                </TouchableOpacity>

                {!hasReported && (
                  <TouchableOpacity
                    onPress={() => setIsModalVisible(true)}
                    className="w-full border border-[#E5E5E5] py-4 rounded-2xl flex-row justify-center items-center"
                  >
                    <Image
                      source={require('../../assets/icon/location-gray.png')}
                      style={{ width: 10, height: 14 }}
                      resizeMode="cover"
                      className='bottom-[2px]'
                    />
                    <Text className="text-[#8E8E93] font-medium text-[16px] leading-5 ml-2">Share My Location</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View className="bg-[#FAFAFA] w-full px-9 py-[13px] rounded-[16px] border border-[#D9D9D9] items-center mt-5">
                <Text className="text-center text-[#757575] font-regular text-[14px] leading-6 tracking-[0.5px] ">
                  For privacy, owner’s contact information is only available when a pet is marked as lost.
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={() => setIsReportVisible(true)}
            className="items-center justify-center">
            <Text className="text-center text-[#8E8E93] text-[14px] font-regular leading-13 underline">
              Something isn't right? Report here
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ShelterContactModal
        isVisible={isContactModalVisible}
        onClose={() => setIsContactModalVisible(false)}
        shelterData={shelterData}
      />

      <ReportIssueModal
        isVisible={isReportVisible}
        onClose={() => setIsReportVisible(false)}
      />

      <LostModeShareModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onConfirm={handleShareLocation}
      />
    </View>
  );
}