import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import React, { useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  Keyboard,
  Modal,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { TextInput } from './AppTextInput';

// Bổ sung import LanguageContext
import { useLanguage } from '@/contexts/LanguageContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function VaccinationSection() {
  // Khởi tạo biến ngôn ngữ
  const { t, language } = useLanguage();
  const isVi = language === 'vi';

  const [images, setImages] = useState<string[]>([]);
  const [isModalVisible, setModalVisible] = useState(false);
  
  const [hasNextDueDate, setHasNextDueDate] = useState(false);
  const [nextDate, setNextDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [vaccineName, setVaccineName] = useState('');

  // --- NÂNG CẤP: STATE VÀ REF CHO IOS GLASSMORPHISM DATE PICKER ---
  const dateRef = useRef<View>(null);
  const [activePicker, setActivePicker] = useState<'date' | null>(null);
  const [pickerLayout, setPickerLayout] = useState({ x: 0, y: 0, width: 340 });
  const pickerOpacity = useRef(new Animated.Value(0)).current;
  const pickerTranslateY = useRef(new Animated.Value(-8)).current;

  // Xử lý mở Picker Kính Mờ (iOS)
  const openDropdownPicker = () => {
    Keyboard.dismiss(); // Hạ bàn phím nếu đang nhập text

    // Đợi 150ms để bàn phím hạ hẳn trước khi đo tọa độ
    setTimeout(() => {
      dateRef.current?.measureInWindow((x, windowY, w, h) => {
        const dropdownWidth = 340;
        const finalX = (SCREEN_WIDTH - dropdownWidth) / 2; // Căn giữa tuyệt đối

        setPickerLayout({ x: finalX, y: windowY + h + 8, width: dropdownWidth });
        setActivePicker('date');

        Animated.parallel([
          Animated.timing(pickerOpacity, { toValue: 1, duration: 200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(pickerTranslateY, { toValue: 0, duration: 250, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true })
        ]).start();
      });
    }, 150);
  };

  const closeDropdownPicker = () => {
    Animated.parallel([
      Animated.timing(pickerOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(pickerTranslateY, { toValue: -8, duration: 150, useNativeDriver: true })
    ]).start(() => setActivePicker(null));
  };
  // --------------------------------------------------------------

  // Xử lý mở Camera hoặc Thư viện ảnh
  const handlePickImage = async (mode: 'camera' | 'gallery') => {
    setModalVisible(false);
    
    let result;
    if (mode === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          isVi ? 'Lỗi' : 'Error', 
          isVi ? 'Cần cấp quyền truy cập máy ảnh!' : 'Camera access permission is required!'
        );
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });
    } else {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          isVi ? 'Lỗi' : 'Error', 
          isVi ? 'Cần cấp quyền truy cập thư viện ảnh!' : 'Photo library access permission is required!'
        );
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });
    }

    if (!result.canceled && result.assets) {
      const newUris = result.assets.map(asset => asset.uri);
      setImages(prev => [...prev, ...newUris]);
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const onChangeDate = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setNextDate(selectedDate);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>
        {isVi ? 'Hồ sơ tiêm phòng' : 'Vaccination record'}
      </Text>

      {/* Nút Upload */}
      <TouchableOpacity 
        style={styles.uploadButton} 
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="cloud-upload-outline" size={24} color="#666" />
        <Text style={styles.uploadText}>
          {isVi ? 'Chọn tệp để tải lên' : 'Select files to upload'}
        </Text>
      </TouchableOpacity>

      {/* Lưới hiển thị ảnh đã tải lên */}
      {images.length > 0 && (
        <View style={styles.imageGrid}>
          {images.map((uri, index) => (
            <View key={index} style={styles.imageWrapper}>
              <Image source={{ uri }} style={styles.uploadedImage} />
              <TouchableOpacity 
                style={styles.deleteIcon} 
                onPress={() => removeImage(index)}
              >
                <Ionicons name="close-circle" size={20} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Cụm thông tin khi đã có ảnh hoặc record */}
      {images.length > 0 && (
        <View style={styles.recordDetails}>
          <View style={styles.switchRow}>
            <Text style={styles.label}>
              {isVi ? 'Ngày đến hạn tiếp theo' : 'Next due date'}
            </Text>
            <Switch
              value={hasNextDueDate}
              onValueChange={setHasNextDueDate}
              trackColor={{ false: '#E5E5EA', true: '#E89B5A' }}
            />
          </View>

          {/* Hiển thị Input và DatePicker khi Switch được bật */}
          {hasNextDueDate && (
            <View style={styles.expandedForm}>
              <View style={styles.inputGroup} ref={dateRef} collapsable={false}>
                <Text style={styles.subLabel}>
                  {isVi ? 'Ngày tiêm dự kiến' : 'Expected vaccination date'}
                </Text>
                <TouchableOpacity 
                  style={styles.dateInput}
                  onPress={() => Platform.OS === 'ios' ? openDropdownPicker() : setShowDatePicker(true)}
                >
                  <Text style={{ fontSize: 14, color: '#1C1C1E' }}>
                    {nextDate.toLocaleDateString(isVi ? 'vi-VN' : 'en-US')}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.subLabel}>
                  {isVi ? 'Tên vaccine' : 'Vaccine name'}
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder={isVi ? 'Nhập tên...' : 'Enter name...'}
                  value={vaccineName}
                  onChangeText={setVaccineName}
                />
              </View>
            </View>
          )}
        </View>
      )}

      {/* Bottom Sheet / Modal chọn nguồn ảnh */}
      <Modal visible={isModalVisible} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {isVi ? 'Tải ảnh lên' : 'Upload photo'}
            </Text>
            <TouchableOpacity style={styles.modalOption} onPress={() => handlePickImage('camera')}>
              <Ionicons name="camera-outline" size={24} color="#333" />
              <Text style={styles.modalOptionText}>
                {isVi ? 'Chụp ảnh mới' : 'Take new photo'}
              </Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.modalOption} onPress={() => handlePickImage('gallery')}>
              <Ionicons name="images-outline" size={24} color="#333" />
              <Text style={styles.modalOptionText}>
                {isVi ? 'Chọn từ thư viện' : 'Choose from library'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ================= MODALS & PICKERS ================= */}

      {/* ANDROID NATIVE DATE PICKER */}
      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={nextDate}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={onChangeDate}
        />
      )}

      {/* --- KÍNH MỜ DROPDOWN FIX CHIỀU CAO VÀ MÀU CAM (IOS) --- */}
      {Platform.OS === 'ios' && activePicker === 'date' && (
        <Modal transparent visible={true} animationType="none">
          <View style={{ flex: 1, zIndex: 100 }}>
            <TouchableOpacity activeOpacity={1} style={{ flex: 1 }} onPress={closeDropdownPicker} />

            <Animated.View
              style={{
                position: 'absolute',
                top: pickerLayout.y,
                left: pickerLayout.x,
                width: pickerLayout.width,
                opacity: pickerOpacity,
                transform: [{ translateY: pickerTranslateY }],
                borderRadius: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.25,
                shadowRadius: 16,
                elevation: 10,
                overflow: 'hidden'
              }}
            >
              <BlurView tint="dark" intensity={65} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} />
              <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(15, 15, 15, 0.45)' }} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', zIndex: 10 }}>
                <TouchableOpacity onPress={closeDropdownPicker}>
                  <Text style={{ fontSize: 16, color: '#A1A1AA', fontWeight: '500' }}>
                    {isVi ? 'Huỷ' : 'Cancel'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={closeDropdownPicker}>
                  <Text style={{ fontSize: 16, color: '#E89B5A', fontWeight: '600' }}>
                    {isVi ? 'Xong' : 'Done'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ paddingTop: 4, paddingBottom: 4, paddingHorizontal: 10, alignItems: 'center', zIndex: 10 }}>
                <DateTimePicker
                  value={nextDate}
                  mode="date"
                  display="inline"
                  themeVariant="dark"
                  locale={isVi ? "vi-VN" : "en-US"}
                  minimumDate={new Date()}
                  style={{ width: 320, height: 315, alignSelf: 'center' }} 
                  accentColor="#E89B5A" 
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setNextDate(selectedDate);
                    }
                  }}
                />
              </View>
            </Animated.View>
          </View>
        </Modal>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  uploadButton: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
    borderRadius: 4,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  uploadText: {
    marginTop: 8,
    color: '#666',
    fontSize: 14,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    gap: 8,
  },
  imageWrapper: {
    width: '31%', 
    aspectRatio: 1,
    position: 'relative',
    borderRadius: 4,
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  deleteIcon: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  recordDetails: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 4,
    padding: 12,
    backgroundColor: '#FFF',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  expandedForm: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F2',
  },
  inputGroup: {
    flex: 1,
  },
  subLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 4,
    paddingHorizontal: 12,
    height: 44,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 4,
    paddingHorizontal: 12,
    height: 44,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  modalOptionText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
  },
});