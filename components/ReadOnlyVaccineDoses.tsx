// components/ReadOnlyVaccineDoses.tsx
import React, { memo } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/AppText';
import { Feather } from '@expo/vector-icons';

interface VaccineDose {
  name: string;
  date: string;
  status: 'COMPLETED' | 'PENDING';
}

interface ReadOnlyVaccineDosesProps {
  doses: VaccineDose[];
  isVi: boolean;
}

const ReadOnlyVaccineDoses = memo(({ doses, isVi }: ReadOnlyVaccineDosesProps) => {
  if (!doses || doses.length === 0) return null;

  return (
    <View 
      className="w-full mt-3 bg-[#F9FAFB] border border-[#E5E5E5] p-3"
      style={{ borderRadius: 4 }} // Bo góc 4px chuẩn UI
    >
      <Text className="text-[12px] font-semibold text-[#6B7280] mb-3 tracking-wide">
        {isVi ? 'Chi tiết các mũi tiêm (Chỉ xem)' : 'Vaccination Details (Read-only)'}
      </Text>

      {doses.map((dose, idx) => {
        const isLast = idx === doses.length - 1;
        const isCompleted = dose.status === 'COMPLETED';

        return (
          <View
            key={`dose-${idx}`}
            className={`flex-row justify-between items-center py-2 ${
              !isLast ? 'border-b border-[#F3F4F6]' : ''
            }`}
          >
            {/* Cột trái: Tên mũi tiêm */}
            <View className="flex-row items-center">
              <Feather
                name={isCompleted ? "check-circle" : "circle"}
                size={14}
                color={isCompleted ? '#E89B5A' : '#D1D5DB'}
              />
              <Text className={`text-[13px] ml-2 font-medium ${isCompleted ? 'text-[#4B5563]' : 'text-[#9CA3AF]'}`}>
                {isVi ? `Mũi ${idx + 1}` : `Dose ${idx + 1}`}
              </Text>
            </View>

            {/* Cột phải: Tên Vaccine & Ngày tiêm */}
            <View className="items-end">
              <Text className={`text-[13px] font-semibold ${isCompleted ? 'text-[#111827]' : 'text-[#9CA3AF]'}`}>
                {dose.name || '-'}
              </Text>
              <Text className="text-[11px] text-[#9CA3AF] mt-0.5">
                {dose.date || (isVi ? 'Chưa xác định' : 'TBD')}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
});

export default ReadOnlyVaccineDoses;