import React, { createContext, useCallback, useContext, useMemo, ReactNode } from 'react';
import { Language } from '../types';
import { translations } from './translations';

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

interface LanguageProviderProps {
  language: Language;
  onLanguageChange: (language: Language) => void;
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({
  language,
  onLanguageChange,
  children,
}) => {
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const value = translations[language][key] ?? translations.en[key] ?? key;
      if (!vars) return value;
      return value.replace(/\{\{(\w+)\}\}/g, (match, name) =>
        vars[name] !== undefined ? String(vars[name]) : match
      );
    },
    [language]
  );

  const value = useMemo(
    () => ({ language, setLanguage: onLanguageChange, t }),
    [language, onLanguageChange, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextValue => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used inside LanguageProvider');
  }
  return context;
};
