// app/shelter-profile.tsx
import { AntDesign, Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, DeviceEventEmitter, Dimensions, Image, Linking, Modal, ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { shelterService } from '../services/shelterService';

import { Text } from '@/components/AppText';
import { StatusBar } from 'expo-status-bar';
const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48 - 16) / 2;

export default function ShelterProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const shelterId = params.id as string;
  const insets = useSafeAreaInsets();

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
      // Thêm dòng này: Bỏ qua nếu sự kiện do chính màn hình này phát ra
      if (data.source === 'SHELTER_PROFILE') return;

      if (data.shelterId === shelterId && isFollowing !== data.isFollowed) {
        setIsFollowing(data.isFollowed);
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

    // BẮN SỰ KIỆN ĐỒNG BỘ RA TOÀN APP (Kèm thêm source)
    DeviceEventEmitter.emit('SHELTER_FOLLOW_TOGGLED', {
      shelterId,
      isFollowed: newFollowingState,
      source: 'SHELTER_PROFILE' // <-- Thêm cái này
    });

    try {
      const response = await shelterService.toggleFollow(shelterId);
      // Giữ nguyên logic cũ...
    } catch (error) {
      // Revert lại nếu lỗi API
      setIsFollowing(prevFollowingState);
      setShelterInfo((prev: any) => {
        // ... logic revert cũ giữ nguyên ...
      });
      console.error('Lỗi khi thay đổi trạng thái theo dõi:', error);

      // Bắn sự kiện rollback (Kèm thêm source)
      DeviceEventEmitter.emit('SHELTER_FOLLOW_TOGGLED', {
        shelterId,
        isFollowed: prevFollowingState,
        source: 'SHELTER_PROFILE' // <-- Thêm cái này
      });
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
    <View className="flex-row items-center">
      <Text className="text-[14px] font-bold text-[#1C1C1E]">{value}</Text>
      <Text className="text-[13px] text-[#8E8E93] ml-1">{label}</Text>
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
    <View className="flex-1">
      <StatusBar style="light" translucent backgroundColor="transparent" />

      {isSearching && (
        <View
          style={{ paddingTop: insets.top }}
          className="absolute inset-0 bg-white z-[100]"
        >
          {/* Header của Search Overlay */}
          <View className="flex-row items-center px-6 py-4 border-b border-gray-100">
            <View className="flex-1 flex-row items-center bg-gray-100 rounded-2xl px-4 py-2.5">
              <Feather name="search" size={18} color="#8E8E93" />
              <TextInput
                autoFocus
                placeholder="Find a pet in this shelter..."
                className="flex-1 ml-3 text-[16px] text-[#1C1C1E]"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#C7C7CC" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              onPress={() => {
                setIsSearching(false);
                setSearchQuery('');
              }}
              className="ml-4"
            >
              <Text className="text-[#F2A465] font-bold text-[16px]">Close</Text>
            </TouchableOpacity>
          </View>

          {/* Danh sách Pet lọc được */}
          <ScrollView
            className="flex-1 px-6 pt-6"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
          >
            {/* <Text className="text-[14px] text-[#8E8E93] mb-4">
              Found {filteredPets.length} result{filteredPets.length !== 1 ? 's' : ''}
            </Text>

            <View className="flex-row flex-wrap gap-4">
              {filteredPets.map((pet) => (
                <TouchableOpacity
                  key={pet.id}
                  onPress={() => router.push({ pathname: '/pet-detail-modal', params: { id: pet.id } })}
                  style={{ width: COLUMN_WIDTH }}
                  className="bg-white rounded-[25px] overflow-hidden border border-gray-100 shadow-sm"
                >
                  <Image
                    source={{ uri: pet.images?.[0]?.url || pet.imageUrl }}
                    className="w-full h-[140px]"
                    resizeMode="cover"
                  />
                  <View className="p-3">
                    <Text className="text-[15px] font-bold text-[#1C1C1E]" numberOfLines={1}>{pet.name}</Text>
                    <Text className="text-[12px] text-[#8E8E93] mt-0.5">{pet.breed}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View> */}
          </ScrollView>
        </View>
      )}
      <Image
        source={{ uri: shelterInfo?.avatarUrl || 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=800' }}
        className="w-full absolute top-0"
        style={{ height: 280, width }}
        resizeMode="cover"
      />
      <View
        style={{ top: insets.top + 10 }}
        className="absolute left-5 right-5 flex-row justify-between z-30"
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-black/20 rounded-full items-center justify-center"
        >
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setIsSearching(true)} className="w-10 h-10 bg-black/20 rounded-full items-center justify-center">
          <Ionicons name="search" size={22} color="white" />
        </TouchableOpacity>
      </View>

      {/* CONTENT SECTION */}
      <View className="flex-1">
        <View style={{ height: 200 }} />
        <View className="bg-white rounded-t-[40px] px-6 pb-6 shadow-xl min-h-screen">
          {/* HEADER THÔNG TIN TRẠM */}
          <View className='flex-row items-end mb-6'>
            <View className="-mt-5 bg-white p-1 rounded-full">
              <Image
                source={{ uri: shelterInfo?.avatarUrl || 'https://via.placeholder.com/150' }}
                className="w-[90px] h-[90px] rounded-full"
              />
            </View>
            <View className="ml-5 flex-1 pb-1 -top-6">
              <Text className="text-[22px] font-medium text-[#1C1C1E]" numberOfLines={1}>
                {shelterInfo?.name}
              </Text>

              <View className="flex-row items-center mt-1">

                <StatItem value={shelterInfo._count?.pets || pets.length} label="Pets" />
                <View className="w-[1px] h-3 bg-gray-300 mx-3" />

                <StatItem value={shelterInfo._count?.followers || 0} label="Followers" />
                <View className="w-[1px] h-3 bg-gray-300 mx-3" />

                <StatItem value={shelterInfo.adoptedCount || 0} label="Adopted" />
              </View>
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-gray-400 text-[14px] font-regular mb-1">Animal Shelter & Rescue</Text>
            <Text className="text-[16px] text-[#48484A] font-medium leading-[22px]">
              {shelterInfo?.description || "Providing a second chance for furry friends in need with love and professional care."}
            </Text>
            <View className="flex-row items-center mt-2">
              <Feather name="link" size={14} color="#F2A465" />
              <Text className="ml-2 text-[16px] text-[#F2A465] flex-1">{shelterInfo?.emailAddress || 'pawlife@example.com'}</Text>
            </View>

            <View className="flex-row items-center mt-2">
              <Feather name="map-pin" size={14} color="#8E8E93" />
              <Text className="ml-2 text-[14px] text-[#8E8E93] flex-1">{shelterInfo?.address}</Text>
            </View>
          </View>
          <View className="flex-row gap-3 mt-2 mb-6">
            <TouchableOpacity
              onPress={handleToggleFollow}
              className={`flex-1 py-2.5 rounded-full items-center justify-center shadow-sm ${isFollowing ? 'bg-gray-200 shadow-gray-100' : 'bg-orange-400 shadow-orange-200'
                }`}
            >
              <Text className={`font-bold text-sm ${isFollowing ? 'text-gray-700' : 'text-white'}`}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={openContact}
              className="flex-1 bg-[#F6F6F6] py-2.5 rounded-full items-center justify-center"
            >
              <Text className="text-gray-600 font-bold text-sm">Contact</Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 200 }}>
            {/* Grid Pets */}
            <View className="flex-row flex-wrap gap-4">
              {pets.length === 0 ? (
                <View className="flex-1 items-center justify-center py-10">
                  <Text className="text-gray-500">No pets found matching "{searchQuery}"</Text>
                </View>
              ) : (
                pets.map((pet) => {
                  const imageUrl = pet.images && pet.images.length > 0
                    ? pet.images[0].url
                    : 'https://via.placeholder.com/400';

                  // Giả lập logic lấy giới tính (nếu API trả về 'female' hoặc 'male')
                  const isFemale = pet.gender?.toLowerCase() === 'female';

                  return (
                    <TouchableOpacity
                      key={pet.id}
                      style={{ width: COLUMN_WIDTH }}
                      className="mb-[21px]"
                      activeOpacity={0.8}
                      onPress={() => router.push(`/shelter-pet-detail?id=${pet.id}`)}
                    >
                      {/* 1. KHỐI ẢNH: Ép tỉ lệ 1:1, bo góc cực sâu 28px */}
                      <View className="w-full aspect-square mb-[12px] relative">
                        <Image
                          source={{ uri: imageUrl }}
                          className="w-full h-full rounded-[24px] bg-gray-100"
                          resizeMode="cover"
                        />

                        {/* Icon Heart (mô phỏng theo ảnh mẫu có trái tim màu cam phấn) */}
                        {pet.isFavorite && (
                          <View className="absolute top-3.5 right-3.5">
                            <Ionicons name="heart" size={22} color="#E89B5F" />
                          </View>
                        )}
                      </View>

                      {/* 2. KHỐI TEXT: Padding = 0 để thẳng hàng hoàn toàn với lề trái của ảnh */}
                      <View className="px-1">
                        {/* Tên Pet: Đen tuyền, chữ to, bold, margin bottom rất nhỏ */}
                        <Text
                          className="text-[#000000] font-bold text-[17px] tracking-tight mb-[7.6px]"
                          numberOfLines={1}
                        >
                          {pet.name}
                        </Text>

                        {/* Thông tin: Giới tính + Tuổi + Giống */}
                        <View className="flex-row items-center">
                          {/* Icon Giới tính với mã màu chuẩn chiết xuất từ ảnh */}
                          <Ionicons
                            name={isFemale ? "female" : "male"}
                            size={14}
                            color={isFemale ? "#F471B5" : "#5BB0FF"}
                          />

                          <Text
                            className="text-[#8B8B8B] text-[13px] font-normal ml-1.5"
                            numberOfLines={1}
                          >
                            {pet.age || '1 year'} · {pet.breed || 'Unknown'}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </ScrollView>
        </View>
      </View>
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
    </View>
  );
}