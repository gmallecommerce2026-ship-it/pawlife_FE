import { Text } from '@/components/AppText';
import { Feather } from '@expo/vector-icons';
import dayjs from 'dayjs';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  AlertTriangle, Calendar,
  Info, Lock,
  ShieldCheck, Sparkles
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, LayoutAnimation, Modal, Platform, RefreshControl, SectionList, TouchableOpacity, TouchableWithoutFeedback, UIManager, View } from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import axiosClient from '../api/axiosClient';
import { groupNotifications } from '../utils/dateUtils';
// Bật thử nghiệm LayoutAnimation trên Android (Bắt buộc để hiệu ứng dồn lên hoạt động trên Android)
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
const getIconByType = (type: string) => {
  const props = { size: 22, color: "#4B5563", strokeWidth: 2 };
  switch (type) {
    case 'TAG': return <AlertTriangle {...props} color="#EF4444" />;
    case 'SECURITY': return <ShieldCheck {...props} color="#10B981" />;
    case 'SYSTEM': return <Info {...props} color="#3B82F6" />;
    case 'PASSWORD': return <Lock {...props} color="#F59E0B" />;
    case 'FEATURE': return <Sparkles {...props} color="#ffa053" />;
    case 'EVENT': return <Calendar {...props} color="#8B5CF6" />;
    default: return <Info {...props} />;
  }
};

// Tạo Animated Component cho Nút bấm
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

