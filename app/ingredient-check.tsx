import { Text } from '@/components/AppText';
import { Badge, IngredientItem, INGREDIENTS } from '@/constants/ingredient';
import { useLanguage } from '@/contexts/LanguageContext';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
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
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
// --- MOCK DATA: PETS (bilingual) ---
const PETS = [
  { id: '1', name: { en: 'Dog', vi: 'Chó' }, icon: '🐶' },
  { id: '2', name: { en: 'Cat', vi: 'Mèo' }, icon: '🐱' },
];

type Lang = 'en' | 'vi';
const EMERGENCY_DEFAULT_ACTION = {
  title: {
    en: 'If your pet ate this',
    vi: 'Nếu thú cưng của bạn ăn phải',
  },
  steps: {
    en: [
      'Contact a vet immediately',
      'Provide details of what and how much was eaten',
    ],
    vi: [
      'Liên hệ bác sĩ thú y ngay lập tức',
      'Cung cấp thông tin chi tiết về loại và lượng đã ăn',
    ],
  },
} as const;
// --- HÀM HỖ TRỢ ---
// Precomputed once per badge type (not per item) — pure data, cheap to reuse.
// Only 3 tiers now: toxic = yellow (default for anything unsafe but not an
// emergency), emergency = red, safe = green. The old "cautious" tier is gone.
const STYLE_CONFIG: Record<Badge, {
  badgeBg: string; badgeBorder: string; badgeText: string;
  gradientColors: readonly [string, string];
  shadowColor: string;
  iconGradient: readonly [string, string];
}> = {
  emergency: {
    badgeBg: 'bg-[#FFE8E8]', badgeBorder: 'border-[#DA5A5A]/25', badgeText: 'text-[#DA5A5A]',
    gradientColors: ['#FFD6D6', '#FF8D8D'],
    shadowColor: '#FFC4C540',
    iconGradient: ['#FFF0F0', '#FFC4C5'],
  },
  toxic: {
    badgeBg: 'bg-[#FFBB00]/10', badgeBorder: 'border-[#FFBB00]/25', badgeText: 'text-[#FFBB00]',
    gradientColors: ['#FFEEC0', '#FFEEC0'],
    shadowColor: '#FFF6C440',
    iconGradient: ['#FFFEF0', '#FFF6C4'],
  },
  safe: {
    badgeBg: 'bg-[#CDFFB5]/25', badgeBorder: 'border-[#83DA5A]/25', badgeText: 'text-[#77C852]',
    gradientColors: ['#DCF6D1', '#DCF6D1'],
    shadowColor: '#D6FFC440',
    iconGradient: ['#FFFEF0', '#D6FFC4'],
  },
};
const DEFAULT_STYLE = {
  badgeBg: 'bg-[#E5E7EB]', badgeBorder: 'border-[#9CA3AF]/25', badgeText: 'text-[#9CA3AF]',
  gradientColors: ['#E5E7EB', '#9CA3AF'] as const,
  shadowColor: '#9CA3AF',
  iconGradient: ['#F9FAFB', '#D1D5DB'] as const,
};
const getStyleConfig = (type: Badge) => STYLE_CONFIG[type] ?? DEFAULT_STYLE;

