'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  translations,
  type Language,
  type TranslationKey,
  getDistrictName as sharedGetDistrictName,
  getLeadStatusLabel as sharedGetLeadStatusLabel,
  getActivityTypeLabel as sharedGetActivityTypeLabel,
  getUserRoleLabel as sharedGetUserRoleLabel,
} from '@clc/shared';
import type { District, LeadStatus, ActivityType, UserRole } from '@clc/shared';

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

const LanguageContext = createContext<LanguageContextType>({
  language: 'ar',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key) => translations.ar[key] || key,
  isRTL: true,
  formatDistrict: () => '',
  formatStatus: (s) => s,
  formatActivityType: (a) => a,
  formatRole: (r) => r,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ar');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('clc_crm_lang') as Language | null;
      if (savedLang === 'en' || savedLang === 'ar') {
        setLanguageState(savedLang);
        applyDocumentLang(savedLang);
      } else {
        applyDocumentLang('ar');
      }
    } catch {
      applyDocumentLang('ar');
    }
    setMounted(true);
  }, []);

  const applyDocumentLang = (lang: Language) => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.setAttribute('translate', 'no');
      document.documentElement.classList.add('notranslate');
    }
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('clc_crm_lang', lang);
    } catch (e) {
      console.warn('Could not save language to localStorage:', e);
    }
    applyDocumentLang(lang);
  };

  const toggleLanguage = () => {
    const nextLang: Language = language === 'ar' ? 'en' : 'ar';
    setLanguage(nextLang);
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

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
        isRTL: language === 'ar',
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
  return useContext(LanguageContext);
}