// --- Component Item với hiệu ứng Swipe Premium, Parallax & Border Masking ---
const NotificationItem = ({ item, onPress, onDelete, onView }: { item: any, onPress: any, onDelete: any, onView: any }) => {
  const swipeableRef = useRef<Swipeable>(null);
  const slideOutAnim = useRef(new Animated.Value(0)).current;

  // Refs quản lý logic rung & hành động
  const hapticTriggeredRight = useRef(false);
  const hapticTriggeredLeft = useRef(false);
  const isActionFired = useRef(false); 
  
  // Ref MỚI: Dùng để đảm bảo ta chỉ gắn listener đúng 1 lần duy nhất cho mỗi item
  const dragXListenerAttached = useRef(false);
  const [dragXNode, setDragXNode] = useState<any>(null);

  // GẮN SỰ KIỆN TRỰC TIẾP KHÔNG QUA USEEFFECT
  const attachGestureListener = (dragX: any) => {
    // 1. Vẫn lưu dragX vào state để làm UI Opacity (chỉ chạy 1 lần)
    if (!dragXNode) {
      setTimeout(() => setDragXNode(dragX), 0);
    }

    // 2. Gắn sự kiện lắng nghe ĐỒNG BỘ ngay lập tức
    if (!dragXListenerAttached.current && dragX) {
      dragXListenerAttached.current = true;
      
      dragX.addListener(({ value }: { value: number }) => {
        // === VUỐT SANG PHẢI (NÚT XANH) ===
        if (value >= 80 && !hapticTriggeredRight.current) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          hapticTriggeredRight.current = true;
        } else if (value < 80 && hapticTriggeredRight.current) {
          hapticTriggeredRight.current = false;
        }

        if (value > 110 && !isActionFired.current) {
          isActionFired.current = true;
          swipeableRef.current?.close(); 
          setTimeout(() => { onView(item); }, 250);
        }

        // === VUỐT SANG TRÁI (NÚT ĐỎ) ===
        if (value <= -80 && !hapticTriggeredLeft.current) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          hapticTriggeredLeft.current = true;
        } else if (value > -80 && hapticTriggeredLeft.current) {
          hapticTriggeredLeft.current = false;
        }
        
        if (value < -160 && !isActionFired.current) {
          isActionFired.current = true;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); 
          
          Animated.timing(slideOutAnim, {
            toValue: -500, 
            duration: 150, 
            useNativeDriver: true,
          }).start(() => {
            onDelete(item);
          });
        }

        // === RESET ===
        if (Math.abs(value) < 10) {
          isActionFired.current = false;
        }
      });
    }
  };

  // NÚT XEM (XANH LÁ)
  const renderLeftActions = (progress: any, dragX: any) => {
    // Gọi thẳng hàm đính kèm sự kiện ngay khi render action
    attachGestureListener(dragX);
    
    const transX = dragX.interpolate({
      inputRange: [0, 80],
      outputRange: [-20, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={{ width: 80, overflow: 'visible' }}>
        <AnimatedTouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            onView(item);
            swipeableRef.current?.close();
          }}
          style={{
            position: 'absolute', top: 0, bottom: 0, left: 0,
            width: 1000,
            backgroundColor: '#00761D',
            justifyContent: 'center',
            alignItems: 'flex-start',
            paddingLeft: 27,
          }}
        >
          <Animated.View style={{ transform: [{ translateX: transX }] }}>
            <Image
              source={require('../assets/icon/eye.png')}
              style={{ width: 11, height: 8 }}
              resizeMode="cover"
            />
          </Animated.View>
        </AnimatedTouchableOpacity>
      </View>
    );
  };

  // NÚT XÓA (ĐỎ)
  const renderRightActions = (progress: any, dragX: any) => {
    // Gọi thẳng hàm đính kèm sự kiện ngay khi render action
    attachGestureListener(dragX);
    
    const transX = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [0, 20],
      extrapolate: 'clamp',
    });

    return (
      <View style={{ width: 80, overflow: 'visible' }}>
        <AnimatedTouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            // Khi bấm nút rác, chạy animation bay đi thay vì xoá ngay
            isActionFired.current = true;
            Animated.timing(slideOutAnim, {
              toValue: -500,
              duration: 200,
              useNativeDriver: true,
            }).start(() => {
              onDelete(item);
            });
          }}
          style={{
            position: 'absolute', top: 0, bottom: 0, right: 0,
            width: 1000,
            backgroundColor: '#760000',
            justifyContent: 'center',
            alignItems: 'flex-end',
            paddingRight: 27,
          }}
        >
          <Animated.View style={{ transform: [{ translateX: transX }] }}>
            <Image
              source={require('../assets/icon/trash-red.png')}
              style={{ width: 10, height: 11 }}
              resizeMode="cover"
            />
          </Animated.View>
        </AnimatedTouchableOpacity>
      </View>
    );
  };

  const bgColorHex = !item.isRead ? '#FFF4ED' : '#FFFFFF';

  const leftOpacity = dragXNode ? dragXNode.interpolate({
    inputRange: [0, 40],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  }) : 1;

  const rightOpacity = dragXNode ? dragXNode.interpolate({
    inputRange: [-40, 0],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  }) : 1;

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      overshootLeft={true}
      overshootRight={true}
      friction={1}
      overshootFriction={1}
    >
      {/* ĐỔI VIEW NÀY THÀNH ANIMATED.VIEW VÀ THÊM TRANSFORM */}
      <Animated.View style={{ 
        position: 'relative', 
        transform: [{ translateX: slideOutAnim }] 
      }}>
        <Animated.View
          key={dragXNode ? 'left-active' : 'left-static'}
          style={{
            position: 'absolute', top: 0, bottom: 0, left: 0, width: 20,
            backgroundColor: bgColorHex,
            opacity: leftOpacity
          }}
        />
        <Animated.View
          key={dragXNode ? 'right-active' : 'right-static'}
          style={{
            position: 'absolute', top: 0, bottom: 0, right: 0, width: 20,
            backgroundColor: bgColorHex,
            opacity: rightOpacity
          }}
        />

        <View style={{
          borderRadius: 16,
          backgroundColor: bgColorHex,
          overflow: 'hidden',
        }}>
          <TouchableOpacity
            activeOpacity={1}
            className="flex-row justify-center items-center px-5 py-4 border-b border-gray-50"
            onPress={() => onPress(item)}
          >
            <View className="relative mr-4">
              <View className="w-12 h-12 rounded-full border border-gray-50 items-center justify-center bg-white shadow-sm">
                {getIconByType(item.type)}
              </View>
              {!item.isRead && (
                <View className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#ffa053] rounded-full border-2 border-[#FFF4ED]" />
              )}
            </View>

            <View className="flex-1 justify-center">
              <Text className={`text-[12px] text-black ${!item.isRead ? 'font-semibold' : 'font-regular'}`} numberOfLines={3}>

                {item.body} {item.emoji}
              </Text>
              <Text className="text-[10px] text-gray-400 font-medium">
                {dayjs(item.createdAt).format('hh:mm A')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

      </Animated.View>
    </Swipeable>
  );
};

