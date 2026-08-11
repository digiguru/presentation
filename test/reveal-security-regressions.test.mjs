import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const slideContentPath = new URL('../js/controllers/slidecontent.js', import.meta.url)
const speakerViewPath = new URL('../plugin/notes/speaker-view.html', import.meta.url)

test('background video sources are created with DOM APIs instead of innerHTML', async () => {
    const source = await readFile(slideContentPath, 'utf8')

    assert.match(source, /document\.createElement\( 'source' \)/)
    assert.match(source, /sourceElement\.setAttribute\( 'src', source \)/)
    assert.doesNotMatch(source, /video\.innerHTML\s*\+=\s*`<source/)
})

test('speaker view validates message origin before parsing message data', async () => {
    const source = await readFile(speakerViewPath, 'utf8')
    const listenerStart = source.indexOf("window.addEventListener( 'message'")
    const originCheck = source.indexOf("window.location.origin !== event.origin", listenerStart)
    const parseMessage = source.indexOf('JSON.parse( event.data )', listenerStart)

    assert.notEqual(listenerStart, -1, 'speaker view should register a message listener')
    assert.notEqual(originCheck, -1, 'message listener should validate event.origin')
    assert.notEqual(parseMessage, -1, 'message listener should parse valid message data')
    assert.ok(originCheck < parseMessage, 'origin must be validated before parsing message data')
})
