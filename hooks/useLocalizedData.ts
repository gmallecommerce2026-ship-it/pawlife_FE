import { useCallback } from 'react';
import { getLocalizedField } from '../utils/localization';
import { useLanguage } from '@/contexts/LanguageContext';

export const useLocalizedData = () => {
  const { language } = useLanguage();

  const l = useCallback((fieldData: any) => {
    return getLocalizedField(fieldData, language);
  }, [language]);

  return { l, language };
};