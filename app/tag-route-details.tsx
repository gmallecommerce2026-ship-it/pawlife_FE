import { Text } from '@/components/AppText';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Platform,
    SafeAreaView,
    StatusBar,
    TouchableOpacity,
    View
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function TagRouteDetailsScreen() {
  const router = useRouter();
  const [routePolyline, setRoutePolyline] = useState<string | null>(null);
  const [isFetchingRoute, setIsFetchingRoute] = useState(true);

  const currentLat = 10.762622;
  const currentLng = 106.660172;
  const targetLat = 10.772622;
  const targetLng = 106.670172;

  useEffect(() => {
    const fetchRoute = async () => {
      try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${currentLng},${currentLat};${targetLng},${targetLat}?geometries=polyline&access_token=${process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.routes?.[0]) setRoutePolyline(data.routes[0].geometry);
      } catch (error) {
        console.error('Route fetch failed:', error);
      } finally {
        setIsFetchingRoute(false);
      }
    };
    fetchRoute();
  }, []);

  const pathParam = routePolyline ? `path-5+3B82F6-0.8(${encodeURIComponent(routePolyline)}),` : '';
  const mapboxStaticUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${pathParam}pin-s-a+3B82F6(${currentLng},${currentLat}),pin-s-b+EF4444(${targetLng},${targetLat})/auto/${SCREEN_WIDTH}x${SCREEN_HEIGHT}@2x?padding=120&access_token=${process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN}`;

  return (
    <View className="flex-1 bg-black">
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      
      {/* --- HEADER CẤU TRÚC MỚI (CHỐNG OCD) --- */}
      <View 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
        }}
        pointerEvents="box-none"
      >
        {/* 1. Phần nền trắng tinh: Dùng py-4 (padding top/bottom 16px) để căn giữa tuyệt đối */}
        <View className="bg-white">
          <SafeAreaView style={Platform.OS === 'android' ? { paddingTop: StatusBar.currentHeight || 16 } : {}}>
            <View className="flex-row items-center justify-between px-5 py-4">
              <TouchableOpacity
                activeOpacity={0.7}
                className="w-10 h-10 rounded-full items-center justify-center bg-white shadow-sm border border-gray-100"
                onPress={() => router.back()}
              >
                <Feather name="chevron-left" size={22} color="#111827" />
              </TouchableOpacity>

              <View className="items-center">
                <Text className="text-[16px] font-bold text-[#111827] tracking-tight">Scanned Tag</Text>
                <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-[1px] mt-0.5">
                  23 Mins Ago
                </Text>
              </View>

              <TouchableOpacity 
                activeOpacity={0.7}
                className="w-10 h-10 rounded-full items-center justify-center bg-white shadow-sm border border-gray-100"
              >
                <Feather name="more-horizontal" size={20} color="#111827" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        {/* 2. Phần đuôi Gradient kéo dài thêm 64px mờ dần */}
        <LinearGradient
          colors={[
            'rgba(255,255,255,1)', 
            'rgba(255,255,255,0.8)', 
            'rgba(255,255,255,0.3)', 
            'rgba(255,255,255,0)'
          ]}
          locations={[0, 0.3, 0.7, 1]}
          style={{ height: 64, width: '100%' }}
          pointerEvents="none" // Quan trọng: Cho phép người dùng chạm xuyên qua đuôi trong suốt xuống map
        />
      </View>

      {/* --- MAP FULL SCREEN --- */}
      <View className="flex-1 bg-[#F3F4F6] relative">
        {isFetchingRoute ? (
          <View className="flex-1 justify-center items-center pb-[20%]">
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : (
          <Image 
            source={{ uri: mapboxStaticUrl }} 
            className="w-full h-full" 
            resizeMode="cover" 
          />
        )}

        {/* --- FLOATING CARD --- */}
        <View 
          style={{
            position: 'absolute',
            bottom: 24, 
            left: 16,   
            right: 16,  
            backgroundColor: 'white',
            borderRadius: 32, 
            padding: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.1,
            shadowRadius: 24,
            elevation: 16,
            zIndex: 40,
          }}
        >
          {/* 1. Scanner Info */}
          <View className="flex-row items-center">
            <Image 
              source={{ uri: 'https://i.pravatar.cc/150?img=47' }}
              className="w-11 h-11 rounded-full bg-gray-100 border border-gray-100"
            />
            <View className="ml-3.5 flex-1 justify-center">
              <View className="flex-row items-center">
                <Text className="text-[15px] font-bold text-[#111827] tracking-tight">Sarah Jenkins</Text>
                <View className="w-2 h-2 rounded-full bg-green-500 ml-1.5 mt-0.5" />
              </View>
              <Text className="text-[13px] text-gray-500 mt-0.5" numberOfLines={1}>
                "I found your dog near the gate!"
              </Text>
            </View>
          </View>

          {/* 2. Divider Line */}
          <View className="h-[1px] bg-gray-100 w-full my-5" />

          {/* 3. Stats Row */}
          <View className="flex-row justify-between items-start mb-6">
            <View>
              <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                Distance
              </Text>
              <Text className="text-[34px] font-black text-[#111827] tracking-tighter leading-[38px]">
                1.5 <Text className="text-[16px] font-bold text-gray-400">km</Text>
              </Text>
            </View>

            <View className="items-end">
              <Text className="text-[13px] font-bold text-gray-500 mb-2">Travel time: <Text className="text-[16px] font-bold text-[#111827]">15 min</Text></Text>
              <View className="flex-row">
                <View className="flex-row items-center px-2 py-1.5 bg-gray-50 rounded-lg">
                  <Ionicons name="car" size={14} color="#111827" />
                  <Text className="text-[11px] font-bold ml-1.5 text-[#111827]">5 min</Text>
                </View>
                <View className="flex-row items-center px-2 py-1.5 bg-amber-50 rounded-lg ml-2">
                  <MaterialCommunityIcons name="motorbike" size={14} color="#F59E0B" />
                  <Text className="text-[11px] font-bold ml-1.5 text-[#F59E0B]">2 min</Text>
                </View>
              </View>
            </View>
          </View>

          {/* 4. Location Timeline */}
          <View className="pl-1">
            {/* Origin */}
            <View className="flex-row items-start mb-[10px]">
              <View className="items-center w-4 mr-3.5 relative">
                <View className="w-3.5 h-3.5 rounded-full border-[3px] border-blue-100 bg-blue-500 z-10 mt-1" />
                <View className="w-[1.5px] h-[36px] bg-gray-200 absolute top-[14px]" />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-bold text-[#111827] tracking-tight leading-5">Your Location</Text>
                <Text className="text-[13px] text-gray-400 font-medium">District 1, HCM City</Text>
              </View>
            </View>

            {/* Destination */}
            <View className="flex-row items-start">
              <View className="items-center w-4 mr-3.5 mt-1">
                <View className="w-4 h-4 rounded-full bg-red-50 items-center justify-center z-10">
                  <View className="w-[8px] h-[8px] rounded-full bg-red-500" />
                </View>
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-bold text-[#111827] tracking-tight leading-5">Happy Land Park</Text>
                <Text className="text-[13px] text-gray-400 font-medium">District 7, HCM</Text>
              </View>
            </View>
          </View>

          {/* 5. Stacked Full-width Action Buttons */}
          <View className="w-full mt-6">
            <TouchableOpacity 
              activeOpacity={0.7}
              className="w-full bg-[#E89B5A] h-[52px] rounded-[16px] flex-row items-center justify-center mb-3 shadow-sm shadow-[#E89B5A]/30"
            >
              <Feather name="phone-call" size={16} color="#ffffff" />
              <Text className="text-[#ffffff] text-[15px] font-bold ml-2.5 tracking-tight">Contact Now</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              activeOpacity={0.85}
              className="w-full bg-white h-[52px] rounded-[16px] flex-row items-center justify-center border border-gray-200"
            >
              <Feather name="map" size={16} color="#9CA3AF" />
              <Text className="text-gray-500 text-[15px] font-bold ml-2.5 tracking-tight">Open in Maps</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </View>
  );
}