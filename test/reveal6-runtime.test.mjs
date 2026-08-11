import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const expectedGitBlobShas = new Map([
    ['../vendor/reveal-6.0.1/dist/reveal.js', '16b2be07ca4fd23b967cfca6dd22998267e0cf4e'],
    ['../vendor/reveal-6.0.1/dist/reveal.css', 'c00daedad5e41e72e50cada81f6de072ec0ad007'],
    ['../vendor/reveal-6.0.1/dist/plugin/highlight.js', '9928c9baa08cd765fc2d0f5d0309c5bed0fc0c21'],
    ['../vendor/reveal-6.0.1/dist/plugin/markdown.js', '97b6754ee5dec6df68926289de58c9af25f97722'],
    ['../vendor/reveal-6.0.1/dist/plugin/math.js', '5810d7419a7dfb821528237183bc476b0fa886c4'],
    ['../vendor/reveal-6.0.1/dist/plugin/notes.js', 'e32762c7ef7e88253f846b0e02d7bc4059f90aa8'],
    ['../vendor/reveal-6.0.1/dist/plugin/search.js', 'f4db02628d70c51cba885edaca825d5ddffc6f47'],
    ['../vendor/reveal-6.0.1/dist/plugin/zoom.js', 'adb8bf60eccd22479afe16239a12e236fe3383d2']
])

function gitBlobSha(buffer) {
    return createHash('sha1')
        .update(`blob ${buffer.length}\0`)
        .update(buffer)
        .digest('hex')
}

test('vendored runtime matches the exact upstream Reveal.js 6.0.1 blobs', async () => {
    for (const [relativePath, expectedSha] of expectedGitBlobShas) {
        const buffer = await readFile(new URL(relativePath, import.meta.url))
        assert.equal(gitBlobSha(buffer), expectedSha, relativePath)
    }
})
