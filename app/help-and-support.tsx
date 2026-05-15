// app/help-center.tsx
import { Text } from '@/components/AppText';
import { AntDesign, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// Component tái sử dụng cho từng mục trong menu
const HelpItem = ({
  iconSource, // Thay đổi từ iconName sang iconSource
  label,
  onPress,
  isLast = false,
}: {
  iconSource: any, // Dùng 'any' hoặc 'ImageSourcePropType' để nhận require()
  label: string,
  onPress?: () => void,
  isLast?: boolean
}) => (
  <TouchableOpacity
    activeOpacity={0.7}
    onPress={onPress}
    className={`flex-row items-center justify-between py-2 ${!isLast ? 'border-b border-gray-100' : ''}`}
  >
    <View className="flex-row items-center -ml-1">
      <View className="w-8 mr-2 items-center justify-center">
        <Image
          source={iconSource}
          style={{ width: 30, height: 30 }}
          resizeMode="contain"
          className='-ml-1'
        />
      </View>
      <Text className="text-[16px] font-medium text-gray-900">{label}</Text>
    </View>
    <Feather name="chevron-right" size={20} color="#9CA3AF" />
  </TouchableOpacity>
);

export default function HelpCenterScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-[#FFFFFF]">
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>

        {/* --- HEADER --- */}
        <View className="flex-row items-center px-4 py-2 mb-2 relative bg-white pb-4">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 z-10">
            <Feather name="chevron-left" size={20} color="#000000" />
          </TouchableOpacity>
          <View className="absolute left-0 right-0 items-center justify-center pointer-events-none">
            <Text className="text-[24px] font-semibold text-gray-900">Help & Support</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* --- BLOCK 1: ASSISTANCE --- */}
          <View className='bg-white mx-[20px] rounded-[16px] px-6 mt-4 border  border-gray-100'>

            <View className="">
              <HelpItem iconSource={require('../assets/icon/help.png')} label="FAQ" onPress={() => router.push('/faq')} />
              {/* <HelpItem iconName="message-circle" label="Contact Support" onPress={() => {}} /> */}
              {/* <HelpItem iconName="eye" label="Accessibility" onPress={() => {}} isLast={true} /> */}
            </View>

            {/* --- BLOCK 2: LEGAL & INFO --- */}
            <View className="">
              <HelpItem
                iconSource={require('../assets/icon/privacy-icon.png')}
                label="Privacy Policy"
                onPress={() => router.push('/privacy-policy')}
              />
              <HelpItem
                iconSource={require('../assets/icon/paper.png')}
                label="Terms of Service"
                onPress={() => router.push('/terms-of-service')}
              />
              {/* <HelpItem iconName="info" label="About us" onPress={() => {}} /> */}
              {/* <HelpItem iconName="users" label="Partner" onPress={() => {}} isLast={true} /> */}
            </View>
          </View>

          {/* --- BLOCK 3: FEEDBACK --- */}
          {/* <View className="bg-white px-6 mt-6 ">
              <HelpItem iconName="edit-3" label="Feedback" onPress={() => {}} />
              <HelpItem iconName="star" label="Rate us" onPress={() => {}} isLast={true} />
            </View> */}

          {/* --- BLOCK 4: CONNECT --- */}
          {/* <View className="bg-white px-6 mt-6  mb-6">
              <HelpItem 
                iconName="globe" 
                label="Visit Our Website" 
                onPress={() => Linking.openURL('https://himoto.vn')} 
              />
              <HelpItem 
                iconName="hash" 
                label="Follow us on Social Media" 
                onPress={() => {}} 
                isLast={true} 
              />
            </View> */}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}