import { Text } from '@/components/AppText';
import { Badge, Bilingual, IngredientItem, INGREDIENTS } from '@/constants/ingredient';
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
  { id: 'dog', name: { en: 'Dog', vi: 'Chó' }, icon: '🐶' },
  { id: 'cat', name: { en: 'Cat', vi: 'Mèo' }, icon: '🐱' },
] as const;

type Lang = 'en' | 'vi';
const ACTION_GUIDE_BY_BADGE: Partial<Record<Badge, { title: Bilingual; steps: import('@/constants/ingredient').BilingualList }>> = {
  caution: {
    title: { en: 'If your pet ate this', vi: 'Nếu thú cưng ăn phải' },
    steps: {
      en: [
        'Monitor for 12–24 hours',
        'Stop feeding more and make sure they drink enough water',
      ],
      vi: [
        'Theo dõi trong 12–24 giờ',
        'Ngưng cho ăn thêm và đảm bảo uống đủ nước',
      ],
    },
  },
  toxic: {
    title: { en: 'If your pet ate this', vi: 'Nếu thú cưng ăn phải' },
    steps: {
      en: [
        'Contact a vet as soon as possible for guidance',
        'Note down what and how much was eaten',
        "Don't self-treat without a vet's instruction",
      ],
      vi: [
        'Liên hệ thú y càng sớm càng tốt để được hướng dẫn',
        'Ghi nhớ đã ăn gì và lượng bao nhiêu',
        'Không tự xử lý nếu chưa có chỉ định từ bác sĩ',
      ],
    },
  },
  emergency: {
    title: { en: 'If your pet ate this', vi: 'Nếu thú cưng ăn phải' },
    steps: {
      en: [
        'Take your pet to the vet immediately',
        "Don't induce vomiting or attempt home treatment",
        'If seizures, difficulty breathing, or collapse occur → seek emergency care right away',
      ],
      vi: [
        'Đưa đến thú y ngay lập tức',
        'Không tự gây nôn / không tự xử lý tại nhà',
        'Nếu có co giật, khó thở, lịm → đi cấp cứu ngay',
      ],
    },
  },
};


const WHY_TITLE_BY_BADGE: Partial<Record<Badge, Bilingual>> = {
  caution: { en: 'Why caution is needed', vi: 'Tại sao cần cẩn thận' },
  toxic: { en: "Why it's toxic", vi: 'Tại sao có hại' },
  emergency: { en: 'Why this is an emergency', vi: 'Tại sao nguy hiểm' },
};

// --- HÀM HỖ TRỢ ---
// Precomputed once per badge type (not per item) — pure data, cheap to reuse.
// Only 3 tiers now: toxic = yellow (default for anything unsafe but not an
// emergency), emergency = red, safe = green. The old "cautious" tier is gone.
const STYLE_CONFIG: Record<Badge, {
  badgeBg: string; badgeBorder: string; badgeText: string;
  gradientColors: readonly [string, string];
  shadowColor: string;
  iconGradient: readonly [string, string];
  iconShadowColor: string; // 👈 thêm mới
}> = {
  emergency: {
    badgeBg: 'bg-[#FFE8E8]', badgeBorder: 'border-[#DA5A5A]/25', badgeText: 'text-[#DA5A5A]',
    gradientColors: ['#FFD6D6', '#FF8D8D'],
    shadowColor: '#FFC4C540',
    iconGradient: ['#FFF0F0', '#FFC4C5'],
    iconShadowColor: '#FFC4C580', // đỏ 50%
  },
  toxic: {
    badgeBg: 'bg-[#FFA54B]/10', badgeBorder: 'border-[#FFA54B]/25', badgeText: 'text-[#FFA54B]',
    gradientColors: ['#FFCD9C', '#FFCD9C'],
    shadowColor: '#FFC4C540',
    iconGradient: ['#FFF8F0', '#FFCD9C'],
    iconShadowColor: '#FFD2A580', // cam 50%
  },
  caution: {
    badgeBg: 'bg-[#FFBB00]/10', badgeBorder: 'border-[#FFBB00]/25', badgeText: 'text-[#FFBB00]',
    gradientColors: ['#FFEEC0', '#FFEEC0'],
    shadowColor: '#FFF6C440',
    iconGradient: ['#FFFEF0', '#FFF6C4'],
    iconShadowColor: '#FFF6C480', // vàng 50%
  },
  safe: {
    badgeBg: 'bg-[#CDFFB5]/25', badgeBorder: 'border-[#83DA5A]/25', badgeText: 'text-[#77C852]',
    gradientColors: ['#DCF6D1', '#DCF6D1'],
    shadowColor: '#D6FFC440',
    iconGradient: ['#FFFEF0', '#D6FFC4'],
    iconShadowColor: '#D6FFC480', // xanh lá 50%
  },
};


