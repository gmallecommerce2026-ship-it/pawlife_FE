import { useLanguage } from '@/contexts/LanguageContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
// --- IMPORT THƯ VIỆN HỖ TRỢ ---
import { Text } from '@/components/AppText';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// --- CẤU HÌNH UI/UX ---
const TAB_BAR_HEIGHT = 42;    // Tăng nhẹ thêm 4px để text có không gian thở tốt hơn
const CURVE_HEIGHT = 15;     
const BUTTON_RADIUS = 29;    

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

  const getRouteTitle = (routeName: string) => {
    const route = state.routes.find((r: any) => r.name === routeName);
    if (!route) return routeName;
    const options = descriptors[route.key].options;
    return options.title || route.name;
  };

  const handleTabPress = (routeName: string) => {
    // Tạo rung động cực nhẹ nhàng (chuẩn UX chuyển tab của iOS/Android)
    Haptics.selectionAsync(); 
    navigation.navigate(routeName);
  };

  const handleScanPress = () => {
    // Rung Medium tạo cảm giác bấm nút vật lý dứt khoát
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/scan');
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
          onPress={handleScanPress} // Thay onPress và xoá onPressIn cũ
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

      {/* FIXED: Thiết lập height bao gồm cả CURVE_HEIGHT để nội dung có không gian */}
      <View style={[
        styles.contentContainer, 
        { 
          height: TAB_BAR_HEIGHT + CURVE_HEIGHT + insets.bottom, 
          paddingBottom: insets.bottom 
        }
      ]}>
        
        {/* NHÓM TAB TRÁI */}
        <View style={styles.sideGroup}>
          <TabItem 
            label={getRouteTitle('index')}
            isActive={state.index === getRouteIndex('index')}
            onPress={() => handleTabPress('index')} 
            activeImage={require('../../assets/images/home_navbar_active.png')}
            inactiveImage={require('../../assets/images/home_navbar_deactive.png')}
          />
          <TabItem 
            label={getRouteTitle('matching')}
            isActive={state.index === getRouteIndex('matching')}
            onPress={() => handleTabPress('matching')} 
            activeImage={require('../../assets/images/match_navbar_active.png')}
            inactiveImage={require('../../assets/images/match_navbar_deactive.png')} 
          />
        </View>

        {/* KHOẢNG TRỐNG CHO NÚT SCAN */}
        <View style={{ width: radius * 1.3 }} />

        {/* NHÓM TAB PHẢI */}
        <View style={styles.sideGroup}>
          <TabItem 
            label={getRouteTitle('my-pets')}
            isActive={state.index === getRouteIndex('my-pets')}
            onPress={() => handleTabPress('my-pets')} 
            activeImage={require('../../assets/images/my_pet_navbar_active.png')}
            inactiveImage={require('../../assets/images/my_pet_navbar_deactive.png')}
          />
          <TabItem 
            label={getRouteTitle('profile-settings')}
            isActive={state.index === getRouteIndex('profile-settings')}
            onPress={() => handleTabPress('profile-settings')} 
            activeImage={require('../../assets/images/setting_navbar_active.png')}
            inactiveImage={require('../../assets/images/setting_navbar_deactive.png')}
          />
        </View>
      </View>
    </View>
  );
};

const TabItem = ({ label, isActive, onPress, activeImage, inactiveImage }: any) => {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.tabItem}>
      <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
        <Image 
          source={isActive ? activeImage : inactiveImage}
          style={styles.imageIcon}
          resizeMode="contain"
        />
      </View>
      <Text style={[styles.tabLabel, { color: isActive ? "#F59E0B" : "#8E8E93", fontSize: 9, fontWeight: isActive ? '500' : '400' }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export default function TabLayout() {
  const { language, t } = useLanguage();
  const isVi = language === 'vi';

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: isVi ? 'Trang chủ' : 'Home' }} />
      <Tabs.Screen name="matching" options={{ title: isVi ? 'Ghép đôi' : 'Pawdoption' }} />
      <Tabs.Screen name="my-pets" options={{ title: isVi ? 'Thú cưng' : 'My Pets' }} />
      <Tabs.Screen name="profile-settings" options={{ title: isVi ? 'Hồ sơ' : 'Profile' }} />
      
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
    zIndex: 1, // Đảm bảo SVG nằm dưới
  },
  contentContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end', // Căn các item xuống cạnh dưới (ngay trên paddingBottom safe area)
    justifyContent: 'center',
    paddingHorizontal: 15,
    zIndex: 15, // FIXED: Bắt buộc nội dung (icon, text) nằm đè lên SVG Background
    elevation: 15,
  },
  sideGroup: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: TAB_BAR_HEIGHT, // Cố định chiều cao nhóm tab bằng phần viền thẳng của SVG
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
    height: TAB_BAR_HEIGHT, // Chiếm trọn vùng không gian cho phép
    paddingTop: 25,
  },
  iconContainer: {
    marginBottom: 4,
  },
  imageIcon: {
    width: 20, // Chỉnh to lên một xíu để nhìn rõ hơn
    height: 20,
  },
  activeIconContainer: {
    transform: [{ scale: 1.1 }], 
  },
  tabLabel: {
    fontSize: 8,
  }
});