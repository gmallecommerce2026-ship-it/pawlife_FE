// app/filter-modal.tsx
import { Text } from '@/components/AppText';
import { AntDesign, Feather, FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Modal, ScrollView, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
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


export default function FilterModal({ visible, onClose }: { visible: boolean, onClose: () => void }) {
    const [gender, setGender] = useState<string | null>(null);
    const [age, setAge] = useState<string | null>(null);

    const handleApply = () => {
        // Xử lý logic search ở đây, sau đó đóng modal
        console.log("Applied Filters:", { gender, age });
        onClose();
    };

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            {/* Lớp nền mờ - Bấm ra ngoài sẽ đóng modal */}
            <TouchableOpacity 
                activeOpacity={1} 
                onPress={onClose} 
                className="flex-1 bg-black/50 justify-center items-center px-5"
            >
                {/* Chặn sự kiện đóng modal khi bấm vào bên trong khối trắng */}
                <TouchableWithoutFeedback>
                    <View className="bg-white w-full rounded-[24px] overflow-hidden max-h-[80%] shadow-2xl">
                        
                        {/* --- HEADER CỦA MODAL (CÓ NÚT X) --- */}
                        <View className="flex-row items-center justify-between p-5 border-b border-gray-100">
                            <Text className="text-[18px] font-bold text-black">Filter Options</Text>
                            <TouchableOpacity onPress={onClose} className="p-2 -mr-2 bg-gray-50 rounded-full">
                                <Feather name="x" size={20} color="#111827" />
                            </TouchableOpacity>
                        </View>

                        {/* --- NỘI DUNG LỌC (CÓ THỂ CUỘN NẾU QUÁ DÀI) --- */}
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
                            
                            {/* 1. GENDER */}
                            <SectionLabel title="Gender" optional />
                            <View className="flex-row justify-between gap-3">
                                <FilterChip 
                                    label="Male" 
                                    selected={gender === 'Male'} 
                                    onPress={() => setGender('Male')}
                                />
                                <FilterChip 
                                    label="Female" 
                                    selected={gender === 'Female'} 
                                    onPress={() => setGender('Female')}
                                />
                            </View>

                            {/* 2. AGE */}
                            <SectionLabel title="Age" optional />
                            <View className="flex-row flex-wrap justify-between gap-y-3">
                                {['Baby', 'Young', 'Adult', 'Senior'].map((a) => (
                                    <View key={a} className="w-[48%]">
                                        <FilterChip 
                                            label={a} 
                                            selected={age === a} 
                                            onPress={() => setAge(a)}
                                        />
                                    </View>
                                ))}
                            </View>
                        </ScrollView>

                        {/* --- BOTTOM BUTTON --- */}
                        <View className="p-5 border-t border-gray-100">
                            <TouchableOpacity 
                                onPress={handleApply}
                                className="w-full bg-[#FF9C56] py-3.5 rounded-full items-center"
                                activeOpacity={0.8}
                            >
                                <Text className="text-white font-bold text-[16px]">Apply Filter</Text>
                            </TouchableOpacity>
                        </View>

                    </View>
                </TouchableWithoutFeedback>
            </TouchableOpacity>
        </Modal>
    );
}