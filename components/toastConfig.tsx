// toastConfig.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import Toast, { ToastConfig, BaseToastProps } from 'react-native-toast-message';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const toastConfig: ToastConfig = {
    // Định nghĩa một loại toast mới tên là 'custom_badge'
    custom_badge: ({ props }: any) => {
        // Lấy safe area để tránh việc tai thỏ che mất thông báo (đặc biệt trên iOS)
        // Nếu bạn không dùng hook này trong component, bạn có thể truyền paddingTop cố định

        return (
            <View
                className="flex-row items-center bg-[#FFFFFF] border border-[#E5E5E5] px-4 py-3 rounded-[9px] mt-2 mx-4" // Tailwind classes
                style={{
                    // Các style bổ sung nếu Tailwind không hỗ trợ đủ
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 3, // Bóng đổ trên Android 
                    borderWidth: 1,
                }}
            >
                {/* Nội dung text (text1) */}
                <Text className="flex-1 text-[13px] leading-5">
                    {/* Tên Pet: Chữ đậm, màu đen */}
                    <Text className="font-semibold text-[#1A1A1A]" style={{fontFamily:'Urbanist'}}>
                        {props.petName}
                    </Text>

                    {/* Hành động: Chữ thường, màu xám #757575 */}
                    <Text className="font-regular text-[#757575]" style={{fontFamily:'Urbanist'}}>
                        {props.actionText}
                    </Text>
                </Text>

                {/* Icon đóng (X) hoặc mũi tên tùy bạn, trong ảnh có vẻ không có nút đóng nhưng tôi thêm vào cho chuẩn UX */}
                <TouchableOpacity onPress={() => Toast.hide()} activeOpacity={0.7} className="ml-2">
                    <Feather name="x" size={16} color="#666666" />
                </TouchableOpacity>
            </View>
        );
    }
};