import { ConcreteThemeType, ThemeType, concreteThemeIds, themeIds } from './types'

export function isThemeType(value: string): value is ThemeType {
  return themeIds.includes(value as ThemeType)
}

export function isConcreteTheme(value: ThemeType): value is ConcreteThemeType {
  return concreteThemeIds.includes(value as ConcreteThemeType)
}

export function resolveThemePreference(theme: ThemeType, prefersDark: boolean): ConcreteThemeType {
  if (theme === 'system') {
    return prefersDark ? 'dark' : 'light'
  }

  return theme
}
