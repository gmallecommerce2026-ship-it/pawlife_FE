// app/adoption-status.tsx
import axiosClient from '@/api/axiosClient';
import { Text } from '@/components/AppText';
import { AntDesign, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, Modal, ScrollView, TouchableOpacity, View } from 'react-native';
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

// --- COMPONENTS DÀNH CHO POPUP APPLICATION DETAILS ---
const SectionCard = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <View className="mb-6">
    <Text className="text-[16px] font-bold text-gray-900 mb-2.5 px-5">{title}</Text>
    <View className="bg-white px-5 py-2 border-y border-gray-100">
      {children}
    </View>
  </View>
);

const DetailRow = ({ label, value, isLast = false, isQuote = false }: { label: string, value: string, isLast?: boolean, isQuote?: boolean }) => (
  <View className={`py-3.5 ${!isLast ? 'border-b border-gray-100' : ''}`}>
    <Text className="text-[13px] text-gray-500 mb-1.5">{label}</Text>
    <Text className={`text-[15px] leading-6 ${isQuote ? 'italic text-gray-700' : 'font-medium text-gray-900'}`}>
      {value}
    </Text>
  </View>
);

const CommitmentItem = ({ text }: { text: string }) => (
  <View className="flex-row items-center py-2.5">
    <Feather name="check-circle" size={18} color="#10B981" />
    <Text className="text-[15px] font-medium text-gray-800 ml-3">{text}</Text>
  </View>
);

