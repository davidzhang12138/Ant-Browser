import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const assertIncludes = (content, expected, label) => {
  if (!content.includes(expected)) {
    throw new Error(`${label} missing ${expected}`)
  }
}

const listPage = read('src/modules/browser/pages/BrowserListPage.tsx')
const dialogs = read('src/modules/browser/pages/browserList/BrowserListDialogs.tsx')

if (/handleDeleteForeverFromTrash[\s\S]*?confirm\(/.test(listPage)) {
  throw new Error('trash forever delete must not use native confirm() in BrowserListPage')
}

assertIncludes(dialogs, 'pendingTrashDelete', 'BrowserListDialogs')
assertIncludes(dialogs, '确认彻底删除', 'BrowserListDialogs confirm modal')
assertIncludes(dialogs, '此操作不可恢复', 'BrowserListDialogs destructive warning')

console.log('trash delete confirm tests passed')
