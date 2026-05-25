import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const assertIncludes = (content, expected, label) => {
  if (!content.includes(expected)) {
    throw new Error(`${label} missing ${expected}`)
  }
}

const settingsPage = read('src/modules/settings/SettingsPage.tsx')
const settingsApi = read('src/modules/settings/api.ts')
const storageCard = read('src/modules/settings/components/StorageCleanupCard.tsx')
const appBindings = read('src/wailsjs/go/main/App.d.ts')

assertIncludes(settingsPage, 'StorageCleanupCard', 'SettingsPage')
assertIncludes(settingsPage, 'fetchStorageCleanupOverview', 'SettingsPage')
assertIncludes(settingsPage, 'clearLegacyCacheRoot', 'SettingsPage')
assertIncludes(settingsPage, 'clearCurrentBrowserCaches', 'SettingsPage')

assertIncludes(settingsApi, 'StorageCleanupOverview', 'settings api')
assertIncludes(settingsApi, 'GetStorageCleanupOverview', 'settings api')
assertIncludes(settingsApi, 'ClearLegacyCacheRoot', 'settings api')
assertIncludes(settingsApi, 'ClearCurrentBrowserCaches', 'settings api')

assertIncludes(appBindings, 'GetStorageCleanupOverview', 'Wails bindings')
assertIncludes(appBindings, 'ClearLegacyCacheRoot', 'Wails bindings')
assertIncludes(appBindings, 'ClearCurrentBrowserCaches', 'Wails bindings')

assertIncludes(storageCard, 'pendingAction', 'StorageCleanupCard confirm flow')
assertIncludes(storageCard, '确认清理', 'StorageCleanupCard confirm modal')
if (storageCard.includes('!overview.legacyCacheRoot.exists') || storageCard.includes('!overview.legacyCacheRoot.cleanable')) {
  throw new Error('legacy cleanup button should not be disabled by stale scan results')
}

console.log('storage cleanup UI wiring tests passed')
