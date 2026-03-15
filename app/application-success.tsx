// app/application-success.tsx
import { Text } from '@/components/AppText';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
export default function ApplicationSuccessScreen() {
  const router = useRouter();
  
  // Animation cho vòng tròn tỏa sáng (Pulse Effect)
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
        withTiming(1.1, { duration: 1500 }), 
        -1, 
        true
    );
  }, []);

  const animatedGlowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    // Dismiss các modal đang mở
    router.dismissAll(); 
    
    // Quay về trang Matching kèm theo params 'returnFromSuccess'
    router.replace({
        pathname: '/(tabs)/matching',
        params: { returnFromSuccess: '1' } 
    }); 
  };

  return (
    <TouchableOpacity 
        activeOpacity={1} 
        onPress={handlePress}
        className="flex-1 bg-[#FFFCF8] items-center justify-center px-6" // Background màu kem ấm nhẹ
    >
        {/* --- ICON SECTION --- */}
        <View className="items-center justify-center mb-8 relative">
            
            {/* Vầng hào quang ngoài cùng (Rất nhạt) */}
            <Animated.View style={animatedGlowStyle} className="absolute w-40 h-40 bg-orange-100/50 rounded-full" />
            
            {/* Vầng hào quang giữa (Nhạt vừa) */}
            <View className="absolute w-32 h-32 bg-orange-200/40 rounded-full" />
            
            {/* Vòng tròn chính (Đậm) */}
            <Animated.View entering={FadeInUp.delay(200).springify()} className="w-24 h-24 bg-[#FF9C56] rounded-full items-center justify-center shadow-lg shadow-orange-300">
                <Feather name="check" size={48} color="white" strokeWidth={3} />
            </Animated.View>
        </View>

        {/* --- TEXT SECTION --- */}
        <Animated.View entering={FadeInDown.delay(400)} className="items-center">
            <Text className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">
                Application Sent!
            </Text>

            <Text className="text-gray-500 text-center text-lg leading-7 font-medium px-4">
                Sân Nhà Nhiều Chó will review your application and contact you soon.
            </Text>
        </Animated.View>

        {/* --- HINT (UX Detail) --- */}
        <Animated.View entering={FadeInDown.delay(1000)} className="absolute bottom-12">
            <Text className="text-gray-300 text-sm font-medium tracking-widest uppercase">
                Tap anywhere to close
            </Text>
        </Animated.View>

    </TouchableOpacity>
  );
}