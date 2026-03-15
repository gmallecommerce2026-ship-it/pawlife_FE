// app/adoption-status.tsx
import { Text } from '@/components/AppText';
import { AntDesign, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, Image, Modal, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// --- KHAI BÁO TYPE ---
type PetStatus = 'luna' | 'max' | 'daisy' | 'bella' | 'charlie';
type StepState = 'completed' | 'active' | 'alert' | 'error' | 'success';

interface TimelineStep {
  id: string;
  title: string;
  state: StepState;
  date?: string;
  description?: string;
  actionRequired?: string;
}

interface PetAdoptionData {
  pet: {
    name: string;
    age: string;
    breed: string;
    shelter: string;
    image: string;
  };
  appId: string;
  estimatedResponse: string | null;
  steps: TimelineStep[];
  isClosed: boolean;
}

// --- MOCK DATA ---
const ADOPTION_DATA: Record<PetStatus, PetAdoptionData> = {
  luna: {
    pet: { name: 'Luna', age: '2 years', breed: 'Mixed Breed', shelter: 'Happy Paws Animal Shelter', image: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=200&auto=format&fit=crop' },
    appId: '#APP-2024-0847',
    estimatedResponse: '1-2 days after submission',
    steps: [
      { id: '1', title: 'Submitted', date: 'March 15, 2024', state: 'completed' },
      { id: '2', title: 'Pending', date: 'March 16, 2024', state: 'completed' },
      { id: '3', title: 'Needs More Information', description: 'The shelter needs a bit more information to keep things moving.', actionRequired: 'Photos of your living space', state: 'alert' },
    ],
    isClosed: false,
  },
  max: {
    pet: { name: 'Max', age: '3 years', breed: 'Mixed Breed', shelter: 'Furever Friends Rescue', image: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=200&auto=format&fit=crop' },
    appId: '#APP-2024-0743',
    estimatedResponse: '3-5 days',
    steps: [
      { id: '1', title: 'Submitted', date: 'March 15, 2024', state: 'completed' },
      { id: '2', title: 'Pending', description: 'The shelter is reviewing your application.', state: 'active' },
    ],
    isClosed: false,
  },
  daisy: {
    pet: { name: 'Daisy', age: '2 years', breed: 'Mixed Breed', shelter: 'Rescue Haven', image: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?q=80&w=200&auto=format&fit=crop' },
    appId: '#APP-2024-0743',
    estimatedResponse: '3-7 days',
    steps: [
      { id: '1', title: 'Submitted', description: "We've sent your application to the shelter.", state: 'active' },
    ],
    isClosed: false,
  },
  bella: {
    pet: { name: 'Bella', age: '1 year', breed: 'Mixed Breed', shelter: 'Loving Paws Sanctuary', image: 'https://images.unsplash.com/photo-1537151608804-ea6d15a29ca8?q=80&w=200&auto=format&fit=crop' },
    appId: '#APP-2024-0512',
    estimatedResponse: null,
    steps: [
      { id: '1', title: 'Submitted', date: 'March 5, 2024', state: 'completed' },
      { id: '2', title: 'Under Review', date: 'March 6, 2024', state: 'completed' },
      { id: '3', title: 'Closed by Shelter', description: 'The shelter has closed this application.', state: 'error' },
    ],
    isClosed: true,
  },
  charlie: {
    pet: { name: 'Charlie', age: '4 years', breed: 'Mixed Breed', shelter: 'Second Chance Animal Rescue', image: 'https://images.unsplash.com/photo-1507146426996-ef05306b995a?q=80&w=200&auto=format&fit=crop' },
    appId: '#APP-2024-0743',
    estimatedResponse: null,
    steps: [
      { id: '1', title: 'Submitted', date: 'March 15, 2024', state: 'completed' },
      { id: '2', title: 'Pending', date: 'March 16, 2024', state: 'completed' },
      { id: '3', title: 'Needs More Information', date: 'March 17, 2024', state: 'completed' },
      { id: '4', title: 'Approved', date: 'March 18, 2024', state: 'completed' },
      { id: '5', title: 'Adoption Completed', description: 'Thank you for choosing adoption 💛', state: 'success' },
    ],
    isClosed: false,
  }
};

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
  
  const [currentStatus, setCurrentStatus] = useState<PetStatus>('max');
  const [isDetailsVisible, setIsDetailsVisible] = useState(false); 
  const [isWithdrawVisible, setIsWithdrawVisible] = useState(false); // State quản lý Popup Withdraw

  const data = ADOPTION_DATA[currentStatus];

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
        
        {/* Development Tool - Switch test UI */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="bg-white py-2 px-4 border-b border-gray-100">
          {(Object.keys(ADOPTION_DATA) as PetStatus[]).map(key => (
            <TouchableOpacity 
              key={key} 
              onPress={() => setCurrentStatus(key)}
              className={`mr-3 px-3 py-1.5 rounded-full border ${currentStatus === key ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}
            >
              <Text className={`capitalize text-xs ${currentStatus === key ? 'text-blue-600 font-bold' : 'text-gray-600'}`}>{key}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Pet Info Card */}
        <View className="bg-white px-5 py-5 mb-2 flex-row items-center">
          <Image source={{ uri: data.pet.image }} className="w-16 h-16 rounded-full bg-gray-200" resizeMode="cover" />
          <View className="ml-4 flex-1">
            <Text className="text-xl font-bold text-gray-900">{data.pet.name}</Text>
            <Text className="text-[15px] text-gray-600 mt-0.5">{data.pet.age} • {data.pet.breed}</Text>
            <Text className="text-[14px] text-gray-500 mt-1">{data.pet.shelter}</Text>
          </View>
        </View>

        {/* Application Details Box */}
        <View className="bg-white px-5 py-5 mb-2">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-[15px] text-gray-500">Application ID</Text>
            <Text className="text-[15px] font-semibold text-gray-900">{data.appId}</Text>
          </View>
          {data.estimatedResponse && (
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-[15px] text-gray-500">Estimated response</Text>
              <Text className="text-[15px] font-semibold text-gray-900">{data.estimatedResponse}</Text>
            </View>
          )}
          <TouchableOpacity className="mt-1" onPress={() => setIsDetailsVisible(true)} activeOpacity={0.7}>
            <Text className="text-[15px] font-semibold text-[#3B82F6]">View Application Details</Text>
          </TouchableOpacity>
        </View>

        {/* Application Progress Timeline */}
        <View className="bg-white px-5 py-6 mb-2">
          <Text className="text-[18px] font-bold text-gray-900 mb-6">Application Progress</Text>
          <View>
            {data.steps.map((step, index) => {
              const isLast = index === data.steps.length - 1;
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
          {!data.isClosed && <Text className="text-center text-[13px] text-gray-500 mb-6">Adoption decisions are handled by the shelter.</Text>}
          {data.isClosed ? (
            <View className="bg-white rounded-2xl p-5 border border-gray-100">
              <Text className="text-[16px] font-bold text-gray-900 text-center mb-2">Keep Looking</Text>
              <Text className="text-[14px] text-gray-500 text-center mb-5 leading-5">There are many other wonderful pets waiting for a home. We've found some similar pets you might like.</Text>
              <TouchableOpacity className="bg-[#3B82F6] rounded-xl py-3.5 items-center"><Text className="text-white font-bold text-[15px]">Browse More Pets</Text></TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              className="items-center py-2"
              onPress={() => setIsWithdrawVisible(true)} // Gọi Popup
            >
              <Text className="text-[15px] font-bold text-[#EF4444]">Withdraw Application</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* ========================================= */}
      {/* POPUP 1: APPLICATION DETAILS (BOTTOM SHEET) */}
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
                <DetailRow label="Full Name" value="Nguyen Van An" />
                <DetailRow label="Phone" value="0912345678" />
                <DetailRow label="Zalo/WhatsApp" value="0912345678" />
                <DetailRow label="Adopting For" value="Myself" isLast />
              </SectionCard>
              <SectionCard title="Living Conditions">
                <DetailRow label="Location" value="Quận Cầu Giấy" />
                <DetailRow label="Housing Type" value="Apartment (allows pet ownership)" />
                <DetailRow label="Children" value="No" />
                <DetailRow label="Cage Plans" value="No" isLast />
              </SectionCard>
              <SectionCard title="Pet Experience">
                <DetailRow label="Previous Pet" value="Yes, I used to have one" />
                <DetailRow label="What Happened" value='"My previous dog passed away due to old age after 12 wonderful years together."' isQuote isLast />
              </SectionCard>
              <SectionCard title="Employment & Personal">
                <DetailRow label="Employment" value="Currently employed" isLast />
              </SectionCard>
              <SectionCard title="Adoption Commitment">
                <DetailRow label="Reason for Adoption" value='"Because I want to give them a forever home"' isQuote />
                <View className="pt-1 pb-2">
                  <CommitmentItem text="Yearly vaccinations" />
                  <CommitmentItem text="Hospital treatment when needed" />
                  <CommitmentItem text="Cover pre-adoption expenses" />
                  <CommitmentItem text="Provide status updates" />
                  <CommitmentItem text="Allow home visits" />
                  <CommitmentItem text="Provide ID and address" />
                </View>
              </SectionCard>
              <Text className="text-center text-[13px] text-gray-400 mt-2">Submitted on February 20, 2024</Text>
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
            
            {/* Icon Cảnh báo */}
            <View className="w-14 h-14 rounded-full bg-red-50 items-center justify-center mb-5">
              <Feather name="alert-circle" size={28} color="#EF4444" />
            </View>

            {/* Tiêu đề */}
            <Text className="text-[19px] font-bold text-gray-900 text-center mb-3">
              Withdraw adoption request?
            </Text>

            {/* Nội dung (Dynamic Pet Name) */}
            <Text className="text-[15px] text-gray-500 text-center mb-8 leading-6">
              The shelter will be notified that you've withdrawn your adoption request for <Text className="font-bold text-gray-800">{data.pet.name}</Text>. After withdrawing, <Text className="font-bold text-gray-800">{data.pet.name}</Text> will no longer appear in your app and you won't be able to reapply.
            </Text>

            {/* Cụm Nút bấm */}
            <View className="w-full flex-col gap-3">
              <TouchableOpacity 
                className="w-full bg-[#EF4444] py-3.5 rounded-xl items-center"
                activeOpacity={0.8}
                onPress={() => {
                  // Xử lý logic withdraw ở đây
                  setIsWithdrawVisible(false);
                }}
              >
                <Text className="text-white font-bold text-[16px]">Withdraw request</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                className="w-full bg-gray-100 py-3.5 rounded-xl items-center"
                activeOpacity={0.8}
                onPress={() => setIsWithdrawVisible(false)}
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