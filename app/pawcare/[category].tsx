import { Text } from '@/components/AppText';
import { useLanguage } from '@/contexts/LanguageContext';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Image, Keyboard, LayoutAnimation, Linking, Modal, Platform, ScrollView, TextInput, TouchableOpacity, TouchableWithoutFeedback, UIManager, View } from 'react-native';
import Animated, {
    interpolate,
    interpolateColor,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import YoutubePlayer from 'react-native-youtube-iframe';
import axiosClient from '../../api/axiosClient';
const { width } = Dimensions.get('window');
const AnimatedFeather = Animated.createAnimatedComponent(Feather);

const translateTime = (timeStr?: string, t?: any) => {
    if (!timeStr) return '';
    if (!t) return timeStr;
    
    let str = timeStr.toLowerCase();
    str = str.replace('just now', t('just now'));
    str = str.replace('years', t('years'));
    str = str.replace('year', t('year'));
    str = str.replace('months', t('months'));
    str = str.replace('month', t('month'));
    str = str.replace('weeks', t('weeks'));
    str = str.replace('week', t('week'));
    str = str.replace('days', t('days'));
    str = str.replace('day', t('day'));
    str = str.replace('hours', t('hours'));
    str = str.replace('hour', t('hour'));
    str = str.replace('minutes', t('minutes'));
    str = str.replace('minute', t('minute'));
    str = str.replace('seconds', t('seconds'));
    str = str.replace('second', t('second'));
    str = str.replace('ago', t('ago'));
    
    return str;
};

// Kích hoạt LayoutAnimation cho Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ==========================================
// DỮ LIỆU HARDCODE CHO PHẦN ABOUT
// ==========================================
const ABOUT_DATA = {
    name: 'BossDog',
    handle: '@bossdogvietnam',
    logo: 'https://img.freepik.com/premium-vector/cool-dog-wearing-sunglasses-hat_23-2148564757.jpg?w=740',
    description: `BossDog | Phương pháp huấn luyện chó Cơ bản & Vệ sinh đúng chỗ!\n\nĐồ dùng cho người nuôi cún (thức ăn, đồ chơi, chuồng nệm, áo, dây dắt...): https://shopee.vn/bossdogvn`,
    links: [
        { id: '1', label: 'Instagram', icon: 'instagram', color: '#E1306C', url: 'https://instagram.com' },
        { id: '2', label: 'Facebook', icon: 'facebook-square', color: '#1877F2', url: 'https://facebook.com' },
        { id: '3', label: 'Website', icon: 'globe', color: '#EA4335', url: 'https://bossdog.vn' },
    ],
    info: [
        { id: '1', label: 'United States', icon: 'location-sharp' },
        { id: '2', label: 'Joined July, 2018', icon: 'calendar-clear' },
        { id: '3', label: '2,547,839,201 views', icon: 'eye' },
    ]
};

// ==========================================
// 1. VIDEOS TAB CONTENT
// ==========================================
const VideosView = ({ data, category, loading, onPlayVideo, t }: any) => {
    if (loading) return <ActivityIndicator size="large" color="#F97316" style={{ marginTop: 50 }} />;
    if (!data || data.length === 0) return <Text className="text-center mt-10 text-gray-500">{t("No videos found.")}</Text>;

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity 
            activeOpacity={0.7} 
            className="flex-row mb-6"
            onPress={() => onPlayVideo(item.url)}
        >
            <View className="w-[160px] h-[90px] rounded-xl overflow-hidden relative bg-gray-200 shadow-sm border border-gray-100">
                <Image source={{ uri: item.thumbnail }} className="w-full h-full" resizeMode="cover" />
                <View className="absolute bottom-1.5 right-1.5 bg-black/80 px-1.5 py-0.5 rounded-md">
                    <Text className="text-white text-[10px] font-bold">{item.duration}</Text>
                </View>
                <View className="absolute inset-0 items-center justify-center bg-black/10">
                    <Ionicons name="play-circle" size={28} color="rgba(255,255,255,0.8)" />
                </View>
            </View>
            <View className="flex-1 ml-3 pr-2">
                <View className="flex-row justify-between items-start">
                    {/* Đã xóa nút 3 chấm ở đây */}
                    <Text className="text-gray-900 font-semibold text-[15px] leading-5 flex-1 mr-2" numberOfLines={2}>{item.title}</Text>
                </View>
                <View className="mt-1">
                    {/* Đã bọc item.time bằng translateTime */}
                    <Text className="text-gray-400 text-xs font-medium">{item.category || category} • {item.views} • {translateTime(item.time, t)}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <FlatList 
            data={data}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 20 }}
            showsVerticalScrollIndicator={false}
        />
    );
};

