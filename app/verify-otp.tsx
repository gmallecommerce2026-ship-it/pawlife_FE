// app/verify-otp.tsx
import { AuthContext } from '@/contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import { Href, useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle } from 'lucide-react-native';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, Modal, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';

// THÊM MỚI: Hằng số thời gian đếm ngược (2 phút = 120 giây)
const RESEND_OTP_TIME = 120; 

export default function VerifyOtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams(); 
  // Lưu ý: Đảm bảo trong AuthContext của bạn có hàm xử lý gọi API gửi lại OTP (vd: resendOtp)
  const { register } = useContext(AuthContext) as any; // Thay as any bằng type thật của bạn

  const [code, setCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // THÊM MỚI: State quản lý đếm ngược
  const [timer, setTimer] = useState<number>(RESEND_OTP_TIME);
  
  const CODE_LENGTH = 6; 

  // XỬ LÝ LỖI 1: Ép đóng bàn phím native mặc định từ màn hình trước
  useEffect(() => {
    Keyboard.dismiss();
  }, []);

  // THÊM MỚI: Logic đếm ngược an toàn, chống memory leak
  useEffect(() => {
    // SỬA LỖI TYPESCRIPT Ở DÒNG NÀY:
    let interval: ReturnType<typeof setInterval>;
    
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }

    // Cleanup function để clear interval khi unmount hoặc khi timer thay đổi
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer]);

  // THÊM MỚI: Hàm format thời gian từ giây sang MM:SS
  const formatTime = useCallback((totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // THÊM MỚI: Hàm xử lý gửi lại OTP
  const handleResendOtp = async () => {
    if (timer > 0 || isLoading) return; // Chặn spam click

    try {
      setIsLoading(true);
      // Gọi API gửi lại OTP ở đây (Kết nối với NestJS)
      // Ví dụ: await resendOtp({ email: params.email });
      
      console.log("Đã gọi API resend OTP cho:", params.email);
      
      // Reset lại bộ đếm về 2 phút
      setTimer(RESEND_OTP_TIME);
      Alert.alert("Success", "Mã OTP mới đã được gửi đến email của bạn.");
    } catch (error: any) {
      Alert.alert("Lỗi", error.message || "Không thể gửi lại OTP lúc này.");
    } finally {
      setIsLoading(false);
    }
  };

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

          {/* CẬP NHẬT UI: Phần hiển thị nút Resend và Đếm ngược */}
          <View className="items-center mb-8 h-[24px] justify-center">
            {isLoading ? (
              <View className="flex-row items-center">
                <ActivityIndicator size="small" color="#E89B5A" className="mr-2" />
                <Text className="text-[#9CA3AF] text-[15px] font-regular">Verifying...</Text>
              </View>
            ) : timer > 0 ? (
              <Text className="text-[#9CA3AF] text-[15px] font-regular">
                Resend New Code <Text className="font-semibold text-black">{formatTime(timer)}</Text>
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResendOtp} activeOpacity={0.7}>
                <Text className="text-[#E89B5A] text-[16px] font-bold">
                  Resend New Code
                </Text>
              </TouchableOpacity>
            )}
          </View>

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