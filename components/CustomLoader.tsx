// components/CustomLoader.tsx
import { Text } from '@/components/AppText';
import { useLanguage } from '@/contexts/LanguageContext';
import React, { memo } from 'react';
import { Image, Modal, StyleSheet, View } from 'react-native';

interface CustomLoaderProps {
    text?: string;
    transparent?: boolean;
    visible?: boolean; // Thêm prop để điều khiển bật/tắt
}

const CustomLoaderComponent = ({ 
    text = 'Loading data...', 
    transparent = true, 
    visible = true 
}: CustomLoaderProps) => {
    const { t } = useLanguage();

    // Nếu không visible thì không render gì cả để tối ưu bộ nhớ
    if (!visible) return null;

    return (
        <Modal
            transparent={true}
            animationType="fade"
            visible={visible}
            statusBarTranslucent={true} // Bắt buộc: Giúp overlay phủ lên cả tai thỏ và status bar (đặc biệt trên Android)
        >
            <View style={[
                styles.overlay, 
                { backgroundColor: transparent ? 'rgba(0,0,0,0.6)' : '#FFFFFF' }
            ]}>
                <Image
                    source={require('../assets/images/GifCUTEDOG.gif')} 
                    style={styles.image}
                    resizeMode="contain"
                    // Thêm key để React Native không tái sử dụng nhầm instance của ảnh nếu bị unmount
                    key="global-dog-loader"
                />
                
                {text ? (
                    <Text 
                        style={[
                            styles.text, 
                            { color: transparent ? '#FFFFFF' : '#6B7280' }
                        ]}
                    >
                        {t(text)}
                    </Text>
                ) : null}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1, // Full màn hình tự nhiên, không cần âm viền
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: 160, 
        height: 160
    },
    text: {
        marginTop: 16,
        fontSize: 16,
        fontWeight: '600',
    }
});

// Sử dụng React.memo để ngăn chặn việc render lại GIF khi component cha thay đổi state
export const CustomLoader = memo(CustomLoaderComponent);