// Card shadow is expensive on Android (forces its own compositing layer via
// elevation) — use a cheap border there instead, keep the nicer shadow on iOS.
const cardShadow = Platform.select({
  ios: {
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  android: { elevation: 0 },
  default: {},
});


const renderBulletPoints = (items: readonly string[], lang: Lang) => {
  const fontFamily = lang === 'vi' ? 'BeVietnamPro-Regular' : 'Urbanist-Regular';

  return items.map((item, index) => (
    <View key={index} className="flex-row items-start mb-2">
      <View className="w-[2px] h-[2px] rounded-full mt-[8px] ml-2.5 mr-2.5 bg-[#8E8E93]" />
      <Text className="flex-1 text-[12px] text-[#8E8E93]" style={{ fontFamily }}>
        {item}
      </Text>
    </View>
  ));
};


// --- COMPONENT ITEM ---
const IngredientCard = React.memo(function IngredientCard({
  item,
  isExpanded,
  onToggle,
  lang,
}: {
  item: IngredientItem;
  isExpanded: boolean;
  onToggle: (id: string, isExpandable: boolean) => void;
  lang: Lang;
}) {
  const styleConfig = getStyleConfig(item.badge);

  // FIX: a card used to be "expandable" only when it had `details` (why/symptoms),
  // which every `safe` item lacks — those use `benefits` (key benefits + feeding
  // guide) instead. That's why safe cards never opened. Now either field makes
  // the card expandable, and we render whichever one the item actually has.
  const isExpandable = !!item.details || !!item.benefits || item.badge === 'emergency';
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);

  const handlePress = useCallback(() => {
    if (!isExpandable) return;
    if (!hasOpenedOnce) setHasOpenedOnce(true);
    onToggle(item.id, isExpandable);
  }, [isExpandable, hasOpenedOnce, item.id, onToggle]);

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
      activeOpacity={isExpandable ? 0.8 : 1}
      onPress={handlePress}
      className="mb-[21px]"
      style={{ shadowColor: styleConfig.shadowColor, ...cardShadow }}
    >
      <LinearGradient
        colors={styleConfig.gradientColors}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ borderRadius: 22, padding: 1.5 }}
      >
        <View
          className="bg-white overflow-hidden"
          style={{ borderRadius: 20.5, paddingHorizontal: 15, paddingTop: 21, paddingBottom: 21 }}
        >
          <View className="flex-row items-center">
            {/* Icon bubble nâng cấp sang Radial Gradient */}
            <View
              className="mr-3 items-center justify-center overflow-hidden"
              style={{ width: 44, height: 44, borderRadius: 26.5, backgroundColor: '#FFFFFF' }}
            >
              <Svg height="44" width="44" style={{ position: 'absolute' }}>
                <Defs>
                  <RadialGradient
                    id={`grad-${item.id}`}
                    cx="50%" cy="50%" rx="50%" ry="50%"
                  >
                    <Stop offset="100%" stopColor={styleConfig.iconGradient[1]} />
                    <Stop offset="0%" stopColor={styleConfig.iconGradient[0]} />
                  </RadialGradient>
                </Defs>
                <Circle cx="22" cy="22" r="22" fill={`url(#grad-${item.id})`} />
              </Svg>
              <Text style={{ fontSize: 20, lineHeight: 23, textAlign: 'center', includeFontPadding: false }}>
                {item.icon}
              </Text>
            </View>

            <View className="flex-1 flex-col ml-[6px]">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-[14px] font-semibold text-gray-900 flex-1 pr-2" numberOfLines={isExpanded ? undefined : 1}>
                  {item.title[lang]}
                </Text>
                <View className={`px-2 py-1 rounded-[1000px] mr-[5px] border ${styleConfig.badgeBg} ${styleConfig.badgeBorder}`}>
                  <Text className={`text-[10px] font-regular ${styleConfig.badgeText}`}>
                    {item.riskLabel[lang]}
                  </Text>
                </View>
              </View>

              <Text
                className="text-[12px] font-regular text-[#8E8E93] leading-[20px]"
                style={{ fontFamily: "Urbanist-Regular" }}
                numberOfLines={isExpanded ? undefined : 1}
              >
                {item.shortContent[lang]}
              </Text>
            </View>
          </View>

          {isExpandable && hasOpenedOnce && (
            <Animated.View style={[animatedStyle, { overflow: 'hidden' }]}>
              <View
                style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
                onLayout={(e) => {
                  const h = e.nativeEvent.layout.height;
                  if (Math.abs(h - contentHeight) > 1) setContentHeight(h);
                }}
              >
                <View
                  className="mt-4 pt-[12px] border-t border-gray-100"
                  style={{ marginLeft: 57 }}
                >


                  {/* Risky items (cautious / danger / emergency): why + symptoms */}
                  {item.details && (
                    <>
                      {item.details.why[lang].length > 0 && (
                        <View className="mb-4">
                          <Text className="text-[12px] font-semibold text-gray-900 mb-2">
                            {item.details.whyTitle[lang]}
                          </Text>
                          {renderBulletPoints(item.details.why[lang], lang)}
                        </View>
                      )}

                      {item.details.symptoms[lang].length > 0 && (
                        <View className="mb-1">
                          <Text className="text-[12px] font-semibold text-gray-900 mb-2">
                            {item.details.symptomsTitle[lang]}
                          </Text>
                          {renderBulletPoints(item.details.symptoms[lang], lang)}
                        </View>
                      )}
                    </>
                  )}

                  {/* Safe items: key benefits + feeding guide */}
                  {item.benefits && (
                    <>
                      {item.benefits.benefits[lang].length > 0 && (
                        <View className="mb-4">
                          <Text className="text-[12px] font-semibold text-gray-900 mb-2">
                            {item.benefits.benefitsTitle[lang]}
                          </Text>
                          {renderBulletPoints(item.benefits.benefits[lang], lang)}
                        </View>
                      )}

                      {item.benefits.feeding[lang].length > 0 && (
                        <View className="mb-1">
                          <Text className="text-[12px] font-semibold text-gray-900 mb-2">
                            {item.benefits.feedingTitle[lang]}
                          </Text>
                          {renderBulletPoints(item.benefits.feeding[lang], lang)}
                        </View>
                      )}
                    </>
                  )}

                  {item.badge === 'emergency' && (
                    <View className="mt-4">
                      <Text className="text-[12px] font-semibold text-gray-900 mb-4">
                        {EMERGENCY_DEFAULT_ACTION.title[lang]}
                      </Text>
                      {renderBulletPoints(EMERGENCY_DEFAULT_ACTION.steps[lang], lang)}
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
});

// --- SCREEN CHÍNH ---
export default function IngredientCheckScreen() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const isVi = language === 'vi';
  const lang: Lang = isVi ? 'vi' : 'en';

  const [searchQuery, setSearchQuery] = useState('');
  const [activePetId, setActivePetId] = useState(PETS[0].id);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = useCallback((id: string, isExpandable: boolean) => {
    if (!isExpandable) return;
    setExpandedId((current) => (current === id ? null : id));
  }, []);

  const filteredIngredients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const base = !q
      ? INGREDIENTS
      : INGREDIENTS.filter(
        (item) =>
          item.title.en.toLowerCase().includes(q) ||
          item.title.vi.toLowerCase().includes(q)
      );

    // Default order in the data file is grouped by risk tier (toxic/emergency
    // first, then safe) — sort alphabetically by the displayed name instead so
    // the list reads A→Z regardless of badge color, using the current
    // language's locale so Vietnamese diacritics sort correctly.
    return [...base].sort((a, b) =>
      a.title[lang].localeCompare(b.title[lang], lang === 'vi' ? 'vi' : 'en', {
        sensitivity: 'base',
      })
    );
  }, [searchQuery, lang]);

  const renderItem = useCallback(
    ({ item }: { item: IngredientItem }) => (
      <IngredientCard
        item={item}
        isExpanded={expandedId === item.id}
        onToggle={toggleExpand}
        lang={lang}
      />
    ),
    [expandedId, toggleExpand, lang]
  );

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
          {t('ingredientCheck.title')}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* SEARCH BAR */}
      <View className="px-5 mt-5 mb-[12px]">
        <View className="flex-row items-center bg-[#F8F8F8] border border-[#EBEBEB] rounded-[1000px] px-4 h-[44px]">
          <Feather name="search" size={20} color="#8E8E93" />
          <TextInput
            className="flex-1 ml-3 text-[14px] text-gray-900"
            style={{ fontFamily: "Urbanist-Regular" }}
            placeholder={t('ingredientCheck.searchPlaceholder')}
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
              className={`flex-row items-center px-4 py-2 mr-[8px] border rounded-[1000px] transition-colors ${activePetId === pet.id ? 'bg-[#E89B5A] border-[#E89B5A]' : 'bg-white border-[#E5E5E5]'}`}
            >
              <Text className="mr-2 text-[14px]">{pet.icon}</Text>
              <Text className={`font-semibold text-[14px] ${activePetId === pet.id ? 'text-[#FFFFFF]' : 'text-[#6B7280]'}`}>
                {pet.name[lang]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* INGREDIENT LIST */}
      <FlatList
        data={filteredIngredients}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
        renderItem={renderItem}
        // Perf tuning for a ~180-item list of moderately heavy rows:
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={Platform.OS === 'android'}
      />
    </SafeAreaView>
  );
}