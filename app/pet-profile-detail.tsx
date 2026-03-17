import { Feather, FontAwesome5, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'; // Thêm useFocusEffect
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react'; // Thêm useCallback và thay đổi import từ 'react'
import { ActivityIndicator, Alert, Image, LayoutAnimation, Modal, Platform, ScrollView, Switch, TouchableOpacity, UIManager, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg'; // Thêm import này
import { SafeAreaView } from 'react-native-safe-area-context';
import { petService } from '../services/petService';

import { Text } from '@/components/AppText';
import { useLanguage } from '@/contexts/LanguageContext';
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
  const [expandHistory, setExpandHistory] = useState(false); // State mở rộng PawHistory
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
              router.replace('/(tabs)/my-pets'); // Trở về danh sách pets của tôi
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
          
          // Cập nhật Lost Mode dựa trên status của backend
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

  // --- DỮ LIỆU TIMELINE (Đã cắt bỏ health checkup, previous owner, adopted) ---
  const HISTORY_DATA = [
      {
          id: 1, type: 'highlight', variant: 'orange',
          title: 'Current Owner', date: 'Jan 15, 2026', desc: 'Ownership transferred to current owner',
          icon: <MaterialIcons name="verified" size={16} color="white" />
      },
      {
          id: 2, type: 'normal', color: '#10B981', // Green
          title: 'Vaccination', date: 'Dec 8, 2025', desc: 'Annual rabies & DHPP vaccination completed',
          icon: <MaterialCommunityIcons name="needle" size={14} color="#10B981" />
      },
      {
          id: 3, type: 'normal', color: '#EF4444', // Red
          title: 'Lost & Found', date: 'Nov 22, 2025', desc: 'Found after 2 days - Scanned at Oak Park',
          icon: <Feather name="alert-circle" size={14} color="#EF4444" />
      }
  ];

  // --- LOGIC HANDLERS ---
  
  // 1. Logic Tắt Lost Mode (Confirm Dialog)
  const handleLostModeToggle = (value: boolean) => {
      setPendingLostMode(value);
      setShowLostModeModal(true); // Mở popup
  };

  const executeToggleMode = async () => {
    const isLost = pendingLostMode;
    try {
      setShowLostModeModal(false); // Đóng modal trước khi xử lý
      setIsTogglingLostMode(true);
      
      // Gọi lên Backend
      await petService.toggleLostMode(petId, isLost);
      
      // Cập nhật giao diện
      setIsLostMode(isLost);
      
    } catch (error: any) {
      // Sử dụng t() cho thông báo lỗi
      Alert.alert(t('error.title'), error.message || t('error.toggleModeFailed'));
      setIsLostMode(!isLost); 
    } finally {
      setIsTogglingLostMode(false);
    }
  };

  // 2. Logic Toggle History
  const toggleHistory = () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpandHistory(!expandHistory);
  };

  // --- SUB-COMPONENTS ---

  const InfoRow = ({ label1, value1, label2, value2 }: any) => (
    <View className="flex-row justify-between mb-5">
        <View className="flex-1">
            <Text className="text-gray-400 text-xs font-medium mb-1">{label1}</Text>
            <Text className="text-gray-800 text-sm font-semibold">{value1}</Text>
        </View>
        <View className="flex-1">
            <Text className="text-gray-400 text-xs font-medium mb-1">{label2}</Text>
            <Text className="text-gray-800 text-sm font-semibold">{value2}</Text>
        </View>
    </View>
  );

  const OwnerRow = ({ icon, label, value, isToggle = false, toggleValue, onToggle }: any) => (
      <View className="flex-row items-center mb-5">
          <View className="w-10 h-10 bg-[#FFF8F0] rounded-full items-center justify-center mr-4">
              {icon}
          </View>
          <View className="flex-1 mr-2">
              <Text className="text-gray-400 text-xs font-medium mb-0.5">{label}</Text>
              {/* LOGIC ẨN ĐỊA CHỈ: Nếu toggle = true thì hiện text, false thì hiện chấm */}
              {isToggle && !toggleValue ? (
                   <Text className="text-gray-300 text-sm font-bold tracking-widest mt-1">•••• •••• ••••</Text>
              ) : (
                   <Text className="text-gray-800 text-sm font-medium" numberOfLines={1}>{value}</Text>
              )}
          </View>
          {isToggle && (
               <Switch
                trackColor={{ false: '#E5E7EB', true: '#ffa053' }}
                thumbColor={'#FFFFFF'}
                ios_backgroundColor="#E5E7EB"
                onValueChange={onToggle}
                value={toggleValue}
                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
              />
          )}
      </View>
  );

  // Timeline Item Component
  const TimelineItem = ({ item, isLast }: any) => {
      const isHighlight = item.type === 'highlight';
      
      // Style cho icon container
      let iconBg = 'bg-gray-100';
      let iconBorder = 'border-gray-200';
      
      if (item.variant === 'orange') { iconBg = 'bg-[#ffa053]'; iconBorder = 'border-[#ffa053]'; }
      else if (item.variant === 'yellow') { iconBg = 'bg-[#FEF9C3]'; iconBorder = 'border-[#FEF9C3]'; } // Yellow-100
      else { iconBg = 'bg-white'; iconBorder = `border-[${item.color}]`; } // Normal items have colored border

      // Style cho content box
      let contentContainerClass = "flex-1 ml-3 py-1";
      if (item.variant === 'orange') contentContainerClass += " bg-[#FFF7ED] border border-orange-200 p-3 rounded-xl"; // Orange-50
      else if (item.variant === 'yellow') contentContainerClass += " bg-[#FEFCE8] border border-yellow-200 p-3 rounded-xl"; // Yellow-50
      // Normal items không có bg

      return (
          <View className="flex-row">
              {/* Left Column: Icon + Line */}
              <View className="items-center mr-0 w-8">
                  {/* Icon Circle */}
                  <View className={`w-8 h-8 rounded-full items-center justify-center z-10 border ${item.type === 'normal' ? 'border-2' : ''} ${iconBorder} ${iconBg}`}
                        style={item.type === 'normal' ? { borderColor: item.color } : {}}
                  >
                      {item.icon}
                  </View>
                  
                  {/* Connector Line (chỉ hiện nếu không phải item cuối) */}
                  {!isLast && (
                      <View className="w-[2px] flex-1 bg-gray-200 my-1" />
                  )}
              </View>

              {/* Right Column: Content */}
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

  // --- TRẠNG THÁI LOADING & ERROR ---
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

  // --- LẤY THÔNG TIN CHỦ HOẶC TRẠM CỨU HỘ ---
  const ownerInfo = petData.shelter || petData.owner || {};
  const isShelter = !!petData.shelter;

  const displayContactName = petData.contactName || ownerInfo.name || 'Chưa cập nhật';
  const displayContactPhone = petData.contactPhone || ownerInfo.phone || 'Chưa cập nhật';
  const displayContactAddress = petData.contactAddress || ownerInfo.address || 'Chưa cập nhật';

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <StatusBar style="dark" />
      <SafeAreaView className="flex-1" edges={['top']}>
        
        {/* --- HEADER --- */}
        <View className="flex-row items-center justify-between px-4 py-2 bg-[#FAFAFA]">
            <TouchableOpacity onPress={() => router.back()} className="p-2">
                <Feather name="chevron-left" size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-gray-900">{petData.name}'s Profile</Text>
            <View className="w-10" /> 
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            
            {/* --- AVATAR SECTION --- */}
            <View className="items-center mt-4 mb-6">
                <View className="p-1.5 bg-white rounded-full shadow-sm shadow-gray-200">
                    <Image 
                        source={{ uri: petData.avatarUrl || petData.images?.[0]?.url || 'https://images.unsplash.com/photo-1552053831-71594a27632d?q=80&w=600&auto=format&fit=crop' }} 
                        className="w-24 h-24 rounded-full"
                        resizeMode="cover"
                    />
                </View>
                <Text className="text-2xl font-bold text-gray-900 mt-3">{petData.name}</Text>
            </View>

            {/* --- LOST PET MODE CARD --- */}
            <View className="mx-5 mb-5 bg-[#FEF2F2] border border-[#FEE2E2] rounded-[20px] p-4 flex-row items-center justify-between shadow-sm shadow-red-50">
                <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 bg-red-100 rounded-full items-center justify-center border border-red-200">
                        <Feather name="alert-circle" size={20} color="#EF4444" />
                    </View>
                    <View>
                        <Text className="text-[#7F1D1D] font-bold text-sm">Lost Pet Mode</Text>
                        <Text className="text-[#B91C1C] text-xs mt-0.5 font-medium">Active - See Pet's Activity</Text>
                    </View>
                </View>
                <Switch
                    disabled={isTogglingLostMode}
                    trackColor={{ false: '#E5E7EB', true: '#EF4444' }}
                    thumbColor={'#FFFFFF'}
                    ios_backgroundColor="#E5E7EB"
                    onValueChange={handleLostModeToggle}
                    value={isLostMode}
                />
            </View>

            {/* --- PET INFORMATION CARD --- */}
            <View className="mx-5 mb-5 bg-white rounded-[24px] p-6 shadow-sm shadow-gray-100 border border-gray-50">
                <Text className="text-base font-bold text-gray-900 mb-6">Pet Information</Text>
                <InfoRow 
                    label1="Gender" value1={petData.gender || 'Chưa cập nhật'} 
                    label2="Breed" value2={petData.breed || 'Chưa cập nhật'} 
                />
                <InfoRow 
                    label1="DOB" 
                    value1={
                        petData.dob 
                            ? new Date(petData.dob).toLocaleDateString('en-GB') // Hiển thị định dạng DD/MM/YYYY
                            : (petData.age ? `${petData.age} tuổi` : 'Chưa cập nhật') // Fallback cho các pet cũ chỉ có age
                    } 
                    label2="Color" value2={petData.color || 'Chưa cập nhật'} 
                />
                <View className="h-[1px] bg-gray-100 w-full mb-5" />
                <Text className="text-gray-400 text-xs font-medium mb-2">Notes</Text>
                <Text className="text-gray-600 text-sm leading-5">
                    {petData.description || 'Chưa có ghi chú nào cho bé thú cưng này.'}
                </Text>
            </View>

            {/* --- OWNER / SHELTER INFORMATION CARD --- */}
            <View className="mx-5 mb-5 bg-white rounded-[24px] p-6 shadow-sm shadow-gray-100 border border-gray-50">
                <Text className="text-base font-bold text-gray-900 mb-6">
                    {isShelter ? 'Shelter Information' : 'Owner Information'}
                </Text>
                <OwnerRow 
                    icon={<Feather name={isShelter ? "home" : "user"} size={18} color="#ffa053" />} 
                    label="Name" 
                    value={displayContactName} 
                />
                <OwnerRow 
                    icon={<Feather name="phone" size={18} color="#65A30D" />} 
                    label="Phone" 
                    value={displayContactPhone} 
                />
                <OwnerRow 
                    icon={<Ionicons name="location-outline" size={20} color="#2563EB" />} 
                    label="Address" 
                    value={displayContactAddress}
                    isToggle={true}
                    toggleValue={isAddressVisible}
                    onToggle={setIsAddressVisible}
                />
                <View className="bg-[#FFFBEB] rounded-xl px-4 py-3 flex-row items-center border border-[#FEF3C7] mt-1">
                    <FontAwesome5 name="lock" size={12} color="#ffa053" />
                    <Text className="text-[#92400E] text-[11px] font-medium ml-2 flex-1">
                        Address is visible to finders when scanned
                    </Text>
                </View>
            </View>

            {/* --- PAW HISTORY SECTION (UPDATED) --- */}
            <View className="mx-5 mb-8 bg-white rounded-[24px] overflow-hidden shadow-sm shadow-gray-100 border border-gray-50">
                
                {/* Header (Click to Toggle) */}
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

                {/* Timeline Content */}
                {expandHistory && (
                    <View className="px-6 pb-6">
                        {HISTORY_DATA.map((item, index) => (
                            <TimelineItem 
                                key={item.id} 
                                item={item} 
                                isLast={index === HISTORY_DATA.length - 1} 
                            />
                        ))}

                        {/* Footer Note */}
                        <View className="mt-2 bg-gray-100 rounded-xl p-3">
                            <Text className="text-gray-500 text-[11px] text-center">
                                This complete timeline is permanent and only available for the current owner
                            </Text>
                        </View>
                    </View>
                )}
            </View>

            {/* --- ACTION BUTTONS --- */}
            <View className="mx-5 gap-3">
                <TouchableOpacity 
                    className="w-full bg-[#FF9C56] py-4 rounded-full shadow-md shadow-orange-200 items-center"
                    onPress={() => router.push(`/edit-pet?id=${petId}`)}
                >
                    <Text className="text-white font-bold text-base">Edit Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    className="w-full bg-white border border-[#FF9C56] py-4 rounded-full items-center"
                    onPress={() => setShowQRModal(true)} // MỞ MODAL QR CODE
                >
                    <View className="flex-row items-center gap-2">
                        <MaterialIcons name="qr-code" size={20} color="#4B5563" />
                        <Text className="text-gray-700 font-bold text-base">View QR Code</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity 
                    className="w-full py-4 rounded-full items-center mt-2 active:opacity-70"
                    onPress={handleRemovePet} // GỌI HÀM XÓA
                    disabled={isDeleting}
                >
                    {isDeleting ? (
                        <ActivityIndicator color="#EF4444" size="small" />
                    ) : (
                        <Text className="text-red-500 font-bold text-sm">Remove Pet</Text>
                    )}
                </TouchableOpacity>
            </View>

        </ScrollView>
      </SafeAreaView>
      <Modal
        visible={showQRModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowQRModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/60 px-5">
          <View className="bg-white rounded-[24px] p-6 w-full items-center shadow-lg">
            
            {/* Header Modal */}
            <View className="w-full flex-row justify-between items-center mb-6">
              <Text className="text-lg font-bold text-gray-900">Pet QR Tag</Text>
              <TouchableOpacity onPress={() => setShowQRModal(false)}>
                <Feather name="x" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Khung hiển thị QR / Empty State */}
            <View className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm mb-4 w-full min-h-[220px] items-center justify-center">
    
                {/* 1. Ưu tiên hiển thị ảnh QR Code từ Database */}
                {petData?.qrCodeUrl ? (
                <Image 
                    source={{ uri: petData.qrCodeUrl }} 
                    // 🛠 THÊM DÒNG NÀY: Bắt buộc khai báo kích thước cứng cho ảnh tải từ URL
                    style={{ width: 192, height: 192 }} 
                    className="rounded-lg"
                    resizeMode="contain"
                />
                ) 
                /* 2. Fallback: Render tự động bằng thư viện qrcode-svg nếu có tag ID */
                : petData?.tags && petData.tags.length > 0 ? (
                <View style={{ width: 192, height: 192, alignItems: 'center', justifyContent: 'center' }}>
                    <QRCode
                    value={petData.tags[0].id}
                    size={180} // Fix size cứng cho QRCode
                    color="black"
                    backgroundColor="white"
                    />
                </View>
                ) 
                /* 3. Nếu chưa có bất kỳ QR nào -> Hiển thị thông báo */
                : (
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

            {/* Chỉ hiện câu hướng dẫn quét QR nếu thực sự có QR Code để quét */}
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
      <Modal
        visible={showLostModeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLostModeModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/60 px-5">
          <View className="bg-white rounded-[24px] p-6 w-full items-center shadow-xl">
            
            {/* Icon Header */}
            <View className={`w-16 h-16 rounded-full items-center justify-center mb-4 border-[4px] ${
              pendingLostMode ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'
            }`}>
              <Feather 
                name={pendingLostMode ? "alert-triangle" : "check-circle"} 
                size={32} 
                color={pendingLostMode ? "#EF4444" : "#10B981"} 
              />
            </View>

            {/* Tiêu đề & Nội dung sử dụng hàm t() */}
            <Text className="text-xl font-bold text-gray-900 text-center mb-2">
              {pendingLostMode ? t('lostMode.titleOn') : t('lostMode.titleOff')}
            </Text>
            
            <Text className="text-gray-500 text-center text-sm mb-8 leading-5 px-2">
              {pendingLostMode ? t('lostMode.descOn') : t('lostMode.descOff')}
            </Text>

            {/* Các nút hành động */}
            <View className="flex-row w-full gap-3">
              {/* Nút Hủy */}
              <TouchableOpacity 
                className="flex-1 bg-gray-100 py-3.5 rounded-full items-center"
                onPress={() => setShowLostModeModal(false)}
              >
                <Text className="text-gray-600 font-bold text-base">
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>

              {/* Nút Xác nhận */}
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