export const DEFAULT_LANGUAGE = 'zh-CN' as const

export const SUPPORTED_LANGUAGE_OPTIONS = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en-US', label: 'English' },
] as const

export type Language = (typeof SUPPORTED_LANGUAGE_OPTIONS)[number]['value']

export type MessageTree = {
  [key: string]: string | MessageTree
}

export interface I18nContextValue {
  language: Language
  setLanguage: (language: string | null | undefined) => void
  t: (key: string) => string
  supportedLanguages: typeof SUPPORTED_LANGUAGE_OPTIONS
}

export function normalizeLanguage(language: string | null | undefined): Language {
  const normalized = String(language || '').trim().toLowerCase()
  if (normalized === 'en' || normalized === 'en-us') {
    return 'en-US'
  }
  if (normalized === 'zh' || normalized === 'zh-cn' || normalized === 'zh-hans') {
    return 'zh-CN'
  }
  return DEFAULT_LANGUAGE
}
