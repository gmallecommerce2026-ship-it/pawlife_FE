// app/adoption-status.tsx
import axiosClient from '@/api/axiosClient';
import { Text } from '@/components/AppText';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
  <View className="mb-7">
    <Text className="text-[16px] font-bold text-gray-900 mb-3 px-5 tracking-tight">{title}</Text>
    <View className="bg-white px-5 py-2 border-y border-gray-100 shadow-sm shadow-gray-50/50">
      {children}
    </View>
  </View>
);

const DetailRow = ({ label, value, isLast = false, isQuote = false }: { label: string, value: string, isLast?: boolean, isQuote?: boolean }) => (
  <View className={`py-4 ${!isLast ? 'border-b border-gray-100/80' : ''} flex-row justify-between items-start`}>
    <Text className="text-[14px] text-gray-500 w-1/3 mt-0.5">{label}</Text>
    <Text className={`text-[15px] flex-1 text-right leading-6 ${isQuote ? 'italic text-gray-600' : 'font-medium text-gray-900'}`}>
      {value}
    </Text>
  </View>
);

const CommitmentItem = ({ text }: { text: string }) => (
  <View className="flex-row items-center py-3 border-b border-gray-50">
    <View className="w-6 h-6 rounded-full bg-green-50 items-center justify-center">
      <Feather name="check" size={14} color="#10B981" />
    </View>
    <Text className="text-[15px] font-medium text-gray-800 ml-3 flex-1">{text}</Text>
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
  const [isOptionsVisible, setIsOptionsVisible] = useState(false);
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
      case 'completed': return <View className="w-[26px] h-[26px] rounded-full bg-[#E89B5A] items-center justify-center z-20 shadow-sm shadow-green-200"><Feather name="check" size={14} color="white" /></View>;
      case 'success': return <View className="w-[26px] h-[26px] rounded-full bg-[#E89B5A] items-center justify-center z-20 shadow-sm shadow-green-200"><MaterialCommunityIcons name="heart" size={14} color="white" /></View>;
      case 'alert': return <View className="w-[26px] h-[26px] rounded-full bg-[#E89B5A] items-center justify-center z-20 shadow-sm shadow-orange-200"><Text className="text-white font-bold text-sm">!</Text></View>;
      case 'error': return <View className="w-[26px] h-[26px] rounded-full bg-[#E89B5A] items-center justify-center z-20 shadow-sm shadow-red-200"><Feather name="x" size={14} color="white" /></View>;
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

  const pet = applicationData.pet;
  const isClosed = applicationData.status === 'CLOSED';
  const timelineSteps = generateTimelineSteps(applicationData.status, applicationData.createdAt);
  const commitments = applicationData.commitments || {};
  
  const submittedDate = new Date(applicationData.createdAt).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric'
  });

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* 1. HEADER */}
      <View className="flex-row items-center px-4 py-3 bg-white z-20">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 rounded-full active:bg-gray-50" activeOpacity={0.7}>
          <Feather name="chevron-left" size={30} color="#000000" />
        </TouchableOpacity>
        <Text className="text-[24px] font-semibold text-[#111827] flex-1 text-center mr-8">
          Adoption Status
        </Text>
      </View>

        <View 
          className="flex-col pt-[14px] px-[14px] mx-5 mt-[21px] rounded-[13px] border border-[#E5E5E5]"
          style={{
            shadowColor: '#8E8E93', 
            shadowOffset: { width: 2, height: 3 }, 
            shadowOpacity: 0.15, 
            shadowRadius: 4, 
            elevation: 3, 
          }}
        >
          <LinearGradient 
              colors={['#FBF0F6', '#F8E8F1']}
              locations={[0.3, 0.8]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 13 }}
          />
          {/* Phần trên: Ảnh và Thông tin cơ bản */}
          <TouchableOpacity 
            className="flex-row mb-3.5"
            activeOpacity={0.7}
            onPress={() => {
              if (pet?.id) {
                router.push(`/shelter-pet-detail?id=${pet.id}`);
              }
            }}
          >
            <Image 
              source={{ uri: pet?.images?.[0]?.url || 'https://via.placeholder.com/150' }} 
              className="w-[76px] h-[76px] rounded-2xl bg-gray-100" 
              resizeMode="cover" 
            />
            
            <View className="flex-1 mb-2 ml-[10px] justify-center">
              <Text className="text-[16px] font-medium text-black leading-tight" numberOfLines={1}>
                {pet?.name}
              </Text>
              
              <Text className="text-[#8E8E93] text-[12px] font-regular mt-[7px]" numberOfLines={1}>
                {pet?.breed || 'Unknown'}
              </Text>
              
              {/* Nút bấm riêng cho Tên Shelter */}
              <TouchableOpacity 
                activeOpacity={0.6}
                hitSlop={{ top: 5, right: 10, bottom: 5, left: 0 }} // Tăng vùng bấm cho text
                onPress={(e) => {
                  e.stopPropagation(); // Ngăn sự kiện click lan ra ngoài thẻ cha
                  // Đảm bảo dữ liệu pet có chứa shelterId hoặc shelter.id
                  const shelterId = pet?.shelter?.id || pet?.shelterId; 
                  if (shelterId) {
                    router.push(`/shelter-profile?id=${shelterId}`);
                  } else {
                    console.warn("Không tìm thấy ID của shelter");
                  }
                }}
              >
                <Text className="text-[#000000] text-[12px] font-regular mt-[7px]" numberOfLines={1}>
                  {pet?.shelter?.name || 'PawLife Shelter'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Nút góc trên cùng bên phải */}
            <TouchableOpacity 
              className="p-1 -mr-1 mt-7 items-start"
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              onPress={(e) => {
                e.stopPropagation(); // Ngăn click lan ra ngoài
                console.log('Open options menu');
              }}
            >
              <Feather name="chevron-right" size={20} color="#8E8E93" />
            </TouchableOpacity>
          </TouchableOpacity>

          {/* Phần dưới: Màu nền xám, thêm padding dọc (py-3), bo góc dưới */}
          <View className="flex-row justify-between items-center py-3 border-t border-[#E5E5E5] bg-[#ffffff58] -mx-[14px] px-[14px] rounded-b-[13px]">
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
        <View className="bg-white px-5 pt-[38px] pb-2 shadow-sm shadow-gray-50/50">
          <Text className="text-[16px] font-semibold text-gray-900 mb-[21px] tracking-tight">Application Progress</Text>
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
                    {step.description && <Text className="text-[12px] font-regular text-[#8E8E93] mt-2 leading-5">{step.description}</Text>}
                    {step.actionRequired && (
                      <TouchableOpacity className="mt-3.5 flex-row items-center justify-between bg-[#F9FAFB] border border-gray-100 rounded-xl p-3.5" activeOpacity={0.7}>
                        <Text className="text-[14px] font-medium text-gray-800">{step.actionRequired}</Text>
                        <Feather name="chevron-right" size={18} color="#9CA3AF" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
        {!isClosed && <Text className="text-center text-[13px] text-gray-400 mb-4 mt-[24px] font-medium">Adoption decisions are handled by the shelter.</Text>}
            <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 20 }} 
      >
      </ScrollView>
        {/* 6. FOOTER ACTIONS */}
        <View className="px-5 pb-[31px] bg-white border-t border-[#F3F4F6] w-full">
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
            <Text className="text-[14px] font-bold text-[#B8B8B8]">Withdraw Application</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ========================================= */}
      {/* POPUP 1: APPLICATION DETAILS (DYNAMIC DATA) */}
      {/* ========================================= */}
      <Modal visible={isDetailsVisible} animationType="slide" transparent={true} onRequestClose={() => setIsDetailsVisible(false)}>
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-[#F9FAFB] rounded-t-[32px] overflow-hidden shadow-2xl" style={{ maxHeight: SCREEN_HEIGHT * 0.9 }}>
            <View className="bg-white px-5 pt-3 pb-4 border-b border-gray-100 rounded-t-[32px] z-10">
              <View className="w-12 h-1.5 bg-gray-200 rounded-full self-center mb-4" />
              <View className="flex-row items-center justify-between">
                <Text className="text-[19px] font-bold text-gray-900 tracking-tight">Application Details</Text>
                <TouchableOpacity onPress={() => setIsDetailsVisible(false)} className="w-8 h-8 bg-gray-50 rounded-full items-center justify-center border border-gray-100" activeOpacity={0.7}>
                  <Feather name="x" size={16} color="#4B5563" />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50, paddingTop: 24 }}>
              
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
                <DetailRow label="Reason for Adoption" value={`"${applicationData.adoptionReason || 'N/A'}"`} isQuote isLast={Object.keys(commitments).length === 0} />
                
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

              <Text className="text-center text-[13px] font-medium text-gray-400 mt-4">Submitted on {submittedDate}</Text>
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

    </SafeAreaView>
  );
}