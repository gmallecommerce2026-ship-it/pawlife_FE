import { Text } from '@/components/AppText';
import { useImageUpload } from '@/hooks/useImageUpload';
import { petService } from '@/services/petService';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, ChevronRight, Map, MapPin, Plus, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface LocItem {
  code: number;
  name: string;
}

export default function ReportLostPetScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const { petId, petName, petAvatar, petBreed, petAge } = useLocalSearchParams<{ 
    petId: string; 
    petName: string; 
    petAvatar: string;
    petBreed?: string;
    petAge?: string;
  }>();

  // --- API State ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { pickAndUploadImage, isUploading } = useImageUpload();

  // --- Form States ---
  const [location, setLocation] = useState(''); // Lưu chuỗi địa chỉ cuối cùng đã gộp
  const [dateTime, setDateTime] = useState(''); 
  const [details, setDetails] = useState('');
  
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerAddress, setOwnerAddress] = useState('');
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  // --- Location Picker States (Tỉnh -> Phường -> Địa chỉ cụ thể) ---
  const [isLocModalVisible, setLocModalVisible] = useState(false);
  const [locStep, setLocStep] = useState<1 | 2 | 3>(1); // 1: Tỉnh, 2: Phường, 3: Nhập địa chỉ cụ thể
  const [locData, setLocData] = useState<LocItem[]>([]);
  const [isLocLoading, setIsLocLoading] = useState(false);
  
  // State tạm thời lưu bên trong modal
  const [tempSpecificAddress, setTempSpecificAddress] = useState('');
  const [selectedLoc, setSelectedLoc] = useState<{
    province: LocItem | null;
    ward: LocItem | null;
  }>({ province: null, ward: null });

  // --- Date Picker States ---
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

  // ===================== LOGIC LẤY API ĐỊA LÝ MỚI =====================
  const openLocationPicker = () => {
    setLocModalVisible(true);
    setLocStep(1);
    setTempSpecificAddress(''); // Reset ô nhập
    fetchProvinces();
  };

  const fetchProvinces = async () => {
    setIsLocLoading(true);
    try {
      const res = await fetch('https://provinces.open-api.vn/api/p/');
      const data = await res.json();
      setLocData(data);
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể tải danh sách Tỉnh/Thành phố');
    }
    setIsLocLoading(false);
  };

  // Lấy thẳng Phường (bỏ qua Quận theo logic mới)
  const fetchWardsDirectly = async (provinceCode: number) => {
    setIsLocLoading(true);
    try {
      // depth=3 lấy Tỉnh -> Quận -> Phường
      const res = await fetch(`https://provinces.open-api.vn/api/p/${provinceCode}?depth=3`);
      const data = await res.json();
      
      const allWards: LocItem[] = [];
      
      // Bóc tách toàn bộ phường của tất cả các quận trong Tỉnh gom thành 1 mảng
      if (data.districts) {
        data.districts.forEach((district: any) => {
          if (district.wards) {
            district.wards.forEach((ward: any) => {
              allWards.push({
                code: ward.code,
                // Thêm tên quận phía sau để tránh trùng tên phường (VD: Phường 1 - Quận 3)
                name: `${ward.name} - ${district.name}` 
              });
            });
          }
        });
      }
      
      setLocData(allWards);
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể tải danh sách Phường/Xã');
    }
    setIsLocLoading(false);
  };

  const handleSelectLocItem = (item: LocItem) => {
    if (locStep === 1) {
      setSelectedLoc({ province: item, ward: null });
      setLocStep(2);
      fetchWardsDirectly(item.code);
    } else if (locStep === 2) {
      setSelectedLoc((prev) => ({ ...prev, ward: item }));
      setLocStep(3); // Chuyển sang bước nhập địa chỉ cụ thể
    }
  };

  // Nút xác nhận cuối cùng ở modal
  const handleConfirmLocation = () => {
    if (selectedLoc.province && selectedLoc.ward && tempSpecificAddress.trim()) {
      // Tự động gộp thành 1 chuỗi hoàn chỉnh
      const finalAddress = `${tempSpecificAddress.trim()}, ${selectedLoc.ward.name}, ${selectedLoc.province.name}`;
      setLocation(finalAddress);
      setLocModalVisible(false); // Đóng modal và update ra màn hình ngoài
    }
  };
  // ================================================================

  const showDatePicker = () => setDatePickerVisibility(true);
  const hideDatePicker = () => setDatePickerVisibility(false);
  const handleConfirmDate = (selectedDate: Date) => {
    hideDatePicker();
    const hours = selectedDate.getHours().toString().padStart(2, '0');
    const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
    const day = selectedDate.getDate().toString().padStart(2, '0');
    const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
    const year = selectedDate.getFullYear();
    setDateTime(`${hours}:${minutes} - ${day}/${month}/${year}`);
  };

  const isFormValid = location && dateTime && details && ownerName && ownerPhone && ownerAddress;

  const handleAddPhoto = async () => {
    if (photos.length >= 5) return;
    const imageUrl = await pickAndUploadImage({
      folder: 'lost-pets', 
      aspect: [4, 3],
      quality: 0.8,
    });
    if (imageUrl) {
      setPhotos((prev) => [...prev, imageUrl]);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/my-pets');
    }
  };

  const handleActivateLostMode = async () => {
    if (!petId) return;

    setIsSubmitting(true);
    try {
        // Thực hiện gọi API thông qua axiosClient của petService
        const result = await petService.toggleLostMode(petId, {
        isLost: true,
        // Đảm bảo fallback về chuỗi rỗng hoặc mảng rỗng nếu state đang bị undefined/null
        location: location || "",
        dateTime: dateTime || "",
        details: details || "",
        ownerName: ownerName || "",
        ownerPhone: ownerPhone || "",
        ownerAddress: ownerAddress || "",
        note: note || "",
        photos: photos || [],
        });

        Alert.alert(
        'Báo lạc thành công', 
        `Đã kích hoạt chế độ báo lạc cho ${petName || 'thú cưng'}.`,
        [{ text: 'OK', onPress: () => handleClose() }]
        );
    } catch (error: any) {
        // Đọc message lỗi trả về từ Axios hoặc Server một cách chính xác
        const errorMsg = error?.message || 'Lỗi hệ thống, vui lòng thử lại.';
        Alert.alert('Lỗi', errorMsg);
    } finally {
        setIsSubmitting(false);
    }
    };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF', paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Stack.Screen options={{ headerShown: false }} />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ 
            flexGrow: 1, 
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: insets.bottom + 40 
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* HEADER */}
          <View className="mb-8 relative flex-row justify-between items-start">
            <View className="flex-1 pr-4">
              <Text className="text-[24px] font-extrabold text-[#111827] mb-1.5 tracking-[-0.5px]">
                Report Lost Pet
              </Text>
              <Text className="text-[14px] text-[#6B7280] font-medium leading-5">
                Please confirm the information below to activate lost mode
              </Text>
            </View>
            <TouchableOpacity 
              onPress={handleClose}
              disabled={isSubmitting}
              className="w-[36px] h-[36px] bg-[#F3F4F6] rounded-full items-center justify-center active:bg-[#E5E7EB] mt-1"
              activeOpacity={0.7}
            >
              <X size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* PET INFO */}
          <View className="items-center mb-8">
            <Image 
              source={{ 
                uri: petAvatar && petAvatar !== 'undefined' 
                  ? petAvatar 
                  : 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=300&auto=format&fit=crop' 
              }}
              className="w-[90px] h-[90px] rounded-full border-[4px] border-[#F9FAFB]"
              resizeMode="cover"
            />
            <Text className="text-[20px] font-bold text-[#111827] mt-3 tracking-[-0.3px]">
              {petName || 'Thú cưng'}
            </Text>
            <Text className="text-[14px] text-[#6B7280] mt-1 font-medium">
              {petAge ? `${petAge} Tuổi • ` : ''}{petBreed || 'Chưa rõ giống loài'}
            </Text>
          </View>

          {/* LAST SEEN INFORMATION */}
          <View className="mb-8">
            <Text className="text-[16px] font-bold text-[#111827] mb-3 tracking-[-0.3px]">
              Last Seen Information
            </Text>
            <View className="gap-y-3">
              
              {/* NÚT CHỌN KHU VỰC VÀ ĐỊA CHỈ */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={openLocationPicker}
                className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-[16px] px-4 min-h-[56px] py-3 flex-row items-center justify-between"
              >
                <View className="flex-1 pr-2">
                  <Text className={`text-[15px] font-medium ${location ? 'text-[#111827]' : 'text-[#9CA3AF]'}`}>
                    {location || 'Chọn địa điểm thất lạc...'}
                  </Text>
                </View>
                <MapPin size={18} color={location ? '#EF4444' : '#9CA3AF'} />
              </TouchableOpacity>
              
              {/* NÚT BẤM CHỌN NGÀY GIỜ */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={showDatePicker}
                className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-[16px] px-4 h-[56px] justify-center"
              >
                <Text className={`text-[15px] font-medium ${dateTime ? 'text-[#111827]' : 'text-[#9CA3AF]'}`}>
                  {dateTime || 'Thời gian thất lạc (Date & Time)'}
                </Text>
              </TouchableOpacity>
              
              <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="datetime"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onConfirm={handleConfirmDate}
                onCancel={hideDatePicker}
                confirmTextIOS="Xác nhận"
                cancelTextIOS="Hủy"
                locale="vi_VN"
              />

              <TextInput
                value={details}
                onChangeText={setDetails}
                placeholder="Đặc điểm nhận dạng, hoàn cảnh thất lạc..."
                placeholderTextColor="#9CA3AF"
                multiline
                className="w-full min-h-[110px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[16px] px-4 py-4 text-[15px] text-[#111827] font-medium"
                textAlignVertical="top"
                cursorColor="#EF4444"
              />
            </View>
          </View>

          {/* PHOTOS */}
          <View className="mb-8">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-[16px] font-bold text-[#111827] tracking-[-0.3px]">
                Photos <Text className="text-[#9CA3AF] font-normal">(Optional)</Text>
              </Text>
              <Text className="text-[13px] font-semibold text-[#9CA3AF]">{photos.length}/5</Text>
            </View>
            
            <View className="flex-row flex-wrap gap-3">
              {photos.length === 0 ? (
                <TouchableOpacity 
                  onPress={handleAddPhoto}
                  activeOpacity={0.7}
                  disabled={isUploading}
                  className="w-full h-[120px] bg-[#F9FAFB] border-[1.5px] border-dashed border-[#D1D5DB] rounded-[16px] items-center justify-center"
                >
                  {isUploading ? (
                    <ActivityIndicator size="small" color="#9CA3AF" className="mb-2" />
                  ) : (
                    <Camera size={28} color="#9CA3AF" className="mb-2" />
                  )}
                  <Text className="text-[14px] font-medium text-[#6B7280]">
                    {isUploading ? 'Đang tải lên...' : 'Tải ảnh nhận diện lên'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <>
                  {photos.map((uri, index) => (
                    <View key={index} className="relative w-[78px] h-[78px]">
                      <Image 
                        source={{ uri }} 
                        className="w-full h-full rounded-[14px] bg-[#F3F4F6] border border-[#E5E7EB]"
                      />
                      <TouchableOpacity 
                        onPress={() => handleRemovePhoto(index)}
                        activeOpacity={0.7}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-[#E5E7EB] rounded-full items-center justify-center"
                        style={{ elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3 }}
                      >
                        <X size={12} color="#EF4444" strokeWidth={3} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  
                  {photos.length < 5 && (
                    <TouchableOpacity 
                      onPress={handleAddPhoto}
                      activeOpacity={0.7}
                      disabled={isUploading}
                      className="w-[78px] h-[78px] bg-[#F9FAFB] border-[1.5px] border-dashed border-[#D1D5DB] rounded-[14px] items-center justify-center"
                    >
                      {isUploading ? (
                        <ActivityIndicator size="small" color="#9CA3AF" />
                      ) : (
                        <Plus size={24} color="#9CA3AF" />
                      )}
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>

          {/* OWNER INFORMATION */}
          <View className="mb-10">
            <Text className="text-[16px] font-bold text-[#111827] mb-3 tracking-[-0.3px]">
              Owner Information
            </Text>
            
            <View className="bg-white border border-[#E5E7EB] rounded-[16px] overflow-hidden">
              <TextInput
                value={ownerName}
                onChangeText={setOwnerName}
                placeholder="Name"
                placeholderTextColor="#9CA3AF"
                className="w-full px-4 h-[56px] text-[15px] text-[#111827] font-medium border-b border-[#F3F4F6]"
                cursorColor="#EF4444"
              />
              <TextInput
                value={ownerPhone}
                onChangeText={setOwnerPhone}
                placeholder="Phone"
                keyboardType="phone-pad"
                placeholderTextColor="#9CA3AF"
                className="w-full px-4 h-[56px] text-[15px] text-[#111827] font-medium border-b border-[#F3F4F6]"
                cursorColor="#EF4444"
              />
              <TextInput
                value={ownerAddress}
                onChangeText={setOwnerAddress}
                placeholder="Address"
                placeholderTextColor="#9CA3AF"
                className="w-full px-4 h-[56px] text-[15px] text-[#111827] font-medium border-b border-[#F3F4F6]"
                cursorColor="#EF4444"
              />
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Leave your note here..."
                placeholderTextColor="#9CA3AF"
                multiline
                className="w-full min-h-[110px] px-4 py-4 text-[15px] text-[#111827] font-medium"
                textAlignVertical="top"
                cursorColor="#EF4444"
              />
            </View>
          </View>

          {/* FOOTER BUTTONS */}
          <View className="gap-y-3 mt-auto">
            <TouchableOpacity 
              activeOpacity={0.8}
              disabled={!isFormValid || isSubmitting || isUploading}
              onPress={handleActivateLostMode}
              className={`w-full h-[56px] rounded-full items-center justify-center flex-row ${
                isFormValid && !isSubmitting && !isUploading ? 'bg-[#EF4444]' : 'bg-[#FCA5A5]'
              }`}
            >
              {isSubmitting && <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />}
              <Text className="text-white font-bold text-[16px] tracking-[-0.3px]">
                {isSubmitting ? 'Activating...' : 'Activate Lost Mode'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={handleClose}
              disabled={isSubmitting}
              className="w-full h-[56px] rounded-full items-center justify-center bg-[#F3F4F6]"
            >
              <Text className="text-[#374151] font-bold text-[16px] tracking-[-0.3px]">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
          
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ================= MODAL CHỌN ĐỊA LÝ & NHẬP SỐ NHÀ ================= */}
      <Modal
        visible={isLocModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setLocModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <TouchableOpacity 
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} 
            activeOpacity={1}
            onPress={() => setLocModalVisible(false)}
          >
            <TouchableOpacity 
              activeOpacity={1}
              className="bg-white w-full rounded-t-[24px] overflow-hidden shadow-lg"
              style={{ height: '80%' }} // Chiếm 80% để có chỗ hiện bàn phím khi nhập số nhà
            >
              {/* Modal Header */}
              <View className="flex-row items-center px-5 py-4 border-b border-[#F3F4F6]">
                {locStep > 1 ? (
                  <TouchableOpacity 
                    onPress={() => {
                      if (locStep === 2) { setLocStep(1); fetchProvinces(); }
                      if (locStep === 3) { setLocStep(2); fetchWardsDirectly(selectedLoc.province!.code); }
                    }}
                    className="mr-3"
                  >
                    <Text className="text-[#6B7280] font-medium text-[15px]">Quay lại</Text>
                  </TouchableOpacity>
                ) : null}

                <Text className="text-[18px] font-bold text-[#111827] flex-1 text-center">
                  {locStep === 1 ? 'Chọn Tỉnh/Thành' : locStep === 2 ? 'Chọn Phường/Xã' : 'Nhập địa chỉ'}
                </Text>

                <TouchableOpacity onPress={() => setLocModalVisible(false)}>
                  <Text className="text-[16px] font-semibold text-[#EF4444]">Đóng</Text>
                </TouchableOpacity>
              </View>

              {/* Breadcrumb trạng thái */}
              <View className="bg-[#F9FAFB] px-5 py-3 border-b border-[#F3F4F6]">
                 <Text className="text-[14px] text-[#4B5563] font-medium leading-5">
                   {selectedLoc.province ? selectedLoc.province.name : 'Chọn Tỉnh/Thành phố'} 
                   {selectedLoc.ward ? ` > ${selectedLoc.ward.name}` : ''}
                   {locStep === 3 ? ` > Địa chỉ chi tiết` : ''}
                 </Text>
              </View>

              {/* Phần thân Modal */}
              {isLocLoading ? (
                <View className="flex-1 justify-center items-center">
                  <ActivityIndicator size="large" color="#EF4444" />
                  <Text className="text-[#6B7280] mt-3 font-medium">Đang tải dữ liệu...</Text>
                </View>
              ) : locStep === 3 ? (
                // BƯỚC 3: NHẬP ĐỊA CHỈ CHI TIẾT
                <View className="flex-1 px-5 py-6 bg-white">
                  <Text className="text-[15px] font-bold text-[#111827] mb-3">
                    Nhập số nhà, tên đường, hẻm...
                  </Text>
                  <TextInput
                    value={tempSpecificAddress}
                    onChangeText={setTempSpecificAddress}
                    placeholder="VD: Số 123 đường Lê Lợi..."
                    placeholderTextColor="#9CA3AF"
                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-[16px] px-4 h-[56px] text-[15px] text-[#111827] font-medium mb-6"
                    cursorColor="#EF4444"
                    autoFocus={true} // Tự động bật bàn phím
                  />
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleConfirmLocation}
                    disabled={!tempSpecificAddress.trim()}
                    className={`w-full h-[56px] rounded-full items-center justify-center ${
                      tempSpecificAddress.trim() ? 'bg-[#EF4444]' : 'bg-[#FCA5A5]'
                    }`}
                  >
                    <Text className="text-white font-bold text-[16px] tracking-[-0.3px]">
                      Xác nhận
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                // BƯỚC 1 & 2: CUỘN CHỌN TỈNH/PHƯỜNG
                <FlatList
                  data={locData}
                  keyExtractor={(item) => item.code.toString()}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleSelectLocItem(item)}
                      className="px-5 py-4 border-b border-[#F9FAFB] flex-row items-center justify-between bg-white"
                    >
                      <Text className="text-[16px] text-[#374151] font-medium flex-1 pr-4">
                        {item.name}
                      </Text>
                      <ChevronRight size={18} color="#D1D5DB" />
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View className="pt-10 items-center">
                      <Map size={40} color="#D1D5DB" />
                      <Text className="text-[#9CA3AF] mt-3 font-medium">Không có dữ liệu</Text>
                    </View>
                  }
                />
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}