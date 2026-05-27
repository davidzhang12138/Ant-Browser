# App i18n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add first-stage multilingual support so the main frontend UI can switch between `zh-CN` and `en-US`.

**Architecture:** Add a small frontend i18n provider under `frontend/src/shared/i18n/`, backed by message dictionaries and the existing `app_settings.language` localStorage setting. Convert high-frequency shell, settings, shared component, browser list, proxy pool, and core management labels to `t(key)` while leaving long docs and backend logs out of scope.

**Tech Stack:** React 18, TypeScript, Vite, Wails frontend bindings, localStorage, Node validation script.

---

## File Structure

- Create `frontend/src/shared/i18n/types.ts`: supported language and dictionary types.
- Create `frontend/src/shared/i18n/messages.zh-CN.ts`: Simplified Chinese dictionary.
- Create `frontend/src/shared/i18n/messages.en-US.ts`: English dictionary with the same keys.
- Create `frontend/src/shared/i18n/I18nContext.tsx`: provider, `useI18n`, language normalization, localStorage persistence.
- Create `frontend/src/shared/i18n/index.ts`: public exports.
- Create `frontend/scripts/test-i18n-messages.mjs`: dictionary parity and empty-value validation.
- Modify `frontend/package.json`: add `test:i18n`.
- Modify `frontend/src/App.tsx`: wrap app content with `LanguageProvider` inside `ThemeProvider`.
- Modify `frontend/src/config/project.config.ts`: replace translated nav labels with stable `labelKey` fields.
- Modify `frontend/src/shared/layout/Sidebar.tsx`: translate navigation and sidebar controls.
- Modify `frontend/src/shared/layout/Topbar.tsx`: translate visible shell labels/tooltips where present.
- Modify `frontend/src/shared/components/Modal.tsx`: translate default confirm/cancel labels.
- Modify `frontend/src/shared/components/Table.tsx`: translate empty/loading states.
- Modify `frontend/src/shared/components/ThemeSwitcher.tsx`: translate theme labels/descriptions.
- Modify `frontend/src/modules/settings/SettingsPage.tsx`: connect language select to `useI18n`, translate core settings labels.
- Modify `frontend/src/modules/browser/pages/BrowserListPage.tsx` and `frontend/src/modules/browser/pages/browserList/BrowserListDialogs.tsx`: translate high-frequency browser list workflow text.
- Modify `frontend/src/modules/browser/pages/ProxyPoolPage.tsx` and `frontend/src/modules/browser/pages/proxyPool/*.tsx`: translate high-frequency proxy pool text.
- Modify `frontend/src/modules/browser/pages/CoreManagementPage.tsx`: translate high-frequency core management text.

## Task 1: i18n Foundation and Validation

**Files:**
- Create: `frontend/src/shared/i18n/types.ts`
- Create: `frontend/src/shared/i18n/messages.zh-CN.ts`
- Create: `frontend/src/shared/i18n/messages.en-US.ts`
- Create: `frontend/src/shared/i18n/I18nContext.tsx`
- Create: `frontend/src/shared/i18n/index.ts`
- Create: `frontend/scripts/test-i18n-messages.mjs`
- Modify: `frontend/package.json`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Add dictionary types**

Create `frontend/src/shared/i18n/types.ts`:

```ts
export const SUPPORTED_LANGUAGES = ['zh-CN', 'en-US'] as const

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export type MessageKey = string

export type Messages = Record<MessageKey, string>

export interface SupportedLanguageOption {
  value: SupportedLanguage
  label: string
}

export const DEFAULT_LANGUAGE: SupportedLanguage = 'zh-CN'

export const SUPPORTED_LANGUAGE_OPTIONS: SupportedLanguageOption[] = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en-US', label: 'English' },
]
```

- [ ] **Step 2: Add initial Chinese dictionary**

Create `frontend/src/shared/i18n/messages.zh-CN.ts` with common, navigation, settings, theme, browser list, proxy pool, and core management keys. Start with keys that are immediately needed by Tasks 2-4:

