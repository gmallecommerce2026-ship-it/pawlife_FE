import { Text } from '@/components/AppText';
import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Mảng dữ liệu cấu hình cho 3 màn hình Intro
const introData = [
  {
    id: 1,
    title: 'Thousands of pets, one place',
    description: 'Browse adoptable pets from verified shelters across Vietnam.',
    image: require('../assets/images/intro_1.png'),
    // Thêm kích thước riêng cho ảnh 1
    imageClassName: "w-[155vw] h-[105vh]", 
    decorations: {
      largeDot1: "bottom-[-35px] right-[-35px]",
      largeDot2: "bottom-[98%] left-[-35px]",
      smallDot1: "bottom-[96%] left-[10%]",
      smallDot2: "bottom-[5%] left-[68px]",
      smallDot3: "bottom-[13%] right-[3%]"
    }
  },
  {
    id: 2,
    title: 'Track your adoption journey',
    description: 'Follow every step, from application to approval.',
    image: require('../assets/images/intro_2.png'),
    // Thêm kích thước riêng cho ảnh 2 (Có thể tùy chỉnh lại thông số này)
    imageClassName: "w-[120vw] h-[90vh]", 
    decorations: {
      largeDot1: "bottom-[-20px] left-[-20px] bg-[#E4FFFF]",
      largeDot2: "top-[-20px] right-[-40px] bg-[#FFF5CA]",
      smallDot1: "top-[15%] right-[3%] bg-[#FFF5CA]",
      smallDot2: "bottom-[18%] left-[20px] bg-[#E4FFFF]",
      smallDot3: "top-[-25%] left-[40%] bg-[#E4FFFF]/0"
    }
  },
  {
    id: 3,
    title: 'Give your pet a digital identity',
    description: 'QR tag for identification, pawhistory & lost protection.',
    image: require('../assets/images/intro_3.png'),
    // Thêm kích thước riêng cho ảnh 3 (Có thể tùy chỉnh lại thông số này)
    imageClassName: "w-[70vw] h-[48vh]", 
    decorations: {
      largeDot1: "bottom-[-35px] right-[-35px] bg-[#E7C8FF]",
      largeDot2: "bottom-[98%] left-[-35px] bg-[#CCFFC1]",
      smallDot1: "bottom-[96%] left-[10%] bg-[#CCFFC1]",
      smallDot2: "bottom-[-20px] left-[108px] bg-[#CCFFC1]",
      smallDot3: "bottom-[13%] right-[3%] bg-[#E7C8FF]"
    }
  }
];

export default function IntroScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Xử lý khi bấm Skip hoặc hoàn thành Intro
  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem('hasSeenIntro', 'true');
    } catch (e) {
    }
    router.push('/(tabs)'); 
  };

  // Xử lý khi bấm nút Next
  const handleNext = () => {
    if (currentIndex < introData.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleComplete();
    }
  };

  // Lấy dữ liệu của slide hiện tại
  const currentSlide = introData[currentIndex];

  return (
    <SafeAreaView className="flex-1 bg-[#FDFDFD]" edges={['top', 'bottom']}>
      
      {/* 1. Nút Skip */}
      <View className="w-full flex-row justify-end px-6 pt-[38px] z-50 absolute top-12">
        <TouchableOpacity onPress={handleComplete}>
          <Text className="text-[#8E8E93] font-medium text-[14px]">Skip</Text>
        </TouchableOpacity>
      </View>

      {/* 2. Image Section */}
      <View className={`flex-1 justify-center items-center relative z-0 ${Platform.OS === 'android' ? 'mt-8' : 'mt-[60px]'}`}>
        
        {/* Vầng sáng cố định */}
        <View className="absolute w-[360px] h-[360px] bg-[#FFE04D]/10 rounded-full" />
        <View className="absolute w-[220px] h-[220px] bg-[#FFE04D]/15 rounded-full" />

        {/* Các chấm tròn thay đổi vị trí linh hoạt theo currentSlide */}
        <View className={`absolute w-[69px] h-[69px] rounded-full bg-[#D8FFC8] ${currentSlide.decorations.largeDot1}`} />
        <View className={`absolute w-[69px] h-[69px] rounded-full bg-[#FFD4B9] ${currentSlide.decorations.largeDot2}`} />
        <View className={`absolute w-[8px] h-[8px] rounded-full bg-[#FFD4B9] ${currentSlide.decorations.smallDot1}`} />
        <View className={`absolute w-[10px] h-[10px] rounded-full bg-[#FFD4B9] ${currentSlide.decorations.smallDot2}`} />
        <View className={`absolute w-[14px] h-[14px] rounded-full bg-[#D8FFC8] ${currentSlide.decorations.smallDot3}`} />

        {/* Hình ảnh chính áp dụng class kích thước linh hoạt */}
        <Image 
          source={currentSlide.image} 
          className={`${currentSlide.imageClassName} z-10`}
          resizeMode="contain"
        />
      </View>

      {/* 3. Bottom Section */}
      <View className="relative mt-auto z-20">
        {/* Bỏ h-[36vh] và tùy chỉnh lại padding (pt, pb) để section gọn gàng và thấp xuống */}
        <View className="rounded-t-[40px] px-8 pt-[35px] pb-[35px]">
            <View className="mb-[30px] items-center">
                <Text className="text-[24px] font-semibold text-[#1A1A1A] mb-[12px] leading-[34px] text-center">
                  {currentSlide.title}
                </Text>
                <Text className="text-[#777777] leading-[22px] text-[14px] font-medium text-center px-4">
                  {currentSlide.description}
                </Text>
            </View>

            {/* Hàng chứa Timeline Indicator và Button Next nằm ngang nhau */}
            <View className="flex-row items-center justify-between w-full">
                
                {/* View rỗng tạo đối trọng để căn giữa Timeline Indicator hoàn hảo */}
                <View className="w-[56px]" />

                {/* Timeline Indicator */}
                <View className="flex-row items-center justify-center">
                    {introData.map((_, index) => (
                      <View 
                        key={index}
                        className={`h-1.5 w-[16px] rounded-full ${index === currentIndex ? 'bg-[#FFE04F]' : 'bg-[#EAEAEA]'} ${index < introData.length - 1 ? 'mr-2' : ''}`} 
                      />
                    ))}
                </View>

                {/* Nút Next */}
                {/* Đã giảm size xuống w-[56px] h-[56px] để nút nhỏ hơn nhưng vẫn là hình tròn hoàn hảo */}
                <TouchableOpacity 
                    className="w-[56px] h-[56px] rounded-full justify-center items-center"
                    style={styles.floatingButtonShadow}
                    onPress={handleNext} 
                    activeOpacity={0.85}
                >
                    <LinearGradient 
                        colors={['#FFE154', '#FFE04A', '#FFD920']}
                        locations={[0, 0.53, 1]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 100 }}
                    />
                    <FontAwesome 
                      name={currentIndex === introData.length - 1 ? "check" : "arrow-right"} 
                      size={20} 
                      color="#ffffff" 
                    />
                </TouchableOpacity>
            </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  floatingButtonShadow: {
    shadowColor: '#FFDF43',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  }
});