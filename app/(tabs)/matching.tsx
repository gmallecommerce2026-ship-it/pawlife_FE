// app/(tabs)/matching.tsx
import { Text } from '@/components/AppText';
import { AuthContext } from '@/contexts/AuthContext';
import { AntDesign, Feather, FontAwesome5, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Keyboard, Linking, Modal, Platform, Text as RNText, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
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
import { useLocation } from '../../hooks/useLocation';
import { petService } from '../../services/petService';
import Toast from 'react-native-toast-message';

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
    // Thu hẹp viền thành 1.5px để tinh tế hơn
    const actionButtonClasses = "items-center justify-center bg-black/60 backdrop-blur-md rounded-full border-[1.5px]";

    return (
        <View className="absolute bottom-0 left-0 right-0 justify-end z-40 pb-8 pt-32"
        >
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
            <View className="flex-row justify-center items-center w-full z-50 gap-7">

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
                            ? require('../../assets/icon/heart-filled-pawdoption.png') // Trái tim tô kín (khi đã double tap)
                            : require('../../assets/icon/heart-pawdoption.png') // Trái tim rỗng (mặc định)
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
            // Khi XUẤT HIỆN: Nẩy lên tự nhiên
            // Damping thấp (12) giúp trái tim có độ rung nhẹ khi bật ra
            popScale.value = withSpring(1, {
                damping: 12,
                stiffness: 250,
                mass: 1
            });
        } else {
            // Khi BIẾN MẤT: Rút ngược lại nhanh, dứt khoát 
            // Stiffness cao (350) và mass nhỏ (0.8) giúp nó co rúm lại tức thì
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
    const gesture = Gesture.Race(taps, pan);

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
        <GestureDetector gesture={gesture}>
            <Animated.View style={[animatedStyle]} className="absolute top-0 left-0 right-0 bottom-0 z-10">
                <View className="flex-1 relative justify-center items-center"
                    style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        // --- LỚP NGOÀI: CHỈ ĐỔ BÓNG, KHÔNG DÙNG OVERFLOW HIDDEN ---
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.25,
                        shadowRadius: 30,
                        elevation: 10, // Quan trọng để hiện bóng trên Android
                        backgroundColor: 'transparent',
                    }}>

                    {!isTutorialCard && (
                        <View
                            style={{
                                position: 'absolute',
                                top: 40, left: 20, right: 20, bottom: 0,
                                backgroundColor: 'white',
                                borderRadius: 32,
                                shadowColor: '#000000d1',
                                shadowOffset: { width: 0, height: 12 },
                                shadowOpacity: 0.3,
                                shadowRadius: 10,
                                elevation: 15,
                            }}
                        />
                    )}

                    <View className={`flex-1 w-full rounded-[32px] overflow-hidden relative ${isTutorialCard ? 'bg-transparent' : 'bg-gray-100'}`}>
                        <Image
                            source={imageSource}
                            style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: 32 }}
                            contentFit={isTutorialCard ? "contain" : "cover"}
                            cachePolicy={cachePolicy}
                            transition={0}
                        />

                        <Image
                            source={require('../../assets/images/light-top-left.png')}
                            contentFit="contain" // Hoặc "cover" tùy vào viền ảnh
                        />

                        <Animated.View
                            style={[
                                likeOpacity,
                                {
                                    position: 'absolute',
                                    top: isTutorialCard ? height * 0.12 : 64, // Đẩy xuống 25% chiều cao màn hình nếu là tutorial
                                    left: 32, // Neo cố định bên trái
                                    zIndex: 50,
                                    transform: [{ rotate: '-12deg' }] // Xoay nghiêng
                                }
                            ]}
                            className="border-[6px] border-green-400 rounded-xl px-4 py-2 pointer-events-none"
                        >
                            <Text className="text-green-400 font-extrabold text-5xl uppercase tracking-widest">LIKE</Text>
                        </Animated.View>

                        {/* CHỮ NOPE */}
                        <Animated.View
                            style={[
                                nopeOpacity,
                                {
                                    position: 'absolute',
                                    top: isTutorialCard ? height * 0.12 : 64, // Đẩy xuống 25% chiều cao màn hình nếu là tutorial
                                    right: 32, // Neo cố định bên phải
                                    zIndex: 50,
                                    transform: [{ rotate: '12deg' }] // Xoay nghiêng
                                }
                            ]}
                            className="border-[6px] border-red-500 rounded-xl px-4 py-2 pointer-events-none"
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

