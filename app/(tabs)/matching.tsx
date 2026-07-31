// app/(tabs)/matching.tsx
import { Text } from '@/components/AppText';
import { AuthContext } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLocalizedField } from '@/utils/localization';
import { normalizePet } from '@/utils/petNormalize';
import { AntDesign, Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, DeviceEventEmitter, Dimensions, FlatList, Keyboard, Modal, Text as RNText, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import Animated, {
    Easing,
    Extrapolation,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import ReportIssueModal from '../../components/ReportIssueModal';
import { ADOPTION_REQUIREMENT_ICONS, DEFAULT_REQUIREMENT_ICON } from '../../constants/adoptionRequirementIcons';
import { useLocation } from '../../hooks/useLocation';
import { petService } from '../../services/petService';
import { shelterService } from '../../services/shelterService';

// THÊM THƯ VIỆN GOOGLE PLACES VÀ EXPO LOCATION TẠI ĐÂY
import * as Location from 'expo-location';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const { width, height } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.3;
const TAB_BAR_HEIGHT = 65;

const AGE_PREFERENCES = [
    'Any Age', 'Kitten/Puppy (0-1 year)', 'Young (1-3 years)', 'Adult (3-7 years)', 'Senior (7+ years)'
];

const SWIPE_CARDS = [
    {
        id: 1, name: 'Max', age: '2', gender: 'male', distance: '1.2km', location: 'Downtown',
        image: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=1000&auto=format&fit=crop',
    },
    {
        id: 2, name: 'Bella', age: '1', gender: 'female', distance: '3.5km', location: 'Westside',
        image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=1000&auto=format&fit=crop',
    },
    {
        id: 3, name: 'Charlie', age: '3', gender: 'male', distance: '5km', location: 'Northside',
        image: 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?q=80&w=1000&auto=format&fit=crop',
    }
];

// --- HELPER COMPONENTS ---
const CardOverlay = ({ data, onAction, canReload = false, isFavorited = false }: { data: any, onAction?: (action: string) => void, canReload?: boolean, isFavorited?: boolean }) => {
    const actionButtonClasses = "items-center justify-center bg-black/60 backdrop-blur-md rounded-full border-[1.5px]";

    return (
        <View className="absolute bottom-0 left-0 right-0 justify-end z-40 pb-8 pt-32" pointerEvents="box-none">
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.85)', 'rgba(0, 0, 0, 0.75)']}
                locations={[0, 0.4, 0.7, 1]}
                style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '100%' }}
                pointerEvents="none"
            />

            <View className="px-6 mb-5 pointer-events-none z-50 w-full pr-8">
                <View className="flex-row items-center mb-1">
                    <Text className="text-white text-4xl font-semibold shadow-sm mr-3 flex-shrink">{data.name}</Text>

                    <View className="flex-row items-center bg-white/25 px-2 py-0.5 rounded-full border-[1px] border-white/90 overflow-hidden backdrop-blur-xl shadow-sm flex-shrink-0">
                        <Ionicons
                            name={data.gender?.toLowerCase() === 'female' ? "female" : "male"}
                            size={12}
                            color="#ffffff"
                        />
                        <Text className="text-white ml-1 font-medium text-xs tracking-wide">
                            {data.age}
                        </Text>
                    </View>

                </View>
                <View className="flex-row items-center opacity-90">
                    <Image source={require('../../assets/icon/location_solid.png')} style={{ width: 13, height: 16 }} contentFit="cover" />
                    <Text className="text-white ml-1 text-base">{data.location}  ·  {data.distance}</Text>
                </View>
            </View>

            <View className="flex-row justify-center items-center w-full z-50 gap-7" pointerEvents="box-none">

                <TouchableOpacity
                    disabled={!canReload}
                    className={`${actionButtonClasses} w-14 h-14 border-[2px] border-[#4643FF] ${!canReload ? 'opacity-50' : 'opacity-100'}`}
                    onPress={() => onAction && onAction('reload')}
                >
                    <Image className='mr-3' source={require('../../assets/icon/reload-pawdoption.png')} style={{ width: 18, height: 18 }} contentFit="cover" />
                </TouchableOpacity>

                <TouchableOpacity className={`${actionButtonClasses} w-14 h-14 border-[2px] border-[#FF4646]`} onPress={() => onAction && onAction('left')}>
                    <Image className='mr-3' source={require('../../assets/icon/x-pawdoption.png')} style={{ width: 15, height: 15 }} contentFit="cover" />
                </TouchableOpacity>

                <TouchableOpacity className={`${actionButtonClasses} w-14 h-14 border-[2px] border-[#E89B5A]`} onPress={() => onAction && onAction('heart')}>
                    <Image className='mr-3' source={
                        isFavorited
                            ? require('../../assets/icon/heart-filled-pawdoption.png')
                            : require('../../assets/icon/heart-pawdoption.png')
                    } style={{ width: 27, height: 27 }} contentFit="cover" />
                </TouchableOpacity>

                <TouchableOpacity className={`${actionButtonClasses} w-14 h-14 border-[2px] border-[#77C852]`} onPress={() => onAction && onAction('right')}>
                    <Image className='mr-3' source={require('../../assets/icon/tick-pawdoption.png')} style={{ width: 19, height: 13 }} contentFit="cover" />
                </TouchableOpacity>

            </View>
        </View>
    );
};

const SwipeableCard = ({
    data,
    onSwipe,
    sharedTranslateX,
    sharedTranslateY,
    disableSwipe = false,
    forcedDirection = null,
    isFavorited = false,
    hideOverlay = false,
    cachePolicy = "memory-disk",
    canReload = false,
    isTutorialCard = false,
    tutorialOverlay = null,
    onSingleTap
}: any) => {
    const { t } = useLanguage();
    const scale = useSharedValue(1);
    const popScale = useSharedValue(isFavorited ? 1 : 0);

    useEffect(() => {
        if (isFavorited) {
            popScale.value = withSpring(1, {
                damping: 12,
                stiffness: 250,
                mass: 1
            });
        } else {
            popScale.value = 0;
        }
    }, [isFavorited]);

    const triggerSwipe = (direction: 'left' | 'right') => {
        if (disableSwipe) return;
        const targetX = direction === 'left' ? -width * 1.5 : width * 1.5;
        sharedTranslateX.value = withTiming(targetX, { duration: 300 }, () => { runOnJS(onSwipe)(direction); });
    };

    const handleAction = (action: string) => {
        if (action === 'left' || action === 'right') {
            triggerSwipe(action as any);
        } else if (action === 'reload' || action === 'heart') {
            runOnJS(onSwipe)(action as any);
        }
    };

    const pan = Gesture.Pan()
        .enabled(!disableSwipe)
        .onUpdate((event) => { sharedTranslateX.value = event.translationX; sharedTranslateY.value = event.translationY; })
        .onEnd((event) => {
            const horizontalSwipe = Math.abs(event.translationX) > SWIPE_THRESHOLD;
            const verticalSwipe = event.translationY < -SWIPE_THRESHOLD;
            let direction: 'left' | 'right' | 'up' | null = null;
            if (verticalSwipe && Math.abs(event.translationX) < SWIPE_THRESHOLD) direction = 'up';
            else if (horizontalSwipe) direction = event.translationX > 0 ? 'right' : 'left';
            if (forcedDirection && direction !== forcedDirection) { sharedTranslateX.value = withSpring(0); sharedTranslateY.value = withSpring(0); return; }
            if (direction) {
                const targetX = direction === 'left' ? -width * 1.5 : direction === 'right' ? width * 1.5 : 0;
                const targetY = direction === 'up' ? -height : 0;
                sharedTranslateX.value = withTiming(targetX, { duration: 250 }, () => { runOnJS(onSwipe)(direction as any); });
                if (direction === 'up') sharedTranslateY.value = withTiming(targetY, { duration: 250 }); else sharedTranslateY.value = withSpring(0);
            } else { sharedTranslateX.value = withSpring(0); sharedTranslateY.value = withSpring(0); }
        });

    const doubleTap = Gesture.Tap()
        .numberOfTaps(2)
        .enabled(!disableSwipe)
        .maxDuration(250)
        .onEnd(() => {
            runOnJS(handleAction)('heart');
        });

    const singleTap = Gesture.Tap()
        .numberOfTaps(1)
        .enabled(!disableSwipe)
        .onEnd(() => {
            if (onSingleTap) runOnJS(onSingleTap)();
        });

    const taps = Gesture.Exclusive(doubleTap, singleTap);

    const animatedStyle = useAnimatedStyle(() => {
        const rotate = interpolate(sharedTranslateX.value, [-width / 2, 0, width / 2], [-10, 0, 10], Extrapolation.CLAMP);
        return { transform: [{ translateX: sharedTranslateX.value }, { translateY: sharedTranslateY.value }, { rotate: `${rotate}deg` }, { scale: scale.value }] };
    });

    const heartAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: popScale.value }],
        opacity: interpolate(popScale.value, [0, 0.2, 1], [0, 1, 1], Extrapolation.CLAMP)
    }));
    const imageSource = typeof data.image === 'string' ? { uri: data.image } : data.image;

    return (
        <GestureDetector gesture={pan}>
            <Animated.View style={[animatedStyle]} className="absolute top-0 left-0 right-0 bottom-0 z-10">
                <View className="flex-1 relative justify-center items-center"
                    style={[
                        {
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            backgroundColor: 'transparent',
                        },
                        !isTutorialCard && !hideOverlay && {
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.25,
                            shadowRadius: 10,
                            elevation: 5,
                        }
                    ]}>

                    <View className={`flex-1 w-full rounded-[32px] overflow-hidden relative ${isTutorialCard ? 'bg-transparent' : 'bg-gray-100'}`}>

                        <GestureDetector gesture={taps}>
                            <View style={{ position: 'absolute', width: '100%', height: '100%' }}>
                                <Image
                                    source={imageSource}
                                    style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: 32 }}
                                    contentFit={isTutorialCard ? "contain" : "cover"}
                                    cachePolicy={cachePolicy}
                                    transition={0}
                                />

                                <Image
                                    source={require('../../assets/images/light-top-left.png')}
                                    contentFit="contain"
                                />
                            </View>
                        </GestureDetector>

                        <Animated.View
                            style={[
                                heartAnimatedStyle,
                                {
                                    position: 'absolute',
                                    top: isTutorialCard ? height * 0.1 : 20,
                                    right: isTutorialCard ? width * 0.1 : 20,
                                    zIndex: 60,
                                    pointerEvents: 'none',
                                    backgroundColor: 'white', width: 44, height: 44, borderRadius: 22,
                                    justifyContent: 'center', alignItems: 'center',
                                    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.15, shadowRadius: 4, elevation: 5
                                }
                            ]}
                            pointerEvents="none"
                        >
                            <AntDesign name="heart" size={22} color="#ffa053" style={{ marginTop: 2 }} />
                        </Animated.View>

                        {!hideOverlay && <CardOverlay data={data} onAction={handleAction} canReload={canReload} isFavorited={isFavorited} />}
                    </View>
                </View>
            </Animated.View>
        </GestureDetector>
    );
};

const ProgressBar = ({ current }: { current: number }) => (
    <View className="flex-row gap-2 mb-6 mt-2">
        {[1, 2, 3].map((step) => (
            <View
                key={step}
                className={`h-1.5 flex-1 rounded-full ${step <= current ? 'bg-[#E89B5A]' : 'bg-[#E5E5E5]'}`}
            />
        ))}
    </View>
);

