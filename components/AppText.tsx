import { useLanguage } from '@/contexts/LanguageContext';
import { viDict } from '@/locales/vi';
import React from 'react';
import { Text as RNText, TextProps } from 'react-native';

export function Text(props: TextProps) {
  const { language } = useLanguage();
  let { children, ...restProps } = props;

  // Hàm tự động tra từ điển
  const translate = (text: string) => {
    const trimmed = text.trim();
    return viDict[trimmed] ? text.replace(trimmed, viDict[trimmed]) : text;
  };

  if (language === 'vi' && children) {
    if (typeof children === 'string') {
      children = translate(children);
    } else if (Array.isArray(children)) {
      // Xử lý trường hợp text bị nối chuỗi ví dụ: <Text>Hello {"World"}</Text>
      children = React.Children.map(children, (child) => 
        typeof child === 'string' ? translate(child) : child
      );
    }
  }

  // Vẫn trả về RNText gốc để tương thích 100% với NativeWind
  return <RNText {...restProps}>{children}</RNText>;
}