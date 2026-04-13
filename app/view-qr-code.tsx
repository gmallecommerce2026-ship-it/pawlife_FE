import { Text } from '@/components/AppText';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowRightLeft, RefreshCcw } from 'lucide-react-native';
import React from 'react';
import { Dimensions, Image, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const QR_SIZE = Math.min(width * 0.45, 170);

const SHADOW_OPACITY = 0.05;
const SHADOW_RADIUS = 8;
const ELEVATION = 3;

export default function ViewQrCode() {
  const router = useRouter();

  const petData = {
    name: 'Luna',
    id: 'ID: PL-98234710',
    avatar: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=2043&auto=format&fit=crop',
    qrValue: 'https://pawcare.app/pet/PL-98234710',
  };

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
                
                {/* LAYER 1: NỬA TRÊN - Đã thêm borderRadius: 41 (Bo tròn tuyệt đối) */}
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

                {/* LAYER 2: NỬA DƯỚI - Đã thêm borderRadius: 41 (Bo tròn tuyệt đối) */}
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
                        source={{ uri: petData.avatar }}
                        className="w-[70px] h-[70px] rounded-full bg-gray-200"
                        resizeMode="cover"
                    />
                </View>

              </View>

              <Text className="text-[16px] font-semibold text-black mt-[48px] mb-[4px] tracking-tight">
                  {petData.name}
              </Text>
              <Text className="text-[12px] font-regular text-[#8E8E93] mb-[4px] tracking-wider">
                  {petData.id}
              </Text>

              <View className="p-5 bg-white items-center justify-center">
                  <QRCode
                  value={petData.qrValue}
                  size={QR_SIZE}
                  color="#111827"
                  backgroundColor="transparent"
                  />
              </View>

              <View className="flex-row items-center justify-center mt-6">
                  <Text className="text-[16px] font-semibold text-gray-900 tracking-tighter">Paw</Text>
                  <Text className="text-[16px] font-semibold text-[#F97316] tracking-tighter">Life</Text>
              </View>
            </View>

            <Text className="text-center text-[12px] text-[#8E8E93] font-regular mt-[15px] mb-16 px-4 w-[294px]">
              Please always attach QR tag on {petData.name}
            </Text>

            <View className="w-full">
              <TouchableOpacity onPress={() => router.push('/transfer-ownership' as any)} activeOpacity={0.7} className="w-full bg-white border border-[#E89B5A] py-[16px] rounded-[20px] items-center justify-center">
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
    </View>
  );
}