import React from 'react';
import { Modal, View, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { Text } from '@/components/AppText'; // Tuỳ chỉnh đường dẫn nếu cần
import { Feather } from '@expo/vector-icons';

interface ScanGuideModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ScanGuideModal = ({ visible, onClose }: ScanGuideModalProps) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Background mờ, bấm vào ngoài để đóng */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 bg-black/70 justify-center items-center px-6">
          <TouchableWithoutFeedback>
            {/* Khung nội dung Popup */}
            <View className="bg-[#2A2A2A] w-full rounded-[24px] p-6 shadow-2xl">
              
              {/* Tiêu đề */}
              <View className="items-center mb-6">
                <View className="w-12 h-1 bg-white/20 rounded-full mb-4" />
                <Text className="text-white text-[20px] font-bold">How to Scan QR Code</Text>
              </View>

              {/* Các bước hướng dẫn */}
              <View className="gap-y-6 mb-8">
                {/* Bước 1 */}
                <View className="flex-row items-center gap-4">
                  <View className="w-12 h-12 rounded-full bg-[#F97316]/10 border border-[#F97316]/20 items-center justify-center">
                    <Feather name="search" size={24} color="#F97316" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-semibold text-[16px] mb-1">1. Find the Tag</Text>
                    <Text className="text-[#8E8E93] text-[14px] leading-5">Locate the PawLife QR code on the pet's collar.</Text>
                  </View>
                </View>

                {/* Bước 2 */}
                <View className="flex-row items-center gap-4">
                  <View className="w-12 h-12 rounded-full bg-[#F97316]/10 border border-[#F97316]/20 items-center justify-center">
                    <Feather name="maximize" size={24} color="#F97316" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-semibold text-[16px] mb-1">2. Center the Code</Text>
                    <Text className="text-[#8E8E93] text-[14px] leading-5">Hold your phone steady and center the QR code in the frame.</Text>
                  </View>
                </View>

                {/* Bước 3 */}
                <View className="flex-row items-center gap-4">
                  <View className="w-12 h-12 rounded-full bg-[#F97316]/10 border border-[#F97316]/20 items-center justify-center">
                    <Feather name="check-circle" size={24} color="#F97316" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-semibold text-[16px] mb-1">3. Auto Scan</Text>
                    <Text className="text-[#8E8E93] text-[14px] leading-5">The app will automatically detect and scan the code for you.</Text>
                  </View>
                </View>
              </View>

              {/* Nút Đóng */}
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={onClose} 
                className="bg-[#F97316] w-full py-4 rounded-xl items-center justify-center shadow-lg shadow-[#F97316]/30"
              >
                <Text className="text-white font-bold text-[16px]">Got it!</Text>
              </TouchableOpacity>
              
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};