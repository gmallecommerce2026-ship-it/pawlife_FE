// app/ingredient-check.tsx
import axiosClient from '@/api/axiosClient';
import { Text } from '@/components/AppText';
import { AuthContext } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
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

// --- TYPES ---
export type Badge = 'safe' | 'caution' | 'toxic' | 'emergency';
type Lang = 'en' | 'vi';

export interface Bilingual {
  en: string;
  vi: string;
}

export interface BilingualList {
  en: string[];
  vi: string[];
}

export interface IngredientDetails {
  whyTitle: Bilingual;
  why: BilingualList;
  symptomsTitle: Bilingual;
  symptoms: BilingualList;
}

export interface IngredientBenefits {
  benefitsTitle: Bilingual;
  benefits: BilingualList;
  feedingTitle: Bilingual;
  feeding: BilingualList;
}

export interface IngredientActionGuide {
  title: Bilingual;
  steps: BilingualList;
}

export interface IngredientItem {
  id: string;
  icon: string;
  badge: Badge;
  title: Bilingual;
  riskLabel: Bilingual;
  shortContent: Bilingual;
  pets: ('dog' | 'cat')[];
  details?: IngredientDetails;
  benefits?: IngredientBenefits;
  actionGuide?: IngredientActionGuide;
}

// --- MOCK DATA: PETS (bilingual) ---
const PETS = [
  { id: 'dog', name: { en: 'Dog', vi: 'Chó' }, icon: '🐶' },
  { id: 'cat', name: { en: 'Cat', vi: 'Mèo' }, icon: '🐱' },
] as const;


