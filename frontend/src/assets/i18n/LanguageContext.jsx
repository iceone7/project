import { createContext, useContext, useState, useMemo } from "react";
import translations from "./translations";

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(localStorage.getItem("lang") || "ka");

  const t = (key) => translations[language][key] || key;

  const value = useMemo(() => ({
    language,
    setLanguage: (lang) => {
      localStorage.setItem("lang", lang);
      setLanguage(lang);
    },
    t,
  }), [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
