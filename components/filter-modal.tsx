import { Text } from '@/components/AppText';
import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Image, Modal, ScrollView, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import * as Location from 'expo-location';
import { ActivityIndicator } from 'react-native';

// --- CÁC COMPONENT CON NỘI BỘ (Chỉ dùng trong modal này) ---

// 1. Nhãn tiêu đề phần nhỏ (Breed, Gender...)
const SectionLabel = ({ title, optional }: { title: string, optional?: boolean }) => (
    <View className="flex-row items-baseline">
        <Text className="text-black font-semibold text-[14px] tracking-[0.06px]">
            {title}
        </Text>
        {/* Nếu optional = true thì mới hiển thị chữ (Optional) */}
        {optional && (
            <Text className="text-[#8E8E93] font-regular text-[14px] ml-1 tracking-[0.06px]">
                (Optional)
            </Text>
        )}
    </View>
);

const LocationDisplay = ({ value, loading }: { value: string, loading: boolean }) => (
    <View className="w-full flex-row items-center justify-between px-5 py-2.5 border border-[#E5E5E5] rounded-full mt-3">
        <View className="flex-row items-center flex-1 pr-4">
            <Image className='w-[16px] h-[16px] mr-2' source={require('../assets/icon/location_solid.png')}></Image>
            {loading ? (
                <ActivityIndicator size="small" color="#E89B5A" className="ml-1" />
            ) : (
                <Text className={`text-[14px] text-[#8E8E93] flex-1 ${value.includes('Fetching') || value.includes('Select') ? 'text-gray-400' : 'text-black'}`} numberOfLines={1}>
                    {value}
                </Text>
            )}
        </View>
    </View>
);

// 3. Thẻ Chip hình viên thuốc (Dùng cho Gender, Age)
const FilterChip = ({ label, selected, onPress, iconSource }: any) => {
    const containerStyle = selected
        ? "border-[#E89B5A]"
        : "border border-[#E5E5E5]";
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            // Thêm flex-row để ảnh và chữ nằm ngang, justify-center để luôn căn giữa thẻ
            className={`flex-1 py-2.5 border rounded-full flex-row items-center justify-center ${containerStyle}`}
        >
            {iconSource && (
                <Image
                    source={iconSource}
                    className="w-[16px] h-[16px] mr-2" // mr-2 tạo khoảng cách với chữ
                    resizeMode="contain"
                />
            )}

            <Text className={`text-[14px] text-black font-regular`}>{label}</Text>
        </TouchableOpacity>
    );
};


