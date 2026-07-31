import { Text } from '@/components/AppText';
import { useLanguage } from '@/contexts/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { Modal, TouchableOpacity, View } from 'react-native';

export default function AdoptionNoticePopup() {
  const [visible, setVisible] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const { language } = useLanguage();
  const isVi = language === 'vi';

  useEffect(() => {
    checkPopupStatus();
  }, []);

  const checkPopupStatus = async () => {
    try {
      const neverShow = await AsyncStorage.getItem('pawlife_notice_never_show');
      if (neverShow === 'true') return;

      const lastShownDate = await AsyncStorage.getItem('pawlife_notice_last_shown');
      const today = new Date().toDateString();

      if (lastShownDate !== today) {
        setTimeout(() => {
          setVisible(true);
        }, 800);
      }
    } catch (error) {
      console.error('Lỗi kiểm tra trạng thái popup:', error);
    }
  };

  const handleClose = async () => {
    try {
      if (dontShowAgain) {
        await AsyncStorage.setItem('pawlife_notice_never_show', 'true');
      } else {
        const today = new Date().toDateString();
        await AsyncStorage.setItem('pawlife_notice_last_shown', today);
      }
      setVisible(false);
    } catch (error) {
      console.error('Lỗi lưu trạng thái popup:', error);
      setVisible(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View className="flex-1 bg-black/60 justify-center items-center px-6">
        <View className="bg-white w-full rounded-[24px] p-6 items-center shadow-2xl relative">

          {/* NÚT X ĐÓNG NHANH */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
          >
            <Ionicons name="close" size={18} color="#4B5563" />
          </TouchableOpacity>

          {/* TIÊU ĐỀ */}
          <Text className="text-[16px] text-gray-900 text-center mb-3 tracking-tight mt-2">
            {isVi ? 'Thông điệp từ PawLife' : 'PawLife Message'}
          </Text>

          {/* NỘI DUNG */}
          <Text className="text-[14px] text-gray-600 text-center mb-6 leading-6 px-1">
            {isVi ? (
              <>
                PawLife kiên quyết <Text className="font-bold text-red-500">không ủng hộ</Text> các hành vi buôn bán, trục lợi từ chó mèo trái phép.{'\n\n'}
                Việc nhận nuôi được thực hiện qua các Trạm cứu hộ đối tác. Để được duyệt hồ sơ, bạn cần đáp ứng đầy đủ các tiêu chí khắt khe do từng Trạm đề ra nhằm đảm bảo các bé có một mái ấm an toàn.
              </>
            ) : (
              <>
                PawLife strictly <Text className="font-bold text-red-500">prohibits</Text> the illegal trading of dogs and cats.{'\n\n'}
                Adoptions are facilitated through partner shelters. To be approved, you must meet the specific and rigorous requirements set by each shelter to ensure a safe forever home.
              </>
            )}
          </Text>

          {/* CHECKBOX KHÔNG HIỂN THỊ LẠI */}
          <TouchableOpacity
            activeOpacity={0.7}
            className="flex-row items-center w-full mb-5"
            onPress={() => setDontShowAgain(!dontShowAgain)}
          >
            <Ionicons
              name={dontShowAgain ? 'checkbox' : 'square-outline'}
              size={18}
              color={dontShowAgain ? '#E89B5A' : '#9CA3AF'}
            />
            <Text className="text-[14px] text-gray-600 ml-2 font-medium">
              {isVi ? 'Không hiển thị lại thông báo này' : "Don't show this message again"}
            </Text>
          </TouchableOpacity>

          {/* NÚT XÁC NHẬN */}
          <TouchableOpacity
            className="w-full py-4 rounded-full items-center bg-[#E89B5A] shadow-sm shadow-orange-200"
            activeOpacity={0.8}
            onPress={handleClose}
          >
            <Text className="text-white font-bold text-[14px] tracking-wide">
              {isVi ? 'Tôi đã hiểu' : 'I Understand'}
            </Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}