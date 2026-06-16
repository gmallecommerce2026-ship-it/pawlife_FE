import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Switch,
  TextInput,
  Modal,
  StyleSheet,
  Platform,
  Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

export default function VaccinationSection() {
  const [images, setImages] = useState<string[]>([]);
  const [isModalVisible, setModalVisible] = useState(false);
  
  const [hasNextDueDate, setHasNextDueDate] = useState(false);
  const [nextDate, setNextDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [vaccineName, setVaccineName] = useState('');

  // Xử lý mở Camera hoặc Thư viện ảnh
  const handlePickImage = async (mode: 'camera' | 'gallery') => {
    setModalVisible(false);
    
    let result;
    if (mode === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Lỗi', 'Cần cấp quyền truy cập máy ảnh!');
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });
    } else {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Lỗi', 'Cần cấp quyền truy cập thư viện ảnh!');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true, // Cho phép chọn nhiều
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
    const currentDate = selectedDate || nextDate;
    setShowDatePicker(Platform.OS === 'ios');
    setNextDate(currentDate);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Vaccination record</Text>

      {/* Nút Upload */}
      <TouchableOpacity 
        style={styles.uploadButton} 
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="cloud-upload-outline" size={24} color="#666" />
        <Text style={styles.uploadText}>Chọn tệp để tải lên</Text>
      </TouchableOpacity>

      {/* Lưới hiển thị ảnh đã tải lên (Tối đa 3 hình/hàng) */}
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
            <Text style={styles.label}>Next due date</Text>
            <Switch
              value={hasNextDueDate}
              onValueChange={setHasNextDueDate}
              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
            />
          </View>

          {/* Hiển thị Input và DatePicker khi Switch được bật */}
          {hasNextDueDate && (
            <View style={styles.expandedForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.subLabel}>Ngày tiêm dự kiến</Text>
                <TouchableOpacity 
                  style={styles.dateInput}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text>{nextDate.toLocaleDateString('vi-VN')}</Text>
                  <Ionicons name="calendar-outline" size={20} color="#666" />
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={nextDate}
                    mode="date"
                    display="default"
                    onChange={onChangeDate}
                  />
                )}
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.subLabel}>Tên vaccine</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Nhập tên..."
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
            <Text style={styles.modalTitle}>Tải ảnh lên</Text>
            <TouchableOpacity style={styles.modalOption} onPress={() => handlePickImage('camera')}>
              <Ionicons name="camera-outline" size={24} color="#333" />
              <Text style={styles.modalOptionText}>Chụp ảnh mới</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.modalOption} onPress={() => handlePickImage('gallery')}>
              <Ionicons name="images-outline" size={24} color="#333" />
              <Text style={styles.modalOptionText}>Chọn từ thư viện</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    borderRadius: 4, // Bo góc tinh tế, chuẩn minimalism
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
    gap: 8, // Yêu cầu React Native > 0.71, nếu dùng bản cũ đổi sang margin
  },
  imageWrapper: {
    width: '31%', // Đảm bảo đúng 3 ảnh trên 1 hàng với gap
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