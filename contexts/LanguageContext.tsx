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
  t: (key: string, params?: Record<string, string | number>) => string; // 👈 thêm params
  isInitialized: boolean;
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'vi',
  setLanguage: async () => { },
  t: (key: string) => key,
  isInitialized: false,
});

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLangState] = useState<Language>('vi');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLang = await AsyncStorage.getItem('app_language');
        if (savedLang === 'vi' || savedLang === 'en') {
          setLangState(savedLang);
        }
      } catch (error) {
        // Cập nhật song ngữ cho log lỗi
        console.error('Lỗi khi đọc ngôn ngữ từ storage / Error reading language from storage:', error);
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
      // Cập nhật song ngữ cho log lỗi
      console.error('Lỗi khi lưu ngôn ngữ / Error saving language:', error);
    }
  };

  // Hàm dịch (t) được bọc bằng useCallback để tối ưu re-render trên hệ thống lớn
  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      let result = dictionaries[language]?.[key] || dictionaries['en']?.[key] || key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        });
      }
      return result;
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