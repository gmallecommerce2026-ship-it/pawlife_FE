import { BASE_URL } from '@/api/axiosClient';
import { Text } from '@/components/AppText';
import { TextInput } from '@/components/AppTextInput';
import { useLanguage } from '@/contexts/LanguageContext';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as Sharing from 'expo-sharing';

import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Defs,
  Line,
  Path,
  Stop,
  LinearGradient as SvgLinearGradient,
  SvgUri,
} from 'react-native-svg';
import ViewShot from 'react-native-view-shot';
import { petService } from '../services/petService';
import { openWebLink } from '@/utils/browser';

const { width } = Dimensions.get('window');
const QR_SIZE = Math.min(width * 0.45, 170);

const SHADOW_OPACITY = 0.05;
const SHADOW_RADIUS = 8;
const ELEVATION = 3;
const CARD_WIDTH = 296;
const CARD_RADIUS = 24;
const CARD_NOTCH_RADIUS = 22;
const CARD_PADDING_X = 25;
const CARD_DIVIDER_Y = 321; // Tọa độ Y chuẩn xác cho nét đứt
const CARD_HEIGHT = Platform.OS === 'ios' ? 494 : 490;
interface RadioOptionProps {
  label: string;
  subLabel?: string;
  selected: boolean;
  onPress: () => void;
}

type TicketCardSvgProps = {
  width: number;
  height: number;
  borderRadius?: number;
  notchRadius?: number;
  dividerY: number;
};
const TicketCardSvg = ({
  width,
  height,
  borderRadius = 24,
  notchRadius = 14,
  dividerY,
}: TicketCardSvgProps) => {
  const left = 0;
  const top = 0;
  const right = width;
  const bottom = height;
  const safeDividerY = Math.max(
    borderRadius + notchRadius + 8,
    Math.min(dividerY, height - borderRadius - notchRadius - 8)
  );
  const notchTop = safeDividerY - notchRadius;
  const notchBottom = safeDividerY + notchRadius;
  const dividerInset = notchRadius + 10;
  const dividerStartX = dividerInset;
  const dividerEndX = width - dividerInset;
  const pathD = [
    `M ${left + borderRadius} ${top}`,
    `L ${right - borderRadius} ${top}`,
    `Q ${right} ${top} ${right} ${top + borderRadius}`,
    `L ${right} ${notchTop}`,
    `A ${notchRadius} ${notchRadius} 0 0 0 ${right} ${notchBottom}`,
    `L ${right} ${bottom - borderRadius}`,
    `Q ${right} ${bottom} ${right - borderRadius} ${bottom}`,
    `L ${left + borderRadius} ${bottom}`,
    `Q ${left} ${bottom} ${left} ${bottom - borderRadius}`,
    `L ${left} ${notchBottom}`,
    `A ${notchRadius} ${notchRadius} 0 0 0 ${left} ${notchTop}`,
    `L ${left} ${top + borderRadius}`,
    `Q ${left} ${top} ${left + borderRadius} ${top}`,
    `Z`,
  ].join(' ');
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height}>
        <Defs>
          <SvgLinearGradient id="ticketSurfaceHighlight" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <Stop offset="65%" stopColor="#FFFFFF" stopOpacity="1" />
            <Stop offset="100%" stopColor="#FCFCFD" stopOpacity="1" />
          </SvgLinearGradient>
          <SvgLinearGradient id="notchShadeLeft" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#000000" stopOpacity="0.12" />
            <Stop offset="45%" stopColor="#000000" stopOpacity="0.05" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </SvgLinearGradient>
          <SvgLinearGradient id="notchShadeRight" x1="1" y1="0" x2="0" y2="0">
            <Stop offset="0%" stopColor="#000000" stopOpacity="0.12" />
            <Stop offset="45%" stopColor="#000000" stopOpacity="0.05" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </SvgLinearGradient>
        </Defs>
        {/* Ticket body */}
        <Path d={pathD} fill="url(#ticketSurfaceHighlight)" />
        {/* Very subtle outer edge for crispness */}
        <Path d={pathD} fill="none" stroke="#F1F3F5" strokeWidth={1} />
        {/* Dashed divider integrated into the ticket */}
        <Line
          x1={dividerStartX}
          y1={safeDividerY}
          x2={dividerEndX}
          y2={safeDividerY}
          stroke="#E5E7EB"
          strokeWidth={1.5}
          strokeDasharray="5 5"
          strokeLinecap="round"
        />
        {/* Inner notch ambient occlusion */}
        <Path
          d={`M 0 ${notchTop} A ${notchRadius} ${notchRadius} 0 0 1 0 ${notchBottom}`}
          fill="none"
          stroke="url(#notchShadeLeft)"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <Path
          d={`M ${width} ${notchTop} A ${notchRadius} ${notchRadius} 0 0 0 ${width} ${notchBottom}`}
          fill="none"
          stroke="url(#notchShadeRight)"
          strokeWidth={3}
          strokeLinecap="round"
        />
        {/* Subtle notch highlight to keep edge premium */}
        <Path
          d={`M 0 ${notchTop + 1} A ${notchRadius - 1} ${notchRadius - 1} 0 0 1 0 ${notchBottom - 1}`}
          fill="none"
          stroke="rgba(255,255,255,0.65)"
          strokeWidth={1}
          strokeLinecap="round"
        />
        <Path
          d={`M ${width} ${notchTop + 1} A ${notchRadius - 1} ${notchRadius - 1} 0 0 0 ${width} ${notchBottom - 1}`}
          fill="none"
          stroke="rgba(255,255,255,0.65)"
          strokeWidth={1}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
};

