import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { translations } from './translations';

i18n
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: translations.en },
            am: { translation: translations.am },
        },
        lng: 'en',
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false, // React already protects from XSS
            prefix: '{',
            suffix: '}'
        },
    });

export default i18n;