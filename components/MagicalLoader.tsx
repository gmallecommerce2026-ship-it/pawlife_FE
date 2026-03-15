// components/MagicalLoader.tsx
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface MagicalLoaderProps {
  isVisible: boolean;
}

export default function MagicalLoader({ isVisible }: MagicalLoaderProps) {
  const containerOpacity = useSharedValue(0);
  const ring1 = useSharedValue(0);
  const ring2 = useSharedValue(0);
  const heartbeat = useSharedValue(1);

  useEffect(() => {
    if (isVisible) {
      // 1. Hiện overlay mượt mà
      containerOpacity.value = withTiming(1, { duration: 400 });

      // 2. Hiệu ứng sóng lan tỏa (Ripple) cho 2 vòng
      ring1.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.out(Easing.ease) }), -1, false);
      setTimeout(() => {
        ring2.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.out(Easing.ease) }), -1, false);
      }, 400); // Vòng 2 trễ hơn vòng 1 một chút

      // 3. Hiệu ứng tim đập (Heartbeat) cho logo
      heartbeat.value = withRepeat(withTiming(1.2, { duration: 400, easing: Easing.inOut(Easing.ease) }), -1, true);
    } else {
      // Tắt mượt mà
      containerOpacity.value = withTiming(0, { duration: 400 });
      ring1.value = 0;
      ring2.value = 0;
      heartbeat.value = 1;
    }
  }, [isVisible]);

  // Style cho Container nền đen mờ
  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    zIndex: containerOpacity.value > 0 ? 999 : -1, // Ẩn hoàn toàn khi tắt
  }));

  // Style sóng lan tỏa (Phóng to và mờ dần)
  const createRingStyle = (ringValue: Animated.SharedValue<number>) => {
    return useAnimatedStyle(() => ({
      transform: [
        {
          scale: interpolate(ringValue.value, [0, 1], [0.8, 3.5], Extrapolation.CLAMP),
        },
      ],
      opacity: interpolate(ringValue.value, [0, 0.8, 1], [0.8, 0.1, 0], Extrapolation.CLAMP),
    }));
  };

  const ring1Style = createRingStyle(ring1);
  const ring2Style = createRingStyle(ring2);

  const heartbeatStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartbeat.value }],
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]} pointerEvents={isVisible ? 'auto' : 'none'}>
      <View style={styles.loaderCenter}>
        {/* Vòng lan tỏa 1 */}
        <Animated.View style={[styles.ring, ring1Style]} />
        {/* Vòng lan tỏa 2 */}
        <Animated.View style={[styles.ring, ring2Style]} />
        
        {/* Logo trung tâm đập nhịp */}
        <Animated.View style={[styles.iconContainer, heartbeatStyle]}>
          <MaterialCommunityIcons name="paw" size={40} color="#FFFFFF" />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.85)', // Nền trắng mờ ảo
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderCenter: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F97316', // Màu cam của app
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
});