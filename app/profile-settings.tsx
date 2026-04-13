// app/profile-settings.tsx
import { AuthContext } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useContext, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/AppText';
import { petService } from '@/services/petService';

interface Pet {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

type MenuItemProps = {
  icon: React.ReactNode;
  label: string;
  value?: string;
  isDestructive?: boolean;
  onPress?: () => void;
  hideBorder?: boolean;
};

// Component MenuItem giữ nguyên UI gốc, chỉ cập nhật màu và font chữ
const MenuItem = ({ icon, label, value, isDestructive = false, onPress, hideBorder = false }: MenuItemProps) => (
  <TouchableOpacity 
    onPress={onPress}
    activeOpacity={0.7}
    className={`flex-row items-center justify-between py-[9px] ${!hideBorder ? 'border-b border-gray-100' : ''}`} 
  >
    <View className="flex-row items-center">
      <View className="w-8 items-start justify-center">
        {icon}
      </View>
      <Text className={`text-[14px] px-2 font-normal ${isDestructive ? 'text-red-500' : 'text-[#000000]'}`}>
        {label}
      </Text>
    </View>

    <View className="flex-row items-center">
        {value && (
            <Text className="text-[#8E8E93] text-[14px] font-normal mr-2">{value}</Text>
        )}
        {!isDestructive ? (
             <Feather name="chevron-right" size={20} color="#D1D5DB" />
        ) : null} 
    </View>
  </TouchableOpacity>
);

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const { t, language } = useLanguage(); 

  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoadingPets, setIsLoadingPets] = useState(true);
  const { width } = useWindowDimensions();
  // Vùng chứa có mx-5 (margin 20*2 = 40) và px-5 (padding 20*2 = 40). Tổng trừ đi 80.
  const availableWidth = width - 80; 
  // Chia đúng 5 phần bằng nhau
  const itemWidth = availableWidth / 5;
  const fetchMyPets = async () => {
    if (!user) return;
    try {
      const data = await petService.getMyPets();
      setPets(data);
    } catch (err) {
      console.error('Lỗi khi tải danh sách pet trong settings:', err);
    } finally {
      setIsLoadingPets(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMyPets();
    }, [user])
  );

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        
        {/* --- HEADER --- */}
        <View className="flex-row items-center px-4 py-3 relative bg-white">
            <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 z-10">
                <Feather name="chevron-left" size={24} color="#000000" />
            </TouchableOpacity>
            
            <View className="absolute left-0 right-0 items-center justify-center pointer-events-none">
                <Text className="text-[24px] font-semibold text-[#000000]">{t('Settings')}</Text>
            </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            
            {/* --- THÔNG TIN USER --- */}
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => router.push('/edit-profile')}
              className="flex-row items-center mx-5 px-5 py-4 mb-[7px] bg-white rounded-3xl"
            >
              <Image 
                  source={{ uri: user?.avatarUrl || 'https://i.pravatar.cc/150?img=32' }} 
                  className="w-[61px] h-[61px] rounded-full bg-gray-200 mr-4"
                  resizeMode="cover"
              />
              <View className="flex-1 justify-center">
                  <Text className="font-medium text-gray-900 text-[16px] mb-[7px] tracking-tight">
                      {user?.name || 'User Name'}
                  </Text>
                  <Text className="text-gray-500 text-[12px] font-regular">
                      {t('Account Settings')}
                  </Text>
              </View>
              <Feather name="chevron-right" size={22} color="#D1D5DB" />
            </TouchableOpacity>

            {/* --- SECTION: MY PETS --- */}
            {/* THAY ĐỔI: Thêm px-5 trực tiếp vào thẻ View cha để giới hạn khung hiển thị 2 bên cho ScrollView */}
            <View className="mx-5 mb-6 bg-white rounded-3xl py-[13px] px-5 border border-[#37415118] overflow-hidden">
                
                {/* THAY ĐỔI: Đã xóa px-5 ở header vì thẻ View cha đã thụt lề vào trong rồi */}
                <TouchableOpacity 
                  activeOpacity={0.7}
                  onPress={() => router.push('/(tabs)/my-pets')}
                  className="flex-row justify-between items-center mb-[19px]"
                >
                    <View className="flex-row items-center">
                        <MaterialCommunityIcons name="paw" size={20} color="#374151" />
                        <Text className="text-[14px] font-normal text-[#000000] ml-2">{t('My Pet')}</Text>
                    </View>
                    <Feather name="chevron-right" size={20} color="#D1D5DB" />
                </TouchableOpacity>

                {/* THAY ĐỔI: Xóa contentContainerStyle padding vì khung ScrollView giờ đã nằm chuẩn đúng vị trí gióng dọc từ icon xuống */}
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  className="w-full"
                  // --- CÁC PROPS THÊM VÀO ĐỂ CÓ HIỆU ỨNG SNAP ---
                  snapToInterval={itemWidth} // Hút đúng vào vị trí theo chiều rộng của 1 item
                  snapToAlignment="start"
                  decelerationRate="fast" // Làm mượt hiệu ứng khựng lại
                  // ---------------------------------------------
                >
                    {/* Danh sách Thú Cưng */}
                    {isLoadingPets ? (
                        <View className="w-full h-16 justify-center items-center">
                            <ActivityIndicator size="small" color="#E5E7EB" />
                        </View>
                    ) : (
                        pets.map(pet => (
                            <TouchableOpacity
                                key={pet.id}
                                onPress={() => router.push({ pathname: '/pet-profile-detail', params: { id: pet.id } })}
                                style={{ width: itemWidth }} // Gắn kích thước tính toán được
                                className="items-center" // Đã xoá mr-4
                            >
                                <Image
                                    source={{ uri: pet.avatarUrl || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=500&auto=format&fit=crop' }}
                                    // Chỉnh w-[50px] xuống w-[46px] một chút để đảm bảo trên các máy màn hình quá nhỏ (như iPhone SE) viền ảnh không bị sát nhau
                                    className="w-[46px] h-[46px] rounded-full bg-gray-200 mb-2 border border-gray-100"
                                />
                                <Text className="text-gray-500 text-[12px] w-full text-center px-1" numberOfLines={1} ellipsizeMode="tail">
                                    {pet.name}
                                </Text>
                            </TouchableOpacity>
                        ))
                    )}
                    
                    {/* Nút Thêm Thú Cưng */}
                    <TouchableOpacity 
                        onPress={() => router.push('/add-pet')}
                        style={{ width: itemWidth }} // Gắn kích thước tính toán được
                        className="items-center justify-start" // Đã xoá ml-1
                    >
                        <View className="w-[46px] h-[46px] rounded-full bg-[#F4F5F7] items-center justify-center mb-2">
                            <Feather name="plus" size={24} color="#9CA3AF" />
                        </View>
                        {/* Có thể thêm text rỗng để giữ độ cao bằng với pet có tên */}
                        <Text className="text-transparent text-[12px] mb-0.5" numberOfLines={1}>Add</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            {/* --- NHÓM 1: HOẠT ĐỘNG --- */}
            <View className="mx-5 mb-5 bg-white rounded-3xl px-5 py-1 border border-[#37415118]">
                <MenuItem 
                    icon={<Ionicons name="document-text-outline" size={22} color="#374151" />}
                    label={t('My Applications')}
                    onPress={() => router.push('/my-applications')}
                />
                <MenuItem 
                    icon={<Feather name="heart" size={22} color="#374151" />} 
                    label={t('Saved Pets')} 
                    onPress={() => router.push('/favorite-pets')}
                />
                <MenuItem 
                    icon={<MaterialCommunityIcons name="office-building-marker-outline" size={22} color="#374151" />} 
                    label={t('Followed Shelters')} 
                    onPress={() => router.push('/followed-shelters')}
                />
                <MenuItem 
                    icon={<Feather name="calendar" size={22} color="#374151" />} 
                    label={t('Interested Events')} 
                    onPress={() => router.push('/interested-events')}
                    hideBorder={true}
                />
            </View>

            {/* --- NHÓM 2: CÀI ĐẶT ỨNG DỤNG --- */}
            <View className="mx-5 mb-5 bg-white rounded-3xl px-5 py-1 border border-[#37415118]">
                <MenuItem 
                    icon={<Feather name="lock" size={22} color="#374151" />} 
                    label={t('Security')} 
                    onPress={() => router.push('/account-security')}
                />
                <MenuItem 
                    icon={<Feather name="globe" size={22} color="#374151" />} 
                    label={t('Language')} 
                    value={language === 'vi' ? 'Tiếng Việt' : 'English (US)'}
                    onPress={() => router.push('/language')}
                />
                <MenuItem 
                    icon={<Feather name="help-circle" size={22} color="#374151" />} 
                    label={t('Help & Support')} 
                    onPress={() => router.push('/help-and-support')}
                    hideBorder={true}
                />
            </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}