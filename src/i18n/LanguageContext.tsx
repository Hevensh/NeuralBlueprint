import {
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { loadAppLanguage, saveAppLanguage } from './languageStorage';
import {
  LanguageContext,
  type LanguageContextValue,
} from './languageContextValue';
import {
  UI_LABELS,
  type AppLanguage,
} from './labels';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(loadAppLanguage);
  const value = useMemo<LanguageContextValue>(() => ({
    language,
    labels: UI_LABELS[language],
    setLanguage(nextLanguage) {
      setLanguageState(nextLanguage);
      saveAppLanguage(nextLanguage);
    },
  }), [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
