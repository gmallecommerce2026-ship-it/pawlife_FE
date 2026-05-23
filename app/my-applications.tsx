// app/my-applications.tsx
import axiosClient from '@/api/axiosClient';
import { Text } from '@/components/AppText';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

const MOCK_APPLICATIONS: ApplicationRecord[] = [
  {
    id: 'app_001',
    status: 'Submitted',
    createdAt: '2026-05-16T08:30:00Z',
    pet: {
      name: 'Luna',
      breed: 'Siberian Husky',
      age: '2 years',
      shelter: { name: 'Happy Paws Shelter' },
      images: [{ url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=300' }]
    }
  },
  {
    id: 'app_002',
    status: 'Pending',
    createdAt: '2026-05-15T10:15:00Z',
    pet: {
      name: 'Bella',
      breed: 'Golden Retriever',
      age: '1 year',
      shelter: { name: 'City Animal Rescue' },
      images: [{ url: 'https://images.unsplash.com/photo-1552053831-71594a27632d?q=80&w=300' }]
    }
  },
  {
    id: 'app_003',
    status: 'Need more info',
    createdAt: '2026-05-14T14:45:00Z',
    pet: {
      name: 'Max',
      breed: 'Beagle',
      age: '6 months',
      shelter: { name: 'Safe Haven Rescue' },
      images: [{ url: 'https://images.unsplash.com/photo-1537151608804-ea6d11540d12?q=80&w=300' }]
    }
  },
  {
    id: 'app_004',
    status: 'Interview Scheduled',
    createdAt: '2026-05-12T09:00:00Z',
    pet: {
      name: 'Charlie',
      breed: 'Poodle',
      age: '3 years',
      shelter: { name: 'Paws and Claws' },
      images: [{ url: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?q=80&w=300' }]
    }
  },
  {
    id: 'app_005',
    status: 'Approved',
    createdAt: '2026-05-10T11:20:00Z',
    pet: {
      name: 'Milo',
      breed: 'French Bulldog',
      age: '4 months',
      shelter: { name: 'Hope for Paws' },
      images: [{ url: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=300' }]
    }
  },
  {
    id: 'app_006',
    status: 'Adopted',
    createdAt: '2026-05-01T16:00:00Z',
    pet: {
      name: 'Daisy',
      breed: 'Mixed Breed',
      age: '2 months',
      shelter: { name: 'Loving Hearts Shelter' },
      images: [{ url: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?q=80&w=300' }]
    }
  }
];

const StatusBadge = ({ status }: { status: string }) => {
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
      default:
        return {
          bg: 'bg-[#8E8E93/10]',
          border: 'border border-[#8E8E93]/25',
          text: 'text-[#8E8E93] tracking-[0.5px]',
          label: status,
          iconSource: require('../assets/icon/refresh.png')
        };
    }
  };

  const style = getStyle();

  return (
    <View className={`${style.bg} ${style.border} flex-row items-center px-2.5 py-1.5 rounded-full self-start`}>
      {/* THAY THẾ THẺ FEATHER THÀNH THẺ IMAGE */}
      <Image
        source={style.iconSource}
        className="w-[12px] h-[12px]"
        resizeMode="contain"
      />
      <Text className={`${style.text} text-[12px] font-regular tracking-widest ml-1.5`}>
        {style.label}
      </Text>
    </View>
  );
};
export default function MyApplicationsScreen() {
  const router = useRouter();
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  // Set mặc định là MOCK DATA
  // const [applications, setApplications] = useState<ApplicationRecord[]>(MOCK_APPLICATIONS);
  const [isLoading, setIsLoading] = useState(true);
  const [isOptionsVisible, setIsOptionsVisible] = useState(false);
  const maxApplications = 5;
  const [isWithdrawVisible, setIsWithdrawVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 24 });
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const currentApplications = applications.filter(app =>
    !['CLOSED', 'ADOPTION_COMPLETED'].includes(app.status)
  ).length;

  const progressPercentage = (currentApplications / maxApplications) * 100;

  useFocusEffect(
    useCallback(() => {
      fetchMyApplications();
      // return;
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

  const renderHeader = () => {
    // 1. Xác định trạng thái đã đạt/vượt giới hạn chưa
    const isAtLimit = progressPercentage >= 100;

    // 2. Định nghĩa các màu dựa theo trạng thái (Xanh lá mặc định, Cam khi full)
    const activeTextColor = isAtLimit ? 'text-[#E89B5A]' : 'text-[#55B786]';
    const progressBgColor = isAtLimit ? 'bg-[#E89B5A]' : 'bg-[#54B685]';

    return (
      <View className="px-5 pt-[20px] pb-4">
        <View>
          <View className="flex-row justify-between items-end mb-2.5">
            <View>
              <Text className="text-[#A9ACB4] font-semibold text-[12px] mb-1">
                APPLICATION LIMIT
              </Text>
              <View className="flex-row items-baseline">
                {/* 3. Thay màu của số lượng active */}
                <Text className={`${activeTextColor} font-bold text-[22px]`}>
                  {currentApplications}
                </Text>
                <Text className="text-[#B5B5B5] font-bold text-[16px]">
                  /{maxApplications} active
                </Text>
              </View>
            </View>
          </View>

          <View className="h-[6px] bg-[#F3F4F6] rounded-full overflow-hidden mt-1">
            {/* 4. Thay màu của thanh progress */}
            <View
              className={`h-full ${progressBgColor} rounded-full`}
              // Lưu ý: Nếu muốn giới hạn thanh không dài quá 100% khi số lượng vượt limit
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
              const isNeedMoreInfo = item.status.toLowerCase().replace(/\s+/g, '_') === 'need_more_info';
              const petImage = item.pet.images?.[0]?.url || 'https://via.placeholder.com/150';
              const ageAndBreed = ['2 years', item.pet.breed].filter(Boolean).join(' • ');

              return (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => router.push(`/adoption-status?id=${item.id}`)}
                  className={`flex-col pt-[14px] px-[14px] mx-5 mb-4 rounded-[13px] bg-white border ${isNeedMoreInfo ? 'border-[#E89B5A]' : 'border-[#E5E5E5]'
                    }`}
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
                      <Text className="text-[16px] font-medium text-black" numberOfLines={1}>
                        {item.pet.name}
                      </Text>

                      <Text className="text-[#8E8E93] text-[12px] font-regular tracking-[0.5px] mt-[7px]" numberOfLines={1}>
                        {ageAndBreed}
                      </Text>

                      <Text className="text-[#000000] text-[12px] font-regular tracking-[0.5px] mt-[7px]" numberOfLines={1}>
                        {item.pet.shelter?.name || 'PawLife Shelter'}
                      </Text>
                    </View>

                    {/* Nút 3 chấm góc trên cùng bên phải */}
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

                  {/* Phần dưới: Màu nền xám, thêm padding dọc (py-3), bo góc dưới */}
                  <View className={`flex-row justify-between items-center py-3 border-t ${isNeedMoreInfo ? 'border-[#E89B5A] bg-[#FFF5EE]' : 'border-[#E5E5E5] bg-[#F6F6F6]'}  -mx-[14px] px-[14px] rounded-b-[13px]`}>
                    <StatusBadge status={item.status} />

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
            {/* Menu Dropdown sử dụng toạ độ động */}
            <View
              className="absolute bg-white rounded-xl border border-gray-100 w-48 shadow-sm"
              style={{
                top: menuPosition.top,     // Gắn toạ độ Y động vào đây
                right: menuPosition.right, // Gắn toạ độ X động vào đây
                elevation: 8,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 10
              }}
            >
              <TouchableOpacity
                className="flex-row items-center px-4 py-2"
                activeOpacity={0.6}
                onPress={() => {
                  setIsOptionsVisible(false);
                  console.log("View pet profile ID:", selectedAppId);
                }}
              >
                <Text className="text-[12px] font-medium text-gray-700 ml-1 leading-5">View Pet Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row items-center px-4 py-2"
                activeOpacity={0.6}
                onPress={() => {
                  setIsOptionsVisible(false);
                  console.log("View Application ID:", selectedAppId);
                }}
              >
                <Text className="text-[12px] font-medium text-gray-700 ml-1 leading-5">View Application</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row items-center px-4 py-2"
                activeOpacity={0.6}
                onPress={() => {
                  setIsOptionsVisible(false);
                  console.log("View Shelter :", selectedAppId);
                }}
              >
                <Text className="text-[12px] font-medium text-gray-700 ml-1 leading-5">View Shelter</Text>
              </TouchableOpacity>

              {/* ... các menu item khác giữ nguyên ... */}

              <TouchableOpacity
                className="flex-row items-center px-4 py-2"
                activeOpacity={0.6}
                onPress={() => {
                  setIsOptionsVisible(false);
                  // Bạn có thể truyền selectedAppId vào component Withdraw nếu cần
                  setTimeout(() => setIsWithdrawVisible(true), 150);
                }}
              >
                <Text className="text-[12px] font-medium text-[#EF4444] ml-1 leading-5">Withdraw</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

      </SafeAreaView>
    </View>
  );
}