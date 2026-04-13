import { Text } from '@/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Image, ScrollView, TextInput, TouchableOpacity, View } from 'react-native';

export default function TransferOwnershipScreen() {
  // Trạng thái cho phương thức liên lạc
  const [contactMethod, setContactMethod] = useState<'email' | 'phone'>('email');
  const [contactValue, setContactValue] = useState('');

  // Hardcode data cho UI
  const mockPet = {
    name: 'Luna',
    image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&q=80',
    age: '2 years',
    breed: 'Mixed Breed',
    id: 'PL-0001',
  };

  const mockCurrentOwner = {
    name: 'Jane Doe',
    avatar: 'https://i.pravatar.cc/150?u=jane',
  };

  return (
    <ScrollView 
      contentContainerStyle={{ 
        alignItems: 'center', 
        paddingTop: 60, 
        backgroundColor: '#FFFFFF', 
        paddingBottom: 40,
        paddingHorizontal: 20 // Sử dụng padding thay vì fix cứng width của thẻ con
      }}
      showsVerticalScrollIndicator={false}
      className="flex-1 bg-white"
    >
      {/* Header */}
      <View className="flex-row items-center w-full mb-6">
        <TouchableOpacity className="p-2 -ml-2">
          <Ionicons name="chevron-back" size={24} color="black" />
        </TouchableOpacity>
        <Text className="flex-1 text-[20px] font-semibold text-center mr-8 text-black">
          Transfer Ownership
        </Text>
      </View>

      {/* Pet Info Card (Gradient Background) */}
      <LinearGradient
        colors={['rgba(251,240,246,0.6)', 'rgba(249,236,243,1)', 'rgba(248,232,241,1)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="flex-row items-center w-full h-[92px] px-[14px] rounded-[16px] mb-[24px]"

        style={{ 
          elevation: 2, 
          shadowColor: '#000', 
          shadowOpacity: 0.1, 
          shadowRadius: 4, 
          shadowOffset: { width: 0, height: 2 }, 
          borderRadius: 16
        }}
      >
        <View className='flex-row w-full p-[14px] rounded-[16px]'>
            {/* Pet Avatar */}
            <Image
            source={{ uri: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&q=80' }} 
            className="w-[64px] h-[64px] rounded-[12px]"
            />
            
            {/* Pet Details - Dùng flex-1 để chiếm phần không gian trống, không dùng w-full */}
            <View className="flex-1 flex-col justify-center ml-[12px] h-[64px]">
            <Text className="text-[16px] font-semibold text-black">
                Luna
            </Text>
            <Text className="text-[12px] font-normal text-[#8E8E93] mt-[6px]">
                2 years • Mixed Breed
            </Text>
            <Text className="text-[12px] font-normal text-[#8E8E93] mt-[2px]">
                ID: PL-0001
            </Text>
            </View>

            {/* Action Icon */}
            <TouchableOpacity className="h-[64px] justify-center items-center pl-2">
            <Ionicons name="ellipsis-vertical" size={20} color="#8E8E93" />
            </TouchableOpacity>
        </View>
      </LinearGradient>
      <View className='mt-[24px]'>
        <LinearGradient
            colors={['#FFF9F0', '#FFFFFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{borderRadius: 16}}
            className="w-full rounded-[16px] border border-[#FFE4CC] p-5 mb-8 p-[22px]"
        >
            {/* Top Row: Current Owner -> Pending -> New Owner */}
            <View className="flex-row justify-between items-start w-full pb-[21px] px-[22px] pt-[30px] border-t border-l border-r rounded-t-[16px] border-[#FFE4CC]">
                
                {/* Current Owner */}
                <View className="items-center w-[80px]">
                    <Image 
                    source={{ uri: mockCurrentOwner.avatar }} 
                    className="w-[60px] h-[60px] rounded-full border-[2px] border-[#FF9F5A] mb-2"
                    />
                    <Text className="text-[14px] font-medium text-black text-center">{mockCurrentOwner.name}</Text>
                    <Text className="text-[11px] text-[#8E8E93] text-center mt-0.5">Current Owner</Text>
                </View>

                {/* Pending Indicator */}
                <View className="flex-1 items-center justify-center px-2 mt-4">
                    {/* Đường kẻ ngang dùng absolute để nằm dưới icon */}
                    <View className="w-full h-[2px] bg-[#FFE4CC] absolute top-[11px]" />
                    <View className="justify-center items-center w-[24px] h-[24px] bg-[#FFF9F0] rounded-full z-10">
                    <Ionicons name="time" size={16} color="#FEA766" />
                    </View>
                    <Text className="text-[12px] font-semibold text-[#FEA766] text-center mt-2">
                    Pending...
                    </Text>
                </View>

                {/* New Owner */}
                <View className="items-center w-[80px]">
                    <View className="w-[60px] h-[60px] rounded-full border-[2px] border-dashed border-[#757575] bg-[#E5E5E5] justify-center items-center mb-2">
                    <Ionicons name="person" size={24} color="#757575" />
                    </View>
                    <Text className="text-[14px] font-medium text-[#757575] text-center">New Owner</Text>
                    <Text className="text-[11px] text-[#8E8E93] text-center mt-0.5">Awaiting</Text>
                </View>

            </View>
            
            <View className='w-full h-[1px]'>
                <View className='mx-[22px] h-full items-center justify-center bg-[#FFE4CC] px-[22px]'></View>
            </View>

            {/* Contact Method Title */}
            <View className="flex-row items-center pt-[21px] px-[22px] border-l border-r border-[#FFE4CC]">
                <Ionicons name="mail" size={16} color="#FEA766" className="mr-2" />
                <Text className="text-[16px] font-semibold text-[#FEA766]">
                    New Owner Contact
                </Text>
            </View>


            {/* Toggle (Email / Phone) */}
            <View className="border-l border-r border-[#FFE4CC]  pt-[16px] pb-[21px]">
                <View className='bg-[#f0f0f5] mx-[22px] rounded-[10px] h-[36px] flex-row '>
                    <TouchableOpacity 
                        // onPress={() => setContactMethod('email')}
                        className={`flex-1 rounded-[8px] flex-row justify-center items-center ${contactMethod === 'email' ? 'bg-white shadow-sm' : ''}`}
                        style={contactMethod === 'email' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 } : {}}
                    >
                        <Ionicons name="mail-outline" size={14} color={contactMethod === 'email' ? 'black' : '#8E8E93'} />
                        <Text className={`text-[13px] font-semibold ml-1 ${contactMethod === 'email' ? 'text-black' : 'text-[#8E8E93]'}`}>
                        Email
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        // onPress={() => setContactMethod('phone')}
                        className={`flex-1 rounded-[8px] flex-row justify-center items-center ${contactMethod === 'phone' ? 'bg-white shadow-sm' : ''}`}
                        style={contactMethod === 'phone' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 } : {}}
                    >
                        <Ionicons name="call-outline" size={14} color={contactMethod === 'phone' ? 'black' : '#8E8E93'} />
                        <Text className={`text-[13px] font-semibold ml-1 ${contactMethod === 'phone' ? 'text-black' : 'text-[#8E8E93]'}`}>
                        Phone
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Input Field */}
            <View className="w-full px-[22px] border-b border-l border-r rounded-b-[16px] border-[#FFE4CC] pb-[30px]">
            <Text className="text-[13px] font-medium text-black mb-[12px]">
                {contactMethod === 'email' ? "New Owner's Email Address" : "New Owner's Phone Number"}
            </Text>
            <View className="bg-white justify-center w-full h-[48px] rounded-[12px] border border-[#E5E5E5] px-4">
                <TextInput 
                className="text-[14px] text-black w-full"
                placeholder={contactMethod === 'email' ? "newowner@email.com" : "+1 234 567 890"}
                placeholderTextColor="#B8B8B8"
                keyboardType={contactMethod === 'email' ? "email-address" : "phone-pad"}
                autoCapitalize="none"
                value={contactValue}
                onChangeText={setContactValue}
                />
            </View>
            </View>
        </LinearGradient>
      </View>

      {/* Bottom Button */}
      <TouchableOpacity 
        className="bg-[#FEA766] w-full h-[52px] rounded-[16px] flex-row justify-center items-center mt-[38px]"
        style={{ shadowColor: '#FEA766', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
        activeOpacity={0.8}
      >
        <Ionicons name="paper-plane-outline" size={18} color="white" />
        <Text className="text-[16px] font-bold text-white ml-2">
          Send Confirmation
        </Text>
      </TouchableOpacity>
      
    </ScrollView>
  );
}