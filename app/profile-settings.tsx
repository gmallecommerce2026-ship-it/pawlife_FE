// app/profile-settings.tsx
import { AppContext } from '@/contexts/AppContext';
import { AuthContext } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext'; // Thêm import useLanguage
import { AntDesign, Feather, Ionicons, MaterialCommunityIcons, SimpleLineIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useContext } from 'react';
import { Alert, Image, ScrollView, TouchableOpacity, View } from 'react-native';
import { Switch } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/AppText';

type MenuItemProps = {
  icon: React.ReactNode;
  label: string;
  value?: string;
  isDestructive?: boolean;
  onPress?: () => void;
};

const MenuItem = ({ icon, label, value, isDestructive = false, onPress }: MenuItemProps) => (
  <TouchableOpacity 
    onPress={onPress}
    activeOpacity={0.7}
    className="flex-row items-center justify-between py-4" 
  >
    <View className="flex-row items-center">
      <View className="w-8 mr-3 items-center justify-center">
        {icon}
      </View>
      <Text className={`text-base font-semibold ${isDestructive ? 'text-red-500' : 'text-gray-900'}`}>
        {label}
      </Text>
    </View>

    <View className="flex-row items-center">
        {value && (
            <Text className="text-gray-500 font-medium mr-2">{value}</Text>
        )}
        {!isDestructive ? (
             <Feather name="chevron-right" size={20} color="#9CA3AF" />
        ) : null} 
    </View>
  </TouchableOpacity>
);

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { logout, user } = useContext(AuthContext);
  const { isFloatingButtonVisible, setIsFloatingButtonVisible } = useContext(AppContext);
  
  // Lấy hàm t (dịch) và biến language từ Context
  const { t, language } = useLanguage(); 

  const handleLogout = () => {
    Alert.alert(
      t('Log Out'), // Cập nhật dịch
      t('Are you sure you want to log out of this account?'), // Cập nhật dịch
      [
        { text: t('Cancel'), style: "cancel" },
        { 
          text: t('Log Out'), 
          style: "destructive",
          onPress: async () => {
            try {
              if (logout) {
                await logout();
              }
              router.replace('/');
            } catch (error) {
              Alert.alert(t('Error'), t('Unable to log out. Please try again!'));
            }
          }
        }
      ]
    );
  };

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        
        {/* --- HEADER --- */}
        <View className="flex-row items-center px-4 py-2 mb-2 relative">
            <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 z-10">
                <AntDesign name="left" size={24} color="#1F2937" />
            </TouchableOpacity>
            
            <View className="absolute left-0 right-0 items-center justify-center pointer-events-none">
                <Text className="text-xl font-bold text-gray-900">{t('Settings')}</Text>
            </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            
            <View className="items-center mt-2 mb-8">
              <View className="relative">
                  <Image 
                      source={{ uri: user?.avatarUrl || 'https://i.pravatar.cc/150?img=32' }} 
                      className="w-28 h-28 rounded-full bg-gray-200"
                      resizeMode="cover"
                  />
                  <View className="absolute bottom-0 right-1 bg-black p-1.5 rounded-full border-2 border-white">
                      <Feather name="edit-2" size={12} color="white" />
                  </View>
              </View>
              
              <Text className="text-xl font-bold text-gray-900 mt-4">
                  {user?.name || 'User'}
              </Text>
              <Text className="text-gray-500 text-sm font-medium mt-1">
                  {user?.phone || t('Phone not updated')}
              </Text>
          </View>

            <View className="h-[1px] bg-gray-100 w-full mb-4" />

            <View className="px-6">
                <MenuItem 
                    icon={<Feather name="user" size={22} color="#1F2937" />}
                    label={t('Edit Profile')}
                    onPress={() => router.push('/edit-profile')}
                />
                <MenuItem 
                    icon={<Ionicons name="paw-outline" size={22} color="#1F2937" />}
                    label={t('My Pets')}
                    onPress={() => router.push('/(tabs)/my-pets')}
                />
                <MenuItem 
                    icon={<Feather name="file-text" size={22} color="#1F2937" />}
                    label={t('My Application')}
                    onPress={() => router.push('/my-applications')}
                />
                <MenuItem 
                    icon={<Feather name="heart" size={22} color="#1F2937" />} 
                    label={t('Favorite Pets')} 
                    onPress={() => router.push('/favorite-pets')}
                    />
                <MenuItem 
                    icon={<MaterialCommunityIcons name="office-building-marker-outline" size={22} color="#1F2937" />} 
                    label={t('Followed Shelters')} 
                    onPress={() => router.push('/followed-shelters')}
                />
                <MenuItem 
                    icon={<Feather name="calendar" size={22} color="#1F2937" />} 
                    label={t('Interested Events')} 
                    onPress={() => router.push('/interested-events')}
                />
                <MenuItem 
                    icon={<Feather name="bell" size={22} color="#1F2937" />} 
                    label={t('Notifications')} 
                    onPress={() => router.push('/notifications')}
                />
                
                <MenuItem 
                    icon={<Feather name="shield" size={22} color="#1F2937" />} 
                    label={t('Account & Security')} 
                    onPress={() => router.push('/account-security')}
                />

                <MenuItem 
                    icon={<SimpleLineIcons name="globe" size={22} color="#1F2937" />} 
                    label={t('Language')} 
                    value={language === 'vi' ? 'Tiếng Việt' : 'English'} // Xử lý hiển thị động
                    onPress={() => router.push('/language')}
                />
                <MenuItem 
                    icon={<Feather name="help-circle" size={22} color="#1F2937" />} 
                    label={t('Help & Support')} 
                    onPress={() => router.push('/help-and-support')}
                />

                   <View className="mt-4">
                    <View className="flex-row items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
                      <View className="flex-row items-center gap-3">
                          <View className="w-10 h-10 bg-orange-100 rounded-full items-center justify-center">
                              <Ionicons name="radio-button-on" size={20} color="#ffa053" />
                          </View>
                          <View>
                              <Text className="text-base font-bold text-gray-800">{t('Floating Home Button')}</Text>
                              <Text className="text-xs text-gray-400 mt-0.5">{t('Show virtual home button on screen')}</Text>
                          </View>
                      </View>
                      
                      <Switch
                          value={isFloatingButtonVisible}
                          onValueChange={(val) => setIsFloatingButtonVisible(val)}
                          trackColor={{ false: '#E5E7EB', true: '#ffa053' }}
                          thumbColor={'#FFFFFF'}
                      />
                    </View>
                </View>
                <View className="h-[1px] bg-gray-100 w-full my-4" />

                <TouchableOpacity 
                    className="flex-row items-center py-4"
                    activeOpacity={0.7}
                    onPress={handleLogout} 
                >
                    <View className="w-8 mr-3 items-center justify-center">
                        <SimpleLineIcons name="logout" size={22} color="#EF4444" />
                    </View>
                    <Text className="text-base font-semibold text-red-500">{t('Log Out')}</Text>
                </TouchableOpacity>
            </View>
         
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}