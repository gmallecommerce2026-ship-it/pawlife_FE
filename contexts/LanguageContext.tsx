import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { enDict } from '../locales/en';
import { viDict } from '../locales/vi';

type Language = 'en' | 'vi';

const dictionaries: Record<Language, Record<string, string>> = {
  en: enDict,
  vi: viDict,
};

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string) => string; // Hàm dùng để dịch string
  isInitialized: boolean;     // Cờ kiểm tra trạng thái load dữ liệu
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: async () => {},
  t: (key: string) => key,
  isInitialized: false,
});

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLangState] = useState<Language>('en');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLang = await AsyncStorage.getItem('app_language');
        if (savedLang === 'vi' || savedLang === 'en') {
          setLangState(savedLang);
        }
      } catch (error) {
        console.error('Lỗi khi đọc ngôn ngữ từ storage:', error);
      } finally {
        setIsInitialized(true);
      }
    };
    
    loadLanguage();
  }, []);

  const setLanguage = async (lang: Language) => {
    setLangState(lang);
    try {
      await AsyncStorage.setItem('app_language', lang);
    } catch (error) {
      console.error('Lỗi khi lưu ngôn ngữ:', error);
    }
  };

  // Hàm dịch (t) được bọc bằng useCallback để tối ưu re-render trên hệ thống lớn
  const t = useCallback(
    (key: string) => {
      // Fallback: Tìm trong từ điển hiện tại -> từ điển tiếng Anh -> trả về chính key nếu không thấy
      return dictionaries[language]?.[key] || dictionaries['en']?.[key] || key;
    },
    [language]
  );

  // Chờ load xong từ AsyncStorage mới render UI để tránh chớp giật ngôn ngữ
  if (!isInitialized) return null; 

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isInitialized }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);