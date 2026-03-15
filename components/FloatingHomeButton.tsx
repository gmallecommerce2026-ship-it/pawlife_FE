// components/FloatingHomeButton.tsx
import { AppContext } from '@/contexts/AppContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useContext, useEffect } from 'react';
import { TouchableOpacity, Vibration, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const BUTTON_SIZE = 56;

export default function FloatingHomeButton() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  
  // State để huỷ mount hoàn toàn nút này nếu user chọn Ẩn
  const { isFloatingButtonVisible, setIsFloatingButtonVisible } = useContext(AppContext);

  const minX = 12;
  const maxX = width - BUTTON_SIZE - 12;
  const minY = insets.top + 12;
  const maxY = height - insets.bottom - BUTTON_SIZE - 12;

  // Khởi tạo bên trái màn hình (minX) theo yêu cầu trước đó
  const translateX = useSharedValue(minX);
  const translateY = useSharedValue(height / 2 + 100); 
  const opacity = useSharedValue(0.4); 

  // Shared value cho nút "Ẩn"
  const optionsOpacity = useSharedValue(0);

  const contextX = useSharedValue(0);
  const contextY = useSharedValue(0);

  const fadeOut = () => {
      'worklet';
      // Chỉ làm mờ nếu menu ẩn đang không được mở
      if (optionsOpacity.value === 0) {
          opacity.value = withDelay(2000, withTiming(0.4, { duration: 300 }));
      }
  };

  useEffect(() => {
      fadeOut();
  }, []);

  const navigateHome = () => {
    router.navigate('/(tabs)');
  };

  // --- 1. GESTURE: NHẤN GIỮ (LONG PRESS) ---
  const longPress = Gesture.LongPress()
    .minDuration(400) // Nhấn giữ 400ms thì kích hoạt
    .onStart(() => {
      // Rung phản hồi (Gọi qua runOnJS vì đang ở Worklet thread)
      runOnJS(Vibration.vibrate)(40); 
      
      // Bật/tắt menu ẩn
      optionsOpacity.value = withTiming(optionsOpacity.value > 0.5 ? 0 : 1, { duration: 200 });
      opacity.value = withTiming(1, { duration: 100 }); // Làm sáng nút lên
    });

  // --- 2. GESTURE: KÉO (PAN) ---
  const pan = Gesture.Pan()
    .onStart(() => {
      opacity.value = withTiming(1, { duration: 150 });
      optionsOpacity.value = withTiming(0, { duration: 150 }); // Khi bắt đầu kéo thì thu gọn menu ẩn lại
      contextX.value = translateX.value;
      contextY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = contextX.value + event.translationX;
      translateY.value = contextY.value + event.translationY;
    })
    .onEnd((event) => {
      const projectedX = translateX.value + event.velocityX * 0.2;
      const isLeft = projectedX < width / 2;
      const targetX = isLeft ? minX : maxX;

      let targetY = translateY.value + event.velocityY * 0.1;
      if (targetY < minY) targetY = minY;
      if (targetY > maxY) targetY = maxY;

      const springConfig = {
        velocity: event.velocityX,
        damping: 18,
        stiffness: 120,
        mass: 0.8,
      };

      translateX.value = withSpring(targetX, springConfig);
      translateY.value = withSpring(targetY, {
          ...springConfig,
          velocity: event.velocityY
      });

      fadeOut();
    });

  // --- 3. GESTURE: CHẠM (TAP) ---
  const tap = Gesture.Tap()
    .maxDuration(250)
    .onStart(() => {
      opacity.value = withTiming(1, { duration: 100 });
    })
    .onEnd(() => {
      // Nếu menu ẩn đang mở thì tap vào nút Home sẽ thu gọn nó lại. Nếu không mở thì đi về Home.
      if (optionsOpacity.value > 0.5) {
          optionsOpacity.value = withTiming(0, { duration: 150 });
      } else {
          runOnJS(navigateHome)();
      }
      fadeOut();
    });

  // Gom các gestures lại. Exclusive(longPress, tap) nghĩa là nếu giữ đủ lâu thì tap bị huỷ.
  const composedGesture = Gesture.Simultaneous(pan, Gesture.Exclusive(longPress, tap));

  // Style cho nút chính
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
      opacity: opacity.value,
    };
  });

  // Style cho nút Ẩn (Hide Button)
  const hideButtonStyle = useAnimatedStyle(() => {
    const isLeft = translateX.value < width / 2;
    const hideBtnSize = 42; 
    
    return {
      position: 'absolute',
      top: 0, 
      left: 0,
      transform: [
        // Tính toán để luôn hiển thị nút Ẩn lòi ra phía hướng vào giữa màn hình
        { translateX: isLeft ? translateX.value + BUTTON_SIZE + 12 : translateX.value - hideBtnSize - 12 },
        { translateY: translateY.value + (BUTTON_SIZE - hideBtnSize) / 2 }, // Căn giữa theo trục Y so với nút Home
        { scale: optionsOpacity.value }
      ],
      opacity: optionsOpacity.value,
      zIndex: 998,
    };
  });

  // Nếu người dùng đã bấm nút ẩn thì tháo toàn bộ component khỏi cây DOM
  if (!isFloatingButtonVisible) return null;

  return (
    <>
      {/* --- NÚT ẨN (HIDE BUTTON) TÁCH RỜI ĐỂ TRÁNH BỊ CHẶN BỞI GESTURE --- */}
      <Animated.View style={hideButtonStyle} className="absolute z-[998]">
          <TouchableOpacity 
              activeOpacity={0.7}
              // 👈 Gọi hàm từ Context để tắt trên toàn hệ thống
              onPress={() => setIsFloatingButtonVisible(false)} 
              className="w-[42px] h-[42px] bg-red-500 rounded-full items-center justify-center shadow-lg border-2 border-white/20"
          >
              <Ionicons name="eye-off" size={20} color="white" />
          </TouchableOpacity>
      </Animated.View>

      {/* --- NÚT HOME CHÍNH --- */}
      <GestureDetector gesture={composedGesture}>
        <Animated.View
          className="absolute z-[999] items-center justify-center bg-black/70 backdrop-blur-md"
          style={[
            {
              width: BUTTON_SIZE,
              height: BUTTON_SIZE,
              borderRadius: BUTTON_SIZE / 2,
              borderWidth: 2,
              borderColor: 'rgba(255,255,255,0.2)',
            },
            animatedStyle,
          ]}
        >
          <Animated.View className="w-[80%] h-[80%] rounded-full items-center justify-center border border-white/30 bg-white/20">
              <Ionicons name="home" size={20} color="white" />
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </>
  );
}