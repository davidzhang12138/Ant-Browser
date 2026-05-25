import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { Script } from 'node:vm'
import ts from 'typescript'

const source = readFileSync(new URL('../src/modules/browser/utils/fingerprintSerializer.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
})

const module = { exports: {} }
new Script(compiled.outputText).runInNewContext({ exports: module.exports, module, Intl })

const { applyCoreBrowserMajorToFingerprintArgs } = module.exports
const { deserialize, serialize } = module.exports

const customUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
const args = [
  '--fingerprint-platform=windows',
  '--fingerprint-platform-version=11.0',
  `--user-agent=${customUA}`,
]

const preserved = applyCoreBrowserMajorToFingerprintArgs(args, '142.0.7444.60')
assert.ok(preserved.includes(`--user-agent=${customUA}`), preserved.join('\n'))
assert.ok(preserved.includes('--fingerprint-brand-version=136'), preserved.join('\n'))

const forced = applyCoreBrowserMajorToFingerprintArgs(args, '142.0.7444.60', { force: true })
assert.ok(forced.some(arg => arg.includes('Chrome/142.0.0.0')), forced.join('\n'))
assert.ok(forced.includes('--fingerprint-brand-version=142'), forced.join('\n'))

const parsedBrandVersion = deserialize(['--fingerprint-brand=Chrome', '--fingerprint-brand-version=138'])
assert.equal(parsedBrandVersion.browserMajor, '138')
assert.ok(serialize(parsedBrandVersion).includes('--fingerprint-brand-version=138'))

console.log('fingerprint serializer tests passed')
