import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

export const useLocation = () => {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [manualCity, setManualCity] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // THÊM BIẾN NÀY: Để biết đã đọc xong từ AsyncStorage chưa
  const [isLocationLoaded, setIsLocationLoaded] = useState(false); 

  useEffect(() => {
    const loadSavedLocation = async () => {
      try {
        const savedCity = await AsyncStorage.getItem('@user_city');
        const savedLat = await AsyncStorage.getItem('@user_lat');
        const savedLng = await AsyncStorage.getItem('@user_lng');

        if (savedCity) setManualCity(savedCity);
        if (savedLat && savedLng) {
          setLocation({ lat: parseFloat(savedLat), lng: parseFloat(savedLng) });
        }
      } catch (e) {
        console.log("Lỗi khi load vị trí", e);
      } finally {
        // Đọc xong (dù có data hay null) thì đánh dấu là true
        setIsLocationLoaded(true); 
      }
    };
    loadSavedLocation();
  }, []);

  const requestLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setErrorMsg('Quyền truy cập vị trí bị từ chối.');
      return null;
    }

    let loc = await Location.getCurrentPositionAsync({});
    const newLoc = { lat: loc.coords.latitude, lng: loc.coords.longitude };
    
    setLocation(newLoc);
    await AsyncStorage.setItem('@user_lat', newLoc.lat.toString());
    await AsyncStorage.setItem('@user_lng', newLoc.lng.toString());
    await AsyncStorage.removeItem('@user_city'); 
    setManualCity(null);
    
    return newLoc;
  };

  const saveManualCity = async (city: string) => {
    setManualCity(city);
    await AsyncStorage.setItem('@user_city', city);
    setLocation(null);
    await AsyncStorage.removeItem('@user_lat');
    await AsyncStorage.removeItem('@user_lng');
  };

  // Trả về thêm isLocationLoaded
  return { location, manualCity, errorMsg, isLocationLoaded, requestLocation, saveManualCity };
};