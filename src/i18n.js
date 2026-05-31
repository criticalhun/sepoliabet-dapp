import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import hu from './locales/hu.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import nl from './locales/nl.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en:{translation:en}, hu:{translation:hu}, de:{translation:de}, fr:{translation:fr}, nl:{translation:nl} },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: { order: ['localStorage','navigator'], caches: ['localStorage'] },
  });

export default i18n;