const SurveyScreen = ({ onComplete, onBack }: { onComplete: () => void, onBack: () => void }) => {
    const insets = useSafeAreaInsets();
    const { requestLocation, saveManualCity } = useLocation();

    const [isUsingGps, setIsUsingGps] = useState(false);
    const [surveyStep, setSurveyStep] = useState(1);
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [selectedAge, setSelectedAge] = useState<string | null>(null);
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
            onComplete();
        }
    };
    const handleUseGps = async () => {
        setIsRequestingGps(true);
        const loc = await requestLocation();
        setIsRequestingGps(false);
        if (loc) {
            setIsUsingGps(true);
            setLocationText('Vị trí hiện tại của bạn');
        }
    };
    // LOGIC NÚT BACK: Lùi bước, hoặc thoát hẳn nếu ở bước 1
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
                                                {/* <FontAwesome5 name={item.icon as any} size={32} color={selectedType === item.id ? '#E89B5A' : '#9CA3AF'} /> */}
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
    // STATE: Quản lý trạng thái Checkbox
    const [isAgreed, setIsAgreed] = useState(false);

    const PolicyItem = ({ number, title, content }: any) => (
        <View className="flex-row items-start mb-[21px]">
            <Text className="font-medium text-[16px] text-black w-4">{number}.</Text>
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
                <Text className="flex-1 text-center font-semibold text-[24px] text-gray-900 tracking-wide">
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
                    className="flex-1 px-[35px] pt-[30px]"
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

            {/* VÙNG BOTTOM ACTION (CỐ ĐỊNH Ở ĐÁY: CHECKBOX + SUBMIT) */}
            <View
                style={{
                    paddingBottom: Math.max(insets.bottom, 16),
                    paddingHorizontal: 24,
                    paddingTop: 16,
                    backgroundColor: 'white',
                }}
                className='items-center justify-center'
            >

                {/* Custom Checkbox */}
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
                                    // Thêm hành động mở link hoặc màn hình Policy của bạn ở đây
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

                {/* Nút Submit */}
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
        image: require('../../assets/images/t-left.jpg'),
        forcedDir: 'left',
        instruction: "Not this one",
        subInstruction: "",
        iconName: "arrow-left"
    },
    {
        id: 'step2',
        image: require('../../assets/images/t-right.jpg'),
        forcedDir: 'right',
        instruction: "Hmm... this one!",
        subInstruction: "",
        iconName: "arrow-right"
    },
    {
        id: 'step3',
        image: require('../../assets/images/t-top.jpg'),
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
// Component tạo hiệu ứng vầng sáng mặt trời
const SunGlow = ({ style }: { style: any }) => (
    <View style={[
        {
            position: 'absolute',
            pointerEvents: 'none',
            width: 160,
            height: 160,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 0,
        },
        style
    ]}>
        {/* Vầng sáng vàng nhạt tỏa rộng ra ngoài */}
        <View style={{
            position: 'absolute',
            width: 160, height: 160, borderRadius: 80,
            backgroundColor: 'rgba(255, 245, 180, 0.25)',
            shadowColor: '#FFD700', shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8, shadowRadius: 50, elevation: 10
        }} />
        {/* Lõi trắng sáng rực ở giữa */}
        <View style={{
            position: 'absolute',
            width: 90, height: 90, borderRadius: 45,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            shadowColor: '#FFFFFF', shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1, shadowRadius: 30, elevation: 20
        }} />
    </View>
);
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
                {/* YÊU CẦU 1 & 2: 
                 - Đổi px-[38px] thành px-6 để thẻ rộng ra. 
                 - Đổi pt-[108px] thành pt-[64px] để thẻ cao lên.
                 - Đổi pb-12 thành pb-0 để thẻ tràn xuống sát khu vực Skip Button. 
             */}
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

                                    {/* YÊU CẦU 3: Đẩy text lên trên 
                                    - Đổi `justify-center` thành `justify-start` 
                                    - Thêm paddingTop ~20%-25% để responsive đẹp trên mọi chiều cao màn hình 
                                */}
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
                                                    fontSize: 26, // Tăng nhẹ size để dễ đọc hơn
                                                    fontWeight: '500', // Đậm nhất có thể
                                                    textAlign: 'center',
                                                    letterSpacing: 26 * 0.05, // Chuẩn 5% của 26px = 1.3px
                                                    fontFamily: "Urbanist",

                                                    // --- CHUẨN TEXT SHADOW CHO CẢ IOS & ANDROID ---
                                                    textShadowColor: 'rgba(0, 0, 0, 0.2)', // Nền đen độ mờ 80% (đẹp hơn đen đặc 1)
                                                    textShadowOffset: { width: 0, height: 2 },
                                                    textShadowRadius: 2, // Android chỉ nhận đẹp nhất ở mức < 6
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

                {/* YÊU CẦU 2 (Phần chia khoảng cách): 
                 - Xóa mt-1, mb-2.
                 - Dùng py-8 (padding cả trên và dưới) để đảm bảo nút Skip nằm chính giữa khoảng trống 
                   từ đáy thẻ tutorial đến đáy màn hình (footer).
             */}
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
    // 1. Dùng hook lấy chính xác chiều cao của Notch/Dynamic Island
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
        // Thêm statusBarTranslucent={true} để Modal phủ kín màn hình chuẩn xác hơn
        <Modal visible={isVisible} transparent animationType="fade" statusBarTranslucent={true}>
            <View className="flex-1 bg-black">
                <Image
                    source={{ uri: images[currentIndex] }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="contain"
                />

                {/* 2. Ép khoảng cách cứng dựa trên insets.top */}
                <View
                    className="absolute top-0 left-0 right-0 z-50"
                    style={{ paddingTop: Math.max(insets.top, 50) }} // Luôn cách đỉnh ít nhất 50px
                >
                    <View className="px-5">
                        <View className="flex-row justify-end mb-4">
                            <TouchableOpacity
                                onPress={onClose}
                                className="p-2 bg-black/40 rounded-full"
                                // 3. Mở rộng vùng nhận diện cảm ứng để dễ bấm hơn
                                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                            >
                                <Feather name="x" size={26} color="white" />
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row gap-1.5">
                            {images.map((_, idx) => (
                                <View
                                    key={idx}
                                    className={`flex-1 h-[3px] rounded-full ${idx === currentIndex ? 'bg-white' : 'bg-white/30'
                                        }`}
                                />
                            ))}
                        </View>
                    </View>
                </View>

                {/* Vùng chạm (Tăng zIndex để chắc chắn không bị che) */}
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
const MainSwipeScreen = ({ onBack, onDetail, onAdopt }: { onBack: () => void, onDetail: (item: any) => void, onAdopt: (item: any) => void }) => {
    const router = useRouter();
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
            const response = await petService.getFeed(10, location?.lat, location?.lng);
            const petsData = response?.data?.data || response?.data || response || [];

            const mappedPets = petsData.map((pet: any) => {
                // SỬA Ở ĐÂY: Đồng bộ logic khoảng cách giống trang Home
                // Nếu có distance (có GPS), thêm chữ km. Nếu không có thì lấy city/location
                const displayDistance = pet.distance
                    ? `${pet.distance}`
                    : (pet.city || pet.location || 'Gần bạn');

                const petImages = pet.images && pet.images.length > 0
                    ? pet.images.map((img: any) => img.url)
                    : ['https://via.placeholder.com/400x600?text=No+Image'];

                return {
                    id: pet.id,
                    name: pet.name,
                    age: pet.age || 'Unknown',
                    gender: pet.gender || 'MALE',
                    distance: displayDistance,
                    location: pet.shelter?.name || pet.location || 'Location',
                    image: petImages[0], // Giữ lại image cho tương thích code cũ
                    images: petImages    // THÊM TRƯỜNG NÀY ĐỂ CHỨA NHIỀU ẢNH
                };
            });

            setPets(mappedPets);
            setOriginalPets(mappedPets); // <--- LƯU LẠI MẢNG GỐC ĐỂ DÙNG CHO LOOP
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
            // SỬA Ở ĐÂY: Dùng isLocationLoaded thay vì location !== null
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

            // Gọi API ngầm ở background
            if (isCurrentlyFavorited) {
                petService.unfavoritePet(activeCard.id).catch(err => console.error("Lỗi bỏ tim:", err));
                Toast.show({
                type: 'custom_badge',
                props: {
                    petName: activeCard.name || 'This pet',
                    actionText: ' has been removed from Saved Pet'
                },
                visibilityTime: 2500,
                autoHide: true,
            });
            } else {
                Toast.show({
                type: 'custom_badge',
                props: {
                    petName: activeCard.name || 'This pet',
                    actionText: ' has been added to Saved Pet'
                },
                visibilityTime: 2500,
                autoHide: true,
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
            // Đã sửa thành getFavorites() theo đúng định nghĩa trong petService của bạn
            const response = await petService.getFavorites();

            // Xử lý logic tùy thuộc vào cấu trúc trả về của API
            const favoriteData = response?.data?.data || response?.data || response || [];

            // Cập nhật tổng số lượng
            setLikeCount(favoriteData.length);

        } catch (error) {
            console.error("Lỗi khi lấy tổng số lượng thú cưng yêu thích:", error);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-[#fff8f0]" edges={['top']}>
            {/* NÂNG CẤP: Thêm Linear Gradient làm nền nền giống Home Tab */}
            <LinearGradient
                colors={['#FFFFFF', '#FFFBF5', '#FFF9F0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />

            <View className="flex-row items-center justify-between px-6 pt-0 pb-4 z-10 bg-transparent">

                <View className="flex-row items-center">
                    <Text className="text-3xl font-normal text-gray-900 tracking-tight">Pawdoption</Text>
                    <TouchableOpacity onPress={onBack} className="p-2">
                        <Image className='top-[7px]' source={require('../../assets/icon/Sliders.png')} style={{ width: 14, height: 14 }} resizeMode="cover" />
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
                    /* THÊM CONTAINER CHUNG relative CHO CẢ 2 THẺ */
                    <View className="flex-1 relative w-full h-full">

                        {/* THẺ ĐẰNG SAU (Next Card) */}
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
                                <Text className="text-gray-400 text-center mt-2 mb-6">Adjust your filters to find discover more pets.</Text>

                                <TouchableOpacity
                                    className="w-full bg-white py-5 rounded-[24px] border border-dashed border-orange-300 flex-row justify-center items-center active:bg-orange-50 mt-2"
                                    activeOpacity={0.7}
                                    onPress={() => router.push('/')}
                                >
                                    <Text className="text-[#F59E0B] font-thin text-base">Change filter</Text>
                                </TouchableOpacity>
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
    // Không cần dùng insets nữa vì overlay sẽ nằm vừa khít trong container của thẻ vuốt
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
            // Hiệu ứng trượt nhẹ lên để tạo cảm giác vuốt tiếp từ thẻ
            translateY.value = withSpring(0, { damping: 35, stiffness: 250, mass: 0.8 });
        } else {
            // Khi đóng, trượt tuột xuống dưới
            translateY.value = withTiming(height, { duration: 300 });
            setTimeout(() => setFullPet(null), 300); // Clear data cũ sau khi animation xong
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

    const displayTags = apiTags.length > 0 ? apiTags : (currentPet.tags || ['Playful', 'Energetic', 'Friendly']);
    const displayBreed = fullPet?.breed || currentPet.breed || 'Labrador Retriever';
    const shelter = fullPet?.shelter || currentPet.shelter || null;

    const shelterId = shelter?.id;
    const shelterName = shelter?.name || 'Happy Paws Rescue Center';
    const shelterAddress = shelter?.address || '123 Rescue Street, San Francisco, CA 94102';
    const shelterAvatar = shelter?.avatarUrl || shelter?.coverUrl || currentPet.image || 'https://via.placeholder.com/150';

    const description = fullPet?.description || `${currentPet.name} is a wonderful ${displayBreed} looking for a loving home. He is playful, energetic, and friendly and would make a great companion for the right family.`;
    const idealHome = fullPet?.idealHome || `${currentPet.name} would thrive in a home with a fenced yard and an active family. They do best with older children and would enjoy being the only pet to receive all your attention.`;

    return (
        <Animated.View
            style={[
                { transform: [{ translateY }] },
                {
                    // Nằm đè tuyệt đối lên thẻ cha, không dùng shadow để phẳng hoàn toàn
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 100
                }
            ]}
            className="bg-white rounded-[32px] overflow-hidden border border-gray-100"
            // Vô hiệu hóa tương tác khi ẩn để không chặn thao tác quẹt thẻ bên dưới
            pointerEvents={isVisible ? 'auto' : 'none'}
        >
            <GestureDetector gesture={pan}>
                <View className="flex-1">
                    {/* Thanh line nhỏ báo hiệu có thể kéo (Drag handle) */}
                    <View className="items-center pt-3 pb-1 bg-white z-20">
                        <View className="w-10 h-1 bg-gray-200 rounded-full" />
                    </View>

                    {/* Nút X Góc phải */}
                    {/* <View className="absolute top-6 right-4 z-20">
                        <TouchableOpacity onPress={onClose} className="p-2">
                            <Feather name="x" size={22} color="#374151" />
                        </TouchableOpacity>
                    </View> */}

                    <ScrollView className="flex-1 px-6 pt-2 bg-white" showsVerticalScrollIndicator={false} bounces={true}>
                        {/* Tiêu đề & Sub-info */}
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
                            <View className={`flex-1 ${pet?.gender.toLowerCase() === 'male' ? 'bg-[#E2EFF8]' : 'bg-[#FAE8ED]'} py-[12px] rounded-[16px] items-center`}>
                                <Text className="text-[#8E8E93] text-[12px] font-regular mb-1">Gender</Text>
                                <Text className="text-black text-[14px] font-semibold">{pet?.gender || 'Unknow'}</Text>
                            </View>
                            <View className="flex-1 bg-[#FCF8D6] py-[12px] rounded-[16px] items-center">
                                <Text className="text-[#8E8E93] text-[12px] font-regular mb-1">Age</Text>
                                <Text className="text-black text-[14px] font-semibold">Young</Text>
                            </View>
                            <View className="flex-1 bg-[#E8F9E6] py-[12px] rounded-[16px] items-center">
                                <Text className="text-[#8E8E93] text-[12px] font-regular mb-1">Size</Text>
                                <Text className="text-black text-[14px] font-semibold">Large</Text>
                            </View>
                        </View>


                        {/* Shelter Info (Theo chuẩn design) */}
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
                                <TouchableOpacity activeOpacity={0.7} className="w-[41px] h-[41px] rounded-full bg-[#FFF4EC] items-center justify-center"
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
                                            Alert.alert("Thông báo", "Trạm cứu hộ này chưa cung cấp số điện thoại Zalo.");
                                        }
                                    }}>
                                    <Image
                                        source={require('../../assets/icon/message.png')}
                                        style={{ width: 24, height: 24 }}
                                        resizeMode="cover"
                                    />
                                </TouchableOpacity>
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
                        <View className="mb-6">
                            <Text className="font-medium text-black text-[16px] mb-2">About {currentPet.name}</Text>
                            <Text className="text-[#8E8E93] text-[14px] leading-6 mb-2">{description}</Text>

                            {/* Trình bày Tags theo ảnh (Vàng nhạt cho tag đầu tiên) */}
                            <View className="flex-row gap-2 mt-[6px]">
                                <View className="bg-[#FFF4E8] px-3.5 py-0.5 rounded-full border border-[#E8A53C]/25"><Text className="text-[#E8A53C] text-[12px] font-medium">Playful</Text></View>
                                <View className="bg-[#EBF4FE] px-3.5 py-0.5 rounded-full border border-[#5A90DA]/25"><Text className="text-[#5A90DA] text-[12px] font-medium">Clingy</Text></View>
                                <View className="bg-[#EAF8EF] px-3.5 py-0.5 rounded-full border border-[#83DA5A]/25"><Text className="text-[#77C852] text-[12px] font-medium">Friendly</Text></View>
                            </View>
                        </View>

                        <View className="mb-4">
                            <Text className="font-medium text-black text-[16px] mb-2">{currentPet.name}'s Behavior</Text>
                            <View className="flex-row items-start mb-1">
                                <View className="flex-row items-center mr-1 mt-[2px]">
                                    <Image source={require('../../assets/icon/Check.png')} style={{ width: 12, height: 12 }} resizeMode="cover" />
                                    <Text className="ml-1.5 text-[14px] text-[#77C852] font-medium">Good with:</Text>
                                </View>
                                <Text className="flex-1 text-[14px] text-[#8E8E93] leading-[22px]">Children, Seniors, Dogs, Cats.</Text>
                            </View>
                            <View className="flex-row items-start">
                                <View className="flex-row items-center mr-1 mt-[2px]">
                                    <Image source={require('../../assets/icon/X.png')} style={{ width: 12, height: 12 }} resizeMode="cover" />
                                    <Text className="ml-1.5 text-[14px] text-[#FE7D66] font-medium">Not suitable:</Text>
                                </View>
                                <Text className="flex-1 text-[14px] text-[#8E8E93] leading-[22px]">Children, Seniors, Dogs, Cats.</Text>
                            </View>
                        </View>

                        {/* Section: Ideal Home */}
                        <View className="mb-6">
                            <Text className="font-medium text-black text-lg mb-1">Ideal Home</Text>
                            <Text className="text-[14px] text-[#8E8E93] leading-6">{idealHome}</Text>
                        </View>

                        {/* Spacer mỏng cuối nội dung cuộn để text không sát đáy */}
                        <View style={{ height: 20 }} />
                    </ScrollView>

                    {/* Sticky Footer: Chứa 2 nút bấm */}
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
// ==================================================================
// MAIN PARENT COMPONENT
// ==================================================================
export default function MatchingScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const { returnFromSuccess } = useLocalSearchParams();
    const { user } = useContext(AuthContext);

    const [appStage, setAppStage] = useState<number>(3);
    const [isLoadingStage, setIsLoadingStage] = useState<boolean>(true);
    const [selectedPet, setSelectedPet] = useState<any>(null);
    const [isCheckingStatus, setIsCheckingStatus] = useState(true);

    const COMPLETED_USERS_KEY = 'completed_onboarding_users_list';

    // ---> THÊM STATE ĐỂ NHẬN BIẾT LÀ ĐANG CHỈNH SỬA
    const [isEditing, setIsEditing] = useState<boolean>(false);

    // ---> THÊM STATE ĐỂ NHẬN BIẾT USER CŨ (Đã từng hoàn thành Onboarding)
    const [isReturningUser, setIsReturningUser] = useState<boolean>(false);

    useEffect(() => {
        const checkUserStatus = async () => {
            // Nếu chưa có user (chưa đăng nhập), bỏ qua
            if (!user?.id) {
                setIsCheckingStatus(false);
                return;
            }

            try {
                const storedUsersJSON = await AsyncStorage.getItem(COMPLETED_USERS_KEY);

                const completedUsers: string[] = storedUsersJSON ? JSON.parse(storedUsersJSON) : [];

                if (completedUsers.includes(user.id)) {
                    setAppStage(3); // Đã có -> Nhảy thẳng vào Main Swipe
                } else {
                    setAppStage(0); // Chưa có -> Bắt đầu Onboarding (hoặc Stage 1 tùy bạn)
                }
            } catch (error) {
                console.error("Lỗi khi đọc danh sách user:", error);
                setAppStage(0); // Lỗi thì cứ cho xem lại từ đầu
            } finally {
                setIsCheckingStatus(false); // Hoàn thành việc check
            }
        };

        checkUserStatus();
    }, [user?.id]);

    useEffect(() => {
        const checkOnboardingStatus = async () => {
            try {
                if (returnFromSuccess === '1') {
                    setAppStage(3);
                    setIsLoadingStage(false);
                    return;
                }

                const userId = user?.id || 'guest';
                const hasCompleted = await AsyncStorage.getItem(`@matching_onboarding_${userId}`);

                if (hasCompleted === 'true') {
                    // SỬA TẠI ĐÂY: Đánh dấu là user cũ và ép vào màn hình Policy (Stage 1)
                    setIsReturningUser(true);
                    setAppStage(1);
                } else {
                    setIsReturningUser(false);
                    setAppStage(0);
                }
            } catch (error) {
                console.error("Lỗi khi kiểm tra AsyncStorage:", error);
                setAppStage(0);
            } finally {
                setIsLoadingStage(false);
            }
        };

        checkOnboardingStatus();
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

    if (isLoadingStage) {
        return <View className="flex-1 bg-white" />;
    }

    if (isCheckingStatus) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#E89B5A" />
            </View>
        );
    }

    return (
        /* ✅ SỬA LỖI 1: Thay GestureHandlerRootView bằng View thường */
        <View style={{ flex: 1 }}>
            {appStage === 0 && (
                <SurveyScreen
                    onComplete={() => {
                        if (isEditing) {
                            setAppStage(2);
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
                            router.replace('/(tabs)');
                        }
                    }}
                />
            )}

            {appStage === 1 && (
                <PolicyScreen
                    onAgree={() => {
                        if (isReturningUser) {
                            setAppStage(3);
                        } else {
                            setAppStage(2);
                        }
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

            {appStage >= 2 && (
                <MainSwipeScreen
                    onBack={() => {
                        setIsEditing(true);
                        setAppStage(0);
                    }}
                    onDetail={handleDetail}
                    onAdopt={handleAdopt}
                />
            )}

            {appStage === 2 && (
                <TutorialScreen
                    onComplete={handleCompleteOnboarding}
                />
            )}
        </View>
    );
}