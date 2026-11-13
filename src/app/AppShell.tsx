import { useEffect, useState } from 'react'
import { setupI18n } from '../i18n/setup'

export function useTranslations(language: 'en' | 'ar') {
  const [ready, setReady] = useState(false)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    void setupI18n(language).then(() => {
      setReady(true)
      setVersion((current) => current + 1)
    })
  }, [language])

  return { ready, version }
}
