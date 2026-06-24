import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useModalStore } from '../store/useModalStore';

export const SuccessModal = () => {
  const { isOpen, title, message, buttonText, onConfirm, hideModal } = useModalStore();

  if (!isOpen) return null;

  const handlePress = () => {
    hideModal();
    if (onConfirm) onConfirm();
  };

  return (
    <Modal
      transparent={false}
      animationType="fade"
      visible={isOpen}
      onRequestClose={handlePress}
    >
      <View style={styles.screenContainer}>
        <View style={styles.contentContainer}>
          <View style={styles.iconContainer}>
            <Image
              source={require('../assets/icon/success.png')}
              className="w-[186px] h-[180px]"
              resizeMode="contain"
            />
          </View>

          <Text
            style={{ fontFamily: 'Urbanist' }}
            className="text-[24px] font-semibold text-[#E89B5A] text-center mb-6"
          >
            {title}
          </Text>

          <Text
            style={{ fontFamily: 'Urbanist' }}
            className="text-[16px] text-[#656565] text-center mb-8 font-regular"
          >
            {message}
          </Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={handlePress}>
          <Text className="text-[16px] text-[#FFFFFF] text-center font-bold">
            {buttonText}
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
  },

  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
});