import { Text } from '@/components/AppText';
import { useLanguage } from '@/contexts/LanguageContext';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
// DỮ LIỆU HARDCODE CHO PHẦN ABOUT — theo từng kênh YouTube
// ==========================================
// Lưu ý: KHÔNG gọi useLanguage() ở đây (top-level module) vì hook chỉ được
// phép gọi bên trong component. isVi sẽ được tính bên trong component và
// truyền xuống AboutView qua props.

interface ChannelLink {
  id: string;
  label: string;
  icon: string;
  color: string;
  url: string;
}

interface ChannelInfo {
  id: string;
  label: string;
  icon: string;
}

interface ChannelProfile {
  name: string;
  handle: string;
  logo: string;
  description: { vi: string; en: string };
  links: ChannelLink[];
  info: ChannelInfo[];
}

const PAWCARE_CHANNELS = {
  // Dùng cho category: Training (Huấn luyện)
  bossdog: {
    name: 'BossDog',
    handle: '@bossdogvietnam',
    logo: 'https://img.freepik.com/premium-vector/cool-dog-wearing-sunglasses-hat_23-2148564757.jpg?w=740',
    description: {
      vi: `BossDog | Phương pháp huấn luyện chó Cơ bản & Vệ sinh đúng chỗ!\n\nĐồ dùng cho người nuôi cún (thức ăn, đồ chơi, chuồng nệm, áo, dây dắt...): https://shopee.vn/bossdogvn`,
      en: `BossDog | Basic Dog Training & Potty Training Methods!\n\nSupplies for dog owners (food, toys, crates/beds, clothes, leashes...): https://shopee.vn/bossdogvn`,
    },
    links: [
      { id: '1', label: 'Instagram', icon: 'instagram', color: '#E1306C', url: 'https://instagram.com' },
      { id: '2', label: 'Facebook', icon: 'facebook-square', color: '#1877F2', url: 'https://facebook.com' },
      { id: '3', label: 'Website', icon: 'globe', color: '#EA4335', url: 'https://bossdog.vn' },
    ],
    info: [
      { id: '1', label: 'United States', icon: 'location-sharp' },
      { id: '2', label: 'Joined July, 2018', icon: 'calendar-clear' },
      { id: '3', label: '2,547,839,201 views', icon: 'eye' },
    ],
  },
  // Dùng cho category: Nutrition, Health, Beauty (Dinh dưỡng, Sức khỏe, Chăm sóc)
  bacsitrung: {
    name: 'Bác Sĩ Trung Thú Y',
    handle: '@bacsitrung',
    // ⚠️ Đây là link trang ibb.co, KHÔNG render được trong <Image>.
    // Cần thay bằng link ảnh trực tiếp dạng https://i.ibb.co/xxxxxxx/ten-file.jpg
    // (vào trang ibb.co -> chuột phải ảnh -> Copy image address).
    logo: 'https://ibb.co/bj90shZJ',
    description: {
      vi: `Kênh youtube của Bác Sĩ Trung Thú Y - Là nơi chia sẻ các thông tin về chăm sóc sức khỏe thú cưng, điều trị bệnh chó mèo, công việc của bác sĩ thú y, các thông tin thú vị liên quan đến chó mèo... Bằng kiến thức về sức khỏe thú cưng và hành vi thú cưng, tôi đã và đang giúp đỡ cộng đồng những người nuôi thú cưng có thể chăm sóc sức khỏe chó mèo của họ tại nhà chuẩn chuyên gia và biết cách điều trị các bệnh đơn giản và xử lý cấp cứu cho thú cưng trong các tình huống khẩn cấp.\n\nTôi mong nỗ lực để xây dựng một cộng đồng người nuôi thú cưng có kiến thức về thú y và có trách nhiệm trong việc chăm sóc thú cưng qua đó sẽ giúp hàng triệu thú cưng ở Việt Nam có cuộc sống tốt hơn`,
      en: `The Dr. Trung Pet Vet YouTube Channel is a hub for sharing insights on pet healthcare, treating canine and feline diseases, the daily life of a veterinarian, and fascinating facts about cats and dogs.Drawing on my expertise in pet health and behavior, I empower the pet-owning community to care for their pets at home like a pro. This includes guiding them on treating common ailments and handling emergency situations.My mission is to build a knowledgeable, responsible pet-owning community, ultimately helping millions of pets across Vietnam enjoy a better quality of life.`,
    },
    // Link đã giải mã từ youtube.com/redirect?...&q=... của bạn (tránh dùng link redirect
    // có token vì token có thể hết hạn / chỉ đúng trong phiên YouTube tạo ra nó).
    links: [
      { id: '1', label: 'Tiktok', icon: 'tiktok', color: '#000000', url: 'https://www.tiktok.com/@bstytrung' },
      { id: '2', label: 'Facebook', icon: 'facebook-square', color: '#1877F2', url: 'https://www.facebook.com/bacsitrungeravet' },
    ],
    // ⚠️ info bên dưới đang là placeholder giống hệt kênh BossDog (United States,
    // Joined July 2018, 2.5 tỷ views) — gần như chắc chắn không đúng với kênh
    // Bác Sĩ Trung. Gửi mình số liệu thật nếu muốn hiển thị chính xác.
    info: [
      { id: '1', label: 'United States', icon: 'location-sharp' },
      { id: '2', label: 'Joined July, 2018', icon: 'calendar-clear' },
      { id: '3', label: '2,547,839,201 views', icon: 'eye' },
    ],
  },
} satisfies Record<string, ChannelProfile>;