const SurveyScreen = ({ onComplete, onBack, initialFilters }: { onComplete: (filters: any) => void, onBack: () => void, initialFilters?: any }) => {
    const { t, language } = useLanguage();
    const isVi = language === 'vi';
    const insets = useSafeAreaInsets();

    // Bỏ requestLocation cũ, ta sẽ dùng trực tiếp expo-location để ổn định hơn
    const { saveManualCity } = useLocation();

    const [isUsingGps, setIsUsingGps] = useState(false);
    const [surveyStep, setSurveyStep] = useState(1);

    const [selectedType, setSelectedType] = useState<string | null>(initialFilters?.type || null);
    const [selectedAge, setSelectedAge] = useState<string | null>(initialFilters?.age || null);

    const [locationText, setLocationText] = useState('');

    // THÊM STATE ĐỂ LƯU TỌA ĐỘ
    const [selectedLat, setSelectedLat] = useState<number | null>(initialFilters?.lat || null);
    const [selectedLng, setSelectedLng] = useState<number | null>(initialFilters?.lng || null);
    const [isRequestingGps, setIsRequestingGps] = useState(false);

    const isValid = () => {
        if (surveyStep === 1) return !!selectedType;
        if (surveyStep === 2) return !!selectedAge;
        if (surveyStep === 3) return (locationText.trim().length > 0 && selectedLat !== null);
        return false;
    };

    const handleContinue = async () => {
        if (!isValid()) return;

        if (surveyStep < 3) {
            setSurveyStep(prev => prev + 1);
        } else {
            if (!isUsingGps && locationText.trim().length > 0) {
                await saveManualCity(locationText.trim());
            }
            // TRUYỀN THÊM isUsingGps VÀO ĐÂY
            onComplete({ type: selectedType, age: selectedAge, lat: selectedLat, lng: selectedLng, address: locationText, isUsingGps });
        }
    };

    // SỬA HÀM LẤY GPS TRỰC TIẾP ĐỂ TRÁNH LỖI TRÊN MỘT SỐ THIẾT BỊ
    const handleUseGps = async () => {
        setIsRequestingGps(true);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                // Ưu tiên lấy vị trí cuối cùng để nhanh hơn, nếu không có mới đợi lấy vị trí hiện tại
                let loc = await Location.getLastKnownPositionAsync({});
                if (!loc) {
                    loc = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Balanced,
                    });
                }

                if (loc?.coords) {
                    setSelectedLat(loc.coords.latitude);
                    setSelectedLng(loc.coords.longitude);
                    setIsUsingGps(true);
                    setLocationText(t('Current Location'));
                }
            } else {
                Toast.show({ type: 'error', text1: t('Permission denied') });
            }
        } catch (error) {
            console.error("Lỗi lấy GPS:", error);
            Toast.show({ type: 'error', text1: t('Could not fetch location') });
        } finally {
            setIsRequestingGps(false);
        }
    };

    const handleBack = () => {
        if (surveyStep > 1) {
            setSurveyStep(prev => prev - 1);
        } else {
            onBack();
        }
    };

    const stepValid = isValid();

    // LƯU Ý: ĐÃ XÓA TouchableWithoutFeedback ĐỂ GOOGLE PLACES HOẠT ĐỘNG ĐƯỢC
    return (
        <View style={{ flex: 1, backgroundColor: 'white' }}>
            <SafeAreaView className="flex-1" edges={['top']}>
                <View className="flex-1 px-6 pt-2" style={{ zIndex: 1 }}>
                    <View className="flex-row items-center justify-between mb-4 mt-2">
                        <TouchableOpacity onPress={handleBack} activeOpacity={0.7} className="w-10 h-10 items-center justify-center">
                            <Feather name="chevron-left" size={24} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    <ProgressBar current={surveyStep} />

                    <View className="mt-2" style={{ flex: 1 }}>
                        {/* STEP 1: TYPE */}
                        {surveyStep === 1 && (
                            <View>
                                <Text className="text-[30px] font-semibold text-black  mb-[18px]">{t("Let's Find Your Match!")}</Text>
                                <Text className="text-[16px] font-medium text-[#8E8E93] mb-[32px]">{t("What type of pet are you looking to adopt?")}</Text>
                                <View className=''>

                                    <View className="flex-row justify-between gap-3">
                                        {[
                                            { id: 'dog', label: t('Dogs'), icon: require('../../assets/images/dog-icon.png') },
                                            { id: 'cat', label: t('Cats'), icon: require('../../assets/images/cat-icon.png') },
                                            { id: 'both', label: t('Both'), icon: require('../../assets/images/both-icon.png') }
                                        ].map((item) => (
                                            <TouchableOpacity
                                                key={item.id}
                                                activeOpacity={0.7}
                                                onPress={() => setSelectedType(item.id)}
                                                className={`flex-1 aspect-square rounded-2xl items-center justify-center border-[1.5px] ${selectedType === item.id ? 'border-[#E89B5A] bg-orange-50' : 'border-gray-100 bg-white'}`}
                                            >
                                                <Image
                                                    source={item.icon}
                                                    style={{ width: 40, height: 40 }}
                                                />
                                                <Text className={`mt-3 font-medium text-[14px] ${selectedType === item.id ? 'text-[#E89B5A]' : 'text-black'}`}>{item.label}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* STEP 2: AGE */}
                        {surveyStep === 2 && (
                            <View>
                                <Text className="text-[30px] font-semibold text-black mb-[18px]">{t("Age Preference")}</Text>
                                <Text className="text-[16px] font-medium text-[#8E8E93] mb-[30px]">{t("What age range are you looking for?")}</Text>
                                <View className="gap-3">
                                    {AGE_PREFERENCES.map((age) => (
                                        <TouchableOpacity
                                            key={age}
                                            activeOpacity={0.7}
                                            onPress={() => setSelectedAge(age)}
                                            className={`p-[14px] rounded-[16px] border ${selectedAge === age ? 'border-[#E89B5A] bg-orange-50' : 'border-[#E5E5E5] bg-white'}`}
                                        >
                                            <Text className={`font-medium text-[16px] ${selectedAge === age ? 'text-[#E89B5A]' : 'text-black'}`}>{t(age)}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* STEP 3: LOCATION VỚI GOOGLE PLACES */}
                        {surveyStep === 3 && (
                            <View style={{ flex: 1, zIndex: 10 }}>
                                <Text className="text-[30px] font-semibold text-black mb-[18px]">{t("Your Location")}</Text>
                                <Text className="text-[16px] font-medium text-[#8E8E93] mb-[10px]">{t("We'll help you find adoption shelters near you")}</Text>

                                <View style={{ zIndex: 999, flex: 1, marginTop: 20 }}>
                                    <GooglePlacesAutocomplete
                                        placeholder={locationText || t("Enter your district or city")}
                                        fetchDetails={true}
                                        onPress={(data, details = null) => {
                                            if (details?.geometry?.location) {
                                                setSelectedLat(details.geometry.location.lat);
                                                setSelectedLng(details.geometry.location.lng);
                                                setLocationText(data.description);
                                                setIsUsingGps(false);
                                                Keyboard.dismiss();
                                            }
                                        }}
                                        query={{
                                            key: GOOGLE_API_KEY,
                                            language: isVi ? 'vi' : 'en',
                                            components: 'country:vn',
                                        }}
                                        styles={{
                                            container: { flex: 0, marginBottom: 16 },
                                            textInputContainer: {
                                                borderWidth: 1.5,
                                                borderColor: locationText ? '#E89B5A' : '#F3F4F6',
                                                backgroundColor: locationText ? '#FFF7ED' : '#F9FAFB',
                                                borderRadius: 16,
                                                paddingHorizontal: 6,
                                            },
                                            textInput: {
                                                height: 52,
                                                color: '#000',
                                                fontSize: 16,
                                                fontFamily: "Urbanist",
                                                backgroundColor: 'transparent',
                                            },
                                            listView: {
                                                backgroundColor: '#FFF',
                                                borderRadius: 16,
                                                marginTop: 4,
                                                elevation: 5,
                                                shadowColor: '#000',
                                                shadowOffset: { width: 0, height: 4 },
                                                shadowOpacity: 0.1,
                                                shadowRadius: 8,
                                                position: 'absolute',
                                                top: 56,
                                                width: '100%',
                                                zIndex: 1000
                                            },
                                            row: { padding: 13, flexDirection: 'row' },
                                        }}
                                        textInputProps={{
                                            placeholderTextColor: '#9CA3AF',
                                            onChangeText: (text) => {
                                                if (text === '') {
                                                    setSelectedLat(null);
                                                    setSelectedLng(null);
                                                    setLocationText('');
                                                }
                                            }
                                        }}
                                        keyboardShouldPersistTaps="handled"
                                    />

                                    <TouchableOpacity
                                        activeOpacity={0.7}
                                        onPress={handleUseGps}
                                        disabled={isRequestingGps}
                                        className="flex-row items-center justify-center py-4 border border-[#E5E5E5] rounded-[16px] bg-white active:bg-gray-50 mt-2"
                                    >
                                        {isRequestingGps ? (
                                            <ActivityIndicator size="small" color="#F97316" />
                                        ) : (
                                            <Image source={require('../../assets/icon/location_solid.png')} style={{ width: 18, height: 18 }} contentFit="cover" />
                                        )}
                                        <Text className="ml-2 font-medium text-[16px] text-black">{t("Use My Current Location")}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                </View>

                {/* VÙNG BOTTOM ACTION */}
                <View style={{ paddingBottom: Math.max(insets.bottom, 16), paddingHorizontal: 24, paddingTop: 16, zIndex: 0 }}>
                    <TouchableOpacity
                        onPress={handleContinue}
                        // Khóa nút nếu chưa điền đủ form HOẶC đang trong quá trình lấy GPS
                        disabled={!stepValid || isRequestingGps}
                        activeOpacity={0.8}
                        className={`w-full py-[18px] rounded-[36px] flex-row items-center justify-center ${stepValid && !isRequestingGps ? 'bg-[#E89B5A]' : 'bg-[#E89B5A]/60'
                            }`}
                    >
                        {/* Hiển thị vòng xoay loading trên nút nếu đang lấy GPS ở Bước 3 */}
                        {isRequestingGps && surveyStep === 3 ? (
                            <>
                                <ActivityIndicator size="small" color="#FFFFFF" />
                                <Text className="font-bold text-[16px] text-white ml-2">
                                    {t('Fetching GPS...')}
                                </Text>
                            </>
                        ) : (
                            <Text className={`font-bold text-[16px] text-white`}>
                                {surveyStep === 3 ? t('Apply Filters') : t('Continue')}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
};

// ==================================================================
// 2. POLICY SCREEN (PURE UI - KHÔNG GỌI NAVIGATION)
// ==================================================================
const PolicyScreen = ({ onAgree, onBack }: { onAgree: () => void, onBack: () => void }) => {
    const { t, language } = useLanguage();
    const isVi = language === 'vi';
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [isAgreed, setIsAgreed] = useState(false);

    const PolicyItem = ({ number, title, content }: any) => (
        <View className="flex-row items-start mb-[21px]">
            {/* Đổi w-4 thành w-6 để cấp đủ không gian hiển thị "Số + dấu chấm" */}
            <View className="w-6 shrink-0 mr-2 items-start">
                <Text className="text-black text-[16px] font-medium">
                    {number}.
                </Text>
            </View>
            <View className="flex-1">
                <Text className="text-gray-800 font-medium text-[16px] mb-[4px]">{title}</Text>
                <Text className="text-gray-500 font-regular text-[14px] leading-[20px] tracking-[0.06px]">{content}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            <View className="flex-row items-center justify-between px-4 pt-3">
                <View className="w-10" />
                <Text className="flex-1 text-center font-semibold text-[20px] text-gray-900 tracking-wide">
                    {t("Adoption Pawlicy")}
                </Text>
                <TouchableOpacity
                    onPress={onBack}
                    className="w-10 items-end py-1.5"
                >
                    <Feather name="x" size={18} color="#374151" />
                </TouchableOpacity>
            </View>

            <View className="flex-1">
                <Animated.ScrollView
                    className="flex-1 px-[30px] pt-[30px]"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 40 }}
                >
                    <View className="mb-4">
                        <PolicyItem number="1" title={t("Love and care for your pet for life")} content={t("Do not abandon, harm, or use the pet for any illegal or inhumane purposes.")} />
                        <PolicyItem number="2" title={t("Provide a safe & suitable living environment")} content={t("This includes proper food, shelter, attention, and veterinary care when needed.")} />
                        <PolicyItem number="3" title={t("Take care of your pet's health")} content={t("Check-ups, vaccinations, and rabies shots as recommended.")} />
                        <PolicyItem number="4" title={t("Stay in touch after adoption & when needed")} content={t("During the first 6 months, share updates to ensure pet is doing well.")} />
                        <PolicyItem number="5" title={t("Do not transfer your pet")} content={t("Contact PawLife if you can no longer care for the pet.")} />
                        <PolicyItem number="6" title={t("Provide truthful personal information")} content={t("Basic personal and address information helps ensure your pet's safety and well-being after adoption.")} />
                    </View>
                </Animated.ScrollView>
            </View>

            <View
                style={{
                    paddingBottom: Math.max(insets.bottom, 16),
                    paddingHorizontal: 24,
                    paddingTop: 16,
                    backgroundColor: 'white',
                }}
                className='items-center justify-center'
            >
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setIsAgreed(!isAgreed)}
                    className="flex-row items-center mb-5 w-full"
                >
                    {/* Bỏ justify-center để canh trái đồng đều, tránh lỗi xô lệch khi rớt dòng */}
                    <View className='flex-row items-center w-full justify-start'>
                        <Ionicons
                            name={isAgreed ? "checkbox" : "square-outline"}
                            size={24}
                            color={isAgreed ? "#E89B5A" : "#9CA3AF"}
                        />
                        {/* Bổ sung flex-1 để text tự động rớt dòng nằm gọn trong khung hình */}
                        <Text className={`ml-3 flex-1 text-[14px] ${isAgreed ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                            {t("I agree to ")}
                            <Text
                                onPress={() => router.push('/terms-of-service')}
                                className="text-[#E89B5A]"
                            >
                                {t("Policy Terms & Privacy Conditions")}
                            </Text>
                            .
                        </Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={onAgree}
                    disabled={!isAgreed}
                    activeOpacity={0.8}
                    className={`w-full py-[18px] rounded-full items-center justify-center ${isAgreed ? 'bg-[#E89B5A]' : 'bg-gray-100'}`}
                >
                    <Text className={`font-bold text-[17px] ${isAgreed ? 'text-white' : 'text-gray-400'}`}>
                        {isVi ? "Gửi" : "Submit"}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const TUTORIAL_DATA = [
    {
        id: 'step1',
        image: require('../../assets/images/t-left.png'),
        forcedDir: 'left',
        instruction: "Swipe left to skip",
        subInstruction: "",
        iconName: "arrow-left"
    },
    {
        id: 'step2',
        image: require('../../assets/images/t-right.png'),
        forcedDir: 'right',
        instruction: "Swipe right to apply",
        subInstruction: "",
        iconName: "arrow-right"
    },
    {
        id: 'step3',
        image: require('../../assets/images/t-top.png'),
        forcedDir: 'up',
        instruction: "Swipe up for info",
        subInstruction: "",
        iconName: "arrow-up"
    },
    {
        id: 'step4',
        image: require('../../assets/images/t-center.jpg'),
        forcedDir: 'heart',
        instruction: "Double tap to save",
        subInstruction: "",
        iconName: "gesture-double-tap"
    }
];

// ==================================================================
// 3. TUTORIAL SCREEN (PURE UI)
// ==================================================================
const TutorialScreen = ({ onComplete }: { onComplete: () => void }) => {
    const { t } = useLanguage();
    const insets = useSafeAreaInsets();

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFavorited, setIsFavorited] = useState(false);

    const tutorialX = useSharedValue(0);
    const tutorialY = useSharedValue(0);

    const pulseValue = useSharedValue(1);
    const opacityPulse = useSharedValue(0.4);
    const tutorialScale = useSharedValue(1);

    useEffect(() => {
        const triggerHint = () => {
            const config = { duration: 300, easing: Easing.out(Easing.ease) };

            if (currentIndex === 0) {
                tutorialX.value = withSequence(
                    withTiming(-100, config), withTiming(0, config),
                    withTiming(-100, config), withTiming(0, config)
                );
            } else if (currentIndex === 1) {
                tutorialX.value = withSequence(
                    withTiming(100, config), withTiming(0, config),
                    withTiming(100, config), withTiming(0, config)
                );
            } else if (currentIndex === 2) {
                tutorialY.value = withSequence(
                    withTiming(-100, config), withTiming(0, config),
                    withTiming(-100, config), withTiming(0, config)
                );
            } else if (currentIndex === 3) {
                tutorialScale.value = withSequence(
                    withTiming(1.15, config), withTiming(1, config),
                    withTiming(1.15, config), withTiming(1, config)
                );
            }
        };

        triggerHint();
        const interval = setInterval(triggerHint, 4500);

        return () => {
            clearInterval(interval);
            tutorialX.value = 0;
            tutorialY.value = 0;
            tutorialScale.value = 1;
        };
    }, [currentIndex]);

    const tutorialScaleStyle = useAnimatedStyle(() => ({
        transform: [{ scale: tutorialScale.value }]
    }));

    const tutorialMovingStyle = useAnimatedStyle(() => {
        const rotate = interpolate(
            tutorialX.value,
            [-width / 2, 0, width / 2],
            [-10, 0, 10],
            Extrapolation.CLAMP
        );
        return {
            transform: [
                { translateX: tutorialX.value },
                { translateY: tutorialY.value },
                { rotate: `${rotate}deg` }
            ]
        };
    });

    const goToNextStep = () => {
        if (currentIndex >= TUTORIAL_DATA.length - 1) {
            onComplete();
        } else {
            tutorialX.value = withTiming(0);
            tutorialY.value = withTiming(0);
            tutorialScale.value = withTiming(1);
            setCurrentIndex(prev => prev + 1);
        }
    };

    useEffect(() => {
        const preloadTutorialImages = async () => {
            try {
                const imagesToPreload = TUTORIAL_DATA.map(item => item.image);
                await Image.prefetch(imagesToPreload);
            } catch (error) {
            }
        };
        preloadTutorialImages();
    }, []);

    useEffect(() => {
        pulseValue.value = withRepeat(
            withTiming(1.05, { duration: 800, easing: Easing.inOut(Easing.ease) }),
            -1, true
        );
        opacityPulse.value = withRepeat(
            withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
            -1, true
        );
    }, [currentIndex]);

    const handleTutorialSwipe = (dir: 'left' | 'right' | 'up' | 'heart' | 'reload') => {
        if (dir === 'heart') {
            setIsFavorited(true);
            setTimeout(() => {
                setIsFavorited(false);
                goToNextStep();
            }, 500);
            return;
        }
        goToNextStep();
    };

    const activeItem = TUTORIAL_DATA[currentIndex];
    const nextItem = TUTORIAL_DATA[currentIndex + 1];

    const nextCardStyle = useAnimatedStyle(() => {
        const distance = Math.abs(tutorialX.value);
        const scale = interpolate(distance, [0, width / 2], [0.95, 1], Extrapolation.CLAMP);
        const opacity = interpolate(distance, [0, width / 2], [0.8, 1], Extrapolation.CLAMP);
        return { transform: [{ scale }], opacity };
    });

    return (
        <View
            className="absolute inset-0 z-50 bg-white flex-1"
            style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
        >
            <View className="flex-1 w-full flex-col">
                <View className="flex-1 px-6 pt-[64px] pb-0 relative z-10 w-full bg-white">
                    <View className="flex-1 relative w-full h-full">

                        {nextItem && (
                            <View className="absolute inset-0 z-0 pointer-events-none">
                                <Animated.View style={[{ flex: 1, backgroundColor: 'transparent', borderRadius: 32, overflow: 'hidden' }, nextCardStyle]}>
                                    <Image
                                        source={nextItem.image}
                                        style={{ width: '100%', height: '100%' }}
                                        contentFit="contain"
                                        cachePolicy="memory"
                                        transition={0}
                                    />
                                </Animated.View>
                            </View>
                        )}

                        {activeItem && (
                            <View className="absolute inset-0 z-10 rounded-[24px] bg-transparent">
                                <Animated.View style={[{ flex: 1 }, tutorialScaleStyle]}>
                                    <SwipeableCard
                                        key={`tutorial-${currentIndex}`}
                                        data={{ ...SWIPE_CARDS[0], id: activeItem.id, image: activeItem.image }}
                                        onSwipe={handleTutorialSwipe}
                                        sharedTranslateX={tutorialX}
                                        sharedTranslateY={tutorialY}
                                        forcedDirection={activeItem.forcedDir as any}
                                        isFavorited={isFavorited}
                                        hideOverlay={true}
                                        cachePolicy="memory"
                                        isTutorialCard={true}
                                    />
                                    <Animated.View
                                        className="absolute inset-0 items-center justify-start z-50 pointer-events-none"
                                        style={tutorialMovingStyle}
                                    >
                                        <View
                                            className="px-6 items-center justify-center w-full"
                                            style={{ marginTop: height * 0.24 }}
                                        >
                                            <RNText
                                                style={{
                                                    color: 'white',
                                                    fontSize: 26,
                                                    fontWeight: '500',
                                                    textAlign: 'center',
                                                    letterSpacing: 26 * 0.05,
                                                    fontFamily: "Urbanist",
                                                    textShadowColor: 'rgba(0, 0, 0, 0.2)',
                                                    textShadowOffset: { width: 0, height: 2 },
                                                    textShadowRadius: 2,
                                                }}
                                            >
                                                {t(activeItem.instruction)}
                                            </RNText>
                                        </View>
                                    </Animated.View>
                                </Animated.View>
                            </View>
                        )}
                    </View>
                </View>

                <View className="items-center w-full py-8 px-6 z-20 bg-white">
                    <TouchableOpacity onPress={onComplete} activeOpacity={0.7} className="w-full items-center">
                        <Text className="text-[#B8B8B8] font-regular text-[14px] tracking-widest">
                            {t("Skip Tutorial")}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const ImageViewerOverlay = ({ images, isVisible, onClose }: { images: string[], isVisible: boolean, onClose: () => void }) => {
    const insets = useSafeAreaInsets();
    const [currentIndex, setCurrentIndex] = useState(0);

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50
    }).current;

    useEffect(() => {
        if (isVisible) setCurrentIndex(0);
    }, [isVisible]);

    if (!isVisible || !images || images.length === 0) return null;

    return (
        <Modal visible={isVisible} transparent animationType="fade">
            <View className="flex-1 bg-black">
                <View
                    className="flex-row items-center justify-end px-4 py-2 z-50 absolute left-0 right-0"
                    style={{ top: Math.max(insets.top, 20) }}
                >
                    <TouchableOpacity
                        onPress={onClose}
                        className="p-2 bg-black/40 rounded-full"
                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                    >
                        <Feather name="x" size={24} color="white" />
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={images}
                    keyExtractor={(_, index) => index.toString()}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={viewabilityConfig}
                    renderItem={({ item }) => (
                        <View style={{ width, height: '100%' }}>
                            <Image
                                source={{ uri: item }}
                                style={{ width: '100%', height: '100%' }}
                                contentFit="contain"
                            />
                        </View>
                    )}
                />

                {images.length > 1 && (
                    <View style={{
                        position: 'absolute',
                        bottom: Math.max(insets.bottom, 40),
                        left: 0,
                        right: 0,
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 6,
                        zIndex: 10
                    }}>
                        {images.map((_, index) => (
                            <View
                                key={index}
                                className={`h-2 rounded-full transition-all ${currentIndex === index ? 'w-6 bg-white' : 'w-2 bg-white/60'}`}
                            />
                        ))}
                    </View>
                )}

            </View>
        </Modal>
    );
};

const getDistanceKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const formatDistanceValue = (val: number | string | null | undefined): string | null => {
    if (val === null || val === undefined || val === '') return null;
    const num = typeof val === 'number' ? val : parseFloat(val as string);
    // Thay đổi: Nếu là NaN thì dứt khoát trả về null để fallback sang địa chỉ
    if (isNaN(num)) return null;
    return num < 1 ? `${Math.round(num * 1000)}m` : `${num.toFixed(1)}km`;
};

type PawHistoryType =
    | 'CREATED' | 'BIRTH' | 'QR_LINKED' | 'TRANSFER'
    | 'VACCINE' | 'DENTAL_CARE' | 'ANNUAL_CHECKUP'
    | 'UNDER_SHELTER_CARE' | 'WAS_UNDER_SHELTER_CARE'
    | 'CURRENT_OWNER' | 'PREVIOUS_OWNER';

type HistoryUIConfig = {
    icon: any;
    iconBgColor: string;
    lineColor: string;
};

const PAW_HISTORY_UI_CONFIG: Record<PawHistoryType, HistoryUIConfig> = {
    DENTAL_CARE: { icon: require('../../assets/icon/teeth-icon.png'), iconBgColor: '#E8FFD8', lineColor: '#D5F5C6' },
    ANNUAL_CHECKUP: { icon: require('../../assets/icon/anual-icon.png'), iconBgColor: '#E8FFD8', lineColor: '#D5F5C6' },
    UNDER_SHELTER_CARE: { icon: require('../../assets/icon/home-heart.png'), iconBgColor: '#FFE4F0', lineColor: '#F8BBD0' },
    WAS_UNDER_SHELTER_CARE: { icon: require('../../assets/icon/home-heart-2.png'), iconBgColor: '#FFE4F0', lineColor: '#F8BBD0' },
    CURRENT_OWNER: { icon: require('../../assets/icon/owner.png'), iconBgColor: '#FFE9B8', lineColor: '#FFD88A' },
    PREVIOUS_OWNER: { icon: require('../../assets/icon/owner-2.png'), iconBgColor: '#FFE9B8', lineColor: '#FFD88A' },
    VACCINE: { icon: require('../../assets/icon/vaccine.png'), iconBgColor: '#E3F0FF', lineColor: '#BFD9FF' },
    QR_LINKED: { icon: require('../../assets/icon/qr-icon.png'), iconBgColor: '#EAE7FF', lineColor: '#D3CCFF' },
    BIRTH: { icon: require('../../assets/icon/birth-date.png'), iconBgColor: '#DFFFF7', lineColor: '#BDF5EA' },
    CREATED: { icon: require('../../assets/icon/qr-icon.png'), iconBgColor: '#EAE7FF', lineColor: '#D3CCFF' },
    TRANSFER: { icon: require('../../assets/icon/home-heart.png'), iconBgColor: '#E8FFD8', lineColor: '#D5F5C6' },
};

const DEFAULT_HISTORY_UI: HistoryUIConfig = {
    icon: require('../../assets/icon/birth-date.png'),
    iconBgColor: '#F5F5F5',
    lineColor: '#E0E0E0',
};

const PAW_HISTORY_I18N_MAP: Record<string, { vi: string; en: string }> = {
    'pawHistory.current_owner_title': { vi: 'Chủ sở hữu hiện tại', en: 'Current Owner' },
    'pawHistory.current_owner_body': { vi: 'Quyền sở hữu đã được chuyển giao cho {name}', en: 'Ownership transferred to {name}' },
    'pawHistory.previous_owner_title': { vi: 'Chủ trước', en: 'Previous Owner' },
    'pawHistory.previous_owner_body': { vi: 'Từng được chăm sóc bởi {name}', en: 'Previously cared for by {name}' },
    'pawHistory.under_shelter_title': { vi: 'Đang ở trạm cứu hộ', en: "Under Shelter's Care" },
    'pawHistory.under_shelter_body': { vi: 'Hiện đang được chăm sóc tại {shelterName}', en: 'Currently under the care of {shelterName}' },
    'pawHistory.was_under_shelter_title': { vi: 'Từng ở trạm cứu hộ', en: "Was Under Shelter's Care" },
    'pawHistory.was_under_shelter_body': { vi: 'Trước đây được chăm sóc tại {shelterName}', en: 'Previously cared by {shelterName}' },
    'pawHistory.transfer_title': { vi: 'Chuyển giao quyền sở hữu', en: 'Ownership Transferred' },
    'pawHistory.transfer_body': { vi: 'Đã chuyển giao cho {receiverName}', en: 'Transferred to {receiverName}' },
    'pawHistory.vaccine_title': { vi: '{recordNameVi}', en: '{recordNameEn}' },
    'pawHistory.vaccine_body': { vi: 'Đã hoàn thành mũi tiêm', en: 'Vaccination completed' },
    'pawHistory.dental_title': { vi: 'Khám răng miệng', en: 'Dental Care' },
    'pawHistory.dental_body': { vi: 'Đã hoàn thành khám tại {clinicName}', en: 'Teeth cleaning completed at {clinicName}' },
    'pawHistory.checkup_title': { vi: 'Khám tổng quát định kỳ', en: 'Annual Checkup' },
    'pawHistory.checkup_body': { vi: 'Đã hoàn thành khám tại {clinicName}', en: 'Checkup completed at {clinicName}' },
    'pawHistory.qr_registered_title': { vi: 'Kích hoạt thẻ QR PawLife', en: 'QR Tag Registered' },
    'pawHistory.qr_registered_body': { vi: 'Thẻ đã được kích hoạt và sẵn sàng sử dụng', en: 'PawLife QR tag is now active and ready to use' },
    'pawHistory.qr_replaced_title': { vi: 'Thay thẻ QR PawLife', en: 'QR Tag Replaced' },
    'pawHistory.qr_replaced_body': { vi: 'Thẻ QR cũ đã được thay thế', en: 'Old QR tag has been replaced' },
    'pawHistory.birth_title': { vi: 'Ngày sinh', en: 'Date of Birth' },
    'pawHistory.birth_body': { vi: 'Mừng ngày {petName} chào đời', en: 'Celebrate {petName} was born' },
    'pawHistory.joined_title': { vi: 'Gia nhập PawLife', en: 'Joined PawLife' },
    'pawHistory.joined_body': { vi: 'Hồ sơ của {petName} được tạo trên hệ thống', en: 'Profile for {petName} was created' },
};

const resolvePawHistoryText = (item: any, isVi: boolean): { title: string; description: string } => {
    const { i18n, title: fallbackTitle, description: fallbackDesc } = item;
    const interpolate = (template: string, params: Record<string, any> = {}) =>
        template.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? `{${key}}`);

    if (i18n?.titleKey) {
        const titleTpl = PAW_HISTORY_I18N_MAP[i18n.titleKey];
        const bodyTpl = PAW_HISTORY_I18N_MAP[i18n.bodyKey];
        return {
            title: titleTpl ? interpolate(isVi ? titleTpl.vi : titleTpl.en, i18n.params) : fallbackTitle,
            description: bodyTpl ? interpolate(isVi ? bodyTpl.vi : bodyTpl.en, i18n.params) : fallbackDesc,
        };
    }
    return { title: fallbackTitle, description: fallbackDesc };
};

const filterPawHistory = (history: any[]) => {
    if (!Array.isArray(history)) return [];
    return history.filter((item: any) => {
        if (item.type === 'CREATED') return false;
        const key = (item?.i18n?.titleKey || '').toLowerCase();
        if (key.includes('joined')) return false;
        const text = `${item?.title || ''} ${item?.description || ''}`.toLowerCase();
        if (text.includes('triệt sản') || text.includes('neuter') || text.includes('spay')) return false;
        return true;
    });
};

// ==================================================================
// 4. MAIN SWIPE SCREEN
// ==================================================================
const MainSwipeScreen = ({ filters, onBack, onDetail, onAdopt, onUpdateFilters }: { filters: any, onBack: () => void, onDetail: (item: any) => void, onAdopt: (item: any) => void, onUpdateFilters: (newFilters: any) => void }) => {
    const { t, language } = useLanguage();
    const isVi = language === 'vi';
    const router = useRouter();
    const queryClient = useQueryClient();
    const [isViewerVisible, setIsViewerVisible] = useState(false);
    const [viewerImages, setViewerImages] = useState<string[]>([]);
    const { user } = useContext(AuthContext);
    const { location, isLocationLoaded } = useLocation();

    const [currentIndex, setCurrentIndex] = useState(0);
    const [lastSwipe, setLastSwipe] = useState<{ index: number, dir: string } | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const translateX_Even = useSharedValue(0);
    const translateX_Odd = useSharedValue(0);
    const translateY_Even = useSharedValue(0);
    const translateY_Odd = useSharedValue(0);

    const activeTranslationX = currentIndex % 2 === 0 ? translateX_Even : translateX_Odd;
    const activeTranslationY = currentIndex % 2 === 0 ? translateY_Even : translateY_Odd;

    const handleOpenViewer = (images: string[]) => {
        if (images && images.length > 0) {
            setViewerImages(images);
            setIsViewerVisible(true);
        }
    };

    const { data: favoriteIds = [] } = useQuery({
        queryKey: ['favorite-pets-list'],
        queryFn: async () => {
            const res = await petService.getFavorites();
            const data = res?.data?.data || res?.data || res || [];
            return data.map((p: any) => p.id || p._id);
        },
        staleTime: 5 * 60 * 1000,
    });

    const [localFavorites, setLocalFavorites] = useState<string[]>([]);
    useEffect(() => {
        setLocalFavorites(favoriteIds);
    }, [favoriteIds]);

    const handleRefreshList = async () => {
        setIsRefreshing(true);
        try {
            // NẾU ĐANG DÙNG GPS: Chủ động lấy lại toạ độ tươi nhất trước khi fetch
            if (filters?.isUsingGps) {
                try {
                    let { status } = await Location.getForegroundPermissionsAsync();
                    if (status === 'granted') {
                        let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                        if (loc?.coords) {
                            const updatedFilters = { ...filters, lat: loc.coords.latitude, lng: loc.coords.longitude };
                            // SỬ DỤNG PROP ĐƯỢC TRUYỀN TỪ COMPONENT CHA
                            onUpdateFilters(updatedFilters);
                            await AsyncStorage.setItem('user_matching_filters_data', JSON.stringify(updatedFilters));
                        }
                    }
                } catch (err) {
                    console.log("Không thể làm mới GPS thủ công:", err);
                }
            }

            // Đợi React Query gọi API xong
            const result = await refetchPets();

            // Trích xuất dữ liệu an toàn dựa trên cấu trúc API hoặc cấu trúc React Query
            let fetchedPets: any[] = [];

            if (result.data?.pages) {
                // Trường hợp bạn đang dùng useInfiniteQuery
                fetchedPets = result.data.pages.flatMap((page: any) => page.data || page);
            } else if (result.data?.data) {
                // Trường hợp API trả về dạng { data: [...], meta: ... }
                fetchedPets = result.data.data;
            } else if (Array.isArray(result.data)) {
                // Trường hợp API trả trực tiếp mảng [...]
                fetchedPets = result.data;
            }

            // Nếu thực sự mảng trống (không có pet mới & không có pet nào bị quẹt trái)
            if (fetchedPets.length === 0) {
                Toast.show({
                    type: 'info',
                    text1: isVi ? 'Chưa có thú cưng mới' : 'No new pets found',
                    text2: isVi ? 'Vui lòng thay đổi bộ lọc hoặc thử lại sau.' : 'Please change your filters or try again later.',
                });
            } else {
                // Chắc chắn có dữ liệu -> Reset lại thẻ bài
                setCurrentIndex(0);
                setLastSwipe(null);

                // Đưa tọa độ của các thẻ bài quay trở lại giữa màn hình mượt mà
                if (translateX_Even) translateX_Even.value = withTiming(0);
                if (translateX_Odd) translateX_Odd.value = withTiming(0);
                if (translateY_Even) translateY_Even.value = withTiming(0);
                if (translateY_Odd) translateY_Odd.value = withTiming(0);
            }
        } catch (error) {
            console.error("Lỗi khi Refresh List:", error);
        } finally {
            setIsRefreshing(false);
        }
    };

    const likeCount = localFavorites.length;
    const finalizePetRemoval = React.useCallback((petId: string) => {
        queryClient.setQueriesData({ queryKey: ['matching-pets'] }, (old: any) =>
            Array.isArray(old) ? old.filter((p: any) => p.id !== petId) : old
        );
        queryClient.setQueriesData({ queryKey: ['pets-feed'] }, (old: any) =>
            Array.isArray(old) ? old.filter((p: any) => p.id !== petId) : old
        );
        queryClient.setQueriesData({ queryKey: ['pets-list'] }, (old: any) =>
            Array.isArray(old) ? old.filter((p: any) => p.id !== petId) : old
        );
        DeviceEventEmitter.emit('PET_HIDDEN', { petId });
        setLastSwipe(null);
    }, [queryClient]);

    const finalizeShelterBlock = React.useCallback((blockedShelterId: string) => {
        queryClient.setQueriesData({ queryKey: ['matching-pets'] }, (old: any) =>
            Array.isArray(old) ? old.filter((p: any) => p?.shelter?.id !== blockedShelterId && p?.shelterId !== blockedShelterId) : old
        );
        queryClient.setQueriesData({ queryKey: ['pets-feed'] }, (old: any) =>
            Array.isArray(old) ? old.filter((p: any) => p?.shelter?.id !== blockedShelterId && p?.shelterId !== blockedShelterId) : old
        );
        queryClient.setQueriesData({ queryKey: ['pets-list'] }, (old: any) =>
            Array.isArray(old) ? old.filter((p: any) => p?.shelter?.id !== blockedShelterId && p?.shelterId !== blockedShelterId) : old
        );
        queryClient.setQueriesData({ queryKey: ['search-shelters'] }, (old: any) =>
            Array.isArray(old) ? old.filter((s: any) => s?.id !== blockedShelterId) : old
        );
        DeviceEventEmitter.emit('SHELTER_BLOCKED', { shelterId: blockedShelterId });
        setLastSwipe(null);
    }, [queryClient]);

    // --- 2. QUERY LẤY DANH SÁCH THÚ CƯNG MATCHING ---
    const { data: pets = [], isLoading, refetch: refetchPets } = useQuery({
        // Thêm location?.lat và location?.lng vào queryKey để tự động trigger khi GPS thực tế thay đổi
        queryKey: ['matching-pets', filters?.lat, filters?.lng, location?.lat, location?.lng, filters, language],
        queryFn: async () => {

            // LOGIC CỐT LÕI TẠI ĐÂY:
            // Nếu chọn Share GPS -> Ưu tiên location thực tế (từ hook), nếu chưa có mới fallback về filters lưu ở AsyncStorage
            // Nếu nhập thủ công -> Ưu tiên filters cố định, bỏ qua location thực tế
            const userLat = filters?.isUsingGps ? (location?.lat || filters?.lat) : (filters?.lat || location?.lat);
            const userLng = filters?.isUsingGps ? (location?.lng || filters?.lng) : (filters?.lng || location?.lng);

            const response = await petService.getFeed(30, userLat, userLng);
            let petsData = response?.data?.data || response?.data || response || [];

            if (filters?.type && filters.type !== 'both') {
                petsData = petsData.filter((p: any) => {
                    const speciesEn = getLocalizedField(p.species, 'en').toUpperCase();
                    const typeEn = getLocalizedField(p.type, 'en').toUpperCase();
                    return speciesEn === filters.type.toUpperCase() || typeEn === filters.type.toUpperCase();
                });
            }

            if (filters?.age && filters.age !== 'Any Age') {
                petsData = petsData.filter((p: any) => {
                    let ageInYears = 0;
                    if (p.dob) {
                        const birthDate = new Date(p.dob);
                        const today = new Date();
                        ageInYears = today.getFullYear() - birthDate.getFullYear();
                        if (today.getMonth() < birthDate.getMonth() || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) {
                            ageInYears--;
                        }
                    } else if (p.age) {
                        ageInYears = parseInt(p.age.toString()) || 0;
                    }

                    if (filters.age.includes('0-1')) return ageInYears <= 1;
                    if (filters.age.includes('1-3')) return ageInYears > 1 && ageInYears <= 3;
                    if (filters.age.includes('3-7')) return ageInYears > 3 && ageInYears <= 7;
                    if (filters.age.includes('7+')) return ageInYears > 7;
                    return true;
                });
            }

            return petsData.map((pet: any) => {
                const backendDistance = formatDistanceValue(pet.distance);

                // Hàm ép kiểu số an toàn tuyệt đối
                const safeNum = (val: any) => {
                    if (val === null || val === undefined || val === '') return null;
                    const num = Number(val);
                    return isNaN(num) ? null : num;
                };

                // Ép kiểu tất cả tọa độ về dạng Số (Number) an toàn
                const uLat = safeNum(userLat);
                const uLng = safeNum(userLng);
                const pLat = safeNum(pet.latitude ?? pet.lat ?? pet.shelter?.latitude ?? pet.shelter?.lat);
                const pLng = safeNum(pet.longitude ?? pet.lng ?? pet.shelter?.longitude ?? pet.shelter?.lng);

                // TÍNH TOÁN KHOẢNG CÁCH: Kiểm tra !== null thay vì dùng truthy/falsy
                const clientDistanceKm =
                    !backendDistance && uLat !== null && uLng !== null && pLat !== null && pLng !== null
                        ? getDistanceKm(uLat, uLng, pLat, pLng)
                        : null;

                const displayDistance =
                    backendDistance ||
                    (clientDistanceKm != null ? formatDistanceValue(clientDistanceKm) : null) ||
                    pet.city || pet.location || pet.shelter?.address || t('Location not specified');

                const petImages = pet.images && pet.images.length > 0 ? pet.images.map((img: any) => img.url) : ['https://via.placeholder.com/400x600?text=No+Image'];

                let calculatedAge = pet.age;

                if (!calculatedAge && pet.dob) {
                    const birthDate = new Date(pet.dob);
                    const today = new Date();
                    let years = today.getFullYear() - birthDate.getFullYear();
                    let months = today.getMonth() - birthDate.getMonth();
                    if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) { years--; months += 12; }

                    if (years > 0) calculatedAge = `${years}`;
                    else if (months > 0) calculatedAge = `${months} ${t(months > 1 ? 'months' : 'month')}`;
                    else calculatedAge = t('Less than 1 month');
                }

                return {
                    id: pet.id,
                    name: pet.name,
                    age: calculatedAge || t('Unknown'),
                    gender: pet.gender || 'MALE',
                    distance: displayDistance,
                    location: pet.shelter?.name || pet.location || pet.shelter?.address || t('Location not specified'),
                    image: petImages[0],
                    images: petImages,
                    shelterId: pet.shelter?.id || pet.shelterId || pet.shelterId?._id
                };
            });

        },
        enabled: isLocationLoaded || !!filters?.lat,
        staleTime: 5 * 60 * 1000,
    });

    useEffect(() => {
        setCurrentIndex(0);
        translateX_Even.value = 0; translateX_Odd.value = 0;
        translateY_Even.value = 0; translateY_Odd.value = 0;
        setLastSwipe(null);
    }, [filters?.type, filters?.age, filters?.lat, filters?.lng, location?.lat, location?.lng, language]);

    useEffect(() => {
        const unblockSub = DeviceEventEmitter.addListener('REFETCH_DATA_AFTER_UNBLOCK', () => {
            queryClient.invalidateQueries({ queryKey: ['matching-pets'] });
        });
        return () => unblockSub.remove();
    }, [queryClient]);

    useEffect(() => {
        if (currentIndex % 2 === 0) { translateX_Odd.value = 0; translateY_Odd.value = 0; }
        else { translateX_Even.value = 0; translateY_Even.value = 0; }
    }, [currentIndex]);

    const activeCard = currentIndex < pets.length ? pets[currentIndex] : null;
    const nextCard = currentIndex + 1 < pets.length ? pets[currentIndex + 1] : null;
    const canReload = lastSwipe !== null && lastSwipe.dir === 'left';
    const nextCardStyle = useAnimatedStyle(() => {
        const distance = Math.abs(activeTranslationX.value);
        const scale = interpolate(distance, [0, width], [0.95, 1], Extrapolation.CLAMP);
        const opacity = interpolate(distance, [0, width / 2], [0.8, 1], Extrapolation.CLAMP);
        return { transform: [{ scale }], opacity };
    });
    const [selectedPet, setSelectedPet] = useState<any>(null);

    const handleMainSwipe = (dir: 'left' | 'right' | 'up' | 'reload' | 'heart') => {
        if (!activeCard) return;

        if (dir === 'heart') {
            const isCurrentlyFavorited = localFavorites.includes(activeCard.id);

            setLocalFavorites(prev => {
                if (isCurrentlyFavorited) return prev.filter(id => id !== activeCard.id);
                return [...prev, activeCard.id];
            });

            const apiCall = isCurrentlyFavorited
                ? petService.unfavoritePet(activeCard.id)
                : petService.favoritePet(activeCard.id);

            apiCall
                .then(() => {
                    queryClient.invalidateQueries({ queryKey: ['favorite-pets-list'] });
                    queryClient.invalidateQueries({ queryKey: ['favorite-pets'] });
                })
                .catch(err => {
                    console.error("Lỗi tim/bỏ tim:", err);
                    setLocalFavorites(favoriteIds);
                });

            Toast.show({
                type: 'custom_badge',
                props: {
                    petName: activeCard.name || t('This pet'),
                    actionText: isCurrentlyFavorited
                        ? (isVi ? ' đã được xóa khỏi Thú cưng đã lưu' : ' has been removed from Saved Pet')
                        : (isVi ? ' đã được thêm vào Thú cưng đã lưu' : ' has been added to Saved Pet')
                },
                visibilityTime: 2500, autoHide: true,
            });
            return;
        }

        if (dir === 'reload') {
            if (lastSwipe && lastSwipe.dir === 'left') {
                const prevIndex = lastSwipe.index;
                const prevTranslationX = prevIndex % 2 === 0 ? translateX_Even : translateX_Odd;
                const prevTranslationY = prevIndex % 2 === 0 ? translateY_Even : translateY_Odd;

                prevTranslationX.value = -width * 1.5;
                prevTranslationY.value = 0;

                setCurrentIndex(prevIndex);
                setLastSwipe(null);
                prevTranslationX.value = withSpring(0, { damping: 15, stiffness: 90 });
            }
            return;
        }

        if (dir === 'up') {
            setSelectedPet(activeCard);
            activeTranslationX.value = withSpring(0);
            activeTranslationY.value = withSpring(0);
            return;
        }

        if (dir === 'left') {
            petService.swipePet(activeCard.id, { action: 'PASS' }).catch(err => console.error("Lỗi Pass:", err));
        }

        if (dir === 'right') {
            petService.swipePet(activeCard.id, { action: 'LIKE' }).catch(err => console.error("Lỗi Like:", err));
            setTimeout(() => { onAdopt(activeCard); }, 200);
        }

        if (dir === 'left' || dir === 'right') {
            setLastSwipe({ index: currentIndex, dir });
        }

        setCurrentIndex(prev => prev + 1);
    };

    return (
        <SafeAreaView className="flex-1 bg-[#fff8f0]" edges={['top']}>
            <LinearGradient
                colors={['#FFFFFF', '#FFFBF5', '#FFF9F0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />

            <View className="flex-row items-center justify-between px-6 pt-0 pb-4 z-10 bg-transparent">
                <View className="flex-row items-center">
                    <Text className="text-3xl font-normal text-gray-900 tracking-tight">{t("Pawdoption")}</Text>
                    <TouchableOpacity onPress={onBack} className="px-2 pt-1">
                        <Image className='top-[10px]' source={require('../../assets/icon/Sliders.png')} style={{ width: 14, height: 14 }} contentFit="cover" />
                    </TouchableOpacity>
                </View>

                {likeCount > 0 && (
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => router.push('/favorite-pets')}
                        className="flex-row items-center bg-[#E89B5A] px-3 py-1.5 rounded-full shadow-sm shadow-orange-200"
                    >
                        <AntDesign name="heart" size={15} color="white" />
                        <Text className="text-white font-bold ml-1.5 text-base">{likeCount}</Text>
                    </TouchableOpacity>
                )}
            </View>

            <View className="flex-1 px-6 pb-5 pt-0">
                {isLoading ? (
                    <View className="flex-1 items-center justify-center pb-10">
                        <View className="w-[84px] h-[84px] bg-white rounded-full items-center justify-center shadow-lg shadow-orange-100 mb-6 border border-orange-50">
                            <ActivityIndicator size="large" color="#E89B5A" />
                        </View>
                        <Text className="text-gray-500 font-medium text-lg">{t("Finding perfect matches...")}</Text>
                    </View>
                ) : (
                    <View className="flex-1 relative w-full h-full">
                        {nextCard && (
                            <View className="absolute top-0 left-0 right-0 bottom-0 z-0 pointer-events-none">
                                <Animated.View style={[{ flex: 1, position: 'relative' }, nextCardStyle]}>
                                    <View
                                        style={{
                                            position: 'absolute',
                                            top: 40, left: 20, right: 20, bottom: 0,
                                            backgroundColor: 'white',
                                            borderRadius: 32,
                                            shadowColor: '#ffa053',
                                            shadowOffset: { width: 0, height: 12 },
                                            shadowOpacity: 0.4,
                                            shadowRadius: 10,
                                            elevation: 15,
                                        }}
                                    />
                                    <View className="flex-1 rounded-[32px] overflow-hidden relative bg-gray-100">
                                        <Image
                                            source={nextCard.image}
                                            style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: 32 }}
                                            contentFit="cover"
                                            cachePolicy="memory-disk"
                                            transition={0}
                                        />
                                        {localFavorites.includes(nextCard.id) && (
                                            <View style={{ position: 'absolute', top: 24, right: 24, zIndex: 60 }}>
                                                <AntDesign name="heart" size={40} color="#ffa053" style={{ textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }} />
                                            </View>
                                        )}
                                        <CardOverlay data={nextCard} canReload={false} />
                                    </View>
                                </Animated.View>
                            </View>
                        )}

                        {!isLoading && activeCard ? (
                            <View className="absolute top-0 left-0 right-0 bottom-0 z-20">
                                <SwipeableCard
                                    key={`${activeCard.id}-${currentIndex}`}
                                    data={activeCard}
                                    onSwipe={handleMainSwipe}
                                    sharedTranslateX={activeTranslationX}
                                    sharedTranslateY={activeTranslationY}
                                    isFavorited={localFavorites.includes(activeCard.id)}
                                    canReload={canReload}
                                    onSingleTap={() => handleOpenViewer(activeCard.images || [activeCard.image])}
                                />
                            </View>
                        ) : !isLoading && !activeCard ? (
                            <View className="flex items-center justify-center px-6 pb-20 mt-20">
                                <Image
                                    source={require('../../assets/images/cat-on-box.png')}
                                    contentFit="contain"
                                    style={{
                                        width: 261,
                                        height: 281,
                                    }}
                                />
                                <Text className="text-gray-800 text-lg font-bold mt-8">{t("That's all for now")}</Text>
                                <TouchableOpacity
                                    onPress={handleRefreshList}
                                    activeOpacity={0.8}
                                    disabled={isRefreshing}
                                    className="mt-6 px-8 py-3 bg-white border-[1.5px] border-[#E89B5A] rounded-full shadow-sm min-w-[140px] items-center justify-center"
                                >
                                    {isRefreshing ? (
                                        <ActivityIndicator size="small" color="#E89B5A" />
                                    ) : (
                                        <Text className="text-[#E89B5A] font-bold text-[15px]">{t("Refresh List")}</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        ) : null}
                        <PetDetailOverlay
                            pet={selectedPet}
                            isVisible={!!selectedPet}
                            onClose={() => setSelectedPet(null)}
                            onAdopt={onAdopt}
                            onPetRemovedFromFeed={(petId: string) => {
                                const activeTransX = currentIndex % 2 === 0 ? translateX_Even : translateX_Odd;
                                const activeTransY = currentIndex % 2 === 0 ? translateY_Even : translateY_Odd;

                                activeTransX.value = withTiming(-width * 1.5, { duration: 350 }, (isFinished) => {
                                    'worklet';
                                    if (isFinished) {
                                        activeTransX.value = 0;
                                        activeTransY.value = 0;
                                        runOnJS(finalizePetRemoval)(petId);
                                    }
                                });
                            }}
                            onShelterBlocked={(blockedShelterId: string) => {
                                const activeTransX = currentIndex % 2 === 0 ? translateX_Even : translateX_Odd;
                                const activeTransY = currentIndex % 2 === 0 ? translateY_Even : translateY_Odd;

                                activeTransX.value = withTiming(-width * 1.5, { duration: 350 }, (isFinished) => {
                                    'worklet';
                                    if (isFinished) {
                                        activeTransX.value = 0;
                                        activeTransY.value = 0;
                                        runOnJS(finalizeShelterBlock)(blockedShelterId);
                                    }
                                });
                            }}

                        />
                    </View>
                )}
            </View>
            <ImageViewerOverlay
                images={viewerImages}
                isVisible={isViewerVisible}
                onClose={() => setIsViewerVisible(false)}
            />
            <View style={{ height: TAB_BAR_HEIGHT }} />
        </SafeAreaView>
    )
};

const PetDetailOverlay = ({ pet, isVisible, onClose, onAdopt, onPetRemovedFromFeed, onShelterBlocked }: {
    pet: any;
    isVisible: boolean;
    onClose: () => void;
    onAdopt: (pet: any) => void;
    onPetRemovedFromFeed: (petId: string) => void;
    onShelterBlocked: (shelterId: string) => void;
}) => {
    const { t, language } = useLanguage();
    const isVi = language === 'vi';
    const translateY = useSharedValue(height);

    const [fullPet, setFullPet] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showHideModal, setShowHideModal] = useState(false);
    const queryClient = useQueryClient();
    const [showOptionsMenu, setShowOptionsMenu] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ top: 0, right: 25 });
    const [showReportModal, setShowReportModal] = useState(false);
    const [showBlockModal, setShowBlockModal] = useState(false);
    const [showHistory, setShowHistory] = useState(true);

    const isReady = pet !== null || fullPet !== null;
    const currentPet = pet || fullPet || {};
    const shelter = fullPet?.shelter || currentPet?.shelter || null;
    const shelterId = shelter?.id || currentPet?.shelterId;
    const shelterName = shelter?.name || 'Happy Paws Rescue Center';

    useEffect(() => {
        if (isVisible && pet?.id) {
            setIsLoading(true);
            petService.getPetById(pet.id)
                .then(res => setFullPet(normalizePet(res.data || res, language)))
                .catch(err => console.error("Lỗi lấy chi tiết popup:", err))
                .finally(() => setIsLoading(false));
            translateY.value = withSpring(0, { damping: 35, stiffness: 250, mass: 0.8 });
        } else {
            translateY.value = withTiming(height, { duration: 300 });
            setTimeout(() => setFullPet(null), 300);
        }
    }, [isVisible, pet?.id]);

    const hidePetMutation = useMutation({
        mutationFn: () => {
            if (!currentPet?.id) throw new Error("Pet ID missing");
            return petService.hidePet(currentPet.id);
        },
        onSuccess: () => {
            setShowHideModal(false);
            Toast.show({ type: 'success', text1: isVi ? 'Đã ẩn thú cưng' : 'Pet Hidden' });
            onClose();
            setTimeout(() => {
                onPetRemovedFromFeed(currentPet.id);
            }, 350);
        },
        onError: (error) => {
            console.error("Hide Pet Error:", error);
            setShowHideModal(false);
            Toast.show({
                type: 'error',
                text1: isVi ? 'Có lỗi xảy ra' : 'An error occurred',
                text2: isVi ? 'Không thể ẩn lúc này.' : 'Cannot hide right now.',
            });
        }
    });

    const blockShelterMutation = useMutation({
        mutationFn: () => shelterService.blockShelter(shelterId),
        onSuccess: () => {
            setShowBlockModal(false);
            Toast.show({
                type: 'success',
                text1: isVi ? 'Đã chặn trạm cứu hộ' : 'Shelter Blocked',
                text2: isVi ? `Đã chặn ${shelterName}` : `Blocked ${shelterName}`,
            });
            onClose();
            if (shelterId) {
                setTimeout(() => {
                    onShelterBlocked(shelterId);
                }, 350);
            }
        },
        onError: () => {
            setShowBlockModal(false);
            Toast.show({
                type: 'error',
                text1: isVi ? 'Có lỗi xảy ra' : 'An error occurred',
                text2: isVi ? 'Không thể chặn trạm lúc này.' : 'Cannot block shelter right now.',
            });
        }
    });

    const reportPetMutation = useMutation({
        mutationFn: (data: { reason: string; detail?: string; isBlockRequested?: boolean }) =>
            petService.reportPet(currentPet.id, {
                reason: data.reason,
                detail: data.detail,
                isBlockRequested: data.isBlockRequested,
            }),
        onSuccess: (_res, variables) => {
            if (variables.isBlockRequested) {
                queryClient.invalidateQueries({ queryKey: ['matching-pets'] });
                onPetRemovedFromFeed(currentPet.id);
            }
            queryClient.invalidateQueries({ queryKey: ['feed'] });
        },
        onError: (err) => {
            console.error(err);
            Toast.show({
                type: 'error',
                text1: isVi ? 'Lỗi hệ thống' : 'System Error',
            });
        }
    });

    const pan = Gesture.Pan()
        .onUpdate((event) => {
            if (event.translationY > 0) {
                translateY.value = event.translationY;
            }
        })
        .onEnd((event) => {
            if (event.translationY > height * 0.15 || event.velocityY > 500) {
                runOnJS(onClose)();
            } else {
                translateY.value = withSpring(0, { damping: 25, stiffness: 120 });
            }
        });

    if (!isReady) return null;

    const rawPersonalityTags = fullPet?.personalityTags || [];
    const apiTags = Array.isArray(rawPersonalityTags) ? rawPersonalityTags : [];
    const displayTraits = currentPet?.traitsList || [];

    const displayTags = apiTags.length > 0 ? apiTags : (currentPet.tags || ['Playful', 'Energetic', 'Friendly']);
    const displayBreed = fullPet?.breed || currentPet.breed || 'Labrador Retriever';

    const shelterAddress = shelter?.address || '123 Rescue Street, San Francisco, CA 94102';
    const shelterAvatar = shelter?.avatarUrl || shelter?.coverUrl || currentPet.image || 'https://via.placeholder.com/150';

    const description = fullPet?.description || `${currentPet.name} is a wonderful ${displayBreed} looking for a loving home...`;
    const idealHome = fullPet?.idealHome || `${currentPet.name} would thrive in a home with a fenced yard...`;

    const rawGender = currentPet?.gender || 'UNKNOWN';
    const displayGender = isVi
        ? (rawGender.toUpperCase() === 'MALE' ? 'Đực' : rawGender.toUpperCase() === 'FEMALE' ? 'Cái' : 'Không rõ')
        : (rawGender.toUpperCase() === 'MALE' ? 'Male' : rawGender.toUpperCase() === 'FEMALE' ? 'Female' : 'Unknown');

    const displayAge = pet?.age || fullPet?.age || t('Unknown');

    const displayWeight = fullPet?.weight
        ? `${fullPet.weight} kg`
        : (currentPet?.weight ? `${currentPet.weight} kg` : t('Unknown'));

    const speciesStr = JSON.stringify(fullPet?.species || currentPet?.species || {}).toLowerCase();
    const isDog = speciesStr.includes('dog') || speciesStr.includes('chó') || fullPet?.species === 'Dog' || currentPet?.species === 'Dog';

    const vaccinations = Array.isArray(fullPet?.medicalRecords)
        ? fullPet.medicalRecords.filter((r: any) => r.type === 'VACCINATION' || r.type === 'vaccination')
        : [];

    const rabiesCount = vaccinations.filter((r: any) => {
        if (r.vaccineCategory === 'RABIES') return true;
        const name = JSON.stringify(r.recordName || {}).toLowerCase();
        return name.includes('dại') || name.includes('rabies');
    }).length;

    const coreCount = vaccinations.filter((r: any) => {
        if (r.vaccineCategory === 'CORE') return true;
        const name = JSON.stringify(r.recordName || {}).toLowerCase();
        if (isDog) return name.includes('5 bệnh') || name.includes('7 bệnh') || name.includes('dhpp') || name.includes('in-1');
        return name.includes('3 bệnh') || name.includes('fvrcp') || name.includes('in-1');
    }).length;

    const missingRabies = Math.max(0, 1 - rabiesCount);
    const missingCore = Math.max(0, 3 - coreCount);
    const totalMissing = missingRabies + missingCore;

    const isFullyVaccinated = fullPet?.isVaccinated ?? currentPet?.isVaccinated ?? (totalMissing === 0);

    const vaccineText = isFullyVaccinated
        ? (isVi ? 'Đầy đủ' : 'Fully vaccinated')
        : (isVi ? `Thiếu ${totalMissing}` : `Missing ${totalMissing}`);

    const isSpayedNeutered = fullPet?.isSpayedNeutered ?? currentPet?.isSpayedNeutered ?? false;
    const spayedText = isSpayedNeutered
        ? (isVi ? 'Đã triệt sản' : 'Neutered')
        : (isVi ? 'Chưa triệt sản' : 'Intact');

    const healthCareItems = [
        {
            id: 'vaccination',
            label: isVi ? 'Tiêm chủng' : 'Vaccination',
            value: vaccineText,
            icon: isFullyVaccinated ? require('../../assets/icon/fully-icon.png') : require('../../assets/icon/missing-icon.png'),
            textColor: isFullyVaccinated ? 'text-black' : 'text-[#black]',
        },
        {
            id: 'neutered',
            label: isVi ? 'Trạng thái' : 'Status',
            value: spayedText,
            icon: isSpayedNeutered ? require('../../assets/icon/neutered-icon.png') : require('../../assets/icon/intact-icon.png'),
            textColor: 'text-black'
        },
    ];

    const adoptionRequirementItems = (fullPet?.adoptionRequirements || currentPet?.adoptionRequirements || [])
        .map((item: any) => ({
            id: item.id,
            label: getLocalizedField(item.label, language) || item.label?.en || item.id,
            icon: ADOPTION_REQUIREMENT_ICONS[item.iconKey] || DEFAULT_REQUIREMENT_ICON,
        }));


    return (
        <Animated.View
            style={[
                { transform: [{ translateY }] },
                {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 100
                }
            ]}
            className="bg-white rounded-[32px] overflow-hidden border border-gray-100"
            pointerEvents={isVisible ? 'auto' : 'none'}
        >
            <GestureDetector gesture={pan}>
                <View className="flex-1">
                    <View className="items-center pt-3 pb-1 bg-white z-20">
                        <View className="w-10 h-1 bg-gray-200 rounded-full" />
                    </View>

                    <ScrollView className="flex-1 px-6 pt-2 bg-white" showsVerticalScrollIndicator={false} bounces={true}>
                        <View className='mb-6'>
                            <View className="flex-row items-center justify-between w-full">
                                <View className="flex-row items-baseline flex-1 mr-3 overflow-hidden">
                                    <Text
                                        className="text-[24px] font-semibold text-black tracking-wider flex-shrink"
                                        numberOfLines={1}
                                    >
                                        {currentPet.name}
                                    </Text>

                                    {isLoading && <ActivityIndicator size="small" color="#F97316" style={{ marginLeft: 4 }} />}

                                    <Text
                                        className="text-[14px] text-[#8E8E93] ml-2 font-regular mb-[2px] flex-shrink"
                                        numberOfLines={1}
                                    >
                                        ({displayBreed})
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    onPress={(e) => {
                                        const { pageY } = e.nativeEvent;
                                        setMenuPosition({ top: pageY + 14, right: 25 });
                                        setShowOptionsMenu(true);
                                    }}
                                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                                    className="p-1 z-50 flex-shrink-0"
                                >
                                    <Image
                                        source={require('../../assets/icon/more-vertical.png')}
                                        style={{ width: 16, height: 16 }}
                                        contentFit="cover"
                                    />
                                </TouchableOpacity>
                            </View>

                            <View className="flex-row items-center mt-1.5">
                                <Feather name="map-pin" size={14} color="#F2A465" />
                                <Text className="text-[12px] text-[#8E8E93] ml-1.5 font-regular">
                                    {currentPet.distance ? (isVi ? `Cách đây ${currentPet.distance}` : `${currentPet.distance} away`) : t('Location not specified')}
                                </Text>
                            </View>

                        </View>

                        <View className="flex-row justify-between mb-6 gap-[10px]">
                            <View className={`flex-1 ${rawGender.toUpperCase() === 'MALE' ? 'bg-[#E2EFF8]' : 'bg-[#FAE8ED]'} py-[12px] rounded-[16px] items-center`}>
                                <Text className="text-[#8E8E93] text-[12px] font-regular mb-1">{t('Gender')}</Text>
                                <Text className="text-black text-[14px] font-semibold">{displayGender}</Text>
                            </View>

                            <View className="flex-1 bg-[#FCF8D6] py-[12px] rounded-[16px] items-center">
                                <Text className="text-[#8E8E93] text-[12px] font-regular mb-1">{t('Age')}</Text>
                                <Text className="text-black text-[14px] font-semibold">{displayAge}</Text>
                            </View>

                            <View className="flex-1 bg-[#E8F9E6] py-[12px] rounded-[16px] items-center">
                                <Text className="text-[#8E8E93] text-[12px] font-regular mb-1">{t('Weight')}</Text>
                                <Text className="text-black text-[14px] font-semibold">{displayWeight}</Text>
                            </View>
                        </View>


                        <View className="flex-row items-center border-gray-100 mb-6">
                            <Image
                                source={{ uri: shelterAvatar }}
                                style={{ width: 45, height: 45, borderRadius: 24, marginRight: 12 }}
                                contentFit="cover"
                            />
                            <View className="flex-1 mr-2">
                                <Text className="text-[16px] font-semibold text-[#1C1C1E]" numberOfLines={1}>
                                    {shelterName || 'Pawlife Shelter'}
                                </Text>
                                <Text className="text-[13px] text-[#8E8E93] mt-[2px]" numberOfLines={1}>
                                    {shelterAddress || 'District 7, HCM'}
                                </Text>
                            </View>
                            <View className="flex-row items-center gap-2">
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    className="w-[36px] h-[36px] items-center justify-center"
                                    onPress={() => {
                                        router.push({ pathname: '/shelter-profile', params: { id: shelterId } });
                                    }}
                                >
                                    <Feather name="chevron-right" size={18} color="#B8B8B8" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View className="mb-4">
                            <Text className="font-medium text-black text-[16px] mb-2">{isVi ? `Về ${currentPet.name}` : `About ${currentPet.name}`}</Text>
                            <Text className="text-[#8E8E93] text-[14px] leading-6 mb-2">{description}</Text>
                            {(displayTraits.length > 0) && (
                                <View className="flex-row gap-2 mt-[6px]">
                                    {displayTraits.map((trait: any, index: number) => {

                                        const traitName = typeof trait === 'string'
                                            ? trait
                                            : getLocalizedField(trait?.name, language);

                                        if (!traitName) return null;

                                        const colorGroups = [
                                            [
                                                { bg: 'bg-[#FFF4E8]', text: 'text-[#F3B27B]', border: 'border-[#E8A53C]/25' },
                                                { bg: 'bg-[#FFEFF6]', text: 'text-[#F40C6D]', border: 'border-[#F40C6D]/25' }
                                            ],
                                            [
                                                { bg: 'bg-[#EBF4FE]', text: 'text-[#88B2F3]', border: 'border-[#5A90DA]/25' },
                                                { bg: 'bg-[#FDF1FF]', text: 'text-[#C75ADA]', border: 'border-[#C75ADA]/25' }
                                            ],
                                            [
                                                { bg: 'bg-[#EAF8EF]', text: 'text-[#8FD49D]', border: 'border-[#83DA5A]/25' },
                                                { bg: 'bg-[#E7FFF9]', text: 'text-[#1DB08E]', border: 'border-[#38DFB8]/25' }
                                            ],
                                        ];

                                        const getStableRandomVariant = (str: string) => {
                                            let hash = 0;
                                            for (let i = 0; i < str.length; i++) {
                                                hash = str.charCodeAt(i) + ((hash << 5) - hash);
                                            }
                                            return Math.abs(hash) % 2;
                                        };

                                        const groupIndex = index % colorGroups.length;
                                        const variantIndex = getStableRandomVariant(traitName);
                                        const style = colorGroups[groupIndex][variantIndex];

                                        return (
                                            <View
                                                key={index}
                                                className={`${style.bg} ${style.border} border px-3.5 py-1 rounded-full`}
                                            >
                                                <Text className={`${style.text} text-[12px] font-medium`}>{traitName}</Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}
                        </View>

                        <View className="mb-4">
                            <Text className="font-medium text-black text-[16px] mb-2">{isVi ? `Thói quen của ${currentPet.name}` : `${currentPet.name}'s Behavior`}</Text>

                            {(() => {
                                const resolveGoodBad = (raw: any) => {
                                    if (!raw) return '';
                                    if (Array.isArray(raw)) {
                                        return raw
                                            .map((item: any) => getLocalizedField(item, language) || (typeof item === 'string' ? item : ''))
                                            .filter(Boolean)
                                            .join(', ');
                                    }
                                    return getLocalizedField(raw, language) || (typeof raw === 'string' ? raw : '');
                                };

                                const goodWithText = resolveGoodBad(fullPet?.goodWith || currentPet?.goodWith);
                                const badWithText = resolveGoodBad(fullPet?.badWith || currentPet?.badWith);

                                if (!goodWithText && !badWithText) {
                                    return (
                                        <Text className="text-[14px] text-[#8E8E93] italic leading-[22px]">
                                            {t("Behavioral details have not been updated.")}
                                        </Text>
                                    );
                                }

                                return (
                                    <View>
                                        {!!goodWithText && (
                                            <View className="flex-row items-start">
                                                <View className="flex-row items-center mr-1 mt-[2px]">
                                                    <Image source={require('../../assets/icon/Check.png')} style={{ width: 12, height: 12 }} contentFit="cover" />
                                                    <Text className="ml-1.5 text-[14px] text-[#77C852] font-medium">{t("Good with:")}</Text>
                                                </View>
                                                <Text className="flex-1 text-[14px] text-[#8E8E93] leading-[22px]">{goodWithText}</Text>
                                            </View>
                                        )}
                                        {!!badWithText && (
                                            <View className="flex-row items-start">
                                                <View className="flex-row items-center mr-1 mt-[2px]">
                                                    <Image source={require('../../assets/icon/X.png')} style={{ width: 12, height: 12 }} contentFit="cover" />
                                                    <Text className="ml-1.5 text-[14px] text-[#FE7D66] font-medium">{t("Not suitable:")}</Text>
                                                </View>
                                                <Text className="flex-1 text-[14px] text-[#8E8E93] leading-[22px]">{badWithText}</Text>
                                            </View>
                                        )}
                                    </View>
                                );
                            })()}
                        </View>

                        <View className="mb-6">
                            <Text className="text-[16px] font-medium text-black mb-4">
                                {isVi ? 'Chăm sóc sức khỏe' : 'Health Care'}
                            </Text>

                            <View className="flex-row gap-2 w-full">
                                {healthCareItems.map((item) => (
                                    <View
                                        key={item.id}
                                        className="flex-1 flex-row rounded-[44px] bg-[#F7F7F7] h-[50px] items-center px-[5px]"
                                    >
                                        <View className="bg-white w-[40px] h-[40px] items-center justify-center rounded-full">
                                            <Image
                                                source={item.icon}
                                                style={{ width: 20, height: 20 }}
                                                contentFit="contain"
                                            />
                                        </View>

                                        <View className="ml-[5px] flex-1">
                                            <Text
                                                className="font-regular text-[12px] text-[#8E8E93]"
                                                numberOfLines={1}
                                            >
                                                {item.label}
                                            </Text>

                                            <Text
                                                className={`font-medium text-[14px] ${item.textColor || 'text-black'}`}
                                                numberOfLines={1}
                                            >
                                                {item.value}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>

                        <View className="mb-6">
                            <Text className="text-[16px] font-medium text-black mb-3">
                                {isVi ? 'Yêu cầu nhận nuôi' : 'Adoption Requirements'}
                            </Text>

                            {adoptionRequirementItems.length > 0 ? (
                                <View className="flex-row flex-wrap">
                                    {adoptionRequirementItems.map((item: any) => (
                                        <View
                                            key={item.id}
                                            className="flex-row items-center px-3 h-[25px] rounded-full bg-white border border-[#E5E5E5]"
                                            style={{
                                                marginRight: 8,
                                                marginBottom: 8,
                                                shadowColor: '#000',
                                                shadowOffset: { width: 0, height: 2 },
                                                shadowOpacity: 0.08,
                                                shadowRadius: 4,
                                                elevation: 2,
                                            }}
                                        >
                                            <Image
                                                source={item.icon}
                                                style={{ width: 14, height: 14 }}
                                                contentFit="contain"
                                            />
                                            <Text
                                                className="text-[12px] text-[#8E8E93] font-regular ml-1.5"
                                                numberOfLines={1}
                                            >
                                                {item.label}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            ) : (
                                <Text className="text-[13px] text-[#8E8E93] italic">
                                    {isVi ? 'Chưa có yêu cầu nhận nuôi cụ thể.' : 'No specific adoption requirements yet.'}
                                </Text>
                            )}
                        </View>

                        <View className="mb-6">
                            <View className="flex-row justify-between items-center mb-5">
                                <Text className="text-[16px] font-medium text-black">{isVi ? 'Lịch sử hoạt động' : 'Paw History'}</Text>
                                <TouchableOpacity
                                    onPress={() => setShowHistory(!showHistory)}
                                    activeOpacity={0.6}
                                    className="flex-row items-center px-3 py-1.5 rounded-full"
                                >
                                    <Text className="text-[13px] text-[#F2A465] font-medium mr-1">
                                        {showHistory ? (isVi ? 'Ẩn' : 'Hide') : (isVi ? 'Xem' : 'View')}
                                    </Text>
                                    <Feather name={showHistory ? "chevron-up" : "chevron-down"} size={16} color="#F2A465" />
                                </TouchableOpacity>
                            </View>

                            {showHistory && (() => {
                                const filteredHistory = filterPawHistory(fullPet?.pawHistory);

                                return (
                                    <View className="py-[20px] px-[12px] border border-[#E5E5EA] rounded-[20px] bg-white">
                                        {filteredHistory.length > 0 ? (
                                            filteredHistory.map((item: any, index: number) => {
                                                const isLastItem = index === filteredHistory.length - 1;
                                                const uiConfig = PAW_HISTORY_UI_CONFIG[item.type as PawHistoryType] ?? DEFAULT_HISTORY_UI;
                                                const { title, description } = resolvePawHistoryText(item, isVi);
                                                const formattedDate = new Date(item.date).toLocaleDateString(
                                                    isVi ? 'vi-VN' : 'en-GB',
                                                    { day: '2-digit', month: '2-digit', year: 'numeric' },
                                                );
                                                const isPending = item.isPending || false;

                                                return (
                                                    <View key={item.id ?? index} className="flex-row min-h-[54px]">
                                                        <View className="w-[36px] relative mr-[5px]">
                                                            {!isLastItem && (
                                                                isPending ? (
                                                                    <View
                                                                        className="absolute overflow-hidden items-center"
                                                                        style={{ top: 24, bottom: -2, left: 14.25, width: 1.5 }}
                                                                    >
                                                                        {Array.from({ length: 20 }).map((_, i) => (
                                                                            <View
                                                                                key={i}
                                                                                style={{ width: 1.5, height: 4, backgroundColor: uiConfig.lineColor, marginBottom: 4 }}
                                                                            />
                                                                        ))}
                                                                    </View>
                                                                ) : (
                                                                    <View
                                                                        className="absolute w-[1.5px]"
                                                                        style={{ top: 24, bottom: -2, left: 14.25, backgroundColor: uiConfig.lineColor }}
                                                                    />
                                                                )
                                                            )}

                                                            <View
                                                                className="w-[30px] h-[30px] rounded-full items-center justify-center z-10"
                                                                style={{ backgroundColor: uiConfig.iconBgColor }}
                                                            >
                                                                <Image
                                                                    source={uiConfig.icon}
                                                                    style={{ width: 16, height: 16 }}
                                                                    contentFit="contain"
                                                                />
                                                            </View>
                                                        </View>

                                                        <View className={`flex-1 ${!isLastItem ? 'pb-4' : ''}`}>
                                                            <View className="flex-row justify-between items-start">
                                                                <View className="flex-1 flex-row flex-wrap items-center pr-2">
                                                                    <Text className="text-[14px] font-medium text-black leading-[18px]" numberOfLines={1}>
                                                                        {title}
                                                                    </Text>
                                                                    {isPending && (
                                                                        <Text style={{ marginLeft: 4 }}>
                                                                            <Feather name="alert-circle" size={13} color="#BBB4B5" />
                                                                        </Text>
                                                                    )}
                                                                </View>
                                                                <Text className="text-[11px] font-regular text-[#8E8E93] pt-[2px]" style={{ flexShrink: 0 }}>
                                                                    {formattedDate}
                                                                </Text>
                                                            </View>
                                                            <Text className="text-[12px] font-regular text-[#9B9B9B] mt-[2px] leading-[15px]">
                                                                {item.displayDescription || description}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                );
                                            })
                                        ) : (
                                            <Text className="text-center text-[#8E8E93] py-4 font-regular text-[13px] italic">
                                                {isVi ? 'Chưa có lịch sử hoạt động.' : 'No history available yet.'}
                                            </Text>
                                        )}

                                        <View className="flex-row py-[8px] items-center justify-center gap-2 mt-4 bg-[#F5F5F5] rounded-[8px] mx-[8px]">
                                            <Image source={require('../../assets/icon/lock.png')} style={{ width: 12, height: 12 }} contentFit="cover" />
                                            <Text className="font-regular text-[12px] text-[#8E8E93]">
                                                {isVi ? 'Hành trình không thể bị xoá hay chỉnh sửa.' : 'The journey cannot be deleted or edited.'}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            })()}
                        </View>

                        <View style={{ height: 20 }} />
                    </ScrollView>

                    <Modal
                        visible={showOptionsMenu}
                        animationType="fade"
                        transparent={true}
                        onRequestClose={() => setShowOptionsMenu(false)}
                    >
                        <TouchableOpacity
                            style={{ flex: 1 }}
                            activeOpacity={1}
                            onPress={() => setShowOptionsMenu(false)}
                        >
                            <View
                                className="absolute bg-white rounded-xl border border-gray-100 w-52"
                                style={{ top: menuPosition.top, right: menuPosition.right, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10 }}
                            >
                                <TouchableOpacity
                                    className="flex-row items-center px-4 py-3"
                                    activeOpacity={0.6}
                                    onPress={() => {
                                        setShowOptionsMenu(false);
                                        setShowHideModal(true);
                                    }}
                                >
                                    <Feather name="eye-off" size={14} color="#374151" />
                                    <Text className="text-[14px] text-gray-700 ml-3 font-medium">
                                        {isVi ? `Ẩn ${currentPet?.name}` : `Hide ${currentPet?.name}`}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    className="flex-row items-center px-4 py-3 border-t border-gray-50"
                                    activeOpacity={0.6}
                                    onPress={() => {
                                        setShowOptionsMenu(false);
                                        setShowBlockModal(true);
                                    }}
                                >
                                    <Feather name="slash" size={14} color="#374151" />
                                    <Text className="text-[14px] text-gray-700 ml-3 font-medium">
                                        {isVi ? 'Chặn' : 'Block'}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    className="flex-row items-center px-4 py-3 border-t border-gray-50"
                                    activeOpacity={0.6}
                                    onPress={() => {
                                        setShowOptionsMenu(false);
                                        setShowReportModal(true);
                                    }}
                                >
                                    <Feather name="flag" size={14} color="#EF4444" />
                                    <Text className="text-[14px] text-red-600 ml-3 font-medium">
                                        {isVi ? 'Báo cáo' : 'Report'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    </Modal>

                    <ReportIssueModal
                        isVisible={showReportModal}
                        onClose={() => setShowReportModal(false)}
                        context="matching"
                        targetName={currentPet?.name}
                        onSubmit={async (data) => {
                            await reportPetMutation.mutateAsync({
                                reason: data.reason,
                                detail: data.details,
                                isBlockRequested: data.isBlockRequested,
                            });
                        }}
                    />
                    <Modal
                        visible={showHideModal}
                        animationType="fade"
                        transparent={true}
                        onRequestClose={() => !hidePetMutation.isPending && setShowHideModal(false)}
                    >
                        <View className="flex-1 justify-center items-center bg-black/60 px-5">
                            <View className="bg-white w-full rounded-[28px] p-7 items-center shadow-2xl">
                                <View className="w-16 h-16 rounded-full bg-gray-50 items-center justify-center mb-5 border border-gray-100">
                                    <Feather name="eye-off" size={26} color="#6B7280" />
                                </View>
                                <Text className="text-[20px] font-bold text-gray-900 text-center mb-3 tracking-tight">
                                    {isVi ? `Ẩn ${currentPet?.name}?` : `Hide ${currentPet?.name}?`}
                                </Text>
                                <Text className="text-[15px] text-gray-500 text-center mb-8 leading-6 px-1">
                                    {isVi
                                        ? `Hồ sơ của ${currentPet?.name} sẽ bị ẩn đi và không còn xuất hiện trong danh sách thú cưng của bạn nữa.`
                                        : `Profile of ${currentPet?.name} will be hidden and will no longer appear in your feed.`}
                                </Text>
                                <View className="w-full flex-col gap-3.5">
                                    <TouchableOpacity
                                        className="w-full bg-[#374151] py-4 rounded-[14px] items-center"
                                        activeOpacity={0.8}
                                        disabled={hidePetMutation.isPending}
                                        onPress={() => hidePetMutation.mutate()}
                                    >
                                        {hidePetMutation.isPending ? (
                                            <ActivityIndicator color="white" />
                                        ) : (
                                            <Text className="text-white font-bold text-[15px]">{isVi ? 'Xác nhận ẩn' : 'Confirm Hide'}</Text>
                                        )}
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        className="w-full bg-gray-50 py-4 rounded-[14px] items-center border border-gray-100"
                                        activeOpacity={0.7}
                                        disabled={hidePetMutation.isPending}
                                        onPress={() => setShowHideModal(false)}
                                    >
                                        <Text className="text-gray-600 font-bold text-[15px]">{isVi ? 'Hủy bỏ' : 'Cancel'}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>
                    <Modal
                        visible={showBlockModal}
                        animationType="fade"
                        transparent={true}
                        onRequestClose={() => !blockShelterMutation.isPending && setShowBlockModal(false)}
                    >
                        <View className="flex-1 justify-center items-center bg-black/60 px-5">
                            <View className="bg-white w-full rounded-[28px] p-7 items-center shadow-2xl">
                                <View className="w-16 h-16 rounded-full bg-red-50 items-center justify-center mb-5 border border-red-100">
                                    <Feather name="slash" size={26} color="#EF4444" />
                                </View>

                                <Text className="text-[20px] font-bold text-gray-900 text-center mb-3 tracking-tight">
                                    {isVi ? `Chặn ${shelterName}?` : `Block ${shelterName}?`}
                                </Text>
                                <Text className="text-[15px] text-gray-500 text-center mb-8 leading-6 px-1">
                                    {isVi
                                        ? `Bạn sẽ không thấy bất kỳ bài đăng hoặc thú cưng nào từ trạm cứu hộ này nữa.`
                                        : `You won't see any posts or pets from this shelter anymore.`}
                                </Text>

                                <View className="w-full flex-col gap-3.5">
                                    <TouchableOpacity
                                        className="w-full bg-[#EF4444] py-4 rounded-[14px] items-center shadow-sm shadow-red-200"
                                        activeOpacity={0.8}
                                        disabled={blockShelterMutation.isPending}
                                        onPress={() => blockShelterMutation.mutate()}
                                    >
                                        {blockShelterMutation.isPending ? (
                                            <ActivityIndicator color="white" />
                                        ) : (
                                            <Text className="text-white font-bold text-[15px] tracking-wide">
                                                {isVi ? `Chặn ${shelterName}` : `Block ${shelterName}`}
                                            </Text>
                                        )}
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        className="w-full bg-gray-50 py-4 rounded-[14px] items-center border border-gray-100"
                                        activeOpacity={0.7}
                                        onPress={() => setShowBlockModal(false)}
                                    >
                                        <Text className="text-gray-600 font-bold text-[15px]">
                                            {isVi ? 'Hủy bỏ' : 'Cancel'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>
                    <View className="w-full px-6 pt-4 pb-6 bg-white items-center ">
                        <TouchableOpacity
                            className="px-10 bg-[#E89B5A] py-4 rounded-full items-center mb-4 shadow-sm"
                            activeOpacity={0.8}
                            onPress={() => { onClose(); onAdopt(currentPet); }}
                        >
                            <Text className="text-white font-semibold text-lg mx-6">{t("Apply To Adopt")}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity activeOpacity={0.6} onPress={onClose} className="py-2 px-6">
                            <Text className="text-gray-500 text-[15px]" style={{ textDecorationLine: 'underline' }}>{t("Cancel")}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </GestureDetector>
        </Animated.View>
    );
};

// ==================================================================
// MAIN PARENT COMPONENT
// ==================================================================
export default function MatchingScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const { returnFromSuccess } = useLocalSearchParams();
    const { user } = useContext(AuthContext);
    const queryClient = useQueryClient();
    const COMPLETED_USERS_KEY = 'completed_onboarding_users_list';
    const MATCHING_FILTERS_KEY = 'user_matching_filters_data';
    const [appStage, setAppStage] = useState<number>(3);
    const [isCheckingStatus, setIsCheckingStatus] = useState(true);
    const [selectedPet, setSelectedPet] = useState<any>(null);
    const [isEditing, setIsEditing] = useState<boolean>(false);

    const [surveyFilters, setSurveyFilters] = useState<{ type: string | null, age: string | null, lat?: number | null, lng?: number | null, address?: string, isUsingGps?: boolean }>({ type: null, age: null, lat: null, lng: null });

    useEffect(() => {
        const checkUserStatus = async () => {
            if (returnFromSuccess === '1') {
                setAppStage(3);
                setIsCheckingStatus(false);

                // Vẫn load lại vị trí đã lưu để tính khoảng cách
                try {
                    const saved = await AsyncStorage.getItem(MATCHING_FILTERS_KEY);
                    if (saved) setSurveyFilters(JSON.parse(saved));
                } catch (e) { }
                return;
            }

            if (!user?.id) {
                setAppStage(0);
                setIsCheckingStatus(false);
                return;
            }

            try {
                // 1. Đọc danh sách user đã onboarding
                const storedUsersJSON = await AsyncStorage.getItem(COMPLETED_USERS_KEY);
                const completedUsers: string[] = storedUsersJSON ? JSON.parse(storedUsersJSON) : [];

                // 2. Đọc lại filter và vị trí (lat, lng) đã lưu từ trước
                const savedFiltersJSON = await AsyncStorage.getItem(MATCHING_FILTERS_KEY);
                if (savedFiltersJSON) {
                    setSurveyFilters(JSON.parse(savedFiltersJSON));
                }

                if (completedUsers.includes(user.id)) {
                    setAppStage(3);
                } else {
                    setAppStage(0);
                }
            } catch (error) {
                console.error("Lỗi khi đọc danh sách user:", error);
                setAppStage(0);
            } finally {
                setIsCheckingStatus(false);
            }
        };

        checkUserStatus();
    }, [user?.id, returnFromSuccess]);

    useEffect(() => {
        const shouldHideTabBar = appStage < 3;
        navigation.setOptions({
            tabBarStyle: { display: shouldHideTabBar ? 'none' : 'flex' }
        });
    }, [appStage, navigation]);

    const handleDetail = (pet: any) => {
        setSelectedPet(pet);
    };

    const handleAdopt = (pet: any) => {
        router.push({
            pathname: '/adoption-form',
            params: { id: pet.id, name: pet.name, age: pet.age, image: pet.image }
        });
    };

    const handleCompleteOnboarding = async () => {
        try {
            if (user?.id) {
                const storedUsersJSON = await AsyncStorage.getItem(COMPLETED_USERS_KEY);
                const completedUsers: string[] = storedUsersJSON ? JSON.parse(storedUsersJSON) : [];

                if (!completedUsers.includes(user.id)) {
                    completedUsers.push(user.id);
                    await AsyncStorage.setItem(COMPLETED_USERS_KEY, JSON.stringify(completedUsers));
                }
            }
            setAppStage(3);
        } catch (error) {
            console.error("Lỗi khi lưu danh sách user:", error);
            setAppStage(3);
        }
    };

    if (isCheckingStatus) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#E89B5A" />
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            {appStage === 0 && (
                <SurveyScreen
                    initialFilters={surveyFilters}
                    onComplete={async (data) => {
                        // 1. Cập nhật state nội bộ
                        setSurveyFilters(data);

                        // 2. LƯU DỮ LIỆU VÀO ASYNC_STORAGE (Giữ vị trí khi reload app)
                        try {
                            await AsyncStorage.setItem(MATCHING_FILTERS_KEY, JSON.stringify(data));
                        } catch (e) {
                            console.error("Lỗi lưu filter:", e);
                        }

                        if (isEditing) {
                            setAppStage(3);
                            setIsEditing(false);
                        } else {
                            setAppStage(1);
                        }
                    }}
                    onBack={() => {
                        if (isEditing) {
                            setAppStage(3);
                            setIsEditing(false);
                        } else if (router.canGoBack()) {
                            router.back();
                        } else {
                            router.push('/(tabs)');
                        }
                    }}
                />
            )}

            {appStage === 1 && (
                <PolicyScreen
                    onAgree={() => {
                        setAppStage(2);
                    }}
                    onBack={() => {
                        setAppStage(0);
                    }}
                />
            )}

            {appStage === 2 && (
                <TutorialScreen
                    onComplete={handleCompleteOnboarding}
                />
            )}

            {appStage >= 3 && (
                <MainSwipeScreen
                    filters={surveyFilters}
                    onUpdateFilters={(newFilters) => setSurveyFilters(newFilters)} // <--- TRUYỀN HÀM XUỐNG ĐÂY
                    onBack={() => {
                        setIsEditing(true);
                        setAppStage(0);
                    }}
                    onDetail={handleDetail}
                    onAdopt={handleAdopt}
                />
            )}
        </View>
    );
}