import { AntDesign } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Linking, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/AppText';
export default function PrivacyPolicyScreen() {
  const router = useRouter();

  const handleOpenWebPolicy = () => {
    Linking.openURL('https://pawcare-privacy.vercel.app/');
  };
  
  return (
    <View className="flex-1 bg-[#F9FAFB]">
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        
        {/* --- HEADER --- */}
        <View className="flex-row items-center px-4 py-2 mb-2 relative bg-white pb-4 shadow-sm z-10">
            <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 z-10">
                <AntDesign name="left" size={24} color="#1F2937" />
            </TouchableOpacity>
            <View className="absolute left-0 right-0 items-center justify-center pointer-events-none">
                <Text className="text-xl font-bold text-gray-900">Privacy Policy</Text>
            </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            <View className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <Text className="text-sm font-medium text-gray-500 mb-6 italic">
                    Effective Date: [1 January 2025]
                </Text>

                <View className="mb-5">
                    <Text className="text-base font-bold text-gray-900 mb-2">1. Information Collection</Text>
                    <Text className="text-sm text-gray-600 leading-6">
                        We collect information you provide directly to us, such as when you create an account, make a purchase, or contact us for support.
                    </Text>
                </View>

                <View className="mb-5">
                    <Text className="text-base font-bold text-gray-900 mb-2">2. Use of Information</Text>
                    <Text className="text-sm text-gray-600 leading-6">
                        We use the information we collect to provide, maintain, and improve our services, process transactions, and communicate with you.
                    </Text>
                </View>

                <View className="mb-5">
                    <Text className="text-base font-bold text-gray-900 mb-2">3. Disclosure of Information</Text>
                    <Text className="text-sm text-gray-600 leading-6">
                        We may share your information with third parties in certain circumstances, such as with service providers who assist us in operating our platform.
                    </Text>
                </View>

                <View className="mb-5">
                    <Text className="text-base font-bold text-gray-900 mb-2">4. Security</Text>
                    <Text className="text-sm text-gray-600 leading-6">
                        We take reasonable measures to protect your information from unauthorized access, use, or disclosure.
                    </Text>
                </View>

                <View className="mb-5">
                    <Text className="text-base font-bold text-gray-900 mb-2">5. Your Rights</Text>
                    <Text className="text-sm text-gray-600 leading-6">
                        You have the right to access, update, or delete your personal information. You may also have additional rights depending on your location.
                    </Text>
                </View>

                <View className="mb-2">
                    <Text className="text-base font-bold text-gray-900 mb-2">6. Changes to This Privacy Policy</Text>
                    <Text className="text-sm text-gray-600 leading-6">
                        We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.
                    </Text>
                </View>
                <TouchableOpacity 
                    onPress={handleOpenWebPolicy}
                    activeOpacity={0.8}
                    className="w-full mt-10 bg-[#F97316] py-3.5 rounded-xl shadow-sm items-center flex-row justify-center"
                >
                    <AntDesign name="global" size={18} color="white" style={{ marginRight: 8 }} />
                    <Text className="text-white font-bold text-base">PawLife Policy</Text>
                </TouchableOpacity>
            </View>
            
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}