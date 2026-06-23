// app/(tabs)/my-pets.tsx
import { Text } from '@/components/AppText';
import { AuthContext } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLocalizedField } from '@/utils/localization';
import { normalizePets } from '@/utils/petNormalize';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useContext, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
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
  const { t, language } = useLanguage();
  const isVi = language === 'vi';

  const [pets, setPets] = useState<Pet[]>([]);
  // Đổi thành isInitialLoading để chỉ load lúc đầu
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMyPets = async (isSilentRefresh = false) => {
    if (!user) {
      setPets([]);
      setIsInitialLoading(false);
      return;
    }

    // Chỉ bật skeleton/loader nếu chưa có dữ liệu nào (lần đầu tiên)
    if (!isSilentRefresh && pets.length === 0) {
      setIsInitialLoading(true);
    }

    setError(null);
    try {
      const data = await petService.getMyPets();
      setPets(normalizePets(data, language));
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setPets([]);
      } else {
        setError(t('Failed to load pets. Please try again.'));
      }
    } finally {
      setIsInitialLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      if (isActive) {
        // Luôn fetch dạng silent refresh khi user focus lại vào tab
        fetchMyPets(true);
      }
      return () => {
        isActive = false;
      };
    }, [user?.id])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchMyPets(true);
  };

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
                {t('Lost')}
              </Text>
            </View>
          )}
        </View>

        <View>
          <View className="flex-row items-center mb-1">
            <Image
              source={getLocalizedField(pet.species, 'en').toLowerCase() === 'cat'
                ? require('../../assets/icon/cat-side.png')
                : require('../../assets/icon/dog-side.png')}

              style={{ width: 14, height: 11 }}
              resizeMode="contain"
            />
            <Text className="text-gray-500 text-sm ml-1.5">
              {pet.breed || t('Unknown breed')}
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
              {calculateAge(pet.dob, t, isVi)}
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
          <Text className="text-[28px] font-normal text-black tracking-[0.06px]">{t('My Pet')}</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#E89B5A"
            colors={['#E89B5A']}
          />
        }
        contentContainerStyle={{
          paddingBottom: 100,
          paddingHorizontal: 24,
          flexGrow: 1,
          justifyContent: (pets.length === 0 && !isInitialLoading && !error) ? 'center' : 'flex-start'
        }}
      >
        {isInitialLoading && pets.length === 0 ? (
          <View className="flex-1 justify-center items-center mt-10">
            <View className="w-[84px] h-[84px] bg-white rounded-full items-center justify-center shadow-lg shadow-orange-100 mb-6 border border-orange-50">
              <ActivityIndicator size="large" color="#E89B5A" />
            </View>
            <Text className="text-gray-500 font-medium text-lg">{t("Loading your pets...")}</Text>
          </View>
        ) : error ? (
          <View className="flex-1 justify-center items-center mt-10">
            <Text className="text-red-500">{error}</Text>
            <TouchableOpacity
              onPress={() => fetchMyPets()}
              className="mt-4 px-6 py-2 bg-white border border-gray-200 rounded-full"
            >
              <Text className="text-gray-600">{t("Try again")}</Text>
            </TouchableOpacity>
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

        {/* NÚT THÊM THÚ CƯNG - Chỉ hiện khi đã load xong */}
        {!isInitialLoading && (
          <TouchableOpacity
            className="w-full bg-white py-5 rounded-[24px] border border-dashed border-[#E5E5E5] flex-row justify-center items-center active:bg-orange-50 mt-2 mb-6"
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
        )}

      </ScrollView>
    </SafeAreaView>
  );
}