```ts
import type { Messages } from './types'

export const zhCNMessages: Messages = {
  'common.confirm': '确认',
  'common.ok': '确定',
  'common.cancel': '取消',
  'common.close': '关闭',
  'common.save': '保存',
  'common.reset': '重置',
  'common.delete': '删除',
  'common.edit': '编辑',
  'common.copy': '复制',
  'common.refresh': '刷新',
  'common.search': '搜索',
  'common.loading': '加载中...',
  'common.empty': '暂无数据',
  'common.actions': '操作',
  'nav.section.main': '主菜单',
  'nav.section.browser': '指纹浏览器',
  'nav.section.maintenance': '系统维护',
  'nav.dashboard': '控制台',
  'nav.browser.list': '实例列表',
  'nav.browser.automation': '自动化脚本',
  'nav.browser.cores': '内核管理',
  'nav.browser.proxyPool': '代理池配置',
  'nav.browser.bookmarks': '默认书签',
  'nav.browser.groups': '分组管理',
  'nav.browser.tags': '标签管理',
  'nav.settings': '系统设置',
  'nav.docs': '文档中心',
  'nav.logs': '日志查看',
  'sidebar.logoAlt': '应用Logo',
  'sidebar.expand': '展开',
  'sidebar.collapse': '收起',
  'sidebar.collapseSidebar': '收起侧边栏',
  'settings.title': '系统设置',
  'settings.subtitle': '管理应用配置和系统偏好',
  'settings.theme.title': '主题设置',
  'settings.theme.subtitle': '选择您喜欢的界面主题',
  'settings.basic.title': '基础设置',
  'settings.basic.subtitle': '应用的基本信息配置',
  'settings.appName.label': '应用名称',
  'settings.appName.placeholder': '请输入应用名称',
  'settings.language.label': '语言',
  'settings.description.label': '应用描述',
  'settings.description.placeholder': '请输入应用描述',
  'settings.features.title': '功能设置',
  'settings.features.subtitle': '启用或禁用特定功能',
  'settings.notifications.title': '启用通知',
  'settings.notifications.description': '接收系统通知和提醒',
  'theme.light.label': '浅色',
  'theme.light.description': '明亮清爽的默认主题',
  'theme.dark.label': '深色',
  'theme.dark.description': '适合夜间使用的深色主题',
  'theme.system.label': '跟随系统',
  'theme.system.description': '自动匹配系统外观',
  'browser.list.title': '浏览器实例',
  'browser.list.subtitle': '管理多账号浏览器实例、代理和运行状态',
  'browser.list.create': '新建实例',
  'browser.list.searchPlaceholder': '搜索实例名称、平台、账号或标签',
  'browser.list.table.name': '实例名称',
  'browser.list.table.platform': '平台',
  'browser.list.table.proxy': '代理',
  'browser.list.table.status': '状态',
  'browser.list.table.updatedAt': '更新时间',
  'browser.list.action.launch': '启动',
  'browser.list.action.stop': '停止',
  'browser.list.action.detail': '详情',
  'browser.proxyPool.title': '代理池配置',
  'browser.proxyPool.subtitle': '集中管理代理节点、订阅和健康检查',
  'browser.proxyPool.add': '添加代理',
  'browser.proxyPool.searchPlaceholder': '搜索代理名称、分组或配置',
  'browser.proxyPool.table.name': '代理名称',
  'browser.proxyPool.table.group': '分组',
  'browser.proxyPool.table.config': '代理配置',
  'browser.proxyPool.table.status': '状态',
  'browser.cores.title': '内核管理',
  'browser.cores.subtitle': '管理浏览器内核路径和默认启动环境',
  'browser.cores.add': '添加内核',
  'browser.cores.table.name': '内核名称',
  'browser.cores.table.path': '内核路径',
  'browser.cores.table.default': '默认',
}
```

- [ ] **Step 3: Add English dictionary with the same keys**

Create `frontend/src/shared/i18n/messages.en-US.ts` using the same key set as `messages.zh-CN.ts`:

