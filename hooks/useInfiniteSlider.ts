import { useCallback, useEffect, useRef } from 'react';
import { FlatList } from 'react-native'; // Đổi về core react-native để tương thích tốt hơn với rAF

export const useInfiniteSlider = (speed = 0.5, isEnabled = true) => {
  const listRef = useRef<FlatList>(null);
  
  const exactPosition = useRef(0); 
  const lastRenderedPosition = useRef(0); 

  const isAutoScrolling = useRef(isEnabled);
  const animationFrameId = useRef<number | null>(null);
  
  // 1. THÊM CỜ KHÓA TƯƠNG TÁC
  const isInteracting = useRef(false); 
  const resumeTimeoutId = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loop = useCallback(() => {
    // 2. CHỈ CUỘN KHI KHÔNG CÓ TƯƠNG TÁC TỪ USER
    if (isAutoScrolling.current && listRef.current && !isInteracting.current) {
      exactPosition.current += speed;
      const roundedPosition = Math.round(exactPosition.current);

      if (roundedPosition !== lastRenderedPosition.current) {
        listRef.current.scrollToOffset({
          offset: roundedPosition,
          animated: false, 
        });
        lastRenderedPosition.current = roundedPosition;
      }
    }
    animationFrameId.current = requestAnimationFrame(loop);
  }, [speed]);

  useEffect(() => {
    if (isEnabled) {
      isAutoScrolling.current = true;
      animationFrameId.current = requestAnimationFrame(loop);
    }
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      if (resumeTimeoutId.current) clearTimeout(resumeTimeoutId.current);
    };
  }, [isEnabled, loop]);

  const pauseAutoScroll = () => {
    if (resumeTimeoutId.current) clearTimeout(resumeTimeoutId.current);
    isInteracting.current = true; // Khóa cơ chế tự cuộn ngay lập tức khi tay chạm
    isAutoScrolling.current = false;
  };

  const resumeAutoScroll = () => {
    // 3. DEBOUNCE ĐỂ ĐỢI QUÁN TÍNH NATIVE DỪNG HẲN
    // Chờ 150ms-200ms để đảm bảo danh sách đã dừng trượt hoàn toàn rồi mới kích hoạt lại auto-scroll
    if (resumeTimeoutId.current) clearTimeout(resumeTimeoutId.current);
    
    resumeTimeoutId.current = setTimeout(() => {
      isInteracting.current = false; // Mở khóa
      isAutoScrolling.current = true;
    }, 200); 
  };

  const updateOffset = (offset: number) => {
    exactPosition.current = offset;
    lastRenderedPosition.current = Math.round(offset);
  };

  return { listRef, pauseAutoScroll, resumeAutoScroll, updateOffset };
};