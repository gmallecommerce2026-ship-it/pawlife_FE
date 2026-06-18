// hooks/useDynamicFont.ts
import { useLanguage } from '@/contexts/LanguageContext';
import { StyleSheet, TextStyle } from 'react-native';

export const useDynamicFont = (style?: TextStyle | TextStyle[], className?: string) => {
  const { language } = useLanguage();
  const flattenedStyle = StyleSheet.flatten(style) || {};

  const { fontWeight, fontStyle, fontFamily, ...restStyle } = flattenedStyle;

  const baseFontFamily = language === 'vi' ? 'BeVietnamPro' : 'Urbanist';

  const getExactFontFamily = (base: string, styleWeight?: string | number, classStr?: string, currentFamily?: string) => {
    let detectedWeight: string | number = styleWeight || '400';

    // 1. Bắt trực tiếp từ Tailwind className
    if (classStr) {
      if (classStr.includes('font-thin')) detectedWeight = '100';
      else if (classStr.includes('font-extralight')) detectedWeight = '200';
      else if (classStr.includes('font-light')) detectedWeight = '300';
      else if (classStr.includes('font-medium')) detectedWeight = '500';
      else if (classStr.includes('font-semibold')) detectedWeight = '600';
      else if (classStr.includes('font-extrabold')) detectedWeight = '800';
      else if (classStr.includes('font-black')) detectedWeight = '900';
      else if (classStr.includes('font-bold')) detectedWeight = '700'; // Đặt dưới extrabold
      else if (classStr.includes('font-normal') || classStr.includes('font-regular')) detectedWeight = '400';
    }

    // 2. Đọc từ fontFamily nếu có truyền qua object
    if ((!classStr || !detectedWeight) && currentFamily) {
       const lowerFam = currentFamily.toLowerCase();
       if (lowerFam.includes('semibold')) detectedWeight = '600';
       else if (lowerFam.includes('medium')) detectedWeight = '500';
       else if (lowerFam.includes('extrabold')) detectedWeight = '800';
       else if (lowerFam.includes('bold')) detectedWeight = '700';
    }

    // 3. Ép kiểu về số nguyên để thực hiện phép trừ
    let weightNum = parseInt(String(detectedWeight), 10);
    if (isNaN(weightNum)) {
        if (String(detectedWeight).toLowerCase() === 'bold') weightNum = 700;
        else weightNum = 400; // Mặc định là Regular (400)
    }

    // --- LÕI LOGIC: HẠ 1 BẬC FONT CHO TIẾNG VIỆT ---
    if (base === 'BeVietnamPro') {
        weightNum -= 100; // VD: Bold (700) -> SemiBold (600), Medium (500) -> Regular (400)
        
        // Giới hạn nhỏ nhất là 300 vì trong file app/_layout.tsx bạn chỉ load BeVietnamPro_300Light là mỏng nhất
        if (weightNum < 300) weightNum = 300; 
    }

    // 4. Map con số về lại hậu tố chữ
    let suffix = 'Regular';
    switch (weightNum) {
      case 100:
      case 200:
      case 300: suffix = 'Light'; break;
      case 400: suffix = 'Regular'; break;
      case 500: suffix = 'Medium'; break;
      case 600: suffix = 'SemiBold'; break;
      case 700: suffix = 'Bold'; break;
      case 800:
      case 900: suffix = 'ExtraBold'; break;
      default: suffix = 'Regular';
    }

    // 5. Các lớp bảo vệ chống crash (Fallback)
    // - Urbanist chưa load file font Light -> Đưa về Regular
    if (base === 'Urbanist' && suffix === 'Light') {
       suffix = 'Regular';
    }
    // - BeVietnamPro trong layout bạn chỉ mới load đến Bold (700), không có ExtraBold -> Đưa về Bold
    if (base === 'BeVietnamPro' && (suffix === 'ExtraBold' || weightNum > 700)) {
       suffix = 'Bold';
    }

    // 6. Xử lý font nghiêng (Italic)
    if (fontStyle === 'italic' || (classStr && classStr.includes('italic'))) {
      suffix = 'Italic'; 
    }

    return `${base}-${suffix}`;
  };

  return {
    ...restStyle,
    fontFamily: getExactFontFamily(baseFontFamily, fontWeight, className, fontFamily),
  };
};