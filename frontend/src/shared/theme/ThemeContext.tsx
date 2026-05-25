import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import {
  WindowSetDarkTheme,
  WindowSetLightTheme,
  WindowSetSystemDefaultTheme,
} from '../../wailsjs/runtime/runtime'
import { ConcreteThemeType, ThemeType, DEFAULT_THEME } from './types'
import { isThemeType, resolveThemePreference } from './themeResolver'

interface ThemeContextValue {
  theme: ThemeType
  resolvedTheme: ConcreteThemeType
  setTheme: (theme: ThemeType) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const THEME_STORAGE_KEY = 'app-theme'

interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: ThemeType
}

function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function hasWailsRuntime(): boolean {
  return typeof window !== 'undefined' && Boolean((window as { runtime?: unknown }).runtime)
}

function syncWindowTheme(theme: ThemeType, resolvedTheme: ConcreteThemeType) {
  if (!hasWailsRuntime()) {
    return
  }

  try {
    if (theme === 'system') {
      WindowSetSystemDefaultTheme()
      return
    }

    if (resolvedTheme === 'dark') {
      WindowSetDarkTheme()
    } else {
      WindowSetLightTheme()
    }
  } catch (error) {
    console.warn('Failed to sync window theme', error)
  }
}

export function ThemeProvider({ children, defaultTheme = DEFAULT_THEME }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeType>(() => {
    // 从 localStorage 读取保存的主题
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved && isThemeType(saved)) {
      return saved
    }
    return defaultTheme
  })
  const [systemPrefersDark, setSystemPrefersDark] = useState(getSystemPrefersDark)

  const resolvedTheme = resolveThemePreference(theme, systemPrefersDark)

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme)
    localStorage.setItem(THEME_STORAGE_KEY, newTheme)
  }

  // 跟随系统时监听系统浅色/深色变化
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches)
    }

    setSystemPrefersDark(media.matches)
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', handleChange)
      return () => media.removeEventListener('change', handleChange)
    }

    media.addListener(handleChange)
    return () => media.removeListener(handleChange)
  }, [])

  // 应用主题到 document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme)
    document.documentElement.style.colorScheme = resolvedTheme === 'dark' ? 'dark' : 'light'
    syncWindowTheme(theme, resolvedTheme)
  }, [theme, resolvedTheme])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
