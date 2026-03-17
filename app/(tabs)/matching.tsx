// app/(tabs)/matching.tsx
import { Text } from '@/components/AppText';
import { AuthContext } from '@/contexts/AuthContext';
import { AntDesign, Entypo, FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, TextInput, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
    Easing,
    Extrapolation,
    FadeInDown,
    FadeOut,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocation } from '../../hooks/useLocation';
import { petService } from '../../services/petService';

const { width, height } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.3;
const TAB_BAR_HEIGHT = 115;

// --- DỮ LIỆU MOCK ---
const EXPERIENCE_LEVELS = [
  { id: 1, label: 'First-time owner', sub: 'Never owned a pet before', icon: 'sunny' },
  { id: 2, label: 'Beginner (< 2 years)', sub: 'Some experience with pets', icon: 'paw' },
  { id: 3, label: 'Intermediate (2-5 years)', sub: 'Comfortable with basic care', icon: 'barbell' },
  { id: 4, label: 'Experienced (5+ years)', sub: 'Confident with all aspects', icon: 'star' },
];

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
const CardOverlay = ({ data, onAction }: { data: any, onAction?: (action: string) => void }) => {
    const actionButtonClasses = "items-center justify-center bg-black/60 backdrop-blur-md rounded-full border-2";
    return (
        <View className="absolute bottom-0 left-0 right-0 h-full justify-end z-40">
            <LinearGradient
                colors={['transparent', 'transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.95)']}
                locations={[0, 0.4, 0.7, 1]}
                style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%' }}
                pointerEvents="none"
            />
            <View className="px-6 mb-28 pointer-events-none">
                <View className="flex-row items-center mb-1">
                    <Text className="text-white text-5xl font-bold shadow-sm mr-3">{data.name}</Text>
                    <View className="flex-row items-center border border-white/40 bg-black/20 px-3 py-1.5 rounded-full">
                        <Ionicons name={data.gender === 'FEMALE' ? "female" : "male"} size={14} color="white" />
                        <Text className="text-white ml-1 font-bold text-sm">{data.age}</Text>
                    </View>
                </View>
                <View className="flex-row items-center opacity-90">
                    <Ionicons name="location-sharp" size={16} color="white" />
                    <Text className="text-white ml-1 font-medium text-base">{data.location} · {data.distance}</Text>
                </View>
            </View>
            <View className="flex-row justify-between items-center px-8 pb-8 absolute bottom-0 w-full z-50">
                <TouchableOpacity className={`${actionButtonClasses} w-12 h-12 border-green-500`} onPress={() => onAction && onAction('reload')}>
                    <MaterialCommunityIcons name="reload" size={20} color="#22c55e" />
                </TouchableOpacity>
                <TouchableOpacity className={`${actionButtonClasses} w-16 h-16 border-red-500`} onPress={() => onAction && onAction('left')}>
                    <Entypo name="cross" size={32} color="#ef4444" />
                </TouchableOpacity>
                <TouchableOpacity className={`${actionButtonClasses} w-16 h-16 border-orange-500`} onPress={() => onAction && onAction('heart')}>
                    <AntDesign name="heart" size={28} color="#ffa053" />
                </TouchableOpacity>
                <TouchableOpacity className={`${actionButtonClasses} w-12 h-12 border-blue-500`} onPress={() => onAction && onAction('right')}>
                    <Ionicons name="checkmark" size={22} color="#3b82f6" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const SwipeableCard = ({ data, onSwipe, sharedTranslateX, sharedTranslateY, disableSwipe = false, forcedDirection = null, isFavorited = false }: any) => {
  const scale = useSharedValue(1);
  
  // --- STATE HIỆU ỨNG TIM GÓC PHẢI ---
  const popScale = useSharedValue(isFavorited ? 1 : 0);

  // Lắng nghe thay đổi của isFavorited để chạy hiệu ứng nảy (pop)
  useEffect(() => {
      popScale.value = withSpring(isFavorited ? 1 : 0, { damping: 10, stiffness: 100 });
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
        // Chuyển thẳng action lên cha xử lý
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

  // NHÁY ĐÚP GỌI HÀNH ĐỘNG TIM
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .enabled(!disableSwipe)
    .maxDuration(250)
    .onEnd(() => {
        runOnJS(handleAction)('heart');
    });

  const gesture = Gesture.Race(doubleTap, pan);

  const animatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(sharedTranslateX.value, [-width / 2, 0, width / 2], [-10, 0, 10], Extrapolation.CLAMP);
    return { transform: [{ translateX: sharedTranslateX.value }, { translateY: sharedTranslateY.value }, { rotate: `${rotate}deg` }, { scale: scale.value }] };
  });

  const likeOpacity = useAnimatedStyle(() => ({ opacity: interpolate(sharedTranslateX.value, [0, width / 4], [0, 1]) }));
  const nopeOpacity = useAnimatedStyle(() => ({ opacity: interpolate(sharedTranslateX.value, [-width / 4, 0], [1, 0]) }));
  
  // Style cho tim góc phải
  const heartAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: popScale.value }]
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[animatedStyle]} className="absolute top-0 left-0 right-0 bottom-0 z-10">
        {/* SỬA 1: Đổi bg-black thành bg-gray-200 hoặc bg-gray-800 để nếu có delay load ảnh thì nó trông giống placeholder chứ không phải chớp lỗi */}
        <View className="flex-1 bg-gray-800 rounded-[32px] overflow-hidden relative shadow-2xl shadow-black">
           
           {/* SỬA 2: Bỏ transition={100} đi để ảnh đã cache hiện ra lập tức, không bị chớp đen */}
           <Image 
               source={{ uri: data.image }}
               style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: 32 }}
               contentFit="cover"
               cachePolicy="memory-disk" 
               // Bỏ dòng transition={100} đi hoặc set transition={0}
               transition={0} 
           />

           <Animated.View style={likeOpacity} className="absolute top-16 left-10 border-[6px] border-green-400 rounded-xl px-4 py-2 transform -rotate-12 z-50 pointer-events-none">
                <Text className="text-green-400 font-extrabold text-5xl uppercase tracking-widest">LIKE</Text>
           </Animated.View>
           
           <Animated.View style={nopeOpacity} className="absolute top-16 right-10 border-[6px] border-red-500 rounded-xl px-4 py-2 transform rotate-12 z-50 pointer-events-none">
                <Text className="text-red-500 font-extrabold text-5xl uppercase tracking-widest">NOPE</Text>
           </Animated.View>
           
           <Animated.View style={[heartAnimatedStyle, { position: 'absolute', top: 24, right: 24, zIndex: 60, pointerEvents: 'none' }]}>
               <AntDesign name="heart" size={40} color="#ffa053" style={{ textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }} />
           </Animated.View>

           <CardOverlay data={data} onAction={handleAction} />
        </View>
      </Animated.View>
    </GestureDetector>
  );
};

