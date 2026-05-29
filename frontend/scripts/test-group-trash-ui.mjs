import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const assertIncludes = (content, expected, label) => {
  if (!content.includes(expected)) {
    throw new Error(`${label} missing ${expected}`)
  }
}

const groupPage = read('src/modules/browser/pages/GroupManagementPage.tsx')
const dialogs = read('src/modules/browser/pages/browserList/BrowserListDialogs.tsx')
const zh = read('src/shared/i18n/messages.zh-CN.ts')
const en = read('src/shared/i18n/messages.en-US.ts')

if (/handleDeleteGroup[\s\S]*?confirm\(/.test(groupPage)) {
  throw new Error('group delete must use app Modal instead of native confirm()')
}

assertIncludes(groupPage, 'pendingDeleteGroup', 'GroupManagementPage delete state')
assertIncludes(groupPage, '确认删除分组', 'GroupManagementPage delete modal title')
assertIncludes(groupPage, '子分组和实例会移动到上级分组', 'GroupManagementPage delete modal warning')

assertIncludes(dialogs, 'trashSearch', 'BrowserListDialogs trash search state')
assertIncludes(dialogs, 'filteredTrashProfiles', 'BrowserListDialogs filtered trash profiles')
assertIncludes(dialogs, 'matchesTrashProfile', 'BrowserListDialogs trash search matcher')
assertIncludes(dialogs, 'searchTrashPlaceholder', 'BrowserListDialogs trash search input')
assertIncludes(dialogs, 'trashSearchEmpty', 'BrowserListDialogs filtered empty state')

assertIncludes(zh, 'searchTrashPlaceholder', 'zh-CN trash search i18n')
assertIncludes(en, 'searchTrashPlaceholder', 'en-US trash search i18n')

console.log('group delete and trash search ui tests passed')
