// app/my-applications.tsx
import { Text } from '@/components/AppText';
import { AntDesign, Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// Giả định bạn có một instance axios hoặc fetch hook được cấu hình sẵn token
// import api from '@/services/api'; 

// Định nghĩa interface cho dữ liệu trả về từ API
interface ApplicationRecord {
  id: string;
  status: string;
  createdAt: string;
  pet: {
    name: string;
    breed: string;
    images: string[]; // Thay đổi tùy theo dữ liệu trả về của bạn
  };
}

const StatusBadge = ({ status }: { status: string }) => {
  const getStyle = () => {
    // Format status từ enum DB (VD: ADOPTION_COMPLETED) sang text hiển thị
    const normalizedStatus = status.replace(/_/g, ' ').toLowerCase();
    
    switch (normalizedStatus) {
      case 'adoption completed': 
        return { bg: 'bg-green-50 border-green-200', text: 'text-green-700', label: 'Adoption Completed' };
      case 'need more info': 
        return { bg: 'bg-orange-50 border-orange-200', text: 'text-[#F97316]', label: 'Need more info' };
      case 'pending': 
        return { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-600', label: 'Pending' };
      case 'submitted': 
        return { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-700', label: 'Submitted' };
      case 'closed': 
        return { bg: 'bg-gray-100 border-gray-300', text: 'text-gray-500', label: 'Closed' };
      default: 
        return { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-600', label: status };
    }
  };
  
  const style = getStyle();
  
  return (
    <View className={`${style.bg} border px-2.5 py-1 rounded-md`}>
      <Text className={`${style.text} text-[10px] font-bold uppercase tracking-wider`}>
        {style.label}
      </Text>
    </View>
  );
};

export default function MyApplicationsScreen() {
  const router = useRouter();
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const maxApplications = 5;
  const currentApplications = applications.filter(app => 
    !['CLOSED', 'ADOPTION_COMPLETED'].includes(app.status)
  ).length; // Chỉ tính các đơn đang active
  
  const progressPercentage = (currentApplications / maxApplications) * 100;

  useEffect(() => {
    fetchMyApplications();
  }, []);

  const fetchMyApplications = async () => {
    try {
      setIsLoading(true);
      // Thay thế bằng hàm gọi API thực tế của bạn
      // const response = await api.get('/applications/my-applications');
      // setApplications(response.data.data);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const renderHeader = () => (
    <View className="px-5 pt-6 pb-2">
      <View className="bg-white rounded-[24px] p-5 border border-gray-100 shadow-sm shadow-gray-200/50">
        <View className="flex-row justify-between items-center mb-5">
          <View>
            <Text className="text-[#1F2937] font-extrabold text-[17px] tracking-tight mb-1">
              Application limit
            </Text>
            <View className="flex-row items-baseline">
              <Text className="text-[#22C55E] font-extrabold text-[20px]">
                {currentApplications}
              </Text>
              <Text className="text-[#6B7280] font-medium text-[15px]">
                /{maxApplications} active
              </Text>
            </View>
          </View>
          
          <View className="w-14 h-14 rounded-full border-[4px] border-[#22C55E] items-center justify-center bg-green-50">
            <Text className="text-[#22C55E] font-bold text-[13px]">
              {Math.round(progressPercentage)}%
            </Text>
          </View>
        </View>
        
        <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <View 
            className="h-full bg-[#22C55E] rounded-full" 
            style={{ width: `${progressPercentage}%` }} 
          />
        </View>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <SafeAreaView className="flex-1" edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        
        <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white z-10">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <AntDesign name="left" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900 flex-1 text-center mr-6 tracking-tight">
            My Applications
          </Text>
        </View>
        
        {isLoading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#22C55E" />
          </View>
        ) : (
          <FlatList
            data={applications}
            ListHeaderComponent={renderHeader}
            contentContainerStyle={{ paddingBottom: 24 }}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View className="items-center justify-center mt-10">
                <Text className="text-gray-500 font-medium">You haven't applied for any pets yet.</Text>
              </View>
            }
            renderItem={({ item }) => {
              // Lấy ảnh đầu tiên của pet, nếu không có thì fallback sang ảnh mặc định
              const petImage = item.pet.images?.[0] || 'https://via.placeholder.com/150';

              return (
                <TouchableOpacity 
                  activeOpacity={0.8}
                  onPress={() => router.push(`/adoption-status?id=${item.id}`)}
                  className="flex-row p-4 mx-5 mt-4 rounded-[20px] bg-white border border-gray-100 shadow-sm shadow-gray-200/50"
                >
                  <Image 
                    source={{ uri: petImage }} 
                    className="w-[84px] h-[84px] rounded-2xl bg-gray-100" 
                    resizeMode="cover" 
                  />
                  
                  <View className="flex-1 ml-4 justify-between py-0.5">
                    <View className="flex-row justify-between items-start">
                      <View className="flex-1 mr-2">
                        <Text className="text-[17px] font-bold text-gray-900 mb-1" numberOfLines={1}>
                          {item.pet.name}
                        </Text>
                        <Text className="text-gray-500 text-[13px] font-medium" numberOfLines={1}>
                          {item.pet.breed}
                        </Text>
                      </View>
                      <StatusBadge status={item.status} />
                    </View>
                    
                    <View className="flex-row justify-between items-center mt-3">
                      <View className="flex-row items-center bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                        <Feather name="calendar" size={13} color="#9CA3AF" />
                        <Text className="text-gray-500 text-[12px] font-medium ml-2">
                          Applied on {formatDate(item.createdAt)}
                        </Text>
                      </View>
                      <View className="w-8 h-8 rounded-full bg-gray-50 items-center justify-center border border-gray-100">
                        <Feather name="chevron-right" size={16} color="#6B7280" />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </SafeAreaView>
    </View>
  );
}