// ==================================================================
// 1. SURVEY SCREEN (PURE UI - KHÔNG GỌI NAVIGATION)
// ==================================================================
const SurveyScreen = ({ onComplete, onBack }: { onComplete: () => void, onBack: () => void }) => {
    const insets = useSafeAreaInsets();
    const { requestLocation, saveManualCity } = useLocation();
    
    // Thêm state mới này để cờ đánh dấu
    const [isUsingGps, setIsUsingGps] = useState(false); 
    
    const [surveyStep, setSurveyStep] = useState(1);
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [selectedExp, setSelectedExp] = useState<number | null>(null);
    const [selectedAge, setSelectedAge] = useState<string | null>(null);
    const [locationText, setLocationText] = useState('');
    const [isRequestingGps, setIsRequestingGps] = useState(false);

    const ProgressBar = ({ current }: { current: number }) => (
        <View className="flex-row gap-2 mb-6 mt-2">
          {[1, 2, 3, 4].map((step) => (<View key={step} className={`h-1.5 flex-1 rounded-full ${step <= current ? 'bg-orange-400' : 'bg-gray-200'}`} />))}
        </View>
    );

    // LOGIC CHECK: Nút chỉ hiện khi thỏa mãn điều kiện
    const isStepValid = () => {
        if (surveyStep === 1) return !!selectedType;
        if (surveyStep === 2) return !!selectedExp;
        if (surveyStep === 3) return !!selectedAge;
        if (surveyStep === 4) return locationText.trim().length > 0;
        return false;
    };

    const handleContinue = async () => {
        if (surveyStep < 4) {
            setSurveyStep(prev => prev + 1);
        } else {
            // SỬA Ở ĐÂY: Chỉ lưu địa chỉ text nếu user KHÔNG dùng GPS
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
            // SỬA Ở ĐÂY: Bật cờ GPS lên để chặn lưu text đè lên GPS
            setIsUsingGps(true); 
            setLocationText('Vị trí hiện tại của bạn');
        }
    };

    // Hàm xử lý Back: Nếu ở step 1 thì gọi onBack (của Parent), ngược lại giảm step
    const handleBack = () => {
        if (surveyStep > 1) {
            setSurveyStep(prev => prev - 1);
        } else {
            onBack();
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}> 
            <View className="flex-1 px-6 pt-2">
                {/* <View className="flex-row items-center mb-2 justify-between">
                    <TouchableOpacity onPress={handleBack} className="p-2 -ml-2">
                        <Ionicons name="chevron-back" size={24} color="#374151" />
                    </TouchableOpacity>
                    {surveyStep === 1 && <Text className="text-gray-400 font-medium" onPress={onComplete}>Skip</Text>}
                </View> */}
                <ProgressBar current={surveyStep} />

                <View className="flex-1 mt-2">
                    {/* STEP 1: TYPE */}
                    {surveyStep === 1 && (
                        <Animated.View entering={FadeInDown} exiting={FadeOut}>
                            <Text className="text-2xl font-bold text-gray-900 mb-2">Let's Find Your Match!</Text>
                            <Text className="text-gray-500 mb-8">What type of pet are you looking to adopt?</Text>
                            <View className="flex-row justify-between gap-3">
                                {[{ id: 'dog', label: 'Dogs', icon: 'dog' }, { id: 'cat', label: 'Cats', icon: 'cat' }, { id: 'both', label: 'Both', icon: 'paw' }].map((item) => (
                                <TouchableOpacity key={item.id} onPress={() => setSelectedType(item.id)} className={`flex-1 aspect-square rounded-2xl items-center justify-center border-2 ${selectedType === item.id ? 'border-orange-400 bg-orange-50' : 'border-gray-100 bg-white'}`}>
                                    <FontAwesome5 name={item.icon as any} size={32} color={selectedType === item.id ? '#FB923C' : '#4B5563'} />
                                    <Text className={`mt-3 font-bold ${selectedType === item.id ? 'text-orange-500' : 'text-gray-600'}`}>{item.label}</Text>
                                </TouchableOpacity>
                                ))}
                            </View>
                        </Animated.View>
                    )}
                    
                    {/* STEP 2: EXP */}
                    {surveyStep === 2 && (
                        <Animated.View entering={FadeInDown} exiting={FadeOut}>
                            <Text className="text-2xl font-bold text-gray-900 mb-2">Experience Level</Text>
                            <Text className="text-gray-500 mb-6">How many years of experience do you have?</Text>
                            <View className="gap-4">
                                {EXPERIENCE_LEVELS.map((item) => (
                                <TouchableOpacity key={item.id} onPress={() => setSelectedExp(item.id)} className={`flex-row items-center p-4 rounded-2xl border ${selectedExp === item.id ? 'border-orange-400 bg-orange-50' : 'border-gray-100 bg-white shadow-sm'}`}>
                                    <View className="w-10 h-10 rounded-full bg-yellow-100 items-center justify-center mr-4"><Ionicons name={item.icon as any} size={20} color="#EAB308" /></View>
                                    <View><Text className="font-bold text-gray-800 text-base">{item.label}</Text><Text className="text-gray-400 text-xs">{item.sub}</Text></View>
                                </TouchableOpacity>
                                ))}
                            </View>
                        </Animated.View>
                    )}

                    {/* STEP 3: AGE */}
                    {surveyStep === 3 && (
                        <Animated.View entering={FadeInDown} exiting={FadeOut}>
                            <Text className="text-2xl font-bold text-gray-900 mb-2">Age Preference</Text>
                            <Text className="text-gray-500 mb-6">What age range are you looking for?</Text>
                            <View className="gap-3">
                                {AGE_PREFERENCES.map((age) => (
                                <TouchableOpacity key={age} onPress={() => setSelectedAge(age)} className={`p-5 rounded-2xl border ${selectedAge === age ? 'border-orange-400 bg-orange-50' : 'border-gray-100 bg-white shadow-sm'}`}>
                                    <Text className={`font-medium ${selectedAge === age ? 'text-orange-600' : 'text-gray-700'}`}>{age}</Text>
                                </TouchableOpacity>
                                ))}
                            </View>
                        </Animated.View>
                    )}

                    {/* STEP 4: LOCATION */}
                    {surveyStep === 4 && (
                        <Animated.View entering={FadeInDown} exiting={FadeOut}>
                            <Text className="text-2xl font-bold text-gray-900 mb-2">Your Location</Text>
                            <Text className="text-gray-500 mb-8">We'll help you find adoption shelters near you</Text>
                            
                            {/* UX OCD: Đổi màu border và icon sang cam khi input đã có dữ liệu để user biết họ đã hoàn thành */}
                            <View 
                                className={`p-4 rounded-2xl flex-row items-center border mb-4 ${
                                    locationText.trim().length > 0 
                                    ? 'bg-orange-50 border-orange-400' 
                                    : 'bg-gray-50 border-gray-100'
                                }`}
                            >
                                <Ionicons 
                                    name="location-outline" 
                                    size={20} 
                                    color={locationText.trim().length > 0 ? "#F97316" : "#9CA3AF"} 
                                />
                                <TextInput 
                                    placeholder="Enter your city or district" 
                                    className={`ml-3 flex-1 text-base ${
                                        locationText.trim().length > 0 ? 'text-gray-900 font-semibold' : 'text-gray-900'
                                    }`}
                                    value={locationText}
                                    onChangeText={(text) => {
                                        setLocationText(text);
                                        setIsUsingGps(false); // Nếu user tự gõ phím thì tắt cờ GPS
                                    }} 
                                />
                                {/* Thêm nút Xóa (Clear) nhẹ nhàng nếu user muốn nhập lại (chỉ hiện khi có chữ) */}
                                {locationText.trim().length > 0 && (
                                    <TouchableOpacity onPress={() => {
                                        setLocationText('');
                                        setIsUsingGps(false); // Xóa text thì cũng tắt cờ GPS
                                    }} className="p-1">
                                        <Ionicons name="close-circle" size={18} color="#D1D5DB" />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Action Button: Lắng nghe sự kiện onPress và set cứng Ho Chi Minh City */}
                            <TouchableOpacity 
                                activeOpacity={0.7}
                                onPress={handleUseGps}
                                disabled={isRequestingGps}
                                className="flex-row items-center justify-center py-4 border border-gray-200 rounded-2xl bg-white shadow-sm active:bg-gray-50"
                            >
                                {isRequestingGps ? (
                                    <ActivityIndicator size="small" color="#F97316" />
                                ) : (
                                    <Ionicons name="navigate-circle-outline" size={20} color="#F97316" />
                                )}
                                <Text className="ml-2 font-bold text-gray-700">Use My Current Location</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    )}
                </View>

                {/* LOGIC ẨN/HIỆN BUTTON: Chỉ render khi isStepValid() == true */}
                {isStepValid() && (
                    <Animated.View entering={FadeInDown.springify()} style={{ paddingBottom: insets.bottom + 16 }}> 
                        <TouchableOpacity 
                            onPress={handleContinue}
                            className="w-full bg-orange-400 py-4 rounded-full shadow-md items-center shadow-orange-200"
                        >
                            <Text className="text-white font-bold text-lg">Continue</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}
            </View>
        </SafeAreaView>
    );
};

// ==================================================================
// 2. POLICY SCREEN (PURE UI - KHÔNG GỌI NAVIGATION)
// ==================================================================
const PolicyScreen = ({ onBack, onAgree }: { onBack: () => void, onAgree: () => void }) => {
    const insets = useSafeAreaInsets();
    const [agreed, setAgreed] = useState(false); // Đây là Local State, thay đổi nó sẽ render lại PolicyScreen. 
    // Vì PolicyScreen nằm NGOÀI MatchingScreen, nó an toàn.

    const PolicyItem = ({ number, title, content }: any) => (
        <View className="flex-row items-start mb-5">
            <Text className="font-bold text-gray-900 mr-2 mt-0.5">{number}.</Text>
            <View className="flex-1">
                <Text className="font-bold text-gray-800 text-sm mb-1">{title}</Text>
                <Text className="text-gray-500 text-xs leading-4">{content}</Text>
            </View>
        </View>
    );

    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View className="flex-row items-center px-4 py-2 border-b border-gray-50">
            <TouchableOpacity onPress={onBack} className="p-2 -ml-2">
                <Ionicons name="chevron-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="font-bold text-lg text-gray-900 ml-2">POLICY AGREEMENT</Text>
        </View>

        <View className="flex-1">
            <Animated.ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
            <Text className="text-2xl font-bold text-gray-900 mb-3 uppercase tracking-tight">Adoption Policy</Text>
            <Text className="text-gray-600 mb-8 leading-5 text-sm">
                Adoption is a journey of love and long-term commitment. By adopting through PawLife, you agree to:
            </Text>

            <View className="mb-4">
                <PolicyItem number="1" title="Love and care for your pet for life" content="Do not abandon, harm, or use the pet for any illegal or inhumane purposes." />
                <PolicyItem number="2" title="Provide a safe and suitable living environment" content="This includes proper food, shelter, attention, and veterinary care when needed." />
                <PolicyItem number="3" title="Take care of your pet's health" content="Check-ups, vaccinations, and rabies shots as recommended." />
                <PolicyItem number="4" title="Stay in touch" content="During the first 6 months, share updates to ensure pet is doing well." />
                <PolicyItem number="5" title="Do not transfer your pet" content="Contact PawLife if you can no longer care for the pet." />
                <PolicyItem number="6" title="Provide truthful personal information" content="Basic info helps ensure your pet's safety." />
            </View>

            <View className="items-center mb-8 px-6 py-6 bg-orange-50 rounded-2xl border border-orange-100">
                <Text className="text-gray-600 italic text-center text-sm leading-6">
                    "Every paw deserves a life. Thank you for choosing to adopt, not shop."
                </Text>
                <Text className="text-gray-400 text-xs mt-3 font-medium uppercase tracking-widest">— PawLife team</Text>
            </View>

            <TouchableOpacity 
                className="flex-row items-center" 
                onPress={() => setAgreed(!agreed)}
                activeOpacity={0.8}
            >
                <View className={`w-6 h-6 border-2 rounded-md items-center justify-center mr-3 ${agreed ? 'bg-orange-400 border-orange-400' : 'border-gray-300 bg-white'}`}>
                    {agreed && <Ionicons name="checkmark" size={16} color="white" />}
                </View>
                <Text className="text-gray-700 font-medium text-sm flex-1">I have read and agree to the adoption policy.</Text>
            </TouchableOpacity>
            </Animated.ScrollView>
        </View>
        
        {/* LOGIC ẨN/HIỆN BUTTON: Chỉ hiện khi agreed == true */}
        {agreed && (
            <Animated.View 
                entering={FadeInDown} 
                className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 pt-4 pb-4" 
                style={{ paddingBottom: insets.bottom + 10 }}
            >
                <TouchableOpacity 
                    onPress={onAgree} 
                    className="w-full bg-[#F99C2E] py-4 rounded-full items-center shadow-lg shadow-orange-200"
                >
                    <Text className="text-white font-bold text-lg">Let's Adopt!</Text>
                </TouchableOpacity>
            </Animated.View>
        )}
      </SafeAreaView>
    );
};

// ==================================================================
// 3. TUTORIAL SCREEN (PURE UI)
// ==================================================================
const TutorialScreen = ({ onComplete }: { onComplete: () => void }) => {
    const insets = useSafeAreaInsets();
    
    const tutorialX = useSharedValue(0);
    const tutorialY = useSharedValue(0);
    
    const [tutorialStep, setTutorialStep] = useState(1);

    const tutorialImage = tutorialStep === 1 ? require('../../assets/images/t-left.jpg')
                    : tutorialStep === 2 ? require('../../assets/images/t-right.jpg')
                    : tutorialStep === 3 ? require('../../assets/images/t-center.jpg')
                    : require('../../assets/images/t-top.jpg');

    const demoCard = {
        ...SWIPE_CARDS[0],    
        image: tutorialImage  
    };

    const [isFavorited, setIsFavorited] = useState(false);

    const fadeAnim = useSharedValue(1); 
    const bounceValue = useSharedValue(0); 
    const pulseValue = useSharedValue(1);

    useEffect(() => {
        bounceValue.value = withRepeat(
            withTiming(20, { duration: 700, easing: Easing.inOut(Easing.ease) }), 
            -1, true 
        );
        pulseValue.value = withRepeat(
            withTiming(1.1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
            -1, true
        );
    }, [tutorialStep]);

    const handleTutorialSwipe = (dir: 'left' | 'right' | 'up' | 'heart' | 'reload') => {
        fadeAnim.value = withTiming(0, { duration: 150 });

        setTimeout(() => {
            if (tutorialStep === 1 && dir === 'left') setTutorialStep(2);
            else if (tutorialStep === 2 && dir === 'right') setTutorialStep(3);
            else if (tutorialStep === 3 && dir === 'heart') {
                setIsFavorited(true);
                setTimeout(() => {
                    setTutorialStep(4);
                    setIsFavorited(false);
                }, 500);
            }
            else if (tutorialStep === 4 && dir === 'up') {
                onComplete(); 
                return;
            }
            
            tutorialX.value = 0; 
            tutorialY.value = 0;
            
            fadeAnim.value = withTiming(1, { duration: 300 });
        }, 150);
    };

    const forcedDir = tutorialStep === 1 ? 'left' : tutorialStep === 2 ? 'right' : tutorialStep === 3 ? 'heart' : 'up';
    const instruction = tutorialStep === 1 ? "Swipe Left to Pass" : tutorialStep === 2 ? "Swipe Right to Like" : tutorialStep === 3 ? "Double Tap to Favorite" : "Swipe Up for Details";
    const subInstruction = tutorialStep === 1 ? "Not the right fit? Move on." : tutorialStep === 2 ? "Found a potential buddy? Show love!" : tutorialStep === 3 ? "Really like this one? Save for later." : "Want to know more? View profile.";
    const iconName = tutorialStep === 1 ? "gesture-swipe-left" : tutorialStep === 2 ? "gesture-swipe-right" : tutorialStep === 3 ? "gesture-double-tap" : "gesture-swipe-up"; 

    const animatedInstructionStyle = useAnimatedStyle(() => ({
        opacity: fadeAnim.value,
        transform: [{ translateY: interpolate(fadeAnim.value, [0, 1], [10, 0]) }]
    }));

    const animatedIconStyle = useAnimatedStyle(() => {
        if (tutorialStep === 1) return { transform: [{ translateX: -bounceValue.value }] };
        if (tutorialStep === 2) return { transform: [{ translateX: bounceValue.value }] };
        if (tutorialStep === 4) return { transform: [{ translateY: -bounceValue.value }] };
        if (tutorialStep === 3) return { transform: [{ scale: interpolate(bounceValue.value, [0, 20], [1, 1.15]) }] };
        return {};
    });

    const animatedPulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseValue.value }]
    }));

    return (
      <SafeAreaView className="flex-1 bg-white relative" edges={['top']}>
         {/* HEADER: Khu vực hiển thị hướng dẫn */}
         <View className="pt-2 pb-4 px-6 z-20 items-center justify-end min-h-[120px]">
             <Animated.View style={animatedInstructionStyle} className="items-center">
                 <Animated.View style={animatedIconStyle} className="mb-2">
                     <MaterialCommunityIcons 
                        name={iconName as any} size={48} color="#F97316" 
                     />
                 </Animated.View>
                 <Text className="text-gray-900 text-2xl font-black text-center tracking-tight mb-1">{instruction}</Text>
                 <Text className="text-gray-500 text-sm font-medium text-center">{subInstruction}</Text>
             </Animated.View>
         </View>

         {/* BODY: Swipe Card lấp đầy toàn bộ không gian còn lại */}
         <View className="flex-1 px-3 z-10">
             <View className="flex-1 relative w-full rounded-[32px]">
                 <SwipeableCard 
                    key={`tutorial-${tutorialStep}`} 
                    data={demoCard} 
                    onSwipe={handleTutorialSwipe}
                    sharedTranslateX={tutorialX}
                    sharedTranslateY={tutorialY}
                    forcedDirection={forcedDir} 
                    isFavorited={isFavorited} 
                 />
                 {tutorialStep === 3 && (
                     <Animated.View style={[animatedPulseStyle]} className="absolute -top-4 -right-2 bg-[#F97316] px-4 py-1.5 rounded-full border-2 border-white shadow-lg z-50 pointer-events-none">
                         <Text className="text-white text-[11px] font-black uppercase tracking-widest">Try it!</Text>
                     </Animated.View>
                 )}
             </View>
         </View>
         
         {/* FOOTER: Khu vực nút Skip */}
         <View className="pt-6 items-center z-50 bg-white" style={{ paddingBottom: insets.bottom + TAB_BAR_HEIGHT }}>
            <TouchableOpacity 
                onPress={onComplete}
                activeOpacity={0.7}
                className="px-8 py-3.5 bg-gray-50 rounded-full border border-gray-200 shadow-sm"
            >
                <Text className="text-gray-600 font-bold text-sm tracking-widest uppercase">
                    Skip Tutorial
                </Text>
            </TouchableOpacity>
         </View>
      </SafeAreaView>
    );
};

