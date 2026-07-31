import React from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/vi'; // để hiển thị tên tháng/thứ tiếng Việt
import { View } from 'react-native';
import DateTimePicker, { useDefaultClassNames } from 'react-native-ui-datepicker';

interface InlineCalendarFieldProps {
  visible: boolean;
  value: Date;
  minDate?: Date;
  maxDate?: Date;
  isVi?: boolean;
  onChange: (date: Date) => void;
}

export default function InlineCalendarField({
  visible,
  value,
  minDate,
  maxDate,
  isVi,
  onChange,
}: InlineCalendarFieldProps) {
  const defaultClassNames = useDefaultClassNames();
  if (!visible) return null;

  return (
    <View className="bg-[#FAFAFA] border border-[#E5E5EA] rounded-[12px] mb-3 p-2">
      <DateTimePicker
        mode="single"
        date={dayjs(value)}
        minDate={minDate ? dayjs(minDate) : undefined}
        maxDate={maxDate ? dayjs(maxDate) : undefined}
        locale={isVi ? 'vi' : 'en'}
        onChange={({ date }) => date && onChange(dayjs(date).toDate())}
        classNames={{
          ...defaultClassNames,
          selected: 'bg-[#E89B5A]',
          selected_label: 'text-white',
          today: 'border border-[#E89B5A]',
        }}
      />
    </View>
  );
}