export default function ViewQrCode() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const petId = params.id as string;
  const { language } = useLanguage();
  const isVi = language === 'vi';

  // --- STATE ---
  const [petData, setPetData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showQrOverlay, setShowQrOverlay] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [pendingReplace, setPendingReplace] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [replaceTag, setReplaceTag] = useState<string | null>(null);
  const [otherDetail, setOtherDetail] = useState('');
  const cardRef = useRef<ViewShot>(null);
  const RadioOption = ({ label, subLabel, selected, onPress }: RadioOptionProps) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      className="flex-row mb-4 mx-2"
      style={{
        alignItems: subLabel ? 'flex-start' : 'center',
      }}
    >
      <View
        className={`w-[16px] h-[16px] rounded-full border-[1px] items-center justify-center ${selected ? 'border-[#E89B5A]' : 'border-[#757575]'}`}
        style={{
          marginTop: subLabel ? 0 : 0,
        }}
      >
        {selected && <View className="w-[10px] h-[10px] rounded-full bg-[#E89B5A]" />}
      </View>

      <View
        className="ml-2"
        style={{
          flexShrink: 1,
        }}
      >
        <Text
          className="text-[14px] font-medium text-black"
          style={{
            lineHeight: 16,
            includeFontPadding: false,
            textAlignVertical: 'center',
          }}
        >
          {label}
        </Text>

        {subLabel && (
          <Text
            className="text-[12px] text-gray-400 mt-0.5"
            style={{
              lineHeight: 14,
              includeFontPadding: false,
            }}
          >
            {subLabel}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
  const handleShareCard = async () => {
    try {
      if (!cardRef.current || !cardRef.current.capture) {
        return;
      }

      // Đợi rendering ổn định rồi mới chụp (đảm bảo ảnh avatar và QR đã load xong)
      const uri = await cardRef.current.capture();

      // Sử dụng expo-sharing để tương thích tốt nhất cho cả iOS và Android khi chia sẻ file ảnh
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: isVi ? `Chia sẻ thẻ của ${petData?.name}` : `Share ${petData?.name}'s card`,
        });
      } else {
        Alert.alert(
          isVi ? 'Lỗi' : 'Error',
          isVi ? 'Thiết bị không hỗ trợ tính năng chia sẻ' : 'Sharing not supported on this device'
        );
      }
    } catch (error) {
      console.error('[handleShareCard] Error:', error);
      Alert.alert(
        isVi ? 'Lỗi' : 'Error',
        isVi ? 'Không thể tạo ảnh chia sẻ. Vui lòng thử lại.' : 'Unable to create share image. Please try again.'
      );
    }
  };
  useFocusEffect(
    useCallback(() => {
      const fetchPetDetail = async () => {
        if (!petId) { setIsLoading(false); return; }
        try {
          setIsLoading(true);
          const data = await petService.getPetById(petId);
          setPetData(data);
        } catch (error) {
          console.error("Lỗi khi tải thông tin thú cưng:", error);
          Alert.alert(
            isVi ? 'Lỗi' : 'Error',
            isVi ? 'Không thể tải thông tin chi tiết thú cưng.' : 'Unable to load pet details.'
          );
        } finally {
          setIsLoading(false);
        }
      };
      fetchPetDetail();
    }, [petId])
  );

  if (!petData) {
    return (
      <View className="flex-1 justify-center items-center bg-[#FAFAFA] px-4">
        <Feather name="alert-circle" size={64} color="#E5E7EB" />
        <Text className="text-gray-800 text-lg font-bold mt-4 text-center">
          {isVi ? 'Không tìm thấy thông tin thú cưng' : 'Pet information not found'}
        </Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-6 bg-orange-100 px-6 py-2 rounded-full">
          <Text className="text-orange-600 font-bold">
            {isVi ? 'Quay lại' : 'Go back'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1552053831-71594a27632d?q=80&w=600&auto=format&fit=crop';
  const avatarUrl = petData?.avatarUrl || petData?.images?.[0]?.url || FALLBACK_AVATAR;

  // 1. Lấy tagId ra trước
  const activeTag = petData?.tags?.find((tag: any) => tag.status === 'ACTIVE') || petData?.tags?.[0];
  const tagId = activeTag?.id;
  console.log('DEBUG tagId:', tagId); // 👈 thêm dòng này tạm thời
  console.log('DEBUG full tag object:', JSON.stringify(activeTag)); // 👈 log toàn bộ object, không chỉ .id


  // 2. Cập nhật lại displayId: Ưu tiên lấy tagId (cắt 8 ký tự đầu để UI gọn gàng), nếu không có thẻ thì mới fallback về mã của pet
  const displayId = tagId?.substring(0, 8).toUpperCase()
    || petData.code
    || petData.id?.substring(0, 8).toUpperCase()
    || petId?.substring(0, 8).toUpperCase();
  const publicDomain = "https://pub-35c6d59c9e96467b9783df2a4e890a09.r2.dev";
  const qrUri = tagId ? `${publicDomain}/qr-codes/${tagId}.svg` : null;

  const handleDownloadQr = async () => {
    try {
      // 1. Kiểm tra ViewShot đã sẵn sàng chưa
      if (!cardRef.current || !cardRef.current.capture) {
        return;
      }

      // 2. Chụp ảnh thẻ thành định dạng PNG (Giống hệt cách làm của handleShareCard)
      const uri = await cardRef.current.capture();

      // 3. Yêu cầu quyền truy cập thư viện ảnh từ người dùng
      const { status } = await MediaLibrary.requestPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          isVi ? 'Thiếu quyền' : 'Permission Required',
          isVi
            ? 'Cần cấp quyền truy cập thư viện ảnh để lưu thẻ QR.'
            : 'Photo library permission is required to save the QR card.'
        );
        return;
      }

      // 4. Lưu ảnh vừa chụp vào thiết bị
      await MediaLibrary.saveToLibraryAsync(uri);

      // 5. Thông báo thành công
      Alert.alert(
        isVi ? 'Thành công' : 'Success',
        isVi
          ? `Thẻ của ${petData?.name} đã được lưu vào thư viện ảnh!`
          : `The card for ${petData?.name} has been saved to your photos!`
      );

    } catch (error) {
      console.error('[handleDownloadQr] Error:', error);
      Alert.alert(
        isVi ? 'Lỗi' : 'Error',
        isVi
          ? 'Không thể lưu thẻ QR. Vui lòng thử lại.'
          : 'Unable to save QR card. Please try again.'
      );
    }
  };

  // Tải thẻ .pkpass từ BE (kèm Bearer token) rồi present qua PassKit để thêm vào Apple Wallet
  const handleAddToWallet = async () => {
    if (Platform.OS !== 'ios') return;

    try {
      const accessToken = await SecureStore.getItemAsync('accessToken');

      // Bước 1: Xin token (đã bổ sung Accept-Language)
      const tokenRes = await fetch(`${BASE_URL}wallet/pets/${petId}/pass-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          // Truyền ngôn ngữ hiện tại của app xuống Backend
          'Accept-Language': language === 'vi' ? 'vi' : 'en',
        },
      });

      if (!tokenRes.ok) throw new Error(`Token failed: ${tokenRes.status}`);
      const { token: passToken } = await tokenRes.json();

      // Bước 2: Mở URL trực tiếp — iOS sẽ intercept MIME type và gọi PassKit
      // KHÔNG download về cache, KHÔNG dùng Sharing.shareAsync
      const downloadUrl = `${BASE_URL}wallet/download-pass/${passToken}`;

      const supported = await Linking.canOpenURL(downloadUrl);
      if (!supported) {
        throw new Error('Cannot open URL');
      }

      await openWebLink(downloadUrl);

    } catch (error) {
      console.error('[handleAddToWallet] Error:', error);
      Alert.alert(
        isVi ? 'Lỗi' : 'Error',
        isVi
          ? 'Không thể thêm thẻ vào Apple Wallet. Vui lòng thử lại.'
          : 'Unable to add pass to Apple Wallet. Please try again.'
      );
    }
  };


  async function handleSubmitReport() {
    setShowReportModal(false);

    const isDamaged = selectedIssue === 'damaged';
    const isLater = replaceTag === 'no';

    if (isDamaged && isLater) {
      try {
        await petService.updatePet(petId, { needsQrReplacement: true });
      } catch (error) {
        console.error("Lỗi cập nhật flag:", error);
        Alert.alert(
          isVi ? 'Lỗi' : 'Error',
          isVi ? 'Không thể ghi nhận trạng thái hỏng.' : 'Unable to record damaged status.'
        );
      }
    }

    setPendingReplace(replaceTag === 'yes');
    setShowSuccessModal(true);
  }

  const isSubmitEnabled =
    ((selectedIssue === 'lost' || selectedIssue === 'damaged') && replaceTag) ||
    (selectedIssue === 'other' && otherDetail.trim().length > 0);

  return (
    <View className="flex-1 bg-gray-50">
      <LinearGradient
        colors={['#FFF9F0', '#FFFFFF']}
        locations={[0, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* --- OFF-SCREEN VIEWSHOT: Thẻ tàng hình dùng riêng để chụp ảnh --- */}
      <View style={{ position: 'absolute', zIndex: -10, opacity: 0, pointerEvents: 'none', top: 100, left: 0, right: 0, alignItems: 'center' }}>
        <ViewShot
          ref={cardRef}
          options={{ format: 'png', quality: 1.0 }}
          style={{ backgroundColor: 'transparent' }}
        >
          {/* LỚP BỌC MỚI DÙNG IMAGE BACKGROUND */}
          <ImageBackground
            source={require('@/assets/images/share-background.jpg')} // Đường dẫn tới background của bạn
            style={{
              paddingTop: 84,             // Hứng trọn Avatar (top: -41px) + dư dả lề trên cho đẹp
              paddingBottom: 48,          // Hứng trọn Shadow (đổ xuống 4px + radius 8)
              paddingHorizontal: 40,      // Rộng hai bên để thấy background rõ hơn
              alignItems: 'center',
              justifyContent: 'center',
            }}
            imageStyle={{ borderRadius: 16 }} // (Tuỳ chọn) Bo góc cho ảnh share nếu muốn
          >
            <View
              className="bg-white rounded-[24px] items-center pb-[26px] self-center border border-gray-100"
              style={{ width: 338, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: SHADOW_OPACITY, shadowRadius: SHADOW_RADIUS, elevation: ELEVATION }}
            >
              {/* AVATAR KHỐI NHÔ LÊN */}
              <View className="absolute -top-[41px] self-center w-[82px] h-[82px] z-10">
                <View style={{ position: 'absolute', width: 120, height: 80, bottom: 41, left: -19, overflow: 'hidden' }}>
                  <View style={{ width: 82, height: 82, borderRadius: 41, bottom: -41, left: 19, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F3F4F6' }} />
                </View>
                <View style={{ position: 'absolute', width: 82, height: 41, top: 41, left: 0, overflow: 'hidden' }}>
                  <View style={{ width: 82, height: 82, borderRadius: 41, top: -41, left: 0, backgroundColor: '#FFFFFF' }} />
                </View>
                <View className="absolute inset-0 items-center justify-center pointer-events-none">
                  <Image source={{ uri: avatarUrl }} className="w-[70px] h-[70px] rounded-full bg-gray-200" resizeMode="cover" />
                </View>
              </View>

              <Text className="text-[20px] font-semibold text-black mt-[48px] mb-[4px] tracking-tight">{petData.name}</Text>
              <Text className="text-[12px] font-regular text-[#8E8E93] mb-[4px] tracking-wider">{isVi ? 'Mã' : 'ID'}: {displayId}</Text>

              <View className="my-[24px]">
                <View style={{ width: 196, height: 196, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
                  {qrUri && (
                    <View style={{ position: 'absolute', width: '110%', height: '110%', top: '-5%', left: '0%', justifyContent: 'center', alignItems: 'center' }}>
                      <SvgUri width="100%" height="100%" uri={qrUri} preserveAspectRatio="xMidYMid meet" style={{ transform: [{ scale: 0.88 }] }} onError={() => { }} />
                    </View>
                  )}
                </View>
              </View>

              <View className="flex-row items-center justify-center">
                <Text className="text-[22px] font-semibold text-gray-900 tracking-tighter">Paw</Text>
                <Text className="text-[22px] font-semibold text-[#E89B5A] tracking-tighter">Life</Text>
              </View>
            </View>
          </ImageBackground>
        </ViewShot>
      </View>
      {/* --- KẾT THÚC VIEWSHOT TÀNG HÌNH --- */}

      <SafeAreaView className="flex-1" edges={['top']}>
        {/* HEADER */}
        <View className="flex-row items-center justify-between px-5 py-4">
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 }}
          >
            <View className="overflow-hidden rounded-full w-[36px] h-[36px] items-center justify-center border-[0.5px] border-white/50 bg-white/20">
              <LinearGradient
                colors={['rgba(221, 221, 221, 0.3)', 'rgba(247, 247, 247, 0.7)', '#FFFFFF']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                locations={[0, 0.3, 1]}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 9999 }}
              />
              <Feather name="chevron-left" size={20} color="#1F2937" />
            </View>
          </TouchableOpacity>

          <View className="items-center">
            <Text className="text-[20px] font-semibold text-[#111827] tracking-tight">
              {isVi ? 'Xem mã QR' : 'View QR Code'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleShareCard}
            activeOpacity={0.7}
            style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 }}
          >
            <View className="overflow-hidden rounded-full w-[36px] h-[36px] items-center justify-center border-[0.5px] border-white/50 bg-white/20">
              <LinearGradient
                colors={['rgba(221, 221, 221, 0.3)', 'rgba(247, 247, 247, 0.7)', '#FFFFFF']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                locations={[0, 0.3, 1]}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 9999 }}
              />
              <Image source={require('../assets/icon/share.png')} style={{ width: 16, height: 16 }} resizeMode="cover" />
            </View>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 30 : 24 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 w-full self-center" style={{ maxWidth: 380, alignItems: 'center' }}>
            <View className="items-center mb-auto flex-1 w-full self-center">
              <View
                className="items-center mt-24 w-full"
                style={{
                  maxWidth: CARD_WIDTH,
                  width: CARD_WIDTH,
                  height: CARD_HEIGHT,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: SHADOW_OPACITY,
                  shadowRadius: SHADOW_RADIUS,
                  elevation: ELEVATION,
                }}
              >
                <TicketCardSvg
                  width={CARD_WIDTH}
                  height={CARD_HEIGHT}
                  borderRadius={CARD_RADIUS}
                  notchRadius={CARD_NOTCH_RADIUS}
                  dividerY={CARD_DIVIDER_Y}
                />
                {/* Content layer */}
                <View
                  className="absolute inset-0 items-center"
                  style={{
                    paddingHorizontal: CARD_PADDING_X,
                    paddingBottom: 20,
                  }}
                >
                  {/* --- KHU VỰC TRÊN NÉT ĐỨT (Click để xem chi tiết) --- */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setShowQrOverlay(true)}
                    style={{ width: '100%', alignItems: 'center' }}
                  >
                    {/* Avatar */}
                    <View className="absolute -top-[41px] self-center w-[82px] h-[82px] z-10">
                      <View style={{ position: 'absolute', width: 120, height: 80, bottom: 41, left: -19, overflow: 'hidden' }}>
                        <View
                          style={{
                            width: 76,
                            height: 76,
                            borderRadius: 41,
                            bottom: -43,
                            left: 22,
                            backgroundColor: '#FFFFFF',
                            borderWidth: 1,
                            borderColor: '#F3F4F6',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: -4 },
                            shadowOpacity: SHADOW_OPACITY,
                            shadowRadius: SHADOW_RADIUS,
                            elevation: ELEVATION,
                          }}
                        />
                      </View>
                      <View style={{ position: 'absolute', width: 82, height: 41, top: 41, left: 0, overflow: 'hidden' }}>
                        <View style={{ width: 82, height: 82, borderRadius: 41, top: -41, left: 0, backgroundColor: '#FFFFFF' }} />
                      </View>
                      <View className="absolute inset-0 items-center justify-center pointer-events-none">
                        <Image source={{ uri: avatarUrl }} className="w-[66px] h-[66px] rounded-full bg-gray-200" resizeMode="cover" />
                      </View>
                    </View>

                    <Text className="text-[20px] font-semibold text-black mt-[41px] mb-[6px] tracking-tight">
                      {petData.name}
                    </Text>
                    <Text className="text-[12px] font-regular text-[#8E8E93] mb-[12px] tracking-wider">
                      {isVi ? 'Mã' : 'ID'}: {displayId}
                    </Text>

                    {/* QR Code - Fix lỗi bị cắt góc bằng cách nới vùng chứa và dùng 100% */}
                    <View style={{ width: 171, height: 171, justifyContent: 'center', alignItems: 'center' }}>
                      {qrUri ? (
                        // Khung trong nới rộng ra 200x200 để SVG thoải mái render không bị xén cạnh.
                        // Dùng scale = 171 / 200 (tương đương 0.855) để ép cái khung 200x200 này chui lọt vừa khít vào khung 171x171.
                        <View style={{
                          width: 200,
                          height: 200,
                          transform: [{ scale: 171 / 200 }],
                          justifyContent: 'center',
                          alignItems: 'center'
                        }}>
                          <SvgUri
                            width="100%"
                            height="100%"
                            uri={qrUri}
                            preserveAspectRatio="xMidYMid meet"
                            onError={() => { }}
                          />
                        </View>
                      ) : (
                        <View className="items-center justify-center flex-1">
                          <Text className="text-center text-[13px] text-gray-500">
                            {isVi ? 'Không tìm thấy mã QR' : 'QR code not found'}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text
                      className="text-center text-[12px] text-[#8E8E93] pt-[4px] font-regular"
                      style={{ marginTop: 0 }}
                    >
                      {isVi
                        ? `Nhớ luôn đeo thẻ cho ${petData.name}`
                        : `Please always attach QR tag on ${petData.name}`}
                    </Text>
                  </TouchableOpacity>

                  {/* --- KHU VỰC DƯỚI NÉT ĐỨT --- */}
                  {/* Nét đứt nằm ngay đây trên bề mặt SVG, cách Text trên 30px và cách 2 nút dưới 30px */}
                  <View className="flex-row self-stretch" style={{ marginTop: 63, marginBottom: 35 }}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => router.push({ pathname: '/(tabs)/scan', params: { replacePetId: petData.id } })}
                      className="flex-1 items-center justify-center"
                    >
                      <Image source={require('../assets/icon/qr-replace.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                      <Text className="text-[14px] font-medium text-[#1E1E1E] mt-2">
                        {isVi ? 'Thay thẻ QR' : 'Replace QR tag'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => router.push({ pathname: '/transfer-ownership', params: { petId } })}
                      className="flex-1 items-center justify-center"
                    >
                      <Image source={require('../assets/icon/qr-transfer.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                      <Text className="text-[14px] font-medium text-[#1E1E1E] mt-2">
                        {isVi ? 'Chuyển chủ' : 'Transfer pet'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Nút Apple Wallet - Cách 2 nút trên đúng 30px theo thiết lập marginBottom bên trên */}
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity
                      onPress={handleAddToWallet}
                      activeOpacity={0.85}
                      className="flex-row items-center justify-center self-stretch h-[40px] mx-[5px] rounded-[12px] bg-black border border-[#757575]"
                    >
                      <Image source={require('../assets/icon/apple-wallet.png')} style={{ width: 21, height: 15 }} resizeMode="contain" />
                      <Text className="text-white text-[14px] font-medium ml-2">{isVi ? "Thêm vào ví Apple" : "Add to Apple Wallet"}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            <View className="items-center pb-4">
              <TouchableOpacity activeOpacity={0.6} onPress={() => setShowReportModal(true)}>
                <Text className="text-[12px] font-regular text-[#8E8E93] tracking-wide">
                  {isVi ? 'Báo cáo vấn đề với thẻ' : 'Report lost or damaged tag'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* QR OVERLAY MODAL */}
      <Modal animationType="fade" transparent visible={showQrOverlay} onRequestClose={() => setShowQrOverlay(false)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setShowQrOverlay(false)} className="flex-1 justify-center items-center">
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} className="flex-1 justify-center items-center">

            {/* --- VIEWSHOT: Bọc toàn bộ khối thẻ trắng --- */}
            <View
              className="bg-white rounded-[24px] items-center pb-[26px] self-center border border-gray-100 w-full"
              style={{ maxWidth: 338, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: SHADOW_OPACITY, shadowRadius: SHADOW_RADIUS, elevation: ELEVATION }}
            >
              <View className="absolute -top-[41px] self-center w-[82px] h-[82px] z-10">
                <View style={{ position: 'absolute', width: 120, height: 80, bottom: 41, left: -19, overflow: 'hidden' }}>
                  <View style={{ width: 82, height: 82, borderRadius: 41, bottom: -41, left: 19, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: SHADOW_OPACITY, shadowRadius: SHADOW_RADIUS, elevation: ELEVATION }} />
                </View>
                <View style={{ position: 'absolute', width: 82, height: 41, top: 41, left: 0, overflow: 'hidden' }}>
                  <View style={{ width: 82, height: 82, borderRadius: 41, top: -41, left: 0, backgroundColor: '#FFFFFF' }} />
                </View>
                <View className="absolute inset-0 items-center justify-center pointer-events-none">
                  <Image source={{ uri: avatarUrl }} className="w-[70px] h-[70px] rounded-full bg-gray-200" resizeMode="cover" />
                </View>
              </View>

              <Text className="text-[20px] font-semibold text-black mt-[48px] mb-[4px] tracking-tight">
                {petData.name}
              </Text>
              <Text className="text-[12px] font-regular text-[#8E8E93] mb-[4px] tracking-wider">
                {isVi ? 'Mã' : 'ID'}: {displayId}
              </Text>

              <View className="my-[24px]">
                {/* --- FIX CẮT QR: Dùng Overshoot Wrapper --- */}
                <View style={{ width: 196, height: 196, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
                  {qrUri ? (
                    <View style={{
                      position: 'absolute',
                      width: '110%',
                      height: '110%',
                      top: '-5%',
                      left: '0%',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      <SvgUri
                        width="100%"
                        height="100%"
                        uri={qrUri}
                        preserveAspectRatio="xMidYMid meet"
                        style={{ transform: [{ scale: 0.88 }] }}
                        onError={() => { }}
                      />
                    </View>
                  ) : (
                    <Text className="text-gray-400">
                      {isVi ? 'Không có mã QR' : 'QR unavailable'}
                    </Text>
                  )}
                </View>
              </View>

              <View className="flex-row items-center justify-center">
                <Text className="text-[22px] font-semibold text-gray-900 tracking-tighter">Paw</Text>
                <Text className="text-[22px] font-semibold text-[#E89B5A] tracking-tighter">Life</Text>
              </View>
            </View>

            {/* --- NÚT BẤM: Gọi hàm chụp và chia sẻ thẻ --- */}
            <TouchableOpacity
              onPress={handleDownloadQr} // Gắn hàm xử lý chia sẻ ViewShot
              activeOpacity={0.8}
              className="absolute flex-row items-center bg-[#FFFFFF]/80 px-8 py-4 rounded-[16px] bottom-24"
            >
              <Feather name="download" size={20} color="#8E8E93" />
              <Text className="text-[#8E8E93] font-medium text-[16px] ml-3">
                {isVi ? 'Tải về' : 'Download'}
              </Text>
            </TouchableOpacity>

          </BlurView>
        </TouchableOpacity>
      </Modal>

      {/* MODAL REPORT TAG ISSUE */}
      <Modal animationType="fade" transparent visible={showReportModal} onRequestClose={() => setShowReportModal(false)}>
        <BlurView intensity={30} tint="dark" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity activeOpacity={1} className="flex-1 justify-center items-center px-6" onPress={Keyboard.dismiss}>
            <View className="bg-white w-full rounded-[32px] p-8 shadow-2xl relative">
              <TouchableOpacity
                onPress={() => { setShowReportModal(false); setReplaceTag(null); setOtherDetail(''); }}
                className="absolute top-6 right-6 p-2 z-10"
              >
                <Feather name="x" size={20} color="#111827" />
              </TouchableOpacity>

              <Text className="text-[20px] font-semibold text-center text-black mb-8">
                {isVi ? 'Báo cáo sự cố thẻ' : 'Report Tag Issue'}
              </Text>

              <Text className="text-[16px] font-semibold text-black mb-6">
                {isVi ? 'Thẻ QR đang gặp vấn đề gì?' : "What's happening with the QR tag?"}{' '}
                <Text className="text-red-500">*</Text>
              </Text>

              <View>
                <RadioOption
                  label={isVi ? 'Mất thẻ' : 'Lost Tag'}
                  subLabel={isVi ? 'Thẻ bị mất hoặc bị lấy cắp' : 'Tag is missing/stolen'}
                  selected={selectedIssue === 'lost'}
                  onPress={() => { setSelectedIssue('lost'); setReplaceTag(null); }}
                />
                {selectedIssue === 'lost' && (
                  <View className="mx-8 bg-[#E89B5A]/5 border -mt-2 border-[#E89B5A]/30 rounded-[12px] py-2 px-3 flex-row items-start mb-8">
                    <View className="flex-1">
                      <Text className="text-[10px] font-medium text-black">
                        {isVi
                          ? `Thẻ QR này sẽ bị xóa khỏi hồ sơ của ${petData?.name}.`
                          : `This QR tag will be removed from ${petData?.name}'s profile.`}
                      </Text>
                      <Text className="text-[10px] text-[#757575] mt-1">
                        {isVi
                          ? 'Thẻ thay thế có thể được kích hoạt bất kỳ lúc nào.'
                          : 'A replacement tag can be activated anytime.'}
                      </Text>
                    </View>
                  </View>
                )}

                <RadioOption
                  label={isVi ? 'Thẻ bị hỏng' : 'Damaged Tag'}
                  subLabel={isVi ? 'Mã QR bị hỏng hoặc không quét được' : 'QR code is damaged/unscannable'}
                  selected={selectedIssue === 'damaged'}
                  onPress={() => { setSelectedIssue('damaged'); setReplaceTag(null); }}
                />

                {selectedIssue === 'other' ? (
                  <View className="flex-row items-center mb-4 mx-2">
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => { setSelectedIssue(null); setOtherDetail(''); }}
                      className="w-[16px] h-[16px] rounded-full border-[1px] items-center justify-center border-[#E89B5A] bottom-[1px]"
                    >
                      <View className="w-[10px] h-[10px] rounded-full bg-[#E89B5A]" />
                    </TouchableOpacity>
                    <TextInput
                      placeholder={isVi ? 'Mô tả sự cố của bạn tại đây...' : 'Please describe your issue here...'}
                      placeholderTextColor="#757575"
                      value={otherDetail}
                      onChangeText={setOtherDetail}
                      className="ml-2 flex-1 border-b border-gray-200 pb-1 text-[14px] text-black"
                      style={{ fontFamily: 'Urbanist' }}
                      autoFocus
                      multiline={false}
                    />
                  </View>
                ) : (
                  <RadioOption
                    label={isVi ? 'Vấn đề khác' : 'Other Issue'}
                    selected={selectedIssue === 'other'}
                    onPress={() => setSelectedIssue('other')}
                  />
                )}

                {(selectedIssue === 'lost' || selectedIssue === 'damaged') && (
                  <Animated.View entering={FadeInDown} className="mt-2 pt-2">
                    <Text className="text-[16px] font-semibold text-black mb-4">
                      {isVi ? 'Thay thẻ QR mới?' : 'Replace with new QR tag?'}{' '}
                      <Text className="text-red-500">*</Text>
                    </Text>
                    <View className="flex-row justify-between">
                      <RadioOption
                        label={isVi ? 'Có, thay ngay' : 'Yes, replace now'}
                        selected={replaceTag === 'yes'}
                        onPress={() => setReplaceTag('yes')}
                      />
                      <RadioOption
                        label={isVi ? 'Không, để sau' : "No, I'll do it later"}
                        selected={replaceTag === 'no'}
                        onPress={() => setReplaceTag('no')}
                      />
                    </View>
                  </Animated.View>
                )}
              </View>

              <TouchableOpacity
                onPress={handleSubmitReport}
                className={`w-full py-4 rounded-full mt-6 ${isSubmitEnabled ? 'bg-[#E89B5A]' : 'bg-gray-200'}`}
                disabled={!isSubmitEnabled}
              >
                <Text className={`text-center font-semibold text-[14px] ${isSubmitEnabled ? 'text-white' : 'text-gray-400'}`}>
                  {isVi ? 'Gửi báo cáo' : 'Submit Report'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* SUCCESS MODAL */}
      <Modal animationType="fade" transparent visible={showSuccessModal} onRequestClose={() => setShowSuccessModal(false)}>
        <View className="flex-1 justify-center items-center bg-black/50 px-6">
          <View className="bg-white w-full rounded-[32px] p-8 items-center">
            <View className="w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-4">
              <Feather name="check" size={32} color="#22C55E" />
            </View>
            <Text className="text-xl font-bold text-black mb-2">
              {isVi ? 'Báo cáo thành công!' : 'Report Successful!'}
            </Text>
            <Text className="text-gray-500 text-center mb-8">
              {pendingReplace
                ? (isVi
                  ? 'Chúng tôi đã ghi nhận báo cáo. Bạn có muốn tiến hành thay thẻ QR ngay bây giờ không?'
                  : 'We have recorded your report. Would you like to proceed with replacing your QR tag now?')
                : (isVi
                  ? 'Chúng tôi đã nhận được báo cáo và sẽ xử lý trong thời gian sớm nhất.'
                  : 'We have received your report and will process it shortly.')}
            </Text>

            <View className="flex-row gap-4 w-full">
              <TouchableOpacity onPress={() => setShowSuccessModal(false)} className="flex-1 py-4 rounded-full bg-gray-100">
                <Text className="text-center font-semibold text-gray-600">
                  {isVi ? 'Đóng' : 'Close'}
                </Text>
              </TouchableOpacity>

              {pendingReplace && (
                <TouchableOpacity
                  onPress={() => {
                    setShowSuccessModal(false);
                    router.push({ pathname: '/(tabs)/scan', params: { replacePetId: petData.id } });
                  }}
                  className="flex-1 py-4 rounded-full bg-[#E89B5A]"
                >
                  <Text className="text-center font-semibold text-white">
                    {isVi ? 'Thay ngay' : 'Replace Now'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
  },
});