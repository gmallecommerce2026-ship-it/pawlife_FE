// app/shelter-profile.tsx
import { AntDesign, Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, DeviceEventEmitter, Dimensions, Image, Linking, Modal, ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { shelterService } from '../services/shelterService';

import { Text } from '@/components/AppText';
const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48 - 16) / 2;

export default function ShelterProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const shelterId = params.id as string;

  const [shelterInfo, setShelterInfo] = useState<any>(null);
  const [pets, setPets] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  // === THÊM STATE CHO SEARCH TẠI ĐÂY ===
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [modalConfig, setModalConfig] = useState({
    visible: false,
    title: '',
    content: '',
    type: ''
  });

  // Gọi API mỗi khi có shelterId hoặc khi người dùng gõ tìm kiếm
  const [isNotFound, setIsNotFound] = useState(false);

  useEffect(() => {
    const isValidId = shelterId && 
                      typeof shelterId === 'string' && 
                      shelterId !== 'undefined' && 
                      shelterId !== 'null';

    if (!isValidId) {
      setLoading(false);
      setIsNotFound(true);
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      fetchShelterDetail(searchQuery);
    }, 500); 

    return () => clearTimeout(delayDebounceFn);
  }, [shelterId, searchQuery]);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('SHELTER_FOLLOW_TOGGLED', (data) => {
      if (data.shelterId === shelterId && isFollowing !== data.isFollowed) {
        setIsFollowing(data.isFollowed);
        // Tùy chọn: Tăng/giảm số lượng follower cho khớp
        setShelterInfo((prev: any) => {
          if (!prev) return prev;
          const currentFollowers = prev?._count?.followers || 0;
          return {
            ...prev,
            _count: {
              ...prev._count,
              followers: data.isFollowed ? currentFollowers + 1 : Math.max(0, currentFollowers - 1),
            },
          };
        });
      }
    });
    return () => subscription.remove();
  }, [shelterId, isFollowing]);

  const fetchShelterDetail = async (query = '') => {
    try {
      if (!shelterInfo) setLoading(true); 
      const data = await shelterService.getShelterDetail(shelterId, query);
      setShelterInfo(data);
      setPets(data.pets || []); 
      setIsFollowing(data.isFollowed || false);
      setIsNotFound(false); // Reset lỗi nếu thành công
    } catch (error: any) {
      console.error('Lỗi khi tải chi tiết trạm:', error);
      // 2. Bắt chính xác lỗi 404 từ backend
      if (error?.statusCode === 404 || error?.message?.includes('404')) {
        setIsNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFollow = async () => {
    const prevFollowingState = isFollowing;
    const newFollowingState = !isFollowing;

    // Optimistic UI Update
    setIsFollowing(newFollowingState);
    setShelterInfo((prev: any) => {
      const currentFollowers = prev?._count?.followers || 0;
      return {
        ...prev,
        _count: {
          ...(prev?._count || {}),
          followers: newFollowingState 
            ? currentFollowers + 1 
            : Math.max(0, currentFollowers - 1),
        },
      };
    });

    // BẮN SỰ KIỆN ĐỒNG BỘ RA TOÀN APP
    DeviceEventEmitter.emit('SHELTER_FOLLOW_TOGGLED', { shelterId, isFollowed: newFollowingState });

    try {
      const response = await shelterService.toggleFollow(shelterId);
      
      // FIX LỖI BACKEND: Backend của bạn trả về { success: true, data: { followed: true/false } }
      // Chứ KHÔNG trả về `followersCount`. Nên đoạn check cũ (typeof response.followersCount === 'number') sẽ không bao giờ chạy.
      // Vì ta đã dùng Optimistic Update ở trên, nếu API không ném lỗi thì ta không cần phải làm gì thêm ở đây.

    } catch (error) {
      // Revert lại nếu lỗi API
      setIsFollowing(prevFollowingState);
      setShelterInfo((prev: any) => {
        const currentFollowers = prev?._count?.followers || 0;
        return {
          ...prev,
          _count: {
            ...(prev?._count || {}),
            followers: prevFollowingState 
              ? currentFollowers + 1  
              : Math.max(0, currentFollowers - 1),
          },
        };
      });
      console.error('Lỗi khi thay đổi trạng thái theo dõi:', error);
      
      // Bắn sự kiện rollback
      DeviceEventEmitter.emit('SHELTER_FOLLOW_TOGGLED', { shelterId, isFollowed: prevFollowingState });
    }
  };

  const openPolicy = () => {
    setModalConfig({
      visible: true,
      title: 'Adoption Policy',
      content: shelterInfo?.policy || 'The shelter has not updated the adoption policy yet.',
      type: 'policy'
    });
  };

  const openContact = () => {
    setModalConfig({
      visible: true,
      title: 'Contact Information',
      content: `📞 Phone: ${shelterInfo?.contactInfo || 'Not provided'}\n\n📍 Address: ${shelterInfo?.address || 'Not provided'}`,
      type: 'contact'
    });
  };

  const handleCall = () => {
    if (shelterInfo?.contactInfo) {
      Linking.openURL(`tel:${shelterInfo.contactInfo}`);
    }
  };

  const StatItem = ({ value, label }: { value: string | number, label: string }) => (
    <View className="items-center">
      <Text className="text-gray-900 font-bold text-lg">{value}</Text>
      <Text className="text-gray-400 text-xs font-medium">{label}</Text>
    </View>
  );

  if (loading || !shelterInfo) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#ffa053" />
      </SafeAreaView>
    );
  }

  if (isNotFound) {
    return (
      <SafeAreaView className="flex-1 bg-[#FAFAFA] justify-center items-center">
        <MaterialCommunityIcons name="home-off" size={64} color="#E5E7EB" />
        <Text className="text-gray-800 text-lg font-bold mt-4">Không tìm thấy trạm cứu hộ</Text>
        <Text className="text-gray-500 text-sm mt-2 text-center px-6">
          Dữ liệu trạm có thể đã bị xóa hoặc đường dẫn không chính xác.
        </Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-6 bg-orange-100 px-6 py-3 rounded-full">
          <Text className="text-orange-600 font-bold">Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* --- HEADER --- */}
      <View className="flex-row items-center justify-between px-6 py-2 border-b border-transparent min-h-[48px]">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <AntDesign name="left" size={24} color="#374151" />
        </TouchableOpacity>
        
        {/* --- LOGIC HIỂN THỊ THANH SEARCH HOẶC TÊN TRẠM --- */}
        {isSearching ? (
          <TextInput
            className="flex-1 bg-gray-100 rounded-lg px-3 py-1.5 mx-2 text-gray-900"
            placeholder="Search pets by name or breed..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
        ) : (
          <Text className="text-lg font-bold text-gray-900 flex-1 text-center mx-2" numberOfLines={1}>
            {shelterInfo.name}
          </Text>
        )}
        
        <TouchableOpacity 
          className="p-2 -mr-2"
          onPress={() => {
            if (isSearching) {
              // Hủy search, xóa text
              setIsSearching(false);
              setSearchQuery(''); 
            } else {
              // Bật search
              setIsSearching(true);
            }
          }}
        >
          <Feather name={isSearching ? "x" : "search"} size={24} color="#ffa053" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* --- PROFILE HEADER (Ẩn đi nếu đang search cho trải nghiệm tốt hơn - Tuỳ chọn) --- */}
        {!isSearching && (
          <View className="px-6 mt-4 mb-6">
            <View className="flex-row items-center justify-between mb-6">
              <View className="w-20 h-20 rounded-full bg-orange-400 overflow-hidden border-4 border-white shadow-sm">
                 {shelterInfo.avatarUrl ? (
                     <Image source={{ uri: shelterInfo.avatarUrl }} className="w-full h-full" resizeMode="cover" />
                 ) : (
                     <View className="w-full h-full bg-[#FDBA74]" />
                 )}
              </View>
              
              <View className="flex-1 flex-row justify-around ml-4">
                {/* Sửa lại hiển thị số lượng pet lấy từ count để đúng thực tế tổng số pet của trạm (ngay cả khi search) */}
                <StatItem value={shelterInfo._count?.pets || pets.length} label="Pets" />
                <StatItem value={shelterInfo._count?.followers || 0} label="Followers" />
                <StatItem value={shelterInfo.adoptedCount || 0} label="Adopted" />
              </View>
            </View>

            <Text className="text-gray-400 text-xs font-medium mb-1">Animal Shelter & Rescue</Text>
            <View className="flex-row items-center mb-1">
               <Text className="text-gray-500 text-sm leading-5">
                  Saving lives and finding forever homes 🐾 {shelterInfo.address}
               </Text>
            </View>
            <Text className="text-orange-500 text-sm font-medium mb-3">{shelterInfo.contactInfo}</Text> 

            <View className="flex-row gap-3 mt-2">
                <TouchableOpacity 
                  onPress={handleToggleFollow}
                  className={`flex-1 py-2.5 rounded-lg items-center justify-center shadow-sm ${
                    isFollowing ? 'bg-gray-200 shadow-gray-100' : 'bg-orange-400 shadow-orange-200'
                  }`}
                >
                    <Text className={`font-bold text-sm ${isFollowing ? 'text-gray-700' : 'text-white'}`}>
                      {isFollowing ? 'Following' : 'Follow'}
                    </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={openPolicy}
                  className="flex-1 bg-white border border-gray-200 py-2.5 rounded-lg items-center justify-center"
                >
                    <Text className="text-gray-600 font-bold text-sm">Policy</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={openContact}
                  className="flex-1 bg-white border border-gray-200 py-2.5 rounded-lg items-center justify-center"
                >
                    <Text className="text-gray-600 font-bold text-sm">Contact</Text>
                </TouchableOpacity>
            </View>
          </View>
        )}

        {/* --- PET GRID --- */}
        <View className="px-6 flex-row flex-wrap justify-between mt-4">
           {pets.length === 0 ? (
             <View className="flex-1 items-center justify-center py-10">
               <Text className="text-gray-500">No pets found matching "{searchQuery}"</Text>
             </View>
           ) : (
             pets.map((pet) => {
               const imageUrl = pet.images && pet.images.length > 0 
                  ? pet.images[0].url 
                  : 'https://via.placeholder.com/150';

               return (
                 <TouchableOpacity 
                  key={pet.id} 
                  style={{ width: COLUMN_WIDTH }}
                  className="bg-white rounded-[20px] mb-4 shadow-sm shadow-gray-200 border border-gray-100 overflow-hidden pb-3"
                  onPress={() => router.push(`/shelter-pet-detail?id=${pet.id}`)}
                  >
                     <Image source={{ uri: imageUrl }} className="w-full h-40 bg-gray-100" resizeMode="cover" />
                     
                     <View className="px-3 pt-3">
                         <Text className="text-gray-900 font-bold text-base mb-1" numberOfLines={1}>{pet.name}</Text>
                         <View className="flex-row items-center justify-between">
                             <View className="flex-row items-center">
                                 <Ionicons name="location-sharp" size={10} color="#ffa053" />
                                 <Text className="text-gray-400 text-[10px] ml-1">{pet.distance || '1.0 km'}</Text>
                             </View>
                             <Text className="text-gray-500 text-[10px] font-medium" numberOfLines={1}>• {pet.breed}</Text>
                         </View>
                     </View>
                 </TouchableOpacity>
               );
             })
           )}
        </View>
      </ScrollView>

      {/* MODAL POLICY / CONTACT */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalConfig.visible}
        onRequestClose={() => setModalConfig({ ...modalConfig, visible: false })}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white w-full rounded-2xl p-6 shadow-lg max-h-[80%]">
            <View className="flex-row justify-between items-center mb-4 border-b border-gray-100 pb-3">
              <Text className="text-lg font-bold text-gray-900">{modalConfig.title}</Text>
              <TouchableOpacity onPress={() => setModalConfig({ ...modalConfig, visible: false })}>
                <AntDesign name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-gray-600 text-base leading-6">{modalConfig.content}</Text>
            </ScrollView>

            {modalConfig.type === 'contact' && shelterInfo?.contactInfo && (
              <TouchableOpacity 
                onPress={handleCall}
                className="mt-6 bg-orange-500 py-3.5 rounded-xl items-center flex-row justify-center gap-2"
              >
                <Feather name="phone-call" size={18} color="white" />
                <Text className="text-white font-bold text-base">Call Shelter</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}