const ACTION_GUIDE_BY_BADGE: Partial<Record<Badge, IngredientActionGuide>> = {
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

const RISK_LABELS: Record<Badge, Bilingual> = {
  safe: { en: 'Safe', vi: 'An toàn' },
  caution: { en: 'Caution', vi: 'Cẩn thận' },
  toxic: { en: 'Toxic', vi: 'Có hại' },
  emergency: { en: 'Emergency', vi: 'Nguy hiểm' },
};

const STYLE_CONFIG: Record<Badge, {
  badgeBg: string; badgeBorder: string; badgeText: string;
  gradientColors: readonly [string, string];
  shadowColor: string;
  iconGradient: readonly [string, string];
  iconShadowColor: string;
}> = {
  emergency: {
    badgeBg: 'bg-[#FFE8E8]', badgeBorder: 'border-[#DA5A5A]/25', badgeText: 'text-[#DA5A5A]',
    gradientColors: ['#FFD6D6', '#FF8D8D'],
    shadowColor: '#FFC4C540',
    iconGradient: ['#FFF0F0', '#FFC4C5'],
    iconShadowColor: '#FFC4C580',
  },
  toxic: {
    badgeBg: 'bg-[#FFA54B]/10', badgeBorder: 'border-[#FFA54B]/25', badgeText: 'text-[#FFA54B]',
    gradientColors: ['#FFCD9C', '#FFCD9C'],
    shadowColor: '#FFC4C540',
    iconGradient: ['#FFF8F0', '#FFCD9C'],
    iconShadowColor: '#FFD2A580',
  },
  caution: {
    badgeBg: 'bg-[#FFBB00]/10', badgeBorder: 'border-[#FFBB00]/25', badgeText: 'text-[#FFBB00]',
    gradientColors: ['#FFEEC0', '#FFEEC0'],
    shadowColor: '#FFF6C440',
    iconGradient: ['#FFFEF0', '#FFF6C4'],
    iconShadowColor: '#FFF6C480',
  },
  safe: {
    badgeBg: 'bg-[#CDFFB5]/25', badgeBorder: 'border-[#83DA5A]/25', badgeText: 'text-[#77C852]',
    gradientColors: ['#DCF6D1', '#DCF6D1'],
    shadowColor: '#D6FFC440',
    iconGradient: ['#FFFEF0', '#D6FFC4'],
    iconShadowColor: '#D6FFC480',
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

// --- HẰNG SỐ DÙNG CHO TÍNH TOÁN SNAP/SCROLL ---
const ROW_GAP = 21;
const COLLAPSED_BOTTOM_PADDING = 21;
const CLOSED_ROW_HEIGHT_FALLBACK = 118;
const DEFAULT_TITLES: Record<Badge, any> = {
  safe: {
    benefitsTitle: { vi: 'Lợi ích', en: 'Benefits' },
    feedingTitle: { vi: 'Hướng dẫn chế biến', en: 'Feeding guide' },
    whyTitle: { vi: '', en: '' },
    symptomsTitle: { vi: '', en: '' },
    guideTitle: { vi: '', en: '' },
  },
  caution: {
    whyTitle: { vi: 'Tại sao cần cẩn thận', en: 'Why caution' },
    feedingTitle: { vi: 'Hướng dẫn chế biến', en: 'Feeding guide' },
    symptomsTitle: { vi: 'Triệu chứng cần chú ý', en: 'Symptoms may occur' },
    benefitsTitle: { vi: '', en: '' },
    guideTitle: { vi: '', en: '' },
  },
  toxic: {
    whyTitle: { vi: 'Tại sao có hại', en: 'Why harmful' },
    symptomsTitle: { vi: 'Triệu chứng cần chú ý', en: 'Symptoms may occur' },
    guideTitle: { vi: 'Nếu thú cưng ăn phải', en: 'If your pet ate this' },
    benefitsTitle: { vi: '', en: '' },
    feedingTitle: { vi: '', en: '' },
  },
  emergency: {
    whyTitle: { vi: 'Tại sao nguy hiểm', en: 'Why dangerous' },
    symptomsTitle: { vi: 'Triệu chứng cần chú ý', en: 'Symptoms may occur' },
    guideTitle: { vi: 'Nếu thú cưng ăn phải', en: 'If your pet ate this' },
    benefitsTitle: { vi: '', en: '' },
    feedingTitle: { vi: '', en: '' },
  }
};
// --- COMPONENT ITEM ---
const IngredientCard = React.memo(function IngredientCard({
  item,
  isExpanded,
  onToggle,
  lang,
  isAdmin,
  onEdit,
  onDelete,
  onCalibrateHeight,
  onContentMeasured,
}: {
  item: IngredientItem;
  isExpanded: boolean;
  onToggle: (id: string, isExpandable: boolean) => void;
  lang: Lang;
  isAdmin: boolean;
  onEdit: (item: IngredientItem) => void;
  onDelete: (id: string, name: string) => void;
  onCalibrateHeight: (height: number) => void;
  onContentMeasured: (id: string, height: number) => void;
}) {
  const styleConfig = getStyleConfig(item.badge);
  const searchFontFamily = lang === 'vi' ? 'BeVietnamPro-Regular' : 'Urbanist-Regular';

  const guide = item.actionGuide;
  const isExpandable = !!item.details || !!item.benefits || !!guide;

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
    <View className="mb-[21px]" onLayout={(e) => onCalibrateHeight(e.nativeEvent.layout.height)}>
      <TouchableOpacity
        activeOpacity={isExpandable ? 0.8 : 1}
        onPress={handlePress}
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
              <View className="mr-3" style={{ width: 44, height: 52 }}>
                <Svg height={66} width={44} style={{ position: 'absolute', top: 0, left: 0 }}>
                  <Defs>
                    <RadialGradient id={`shadowGrad-${item.id}`} cx="50%" cy="50%" rx="50%" ry="50%">
                      <Stop offset="0%" stopColor={styleConfig.iconShadowColor} stopOpacity={0.55} />
                      <Stop offset="30%" stopColor={styleConfig.iconShadowColor} stopOpacity={0.4} />
                      <Stop offset="55%" stopColor={styleConfig.iconShadowColor} stopOpacity={0.22} />
                      <Stop offset="100%" stopColor={styleConfig.iconShadowColor} stopOpacity={0} />
                    </RadialGradient>
                  </Defs>
                  <Circle cx="22" cy="44" r="22" fill={`url(#shadowGrad-${item.id})`} />
                </Svg>

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

                  <View className="flex-row items-center">
                    {isAdmin && (
                      <View className="flex-row items-center mr-2.5 pr-2.5 border-r border-gray-200">
                        <TouchableOpacity onPress={() => onEdit(item)} hitSlop={{ top: 15, bottom: 15, left: 10, right: 10 }} className="mr-3">
                          <Feather name="edit-2" size={14} color="#6B7280" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => onDelete(item.id, item.title[lang])} hitSlop={{ top: 15, bottom: 15, left: 10, right: 10 }}>
                          <Feather name="trash-2" size={14} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    )}
                    <View className={`px-2 py-1 rounded-[1000px] border ${styleConfig.badgeBg} ${styleConfig.badgeBorder}`}>
                      <Text className={`text-[10px] font-regular ${styleConfig.badgeText}`}>{item.riskLabel[lang]}</Text>
                    </View>
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
                    if (isExpanded) onContentMeasured(item.id, h);
                  }}
                >
                  <View className="mt-[12px] pt-[12px] border-t border-gray-100" style={{ marginLeft: 57 }}>
                    {item.details && (
                      <>
                        {item.details.why[lang].length > 0 && (
                          <View className="mb-[12px]">
                            <Text className="text-[12px] font-semibold text-gray-900 mb-[6px]">
                              {item.details.whyTitle[lang]}
                            </Text>
                            {renderBulletPoints(item.details.why[lang], lang)}
                          </View>
                        )}
                        {item.details.symptoms[lang].length > 0 && (
                          <View className="mb-[12px]">
                            <Text className="text-[12px] font-semibold text-gray-900 mb-[6px]">{item.details.symptomsTitle[lang]}</Text>
                            {renderBulletPoints(item.details.symptoms[lang], lang)}
                          </View>
                        )}
                      </>
                    )}

                    {item.benefits && (
                      <>
                        {item.benefits.benefits[lang].length > 0 && (
                          <View className="mb-[12px]">
                            <Text className="text-[12px] font-semibold text-gray-900 mb-[6px]">{item.benefits.benefitsTitle[lang]}</Text>
                            {renderBulletPoints(item.benefits.benefits[lang], lang)}
                          </View>
                        )}
                        {item.benefits.feeding[lang].length > 0 && (
                          <View className="mb-[12px]">
                            <Text className="text-[12px] font-semibold text-gray-900 mb-[6px]">{item.benefits.feedingTitle[lang]}</Text>
                            {renderBulletPoints(item.benefits.feeding[lang], lang)}
                          </View>
                        )}
                      </>
                    )}

                    {guide && (
                      <View className="mb-[12px]">
                        <Text className="text-[12px] font-semibold text-gray-900 mb-[6px]">{guide.title[lang]}</Text>
                        {renderBulletPoints(guide.steps[lang], lang)}
                      </View>
                    )}
                  </View>
                </View>
              </Animated.View>
            )}
          </Animated.View>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.item === nextProps.item &&        // <-- thêm dòng này (check content thật, không chỉ id)
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.lang === nextProps.lang &&
    prevProps.isAdmin === nextProps.isAdmin
  );
});

