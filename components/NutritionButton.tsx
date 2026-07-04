import React, { useState } from 'react';
import { View, Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';

export default function NutritionButton() {
  const router = useRouter();
  const [isPressed, setIsPressed] = useState(false);

  return (
    <View className="items-center justify-center">
      <Pressable
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        onLongPress={() => {
          setIsPressed(false);
          router.push('/ingredient-check');
        }}
        delayLongPress={800} // Cần giữ 0.8 giây để mở
        className="items-center justify-center relative p-2"
      >
        {/* Vòng tròn border biểu thị hành động đang nhấn giữ */}
        {isPressed && (
          <View className="absolute inset-0 border-2 border-[#E89B5A] rounded-full animate-ping opacity-50" />
        )}
        
        {/* Button UI chính */}
        <View className="bg-[#FFF8F0] w-14 h-14 rounded-full items-center justify-center border border-[#E89B5A]/30">
          <Text className="text-[12px] font-medium text-[#E89B5A]">Nutrition</Text>
        </View>
      </Pressable>
    </View>
  );
}