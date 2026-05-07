import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

// --- IMPORT THƯ VIỆN HỖ TRỢ ---
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// --- CẤU HÌNH UI/UX ---
const TAB_BAR_HEIGHT = 48;    // Tăng nhẹ để đảm bảo icon và text không bị khít
const CURVE_HEIGHT = 15;     
const BUTTON_RADIUS = 31;    

const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // 1. LẤY ROUTE ĐANG HOẠT ĐỘNG
  const activeRoute = state.routes[state.index];
  const activeRouteName = activeRoute.name;

  const options = descriptors[activeRoute.key].options;
  const isHiddenByOptions = options.tabBarStyle?.display === 'none';

  // 2. ẨN THANH NAV Ở CÁC MÀN HÌNH NÀY
  const hiddenRoutes = ['scan', 'scanned-pet']; 
  
  if (hiddenRoutes.includes(activeRouteName) || isHiddenByOptions) {
    return null; 
  }
  
  const center = width / 2;
  const radius = 68;           // Độ rộng vòm ôm nút scan
  const bottomTension = 0.45;  
  const topTension = 0.32;     
  const CORNER_RADIUS = 26; 
  
  const d = `
    M ${CORNER_RADIUS} ${CURVE_HEIGHT}
    L ${center - radius} ${CURVE_HEIGHT}
    C ${center - radius * bottomTension} ${CURVE_HEIGHT}, ${center - radius * topTension} 0, ${center} 0
    C ${center + radius * topTension} 0, ${center + radius * bottomTension} ${CURVE_HEIGHT}, ${center + radius} ${CURVE_HEIGHT}
    L ${width - CORNER_RADIUS} ${CURVE_HEIGHT}
    Q ${width} ${CURVE_HEIGHT}, ${width} ${CURVE_HEIGHT + CORNER_RADIUS}
    L ${width} ${TAB_BAR_HEIGHT + CURVE_HEIGHT + insets.bottom}
    L 0 ${TAB_BAR_HEIGHT + CURVE_HEIGHT + insets.bottom}
    L 0 ${CURVE_HEIGHT + CORNER_RADIUS}
    Q 0 ${CURVE_HEIGHT}, ${CORNER_RADIUS} ${CURVE_HEIGHT}
    Z
  `;

  const getRouteIndex = (name: string) => {
    return state.routes.findIndex((route: any) => route.name === name);
  };

  const handleTabPress = (routeName: string) => {
    navigation.navigate(routeName);
  };

  const handleScanPressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={[styles.svgContainer, { height: TAB_BAR_HEIGHT + CURVE_HEIGHT + insets.bottom }]}>
        <Svg width={width} height={TAB_BAR_HEIGHT + CURVE_HEIGHT + insets.bottom}>
          <Path 
            d={d} 
            fill="white"
            stroke="#E5E7EB" 
            strokeWidth={0.5}
          />
        </Svg>
      </View>

      {/* NÚT QUÉT TRUNG TÂM */}
      <View style={[
        styles.centerButtonContainer, 
        { bottom: TAB_BAR_HEIGHT + CURVE_HEIGHT + insets.bottom - (BUTTON_RADIUS * 2) - 7 }
      ]}>
        <TouchableOpacity 
          activeOpacity={0.9}
          onPressIn={handleScanPressIn} 
          onPress={() => router.push('/scan')} 
          style={styles.scanButton}
        >
          <LinearGradient 
              colors={['rgb(255, 244, 230)', 'rgb(255, 232, 204)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ 
                position: 'absolute', 
                top: 0, left: 0, right: 0, bottom: 0, 
                borderRadius: BUTTON_RADIUS 
              }}
          />
          <View style={styles.scanButtonInner}>
            <MaterialCommunityIcons name="line-scan" size={28} color="#F59E0B" />
          </View>
        </TouchableOpacity>
      </View>

      <View style={[
        styles.contentContainer, 
        { height: TAB_BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom }
      ]}>
        
        {/* NHÓM TAB TRÁI */}
        <View style={styles.sideGroup}>
          <TabItem 
            label="Home" 
            icon="home-outline" 
            activeIcon="home"
            isActive={state.index === getRouteIndex('index')}
            onPress={() => handleTabPress('index')} 
          />
          <TabItem 
            label="Matching" 
            icon="heart-outline" 
            activeIcon="heart"
            isActive={state.index === getRouteIndex('matching')}
            onPress={() => handleTabPress('matching')} 
          />
        </View>

        {/* KHOẢNG TRỐNG CHO NÚT SCAN */}
        <View style={{ width: radius * 1.3 }} />

        {/* NHÓM TAB PHẢI */}
        <View style={styles.sideGroup}>
          <TabItem 
            label="Pets" 
            icon="paw-outline" 
            activeIcon="paw"
            isActive={state.index === getRouteIndex('my-pets')}
            onPress={() => handleTabPress('my-pets')} 
          />
          <TabItem 
            label="Profile" 
            icon="person-outline" 
            activeIcon="person"
            isActive={state.index === getRouteIndex('profile-settings')}
            onPress={() => handleTabPress('profile-settings')} 
          />
        </View>
      </View>
    </View>
  );
};

const TabItem = ({ label, icon, activeIcon, isActive, onPress, imageSource }: any) => {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.tabItem}>
      <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
        {imageSource ? (
          <Image 
            source={imageSource}
            style={[styles.imageIcon, { tintColor: isActive ? "#F59E0B" : "#9CA3AF" }]}
            resizeMode="contain"
          />
        ) : (
          <Ionicons 
            name={isActive ? activeIcon : icon} 
            size={22} 
            color={isActive ? "#F59E0B" : "#9CA3AF"} 
          />
        )}
      </View>
      <Text style={[styles.tabLabel, { color: isActive ? "#F59E0B" : "#9CA3AF", fontWeight: isActive ? '600' : '500' }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="matching" />
      <Tabs.Screen name="my-pets" />
      <Tabs.Screen name="profile-settings" />
      
      {/* Ẩn các màn hình không thuộc thanh điều hướng */}
      <Tabs.Screen name="scan" options={{ href: null }} />
      <Tabs.Screen name="scanned-pet" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    zIndex: 10,
  },
  svgContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 10,
  },
  contentContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  sideGroup: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  centerButtonContainer: {
    position: 'absolute',
    left: width / 2 - BUTTON_RADIUS,
    zIndex: 20,
  },
  scanButton: {
    width: BUTTON_RADIUS * 2,
    height: BUTTON_RADIUS * 2,
    borderRadius: BUTTON_RADIUS,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  scanButtonInner: {
    width: '100%',
    height: '100%',
    borderRadius: BUTTON_RADIUS,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    paddingTop: 10,
  },
  iconContainer: {
    marginBottom: 4,
  },
  imageIcon: {
    width: 22,
    height: 22,
  },
  activeIconContainer: {
    transform: [{ scale: 1.1 }], 
  },
  tabLabel: {
    fontSize: 10,
  }
});