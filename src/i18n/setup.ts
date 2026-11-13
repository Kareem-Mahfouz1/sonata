import i18next from 'i18next'
import en from './en.json'
import ar from './ar.json'

export const resources = { en: { translation: en }, ar: { translation: ar } } as const

export async function setupI18n(language: 'en' | 'ar' = 'en') {
  if (!i18next.isInitialized) {
    await i18next.init({ resources, lng: language, fallbackLng: 'en', interpolation: { escapeValue: false } })
  } else {
    await i18next.changeLanguage(language)
  }
  return i18next
}
