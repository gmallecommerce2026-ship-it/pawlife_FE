import { Text } from '@/components/AppText';
import { useLanguage } from '@/contexts/LanguageContext';
import { Feather, FontAwesome5, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, LayoutAnimation, Modal, Platform, ScrollView, Switch, TouchableOpacity, UIManager, View } from 'react-native';
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

export default function PetProfileDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const petId = params.id as string;
  const insets = useSafeAreaInsets();

  // --- STATE ---
  const [petData, setPetData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLostMode, setIsLostMode] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingLostMode, setIsTogglingLostMode] = useState(false);
  const [showLostModeModal, setShowLostModeModal] = useState(false);
  const [pendingLostMode, setPendingLostMode] = useState<boolean>(false);
  const [showVaccineMenu, setShowVaccineMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 28 });
  const { t } = useLanguage();
  const [selectedVaccineIndex, setSelectedVaccineIndex] = useState<number | null>(null);

  // State quản lý việc xem ảnh full màn hình trong App
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [currentImageToView, setCurrentImageToView] = useState<string | null>(null);

  const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1552053831-71594a27632d?q=80&w=600&auto=format&fit=crop';
  const displayAvatar = petData?.avatarUrl || petData?.images?.[0]?.url || FALLBACK_AVATAR;
  
  const getHistoryUIConfig = (type: string) => {
    switch(type) {
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

  // --- FETCH DATA TỪ API ---
  useFocusEffect(
    useCallback(() => {
      const fetchPetDetail = async () => {
        if (!petId) return;
        try {
          setIsLoading(true);
          const data = await petService.getPetById(petId);
          setPetData(data);

          const isCurrentlyLost = data.tags?.some((tag: any) => tag.status === 'LOST');
          setIsLostMode(!!isCurrentlyLost);

          if (data.status === 'LOST') {
            setIsLostMode(true);
          }
        } catch (error) {
          console.error("Error when loading pet information:", error);
          Alert.alert("Error", "Unable to load pet information. Please try again.");
        } finally {
          setIsLoading(false);
        }
      };

      fetchPetDetail();
    }, [petId])
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
          
          petShelterName: petData?.contactName || ownerInfo?.name || 'Chưa cập nhật', 
          petShelterPhone: petData?.contactPhone || ownerInfo?.phone || 'Chưa cập nhật',
          petShelterAddress: petData?.contactAddress || ownerInfo?.address || 'Chưa cập nhật'
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

  const toggleHistory = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowHistory(!showHistory);
  };

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
    return (
      <View className="flex-1 justify-center items-center bg-[#FAFAFA]">
        <ActivityIndicator size="large" color="#ffa053" />
        <Text className="mt-4 text-gray-500">Loading pet information...</Text>
      </View>
    );
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
  const displayContactName = petData.contactName || ownerInfo.name || 'Chưa cập nhật';
  const displayContactPhone = petData.contactPhone || ownerInfo.phone || 'Chưa cập nhật';
  const displayContactAddress = petData.contactAddress || ownerInfo.address || 'Chưa cập nhật';

  const displayId = petData.code || petData.id?.substring(0, 8).toUpperCase() || petId.substring(0, 8).toUpperCase();
  const hasValidQRCode = !!petData.qrCodeUrl && petData.qrVerificationStatus === 'VERIFIED';
  const handleDownloadImage = async (url: string, fileName: string) => {
  try {
    // Tùy chọn hiển thị loading spinner ở đây
    
    // 1. Tạo đường dẫn lưu file tạm trong máy
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;
    
    // 2. Tải file từ Cloudflare R2 / Server về máy
    const downloadRes = await FileSystem.downloadAsync(url, fileUri);
    
    // 3. Kiểm tra xem thiết bị có hỗ trợ chia sẻ không
    const canShare = await Sharing.isAvailableAsync();
    
    if (canShare) {
      // 4. Mở Share Sheet mặc định của iOS/Android
      // Người dùng có thể chọn "Save Image" để lưu vào máy
      await Sharing.shareAsync(downloadRes.uri, {
        mimeType: 'image/jpeg', // Chỉnh sửa chuẩn theo loại file
        dialogTitle: 'Tải xuống hình ảnh tiêm chủng',
      });
    } else {
      Alert.alert('Lỗi', 'Thiết bị của bạn không hỗ trợ tính năng chia sẻ/lưu tệp.');
    }
  } catch (error) {
    console.error("Lỗi tải file:", error);
    Alert.alert('Lỗi', 'Không thể tải xuống tệp này lúc này.');
  }
};
  return (
    <View className="flex-1 bg-[#FFFFFF]">
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
          <Text className="text-[18px] font-semibold text-[#000000]">{petData.name} Profile</Text>
          <View className="w-10" />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>

          {/* --- AVATAR & ID SECTION --- */}
          <View className="items-center mt-6 mb-[12px]">
            <View className="w-32 h-32 rounded-full bg-[#FFFFFF] border border-gray-200 items-center justify-center overflow-hidden shadow-sm">
              <Image
                source={{ uri: displayAvatar }}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
            <Text className="text-[18px] font-semibold text-gray-900 mt-[23px]">{petData.name}</Text>

            {/* Pet ID Tag */}
            <View className="mt-[12px] flex-row items-center gap-2">
              <Text className="text-[#B8B8B8] font-normal text-[14px] tracking-wider">
                ID: {displayId}
              </Text>
            </View>
          </View>

          {/* --- LOST MODE / QR REQUIRED SECTION --- */}
          {hasValidQRCode ? (
            <View>
              <View>
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
              </View>
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
                        {isLostMode ? "Active - See Pet's Activity" : "Inactive - Pet is safe"}
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
                label1="Gender" value1={petData.gender || 'Chưa cập nhật'}
                label2="Sterilized" value2={
                  petData.isSpayedNeutered === true ? 'Yes' : 
                  petData.isSpayedNeutered === false ? 'No' : 
                  'Chưa cập nhật'
                }
              />
              <InfoRow
                label1="Breed"
                value1={petData.breed || 'Chưa cập nhật'}
                label2="Color" value2={petData.color || 'Chưa cập nhật'}
              />
              <InfoRow2
                label1="Birthday"
                value1={
                  petData.dob
                    ? new Date(petData.dob).toLocaleDateString('en-GB')
                    : (petData.age ? `${petData.age} tuổi` : 'Chưa cập nhật')
                }
                label2="Weight" value2={petData.weight + ' kg' || 'Chưa cập nhật'}
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
                label="Name"
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
              <Text className="text-[16px] font-semibold text-black">Paw History</Text>
              <TouchableOpacity
                onPress={toggleHistory}
                activeOpacity={0.6}
                className="flex-row items-center px-3 py-1.5 rounded-full"
              >
                <Text className="text-[13px] text-[#F2A465] font-medium mr-1">{showHistory ? 'Hide' : 'View'}</Text>
                <Feather name={showHistory ? "chevron-up" : "chevron-down"} size={16} color="#F2A465" />
              </TouchableOpacity>
            </View>

            {showHistory && petData?.pawHistory && (
              <View className="p-[20px] border border-[#E5E5EA] rounded-[20px] bg-white">
                {petData.pawHistory.map((item: any, index: number) => {
                  const isLastItem = index === petData.pawHistory.length - 1;
                  const uiConfig = getHistoryUIConfig(item.type);
                  const formattedDate = new Date(item.date).toLocaleDateString('en-GB');

                  return (
                    <View key={item.id} className="flex-row">
                      <View className="items-center mr-4 w-[32px]">
                        <View
                          className="w-[32px] h-[32px] rounded-full items-center justify-center z-10"
                          style={{ backgroundColor: uiConfig.bgColor }}
                        >
                          <FontAwesome5 name={uiConfig.icon} size={13} color={uiConfig.color} />
                        </View>

                        {!isLastItem && (
                          <View
                            className="w-[2px] flex-1 my-1"
                            style={{ backgroundColor: uiConfig.color }}
                          />
                        )}
                      </View>

                      <View className={`flex-1 pt-1 ${!isLastItem ? 'pb-6' : ''}`}>
                        <View className="flex-row justify-between items-start">
                          <Text className="text-[16px] font-medium text-black">
                            {item.title}
                          </Text>
                          <Text className="text-[13px] text-[#8E8E93] font-regular">
                            {formattedDate}
                          </Text>
                        </View>
                        <Text className="text-[13px] text-[#8E8E93] mt-1 leading-[18px]">
                          {item.description}
                        </Text>
                      </View>
                    </View>
                  );
                })}

                {petData.pawHistory.length === 0 && (
                  <Text className="text-center text-gray-400 py-4">No history available.</Text>
                )}

                <View className='flex-row py-[8px] items-center justify-center gap-2 mt-4 bg-[#F5F5F5] rounded-[8px]'>
                  <Image
                    source={require('../assets/icon/lock.png')}
                    style={{ width: 12, height: 12 }}
                    resizeMode="cover"
                  />
                  <Text className='font-regular text-[12px] text-[#8E8E93]'>This timeline is auto-generated and append-only.</Text>
                </View>
              </View>
            )}
          </View>

          {/* ========================================================= */}
          {/* --- VACCINATION RECORD SECTION (SỬA LẠI ICON FILE.PNG) --- */}
          {/* ========================================================= */}
          <View className="mx-[20px] mb-8">
            <Text className="font-semibold text-[16px] text-black mb-3">Vaccination Record</Text>
            
            {petData?.vaccinationRecordUrls && petData.vaccinationRecordUrls.length > 0 ? (
              <View className="flex-col gap-3">
                {petData.vaccinationRecordUrls.map((url: string, index: number) => (
                  <View key={index} className="border border-[#E5E5E5] rounded-[16px] p-3 flex-row items-center bg-[#FFFF] shadow-sm shadow-orange-100/50">
                    
                    {/* TRẢ LẠI ICON FILE NHƯ CŨ */}
                    <Image source={require('../assets/icon/file.png')} style={{ width: 28, height: 28 }} resizeMode="cover" />

                    <View className="flex-1 mx-3">
                      <View className="flex-row justify-between items-center">
                        <Text className="text-[12px] text-[#000000] font-medium leading-[16px]" numberOfLines={1}>
                          Vaccination_Record_{index + 1}.jpg
                        </Text>
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            const { pageY } = e.nativeEvent;
                            setMenuPosition({ top: pageY + 10, right: 32 });
                            setSelectedVaccineIndex(index); 
                            setShowVaccineMenu(true);
                          }}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Image source={require('../assets/icon/more-vertical.png')} style={{ width: 10, height: 10 }} resizeMode="cover" />
                        </TouchableOpacity>
                      </View>
                      <View className="flex-row items-center mt-1.5">
                        <Text className="text-[10px] text-[#8E8E93] tracking-[0.5px] leading-[13px]">
                          Submitted on {new Date(petData.createdAt || Date.now()).toLocaleDateString('en-GB')}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View className="bg-white border border-dashed border-[#E5E5E5] rounded-[12px] py-5 items-center justify-center">
                <View className="rounded-full items-center justify-center mb-2">
                  <Image source={require('../assets/icon/file.png')} style={{ width: 17, height: 17 }} resizeMode="cover" />
                </View>
                <Text className="text-[16px] text-black font-medium mb-2">No vaccine records yet</Text>
                <Text className="text-[14px] text-[#A9ACB4] font-regular">Records added to PawLife will be shown here.</Text>
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
      <Modal
        visible={showVaccineMenu}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowVaccineMenu(false)}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={() => setShowVaccineMenu(false)}
        >
          <View
            className="absolute bg-white rounded-xl border border-gray-100 w-36"
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
            {/* View Image trong app */}
            <TouchableOpacity
              className="flex-row items-center px-4 py-3"
              activeOpacity={0.6}
              onPress={() => {
                setShowVaccineMenu(false);
                if (selectedVaccineIndex !== null && petData?.vaccinationRecordUrls) {
                  const urlToView = petData.vaccinationRecordUrls[selectedVaccineIndex];
                  if (urlToView) {
                    setCurrentImageToView(urlToView);
                    setIsImageViewerVisible(true);
                  }
                }
              }}
            >
              <Feather name="eye" size={16} color="#374151" />
              <Text className="text-[14px] text-gray-700 ml-3 font-medium">View image</Text>
            </TouchableOpacity>

            {/* Download/Open external link */}
            <TouchableOpacity
  className="flex-row items-center px-4 py-3 border-t border-gray-50"
  activeOpacity={0.6}
  onPress={async () => {
    setShowVaccineMenu(false); 
    
    if (selectedVaccineIndex !== null && petData?.vaccinationRecordUrls) {
      const urlToDownload = petData.vaccinationRecordUrls[selectedVaccineIndex];
      
      if (urlToDownload) {
        try {
          // Ép kiểu "as any" để VS Code không báo lỗi TS 2339 / 2305 nữa
          const FS = FileSystem as any;
          
          // Lấy thư mục cache (bộ nhớ tạm), nếu lỗi thì fallback về thư mục document
          const directory = FS.cacheDirectory || FS.documentDirectory;
          const fileName = `vaccination_record_${selectedVaccineIndex + 1}.jpg`;
          const fileUri = `${directory}${fileName}`;
          
          // Tải file về máy
          const downloadRes = await FS.downloadAsync(urlToDownload, fileUri);
          
          // Kiểm tra khả năng mở Share Sheet của máy
          const canShare = await Sharing.isAvailableAsync();
          if (canShare) {
            await Sharing.shareAsync(downloadRes.uri, {
              mimeType: 'image/jpeg',
              dialogTitle: 'Lưu hoặc chia sẻ ảnh tiêm chủng',
            });
          } else {
            Alert.alert("Thông báo", "Thiết bị không hỗ trợ chia sẻ file.");
          }
        } catch (error) {
          console.error("Lỗi tải file:", error);
          Alert.alert("Lỗi", "Không thể tải file lúc này. Vui lòng thử lại sau.");
        }
      }
    }
  }}
>
  <Feather name="download" size={16} color="#374151" />
  <Text className="text-[14px] text-gray-700 ml-3 font-medium">Download</Text>
</TouchableOpacity>
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
              Vaccination Record
            </Text>
            <TouchableOpacity
              className="p-2.5 bg-white/20 rounded-full"
              onPress={() => setIsImageViewerVisible(false)}
            >
              <Feather name="x" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {currentImageToView && (
            <Image
              source={{ uri: currentImageToView }}
              style={{ width: '100%', height: '80%' }}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

    </View>
  );
}