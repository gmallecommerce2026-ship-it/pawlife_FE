// app/application-details.tsx
import axiosClient from '@/api/axiosClient';
import { Text } from '@/components/AppText';
import { CustomLoader } from '@/components/CustomLoader';
import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- TÁCH CÁC COMPONENT GIAO DIỆN SANG ĐÂY ---
const SectionCard = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <View className="mb-7 px-5">
    <Text className="text-[16px] font-bold text-gray-900 mb-3 tracking-tight">{title}</Text>
    <View className="bg-[#F6F6F6] px-4 py-1 rounded-[16px]">
      {children}
    </View>
  </View>
);

const DetailRow = ({ label, value, isLast = false, isQuote = false }: { label: string, value: string, isLast?: boolean, isQuote?: boolean }) => (
  <View className={`py-4 ${!isLast ? 'border-b border-gray-200/80' : ''} flex-row justify-between items-start`}>
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

export default function ApplicationDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams(); 

  const [applicationData, setApplicationData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      console.error('Error fetching order details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !applicationData) {
      return <ActivityIndicator size="small" color="#e9a353" />;
  }

  const commitments = applicationData.commitments || {};
  const submittedDate = new Date(applicationData.createdAt).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric'
  });

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* HEADER */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 rounded-full" activeOpacity={0.7}>
          <Feather name="chevron-left" size={30} color="#000000" />
        </TouchableOpacity>
        <Text className="text-[20px] font-bold text-gray-900 flex-1 text-center mr-8 tracking-tight">
          Application Details
        </Text>
      </View>

      {/* CONTENT (Bê nguyên nội dung cũ ở Modal qua đây) */}
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
    </SafeAreaView>
  );
}