```ts
import type { Messages } from './types'

export const enUSMessages: Messages = {
  'common.confirm': 'Confirm',
  'common.ok': 'OK',
  'common.cancel': 'Cancel',
  'common.close': 'Close',
  'common.save': 'Save',
  'common.reset': 'Reset',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.copy': 'Copy',
  'common.refresh': 'Refresh',
  'common.search': 'Search',
  'common.loading': 'Loading...',
  'common.empty': 'No data',
  'common.actions': 'Actions',
  'nav.section.main': 'Main',
  'nav.section.browser': 'Fingerprint Browser',
  'nav.section.maintenance': 'Maintenance',
  'nav.dashboard': 'Dashboard',
  'nav.browser.list': 'Instances',
  'nav.browser.automation': 'Automation',
  'nav.browser.cores': 'Core Management',
  'nav.browser.proxyPool': 'Proxy Pool',
  'nav.browser.bookmarks': 'Default Bookmarks',
  'nav.browser.groups': 'Groups',
  'nav.browser.tags': 'Tags',
  'nav.settings': 'Settings',
  'nav.docs': 'Docs',
  'nav.logs': 'Logs',
  'sidebar.logoAlt': 'App logo',
  'sidebar.expand': 'Expand',
  'sidebar.collapse': 'Collapse',
  'sidebar.collapseSidebar': 'Collapse sidebar',
  'settings.title': 'Settings',
  'settings.subtitle': 'Manage app configuration and system preferences',
  'settings.theme.title': 'Theme',
  'settings.theme.subtitle': 'Choose your preferred interface theme',
  'settings.basic.title': 'Basic Settings',
  'settings.basic.subtitle': 'Configure basic app information',
  'settings.appName.label': 'App Name',
  'settings.appName.placeholder': 'Enter app name',
  'settings.language.label': 'Language',
  'settings.description.label': 'App Description',
  'settings.description.placeholder': 'Enter app description',
  'settings.features.title': 'Feature Settings',
  'settings.features.subtitle': 'Enable or disable specific features',
  'settings.notifications.title': 'Enable Notifications',
  'settings.notifications.description': 'Receive system notifications and reminders',
  'theme.light.label': 'Light',
  'theme.light.description': 'Bright default theme',
  'theme.dark.label': 'Dark',
  'theme.dark.description': 'Dark theme for low-light use',
  'theme.system.label': 'System',
  'theme.system.description': 'Match the system appearance automatically',
  'browser.list.title': 'Browser Instances',
  'browser.list.subtitle': 'Manage multi-account browser instances, proxies, and runtime status',
  'browser.list.create': 'New Instance',
  'browser.list.searchPlaceholder': 'Search instance name, platform, account, or tags',
  'browser.list.table.name': 'Instance Name',
  'browser.list.table.platform': 'Platform',
  'browser.list.table.proxy': 'Proxy',
  'browser.list.table.status': 'Status',
  'browser.list.table.updatedAt': 'Updated',
  'browser.list.action.launch': 'Launch',
  'browser.list.action.stop': 'Stop',
  'browser.list.action.detail': 'Details',
  'browser.proxyPool.title': 'Proxy Pool',
  'browser.proxyPool.subtitle': 'Manage proxy nodes, subscriptions, and health checks',
  'browser.proxyPool.add': 'Add Proxy',
  'browser.proxyPool.searchPlaceholder': 'Search proxy name, group, or config',
  'browser.proxyPool.table.name': 'Proxy Name',
  'browser.proxyPool.table.group': 'Group',
  'browser.proxyPool.table.config': 'Proxy Config',
  'browser.proxyPool.table.status': 'Status',
  'browser.cores.title': 'Core Management',
  'browser.cores.subtitle': 'Manage browser core paths and default launch environments',
  'browser.cores.add': 'Add Core',
  'browser.cores.table.name': 'Core Name',
  'browser.cores.table.path': 'Core Path',
  'browser.cores.table.default': 'Default',
}
```

- [ ] **Step 4: Add provider and persistence**

Create `frontend/src/shared/i18n/I18nContext.tsx`:

```tsx
import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react'
import { enUSMessages } from './messages.en-US'
import { zhCNMessages } from './messages.zh-CN'
import {
  DEFAULT_LANGUAGE,
  Messages,
  SUPPORTED_LANGUAGE_OPTIONS,
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
} from './types'

const SETTINGS_KEY = 'app_settings'

const dictionaries: Record<SupportedLanguage, Messages> = {
  'zh-CN': zhCNMessages,
  'en-US': enUSMessages,
}

interface I18nContextValue {
  language: SupportedLanguage
  supportedLanguages: typeof SUPPORTED_LANGUAGE_OPTIONS
  setLanguage: (language: string) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined)

export function normalizeLanguage(language: unknown): SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(language as SupportedLanguage)
    ? (language as SupportedLanguage)
    : DEFAULT_LANGUAGE
}

function readStoredLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') {
    return DEFAULT_LANGUAGE
  }
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    if (!raw) {
      return DEFAULT_LANGUAGE
    }
    const parsed = JSON.parse(raw) as { language?: unknown }
    return normalizeLanguage(parsed.language)
  } catch {
    return DEFAULT_LANGUAGE
  }
}

function persistLanguage(language: SupportedLanguage) {
  if (typeof window === 'undefined') {
    return
  }
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...parsed, language }))
  } catch {
    // Keep the in-memory language even if localStorage is unavailable.
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>(readStoredLanguage)

  const setLanguage = useCallback((nextLanguage: string) => {
    const normalized = normalizeLanguage(nextLanguage)
    setLanguageState(normalized)
    persistLanguage(normalized)
  }, [])

  const t = useCallback(
    (key: string) => {
      return dictionaries[language][key] ?? key
    },
    [language],
  )

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      supportedLanguages: SUPPORTED_LANGUAGE_OPTIONS,
      setLanguage,
      t,
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
```

- [ ] **Step 5: Add public i18n exports**

Create `frontend/src/shared/i18n/index.ts`:

```ts
export { LanguageProvider, normalizeLanguage, useI18n } from './I18nContext'
export {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGE_OPTIONS,
  SUPPORTED_LANGUAGES,
  type Messages,
  type SupportedLanguage,
  type SupportedLanguageOption,
} from './types'
```

- [ ] **Step 6: Wrap app with LanguageProvider**

Modify `frontend/src/App.tsx` so the rendered app is inside `LanguageProvider`:

```tsx
import { LanguageProvider } from "./shared/i18n";
```

Wrap the existing app content where `ThemeProvider` is used:

```tsx
<ThemeProvider>
  <LanguageProvider>
    {/* existing router, layout, toast, modal content */}
  </LanguageProvider>
</ThemeProvider>
```

- [ ] **Step 7: Add dictionary validation script**

Create `frontend/scripts/test-i18n-messages.mjs`:

```js
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function extractKeys(file, exportName) {
  const content = readFileSync(resolve(root, file), 'utf8')
  const match = content.match(new RegExp(`export const ${exportName}:[\\\\s\\\\S]*?= \\\\{([\\\\s\\\\S]*?)\\\\n\\\\}`))
  if (!match) {
    throw new Error(`Could not find ${exportName} in ${file}`)
  }
  const keys = []
  const values = new Map()
  for (const line of match[1].split('\\n')) {
    const item = line.match(/^\\s*'([^']+)'\\s*:\\s*'([^']*)',?\\s*$/)
    if (!item) continue
    keys.push(item[1])
    values.set(item[1], item[2])
  }
  return { keys, values }
}

const zh = extractKeys('src/shared/i18n/messages.zh-CN.ts', 'zhCNMessages')
const en = extractKeys('src/shared/i18n/messages.en-US.ts', 'enUSMessages')

const zhKeys = new Set(zh.keys)
const enKeys = new Set(en.keys)
const missingInEn = [...zhKeys].filter((key) => !enKeys.has(key))
const missingInZh = [...enKeys].filter((key) => !zhKeys.has(key))
const emptyValues = [
  ...[...zh.values].filter(([, value]) => value.trim() === '').map(([key]) => `zh-CN:${key}`),
  ...[...en.values].filter(([, value]) => value.trim() === '').map(([key]) => `en-US:${key}`),
]

if (missingInEn.length || missingInZh.length || emptyValues.length) {
  console.error('i18n dictionary validation failed')
  if (missingInEn.length) console.error('Missing in en-US:', missingInEn)
  if (missingInZh.length) console.error('Missing in zh-CN:', missingInZh)
  if (emptyValues.length) console.error('Empty values:', emptyValues)
  process.exit(1)
}

console.log(`i18n dictionaries valid: ${zh.keys.length} keys`)
```

- [ ] **Step 8: Add npm script**

Modify `frontend/package.json` scripts:

```json
"test:i18n": "node ./scripts/test-i18n-messages.mjs"
```

- [ ] **Step 9: Verify foundation**

Run:

```bash
cd frontend
npm run test:i18n
```

Expected: `i18n dictionaries valid: <N> keys`.