const DEFAULT_STYLE = {
  badgeBg: 'bg-[#E5E7EB]', badgeBorder: 'border-[#9CA3AF]/25', badgeText: 'text-[#9CA3AF]',
  gradientColors: ['#E5E7EB', '#9CA3AF'] as const,
  shadowColor: '#9CA3AF',
  iconGradient: ['#F9FAFB', '#D1D5DB'] as const,
  iconShadowColor: '#9CA3AF80',
};

const getStyleConfig = (type: Badge) => STYLE_CONFIG[type] ?? DEFAULT_STYLE;

// Card shadow is expensive on Android (forces its own compositing layer via
// elevation) — use a cheap border there instead, keep the nicer shadow on iOS.
const cardShadow = Platform.select({
  ios: {
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.75,
    shadowRadius: 3,
  },
  android: { elevation: 0 },
  default: {},
});


const renderBulletPoints = (items: readonly string[], lang: Lang) => {
  const fontFamily = lang === 'vi' ? 'BeVietnamPro-Regular' : 'Urbanist-Regular';

  return items.map((item, index) => (
    <View key={index} className="flex-row items-start mb-[4px]">
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
  const searchFontFamily = lang === 'vi' ? 'BeVietnamPro-Regular' : 'Urbanist-Regular';
  // FIX: a card used to be "expandable" only when it had `details` (why/symptoms),
  // which every `safe` item lacks — those use `benefits` (key benefits + feeding
  // guide) instead. That's why safe cards never opened. Now either field makes
  // the card expandable, and we render whichever one the item actually has.
  const isExpandable = !!item.details || !!item.benefits || !!ACTION_GUIDE_BY_BADGE[item.badge];
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);

  const handlePress = useCallback(() => {
    if (!isExpandable) return;
    if (!hasOpenedOnce) setHasOpenedOnce(true);
    onToggle(item.id, isExpandable);
  }, [isExpandable, hasOpenedOnce, item.id, onToggle]);
  const springHeight = useDerivedValue(() => {
    return withSpring(isExpanded ? contentHeight : 0, {
      damping: 15,
      stiffness: 100,
      mass: 1,
    });
  }, [isExpanded, contentHeight]);
  const opacityValue = useDerivedValue(() => {
    return withTiming(isExpanded ? 1 : 0, { duration: 250 });
  }, [isExpanded]);
  const containerAnimatedStyle = useAnimatedStyle(() => {
    const progress = contentHeight > 0
      ? Math.min(1, Math.max(0, springHeight.value / contentHeight))
      : 0;
    return { paddingBottom: 21 - progress * 21 };
  });



  const animatedStyle = useAnimatedStyle(() => {
    const val = springHeight.value;
    return {
      height: Math.max(0, val),
      marginBottom: Math.min(0, val),
      opacity: opacityValue.value,
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
        <Animated.View
          className="bg-white overflow-hidden"
          style={[
            { borderRadius: 20.5, paddingHorizontal: 15, paddingTop: 21 },
            containerAnimatedStyle,
          ]}
        >
          <View className="flex-row items-start">
            {/* Icon bubble nâng cấp sang Radial Gradient */}
            <View
              className="mr-3"
              style={{ width: 44, height: 52 }}
            >
              {/* LỚP BÓNG — dùng RadialGradient để mô phỏng blur, không cần <Filter> */}
              <Svg height={66} width={44} style={{ position: 'absolute', top: 0, left: 0 }}>
                <Defs>
                  <RadialGradient
                    id={`shadowGrad-${item.id}`}
                    cx="50%" cy="50%" rx="50%" ry="50%"
                  >
                    <Stop offset="0%" stopColor={styleConfig.iconShadowColor} stopOpacity={0.55} />
                    <Stop offset="30%" stopColor={styleConfig.iconShadowColor} stopOpacity={0.4} />
                    <Stop offset="55%" stopColor={styleConfig.iconShadowColor} stopOpacity={0.22} />
                    <Stop offset="100%" stopColor={styleConfig.iconShadowColor} stopOpacity={0} />
                  </RadialGradient>
                </Defs>
                <Circle
                  cx="22"
                  cy="44"        // 👈 tâm icon (22) + bán kính icon (22) = 44
                  r="22"         // 👈 cùng bán kính với icon
                  fill={`url(#shadowGrad-${item.id})`}
                />
              </Svg>


              {/* LỚP ICON — giữ nguyên như cũ */}
              <View
                className="items-center justify-center overflow-hidden"
                style={{
                  position: 'absolute', top: 0, left: 0,
                  width: 44, height: 44, borderRadius: 26.5, backgroundColor: '#FFFFFF',
                }}
              >
                <Svg height="44" width="44" style={{ position: 'absolute' }}>
                  <Defs>
                    <RadialGradient id={`grad-${item.id}`} cx="50%" cy="50%" rx="50%" ry="50%">
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
                style={{ fontFamily: searchFontFamily }}
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
                  className="mt-[12px] pt-[12px] border-t border-gray-100"
                  style={{ marginLeft: 57 }}
                >
                  {/* Risky items (cautious / danger / emergency): why + symptoms */}
                  {item.details && (
                    <>
                      {item.details.why[lang].length > 0 && (
                        <View className="mb-[12px]">
                          <Text className="text-[12px] font-semibold text-gray-900 mb-[6px]">
                            {(WHY_TITLE_BY_BADGE[item.badge] ?? item.details.whyTitle)[lang]}
                          </Text>
                          {renderBulletPoints(item.details.why[lang], lang)}
                        </View>
                      )}

                      {item.details.symptoms[lang].length > 0 && (
                        <View className="mb-[12px]">
                          <Text className="text-[12px] font-semibold text-gray-900 mb-[6px]">
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
                        <View className="mb-[12px]">
                          <Text className="text-[12px] font-semibold text-gray-900 mb-[6px]">
                            {item.benefits.benefitsTitle[lang]}
                          </Text>
                          {renderBulletPoints(item.benefits.benefits[lang], lang)}
                        </View>
                      )}

                      {item.benefits.feeding[lang].length > 0 && (
                        <View className="mb-[12px]">
                          <Text className="text-[12px] font-semibold text-gray-900 mb-[6px]">
                            {item.benefits.feedingTitle[lang]}
                          </Text>
                          {renderBulletPoints(item.benefits.feeding[lang], lang)}
                        </View>
                      )}
                    </>
                  )}

                  {ACTION_GUIDE_BY_BADGE[item.badge] && (
                    <View className="mb-[12px]">
                      <Text className="text-[12px] font-semibold text-gray-900 mb-[6px]">
                        {ACTION_GUIDE_BY_BADGE[item.badge]!.title[lang]}
                      </Text>
                      {renderBulletPoints(ACTION_GUIDE_BY_BADGE[item.badge]!.steps[lang], lang)}
                    </View>
                  )}
                </View>
              </View>
            </Animated.View>
          )}
        </Animated.View>
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
  const [rowHeights, setRowHeights] = useState<Record<string, number>>({});
  const AVG_ROW_HEIGHT = 118; // fallback tạm cho dòng chưa render tới (chưa đo được)
  const searchFontFamily = lang === 'vi' ? 'BeVietnamPro-Regular' : 'Urbanist-Regular';
  const handleRowLayout = useCallback((id: string, height: number) => {
    setRowHeights((prev) => (prev[id] === height ? prev : { ...prev, [id]: height }));
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [activePetId, setActivePetId] = useState<'dog' | 'cat'>(PETS[0].id);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = useCallback((id: string, isExpandable: boolean) => {
    if (!isExpandable) return;
    setExpandedId((current) => (current === id ? null : id));
  }, []);

  const filteredIngredients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const base = INGREDIENTS.filter((item) => {
      const matchesPet = item.pets.includes(activePetId);
      const matchesQuery =
        !q ||
        item.title.en.toLowerCase().includes(q) ||
        item.title.vi.toLowerCase().includes(q);
      return matchesPet && matchesQuery;
    });

    return [...base].sort((a, b) =>
      a.title[lang].localeCompare(b.title[lang], lang === 'vi' ? 'vi' : 'en', {
        sensitivity: 'base',
      })
    );
  }, [searchQuery, lang, activePetId]);



  const closedRowHeight = useMemo(() => {
    const values = Object.values(rowHeights);
    if (!values.length) return 118;
    const counts: Record<number, number> = {};
    values.forEach((v) => { counts[v] = (counts[v] ?? 0) + 1; });
    return Number(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]);
  }, [rowHeights]);

  const snapOffsets = useMemo(() => {
    let acc = 0;
    const offsets: number[] = [];
    filteredIngredients.forEach((item) => {
      offsets.push(acc);
      const height = item.id === expandedId
        ? rowHeights[item.id] ?? closedRowHeight
        : closedRowHeight;
      acc += height;
    });
    return offsets;
  }, [filteredIngredients, rowHeights, closedRowHeight, expandedId]);

  const renderItem = useCallback(
    ({ item }: { item: IngredientItem }) => (
      <View onLayout={(e) => handleRowLayout(item.id, e.nativeEvent.layout.height)}>
        <IngredientCard
          item={item}
          isExpanded={expandedId === item.id}
          onToggle={toggleExpand}
          lang={lang}
        />
      </View>
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
            style={{ fontFamily: searchFontFamily }}
            placeholder={t('ingredientCheck.searchPlaceholder')}
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={18} color="#8E8E93" />
            </TouchableOpacity>
          )}
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
        snapToOffsets={snapOffsets}
        snapToAlignment="start"
        decelerationRate="fast"
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