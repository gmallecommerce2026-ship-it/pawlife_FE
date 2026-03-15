// app/(tabs)/my-pets.tsx
import { Text } from '@/components/AppText';
import { AuthContext } from '@/contexts/AuthContext';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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

// Import thêm thư viện sinh trắc học và bộ nhớ
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

// Cập nhật Interface: Bỏ 'age', thêm 'dob'
interface Pet {
  id: string;
  name: string;
  species: string; // Dog, Cat...
  breed?: string | null;
  dob?: string | null; // Sử dụng Ngày sinh (Date of Birth) thay vì Age
  avatarUrl?: string | null; 
  status: string;
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
  
  // State quản lý việc khoá Tab bằng Face ID
  const [isTabLocked, setIsTabLocked] = useState(true);

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

  // Hàm gọi Face ID thủ công (dùng cho nút Retry)
  const promptFaceId = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Xác thực để xem danh sách thú cưng',
      disableDeviceFallback: false,
    });

    if (result.success) {
      setIsTabLocked(false);
      fetchMyPets();
    }
  };

  // --- LẮNG NGHE SỰ KIỆN FOCUS VÀO TAB ---
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const checkAuthAndLoad = async () => {
        try {
          // Kiểm tra xem user có bật bảo mật Face ID ở Settings không
          const useFaceIdSetting = await AsyncStorage.getItem('useFaceId');

          if (useFaceIdSetting === 'true') {
            setIsTabLocked(true); // Đảm bảo luôn khoá màn hình trước
            const result = await LocalAuthentication.authenticateAsync({
              promptMessage: 'Xác thực để xem danh sách thú cưng',
              disableDeviceFallback: false,
            });

            if (result.success && isActive) {
              setIsTabLocked(false);
              fetchMyPets(); // Chỉ fetch data khi đã xác thực thành công
            }
          } else {
            // Nếu không bật tính năng khoá, hiển thị bình thường
            if (isActive) {
              setIsTabLocked(false);
              fetchMyPets();
            }
          }
        } catch (error) {
          console.error("Lỗi kiểm tra Face ID:", error);
        }
      };

      checkAuthAndLoad();

      return () => {
        isActive = false; // Cleanup function khi rời khỏi tab
      };
    }, [])
  );

  // --- SUB-COMPONENT: PET CARD ---
  const PetCard = ({ pet }: { pet: Pet }) => (
    <TouchableOpacity 
      activeOpacity={0.9}
      className="bg-white rounded-[24px] p-4 mb-5 flex-row items-center shadow-sm"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3, 
      }}
      onPress={() => router.push({
          pathname: '/pet-profile-detail', 
          params: { id: pet.id } 
      })}
    >
      <Image 
        source={{ uri: pet.avatarUrl || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=500&auto=format&fit=crop' }} 
        className="w-24 h-24 rounded-[20px] bg-gray-100"
        resizeMode="cover"
      />

      <View className="flex-1 ml-4 justify-between h-20">
        <View className="flex-row justify-between items-start">
          <Text 
            numberOfLines={1} 
            className="text-gray-800 text-xl font-bold flex-1 mr-2"
          >
            {pet.name}
          </Text>
          
          {pet.status === 'LOST' && (
            <View className="bg-red-50 px-3 py-1 rounded-full border border-red-100">
              <Text className="text-red-500 text-[10px] uppercase font-bold tracking-wider">
                Lost
              </Text>
            </View>
          )}
        </View>

        <View>
            <View className="flex-row items-center mb-1">
            <MaterialCommunityIcons 
                name={pet.species?.toLowerCase() === 'cat' ? "cat" : "dog-side"} 
                size={14} 
                color="#9CA3AF" 
            />
            <Text className="text-gray-500 ml-1.5 text-xs font-medium">
              {pet.breed || 'Unknown breed'}
            </Text>
            </View>

            <View className="flex-row items-center">
            <MaterialCommunityIcons name="cake-variant-outline" size={14} color="#9CA3AF" />
            <Text className="text-gray-500 ml-1.5 text-xs font-medium">
              {calculateAge(pet.dob)}
            </Text>
            </View>
        </View>
      </View>

      <View className="justify-center pl-2">
         <Feather name="chevron-right" size={20} color="#E5E7EB" />
      </View>

    </TouchableOpacity>
  );

  // --- RENDER KHI TAB BỊ KHOÁ (Chưa xác thực Face ID) ---
  if (isTabLocked) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8F9FB] justify-center items-center">
        <MaterialCommunityIcons name="lock-outline" size={72} color="#ffa053" style={{ marginBottom: 20 }} />
        <Text className="text-xl font-bold text-gray-900 mb-2">Đã khoá bảo mật</Text>
        <Text className="text-gray-500 mb-8 text-center px-10 text-base">
          Danh sách thú cưng đã bị khoá. Vui lòng xác thực bằng Face ID / Vân tay để xem thông tin.
        </Text>
        <TouchableOpacity 
          onPress={promptFaceId}
          className="bg-[#ffa053] px-8 py-3.5 rounded-full flex-row items-center shadow-sm"
        >
          <MaterialCommunityIcons name="face-recognition" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text className="text-white font-bold text-base">Mở Khoá Bằng Face ID</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // --- RENDER BÌNH THƯỜNG ---
  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FB]">
      <ScrollView 
        className="flex-1 px-5" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 12 }}
      >
        {/* --- HEADER --- */}
        <View className="flex-row justify-between items-center mb-8">
          <View>
            <Text className="text-3xl font-bold text-gray-900 tracking-tight">My Pets</Text>
            <Text className="text-gray-400 text-sm font-medium mt-1">Manage your furry friends</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/profile-settings')} className="p-2 bg-white rounded-full shadow-sm">
            <Feather name="grid" size={20} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* --- STATE HANDLING --- */}
        {isLoading ? (
          <View className="py-10 justify-center items-center">
            <ActivityIndicator size="large" color="#ffa053" />
            <Text className="text-gray-500 mt-4">Loading your pets...</Text>
          </View>
        ) : error ? (
          <View className="py-10 justify-center items-center">
            <Text className="text-red-500 text-center mb-4">{error}</Text>
            <TouchableOpacity onPress={fetchMyPets} className="bg-orange-100 px-6 py-2 rounded-full">
              <Text className="text-orange-600 font-bold">Try again</Text>
            </TouchableOpacity>
          </View>
        ) : pets.length === 0 ? (
          <View className="py-10 justify-center items-center">
            <MaterialCommunityIcons name="paw-off" size={64} color="#E5E7EB" />
            <Text className="text-gray-800 text-lg font-bold mt-4">You don't have any pets yet</Text>
            <Text className="text-gray-400 text-center mt-2 mb-6">Add your pet or adopt a new friend!</Text>
          </View>
        ) : (
          <View className="mb-2">
            {pets.map((pet) => (
              <PetCard key={pet.id} pet={pet} />
            ))}
          </View>
        )}

        {/* --- ADD PET BUTTON --- */}
        <TouchableOpacity 
          className="w-full bg-white py-5 rounded-[24px] border border-dashed border-orange-300 flex-row justify-center items-center active:bg-orange-50 mt-2"
          activeOpacity={0.7}
          onPress={() => router.push('/add-pet')} 
        >
          <View className="bg-orange-100 p-1 rounded-full mr-2">
            <Ionicons name="add" size={20} color="#ffa053" />
          </View>
          <Text className="text-orange-500 font-bold text-base">Add New Pet</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}