// ==========================================
// 2. PLAYLISTS TAB CONTENT
// ==========================================
const PlaylistsView = ({ playlists, loading, searchQuery, onPlayVideo, t }: { playlists: any[], loading: boolean, searchQuery: string, onPlayVideo: (url: string) => void, t: any }) => {
    const [selectedPlaylist, setSelectedPlaylist] = useState<any>(null);

    const handleSelectPlaylist = (item: any) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSelectedPlaylist(item);
    };

    const handleBackToList = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSelectedPlaylist(null);
    };

    if (loading) return <ActivityIndicator size="large" color="#F97316" style={{ marginTop: 50 }} />;
    if (!playlists || playlists.length === 0) return <Text className="text-center mt-10 text-gray-500">Chưa có playlist nào phù hợp.</Text>;

    const displayPlaylistVideos = selectedPlaylist 
        ? selectedPlaylist.videos.filter((v: any) => v.title.toLowerCase().includes(searchQuery.toLowerCase()))
        : [];

    const renderPlaylistVideoItem = ({ item, index }: { item: any, index: number }) => (
        <TouchableOpacity 
            activeOpacity={0.7} 
            className="flex-row mb-5 items-center"
            onPress={() => onPlayVideo(item.url)}
        >
            <Text className="text-gray-400 font-bold text-sm w-6 text-center mr-2">{index + 1}</Text>
            <View className="w-[120px] h-[68px] rounded-lg overflow-hidden relative bg-gray-200 border border-gray-100 shadow-sm">
                <Image source={{ uri: item.thumbnail }} className="w-full h-full" resizeMode="cover" />
                <View className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded flex-row items-center">
                    <Text className="text-white text-[9px] font-bold">{item.duration}</Text>
                </View>
            </View>
            <View className="flex-1 ml-3 pr-2">
                <Text className="text-gray-900 font-semibold text-[14px] leading-5" numberOfLines={2}>{item.title}</Text>
                {/* Dịch thời gian ở item video trong playlist */}
                <Text className="text-gray-500 text-[11px] font-medium mt-1">{item.views} • {translateTime(item.time, t)}</Text>
            </View>
        </TouchableOpacity>
    );

    const renderPlaylistItem = ({ item }: { item: any }) => (
        <TouchableOpacity activeOpacity={0.8} className="flex-row mb-6 items-center" onPress={() => handleSelectPlaylist(item)}>
            <View className="w-[160px] h-[90px] rounded-xl overflow-hidden relative bg-gray-200 shadow-sm border border-gray-100">
                <Image source={{ uri: item.thumbnail }} className="w-full h-full" resizeMode="cover" />
                <View className="absolute right-0 top-0 bottom-0 w-11 bg-black/60 items-center justify-center py-3 backdrop-blur-sm border-l border-white/20">
                    <Text className="text-white text-[11px] font-bold mb-1">{item.count || 0}</Text>
                    <Ionicons name="list" size={16} color="white" />
                </View>
            </View>
            <View className="flex-1 ml-4 justify-center">
                <View className="flex-row justify-between items-start">
                    <View className="flex-1 pr-2">
                        <Text className="text-gray-900 font-bold text-[15px] mb-1 leading-5" numberOfLines={2}>{item.title}</Text>
                        <Text className="text-gray-500 text-xs font-medium">{item.count || 0} videos • Updated today</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    if (selectedPlaylist) {
        return (
            <View className="flex-1 bg-white">
                <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <TouchableOpacity onPress={handleBackToList} className="p-2 -ml-2 mr-2 bg-white rounded-full shadow-sm shadow-gray-200 active:bg-gray-100">
                        <Ionicons name="arrow-back" size={20} color="#374151" />
                    </TouchableOpacity>
                    <View className="flex-1 pr-4">
                        <Text className="font-bold text-gray-900 text-base leading-5" numberOfLines={1}>{selectedPlaylist.title}</Text>
                        <Text className="text-gray-500 text-[11px] font-medium">{selectedPlaylist.count || 0} videos • Public</Text>
                    </View>
                </View>
                <FlatList 
                    data={displayPlaylistVideos}
                    keyExtractor={(item) => item.id}
                    renderItem={renderPlaylistVideoItem}
                    contentContainerStyle={{ padding: 20, paddingTop: 16 }}
                />
            </View>
        );
    }

    return (
        <FlatList 
            data={playlists}
            keyExtractor={(item) => item.id}
            renderItem={renderPlaylistItem}
            contentContainerStyle={{ padding: 20 }}
        />
    );
};

