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
        : "bg-gray-50 border-gray-100"; // Màu xám nhạt đúng chuẩn design system hiện tại
    
    const textStyle = selected 
        ? "text-[#F97316] font-bold" 
        : "text-gray-500 font-medium";

    return (
        <TouchableOpacity 
            onPress={onPress}
            activeOpacity={0.7}
            className={`py-3.5 px-4 rounded-2xl border flex-row items-center justify-center ${containerStyle} ${fullWidth ? 'flex-1' : ''}`}
            style={{ minWidth: fullWidth ? 0 : 80 }} // Đảm bảo độ rộng tối thiểu nếu không fullWidth
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

export default function FilterModalScreen() {
  const router = useRouter();

  // --- STATE MANAGEMENT ---
  const [location, setLocation] = useState('New York, NY, US');
  const [petType, setPetType] = useState('Dogs'); // Default selection như flow thông thường
  const [gender, setGender] = useState('Male');
  const [size, setSize] = useState<string | null>(null);
  const [age, setAge] = useState<string | null>(null);

  const handleApply = () => {
    // Logic: Pass params back or filter context here
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
          <View className="w-10" /> {/* Dummy view for balance */}
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

            {/* 4. SIZE (3 Cols) */}
            <SectionLabel title="Size" optional />
            <View className="flex-row gap-3">
                {['Small', 'Medium', 'Large'].map((s) => (
                    <FilterChip 
                        key={s}
                        label={s} 
                        fullWidth 
                        selected={size === s} 
                        onPress={() => setSize(s)}
                    />
                ))}
            </View>

            {/* 5. AGE (4 Cols - Wrap or Row?) -> Design shows Row but tight. Let's use Flex Wrap nicely or Scroll */}
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