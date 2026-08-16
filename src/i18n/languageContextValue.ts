import { createContext } from 'react';
import type { AppLabelSet } from './label.en';
import type { AppLanguage } from './labels';

export interface LanguageContextValue {
  language: AppLanguage;
  labels: AppLabelSet;
  setLanguage: (language: AppLanguage) => void;
}

export const LanguageContext = createContext<LanguageContextValue | null>(null);