// ==========================================
// 3. ABOUT TAB CONTENT
// ==========================================
const AboutView = () => {
    return (
        <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 24, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
            {/* ... (Phần UI About giữ nguyên) ... */}
            <View className="items-center mb-8">
                <View className="w-20 h-20 mb-4 rounded-full border border-gray-100 shadow-sm overflow-hidden bg-white">
                     <Image source={{ uri: ABOUT_DATA.logo }} className="w-full h-full" resizeMode="contain" />
                </View>
                <Text className="text-xl font-bold text-gray-900 mb-1">{ABOUT_DATA.name}</Text>
                <Text className="text-blue-500 font-medium text-sm">{ABOUT_DATA.handle}</Text>
            </View>

            <View className="mb-8">
                <Text className="text-base font-bold text-gray-900 mb-3">Description</Text>
                <Text className="text-gray-600 text-sm leading-6">{ABOUT_DATA.description}</Text>
            </View>

            {/* <View className="mb-8">
                <Text className="text-base font-bold text-gray-900 mb-4">Links</Text>
                <View className="gap-5">
                    {ABOUT_DATA.links.map((link) => (
                        <TouchableOpacity key={link.id} className="flex-row items-center active:opacity-70" onPress={() => Linking.openURL(link.url)}>
                            <View className="w-8 items-center mr-3">
                                {link.label === 'Website' ? <MaterialCommunityIcons name="web" size={24} color={link.color} /> : <AntDesign name={link.icon as any} size={22} color={link.color} />}
                            </View>
                            <Text className="text-gray-800 text-[15px] font-medium flex-1">{link.label}</Text>
                            <Feather name="external-link" size={16} color="#9CA3AF" />
                        </TouchableOpacity>
                    ))}
                </View>
            </View> */}
        </ScrollView>
    );
};

