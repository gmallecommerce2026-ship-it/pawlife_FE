import { Text } from '@/components/AppText';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
// 1. Thêm useRef
import { File, Paths } from 'expo-file-system';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgUri } from 'react-native-svg';
import { petService } from '../services/petService';

const { width } = Dimensions.get('window');
const QR_SIZE = Math.min(width * 0.45, 170);

const SHADOW_OPACITY = 0.05;
const SHADOW_RADIUS = 8;
const ELEVATION = 3;

interface RadioOptionProps {
  label: string;
  subLabel?: string;
  selected: boolean;
  onPress: () => void;
}

export default function ViewQrCode() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const petId = params.id as string;

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

  // 3. Khai báo ref để lấy ảnh Base64 từ QR

  const RadioOption = ({ label, subLabel, selected, onPress }: RadioOptionProps) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      className="flex-row items-start mb-4 mx-2"
    >
      <View
        className={`w-[16px] h-[16px] rounded-full border-[1px] items-center justify-center bottom-[1px] ${selected ? 'border-[#E89B5A]' : 'border-[#757575]'}`}
      >
        {selected && <View className="w-[10px] h-[10px] rounded-full bg-[#E89B5A]" />}
      </View>
      <View className="ml-2">
        <Text className={`text-[14px] font-medium text-black`}>{label}</Text>
        {subLabel && <Text className="text-[12px] text-gray-400 mt-0.5">{subLabel}</Text>}
      </View>
    </TouchableOpacity>
  );

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

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#FAFAFA]">
        <ActivityIndicator size="large" color="#E89B5A" />
        <Text className="mt-4 text-gray-500">Đang tải mã QR...</Text>
      </View>
    );
  }

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

  const displayId = petData.code || petData.id?.substring(0, 8).toUpperCase() || petId?.substring(0, 8).toUpperCase();
  const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1552053831-71594a27632d?q=80&w=600&auto=format&fit=crop';
  const avatarUrl = petData?.avatarUrl || petData?.images?.[0]?.url || FALLBACK_AVATAR;

  const activeTag = petData?.tags?.find((tag: any) => tag.status === 'ACTIVE') || petData?.tags?.[0];
  const tagId = activeTag?.id;
  const publicDomain = "https://pub-35c6d59c9e96467b9783df2a4e890a09.r2.dev";
  const qrUri = tagId ? `${publicDomain}/qr-codes/${tagId}.svg` : null;

  const handleDownloadQr = async () => {
    try {
      if (!qrUri) {
        Alert.alert('Lỗi', 'Không tìm thấy mã QR để tải về.');
        return;
      }

      const fileName = `pawlife_qr_${petData?.name ?? 'pet'}_${Date.now()}.svg`;
      const file = new File(Paths.cache, fileName);

      // Fetch SVG content rồi ghi vào file
      const response = await fetch(qrUri);
      const svgText = await response.text();
      await file.write(svgText);

      // Share file
      await Share.share({
        url: file.uri,
        message: `Mã QR của ${petData?.name} - PawLife`,
        title: `QR Code - ${petData?.name}`,
      });

      // Dọn file
      file.delete();

    } catch (error) {
      console.error('[handleDownloadQr] Error:', error);
      Alert.alert('Lỗi', 'Không thể lưu mã QR. Vui lòng thử lại.');
    }
  };

  async function handleSubmitReport() {
    setShowReportModal(false);
    
    // Logic: Nếu là Damaged Tag VÀ chọn "No, I'll do it later"
    const isDamaged = selectedIssue === 'damaged';
    const isLater = replaceTag === 'no';

    if (isDamaged && isLater) {
      try {
        // Gọi endpoint PATCH /pets/:id thông qua updatePet
        await petService.updatePet(petId, { needsQrReplacement: true });
      } catch (error) {
        console.error("Lỗi cập nhật flag:", error);
        Alert.alert("Lỗi", "Không thể ghi nhận trạng thái hỏng.");
      }
    }
    
    setPendingReplace(replaceTag === 'yes');
    setShowSuccessModal(true);
  }

  return (
    <View className="flex-1 bg-gray-50">
      <LinearGradient
        colors={['#FFF9F0', '#FFFFFF']}
        locations={[0, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView className="flex-1" edges={['top']}>
        {/* HEADER */}
        <View className="flex-row items-center justify-between px-5 py-4">
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 5,
              elevation: 3,
            }}
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
            <Text className="text-[20px] font-semibold text-[#111827] tracking-tight">View QR Code</Text>
          </View>

          <TouchableOpacity
            // Gắn tạm logic share vào nút share ở Header
            onPress={handleDownloadQr}
            activeOpacity={0.7}
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 5,
              elevation: 3,
            }}
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
          <View className="w-full self-center" style={{ maxWidth: 380, alignItems: 'center' }}>
            <View
              className="bg-white rounded-[24px] items-center mt-24 w-full"
              style={{
                maxWidth: 294,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: SHADOW_OPACITY,
                shadowRadius: SHADOW_RADIUS,
                elevation: ELEVATION,
              }}
            >
              <View className="absolute -top-[41px] self-center w-[82px] h-[82px] z-10">
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
                <View style={{ position: 'absolute', width: 82, height: 41, top: 41, left: 0, overflow: 'hidden' }}>
                  <View
                    style={{
                      width: 82, height: 82, borderRadius: 41,
                      top: -41, left: 0,
                      backgroundColor: '#FFFFFF'
                    }}
                  />
                </View>
                <View className="absolute inset-0 items-center justify-center pointer-events-none">
                  <Image
                    source={{ uri: avatarUrl }}
                    className="w-[70px] h-[70px] rounded-full bg-gray-200"
                    resizeMode="cover"
                  />
                </View>
              </View>

              <Text className="text-[20px] font-semibold text-black mt-[48px] mb-[4px] tracking-tight">
                {petData.name}
              </Text>
              <Text className="text-[12px] font-regular text-[#8E8E93] mb-[4px] tracking-wider">
                ID: {displayId}
              </Text>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowQrOverlay(true)}
                className="py-5 bg-white items-center justify-center w-full"
              >
                <View
                  style={{
                    width: 189,
                    height: 189,
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  {qrUri ? (
                    <SvgUri
                      width="189"
                      height="189"
                      uri={qrUri}
                      onError={() => console.log("Lỗi tải ảnh QR từ R2")}
                    />
                  ) : (
                    <View className="items-center justify-center flex-1">
                      <Text className="text-center text-[13px] text-gray-500">
                        Không tìm thấy mã QR
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              <View className="flex-row items-center justify-center pb-10">
                <Text className="text-[20px] font-semibold text-gray-900 tracking-tighter">Paw</Text>
                <Text className="text-[20px] font-semibold text-[#E89B5A] tracking-tighter">Life</Text>
              </View>
            </View>

            <Text className="text-center text-[12px] text-[#8E8E93] font-regular mt-[15px] mb-10 px-4 w-[294px]">
              Please always attach QR tag on {petData.name}
            </Text>

            <View className="w-full">
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/transfer-ownership', params: { petId } })}
                activeOpacity={0.7}
                className="w-full bg-white border border-[#E89B5A] py-[16px] rounded-[20px] items-center justify-center"
              >
                <View className='flex-row items-center'>
                  <Image source={require('../assets/icon/transfer.png')} style={{ width: 16, height: 16 }} resizeMode="cover" />
                  <Text className="text-[16px] font-medium text-[#E89B5A] ml-2">Transfer Ownership</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
              onPress={() => {
                  router.push({
                    pathname: '/(tabs)/scan',
                    params: { replacePetId: petData.id }
                  });
                }}
                activeOpacity={0.7} className="w-full mt-[12px] bg-white border border-gray-200 py-[16px] rounded-[20px] items-center justify-center">
                <View className='flex-row items-center'>
                  <Image source={require('../assets/icon/refresh.png')} style={{ width: 16, height: 16 }} resizeMode="cover" />
                  <Text className="text-[16px] font-medium text-[#8E8E93] ml-2">Replace QR Code</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View className="mt-10 items-center pb-4">
              <TouchableOpacity activeOpacity={0.6} onPress={() => setShowReportModal(true)}>
                <Text className="text-[12px] font-regular text-[#8E8E93] tracking-wide">Report lost or damaged tag</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={showQrOverlay}
        onRequestClose={() => setShowQrOverlay(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowQrOverlay(false)}
          className="flex-1 justify-center items-center"
        >
          <BlurView
            intensity={40}
            tint="dark"
            style={StyleSheet.absoluteFill}
            className="flex-1 justify-center items-center"
          >
            <View
              className="bg-white rounded-[24px] items-center pb-[26px] self-center border border-gray-100 w-full"
              style={{
                maxWidth:338,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: SHADOW_OPACITY,
                shadowRadius: SHADOW_RADIUS,
                elevation: ELEVATION,
              }}
            >
              <View className="absolute -top-[41px] self-center w-[82px] h-[82px] z-10">
                <View style={{ position: 'absolute', width: 120, height: 80, bottom: 41, left: -19, overflow: 'hidden' }}>
                  <View
                    style={{
                      width: 82, height: 82, borderRadius: 41, bottom: -41, left: 19, backgroundColor: '#FFFFFF',
                      borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
                      shadowOpacity: SHADOW_OPACITY, shadowRadius: SHADOW_RADIUS, elevation: ELEVATION
                    }}
                  />
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
                ID: {displayId}
              </Text>

              <View className='my-[24px]'>
                {/* 5. Khai báo REF và thêm Background nền TRẮNG cho QR */}
                <View
                  style={{
                    width: 196,
                    height: 196,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  {qrUri ? (
                    <SvgUri
                      width="196"
                      height="196"
                      uri={qrUri}
                    />
                  ) : (
                    <Text className="text-gray-400">
                      QR unavailable
                    </Text>
                  )}
                </View>
              </View>

              <View className="flex-row items-center justify-center">
                <Text className="text-[22px] font-semibold text-gray-900 tracking-tighter">Paw</Text>
                <Text className="text-[22px] font-semibold text-[#E89B5A] tracking-tighter">Life</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleDownloadQr}
              activeOpacity={0.8}
              className="absolute flex-row items-center bg-[#FFFFFF]/80 px-8 py-4 rounded-[16px] bottom-24"
            >
              <Feather name="share" size={20} color="#8E8E93" />
              <Text className="text-[#8E8E93] font-medium text-[16px] ml-3">Save QR</Text>
            </TouchableOpacity>
          </BlurView>
        </TouchableOpacity>
      </Modal>

      {/* MODAL REPORT TAG ISSUE */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showReportModal}
        onRequestClose={() => setShowReportModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          className="flex-1 justify-center items-center px-6"
          onPress={Keyboard.dismiss}
        >
          <BlurView
            intensity={30}
            tint="dark"
            style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
          />

          <View className="bg-white w-full rounded-[32px] p-8 shadow-2xl relative">
            <TouchableOpacity
              onPress={() => {
                setShowReportModal(false);
                setReplaceTag(null);
                setOtherDetail('');
              }}
              className="absolute top-6 right-6 p-2 z-10"
            >
              <Feather name="x" size={20} color="#111827" />
            </TouchableOpacity>

            <Text className="text-[20px] font-semibold text-center text-black mb-8">
              Report Tag Issue
            </Text>

            <Text className="text-[16px] font-semibold text-black mb-6">
              What's happening with the QR tag? <Text className="text-red-500">*</Text>
            </Text>

            <View>
              <RadioOption
                label="Lost Tag"
                subLabel="Tag is missing/stolen"
                selected={selectedIssue === 'lost'}
                onPress={() => { setSelectedIssue('lost'); setReplaceTag(null); }}
              />

              {selectedIssue === 'lost' && (
                <View className="mx-8 bg-[#E89B5A]/5 border -mt-2 border-[#E89B5A]/30 rounded-[12px] py-2 px-3 flex-row items-start mb-8">
                  <View className="flex-1">
                    <Text className="text-[10px] font-medium text-black">
                      This QR tag will be removed from {petData?.name}’s profile.
                    </Text>
                    <Text className="text-[10px] text-[#757575] mt-1">
                      A replacement tag can be activated anytime.
                    </Text>
                  </View>
                </View>
              )}
              <RadioOption
                label="Damaged Tag"
                subLabel="QR code is damaged/unscannable"
                selected={selectedIssue === 'damaged'}
                onPress={() => { setSelectedIssue('damaged'); setReplaceTag(null); }}
              />
              <RadioOption
                label="Other Issue"
                selected={selectedIssue === 'other'}
                onPress={() => setSelectedIssue('other')}
              />

              {(selectedIssue === 'lost' || selectedIssue === 'damaged') && (
                <Animated.View entering={FadeInDown} className="mt-2 pt-2 ">
                  <Text className="text-[16px] font-semibold text-black mb-4">
                    Replace with new QR tag? <Text className="text-red-500">*</Text>
                  </Text>
                  <View className="flex-row justify-between">
                    <RadioOption
                      label="Yes, replace now"
                      selected={replaceTag === 'yes'}
                      onPress={() => setReplaceTag('yes')}
                    />
                    <RadioOption
                      label="No, I’ll do it later"
                      selected={replaceTag === 'no'}
                      onPress={() => setReplaceTag('no')}
                    />
                  </View>
                </Animated.View>
              )}

              {selectedIssue === 'other' && (
                <Animated.View entering={FadeInDown} className="mt-2">
                  <TextInput
                    multiline
                    numberOfLines={4}
                    placeholder="Please describe your issue here..."
                    placeholderTextColor="#757575"
                    value={otherDetail}
                    onChangeText={setOtherDetail}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl text-[14px] text-black"
                    style={{ textAlignVertical: 'top', minHeight: 50, fontFamily: 'Urbanist', padding: 14 }}
                  />
                </Animated.View>
              )}
            </View>
            <TouchableOpacity
              onPress={() => {
                console.log("Submit:", { selectedIssue, replaceTag, otherDetail });
                handleSubmitReport();
              }}
              className={`w-full py-4 rounded-full mt-6 ${((selectedIssue === 'lost' || selectedIssue === 'damaged') && replaceTag) ||
                (selectedIssue === 'other' && otherDetail.trim().length > 0)
                ? 'bg-[#E89B5A]' : 'bg-gray-200'
                }`}
              disabled={!(
                ((selectedIssue === 'lost' || selectedIssue === 'damaged') && replaceTag) ||
                (selectedIssue === 'other' && otherDetail.trim().length > 0)
              )}
            >
              <Text className={`text-center font-semibold text-[14px] ${((selectedIssue === 'lost' || selectedIssue === 'damaged') && replaceTag) ||
                (selectedIssue === 'other' && otherDetail.trim().length > 0)
                ? 'text-white' : 'text-gray-400'
                }`}>
                Submit Report
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      <Modal
        animationType="fade"
        transparent={true}
        visible={showSuccessModal}
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-6">
          <View className="bg-white w-full rounded-[32px] p-8 items-center">
            <View className="w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-4">
              <Feather name="check" size={32} color="#22C55E" />
            </View>
            <Text className="text-xl font-bold text-black mb-2">Report Successful!</Text>
            <Text className="text-gray-500 text-center mb-8">
              {pendingReplace 
                ? "We have recorded your report. Would you like to proceed with replacing your QR tag now?"
                : "We have received your report and will process it shortly."}
            </Text>
            
            <View className="flex-row gap-4 w-full">
              <TouchableOpacity 
                onPress={() => setShowSuccessModal(false)}
                className="flex-1 py-4 rounded-full bg-gray-100"
              >
                <Text className="text-center font-semibold text-gray-600">Close</Text>
              </TouchableOpacity>
              
              {pendingReplace && (
                <TouchableOpacity 
                  onPress={() => {
                    setShowSuccessModal(false);
                    router.push({
                      pathname: '/(tabs)/scan',
                      params: { replacePetId: petData.id }
                    });
                  }}
                  className="flex-1 py-4 rounded-full bg-[#E89B5A]"
                >
                  <Text className="text-center font-semibold text-white">Replace Now</Text>
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