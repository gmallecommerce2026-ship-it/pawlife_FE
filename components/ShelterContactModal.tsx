import React from 'react';
import {
  Modal,
  View,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Linking,
} from 'react-native';
import { Text } from '@/components/AppText';
import { BlurView } from 'expo-blur';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface ShelterContactModalProps {
  isVisible: boolean;
  onClose: () => void;
  shelterData: {
    name: string;
    phone: string;
    avatarUrl: string;
    note?: string;
  };
}

export default function ShelterContactModal({ isVisible, onClose, shelterData }: ShelterContactModalProps) {

  const handleCall = () => {
    Linking.openURL(`tel:${shelterData.phone}`);
  };

  const handleMessage = () => {
    Linking.openURL(`sms:${shelterData.phone}`);
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <BlurView intensity={20} tint="dark" className="flex-1 justify-center items-center bg-black/30 px-8">

          <TouchableWithoutFeedback>
            <View className="bg-white rounded-[32px] items-center pb-[20px] self-center border border-[#E89B5A] w-full relative">

              {/* ==========================================================
            AVATAR NHÔ LÊN TRÊN (Ảnh 86x86, Khung viền 98x98)
            ========================================================== */}
              <View className="absolute self-center z-10" style={{ top: -49, width: 98, height: 98 }}>

                {/* Nửa hình tròn phía TRÊN (Chứa shadow) */}
                {/* Chiều cao bằng một nửa (49px), overflow 'hidden' để cắt nửa dưới */}
                <View style={{ position: 'absolute', width: 140, height: 49, top: 0, left: -21, overflow: 'hidden' }}>
                  <View
                    style={{
                      width: 98,
                      height: 98,
                      borderRadius: 49,
                      top: 0,
                      left: 21,
                      backgroundColor: '#FFFFFF',
                      borderWidth: 1,
                      borderColor: '#E89B5A',

                    }}
                  />
                </View>

                {/* Nửa hình tròn phía DƯỚI (Không shadow để tệp vào nền trắng) */}
                {/* Nằm ở nửa dưới (top: 49), chiều cao 49px */}
                <View style={{ position: 'absolute', width: 98, height: 49, top: 49, left: 0, overflow: 'hidden' }}>
                  <View
                    style={{
                      width: 98,
                      height: 98,
                      borderRadius: 49,
                      top: -49,
                      left: 0,
                      backgroundColor: '#FFFFFF'
                    }}
                  />
                </View>

                {/* Image nằm chính giữa khung 98x98 */}
                <View className="absolute inset-0 items-center justify-center pointer-events-none">
                  <Image
                    source={{ uri: shelterData.avatarUrl }}
                    style={{ width: 86, height: 86, borderRadius: 43, backgroundColor: '#E5E7EB' }}
                    resizeMode="cover"
                  />
                </View>

              </View>

              {/* ========================================================== */}

              {/* THÔNG TIN TEXT */}
              {/* Do avatar to hơn (98px) và nhô lên cao hơn (-49px), ta cần tăng margin top để không bị đè */}
              <View className="items-center mb-3 mt-[61px]">
                <Text className="text-[20px] font-semibold text-[#1C1C1E] mb-1">
                  {shelterData.name}
                </Text>
                <Text className="text-[14px] text-[#8E8E93] text-center font-regular">
                  "{shelterData.note || 'Please contact me ASAP'}"
                </Text>
              </View>

              {/* HAI NÚT BẤM DƯỚI CÙNG */}
              <View className="flex-row gap-4 mx-[20px]">
                <TouchableOpacity
                  onPress={handleMessage}
                  activeOpacity={0.8}
                  className="flex-1 bg-white flex-row items-center justify-center border border-[#E5E5E5] h-12 rounded-full"
                >
                  <Image
                    source={require('../assets/icon/message-gray.png')}
                    style={{ width: 12, height: 12 }}
                    resizeMode="cover"
                  />
                  <Text className="ml-2 text-[16px] font-medium text-[#8E8E93]">Message</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleCall}
                  activeOpacity={0.8}
                  className="flex-1 bg-[#E89B5A] flex-row items-center justify-center border border-[#FFE4CC] h-12 rounded-full"
                >
                  <Image
                    source={require('../assets/icon/phone-white.png')}
                    style={{ width: 12, height: 12 }}
                    resizeMode="cover"
                  />
                  <Text className="ml-2 text-[16px] font-medium text-white">Call</Text>
                </TouchableOpacity>
              </View>

            </View>
          </TouchableWithoutFeedback>

        </BlurView>
      </TouchableWithoutFeedback>
    </Modal>
  );
}