export default function NotificationsScreen() {
  const router = useRouter();
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [popupConfig, setPopupConfig] = useState({
    visible: false, title: '', message: '', type: 'info', buttonText: 'Close'
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const closePopup = () => setPopupConfig(prev => ({ ...prev, visible: false }));

  const fetchNotifications = async (pageNum = 1, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else if (pageNum > 1) setLoadingMore(true);

      const limit = 20;
      const res = await axiosClient.get(`/notifications?page=${pageNum}&limit=${limit}`);
      const newData = res.data.data;

      if (newData.length < limit) setHasMore(false);

      setSections(prevSections => {
        const allData = isRefresh || pageNum === 1
          ? newData
          : [...prevSections.flatMap(s => s.data), ...newData];
        return groupNotifications(allData);
      });
      setPage(pageNum);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false); setRefreshing(false); setLoadingMore(false);
    }
  };

  useEffect(() => { fetchNotifications(1); }, []);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !loading) fetchNotifications(page + 1);
  };

  const handleMarkAllAsRead = async () => {
    try {
      setSections(prevSections => prevSections.map(section => ({
        ...section, data: section.data.map((note: any) => ({ ...note, isRead: true }))
      })));
      await axiosClient.patch('/notifications/read-all');
    } catch (error) {
      console.error("Error mark all as read:", error);
      fetchNotifications(1, true);
    }
  };

  const handleDeleteNotification = async (item: any) => {
    try {
      // 1. Bật LayoutAnimation với preset mượt mà trước khi thay đổi State
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

      // 2. Thực hiện lọc bỏ item khỏi danh sách
      setSections(prevSections => prevSections.map(section => ({
        ...section,
        data: section.data.filter((note: any) => note.id !== item.id)
      })).filter(section => section.data.length > 0)); 
      
      // 3. Xoá ở database dưới nền
      await axiosClient.delete(`/notifications/${item.id}`);
    } catch (error) {
      console.error("Error deleting notification:", error);
      fetchNotifications(1, true); 
    }
  };

  const handleViewNotification = (item: any) => {
    handlePressItem(item);
  };

  const handlePressItem = async (item: any) => {
    if (!item.isRead) {
      axiosClient.patch(`/notifications/${item.id}/read`).catch(console.error);
      setSections(prevSections => prevSections.map(section => ({
        ...section,
        data: section.data.map((note: any) => note.id === item.id ? { ...note, isRead: true } : note)
      })));
    }

    const showCustomAlert = (title: string, message: string, type: 'error' | 'feature' | 'system', buttonText: string) => {
      setPopupConfig({ visible: true, title, message, type, buttonText });
    };

    const isTransferNotification =
      item.title?.toLowerCase().includes('yêu cầu chuyển nhượng') ||
      item.title?.toLowerCase().includes('transfer ownership') ||
      item.title?.toLowerCase().includes('chuyển nhượng');

    if (isTransferNotification && item.referenceId) {
      router.push({
        pathname: '/transfer-ownership',
        params: { petId: item.referenceId }
      });
      return;
    }

    switch (item.type) {
      case 'TAG_SCANNED':
        if (!item.id) return;
        router.push({
          pathname: '/tag-report-detail',
          params: {
            reportId: item.referenceId
          }
        });
        break;
      case 'TAG':
        showCustomAlert(item.title, item.body, "system", "Got it"); break;
      case 'EVENT':
        if (!item.referenceId) { showCustomAlert("Event not found", "This event may have been cancelled.", "error", "Close"); return; }
        router.push(`/event-detail?id=${item.referenceId}`); break;
      case 'SECURITY':
      case 'PASSWORD':
        router.push('/account-security'); break;
      case 'FEATURE':
        if (!item.referenceId) showCustomAlert("New Feature ✨", item.body, "feature", "Awesome"); break;
      case 'SYSTEM':
        showCustomAlert("System Notification", item.body, "system", "Got it"); break;
      default: console.log("Pressed generic notification");
    }
  };

  return (
    <GestureHandlerRootView className="flex-1 bg-white">
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 bg-white z-10 relative">
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 5,
              elevation: 3,
            }}
            className="w-10 h-10 rounded-full items-center justify-center"
          >
            <View className="overflow-hidden rounded-full w-[36px] h-[36px] items-center justify-center"
              style={{
                width: 36,
                height: 36,
                borderRadius: 28,
                borderWidth: 0.5,
                borderTopColor: 'white',
                borderLeftColor: 'white',
                borderBottomColor: 'transparent',
                borderRightColor: 'transparent',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }}>
              <LinearGradient
                colors={['rgba(221, 221, 221, 0.1)', 'rgba(247, 247, 247, 0.5)', '#FFFFFF']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                locations={[0, 0.3, 1]}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 9999 }}
              />
              <Feather name="chevron-left" size={20} color="#000000" />
            </View>
          </TouchableOpacity>
          <View className="absolute left-0 right-0 items-center justify-center pointer-events-none">
            <Text className="text-[20px] font-bold text-gray-900 tracking-tight">Notifications</Text>
          </View>
          {/* <TouchableOpacity
            onPress={() => console.log("Share")}
            activeOpacity={0.7}
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 5,
              elevation: 3,
            }}
            className="w-10 h-10 rounded-full items-center justify-center"
          >
            <View className="overflow-hidden rounded-full w-[36px] h-[36px] items-center justify-center"
              style={{
                width: 36,
                height: 36,
                borderRadius: 28,
                borderWidth: 0.5,
                borderTopColor: 'white',
                borderLeftColor: 'white',
                borderBottomColor: 'transparent',
                borderRightColor: 'transparent',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }}>
              <LinearGradient
                colors={['rgba(221, 221, 221, 0.1)', 'rgba(247, 247, 247, 0.5)', '#FFFFFF']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                locations={[0, 0.3, 1]}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 9999 }}
              />
            <Image
              source={require('../assets/icon/share.png')}
                style={{ width: 16, height: 16 }}
              resizeMode="cover"
            />
            </View>
          </TouchableOpacity> */}
        </View>

        {loading ? (
          <View className="flex-1 justify-center items-center"><ActivityIndicator size="large" color="#ffa053" /></View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <NotificationItem item={item} onPress={handlePressItem} onDelete={handleDeleteNotification} onView={handleViewNotification} />
            )}
            renderSectionHeader={({ section: { title } }) => (
              <View className="bg-white px-5 pt-6 pb-3 flex-row justify-between items-end">
                <Text className="text-gray-900 font-bold text-[18px] capitalize">{title}</Text>
                <TouchableOpacity onPress={handleMarkAllAsRead}>
                  <Text className="text-[#ffa053] font-medium text-[14px]">Mark all as read</Text>
                </TouchableOpacity>
              </View>
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchNotifications(1, true)} tintColor="#ffa053" />}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={loadingMore ? <View className="py-6 items-center"><ActivityIndicator size="small" color="#ffa053" /></View> : null}
            ListEmptyComponent={
              <View className="py-20 items-center justify-center">
                <View className="w-20 h-20 bg-gray-50 rounded-full items-center justify-center mb-4"><Feather name="bell-off" size={32} color="#D1D5DB" /></View>
                <Text className="text-gray-500 font-medium text-[15px]">You have no notifications.</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>

      {/* Popup / Modals */}
      <Modal transparent={true} visible={popupConfig.visible} animationType="fade" onRequestClose={closePopup}>
        <TouchableOpacity className="flex-1 bg-black/50 justify-center items-center px-6" activeOpacity={1} onPress={closePopup}>
          <TouchableWithoutFeedback>
            <View className="bg-white w-full rounded-[28px] p-6 items-center shadow-2xl">
              <View className={`w-16 h-16 rounded-full items-center justify-center mb-5 ${popupConfig.type === 'error' ? 'bg-red-50' : popupConfig.type === 'feature' ? 'bg-[#ffa053]/10' : 'bg-blue-50'}`}>
                {popupConfig.type === 'error' && <AlertTriangle size={32} color="#EF4444" />}
                {popupConfig.type === 'feature' && <Sparkles size={32} color="#ffa053" />}
                {popupConfig.type === 'system' && <Info size={32} color="#3B82F6" />}
              </View>
              <Text className="text-[20px] font-bold text-gray-900 mb-2.5 text-center tracking-tight">{popupConfig.title}</Text>
              <Text className="text-gray-500 text-[15px] text-center mb-8 leading-6 px-2">{popupConfig.message}</Text>
              <TouchableOpacity className="w-full bg-[#ffa053] py-4 rounded-2xl items-center active:bg-[#e88d44] shadow-sm" activeOpacity={0.8} onPress={closePopup}>
                <Text className="text-white font-bold text-[16px]">{popupConfig.buttonText}</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
    </GestureHandlerRootView>
  );
}