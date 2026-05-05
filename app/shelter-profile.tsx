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
  const { height: SCREEN_HEIGHT } = Dimensions.get('window');
  const [activeTab, setActiveTab] = useState<'pets' | 'info'>('pets');

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
      <Text className="text-[14px] font-bold text-black">{value}</Text>
      <Text className="text-[14px] text-black ml-1">{label}</Text>
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
        <View style={{ height: SCREEN_HEIGHT * 0.17 }} />
        <View className="bg-white rounded-t-[24px] pb-6 shadow-xl min-h-screen">
          {/* HEADER THÔNG TIN TRẠM */}
          <View className='flex-row items-center px-3 -top-[15px]'>
            <View className="bg-white p-1 rounded-full">
              <Image
                source={{ uri: shelterInfo?.avatarUrl || 'https://via.placeholder.com/150' }}
                className="w-[80px] h-[80px] rounded-full"
              />
            </View>
            <View className="ml-4 flex-1 justify-center mt-4">
              <Text className="text-[20px] font-semibold text-black mb-2" numberOfLines={1}>
                {shelterInfo?.name}
              </Text>
              <View className="flex-row items-center">
                <StatItem value={shelterInfo._count?.pets || pets.length} label="pets" />
                <Text className='text-[12px] px-2 font-extrabold'>•</Text>

                <StatItem value={shelterInfo._count?.followers || 0} label="followers" />
                <Text className='text-[12px] px-2 font-extrabold'>•</Text>

                <StatItem value={shelterInfo.adoptedCount || 0} label="adopted" />
              </View>
            </View>
          </View>
          {/* Content */}
          <View className='mx-[22px]' style={{ top: -5 }}>
            <View className="mb-6">
              <Text className="text-[#8E8E93] text-[12px] font-regular mb-1 leading-4">Animal Shelter & Rescue</Text>
              <Text className="text-[14px] text-black font-regular leading-5">
                {shelterInfo?.description || "Providing a second chance for furry friends in need with love and professional care."}
              </Text>
              <View className="flex-row items-center mt-1">
                <Image
                  source={require('../assets/icon/link-icon.png')}
                  style={{ width: 12, height: 12 }}
                  resizeMode="cover"
                />
                <Text className="ml-1 text-[14px] text-[#E89B5A] leading-4">{shelterInfo?.emailAddress || 'pawlife@example.com'}</Text>
              </View>

              <View className="flex-row items-center mt-1">
                <Image
                  source={require('../assets/icon/location-gray-icon.png')}
                  style={{ width: 6, height: 7.5 }}
                  resizeMode="cover"
                />
                <Text className="ml-2 text-[12px] text-[#8E8E93] flex-1 leading-4">{shelterInfo?.address}</Text>
              </View>

              <View className="flex-row items-center mt-4">

                {/* --- 1. HIỆU ỨNG AVATAR STACK --- */}
                <View className="flex-row items-center">
                  <View>
                    {/* Avatar 1: Nằm dưới cùng, không có margin âm */}
                    <Image
                      source={{ uri: 'https://i.pravatar.cc/100?img=1' }}
                      className="w-4 h-4 rounded-full border-[1px] border-white z-10"
                    />
                  </View>

                  <View style={{ elevation: 2, marginLeft: -8 }}>
                    {/* Avatar 2: Bị kéo lùi sang trái (-ml-2.5) để đè lên Avatar 1 */}
                    <Image
                      source={{ uri: 'https://i.pravatar.cc/100?img=2' }}
                      className="w-4 h-4 rounded-full border-[1px] border-white z-20"
                    />
                  </View>

                  <View style={{ elevation: 2, marginLeft: -8 }}>
                    {/* Avatar 3: Tiếp tục kéo lùi sang trái đè lên Avatar 2 */}
                    <Image
                      source={{ uri: 'https://i.pravatar.cc/100?img=3' }}
                      className="w-4 h-4 rounded-full border-[1px] border-white z-30"
                    />
                  </View>
                </View>

                {/* --- 2. DÒNG TEXT TRỘN NHIỀU STYLE --- */}
                {/* Thẻ Text cha bọc ngoài cùng sẽ định dạng màu xám mặc định */}
                <Text className="ml-1 text-[12px] text-[#8E8E93] flex-1">
                  Followed by{' '}
                  {/* Các thẻ Text con lồng bên trong để bôi đen chữ */}
                  <Text className="font-medium text-black">john doe</Text>,{' '}
                  <Text className="font-medium text-black">james doe</Text>,{' '}
                  <Text className="font-medium text-black">jane doe</Text> and{' '}
                  <Text className="font-medium text-black">79 others</Text>
                </Text>

              </View>
            </View>
            <View className="flex-row gap-3 mb-6">
              <TouchableOpacity
                onPress={handleToggleFollow}
                className={`flex-1 py-2 rounded-full items-center justify-center shadow-sm ${isFollowing ? 'bg-gray-200 shadow-gray-100' : 'bg-orange-400 shadow-orange-200'
                  }`}
              >
                <Text className={`font-semibold text-[14px] ${isFollowing ? 'text-gray-700' : 'text-white'}`}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab(prev => prev === 'pets' ? 'info' : 'pets')}
                className={`flex-1 py-2 rounded-full items-center justify-center ${activeTab === 'info' ? 'bg-orange-100' : 'bg-[#F6F6F6]'
                  }`}
              >
                <Text className={`font-semibold text-[14px] ${activeTab === 'info' ? 'text-orange-500' : 'text-gray-600'
                  }`}>
                  {activeTab === 'pets' ? 'Contact' : 'View Pets'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 200 }}>
            {activeTab === 'info' ? (
              <View className="px-[22px]">
                {/* About Shelter */}
                <Text className="text-[16px] font-medium text-black mb-2">About Shelter</Text>
                <Text className="text-[14px] text-[#8E8E93] leading-5 mb-5">
                  {shelterInfo?.description || "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec a efficitur lorem, a vulputate odio. Vestibulum gravida commodo turpis sed finibus. Quisque vel porttitor quam"}
                </Text>

                {/* Contact Info */}
                <Text className="text-[16px] font-medium text-black mb-2">Contact Info</Text>
                <View className="gap-y-3 mb-5">
                  <View className="flex-row items-center gap-x-3">
                    <Image
                      source={require('../assets/icon/message.png')}
                      style={{ width: 13, height: 13 }}
                      resizeMode="cover"
                    />
                    <Text className="text-[14px] text-[#8E8E93]">Send message</Text>
                  </View>
                  <TouchableOpacity onPress={handleCall} className="flex-row items-center gap-x-3">
                   <Image
                      source={require('../assets/icon/phone-info.png')}
                      style={{ width: 13, height: 13 }}
                      resizeMode="cover"
                    />
                    <Text className="text-[14px] text-[#8E8E93]">{shelterInfo?.contactInfo || "(+84) 0912345678"}</Text>
                  </TouchableOpacity>
                  <View className="flex-row items-center gap-x-3">
                    <Image
                      source={require('../assets/icon/email.png')}
                      style={{ width: 13, height: 10 }}
                      resizeMode="cover"
                    />
                    <Text className="text-[14px] text-[#8E8E93]">{shelterInfo?.emailAddress || "sannhanhieucho@email.com"}</Text>
                  </View>
                </View>

                {/* More Info */}
                <Text className="text-[16px] font-medium text-black mb-2">More Info</Text>
                <View className="gap-y-3">
                  <View className="flex-row items-center gap-x-3">
                    <Image
                      source={require('../assets/icon/earth.png')}
                      style={{ width: 13, height: 13 }}
                      resizeMode="cover"
                    />
                    <Text className="text-[14px] text-[#8E8E93]">Based in {shelterInfo?.address || "Vietnam"}</Text>
                  </View>
                  <View className="flex-row items-center gap-x-3">
                    <Image
                      source={require('../assets/icon/info.png')}
                      style={{ width: 13, height: 13 }}
                      resizeMode="cover"
                    />
                    <Text className="text-[14px] text-[#8E8E93]">Joined Jan 1, 2023</Text>
                  </View>
                  <View className="flex-row items-center gap-x-3">
                    <Image
                      source={require('../assets/icon/real-tick.png')}
                      style={{ width: 13, height: 13 }}
                      resizeMode="cover"
                    />
                    <Text className="text-[14px] text-[#8E8E93]">Verified Jan 1, 2023</Text>
                  </View>
                </View>
              </View>

            ) : (

              <View className="flex-row flex-wrap gap-3 justify-between mx-[22px]">
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
                        className="mb-[12px]"
                        activeOpacity={0.8}
                        onPress={() => router.push(`/shelter-pet-detail?id=${pet.id}`)}
                      >
                        {/* 1. KHỐI ẢNH: Ép tỉ lệ 1:1, bo góc cực sâu 28px */}
                        <View className="aspect-square mb-[10px] relative">
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
                        <View className="p-0">
                          {/* Tên Pet: Đen tuyền, chữ to, bold, margin bottom rất nhỏ */}
                          <Text
                            className="text-black font-semibold text-[16px] mb-[7.6px]"
                            numberOfLines={1}
                          >
                            {pet.name}
                          </Text>

                          {/* Thông tin: Giới tính + Tuổi + Giống */}
                          <View className="flex-row items-start">
                            {/* Icon Giới tính với mã màu chuẩn chiết xuất từ ảnh */}
                            <Ionicons
                              name={isFemale ? "female" : "male"}
                              size={12}
                              color={isFemale ? "#F471B5" : "#5BB0FF"}
                            />

                            <Text
                              className="text-[12px] text-[#8E8E93] text-center mt-0.5 ml-1.5"
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
            )}
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