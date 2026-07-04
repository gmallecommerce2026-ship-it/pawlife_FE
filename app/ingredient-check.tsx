import { Text } from '@/components/AppText';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  FlatList,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

// --- MOCK DATA ---
const PETS = [
  { id: '1', name: 'Dog', icon: '🐶' },
  { id: '2', name: 'Cat', icon: '🐱' },
];

const SUGGESTED_FOODS = [
  {
    id: '1',
    title: 'Grapes & Raisins',
    shortContent: 'Even small amounts are highly toxic for dogs.',
    badge: 'danger',
    icon: '🍇',
    details: {
      whyTitle: 'Why is it dangerous?',
      why: [
        'Chứa độc tố chưa xác định gây suy thận cấp tính.',
        'Ngay cả một lượng rất nhỏ cũng có thể đe dọa tính mạng.',
        'Độc tính không thay đổi dù là nho tươi hay nho khô.'
      ],
      symptomsTitle: 'Symptoms may occur within 6-24hr',
      symptoms: [
        'Nôn mửa và tiêu chảy liên tục',
        'Bỏ ăn, lờ đờ, mệt mỏi',
        'Đau bụng, khát nước bất thường hoặc ngừng đi tiểu'
      ],
      actionTitle: 'If your dog ate this',
      actions: [
        'Liên hệ ngay với bác sĩ thú y gần nhất.',
        'Không tự ý gây nôn trừ khi có chỉ định trực tiếp từ bác sĩ.',
        'Ghi nhớ số lượng nho/nho khô mà thú cưng đã ăn nếu có thể.'
      ]
    }
  },
  {
    id: '2',
    title: 'Garlic',
    shortContent: 'Small amounts might be tolerated...',
    badge: 'cautious',
    icon: '🧀',
    details: {
      whyTitle: 'Why caution?',
      why: [
        'Nhiều chó mèo mắc hội chứng bất dung nạp lactose.',
        'Chứa lượng chất béo cao có thể gây tăng cân hoặc viêm tụy nếu ăn nhiều.'
      ]
    }
  },
  {
    id: '3',
    title: 'Carrots',
    shortContent: 'Carrots are an excellent healthy...',
    badge: 'safe',
    icon: '🥩',
    details: null
  },
];

// --- HÀM HỖ TRỢ ---
const getStyleConfig = (type: string) => {
  switch (type) {
    case 'danger':
      return {
        badgeBg: 'bg-[#FFE8E8]', badgeBorder: 'border-[#DA5A5A]/25', badgeText: 'text-[#DA5A5A]', label: 'Danger',
        gradientColors: ['#FFD6D6', '#FF8D8D'] as const,
        shadowColor: '#ff5a5a', bulletColor: 'bg-red-500',
        iconGradient: ['#FFC4C5', '#FFF0F0', '#FFC4C5'] as const,
      };
    case 'cautious':
      return {
        badgeBg: 'bg-[#FFBB00]/10', badgeBorder: 'border-[#FFBB00]/25', badgeText: 'text-[#FFBB00]', label: 'Cautious',
        gradientColors: ['#FFEEC0', '#FFEEC0'] as const,
        shadowColor: '#ffd971', bulletColor: 'bg-yellow-500',
        iconGradient: ['#FFF6C4', '#FFFEF0', '#FFF6C4'] as const,
      };
    case 'safe':
      return {
        badgeBg: 'bg-[#CDFFB5]/25', badgeBorder: 'border-[#83DA5A]/25', badgeText: 'text-[#77C852]', label: 'Safe',
        gradientColors: ['#DCF6D1', '#DCF6D1'] as const,
        shadowColor: '#10B981', bulletColor: 'bg-green-500',
        iconGradient: ['#D6FFC4', '#FFFEF0', '#D6FFC4'] as const,
      };
    default:
      return {
        badgeBg: 'bg-[#E5E7EB]', badgeBorder: 'border-[#9CA3AF]/25', badgeText: 'text-[#9CA3AF]', label: 'Unknown',
        gradientColors: ['#E5E7EB', '#9CA3AF'] as const,
        shadowColor: '#9CA3AF', bulletColor: 'bg-gray-500',
        iconGradient: ['#D1D5DB', '#F9FAFB', '#D1D5DB'] as const,
      };
  }
};

