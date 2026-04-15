import { useState, useEffect } from 'react';

export type OutputLanguage = 'english' | 'chinese';

const STORAGE_KEY = 'ai-hedge-fund-output-language';
const LANGUAGE_CHANGE_EVENT = 'ai-hedge-fund-language-change';

export function useLanguage() {
  const [language, setLanguageState] = useState<OutputLanguage>(
    () => (localStorage.getItem(STORAGE_KEY) as OutputLanguage) || 'english'
  );

  // Listen for language changes from other components in the same tab
  useEffect(() => {
    const handleChange = () => {
      const stored = (localStorage.getItem(STORAGE_KEY) as OutputLanguage) || 'english';
      setLanguageState(stored);
    };
    window.addEventListener(LANGUAGE_CHANGE_EVENT, handleChange);
    return () => window.removeEventListener(LANGUAGE_CHANGE_EVENT, handleChange);
  }, []);

  const setLanguage = (lang: OutputLanguage) => {
    localStorage.setItem(STORAGE_KEY, lang);
    setLanguageState(lang);
    // Notify all other components that use this hook
    window.dispatchEvent(new Event(LANGUAGE_CHANGE_EVENT));
  };

  return { language, setLanguage };
}
