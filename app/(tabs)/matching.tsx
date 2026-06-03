// app/(tabs)/matching.tsx
import { Text } from '@/components/AppText';
import { AuthContext } from '@/contexts/AuthContext';
import { AntDesign, Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Keyboard, Modal, Text as RNText, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
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
import { useLocation } from '../../hooks/useLocation';
import { petService } from '../../services/petService';

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
        // 1. THÊM pointerEvents="box-none" VÀO ĐÂY
        <View className="absolute bottom-0 left-0 right-0 justify-end z-40 pb-8 pt-32" pointerEvents="box-none">
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.85)', 'rgba(0, 0, 0, 0.75)']}
                locations={[0, 0.4, 0.7, 1]}
                style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '100%' }}
                pointerEvents="none"
            />

            <View className="px-6 mb-5 pointer-events-none z-50">
                <View className="flex-row items-center mb-1">
                    <Text className="text-white text-4xl font-semibold shadow-sm mr-3">{data.name}</Text>

                    {/* --- ĐÃ CẬP NHẬT GIAO DIỆN GIỚI TÍNH + TUỔI TẠI ĐÂY --- */}
                    <View className="flex-row items-center bg-white/25 px-2 py-0.5 rounded-full border-[1px] border-white/90 overflow-hidden backdrop-blur-xl shadow-sm">
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
                    <Image source={require('../../assets/icon/location_solid.png')} style={{ width: 13, height: 16 }} resizeMode="cover" />
                    <Text className="text-white ml-1 text-base">{data.location}  ·  {data.distance}</Text>
                </View>
            </View>

            {/* Các nút thả tim, pass giữ nguyên... */}
            <View className="flex-row justify-center items-center w-full z-50 gap-7" pointerEvents="box-none">

                <TouchableOpacity
                    disabled={!canReload}
                    className={`${actionButtonClasses} w-14 h-14 border-[2px] border-[#4643FF] ${!canReload ? 'opacity-50' : 'opacity-100'}`}
                    onPress={() => onAction && onAction('reload')}
                >
                    <Image className='mr-3' source={require('../../assets/icon/reload-pawdoption.png')} style={{ width: 18, height: 18 }} resizeMode="cover" />
                </TouchableOpacity>

                <TouchableOpacity className={`${actionButtonClasses} w-14 h-14 border-[2px] border-[#FF4646]`} onPress={() => onAction && onAction('left')}>
                    <Image className='mr-3' source={require('../../assets/icon/x-pawdoption.png')} style={{ width: 15, height: 15 }} resizeMode="cover" />
                </TouchableOpacity>

                <TouchableOpacity className={`${actionButtonClasses} w-14 h-14 border-[2px] border-[#E89B5A]`} onPress={() => onAction && onAction('heart')}>
                    <Image className='mr-3' source={
                        isFavorited
                            ? require('../../assets/icon/heart-filled-pawdoption.png')
                            : require('../../assets/icon/heart-pawdoption.png')
                    } style={{ width: 27, height: 27 }} resizeMode="cover" />
                </TouchableOpacity>

                <TouchableOpacity className={`${actionButtonClasses} w-14 h-14 border-[2px] border-[#77C852]`} onPress={() => onAction && onAction('right')}>
                    <Image className='mr-3' source={require('../../assets/icon/tick-pawdoption.png')} style={{ width: 19, height: 13 }} resizeMode="cover" />
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

    // --- THÊM SINGLE TAP CHO VIỆC XEM ẢNH ---
    const singleTap = Gesture.Tap()
        .numberOfTaps(1)
        .enabled(!disableSwipe)
        .onEnd(() => {
            if (onSingleTap) runOnJS(onSingleTap)();
        });

    // Dùng Exclusive để hệ thống chờ xem user bấm 1 hay 2 lần
    const taps = Gesture.Exclusive(doubleTap, singleTap);

    // Đưa tổ hợp taps và pan vào Race
    //const gesture = Gesture.Race(taps, pan);

    const animatedStyle = useAnimatedStyle(() => {
        const rotate = interpolate(sharedTranslateX.value, [-width / 2, 0, width / 2], [-10, 0, 10], Extrapolation.CLAMP);
        return { transform: [{ translateX: sharedTranslateX.value }, { translateY: sharedTranslateY.value }, { rotate: `${rotate}deg` }, { scale: scale.value }] };
    });

    const likeOpacity = useAnimatedStyle(() => ({ opacity: interpolate(sharedTranslateX.value, [0, width / 4], [0, 1]) }));
    const nopeOpacity = useAnimatedStyle(() => ({ opacity: interpolate(sharedTranslateX.value, [-width / 4, 0], [1, 0]) }));

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

                        {/* GESTURE TẦNG 2: TAPS - Chỉ bọc riêng khu vực Ảnh để mở Image Viewer */}
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
                                likeOpacity,
                                {
                                    position: 'absolute',
                                    top: isTutorialCard ? height * 0.12 : 64,
                                    left: 32,
                                    zIndex: 50,
                                    transform: [{ rotate: '-12deg' }]
                                }
                            ]}
                            className="border-[6px] border-green-400 rounded-xl px-4 py-2 pointer-events-none"
                            pointerEvents="none"
                        >
                            <Text className="text-green-400 font-extrabold text-5xl uppercase tracking-widest">LIKE</Text>
                        </Animated.View>

                        <Animated.View
                            style={[
                                nopeOpacity,
                                {
                                    position: 'absolute',
                                    top: isTutorialCard ? height * 0.12 : 64,
                                    right: 32,
                                    zIndex: 50,
                                    transform: [{ rotate: '12deg' }]
                                }
                            ]}
                            className="border-[6px] border-red-500 rounded-xl px-4 py-2 pointer-events-none"
                            pointerEvents="none"
                        >
                            <Text className="text-red-500 font-extrabold text-5xl uppercase tracking-widest">NOPE</Text>
                        </Animated.View>

                        {/* ICON HEART GÓC TRÊN CÙNG */}
                        <Animated.View
                            style={[
                                heartAnimatedStyle,
                                {
                                    position: 'absolute',
                                    top: isTutorialCard ? height * 0.1 : 20, // Đẩy xuống 20% nếu là tutorial
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
    const insets = useSafeAreaInsets();
    const { requestLocation, saveManualCity } = useLocation();

    const [isUsingGps, setIsUsingGps] = useState(false);
    const [surveyStep, setSurveyStep] = useState(1);

    // Lấy giá trị khởi tạo từ filter đã lưu (nếu có)
    const [selectedType, setSelectedType] = useState<string | null>(initialFilters?.type || null);
    const [selectedAge, setSelectedAge] = useState<string | null>(initialFilters?.age || null);

    const [locationText, setLocationText] = useState('');
    const [isRequestingGps, setIsRequestingGps] = useState(false);

    const isValid = () => {
        if (surveyStep === 1) return !!selectedType;
        if (surveyStep === 2) return !!selectedAge;
        if (surveyStep === 3) return locationText.trim().length > 0;
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
            onComplete({ type: selectedType, age: selectedAge });
        }
    };
    const handleUseGps = async () => {
        setIsRequestingGps(true);
        const loc = await requestLocation();
        setIsRequestingGps(false);
        if (loc) {
            setIsUsingGps(true);
            setLocationText('Current Location');
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

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>

            <SafeAreaView className="flex-1 bg-white" edges={['top']}>
                <View className="flex-1 px-6 pt-2">

                    {/* --- HEADER MỚI VỚI NÚT BACK --- */}
                    <View className="flex-row items-center justify-between mb-4 mt-2">
                        <TouchableOpacity
                            onPress={handleBack}
                            activeOpacity={0.7}
                            className="w-10 h-10 items-center justify-center"
                        >
                            <Feather name="chevron-left" size={24} color="#374151" />
                        </TouchableOpacity>

                    </View>
                    {/* -------------------------------- */}

                    <ProgressBar current={surveyStep} />

                    <View className="mt-2">
                        {/* STEP 1: TYPE */}
                        {surveyStep === 1 && (
                            <View>
                                <Text className="text-[30px] font-semibold text-black  mb-[18px]">Let's Find Your Match!</Text>
                                <Text className="text-[16px] font-medium text-[#8E8E93] mb-[32px]">What type of pet are you looking to adopt?</Text>
                                <View className=''>

                                    <View className="flex-row justify-between gap-3">
                                        {[{ id: 'dog', label: 'Dogs', icon: require('../../assets/images/dog-icon.png') }, { id: 'cat', label: 'Cats', icon: require('../../assets/images/cat-icon.png') }, { id: 'both', label: 'Both', icon: require('../../assets/images/both-icon.png') }].map((item) => (
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
                                <Text className="text-[30px] font-semibold text-black mb-[18px]">Age Preference</Text>
                                <Text className="text-[16px] font-medium text-[#8E8E93] mb-[30px]">What age range are you looking for?</Text>
                                <View className="gap-3">
                                    {AGE_PREFERENCES.map((age) => (
                                        <TouchableOpacity
                                            key={age}
                                            activeOpacity={0.7}
                                            onPress={() => setSelectedAge(age)}
                                            className={`p-[14px] rounded-[16px] border ${selectedAge === age ? 'border-[#E89B5A] bg-orange-50' : 'border-[#E5E5E5] bg-white'}`}
                                        >
                                            <Text className={`font-medium text-[16px] ${selectedAge === age ? 'text-[#E89B5A]' : 'text-black'}`}>{age}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* STEP 3: LOCATION */}
                        {surveyStep === 3 && (
                            <View>
                                <Text className="text-[30px] font-semibold text-black mb-[18px]">Your Location</Text>
                                <Text className="text-[16px] font-medium text-[#8E8E93] mb-[10px]">We'll help you find adoption shelters near you</Text>

                                <View
                                    className={`p-4 rounded-2xl flex-row items-center border-[1.5px] mb-4 ${locationText.trim().length > 0
                                        ? 'bg-orange-50 border-[#E89B5A]'
                                        : 'bg-gray-50 border-gray-100'
                                        } mt-5`}
                                >
                                    <TextInput
                                        placeholder="Enter your district or city"
                                        placeholderTextColor="#9CA3AF"
                                        className={`ml-3 flex-1 font-medium text-[16px] text-black`}
                                        value={locationText}
                                        style={{ fontFamily: "Urbanist" }}
                                        onChangeText={(text) => {
                                            setLocationText(text);
                                            setIsUsingGps(false);
                                        }}
                                    />
                                    {locationText.trim().length > 0 && (
                                        <TouchableOpacity onPress={() => {
                                            setLocationText('');
                                            setIsUsingGps(false);
                                        }} className="p-1">
                                            <Ionicons name="close" size={18} color="#D1D5DB" />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={handleUseGps}
                                    disabled={isRequestingGps}
                                    className="flex-row items-center justify-center py-4 border border-[#E5E5E5] rounded-[16px] bg-white active:bg-gray-50"
                                >
                                    {isRequestingGps ? (
                                        <ActivityIndicator size="small" color="#F97316" />
                                    ) : (
                                        <Image
                                            source={require('../../assets/icon/location_solid.png')}
                                            style={{ width: 18, height: 18 }}
                                            resizeMode="cover"
                                        />
                                    )}
                                    <Text className="ml-2 font-medium text-[16px] text-black">Use Current Location</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>

                {/* VÙNG BOTTOM ACTION */}
                <View
                    style={{
                        paddingBottom: Math.max(insets.bottom, 16),
                        paddingHorizontal: 24,
                        paddingTop: 16,
                    }}
                >
                    <TouchableOpacity
                        onPress={handleContinue}
                        disabled={!stepValid}
                        activeOpacity={0.8}
                        className={`w-full py-[18px] rounded-[36px] items-center justify-center ${stepValid ? 'bg-[#E89B5A]' : 'bg-[#E89B5A]/60'
                            }`}
                    >
                        <Text className={`font-bold text-[16px] text-white`}>
                            {surveyStep === 3 ? 'Apply Filters' : 'Continue'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
};
// ==================================================================
// 2. POLICY SCREEN (PURE UI - KHÔNG GỌI NAVIGATION)
// ==================================================================
const PolicyScreen = ({ onAgree, onBack }: { onAgree: () => void, onBack: () => void }) => {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [isAgreed, setIsAgreed] = useState(false);

    const PolicyItem = ({ number, title, content }: any) => (
        <View className="flex-row items-start mb-[21px]">
            <View className="w-4 shrink-0 mr-2 items-start">
                <Text className="text-black text-[16px] font-medium">
                    {number}.
                </Text>
            </View>
            <View className="flex-1">
                <Text className="text-gray-800 font-medium text-[16px] mb-[4px]" numberOfLines={1}>{title}</Text>
                <Text className="text-gray-500 font-regular text-[14px] leading-[20px] tracking-[0.06px]">{content}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            {/* HEADER */}
            <View className="flex-row items-center justify-between px-4 pt-3">
                <View className="w-10" />
                <Text className="flex-1 text-center font-semibold text-[20px] text-gray-900 tracking-wide">
                    Adoption Pawlicy
                </Text>
                {/* Đổi chức năng nút X thành onBack (Quay lại) thay vì onAgree (Đồng ý) */}
                <TouchableOpacity
                    onPress={onBack}
                    className="w-10 items-end py-1.5"
                >
                    <Feather name="x" size={18} color="#374151" />
                </TouchableOpacity>
            </View>

            {/* NỘI DUNG CUỘN */}
            <View className="flex-1">
                <Animated.ScrollView
                    className="flex-1 px-[30px] pt-[30px]"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 40 }}
                >
                    <View className="mb-4">
                        <PolicyItem number="1" title="Love and care for your pet for life" content="Do not abandon, harm, or use the pet for any illegal or inhumane purposes" />
                        <PolicyItem number="2" title="Provide a safe & suitable living environment" content="This includes proper food, shelter, attention, and veterinary care when needed" />
                        <PolicyItem number="3" title="Take care of your pet's health" content="Check-ups, vaccinations, and rabies shots as recommended." />
                        <PolicyItem number="4" title="Stay in touch after adoption & when needed" content="During the first 6 months, share updates to ensure pet is doing well." />
                        <PolicyItem number="5" title="Do not transfer your pet" content="Contact PawLife if you can no longer care for the pet." />
                        <PolicyItem number="6" title="Provide truthful personal information" content="Basic personal and address information helps ensure your pet's safety and well-being after adoption." />
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
                    className="flex-row items-center mb-5"
                >
                    <View className='flex-row items-center w-full justify-center'>

                        <Ionicons
                            name={isAgreed ? "checkbox" : "square-outline"}
                            size={24}
                            color={isAgreed ? "#E89B5A" : "#9CA3AF"}
                        />
                        <Text className={`ml-3 text-[14px] ${isAgreed ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                            I agree to{' '}
                            <Text
                                onPress={() => {
                                    router.push('/terms-of-service');
                                }}
                                className="text-[#E89B5A]"
                            >
                                Policy Terms & Privacy Conditions
                            </Text>
                            .
                        </Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={onAgree}
                    disabled={!isAgreed}
                    activeOpacity={0.8}
                    className={`w-full py-[18px] rounded-full items-center justify-center ${isAgreed ? 'bg-[#E89B5A]' : 'bg-gray-100'
                        }`}
                >
                    <Text className={`font-bold text-[17px] ${isAgreed ? 'text-white' : 'text-gray-400'}`}>
                        Submit
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
        instruction: "Not this one",
        subInstruction: "",
        iconName: "arrow-left"
    },
    {
        id: 'step2',
        image: require('../../assets/images/t-right.png'),
        forcedDir: 'right',
        instruction: "Hmm... this one!",
        subInstruction: "",
        iconName: "arrow-right"
    },
    {
        id: 'step3',
        image: require('../../assets/images/t-top.png'),
        forcedDir: 'up',
        instruction: "What’s their story?",
        subInstruction: "",
        iconName: "arrow-up"
    },
    {
        id: 'step4',
        image: require('../../assets/images/t-center.jpg'),
        forcedDir: 'heart',
        instruction: "Maybe later, might be forever",
        subInstruction: "",
        iconName: "gesture-double-tap"
    }
];

// ==================================================================
// 3. TUTORIAL SCREEN (PURE UI)
// ==================================================================
const TutorialScreen = ({ onComplete }: { onComplete: () => void }) => {
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
                console.log("Lỗi preload ảnh tutorial:", error);
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

                                                    // --- CHUẨN TEXT SHADOW CHO CẢ IOS & ANDROID ---
                                                    textShadowColor: 'rgba(0, 0, 0, 0.2)',
                                                    textShadowOffset: { width: 0, height: 2 },
                                                    textShadowRadius: 2,
                                                }}
                                            >
                                                {activeItem.instruction}
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
                            Skip Tutorial
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

    useEffect(() => {
        if (isVisible) setCurrentIndex(0);
    }, [isVisible]);

    if (!isVisible || !images || images.length === 0) return null;

    const handlePressLeft = () => {
        if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
    };

    const handlePressRight = () => {
        if (currentIndex < images.length - 1) setCurrentIndex(prev => prev + 1);
    };

    return (
        <Modal visible={isVisible} transparent animationType="fade">
            <View className="flex-1 bg-black">
                <View
                    className="flex-row items-center justify-between px-4 py-2 z-50 absolute left-0 right-0"
                    style={{ top: Math.max(insets.top, 20) }}
                >
                    <TouchableOpacity
                        onPress={onClose}
                        className="p-2 bg-black/40 rounded-full"
                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                    >
                        <Feather name="x" size={24} color="white" />
                    </TouchableOpacity>

                    <View className="bg-black/40 px-3 py-1 rounded-full">
                        <Text className="text-white text-[14px] font-medium">
                            {currentIndex + 1} / {images.length}
                        </Text>
                    </View>

                    <View className="w-10" />
                </View>

                <Image
                    source={{ uri: images[currentIndex] }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="contain"
                />

                <View style={{ position: 'absolute', top: '25%', bottom: 0, left: 0, right: 0, flexDirection: 'row', zIndex: 10 }}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={handlePressLeft} activeOpacity={1} />
                    <TouchableOpacity style={{ flex: 1 }} onPress={handlePressRight} activeOpacity={1} />
                </View>

            </View>
        </Modal>
    );
};

// ==================================================================
// 4. MAIN SWIPE SCREEN (PURE UI)
// ==================================================================
const MainSwipeScreen = ({ filters, onBack, onDetail, onAdopt }: { filters: any, onBack: () => void, onDetail: (item: any) => void, onAdopt: (item: any) => void }) => {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [isViewerVisible, setIsViewerVisible] = useState(false);
    const [viewerImages, setViewerImages] = useState<string[]>([]);
    const { user } = useContext(AuthContext);
    const { location, isLocationLoaded } = useLocation();

    // --- STATE THÚ CƯNG TỪ API ---
    const [pets, setPets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [lastSwipe, setLastSwipe] = useState<{ index: number, dir: string } | null>(null);
    const [originalPets, setOriginalPets] = useState<any[]>([]);
    // --- STATE LƯU TRỮ TIM (FAVORITES) ---
    const [favorites, setFavorites] = useState<string[]>([]); // Sử dụng string[] nếu id từ API là chuỗi

    const translateX_Even = useSharedValue(0);
    const translateX_Odd = useSharedValue(0);
    const translateY_Even = useSharedValue(0);
    const translateY_Odd = useSharedValue(0);

    const activeTranslationX = currentIndex % 2 === 0 ? translateX_Even : translateX_Odd;
    const activeTranslationY = currentIndex % 2 === 0 ? translateY_Even : translateY_Odd;

    // --- THÊM MỚI: TỔNG SỐ LƯỢT TIM TRONG PHIÊN ---
    const [likeCount, setLikeCount] = useState(0);

    // --- LẤY DỮ LIỆU TỪ API ---
    const loadPets = async () => {
        setLoading(true);
        try {
            // 1. Gọi API với limit lớn (vd 30 hoặc 50) để lấy đủ data phục vụ cho việc lọc local
            const response = await petService.getFeed(30, location?.lat, location?.lng);
            let petsData = response?.data?.data || response?.data || response || [];

            // =========================================================
            // 2. LOGIC LỌC LOCAL (Theo bộ lọc Survey)
            // =========================================================

            // A. Lọc theo Giống loài (Dog / Cat / Both)
            if (filters?.type && filters.type !== 'both') {
                petsData = petsData.filter((p: any) =>
                    p.species?.toUpperCase() === filters.type.toUpperCase() ||
                    p.type?.toUpperCase() === filters.type.toUpperCase()
                );
            }

            // B. Lọc theo Độ tuổi
            if (filters?.age && filters.age !== 'Any Age') {
                petsData = petsData.filter((p: any) => {
                    let ageInYears = 0;
                    if (p.dob) {
                        const birthDate = new Date(p.dob);
                        const today = new Date();
                        ageInYears = today.getFullYear() - birthDate.getFullYear();
                        if (today.getMonth() < birthDate.getMonth() ||
                            (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) {
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

            // =========================================================
            // 3. CHUẨN HOÁ DỮ LIỆU HIỂN THỊ LÊN THẺ (UI)
            // =========================================================
            const mappedPets = petsData.map((pet: any) => {

                const displayDistance = pet.distance
                    ? `${pet.distance}`
                    : (pet.city || pet.location || 'Gần bạn');

                const petImages = pet.images && pet.images.length > 0
                    ? pet.images.map((img: any) => img.url)
                    : ['https://via.placeholder.com/400x600?text=No+Image'];

                let calculatedAge = pet.age;
                if (!calculatedAge && pet.dob) {
                    const birthDate = new Date(pet.dob);
                    const today = new Date();
                    let years = today.getFullYear() - birthDate.getFullYear();
                    let months = today.getMonth() - birthDate.getMonth();

                    if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
                        years--;
                        months += 12;
                    }

                    if (years > 0) {
                        calculatedAge = `${years}`;
                    } else if (months > 0) {
                        calculatedAge = `${months} tháng`;
                    } else {
                        calculatedAge = '< 1 tháng';
                    }
                }

                return {
                    id: pet.id,
                    name: pet.name,
                    age: calculatedAge || 'Unknown',
                    gender: pet.gender || 'MALE',
                    distance: displayDistance,
                    location: pet.shelter?.name || pet.location || 'Location',
                    image: petImages[0],
                    images: petImages
                };
            });

            // =========================================================
            // 4. CẬP NHẬT STATE & RESET ANIMATION
            // =========================================================
            setPets(mappedPets);
            setOriginalPets(mappedPets);
            setCurrentIndex(0);

            translateX_Even.value = 0; translateX_Odd.value = 0;
            translateY_Even.value = 0; translateY_Odd.value = 0;
            setLastSwipe(null);

        } catch (error) {
            console.error("Lỗi khi lấy danh sách thú cưng:", error);
        } finally {
            setLoading(false);
        }
    };
    const handleOpenViewer = (images: string[]) => {
        if (images && images.length > 0) {
            setViewerImages(images);
            setIsViewerVisible(true);
        }
    };
    useFocusEffect(
        useCallback(() => {
            if (isLocationLoaded) {
                loadPets();
                loadFavoritesCount();
            }
        }, [isLocationLoaded, location, user?.id])
    );

    useEffect(() => {
        if (currentIndex % 2 === 0) { translateX_Odd.value = 0; translateY_Odd.value = 0; }
        else { translateX_Even.value = 0; translateY_Even.value = 0; }
    }, [currentIndex]);

    const activeCard = currentIndex < pets.length ? pets[currentIndex] : null;
    const nextCard = currentIndex + 1 < pets.length ? pets[currentIndex + 1] : null;
    const canReload = lastSwipe !== null && lastSwipe.dir === 'left';
    const nextCardStyle = useAnimatedStyle(() => {
        const distance = Math.abs(activeTranslationX.value);

        // Thu nhỏ thẻ đằng sau (scale 0.95) để nó lọt thỏm và ẩn hoàn toàn sau thẻ trước
        const scale = interpolate(distance, [0, width], [0.95, 1], Extrapolation.CLAMP);
        const opacity = interpolate(distance, [0, width / 2], [0.8, 1], Extrapolation.CLAMP);

        return { transform: [{ scale }], opacity };
    });
    const [selectedPet, setSelectedPet] = useState<any>(null);
    const handleMainSwipe = (dir: 'left' | 'right' | 'up' | 'reload' | 'heart') => {
        if (!activeCard) return;

        // --- LOGIC THẢ TIM (TOGGLE FAVORITE) VÀ GỌI API NGẦM ---
        if (dir === 'heart') {
            const isCurrentlyFavorited = favorites.includes(activeCard.id);

            // Cập nhật Optimistic UI
            setFavorites(prev => {
                if (isCurrentlyFavorited) {
                    setLikeCount(c => Math.max(0, c - 1)); // Bỏ tim thì giảm số lượng
                    return prev.filter(id => id !== activeCard.id);
                }
                setLikeCount(c => c + 1); // Thêm tim thì tăng số lượng
                return [...prev, activeCard.id];
            });

            // Gọi API ngầm ở background và Đồng bộ React Query
            if (isCurrentlyFavorited) {
                petService.unfavoritePet(activeCard.id)
                    .then(() => {
                        // Báo cho tab Favorite fetch lại data
                        queryClient.invalidateQueries({ queryKey: ['favorite-pets'] });
                    })
                    .catch(err => console.error("Lỗi bỏ tim:", err));

                Toast.show({
                    type: 'custom_badge',
                    props: { petName: activeCard.name || 'This pet', actionText: ' has been removed from Saved Pet' },
                    visibilityTime: 2500, autoHide: true,
                });
            } else {
                // <-- ĐOẠN API BỊ THIẾU TRƯỚC ĐÂY ĐƯỢC THÊM VÀO 
                petService.favoritePet(activeCard.id) // Lưu ý: Đảm bảo tên hàm trong petService là favoritePet (hoặc tên tương đương của bạn)
                    .then(() => {
                        // Báo cho tab Favorite fetch lại data
                        queryClient.invalidateQueries({ queryKey: ['favorite-pets'] });
                    })
                    .catch(err => console.error("Lỗi thả tim:", err));

                Toast.show({
                    type: 'custom_badge',
                    props: { petName: activeCard.name || 'This pet', actionText: ' has been added to Saved Pet' },
                    visibilityTime: 2500, autoHide: true,
                });
            }
            return;
        }

        // --- LOGIC HOÀN TÁC (REWIND) ---
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

        // --- LOGIC VUỐT LÊN (XEM CHI TIẾT) ---
        if (dir === 'up') {
            setSelectedPet(activeCard); // Gọi state mở Overlay
            // CHÚ Ý: Đừng delay ẩn thẻ đi vội, cứ để thẻ ở đó cho overlay trượt lên đè lên.
            activeTranslationX.value = withSpring(0);
            activeTranslationY.value = withSpring(0);
            return;
        }

        // --- LOGIC QUẸT TRÁI/PHẢI (API SWIPE) ---
        if (dir === 'left') {
            petService.swipePet(activeCard.id, { action: 'PASS' }).catch(err => console.error("Lỗi Pass:", err));
        }

        if (dir === 'right') {
            petService.swipePet(activeCard.id, { action: 'LIKE' }).catch(err => console.error("Lỗi Like:", err));
            setLikeCount(c => c + 1); // Tăng tim khi quẹt phải
            setTimeout(() => { onAdopt(activeCard); }, 200);
        }

        if (dir === 'left' || dir === 'right') {
            setLastSwipe({ index: currentIndex, dir });
        }

        setCurrentIndex(prev => prev + 1);
    };

    const loadFavoritesCount = async () => {
        try {
            const response = await petService.getFavorites();

            const favoriteData = response?.data?.data || response?.data || response || [];

            setLikeCount(favoriteData.length);

            const favoriteIds = favoriteData.map((pet: any) => pet.id || pet._id);
            setFavorites(favoriteIds);

        } catch (error) {
            console.error("Lỗi khi lấy tổng số lượng thú cưng yêu thích:", error);
        }
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
                    <Text className="text-3xl font-normal text-gray-900 tracking-tight">Pawdoption</Text>
                    <TouchableOpacity onPress={onBack} className="px-2 pt-1">
                        <Image className='top-[10px]' source={require('../../assets/icon/Sliders.png')} style={{ width: 14, height: 14 }} resizeMode="cover" />
                    </TouchableOpacity>
                </View>

                {likeCount > 0 && (
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => router.push('/favorite-pets')} // <-- Thêm dòng này để navigate
                        className="flex-row items-center bg-[#E89B5A] px-3 py-1.5 rounded-full shadow-sm shadow-orange-200"
                    >
                        <AntDesign name="heart" size={15} color="white" />
                        <Text className="text-white font-bold ml-1.5 text-base">{likeCount}</Text>
                    </TouchableOpacity>
                )}

            </View>

            <View className="flex-1 px-6 pb-5 pt-0">
                {loading ? (
                    <View className="flex-1 items-center justify-center">
                        <Text className="text-gray-400 font-medium">Loading pets...</Text>
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
                                        {favorites.includes(nextCard.id) && (
                                            <View style={{ position: 'absolute', top: 24, right: 24, zIndex: 60 }}>
                                                <AntDesign name="heart" size={40} color="#ffa053" style={{ textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }} />
                                            </View>
                                        )}
                                        <CardOverlay data={nextCard} canReload={false} />
                                    </View>
                                </Animated.View>
                            </View>
                        )}

                        {/* THẺ ĐẰNG TRƯỚC (Active Card) */}
                        {!loading && activeCard ? (
                            <View className="absolute top-0 left-0 right-0 bottom-0 z-20">
                                <SwipeableCard
                                    key={`${activeCard.id}-${currentIndex}`}
                                    data={activeCard}
                                    onSwipe={handleMainSwipe}
                                    sharedTranslateX={activeTranslationX}
                                    sharedTranslateY={activeTranslationY}
                                    isFavorited={favorites.includes(activeCard.id)}
                                    canReload={canReload}
                                    onSingleTap={() => handleOpenViewer(activeCard.images || [activeCard.image])} // <--- THÊM DÒNG NÀY
                                />
                            </View>
                        ) : !loading && !activeCard ? (
                            <View className="flex items-center justify-center px-6 pb-20 mt-20">

                                <Image
                                    source={require('../../assets/images/cat-on-box.png')}
                                    contentFit="contain"
                                    className=""
                                    style={{
                                        width: 261,
                                        height: 281,
                                    }}
                                />


                                <Text className="text-gray-800 text-lg font-bold mt-8">That's all for now</Text>
                                {/* <Text className="text-gray-400 text-center mt-2 mb-6">Adjust your filters to find discover more pets.</Text> */}

                                {/* <TouchableOpacity
                                    className="w-full bg-white py-5 rounded-[24px] border border-dashed border-orange-300 flex-row justify-center items-center active:bg-orange-50 mt-2"
                                    activeOpacity={0.7}
                                    onPress={() => router.push('/')}
                                >
                                    <Text className="text-[#F59E0B] font-thin text-base">Change filter</Text>
                                </TouchableOpacity> */}
                            </View>
                        ) : null}
                        <PetDetailOverlay
                            pet={selectedPet}
                            isVisible={!!selectedPet}
                            onClose={() => setSelectedPet(null)}
                            onAdopt={onAdopt}
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

const PetDetailOverlay = ({ pet, isVisible, onClose, onAdopt }: { pet: any, isVisible: boolean, onClose: () => void, onAdopt: (pet: any) => void }) => {
    const translateY = useSharedValue(height);

    // --- STATE LẤY CHI TIẾT TỪ API ---
    const [fullPet, setFullPet] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isVisible && pet?.id) {
            setIsLoading(true);
            petService.getPetById(pet.id)
                .then(res => setFullPet(res.data || res))
                .catch(err => console.error("Lỗi lấy chi tiết popup:", err))
                .finally(() => setIsLoading(false));
            translateY.value = withSpring(0, { damping: 35, stiffness: 250, mass: 0.8 });
        } else {
            translateY.value = withTiming(height, { duration: 300 });
            setTimeout(() => setFullPet(null), 300);
        }
    }, [isVisible, pet?.id]);

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

    const isReady = pet !== null || fullPet !== null;
    const currentPet = pet || fullPet;

    if (!isReady) return null;

    const rawPersonalityTags = fullPet?.personalityTags || [];
    const apiTags = Array.isArray(rawPersonalityTags) ? rawPersonalityTags : [];
    const displayTraits = currentPet?.traitsList || [];

    const displayTags = apiTags.length > 0 ? apiTags : (currentPet.tags || ['Playful', 'Energetic', 'Friendly']);
    const displayBreed = fullPet?.breed || currentPet.breed || 'Labrador Retriever';
    const shelter = fullPet?.shelter || currentPet.shelter || null;


    const shelterId = shelter?.id;
    const shelterName = shelter?.name || 'Happy Paws Rescue Center';
    const shelterAddress = shelter?.address || '123 Rescue Street, San Francisco, CA 94102';
    const shelterAvatar = shelter?.avatarUrl || shelter?.coverUrl || currentPet.image || 'https://via.placeholder.com/150';

    const description = fullPet?.description || `${currentPet.name} is a wonderful ${displayBreed} looking for a loving home...`;
    const idealHome = fullPet?.idealHome || `${currentPet.name} would thrive in a home with a fenced yard...`;

    // ================== CHUẨN HOÁ DỮ LIỆU HIỂN THỊ ==================

    const rawGender = currentPet?.gender || 'UNKNOWN';
    const displayGender = rawGender.charAt(0).toUpperCase() + rawGender.slice(1).toLowerCase();

    const displayAge = pet?.age || fullPet?.age || 'Unknown';

    const displayWeight = fullPet?.weight
        ? `${fullPet.weight} kg`
        : (currentPet?.weight ? `${currentPet.weight} kg` : 'Unknown');
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
                            <View className="pr-10">
                                <View className="flex-row items-baseline gap-1">
                                    <Text className="text-[24px] font-semibold text-black tracking-wider">{currentPet.name}</Text>
                                    {isLoading && <ActivityIndicator size="small" color="#F97316" />}
                                    <Text className="text-[14px] text-[#8E8E93] ml-2 font-regular mb-[2px]">({displayBreed})</Text>
                                </View>
                            </View>

                            <View className="flex-row items-center mt-1.5">
                                <Feather name="map-pin" size={14} color="#F2A465" />
                                <Text className="text-[12px] text-[#8E8E93] ml-1.5 font-regular">{currentPet.distance ? `${currentPet.distance} km away` : 'Location not specified'}</Text>
                            </View>

                        </View>

                        <View className="flex-row justify-between mb-6 gap-[10px]">
                            <View className={`flex-1 ${rawGender.toUpperCase() === 'MALE' ? 'bg-[#E2EFF8]' : 'bg-[#FAE8ED]'} py-[12px] rounded-[16px] items-center`}>
                                <Text className="text-[#8E8E93] text-[12px] font-regular mb-1">Gender</Text>
                                <Text className="text-black text-[14px] font-semibold">{displayGender}</Text>
                            </View>

                            <View className="flex-1 bg-[#FCF8D6] py-[12px] rounded-[16px] items-center">
                                <Text className="text-[#8E8E93] text-[12px] font-regular mb-1">Age</Text>
                                <Text className="text-black text-[14px] font-semibold">{displayAge}</Text>
                            </View>

                            <View className="flex-1 bg-[#E8F9E6] py-[12px] rounded-[16px] items-center">
                                <Text className="text-[#8E8E93] text-[12px] font-regular mb-1">Weight</Text>
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
                                {/* <TouchableOpacity activeOpacity={0.7} className="w-[41px] h-[41px] rounded-full bg-[#FFF4EC] items-center justify-center"
                                    onPress={async () => {
                                        const phoneNumber = pet?.shelter?.phone;
                                        if (phoneNumber) {
                                            const webUrl = `https://zalo.me/${phoneNumber}`;
                                            const appUrl = Platform.OS === 'ios'
                                                ? `zalo://`
                                                : `intent://zalo.me/${phoneNumber}#Intent;package=com.zing.zalo;scheme=https;end`;
                                            try {
                                                const canOpenApp = await Linking.canOpenURL(Platform.OS === 'ios' ? 'zalo://' : appUrl);
                                                if (canOpenApp) {
                                                    await Linking.openURL(Platform.OS === 'ios' ? webUrl : appUrl);
                                                } else {
                                                    await Linking.openURL(webUrl);
                                                }
                                            } catch (error) {
                                                await Linking.openURL(webUrl);
                                            }
                                        } else {
                                            Alert.alert("Notification", "This shelter has not provided a Zalo phone number.");
                                        }
                                    }}>
                                    <Image
                                        source={require('../../assets/icon/message.png')}
                                        style={{ width: 24, height: 24 }}
                                        resizeMode="cover"
                                    />
                                </TouchableOpacity> */}
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


                        {/* Section: About */}
                        <View className="mb-4">
                            <Text className="font-medium text-black text-[16px] mb-2">About {currentPet.name}</Text>
                            <Text className="text-[#8E8E93] text-[14px] leading-6 mb-2">{description}</Text>
                            {(displayTraits.length > 0) && (
                                <View className="flex-row gap-2 mt-[6px]">
                                    {displayTraits.map((trait: any, index: number) => {

                                        const traitName = typeof trait === 'string' ? trait : trait?.name;

                                        if (!traitName) return null;

                                        const colorStyles = [
                                            { bg: 'bg-[#FFF4E8]', text: 'text-[#F3B27B]', border: 'border-[#E8A53C]/25' }, // Cam
                                            { bg: 'bg-[#EBF4FE]', text: 'text-[#88B2F3]', border: 'border-[#5A90DA]/25' }, // Xanh dương
                                            { bg: 'bg-[#EAF8EF]', text: 'text-[#8FD49D]', border: 'border-[#83DA5A]/25' }, // Xanh lá
                                        ];
                                        const style = colorStyles[index % colorStyles.length];

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
                            <Text className="font-medium text-black text-[16px] mb-2">{currentPet.name}'s Behavior</Text>

                            {((fullPet?.goodWith || currentPet?.goodWith)?.length > 0 || (fullPet?.badWith || currentPet?.badWith)?.length > 0) ? (
                                <View>
                                    {/* --- Good With --- */}
                                    {(fullPet?.goodWith || currentPet?.goodWith)?.length > 0 && (
                                        <View className="flex-row items-start">
                                            <View className="flex-row items-center mr-1 mt-[2px]">
                                                <Image source={require('../../assets/icon/Check.png')} style={{ width: 12, height: 12 }} resizeMode="cover" />
                                                <Text className="ml-1.5 text-[14px] text-[#77C852] font-medium w-[90px]">Good with:</Text>
                                            </View>
                                            <Text className="flex-1 text-[14px] text-[#8E8E93] leading-[22px]">
                                                {Array.isArray(fullPet?.goodWith || currentPet?.goodWith)
                                                    ? (fullPet?.goodWith || currentPet?.goodWith).join(', ')
                                                    : (fullPet?.goodWith || currentPet?.goodWith)}
                                            </Text>
                                        </View>
                                    )}

                                    {/* --- Bad With / Not Suitable --- */}
                                    {(fullPet?.badWith || currentPet?.badWith)?.length > 0 && (
                                        <View className="flex-row items-start">
                                            <View className="flex-row items-center mr-1 mt-[2px]">
                                                <Image source={require('../../assets/icon/X.png')} style={{ width: 12, height: 12 }} resizeMode="cover" />
                                                <Text className="ml-1.5 text-[14px] text-[#FE7D66] font-medium w-[90px]">Not suitable:</Text>
                                            </View>
                                            <Text className="flex-1 text-[14px] text-[#8E8E93] leading-[22px]">
                                                {Array.isArray(fullPet?.badWith || currentPet?.badWith)
                                                    ? (fullPet?.badWith || currentPet?.badWith).join(', ')
                                                    : (fullPet?.badWith || currentPet?.badWith)}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            ) : (
                                <Text className="text-[14px] text-[#8E8E93] italic leading-[22px]">
                                    Behavioral details have not been updated.
                                </Text>
                            )}
                        </View>

                        <View className="mb-6">
                            <Text className="font-medium text-black text-lg mb-1">Ideal Home</Text>
                            <Text className="text-[14px] text-[#8E8E93] leading-6">{idealHome}</Text>
                        </View>

                        <View style={{ height: 20 }} />
                    </ScrollView>

                    <View className="w-full px-6 pt-4 pb-6 bg-white items-center ">
                        <TouchableOpacity
                            className="px-10 bg-[#E89B5A] py-4 rounded-full items-center mb-4 shadow-sm"
                            activeOpacity={0.8}
                            onPress={() => { onClose(); onAdopt(currentPet); }}
                        >
                            <Text className="text-white font-semibold text-lg mx-6">Apply To Adopt</Text>
                        </TouchableOpacity>
                        <TouchableOpacity activeOpacity={0.6} onPress={onClose} className="py-2 px-6">
                            <Text className="text-gray-500 text-[15px]" style={{ textDecorationLine: 'underline' }}>Cancel</Text>
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

    const COMPLETED_USERS_KEY = 'completed_onboarding_users_list';

    const [appStage, setAppStage] = useState<number>(3);
    const [isCheckingStatus, setIsCheckingStatus] = useState(true);
    const [selectedPet, setSelectedPet] = useState<any>(null);
    const [isEditing, setIsEditing] = useState<boolean>(false);

    // THÊM STATE LƯU TRỮ BỘ LỌC TỪ SURVEY
    const [surveyFilters, setSurveyFilters] = useState<{ type: string | null, age: string | null }>({ type: null, age: null });
    // 2. Dùng ĐÚNG MỘT useEffect này để điều hướng luồng
    useEffect(() => {
        const checkUserStatus = async () => {
            // Nếu vừa hoàn thành form adopt xong thì nhảy thẳng vào Swipe
            if (returnFromSuccess === '1') {
                setAppStage(3);
                setIsCheckingStatus(false);
                return;
            }

            // Nếu chưa có user (chưa đăng nhập), bắt đầu từ màn 0
            if (!user?.id) {
                setAppStage(0);
                setIsCheckingStatus(false);
                return;
            }

            try {
                const storedUsersJSON = await AsyncStorage.getItem(COMPLETED_USERS_KEY);
                const completedUsers: string[] = storedUsersJSON ? JSON.parse(storedUsersJSON) : [];

                if (completedUsers.includes(user.id)) {
                    // USER CŨ: Đã có ID trong mảng -> Nhảy thẳng vào màn Swipe chính
                    setAppStage(3);
                } else {
                    // USER MỚI: Chưa có ID -> Bắt đầu luồng Onboarding từ Filter
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
                // 1. Lấy lại mảng danh sách user hiện tại
                const storedUsersJSON = await AsyncStorage.getItem(COMPLETED_USERS_KEY);
                const completedUsers: string[] = storedUsersJSON ? JSON.parse(storedUsersJSON) : [];

                // 2. Nếu ID chưa có trong mảng thì thêm vào
                if (!completedUsers.includes(user.id)) {
                    completedUsers.push(user.id);

                    // 3. Lưu mảng mới (đã có thêm ID này) trở lại AsyncStorage
                    await AsyncStorage.setItem(COMPLETED_USERS_KEY, JSON.stringify(completedUsers));
                }
            }
            // 4. Chuyển sang màn hình chính
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
                    initialFilters={surveyFilters} // Truyền vào trạng thái filter cũ
                    onComplete={(data) => {
                        setSurveyFilters(data); // Lưu bộ lọc do user vừa chọn

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
                        // FIX: Đồng ý Policy xong thì luôn sang Tutorial (Stage 2)
                        setAppStage(2);
                    }}
                    onBack={() => {
                        // Nếu user bấm X ở màn Policy, lùi về màn Survey
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
                    filters={surveyFilters} // TRUYỀN BỘ LỌC XUỐNG SWIPE
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