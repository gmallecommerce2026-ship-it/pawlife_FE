import { Text } from '@/components/AppText';
import { petService } from '@/services/petService';
import { Feather, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgUri } from 'react-native-svg';

const { width } = Dimensions.get('window');

// Lấy style bóng đổ từ file 2 (MyPetsScreen UI)
const CARD_SHADOW = {
  shadowColor: '#000000',
  shadowOpacity: 0.06,
  shadowRadius: 4,
  elevation: 6,
};

export default function ViewQrCode() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const petId = params.id as string;

  // --- STATE ---
  const [petData, setPetData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showQrOverlay, setShowQrOverlay] = useState(false);

  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [replaceTag, setReplaceTag] = useState<string | null>(null); // 'yes' hoặc 'no'
  const [otherDetail, setOtherDetail] = useState('');

  const RadioOption = ({ label, subLabel, selected, onPress }: any) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      className="flex-row items-start mb-4 mx-2"
    >
      <View
        className={`w-[16px] h-[16px] rounded-full border-[1px] items-center justify-center bottom-[1px] ${selected ? 'border-[#F59E0B]' : 'border-[#757575]'}`}
      >
        {selected && <View className="w-[10px] h-[10px] rounded-full bg-[#F59E0B]" />}
      </View>
      <View className="ml-2">
        <Text className={`text-[14px] font-medium text-black`}>{label}</Text>
        {subLabel && <Text className="text-[12px] text-gray-400 mt-0.5">{subLabel}</Text>}
      </View>
    </TouchableOpacity>
  );

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
    Alert.alert("Thông báo", "Tính năng tải QR Code đang được phát triển.");
  };

  // --- RENDER LOADING STATE ---
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8F9FB]">
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 248, 240, 0.69)']}
          locations={[0.3, 0.8]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text className="mt-4 text-gray-500">Đang tải mã QR...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // --- RENDER NOT FOUND STATE ---
  if (!petData) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8F9FB]">
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 248, 240, 0.69)']}
          locations={[0.3, 0.8]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View className="flex-1 justify-center items-center px-4">
          <Feather name="alert-circle" size={64} color="#E5E7EB" />
          <Text className="text-gray-800 text-lg font-bold mt-4 text-center">Không tìm thấy thông tin thú cưng</Text>
          <TouchableOpacity onPress={() => router.back()} className="mt-6 bg-orange-50 border border-orange-200 px-6 py-2 rounded-full">
            <Text className="text-[#F59E0B] font-bold">Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- XỬ LÝ DỮ LIỆU HIỂN THỊ ---
  const displayId = petData.code || petData.id?.substring(0, 8).toUpperCase() || petId?.substring(0, 8).toUpperCase();
  const avatarUrl = petData.avatarUrl || petData.images?.[0]?.url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=500&auto=format&fit=crop';

  const activeTag = petData?.tags?.find((tag: any) => tag.status === 'ACTIVE') || petData?.tags?.[0];
  const tagId = activeTag?.id;
  const publicDomain = "https://pub-35c6d59c9e96467b9783df2a4e890a09.r2.dev";
  const qrUri = tagId ? `${publicDomain}/qr-codes/${tagId}.svg` : null;

  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FB]" edges={['top', 'bottom']}>
      {/* Background UI mượt mà từ file MyPetsScreen */}
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 248, 240, 0.69)']}
        locations={[0.3, 0.8]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 32 }}
      />

      {/* HEADER */}
      <View className="flex-row items-center justify-between px-6 pt-[28px] pb-[21px] z-10 bg-transparent">
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={CARD_SHADOW}
        >
          <View className="overflow-hidden rounded-full w-[40px] h-[40px] items-center justify-center bg-white border border-[#FFF9F0]">
            <Feather name="chevron-left" size={24} color="#1F2937" />
          </View>
        </TouchableOpacity>

        <View className="items-center">
          <Text className="text-[20px] font-medium text-black tracking-[0.06px]">Scanned Tag</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          style={CARD_SHADOW}
        >
          <View className="overflow-hidden rounded-full w-[40px] h-[40px] items-center justify-center bg-white border border-[#FFF9F0]">
            <Feather name="share" size={20} color="#1F2937" />
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full self-center" style={{ maxWidth: 380, alignItems: 'center' }}>
          
          {/* Main Card dùng style viền và bóng của file MyPets */}
          <View
            className="bg-white rounded-[24px] items-center pb-[26px] border border-[#FFF9F0] mt-24 w-full max-w-[310px]"
            style={CARD_SHADOW}
          >
            {/* Avatar Layer */}
            <View className="absolute -top-[45px] self-center w-[90px] h-[90px] z-10 rounded-full bg-white justify-center items-center p-1 border border-[#FFF9F0]" style={CARD_SHADOW}>
              <Image
                source={{ uri: avatarUrl }}
                className="w-full h-full rounded-full bg-gray-100"
                resizeMode="cover"
              />
            </View>

            <Text className="text-[22px] font-semibold text-gray-900 mt-[56px] mb-[4px] tracking-tight">
              {petData.name}
            </Text>
            <Text className="text-[14px] font-regular text-gray-500 mb-[16px] tracking-wider">
              ID: {displayId}
            </Text>

            {/* BỌC TOUCHABLE ĐỂ MỞ OVERLAY */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowQrOverlay(true)}
              className="p-4 bg-white items-center justify-center rounded-[20px] border border-dashed border-orange-200"
            >
              <View style={styles.qrContainer}>
                {qrUri ? (
                    <SvgUri
                      width="180"
                      height="180"
                      uri={qrUri}
                      onError={() => console.log("Lỗi tải ảnh QR từ R2")}
                    />
                  ) : (
                    <View className="items-center justify-center p-4">
                      <Feather name="alert-circle" size={32} color="#F59E0B" />
                      <Text className="text-gray-500 mt-2 text-center">Không tìm thấy mã QR</Text>
                    </View>
                  )}
              </View>
            </TouchableOpacity>

            <View className="flex-row items-center justify-center mt-6">
              <Text className="text-[22px] font-semibold text-gray-900 tracking-tighter">Paw</Text>
              <Text className="text-[22px] font-semibold text-[#F59E0B] tracking-tighter">Life</Text>
            </View>
          </View>

          <Text className="text-center text-[13px] text-gray-400 font-regular mt-[18px] mb-10 px-4">
            Please always attach QR tag on {petData.name}
          </Text>

          {/* Action Buttons */}
          <View className="w-full">
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/transfer-ownership', params: { petId } })}
              activeOpacity={0.7}
              className="w-full bg-orange-50 border border-[#F59E0B] py-[16px] rounded-[20px] items-center justify-center flex-row shadow-sm"
            >
              <Feather name="repeat" size={18} color="#F59E0B" />
              <Text className="text-[16px] font-medium text-[#F59E0B] ml-2">Transfer Ownership</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.7} className="w-full mt-[12px] bg-white border border-gray-200 py-[16px] rounded-[20px] items-center justify-center flex-row shadow-sm">
              <Feather name="refresh-cw" size={18} color="#8E8E93" />
              <Text className="text-[16px] font-medium text-[#8E8E93] ml-2">Replace QR Code</Text>
            </TouchableOpacity>
          </View>

          <View className="mt-[20px] items-center pb-4">
            <TouchableOpacity activeOpacity={0.6} onPress={() => setShowReportModal(true)} className="flex-row items-center">
              <Feather name="alert-triangle" size={14} color="#9CA3AF" />
              <Text className="text-[13px] font-medium text-[#9CA3AF] tracking-wide ml-1 underline">Report lost or damaged tag</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* =========================================
          OVERLAY HIỂN THỊ QR PHÓNG TO 
      ========================================= */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showQrOverlay}
        onRequestClose={() => setShowQrOverlay(false)}
      >
        <BlurView
          intensity={60}
          tint="dark"
          style={StyleSheet.absoluteFill}
          className="flex-1 justify-center items-center"
        >
          <SafeAreaView className="absolute top-0 right-0 w-full flex-row justify-end px-6 py-4 pointer-events-box-none">
            <TouchableOpacity
              onPress={() => setShowQrOverlay(false)}
              activeOpacity={0.7}
              style={{ ...CARD_SHADOW, shadowOpacity: 0.2 }}
            >
              <View className="overflow-hidden rounded-full w-[40px] h-[40px] items-center justify-center bg-white/20 border border-white/30">
                <Feather name="x" size={24} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </SafeAreaView>

          <View className="bg-white rounded-[32px] p-8 items-center self-center shadow-2xl mx-6">
            <Text className="text-[24px] font-semibold text-gray-900 mb-[4px] tracking-tight text-center">
              {petData.name}
            </Text>
            <Text className="text-[14px] font-regular text-gray-500 mb-[24px] tracking-wider text-center">
              ID: {displayId}
            </Text>

            <View style={[styles.qrContainer, { backgroundColor: '#F8F9FB', borderRadius: 24 }]}>
              {tagId ? (
                <SvgUri width="240" height="240" uri={qrUri} />
              ) : (
                <Text>Đang tải mã QR...</Text>
              )}
            </View>

            {/* Nút Download */}
            <TouchableOpacity
              onPress={handleDownloadQr}
              activeOpacity={0.8}
              className="flex-row items-center justify-center bg-gray-900 w-full py-4 rounded-[16px] shadow-lg mt-8"
            >
              <Feather name="download" size={20} color="#FFFFFF" />
              <Text className="text-white font-medium text-[16px] ml-3">Download QR code</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </Modal>

      {/* =========================================
          MODAL REPORT TAG ISSUE 
      ========================================= */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showReportModal}
        onRequestClose={() => setShowReportModal(false)}
      >
        <View className="flex-1 justify-center items-center px-6">
          <BlurView 
            intensity={40}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <View className="bg-white w-full rounded-[32px] p-8 shadow-2xl relative border border-[#FFF9F0]">
            {/* Nút Close X */}
            <TouchableOpacity
              onPress={() => {
                setShowReportModal(false);
                setReplaceTag(null);
                setOtherDetail('');
              }}
              className="absolute top-6 right-6 p-2 z-10 bg-gray-50 rounded-full"
            >
              <Feather name="x" size={20} color="#4B5563" />
            </TouchableOpacity>

            <Text className="text-[22px] font-semibold text-center text-gray-900 mb-8">
              Report Tag Issue
            </Text>

            <Text className="text-[16px] font-medium text-gray-800 mb-6">
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
                <View className="bg-orange-50 border border-orange-200 rounded-[16px] py-3 px-4 flex-row items-start mb-5 shadow-sm">
                  <Ionicons className='mt-0.5' name="alert-circle" size={20} color="#F59E0B"/>
                  <View className="flex-1 ml-2">
                    <Text className="text-[14px] font-semibold text-gray-900">
                      {petData.name}'s safety first
                    </Text>
                    <Text className="text-[12px] text-gray-600 mt-1 leading-[18px]">
                      Report a lost tag will temporarily limit public QR access to protect {petData.name}'s info until a replacement is activated.
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
                <Animated.View entering={FadeInDown} className="mt-4 pt-4 border-t border-gray-100">
                  <Text className="text-[16px] font-medium text-gray-800 mb-4">
                    Would you like to replace with new QR tag? <Text className="text-red-500">*</Text>
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
                <Animated.View entering={FadeInDown} className="mt-4">
                  <TextInput
                    multiline
                    numberOfLines={4}
                    placeholder="Please describe your issue here..."
                    placeholderTextColor="#9CA3AF"
                    value={otherDetail}
                    onChangeText={setOtherDetail}
                    className="w-full bg-[#F8F9FB] border border-gray-200 rounded-[16px] text-[14px] p-4 text-black"
                    style={{ textAlignVertical: 'top', minHeight: 100 }}
                  />
                </Animated.View>
              )}
            </View>

            {/* Nút Submit */}
            <TouchableOpacity
              onPress={() => {
                console.log("Submit:", { selectedIssue, replaceTag, otherDetail });
                setShowReportModal(false);
              }}
              className={`w-full py-4 rounded-[20px] mt-8 shadow-sm ${((selectedIssue === 'lost' || selectedIssue === 'damaged') && replaceTag) ||
                (selectedIssue === 'other' && otherDetail.trim().length > 0)
                ? 'bg-[#F59E0B]' : 'bg-gray-200'
                }`}
              disabled={!(
                ((selectedIssue === 'lost' || selectedIssue === 'damaged') && replaceTag) ||
                (selectedIssue === 'other' && otherDetail.trim().length > 0)
              )}
            >
              <Text className={`text-center font-semibold text-[16px] ${((selectedIssue === 'lost' || selectedIssue === 'damaged') && replaceTag) ||
                (selectedIssue === 'other' && otherDetail.trim().length > 0)
                ? 'text-white' : 'text-gray-400'
                }`}>
                Submit Report
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'transparent',
  },
});