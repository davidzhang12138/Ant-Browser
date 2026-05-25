import { Check, Monitor } from 'lucide-react'
import clsx from 'clsx'
import { useTheme, themeConfigs, ThemeType } from '../theme'

interface ThemeSwitcherProps {
  className?: string
}

const themePreview: Record<ThemeType, { bg: string; sidebar: string; accent: string }> = {
  system: { bg: '#f8fafc', sidebar: '#111827', accent: '#3b82f6' },
  dark: { bg: '#0c0c0e', sidebar: '#18181b', accent: '#fafafa' },
  light: { bg: '#f8fafc', sidebar: '#ffffff', accent: '#1e293b' },
  cream: { bg: '#faf7f2', sidebar: '#fffdf8', accent: '#8b7355' },
  mint: { bg: '#f6f9f8', sidebar: '#fbfdfc', accent: '#3d5a4c' },
  ocean: { bg: '#f5f8fa', sidebar: '#fafcfd', accent: '#3a5068' },
}

export function ThemeSwitcher({ className }: ThemeSwitcherProps) {
  const { theme, resolvedTheme, setTheme } = useTheme()

  const renderPreview = (themeId: ThemeType, preview: typeof themePreview[ThemeType]) => {
    if (themeId === 'system') {
      return (
        <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border border-black/10 bg-white">
          <div className="absolute inset-0 grid grid-cols-2">
            <div className="bg-[#f8fafc]">
              <div className="h-full w-1/3 bg-white">
                <div className="w-2/3 h-1 mt-2 mx-auto rounded-full bg-[#1e293b]" />
              </div>
            </div>
            <div className="bg-[#0c0c0e]">
              <div className="h-full w-1/3 bg-[#18181b]">
                <div className="w-2/3 h-1 mt-2 mx-auto rounded-full bg-[#fafafa]" />
              </div>
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-7 h-7 rounded-full bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] flex items-center justify-center shadow-sm">
              <Monitor className="w-4 h-4 text-[var(--color-text-secondary)]" />
            </div>
          </div>
        </div>
      )
    }

    return (
      <div
        className="w-full aspect-[4/3] rounded-lg overflow-hidden border border-black/10"
        style={{ backgroundColor: preview.bg }}
      >
        {/* 侧边栏 */}
        <div
          className="w-1/4 h-full float-left"
          style={{ backgroundColor: preview.sidebar }}
        >
          <div
            className="w-2/3 h-1 mt-2 mx-auto rounded-full"
            style={{ backgroundColor: preview.accent }}
          />
          <div className="mt-2 mx-1 space-y-1">
            <div className="h-0.5 rounded-full bg-black/10" />
            <div className="h-0.5 rounded-full bg-black/10" />
          </div>
        </div>
        {/* 内容区 */}
        <div className="p-1">
          <div className="h-1 w-1/2 rounded-full bg-black/10 mb-1" />
          <div className="grid grid-cols-2 gap-0.5">
            <div className="h-2 rounded-sm" style={{ backgroundColor: preview.sidebar }} />
            <div className="h-2 rounded-sm" style={{ backgroundColor: preview.sidebar }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={clsx('space-y-4', className)}>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {themeConfigs.map((config) => {
          const isActive = theme === config.id
          const preview = themePreview[config.id]
          
          return (
            <button
              key={config.id}
              onClick={() => setTheme(config.id)}
              className={clsx(
                'group relative flex flex-col items-center gap-2.5 p-3 rounded-xl border-2 transition-all duration-200',
                isActive
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent-muted)]'
                  : 'border-[var(--color-border-default)] hover:border-[var(--color-border-strong)] bg-[var(--color-bg-surface)]'
              )}
              title={config.description}
            >
              {/* 主题预览 - 模拟界面布局 */}
              {renderPreview(config.id, preview)}
              
              {/* 主题名称 */}
              <span className={clsx(
                'text-xs font-medium transition-colors',
                isActive ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'
              )}>
                {config.name.replace('主题', '')}
              </span>
              
              {/* 选中标记 */}
              {isActive && (
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[var(--color-accent)] flex items-center justify-center shadow-sm">
                  <Check className="w-3 h-3 text-[var(--color-text-inverse)]" />
                </div>
              )}
            </button>
          )
        })}
      </div>
      
      {/* 当前主题描述 */}
      <p className="text-xs text-[var(--color-text-muted)] text-center">
        {themeConfigs.find(c => c.id === theme)?.description}
        {theme === 'system' ? `，当前为${resolvedTheme === 'dark' ? '深色' : '浅色'}` : ''}
      </p>
    </div>
  )
}
