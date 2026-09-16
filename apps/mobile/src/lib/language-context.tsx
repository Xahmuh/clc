import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  translations,
  type Language,
  type TranslationKey,
  getDistrictName as sharedGetDistrictName,
  getLeadStatusLabel as sharedGetLeadStatusLabel,
  getActivityTypeLabel as sharedGetActivityTypeLabel,
  getUserRoleLabel as sharedGetUserRoleLabel,
} from '../i18n/translations';
import type { District, LeadStatus, ActivityType, UserRole } from '../types/database';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey) => string;
  isRTL: boolean;
  formatDistrict: (district: District | null | undefined) => string;
  formatStatus: (status: LeadStatus) => string;
  formatActivityType: (type: ActivityType) => string;
  formatRole: (role: UserRole) => string;
}

const STORAGE_KEY = '@clc_crm_lang';

const LanguageContext = createContext<LanguageContextType>({
  language: 'ar',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key) => translations.ar[key] || (key as string),
  isRTL: true,
  formatDistrict: () => '',
  formatStatus: (s) => s,
  formatActivityType: (a) => a,
  formatRole: (r) => r,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ar');

  useEffect(() => {
    async function loadSavedLanguage() {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'en' || saved === 'ar') {
          setLanguageState(saved);
        }
      } catch (err) {
        console.warn('Failed to load language from AsyncStorage:', err);
      }
    }
    loadSavedLanguage();
  }, []);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, lang);
    } catch (err) {
      console.warn('Failed to save language to AsyncStorage:', err);
    }
  };

  const toggleLanguage = () => {
    const next: Language = language === 'ar' ? 'en' : 'ar';
    setLanguage(next);
  };

  const t = (key: TranslationKey): string => {
    const dict = translations[language];
    if (dict && dict[key]) {
      return dict[key];
    }
    return translations.en[key] || (key as string);
  };

  const formatDistrict = (district: District | null | undefined): string => {
    return sharedGetDistrictName(district, language);
  };

  const formatStatus = (status: LeadStatus): string => {
    return sharedGetLeadStatusLabel(status, language);
  };

  const formatActivityType = (type: ActivityType): string => {
    return sharedGetActivityTypeLabel(type, language);
  };

  const formatRole = (role: UserRole): string => {
    return sharedGetUserRoleLabel(role, language);
  };

  const isRTL = language === 'ar';

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
        isRTL,
        formatDistrict,
        formatStatus,
        formatActivityType,
        formatRole,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
