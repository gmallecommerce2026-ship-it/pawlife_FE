import axiosClient from '@/api/axiosClient';
import { Text } from '@/components/AppText';
import { displayBilingual, parseBilingual } from '@/utils/bilingualField';
import { AntDesign, Feather } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  ScrollView,
  TouchableOpacity,
  View
} from 'react-native';

import LostModeShareModal, { FormData } from '@/components/LostModeShareModal';
import ReportIssueModal from '@/components/ReportIssueModal';
import ShelterContactModal from '@/components/ShelterContactModal';

// Bổ sung import LanguageContext
import { AuthContext } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LinearGradient } from 'expo-linear-gradient';
import { FlatList } from 'react-native';
const { width: SCREEN_W } = Dimensions.get('window');

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

const ImageViewerOverlay = ({
  images,
  isVisible,
  initialIndex = 0,
  onClose,
}: {
  images: string[];
  isVisible: boolean;
  initialIndex?: number;
  onClose: () => void;
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (isVisible) setCurrentIndex(initialIndex);
  }, [isVisible, initialIndex]);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setCurrentIndex(viewableItems[0].index);
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  if (!isVisible || !images || images.length === 0) return null;

  return (
    <Modal visible={isVisible} transparent animationType="fade">
      <View className="flex-1 bg-black">
        <View
          className="flex-row items-center justify-end px-4 py-2 z-50 absolute left-0 right-0"
          style={{ top: 50 }}
        >
          <TouchableOpacity
            onPress={onClose}
            className="p-2 bg-black/40 rounded-full"
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Feather name="x" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <FlatList
          ref={listRef}
          data={images}
          keyExtractor={(_, index) => index.toString()}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({ length: SCREEN_W, offset: SCREEN_W * index, index })}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          renderItem={({ item }) => (
            <View style={{ width: SCREEN_W, height: '100%' }}>
              <Image
                source={{ uri: item }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
              />
            </View>
          )}
        />

        {images.length > 1 && (
          <View
            style={{
              position: 'absolute',
              bottom: 40,
              left: 0,
              right: 0,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 6,
              zIndex: 10,
            }}
          >
            {images.map((_, index) => (
              <View
                key={index}
                className={`h-2 rounded-full ${currentIndex === index ? 'w-6 bg-white' : 'w-2 bg-white/60'}`}
              />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
};

export default function ScannedPetScreen() {
  const router = useRouter();
  const { tagId } = useLocalSearchParams();

  // Khởi tạo các biến ngôn ngữ
  const { t, language } = useLanguage();
  const isVi = language === 'vi';

  const { user } = useContext(AuthContext) as any;
  const [pet, setPet] = useState<any>(null);
  const isOwner = React.useMemo(() => {
    if (!user || !pet) return false;
    return user.id === pet.ownerId || user.id === pet.owner?.id;
  }, [user, pet]);
  const [loading, setLoading] = useState(true);
  const [isContentBlocked, setIsContentBlocked] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [hasReported, setHasReported] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReportVisible, setIsReportVisible] = useState(false);
  const [shelterData, setShelterData] = useState<any>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isContactModalVisible, setIsContactModalVisible] = useState(false);
  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const handleOpenViewer = (index: number) => {
    setViewerIndex(index);
    setIsViewerVisible(true);
  };

  // Xác định xem người đang cầm máy quét có phải là chủ không
  const displayImages = React.useMemo(() => {
    if (!pet) return ['https://images.unsplash.com/photo-1552053831-71594a27632d?q=80&w=600&auto=format&fit=crop'];

    const isLost = pet.isLost || pet.status?.toUpperCase() === 'LOST';

    // 2. Xử lý ảnh gốc (Avatar / Ảnh thông thường) trước
    let originalImages: string[] = [];
    const imagesArray = Array.isArray(pet.images) ? pet.images : [];
    originalImages = imagesArray
      .map((img: any) => (typeof img === 'string' ? img : img?.url))
      .filter((url: any) => typeof url === 'string' && url.trim() !== '');

    if (originalImages.length === 0 && typeof pet.image === 'string' && pet.image.trim() !== '') {
      originalImages = [pet.image];
    }

    let combinedImages = [...originalImages];

    // 3. Xử lý nối tiếp ảnh báo lạc (Lost Photos) nếu đang ở trạng thái Lost
    // Thử lần lượt các key có thể có từ BE, và chịu được cả 2 dạng: mảng sẵn hoặc chuỗi JSON.
    if (isLost) {
      const rawLostPhotos =
        pet.lostPhotos ?? pet.photos ?? pet.lostInfo?.photos ?? null;

      let lostImages: string[] = [];

      if (Array.isArray(rawLostPhotos)) {
        // BE trả về mảng thuần (Prisma Json field đã tự parse sẵn)
        lostImages = rawLostPhotos.filter(
          (url: any) => typeof url === 'string' && url.trim() !== ''
        );
      } else if (typeof rawLostPhotos === 'string' && rawLostPhotos.trim() !== '') {
        // BE trả về chuỗi JSON thô
        try {
          const parsed = JSON.parse(rawLostPhotos);
          if (Array.isArray(parsed)) {
            lostImages = parsed.filter(
              (url: any) => typeof url === 'string' && url.trim() !== ''
            );
          }
        } catch (e) {
          console.warn(isVi ? "Lỗi parse lostPhotos:" : "Error parsing lostPhotos:", e, rawLostPhotos);
        }
      }

      // Nối ảnh lost vào SAU ảnh avatar/ảnh gốc, loại trùng nếu ảnh lost trùng ảnh gốc
      const dedupedLostImages = lostImages.filter((url) => !combinedImages.includes(url));
      combinedImages = [...combinedImages, ...dedupedLostImages];
    }

    // 4. Trả về mảng đã kết hợp hoặc fallback
    return combinedImages.length > 0
      ? combinedImages
      : ['https://images.unsplash.com/photo-1552053831-71594a27632d?q=80&w=600&auto=format&fit=crop'];
  }, [pet, isVi]);




  const calculateAgeDisplay = (dob: string | Date | undefined | null): string => {
    if (!dob) return isVi ? 'Không rõ tuổi' : 'Unknown age';

    const birthDate = new Date(dob);
    // Validate date hợp lệ
    if (isNaN(birthDate.getTime())) return isVi ? 'Không rõ tuổi' : 'Unknown age';

    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();

    if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
      years--;
      months += 12;
    }

    if (years > 0) return isVi ? `${years} tuổi` : `${years} year${years > 1 ? 's' : ''} old`;
    if (months > 0) return isVi ? `${months} tháng tuổi` : `${months} month${months > 1 ? 's' : ''} old`;
    return isVi ? 'Dưới 1 tháng tuổi' : 'Less than 1 month old';
  };

  const formatBirthday = (dob: string | Date | undefined | null): string => {
    if (!dob) return isVi ? 'Không rõ' : 'Unknown';
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return isVi ? 'Không rõ' : 'Unknown';
    return birthDate.toLocaleDateString(isVi ? 'vi-VN' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchPetData = async () => {
        console.log("Fetching pet for tagId:", tagId);
        try {
          setLoading(true);
          setHasReported(false);
          setCurrentImageIndex(0);

          const response = await axiosClient.get(`/tags/${tagId}/scan?t=${Date.now()}`);
          console.log("API Response:", response.data);
          if (!isActive) return;

          const petData = response.data;

          setShelterData(petData.owner);
          setPet(petData);

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
        images: formData.images || undefined,
      };

      await axiosClient.post('/tags/report', payload);

      setIsModalVisible(false);
      setHasReported(true);

      if (!isSkipped) {
        Alert.alert(
          isVi ? 'Thành công' : 'Success',
          isVi ? 'Đã gửi thông báo cùng vị trí GPS của bạn đến ứng dụng của chủ thú cưng!' : 'Successfully sent notification with your GPS location to the pet owner!',
          [{ text: isVi ? 'Đóng' : 'Close' }]
        );
      } else {
        Alert.alert(
          isVi ? 'Đã báo cáo' : 'Reported',
          isVi ? 'Vị trí ẩn danh đã được ghi nhận.' : 'Anonymous location has been recorded.'
        );
      }
    } catch (error: any) {
      const errorData = error.response?.data;
      const serverMsg = errorData?.message;
      const displayMsg = Array.isArray(serverMsg) ? serverMsg.join('\n') : serverMsg;
      Alert.alert(
        isVi ? 'Gửi thất bại' : 'Failed to send',
        displayMsg || (isVi ? 'Không thể gửi thông báo. Vui lòng thử lại sau.' : 'Cannot send notification. Please try again later.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCallOwner = () => {
    if (pet?.owner?.phone) {
      Linking.openURL(`tel:${pet.owner.phone}`);
    } else {
      Alert.alert(
        isVi ? 'Lỗi' : 'Error',
        isVi ? 'Không tìm thấy số điện thoại của chủ nhân.' : 'Owner phone number not found.'
      );
    }
  };
  const [sliderWidth, setSliderWidth] = useState(width - 40);
  const onImageScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
    setCurrentImageIndex(index);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#ffa053" />
        <Text className="text-gray-500 font-medium mt-4">{isVi ? 'Đang tải...' : 'Loading...'}</Text>
      </View>
    );
  }

  if (!pet) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-6">
        <AntDesign name="close" size={60} color="#F43F5E" />
        <Text className="text-2xl font-bold text-gray-800 mt-4 text-center">
          {isVi ? 'Không tìm thấy' : 'Not found'}
        </Text>
        <Text className="text-gray-500 text-center mt-2 mb-8">
          {isVi ? 'Mã QR này không hợp lệ hoặc vòng cổ chưa được đăng ký trên hệ thống.' : 'This QR code is invalid or the collar has not been registered on the system.'}
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/')}
          className="bg-gray-100 px-8 py-3 rounded-full"
        >
          <Text className="text-gray-700 font-bold">{isVi ? 'Quay lại' : 'Go back'}</Text>
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

  const displayOwnerName = pet?.lostInfo?.ownerName || pet?.ownerName || pet?.owner?.name || (isVi ? 'Không rõ chủ nhân' : 'Unknown Owner');
  const displayOwnerPhone = pet?.lostInfo?.ownerPhone || pet?.ownerPhone || pet?.owner?.phone || null;
  const displayOwnerAddress = pet?.lostInfo?.ownerAddress || pet?.ownerAddress || pet?.owner?.address || (isVi ? 'Chưa cung cấp địa chỉ' : 'No address provided');

  // SỬA Ở ĐÂY: Xử lý an toàn cho note (phòng trường hợp BE trả về object đa ngôn ngữ {vi, en})
  const rawNote = pet?.lostInfo?.note || pet?.note;
  const displayNote = rawNote
    ? (typeof rawNote === 'object' ? displayBilingual(parseBilingual(rawNote), isVi) : rawNote)
    : (isVi ? 'Vui lòng liên hệ tôi sớm nhất' : 'Please contact me ASAP');


  const handleReportSubmit = async (reason: string, details: string, isBlockRequested: boolean) => {
    try {
      // Nếu chưa đăng nhập thì hiện thông báo yêu cầu đăng nhập ở đây

      await axiosClient.post('/interactions/report-and-block', {
        petId: pet.id,
        reason,
        details,
        isBlockRequested
      });

      setIsReportVisible(false);

      // NẾU CÓ BLOCK -> ĐỔI UI NGAY LẬP TỨC TRẢI NGHIỆM CỰC MƯỢT
      if (isBlockRequested) {
        setIsContentBlocked(true);
      } else {
        Alert.alert(
          isVi ? "Đã ghi nhận" : "Reported",
          isVi ? "Cảm ơn bạn đã báo cáo. Chúng tôi sẽ xem xét sớm nhất." : "Thank you for reporting. We will review it shortly."
        );
      }
    } catch (error) {
      Alert.alert("Error", "Could not submit report.");
    }
  };

  if (isContentBlocked) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-6">
        <StatusBar style="dark" />
        <View className="absolute top-12 left-6 z-40">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Feather name="chevron-left" size={24} color="#000000" />
          </TouchableOpacity>
        </View>

        <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-6">
          <Feather name="eye-off" size={32} color="#8E8E93" />
        </View>

        <Text className="text-xl font-bold text-gray-800 mt-4 text-center">
          {isVi ? 'Nội dung đã bị ẩn' : 'Content Hidden'}
        </Text>
        <Text className="text-gray-500 text-center mt-3 mb-8 px-4 leading-6">
          {isVi
            ? 'Bạn đã chặn nội dung từ người dùng này. Chúng tôi đã ghi nhận báo cáo và sẽ xem xét kĩ lưỡng.'
            : 'You have blocked content from this user. We have received your report and will review it.'}
        </Text>

        <TouchableOpacity
          onPress={() => router.replace('/')}
          className="bg-[#E89B5A] px-8 py-3.5 rounded-full shadow-sm"
        >
          <Text className="text-white font-bold text-[16px]">
            {isVi ? 'Về trang chủ' : 'Return Home'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }
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
        Đúng rồi, nhìn vào file bạn gửi thì thấy bạn đã copy nhầm — cả 2 nhánh isLost và safe đều đang dùng chung bản "safe" (không có gradient overlay, badge "Lost", tên/tuổi/giống đè lên ảnh). Phần đó bị mất hoàn toàn ở nhánh isLost.
        Sửa lại đúng nhánh isLost (thay toàn bộ block hiện tại của nó):
        tsx{isLost ? (
          <View className="px-5 pt-4">
            <View className="bg-white rounded-[32px] z-10"
              style={{
                shadowColor: '#E89B5A',
                shadowOffset: { width: 4, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 4,
                elevation: 3,
              }}>

              <View
                onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}
                className="relative rounded-[24px] overflow-hidden bg-gray-200"
                style={{
                  height: 210, shadowColor: '#000', shadowOffset: { width: 10, height: 10 },
                  shadowOpacity: 0.6, shadowRadius: 15, elevation: 4,
                }}
              >
                {/* --- SLIDER ẢNH (bấm để mở fullscreen) --- */}
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={onImageScroll}
                  style={{ width: '100%', height: 210 }}
                >
                  {displayImages.map((uri, index) => (
                    <TouchableOpacity
                      key={`lost-${index}`}
                      activeOpacity={0.9}
                      onPress={() => handleOpenViewer(index)}
                      style={{ width: sliderWidth, height: 210 }}
                    >
                      <ImageWithLoading uri={uri} imgWidth={sliderWidth} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>

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
                  <Text className="text-white font-extrabold text-[16px] tracking-[0.5px] leading-5 uppercase">
                    {isVi ? 'Thất lạc' : 'Lost'}
                  </Text>
                </View>

                {/* Tên & Tuổi thú cưng — đẩy lên chút để chừa chỗ cho dot bên dưới */}
                <View className="absolute bottom-0 left-0 right-0 mb-[26px] items-center z-20" pointerEvents="none">
                  <Text className="text-white text-[24px] font-bold text-center capitalize mb-2">
                    {pet?.name?.toLowerCase() || (isVi ? 'thú cưng' : 'pet')}
                  </Text>
                  <Text className="text-white text-[14px] font-regular text-center tracking-[0.5px]">
                    {displayAge !== (isVi ? 'Không rõ tuổi' : 'Unknown age') ? `${displayAge}` : (isVi ? 'Không rõ tuổi' : 'Age unknown')} • {displayBilingual(parseBilingual(pet?.breed), isVi) || (isVi ? 'Không rõ giống' : 'Unknown breed')}
                  </Text>
                </View>

                {/* Dấu chấm (Pagination Dots) — dời XUỐNG DƯỚI CÙNG, dưới cả tên/tuổi/giống, gọn lại */}
                {displayImages.length > 1 && (
                  <View className="absolute bottom-[8px] w-full flex-row justify-center items-center z-20" pointerEvents="none">
                    {displayImages.map((_, index) => (
                      <View
                        key={index}
                        className={`h-[5px] rounded-full mx-[2px] ${index === currentImageIndex ? 'w-[14px] bg-[#E89B5A]' : 'w-[5px] bg-white/70'}`}
                      />
                    ))}
                  </View>
                )}
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
              <View
                onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}
                className="w-full rounded-[24px] overflow-hidden shadow-lg shadow-black/10 bg-gray-200"
                style={{ height: 210 }}
              >
                {/* --- SLIDER ẢNH --- */}
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={onImageScroll}
                  style={{ width: '100%', height: 210 }}
                >
                  {displayImages.map((uri, index) => (
                    // THAY imgWidth THÀNH sliderWidth
                    <ImageWithLoading key={`safe-${index}`} uri={uri} imgWidth={sliderWidth} />
                  ))}
                </ScrollView>

                {/* Dấu chấm (Pagination Dots) đè lên ảnh */}
                {displayImages.length > 1 && (
                  <View className="absolute bottom-[8px] w-full flex-row justify-center items-center z-20" pointerEvents="none">
                    {displayImages.map((_, index) => (
                      <View
                        key={index}
                        className={`h-[5px] rounded-full mx-[2px] ${index === currentImageIndex ? 'w-[14px] bg-[#E89B5A]' : 'w-[5px] bg-white/70'}`}
                      />
                    ))}
                  </View>
                )}
              </View>
            </View>
            <View className='items-center'>
              <Text className="text-[24px] font-medium text-gray-800 py-5">
                {isVi ? `Bé ${pet?.name} nè!` : `Meet ${pet?.name}!`}
              </Text>
            </View>
          </View>
        )}

        {/* --- 2. INFORMATION BODY --- */}
        <View className="px-5">
          {isLost ? (
            <View className="bg-white">
              <Text className="text-[18px] font-semibold text-[#AB5C1A] my-[21px]">
                {isVi ? 'Thông tin chủ nhân' : 'Owner Information'}
              </Text>
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
                        <Text className="text-[#AB5C1A] text-[16px] font-semibold leading-[16px] mb-[7px]">
                          {isVi ? 'Tên chủ nhân' : 'Owner Name'}
                        </Text>
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
                          <Text className="text-[#AB5C1A] text-[16px] font-semibold  leading-[16px] mb-[7px]">
                            {isVi ? 'Số điện thoại' : 'Phone Number'}
                          </Text>
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
                        <Text className="text-[#AB5C1A] text-[16px] font-semibold leading-[16px] mb-[7px]">
                          {isVi ? 'Địa chỉ' : 'Address'}
                        </Text>
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
                    <Text className="font-medium text-[16px] mb-[12.5px]">{isVi ? 'Giới tính' : 'Gender'}</Text>
                    <Text className="text-[#8E8E93] font-regular text-[14px] capitalize">
                      {/* Ép kiểu an toàn cho gender tránh lỗi object */}
                      {typeof pet.gender === 'string' ? pet.gender.toLowerCase() : (isVi ? 'không rõ' : 'unknown')}
                    </Text>
                  </View>
                  <View className="w-1/2">
                    <Text className="font-medium text-[16px] mb-[12.5px] ">{isVi ? 'Giống' : 'Breed'}</Text>
                    <Text className="text-[#8E8E93] font-regular text-[14px]">
                      {/* Xử lý đa ngôn ngữ cho breed tương tự edit-pet */}
                      {displayBilingual(parseBilingual(pet.breed), isVi) || (isVi ? 'Không rõ' : 'Unknown')}
                    </Text>
                  </View>
                </View >
                <View className="flex-row justify-between items-center gap-2">
                  <View className="w-1/2">
                    <Text className="font-medium text-[16px] mb-[12.5px]">{isVi ? 'Màu sắc' : 'Color'}</Text>
                    <Text className="text-[#8E8E93] font-regular text-[14px] capitalize">
                      {/* Xử lý đa ngôn ngữ cho color và thêm Optional Chaining */}
                      {displayBilingual(parseBilingual(pet.color), isVi)?.toLowerCase() || (isVi ? 'không rõ' : 'unknown')}
                    </Text>
                  </View>
                  <View className="w-1/2">
                    <Text className="font-medium text-[16px] mb-[12.5px]">{isVi ? 'Ngày sinh' : 'Birthday'}</Text>
                    <Text className="text-[#8E8E93] font-regular text-[14px]">
                      {formatBirthday(rawDob)}
                    </Text>
                  </View>
                </View >
              </View>

              <View className="flex items-center w-4/5 bg-[#FAFAFA] px-2.5 py-[6px] rounded-full border border-[#D9D9D9] bottom-5" >
                <Text className="text-[#757575] text-[14px] text-center font-regular leading-5">
                  {isVi ? 'Thú cưng này đang an toàn bên chủ nhân' : 'This pet is safe and sound with their owner'}
                </Text>
              </View>
            </View>
          )}

          {/* --- 3. BOTTOM ACTIONS --- */}
          {/* --- 3. BOTTOM ACTIONS --- */}
          <View className="-mt-4 mb-5">
            {isOwner ? (
              // UX CHO CHỦ NHÂN (OWNER VIEW - PREVIEW MODE)
              <View className="gap-3">
                <View className="bg-blue-50 w-full px-5 py-3 rounded-[16px] border border-blue-100 items-center mb-2 mt-2">
                  <Text className="text-center text-blue-600 font-medium text-[14px] leading-5">
                    {isVi
                      ? 'Đây là góc nhìn của người khác khi quét mã thú cưng của bạn.'
                      : 'This is how others view your pet’s profile when scanning.'}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => router.push(`/edit-pet?id=${pet.id}`)}
                  className="w-full bg-[#E89B5A] py-4 rounded-2xl flex-row justify-center items-center shadow-sm"
                >
                  <Feather name="edit-2" size={16} color="white" />
                  <Text className="text-white font-semibold text-[16px] ml-2">
                    {isVi ? 'Chỉnh sửa hồ sơ' : 'Edit Profile'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : isLost ? (
              // UX CHO NGƯỜI LẠ KHI PET BỊ MẤT
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
                  <Text className="text-white font-semibold text-[16px] ml-2">
                    {isVi ? 'Liên hệ chủ nhân' : 'Contact Owner'}
                  </Text>
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
                      className="bottom-[2px]"
                    />
                    <Text className="text-[#8E8E93] font-medium text-[16px] leading-5 ml-2">
                      {isVi ? 'Chia sẻ vị trí của tôi' : 'Share My Location'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              // UX CHO NGƯỜI LẠ KHI PET AN TOÀN
              <View className="bg-[#FAFAFA] w-full px-9 py-[13px] rounded-[16px] border border-[#D9D9D9] items-center mt-5">
                <Text className="text-center text-[#757575] font-regular text-[14px] leading-6 tracking-[0.5px] ">
                  {isVi
                    ? 'Vì lý do bảo mật, thông tin liên hệ của chủ nhân chỉ hiển thị khi thú cưng bị báo mất.'
                    : 'For privacy, owner’s contact information is only available when a pet is marked as lost.'}
                </Text>
              </View>
            )}
          </View>

          {/* CHỈ HIỂN THỊ NÚT BÁO CÁO (REPORT) CHO NGƯỜI LẠ */}
          {!isOwner && (
            <TouchableOpacity
              onPress={() => setIsReportVisible(true)}
              className="items-center justify-center pt-2 pb-4"
            >
              <Text className="text-center text-[#8E8E93] text-[14px] font-regular leading-13 underline">
                {isVi ? 'Có gì đó không đúng? Báo cáo tại đây' : "Something isn't right? Report here"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
      <ImageViewerOverlay
        images={displayImages}
        isVisible={isViewerVisible}
        initialIndex={viewerIndex}
        onClose={() => setIsViewerVisible(false)}
      />
      {shelterData && (
        <ShelterContactModal
          isVisible={isContactModalVisible}
          onClose={() => setIsContactModalVisible(false)}
          shelterData={shelterData}
        />
      )}

      <ReportIssueModal
        isVisible={isReportVisible}
        onClose={() => setIsReportVisible(false)}
        onSubmit={async (data) => {
          try {
            await axiosClient.post('/interactions/report-and-block', {
              petId: pet.id,
              reason: data.reason,
              details: data.details,
              isBlockRequested: data.isBlockRequested,
            });
            if (data.isBlockRequested) setIsContentBlocked(true);
          } catch (error: any) {
            const msg = error.response?.data?.message;
            Alert.alert(
              isVi ? 'Lỗi' : 'Error',
              msg || (isVi ? 'Không thể gửi báo cáo. Vui lòng thử lại.' : 'Could not submit report. Please try again.')
            );
            throw error;
          }
        }}

      />

      <LostModeShareModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onConfirm={handleShareLocation}
      />
    </View>
  );
}