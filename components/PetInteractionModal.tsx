// components/PetInteractionModal.tsx
import React from 'react';
import { Modal, View, TouchableOpacity, Text, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { petService } from '@/services/petService';

export const PetInteractionModal = ({ visible, onClose, petId, petName, isVi }: any) => {
  const queryClient = useQueryClient();

  // Mutation ẩn pet
  const hideMutation = useMutation({
    mutationFn: () => petService.hidePet(petId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      onClose();
    }
  });

  // Mutation Report
  const reportMutation = useMutation({
    mutationFn: () => petService.reportPet(petId, { reason: 'Inappropriate', isBlockRequested: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      onClose();
    }
  });

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity className="flex-1 bg-black/50 justify-end" onPress={onClose}>
        <View className="bg-white rounded-t-3xl p-6">
          <Text className="text-lg font-bold mb-4">{isVi ? 'Tùy chọn' : 'Options'}</Text>
          
          <TouchableOpacity className="py-4 border-b border-gray-100" onPress={() => hideMutation.mutate()}>
            <Text className="text-black font-medium">{isVi ? 'Ẩn hồ sơ này' : 'Hide this profile'}</Text>
          </TouchableOpacity>

          <TouchableOpacity className="py-4" onPress={() => reportMutation.mutate()}>
            <Text className="text-red-500 font-medium">{isVi ? 'Báo cáo & Chặn' : 'Report & Block'}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};