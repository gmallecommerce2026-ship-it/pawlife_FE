// app/(tabs)/_layout.tsx
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

// --- IMPORT THƯ VIỆN RUNG ---
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// --- CẤU HÌNH UI/UX ---
const TAB_BAR_HEIGHT = 40;   
const CURVE_HEIGHT = 15;     
const BUTTON_RADIUS = 31;    

const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // 1. LẤY ROUTE ĐANG HOẠT ĐỘNG
  const activeRoute = state.routes[state.index];
  const activeRouteName = activeRoute.name;

  // Lấy tuỳ chọn tabBarStyle được truyền từ màn hình hiện tại
  const options = descriptors[activeRoute.key].options;
  const isHiddenByOptions = options.tabBarStyle?.display === 'none';

  // 2. ẨN CỨNG Ở CÁC MÀN HÌNH NÀY
  const hiddenRoutes = ['scan', 'scanned-pet']; 
  
  if (hiddenRoutes.includes(activeRouteName) || isHiddenByOptions) {
    return null; 
  }
  
  const center = width / 2;
  const radius = 68;           // Giữ nguyên bề rộng vòm để ôm vừa nút scan
  const bottomTension = 0.45;  // Giữ nguyên độ thoải ở chân
  const topTension = 0.32;     // TĂNG LÊN 0.32: Khử độ nhọn, làm đỉnh vòm tròn và mềm hơn
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

  // --- LOGIC XỬ LÝ KHI NHẤN TAB ---
  const handleTabPress = (routeName: string) => {
    const isCurrentlyActive = state.index === getRouteIndex(routeName);
    if (isCurrentlyActive) {
      // Nếu tab đang active mà user nhấn lại -> Quay về Home (index)
      navigation.navigate('index');
    } else {
      // Nếu chưa active -> Chuyển sang tab đó
      navigation.navigate(routeName);
    }
  };

  // --- HÀM XỬ LÝ HIỆU ỨNG RUNG KHI CHẠM NÚT SCAN ---
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
        <View style={styles.shadowOverlay} pointerEvents="none" />
      </View>

      {/* Điều chỉnh lại vị trí nút quét để nó khớp với đường lõm mới */}
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
                borderRadius: BUTTON_RADIUS // Thêm dòng này để cắt dải màu thành hình tròn
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
        {/* Tab Trái: Pawdoption */}
        <View style={styles.tabGroup}>
          <TabItem 
            label="Pawdoption" 
            icon="heart-outline" 
            activeIcon="heart"
            isActive={state.index === getRouteIndex('matching')}
            onPress={() => handleTabPress('matching')} 
          />
        </View>

        <View style={{ width: radius * 2 }} />

        {/* Tab Phải: Pets */}
        <View style={styles.tabGroup}>
          <TabItem 
            label="Pets" 
            icon="paw-outline" 
            activeIcon="paw"
            isActive={state.index === getRouteIndex('my-pets')}
            onPress={() => handleTabPress('my-pets')} 
          />
        </View>
      </View>
    </View>
  );
};

const TabItem = ({ label, icon, activeIcon, isActive, onPress }: any) => {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.tabItem}>
      <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
        <Ionicons 
          name={isActive ? activeIcon : icon} 
          size={26} 
          color={isActive ? "#F59E0B" : "#9CA3AF"} 
        />
      </View>
      <Text style={[styles.tabLabel, { color: isActive ? "#F59E0B" : "#9CA3AF", fontWeight: '500' }]}>
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
      {/* Đưa matching lên làm tab chính */}
      <Tabs.Screen name="matching" />
      <Tabs.Screen name="my-pets" />
      
      {/* Ẩn các tab không nằm trên Navbar (Bao gồm cả index) */}
      <Tabs.Screen name="index" options={{ href: null }} />
      {/* <Tabs.Screen name="profile" options={{ href: null }} /> */}
      <Tabs.Screen name="scan" options={{ href: null }} />
      <Tabs.Screen name="scanned-pet" options={{ href: null }} />
      {/* <Tabs.Screen name="applications" options={{ href: null }} /> */}
      {/* <Tabs.Screen name="our-pets" options={{ href: null }} /> */}
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
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 15,
    backgroundColor: 'transparent'
  },
  shadowOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
  },
  tabGroup: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    // backgroundColor: '#ffebce', 
    justifyContent: 'center',
    alignItems: 'center',
    // shadowColor: "#00000061",
    // shadowOffset: { width: 0, height: 8 },
    // shadowOpacity: 0.4,
    // shadowRadius: 12,
    elevation: 10,
    // borderWidth: 1,
    // borderColor: '#fff9f3',
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
    height: '100%',
    width: '100%',
    marginTop: 65,
  },
  iconContainer: {
    marginBottom: 4,
  },
  activeIconContainer: {
    transform: [{ scale: 1.15 }], 
  },
  tabLabel: {
    fontSize: 11,
  }
});