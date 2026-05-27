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

export function matchSupportedLanguage(language: string | null | undefined): Language | null {
  const normalized = String(language || '').trim().toLowerCase()
  if (normalized === 'en' || normalized.startsWith('en-')) {
    return 'en-US'
  }
  if (normalized === 'zh' || normalized.startsWith('zh-')) {
    return 'zh-CN'
  }
  return null
}

export function normalizeLanguage(language: string | null | undefined): Language {
  return matchSupportedLanguage(language) || DEFAULT_LANGUAGE
}

export function getSystemLanguage(languageCandidates?: readonly string[]): Language {
  let candidates = languageCandidates
  if (!candidates && typeof navigator !== 'undefined') {
    candidates = [
      ...(Array.isArray(navigator.languages) ? navigator.languages : []),
      navigator.language,
    ].filter(Boolean)
  }

  for (const candidate of candidates || []) {
    const supportedLanguage = matchSupportedLanguage(candidate)
    if (supportedLanguage) {
      return supportedLanguage
    }
  }

  return DEFAULT_LANGUAGE
}
