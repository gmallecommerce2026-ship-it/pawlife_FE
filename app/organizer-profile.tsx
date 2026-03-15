// app/organizer-profile.tsx
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/AppText';
// --- MOCK DATA ---
const ORGANIZER = {
  name: 'Pet Art Collective',
  handle: '@petartcollective',
  avatar: 'https://images.unsplash.com/photo-1517260739337-6799d239ce83?q=80&w=500&auto=format&fit=crop', // Ảnh tòa nhà/clock tower giả lập
};

const ORGANIZER_EVENTS = [
  {
    id: 1,
    title: 'Dog art therapy & painting class',
    location: 'New York',
    date: 'Mon, Dec 23',
    image: 'https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?q=80&w=400&auto=format&fit=crop',
  },
  {
    id: 2,
    title: 'Pet portrait photography workshop',
    location: 'Washington DC',
    date: 'Tue, Dec 16',
    image: null, // Trường hợp không có ảnh (hiển thị placeholder)
  },
];

const TABS = ['Events', 'Collections', 'About'];

export default function OrganizerProfileScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Events');

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      
      {/* --- HEADER --- */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-50">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <Feather name="chevron-left" size={28} color="#1F2937" />
        </TouchableOpacity>
        
        <Text className="text-lg font-bold text-gray-900">Organizer</Text>
        
        <TouchableOpacity className="p-2 -mr-2">
          <MaterialCommunityIcons name="dots-vertical" size={24} color="#1F2937" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* --- PROFILE INFO --- */}
        <View className="items-center mt-6 mb-6">
          <View className="w-24 h-24 rounded-full overflow-hidden shadow-sm border border-gray-100 mb-4">
             <Image source={{ uri: ORGANIZER.avatar }} className="w-full h-full" resizeMode="cover" />
          </View>
          <Text className="text-xl font-bold text-gray-900 mb-1">{ORGANIZER.name}</Text>
          <Text className="text-blue-400 font-medium text-sm">{ORGANIZER.handle}</Text>
        </View>

        {/* --- TABS --- */}
        <View className="flex-row border-b border-gray-100 mb-6">
            {TABS.map((tab) => {
                const isActive = activeTab === tab;
                return (
                    <TouchableOpacity 
                        key={tab} 
                        onPress={() => setActiveTab(tab)}
                        className={`flex-1 items-center py-3 border-b-2 ${isActive ? 'border-orange-400' : 'border-transparent'}`}
                    >
                        <Text className={`font-medium text-base ${isActive ? 'text-orange-500' : 'text-gray-400'}`}>
                            {tab}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>

        {/* --- CONTENT LIST (EVENTS) --- */}
        <View className="px-5">
            {activeTab === 'Events' && (
                <View className="gap-4">
                    {ORGANIZER_EVENTS.map((event) => (
                        <TouchableOpacity 
                            key={event.id}
                            className="bg-white rounded-2xl p-3 shadow-sm shadow-gray-200 border border-gray-100 flex-row"
                            activeOpacity={0.7}
                        >
                            {/* Thumbnail */}
                            <View className="w-24 h-24 rounded-xl bg-gray-100 overflow-hidden">
                                {event.image ? (
                                    <Image source={{ uri: event.image }} className="w-full h-full" resizeMode="cover" />
                                ) : (
                                    <View className="w-full h-full items-center justify-center bg-gray-50">
                                        <Ionicons name="image-outline" size={32} color="#D1D5DB" />
                                    </View>
                                )}
                            </View>

                            {/* Content */}
                            <View className="flex-1 ml-4 py-1 justify-between">
                                <View>
                                    <View className="flex-row justify-between items-start">
                                        <Text className="text-gray-900 font-bold text-[15px] flex-1 mr-2 leading-5" numberOfLines={2}>
                                            {event.title}
                                        </Text>
                                        <TouchableOpacity>
                                            <Feather name="bookmark" size={20} color="#6B7280" />
                                        </TouchableOpacity>
                                    </View>
                                    <Text className="text-gray-400 text-xs mt-1">{event.location}</Text>
                                </View>

                                {/* Date Row */}
                                <View className="flex-row items-center">
                                    <Feather name="calendar" size={14} color="#ffa053" />
                                    <Text className="text-gray-500 text-xs font-medium ml-1.5">{event.date}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* Placeholder cho các tab chưa có nội dung */}
            {(activeTab === 'Collections' || activeTab === 'About') && (
                <View className="items-center justify-center py-10">
                    <Text className="text-gray-400">No content available yet.</Text>
                </View>
            )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}