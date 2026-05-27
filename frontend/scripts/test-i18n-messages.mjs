import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { Script } from 'node:vm'
import ts from 'typescript'

function loadTsModule(path, requireMap = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  })

  const module = { exports: {} }
  const require = (id) => {
    if (id in requireMap) {
      return requireMap[id]
    }
    throw new Error(`Unexpected require: ${id}`)
  }

  new Script(compiled.outputText).runInNewContext({ exports: module.exports, module, require })
  return module.exports
}

function flattenKeys(value, prefix = '') {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      return flattenKeys(child, path)
    }
    return [path]
  })
}

const typesModule = loadTsModule('../src/shared/i18n/types.ts')
const zhModule = loadTsModule('../src/shared/i18n/messages.zh-CN.ts')
const enModule = loadTsModule('../src/shared/i18n/messages.en-US.ts')

assert.equal(typesModule.DEFAULT_LANGUAGE, 'zh-CN')
assert.equal(
  JSON.stringify(typesModule.SUPPORTED_LANGUAGE_OPTIONS.map((option) => option.value)),
  JSON.stringify(['zh-CN', 'en-US']),
)
assert.equal(typesModule.normalizeLanguage('zh-CN'), 'zh-CN')
assert.equal(typesModule.normalizeLanguage('zh'), 'zh-CN')
assert.equal(typesModule.normalizeLanguage('en-US'), 'en-US')
assert.equal(typesModule.normalizeLanguage('en'), 'en-US')
assert.equal(typesModule.normalizeLanguage('fr-FR'), 'zh-CN')
assert.equal(typesModule.normalizeLanguage(null), 'zh-CN')

const zhKeys = flattenKeys(zhModule.zhCNMessages).sort()
const enKeys = flattenKeys(enModule.enUSMessages).sort()

assert.equal(JSON.stringify(enKeys), JSON.stringify(zhKeys))
assert.ok(zhKeys.includes('common.actions.save'))
assert.ok(zhKeys.includes('nav.browserList'))
assert.ok(zhKeys.includes('settings.language'))
assert.ok(zhKeys.includes('theme.system'))
assert.ok(zhKeys.includes('browserList.actions.launch'))
assert.ok(zhKeys.includes('proxy.status.available'))
assert.ok(zhKeys.includes('core.actions.download'))

console.log('i18n message tests passed')