// ==================================================================
// 4. MAIN SWIPE SCREEN (PURE UI)
// ==================================================================
const MainSwipeScreen = ({ onBack, onDetail, onAdopt }: { onBack: () => void, onDetail: (item: any) => void, onAdopt: (item: any) => void }) => {
    const router = useRouter();
    
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

                return {
                    id: pet.id,
                    name: pet.name,
                    age: pet.age || 'Unknown',
                    gender: pet.gender || 'MALE',
                    distance: displayDistance, // Đã thay 'Near you' bằng biến xử lý ở trên
                    location: pet.shelter?.name || pet.location || 'Location',
                    image: pet.images && pet.images.length > 0 ? pet.images[0].url : 'https://via.placeholder.com/400x600?text=No+Image'
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

    useFocusEffect(
        useCallback(() => {
            // SỬA Ở ĐÂY: Dùng isLocationLoaded thay vì location !== null
            if (isLocationLoaded) {
                loadPets();
            }
        }, [isLocationLoaded, location, user?.id]) 
    );

    useEffect(() => {
        if (currentIndex % 2 === 0) { translateX_Odd.value = 0; translateY_Odd.value = 0; } 
        else { translateX_Even.value = 0; translateY_Even.value = 0; }
    }, [currentIndex]);

    const activeCard = currentIndex < pets.length ? pets[currentIndex] : null;
    const nextCard = currentIndex + 1 < pets.length ? pets[currentIndex + 1] : null;

    const nextCardStyle = useAnimatedStyle(() => {
        const distance = Math.abs(activeTranslationX.value);
        const scale = interpolate(distance, [0, width], [0.95, 1], Extrapolation.CLAMP);
        const translateY = interpolate(distance, [0, width], [8, 0], Extrapolation.CLAMP); 
        const opacity = interpolate(distance, [0, width / 2], [0.5, 1], Extrapolation.CLAMP);
        return { transform: [{ scale }, { translateY }], opacity };
    });

    const handleMainSwipe = (dir: 'left' | 'right' | 'up' | 'reload' | 'heart') => {
        if (!activeCard) return;

        // --- LOGIC THẢ TIM (TOGGLE FAVORITE) VÀ GỌI API NGẦM ---
        if (dir === 'heart') {
            const isCurrentlyFavorited = favorites.includes(activeCard.id);
            
            // Cập nhật Optimistic UI
            setFavorites(prev => {
                if (isCurrentlyFavorited) {
                    return prev.filter(id => id !== activeCard.id);
                }
                return [...prev, activeCard.id];
            });

            // Gọi API ngầm ở background
            if (isCurrentlyFavorited) {
                petService.unfavoritePet(activeCard.id).catch(err => console.error("Lỗi bỏ tim:", err));
            } else {
                petService.favoritePet(activeCard.id).catch(err => console.error("Lỗi thả tim:", err));
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
            onDetail(activeCard);
            activeTranslationX.value = withDelay(400, withTiming(0, { duration: 0 }));
            activeTranslationY.value = withDelay(400, withTiming(0, { duration: 0 }));
            return; 
        }
        
        // --- LOGIC QUẸT TRÁI/PHẢI (API SWIPE) ---
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
      <SafeAreaView className="flex-1 bg-white relative" edges={['top']}>
        <View className="flex-row justify-between items-center px-6 py-2 z-10 bg-white">
            <TouchableOpacity onPress={() => router.navigate('/(tabs)')} className="p-2 -ml-2">
                <Ionicons name="chevron-back" size={24} color="black" />
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-gray-900">Pawdoption</Text>
            <TouchableOpacity onPress={onBack} className="p-2 bg-gray-50 rounded-full border border-gray-100">
               <Ionicons name="options" size={20} color="#374151" />
            </TouchableOpacity>
        </View>

        <View className="flex-1 px-3 pb-3 pt-2">
           {loading ? (
               <View className="flex-1 items-center justify-center">
                   <Text className="text-gray-400 font-medium">Loading pets...</Text>
               </View>
           ) : nextCard ? (
               <View className="absolute top-2 left-3 right-3 bottom-3 z-0 pointer-events-none">
                  <Animated.View style={[{ flex: 1, backgroundColor: '#1f2937', borderRadius: 32, overflow: 'hidden' }, nextCardStyle]}>
                     <View className="flex-1">
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
                        <CardOverlay data={nextCard} />
                     </View>
                  </Animated.View>
               </View>
           ) : null}

           {!loading && activeCard ? (
               <View className="flex-1 z-20 relative">
                   <SwipeableCard 
                        key={`${activeCard.id}-${currentIndex}`} // <--- Cập nhật dòng này
                        data={activeCard} 
                        onSwipe={handleMainSwipe} 
                        sharedTranslateX={activeTranslationX} 
                        sharedTranslateY={activeTranslationY}
                        isFavorited={favorites.includes(activeCard.id)}
                    />
               </View>
           ) : !loading && !activeCard ? (
               <View className="flex-1 items-center justify-center">
                   <Text className="text-gray-400">No more pets nearby...</Text>
                   <TouchableOpacity onPress={loadPets} className="mt-4 px-6 py-3 bg-orange-100 rounded-full">
                       <Text className="text-orange-500 font-bold">Reload</Text>
                   </TouchableOpacity>
               </View>
           ) : null}
        </View>
        <View style={{ height: TAB_BAR_HEIGHT }} />
      </SafeAreaView>
  )};

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
  const { user } = useContext(AuthContext); // Lấy thông tin user hiện tại
  
  const [appStage, setAppStage] = useState<number>(3); // Mặc định là 3, sẽ bị block bởi loading
  const [isLoadingStage, setIsLoadingStage] = useState<boolean>(true); // Tránh chớp màn hình (flickering)
  
  useEffect(() => {
    const checkOnboardingStatus = async () => {
        try {
            if (returnFromSuccess === '1') {
                setAppStage(3);
                setIsLoadingStage(false);
                return;
            }

            const userId = user?.id || 'guest';
            // Dùng ID của user để phân biệt thiết lập giữa các tài khoản khác nhau trên cùng 1 máy
            const hasCompleted = await AsyncStorage.getItem(`@matching_onboarding_${userId}`);
            
            if (hasCompleted === 'true') {
                setAppStage(3); // Đã làm rồi -> Vào thẳng màn quẹt thẻ
            } else {
                setAppStage(0); // Chưa làm -> Bắt đầu từ Survey
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
        router.push({
        pathname: '/pet-detail-modal',
        params: { id: pet.id, name: pet.name, age: pet.age, gender: pet.gender, image: pet.image, distance: pet.distance }
        });
    };

  const handleAdopt = (pet: any) => {
      router.push({
          pathname: '/adoption-form', 
          params: {  id: pet.id, name: pet.name, age: pet.age, image: pet.image }
      });
  };

  // Hàm được gọi khi hoàn thành toàn bộ chuỗi hướng dẫn
  const handleCompleteOnboarding = async () => {
      try {
          const userId = user?.id || 'guest';
          await AsyncStorage.setItem(`@matching_onboarding_${userId}`, 'true');
      } catch (error) {
          console.error("Lỗi khi lưu AsyncStorage:", error);
      }
      setAppStage(3);
  };

  if (isLoadingStage) {
      // Có thể thay bằng Component Spinner của bạn
      return <View className="flex-1 bg-white" />; 
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
        {appStage === 0 && (
            <SurveyScreen 
                onComplete={() => setAppStage(1)} 
                onBack={() => {
                    if (router.canGoBack()) {
                        router.back();
                    } else {
                        router.replace('/(tabs)');
                    }
                }} 
            />
        )}
        
        {appStage === 1 && (
            <PolicyScreen 
                onBack={() => setAppStage(0)} 
                onAgree={() => setAppStage(2)} 
            />
        )}
        
        {appStage === 2 && (
            <TutorialScreen 
                onComplete={handleCompleteOnboarding} // Đổi từ setAppStage(3) thành handleCompleteOnboarding
            />
        )} 
        
        {appStage === 3 && (
            <MainSwipeScreen 
                onBack={() => setAppStage(0)}
                onDetail={handleDetail}
                onAdopt={handleAdopt}
            />
        )}
    </GestureHandlerRootView>
  );
}