type ChannelKey = keyof typeof PAWCARE_CHANNELS;

// Map category (param truyền vào màn hình) -> kênh YouTube tương ứng.
// So sánh không phân biệt hoa/thường và chấp nhận cả key tiếng Anh lẫn nhãn tiếng Việt,
// để không bị vỡ nếu phía điều hướng (router) truyền 'Training' hay 'Huấn luyện'.
const getChannelKeyForCategory = (category?: string): ChannelKey => {
  const normalized = (category || '').toLowerCase().trim();
  const isTraining =
    normalized === 'training' ||
    normalized.includes('huấn luyện') ||
    normalized.includes('huan luyen');
  return isTraining ? 'bossdog' : 'bacsitrung';
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
                    <Text className="text-gray-900 font-semibold text-[15px] leading-5 flex-1 mr-2" numberOfLines={2}>{item.title}</Text>
                </View>
                <View className="mt-1">
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
// Nhận `channel` (profile theo category) và `isVi` từ component cha,
// thay vì đọc thẳng 1 ABOUT_DATA cố định như trước.
const AboutView = ({ channel, isVi }: { channel: ChannelProfile; isVi: boolean }) => {
    return (
        <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 24, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
            <View className="items-center mb-8">
                 <View className="w-20 h-20 mb-4 rounded-full border border-gray-100 shadow-sm overflow-hidden bg-white">
                     <Image source={{ uri: channel.logo }} className="w-full h-full" resizeMode="contain" />
                </View>
                <Text className="text-xl font-bold text-gray-900 mb-1">{channel.name}</Text>
                <Text className="text-blue-500 font-medium text-sm">{channel.handle}</Text>
            </View>

            <View className="mb-8">
                <Text className="text-base font-bold text-gray-900 mb-3">Description</Text>
                <Text className="text-gray-600 text-sm leading-6">{isVi ? channel.description.vi : channel.description.en}</Text>
            </View>
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

  const { t, language } = useLanguage();
  const isVi = language === 'vi';

  const categoryTitle = typeof category === 'string' ? category : 'Training';

  // Chọn kênh About theo category hiện tại: Training -> BossDog,
  // Nutrition / Health / Beauty -> Bác Sĩ Trung Thú Y.
  const aboutChannel = useMemo(
    () => PAWCARE_CHANNELS[getChannelKeyForCategory(categoryTitle)],
    [categoryTitle],
  );

  const [activeTab, setActiveTab] = useState('Videos');
  const [videos, setVideos] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  
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
    zIndex: searchAnimation.value > 0 ? -1 : 10, // Đẩy xuống dưới khi ẩn để không chặn click
  }));

  // Ẩn/hiện Title ở giữa
  const titleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(searchAnimation.value, [0, 0.5], [1, 0]),
  }));

  // Container của thanh Search (kéo dài từ phải sang trái)
  const searchContainerStyle = useAnimatedStyle(() => {
    // Chiều dài thay đổi từ 40 (chỉ hiện icon) sang full chiều rộng (trừ margin 24px x 2 = 48)
    const containerWidth = interpolate(searchAnimation.value, [0, 1], [40, width - 48]);
    const backgroundColor = interpolateColor(
      searchAnimation.value,
      [0, 1],
      ['transparent', '#F8F8F8'] // Nền xám nhạt như search bar
    );
    const borderColor = interpolateColor(
      searchAnimation.value,
      [0, 1],
      ['transparent', '#EBEBEB'] // Viền đồng bộ
    );
    const borderWidth = interpolate(searchAnimation.value, [0, 1], [0, 1]);

    return {
      width: containerWidth,
      backgroundColor,
      borderColor,
      borderWidth,
      borderRadius: 24, // Bo tròn chuẩn h-12 (48px)
      flexDirection: 'row',
      alignItems: 'center',
      height: 48,
    };
  });

  const textInputStyle = useAnimatedStyle(() => ({
    opacity: interpolate(searchAnimation.value, [0, 0.8, 1], [0, 0, 1]),
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    display: searchAnimation.value === 0 ? 'none' : 'flex',
  }));

  const searchIconStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      searchAnimation.value,
      [0, 1],
      ['#1F2937', '#8E8E93'] // Từ xám đen (khi đóng) sang xám nhạt (khi mở)
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
        // console.error("Lỗi fetch pawcare data:", error);
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
          Alert.alert(isVi ? "Thông báo" : "Notification", isVi ? "Video này đang được cập nhật đường dẫn, vui lòng quay lại sau!": "This video link is currently being updated, please check back later!");
          return;
      }
      const ytId = extractYoutubeId(url);
      if (ytId) {
          setPlayingVideoId(ytId); // Mở Modal phát video in-app
      } else {
          Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
      }
  }, [isVi]);

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
        <View className="flex-row items-center justify-between px-6 border-b border-gray-50 bg-white z-50 h-[64px] relative">
        
        {/* Nút Back (Bị ẩn khi Search, Design chuẩn từ trang Search) */}
        <Animated.View style={[backButtonStyle, { position: 'absolute', left: 24, zIndex: 10 }]}>
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
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    }}>
                    <LinearGradient
                        colors={['rgba(221, 221, 221, 0.3)', 'rgba(247, 247, 247, 0.7)', '#FFFFFF']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        locations={[0, 0.3, 1]}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 9999 }}
                    />
                    <Feather name="chevron-left" size={20} color="#1F2937" />
                </View>
            </TouchableOpacity>
        </Animated.View>

        {/* Title ở giữa (Bị ẩn khi Search) */}
        <Animated.View style={[titleStyle, { position: 'absolute', left: 0, right: 0, alignItems: 'center' }]} pointerEvents="none">
            <Text className="text-lg font-bold text-gray-900 tracking-tight">{categoryTitle}</Text>
        </Animated.View>

        {/* Cụm Search Bar (Nằm bên phải và dãn sang trái) */}
        <View style={{ flex: 1, alignItems: 'flex-end', justifyContent: 'center' }}>
            {activeTab !== 'About' && (
            <Animated.View style={searchContainerStyle}>
                
                {/* Nút kính lúp */}
                <TouchableOpacity 
                    onPress={isSearchActive ? undefined : handleOpenSearch} 
                    activeOpacity={isSearchActive ? 1 : 0.7}
                    className="items-center justify-center"
                    style={{ width: 40, height: 48 }}
                >
                    <AnimatedFeather name="search" size={18} style={searchIconStyle} />
                </TouchableOpacity>

                {/* Ô Input (Hiện ra khi animate) */}
                <Animated.View style={[textInputStyle, { paddingRight: 12 }]}>
                    <TextInput
                        ref={inputRef}
                        className="flex-1 text-[14px] text-gray-800 font-regular h-full"
                        style={{ fontFamily: "Urbanist" }}
                        placeholder={t("Search videos...")} 
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor="#8E8E93"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.6} className="p-1 ml-2">
                            <Feather name="x-circle" size={16} color="#8E8E93" />
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
            {activeTab === 'About' && <AboutView channel={aboutChannel} isVi={isVi} />}
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
            <View 
                className="flex-1 bg-black" 
                style={{ paddingTop: insets.top }} 
            >
                <View className="flex-row justify-end px-4 py-2 mt-2">
                    <TouchableOpacity 
                        className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
                        onPress={() => setPlayingVideoId(null)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }} 
                    >
                        <Ionicons name="close" size={24} color="white" />
                    </TouchableOpacity>
                </View>

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