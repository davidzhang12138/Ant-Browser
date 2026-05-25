import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { Script } from 'node:vm'
import ts from 'typescript'

function loadTS(relativePath) {
  const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  })
  const module = { exports: {} }
  const require = (specifier) => {
    if (specifier === './fingerprintSerializer') {
      return loadTS('../src/modules/browser/utils/fingerprintSerializer.ts')
    }
    throw new Error(`unexpected require: ${specifier}`)
  }
  new Script(compiled.outputText).runInNewContext({ exports: module.exports, module, require, Intl })
  return module.exports
}

const { resolveNearestCoreForBrowserMajor } = loadTS('../src/modules/browser/utils/coreVersionMatcher.ts')

const cores = [
  { coreId: 'chrome-135', coreName: 'Chrome 135' },
  { coreId: 'chrome-139', coreName: 'Chrome 139' },
  { coreId: 'chrome-142', coreName: 'Chrome 142' },
]
const versions = {
  'chrome-135': '135.0.7049.115',
  'chrome-139': '139.0.7258.154',
  'chrome-142': '142.0.7444.60',
}

assert.equal(resolveNearestCoreForBrowserMajor('136', cores, versions), 'chrome-135')
assert.equal(resolveNearestCoreForBrowserMajor('141', cores, versions), 'chrome-142')
assert.equal(resolveNearestCoreForBrowserMajor('139', cores, versions), 'chrome-139')
assert.equal(resolveNearestCoreForBrowserMajor('', cores, versions), '')
assert.equal(resolveNearestCoreForBrowserMajor('140', cores, {
  'chrome-139': '139.0.7258.154',
  'chrome-142': '142.0.7444.60',
}), 'chrome-139')
assert.equal(resolveNearestCoreForBrowserMajor('141', cores, {}), 'chrome-142')

console.log('core version matcher tests passed')
