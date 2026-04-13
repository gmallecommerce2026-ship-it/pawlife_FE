// app/filter-modal.tsx
import { Text } from '@/components/AppText';
import { AntDesign, FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- REUSABLE COMPONENTS ---

// 1. Filter Section Label
const SectionLabel = ({ title, optional = false }: { title: string, optional?: boolean }) => (
  <View className="flex-row items-end mb-3 mt-6">
    <Text className="text-gray-900 font-bold text-base">{title}</Text>
    {optional && <Text className="text-gray-400 text-sm ml-1 font-medium">(Optional)</Text>}
  </View>
);

// 2. Selectable Chip (Pixel Perfect Logic)
const FilterChip = ({ label, icon, selected, onPress, fullWidth = false }: any) => {
    // Style logic: Active vs Inactive
    const containerStyle = selected 
        ? "bg-orange-50 border-orange-200" 
        : "bg-gray-50 border-gray-100"; 
    
    const textStyle = selected 
        ? "text-[#F97316] font-bold" 
        : "text-gray-500 font-medium";

    return (
        <TouchableOpacity 
            onPress={onPress}
            activeOpacity={0.7}
            className={`py-3.5 px-4 rounded-2xl border flex-row items-center justify-center ${containerStyle} ${fullWidth ? 'flex-1' : ''}`}
            style={{ minWidth: fullWidth ? 0 : 80 }} 
        >
            {icon && (
                <View className="mr-2">
                    {/* Clone icon color theo state selected */}
                    {React.cloneElement(icon, { color: selected ? "#ffa053" : "#6B7280" })}
                </View>
            )}
            <Text className={`text-sm ${textStyle}`}>{label}</Text>
        </TouchableOpacity>
    );
};
const getAgeRange = (selectedAge: string | null) => {
    switch (selectedAge) {
      case 'Baby':
        return { minAge: 0, maxAge: 1 };
      case 'Young':
        return { minAge: 1, maxAge: 2 };
      case 'Adult':
        return { minAge: 3, maxAge: 5 };
      case 'Senior':
        return { minAge: 5, maxAge: 99 }; // 99 hoặc một số lớn tùy backend quy định cho 5+
      default:
        return { minAge: undefined, maxAge: undefined }; // Không filter theo tuổi
    }
  };
export default function FilterModalScreen() {
  const router = useRouter();

  // --- STATE MANAGEMENT ---
  const [location, setLocation] = useState('New York, NY, US');
  const [petType, setPetType] = useState('Dogs'); 
  const [gender, setGender] = useState('Male');
  const [size, setSize] = useState<string | null>(null);
  const [age, setAge] = useState<string | null>(null);

  const handleApply = () => {
    // 1. Lấy khoảng tuổi dựa trên label đã chọn
    const { minAge, maxAge } = getAgeRange(age);

    // 2. Gom tất cả filter data thành một object
    const filterData = {
      location,
      petType: petType === 'Both' ? undefined : petType, // Nếu 'Both' thì không gửi petType để fetch tất cả
      gender,
      size,
      ageLabel: age, // Có thể giữ lại để hiển thị UI ở màn hình ngoài
      minAge,
      maxAge,
    };

    console.log("Payload gửi đi/Lưu vào store:", filterData);

    // 3. Xử lý truyền dữ liệu về màn hình Search
    // CÁCH 1: Dùng Expo Router truyền qua query params (Thay '/search' bằng route màn search của bạn)
    /*
    router.navigate({
      pathname: '/search', 
      params: filterData
    });
    */

    // CÁCH 2: Nếu bạn đang dùng Zustand/Redux hoặc React Context, hãy dispatch action lưu filterData vào Global State ở đây.
    // updateFilterState(filterData);
    
    // Sau khi xử lý xong thì đóng modal
    router.back();
  };

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView className="flex-1" edges={['top']}>
        
        {/* --- HEADER --- */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-50">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <AntDesign name="left" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900">Pet Search</Text>
          <View className="w-10" />
          {/* Dummy view for balance */}
        </View>

        <ScrollView 
            className="flex-1 px-6" 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}
        >
            {/* 1. LOCATION */}
            <SectionLabel title="Location" />
            <View className="flex-row items-center bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5">
                <Ionicons name="location-outline" size={20} color="#ffa053" />
                <TextInput 
                    value={location}
                    onChangeText={setLocation}
                    className="flex-1 ml-3 text-gray-900 font-semibold text-base"
                    placeholder="Enter location"
                />
            </View>

            {/* 2. PET INTERESTED (3 Cols) */}
            <SectionLabel title="Pet Interested" />
            <View className="flex-row gap-3">
                <FilterChip 
                    label="Both" 
                    fullWidth 
                    selected={petType === 'Both'} 
                    onPress={() => setPetType('Both')}
                    icon={<MaterialCommunityIcons name="paw" size={16} />}
                />
                <FilterChip 
                    label="Dogs" 
                    fullWidth 
                    selected={petType === 'Dogs'} 
                    onPress={() => setPetType('Dogs')}
                    icon={<FontAwesome5 name="dog" size={14} />}
                />
                <FilterChip 
                    label="Cats" 
                    fullWidth 
                    selected={petType === 'Cats'} 
                    onPress={() => setPetType('Cats')}
                    icon={<FontAwesome5 name="cat" size={14} />}
                />
            </View>

            {/* 3. GENDER (2 Cols) */}
            <SectionLabel title="Gender" optional />
            <View className="flex-row gap-3">
                <FilterChip 
                    label="Male" 
                    fullWidth 
                    selected={gender === 'Male'} 
                    onPress={() => setGender('Male')}
                />
                <FilterChip 
                    label="Female" 
                    fullWidth 
                    selected={gender === 'Female'} 
                    onPress={() => setGender('Female')}
                />
            </View>

            {/* 5. AGE */}
            <SectionLabel title="Age" optional />
            <View className="flex-row justify-between gap-2">
                {['Baby', 'Young', 'Adult', 'Senior'].map((a) => (
                    <FilterChip 
                        key={a}
                        label={a} 
                        fullWidth 
                        selected={age === a} 
                        onPress={() => setAge(a)}
                    />
                ))}
            </View>

        </ScrollView>

        {/* --- BOTTOM BUTTON --- */}
        <View className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-50 shadow-lg shadow-black/5">
            <TouchableOpacity 
                onPress={handleApply}
                className="w-full bg-[#FF9C56] py-4 rounded-full shadow-lg shadow-orange-200 items-center"
                activeOpacity={0.8}
            >
                <Text className="text-white font-bold text-lg">Search</Text>
            </TouchableOpacity>
        </View>

      </SafeAreaView>
    </View>
  );
}