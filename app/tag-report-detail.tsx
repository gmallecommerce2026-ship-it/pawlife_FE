import { Text } from '@/components/AppText';
import ReportUGCModal from '@/components/ReportUGCModal';
import { Feather, Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  TouchableWithoutFeedback as RNTouchableWithoutFeedback,
  Share,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import axiosClient from '../api/axiosClient';
import { petService } from '../services/petService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_WIDTH = Math.round(SCREEN_WIDTH);
const BACKGROUND_MAP_HEIGHT = SCREEN_HEIGHT * 0.65;

interface ActivityProp {
  id: string;
  type: 'SCAN' | 'LOCATION' | 'REPORT';
  title: string;
  time: string;
  location?: string;
  note?: string;
  contactName?: string;
  contactPhone?: string;
}

const TimelineItem = ({ item, isLast }: { item: ActivityProp; isLast: boolean }) => {
  const handleCallPress = () => {
    if (!item.contactPhone) return;
    const phoneNumber = `tel:${item.contactPhone}`;
    Linking.canOpenURL(phoneNumber)
      .then((supported) => {
        if (supported) Linking.openURL(phoneNumber);
        else Alert.alert("Error", "Device does not support phone calls.");
      })
      .catch((err) => console.error("Error opening Linking:", err));
  };

  const renderIcon = () => {
    switch (item.type) {
      case 'SCAN':
        return <Image source={require('../assets/icon/scan.png')} style={{ width: 13, height: 13 }} resizeMode="cover" />;
      case 'LOCATION':
        return <Image source={require('../assets/icon/location-gray-icon.png')} style={{ width: 13, height: 16 }} resizeMode="cover" />;
      case 'REPORT':
        return <Image source={require('../assets/icon/noti-gray.png')} style={{ width: 13, height: 13 }} resizeMode="cover" />;
      default:
        return <View className="w-2 h-2 bg-gray-400 rounded-full" />;
    }
  };

  return (
    <View className="flex-row">
      <View className="items-center mr-4 relative">
        <View className="w-13 h-13 rounded-full bg-white items-center justify-center z-10 pt-1">
          {renderIcon()}
        </View>
        {!isLast && <View className="absolute top-8 bottom-[-16px] w-[1px] bg-gray-300 z-0" />}
      </View>

      <View className="flex-1 pb-6">
        <View className="flex-row justify-between items-start mb-1">
          <Text className="text-black text-[14px] font-medium flex-1 pr-2 leading-5">{item.title}</Text>
          <Text className="text-[#8E8E93] font-regular text-[10px] mt-0.5 tracking-[0.06px]">{item.time}</Text>
        </View>

        {item.location && (
          <View className="flex-row items-start mt-1">
            <Image className='top-[2px]' source={require('../assets/icon/location-gray-icon.png')} style={{ width: 8, height: 10 }} resizeMode="cover" />
            <Text className="text-[#8E8E93] text-[12px] ml-1 font-regular leading-5">{item.location}</Text>
          </View>
        )}

        {item.note && (
          <View className="flex-row items-start mt-1">
            <Image className='top-[3px]' source={require('../assets/icon/note-gray.png')} style={{ width: 9, height: 9 }} resizeMode="cover" />
            <Text className="text-[#8E8E93] text-[12px] ml-1 font-regular italic leading-5">{item.note}</Text>
          </View>
        )}

        {item.contactName && item.contactPhone && (
          <TouchableOpacity className="flex-row items-center mt-2" onPress={handleCallPress}>
            <Ionicons name="call" size={10} color="#9CA3AF" className='mr-1' />
            <Image source={require('../assets/icon/message-gray.png')} style={{ width: 9, height: 9 }} resizeMode="cover" />
            <Text className="text-[#8E8E93] text-[12px] ml-1 font-regular underline decoration-[#8E8E93]">
              Contact {item.contactName}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default function TagReportDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { reportId } = params;

  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [isOptionsVisible, setIsOptionsVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 30 });
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const snapPoints = useMemo(() => ['50%', '85%'], []);

  const getAge = (dobString?: string | Date | null) => {
    if (!dobString) return '? years old';
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return '? years old';
    
    const diff_ms = Date.now() - dob.getTime();
    const age_dt = new Date(diff_ms);
    const years = Math.abs(age_dt.getUTCFullYear() - 1970);
    const months = age_dt.getUTCMonth();

    if (years > 0) return `${years} year${years > 1 ? 's' : ''} old`;
    if (months > 0) return `${months} month${months > 1 ? 's' : ''} old`;
    return 'Newborn';
  };

  useFocusEffect(
    useCallback(() => {
      const fetchReportDetail = async () => {
        try {
          if (!reportId) return;
          const res = await axiosClient.get(`/tags/reports/${reportId}`);
          setReportData(res.data);
        } catch (error) {
          console.error("Error loading report details:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchReportDetail();
    }, [reportId])
  );

  const handleMarkAsFound = () => {
    const petId = reportData?.tag?.pet?.id;
    if (!petId) {
      Alert.alert("Error", "Pet data not found.");
      return;
    }

    Alert.alert(
      "Confirm",
      `Have you found ${reportData.tag.pet.name || 'your pet'}? Lost mode will be turned off and a thank you message will be sent to the scanner.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Mark as Found", 
          style: "default",
          onPress: async () => {
            try {
              setIsSubmitting(true);
              await petService.toggleLostMode(petId, { isLost: false });
              
              Alert.alert("Success!", "Lost mode has been turned off.");
              
              router.replace({
                pathname: '/pet-profile-detail',
                params: { id: petId }
              });
            } catch (error) {
              Alert.alert("Error", "Unable to update status. Please try again.");
            } finally {
              setIsSubmitting(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#E89B5A" />
      </View>
    );
  }

  if (!reportData) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <Text className="text-gray-500">Report information not found.</Text>
      </View>
    );
  }

  const lat = parseFloat(reportData.latitude || reportData.lat || '10.762622');
  const lng = parseFloat(reportData.longitude || reportData.lng || '106.660172');
  
  const handleShareLocation = () => {
    setIsOptionsVisible(false);
    
    setTimeout(async () => {
      const mapUrl = `https://maps.google.com/?q=${lat},${lng}`;

      try {
        await Share.share({
          message: Platform.OS === 'android' 
            ? `Pet location scanned here:\n${mapUrl}` 
            : `Pet location scanned here:`,
          url: mapUrl,
          title: 'Pet Location' 
        }, {
          dialogTitle: 'Share Pet Location',
          subject: 'Pet Location'
        });
      } catch (error: any) {
        Alert.alert("Error", "Unable to share location.");
      }
    }, 300);
  };

  const rawRadius = reportData.radius;
  const radius = (rawRadius !== null && rawRadius !== undefined && !isNaN(parseFloat(rawRadius))) ? parseFloat(rawRadius) : 0;

  const pet = reportData.tag?.pet || {};
  const ownerInfo = pet.shelter || pet.owner || {};
  const displayContactName = pet.contactName || ownerInfo.name || 'N/A';
  const displayContactPhone = pet.contactPhone || ownerInfo.phone || 'N/A';
  const displayContactAddress = pet.contactAddress || ownerInfo.address || 'Address not provided';

  const petImage = pet.images?.[0]?.url || 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=150&q=80';
  const scanHistory = reportData.scanHistory || [];

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Just now';
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }) + ' at ' + d.toLocaleDateString('en-GB');
  };

  const activities: ActivityProp[] = [
    {
      id: reportData.id,
      type: 'SCAN',
      title: reportData.scannedBy ? `Tag Scanned by ${reportData.scannedBy}` : 'Tag Scanned Anonymously',
      time: formatDate(reportData.createdAt),
      location: `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`,
      note: reportData.message || undefined,
      contactName: reportData.scannedBy || undefined,
      contactPhone: reportData.phoneNumber || undefined,
    }
  ];

  if (reportData.tag?.status === 'LOST') {
    activities.push({
      id: 'report-lost-origin',
      type: 'REPORT',
      title: `${pet.name || 'Pet'} reported as lost by ${displayContactName}`,
      time: 'Previously',
      location: displayContactAddress,
    });
  }

  const handlePinPress = () => {
    router.push({
      pathname: '/tag-route-details',
      params: {
        targetLat: lat.toString(),
        targetLng: lng.toString(),
        scannerName: reportData.scannedBy || 'Anonymous',
        scannerMessage: reportData.message || 'Found your pet in this area!',
        scannerPhone: reportData.phoneNumber || '',
        timeAgo: formatDate(reportData.scannedAt)
      }
    });
  };

  return (
    <View className="flex-1 bg-white relative">
      <TouchableOpacity
        className="absolute top-12 left-5 z-50 w-10 h-10 bg-white/80 rounded-full items-center justify-center shadow-sm"
        onPress={() => router.back()}
      >
        <Feather name="chevron-left" size={24} color="black" />
      </TouchableOpacity>

      <View style={{ height: BACKGROUND_MAP_HEIGHT, width: MAP_WIDTH, position: 'absolute', top: 0 }}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={{ flex: 1 }}
          initialRegion={{
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.008,
            longitudeDelta: 0.008,
          }}
        >
          {radius > 0 && (
            <Circle
              center={{ latitude: lat, longitude: lng }}
              radius={radius}
              fillColor="rgba(232, 155, 90, 0.25)"
              strokeColor="rgba(232, 155, 90, 0.6)"
              strokeWidth={1.5}
            />
          )}

          {scanHistory.map((scan: any) => {
            if (!scan.latitude || !scan.longitude) return null;
            return (
              <Marker
                key={scan.id}
                coordinate={{ latitude: parseFloat(scan.latitude), longitude: parseFloat(scan.longitude) }}
              >
                <View style={{ alignItems: 'center' }}>
                  <View style={{ borderColor: '#60A5FA', borderWidth: 2 }} className="w-[38px] h-[38px] bg-white rounded-full items-center justify-center shadow-sm">
                    <Ionicons name="paw" size={20} color="#60A5FA" />
                  </View>
                  <View style={{ width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#60A5FA' }} />
                </View>
              </Marker>
            );
          })}

          <Marker coordinate={{ latitude: lat, longitude: lng }} onPress={handlePinPress} zIndex={50}>
            <View style={{ alignItems: 'center', width: 80 }}>
              <View className="bg-[#DA5A5A] px-3 py-1.5 rounded-lg items-center shadow-md w-full">
                <Text className="text-white text-[10px] font-bold text-center">Tag Scanned</Text>
              </View>
              <View style={{ width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 6, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#DA5A5A' }} />
              <View className="h-1.5" />
              <View style={{ borderColor: '#DA5A5A', borderWidth: 2.5 }} className="w-11 h-11 bg-white rounded-full items-center justify-center shadow-sm">
                <Ionicons name="scan-outline" size={20} color="#DA5A5A" />
              </View>
              <View style={{ width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 9, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#DA5A5A' }} />
            </View>
          </Marker>
        </MapView>
      </View>

      <BottomSheet
        index={0}
        snapPoints={snapPoints}
        backgroundStyle={{ backgroundColor: 'white', borderRadius: 30 }}
        handleIndicatorStyle={{ backgroundColor: '#E5E5EA', width: 48, height: 6 }}
      >
        <BottomSheetScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 24, paddingTop: 10 }}>

          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center flex-1">
              <Image source={{ uri: petImage }} className="rounded-full mr-4" style={{ width: 60, height: 60 }} />
              <View>
                <View className="flex-row items-center mb-2">
                  <Text className="text-xl font-bold text-black mr-2">{pet.name || 'Unknown Pet'}</Text>
                  <View className="bg-[#FFE8E8] border border-[#DA5A5A]/25 px-[10px] py-1 rounded-full">
                    <Text className="text-[#DA5A5A] text-[10px] leading-[10px] font-regular">
                      {reportData.status === 'PENDING' ? 'Missing / Pending' : 'Resolved'}
                    </Text>
                  </View>
                </View>

                <Text className="text-[12px] text-[#757575] font-regular mb-2">
                  {getAge(pet.dob)} • {pet.breed || 'Unknown breed'}
                </Text>

                <TouchableOpacity onPress={() => {
                  if (pet?.id) {
                    router.push(`/edit-pet?id=${pet.id}`);
                  } else {
                    Alert.alert("Notice", "Pet identity information not found.");
                  }
                }}>
                  <View className='flex-row items-center'>
                    <Image className='bottom-1 mr-1' source={require('../assets/icon/pen.png')} style={{ width: 7, height: 8 }} resizeMode="cover" />
                    <Text className="text-[10px] text-[#8E8E93] mb-2 underline tracking-[0.06px]">Edit pet information</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity 
              className='bottom-6 p-2 -mr-2' 
              onPress={() => setIsOptionsVisible(true)}
            >
              <Image source={require('../assets/icon/more-vertical.png')} style={{ width: 18, height: 18 }} resizeMode="cover" />
            </TouchableOpacity>
          </View>

          <View className="bg-white">
            <Text className="text-[16px] font-semibold text-black leading-[16px] mb-[10px]">Owner Information</Text>
            <View className="flex justify-center items-center mb-4">
              <View className='bg-white border w-full border-[#E5E5E5] rounded-[16px] pt-[21px] pb-[23.15px]'>
                <View className="mx-[15px]">
                  <View className="flex-row items-center pr-8 mb-6">
                    <Image className='mr-3 top-1' source={require('../assets/icon/person-gray.png')} style={{ width: 15, height: 15 }} resizeMode="cover" />
                    <View className='flex-row border-b border-[#E5E5E5] w-full pt-2 pb-1 justify-between'>
                      <Text className="text-black text-[14px] font-regular leading-[16px]">Owner Name</Text>
                      <Text className="text-[#8E8E93] text-[14px] font-regular leading-[16px]">{displayContactName}</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center pr-8 mb-6">
                    <Image className='mr-3 top-1' source={require('../assets/icon/phone-gray.png')} style={{ width: 15, height: 15 }} resizeMode="cover" />
                    <View className='flex-row border-b border-[#E5E5E5] w-full pt-2 pb-1 justify-between'>
                      <Text className="text-black text-[14px] font-regular leading-[16px]">Phone Number</Text>
                      <Text className="text-[#8E8E93] text-[14px] font-regular leading-[16px]">{displayContactPhone}</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center pr-8 mb-4">
                    <Image className='mr-4 top-1' source={require('../assets/icon/location-gray.png')} style={{ width: 11, height: 15 }} resizeMode="cover" />
                    <View className='flex-row border-b border-[#E5E5E5] w-full pt-2 pb-1 justify-between'>
                      <Text className="text-black text-[14px] font-regular leading-[16px]">Address</Text>
                      <Text className="text-[#8E8E93] text-[14px] font-regular leading-[16px]" numberOfLines={2}>{displayContactAddress}</Text>
                    </View>
                  </View>
                </View>
              </View>
              <View className="flex items-center w-4/5 bg-[#FAFAFA] px-2.5 rounded-full border border-[#D9D9D9] bottom-5">
                <Text className="text-[#757575] text-[12px] font-regular leading-[20px] py-[6px]">
                  "Please contact me ASAP"
                </Text>
              </View>
            </View>
          </View>

          <Text className="text-[16px] font-semibold text-black mb-4 mt-2">Activity</Text>
          <View className="ml-1 mb-6">
            {activities.map((activity, index, array) => (
              <TimelineItem key={activity.id} item={activity} isLast={index === array.length - 1} />
            ))}
          </View>

          {reportData.status === 'PENDING' ? (
            <TouchableOpacity 
              onPress={handleMarkAsFound}
              disabled={isSubmitting}
              className='items-center justify-center border border-[#E89B5A] bg-[#E89B5A] py-4 rounded-[16px] mb-4 shadow-sm shadow-orange-200'
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className='font-semibold text-[16px] text-[#FFFF]'>Mark {pet.name || 'Pet'} as Found</Text>
              )}
            </TouchableOpacity>
          ) : (
            <View className='flex-row items-center justify-center bg-[#ECFDF5] border border-[#6EE7B7] py-4 rounded-[16px] mb-4'>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text className='font-semibold text-[15px] text-[#10B981] ml-2'>
                This report has been resolved
              </Text>
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
      
      <Modal
        visible={isOptionsVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOptionsVisible(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.1)' }}
          activeOpacity={1}
          onPressOut={() => setIsOptionsVisible(false)}
        >
          <RNTouchableWithoutFeedback>
            <View
              className="absolute top-[45%] right-[24px] w-[180px] bg-white rounded-[12px] border border-[#E5E5E5] overflow-hidden"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 10,
                elevation: 5,
              }}
            >
              <TouchableOpacity
                className="flex-row items-center px-2 py-3.5 border-b border-gray-100"
                onPress={handleShareLocation}
              >
                <Text className="ml-3 text-[13px] font-medium text-[#1C1C1E]">Share Location</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center px-2 py-3.5"
                onPress={() => {
                  setIsOptionsVisible(false);
                  setTimeout(() => {
                    setIsReportModalVisible(true);
                  }, 200); 
                }}
              >
                <Text className="ml-3 text-[13px] font-medium text-[#EF4444]">Report</Text>
              </TouchableOpacity>
            </View>
          </RNTouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      <ReportUGCModal 
        isVisible={isReportModalVisible} 
        onClose={() => setIsReportModalVisible(false)}
        reportTargetName={reportData?.scannedBy || 'Anonymous'}
      />
    </View>
  );
}