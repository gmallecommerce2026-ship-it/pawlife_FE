// app/(tabs)/my-pets.tsx
import { Text } from '@/components/AppText';
import { AuthContext } from '@/contexts/AuthContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useContext, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { petService } from '../../services/petService';

// Cập nhật Interface: Bỏ 'age', thêm 'dob'
interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string | null;
  dob?: string | null;
  avatarUrl?: string | null;
  status: string;
  isLost?: boolean; // THÊM DÒNG NÀY
}

// Hàm tính tuổi tự động từ Ngày sinh
const calculateAge = (dobString?: string | null): string => {
  if (!dobString) return 'Unknown age';

  const dob = new Date(dobString);
  const today = new Date();

  let years = today.getFullYear() - dob.getFullYear();
  let months = today.getMonth() - dob.getMonth();

  if (months < 0 || (months === 0 && today.getDate() < dob.getDate())) {
    years--;
    months += 12;
  }

  if (years > 0) {
    return `${years} year${years > 1 ? 's' : ''} old`;
  } else if (months > 0) {
    return `${months} month${months > 1 ? 's' : ''} old`;
  } else {
    return 'Less than 1 month';
  }
};

export default function MyPetsScreen() {
  const router = useRouter();
  const { user } = useContext(AuthContext);

  // --- STATE QUẢN LÝ DATA ---
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- HÀM FETCH DATA ---
  const fetchMyPets = async () => {
    if (!user) {
      setPets([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await petService.getMyPets();
      setPets(data);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setPets([]);
      } else {
        setError('Failed to load pets. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // --- LẮNG NGHE SỰ KIỆN FOCUS VÀO TAB ---
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      if (isActive) {
        fetchMyPets();
      }

      return () => {
        isActive = false; // Cleanup function khi rời khỏi tab
      };
    }, [])
  );

  // --- SUB-COMPONENT: PET CARD ---
  const PetCard = ({ pet }: { pet: Pet }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      className="bg-white rounded-[16px] border border-[#FFF9F0] p-[12px] mb-[21px] flex-row items-center shadow-sm"
      style={{
        shadowColor: '#000000',
        // shadowOffset: { width: 6, height: 6 }, // TĂNG độ lệch xuống dưới và sang phải
        shadowOpacity: 0.06,
        shadowRadius: 4, // GIẢM độ lan rộng của bóng
        elevation: 6,
      }}
      onPress={() => router.push({
        pathname: '/pet-profile-detail',
        params: { id: pet.id }
      })}
    >
      <Image
        source={{ uri: pet.avatarUrl || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=500&auto=format&fit=crop' }}
        className="w-[92px] h-[108px] rounded-[16px] bg-gray-100"
        resizeMode="cover"
      />

      <View className="flex-1 ml-6 mb-6 justify-between">

        <View className="flex-row justify-between items-start">
          <Text
            numberOfLines={1}
            className="font-semibold text-gray-900 text-lg flex-1 mr-2 mb-2"
          >
            {pet.name}
          </Text>

          {pet.isLost && (
            <View className="bg-red-50 px-3 py-1 rounded-full border border-red-100">
              <Text className="text-red-500 text-[10px] uppercase font-bold tracking-wider">
                Lost
              </Text>
            </View>
          )}
        </View>

        <View>
          <View className="flex-row items-center mb-1">
            <Image
              source={pet.species?.toLowerCase() === 'cat' ? require('../../assets/icon/cat-side.png') : require('../../assets/icon/dog-side.png')}
              style={{ width: 11, height: 9 }}
              resizeMode="contain"
            />
            <Text className="text-gray-500 text-sm ml-1.5">
              {pet.breed || 'Unknown breed'}
            </Text>
          </View>

          <View className="flex-row items-center">
            <Image
              source={require('../../assets/icon/brith-cake.png')}
              style={{ width: 11, height: 9 }}
              resizeMode="contain"
              className='bottom-[2px]'
            />
            <Text className="text-gray-500 text-sm ml-1.5">
              {calculateAge(pet.dob)}
            </Text>
          </View>
        </View>
      </View>

    </TouchableOpacity>
  );

  // --- RENDER BÌNH THƯỜNG ---
  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FB]" edges={['top']}>
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 248, 240, 0.69)']}
        locations={[0.3, 0.8]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 32 }}
      />
      {/* --- HEADER --- */}
      <View className="flex-row justify-between items-center px-6 pt-[28px] pb-[21px] z-10 bg-transparent">
        <View className="flex-row items-center">
          <Text className="text-[28px] font-normal text-black tracking-[0.06px]">My Pet</Text>
        </View>
        {/* <TouchableOpacity onPress={() => router.push('/profile-settings')} className="p-2 ">
          <Feather name="align-justify" size={25} color="#374151" />
        </TouchableOpacity> */}
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 100,
          paddingHorizontal: 24,
          flexGrow: 1,
          justifyContent: (pets.length === 0 && !isLoading && !error) ? 'center' : 'flex-start'
        }}
      >
        {/* --- STATE HANDLING LẠI LOGIC RENDER --- */}

        {/* 1. Đang tải dữ liệu */}
        {isLoading ? (
          <View className="flex-1 justify-center items-center mt-10">
            <ActivityIndicator size="large" color="#F59E0B" />
          </View>
        ) : error ? (
          /* 2. Bị lỗi khi fetch data */
          <View className="flex-1 justify-center items-center mt-10">
            <Text className="text-red-500">{error}</Text>
          </View>
        ) : pets.length > 0 ? (
          /* 3. NẾU CÓ PET: Gọi Sub-component PetCard ra để hiển thị */
          <View>
            {pets.map((pet) => (
              <PetCard key={pet.id} pet={pet} />
            ))}
          </View>
        ) : (
          /* 4. NẾU KHÔNG CÓ PET: Hiển thị màn hình trống */
          <View className="flex items-center justify-center">
            <Image
              source={require('../../assets/images/my-pet-empty.png')}
              resizeMode="contain"
              className="left-3"
              style={{
                width: 230,
                height: 232,
              }}
            />
            <Text className="text-gray-800 text-lg font-bold mt-6">You don't have any pets yet</Text>
            <Text className="text-gray-400 text-center mt-2 mb-6">Add your pet or adopt a new friend!</Text>
          </View>
        )}

        {/* --- NÚT ADD PET: Luôn nằm ở dưới cùng --- */}
        <TouchableOpacity
          className="w-full bg-white py-5 rounded-[24px] border border-dashed border-orange-300 flex-row justify-center items-center active:bg-orange-50 mt-2"
          activeOpacity={0.7}
          onPress={() => router.push('/add-pet')}
        >
          <View className=" rounded-full mr-2">
            <Ionicons name="add" size={20} color="#F59E0B" />
          </View>
          <Text className="text-[#F59E0B] font-thin text-base">Add New Pet</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}