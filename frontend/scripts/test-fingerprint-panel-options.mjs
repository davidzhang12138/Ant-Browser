import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/modules/browser/components/FingerprintPanel.tsx', import.meta.url), 'utf8')
const match = source.match(/const BROWSER_MAJOR_OPTIONS = \[([\s\S]*?)\]\n/)
assert.ok(match, 'BROWSER_MAJOR_OPTIONS should be defined')

const values = [...match[1].matchAll(/value:\s*'(\d+)'/g)].map(item => item[1])
const required = Array.from({ length: 10 }, (_, index) => String(145 - index))

for (const version of required) {
  assert.ok(values.includes(version), `browser major options should include ${version}`)
}

assert.deepEqual([...new Set(values)], values, 'browser major options should not contain duplicates')

console.log('fingerprint panel option tests passed')
