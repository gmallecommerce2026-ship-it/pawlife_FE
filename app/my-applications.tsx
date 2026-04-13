// app/my-applications.tsx
import axiosClient from '@/api/axiosClient';
import { Text } from '@/components/AppText';
import { Feather } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ApplicationRecord {
  id: string;
  status: string;
  createdAt: string;
  pet: {
    name: string;
    breed: string;
    age?: string;
    shelter?: {
      name: string;
    };
    images: { url: string }[];
  };
}

const StatusBadge = ({ status }: { status: string }) => {
  const getStyle = () => {
    const normalizedStatus = status.toUpperCase().replace(/\s+/g, '_');
    
    switch (normalizedStatus) {
      case 'SUBMITTED': 
        return { bg: 'bg-[#EBFFE2]', border: 'border border-[#77C852]/30', text: 'text-[#77C852]', iconColor: '#77C852', label: 'Approved', icon: 'check' };
      case 'PENDING': 
        return { bg: 'bg-[#EFF6FF]', border: 'border border-[#3B82F6]/30', text: 'text-[#3B82F6]', iconColor: '#3B82F6', label: 'Pending', icon: 'clock' };
      case 'NEED_MORE_INFO': 
        return { bg: 'bg-[#FEF3C7]', border: 'border border-[#D97706]/30', text: 'text-[#D97706]', iconColor: '#D97706', label: 'Need More Info', icon: 'info' };
      case 'ADOPTION_COMPLETED': 
      case 'APPROVED':
        return { bg: 'bg-[#F0FDF4]', border: 'border border-[#83DA5A]/25', text: 'text-[#77C852]', iconColor: '#77C852', label: 'Completed', icon: 'check-circle' };
      case 'CLOSED': 
      case 'REJECTED':
        return { bg: 'bg-[#8E8E93]/10', border: 'border border-[#8E8E93]', text: 'text-[#8E8E93]', iconColor: '#8E8E93', label: 'Closed', icon: 'x-circle' };
      default: 
        return { bg: 'bg-[#F3F4F6]', border: 'border border-[#4B5563]/30', text: 'text-[#4B5563]', iconColor: '#4B5563', label: status, icon: 'circle' };
    }
  };
  
  const style = getStyle();
  
  return (
    // Đã bổ sung biến ${style.border} vào className
    <View className={`${style.bg} ${style.border} flex-row items-center px-2.5 py-1.5 rounded-full self-start`}>
      <Feather name={style.icon as any} size={12} color={style.iconColor} />
      <Text className={`${style.text} text-[12px] font-regular tracking-widest ml-1.5`}>
        {style.label}
      </Text>
    </View>
  );
};