// --- COMPONENT CHÍNH ---
export default function FilterModal({ visible, onClose }: { visible: boolean, onClose: () => void }) {
    const [selectedGender, setSelectedGender] = useState<string | null>(null);
    const [selectedAge, setSelectedAge] = useState<string | null>(null);
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [selectedSize, setSelectedSize] = useState<string | null>(null);
    const [selectedSterilized, setSelectedSterilized] = useState<boolean | null>(null);

    const [userLocation, setUserLocation] = useState<string>('Select Location');
    const [isLocationLoading, setIsLocationLoading] = useState<boolean>(false);

    useEffect(() => {
        if (visible) {
            getLocationAsync();
        }
    }, [visible]);

    const getLocationAsync = async () => {
        setIsLocationLoading(true);
        setUserLocation('Fetching location...');
        try {
            // Yêu cầu quyền truy cập GPS
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setUserLocation('Permission denied');
                setIsLocationLoading(false);
                return;
            }

            // Lấy tọa độ hiện tại (kinh độ, vĩ độ)
            let location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            // Chuyển tọa độ sang địa chỉ bằng Reverse Geocode
            let reverseGeocode = await Location.reverseGeocodeAsync({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });

            if (reverseGeocode && reverseGeocode.length > 0) {
                const address = reverseGeocode[0];
                // Tạo chuỗi hiển thị ngắn gọn đẹp mắt (Ví dụ: "Quận 1, Hồ Chí Minh" hoặc "District 1, HCMC")
                const district = address.district || address.subregion || '';
                const city = address.city || address.region || '';

                if (district && city) {
                    setUserLocation(`${district}, ${city}`);
                } else {
                    setUserLocation(city || address.name || 'Location Detected');
                }
            } else {
                setUserLocation('Unknown Location');
            }
        } catch (error) {
            console.error(error);
            setUserLocation('Failed to get location');
        } finally {
            setIsLocationLoading(false);
        }
    };


    const handleReset = () => {
        setSelectedGender(null);
        setSelectedAge(null);
    };

    const handleApply = () => {
        onClose();
    };

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <TouchableOpacity
                activeOpacity={1}
                onPress={onClose}
                className="flex-1 bg-black/50 justify-center items-center px-5"
            >
                <TouchableWithoutFeedback>
                    <View className="bg-white w-full rounded-[32px] overflow-hidden max-h-[80%] shadow-2xl pt-8">

                        <View className='mx-[20px]'>

                            <View className="flex-row items-center justify-between">
                                <SectionLabel title="Location" />

                                {/* Nút X đóng modal */}
                                <TouchableOpacity onPress={onClose} className="p-2.5 -mt-1 -mr-1">
                                    <Feather name="x" size={16} color="#111827" />
                                </TouchableOpacity>
                            </View>
                            {/* Ô hiển thị vị trí tự động cập nhật */}
                            <LocationDisplay value={userLocation} loading={isLocationLoading} />

                            <View className="mt-5">
                                <SectionLabel title="Pet Type" />
                                <View className="flex-row justify-between gap-3 mt-3">
                                    <FilterChip
                                        label="All"
                                        selected={selectedType === 'all'}
                                        onPress={() => setSelectedType('all')}
                                        iconSource={require('../assets/icon/all-filter.png')}
                                    />
                                    <FilterChip
                                        label="Cat"
                                        selected={selectedType === 'cat'}
                                        onPress={() => setSelectedType('cat')}
                                        iconSource={require('../assets/icon/cat-filter.png')}
                                    />
                                    <FilterChip
                                        label="Dog"
                                        selected={selectedType === 'dog'}
                                        onPress={() => setSelectedType('dog')}
                                        iconSource={require('../assets/icon/dog-filter.png')}
                                    />
                                </View>
                            </View>

                            <View className="mt-5">
                                <SectionLabel title="Gender" optional />
                                <View className="flex-row flex-wrap justify-between gap-3 mt-3">
                                    <FilterChip
                                        label="Female"
                                        selected={selectedGender === 'female'}
                                        onPress={() => setSelectedGender('female')}
                                        iconSource={require('../assets/icon/female-filter.png')}
                                    />
                                    <FilterChip
                                        label="Male"
                                        selected={selectedGender === 'male'}
                                        onPress={() => setSelectedGender('male')}
                                        iconSource={require('../assets/icon/male-filter.png')}
                                    />
                                </View>
                            </View>

                            <View className="mt-5">
                                <SectionLabel title="Sterilized" optional />
                                <View className="flex-row flex-wrap justify-between gap-3 mt-3">
                                    <FilterChip
                                        label="Yes"
                                        selected={selectedSterilized === true}
                                        onPress={() => setSelectedSterilized(true)}
                                    />
                                    <FilterChip
                                        label="No"
                                        selected={selectedSterilized === false}
                                        onPress={() => setSelectedSterilized(false)}
                                    />
                                </View>
                            </View>

                            <View className="mt-5">
                                <SectionLabel title="Age" optional />
                                <View className="flex-row flex-wrap justify-between gap-3 mt-3">
                                    <FilterChip
                                        label="Baby"
                                        selected={selectedAge === 'baby'}
                                        onPress={() => setSelectedAge('baby')}
                                    />
                                    <FilterChip
                                        label="Young"
                                        selected={selectedAge === 'young'}
                                        onPress={() => setSelectedAge('young')}
                                    />
                                    <FilterChip
                                        label="Adult"
                                        selected={selectedAge === 'adult'}
                                        onPress={() => setSelectedAge('adult')}
                                    />
                                    <FilterChip
                                        label="Senior"
                                        selected={selectedAge === 'senior'}
                                        onPress={() => setSelectedAge('senior')}
                                    />
                                </View>
                            </View>
                            <View className="mt-5">
                                <SectionLabel title="Size" optional />
                                <View className="flex-row flex-wrap justify-between gap-3 mt-3">
                                    <FilterChip
                                        label="Small"
                                        selected={selectedSize === 'small'}
                                        onPress={() => setSelectedSize('small')}
                                    />
                                    <FilterChip
                                        label="Medium"
                                        selected={selectedSize === 'medium'}
                                        onPress={() => setSelectedSize('medium')}
                                    />
                                    <FilterChip
                                        label="Large"
                                        selected={selectedSize === 'large'}
                                        onPress={() => setSelectedSize('large')}
                                    />
                                </View>
                            </View>


                            {/* --- BOTTOM BUTTONS (Reset & Apply) --- */}
                            <View className="flex-row items-center justify-between py-6">
                                <TouchableOpacity
                                    onPress={handleApply}
                                    className="w-full bg-[#E89B5A] py-4 rounded-full items-center active:bg-[#D68A4A]"
                                >
                                    <Text className="text-white font-semibold text-[16px]">Apply</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                    </View>
                </TouchableWithoutFeedback>
            </TouchableOpacity>
        </Modal>
    );
}