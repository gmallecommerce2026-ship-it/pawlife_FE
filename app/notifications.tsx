import { Feather } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useRouter } from 'expo-router';
import {
  AlertTriangle, Calendar, ChevronLeft, Info, Lock, ShieldCheck, Sparkles
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, SectionList, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axiosClient from '../api/axiosClient';
import { groupNotifications } from './utils/dateUtils';

import { Text } from '@/components/AppText';
const getIconByType = (type: string) => {
  const props = { size: 24, color: "#4B5563", strokeWidth: 1.5 };
  switch (type) {
    case 'TAG': return <AlertTriangle {...props} />;
    case 'SECURITY': return <ShieldCheck {...props} />;
    case 'SYSTEM': return <Info {...props} />;
    case 'PASSWORD': return <Lock {...props} />;
    case 'FEATURE': return <Sparkles {...props} />;
    case 'EVENT': return <Calendar {...props} />;
    default: return <Info {...props} />;
  }
};

export default function NotificationsScreen() {
  const router = useRouter();
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Trạng thái phân trang
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchNotifications = async (pageNum = 1, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else if (pageNum > 1) setLoadingMore(true);
      
      const limit = 20; // Đồng bộ với DTO mặc định
      const res = await axiosClient.get(`/notifications?page=${pageNum}&limit=${limit}`);
      const newData = res.data.data;
      
      if (newData.length < limit) {
          setHasMore(false);
      }

      setSections(prevSections => {
          // Nếu là refresh, gộp dữ liệu mới hoàn toàn
          const allData = isRefresh || pageNum === 1 
              ? newData 
              : [...prevSections.flatMap(s => s.data), ...newData];
          return groupNotifications(allData);
      });
      setPage(pageNum);
    } catch (error) {
      console.error("Lỗi tải thông báo:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchNotifications(1);
  }, []);

  const handleLoadMore = () => {
      if (!loadingMore && hasMore && !loading) {
          fetchNotifications(page + 1);
      }
  };

  const handleMarkAllAsRead = async () => {
    try {
      // Optimistic update UI trước để tạo cảm giác mượt mà
      setSections(prevSections => prevSections.map(section => ({
        ...section,
        data: section.data.map((note: any) => ({ ...note, isRead: true }))
      })));
      
      // Gọi API cập nhật
      await axiosClient.patch('/notifications/read-all');
    } catch (error) {
      console.error("Lỗi mark all as read:", error);
      // Nếu lỗi có thể rollback lại state hoặc fetch lại từ đầu
      fetchNotifications(1, true); 
    }
  };

  const handlePressItem = async (item: any) => {
    // 1. Đánh dấu đã đọc (chạy ngầm cập nhật state)
    if (!item.isRead) {
        axiosClient.patch(`/notifications/${item.id}/read`).catch(console.error);
        setSections(prevSections => prevSections.map(section => ({
            ...section,
            data: section.data.map((note: any) => 
                note.id === item.id ? { ...note, isRead: true } : note
            )
        })));
    }

    // 2. Xử lý điều hướng đa dạng theo TYPE
    switch (item.type) {
        case 'TAG':
            // QUAN TRỌNG: Màn hình này cần ID của thông báo
            router.push(`/tag-report-detail?id=${item.id}`); 
            break;

        case 'EVENT':
            // QUAN TRỌNG: Màn hình này cần ID của sự kiện (referenceId)
            if (!item.referenceId) {
                alert("Sự kiện này không tồn tại hoặc đã bị xóa.");
                return;
            }
            router.push(`/event-detail?id=${item.referenceId}`);
            break;

        case 'SECURITY':
        case 'PASSWORD':
            router.push('/account-security'); 
            break;

        case 'FEATURE':
            if (item.referenceId) {
               // router.push(`/blog-detail?id=${item.referenceId}`);
            } else {
                alert("Tính năng mới: \n" + item.body);
            }
            break;

        case 'SYSTEM':
            alert("Thông báo hệ thống: \n" + item.body);
            break;

        default:
            console.log("Pressed generic notification");
    }
};

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
        activeOpacity={0.7}
        className={`flex-row items-start px-6 py-5 border-b border-gray-50 ${!item.isRead ? 'bg-blue-50/30' : 'bg-white'}`}
        onPress={() => handlePressItem(item)}
    >
        <View className="w-12 h-12 rounded-full border border-gray-200 items-center justify-center mr-4 mt-1 bg-white">
            {getIconByType(item.type)}
        </View>

        <View className="flex-row flex-1 mr-2">
            <View className="flex-1 mr-2">
                <View className="flex-row items-center mb-1.5">
                    <Text className="text-gray-900 font-bold text-[16px] mr-1.5 leading-tight flex-1" numberOfLines={1}>
                        {item.title}
                    </Text>
                    <Text className="text-[14px]">{item.emoji}</Text>
                </View>
                <Text className="text-gray-500 text-[14px] leading-5 font-normal mb-2.5 text-justify" numberOfLines={2}>
                    {item.body}
                </Text>
                <Text className="text-gray-400 text-xs font-medium">
                    {dayjs(item.createdAt).format('HH:mm A')}
                </Text>
            </View>

            <View className="justify-center items-center">
                {!item.isRead && (
                    <View className="w-2.5 h-2.5 bg-[#F97316] rounded-full mb-2" />
                )}
                <Feather name="chevron-right" size={20} color="#D1D5DB" />
            </View>
        </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-50 bg-white z-10">
            <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
                <ChevronLeft size={28} color="#1F2937" />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-gray-900">Notification</Text>
            <TouchableOpacity onPress={handleMarkAllAsRead}>
                <Text className="text-[#ffa053] font-medium">Read All</Text>
            </TouchableOpacity>
        </View>

        {loading ? (
            <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#ffa053" />
            </View>
        ) : (
            <SectionList
                sections={sections}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                renderSectionHeader={({ section: { title } }) => (
                    <View className="bg-white px-6 pt-6 pb-2">
                        <Text className="text-gray-400 font-medium text-sm">{title}</Text>
                    </View>
                )}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => fetchNotifications(1, true)} />
                }
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                    loadingMore ? (
                        <View className="py-4 items-center">
                            <ActivityIndicator size="small" color="#ffa053" />
                        </View>
                    ) : null
                }
                ListEmptyComponent={
                    <View className="py-10 items-center">
                        <Text className="text-gray-500">You have no notifications.</Text>
                    </View>
                }
            />
        )}
      </SafeAreaView>
    </View>
  );
}