export default function MyApplicationsScreen() {
  const router = useRouter();
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOptionsVisible, setIsOptionsVisible] = useState(false);
  const maxApplications = 5;
  const [isWithdrawVisible, setIsWithdrawVisible] = useState(false);
  const currentApplications = applications.filter(app => 
    !['CLOSED', 'ADOPTION_COMPLETED'].includes(app.status)
  ).length; 
  
  const progressPercentage = (currentApplications / maxApplications) * 100;

  useFocusEffect(
    useCallback(() => {
      fetchMyApplications();
    }, [])
  );

  const fetchMyApplications = async () => {
    try {
      setIsLoading(true);
      const response = await axiosClient.get('/applications/my-applications');
      setApplications(response.data.data);
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
    <View className="px-5 pt-[20px] pb-4">
      <View>
        <View className="flex-row justify-between items-end mb-2.5">
          <View>
            <Text className="text-[#6B7280] font-semibold text-[12px] mb-1">
              APPLICATION LIMIT
            </Text>
            <View className="flex-row items-baseline">
              <Text className="text-[#22C55E] font-bold text-[22px]">
                {currentApplications}
              </Text>
              <Text className="text-[#9CA3AF] font-bold text-[16px]">
                /{maxApplications} active
              </Text>
            </View>
          </View>
        </View>
        
        <View className="h-[6px] bg-[#F3F4F6] rounded-full overflow-hidden mt-1">
          <View 
            className="h-full bg-[#22C55E] rounded-full" 
            style={{ width: `${progressPercentage}%` }} 
          />
        </View>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-[#FFFFFF]">
      <SafeAreaView className="flex-1" edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        
        <View className="flex-row items-center px-4 py-3 bg-white z-10">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <Feather name="chevron-left" size={30} color="#000000" />
          </TouchableOpacity>
          <Text className="text-[20px] font-bold text-[#111827] flex-1 text-center mr-6">
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
              const petImage = item.pet.images?.[0]?.url || 'https://via.placeholder.com/150';
              const ageAndBreed = ['2 years', item.pet.breed].filter(Boolean).join(' • ');

              return (
                <TouchableOpacity 
                  activeOpacity={0.8}
                  onPress={() => router.push(`/adoption-status?id=${item.id}`)}
                  className="flex-col pt-[14px] px-[14px] mx-5 mb-4 rounded-[13px] bg-white border border-[#E5E5E5]"
                  style={{
                    shadowColor: '#E5E5E5', // Màu xám ghi
                    shadowOffset: { width: 2, height: 3 }, // Đổ bóng sang phải 2px, xuống dưới 3px
                    shadowOpacity: 0.15, // Mỏng, nhạt
                    shadowRadius: 4, // Độ mờ viền bóng
                    elevation: 3, // Shadow cho Android
                  }}
                >
                  {/* Phần trên: Ảnh và Thông tin cơ bản */}
                  <View className="flex-row mb-3.5">
                    <Image 
                      source={{ uri: petImage }} 
                      className="w-[76px] h-[76px] rounded-2xl bg-gray-100" 
                      resizeMode="cover" 
                    />
                    
                    <View className="flex-1 mb-2 ml-[10px] justify-center">
                      <Text className="text-[16px] font-medium text-black leading-tight" numberOfLines={1}>
                        {item.pet.name}
                      </Text>
                      
                      <Text className="text-[#8E8E93] text-[12px] font-regular mt-[7px]" numberOfLines={1}>
                        {ageAndBreed}
                      </Text>
                      
                      <Text className="text-[#000000] text-[12px] font-regular mt-[7px]" numberOfLines={1}>
                        {item.pet.shelter?.name || 'PawLife Shelter'}
                      </Text>
                    </View>

                    {/* Nút 3 chấm góc trên cùng bên phải */}
                    <TouchableOpacity 
                      className="p-1 -mr-1 items-start"
                      hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                      onPress={(e) => {
                        e.stopPropagation(); 
                        setIsOptionsVisible(true); // Mở popup Options
                      }}
                    >
                      {/* Đổi từ chevron-right sang more-horizontal cho đúng 3 chấm */}
                      <Feather name="more-vertical" size={20} color="#8E8E93" />
                    </TouchableOpacity>
                  </View>

                  {/* Phần dưới: Màu nền xám, thêm padding dọc (py-3), bo góc dưới */}
                  <View className="flex-row justify-between items-center py-3 border-t border-[#E5E5E5] bg-[#F6F6F6] -mx-[14px] px-[14px] rounded-b-[13px]">
                    <StatusBadge status={item.status} />
                    
                    <View className="flex-row items-center">
                      <Text className="text-[#8E8E93] text-[12px] font-regular ml-1.5">
                        {formatDate(item.createdAt)}
                      </Text>
                    </View>
                  </View>

                </TouchableOpacity>
              );
            }}
          />
        )}
      <Modal 
        visible={isOptionsVisible} 
        animationType="fade" 
        transparent={true} 
        onRequestClose={() => setIsOptionsVisible(false)}
      >
        {/* Nền trong suốt chiếm toàn màn hình, bấm ra ngoài để đóng menu */}
        <TouchableOpacity 
          style={{ flex: 1 }} 
          activeOpacity={1} 
          onPress={() => setIsOptionsVisible(false)}
        >
          {/* Menu Dropdown được định vị tuyệt đối (absolute) gần vị trí nút 3 chấm */}
          <View 
            className="absolute top-[140px] right-[24px] bg-white rounded-xl border border-gray-100 w-48 overflow-hidden"
            style={{ 
              elevation: 8, 
              shadowColor: '#000', 
              shadowOffset: { width: 0, height: 4 }, 
              shadowOpacity: 0.15, 
              shadowRadius: 10 
            }}
          >
            <TouchableOpacity 
              className="flex-row items-center px-4 py-3.5 border-b border-gray-50" 
              activeOpacity={0.6}
              onPress={() => { setIsOptionsVisible(false); console.log("Report Issue"); }}
            >
              <Feather name="alert-triangle" size={18} color="#4B5563" />
              <Text className="text-[14px] font-medium text-gray-700 ml-3">Report Issue</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="flex-row items-center px-4 py-3.5 border-b border-gray-50" 
              activeOpacity={0.6}
              onPress={() => { setIsOptionsVisible(false); console.log("Contact Support"); }}
            >
              <Feather name="phone-call" size={18} color="#4B5563" />
              <Text className="text-[14px] font-medium text-gray-700 ml-3">Contact Support</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="flex-row items-center px-4 py-3.5" 
              activeOpacity={0.6}
              onPress={() => { 
                setIsOptionsVisible(false); 
                // Mở modal Withdraw có sẵn
                setTimeout(() => setIsWithdrawVisible(true), 150); 
              }}
            >
              <Feather name="x-circle" size={18} color="#EF4444" />
              <Text className="text-[14px] font-medium text-[#EF4444] ml-3">Withdraw</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
    </View>
  );
}