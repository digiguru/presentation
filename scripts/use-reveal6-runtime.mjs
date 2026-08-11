import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const copies = [
    ['vendor/reveal-6.0.1/dist/reveal.js', 'dist/reveal.js'],
    ['vendor/reveal-6.0.1/dist/reveal.mjs', 'dist/reveal.esm.js'],
    ['vendor/reveal-6.0.1/dist/reveal.css', 'dist/reveal.css'],
    ['vendor/reveal-6.0.1/dist/reset.css', 'dist/reset.css'],
    ['vendor/reveal-6.0.1/dist/plugin/highlight.js', 'plugin/highlight/highlight.js'],
    ['vendor/reveal-6.0.1/dist/plugin/highlight/monokai.css', 'plugin/highlight/monokai.css'],
    ['vendor/reveal-6.0.1/dist/plugin/highlight/zenburn.css', 'plugin/highlight/zenburn.css'],
    ['vendor/reveal-6.0.1/dist/plugin/markdown.js', 'plugin/markdown/markdown.js'],
    ['vendor/reveal-6.0.1/dist/plugin/math.js', 'plugin/math/math.js'],
    ['vendor/reveal-6.0.1/dist/plugin/notes.js', 'plugin/notes/notes.js'],
    ['vendor/reveal-6.0.1/dist/plugin/search.js', 'plugin/search/search.js'],
    ['vendor/reveal-6.0.1/dist/plugin/zoom.js', 'plugin/zoom/zoom.js']
]

for (const [source, destination] of copies) {
    const sourcePath = resolve(root, source)
    const destinationPath = resolve(root, destination)
    await mkdir(dirname(destinationPath), { recursive: true })
    await copyFile(sourcePath, destinationPath)
}

console.log(`Activated pinned Reveal.js 6.0.1 runtime across ${copies.length} legacy asset paths.`)
