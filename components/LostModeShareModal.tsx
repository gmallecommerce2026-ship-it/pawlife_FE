import { Text } from '@/components/AppText';
import { Feather } from '@expo/vector-icons';
import { Slider } from '@miblanchard/react-native-slider';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface FormData {
  scannedBy: string;
  phoneNumber: string;
  message: string;
}

interface LostModeShareModalProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: (location: any, formData: FormData, isSkipped: boolean) => void;
}

export default function LostModeShareModal({ isVisible, onClose, onConfirm }: LostModeShareModalProps) {
  const [location, setLocation] = useState<any>(null);
  const [radius, setRadius] = useState<number>(500);
  const [loadingMap, setLoadingMap] = useState(true);

  const [formData, setFormData] = useState<FormData>({
    scannedBy: '',
    phoneNumber: '',
    message: '',
  });

  useEffect(() => {
    if (isVisible) {
      (async () => {
        setLoadingMap(true);
        const locationPromise = Location.getCurrentPositionAsync({});
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000));

        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLoadingMap(false);
                return;
            }
            let currentLocation: any = await Promise.race([locationPromise, timeoutPromise]);
            setLocation({
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude,
            });
        } catch (error) {
            console.error("Error getting location:", error);
        } finally {
            setLoadingMap(false);
        }
      })();
    }
  }, [isVisible]);

  const handleConfirm = () => {
    const locationData = { ...location, radius };
    onConfirm(locationData, formData, false);
  };

  const handleSliderChange = (value: number | number[]) => {
    const numericValue = Array.isArray(value) ? value[0] : value;
    setRadius(numericValue);
  };

  const circleSize = 40 + ((radius - 100) / 4900) * 160; 

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      {/* Background overlay hơi tối nhẹ */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 justify-center items-center bg-black/40 px-6">
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="w-full items-center"
          >
            <TouchableWithoutFeedback>
              {/* Modal Container: Vẫn giữ border cam và custom shadow màu cam */}
              <View 
                className="bg-white w-[90%] rounded-[30px] relative mt-8 border border-[#FF9C56]"
                style={{ 
                  maxHeight: SCREEN_HEIGHT * 0.85,
                  shadowColor: '#FF9C56',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.4,
                  shadowRadius: 15,
                  elevation: 20,
                }}
              >
                
                {/* Hình tròn nhô lên ở cạnh trên */}
                <View className="absolute -top-8 self-center w-16 h-16 bg-[#FF9C56] rounded-full border-4 border-white items-center justify-center shadow-sm z-20">
                   <Feather name="map-pin" size={24} color="white" />
                </View>

                <ScrollView 
                  showsVerticalScrollIndicator={false} 
                  contentContainerStyle={{ paddingBottom: 24, paddingTop: 40 }}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Header */}
                  <View className="px-5 items-center mb-4 relative">
                    <Text className="text-xl font-extrabold text-gray-800 text-center">Share My Location</Text>
                  </View>

                  {/* Map Preview */}
                  <View className="px-5">
                    <View className="w-full h-[140px] rounded-[20px] overflow-hidden bg-gray-100 relative justify-center items-center border border-gray-100">
                      {loadingMap ? (
                        <View className="items-center justify-center p-4">
                          <ActivityIndicator color="#FF9C56" size="small"/>
                          <Text className="text-gray-400 text-xs mt-2 text-center">Fetching location...</Text>
                        </View>
                      ) : location ? (
                        <>
                          <Image 
                            source={{ 
                              uri: `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+EF4444(${location.longitude},${location.latitude})/${location.longitude},${location.latitude},14,0/400x200@2x?access_token=${process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN}` 
                            }}
                            style={{ width: '100%', height: '100%', position: 'absolute' }}
                          />
                          <View 
                            style={{
                              width: circleSize,
                              height: circleSize,
                              borderRadius: circleSize / 2,
                              backgroundColor: 'rgba(255, 156, 86, 0.2)',
                              borderColor: 'rgba(255, 156, 86, 0.6)',
                              borderWidth: 1.5,
                              position: 'absolute',
                            }}
                          />
                        </>
                      ) : (
                        <View className="items-center justify-center p-4">
                            <View className="w-12 h-12 rounded-full bg-gray-200/70 items-center justify-center mb-2">
                                <Feather name="map-pin" size={20} color="#9CA3AF" />
                            </View>
                            <Text className="text-gray-400 text-xs font-medium text-center px-4">
                                Tap to enable location services
                            </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Slider */}
                  <View className="px-5 mt-4">
                    <View className="flex-row justify-between items-center">
                      <Text className="text-gray-600 font-bold text-sm">Radius</Text>
                      <Text className="text-[#FF9C56] font-bold text-sm">
                        {radius < 1000 ? `${Math.round(radius)}m` : `${(radius / 1000).toFixed(1)}km`}
                      </Text>
                    </View>
                    <Slider
                      value={radius}
                      minimumValue={100}
                      maximumValue={5000}
                      step={100}
                      onValueChange={handleSliderChange}
                      minimumTrackTintColor="#FF9C56"
                      thumbStyle={{ width: 18, height: 18, backgroundColor: '#FFF', borderWidth: 2, borderColor: '#FF9C56' }}
                      trackStyle={{ height: 4 }}
                    />
                  </View>

                  {/* Form Inputs */}
                  <View className="px-5 mt-4">
                    
                    {/* Name: Title Trái, Input Phải */}
                    <View className="flex-row items-center mb-3">
                      <Text className="w-[25%] text-gray-700 font-medium text-sm">Name</Text>
                      <View className="flex-1 bg-gray-50 rounded-xl border border-gray-100 px-4 py-2">
                        <TextInput
                          className="text-gray-700 text-sm p-0"
                          value={formData.scannedBy}
                          onChangeText={(t) => setFormData({ ...formData, scannedBy: t })}
                        />
                      </View>
                    </View>

                    {/* Phone: Title Trái, Input Phải */}
                    <View className="flex-row items-center mb-3">
                      <Text className="w-[25%] text-gray-700 font-medium text-sm">Phone</Text>
                      <View className="flex-1 bg-gray-50 rounded-xl border border-gray-100 px-4 py-2">
                        <TextInput
                          keyboardType="phone-pad"
                          className="text-gray-700 text-sm p-0"
                          value={formData.phoneNumber}
                          onChangeText={(t) => setFormData({ ...formData, phoneNumber: t })}
                        />
                      </View>
                    </View>

                    {/* Notes: Title Trên, Input Dưới */}
                    <View className="mt-1">
                      <Text className="text-gray-700 font-medium text-sm mb-2">Notes</Text>
                      <View className="bg-gray-50 rounded-xl border border-gray-100 px-4 py-2">
                        <TextInput
                          multiline
                          numberOfLines={3}
                          textAlignVertical="top"
                          className="text-gray-700 text-sm h-16 p-0"
                          value={formData.message}
                          onChangeText={(t) => setFormData({ ...formData, message: t })}
                        />
                      </View>
                    </View>

                  </View>

                  {/* Buttons */}
                  <View className="px-5 mt-6 flex-row gap-3">
                    <TouchableOpacity 
                      onPress={onClose}
                      className="flex-1 bg-gray-100 py-3.5 rounded-xl items-center"
                    >
                      <Text className="text-gray-500 font-bold">Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      onPress={handleConfirm}
                      className="flex-1 bg-[#FF9C56] py-3.5 rounded-xl items-center shadow-md shadow-orange-200"
                    >
                      <Text className="text-white font-bold">Confirm</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}