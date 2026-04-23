import { Text } from '@/components/AppText';
import { useLanguage } from '@/contexts/LanguageContext';
import { Feather, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QrCodeIcon } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, LayoutAnimation, Modal, Platform, ScrollView, Switch, TouchableOpacity, UIManager, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { petService } from '../services/petService';

// Kích hoạt LayoutAnimation cho Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function PetProfileDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const petId = params.id as string;
  
  // --- STATE ---
  const [petData, setPetData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLostMode, setIsLostMode] = useState(false);
  const [isAddressVisible, setIsAddressVisible] = useState(true);
  const [expandHistory, setExpandHistory] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingLostMode, setIsTogglingLostMode] = useState(false);
  const [showLostModeModal, setShowLostModeModal] = useState(false);
  const [pendingLostMode, setPendingLostMode] = useState<boolean>(false);
  const { t } = useLanguage();

  const handleRemovePet = () => {
    Alert.alert(
      "Xóa thú cưng",
      `Bạn có chắc chắn muốn xóa hồ sơ của ${petData?.name} không? Hành động này không thể hoàn tác.`,
      [
        { text: "Hủy", style: "cancel" },
        { 
          text: "Xóa", 
          style: "destructive", 
          onPress: async () => {
            try {
              setIsDeleting(true);
              await petService.deletePet(petId);
              Alert.alert("Thành công", "Đã xóa thú cưng!");
              router.replace('/(tabs)/my-pets');
            } catch (error: any) {
              Alert.alert("Lỗi", error.message || "Không thể xóa thú cưng lúc này.");
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
          console.error("Lỗi khi tải thông tin thú cưng:", error);
          Alert.alert("Lỗi", "Không thể tải thông tin chi tiết thú cưng. Vui lòng thử lại.");
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
      setPendingLostMode(value);
      setShowLostModeModal(true);
  };

  const executeToggleMode = async () => {
    const isLost = pendingLostMode;
    try {
      setShowLostModeModal(false);
      setIsTogglingLostMode(true);
      await petService.toggleLostMode(petId, isLost);
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
      setExpandHistory(!expandHistory);
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

  const TimelineItem = ({ item, isLast }: any) => {
      const isHighlight = item.type === 'highlight';
      let iconBg = 'bg-gray-100';
      let iconBorder = 'border-gray-200';
      
      if (item.variant === 'orange') { iconBg = 'bg-[#ffa053]'; iconBorder = 'border-[#ffa053]'; }
      else if (item.variant === 'yellow') { iconBg = 'bg-[#FEF9C3]'; iconBorder = 'border-[#FEF9C3]'; }
      else { iconBg = 'bg-white'; iconBorder = `border-[${item.color}]`; }

      let contentContainerClass = "flex-1 ml-3 py-1";
      if (item.variant === 'orange') contentContainerClass += " bg-[#FFF7ED] border border-orange-200 p-3 rounded-xl";
      else if (item.variant === 'yellow') contentContainerClass += " bg-[#FEFCE8] border border-yellow-200 p-3 rounded-xl";

      return (
          <View className="flex-row">
              <View className="items-center mr-0 w-8">
                  <View className={`w-8 h-8 rounded-full items-center justify-center z-10 border ${item.type === 'normal' ? 'border-2' : ''} ${iconBorder} ${iconBg}`}
                        style={item.type === 'normal' ? { borderColor: item.color } : {}}
                  >
                      {item.icon}
                  </View>
                  {!isLast && (
                      <View className="w-[2px] flex-1 bg-gray-200 my-1" />
                  )}
              </View>
              <View className={`flex-1 ml-3 mb-6 ${isHighlight ? '' : 'mt-1'}`}>
                  <View className={isHighlight ? contentContainerClass : "ml-1"}>
                      <View className="flex-row justify-between items-start">
                          <Text className="text-gray-900 font-bold text-sm mb-1">{item.title}</Text>
                          <Text className="text-gray-400 text-[10px] font-medium mt-0.5">{item.date}</Text>
                      </View>
                      <Text className="text-gray-600 text-xs leading-4">{item.desc}</Text>
                  </View>
              </View>
          </View>
      )
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#FAFAFA]">
        <ActivityIndicator size="large" color="#ffa053" />
        <Text className="mt-4 text-gray-500">Đang tải thông tin thú cưng...</Text>
      </View>
    );
  }

  if (!petData) {
    return (
      <View className="flex-1 justify-center items-center bg-[#FAFAFA]">
        <MaterialCommunityIcons name="paw-off" size={64} color="#E5E7EB" />
        <Text className="text-gray-800 text-lg font-bold mt-4">Không tìm thấy thông tin</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-6 bg-orange-100 px-6 py-2 rounded-full">
          <Text className="text-orange-600 font-bold">Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ownerInfo = petData.shelter || petData.owner || {};
  const isShelter = !!petData.shelter;
  const displayContactName = petData.contactName || ownerInfo.name || 'Chưa cập nhật';
  const displayContactPhone = petData.contactPhone || ownerInfo.phone || 'Chưa cập nhật';
  const displayContactAddress = petData.contactAddress || ownerInfo.address || 'Chưa cập nhật';

  // Format ID hiển thị (cắt ngắn id gốc nếu quá dài)
  const displayId = petData.code || petData.id?.substring(0, 8).toUpperCase() || petId.substring(0, 8).toUpperCase();

  return (
    <View className="flex-1 bg-[#FFFFFF]">
      <StatusBar style="dark" />
      <SafeAreaView className="flex-1" edges={['top']}>
        
        {/* --- HEADER --- */}
        <View className="flex-row items-center justify-between px-4 py-2 bg-[#FFFFFF]">
            <TouchableOpacity onPress={() => router.back()} className="p-2">
                <Feather name="chevron-left" size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="text-[18px] font-semibold text-[#000000]">{petData.name} Profile</Text>
            <View className="w-10" /> 
        </View>
        

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            
            {/* --- AVATAR & ID SECTION --- */}
            <View className="items-center mt-6 mb-[12px]">
                <View className="w-32 h-32 rounded-full bg-[#FFFFFF] border border-gray-200 items-center justify-center overflow-hidden shadow-sm">
                    <Image 
                        source={{ uri: petData.avatarUrl || petData.images?.[0]?.url || 'https://images.unsplash.com/photo-1552053831-71594a27632d?q=80&w=600&auto=format&fit=crop' }} 
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

            
            {/* 1. OUTER VIEW: Chứa Drop Shadow bên ngoài */}
            <View 
                className="mx-7 mb-8 rounded-[20px]"
                style={isLostMode 
                            ? {
                    shadowColor: '#8B546B1A',
                    shadowOffset: { width: 5, height: 5 },
                    shadowOpacity: 1, 
                    shadowRadius: 2,
                    elevation: 3, 
                    backgroundColor: isLostMode ? '#FEF2F2' : '#FFFFFF' 
                } : ""}
            >
                {/* 2. INNER VIEW: Cắt góc overflow và xử lý màu nền */}
                <View 
                    className={`rounded-[20px] p-[18px] py-[21px] flex-row items-center justify-between overflow-hidden ${
                        isLostMode 
                            ? 'bg-[#FEF2F2] border border-[#FFE5E5]' 
                            : 'bg-white border border-gray-200'
                    }`}
                    
                >
                    
                    {/* Nền Gradient khi bật Lost Mode */}
                    {isLostMode && (
                      <>
                        <LinearGradient
                          colors={['#FFF8F1', '#FFF8F1', '#FFEEF0']}
                          // Ép bóng mờ đi rất nhanh ở đoạn 15% và biến mất hoàn toàn ở 35% của 24px
                          // => Bóng thực tế chỉ mỏng khoảng 8px nhưng mượt mà ôm sát góc
                          locations={[0, 0.15, 0.35]} 
                          start={{ x: 1, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={{
                              position: 'absolute',
                              top: 0, left: 0, right: 0,
                              // BẮT BUỘC lớn hơn borderRadius (20) để đường cong được vẽ trọn vẹn
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
                    
                    {/* KHỐI BÊN TRÁI: Icon và Text */}
                    <View className="flex-row items-start flex-1 mr-4 z-10">
                      <View className="mt-[1px] mr-3">
                        
                          <Feather 
                              name="alert-circle" 
                              size={20} 
                              color={isLostMode ? "#8B3A3A" : "#9ca3af00"} 
                          />
                      </View>
                      <View className="flex-1">
                          <Text className={`font-medium text-[16px] leading-6 ${isLostMode ? 'text-[#8B3A3A]' : 'text-[#000000]'}`}>
                              Lost Pet Mode
                          </Text>
                          <Text className={`text-[14px] mt-0.5 font-light ${isLostMode ? 'text-[#8B3A3ACC]' : 'text-gray-400'}`}>
                              {isLostMode ? "Active - See Pet's Activity" : "Inactive - Pet is safe"}
                          </Text>
                      </View>
                    </View>

                    {/* KHỐI BÊN PHẢI: Switch */}
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

            {/* --- PET INFORMATION CARD --- */}
            <View className="mx-7 mb-8 ">
              <View className=''>
                <Text className="font-semibold text-[16px] text-black mb-3">Pet Information</Text>
              </View>
              <View className='bg-white rounded-[24px] p-6 border border-gray-200'>

                <InfoRow 
                    label1="Gender" value1={petData.gender || 'Chưa cập nhật'} 
                    label2="Breed" value2={petData.breed || 'Chưa cập nhật'} 
                />
                <InfoRow 
                    label1="Color" 
                    value1={petData.color || 'Chưa cập nhật'}
                    label2="Weight (kg)" value2={'Chưa cập nhật'} 
                />
                <InfoRow2
                    label1="Birthday" 
                    value1={
                        petData.dob 
                            ? new Date(petData.dob).toLocaleDateString('en-GB') 
                            : (petData.age ? `${petData.age} tuổi` : 'Chưa cập nhật') 
                    } 
                    label2="Microchip" value2={'Chưa cập nhật'} 
                />
                <View className="h-[1px] bg-gray-200 w-full mb-5" />
                <Text className="text-black text-[16px] font-medium mb-2">Notes</Text>
                <Text className="text-[#8E8E93] text-[14px] leading-5">
                    {petData.description || 'Chưa có ghi chú nào cho bé thú cưng này.'}
                </Text>
                
              </View>
            </View>

            {/* --- OWNER / SHELTER INFORMATION CARD --- */}
            <View className="mx-7 mb-8">
              {/* Tiêu đề Section */}
              <Text className="font-semibold text-[16px] text-black mb-3">
                  {isShelter ? 'Shelter Information' : 'Owner Information'}
              </Text>

              {/* White Card */}
              <View className="bg-white rounded-[20px] border border-gray-200 px-5">
                  <OwnerRow 
                      label="Name" 
                      value={displayContactName} // Output thực tế nên là: "Sarah Johnson"
                  />
                  <OwnerRow 
                      label="Phone" 
                      value={displayContactPhone} // Output thực tế nên là: "012345678900"
                  />
                  <OwnerRow 
                      label="Address" 
                      value={displayContactAddress} // Output thực tế nên là: "123 Oak St, Hanoi, Vietnam"
                      isLast={true}
                  />
              </View>
          </View>
            {/* --- PAW HISTORY SECTION --- */}
            {/* <View className="mx-5 mb-8 bg-white rounded-[24px] overflow-hidden shadow-sm shadow-gray-100 border border-gray-50">
                <TouchableOpacity 
                    className="flex-row items-center justify-between p-6 active:bg-gray-50"
                    onPress={toggleHistory}
                    activeOpacity={0.7}
                >
                    <Text className="text-lg font-bold text-gray-900">PawHistory</Text>
                    <View className="flex-row items-center gap-1">
                        <Text className="text-orange-500 text-xs font-bold">{expandHistory ? 'Hide' : 'View'}</Text>
                        <Feather 
                            name={expandHistory ? "chevron-up" : "chevron-down"} 
                            size={20} 
                            color="#ffa053" 
                        />
                    </View>
                </TouchableOpacity>

                {expandHistory && (
                    <View className="px-6 pb-6">
                        {HISTORY_DATA.map((item, index) => (
                            <TimelineItem 
                                key={item.id} 
                                item={item} 
                                isLast={index === HISTORY_DATA.length - 1} 
                            />
                        ))}
                        <View className="mt-2 bg-gray-100 rounded-xl p-3">
                            <Text className="text-gray-500 text-[11px] text-center">
                                This complete timeline is permanent and only available for the current owner
                            </Text>
                        </View>
                    </View>
                )}
            </View> */}

            {/* ========================================================= */}
            {/* --- VACCINATION RECORD SECTION (MỚI THÊM VÀO ĐÂY) --- */}
            {/* ========================================================= */}
            <View className="mx-7 mb-8">
              <Text className="font-semibold text-[16px] text-[#111827] mb-3">Vaccination Record</Text>
              
              {petData?.vaccinationRecordUrl ? (
                /* Trạng thái đã có giấy tờ */
                <View className="border border-[#EFA062] rounded-[12px] p-3 flex-row items-center bg-[#FEF3EB]/30 shadow-sm shadow-orange-100/50">
                  <Image 
                    source={{ uri: petData.vaccinationRecordUrl }} 
                    className="w-10 h-10 rounded-lg bg-[#F3F4F6]" 
                    resizeMode="cover"
                  />
                  <View className="flex-1 mx-3">
                    <View className="flex-row justify-between items-center mb-0.5">
                      <Text className="text-[13px] text-[#111827] font-medium" numberOfLines={1}>vaccination_record.jpg</Text>
                    </View>
                    <View className="flex-row items-center">
                      <Text className="text-[12px] text-[#6B7280] mr-2">1.2 MB</Text>
                      <View className="flex-row items-center">
                         <Feather name="check-circle" size={12} color="#EFA062" />
                         <Text className="text-[12px] text-[#EFA062] ml-1 font-medium">Completed</Text>
                      </View>
                    </View>
                  </View>
                  {/* Thay icon thùng rác bằng icon Xem chi tiết (Eye) */}
                  <TouchableOpacity 
                    className="p-1"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Feather name="eye" size={18} color="#EFA062" />
                  </TouchableOpacity>
                </View>
              ) : (
                /* Trạng thái chưa có giấy tờ (Empty state) */
                <View className="bg-white border border-dashed border-[#D1D5DB] rounded-[12px] py-5 items-center justify-center">
                  <View className="w-10 h-10 bg-[#F3F4F6] rounded-full items-center justify-center mb-2">
                    <Feather name="file-minus" size={20} color="#9CA3AF" />
                  </View>
                  <Text className="text-[13px] text-[#6B7280] font-medium">No record uploaded yet</Text>
                </View>
              )}
            </View>
            {/* ========================================================= */}
            {/* --- ACTION BUTTONS --- */}
            <View className="mx-7 gap-3">
                <TouchableOpacity 
                    className="w-full bg-[#E89B5A] py-5 rounded-[16px] shadow-md shadow-orange-200 items-center overflow-hidden"
                    onPress={() => router.push(`/edit-pet?id=${petId}`)}
                >
                    <Text className="text-white font-semibold text-[16px]">Edit Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push('/view-qr-code')}
                  activeOpacity={0.7}
                  className="w-full bg-white border border-[#FF9C56] py-5 rounded-[16px] items-center"
                >
                  <View className="flex-row items-center gap-2">
                    <QrCodeIcon size={20} color="#E89B5A" className="mr-2.5" />
                    <Text className="text-[#E89B5A] font-medium text-[16px]">
                      View QR Code
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

      {/* --- QR CODE MODAL --- */}
      <Modal
        visible={showQRModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowQRModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/60 px-5">
          <View className="bg-white rounded-[24px] p-6 w-full items-center shadow-lg">
            
            <View className="w-full flex-row justify-between items-center mb-6">
              <Text className="text-lg font-bold text-gray-900">Pet QR Tag</Text>
              <TouchableOpacity onPress={() => setShowQRModal(false)}>
                <Feather name="x" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm mb-4 w-full min-h-[220px] items-center justify-center">
                {petData?.qrCodeUrl ? (
                <Image 
                    source={{ uri: petData.qrCodeUrl }} 
                    style={{ width: 192, height: 192 }} 
                    className="rounded-lg"
                    resizeMode="contain"
                />
                ) : petData?.tags && petData.tags.length > 0 ? (
                <View style={{ width: 192, height: 192, alignItems: 'center', justifyContent: 'center' }}>
                    <QRCode
                    value={petData.tags[0].id}
                    size={180}
                    color="black"
                    backgroundColor="white"
                    />
                </View>
                ) : (
                <View className="items-center py-4">
                    <MaterialCommunityIcons name="qrcode-remove" size={60} color="#D1D5DB" />
                    <Text className="text-gray-500 font-bold text-base text-center mt-4">
                        No QR Code Available
                    </Text>
                    <Text className="text-gray-400 text-xs text-center mt-2 px-2 leading-5">
                        Please go to "Edit Profile" to upload a Smart Tag or QR Code for {petData?.name}.
                    </Text>
                </View>
                )}
            </View>

            {(petData?.qrCodeUrl || (petData?.tags && petData.tags.length > 0)) && (
              <Text className="text-gray-500 text-center text-sm mb-6 leading-5 px-2">
                Others can scan this QR code using their camera app to view the profile and contact you if {petData?.name} is lost.
              </Text>
            )}

            <TouchableOpacity 
              className="w-full bg-orange-100 py-3.5 rounded-full items-center mt-2"
              onPress={() => setShowQRModal(false)}
            >
              <Text className="text-orange-600 font-bold text-base">Close</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

      {/* --- LOST MODE TOGGLE MODAL --- */}
      <Modal
        visible={showLostModeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLostModeModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/60 px-5">
          <View className="bg-white rounded-[24px] p-6 w-full items-center shadow-xl">
            
            <View className={`w-16 h-16 rounded-full items-center justify-center mb-4 border-[4px] ${
              pendingLostMode ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'
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
                className={`flex-1 py-3.5 rounded-full items-center shadow-sm ${
                  pendingLostMode ? 'bg-[#EF4444] shadow-red-200' : 'bg-[#10B981] shadow-green-200'
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
    </View>
  );
}