const renderBulletPoints = (items: string[]) => {
  return items.map((item, index) => (
    <View key={index} className="flex-row items-start mb-2">
      {/* Cố định màu bg-[#8E8E93] */}
      <View className="w-[2px] h-[2px] rounded-full mt-[8px] ml-2.5 mr-2.5 bg-[#8E8E93]" />
      <Text className="flex-1 text-[14px] text-[#4B5563]" style={{ fontFamily: "Urbanist-Regular" }}>
        {item}
      </Text>
    </View>
  ));
};

// --- COMPONENT ITEM ---
const IngredientCard = ({ item, isExpanded, onToggle }: { item: any, isExpanded: boolean, onToggle: () => void }) => {
  const styleConfig = getStyleConfig(item.badge);
  const hasDetails = !!item.details;

  const [contentHeight, setContentHeight] = useState(0);

  const springHeight = useDerivedValue(() => {
    return withSpring(isExpanded ? contentHeight : 0, {
      damping: 12,
      stiffness: 120,
      mass: 0.8,
    });
  }, [isExpanded, contentHeight]);

  const animatedStyle = useAnimatedStyle(() => {
    const val = springHeight.value;
    return {
      height: Math.max(0, val),
      marginBottom: Math.min(0, val),
      opacity: withTiming(isExpanded ? 1 : 0, { duration: 250 }),
    };
  });

  return (
    <TouchableOpacity
      activeOpacity={hasDetails ? 0.8 : 1}
      onPress={onToggle}
      className="mb-[21px]" // Đã sửa: Khoảng cách giữa mỗi item là 21px
      style={{
        shadowColor: styleConfig.shadowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 5,
      }}
    >
      <LinearGradient
        colors={styleConfig.gradientColors}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ borderRadius: 22, padding: 1.5 }}
      >
        <View
          className="bg-white overflow-hidden"
          // Đã kiểm tra: padding trên và dưới đúng 21px
          style={{ borderRadius: 20.5, paddingHorizontal: 15, paddingTop: 21, paddingBottom: 21 }}
        >
          {/* CỘT TRÁI: ICON & CỘT PHẢI: TITLE/SHORT CONTENT */}
          <View className="flex-row items-center"> {/* Đã sửa: items-center để tiêu đề và icon căn đều theo chiều ngang (cross-axis) */}
            <View
              className="mr-3"
              style={{
                width: 33,
                height: 33,
                borderRadius: 16.5, // 33/2 để tròn vành vạnh
                shadowColor: styleConfig.shadowColor,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 3,
                elevation: 3,
                backgroundColor: '#FFFFFF',
              }}
            >
              <View
                style={{
                  flex: 1,
                  borderRadius: 16.5,
                  overflow: 'hidden',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Svg height="100%" width="100%" style={{ position: 'absolute' }}>
                  <Defs>
                    <RadialGradient
                      id={`grad-${item.id}`}
                      cx="50%"
                      cy="50%"
                      r="36%"
                    >
                      <Stop offset="0%" stopColor={styleConfig.iconGradient[1]} stopOpacity="1" />
                      <Stop offset="100%" stopColor={styleConfig.iconGradient[0]} stopOpacity="1" />
                    </RadialGradient>
                  </Defs>
                  <Rect x="0" y="0" width="100%" height="100%" fill={`url(#grad-${item.id})`} />
                </Svg>

                <Text style={{ fontSize: 15, lineHeight: 23, textAlign: 'center', includeFontPadding: false }}>
                  {item.icon}
                </Text>
              </View>
            </View>

            <View className="flex-1 flex-col ml-[12px]">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-[16px] font-semibold text-gray-900 flex-1 pr-2" numberOfLines={1}>
                  {item.title}
                </Text>
                <View className={`px-2 py-1 rounded-[1000px] mr-[5px] border ${styleConfig.badgeBg} ${styleConfig.badgeBorder}`}>
                  <Text className={`text-[10px] font-regular ${styleConfig.badgeText}`}>
                    {styleConfig.label}
                  </Text>
                </View>
              </View>

              <Text
                className="text-[14px] font-regular text-[#8E8E93] leading-[20px]"
                style={{ fontFamily: "Urbanist-Regular" }}
                numberOfLines={isExpanded ? undefined : 1}
              >
                {item.shortContent}
              </Text>
            </View>
          </View>

          {hasDetails && (
            <Animated.View style={[animatedStyle, { overflow: 'hidden' }]}>
              <View
                style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
                onLayout={(e) => {
                  const h = e.nativeEvent.layout.height;
                  if (Math.abs(h - contentHeight) > 1) setContentHeight(h);
                }}
              >
                <View className="mt-4 pt-[12px] border-t border-gray-100 pl-[57px]">

                  {item.details.why && (
                    <View className="mb-4">
                      <Text className="text-[15px] font-semibold text-gray-900 mb-2">
                        {item.details.whyTitle}
                      </Text>
                      {renderBulletPoints(item.details.why)}
                    </View>
                  )}

                  {item.details.symptoms && (
                    <View className="mb-4">
                      <Text className="text-[15px] font-semibold text-gray-900 mb-2">
                        {item.details.symptomsTitle}
                      </Text>
                      {renderBulletPoints(item.details.symptoms)}
                    </View>
                  )}

                  {item.details.actions && (
                    <View className="mb-1">
                      <Text className="text-[15px] font-semibold text-gray-900 mb-2">
                        {item.details.actionTitle}
                      </Text>
                      {renderBulletPoints(item.details.actions)}
                    </View>
                  )}

                </View>
              </View>
            </Animated.View>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

// --- SCREEN CHÍNH ---
export default function IngredientCheckScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activePetId, setActivePetId] = useState(PETS[0].id);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string, hasDetails: boolean) => {
    if (!hasDetails) return;
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FFFFFF]">
      {/* HEADER */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={{
            shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1, shadowRadius: 5, elevation: 3,
          }}
        >
          <View className="overflow-hidden rounded-full w-[36px] h-[36px] items-center justify-center"
            style={{
              width: 36, height: 36, borderRadius: 28, borderWidth: 0.5,
              borderTopColor: 'white', borderLeftColor: 'white',
              borderBottomColor: 'transparent', borderRightColor: 'transparent',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
            }}>
            <LinearGradient
              colors={['rgba(221, 221, 221, 0.3)', 'rgba(247, 247, 247, 0.7)', '#FFFFFF']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} locations={[0, 0.3, 1]}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 9999 }}
            />
            <Feather name="chevron-left" size={20} color="#1F2937" />
          </View>
        </TouchableOpacity>

        <Text className="text-center font-semibold text-[20px] text-gray-900">
          Ingredient check
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* SEARCH BAR */}
      <View className="px-5 mt-5 mb-[12px]"> {/* Đã sửa: Search bar cách chip 12px (mb-[12px]) */}
        <View className="flex-row items-center bg-[#F8F8F8] border border-[#EBEBEB] rounded-[1000px] px-4 h-[44px]">
          <Feather name="search" size={20} color="#8E8E93" />
          <TextInput
            className="flex-1 ml-3 text-[14px] text-gray-900"
            style={{ fontFamily: "Urbanist-Regular" }}
            placeholder="Search ingredients..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* FILTER CHIPS */}
      <View className="px-5 mb-6">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          {PETS.map(pet => (
            <TouchableOpacity
              key={pet.id}
              onPress={() => setActivePetId(pet.id)}
              activeOpacity={0.7}
              className={`flex-row items-center px-4 py-2 mr-[8px] border rounded-[1000px] transition-colors ${activePetId === pet.id ? 'bg-[#E89B5A] border-[#E89B5A]' : 'bg-white border-[#E5E5E5]'}`} // Đã sửa: Khoảng cách giữa các chip là 8px (mr-[8px])
            >
              <Text className="mr-2 text-[14px]">{pet.icon}</Text>
              <Text className={`font-semibold text-[14px] ${activePetId === pet.id ? 'text-[#FFFFFF]' : 'text-[#6B7280]'}`}>
                {pet.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* INGREDIENT LIST */}
      <FlatList
        data={SUGGESTED_FOODS}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <IngredientCard
            item={item}
            isExpanded={expandedId === item.id}
            onToggle={() => toggleExpand(item.id, !!item.details)}
          />
        )}
      />
    </SafeAreaView>
  );
}