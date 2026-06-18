// components/AppText.tsx
import { useLanguage } from '@/contexts/LanguageContext';
import { useDynamicFont } from '@/hooks/useDynamicFont';
import { viDict } from '@/locales/vi';
import React from 'react';
import { Text as RNText, TextProps } from 'react-native';

// Bổ sung interface để TypeScript nhận diện className từ NativeWind
export interface AppTextProps extends TextProps {
  className?: string;
}

export function Text(props: AppTextProps) {
  const { language } = useLanguage();
  let { children, style, className, ...restProps } = props;

  // Truyền thêm className vào hook để bắt các class Tailwind (font-semibold, font-medium,...)
  const dynamicStyle = useDynamicFont(style, className);

  const translate = (text: string) => {
    const trimmed = text.trim();
    return viDict[trimmed] ? text.replace(trimmed, viDict[trimmed]) : text;
  };

  if (language === 'vi' && children) {
    if (typeof children === 'string') {
      children = translate(children);
    } else if (Array.isArray(children)) {
      children = React.Children.map(children, (child) => 
        typeof child === 'string' ? translate(child) : child
      );
    }
  }

  return (
    <RNText {...restProps} className={className} style={dynamicStyle}>
      {children}
    </RNText>
  );
}