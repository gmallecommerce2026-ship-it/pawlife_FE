// components/AppTextInput.tsx
import React from 'react';
import { TextInput as RNTextInput, TextInputProps } from 'react-native';
import { useDynamicFont } from '@/hooks/useDynamicFont';

export function TextInput(props: TextInputProps) {
  const { style, ...restProps } = props;
  const dynamicStyle = useDynamicFont(style);

  return (
    <RNTextInput 
      {...restProps} 
      style={dynamicStyle} 
    />
  );
}