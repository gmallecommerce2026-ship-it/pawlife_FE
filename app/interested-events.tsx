import { AntDesign, Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/AppText';
import { AuthContext } from '@/contexts/AuthContext';
import { eventService } from '../services/eventService';

export default function InterestedEventsScreen() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInterestedEvents = async () => {
      if (!user?.id) {
          setLoading(false);
          return;
      }
      try {
        const res = await eventService.getInterestedEvents(user.id);
        if (res.success) {
          setEvents(res.data);
        }
      } catch (error) {
        console.error("Lỗi tải danh sách sự kiện quan tâm:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInterestedEvents();
  }, [user?.id]);

  const renderEventItem = ({ item }: { item: any }) => {
    const startDate = new Date(item.startDate);
    const day = startDate.getDate();
    const month = startDate.toLocaleDateString('en-US', { month: 'short' });

    return (
      <TouchableOpacity 
        activeOpacity={0.8}
        onPress={() => router.push({ pathname: '/event-detail', params: { id: item.id }})}
        className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100 flex-row items-center"
      >
        <Image 
          source={{ uri: item.bannerUrl || 'https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?q=80&w=800&auto=format&fit=crop' }} 
          className="w-20 h-20 rounded-xl bg-gray-100"
        />
        <View className="flex-1 ml-4">
          <Text className="text-base font-bold text-gray-900 mb-1" numberOfLines={2}>
            {item.title}
          </Text>
          <View className="flex-row items-center mb-2">
            <Ionicons name="location-outline" size={14} color="#9CA3AF" />
            <Text className="text-gray-500 text-xs ml-1" numberOfLines={1}>
              {item.locationName}
            </Text>
          </View>
          <View className="flex-row items-center justify-between mt-1">
             <View className="bg-orange-50 px-2 py-1 rounded-md">
                <Text className="text-orange-600 text-xs font-bold">{item.category || 'Event'}</Text>
             </View>
             <Text className="text-gray-800 text-sm font-bold">{day} {month.toUpperCase()}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-[#F9FAFB]">
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        
        {/* --- HEADER --- */}
        <View className="flex-row items-center px-4 py-2 relative bg-white pb-4 shadow-sm z-10 border-b border-gray-100">
            <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 z-10">
                <AntDesign name="left" size={24} color="#1F2937" />
            </TouchableOpacity>
            <View className="absolute left-0 right-0 items-center justify-center pointer-events-none">
                <Text className="text-xl font-bold text-gray-900">Interested Events ({events.length})</Text>
            </View>
        </View>

        {loading ? (
            <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#ffa053" />
            </View>
        ) : events.length === 0 ? (
            // --- EMPTY STATE CONTENT --- 
            <View className="flex-1 items-center justify-center px-6 pb-20">
                <View className="w-32 h-32 bg-blue-50 rounded-full items-center justify-center mb-6">
                    <Feather name="calendar" size={64} color="#3B82F6" />
                </View>
                <Text className="text-2xl font-bold text-gray-900 mb-3 text-center">
                    Have time to spare?
                </Text>
                <Text className="text-base text-gray-500 text-center mb-10 px-4 leading-6">
                    Tap the bookmark icon on events to save them here
                </Text>
                <TouchableOpacity 
                    className="bg-[#F97316] w-full py-4 rounded-full items-center shadow-sm"
                    onPress={() => router.push('/search')} 
                    activeOpacity={0.8}
                >
                    <Text className="text-white text-lg font-bold">Browse Events</Text>
                </TouchableOpacity>
            </View>
        ) : (
            // --- LIST CONTENT --- 
            <FlatList
                data={events}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderEventItem}
                contentContainerStyle={{ padding: 16 }}
                showsVerticalScrollIndicator={false}
            />
        )}

      </SafeAreaView>
    </View>
  );
}