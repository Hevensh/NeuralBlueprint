import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { loadAppLanguage, saveAppLanguage } from './languageStorage';
import type { AppLabelSet } from './label.en';
import {
  UI_LABELS,
  type AppLanguage,
} from './labels';

interface LanguageContextValue {
  language: AppLanguage;
  labels: AppLabelSet;
  setLanguage: (language: AppLanguage) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

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

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) {
    throw new Error('useLanguage must be used inside LanguageProvider.');
  }
  return value;
}

export function useLabels() {
  return useLanguage().labels;
}
