// components/CustomLoader.tsx
import { Text } from '@/components/AppText';
import { useLanguage } from '@/contexts/LanguageContext';
import React, { memo } from 'react';
import { Image, Modal, View } from 'react-native';

interface CustomLoaderProps {
    text?: string;
    transparent?: boolean;
    visible?: boolean;
}

const CustomLoaderComponent = ({ 
    text = 'Loading data...', 
    visible = true 
}: CustomLoaderProps) => {
    const { t } = useLanguage();

    if (!visible) return null;

    return (
        <Modal
            transparent={true}
            animationType="fade"
            visible={visible}
            statusBarTranslucent={true}
        >
            <View className="flex-1 bg-white items-center justify-center">
                <View className="items-center justify-center">
                    <Image
                        source={require('../assets/images/GifCUTEDOG.gif')} 
                        className="w-[400px] h-[400px]"
                        resizeMode="contain"
                        key="global-dog-loader"
                    />
                    {text ? (
                        <Text className="absolute bottom-24 text-base font-semibold text-gray-400 z-50">
                            {t(text)}
                        </Text>
                    ) : null}
                </View>
            </View>
        </Modal>
    );
};

export const CustomLoader = memo(CustomLoaderComponent);