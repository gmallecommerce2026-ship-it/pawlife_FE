// Thêm useRef vào phần import của React
import { useEffect, useRef } from 'react';
import { FlatList } from 'react-native';

// --- CUSTOM HOOK XỬ LÝ AUTO SCROLL VÔ HẠN ---
export function useAutoScroll(speed = 0.5) {
  const listRef = useRef<FlatList>(null);
  const scrollPosition = useRef(0);
  const isAutoScrolling = useRef(true);
  const contentWidth = useRef(0);
  const layoutWidth = useRef(0);

  useEffect(() => {
    let animationFrameId: number;

    const autoScroll = () => {
      // Chỉ cuộn khi đang bật cờ auto, có ref, và nội dung dài hơn màn hình
      if (isAutoScrolling.current && listRef.current && contentWidth.current > layoutWidth.current) {
        scrollPosition.current += speed;

        // Vì ta nhân đôi mảng dữ liệu, điểm kết thúc của danh sách gốc chính là chia đôi tổng chiều dài
        const maxScroll = contentWidth.current / 2;

        // Khi cuộn hết danh sách gốc, reset ngay lập tức về 0 để tạo vòng lặp vô tận
        if (scrollPosition.current >= maxScroll) {
          scrollPosition.current = 0;
        }

        listRef.current.scrollToOffset({
          offset: scrollPosition.current,
          animated: false, // Bắt buộc false vì requestAnimationFrame đã tự lo việc mượt mà
        });
      }
      animationFrameId = requestAnimationFrame(autoScroll);
    };

    animationFrameId = requestAnimationFrame(autoScroll);

    return () => cancelAnimationFrame(animationFrameId);
  }, [speed]);

  return { listRef, isAutoScrolling, contentWidth, layoutWidth };
}