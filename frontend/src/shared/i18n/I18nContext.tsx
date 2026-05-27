import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { enUSMessages } from './messages.en-US'
import { zhCNMessages } from './messages.zh-CN'
import {
  SUPPORTED_LANGUAGE_OPTIONS,
  getSystemLanguage,
  matchSupportedLanguage,
  normalizeLanguage,
  type I18nContextValue,
  type Language,
  type MessageTree,
} from './types'

const SETTINGS_STORAGE_KEY = 'app_settings'

const messages: Record<Language, MessageTree> = {
  'zh-CN': zhCNMessages,
  'en-US': enUSMessages,
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined)

interface LanguageProviderProps {
  children: ReactNode
  defaultLanguage?: Language
}

function readStoredLanguage(defaultLanguage: Language): Language {
  if (typeof window === 'undefined') {
    return defaultLanguage
  }

  try {
    const storage = window.localStorage
    const raw = storage.getItem(SETTINGS_STORAGE_KEY)
    if (!raw) {
      return defaultLanguage
    }
    const settings = JSON.parse(raw) as { language?: unknown }
    if (typeof settings.language === 'string') {
      return matchSupportedLanguage(settings.language) || defaultLanguage
    }
  } catch (error) {
    console.warn('Failed to load language setting:', error)
  }

  return defaultLanguage
}

function persistLanguage(language: Language) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const storage = window.localStorage
    const raw = storage.getItem(SETTINGS_STORAGE_KEY)
    const settings = raw ? JSON.parse(raw) : {}
    const nextSettings =
      settings && typeof settings === 'object' && !Array.isArray(settings)
        ? { ...settings, language }
        : { language }
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings))
  } catch (error) {
    console.warn('Failed to save language setting:', error)
  }
}

function translate(messageTree: MessageTree, key: string): string {
  const value = key.split('.').reduce<string | MessageTree | undefined>((current, segment) => {
    if (!current || typeof current === 'string') {
      return undefined
    }
    return current[segment]
  }, messageTree)

  return typeof value === 'string' ? value : key
}

export function LanguageProvider({
  children,
  defaultLanguage = getSystemLanguage(),
}: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(() =>
    readStoredLanguage(defaultLanguage),
  )

  const setLanguage = useCallback((nextLanguage: string | null | undefined) => {
    const normalized = normalizeLanguage(nextLanguage)
    setLanguageState(normalized)
    persistLanguage(normalized)
  }, [])

  const t = useCallback(
    (key: string) => translate(messages[language], key),
    [language],
  )

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      t,
      supportedLanguages: SUPPORTED_LANGUAGE_OPTIONS,
    }),
    [language, setLanguage, t],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within a LanguageProvider')
  }
  return context
}
