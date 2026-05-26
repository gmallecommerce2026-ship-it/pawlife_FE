import { Text } from '@/components/AppText';
import { AntDesign, Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, LayoutAnimation, Linking, Modal, Platform, ScrollView, TextInput, TouchableOpacity, UIManager, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import YoutubePlayer from 'react-native-youtube-iframe';
import axiosClient from '../../api/axiosClient';
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
const VideosView = ({ data, category, loading, onPlayVideo }: any) => {
    if (loading) return <ActivityIndicator size="large" color="#F97316" style={{ marginTop: 50 }} />;
    if (!data || data.length === 0) return <Text className="text-center mt-10 text-gray-500">Chưa có video nào phù hợp.</Text>;

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
                    <TouchableOpacity className="p-1 -mt-1 -mr-2 active:bg-gray-100 rounded-full">
                        <MaterialCommunityIcons name="dots-vertical" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                </View>
                <View className="mt-1">
                    <Text className="text-gray-400 text-xs font-medium">{item.category || category} • {item.views} • {item.time}</Text>
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
const PlaylistsView = ({ playlists, loading, searchQuery, onPlayVideo }: { playlists: any[], loading: boolean, searchQuery: string, onPlayVideo: (url: string) => void }) => {
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
                <Text className="text-gray-500 text-[11px] font-medium mt-1">{item.views} • {item.time}</Text>
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

  const categoryTitle = typeof category === 'string' ? category : 'Training';

  const [activeTab, setActiveTab] = useState('Videos');
  const [videos, setVideos] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // STATE: Quản lý ID của video đang được phát in-app
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

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
        {/* HEADER */}
        <View className="flex-row items-center justify-between px-4 py-2 border-b border-gray-50 bg-white z-10">
            <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 active:bg-gray-100 rounded-full">
                <AntDesign name="left" size={24} color="#1F2937" />
            </TouchableOpacity>
            
            {isSearching ? (
                <View className="flex-1 flex-row items-center bg-gray-100 rounded-lg px-3 mx-3 h-10">
                    <TextInput
                        className="flex-1 text-gray-900 text-[15px] py-0"
                        placeholder="Search..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoFocus
                        placeholderTextColor="#9CA3AF"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} className="p-1">
                            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                <Text className="text-lg font-bold text-gray-900 tracking-tight">{categoryTitle}</Text>
            )}

            <TouchableOpacity 
                onPress={() => {
                    setIsSearching(!isSearching);
                    if (isSearching) setSearchQuery(''); 
                }} 
                className="p-2 -mr-2 active:bg-gray-100 rounded-full"
            >
                {isSearching ? <Text className="text-blue-500 font-medium">Hủy</Text> : <Feather name="search" size={22} color="#1F2937" />}
            </TouchableOpacity>
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
            {activeTab === 'Videos' && <VideosView data={filteredVideos} category={categoryTitle} loading={loading} onPlayVideo={handlePlayVideo} />}
            {activeTab === 'Playlists' && <PlaylistsView playlists={filteredPlaylists} loading={loading} searchQuery={searchQuery} onPlayVideo={handlePlayVideo} />}
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