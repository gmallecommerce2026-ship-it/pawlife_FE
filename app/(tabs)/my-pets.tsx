// app/(tabs)/my-pets.tsx
import { Text } from '@/components/AppText';
import { AuthContext } from '@/contexts/AuthContext';
// 1. IMPORT USELANGUAGE HOOK
import { useLanguage } from '@/contexts/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
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

interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string | null;
  dob?: string | null;
  avatarUrl?: string | null;
  status: string;
  isLost?: boolean; 
}

// 2. CẬP NHẬT HÀM calculateAge NHẬN THÊM THAM SỐ t (hàm dịch)
const calculateAge = (dobString: string | null | undefined, t: any, isVi: boolean): string => {
  if (!dobString) return t('Unknown age');

  const dob = new Date(dobString);
  const today = new Date();

  let years = today.getFullYear() - dob.getFullYear();
  let months = today.getMonth() - dob.getMonth();

  if (months < 0 || (months === 0 && today.getDate() < dob.getDate())) {
    years--;
    months += 12;
  }

  if (years > 0) {
    return `${years} ${t(years > 1 ? (isVi ? 'tuổi' : 'years old') : (isVi ? 'tuổi' : 'year old'))}`;
  } else if (months > 0) {
    return `${months} ${t(months > 1 ? (isVi ? 'tháng tuổi' : 'months old') : (isVi ? 'tháng tuổi' : 'month old'))}`;
  } else {
    return t('Less than 1 month');
  }
};

export default function MyPetsScreen() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  // 3. KHỞI TẠO HOOK
  const { t, language } = useLanguage();
  const isVi = language === 'vi';
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        // Dịch lỗi API
        setError(t('Failed to load pets. Please try again.'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      if (isActive) {
        fetchMyPets();
      }

      return () => {
        isActive = false; 
      };
    }, [])
  );

  const PetCard = ({ pet }: { pet: Pet }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      className="bg-white rounded-[16px] border border-[#FFF9F0] p-[12px] mb-[21px] flex-row items-center shadow-sm"
      style={{
        shadowColor: '#000000',
        shadowOpacity: 0.06,
        shadowRadius: 4, 
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
                {t('Lost')} {/* Dịch chữ Lost */}
              </Text>
            </View>
          )}
        </View>

        <View>
          <View className="flex-row items-center mb-1">
            <Image
              source={pet.species?.toLowerCase() === 'cat' ? require('../../assets/icon/cat-side.png') : require('../../assets/icon/dog-side.png')}
              style={{ width: 14, height: 11 }}
              resizeMode="contain"
            />
            <Text className="text-gray-500 text-sm ml-1.5">
              {pet.breed || t('Unknown breed')} {/* Dịch Unknown breed */}
            </Text>
          </View>

          <View className="flex-row items-center">
            <Image
              source={require('../../assets/icon/brith-cake.png')}
              style={{ width: 14, height: 11 }}
              resizeMode="contain"
              className='bottom-[1px]'
            />
            <Text className="text-gray-500 text-sm ml-1.5">
              {calculateAge(pet.dob, t, isVi)} {/* Truyền hàm t vào đây */}
            </Text>
          </View>
        </View>
      </View>

    </TouchableOpacity>
  );

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
          {/* Dịch Header */}
          <Text className="text-[28px] font-normal text-black tracking-[0.06px]">{t('My Pet')}</Text>
        </View>
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
        {isLoading ? (
          <View className="flex-1 justify-center items-center mt-10">
            <ActivityIndicator size="large" color="#F59E0B" />
          </View>
        ) : error ? (
          <View className="flex-1 justify-center items-center mt-10">
            <Text className="text-red-500">{error}</Text>
          </View>
        ) : pets.length > 0 ? (
          <View>
            {pets.map((pet) => (
              <PetCard key={pet.id} pet={pet} />
            ))}
          </View>
        ) : (
          /* MÀN HÌNH TRỐNG KHI KHÔNG CÓ PET */
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
            <Text className="text-gray-800 text-lg font-bold mt-6">{t("You don't have any pets yet")}</Text>
            <Text className="text-gray-400 text-center mt-2 mb-6">{t("Add your pet or adopt a new friend!")}</Text>
          </View>
        )}

        {/* NÚT THÊM THÚ CƯNG */}
        <TouchableOpacity
          className="w-full bg-white py-5 rounded-[24px] border border-dashed border-[#E5E5E5] flex-row justify-center items-center active:bg-orange-50 mt-2"
          activeOpacity={0.7}
          onPress={() => router.push({ 
            pathname: '/(tabs)/scan', 
            params: { isAddingPet: 'true' } 
          })}
        >
          <View className=" rounded-full mr-2">
            <Ionicons name="add" size={20} color="#8E8E93" />
          </View>
          <Text className="text-[#8E8E93] font-thin text-base">{t('Add New Pet')}</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}