- [ ] **Step 10: Commit foundation**

```bash
git add frontend/src/shared/i18n frontend/scripts/test-i18n-messages.mjs frontend/package.json frontend/src/App.tsx
git commit -m "feat(i18n): add language provider and dictionaries"
```

## Task 2: Layout, Navigation, Shared Components, and Settings

**Files:**
- Modify: `frontend/src/config/project.config.ts`
- Modify: `frontend/src/shared/layout/Sidebar.tsx`
- Modify: `frontend/src/shared/layout/Topbar.tsx`
- Modify: `frontend/src/shared/components/Modal.tsx`
- Modify: `frontend/src/shared/components/Table.tsx`
- Modify: `frontend/src/shared/components/ThemeSwitcher.tsx`
- Modify: `frontend/src/modules/settings/SettingsPage.tsx`

- [ ] **Step 1: Convert navigation config to keys**

Modify `frontend/src/config/project.config.ts`:

```ts
export interface NavItem {
  name: string
  labelKey: string
  path: string
  icon: string
}

export interface NavSection {
  title: string
  labelKey: string
  items: NavItem[]
}
```

Each navigation entry keeps `name` as fallback and adds `labelKey`, for example:

```ts
{ name: '控制台', labelKey: 'nav.dashboard', path: '/', icon: 'LayoutDashboard' }
```

- [ ] **Step 2: Translate Sidebar**

Modify `frontend/src/shared/layout/Sidebar.tsx`:

```tsx
import { useI18n } from '../i18n'
```

Inside `Sidebar()`:

```tsx
const { t } = useI18n()
```

Use translated labels:

```tsx
const sectionLabel = t(section.labelKey)
const itemLabel = t(item.labelKey)
```

Replace `section.title`, `item.name`, `应用Logo`, `展开`, `收起`, and `收起侧边栏` with `t(...)` keys from Task 1.

- [ ] **Step 3: Translate shared defaults**

Modify:

- `frontend/src/shared/components/Modal.tsx`: use `t('common.confirm')`, `t('common.cancel')`, and `t('common.ok')` only when the caller did not pass explicit labels.
- `frontend/src/shared/components/Table.tsx`: use `t('common.loading')` and `t('common.empty')` for default states.
- `frontend/src/shared/components/ThemeSwitcher.tsx`: use `theme.light.*`, `theme.dark.*`, and `theme.system.*`.

- [ ] **Step 4: Connect Settings language selector**

Modify `frontend/src/modules/settings/SettingsPage.tsx`:

```tsx
import { normalizeLanguage, useI18n } from '../../shared/i18n'
```

Inside the component:

```tsx
const { language, setLanguage, supportedLanguages, t } = useI18n()
```

When the settings load, normalize `settings.language`. When the language select changes, update both local settings state and provider:

```tsx
const handleLanguageChange = (value: string) => {
  const nextLanguage = normalizeLanguage(value)
  setLanguage(nextLanguage)
  handleChange('language', nextLanguage)
}
```

Use `supportedLanguages` for select options and translate visible labels with `t(...)`.

- [ ] **Step 5: Verify settings and shell**

Run:

```bash
cd frontend
npm run test:i18n
npm run build:keep
```

Expected: both commands exit 0.

- [ ] **Step 6: Commit shell/settings migration**

```bash
git add frontend/src/config/project.config.ts frontend/src/shared/layout frontend/src/shared/components frontend/src/modules/settings/SettingsPage.tsx
git commit -m "feat(i18n): translate shell and settings"
```

## Task 3: Browser List, Proxy Pool, and Core Management Text

**Files:**
- Modify: `frontend/src/shared/i18n/messages.zh-CN.ts`
- Modify: `frontend/src/shared/i18n/messages.en-US.ts`
- Modify: `frontend/src/modules/browser/pages/BrowserListPage.tsx`
- Modify: `frontend/src/modules/browser/pages/browserList/BrowserListDialogs.tsx`
- Modify: `frontend/src/modules/browser/pages/ProxyPoolPage.tsx`
- Modify: `frontend/src/modules/browser/pages/proxyPool/ProxyPoolHeader.tsx`
- Modify: `frontend/src/modules/browser/pages/proxyPool/ProxyPoolModals.tsx`
- Modify: `frontend/src/modules/browser/pages/proxyPool/ProxyPoolTableCard.tsx`
- Modify: `frontend/src/modules/browser/pages/CoreManagementPage.tsx`

