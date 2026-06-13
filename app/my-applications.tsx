// app/my-applications.tsx
import axiosClient from '@/api/axiosClient';
import { Text } from '@/components/AppText';
import { useLanguage } from '@/contexts/LanguageContext'; // BỔ SUNG HOOK
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ApplicationRecord {
  id: string;
  status: string;
  createdAt: string;
  pet: {
    id: string;
    name: string;
    breed: string;
    age?: string;
    dob?: string;
    shelter?: {
      id: string;
      name: string;
    };
    images: { url: string }[];
  };
}

const getStatusWeight = (status: string) => {
  const normalizedStatus = status.toUpperCase().replace(/\s+/g, '_');
  switch (normalizedStatus) {
    case 'INTERVIEW_SCHEDULED': return 1; 
    case 'NEED_MORE_INFO': return 2;      
    case 'PENDING': return 3;             
    case 'SUBMITTED': return 4;           
    case 'APPROVED': return 5;            
    case 'ADOPTION_COMPLETED': return 6;  
    case 'CLOSED': return 7;              
    default: return 99; 
  }
};

const sortApplications = (apps: ApplicationRecord[]) => {
  return [...apps].sort((a, b) => {
    const weightA = getStatusWeight(a.status);
    const weightB = getStatusWeight(b.status);
    
    if (weightA !== weightB) {
      return weightA - weightB; 
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
};

// SỬA: Truyền thêm t vào StatusBadge để dịch text label
const StatusBadge = ({ status, t }: { status: string, t: any }) => {
  const getStyle = () => {
    const normalizedStatus = status.toUpperCase().replace(/\s+/g, '_');

    switch (normalizedStatus) {
      case 'SUBMITTED':
        return {
          bg: 'bg-[#8E8E93/10]',
          border: 'border border-[#8E8E93]/25',
          text: 'text-[#8E8E93] tracking-[0.5px]',
          label: 'Submitted',
          iconSource: require('../assets/icon/upload-gray.png')
        };
      case 'PENDING':
        return {
          bg: 'bg-[#E8F1FF]',
          border: 'border border-[#5A90DA]/25',
          text: 'text-[#5A90DA] tracking-[0.5px]',
          label: 'Pending',
          iconSource: require('../assets/icon/clock-blue.png')
        };
      case 'NEED_MORE_INFO':
        return {
          bg: 'bg-[#FFE9CE]',
          border: 'border border-[#E89B5A]/50',
          text: 'text-[#E89B5A] tracking-[0.5px]',
          label: 'Need More Info',
          iconSource: require('../assets/icon/clock-orange.png')
        };
      case 'INTERVIEW_SCHEDULED':
        return {
          bg: 'bg-[#985ADA]/10',
          border: 'border border-[#985ADA]/25',
          text: 'text-[#985ADA] tracking-[0.5px]',
          label: 'Interview Scheduled',
          iconSource: require('../assets/icon/message-purple.png')
        };
      case 'APPROVED':
        return {
          bg: 'bg-[#EBFFE2]',
          border: 'border border-green-200/60',
          text: 'text-[#77C852] tracking-[0.5px]',
          label: 'Approved',
          iconSource: require('../assets/icon/tick-green.png')
        };
      case 'ADOPTED':
        return {
          bg: 'bg-[#FFF1F6]',
          border: 'border border-[#FCB6CC]/25',
          text: 'text-[#FCB6CC] tracking-[0.5px]',
          label: 'Adopted',
          iconSource: require('../assets/icon/home-pink.png')
        };
      case 'ADOPTION_COMPLETED':
        return {
          bg: 'bg-[#FFF1F6]',
          border: 'border border-[#FCB6CC]/25',
          text: 'text-[#FCB6CC] tracking-[0.5px]',
          label: 'Adoption Completed',
          iconSource: require('../assets/icon/home-pink.png')
        };
      case 'CLOSED':
        return {
          bg: 'bg-[#F2F2F7]',
          border: 'border border-[#D1D1D6]/50',
          text: 'text-[#8E8E93] tracking-[0.5px]',
          label: 'Closed',
          iconSource: require('../assets/icon/closed-icon.png')
        };
      default:
        const fallbackLabel = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        return {
          bg: 'bg-[#8E8E93/10]',
          border: 'border border-[#8E8E93]/25',
          text: 'text-[#8E8E93] tracking-[0.5px]',
          label: fallbackLabel,
          iconSource: require('../assets/icon/refresh.png')
        };
    }
  };

  const style = getStyle();

  return (
    <View className={`${style.bg} ${style.border} flex-row items-center px-2.5 py-1.5 rounded-full self-start`}>
      <Image
        source={style.iconSource}
        className="w-[12px] h-[12px]"
        resizeMode="contain"
      />
      <Text className={`${style.text} text-[12px] font-regular tracking-widest ml-1.5`}>
        {t(style.label)} {/* GỌI HÀM DỊCH Ở ĐÂY */}
      </Text>
    </View>
  );
};

export default function MyApplicationsScreen() {
  const router = useRouter();
  const { t } = useLanguage(); // GỌI HOOK DỊCH THUẬT

  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOptionsVisible, setIsOptionsVisible] = useState(false);
  
  const [isWithdrawVisible, setIsWithdrawVisible] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 24 });
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  
  const maxApplications = 5;
  const currentApplications = applications.filter(app =>
    !['CLOSED', 'ADOPTION_COMPLETED'].includes(app.status)
  ).length;

  const progressPercentage = (currentApplications / maxApplications) * 100;

  // BỔ SUNG: HÀM TÍNH TUỔI VÀ DỊCH CỤC BỘ
  const getDisplayAge = (dob: string | undefined) => {
    if (!dob) return t('Unknown');
    const birthDate = new Date(dob);
    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();

    if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
      years--;
      months += 12;
    }

    if (years > 0) return `${years} ${t('years')}`;
    if (months > 0) return `${months} ${t('months')}`;
    return `< 1 ${t('months')}`;
  };

  useFocusEffect(
    useCallback(() => {
      fetchMyApplications();
    }, [])
  );

  const fetchMyApplications = async () => {
    try {
      setIsLoading(true);
      const response = await axiosClient.get('/applications/my-applications');
      
      const sortedData = sortApplications(response.data.data);
      setApplications(sortedData);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdrawApplication = async () => {
    if (!selectedAppId) return;
    
    try {
      setIsWithdrawing(true);
      await axiosClient.patch(`/applications/${selectedAppId}/withdraw`);
      
      setApplications(prevApps => {
        const updatedApps = prevApps.map(app => 
          app.id === selectedAppId ? { ...app, status: 'CLOSED' } : app
        );
        return sortApplications(updatedApps);
      });
      
      setIsWithdrawVisible(false);
    } catch (error: any) {
      console.error('Error withdrawing application:', error);
      Alert.alert(t("Error"), error?.response?.data?.message || t("Cannot turn off 2FA at this time.")); // Dùng tạm key lỗi chung hoặc fix sau
    } finally {
      setIsWithdrawing(false);
      setSelectedAppId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    // Lấy tên viết tắt của tháng (ví dụ: "Jan", "Feb"...)
    const monthKey = date.toLocaleDateString('en-US', { month: 'short' }); 
    const year = date.getFullYear();

    // Trả về dạng: "04 Tháng 6, 2026" (hoặc format bạn muốn)
    return `${day} ${t(monthKey)}, ${year}`;
  };

  const renderHeader = () => {
    const isAtLimit = progressPercentage >= 100;
    const activeTextColor = isAtLimit ? 'text-[#E89B5A]' : 'text-[#55B786]';
    const progressBgColor = isAtLimit ? 'bg-[#E89B5A]' : 'bg-[#54B685]';

    return (
      <View className="px-5 pt-[20px] pb-4">
        <View>
          <View className="flex-row justify-between items-end mb-2.5">
            <View>
              <Text className="text-[#A9ACB4] font-semibold text-[12px] mb-1">
                {t('APPLICATION LIMIT')}
              </Text>
              <View className="flex-row items-baseline">
                <Text className={`${activeTextColor} font-bold text-[22px]`}>
                  {currentApplications}
                </Text>
                <Text className="text-[#B5B5B5] font-bold text-[16px]">
                  /{maxApplications} {t('active')}
                </Text>
              </View>
            </View>
          </View>

          <View className="h-[6px] bg-[#F3F4F6] rounded-full overflow-hidden mt-1">
            <View
              className={`h-full ${progressBgColor} rounded-full`}
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            />
          </View>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#FFFFFF]">
      <SafeAreaView className="flex-1" edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />

        <View className="flex-row items-center px-4 py-3 bg-white z-10">
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
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
              }}>
              <LinearGradient
                colors={['rgba(221, 221, 221, 0.3)', 'rgba(247, 247, 247, 0.7)', '#FFFFFF']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                locations={[0, 0.3, 1]}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 9999 }}
              />
              <Feather name="chevron-left" size={20} color="#1F2937" />
            </View>
          </TouchableOpacity>
          <Text className="text-[20px] font-semibold text-black flex-1 text-center mr-6">
            {t('My Applications')}
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
                <Text className="text-gray-500 font-medium">{t("You haven't applied for any pets yet.")}</Text>
              </View>
            }
            renderItem={({ item }) => {
              // 1. CHỐNG CRASH: Tránh trường hợp cả mảng có phần tử null
              if (!item) return null;

              const isNeedMoreInfo = item.status?.toLowerCase().replace(/\s+/g, '_') === 'need_more_info';
              
              // 2. CHỐNG CRASH: Thêm dấu ?. sau item.pet để an toàn khi thú cưng bị xóa
              const petImage = item.pet?.images?.[0]?.url || 'https://via.placeholder.com/150';
              const computedAge = getDisplayAge(item.pet?.dob);
              const ageAndBreed = [computedAge, item.pet?.breed || t('Unknown')].filter(Boolean).join(' • ');

              return (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => router.push(`/adoption-status?id=${item.id}`)}
                  className={`flex-col pt-[14px] px-[14px] mx-5 mb-4 rounded-[13px] bg-white border ${isNeedMoreInfo ? 'border-[#E89B5A]' : 'border-[#E5E5E5]'
                    }`}
                  style={{
                    shadowColor: '#E5E5E5',
                    shadowOffset: { width: 2, height: 3 },
                    shadowOpacity: 0.15,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                >
                  <View className="flex-row mb-3.5">
                    <Image
                      source={{ uri: petImage }}
                      className="w-[76px] h-[76px] rounded-2xl bg-gray-100"
                      resizeMode="cover"
                    />

                    <View className="flex-1 mb-2 ml-[10px] justify-center">
                      <Text className="text-[16px] font-medium text-black" numberOfLines={1}>
                        {/* 3. Thêm ?. và fallback text */}
                        {item.pet?.name || t('Unknown Pet')}
                      </Text>

                      <Text className="text-[#8E8E93] text-[12px] font-regular tracking-[0.5px] mt-[7px]" numberOfLines={1}>
                        {ageAndBreed}
                      </Text>

                      <Text className="text-[#000000] text-[12px] font-regular tracking-[0.5px] mt-[7px]" numberOfLines={1}>
                        {/* 4. Thêm ?. */}
                        {item.pet?.shelter?.name || 'PawLife Shelter'}
                      </Text>
                    </View>

                    <TouchableOpacity
                      className="p-1 -mr-1 items-start"
                      hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                      onPress={(e) => {
                        e.stopPropagation();
                        const { pageY } = e.nativeEvent;
                        setMenuPosition({ top: pageY - 12, right: 54 });
                        setSelectedAppId(item.id);
                        setIsOptionsVisible(true);
                      }}
                    >
                      <Feather name="more-vertical" size={20} color={isNeedMoreInfo ? '#E89B5A' : '#B8B8B8'} />
                    </TouchableOpacity>
                  </View>

                  <View className={`flex-row justify-between items-center py-3 border-t ${isNeedMoreInfo ? 'border-[#E89B5A] bg-[#FFF5EE]' : 'border-[#E5E5E5] bg-[#F6F6F6]'}  -mx-[14px] px-[14px] rounded-b-[13px]`}>
                    <StatusBadge status={item.status} t={t} /> 

                    <View className="flex-row items-center">
                      <Text className={`${isNeedMoreInfo ? 'text-[#E89B5A]' : 'text-[#8E8E93]'} text-[12px] font-regular tracking-[0.5px] ml-1.5`}>
                        {formatDate(item.createdAt)}
                      </Text>
                    </View>
                  </View>

                </TouchableOpacity>
              );
            }}
          />
        )}
        
        {/* MODAL 1: DROPDOWN MENU */}
        <Modal
          visible={isOptionsVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setIsOptionsVisible(false)}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setIsOptionsVisible(false)}
          >
            <View
              className="absolute bg-white rounded-xl border border-gray-100 w-48 shadow-sm"
              style={{
                top: menuPosition.top,     
                right: menuPosition.right, 
                elevation: 8,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 10
              }}
            >
              <TouchableOpacity
                className="flex-row items-center px-4 py-3 border-b border-gray-50"
                activeOpacity={0.6}
                onPress={() => {
                  setIsOptionsVisible(false);
                  const selectedApp = applications.find(app => app.id === selectedAppId);
                  if (selectedApp?.pet?.id) {
                    router.push({
                    pathname: '/pet-detail-modal',
                    params: { id: selectedApp.pet.id }
                  });
                  }
                }}
              >
               
                <Feather name="twitter" size={16} color="#4B5563" />
                <Text className="text-[13px] font-medium text-gray-700 ml-2 leading-5">{t('Pet Profile')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center px-4 py-3 border-b border-gray-50"
                activeOpacity={0.6}
                onPress={() => {
                  setIsOptionsVisible(false);
                  if (selectedAppId) {
                    router.push(`/adoption-status?id=${selectedAppId}`);
                  }
                }}
              >
                <Feather name="file-text" size={16} color="#4B5563" />
                <Text className="text-[13px] font-medium text-gray-700 ml-2 leading-5">{t('Application Status')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center px-4 py-3 border-b border-gray-50"
                activeOpacity={0.6}
                onPress={() => {
                  setIsOptionsVisible(false);
                  const selectedApp = applications.find(app => app.id === selectedAppId);
                  const shelterId = selectedApp?.pet?.shelter?.id || (selectedApp?.pet as any)?.shelterId;
                  
                  if (shelterId) {
                    router.push(`/shelter-profile?id=${shelterId}`);
                  } else {
                    Alert.alert(t("Notice"), t("This pet currently has no linked shelter information."));
                  }
                }}
              >
                <Feather name="home" size={16} color="#4B5563" />
                <Text className="text-[13px] font-medium text-gray-700 ml-2 leading-5">{t('Shelter Info')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center px-4 py-3"
                activeOpacity={0.6}
                onPress={() => {
                  setIsOptionsVisible(false);
                  const selectedApp = applications.find(app => app.id === selectedAppId);
                  
                  if (selectedApp && ['CLOSED', 'ADOPTION_COMPLETED'].includes(selectedApp.status)) {
                     Alert.alert(t("Invalid"), t("This application is closed or completed, cannot be withdrawn."));
                     return;
                  }

                  setTimeout(() => setIsWithdrawVisible(true), 150);
                }}
              >
                <Feather name="x-circle" size={16} color="#EF4444" />
                <Text className="text-[13px] font-medium text-[#EF4444] ml-2 leading-5">{t('Withdraw')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* MODAL 2: CONFIRM WITHDRAW APPLICATION */}
        <Modal
          visible={isWithdrawVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => !isWithdrawing && setIsWithdrawVisible(false)}
        >
          <View className="flex-1 bg-black/40 justify-center items-center px-6">
            <View className="bg-white w-full rounded-[20px] p-6 items-center">
              <View className="w-14 h-14 bg-red-50 rounded-full items-center justify-center mb-4">
                <Feather name="alert-triangle" size={24} color="#EF4444" />
              </View>
              
              <Text className="text-[18px] font-bold text-center text-gray-900 mb-2">
                {t('Withdraw Application?')}
              </Text>
              <Text className="text-[14px] font-regular text-center text-gray-500 mb-6">
                {t('Are you sure you want to withdraw this adoption application? This action cannot be undone and you will need to reapply if you change your mind.')}
              </Text>

              <View className="flex-row w-full gap-3">
                <TouchableOpacity
                  className="flex-1 bg-gray-100 py-3.5 rounded-xl items-center"
                  onPress={() => setIsWithdrawVisible(false)}
                  disabled={isWithdrawing}
                >
                  <Text className="text-gray-700 font-semibold text-[15px]">{t('common.cancel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-1 bg-[#EF4444] py-3.5 rounded-xl items-center flex-row justify-center"
                  onPress={handleWithdrawApplication}
                  disabled={isWithdrawing}
                >
                  {isWithdrawing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text className="text-white font-semibold text-[15px]">{t('Withdraw')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </View>
  );
}