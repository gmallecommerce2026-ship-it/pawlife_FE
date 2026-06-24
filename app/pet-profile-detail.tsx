import { Text } from '@/components/AppText';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLocalizedData } from '@/hooks/useLocalizedData';
import { resolvePawHistoryItem } from '@/utils/pawHistory';
import { normalizePet } from '@/utils/petNormalize';
import { Feather, FontAwesome5, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, DeviceEventEmitter, Dimensions, Image, InteractionManager, LayoutAnimation, Modal, Platform, ScrollView, Switch, TouchableOpacity, UIManager, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { petService } from '../services/petService';
// Kích hoạt LayoutAnimation cho Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MOCK_PAW_HISTORY = [
  {
    id: '1',
    title: 'Current Owner',
    date: '01/01/2026',
    description: 'Ownership transferred to Jane Doe',
    icon: 'user',
    color: '#F2A465', // Cam
    bgColor: '#FFF4EC'
  },
  {
    id: '2',
    title: 'Annual Checkup',
    date: '01/01/2026',
    description: 'Health examination completed',
    icon: 'check',
    color: '#77C582', // Xanh lá
    bgColor: '#EBFFE2'
  },
  {
    id: '3',
    title: 'DHPP Vaccination',
    date: '01/01/2026',
    description: 'Vaccinated: hepatitis, rabies, parvo, and parainfluenza',
    icon: 'syringe',
    color: '#5A90DA', // Xanh dương
    bgColor: '#E8F1FF'
  },
  {
    id: '4',
    title: 'QR Code Registered',
    date: '01/01/2026',
    description: 'PawLife QR tag activated and linked to Luna',
    icon: 'expand',
    color: '#885BF2', // Tím
    bgColor: '#EAE7FB'
  },
  {
    id: '5',
    title: 'Date of Birth',
    date: '01/01/2026',
    description: 'Luna was born',
    icon: 'user',
    color: '#F2A465', // Vàng cam
    bgColor: '#FFF4EC'
  }
];
const getSafeBilingualText = (val: any, isVi: boolean, logPrefix: string = '') => {
  console.log(`\n[DEBUG_MEDICAL_RECORD - ${logPrefix}] Type: ${typeof val} | Value:`, val);

  if (!val) return '';
  if (typeof val === 'string') {
    if (val === '[object Object]') {
      console.log(`⚠️ CẢNH BÁO: Dữ liệu Medical Record đã bị ép thành [object Object] từ trước!`);
    }
    if (val.trim().startsWith('{')) {
      try {
        const p = JSON.parse(val);
        const res = isVi ? (p.vi || p.en) : (p.en || p.vi);
        console.log(`[DEBUG_MEDICAL_RECORD] Parsed JSON String ->`, res);
        return res;
      } catch { return val; }
    }
    return val;
  }
  if (typeof val === 'object') {
    const res = isVi ? (val.vi || val.en) : (val.en || val.vi);
    console.log(`[DEBUG_MEDICAL_RECORD] Parsed Object ->`, res);
    return res;
  }
  return String(val);
};
export default function PetProfileDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const petId = params.id as string;
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();
  const isVi = language === 'vi';
  const { l } = useLocalizedData();

  const queryClient = useQueryClient();
  // --- STATE ---
  const [petData, setPetData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLostMode, setIsLostMode] = useState(false);
  const lockLostStatusRef = useRef(false);
  const [showHistory, setShowHistory] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingLostMode, setIsTogglingLostMode] = useState(false);
  const [showLostModeModal, setShowLostModeModal] = useState(false);
  const [pendingLostMode, setPendingLostMode] = useState<boolean>(false);
  const [showVaccineMenu, setShowVaccineMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 28 });
  const [selectedVaccineIndex, setSelectedVaccineIndex] = useState<number | null>(null);
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);
  const [tooltipAnchor, setTooltipAnchor] = useState({ x: 0, y: 0 });

  // KHỞI TẠO BIẾN ANIMATION
  const tooltipAnim = useRef(new Animated.Value(0)).current;
  // State quản lý việc xem ảnh full màn hình trong App
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [currentImageList, setCurrentImageList] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1552053831-71594a27632d?q=80&w=600&auto=format&fit=crop';
  const displayAvatar = petData?.avatarUrl || petData?.images?.[0]?.url || FALLBACK_AVATAR;
  console.log(petData);


  const getHistoryUIConfig = (type: string) => {
    switch (type) {
      case 'BIRTH':
        return { icon: 'birthday-cake', color: '#F2A465', bgColor: '#FFF4EC' };
      case 'CREATED':
        return { icon: 'paw', color: '#885BF2', bgColor: '#EAE7FB' };
      case 'QR_LINKED':
        return { icon: 'qrcode', color: '#5A90DA', bgColor: '#E8F1FF' };
      case 'TRANSFER':
        return { icon: 'home', color: '#77C582', bgColor: '#EBFFE2' };
      case 'VACCINE':
        return { icon: 'syringe', color: '#EF4444', bgColor: '#FEE2E2' };
      default:
        return { icon: 'history', color: '#8E8E93', bgColor: '#F5F5F5' };
    }
  };
  const getMedicalRecordIconConfig = (type: string) => {
    const t = (type || '').toUpperCase();
    switch (t) {
      case 'VACCINE':
      case 'VACCINATION':
        return { icon: 'syringe' };
      case 'CHECKUP':
        return { icon: 'stethoscope' };
      case 'SURGERY':
        return { icon: 'procedures' };
      case 'DEWORMING':
        return { icon: 'pills' };
      default:
        return { icon: 'file-medical' };
    }
  };

  const handleRemovePet = () => {
    Alert.alert(
      "Delete Pet",
      `Are you sure you want to delete the profile of ${petData?.name}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setIsDeleting(true);
              await petService.deletePet(petId);
              Alert.alert("Success", "Pet profile deleted successfully!");
              router.push('/(tabs)/my-pets');
            } catch (error: any) {
              Alert.alert("Error", error.message || "Unable to delete pet at this time.");
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  // 2. ✅ THÊM HOOK NÀY: Lắng nghe event từ màn hình Report
  React.useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('LOST_MODE_ACTIVATED', (data) => {
      if (data.petId === petId) {
        // Bật khóa: Không cho phép API GET ghi đè trạng thái lost mode
        lockLostStatusRef.current = true;

        setIsLostMode(true);
        setPetData((prev: any) =>
          prev ? { ...prev, status: 'LOST', isLost: true } : prev
        );

        // Tự động mở khóa sau 5 giây (Thời gian dư dả để Backend đồng bộ xong Cache/DB)
        setTimeout(() => {
          lockLostStatusRef.current = false;
        }, 5000);
      }
    });

    return () => subscription.remove();
  }, [petId]);

  // 2. USEFOCUSEFFECT: Chỉ nhận trạng thái từ API nếu không bị khóa
  // Tìm đến đoạn useFocusEffect và sửa lại như sau:

  useFocusEffect(
    useCallback(() => {
      let task: any; // Lưu lại reference của task để dọn dẹp

      const fetchPetDetail = async () => {
        if (!petId) return;
        console.log(petId);
        try {
          setPetData((prev: any) => {
            if (!prev) setIsLoading(true);
            return prev;
          });

          const data = await petService.getPetById(petId);

          if (lockLostStatusRef.current) {
            setPetData({ ...normalizePet(data, language), status: 'LOST', isLost: true });
          } else {
            setPetData(normalizePet(data, language));

            const isCurrentlyLost =
              data.tags?.some((tag: any) => tag.status === 'LOST') ||
              data.status === 'LOST' ||
              data.isLost === true;

            setIsLostMode(!!isCurrentlyLost);
          }
        } catch (error) {
          console.error("Error when loading pet information:", error);
        } finally {
          setIsLoading(false);
        }
      };

      // CHỈ GỌI API KHI HIỆU ỨNG CHUYỂN MÀN HÌNH ĐÃ KẾT THÚC
      task = InteractionManager.runAfterInteractions(() => {
        fetchPetDetail();
      });

      // Cleanup function để tránh memory leak nếu user thoát màn hình quá nhanh
      return () => {
        if (task && task.cancel) {
          task.cancel();
        }
      };
    }, [petId, language])
  );

  const HISTORY_DATA = [
    {
      id: 1, type: 'highlight', variant: 'orange',
      title: 'Current Owner', date: 'Jan 15, 2026', desc: 'Ownership transferred to current owner',
      icon: <MaterialIcons name="verified" size={16} color="white" />
    },
    {
      id: 2, type: 'normal', color: '#10B981',
      title: 'Vaccination', date: 'Dec 8, 2025', desc: 'Annual rabies & DHPP vaccination completed',
      icon: <MaterialCommunityIcons name="needle" size={14} color="#10B981" />
    },
    {
      id: 3, type: 'normal', color: '#EF4444',
      title: 'Lost & Found', date: 'Nov 22, 2025', desc: 'Found after 2 days - Scanned at Oak Park',
      icon: <Feather name="alert-circle" size={14} color="#EF4444" />
    }
  ];

  // --- LOGIC HANDLERS ---
  const handleLostModeToggle = (value: boolean) => {
    if (value === true) {
      // 1. Tính toán tuổi chính xác từ ngày sinh (dob) trước khi truyền đi
      let calculatedAge = petData?.age?.toString();

      if (petData?.dob) {
        const birthDate = new Date(petData.dob);
        const today = new Date();
        let years = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();

        // Trừ đi 1 năm nếu chưa đến tháng sinh, hoặc cùng tháng nhưng chưa đến ngày sinh
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          years--;
        }

        // Nếu nhỏ hơn 1 tuổi thì để là '0'
        calculatedAge = years > 0 ? years.toString() : '0';
      }

      router.push({
        pathname: '/report-lost-pet' as any,
        params: {
          petId: petId,
          petName: petData?.name,
          petAvatar: displayAvatar,

          // 2. BỔ SUNG TRUYỀN THÊM petBreed VÀ petAge VÀO PARAMS
          petBreed: petData?.breed,
          petAge: calculatedAge,

          petShelterName: petData?.contactName || ownerInfo?.name || 'not updated',
          petShelterPhone: petData?.contactPhone || ownerInfo?.phone || 'not updated',
          petShelterAddress: petData?.contactAddress || ownerInfo?.address || 'not updated'
        }
      });
    } else {
      setPendingLostMode(false);
      setShowLostModeModal(true);
    }
  };

  const executeToggleMode = async () => {
    const isLost = pendingLostMode;
    try {
      setShowLostModeModal(false);
      setIsTogglingLostMode(true);

      await petService.toggleLostMode(petId, { isLost: isLost });
      setIsLostMode(isLost);
    } catch (error: any) {
      Alert.alert(t('error.title'), error.message || t('error.toggleModeFailed'));
      setIsLostMode(!isLost);
    } finally {
      setIsTogglingLostMode(false);
    }
  };

  const closeTooltip = () => {
    // Hiệu ứng Fade Out + Move Down
    Animated.timing(tooltipAnim, {
      toValue: 0,
      duration: 150, // Tốc độ đóng nhanh hơn mở một chút cho tự nhiên
      useNativeDriver: true, // Ép chạy trên UI Thread (mượt 60fps)
    }).start(() => setActiveTooltipId(null));
  };

  const handleToggleTooltip = (id: string, x: number, y: number) => {
    if (activeTooltipId === id) {
      closeTooltip();
    } else {
      // Mở popup mới
      setTooltipAnchor({ x, y });
      setActiveTooltipId(id);
      tooltipAnim.setValue(0); // Reset về trạng thái tàng hình + nằm bên dưới

      // Hiệu ứng Fade In + Move Up
      Animated.timing(tooltipAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  };

  const toggleHistory = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowHistory(!showHistory);
  };

  const combinedHistory = React.useMemo(() => {
    if (!petData) return [];


    const baseHistory = petData.pawHistory || [];

    return baseHistory.map((item: any) => {
      let isPending = false;
      const resolved = resolvePawHistoryItem(item, t, l, language);
      let displayTitle = resolved.title;
      let displayDescription = resolved.description;


      // Nếu đây là sự kiện VACCINE do Backend trả về
      if (item.type === 'VACCINE') {
        displayTitle = isVi ? `Tiêm phòng • ${resolved.title}` : `Vaccination • ${resolved.title}`;

        const matchingRecord = petData.medicalRecords?.find((mr: any) => {
          // Ép sang chữ an toàn trước khi so sánh
          const mrName = getSafeBilingualText(mr.recordName, isVi);
          return mrName === resolved.title || resolved.title.includes(mrName);
        });

        if (matchingRecord && (matchingRecord.verificationStatus === 'PENDING' || !matchingRecord.verificationStatus)) {
          isPending = true;
        }
      }

      return {
        ...item,
        displayTitle,
        displayDescription,
        isPending
      };
    }).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [petData, t, l, isVi]);

  // --- SUB-COMPONENTS ---
  const InfoRow = ({ label1, value1, label2, value2 }: any) => (
    <View className="flex-row justify-between mb-5">
      <View className="flex-1">
        <Text className="text-black text-[16px] font-medium mb-1">{label1}</Text>
        <Text className="text-[#8E8E93] text-[14px] font-regular">{value1}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-black text-[16px] font-medium mb-1">{label2}</Text>
        <Text className="text-[#8E8E93] text-[14px] font-regular">{value2}</Text>
      </View>
    </View>
  );

  const InfoRow2 = ({ label1, value1, label2, value2 }: any) => (
    <View className="flex-row justify-between mb-8">
      <View className="flex-1">
        <Text className="text-black text-[16px] font-medium mb-1">{label1}</Text>
        <Text className="text-[#8E8E93] text-[14px] font-regular">{value1}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-black text-[16px] font-medium mb-1">{label2}</Text>
        <Text className="text-[#8E8E93] text-[14px] font-regular">{value2}</Text>
      </View>
    </View>
  );

  const OwnerRow = ({ label, value, isLast = false }: any) => (
    <View className={`flex-row justify-between items-center py-4 ${!isLast ? 'border-b border-gray-200' : ''}`}>
      <Text className="text-black text-[16px] font-medium">
        {label}
      </Text>
      <Text className="text-[#8E8E93] text-[14px] font-regular flex-1 text-right ml-4" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );

  if (isLoading) {
    return <ActivityIndicator size="small" color="#e9a353" />;
  }

  if (!petData) {
    return (
      <View className="flex-1 justify-center items-center bg-[#FAFAFA]">
        <MaterialCommunityIcons name="paw-off" size={64} color="#E5E7EB" />
        <Text className="text-gray-800 text-lg font-bold mt-4">Information not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-6 bg-orange-100 px-6 py-2 rounded-full">
          <Text className="text-orange-600 font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ownerInfo = petData.shelter || petData.owner || {};
  const isShelter = !!petData.shelter;
  const displayContactName = petData.contactName || ownerInfo.name || 'not updated';
  const displayContactPhone = petData.contactPhone || ownerInfo.phone || 'not updated';
  const displayContactAddress = petData.contactAddress || ownerInfo.address || 'not updated';

  const displayId = petData.code || petData.id?.substring(0, 8).toUpperCase() || petId.substring(0, 8).toUpperCase();
  const hasValidQRCode = !!petData.qrCodeUrl && petData.qrVerificationStatus === 'VERIFIED';
  const selectedMedicalRecord = selectedVaccineIndex !== null
    ? petData?.medicalRecords?.[selectedVaccineIndex]
    : null;
  const selectedMedicalRecordIsPending = !!selectedMedicalRecord && (
    selectedMedicalRecord.verificationStatus === 'PENDING' || !selectedMedicalRecord.verificationStatus
  );

  const handleDownloadImage = async (url: string, fileName: string) => {
    try {
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      const downloadRes = await FileSystem.downloadAsync(url, fileUri);

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          isVi ? 'Thiếu quyền' : 'Permission Required',
          isVi
            ? 'Cần cấp quyền truy cập thư viện ảnh để lưu ảnh.'
            : 'Photo library permission is required to save the image.'
        );
        return;
      }

      await MediaLibrary.saveToLibraryAsync(downloadRes.uri);

      Alert.alert(
        isVi ? 'Thành công' : 'Success',
        isVi ? 'Ảnh đã được lưu vào thư viện ảnh!' : 'Image has been saved to your photos!'
      );
    } catch (error) {
      console.error("Lỗi tải file:", error);
      Alert.alert(
        isVi ? 'Lỗi' : 'Error',
        isVi ? 'Không thể tải xuống ảnh này lúc này.' : 'Unable to download this image right now.'
      );
    }
  };
  const handleDownloadMultipleImages = async (urls: string[]) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          isVi ? 'Thiếu quyền' : 'Permission Required',
          isVi
            ? 'Cần cấp quyền truy cập thư viện ảnh để lưu ảnh.'
            : 'Photo library permission is required to save images.'
        );
        return;
      }

      let successCount = 0;

      for (let i = 0; i < urls.length; i++) {
        try {
          const fileUri = `${FileSystem.documentDirectory}medical_record_${Date.now()}_${i}.jpg`;
          const downloadRes = await FileSystem.downloadAsync(urls[i], fileUri);
          await MediaLibrary.saveToLibraryAsync(downloadRes.uri);
          successCount++;
        } catch (err) {
          console.error(`Lỗi tải ảnh ${i}:`, err);
        }
      }

      if (successCount === urls.length) {
        Alert.alert(
          isVi ? 'Thành công' : 'Success',
          isVi
            ? `Đã lưu ${successCount} ảnh vào thư viện ảnh!`
            : `Saved ${successCount} image(s) to your photos!`
        );
      } else if (successCount > 0) {
        Alert.alert(
          isVi ? 'Hoàn tất một phần' : 'Partially Completed',
          isVi
            ? `Đã lưu ${successCount}/${urls.length} ảnh. Một số ảnh không thể tải.`
            : `Saved ${successCount}/${urls.length} image(s). Some images failed to download.`
        );
      } else {
        Alert.alert(
          isVi ? 'Lỗi' : 'Error',
          isVi ? 'Không thể tải xuống ảnh.' : 'Unable to download images.'
        );
      }
    } catch (error) {
      console.error("Lỗi tải nhiều ảnh:", error);
      Alert.alert(
        isVi ? 'Lỗi' : 'Error',
        isVi ? 'Không thể tải xuống ảnh lúc này.' : 'Unable to download images right now.'
      );
    }

  };

  return (
    <View
      className="flex-1 bg-[#FFFFFF]"
      onTouchStart={() => {
        if (activeTooltipId !== null) {
          closeTooltip(); // Gọi hàm tắt có animation
        }
      }}
    >
      <StatusBar style="dark" />
      <SafeAreaView className="flex-1" edges={['top']}>

        {/* --- HEADER --- */}
        <View className="flex-row items-center justify-between px-4 py-2 bg-[#FFFFFF]">
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)/my-pets')}
            activeOpacity={0.7}
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 5,
              elevation: 3,
            }}
          >
            <View className="overflow-hidden left-0 rounded-full w-[36px] h-[36px] items-center justify-center"
              style={{
                width: 36,
                height: 36,
                borderRadius: 28,
                borderWidth: 0.5,
                borderTopColor: 'white',
                borderLeftColor: 'white',
                borderBottomColor: 'transparent',
                borderRightColor: 'transparent',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
              }}>
              <LinearGradient
                colors={['rgba(221, 221, 221, 0.3)', 'rgba(247, 247, 247, 0.7)', '#FFFFFF']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                locations={[0, 0.3, 1]}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 9999 }}
              />
              <Feather name="chevron-left" size={20} color="#1F2937" />
            </View>
          </TouchableOpacity>
          <Text className="text-[18px] font-semibold text-[#000000]">
            {isVi ? `Hồ sơ của ${petData.name}` : `${petData.name} Profile`}
          </Text>
          <View className="w-10" />
        </View>
        {petData?.needsQrReplacement && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              router.push({
                pathname: '/(tabs)/scan',
                params: { replacePetId: petId }
              });
            }}
            className="w-full flex-row bg-[#FDF5E8] py-[6px] items-center justify-center"
          >
            <View className="mr-2">
              <Image source={require('../assets/icon/alert.png')} style={{ width: 15, height: 15 }} />
            </View>
            <Text className="text-[13px] font-semibold text-[#CF7900] underline">
              {isVi ? 'Thẻ này cần thay thế ngay!' : 'This Tag Needs Replacement ASAP!'}
            </Text>
          </TouchableOpacity>
        )}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 30 }}
          scrollEventThrottle={16}
          onScroll={() => {
            if (activeTooltipId !== null) {
              closeTooltip(); // Gọi hàm tắt có animation
            }
          }}
        >

          {/* --- AVATAR & ID SECTION --- */}
          <View className="items-center mt-6 mb-[12px]">
            <View className="w-32 h-32 rounded-full bg-[#FFFFFF] border border-gray-200 items-center justify-center overflow-hidden shadow-sm">
              <Image
                source={{ uri: displayAvatar }}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
            <Text className="text-[18px] font-semibold text-gray-900 mt-[23px] mb-[12px]">{petData.name}</Text>

            {/* Pet ID Tag */}
            {/* <View className="mt-[12px] flex-row items-center gap-2">
              <Text className="text-[#B8B8B8] font-normal text-[14px] tracking-wider">
                ID: {displayId}
              </Text>
            </View> */}
          </View>

          {/* --- LOST MODE / QR REQUIRED SECTION --- */}
          {hasValidQRCode ? (
            <View>
              {/* <View>
                {petData?.needsQrReplacement && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      router.push({
                        pathname: '/(tabs)/scan',
                        params: { replacePetId: petId }
                      });
                    }}
                    className="mx-[20px] mb-8 flex-row bg-[#FDF5E8] border border-[#FFAA33] rounded-[20px] p-[17px]"
                  >
                    <View className="mr-2">
                      <Image source={require('../assets/icon/alert.png')} style={{ width: 15, height: 15 }} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[16px] font-semibold text-[#CF7900] mb-1">
                        This Tag Needs Replacement ASAP!
                      </Text>
                      <Text className="text-[14px] text-[#CF7900]">
                        A damaged tag may make it harder to access important info.
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View> */}
              <View
                className="mx-[20px] mb-8 rounded-[20px]"
                style={isLostMode
                  ? {
                    shadowColor: '#8B546B1A',
                    shadowOffset: { width: 5, height: 5 },
                    shadowOpacity: 1,
                    shadowRadius: 2,
                    elevation: 3,
                    backgroundColor: isLostMode ? '#FEF2F2' : '#FFFFFF'
                  } : {}}
              >
                <View
                  className={`rounded-[20px] p-[18px] py-[21px] flex-row items-center justify-between overflow-hidden ${isLostMode
                    ? 'bg-[#FEF2F2] border border-[#FFE5E5]'
                    : 'bg-white border border-gray-200'
                    }`}
                >
                  {isLostMode && (
                    <>
                      <LinearGradient
                        colors={['#FFF8F1', '#FFF8F1', '#FFEEF0']}
                        locations={[0, 0.15, 0.35]}
                        start={{ x: 1, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{
                          position: 'absolute',
                          top: 0, left: 0, right: 0,
                          height: 3,
                          zIndex: 1,
                        }}
                      />
                      <LinearGradient
                        colors={['#FFF8F1', '#FFEEF0']}
                        locations={[0.3, 1]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                      />
                    </>
                  )}

                  <View className="flex-row items-start flex-1 mr-4 z-10">
                    {isLostMode && (
                      <View className="mt-[1px] mr-3">
                        <Feather
                          name="alert-circle"
                          size={20}
                          color="#8B3A3A"
                        />
                      </View>
                    )}
                    <View className="flex-1">
                      <Text className={`font-medium text-[16px] leading-6 ${isLostMode ? 'text-[#8B3A3A]' : 'text-[#000000]'}`}>
                        Lost Pet Mode
                      </Text>
                      <Text className={`text-[14px] mt-0.5 font-light ${isLostMode ? 'text-[#8B3A3ACC]' : 'text-gray-400'}`}>
                        {isLostMode ? (
                          <Text>
                            {isVi ? "Bật" : "Turn on"} •{' '}
                            <Text
                              className="underline font-medium"
                              onPress={() => {
                                // Ưu tiên lấy reportId của lần quét gần nhất
                                // Nếu chưa có ai quét (chỉ mới báo mất), thì backend của bạn CẦN TRẢ VỀ reportId của chính event báo mất đó
                                const reportId = petData?.latestReportId || petData?.tags?.[0]?.latestReportId;

                                if (reportId) {
                                  router.push({
                                    pathname: '/tag-report-detail',
                                    params: {
                                      reportId: reportId,
                                      openFrom: 'profile'
                                    }
                                  });
                                } else {
                                  Alert.alert("Notice", "Your pet hasn't been scanned by anyone yet. Keep your phone nearby for notifications!");
                                }
                              }}
                            >
                              See Pet's Activity
                            </Text>
                          </Text>
                        ) : (
                          isVi ? "Tắt • Bé đang an toàn" : "Turn Off • Pet is save"
                        )}
                      </Text>
                    </View>
                  </View>

                  <View className="justify-center z-10">
                    <Switch
                      disabled={isTogglingLostMode}
                      trackColor={{ false: '#E5E7EB', true: '#8B3A3A' }}
                      thumbColor={'#FFFFFF'}
                      ios_backgroundColor="#E5E7EB"
                      onValueChange={handleLostModeToggle}
                      value={isLostMode}
                      style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }}
                    />
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push({ pathname: '/(tabs)/scan', params: { linkPetId: petId } })}
              className="mx-[20px] mb-8 flex-row bg-[#FDFCE8] border border-[#FDF094] rounded-[20px] p-[17px]"
            >
              <View className="mr-2">
                <Image
                  source={require('../assets/icon/scan-icon.png')}
                  style={{ width: 15, height: 15 }}
                  resizeMode="cover"
                />
              </View>
              <View className="flex-1">
                <Text className="text-[16px] font-bold text-[#AC8530] mb-1">QR Code Required</Text>
                <Text className="text-[14px] text-[#AC8530] leading-5">
                  Scan QR tag to enable PawHistory & Lost Pet functions.
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* --- PET INFORMATION CARD --- */}
          <View className="mx-[20px] mb-8 ">
            <View className=''>
              <Text className="font-semibold text-[16px] text-black mb-3">Pet Information</Text>
            </View>
            <View className='bg-white rounded-[24px] p-6 border border-gray-200'>

              <InfoRow
                label1={isVi ? "Giới tính" : "Gender"}
                value1={
                  petData.gender
                    ? (['nam', 'male'].includes(petData.gender.trim().toLowerCase())
                      ? (isVi ? "Đực" : "Male")
                      : ['nữ', 'nu', 'female'].includes(petData.gender.trim().toLowerCase())
                        ? (isVi ? "Cái" : "Female")
                        : (petData.gender.charAt(0).toUpperCase() + petData.gender.slice(1).toLowerCase()))
                    : (isVi ? "Chưa cập nhật" : "Not updated")
                }
                label2={isVi ? "Triệt sản" : "Sterilized"}
                value2={
                  petData.isSpayedNeutered === true ? (isVi ? 'Có' : 'Yes') :
                    petData.isSpayedNeutered === false ? (isVi ? 'Không' : 'No') :
                      (isVi ? 'Chưa cập nhật' : 'Not updated')
                }
              />
              <InfoRow
                label1="Breed"
                value1={petData.breed || 'Not updated'}
                label2="Color" value2={petData.color || 'Not updated'}
              />
              <InfoRow2
                label1="Birthday"
                value1={
                  petData.dob
                    ? new Date(petData.dob).toLocaleDateString('en-GB')
                    : (petData.age ? `${petData.age} tuổi` : 'Not updated')
                }
                label2="Weight" value2={petData.weight != null ? `${petData.weight} kg` : 'Not updated'}
              />
              <View className="h-[1px] bg-gray-200 w-full mb-5" />
              <Text className="text-black text-[16px] font-medium mb-2">Notes</Text>
              <Text className="text-[#8E8E93] text-[14px] leading-5">
                {petData.description || 'Loves Belly rubs and playing fetch. Very friendly with children'}
              </Text>

            </View>
          </View>

          {/* --- OWNER / SHELTER INFORMATION CARD --- */}
          <View className="mx-[20px] mb-8">
            <Text className="font-semibold text-[16px] text-black mb-3">
              {isShelter ? 'Shelter Information' : 'Owner Information'}
            </Text>

            <View className="bg-white rounded-[20px] border border-gray-200 px-5">
              <OwnerRow
                label="Full Name"
                value={displayContactName}
              />
              <OwnerRow
                label="Phone"
                value={displayContactPhone}
              />
              <OwnerRow
                label="Address"
                value={displayContactAddress}
                isLast={true}
              />
            </View>
          </View>

          <View className="mx-[20px] mb-8">
            <View className="flex-row justify-between items-center mb-5">
              <View className="flex-row items-center">
                <Text className="text-[16px] font-semibold text-black">Paw History</Text>
                <Text className="text-[16px] font-semibold text-[#D1D1D6] mx-2">|</Text>
                <Text className="text-[16px] font-regular text-[#8E8E93]">
                  {isVi ? "Hành trình" : "Journey"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={toggleHistory}
                activeOpacity={0.6}
                className="flex-row items-center px-3 py-1.5 rounded-full"
              >
                <Text className="text-[13px] text-[#F2A465] font-medium mr-1">{showHistory ? 'Hide' : 'View'}</Text>
                <Feather name={showHistory ? "chevron-up" : "chevron-down"} size={16} color="#F2A465" />
              </TouchableOpacity>
            </View>

            {showHistory && (
              <View className="p-[20px] border border-[#E5E5EA] rounded-[20px] bg-white">

                {combinedHistory.map((item: any, index: number) => {
                  const isLastItem = index === combinedHistory.length - 1;
                  const uiConfig = getHistoryUIConfig(item.type);
                  const formattedDate = new Date(item.date).toLocaleDateString('en-GB');

                  return (
                    <View key={item.id} className="flex-row">
                      {/* Cột Icon Timeline */}
                      {/* Cột Icon Timeline */}
                      <View className="items-center mr-4 w-[32px]">
                        <View
                          className="w-[32px] h-[32px] rounded-full items-center justify-center z-10"
                          style={{ backgroundColor: uiConfig.bgColor }}
                        >
                          <FontAwesome5 name={uiConfig.icon} size={13} color={uiConfig.color} />
                        </View>

                        {/* SỬA LẠI LINE Ở ĐÂY: Hiển thị nét đứt nếu isPending */}
                        {/* SỬA LẠI LINE Ở ĐÂY: Custom nét đứt thủ công để tuỳ chỉnh độ mau/thưa */}
                        {!isLastItem && (
                          item.isPending ? (
                            // NÉT ĐỨT (PENDING)
                            <View className="flex-1 my-1 overflow-hidden w-[2px] items-center">
                              {/* Thêm absolute để các vạch không đẩy khung dài ra */}
                              <View className="absolute top-0 bottom-0 left-0 right-0">
                                {Array.from({ length: 25 }).map((_, i) => (
                                  <View
                                    key={i}
                                    style={{
                                      width: 2,
                                      height: 4, // Chiều dài 1 gạch
                                      backgroundColor: uiConfig.color,
                                      marginBottom: 4, // Khoảng cách thưa
                                    }}
                                  />
                                ))}
                              </View>
                            </View>
                          ) : (
                            // NÉT LIỀN (BÌNH THƯỜNG)
                            <View
                              className="flex-1 my-1"
                              style={{
                                width: 2,
                                backgroundColor: uiConfig.color,
                              }}
                            />
                          )
                        )}
                      </View>

                      {/* Nội dung Paw History */}
                      <View className={`flex-1 pt-1 ${!isLastItem ? 'pb-6' : ''}`}>
                        <View className="flex-row justify-between items-start">

                          {/* Title + icon chấm than gói chung 1 khối, được phép wrap xuống dòng cùng nhau */}
                          <View className="flex-1 flex-row flex-wrap items-center pr-2">
                            <Text className="text-[16px] font-medium text-black">
                              {item.displayTitle || item.title}
                              {item.isPending && (
                                <Text> </Text>
                              )}
                              {item.isPending && (
                                <Text
                                  suppressHighlighting={true}
                                  onPress={(e) => {
                                    const { pageX, pageY } = e.nativeEvent;
                                    // pageX/pageY ở đây là điểm chạm, nhưng vì icon rất nhỏ (16px)
                                    // và luôn đứng độc lập cuối dòng, sai số không đáng kể về mặt thị giác
                                    handleToggleTooltip(item.id, pageX, pageY);
                                  }}
                                >
                                  <Feather
                                    name="alert-circle"
                                    size={16}
                                    color="#BBB4B5"
                                    style={{ transform: [{ rotate: '180deg' }] }}
                                  />
                                </Text>
                              )}
                            </Text>
                          </View>

                          {/* Date đứng riêng, không co giãn, không bị title đẩy */}
                          <Text className="text-[13px] text-[#8E8E93] font-regular" style={{ flexShrink: 0 }}>
                            {formattedDate}
                          </Text>
                        </View>

                        {/* Đổi màu description thành màu cam nếu đang pending */}
                        <Text className="text-[13px] mt-1 leading-[18px]">
                          {item.displayDescription}
                        </Text>
                      </View>
                    </View>
                  );
                })}

                {(!petData?.pawHistory || petData.pawHistory.length === 0) && (
                  <Text className="text-center text-gray-400 py-4">No history available.</Text>
                )}

                <View className='flex-row py-[8px] items-center justify-center gap-2 mt-4 bg-[#F5F5F5] rounded-[8px]'>
                  <Image source={require('../assets/icon/lock.png')} style={{ width: 12, height: 12 }} resizeMode="cover" />
                  <Text className='font-regular text-[12px] text-[#8E8E93]'>This timeline is auto-generated and append-only.</Text>
                </View>
              </View>
            )}
          </View>

          {/* --- VACCINATION & MEDICAL RECORD SECTION --- */}
          <View className="mx-[20px] mb-8">
            <View className="flex-row justify-between items-center mb-[20px]">
              <Text className="text-[16px] font-semibold text-[#111827] tracking-[0.06px]">
                {isVi ? 'Hồ sơ y tế' : 'Medical Records'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  router.push({
                    pathname: '/edit-pet' as any,
                    params: {
                      id: petId,
                      openMedicalModal: '1',
                    },
                  });
                }}
                className="bg-[#FFF8F0] px-4 py-2 rounded-full border border-[#E89B5A]/30"
              >
                <Text className="text-[#E89B5A] font-medium text-[13px]">{isVi ? 'Thêm hồ sơ' : 'Add Record'}</Text>
              </TouchableOpacity>
            </View>

            {petData?.medicalRecords && petData.medicalRecords.length > 0 ? (
              <View className="flex-col gap-3">
                {petData.medicalRecords.map((record: any, index: number) => {
                  const isPending = record.verificationStatus === 'PENDING' || !record.verificationStatus;
                  const iconConfig = getMedicalRecordIconConfig(record.type);

                  const formattedRecordDate = record.recordDate
                    ? new Date(record.recordDate).toLocaleDateString(isVi ? 'vi-VN' : 'en-US')
                    : '';

                  const formattedNextDueDate = record.nextDueDate
                    ? new Date(record.nextDueDate).toLocaleDateString(isVi ? 'vi-VN' : 'en-US')
                    : '';

                  const shouldShowNextDueDate = record.hasNextDueDate && !!record.nextDueDate;

                  return (
                    <View key={record.id || index} className="border border-[#E5E5E5] rounded-[16px] p-3 flex-row items-start bg-[#FFFF] shadow-sm shadow-orange-100/50">

                      {/* ICON TRUNG TÍNH: border ghi đậm, nền ghi nhạt, không tô màu theo loại */}
                      <View className={`w-[30px] h-[30px] rounded-[100px] items-center justify-center`}>
                        <Image
                          source={require('../assets/icon/vacc-icon-report.png')}
                          style={{ width: 30, height: 30 }}
                          resizeMode="contain"
                        />
                      </View>

                      <View className="flex-1 mx-3">
                        <View className="flex-row justify-between items-center">
                          {/* TITLE + CHIP nằm chung 1 khối, tự wrap xuống dòng cùng nhau nếu tên dài */}
                          <View className="flex-1 flex-row flex-wrap items-center pr-2">
                            <Text className="text-[14px] text-[#000000] font-medium leading-[16px] mr-2" numberOfLines={1}>
                              {getSafeBilingualText(record.recordName, isVi)}
                            </Text>

                            <View
                              className="flex-row items-center px-2 py-[3px] rounded-full"
                              style={{ backgroundColor: isPending ? '#FBF7EB' : '#EBFFE2', borderColor: isPending ? "#E8A53C/25" : "#D1F5BF" }}
                            >
                              <Feather
                                name={isPending ? 'info' : 'check-circle'}
                                size={10}
                                color={isPending ? '#E8A53C' : '#77C852'}
                              />
                              <Text
                                className="text-[10px] font-medium ml-1"
                                style={{ color: isPending ? '#E8A53C' : '#77C852' }}
                              >
                                {isPending
                                  ? (isVi ? 'Đang xác minh' : 'Reviewing')
                                  : (isVi ? 'Đã xác minh' : 'Verified')}
                              </Text>
                            </View>
                          </View>

                          {/* NÚT MORE OPTIONS: hiện khi có ảnh hoặc record đang pending để có thể Edit Record */}
                          {((record.images && record.images.length > 0) || isPending) && (
                            <TouchableOpacity
                              onPress={(e) => {
                                e.stopPropagation();
                                const { pageY } = e.nativeEvent;
                                const imageList = Array.isArray(record.images) ? record.images.filter(Boolean) : [];
                                setMenuPosition({ top: pageY + 10, right: 32 });
                                setSelectedVaccineIndex(index);
                                setCurrentImageList(imageList);
                                setCurrentImageIndex(0);
                                setShowVaccineMenu(true);
                              }}

                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                              <Image source={require('../assets/icon/more-vertical.png')} style={{ width: 11.1, height: 11.1 }} resizeMode="cover" />
                            </TouchableOpacity>
                          )}
                        </View>

                        <Text className="text-[12px] text-[#8E8E93] tracking-[0.5px]">
                          {isVi ? 'Loại:' : 'Type:'} {record.type} | {isVi ? 'Ngày:' : 'Date:'} {new Date(record.recordDate).toLocaleDateString('en-GB')}
                        </Text>
                        <Text className="text-[12px] text-[#E89B5A] tracking-[0.5px] mt-1">
                          {isVi ? 'Lịch tiếp theo' : 'Next due date'}: {formattedNextDueDate}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View className="bg-white border border-dashed border-[#E5E5E5] rounded-[12px] py-5 items-center justify-center">
                <View className="rounded-full items-center justify-center mb-2">
                  <Image source={require('../assets/icon/file.png')} style={{ width: 17, height: 17 }} resizeMode="cover" />
                </View>
                <Text className="text-[16px] text-black font-medium mb-2">{isVi ? "Chưa có hồ sơ y tế" : "No medical records yet"}</Text>
                <Text className="text-[14px] text-[#A9ACB4] font-regular">{isVi ? "Các hồ sơ được thêm vào sẽ hiển thị ở đây." : "Records added to PawLife will be shown here."}</Text>
              </View>
            )}
          </View>

          {/* --- ACTION BUTTONS --- */}
          <View className="mx-[20px] gap-3">
            <TouchableOpacity
              className="w-full bg-[#E89B5A] py-5 rounded-[16px] shadow-md shadow-orange-200 items-center overflow-hidden"
              onPress={() => router.push(`/edit-pet?id=${petId}`)}
            >
              <Text className="text-white font-semibold text-[16px]">Edit Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (hasValidQRCode) {
                  router.push(`/view-qr-code?id=${petId}`);
                } else {
                  router.push({ pathname: '/(tabs)/scan', params: { linkPetId: petId } });
                }
              }}
              activeOpacity={0.7}
              className="w-full py-5 rounded-[16px] items-center bg-white border border-[#FF9C56]"
            >
              <View className="flex-row items-center gap-2">
                <Text className="font-medium text-[16px] text-[#E89B5A]">
                  {hasValidQRCode ? "View QR Code" : "Scan QR Code"}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              className="w-full py-4 rounded-full items-center mt-2 active:opacity-70"
              onPress={handleRemovePet}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator color="#FF0000" size="small" />
              ) : (
                <Text className="text-red-500 font-ligter text-[16px]">Remove Pet</Text>
              )}
            </TouchableOpacity>
          </View>

        </ScrollView>
      </SafeAreaView>

      {/* --- LOST MODE TOGGLE MODAL --- */}
      <Modal
        visible={showLostModeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLostModeModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/60 px-5">
          <View className="bg-white rounded-[24px] p-6 w-full items-center shadow-xl">

            <View className={`w-16 h-16 rounded-full items-center justify-center mb-4 border-[4px] ${pendingLostMode ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'
              }`}>
              <Feather
                name={pendingLostMode ? "alert-triangle" : "check-circle"}
                size={32}
                color={pendingLostMode ? "#EF4444" : "#10B981"}
              />
            </View>

            <Text className="text-xl font-bold text-gray-900 text-center mb-2">
              {pendingLostMode ? t('lostMode.titleOn') : t('lostMode.titleOff')}
            </Text>

            <Text className="text-gray-500 text-center text-sm mb-8 leading-5 px-2">
              {pendingLostMode ? t('lostMode.descOn') : t('lostMode.descOff')}
            </Text>

            <View className="flex-row w-full gap-3">
              <TouchableOpacity
                className="flex-1 bg-gray-100 py-3.5 rounded-full items-center"
                onPress={() => setShowLostModeModal(false)}
              >
                <Text className="text-gray-600 font-bold text-base">
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`flex-1 py-3.5 rounded-full items-center shadow-sm ${pendingLostMode ? 'bg-[#EF4444] shadow-red-200' : 'bg-[#10B981] shadow-green-200'
                  }`}
                onPress={executeToggleMode}
              >
                <Text className="text-white font-bold text-base">
                  {pendingLostMode ? t('lostMode.confirmOn') : t('lostMode.confirmOff')}
                </Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

      {/* --- MENU MODAL --- */}
      {/* --- MENU MODAL --- */}
      <Modal
        visible={showVaccineMenu}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setShowVaccineMenu(false);
          setSelectedVaccineIndex(null);
        }}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={() => {
            setShowVaccineMenu(false);
            setSelectedVaccineIndex(null);
          }}
        >
          <View
            className="absolute bg-white rounded-xl border border-gray-100 w-44"
            style={{
              top: menuPosition.top,
              right: menuPosition.right,
              elevation: 8,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 10
            }}
          >
            {currentImageList.length > 0 && (
              <>
                <TouchableOpacity
                  className="flex-row items-center px-4 py-3"
                  activeOpacity={0.6}
                  onPress={() => {
                    setShowVaccineMenu(false);
                    if (currentImageList.length > 0) {
                      setIsImageViewerVisible(true);
                    }
                  }}
                >
                  <Text className="text-[14px] text-gray-700 ml-3 font-medium">
                    {isVi ? 'Xem hồ sơ' : 'View record'}
                  </Text>
                </TouchableOpacity>

              </>
            )}

            {!selectedMedicalRecordIsPending && (
              <TouchableOpacity
                className="flex-row items-center px-4 py-3 border-t border-gray-50"
                activeOpacity={0.6}
                onPress={() => {
                  // TODO: handle report record
                }}
              >
                <Text className="text-[14px] text-red-600 ml-3 font-medium">
                  {isVi ? 'Báo cáo' : 'Report'}
                </Text>
              </TouchableOpacity>
            )}

            {selectedMedicalRecordIsPending && (
              <>
                <TouchableOpacity
                  className={`flex-row items-center px-4 py-3 ${currentImageList.length > 0 ? 'border-t border-gray-50' : ''}`}
                  activeOpacity={0.6}
                  onPress={() => {
                    // TODO: handle edit medical record
                  }}
                >
                  <Text className="text-[14px] text-gray-700 ml-3 font-medium">
                    {isVi ? 'Sửa hồ sơ' : 'Edit Record'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`flex-row items-center px-4 py-3 ${currentImageList.length > 0 ? 'border-t border-gray-50' : ''}`}
                  activeOpacity={0.6}
                  onPress={() => {
                    // TODO: handle delete medical record
                  }}
                >
                  <Text className="text-[14px] text-red-600 ml-3 font-medium">
                    {isVi ? 'Xóa' : 'Delete'}
                  </Text>
                </TouchableOpacity>
              </>

            )}

          </View>
        </TouchableOpacity>
      </Modal>

      {/* ========================================================= */}
      {/* IN-APP FULLSCREEN IMAGE VIEWER MODAL (CÓ USE SafeAreaInsets CỦA IOS) */}
      {/* ========================================================= */}
      <Modal
        visible={isImageViewerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsImageViewerVisible(false)}
      >
        <View className="flex-1 bg-black/95 justify-center items-center">
          <View
            className="absolute top-0 w-full z-50 flex-row justify-between items-center px-4 pb-4"
            style={{
              paddingTop: Math.max(insets.top, 20),
              backgroundColor: 'rgba(0,0,0,0.3)'
            }}
          >
            <Text className="text-white font-medium text-lg drop-shadow-md">
              {isVi ? 'Hồ sơ y tế' : 'Vaccination Record'}
              {currentImageList.length > 1 ? `  ${currentImageIndex + 1}/${currentImageList.length}` : ''}
            </Text>
            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                className="p-2.5 bg-white/20 rounded-full"
                onPress={async () => {
                  const currentUri = currentImageList[currentImageIndex];
                  if (currentUri) {
                    await handleDownloadImage(currentUri, `medical_record_${Date.now()}.jpg`);
                  }
                }}
              >
                <Feather name="download" size={22} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                className="p-2.5 bg-white/20 rounded-full"
                onPress={() => setIsImageViewerVisible(false)}
              >
                <Feather name="x" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {currentImageList.length > 0 && (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentOffset={{ x: currentImageIndex * Dimensions.get('window').width, y: 0 }}
              onMomentumScrollEnd={(e) => {
                const newIndex = Math.round(
                  e.nativeEvent.contentOffset.x / Dimensions.get('window').width
                );
                setCurrentImageIndex(newIndex);
              }}
              style={{ width: '100%' }}
            >
              {currentImageList.map((uri, idx) => (
                <View
                  key={idx}
                  style={{ width: Dimensions.get('window').width, justifyContent: 'center', alignItems: 'center' }}
                >
                  <Image
                    source={{ uri }}
                    style={{ width: '100%', height: '80%' }}
                    resizeMode="contain"
                  />
                </View>
              ))}
            </ScrollView>
          )}

          {/* Chấm tròn báo trang hiện tại, chỉ hiện khi có >1 ảnh */}
          {currentImageList.length > 1 && (
            <View className="absolute bottom-10 flex-row gap-2">
              {currentImageList.map((_, idx) => (
                <View
                  key={idx}
                  className={`w-2 h-2 rounded-full ${idx === currentImageIndex ? 'bg-white' : 'bg-white/30'}`}
                />
              ))}
            </View>
          )}
        </View>
      </Modal>
      {/* --- PAW HISTORY PENDING TOOLTIP (popup luôn căn giữa ngay trên icon, mũi tên cố định ở giữa popup) --- */}
      {activeTooltipId !== null && (
        <Animated.View
          onTouchStart={(e) => e.stopPropagation()}
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            top: tooltipAnchor.y - 95,
            left: tooltipAnchor.x - 85, // 85 = nửa chiều rộng popup (170/2), để icon luôn nằm giữa popup
            width: 170,
            backgroundColor: 'white',
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.12,
            shadowRadius: 4,
            elevation: 8,
            zIndex: 999,

            opacity: tooltipAnim,
            transform: [
              {
                translateY: tooltipAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              },
            ],
          }}
        >
          <Text className="text-[12px] text-[#333333] leading-[18px] text-left">
            {isVi
              ? "Hồ sơ sẽ được thêm vào hành trình sau khi xác minh hoàn tất."
              : "The record will be added to the timeline once verification is complete."}
          </Text>

          {/* Mũi tên tam giác chỉ xuống - LUÔN nằm chính giữa popup (170/2 = 85) */}
          <View
            style={{
              position: 'absolute',
              bottom: -6,
              left: 85,
              marginLeft: -6, // Kéo lùi lại bằng viền border (6px) để đỉnh nhọn nhắm thẳng tâm
              width: 0,
              height: 0,
              borderLeftWidth: 6,
              borderRightWidth: 6,
              borderTopWidth: 6,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderTopColor: '#FFFFFF',
            }}
          />
        </Animated.View>
      )}
    </View>
  );
}