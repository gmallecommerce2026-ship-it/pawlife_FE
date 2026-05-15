import { useLanguage } from '@/contexts/LanguageContext';
import { AntDesign, Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/AppText';

type LanguageOptionProps = {
  label: string;
  subLabel?: string;
  isSelected: boolean;
  onPress: () => void;
  isLast?: boolean;
};

const LanguageOption = ({ label, subLabel, isSelected, onPress, isLast = false }: LanguageOptionProps) => (
  <TouchableOpacity
    activeOpacity={0.7}
    onPress={onPress}
    className={`flex-row items-center justify-between py-4 ${!isLast ? 'border-b border-gray-100' : ''}`}
  >
    <View className="flex-col">
      <Text className={`text-[16px] font-medium ${isSelected ? 'text-[#ffa053]' : 'text-gray-900'}`}>
        {label}
      </Text>

    </View>
    <View className="items-center justify-center">
      <View className={`w-4 h-4 rounded-[4px] border-[1px] items-center justify-center ${isSelected ? 'bg-[#F2A465] border-[#F2A465]' : 'bg-white border-[#E5E5E5]'}`}>
        {isSelected && <Ionicons name="checkmark" size={12} color="white" />}
      </View>
    </View>

  </TouchableOpacity>
);

export default function LanguageScreen() {
  const router = useRouter();
  // Lấy thêm hàm t (translate) để dịch trực tiếp trên UI
  const { language, setLanguage, t } = useLanguage();

  return (
    <View className="flex-1 bg-[#FFFFFF]">
      <SafeAreaView edges={['top', 'bottom']}>

        {/* --- HEADER --- */}
        <View className="flex-row items-center px-4 py-2 mb-2 relative bg-white pb-4">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 z-10">
            <Feather name="chevron-left" size={20} color="#000000" />
          </TouchableOpacity>
          <View className="absolute left-0 right-0 items-center justify-center pointer-events-none">
            {/* Thay text cứng bằng hàm t */}
            <Text className="text-[24px] font-semibold text-black">{t('Language')}</Text>
          </View>
        </View>

        {/* --- LANGUAGE OPTIONS --- */}
        <View className="bg-white mx-[20px] rounded-[16px] px-6 mt-4 border  border-gray-100">
          <LanguageOption
            label={t('English')} // Dịch động text hiển thị
            subLabel="English"
            isSelected={language === 'en'}
            onPress={() => setLanguage('en')}
          />
          <LanguageOption
            label={t('Vietnamese')} // Dịch động text hiển thị
            subLabel="Tiếng Việt"
            isSelected={language === 'vi'}
            onPress={() => setLanguage('vi')}
            isLast={true}
          />
        </View>

      </SafeAreaView>
    </View>
  );
}