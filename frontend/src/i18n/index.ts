import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en/translation.json";
import am from "./locales/am/translation.json";

const storedLanguage =
  typeof window !== "undefined"
    ? window.localStorage.getItem("nehs_language")
    : null;
const initialLanguage =
  storedLanguage === "am" || storedLanguage === "en" ? storedLanguage : "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    am: { translation: am },
  },
  lng: initialLanguage,
  fallbackLng: "en",
  // Amharic (Ethiopic script) is LTR — no dir switching needed
  interpolation: {
    escapeValue: false, // React already escapes values
  },
  react: {
    useSuspense: false,
  },
});

i18n.on("languageChanged", (language) => {
  if (typeof window === "undefined") return;

  window.localStorage.setItem("nehs_language", language);
  document.documentElement.lang = language;
  document.documentElement.dir = i18n.dir(language);
});

export default i18n;
