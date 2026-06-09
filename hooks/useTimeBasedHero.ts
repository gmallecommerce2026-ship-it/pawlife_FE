// hooks/useTimeBasedHero.ts
import { useState, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';

// Bạn có thể định nghĩa mốc thời gian linh hoạt
const MORNING_START_HOUR = 6;
const EVENING_START_HOUR = 18;

const getHeroImage = () => {
  const currentHour = new Date().getHours();
  const isDaytime = currentHour >= MORNING_START_HOUR && currentHour < EVENING_START_HOUR;

  // Sử dụng require cho local assets
  return isDaytime 
    ? require('@/assets/images/home_hero_1.png')  // Sáng
    : require('@/assets/images/home_hero_2.png'); // Tối
};

export const useTimeBasedHero = () => {
  const [heroImage, setHeroImage] = useState(getHeroImage());

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // Khi app được mở lại từ trạng thái chạy ngầm, kiểm tra và cập nhật lại ảnh
      if (nextAppState === 'active') {
        const newImage = getHeroImage();
        setHeroImage((currentImage) => {
          // Chỉ re-render nếu ảnh thực sự thay đổi để tối ưu performance
          return currentImage !== newImage ? newImage : currentImage;
        });
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Cleanup listener
    return () => {
      subscription.remove();
    };
  }, []);

  return heroImage;
};