// src/common/utils/map.util.ts
export const normalizeRadius = (radius: any): number => {
  if (radius === null || radius === undefined) return 0;
  const parsed = parseFloat(radius);
  // Giới hạn bán kính tối thiểu để tránh lỗi hiển thị trên Map
  return isNaN(parsed) || parsed < 0 ? 0 : parsed;
};