import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from './AppText';
import { Calendar, LocaleConfig } from 'react-native-calendars';

LocaleConfig.locales['vi'] = {
  monthNames: ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'],
  monthNamesShort: ['Th1','Th2','Th3','Th4','Th5','Th6','Th7','Th8','Th9','Th10','Th11','Th12'],
  dayNames: ['Chủ nhật','Thứ hai','Thứ ba','Thứ tư','Thứ năm','Thứ sáu','Thứ bảy'],
  dayNamesShort: ['CN','T2','T3','T4','T5','T6','T7'],
  today: 'Hôm nay',
};

LocaleConfig.locales['en'] = {
  monthNames: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  monthNamesShort: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
  dayNames: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
  dayNamesShort: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
  today: 'Today',
};


const toYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

interface CalendarPopupFieldProps {
  visible: boolean;
  title: string;
  value: Date;
  minDate?: Date;
  maxDate?: Date;
  isVi?: boolean;
  onChange: (date: Date) => void;
  onRequestClose: () => void;
}


export default function CalendarPopupField({
  visible, title, value, minDate, maxDate, isVi, onChange, onRequestClose,
}: CalendarPopupFieldProps) {
  if (!visible) return null;

  LocaleConfig.defaultLocale = isVi ? 'vi' : 'en';
  const selectedStr = toYMD(value);

  return (
    <View
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFillObject, { zIndex: 999, elevation: 20 }]}
      className="justify-center items-center px-6"
    >
      {/* Lớp nền tối, tap ra ngoài để đóng */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={onRequestClose}
        style={StyleSheet.absoluteFillObject}
        className="bg-black/40"
      />

      <View
        className="bg-white rounded-[20px] w-full max-w-[320px] overflow-hidden"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.25,
          shadowRadius: 20,
          elevation: 20,
        }}
      >
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-[#F3F4F6]">
          <Text className="text-[14px] font-semibold text-black">{title}</Text>
          <TouchableOpacity onPress={onRequestClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Feather name="x" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <Calendar
          current={selectedStr}
          minDate={minDate ? toYMD(minDate) : undefined}
          maxDate={maxDate ? toYMD(maxDate) : undefined}
          markedDates={{ [selectedStr]: { selected: true, selectedColor: '#E89B5A' } }}
          onDayPress={(day) => onChange(new Date(day.year, day.month - 1, day.day))}
          theme={{
            todayTextColor: '#E89B5A',
            arrowColor: '#E89B5A',
            selectedDayBackgroundColor: '#E89B5A',
          }}
        />
      </View>
    </View>
  );
}