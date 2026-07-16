// app/(tabs)/scan.tsx
import { Text } from '@/components/AppText';
import { petService } from '@/services/petService';
import { Feather } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CheckCircle, ChevronLeft } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';

import { QRGuideModal } from '@/components/QRGuideModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { useModalStore } from '@/store/useModalStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOX_SIZE = 288;
const CUTOUT_RADIUS = 24;
const OVERLAY_COLOR = 'rgba(0, 0, 0, 0.65)';

const boxX = (SCREEN_WIDTH - BOX_SIZE) / 2;
const boxY = (SCREEN_HEIGHT - BOX_SIZE) / 2;

export default function ScanScreen() {
  const router = useRouter();
  const { t } = useLanguage(); // Áp dụng đa ngôn ngữ
  const [permission, requestPermission] = useCameraPermissions();

  const [scanned, setScanned] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showInputModal, setShowInputModal] = useState(false);
  const [manualCode, setManualCode] = useState('');
  // Trạng thái giữ nhịp mở Camera để tránh khựng màn hình
  const [isCameraReady, setIsCameraReady] = useState(false);

  const isFocused = useIsFocused();
  const showModal = useModalStore((state) => state.showModal);

  const params = useLocalSearchParams();
  const linkPetId = params.linkPetId as string;
  const replacePetId = params.replacePetId as string;
  const action = params.action as string;
  const isAddingPet = params.isAddingPet === 'true';

  // Animations
  const laserAnim = useRef(new Animated.Value(0)).current;
  const successScaleAnim = useRef(new Animated.Value(0)).current;
  const successOpacityAnim = useRef(new Animated.Value(0)).current;

  // FIX TỐI ƯU HIỆU NĂNG: Delay việc mount Camera 200ms để animation chuyển màn hình được mượt mà 100%
  useEffect(() => {
    let timer: any;
    if (isFocused && permission?.granted) {
      timer = setTimeout(() => setIsCameraReady(true), 250);
    } else {
      setIsCameraReady(false);
    }
    return () => clearTimeout(timer);
  }, [isFocused, permission?.granted]);

  useEffect(() => {
    if (!scanSuccess && isFocused && isCameraReady) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, {
            toValue: BOX_SIZE - 4,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(laserAnim, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          })
        ])
      ).start();
    } else {
      laserAnim.stopAnimation();
    }
  }, [scanSuccess, laserAnim, isFocused, isCameraReady]);

  const handleBarCodeScanned = ({ type, data, bounds }: any) => {
    if (scanned || scanSuccess) return;

    if (bounds) {
      const { origin, size } = bounds;
      const qrCenterX = origin.x + size.width / 2;
      const qrCenterY = origin.y + size.height / 2;

      const minX = boxX;
      const maxX = minX + BOX_SIZE;
      const minY = boxY;
      const maxY = minY + BOX_SIZE;

      const PADDING = 20;

      if (
        qrCenterX >= minX - PADDING &&
        qrCenterX <= maxX + PADDING &&
        qrCenterY >= minY - PADDING &&
        qrCenterY <= maxY + PADDING
      ) {
        processValidScan(data);
      }
    }
  };

  const processValidScan = (data: string) => {
      setScanned(true);
      setScanSuccess(true);

      // --- BẮT ĐẦU: LÀM SẠCH VÀ BÓC TÁCH ID TỐI ƯU ---
      // 1. Trị lỗi bàn phím iOS: Đổi tất cả các loại gạch ngang dài (en-dash, em-dash...) thành dấu gạch ngang chuẩn ASCII (-)
      let safeData = data.replace(/[\u2012\u2013\u2014\u2015\u2212]/g, '-');
      let finalTagId = safeData;

      const pltMatch = safeData.match(/(PLT-\d+)/i);
      const tagMatch = safeData.match(/\/tag\/([a-zA-Z0-9-_]+)/) || safeData.match(/pawlife:\/\/tag\/([a-zA-Z0-9-_]+)/);
      const r2Match = safeData.match(/\/qr-codes\/([a-zA-Z0-9-_]+)\.svg/i);

      if (pltMatch && pltMatch[1]) {
        finalTagId = pltMatch[1];
      } else if (tagMatch && tagMatch[1]) {
        finalTagId = tagMatch[1];
      } else if (r2Match && r2Match[1]) {
        finalTagId = r2Match[1];
      }

      // 2. Làm sạch tuyệt đối: Xóa BỎ TOÀN BỘ các ký tự ẩn (zero-width), dấu cách thừa, 
      // Chỉ giữ lại đúng chữ cái (a-z), số (0-9) và dấu gạch ngang (-). Cuối cùng ép viết HOA.
      finalTagId = finalTagId.replace(/[^a-zA-Z0-9-]/g, "").toUpperCase();

      console.log("🚀 Mã ID (Đã làm sạch tuyệt đối):", `"${finalTagId}"`);
      // --- KẾT THÚC ĐOẠN LÀM SẠCH ---

      Animated.parallel([
        Animated.spring(successScaleAnim, { toValue: 1, friction: 4, tension: 50, useNativeDriver: true }),
        Animated.timing(successOpacityAnim, { toValue: 1, duration: 200, useNativeDriver: true })
      ]).start(async () => {

      // LUỒNG 1: THÊM PET MỚI
      if (isAddingPet) {
        setTimeout(() => {
          router.replace({
            pathname: '/add-pet',
            params: { tagId: finalTagId, rawQrData: data }
          });
          resetCamera();
        }, 800);
      }

      // LUỒNG 2: GÁN QR CHO PET CHƯA CÓ
      else if (linkPetId) {
        try {
          await petService.linkQrCode(linkPetId, finalTagId);
          showModal({
            title: t('Success'),
            message: t('QR code successfully assigned to the pet!'),
            buttonText: t('View QR'),
            onConfirm: () => {
              resetCamera();
              router.replace(`/view-qr-code?id=${linkPetId}`);
            }
          });
        } catch (error: any) {
          handleScanError(error);
        }
      }

      // LUỒNG 3: THAY THẾ QR CODE (REPLACE)
      else if (replacePetId) {
        try {
          await petService.replaceQrCode(replacePetId, finalTagId);
          await petService.updatePet(replacePetId, { needsQrReplacement: false });

          showModal({
            title: t('Replace Success'),
            message: t("Great! The pet's collar has been replaced with the new QR code."),
            buttonText: t('View New QR'),
            onConfirm: () => {
              resetCamera();
              router.replace(`/view-qr-code?id=${replacePetId}`);
            }
          });
        } catch (error: any) {
          handleScanError(error);
        }
      }

      // LUỒNG 4: QUÉT PET LẠC BÌNH THƯỜNG
      else {
        setTimeout(() => {
          router.replace({
            pathname: '/scanned-pet',
            params: { tagId: finalTagId }
          });
          resetCamera();
        }, 800);
      }
    });
  };

  const resetCamera = () => {
    setTimeout(() => {
      setScanned(false);
      setScanSuccess(false);
      successScaleAnim.setValue(0);
      successOpacityAnim.setValue(0);
    }, 500);
  };

  const handleScanError = (error: any) => {
    showModal({
      title: t('Error'),
      message: error.response?.data?.message || error.message || t("Invalid QR code or already in use!"),
      buttonText: t('Try Again'),
      onConfirm: () => resetCamera()
    });
  };

  // FIX LỖI NHÁY MÀN HÌNH: Đợi permission fetch xong, trong lúc đó chỉ để màn hình đen tĩnh tuyệt đối
  if (!permission) {
    return <View style={StyleSheet.absoluteFillObject} className="bg-black" />;
  }

  // YÊU CẦU QUYỀN CAMERA (Đã đồng bộ màu sắc với app và có dịch)
  if (!permission.granted) {
    return (
      <View className="flex-1 bg-black items-center justify-center px-6">
        <StatusBar style="light" />
        <View className="w-20 h-20 bg-gray-900 rounded-full items-center justify-center mb-6">
          <Feather name="camera" size={32} color="#E89B5A" />
        </View>
        <Text className="text-white text-[18px] font-semibold mb-2 text-center">{t('Camera Access Required')}</Text>
        <Text className="text-gray-400 mb-8 text-center text-[15px] leading-6 px-4">
          {t('Need to grant camera access to scan QR code.')}
        </Text>
        <TouchableOpacity className="bg-[#E89B5A] py-[16px] px-10 rounded-full w-full items-center active:opacity-80" onPress={requestPermission}>
          <Text className="text-white font-bold text-[16px]">{t('Grant Camera Access')}</Text>
        </TouchableOpacity>
        <TouchableOpacity className="mt-6 py-2 px-6" onPress={() => router.back()}>
          <Text className="text-gray-500 font-medium text-[15px]">{t('Cancel')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />

      {/* --- LỚP 1: CAMERA TOÀN MÀN HÌNH --- */}
      {isCameraReady && (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          // CHỈNH SỬA Ở ĐÂY: Vô hiệu hóa quét khi Modal nhập tay đang mở
          onBarcodeScanned={(scanned || showInputModal) ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
        />
      )}

      {/* --- LỚP 2: OVERLAY MỜ VỚI CUTOUT BO GÓC (SVG) --- */}
      <View style={StyleSheet.absoluteFillObject} className="z-10" pointerEvents="none">
        <Svg height="100%" width="100%">
          <Defs>
            <Mask id="mask" x="0" y="0" height="100%" width="100%">
              <Rect height="100%" width="100%" fill="#fff" />
              <Rect
                x={boxX}
                y={boxY}
                width={BOX_SIZE}
                height={BOX_SIZE}
                rx={CUTOUT_RADIUS}
                ry={CUTOUT_RADIUS}
                fill="#000"
              />
            </Mask>
          </Defs>
          <Rect
            height="100%"
            width="100%"
            fill={OVERLAY_COLOR}
            mask="url(#mask)"
          />
        </Svg>
      </View>

      {/* --- LỚP 3: GIAO DIỆN QUÉT VÀ HIỆU ỨNG --- */}
      <View style={StyleSheet.absoluteFillObject} className="z-20" pointerEvents="box-none">

        {/* Nút How to Scan */}
        <View style={{ position: 'absolute', top: boxY - 64, left: 0, right: 0, alignItems: 'center' }}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowGuideModal(true)}
            className="px-5 py-2.5 flex-row items-center justify-center gap-2 bg-black/50 rounded-full border border-white/20 backdrop-blur-md"
          >
            <Feather name="alert-circle" size={16} color={"#ffffff"} />
            <Text className="text-white font-medium text-[15px]">{t('How to Scan')}</Text>
          </TouchableOpacity>
        </View>

        {/* Khung quét trung tâm */}
        <View
          style={{
            position: 'absolute',
            top: boxY,
            left: boxX,
            width: BOX_SIZE,
            height: BOX_SIZE,
            borderRadius: CUTOUT_RADIUS,
            overflow: 'hidden',
          }}
        >
          <View className="absolute top-0 left-0 w-16 h-16 border-t-[4px] border-l-[4px] border-[#E89B5A] rounded-tl-[24px]" />
          <View className="absolute top-0 right-0 w-16 h-16 border-t-[4px] border-r-[4px] border-[#E89B5A] rounded-tr-[24px]" />
          <View className="absolute bottom-0 left-0 w-16 h-16 border-b-[4px] border-l-[4px] border-[#E89B5A] rounded-bl-[24px]" />
          <View className="absolute bottom-0 right-0 w-16 h-16 border-b-[4px] border-r-[4px] border-[#E89B5A] rounded-br-[24px]" />

          {/* Animation Laser / Success */}
          {!scanSuccess ? (
            <Animated.View
              style={{ transform: [{ translateY: laserAnim }] }}
              className="absolute top-0 w-full h-[2px] bg-[#E89B5A] shadow-lg shadow-orange-400 opacity-90"
            />
          ) : (
            <Animated.View
              style={{
                transform: [{ scale: successScaleAnim }],
                opacity: successOpacityAnim,
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <View className="bg-[#22c55e]/20 p-4 rounded-full">
                <CheckCircle size={80} color="#22c55e" />
              </View>
            </Animated.View>
          )}
        </View>

        {/* Text hướng dẫn */}
        <View style={{ position: 'absolute', top: boxY + BOX_SIZE + 40, left: 0, right: 0, alignItems: 'center' }}>
          <Text className="text-gray-300 text-center text-[15px] font-regular leading-relaxed px-[60px]">
            {t('Move QR Code to the camera center for automatic scanning')}
          </Text>
        </View>
      </View>
      {/* THÊM MỚI: Nút nhập mã thủ công */}
      <View style={{ position: 'absolute', top: boxY + BOX_SIZE + 100, left: 0, right: 0, alignItems: 'center' }}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setShowInputModal(true)}
          className="px-6 py-3 flex-row items-center justify-center gap-2 bg-white/20 rounded-full border border-white/30 backdrop-blur-md"
        >
          <Feather name="edit-2" size={16} color={"#ffffff"} />
          <Text className="text-white font-medium text-[15px]">{t('Enter Code Manually')}</Text>
        </TouchableOpacity>
      </View>
      {/* --- LỚP 4: HEADER VỚI CÁC NÚT ĐIỀU HƯỚNG --- */}
      <SafeAreaView pointerEvents="box-none" className="absolute top-0 w-full z-30">
        <View pointerEvents="box-none" className="flex-row items-center justify-between px-6 pt-2 relative">

          <TouchableOpacity
            onPress={() => {
              if (linkPetId) {
                router.replace(`/pet-profile-detail?id=${linkPetId}`);
              } else if (replacePetId) {
                router.replace(`/pet-profile-detail?id=${replacePetId}`);
              } else if (isAddingPet) {
                // CHỈNH SỬA: Đưa thẳng về my-pets nếu xuất phát từ nút Add New Pet
                router.replace('/(tabs)/my-pets');
              } else {
                router.back();
              }
            }}
            className="w-12 h-12 bg-black/50 rounded-full items-center justify-center z-20 backdrop-blur-md"
          >
            <ChevronLeft size={24} color="white" />
          </TouchableOpacity>

          {isAddingPet && (
            <View pointerEvents="box-none" className="absolute left-0 right-0 items-center justify-center z-10">
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.replace('/add-pet')}
                className="bg-black/50 px-5 py-[10px] rounded-full border border-white/20 backdrop-blur-md"
              >
                <Text className="text-white font-medium text-[14px]">{t('Continue without scanning')}</Text>
              </TouchableOpacity>
            </View>
          )}

          <View className="w-12" />
        </View>
      </SafeAreaView>

      <QRGuideModal
        visible={showGuideModal}
        onClose={() => setShowGuideModal(false)}
      />
      <Modal
        visible={showInputModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInputModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-center items-center bg-black/70 px-6"
        >
          <View className="bg-white w-full rounded-[24px] p-6 items-center shadow-2xl">
            <View className="w-12 h-12 bg-orange-100 rounded-full items-center justify-center mb-4">
              <Feather name="tag" size={24} color="#E89B5A" />
            </View>

            <Text className="text-xl font-bold mb-2 text-gray-900">{t('Enter Pet Code')}</Text>
            <Text className="text-gray-500 text-center mb-6 text-[14px]">
              {t('Enter the ID code printed on the collar tag (e.g., PLT-0001)')}
            </Text>

            <TextInput
              value={manualCode}
              onChangeText={(text) => setManualCode(text.toUpperCase())} // Tự động viết hoa
              placeholder="PLT-0001"
              placeholderTextColor="#9ca3af"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-center text-[18px] font-bold tracking-widest mb-6 text-gray-900"
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <View className="flex-row gap-3 w-full">
              <TouchableOpacity
                className="flex-1 bg-gray-100 py-3.5 rounded-xl items-center"
                onPress={() => {
                  setShowInputModal(false);
                  setManualCode('');
                }}
              >
                <Text className="text-gray-700 font-semibold text-[16px]">{t('Cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`flex-1 py-3.5 rounded-xl items-center ${manualCode.trim() ? 'bg-[#E89B5A]' : 'bg-orange-300'}`}
                disabled={!manualCode.trim()}
                onPress={() => {
                  if (manualCode.trim()) {
                    setShowInputModal(false);
                    // Đẩy code thẳng vào hàm xử lý hiện tại của bạn
                    processValidScan(manualCode.trim());
                    setManualCode('');
                  }
                }}
              >
                <Text className="text-white font-bold text-[16px]">{t('Confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}