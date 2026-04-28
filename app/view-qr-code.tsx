import { Text } from '@/components/AppText';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowRightLeft, RefreshCcw } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, Modal, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { petService } from '../services/petService';

const { width } = Dimensions.get('window');
const QR_SIZE = Math.min(width * 0.45, 170);
const LARGE_QR_SIZE = width * 0.65; // Kích thước QR khi phóng to

const SHADOW_OPACITY = 0.05;
const SHADOW_RADIUS = 8;
const ELEVATION = 3;

export default function ViewQrCode() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const petId = params.id as string;

  // --- STATE ---
  const [petData, setPetData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showQrOverlay, setShowQrOverlay] = useState(false); // State quản lý hiển thị overlay

  // --- FETCH DATA ---
  useFocusEffect(
    useCallback(() => {
      const fetchPetDetail = async () => {
        if (!petId) {
          setIsLoading(false);
          return;
        }
        try {
          setIsLoading(true);
          const data = await petService.getPetById(petId);
          setPetData(data);
        } catch (error) {
          console.error("Lỗi khi tải thông tin thú cưng:", error);
          Alert.alert("Lỗi", "Không thể tải thông tin chi tiết thú cưng.");
        } finally {
          setIsLoading(false);
        }
      };

      fetchPetDetail();
    }, [petId])
  );

  const handleDownloadQr = () => {
    // Xử lý logic tải QR code tại đây
    Alert.alert("Thông báo", "Tính năng tải QR Code đang được phát triển.");
  };

  // --- RENDER LOADING STATE ---
  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#FAFAFA]">
        <ActivityIndicator size="large" color="#E89B5A" />
        <Text className="mt-4 text-gray-500">Đang tải mã QR...</Text>
      </View>
    );
  }

  // --- RENDER NOT FOUND STATE ---
  if (!petData) {
    return (
      <View className="flex-1 justify-center items-center bg-[#FAFAFA] px-4">
        <Feather name="alert-circle" size={64} color="#E5E7EB" />
        <Text className="text-gray-800 text-lg font-bold mt-4 text-center">Không tìm thấy thông tin thú cưng</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-6 bg-orange-100 px-6 py-2 rounded-full">
          <Text className="text-orange-600 font-bold">Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- XỬ LÝ DỮ LIỆU HIỂN THỊ ---
  const displayId = petData.code || petData.id?.substring(0, 8).toUpperCase() || petId?.substring(0, 8).toUpperCase();
  const avatarUrl = petData.avatarUrl || petData.images?.[0]?.url || 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=2043&auto=format&fit=crop';
  
  const qrValue = (petData.tags && petData.tags.length > 0) 
    ? petData.tags[0].id 
    : `https://pawcare.app/pet/${petId}`;

  return (
    <View className="flex-1 bg-gray-50">
      <LinearGradient
        colors={['#FFF9F0', '#FFFFFF']} 
        locations={[0, 1]} 
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }} 
        style={StyleSheet.absoluteFillObject} 
      />

      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        {/* HEADER */}
        <View className="flex-row items-center px-4 py-3 relative">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 z-10">
            <Feather name="chevron-left" size={24} color="#000000" />
          </TouchableOpacity>
          <View className="absolute left-0 right-0 items-center justify-center pointer-events-none">
            <Text className="text-[24px] font-semibold text-[#000000]">View QR Code</Text>
          </View>
        </View>
      
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="w-full self-center" style={{ maxWidth: 380, alignItems: 'center' }}>
            
            <View 
              className="bg-white rounded-[16px] items-center pb-[26px] border border-gray-100 mt-24 w-[294px]"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 }, 
                shadowOpacity: SHADOW_OPACITY,
                shadowRadius: SHADOW_RADIUS,
                elevation: ELEVATION,
              }}
            >
              
              <View className="absolute -top-[41px] self-center w-[82px] h-[82px] z-10">
                {/* LAYER 1: NỬA TRÊN */}
                <View style={{ position: 'absolute', width: 120, height: 80, bottom: 41, left: -19, overflow: 'hidden' }}>
                  <View 
                    style={{ 
                      width: 82, height: 82, borderRadius: 41, 
                      bottom: -41, left: 19, 
                      backgroundColor: '#FFFFFF', 
                      borderWidth: 1, borderColor: '#F3F4F6',
                      shadowColor: '#000', 
                      shadowOffset: { width: 0, height: -4 },
                      shadowOpacity: SHADOW_OPACITY, 
                      shadowRadius: SHADOW_RADIUS, 
                      elevation: ELEVATION 
                    }}
                  />
                </View>

                {/* LAYER 2: NỬA DƯỚI */}
                <View style={{ position: 'absolute', width: 82, height: 41, top: 41, left: 0, overflow: 'hidden' }}>
                  <View 
                    style={{ 
                      width: 82, height: 82, borderRadius: 41,
                      top: -41, left: 0, 
                      backgroundColor: '#FFFFFF' 
                    }}
                  />
                </View>

                {/* LAYER 3: ẢNH PET */}
                <View className="absolute inset-0 items-center justify-center pointer-events-none">
                    <Image
                        source={{ uri: avatarUrl }}
                        className="w-[70px] h-[70px] rounded-full bg-gray-200"
                        resizeMode="cover"
                    />
                </View>
              </View>

              <Text className="text-[16px] font-semibold text-black mt-[48px] mb-[4px] tracking-tight">
                  {petData.name}
              </Text>
              <Text className="text-[12px] font-regular text-[#8E8E93] mb-[4px] tracking-wider">
                  ID: {displayId}
              </Text>

              {/* BỌC TOUCHABLE ĐỂ MỞ OVERLAY */}
              <TouchableOpacity 
                activeOpacity={0.8} 
                onPress={() => setShowQrOverlay(true)}
                className="p-5 bg-white items-center justify-center"
              >
                  <QRCode
                    value={qrValue}
                    size={QR_SIZE}
                    color="#111827"
                    backgroundColor="transparent"
                  />
              </TouchableOpacity>

              <View className="flex-row items-center justify-center mt-6">
                  <Text className="text-[16px] font-semibold text-gray-900 tracking-tighter">Paw</Text>
                  <Text className="text-[16px] font-semibold text-[#F97316] tracking-tighter">Life</Text>
              </View>
            </View>

            <Text className="text-center text-[12px] text-[#8E8E93] font-regular mt-[15px] mb-16 px-4 w-[294px]">
              Please always attach QR tag on {petData.name}
            </Text>

            <View className="w-full">
              <TouchableOpacity 
                onPress={() => router.push({ pathname: '/transfer-ownership', params: { petId } })} 
                activeOpacity={0.7} 
                className="w-full bg-white border border-[#E89B5A] py-[16px] rounded-[20px] items-center justify-center"
              >
                <View className='flex-row items-center'>
                  <ArrowRightLeft size={24} color="#E89B5A" strokeWidth={2} />
                  <Text className="text-[16px] font-medium text-[#E89B5A] ml-2">Transfer Ownership</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.7} className="w-full mt-[12px] bg-white border border-gray-200 py-[16px] rounded-[20px] items-center justify-center">
                <View className='flex-row items-center'>
                  <RefreshCcw size={24} color="#8E8E93" strokeWidth={2} />
                  <Text className="text-[16px] font-medium text-[#8E8E93] ml-2">Replace QR Code</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View className="mt-[16px] items-center pb-4">
              <TouchableOpacity activeOpacity={0.6}>
                <Text className="text-[12px] font-regular text-[#8E8E93] tracking-wide">Report lost or damaged tag</Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </SafeAreaView>

      {/* OVERLAY HIỂN THỊ QR PHÓNG TO */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showQrOverlay}
        onRequestClose={() => setShowQrOverlay(false)}
      >
        <BlurView 
          intensity={80} 
          tint="dark" 
          style={StyleSheet.absoluteFill}
          className="flex-1 justify-center items-center"
        >
          {/* Nút Close góc trên bên phải */}
          <SafeAreaView className="absolute top-0 right-0 w-full flex-row justify-end px-6 py-4 pointer-events-box-none">
            <TouchableOpacity 
              onPress={() => setShowQrOverlay(false)}
              className="p-2 bg-white/20 rounded-full mt-2"
            >
              <Feather name="x" size={28} color="white" />
            </TouchableOpacity>
          </SafeAreaView>

          {/* QR Code được scale to và bo tròn */}
          <View className="bg-white p-6 rounded-[28px] shadow-2xl items-center justify-center mb-8 overflow-hidden">
            <QRCode
              value={qrValue}
              size={LARGE_QR_SIZE}
              color="#111827"
              backgroundColor="transparent"
            />
          </View>

          {/* Nút Download */}
          <TouchableOpacity 
            onPress={handleDownloadQr}
            activeOpacity={0.8}
            className="flex-row items-center bg-[#E89B5A] px-8 py-4 rounded-full shadow-lg"
          >
            <Feather name="download" size={20} color="white" />
            <Text className="text-white font-semibold text-[16px] ml-3">Download QR code</Text>
          </TouchableOpacity>
        </BlurView>
      </Modal>

    </View>
  );
}