// --- SCREEN CHÍNH ---
export default function IngredientCheckScreen() {
  const router = useRouter();
  const { user } = useContext(AuthContext) as any;
  const { t, language } = useLanguage();
  const isVi = language === 'vi';
  const lang: Lang = isVi ? 'vi' : 'en';

  const isAdmin = user?.email === 'hello@pawlife.vn';

  const [closedRowHeight, setClosedRowHeight] = useState(CLOSED_ROW_HEIGHT_FALLBACK);
  const [expandedContentHeight, setExpandedContentHeight] = useState(0);
  const hasCalibratedRef = useRef(false);
  const searchFontFamily = lang === 'vi' ? 'BeVietnamPro-Regular' : 'Urbanist-Regular';

  const handleCalibrateHeight = useCallback((height: number) => {
    if (hasCalibratedRef.current || height <= 0) return;
    hasCalibratedRef.current = true;
    setClosedRowHeight(height);
  }, []);

  useEffect(() => {
    hasCalibratedRef.current = false;
  }, [lang]);

  const handleExpandedContentLayout = useCallback((id: string, height: number) => {
    setExpandedContentHeight((prev) => (Math.abs(prev - height) > 1 ? height : prev));
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [activePetId, setActivePetId] = useState<'dog' | 'cat'>(PETS[0].id);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setExpandedContentHeight(0);
  }, [expandedId]);
  const handleBadgeChange = useCallback((badge: Badge) => {
    setIngBadge(badge);
    const titles = DEFAULT_TITLES[badge];

    // Auto set các title theo badge
    if (titles.benefitsTitle.vi) setBenefitsTitleVi(titles.benefitsTitle.vi);
    if (titles.benefitsTitle.en) setBenefitsTitleEn(titles.benefitsTitle.en);

    if (titles.feedingTitle.vi) setFeedingTitleVi(titles.feedingTitle.vi);
    if (titles.feedingTitle.en) setFeedingTitleEn(titles.feedingTitle.en);

    if (titles.whyTitle.vi) setWhyTitleVi(titles.whyTitle.vi);
    if (titles.whyTitle.en) setWhyTitleEn(titles.whyTitle.en);

    if (titles.symptomsTitle.vi) setSymptomsTitleVi(titles.symptomsTitle.vi);
    if (titles.symptomsTitle.en) setSymptomsTitleEn(titles.symptomsTitle.en);

    if (titles.guideTitle.vi) setGuideTitleVi(titles.guideTitle.vi);
    if (titles.guideTitle.en) setGuideTitleEn(titles.guideTitle.en);
  }, []);
  // --- API DATA STATES ---
  const [ingredientsData, setIngredientsData] = useState<IngredientItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- ADMIN STATES ---
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [formLang, setFormLang] = useState<Lang>('vi');
  const [ingPets, setIngPets] = useState<('dog' | 'cat')[]>(['dog', 'cat']);
  const [ingNameVi, setIngNameVi] = useState('');
  const [ingNameEn, setIngNameEn] = useState('');
  const [ingDescVi, setIngDescVi] = useState('');
  const [ingDescEn, setIngDescEn] = useState('');
  const [ingBadge, setIngBadge] = useState<Badge>('safe');
  const [ingIcon, setIngIcon] = useState('📌');
  const [guideTitleVi, setGuideTitleVi] = useState('');
  const [guideTitleEn, setGuideTitleEn] = useState('');
  const [guideStepsVi, setGuideStepsVi] = useState('');
  const [guideStepsEn, setGuideStepsEn] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isGuideModified, setIsGuideModified] = useState(false);
  // ... các state cũ (ingNameVi, ingNameEn...)
  const [whyTitleVi, setWhyTitleVi] = useState('');
  const [whyTitleEn, setWhyTitleEn] = useState('');
  const [whyVi, setWhyVi] = useState('');
  const [whyEn, setWhyEn] = useState('');

  const [symptomsTitleVi, setSymptomsTitleVi] = useState('');
  const [symptomsTitleEn, setSymptomsTitleEn] = useState('');
  const [symptomsVi, setSymptomsVi] = useState('');
  const [symptomsEn, setSymptomsEn] = useState('');

  const [benefitsTitleVi, setBenefitsTitleVi] = useState('');
  const [benefitsTitleEn, setBenefitsTitleEn] = useState('');
  const [benefitsVi, setBenefitsVi] = useState('');
  const [benefitsEn, setBenefitsEn] = useState('');

  const [feedingTitleVi, setFeedingTitleVi] = useState('');
  const [feedingTitleEn, setFeedingTitleEn] = useState('');
  const [feedingVi, setFeedingVi] = useState('');
  const [feedingEn, setFeedingEn] = useState('');


  const handleFieldFocus = useCallback((field: string) => {
    setFocusedField(field);
  }, []);

  const handleFieldBlur = useCallback(() => {
    setFocusedField(null);
  }, []);

  const handleTogglePet = (pet: 'dog' | 'cat') => {
    setIngPets(prev => prev.includes(pet) ? prev.filter(p => p !== pet) : [...prev, pet]);
  };

  const fetchIngredients = useCallback(async () => {
    try {
      const res = await axiosClient.get('/ingredients');
      setIngredientsData(res.data);
    } catch (error) {
      console.error('Error fetching ingredients', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);

  const toggleExpand = useCallback((id: string, isExpandable: boolean) => {
    if (!isExpandable) return;
    setExpandedId((current) => (current === id ? null : id));
  }, []);

  const filteredIngredients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const base = ingredientsData.filter((item) => {
      const matchesPet = item.pets && item.pets.includes(activePetId);
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
  }, [searchQuery, lang, activePetId, ingredientsData]);

  const snapOffsets = useMemo(() => {
    let acc = 0;
    const offsets: number[] = [];
    filteredIngredients.forEach((item) => {
      offsets.push(acc);
      const cardHeight =
        item.id === expandedId
          ? closedRowHeight - COLLAPSED_BOTTOM_PADDING + expandedContentHeight
          : closedRowHeight;
      acc += cardHeight + ROW_GAP;
    });
    return offsets;
  }, [filteredIngredients, expandedId, closedRowHeight, expandedContentHeight]);

  const getItemLayout = useCallback(
    (_data: ArrayLike<IngredientItem> | null | undefined, index: number) => {
      const offset = snapOffsets[index] ?? closedRowHeight * index;
      const nextOffset = snapOffsets[index + 1] ?? offset + closedRowHeight + ROW_GAP;
      return { length: nextOffset - offset, offset, index };
    },
    [snapOffsets, closedRowHeight]
  );

  // --- ADMIN HANDLERS ---
  const handleOpenAdd = useCallback(() => {
    setEditId(null);
    setIngPets(['dog', 'cat']);
    setIngNameVi(''); setIngNameEn('');
    setIngDescVi(''); setIngDescEn('');
    setIngIcon('📌');

    // Xóa nội dung
    setGuideStepsVi(''); setGuideStepsEn('');
    setWhyVi(''); setWhyEn('');
    setSymptomsVi(''); setSymptomsEn('');
    setBenefitsVi(''); setBenefitsEn('');
    setFeedingVi(''); setFeedingEn('');

    // Tự động set Badge mặc định là 'safe' và auto fill title
    handleBadgeChange('safe');

    setFormLang(lang);
    setFocusedField(null);
    setShowAdminModal(true);
  }, [lang, handleBadgeChange]);

  const handleOpenEdit = useCallback((item: IngredientItem) => {
    setEditId(item.id);
    setIngPets(item.pets && item.pets.length > 0 ? item.pets : ['dog', 'cat']);
    setIngNameVi(item.title?.vi || '');
    setIngNameEn(item.title?.en || '');
    setIngDescVi(item.shortContent?.vi || '');
    setIngDescEn(item.shortContent?.en || '');
    setIngBadge(item.badge);
    setIngIcon(item.icon || '📌');

    const defaultTitles = DEFAULT_TITLES[item.badge];

    const guide = item.actionGuide || ACTION_GUIDE_BY_BADGE[item.badge];
    setGuideTitleVi(guide?.title?.vi || defaultTitles.guideTitle.vi);
    setGuideTitleEn(guide?.title?.en || defaultTitles.guideTitle.en);
    setGuideStepsVi(guide?.steps?.vi?.join('\n') || '');
    setGuideStepsEn(guide?.steps?.en?.join('\n') || '');

    setWhyTitleVi(item.details?.whyTitle?.vi || defaultTitles.whyTitle.vi);
    setWhyTitleEn(item.details?.whyTitle?.en || defaultTitles.whyTitle.en);
    setWhyVi(item.details?.why?.vi?.join('\n') || '');
    setWhyEn(item.details?.why?.en?.join('\n') || '');

    setSymptomsTitleVi(item.details?.symptomsTitle?.vi || defaultTitles.symptomsTitle.vi);
    setSymptomsTitleEn(item.details?.symptomsTitle?.en || defaultTitles.symptomsTitle.en);
    setSymptomsVi(item.details?.symptoms?.vi?.join('\n') || '');
    setSymptomsEn(item.details?.symptoms?.en?.join('\n') || '');

    setBenefitsTitleVi(item.benefits?.benefitsTitle?.vi || defaultTitles.benefitsTitle.vi);
    setBenefitsTitleEn(item.benefits?.benefitsTitle?.en || defaultTitles.benefitsTitle.en);
    setBenefitsVi(item.benefits?.benefits?.vi?.join('\n') || '');
    setBenefitsEn(item.benefits?.benefits?.en?.join('\n') || '');

    setFeedingTitleVi(item.benefits?.feedingTitle?.vi || defaultTitles.feedingTitle.vi);
    setFeedingTitleEn(item.benefits?.feedingTitle?.en || defaultTitles.feedingTitle.en);
    setFeedingVi(item.benefits?.feeding?.vi?.join('\n') || '');
    setFeedingEn(item.benefits?.feeding?.en?.join('\n') || '');

    setFormLang(lang);
    setFocusedField(null);
    setShowAdminModal(true);
  }, [lang]);

  const handleDeleteIngredient = useCallback((id: string, name: string) => {
    Alert.alert(
      isVi ? "Xoá thành phần" : "Delete Ingredient",
      isVi ? `Bạn có chắc chắn muốn xoá ${name}?` : `Are you sure you want to delete ${name}?`,
      [
        { text: isVi ? "Hủy" : "Cancel", style: "cancel" },
        {
          text: isVi ? "Xoá" : "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await axiosClient.delete(`/ingredients/${id}`);
              Alert.alert('Thành công', 'Đã xoá thành phần.');
              fetchIngredients();
            } catch (error: any) {
              Alert.alert('Lỗi', 'Không thể xoá thành phần.');
            }
          }
        }
      ]
    );
  }, [isVi, fetchIngredients]);

  const handleSaveIngredient = async () => {
    if (!ingNameVi.trim() || !ingNameEn.trim()) {
      Alert.alert(isVi ? 'Lỗi' : 'Error', isVi ? 'Vui lòng nhập tên thành phần (cả 2 ngôn ngữ)' : 'Ingredient name is required (both languages)');
      return;
    }
    if (ingPets.length === 0) {
      Alert.alert(isVi ? 'Lỗi' : 'Error', isVi ? 'Vui lòng chọn ít nhất 1 đối tượng (Chó/Mèo)' : 'Please select at least 1 pet target (Dog/Cat)');
      return;
    }

    setIsSubmitting(true);
    try {
      const generateId = editId || ingNameEn.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();

      const formattedStepsVi = guideStepsVi.split('\n').filter(s => s.trim() !== '');
      const formattedStepsEn = guideStepsEn.split('\n').filter(s => s.trim() !== '');

      const isSafe = ingBadge === 'safe';
      const isCaution = ingBadge === 'caution';
      const isToxicOrEmergency = ingBadge === 'toxic' || ingBadge === 'emergency';

      const payload = {
        id: generateId,
        icon: ingIcon || '📌',
        pets: ingPets,
        badge: ingBadge,
        title: { vi: ingNameVi, en: ingNameEn },
        riskLabel: RISK_LABELS[ingBadge],
        shortContent: { vi: ingDescVi, en: ingDescEn },

        actionGuide: {
          title: { vi: guideTitleVi, en: guideTitleEn },
          steps: {
            vi: guideStepsVi.split('\n').filter(s => s.trim() !== ''),
            en: guideStepsEn.split('\n').filter(s => s.trim() !== ''),
          },
        },
        details: {
          whyTitle: { vi: whyTitleVi, en: whyTitleEn },
          why: {
            vi: whyVi.split('\n').filter(s => s.trim() !== ''),
            en: whyEn.split('\n').filter(s => s.trim() !== ''),
          },
          symptomsTitle: { vi: symptomsTitleVi, en: symptomsTitleEn },
          symptoms: {
            vi: symptomsVi.split('\n').filter(s => s.trim() !== ''),
            en: symptomsEn.split('\n').filter(s => s.trim() !== ''),
          },
        },
        benefits: {
          benefitsTitle: { vi: benefitsTitleVi, en: benefitsTitleEn },
          benefits: {
            vi: benefitsVi.split('\n').filter(s => s.trim() !== ''),
            en: benefitsEn.split('\n').filter(s => s.trim() !== ''),
          },
          feedingTitle: { vi: feedingTitleVi, en: feedingTitleEn },
          feeding: {
            vi: feedingVi.split('\n').filter(s => s.trim() !== ''),
            en: feedingEn.split('\n').filter(s => s.trim() !== ''),
          },
        },
      };

      if (editId) {
        await axiosClient.patch(`/ingredients/${editId}`, payload);
        Alert.alert('Thành công', 'Đã cập nhật thành phần.');
      } else {
        await axiosClient.post('/ingredients', payload);
        Alert.alert('Thành công', 'Đã thêm thành phần mới.');
      }
      setShowAdminModal(false);
      fetchIngredients();
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể lưu thành phần.');
    } finally {
      setIsSubmitting(false);
    }
  };


  const renderItem = useCallback(
    ({ item }: { item: IngredientItem }) => (
      <IngredientCard
        item={item}
        isExpanded={expandedId === item.id}
        onToggle={toggleExpand}
        lang={lang}
        isAdmin={isAdmin}
        onEdit={handleOpenEdit}
        onDelete={handleDeleteIngredient}
        onCalibrateHeight={handleCalibrateHeight}
        onContentMeasured={handleExpandedContentLayout}
      />
    ),
    [expandedId, toggleExpand, lang, isAdmin, handleOpenEdit, handleDeleteIngredient, handleCalibrateHeight, handleExpandedContentLayout]
  );

  const viMissing = !ingNameVi.trim();
  const enMissing = !ingNameEn.trim();

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
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#E89B5A" />
        </View>
      ) : (
        <FlatList
          data={filteredIngredients}
          keyExtractor={item => item.id}
          extraData={expandedId}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
          renderItem={renderItem}
          snapToOffsets={snapOffsets}
          snapToAlignment="start"
          decelerationRate="fast"
          getItemLayout={getItemLayout}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={Platform.OS === 'android'}
        />
      )}

      {/* ========================================= */}
      {/* UI CHỈ DÀNH CHO ADMIN (Nút nổi Thêm mới) */}
      {/* ========================================= */}
      {isAdmin && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleOpenAdd}
          className="absolute bottom-6 right-6 w-14 h-14 bg-[#E89B5A] rounded-full items-center justify-center shadow-lg shadow-orange-300 z-50"
        >
          <Feather name="plus" size={24} color="white" />
        </TouchableOpacity>
      )}

      {/* ========================================= */}
      {/* MODAL THÊM / SỬA (CHỈ MỞ BỞI ADMIN) */}
      {/* ========================================= */}
      <Modal visible={showAdminModal} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ height: '92%' }}
          >
            <View className="flex-1 bg-white rounded-t-[28px] px-6 pt-3 pb-6">
              <View className="items-center mb-4">
                <View style={{ width: 40, height: 4, borderRadius: 999, backgroundColor: '#E5E7EB' }} />
              </View>

              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold text-gray-900">
                  {editId ? 'Sửa thành phần' : 'Thêm thành phần mới'}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowAdminModal(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
                >
                  <Feather name="x" size={18} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
                <View>
                  {/* --- PREVIEW TRỰC QUAN --- */}
                  <View
                    className="flex-row items-center bg-white rounded-2xl border border-gray-100 px-3 py-3 mb-4"
                    style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
                  >
                    <View style={{ width: 44, height: 44 }}>
                      <Svg height="44" width="44" style={{ position: 'absolute' }}>
                        <Defs>
                          <RadialGradient id="adminPreviewGrad" cx="50%" cy="50%" rx="50%" ry="50%">
                            <Stop offset="100%" stopColor={getStyleConfig(ingBadge).iconGradient[1]} />
                            <Stop offset="0%" stopColor={getStyleConfig(ingBadge).iconGradient[0]} />
                          </RadialGradient>
                        </Defs>
                        <Circle cx="22" cy="22" r="22" fill="url(#adminPreviewGrad)" />
                      </Svg>
                      <View className="items-center justify-center" style={{ width: 44, height: 44 }}>
                        <Text style={{ fontSize: 20 }}>{ingIcon || '📌'}</Text>
                      </View>
                    </View>

                    <View className="flex-1 ml-3">
                      <View className="flex-row items-center justify-between mb-0.5">
                        <Text className="text-[14px] font-semibold text-gray-900 flex-1 pr-2" numberOfLines={1}>
                          {(formLang === 'vi' ? ingNameVi : ingNameEn) || (formLang === 'vi' ? 'Tên thành phần' : 'Ingredient name')}
                        </Text>
                        <View className={`px-2 py-0.5 rounded-full border ${getStyleConfig(ingBadge).badgeBg} ${getStyleConfig(ingBadge).badgeBorder}`}>
                          <Text className={`text-[10px] ${getStyleConfig(ingBadge).badgeText}`}>{RISK_LABELS[ingBadge][formLang]}</Text>
                        </View>
                      </View>
                      <Text className="text-[12px] text-[#8E8E93]" numberOfLines={1}>
                        {(formLang === 'vi' ? ingDescVi : ingDescEn) || (formLang === 'vi' ? 'Mô tả ngắn...' : 'Short description...')}
                      </Text>
                    </View>
                  </View>

                  {/* --- TAB CHUYỂN NGÔN NGỮ --- */}
                  <View className="flex-row bg-gray-100 rounded-xl p-1 mb-4">
                    <TouchableOpacity
                      onPress={() => setFormLang('vi')}
                      activeOpacity={0.8}
                      className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg ${formLang === 'vi' ? 'bg-white' : ''}`}
                      style={formLang === 'vi' ? { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 } : undefined}
                    >
                      <Text className={`text-sm font-semibold ${formLang === 'vi' ? 'text-[#E89B5A]' : 'text-gray-500'}`}>
                        🇻🇳 Tiếng Việt
                      </Text>
                      {viMissing && <View className="w-1.5 h-1.5 rounded-full bg-red-400 ml-1.5" />}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setFormLang('en')}
                      activeOpacity={0.8}
                      className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg ${formLang === 'en' ? 'bg-white' : ''}`}
                      style={formLang === 'en' ? { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 } : undefined}
                    >
                      <Text className={`text-sm font-semibold ${formLang === 'en' ? 'text-[#E89B5A]' : 'text-gray-500'}`}>
                        🇬🇧 English
                      </Text>
                      {enMissing && <View className="w-1.5 h-1.5 rounded-full bg-red-400 ml-1.5" />}
                    </TouchableOpacity>
                  </View>

                  {/* --- NỘI DUNG THEO TAB --- */}
                  {formLang === 'vi' ? (
                    <>
                      <Text className="text-sm font-medium text-gray-700 mb-1.5">Tên thành phần (VI)</Text>
                      <TextInput
                        className="bg-gray-50 border rounded-xl px-4 py-2.5 mb-3 text-base text-black"
                        style={{ borderColor: focusedField === 'nameVi' ? '#E89B5A' : '#E5E7EB', borderWidth: focusedField === 'nameVi' ? 1.5 : 1 }}
                        placeholder="VD: Nho"
                        value={ingNameVi}
                        onChangeText={setIngNameVi}
                        onFocus={() => handleFieldFocus('nameVi')}
                        onBlur={handleFieldBlur}
                      />

                      <Text className="text-sm font-medium text-gray-700 mb-1.5">Mô tả ngắn (VI)</Text>
                      <TextInput
                        className="bg-gray-50 border rounded-xl px-4 py-3 mb-4 text-base text-black min-h-[60px]"
                        style={{ borderColor: focusedField === 'descVi' ? '#E89B5A' : '#E5E7EB', borderWidth: focusedField === 'descVi' ? 1.5 : 1 }}
                        placeholder="Mô tả..."
                        value={ingDescVi}
                        onChangeText={setIngDescVi}
                        onFocus={() => handleFieldFocus('descVi')}
                        onBlur={handleFieldBlur}
                        multiline
                        textAlignVertical="top"
                      />


                    </>
                  ) : (
                    <>
                      <Text className="text-sm font-medium text-gray-700 mb-1.5">Ingredient name (EN)</Text>
                      <TextInput
                        className="bg-gray-50 border rounded-xl px-4 py-2.5 mb-3 text-base text-black"
                        style={{ borderColor: focusedField === 'nameEn' ? '#E89B5A' : '#E5E7EB', borderWidth: focusedField === 'nameEn' ? 1.5 : 1 }}
                        placeholder="e.g. Grapes"
                        value={ingNameEn}
                        onChangeText={setIngNameEn}
                        onFocus={() => handleFieldFocus('nameEn')}
                        onBlur={handleFieldBlur}
                      />

                      <Text className="text-sm font-medium text-gray-700 mb-1.5">Short description (EN)</Text>
                      <TextInput
                        className="bg-gray-50 border rounded-xl px-4 py-3 mb-4 text-base text-black min-h-[60px]"
                        style={{ borderColor: focusedField === 'descEn' ? '#E89B5A' : '#E5E7EB', borderWidth: focusedField === 'descEn' ? 1.5 : 1 }}
                        placeholder="Description..."
                        value={ingDescEn}
                        onChangeText={setIngDescEn}
                        onFocus={() => handleFieldFocus('descEn')}
                        onBlur={handleFieldBlur}
                        multiline
                        textAlignVertical="top"
                      />

                    </>
                  )}

                  {/* --- THÔNG TIN CHUNG --- */}
                  <Text className="text-[11px] font-semibold text-gray-400 tracking-wider mb-2.5 mt-2">
                    THÔNG TIN CHUNG
                  </Text>

                  <View className="mb-4">
                    <Text className="text-sm font-medium text-gray-700 mb-1.5">Áp dụng cho (Pets)</Text>
                    <View className="flex-row gap-3">
                      <TouchableOpacity
                        onPress={() => handleTogglePet('dog')}
                        activeOpacity={0.7}
                        className={`flex-1 py-2.5 border rounded-xl items-center flex-row justify-center ${ingPets.includes('dog') ? 'bg-orange-50 border-orange-400' : 'bg-gray-50 border-gray-200'}`}
                      >
                        <Text className="text-base mr-2">🐶</Text>
                        <Text className={`font-semibold ${ingPets.includes('dog') ? 'text-orange-500' : 'text-gray-500'}`}>Chó</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleTogglePet('cat')}
                        activeOpacity={0.7}
                        className={`flex-1 py-2.5 border rounded-xl items-center flex-row justify-center ${ingPets.includes('cat') ? 'bg-orange-50 border-orange-400' : 'bg-gray-50 border-gray-200'}`}
                      >
                        <Text className="text-base mr-2">🐱</Text>
                        <Text className={`font-semibold ${ingPets.includes('cat') ? 'text-orange-500' : 'text-gray-500'}`}>Mèo</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View className="flex-row items-start mb-6">
                    <View className="mr-4">
                      <Text className="text-sm font-medium text-gray-700 mb-1.5">Icon</Text>
                      <TextInput
                        className="bg-gray-50 border rounded-xl w-[60px] h-[48px] text-black"
                        style={{
                          fontSize: 20, textAlign: 'center',
                          borderColor: focusedField === 'icon' ? '#E89B5A' : '#E5E7EB',
                          borderWidth: focusedField === 'icon' ? 1.5 : 1,
                        }}
                        placeholder="📌"
                        value={ingIcon}
                        onChangeText={setIngIcon}
                        onFocus={() => handleFieldFocus('icon')}
                        onBlur={handleFieldBlur}
                        maxLength={4}
                      />
                    </View>

                    <View className="flex-1">
                      <Text className="text-sm font-medium text-gray-700 mb-1.5">Mức độ rủi ro (Badge)</Text>
                      <View className="flex-row flex-wrap gap-2">
                        {(['safe', 'caution', 'toxic', 'emergency'] as Badge[]).map((badge) => {
                          const s = getStyleConfig(badge);
                          const active = ingBadge === badge;
                          return (
                            <TouchableOpacity
                              key={badge}
                              onPress={() => handleBadgeChange(badge)}
                              activeOpacity={0.8}
                              className={`px-3 py-2 rounded-full border ${active ? s.badgeBg : 'bg-white'} ${active ? s.badgeBorder : 'border-gray-200'}`}
                              style={active ? { borderWidth: 1.5 } : undefined}
                            >
                              <Text className={`text-[12px] font-semibold ${active ? s.badgeText : 'text-gray-400'}`}>
                                {RISK_LABELS[badge][lang]}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                  </View>
                  {(() => {
                    const isSafe = ingBadge === 'safe';
                    const isCaution = ingBadge === 'caution';
                    const isToxicOrEmergency = ingBadge === 'toxic' || ingBadge === 'emergency';

                    return (
                      <View className="mt-2">
                        {/* 1. KHỐI LỢI ÍCH & HƯỚNG DẪN CHO ĂN (SAFE + CAUTION) */}
                        {(isSafe || isCaution) && (
                          <View className="mb-6 bg-green-50 border border-green-100 p-4 rounded-xl">
                            <Text className="text-sm font-bold text-gray-900 mb-3">
                              {formLang === 'vi' ? (isSafe ? 'Lợi ích & Cách cho ăn' : 'Hướng dẫn cho ăn') : (isSafe ? 'Benefits & Feeding' : 'Feeding Guide')}
                            </Text>

                            {isSafe && (
                              <>
                                <Text className="text-[13px] font-medium text-gray-700 mb-1.5">{formLang === 'vi' ? 'Tiêu đề Lợi ích' : 'Benefits Title'}</Text>
                                <TextInput className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 mb-3 text-black"
                                  value={formLang === 'vi' ? benefitsTitleVi : benefitsTitleEn}
                                  onChangeText={t => formLang === 'vi' ? setBenefitsTitleVi(t) : setBenefitsTitleEn(t)} />

                                <Text className="text-[13px] font-medium text-gray-700 mb-1.5">{formLang === 'vi' ? 'Các lợi ích (Mỗi lợi ích 1 dòng)' : 'Benefits (1 per line)'}</Text>
                                <TextInput className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-3 text-black min-h-[60px]" multiline textAlignVertical="top"
                                  value={formLang === 'vi' ? benefitsVi : benefitsEn}
                                  onChangeText={t => formLang === 'vi' ? setBenefitsVi(t) : setBenefitsEn(t)} />
                              </>
                            )}

                            <Text className="text-[13px] font-medium text-gray-700 mb-1.5">{formLang === 'vi' ? 'Tiêu đề Hướng dẫn' : 'Feeding Title'}</Text>
                            <TextInput className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 mb-3 text-black"
                              value={formLang === 'vi' ? feedingTitleVi : feedingTitleEn}
                              onChangeText={t => formLang === 'vi' ? setFeedingTitleVi(t) : setFeedingTitleEn(t)} />

                            <Text className="text-[13px] font-medium text-gray-700 mb-1.5">{formLang === 'vi' ? 'Hướng dẫn (Mỗi bước 1 dòng)' : 'Feeding guide (1 per line)'}</Text>
                            <TextInput className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-black min-h-[60px]" multiline textAlignVertical="top"
                              value={formLang === 'vi' ? feedingVi : feedingEn}
                              onChangeText={t => formLang === 'vi' ? setFeedingVi(t) : setFeedingEn(t)} />
                          </View>
                        )}

                        {/* 2. KHỐI TẠI SAO CÓ HẠI & TRIỆU CHỨNG (CAUTION + TOXIC + EMERGENCY) */}
                        {(isCaution || isToxicOrEmergency) && (
                          <View className="mb-6 bg-red-50 border border-red-100 p-4 rounded-xl">
                            <Text className="text-sm font-bold text-gray-900 mb-3">
                              {formLang === 'vi' ? (isCaution ? 'Tại sao cẩn thận' : 'Tại sao & Triệu chứng') : (isCaution ? 'Why Caution' : 'Why & Symptoms')}
                            </Text>

                            <Text className="text-[13px] font-medium text-gray-700 mb-1.5">{formLang === 'vi' ? 'Tiêu đề Giải thích' : 'Why Title'}</Text>
                            <TextInput className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 mb-3 text-black"
                              value={formLang === 'vi' ? whyTitleVi : whyTitleEn}
                              onChangeText={t => formLang === 'vi' ? setWhyTitleVi(t) : setWhyTitleEn(t)} />

                            <Text className="text-[13px] font-medium text-gray-700 mb-1.5">{formLang === 'vi' ? 'Giải thích (Mỗi lý do 1 dòng)' : 'Why details (1 per line)'}</Text>
                            <TextInput className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-3 text-black min-h-[60px]" multiline textAlignVertical="top"
                              value={formLang === 'vi' ? whyVi : whyEn}
                              onChangeText={t => formLang === 'vi' ? setWhyVi(t) : setWhyEn(t)} />

                            {isToxicOrEmergency && (
                              <>
                                <Text className="text-[13px] font-medium text-gray-700 mb-1.5">{formLang === 'vi' ? 'Tiêu đề Triệu chứng' : 'Symptoms Title'}</Text>
                                <TextInput className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 mb-3 text-black"
                                  value={formLang === 'vi' ? symptomsTitleVi : symptomsTitleEn}
                                  onChangeText={t => formLang === 'vi' ? setSymptomsTitleVi(t) : setSymptomsTitleEn(t)} />

                                <Text className="text-[13px] font-medium text-gray-700 mb-1.5">{formLang === 'vi' ? 'Các triệu chứng (Mỗi triệu chứng 1 dòng)' : 'Symptoms (1 per line)'}</Text>
                                <TextInput className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-black min-h-[60px]" multiline textAlignVertical="top"
                                  value={formLang === 'vi' ? symptomsVi : symptomsEn}
                                  onChangeText={t => formLang === 'vi' ? setSymptomsVi(t) : setSymptomsEn(t)} />
                              </>
                            )}
                          </View>
                        )}

                        {/* 3. KHỐI ACTION GUIDE (CAUTION + TOXIC + EMERGENCY) */}
                        {(isCaution || isToxicOrEmergency) && (
                          <View className="mb-6 bg-orange-50 border border-orange-100 p-4 rounded-xl">
                            <Text className="text-sm font-bold text-gray-900 mb-3">
                              {formLang === 'vi' ? 'Action Guide (VI)' : 'Action Guide (EN)'}
                            </Text>

                            <Text className="text-[13px] font-medium text-gray-700 mb-1.5">{formLang === 'vi' ? 'Tiêu đề hướng dẫn xử lý' : 'Action guide title'}</Text>
                            <TextInput className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 mb-3 text-black"
                              value={formLang === 'vi' ? guideTitleVi : guideTitleEn}
                              onChangeText={t => formLang === 'vi' ? setGuideTitleVi(t) : setGuideTitleEn(t)} />

                            <Text className="text-[13px] font-medium text-gray-700 mb-1.5">{formLang === 'vi' ? 'Các bước xử lý (Mỗi bước 1 dòng)' : 'Action steps (1 per line)'}</Text>
                            <TextInput className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-black min-h-[80px]" multiline textAlignVertical="top"
                              value={formLang === 'vi' ? guideStepsVi : guideStepsEn}
                              onChangeText={t => formLang === 'vi' ? setGuideStepsVi(t) : setGuideStepsEn(t)} />
                          </View>
                        )}
                      </View>
                    );
                  })()}
                  <TouchableOpacity
                    className={`w-full py-4 rounded-xl flex-row justify-center items-center ${isSubmitting ? 'bg-orange-300' : 'bg-[#E89B5A]'}`}
                    onPress={handleSaveIngredient}
                    disabled={isSubmitting}
                    style={{ shadowColor: '#E89B5A', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 }}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white font-bold text-base">Lưu thành phần</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}