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

const typesModule = loadTsModule('../src/shared/theme/types.ts')
const resolverModule = loadTsModule('../src/shared/theme/themeResolver.ts', {
  './types': typesModule,
})

const { resolveThemePreference, isConcreteTheme } = resolverModule

assert.equal(resolveThemePreference('system', true), 'dark')
assert.equal(resolveThemePreference('system', false), 'light')
assert.equal(resolveThemePreference('dark', false), 'dark')
assert.equal(resolveThemePreference('light', true), 'light')
assert.equal(resolveThemePreference('cream', true), 'cream')
assert.equal(isConcreteTheme('system'), false)
assert.equal(isConcreteTheme('ocean'), true)

console.log('theme resolver tests passed')