- [ ] **Step 1: Add missing workflow keys as code is migrated**

When a visible string is migrated, add the matching key to both dictionaries in the same patch. Use this naming:

```ts
'browser.list.filter.all': '全部',
'browser.list.status.running': '运行中',
'browser.list.status.stopped': '已停止',
'browser.proxyPool.status.available': '可用',
'browser.proxyPool.status.unavailable': '不可用',
'browser.cores.defaultBadge': '默认',
```

English values:

```ts
'browser.list.filter.all': 'All',
'browser.list.status.running': 'Running',
'browser.list.status.stopped': 'Stopped',
'browser.proxyPool.status.available': 'Available',
'browser.proxyPool.status.unavailable': 'Unavailable',
'browser.cores.defaultBadge': 'Default',
```

- [ ] **Step 2: Migrate browser list high-frequency labels**

In `BrowserListPage.tsx` and `BrowserListDialogs.tsx`, import `useI18n`, call `const { t, language } = useI18n()`, and replace page title/subtitle, search placeholder, table headers, primary actions, status labels, empty states, and confirmations with keys. Use `language` for date and locale-sensitive formatting where the file currently hardcodes `zh-CN`.

- [ ] **Step 3: Migrate proxy pool high-frequency labels**

In `ProxyPoolPage.tsx` and `proxyPool/*.tsx`, import `useI18n`, pass `t` through component props where needed, and replace page title/subtitle, search placeholder, table headers, add/edit/delete/test actions, status labels, empty states, and confirmations with keys. Use `language` for date and locale-sensitive formatting where the file currently hardcodes `zh-CN`.

- [ ] **Step 4: Migrate core management high-frequency labels**

In `CoreManagementPage.tsx`, import `useI18n`, call `const { t } = useI18n()`, and replace title/subtitle, table headers, default badge, add/edit/delete actions, empty states, and confirmations with keys.

- [ ] **Step 5: Verify dictionary parity**

Run:

```bash
cd frontend
npm run test:i18n
```

Expected: dictionary validation passes.

- [ ] **Step 6: Commit browser workflow migration**

```bash
git add frontend/src/shared/i18n frontend/src/modules/browser/pages/BrowserListPage.tsx frontend/src/modules/browser/pages/browserList/BrowserListDialogs.tsx frontend/src/modules/browser/pages/ProxyPoolPage.tsx frontend/src/modules/browser/pages/proxyPool frontend/src/modules/browser/pages/CoreManagementPage.tsx
git commit -m "feat(i18n): translate core browser workflows"
```

## Task 4: Final Verification and Runtime Smoke Check

**Files:**
- Modify only files required to fix verification failures.

- [ ] **Step 1: Run i18n validation**

```bash
cd frontend
npm run test:i18n
```

Expected: dictionary validation passes.

- [ ] **Step 2: Run frontend build**

```bash
cd frontend
npm run build:keep
```

Expected: TypeScript and Vite build exit 0.

- [ ] **Step 3: Start the app for manual review**

From repository root, run:

```bash
wails dev
```

Expected: dev app starts and exposes the frontend for review.

- [ ] **Step 4: Smoke check language switching**

Open the app, navigate to Settings, switch language from `简体中文` to `English`, and verify:

- Sidebar navigation switches to English.
- Settings labels switch to English.
- Browser list/proxy pool/core management high-frequency labels switch to English.
- Switching back to `简体中文` restores Chinese labels.

- [ ] **Step 5: Commit verification fixes**

If verification required fixes:

```bash
git add <fixed-files>
git commit -m "fix(i18n): resolve language verification issues"
```

If no fixes were required, do not create an empty commit.

## Self Review

- Spec coverage: The plan creates an i18n provider, dictionaries, settings integration, core page translation, dictionary validation, build verification, and runtime smoke testing.
- Scope check: Long docs, backend logs, backend errors, browser fingerprint language, and backend config migration remain out of scope as approved.
- Placeholder scan: No placeholder or undefined task remains.
- Type consistency: `SupportedLanguage`, `Messages`, `LanguageProvider`, `useI18n`, and `normalizeLanguage` are defined before use.
