// components/QRGuideModal.tsx
import React from 'react';
import { Modal, View, TouchableOpacity, Dimensions } from 'react-native';
import { Text } from '@/components/AppText'; // Sử dụng AppText custom của bạn
import { Feather } from '@expo/vector-icons';

interface QRGuideModalProps {
  visible: boolean;
  onClose: () => void;
}

export const QRGuideModal: React.FC<QRGuideModalProps> = ({ visible, onClose }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Lớp nền đen mờ (Backdrop) */}
      <View className="flex-1 bg-black/80 justify-center items-center px-6">
        
        {/* Khung nội dung Popup */}
        <View className="bg-[#2A2A2A] w-full rounded-[24px] p-6 items-center shadow-lg shadow-black/50">
          
          {/* Thanh gạch ngang (Handle bar) trang trí kiểu bottom sheet */}
          <View className="w-12 h-1.5 bg-white/20 rounded-full mb-6" />
          
          <Text className="text-white text-[20px] font-bold mb-8 text-center">
            How to Scan QR Code
          </Text>

          {/* Các bước hướng dẫn */}
          <View className="w-full gap-y-6 mb-8">
            
            {/* Bước 1 */}
            <View className="flex-row items-center gap-4">
              <View className="w-12 h-12 bg-[#F97316]/10 rounded-full items-center justify-center border border-[#F97316]/20">
                 <Feather name="search" size={22} color="#F97316" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold text-[16px] mb-1">1. Locate the QR Code</Text>
                <Text className="text-[#8E8E93] text-[14px] leading-snug">
                  Find the PawLife QR code on your pet's tag or collar.
                </Text>
              </View>
            </View>

            {/* Bước 2 */}
            <View className="flex-row items-center gap-4">
              <View className="w-12 h-12 bg-[#F97316]/10 rounded-full items-center justify-center border border-[#F97316]/20">
                 <Feather name="maximize" size={22} color="#F97316" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold text-[16px] mb-1">2. Align within Frame</Text>
                <Text className="text-[#8E8E93] text-[14px] leading-snug">
                  Position the QR code clearly inside the orange scanning square.
                </Text>
              </View>
            </View>

            {/* Bước 3 */}
            <View className="flex-row items-center gap-4">
              <View className="w-12 h-12 bg-[#F97316]/10 rounded-full items-center justify-center border border-[#F97316]/20">
                 <Feather name="check-circle" size={22} color="#F97316" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold text-[16px] mb-1">3. Wait for Scan</Text>
                <Text className="text-[#8E8E93] text-[14px] leading-snug">
                  Hold steady. The system will detect and process it automatically.
                </Text>
              </View>
            </View>

          </View>

          {/* Nút Action */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onClose}
            className="w-full bg-[#F97316] py-4 rounded-xl items-center flex-row justify-center gap-2"
          >
            <Text className="text-white font-bold text-[16px]">Got it, let's scan!</Text>
            <Feather name="camera" size={18} color="white" />
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
};