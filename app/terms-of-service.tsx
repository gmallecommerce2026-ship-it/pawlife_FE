import { AntDesign } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/AppText';
export default function TermsOfServiceScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-[#F9FAFB]">
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        
        {/* --- HEADER --- */}
        <View className="flex-row items-center px-4 py-2 mb-2 relative bg-white pb-4 shadow-sm z-10">
            <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 z-10">
                <AntDesign name="left" size={24} color="#1F2937" />
            </TouchableOpacity>
            <View className="absolute left-0 right-0 items-center justify-center pointer-events-none">
                <Text className="text-xl font-bold text-gray-900">Terms of Service</Text>
            </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            <View className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <Text className="text-sm font-medium text-gray-500 mb-6 italic">
                    Effective Date: [1 January 2025]
                </Text>

                <View className="mb-5">
                    <Text className="text-base font-bold text-gray-900 mb-2">1. Acceptance of Terms</Text>
                    <Text className="text-sm text-gray-600 leading-6">
                        By accessing and using this service, you accept and agree to be bound by the terms and provision of this agreement.
                    </Text>
                </View>

                <View className="mb-5">
                    <Text className="text-base font-bold text-gray-900 mb-2">2. Use License</Text>
                    <Text className="text-sm text-gray-600 leading-6">
                        Permission is granted to temporarily use this service for personal, non-commercial transitory viewing only.
                    </Text>
                </View>

                <View className="mb-5">
                    <Text className="text-base font-bold text-gray-900 mb-2">3. User Account</Text>
                    <Text className="text-sm text-gray-600 leading-6">
                        You are responsible for maintaining the confidentiality of your account and password and for restricting access to your account.
                    </Text>
                </View>

                <View className="mb-5">
                    <Text className="text-base font-bold text-gray-900 mb-2">4. Prohibited Uses</Text>
                    <Text className="text-sm text-gray-600 leading-6">
                        You may not use this service in any way that causes, or may cause, damage to the service or impairment of the availability or accessibility of the service.
                    </Text>
                </View>

                <View className="mb-5">
                    <Text className="text-base font-bold text-gray-900 mb-2">5. Limitation of Liability</Text>
                    <Text className="text-sm text-gray-600 leading-6">
                        In no event shall PetID or its suppliers be liable for any damages arising out of the use or inability to use the service.
                    </Text>
                </View>

                <View className="mb-2">
                    <Text className="text-base font-bold text-gray-900 mb-2">6. Modifications to Terms</Text>
                    <Text className="text-sm text-gray-600 leading-6">
                        PetID reserves the right to modify these terms at any time. We will notify users of any material changes to these terms.
                    </Text>
                </View>
            </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}