export default function AdoptionStatusScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams(); 

  const [applicationData, setApplicationData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isDetailsVisible, setIsDetailsVisible] = useState(false); 
  const [isWithdrawVisible, setIsWithdrawVisible] = useState(false); 
  const [isWithdrawing, setIsWithdrawing] = useState(false);
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
      // Gọi API sang NestJS
      await axiosClient.patch(`/applications/${id}/withdraw`);
      
      // Đóng popup
      setIsWithdrawVisible(false);
      
      // Load lại dữ liệu để màn hình cập nhật trạng thái thành "Closed"
      fetchApplicationDetails();
    } catch (error) {
      console.error('Lỗi khi thu hồi đơn:', error);
      // Có thể thêm Alert báo lỗi ở đây nếu muốn
    } finally {
      setIsWithdrawing(false);
    }
  };

  const generateTimelineSteps = (status: string, createdAt: string) => {
    const formattedDate = new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const steps: TimelineStep[] = [
      { id: '1', title: 'Submitted', state: 'completed', date: formattedDate }
    ];
    
    if (status === 'SUBMITTED') {
      steps.push({ id: '2', title: 'Pending Review', state: 'active', description: 'Shelter đang xem xét đơn của bạn.' });
    } else if (status === 'PENDING') {
      steps.push({ id: '2', title: 'Under Review', state: 'active', description: 'Shelter đang xử lý đơn của bạn.' });
    } else if (status === 'ADOPTION_COMPLETED') {
      steps.push({ id: '2', title: 'Approved', state: 'completed' });
      steps.push({ id: '3', title: 'Adoption Completed', state: 'success', description: 'Cảm ơn bạn đã nhận nuôi! 💛' });
    } else if (status === 'CLOSED') {
      steps.push({ id: '2', title: 'Closed', state: 'error', description: 'Đơn đăng ký này đã bị đóng.' });
    }
    
    return steps;
  };

  const renderNodeIcon = (state: string) => {
    switch (state) {
      case 'completed': return <View className="w-7 h-7 rounded-full bg-[#10B981] items-center justify-center z-20"><Feather name="check" size={14} color="white" /></View>;
      case 'success': return <View className="w-7 h-7 rounded-full bg-[#10B981] items-center justify-center z-20 shadow-sm shadow-green-200"><MaterialCommunityIcons name="heart" size={14} color="white" /></View>;
      case 'alert': return <View className="w-7 h-7 rounded-full bg-[#F59E0B] items-center justify-center z-20 shadow-sm shadow-orange-200"><Text className="text-white font-bold text-sm">!</Text></View>;
      case 'error': return <View className="w-7 h-7 rounded-full bg-[#EF4444] items-center justify-center z-20 shadow-sm shadow-red-200"><Feather name="x" size={14} color="white" /></View>;
      case 'active':
      default: return <View className="w-7 h-7 rounded-full bg-white border-[2.5px] border-[#3B82F6] items-center justify-center z-20"><View className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" /></View>;
    }
  };

  if (isLoading || !applicationData) {
    return (
      <SafeAreaView className="flex-1 bg-[#F3F4F6] justify-center items-center" edges={['top']}>
         <Stack.Screen options={{ headerShown: false }} />
         <ActivityIndicator size="large" color="#3B82F6" />
      </SafeAreaView>
    );
  }

  const pet = applicationData.pet;
  const isClosed = applicationData.status === 'CLOSED';
  const timelineSteps = generateTimelineSteps(applicationData.status, applicationData.createdAt);
  const commitments = applicationData.commitments || {};
  
  // Format Date for Footer
  const submittedDate = new Date(applicationData.createdAt).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric'
  });

  return (
    <SafeAreaView className="flex-1 bg-[#F3F4F6]" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white z-20 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <AntDesign name="left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-[18px] font-bold text-[#111827] flex-1 text-center mr-8">
          Adoption Status
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Pet Info Card */}
        <View className="bg-white px-5 py-5 mb-2 flex-row items-center mt-2">
          <Image source={{ uri: pet?.images?.[0]?.url || 'https://via.placeholder.com/150' }} className="w-16 h-16 rounded-full bg-gray-200" resizeMode="cover" />
          <View className="ml-4 flex-1">
            <Text className="text-xl font-bold text-gray-900">{pet?.name}</Text>
            <Text className="text-[15px] text-gray-600 mt-0.5">{pet?.breed}</Text>
            <Text className="text-[14px] text-gray-500 mt-1">{pet?.shelter?.name || 'Shelter'}</Text>
          </View>
        </View>

        {/* Application Details Box */}
        <View className="bg-white px-5 py-5 mb-2">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-[15px] text-gray-500">Application ID</Text>
            <Text className="text-[15px] font-semibold text-gray-900">
              #{applicationData.id.substring(applicationData.id.length - 6).toUpperCase()}
            </Text>
          </View>
          <TouchableOpacity className="mt-1" onPress={() => setIsDetailsVisible(true)} activeOpacity={0.7}>
            <Text className="text-[15px] font-semibold text-[#ffa053]">View Application Details</Text>
          </TouchableOpacity>
        </View>

        {/* Application Progress Timeline */}
        <View className="bg-white px-5 py-6 mb-2">
          <Text className="text-[18px] font-bold text-gray-900 mb-6">Application Progress</Text>
          <View>
            {timelineSteps.map((step, index) => {
              const isLast = index === timelineSteps.length - 1;
              const isCompletedStep = step.state === 'completed';
              return (
                <View key={step.id} className="flex-row relative">
                  {!isLast && <View className={`absolute left-3.5 top-7 bottom-0 w-[2px] -ml-[1px] z-10 ${isCompletedStep ? 'bg-[#10B981]' : 'bg-gray-200'}`} />}
                  <View className="w-7 items-center z-20">{renderNodeIcon(step.state)}</View>
                  <View className={`flex-1 ml-4 ${!isLast ? 'pb-8' : ''}`}>
                    <Text className={`text-[16px] font-bold mt-0.5 ${step.state === 'alert' ? 'text-[#F59E0B]' : step.state === 'error' ? 'text-[#EF4444]' : step.state === 'success' ? 'text-[#10B981]' : 'text-gray-900'}`}>{step.title}</Text>
                    {step.date && <Text className="text-[14px] text-gray-500 mt-1.5">{step.date}</Text>}
                    {step.description && <Text className="text-[14px] text-gray-600 mt-1.5 leading-5">{step.description}</Text>}
                    {step.actionRequired && (
                      <TouchableOpacity className="mt-3 flex-row items-center justify-between bg-white border border-gray-200 rounded-xl p-3 shadow-sm shadow-gray-100">
                        <Text className="text-[14px] font-medium text-gray-800">{step.actionRequired}</Text>
                        <Feather name="chevron-right" size={20} color="#9CA3AF" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Footer Actions */}
        <View className="px-5 pt-4 pb-6">
          {!isClosed && <Text className="text-center text-[13px] text-gray-500 mb-6">Adoption decisions are handled by the shelter.</Text>}
          {isClosed ? (
            <View className="bg-white rounded-2xl p-5 border border-gray-100">
              <Text className="text-[16px] font-bold text-gray-900 text-center mb-2">Keep Looking</Text>
              <Text className="text-[14px] text-gray-500 text-center mb-5 leading-5">There are many other wonderful pets waiting for a home. We've found some similar pets you might like.</Text>
              
              {/* THÊM SỰ KIỆN onPress VÀO NÚT NÀY */}
              <TouchableOpacity 
                className="bg-[#ffa053] rounded-xl py-3.5 items-center"
                activeOpacity={0.8}
                onPress={() => {
                  // Điều hướng về màn hình Matching (Tab)
                  // Hoặc bạn có thể đổi thành router.push('/search') nếu muốn qua màn tìm kiếm
                  router.push('/matching'); 
                }}
              >
                <Text className="text-white font-bold text-[15px] ">Browse More Pets</Text>
              </TouchableOpacity>
              
            </View>
          ) : (
            <TouchableOpacity 
              className="items-center py-2"
              onPress={() => setIsWithdrawVisible(true)}
            >
              <Text className="text-[15px] font-bold text-[#EF4444]">Withdraw Application</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* ========================================= */}
      {/* POPUP 1: APPLICATION DETAILS (DYNAMIC DATA) */}
      {/* ========================================= */}
      <Modal visible={isDetailsVisible} animationType="slide" transparent={true} onRequestClose={() => setIsDetailsVisible(false)}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-[#F9FAFB] rounded-t-[28px] overflow-hidden" style={{ maxHeight: SCREEN_HEIGHT * 0.9 }}>
            <View className="bg-white px-5 pt-3 pb-4 border-b border-gray-100 rounded-t-[28px]">
              <View className="w-12 h-1.5 bg-gray-200 rounded-full self-center mb-4" />
              <View className="flex-row items-center justify-between">
                <Text className="text-[18px] font-bold text-gray-900">Application Details</Text>
                <TouchableOpacity onPress={() => setIsDetailsVisible(false)} className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center">
                  <Feather name="x" size={18} color="#4B5563" />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, paddingTop: 24 }}>
              
              <SectionCard title="Contact Information">
                <DetailRow label="Full Name" value={applicationData.fullName || 'N/A'} />
                <DetailRow label="Phone" value={applicationData.phone || 'N/A'} />
                <DetailRow label="Zalo/WhatsApp" value={applicationData.zalo || 'N/A'} />
                <DetailRow label="Adopting For" value={applicationData.adoptFor || 'N/A'} isLast />
              </SectionCard>
              
              <SectionCard title="Living Conditions">
                <DetailRow label="Location" value={applicationData.location || 'N/A'} />
                <DetailRow label="Housing Type" value={applicationData.housing || 'N/A'} />
                <DetailRow label="Children" value={applicationData.children || 'N/A'} />
                <DetailRow label="Cage Plans" value={applicationData.cage || 'N/A'} isLast />
              </SectionCard>
              
              <SectionCard title="Pet Experience">
                <DetailRow label="Previous Pet" value={applicationData.petExperience || 'N/A'} />
                {applicationData.prevPetHistory && applicationData.prevPetHistory.trim() !== '' && (
                  <DetailRow label="What Happened" value={`"${applicationData.prevPetHistory}"`} isQuote isLast />
                )}
              </SectionCard>
              
              <SectionCard title="Employment & Personal">
                <DetailRow label="Employment" value={applicationData.employmentStatus || 'N/A'} isLast />
              </SectionCard>
              
              <SectionCard title="Adoption Commitment">
                <DetailRow label="Reason for Adoption" value={`"${applicationData.adoptionReason || 'N/A'}"`} isQuote />
                
                <View className="pt-1 pb-2">
                  {commitments.vaccine === 'Yes' && <CommitmentItem text="Yearly vaccinations" />}
                  {commitments.medical === 'Yes' && <CommitmentItem text="Hospital treatment when needed" />}
                  {commitments.expenses === 'Yes' && <CommitmentItem text="Cover pre-adoption expenses" />}
                  {commitments.updateStatus === 'Yes' && <CommitmentItem text="Provide status updates" />}
                  {commitments.homeVisit === 'Yes' && <CommitmentItem text="Allow home visits" />}
                  {commitments.provideID === 'Yes' && <CommitmentItem text="Provide ID and address" />}
                </View>

              </SectionCard>

              <Text className="text-center text-[13px] text-gray-400 mt-2">Submitted on {submittedDate}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================= */}
      {/* POPUP 2: WITHDRAW CONFIRMATION DIALOG */}
      {/* ========================================= */}
      <Modal
        visible={isWithdrawVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsWithdrawVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-5">
          <View className="bg-white w-full rounded-[24px] p-6 items-center shadow-lg shadow-black/10">
            <View className="w-14 h-14 rounded-full bg-red-50 items-center justify-center mb-5">
              <Feather name="alert-circle" size={28} color="#EF4444" />
            </View>
            <Text className="text-[19px] font-bold text-gray-900 text-center mb-3">
              Withdraw adoption request?
            </Text>
            <Text className="text-[15px] text-gray-500 text-center mb-8 leading-6">
              The shelter will be notified that you've withdrawn your adoption request for <Text className="font-bold text-gray-800">{pet?.name}</Text>. After withdrawing, <Text className="font-bold text-gray-800">{pet?.name}</Text> will no longer appear in your app and you won't be able to reapply.
            </Text>
            <View className="w-full flex-col gap-3">
              <TouchableOpacity 
                // Thay đổi màu nền mờ đi một chút nếu đang loading
                className={`w-full py-3.5 rounded-xl items-center ${isWithdrawing ? 'bg-red-400' : 'bg-[#EF4444]'}`}
                activeOpacity={0.8}
                // Gắn hàm handleWithdraw vào đây
                onPress={handleWithdraw}
                disabled={isWithdrawing}
              >
                {/* Hiển thị vòng xoay loading nếu đang xử lý */}
                {isWithdrawing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-[16px]">Withdraw request</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                className="w-full bg-gray-100 py-3.5 rounded-xl items-center"
                activeOpacity={0.8}
                onPress={() => setIsWithdrawVisible(false)}
                disabled={isWithdrawing}
              >
                <Text className="text-gray-700 font-bold text-[16px]">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}