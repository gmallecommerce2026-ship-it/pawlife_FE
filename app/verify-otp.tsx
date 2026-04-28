// app/verify-otp.tsx
import { AuthContext } from '@/contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import { Href, useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle } from 'lucide-react-native';
import React, { useContext, useEffect, useState } from 'react';
// IMPORT THÊM Keyboard và ScrollView
import { ActivityIndicator, Alert, Keyboard, Modal, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';

export default function VerifyOtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams(); 
  const { register } = useContext(AuthContext);

  const [code, setCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  const CODE_LENGTH = 6; 

  // XỬ LÝ LỖI 1: Ép đóng bàn phím native mặc định từ màn hình trước
  useEffect(() => {
    Keyboard.dismiss();
  }, []);

  const handleKeyPress = (value: string) => {
    if (value === 'delete') {
      setCode((prev) => prev.slice(0, -1));
    } else {
      if (code.length < CODE_LENGTH) {
        setCode((prev) => prev + value);
      }
    }
  };

  useEffect(() => {
    if (code.length === CODE_LENGTH) {
      submitRegistration(code);
    }
  }, [code]);

  const submitRegistration = async (otpCode: string) => {
    try {
      setIsLoading(true);
      console.log("Dữ liệu gửi lên Backend:", { email: params.email, otp: otpCode });
      await register({ 
        email: params.email as string, 
        password: params.password as string, 
        name: params.name as string, 
        phone: params.phone as string, 
        gender: params.gender as string, 
        dob: params.dob as string, 
        avatarUrl: params.avatarUrl ? (params.avatarUrl as string) : undefined, 
        otp: otpCode 
      });

      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        setTimeout(() => {
          router.replace('/sign-in' as Href); 
        }, 350); 
      }, 1500);

    } catch (error: any) {
      Alert.alert("Registration Failed", error.message || "Invalid or expired OTP!");
      setCode(''); 
    } finally {
      setIsLoading(false);
    }
  };

  const KeyButton = ({ value, label, icon }: { value: string, label?: string, icon?: React.ReactNode }) => {
    const isEmpty = value === 'empty';
    
    return (
      <TouchableOpacity
        disabled={isEmpty || isLoading}
        onPress={() => handleKeyPress(value)}
        activeOpacity={0.7}
        className={`w-[30%] h-[60px] justify-center items-center rounded-[16px] mb-3 ${
          isEmpty ? 'bg-transparent' : 'bg-[#F5F5F5]'
        }`}
      >
        {icon ? (
          icon
        ) : (
          <Text className="text-[24px] font-regular text-[#6B7280]">
            {label}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* XỬ LÝ LỖI 2: Dùng ScrollView chống tràn UI và xử lý chạm mượt mà */}
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="px-6 py-4">
          <TouchableOpacity 
            onPress={() => router.back()} 
            disabled={isLoading}
            className="w-10 h-10 justify-center -ml-2"
          >
            <Feather name="chevron-left" size={28} color="#000000" />
          </TouchableOpacity>
        </View>

        <View className="flex-1 px-8 pt-4">
          <View className="mb-10">
            <Text className="text-[32px] font-bold text-black mb-4 flex-row items-center">
              Enter OTP Code <Text className="text-[28px]">🔐</Text>
            </Text>
            <Text className="text-[15px] text-[#9CA3AF] leading-6 font-regular">
              Email has been sent to <Text className="text-black font-semibold">{params.email || 'your email'}</Text>. Please enter the one-time verification code below.
            </Text>
          </View>

          <View className="flex-row justify-between mb-8 px-0">
            {[0, 1, 2, 3, 4, 5].map((index) => {
              const digit = code[index] || '';
              const isActive = index === code.length;

              return (
                <View
                  key={index}
                  className={`w-[45px] h-[55px] rounded-[12px] justify-center items-center border-[1.5px] ${
                    isActive ? 'border-[#E89B5A]' : 'border-[#E5E5E5]'
                  } ${digit ? 'border-[#E89B5A] bg-[#FFF8F3]' : 'bg-white'}`}
                >
                  <Text className="text-[24px] font-bold text-black">
                    {digit}
                  </Text>
                </View>
              );
            })}
          </View>

          {isLoading ? (
            <View className="items-center mb-8">
              <ActivityIndicator size="small" color="#E89B5A" />
              <Text className="text-[#9CA3AF] text-[15px] mt-2 font-regular">Verifying...</Text>
            </View>
          ) : (
            <View className="items-center mb-8">
              <Text className="text-[#9CA3AF] text-[15px] font-regular">
                Resend New Code 00:30
              </Text>
            </View>
          )}

          {/* Keypad custom giữ nguyên */}
          <View className="mt-auto pb-8 pt-4">
            <View className="flex-row justify-between w-full">
              <KeyButton value="1" label="1" />
              <KeyButton value="2" label="2" />
              <KeyButton value="3" label="3" />
            </View>
            <View className="flex-row justify-between w-full">
              <KeyButton value="4" label="4" />
              <KeyButton value="5" label="5" />
              <KeyButton value="6" label="6" />
            </View>
            <View className="flex-row justify-between w-full">
              <KeyButton value="7" label="7" />
              <KeyButton value="8" label="8" />
              <KeyButton value="9" label="9" />
            </View>
            <View className="flex-row justify-between w-full">
              <KeyButton value="empty" label="" />
              <KeyButton value="0" label="0" />
              <KeyButton 
                value="delete" 
                icon={<Feather name="arrow-left" size={24} color="#6B7280" />} 
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/50 px-6">
          <View className="bg-white rounded-3xl p-8 items-center w-full shadow-2xl">
            <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-6">
              <CheckCircle size={40} color="#22C55E" />
            </View>
            <Text className="text-[22px] font-bold text-gray-900 mb-2">Success!</Text>
            <Text className="text-gray-500 text-center text-[15px] leading-relaxed">
              Your account has been created successfully. Redirecting to login page...
            </Text>
            <ActivityIndicator size="large" color="#F97316" className="mt-6" />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}