// components/AppText.tsx
import { useLanguage } from '@/contexts/LanguageContext';
import { useDynamicFont } from '@/hooks/useDynamicFont';
import { viDict } from '@/locales/vi';
import React from 'react';
import { Text as RNText, TextProps } from 'react-native';

export interface AppTextProps extends TextProps {
  className?: string;
}

// Hàm loại bỏ dấu tiếng Việt (chỉ chạy khi ở ngôn ngữ tiếng Anh/khác)
const removeVietnameseTones = (str: string): string => {
  if (!str) return str;
  return str
    .normalize('NFD') // Tách dấu ra khỏi ký tự
    .replace(/[\u0300-\u036f]/g, '') // Xóa dấu
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
};

export function Text(props: AppTextProps) {
  const { language } = useLanguage();
  let { children, style, className, ...restProps } = props;

  const dynamicStyle = useDynamicFont(style, className);

  // Xử lý dịch tiếng Việt
  const translateToVi = (text: string) => {
    const trimmed = text.trim();
    return viDict[trimmed] ? text.replace(trimmed, viDict[trimmed]) : text;
  };

  // Logic xử lý text dựa trên ngôn ngữ hiện tại
  if (children) {
    if (typeof children === 'string') {
      if (language === 'vi') {
        children = translateToVi(children); // Tiếng Việt: Dịch và giữ nguyên dấu
      } else {
        children = removeVietnameseTones(children); // Tiếng Anh/Khác: Bỏ dấu nếu có chữ TV
      }
    } else if (Array.isArray(children)) {
      children = React.Children.map(children, (child) => {
        if (typeof child === 'string') {
          return language === 'vi' 
            ? translateToVi(child) 
            : removeVietnameseTones(child);
        }
        return child;
      });
    }
  }

  return (
    <RNText {...restProps} className={className} style={dynamicStyle}>
      {children}
    </RNText>
  );
}