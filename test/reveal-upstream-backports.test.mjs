import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const layoutPath = new URL('../css/layout.scss', import.meta.url)
const draculaPath = new URL('../css/theme/source/dracula.scss', import.meta.url)

test('r-stack constrains its grid row to avoid Chromium overflow', async () => {
    const source = await readFile(layoutPath, 'utf8')

    assert.match(source, /\.reveal \.r-stack\s*\{[^}]*grid-template-rows:\s*100%;/s)
})

test('Dracula theme uses native list markers for nested-list semantics', async () => {
    const source = await readFile(draculaPath, 'utf8')

    assert.match(source, /li::marker\s*\{[^}]*color:\s*var\(--r-list-bullet-color\);/s)
    assert.doesNotMatch(source, /li::before\s*\{/)
    assert.doesNotMatch(source, /list-style:\s*none/)
})