// ==========================================
// MAIN SCREEN
// ==========================================
export default function PawcareCategoryScreen() {
  const router = useRouter();
  const { category } = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const { t } = useLanguage();

  const categoryTitle = typeof category === 'string' ? category : 'Training';

  const [activeTab, setActiveTab] = useState('Videos');
  const [videos, setVideos] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // STATE: Quản lý ID của video đang được phát in-app
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  
  // SEARCH
  const [isSearchActive, setIsSearchActive] = useState(false);
  const searchAnimation = useSharedValue(0);
  const inputRef = useRef<TextInput>(null);

  const handleOpenSearch = () => {
    // 1. Tự động chuyển về tab Videos nếu đang ở tab khác
    if (activeTab !== 'Videos') {
      setActiveTab('Videos');
    }
    
    setIsSearchActive(true);
    // 2. Chạy animation mở rộng
    searchAnimation.value = withTiming(1, { duration: 300 });
    // 3. Focus vào ô input sau khi mở
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  const handleCloseSearch = () => {
    Keyboard.dismiss();
    // Chạy animation thu nhỏ
    searchAnimation.value = withTiming(0, { duration: 250 }, () => {
      runOnJS(setIsSearchActive)(false);
      runOnJS(setSearchQuery)(""); // Xóa text khi đóng
    });
  };

  // --- ANIMATED STYLES ---
  // Ẩn/hiện nút Back (scale nhỏ lại và mờ đi)
  const backButtonStyle = useAnimatedStyle(() => ({
    opacity: interpolate(searchAnimation.value, [0, 0.2], [1, 0]),
    transform: [{ scale: interpolate(searchAnimation.value, [0, 0.2], [1, 0.8]) }],
    zIndex: searchAnimation.value > 0 ? -1 : 1, // Đẩy xuống dưới khi ẩn để không chặn click
  }));

  // Ẩn/hiện Title ở giữa
  const titleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(searchAnimation.value, [0, 0.5], [1, 0]),
  }));

  // Container của thanh Search (kéo dài từ phải sang trái)
  const searchContainerStyle = useAnimatedStyle(() => {
    // Chiều dài thay đổi từ 40 (chỉ hiện icon) sang full chiều rộng (trừ margin)
    const containerWidth = interpolate(searchAnimation.value, [0, 1], [40, width - 32]);
    const backgroundColor = interpolateColor(
      searchAnimation.value,
      [0, 1],
      ['transparent', '#F3F4F6'] // Từ trong suốt sang xám nhạt (bg-gray-100)
    );

    return {
      width: containerWidth,
      backgroundColor,
      borderRadius: 20,
      flexDirection: 'row',
      alignItems: 'center',
      height: 40,
    };
  });

  const textInputStyle = useAnimatedStyle(() => ({
    opacity: interpolate(searchAnimation.value, [0, 0.8, 1], [0, 0, 1]),
    flex: 1,
    display: searchAnimation.value === 0 ? 'none' : 'flex',
  }));

  const searchIconStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      searchAnimation.value,
      [0, 1],
      ['#1F2937', '#9CA3AF'] // Đen sậm sang Xám nhạt khi mở
    );
    return { color };
  });
  const TABS = ['Videos', 'Playlists', 'About'];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [videosRes, playlistsRes] = await Promise.all([
          axiosClient.get(`/pawcare/videos?category=${categoryTitle}`),
          axiosClient.get(`/pawcare/playlists?category=${categoryTitle}`)
        ]);
        
        const finalVideos = Array.isArray(videosRes.data) ? videosRes.data : videosRes.data?.data || [];
        const finalPlaylists = Array.isArray(playlistsRes.data) ? playlistsRes.data : playlistsRes.data?.data || [];

        setVideos(finalVideos); 
        setPlaylists(finalPlaylists);
      } catch (error) {
        console.error("Lỗi fetch pawcare data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [categoryTitle]);

  const filteredVideos = useMemo(() => {
    if (!searchQuery) return videos;
    return videos.filter((v: any) => v.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [videos, searchQuery]);

  const filteredPlaylists = useMemo(() => {
    if (!searchQuery) return playlists;
    return playlists.filter((p: any) => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [playlists, searchQuery]);

  // HÀM: Tách Video ID từ link Youtube
  const extractYoutubeId = (url: string) => {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = url.match(regExp);
      return (match && match[2].length === 11) ? match[2] : null;
  };

  // HÀM: Xử lý khi user bấm nút Play
  const handlePlayVideo = useCallback((url?: string) => {
      if (!url) {
          Alert.alert("Thông báo", "Video này đang được cập nhật đường dẫn, vui lòng quay lại sau!");
          return;
      }
      const ytId = extractYoutubeId(url);
      if (ytId) {
          setPlayingVideoId(ytId); // Mở Modal phát video in-app
      } else {
          // Fallback: Nếu không phải link youtube (vd link mp4, website khác), mở bằng trình duyệt
          Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
      }
  }, []);

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        {/* VÙNG CHẠM ĐỂ TẮT KEYBOARD KHI ĐANG SEARCH */}
        {isSearchActive && (
        <TouchableWithoutFeedback onPress={handleCloseSearch}>
            <View className="absolute inset-0 z-40 bg-transparent" />
        </TouchableWithoutFeedback>
        )}

        {/* HEADER */}
        <View className="flex-row items-center justify-between px-4 py-2 border-b border-gray-50 bg-white z-50 h-[56px] relative">
        
        {/* Nút Back (Bị ẩn khi Search) */}
        <Animated.View style={[backButtonStyle, { position: 'absolute', left: 16 }]}>
            <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 active:bg-gray-100 rounded-full">
            <Feather name="chevron-left" size={20} color="#000000" />
            </TouchableOpacity>
        </Animated.View>

        {/* Title ở giữa (Bị ẩn khi Search) */}
        <Animated.View style={[titleStyle, { position: 'absolute', left: 0, right: 0, alignItems: 'center' }]} pointerEvents="none">
            <Text className="text-lg font-bold text-gray-900 tracking-tight">{categoryTitle}</Text>
        </Animated.View>

        {/* Cụm Search Bar (Nằm bên phải và dãn ra) */}
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
            {/* Chỉ hiển thị Search cụm này nếu KHÔNG PHẢI tab About */}
            {activeTab !== 'About' && (
            <Animated.View style={searchContainerStyle}>
                
                {/* Nút kính lúp */}
                <TouchableOpacity 
                onPress={isSearchActive ? undefined : handleOpenSearch} 
                activeOpacity={isSearchActive ? 1 : 0.7}
                className="w-[40px] h-[40px] items-center justify-center rounded-full"
                >
                <AnimatedFeather name="search" size={22} style={searchIconStyle} />
                </TouchableOpacity>

                {/* Ô Input (Hiện ra khi animate) */}
                <Animated.View style={[textInputStyle, { paddingRight: 12 }]}>
                <TextInput
                    ref={inputRef}
                    className="flex-1 text-gray-900 text-[15px] py-0 h-full"
                    placeholder={t("Search videos...")} 
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor="#9CA3AF"
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')} className="p-1">
                    <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                )}
                </Animated.View>

            </Animated.View>
            )}
        </View>
        </View>

        {/* TABS HEADER */}
        <View className="flex-row border-b border-gray-100 bg-white z-10">
            {TABS.map((tab) => {
                const isActive = activeTab === tab;
                return (
                    <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} className={`flex-1 items-center py-3.5 border-b-[2.5px] ${isActive ? 'border-[#F97316]' : 'border-transparent'}`}>
                        <Text className={`text-[14px] ${isActive ? 'text-[#F97316] font-bold' : 'text-gray-500 font-semibold'}`}>{tab}</Text>
                    </TouchableOpacity>
                )
            })}
        </View>

        {/* TABS CONTENT */}
        <View className="flex-1 bg-white">
            {activeTab === 'Videos' && <VideosView data={filteredVideos} category={categoryTitle} loading={loading} onPlayVideo={handlePlayVideo} t={t} />}
            {activeTab === 'Playlists' && <PlaylistsView playlists={filteredPlaylists} loading={loading} searchQuery={searchQuery} onPlayVideo={handlePlayVideo} t={t} />}
            {activeTab === 'About' && <AboutView />}
        </View>

        {/* ==========================================
            MODAL TRÌNH PHÁT VIDEO IN-APP
            ========================================== */}
        <Modal
            visible={!!playingVideoId}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setPlayingVideoId(null)}
        >
            {/* Thay SafeAreaView bằng View và dùng padding top linh động */}
            <View 
                className="flex-1 bg-black" 
                style={{ paddingTop: insets.top }} 
            >
                {/* Header chứa nút đóng */}
                <View className="flex-row justify-end px-4 py-2 mt-2">
                    <TouchableOpacity 
                        className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
                        onPress={() => setPlayingVideoId(null)}
                        activeOpacity={0.7}
                        // hitSlop giúp mở rộng vùng bấm thêm 15px ra xung quanh mà không làm to nút
                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }} 
                    >
                        <Ionicons name="close" size={24} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Container căn giữa Video */}
                <View className="flex-1 justify-center pb-20"> 
                    {playingVideoId && (
                        <YoutubePlayer
                            height={300}
                            play={true}
                            videoId={playingVideoId}
                            webViewStyle={{ opacity: 0.99 }}
                        />
                    )}
                </View>
            </View>
        </Modal>

      </SafeAreaView>
    </View>
  );
}