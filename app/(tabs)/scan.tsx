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
import { ActivityIndicator, Animated, Dimensions, Easing, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
// 1. IMPORT CỦA BẠN VÀO ĐÂY
import { QRGuideModal } from '@/components/QRGuideModal';
import { useModalStore } from '@/store/useModalStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOX_SIZE = 288;
const CUTOUT_RADIUS = 24; 
const OVERLAY_COLOR = 'rgba(0, 0, 0, 0.6)';

const boxX = (SCREEN_WIDTH - BOX_SIZE) / 2;
const boxY = (SCREEN_HEIGHT - BOX_SIZE) / 2;

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const isFocused = useIsFocused(); 
  const [showGuideModal, setShowGuideModal] = useState(false);
  // 2. KHAI BÁO STATE GỌI MODAL
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

  useEffect(() => {
    if (!scanSuccess && isFocused) {
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
  }, [scanSuccess, laserAnim, isFocused]);

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

      // Trích xuất ID
      let finalTagId = data;
      // Thêm dấu _ vào regex: [a-zA-Z0-9-_]+
      const tagMatch = data.match(/\/tag\/([a-zA-Z0-9-_]+)/) || data.match(/pawlife:\/\/tag\/([a-zA-Z0-9-_]+)/);
      if (tagMatch && tagMatch[1]) {
        finalTagId = tagMatch[1];
      }
      finalTagId = finalTagId.trim().replace(/\/$/, "");
      
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
              title: 'Success',
              message: 'QR code successfully assigned to the pet!',
              buttonText: 'View QR',
              onConfirm: () => {
                resetCamera();
                router.replace(`/view-qr-code?id=${linkPetId}`); 
              }
            });
          } catch (error: any) {
            handleScanError(error);
          }
        } 
        
        // LUỒNG 3: THAY THẾ QR CODE (REPLACE) - BỔ SUNG MỚI
        else if (replacePetId) {
          try {
            // 1. Gọi API thay thế QR
            await petService.replaceQrCode(replacePetId, finalTagId);
            
            // 2. [QUAN TRỌNG] Gọi thêm API để reset flag "Needs Replacement"
            // Giả sử bạn có hàm updatePet trong petService
            await petService.updatePet(replacePetId, { needsQrReplacement: false });
            
            showModal({
              title: 'Replace Success',
              message: 'Great! The pet\'s collar has been replaced with the new QR code.',
              buttonText: 'View New QR',
              onConfirm: () => {
                resetCamera();
                // Replace trang để quay lại màn xem QR và load lại data mới
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

  // Hàm tiện ích xử lý lỗi show Modal
  const handleScanError = (error: any) => {
    showModal({
      title: 'Error',
      message: error.response?.data?.message || error.message || "Invalid QR code or already in use!",
      buttonText: 'Try Again',
      onConfirm: () => resetCamera()
    });
  };

  if (!permission) {
    return (
      <View className="flex-1 bg-[#1A1A1A] items-center justify-center">
        <ActivityIndicator color="#ffa053" size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-[#1A1A1A] items-center justify-center px-6">
        <Text className="text-white mb-4 text-center">Need to grant camera access to scan QR code.</Text>
        <TouchableOpacity className="bg-[#F97316] py-3 px-6 rounded-xl" onPress={requestPermission}>
          <Text className="text-white font-bold">Grant Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />
      
      {/* --- LỚP 1: CAMERA TOÀN MÀN HÌNH --- */}
      {isFocused && (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
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
              {/* Nền hiển thị mờ */}
              <Rect height="100%" width="100%" fill="#fff" />
              {/* Khung xuyên thấu với toạ độ đồng bộ tuyệt đối */}
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
      {/* Sử dụng pointerEvents="box-none" để không chặn thao tác chạm camera bên dưới ngoại trừ các nút */}
      <View style={StyleSheet.absoluteFillObject} className="z-20" pointerEvents="box-none">
        
        {/* Nút How to Scan (Đặt cách khung quét 64px) */}
        <View style={{ position: 'absolute', top: boxY - 64, left: 0, right: 0, alignItems: 'center' }}>
          <TouchableOpacity 
            activeOpacity={0.7}
            onPress={() => setShowGuideModal(true)} // GẮN SỰ KIỆN Ở ĐÂY
            className="px-6 py-2.5 flex-row items-center justify-center gap-2 bg-black/40 rounded-full border border-white/10" // Cải thiện chút UI cho nút nổi bật hơn trên nền camera
          >
            <Feather 
                name="alert-circle" 
                size={16} 
                color={"#ffffff"} 
            />
            <Text className="text-[#EAEaea] font-medium text-[16px]">How to Scan</Text>
          </TouchableOpacity>
        </View>

        {/* Khung quét trung tâm (Đồng bộ toạ độ tĩnh với Mask SVG) */}
        <View 
          style={{ 
            position: 'absolute', 
            top: boxY, 
            left: boxX, 
            width: BOX_SIZE, 
            height: BOX_SIZE,
            borderRadius: CUTOUT_RADIUS, // Cực kỳ quan trọng để tia laser không tràn góc bo
            overflow: 'hidden', 
          }}
        >
            {/* 4 Cạnh viền màu cam */}
            <View className="absolute top-0 left-0 w-20 h-20 border-t-[4px] border-l-[4px] border-[#F97316] rounded-tl-[24px]" />
            <View className="absolute top-0 right-0 w-20 h-20 border-t-[4px] border-r-[4px] border-[#F97316] rounded-tr-[24px]" />
            <View className="absolute bottom-0 left-0 w-20 h-20 border-b-[4px] border-l-[4px] border-[#F97316] rounded-bl-[24px]" />
            <View className="absolute bottom-0 right-0 w-20 h-20 border-b-[4px] border-r-[4px] border-[#F97316] rounded-br-[24px]" />

            {/* Animation Laser / Success */}
            {!scanSuccess ? (
              <Animated.View 
                style={{ transform: [{ translateY: laserAnim }] }} 
                className="absolute top-0 w-full h-[2px] bg-orange-500 shadow-lg shadow-orange-500 opacity-80" 
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

        {/* Text hướng dẫn (Đặt phía dưới khung quét 40px) */}
        <View style={{ position: 'absolute', top: boxY + BOX_SIZE + 40, left: 0, right: 0, alignItems: 'center' }}>
          <Text className="text-[#8E8E93] text-center text-[14px] font-regular leading-relaxed px-[90px]">
            Move QR Code to the camera center for automatic scanning
          </Text>
        </View>
      </View>

      {/* --- LỚP 4: HEADER VỚI CÁC NÚT ĐIỀU HƯỚNG --- */}
      <SafeAreaView pointerEvents="box-none" className="absolute top-0 w-full z-30">
        <View pointerEvents="box-none" className="flex-row items-center justify-between px-6 pt-4 relative">
          
          {/* Nút Back - Nằm bên trái */}
          <TouchableOpacity 
            onPress={() => {
              // Ép điều hướng về lại màn Detail nếu đang ở luồng gán/thay mã QR
              if (linkPetId) {
                router.replace(`/pet-profile-detail?id=${linkPetId}`);
              } else if (replacePetId) {
                router.replace(`/pet-profile-detail?id=${replacePetId}`);
              } else {
                // Giữ nguyên back bình thường cho các luồng quét gốc (như quét pet lạc, add pet)
                router.back();
              }
            }}
            className="w-12 h-12 bg-[#2A2A2A]/80 rounded-full items-center justify-center z-20"
          >
            <ChevronLeft size={24} color="white" />
          </TouchableOpacity>

          {/* CHỈ HIỂN THỊ NÚT SKIP KHI ĐANG Ở LUỒNG THÊM PET MỚI */}
          {isAddingPet && (
            <View pointerEvents="box-none" className="absolute left-0 right-0 items-center justify-center z-10">
              <TouchableOpacity 
                onPress={() => {
                  // Chuyển thẳng tới form nhập liệu
                  router.replace('/add-pet'); 
                }}
                className="bg-black/40 px-5 py-3 rounded-full border border-white/10 shadow-sm"
              >
                <Text className="text-white font-lighter text-[12px]">Continue without scanning</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* View trống để giữ bố cục flex layout */}
          <View className="w-12" />

        </View>
      </SafeAreaView>

      <QRGuideModal 
        visible={showGuideModal} 
        onClose={() => setShowGuideModal(false)} 
      />
    </View>
  );
}