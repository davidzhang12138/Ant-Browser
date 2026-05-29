import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const assertIncludes = (content, expected, label) => {
  if (!content.includes(expected)) {
    throw new Error(`${label} missing ${expected}`)
  }
}

const listPage = read('src/modules/browser/pages/BrowserListPage.tsx')
const dialogs = read('src/modules/browser/pages/browserList/BrowserListDialogs.tsx')
const zh = read('src/shared/i18n/messages.zh-CN.ts')
const en = read('src/shared/i18n/messages.en-US.ts')

if (/handleDeleteForeverFromTrash[\s\S]*?confirm\(/.test(listPage)) {
  throw new Error('trash forever delete must not use native confirm() in BrowserListPage')
}

assertIncludes(dialogs, 'pendingTrashDelete', 'BrowserListDialogs')
assertIncludes(dialogs, 'confirmDeleteForeverTitle', 'BrowserListDialogs confirm modal')
assertIncludes(dialogs, 'unrecoverable', 'BrowserListDialogs destructive warning')
assertIncludes(zh, '确认彻底删除', 'zh-CN confirm modal')
assertIncludes(zh, '此操作不可恢复', 'zh-CN destructive warning')
assertIncludes(en, 'Confirm Permanent Delete', 'en-US confirm modal')
assertIncludes(en, 'This action cannot be recovered', 'en-US destructive warning')

console.log('trash delete confirm tests passed')
