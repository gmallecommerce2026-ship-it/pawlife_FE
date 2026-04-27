import { Text } from '@/components/AppText';
import { Feather } from '@expo/vector-icons';
import { Slider } from '@miblanchard/react-native-slider';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

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

  const fetchLocation = async () => {
    setLoadingMap(true);

    try {
      let { status } = await Location.getForegroundPermissionsAsync();

      if (status !== 'granted') {
        const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
        status = newStatus;
      }

      if (status !== 'granted') {
        Alert.alert(
          "Location Permission Required",
          "Location permission is currently denied. Please open your device Settings to grant permission.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() }
          ]
        );
        setLoadingMap(false);
        return;
      }

      const locationPromise = Location.getCurrentPositionAsync({});
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000));

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
  };

  useEffect(() => {
    if (isVisible) {
      fetchLocation();
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
      <TouchableWithoutFeedback onPress={onClose}>
        <BlurView 
          intensity={30} // Độ mờ (từ 1 đến 100)
          tint="dark" className="flex-1 justify-center items-center bg-black/40 px-6">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="w-full items-center"
          >
            <TouchableWithoutFeedback>
              <View
                className="bg-white w-[90%] rounded-[30px] relative mt-8 border border-[#FF9C56]"

              >

                <View className="absolute -top-[35px] self-center w-[73px] h-[73px] z-20">
                  <View className="absolute top-0 w-[73px] h-[36.5px] bg-white border-t-[1px] border-l-[1px] border-r-[1px] border-[#E89B5A] rounded-t-[40px]" />

                  <View className="absolute bottom-0 w-[73px] h-[36.6px] bg-white border-b-[1px] border-l-[1px] border-r-[1px] border-white rounded-b-[40px]" />

                  <View className="absolute inset-0 items-center justify-center">
                    <Image
                      source={require('../assets/icon/share-location-icon.png')}
                      style={{ width: 30, height: 30 }}
                      resizeMode="cover"
                    />
                  </View>

                </View>

                <View className="px-5 items-center mt-10 relative">
                  <Text className="text-[18px] font-semibold text-black text-center leading-[22px] w-full">Share My Location</Text>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20, paddingTop: 15 }}
                  keyboardShouldPersistTaps="handled"
                >

                  <View className="px-6">
                    <View className="bg-white rounded-[24px]"
                      style={{
                        // Đổ bóng cho iOS (Bạn có thể tinh chỉnh thông số này theo ý thích)
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.15,
                        shadowRadius: 2,

                        // Đổ bóng cho Android
                        elevation: 8,
                      }}>

                      <View className="w-full h-[178px] rounded-[20px] overflow-hidden bg-gray-100 relative justify-center items-center border border-gray-100">
                        {loadingMap ? (
                          <View className="items-center justify-center p-4">
                            <ActivityIndicator color="#FF9C56" size="small" />
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
                          <TouchableOpacity
                            activeOpacity={0.7}
                            className="items-center justify-center p-4 w-full h-full"
                            onPress={fetchLocation}
                          >
                            <View className="w-12 h-12 rounded-full bg-gray-200/70 items-center justify-center mb-2">
                              <Feather name="map-pin" size={20} color="#9CA3AF" />
                            </View>
                            <Text className="text-gray-400 text-xs font-medium text-center px-4">
                              Tap to enable location services
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>

                  <View className="px-12">
                    {(() => {
                      const percent = ((radius - 100) / 4900) * 100;

                      return (
                        <View style={{ height: 40, justifyContent: 'center', position: 'relative' }}>

                          <LinearGradient
                            colors={['#FFD8B2', '#FF9C56', '#D84315']}
                            start={{ x: 0, y: 0.5 }}
                            end={{ x: 1, y: 0.5 }}
                            style={{
                              position: 'absolute',
                              left: 0,
                              right: 0,
                              height: 2,
                              borderRadius: 1,
                            }}
                          />

                          <View
                            style={{
                              position: 'absolute',
                              right: 0,
                              width: `${100 - percent}%`,
                              height: 2,
                              backgroundColor: '#E5E7EB', // Màu xám nhạt
                              borderRadius: 1,
                            }}
                          />

                          <Slider
                            value={radius}
                            minimumValue={100}
                            maximumValue={5000}
                            step={100}
                            onValueChange={handleSliderChange}

                            // Xóa sổ mọi màu sắc mặc định của track
                            minimumTrackTintColor="transparent"
                            maximumTrackTintColor="transparent"
                            trackStyle={{ height: 2, backgroundColor: 'transparent' }}

                            thumbStyle={{
                              width: 14.35,
                              height: 14.35,
                              backgroundColor: '#FFFFFF',
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 1 },
                              shadowOpacity: 0.25,
                              shadowRadius: 2,
                              elevation: 4,
                            }}
                          />
                        </View>
                      );
                    })()}

                    <Text className="text-[#8E8E93] font-regular text-[10px] text-center -mt-2">
                      {radius < 1000 ? `${Math.round(radius)}m` : `${(radius / 1000).toFixed(1)} km`}
                    </Text>
                  </View>

                  <View className="px-5 mt-3 gap-y-3">

                    <View className="flex-row items-center pr-8">
                      <Image
                        className='mr-3 top-1'
                        source={require('../assets/icon/phone-gray.png')}
                        style={{ width: 15, height: 15 }}
                        resizeMode="cover"
                      />
                      <View className='flex-row border-b border-gray-300 w-full pt-2 pb-1'>
                        <Text className="text-[14px] font-medium text-black">Phone Number<Text className="text-[#EF4444]"> *</Text></Text>
                        <TextInput
                          placeholder="0123456789"
                          placeholderTextColor="#9CA3AF"
                          className="flex-1 text-[14px] text-[#1C1C1E] p-0 text-right"
                          value={formData.phoneNumber}
                          onChangeText={(t) => setFormData({ ...formData, phoneNumber: t })}
                        />
                      </View>
                    </View>

                    <View className="flex-row items-center pr-8 mt-1">
                      <Image
                        className='mr-3 top-1'
                        source={require('../assets/icon/person-gray.png')}
                        style={{ width: 15, height: 15 }}
                        resizeMode="cover"
                      />
                      <View className='flex-row border-b border-gray-300 w-full pt-2 pb-1'>
                        <Text className="text-[14px] font-medium text-black">Your Name</Text>
                        <TextInput
                          placeholder="Sharah John"
                          placeholderTextColor="#9CA3AF"
                          className="flex-1 text-[14px] text-[#1C1C1E] p-0 text-right"
                          value={formData.scannedBy}
                          onChangeText={(t) => setFormData({ ...formData, scannedBy: t })}
                        />
                      </View>
                    </View>

                    <View className='mt-1'>
                      <View className="flex-row items-center pr-8 mt-2">
                        <Image
                          className='mr-3'
                          source={require('../assets/icon/note-gray.png')}
                          style={{ width: 15, height: 15 }}
                          resizeMode="cover"
                        />
                        <Text className="text-[14px] font-medium text-black">Notes</Text>
                      </View>
                      <View className='border-b border-gray-300 pb-1 ml-7'>
                        <TextInput
                          placeholder="Leave a short note for owner"
                          placeholderTextColor="#9CA3AF"
                          className="flex-1 text-[14px] text-[#1C1C1E] p-0 text-right"
                          value={formData.message}
                          onChangeText={(t) => setFormData({ ...formData, message: t })}
                        />
                      </View>
                    </View>
                  </View>

                  <View className="px-5 mt-6 flex-row gap-3">
                    <TouchableOpacity
                      onPress={onClose}
                      className="flex-1 rounded-[16px] border border-[#8E8E93] py-3.5 items-center"
                    >
                      <Text className="text-[#8E8E93] text-[14px] font-regular">Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleConfirm}
                      className="flex-1 bg-[#E89B5A] py-3.5 rounded-[16px] items-center"
                    >
                      <Text className="text-white text-[14px] font-semibold">Send</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </BlurView>
      </TouchableWithoutFeedback>
    </Modal>
  );
}