// app/terms-of-service.tsx
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/AppText';

export default function TermsOfServiceScreen() {
  const router = useRouter();

  const TermItem = ({ number, title, content }: { number: string, title: string, content: string }) => (
    <View className="flex-row items-start mt-[24px]">
        <Text className="font-semibold text-[16px] text-gray-900 w-5 ">{number}.</Text>
        <View className="flex-1">
            <Text className="text-black font-semibold text-[16px] mb-1">{title}</Text>
            <Text className="text-[#8E8E93] font-regular text-[14px] leading-5">{content}</Text>
        </View>
    </View>
  );

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
        
        <View className="flex-row items-center justify-between px-4 pt-3 z-10 bg-white">
            <View className="w-10" /> 
            
            
            <TouchableOpacity 
                onPress={() => router.back()} 
                className="w-10 items-end py-1.5"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Feather name="x" size={24} color="#374151" />
            </TouchableOpacity>
        </View>
        
        <View className="flex-1 relative">
            <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={{ paddingHorizontal: 35, paddingTop: 24, paddingBottom: 100 }}
            >
                <Text className="flex-1 font-semibold text-[24px] text-black tracking-wide">
                    Terms of Service
                </Text>
                <Text className="text-[12px] font-medium text-[#B8B8B8] mt-[12px] italic">
                    Effective Date: 1 January 2026
                </Text>

                <TermItem 
                    number="1" 
                    title="Acceptance of Terms" 
                    content="By accessing and using this service, you accept and agree to be bound by the terms and provision of this agreement." 
                />
                <TermItem 
                    number="2" 
                    title="Use License" 
                    content="Permission is granted to temporarily use this service for personal, non-commercial transitory viewing only." 
                />
                <TermItem 
                    number="3" 
                    title="User Account" 
                    content="You are responsible for maintaining the confidentiality of your account and password and for restricting access to your account." 
                />
                <TermItem 
                    number="4" 
                    title="Prohibited Uses" 
                    content="You may not use this service in any way that causes, or may cause, damage to the service or impairment of the availability or accessibility of the service." 
                />
                <TermItem 
                    number="5" 
                    title="Limitation of Liability" 
                    content="In no event shall PawLife or its suppliers be liable for any damages arising out of the use or inability to use the service." 
                />
                <TermItem 
                    number="6" 
                    title="Modifications to Terms" 
                    content="PawLife reserves the right to modify these terms at any time. We will notify users of any material changes to these terms." 
                />
                <TermItem 
                    number="7" 
                    title="Privacy & Data Protection" 
                    content="Your use of the application is also governed by our Privacy Policy, which details how we collect, use, and safeguard your personal information." 
                />
            </ScrollView>

            <LinearGradient
                colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.7)', 'rgba(255,255,255,1)']}
                locations={[0, 0.45, 1]}
                style={{ 
                    position: 'absolute', 
                    left: 0, 
                    right: 0, 
                    bottom: 0, 
                    height: 120,
                    pointerEvents: 'none'
                }}
            />
        </View>

      </SafeAreaView>
    </View>
  );
}