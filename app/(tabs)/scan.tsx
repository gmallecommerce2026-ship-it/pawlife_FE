// app/(tabs)/scan.tsx
import { Text } from '@/components/AppText';
import { useIsFocused } from '@react-navigation/native'; // Thêm import này
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Camera, CheckCircle, ChevronLeft } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, Easing, SafeAreaView, StyleSheet, TouchableOpacity, View } from 'react-native';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOX_SIZE = 288; 

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  
  // Kiểm tra xem màn hình có đang được focus hay không
  const isFocused = useIsFocused(); 

  // Animations
  const laserAnim = useRef(new Animated.Value(0)).current;
  const successScaleAnim = useRef(new Animated.Value(0)).current;
  const successOpacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Chỉ chạy animation khi chưa quét thành công và màn hình đang được focus
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
  }, [scanSuccess, laserAnim, isFocused]); // Thêm isFocused vào dependency array

  const handleBarCodeScanned = ({ type, data, bounds }: any) => {
    if (scanned || scanSuccess) return;

    if (bounds) {
      const { origin, size } = bounds;
      const qrCenterX = origin.x + size.width / 2;
      const qrCenterY = origin.y + size.height / 2;

      const minX = (SCREEN_WIDTH - BOX_SIZE) / 2;
      const maxX = minX + BOX_SIZE;
      const minY = (SCREEN_HEIGHT - BOX_SIZE) / 2;
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

    Animated.parallel([
      Animated.spring(successScaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(successOpacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      setTimeout(() => {
        router.push({
          pathname: '/scanned-pet',
          params: { tagId: data } 
        });

        setTimeout(() => {
          setScanned(false);
          setScanSuccess(false);
          successScaleAnim.setValue(0);
          successOpacityAnim.setValue(0);
        }, 500);
      }, 800);
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
        <Text className="text-white mb-4 text-center">Cần cấp quyền truy cập Camera để quét mã QR vòng cổ.</Text>
        <TouchableOpacity className="bg-[#F97316] py-3 px-6 rounded-xl" onPress={requestPermission}>
          <Text className="text-white font-bold">Cấp quyền Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />
      
      {/* --- LỚP 1: CAMERA TOÀN MÀN HÌNH --- */}
      {/* Chỉ render CameraView khi màn hình đang active */}
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

      {/* --- LỚP 2: OVERLAY --- */}
      <View style={StyleSheet.absoluteFillObject} className="z-0">
        <View className="flex-1 bg-black/60" />
        <View className="flex-row h-72">
          <View className="flex-1 bg-black/60" />
          <View className="w-72 h-72 relative bg-transparent items-center justify-center overflow-hidden">
              <View className="absolute top-0 left-0 w-12 h-12 border-t-[4px] border-l-[4px] border-[#F97316] rounded-tl-[24px]" />
              <View className="absolute top-0 right-0 w-12 h-12 border-t-[4px] border-r-[4px] border-[#F97316] rounded-tr-[24px]" />
              <View className="absolute bottom-0 left-0 w-12 h-12 border-b-[4px] border-l-[4px] border-[#F97316] rounded-bl-[24px]" />
              <View className="absolute bottom-0 right-0 w-12 h-12 border-b-[4px] border-r-[4px] border-[#F97316] rounded-br-[24px]" />

              {!scanSuccess ? (
                <Animated.View 
                  style={{ transform: [{ translateY: laserAnim }] }} 
                  className="absolute top-0 w-full h-[2px] bg-orange-500 shadow-lg shadow-orange-500 opacity-80" 
                />
              ) : (
                <Animated.View 
                  style={{ 
                    transform: [{ scale: successScaleAnim }], 
                    opacity: successOpacityAnim 
                  }}
                >
                  <View className="bg-[#22c55e]/20 p-4 rounded-full">
                    <CheckCircle size={80} color="#22c55e" />
                  </View>
                </Animated.View>
              )}
          </View>
          <View className="flex-1 bg-black/60" />
        </View>
        <View className="flex-1 bg-black/60" />
      </View>

      {/* --- LỚP 3: HEADER --- */}
      <SafeAreaView className="absolute top-0 w-full z-10 pointer-events-box-none">
        <View className="flex-row items-center justify-between px-6 pt-4">
          <TouchableOpacity 
            onPress={() => router.push(`/`)}
            className="w-12 h-12 bg-[#2A2A2A]/80 rounded-full items-center justify-center"
          >
            <ChevronLeft size={24} color="white" />
          </TouchableOpacity>

          <View className="bg-[#3D312A]/80 px-5 py-3 rounded-full flex-row items-center border border-[#5A4030]">
            <Camera size={16} color={scanSuccess ? "#22c55e" : "#A0A0A0"} style={{ marginRight: 8 }} />
            <Text className={`font-medium text-sm ${scanSuccess ? 'text-[#22c55e]' : 'text-[#EAEaea]'}`}>
              {scanSuccess ? "Quét thành công!" : "Hướng mã QR vào giữa khung"}
            </Text>
          </View>
          <View className="w-12" /> 
        </View>
      </SafeAreaView>
    </View>
  );
}