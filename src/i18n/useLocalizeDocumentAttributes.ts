import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Hook to automatically set document attributes for internationalization
 * Sets lang attribute on the HTML element based on current language
 * Always keeps LTR direction to prevent UI layout flipping
 */
export const useLocalizeDocumentAttributes = () => {
  const { i18n } = useTranslation();

  useEffect(() => {
    if (i18n.resolvedLanguage) {
      // Set the <html lang> attribute for accessibility and SEO
      document.documentElement.lang = i18n.resolvedLanguage;
      
      // Always keep LTR direction to prevent UI flipping
      document.documentElement.dir = 'ltr';
      
      // Remove RTL body class to prevent any RTL styling
      document.body.classList.remove('rtl');
    }
  }, [i18n, i18n.resolvedLanguage]);
};

export default useLocalizeDocumentAttributes;
