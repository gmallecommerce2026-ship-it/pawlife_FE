// contexts/AppContext.tsx
import React, { createContext, useState } from 'react';

// Định nghĩa kiểu dữ liệu cho Context
interface AppContextType {
  isFloatingButtonVisible: boolean;
  setIsFloatingButtonVisible: (visible: boolean) => void;
}

export const AppContext = createContext<AppContextType>({
  isFloatingButtonVisible: true,
  setIsFloatingButtonVisible: () => {},
});

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  // Trạng thái hiển thị nút Home ảo, mặc định là true
  const [isFloatingButtonVisible, setIsFloatingButtonVisible] = useState(true);

  return (
    <AppContext.Provider value={{ isFloatingButtonVisible, setIsFloatingButtonVisible }}>
      {children}
    </AppContext.Provider>
  );
};