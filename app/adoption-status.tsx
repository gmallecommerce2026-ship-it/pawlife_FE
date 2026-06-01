// app/adoption-status.tsx
import axiosClient from '@/api/axiosClient';
import { Text } from '@/components/AppText';
import { useImageUpload } from '@/hooks/useImageUpload';
import { calculateAge } from '@/utils/dateHelper';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, Modal, ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// --- KHAI BÁO TYPE ---
type StepState = 'completed' | 'active' | 'alert' | 'error' | 'success';

interface TimelineStep {
  id: string;
  title: string;
  state: StepState;
  date?: string;
  description?: string;
  actionRequired?: string;
}

export default function AdoptionStatusScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [applicationData, setApplicationData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isWithdrawVisible, setIsWithdrawVisible] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isOptionsVisible, setIsOptionsVisible] = useState(false);
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);

  const { width } = useWindowDimensions();
  const imageSize = (width - 40 - 48) / 5;
  const { pickAndUploadImage, isUploading } = useImageUpload();
  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const [photos, setPhotos] = useState<string[]>([]);
  useEffect(() => {
    if (id) {
      fetchApplicationDetails();
    }
  }, [id]);

  const fetchApplicationDetails = async () => {
    try {
      setIsLoading(true);
      const response = await axiosClient.get(`/applications/${id}`);
      setApplicationData(response.data.data);
    } catch (error) {
      console.error('Lỗi khi fetch chi tiết đơn:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async () => {
    try {
      setIsWithdrawing(true);
      await axiosClient.patch(`/applications/${id}/withdraw`);
      setIsWithdrawVisible(false);
      fetchApplicationDetails();
    } catch (error) {
      console.error('Lỗi khi thu hồi đơn:', error);
    } finally {
      setIsWithdrawing(false);
    }
  };

  // --- LOGIC SINH TIMELINE ĐỘNG CHO 7 TRẠNG THÁI ---
  const generateTimelineSteps = (status: string, createdAt: string, updatedAt: string) => {
    const createdDate = new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const updatedDate = new Date(updatedAt || createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const steps: TimelineStep[] = [
      { id: '1', title: 'Application Submitted', state: 'completed', date: createdDate, description: 'Đơn đăng ký nhận nuôi của bạn đã được gửi thành công đến Shelter.' }
    ];

    switch (status) {
      case 'SUBMITTED':
        steps.push({ id: '2', title: 'Pending Review', state: 'active', description: 'Shelter đang chuẩn bị xem xét hồ sơ của bạn.' });
        break;
      case 'PENDING':
        steps.push({ id: '2', title: 'Under Review', state: 'active', date: updatedDate, description: 'Shelter đang xem xét hồ sơ và thông tin của bạn.' });
        break;
      case 'NEED_MORE_INFO':
        steps.push({ 
          id: '2', 
          title: 'Need More Information', 
          state: 'alert', 
          date: updatedDate,
          description: 'Shelter needs a bit more information to verify.',
          actionRequired: 'Photos of your living space' 
        });
        break;
      case 'INTERVIEW_SCHEDULED':
        steps.push({ id: '2', title: 'Reviewed', state: 'completed' });
        steps.push({ id: '3', title: 'Interview Scheduled', state: 'active', date: updatedDate, description: 'Shelter đã lên lịch phỏng vấn với bạn. Vui lòng kiểm tra tin nhắn.' });
        break;
      case 'APPROVED':
        steps.push({ id: '2', title: 'Reviewed', state: 'completed' });
        steps.push({ id: '3', title: 'Interviewed', state: 'completed' });
        steps.push({ id: '4', title: 'Application Approved', state: 'active', date: updatedDate, description: 'Chúc mừng! Hồ sơ của bạn đã được duyệt. Hãy chuẩn bị đón bé về.' });
        break;
      case 'ADOPTION_COMPLETED':
        steps.push({ id: '2', title: 'Reviewed', state: 'completed' });
        steps.push({ id: '3', title: 'Interviewed', state: 'completed' });
        steps.push({ id: '4', title: 'Approved', state: 'completed' });
        steps.push({ id: '5', title: 'Adoption Completed', state: 'success', date: updatedDate, description: 'Cảm ơn bạn đã nhận nuôi! 💛' });
        break;
      case 'CLOSED':
        steps.push({ id: '2', title: 'Closed', state: 'error', date: updatedDate, description: 'Đơn đăng ký này đã bị đóng hoặc thu hồi.' });
        break;
      default:
        steps.push({ id: '2', title: 'Processing', state: 'active', description: 'Đơn đang được xử lý.' });
        break;
    }
    return steps;
  };

  const handleAddPhoto = async () => {
    if (photos.length >= 5) return;
    const imageUrl = await pickAndUploadImage({
      folder: 'lost-pets',
      aspect: [4, 3],
      quality: 0.8,
    });
    if (imageUrl) {
      setPhotos((prev) => [...prev, imageUrl]);
    }
  };

  const renderNodeIcon = (state: string) => {
    switch (state) {
      case 'completed': return <View className="w-[26px] h-[26px] rounded-full bg-[#E89B5A] items-center justify-center z-20"><Feather name="check" size={16} color="white" /></View>;
      case 'success': return <View className="w-[26px] h-[26px] rounded-full bg-[#E89B5A] items-center justify-center z-20"><MaterialCommunityIcons name="heart" size={16} color="white" /></View>;
      case 'alert': return <View className="w-[26px] h-[26px] rounded-full bg-[#E89B5A] items-center justify-center z-20"><Ionicons name="alert" size={16} color="white" /></View>;
      case 'error': return <View className="w-[26px] h-[26px] rounded-full bg-[#E89B5A] items-center justify-center z-20"><Feather name="x" size={16} color="white" /></View>;
      case 'active':
      default: return <View className="w-[26px] h-[26px] rounded-full bg-[#E89B5A] border-[3px] border-[#D38544] items-center justify-center z-20 shadow-sm shadow-[#D38544]"><View className="w-2.5 h-2.5 rounded-full bg-[#D38544]" /></View>;
    }
  };

  if (isLoading || !applicationData) {
    return (
      <SafeAreaView className="flex-1 bg-[#F9FAFB] justify-center items-center" edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#ffa053" />
      </SafeAreaView>
    );
  }

  const SectionCard = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <View className="mb-[30px] px-[23px]">
      <Text className="text-[16px] font-semibold text-gray-900 mb-3 tracking-tight">{title}</Text>
      <View className="bg-[#FBFBFB] px-4 py-1 rounded-[16px]">
        {children}
      </View>
    </View>
  );

  const DetailRow = ({ label, value, isLast = false, isQuote = false }: { label: string, value: string, isLast?: boolean, isQuote?: boolean }) => (
    <View className={`py-2 flex-row justify-between items-start`}>
      <Text className="text-[14px] text-[#8E8E93] w-1/3 mt-0.5">{label}</Text>
      <Text className={`text-[15px] flex-1 text-right leading-6 ${isQuote ? 'italic text-gray-600' : 'font-medium text-black'}`}>
        {value}
      </Text>
    </View>
  );

  const CommitmentItem = ({ text }: { text: string }) => (
    <View className="flex-row items-center py-1 border-b border-gray-50">
      <View className="w-6 h-6 rounded-full items-center justify-center">
        <Feather name="check" size={14} color="#10B981" />
      </View>
      <Text className="text-[15px] font-medium text-gray-800 ml-3 flex-1">{text}</Text>
    </View>
  );

  const pet = applicationData.pet;
  const isClosed = applicationData.status === 'CLOSED';
  
  // DÙNG HÀM TẠO TIMELINE ĐỘNG DỰA VÀO DỮ LIỆU BACKEND
  const timelineSteps = generateTimelineSteps(applicationData.status, applicationData.createdAt, applicationData.updatedAt);
  
  const commitments = applicationData.commitments || {};

  const submittedDate = new Date(applicationData.createdAt).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric'
  });

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* 1. HEADER */}
      <View className="flex-row items-center justify-between px-5 py-4 bg-white">

        {/* 1. Nút Back bên trái */}
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.8}
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 5,
            elevation: 3,
          }}
        >
          <View className="overflow-hidden rounded-full w-[36px] h-[36px] items-center justify-center"
            style={{
              width: 36,
              height: 36,
              borderRadius: 28,
              borderWidth: 0.5,
              borderTopColor: 'white',
              borderLeftColor: 'white',
              borderBottomColor: 'transparent',
              borderRightColor: 'transparent',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            }}>
            <LinearGradient
              colors={['rgba(221, 221, 221, 0.5)', 'rgba(247, 247, 247, 0.8)', '#FFFFFF']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              locations={[0, 0.3, 1]}

              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 9999 }}
            />
            <Feather name="chevron-left" size={20} color="#00000" />
          </View>
        </TouchableOpacity>

        {/* 2. Tiêu đề "Adoption Status" nằm chính giữa */}
        <Text className="text-[20px] font-semibold text-black tracking-tight">
          Adoption Status
        </Text>

        {/* 3. SỬA Ở ĐÂY: Thay thế ô trống cũ bằng NÚT THÊM MỚI (+) */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 5,
            elevation: 3,
          }}
        >
          {/* Sử dụng icon plus từ thư viện Feather */}
          <View className="overflow-hidden rounded-full w-[36px] h-[36px] items-center justify-center"
            style={{
              width: 36,
              height: 36,
              borderRadius: 28,
              borderWidth: 0.5,
              borderTopColor: 'white',
              borderLeftColor: 'white',
              borderBottomColor: 'transparent',
              borderRightColor: 'transparent',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            }}>
            <LinearGradient
              colors={['rgba(221, 221, 221, 0.5)', 'rgba(247, 247, 247, 0.8)', '#FFFFFF']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              locations={[0, 0.3, 1]}

              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 9999 }}
            />
            <Image
              className=''
              source={require('../assets/icon/share.png')}
              style={{ width: 16, height: 16 }}
              resizeMode="cover"
            />
          </View>
        </TouchableOpacity>

      </View>

      <View
        className="flex-col pt-[14px] px-[14px] mx-5 mt-[21px] rounded-[13px]"
        style={{
          shadowColor: '#000000',
          shadowOffset: { width: 1, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        <LinearGradient
          colors={
            pet?.gender === 'FEMALE'
              ? ['#FBF0F6', '#F8E8F1'] // Màu Tone Hồng cho bé cái
              : ['#F5FBFF', '#E2EFF8'] // Màu Tone Xanh cho bé đực 
          }
          locations={[0, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 13 }}
        />
        {/* Phần trên: Ảnh và Thông tin cơ bản */}
        <TouchableOpacity
          className="flex-row mb-3.5 relative z-10" // Thêm relative z-10
          activeOpacity={0.7}
          onPress={() => {
            if (pet?.id) {
              // Fix: Dùng Object navigation để tránh lỗi parse URL
              router.push({
                pathname: '/shelter-pet-detail',
                params: { id: pet.id }
              });
            }
          }}
        >
          <Image
            source={{ uri: pet?.images?.[0]?.url || 'https://via.placeholder.com/150' }}
            className="w-[76px] h-[76px] rounded-2xl bg-gray-100"
            resizeMode="cover"
          />

          <View className="flex-1 mb-2 ml-[10px] justify-center pointer-events-none"> 
            {/* Thêm pointer-events-none để text không chặn bấm */}
            <Text className="text-[16px] font-medium text-black leading-tight" numberOfLines={1}>
              {pet?.name}
            </Text>

            {/* Fix: Tính toán tuổi từ DOB */}
            <Text className="text-[#8E8E93] text-[12px] font-regular mt-[7px]" numberOfLines={1}>
              {calculateAge(pet?.dob) || 'Unknown'} • {pet?.breed || 'Unknown'}
            </Text>
          </View>

          {/* Sửa lại nút bấm Shelter: Bọc riêng ra góc để không conflict vùng bấm */}
          <View className="absolute bottom-0 right-0 z-20"> 
            <TouchableOpacity
              activeOpacity={0.6}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              onPress={(e) => {
                e.stopPropagation(); 
                const shelterId = pet?.shelter?.id || pet?.shelterId;
                if (shelterId) {
                  router.push(`/shelter-profile?id=${shelterId}`);
                }
              }}
            >
              <Text className="text-[#E89B5A] text-[12px] font-semibold mt-[7px]" numberOfLines={1}>
                {pet?.shelter?.name || 'PawLife Shelter'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* Phần dưới: Màu nền xám, thêm padding dọc (py-3), bo góc dưới */}
        <View className="flex-row justify-between items-center py-[14px] border-t border-[#E5E5E5] bg-[#FFFFFF]/40 -mx-[14px] px-[14px] rounded-b-[13px]">
          {/* ID thay cho status ở góc trái */}
          <View className="">
            <Text className="text-[#8E8E93] text-[12px] font-medium">
              ID: #{applicationData.id.substring(applicationData.id.length - 6).toUpperCase()}
            </Text>
          </View>

          {/* Nút View Application Details thay cho ngày tháng ở góc phải */}
          <TouchableOpacity
            className=""
            activeOpacity={0.7}
            onPress={() => setIsDetailsVisible(true)}
          >
            <Text className="text-[#8E8E93] text-[12px] font-regular">
              View Application Details
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 5. APPLICATION PROGRESS TIMELINE */}
      <View className="bg-white px-5 mt-[38px] pb-2 shadow-sm shadow-gray-50/50">
        <Text className="text-[16px] font-semibold text-black mb-[21px] tracking-[0.06px]">Application Progress</Text>
        <View className="p-[17px] border rounded-[16px] border-[#E5E5E5]">
          {timelineSteps.map((step, index) => {
            const isLast = index === timelineSteps.length - 1;
            const isCompletedStep = step.state === 'completed';
            return (
              <View key={step.id} className="flex-row relative">
                {!isLast && <View className={`absolute left-[12px] top-[26px] bottom-[-4px] w-[2px] z-10 ${isCompletedStep ? 'bg-[#E89B5A]' : 'bg-gray-200'}`} />}

                <View className="w-[26px] items-center z-20 pt-0.5">{renderNodeIcon(step.state)}</View>

                <View className={`flex-1 ml-4 ${!isLast ? 'pb-8' : 'pb-4'}`}>
                  <Text className={`text-[14px] font-medium mt-1 ${step.state === 'alert' ? 'text-[#F59E0B]' : step.state === 'error' ? 'text-[#EF4444]' : step.state === 'success' ? 'text-[#10B981]' : 'text-gray-900'}`}>{step.title}</Text>
                  {step.date && <Text className="text-[12px] font-regular text-[#8E8E93] mt-1">{step.date}</Text>}
                  {isLast && step.description && <Text className="text-[12px] font-regular text-[#8E8E93] mt-2 leading-5">{step.description}</Text>}
                  {step.actionRequired && (
                    <View className="flex-row flex-wrap gap-3 mt-2">
                      {photos.length === 0 ? (
                        <TouchableOpacity className="self-start mt-3.5 flex-row items-center bg-[#FFFFFF] border border-gray-100 rounded-xl p-3.5" activeOpacity={0.7} onPress={handleAddPhoto}>
                          <Image
                            className='mr-2 bottom-[1px]'
                            source={require('../assets/icon/upload-gray.png')}
                            style={{ width: 12, height: 12 }}
                            resizeMode="cover"
                          />
                          <Text className="text-[14px] font-medium text-gray-800">{step.actionRequired}</Text>
                        </TouchableOpacity>
                      ) : (
                        <>
                          {photos.map((uri, index) => (
                            <View key={index} className="relative" style={{ width: imageSize, height: imageSize }}>
                              <Image
                                source={{ uri }}
                                className="w-full h-full rounded-[14px] bg-[#F3F4F6]"
                              />
                              <TouchableOpacity
                                onPress={() => handleRemovePhoto(index)}
                                activeOpacity={0.7}
                                className="absolute -top-2 -right-2 w-6 h-6 rounded-full items-center justify-center"
                                style={{ elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3 }}
                              >
                                <LinearGradient
                                  colors={['rgba(221, 221, 221, 0.3)', 'rgba(247, 247, 247, 0.7)', '#FFFFFF']}
                                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                  locations={[0, 0.3, 1]}

                                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 9999 }}
                                />
                                <X size={10} color="#000000" strokeWidth={3} />
                              </TouchableOpacity>
                            </View>
                          ))}

                          {photos.length < 4 && (
                            <TouchableOpacity
                              onPress={handleAddPhoto}
                              activeOpacity={0.7}
                              disabled={isUploading}
                              className="bg-[#F9FAFB] border-[1.5px] border-dashed border-[#E5E5E5] rounded-[14px] items-center justify-center"
                              style={{ width: imageSize, height: imageSize }}
                            >
                              {isUploading ? (
                                <ActivityIndicator size="small" color="#9CA3AF" />
                              ) : (
                                <Image
                                  source={require('../assets/icon/upload-gray.png')}
                                  className="w-[18px] h-[18px]"
                                />
                              )}
                            </TouchableOpacity>
                          )}
                        </>
                      )}
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>
      {!isClosed && <Text className="text-center text-[13px] text-gray-400 mb-4 mt-[24px] font-regular tracking-[0.06px]">All adoption decisions are handled directly by the shelter.</Text>}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
      </ScrollView>
      {/* 6. FOOTER ACTIONS */}
      <View className="px-5 pb-[31px] bg-white w-full">
        {isClosed ? (
          <View className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm shadow-gray-100/50">
            <View className="w-12 h-12 bg-gray-50 rounded-full items-center justify-center self-center mb-3">
              <Feather name="search" size={20} color="#9CA3AF" />
            </View>
            <Text className="text-[17px] font-bold text-gray-900 text-center mb-2 tracking-tight">Keep Looking</Text>
            <Text className="text-[14px] text-gray-500 text-center mb-6 leading-5 px-2">There are many other wonderful pets waiting for a home. We've found some similar pets you might like.</Text>

            <TouchableOpacity
              className="bg-[#ffa053] rounded-[14px] py-4 items-center shadow-sm shadow-orange-200"
              activeOpacity={0.8}
              onPress={() => router.push('/matching')}
            >
              <Text className="text-white font-bold text-[15px] tracking-wide">Browse More Pets</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            className="items-center py-[21px] bg-[#F6F6F6] rounded-full"
            activeOpacity={0.7}
            onPress={() => setIsWithdrawVisible(true)}
          >
            <Text className="text-[16px] font-semibold text-[#B8B8B8]">Withdraw Application</Text>
          </TouchableOpacity>
        )}
      </View>


      {/* ========================================= */}
      {/* POPUP 2: WITHDRAW CONFIRMATION DIALOG */}
      {/* ========================================= */}
      <Modal
        visible={isWithdrawVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsWithdrawVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/60 px-5">
          <View className="bg-white w-full rounded-[28px] p-7 items-center shadow-2xl">
            <View className="w-16 h-16 rounded-full bg-red-50 items-center justify-center mb-5 border border-red-100">
              <Feather name="alert-triangle" size={26} color="#EF4444" />
            </View>
            <Text className="text-[20px] font-bold text-gray-900 text-center mb-3 tracking-tight">
              Withdraw request?
            </Text>
            <Text className="text-[15px] text-gray-500 text-center mb-8 leading-6 px-1">
              The shelter will be notified that you've withdrawn your adoption request for <Text className="font-bold text-gray-800">{pet?.name}</Text>. This action cannot be undone.
            </Text>
            <View className="w-full flex-col gap-3.5">
              <TouchableOpacity
                className={`w-full py-4 rounded-[14px] items-center shadow-sm ${isWithdrawing ? 'bg-red-400 shadow-none' : 'bg-[#EF4444] shadow-red-200'}`}
                activeOpacity={0.8}
                onPress={handleWithdraw}
                disabled={isWithdrawing}
              >
                {isWithdrawing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-[15px] tracking-wide">Withdraw Request</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                className="w-full bg-gray-50 py-4 rounded-[14px] items-center border border-gray-100"
                activeOpacity={0.7}
                onPress={() => setIsWithdrawVisible(false)}
                disabled={isWithdrawing}
              >
                <Text className="text-gray-600 font-bold text-[15px]">Keep Application</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={isDetailsVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsDetailsVisible(false)}
      >
        <BlurView
          intensity={40}
          tint="dark"
          style={StyleSheet.absoluteFill}
          className="flex-1 justify-center items-center"
        />       
        <View className="flex-1 justify-center bg-black/50">
          <View className="bg-white rounded-[24px] mx-[20px] mt-[60px] flex-1 shadow-2xl overflow-hidden max-h-[75%]" style={{ height: SCREEN_HEIGHT * 0.75 }}>

            <View className="flex-row items-center justify-center px-5 py-6 border-b border-gray-100 relative">

              <Text className="text-[20px] font-semibold text-gray-900 tracking-tight text-center">
                Application Details
              </Text>

              {/* Nút X định vị tuyệt đối ở góc bên phải */}
              <TouchableOpacity
                onPress={() => setIsDetailsVisible(false)}
                className="p-2 absolute right-5" // Sử dụng absolute và right-5
                activeOpacity={0.7}
              >
                <Feather name="x" size={16} color="#000000" />
              </TouchableOpacity>

            </View>

            {/* Nội dung chi tiết (Sử dụng dữ liệu applicationData có sẵn) */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30, paddingTop: 24 }}>

              <SectionCard title="A - Contact Information">
                <DetailRow label="Full Name" value={applicationData.fullName || 'N/A'} />
                <DetailRow label="Phone" value={applicationData.phone || 'N/A'} />
                <DetailRow label="Zalo/WhatsApp" value={applicationData.zalo || 'N/A'} />
                <DetailRow label="Adopting For" value={applicationData.adoptFor || 'N/A'} isLast />
              </SectionCard>

              <SectionCard title="B - Living Conditions">
                <DetailRow label="Location" value={applicationData.location || 'N/A'} />
                <DetailRow label="Housing Type" value={applicationData.housing || 'N/A'} />
                <DetailRow label="Children" value={applicationData.children || 'N/A'} />
                <DetailRow label="Cage Plans" value={applicationData.cage || 'N/A'} isLast />
              </SectionCard>

              <SectionCard title="C - Pet Experience">
                <DetailRow label="Previous Pet" value={applicationData.petExperience || 'N/A'} />
                {applicationData.prevPetHistory && applicationData.prevPetHistory.trim() !== '' && (
                  <DetailRow label="What Happened" value={`${applicationData.prevPetHistory}`} />
                )}
              </SectionCard>

              <SectionCard title="D - Employment & Personal">
                <DetailRow label="Employment" value={applicationData.employmentStatus || 'N/A'} isLast />
              </SectionCard>

              <SectionCard title="E - Adoption Commitment">
                {/* <DetailRow label="Reason for Adoption" value={`"${applicationData.adoptionReason || 'N/A'}"`} isQuote isLast={Object.keys(commitments).length === 0} />
                 */}
                <View className="py-2 border-b border-[#E5E5E5]">
                  <Text className="text-[14px] text-[#8E8E93] mt-0.5">Reason for Adoption</Text>
                  <Text className="text-[15px] pt-[7px] pb-[15px]">
                    {`${applicationData.adoptionReason || 'N/A'}`}
                  </Text>
                </View>
                {Object.keys(commitments).length > 0 && (
                  <View className="pt-2 pb-1">
                    {commitments.vaccine === 'Yes' && <CommitmentItem text="Yearly vaccinations" />}
                    {commitments.medical === 'Yes' && <CommitmentItem text="Hospital treatment when needed" />}
                    {commitments.expenses === 'Yes' && <CommitmentItem text="Cover pre-adoption expenses" />}
                    {commitments.updateStatus === 'Yes' && <CommitmentItem text="Provide status updates" />}
                    {commitments.homeVisit === 'Yes' && <CommitmentItem text="Allow home visits" />}
                    {commitments.provideID === 'Yes' && <CommitmentItem text="Provide ID and address" />}
                  </View>
                )}
              </SectionCard>

              <Text className="text-center text-[13px] font-medium text-gray-400 ">Submitted on {submittedDate}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}