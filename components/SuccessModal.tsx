import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useModalStore } from '../store/useModalStore';

export const SuccessModal = () => {
    // Lấy state và actions từ Global Store
    const { isOpen, title, message, buttonText, onConfirm, hideModal } = useModalStore();

    if (!isOpen) return null;

    const handlePress = () => {
        if (onConfirm) onConfirm(); // Chạy function callback nếu có truyền vào
        hideModal(); // Đóng modal
    };

    return (
        <Modal
            transparent={true}
            animationType="fade"
            visible={isOpen}
            onRequestClose={hideModal} // Hỗ trợ nút Back trên Android
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>

                    <View style={styles.iconContainer}>
                        <Image source={require('../assets/icon/success.png')} className='w-[186px] h-[180px]' />
                    </View>

                    {/* Texts */}
                    <Text style={{fontFamily: 'Urbanist'}} className='text-[24px] font-semibold text-[#E89B5A] text-center mb-6'>{title}</Text>
                    <Text style={{fontFamily: 'Urbanist'}} className='text-[16px] text-[#656565] text-center mb-8 font-regular'>{message}</Text>

                    {/* Button */}
                    <TouchableOpacity style={styles.button} onPress={handlePress}>
                        <Text className='text-[16px] text-[#FFFFFF] text-center font-bold'>{buttonText}</Text>
                    </TouchableOpacity>

                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)', // Nền xám mờ theo ảnh
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContainer: {
        backgroundColor: 'white',
        width: '100%',
        borderRadius: 32, // Bo góc to theo thiết kế
        paddingVertical: 40,
        paddingHorizontal: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    iconContainer: {
        marginBottom: 24,
    },
    button: {
        backgroundColor: '#EFA463',
        width: '100%',
        paddingVertical: 16,
        borderRadius: 24,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});