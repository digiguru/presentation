const pkg = require('./package.json')
const path = require('path')
const { pathToFileURL } = require('url')
const glob = require('glob')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const colors = require('colors')
const { objectTransform } = require('through2')
const qunit = require('node-qunit-puppeteer')
const { finished } = require('stream/promises')

const { rollup } = require('rollup')
const terserModule = require('@rollup/plugin-terser')
const terser = terserModule.default || terserModule
const commonjs = require('@rollup/plugin-commonjs')
const resolve = require('@rollup/plugin-node-resolve').default
const sass = require('sass')

const gulp = require('gulp')
const zip = require('gulp-zip')
const header = require('gulp-header')
const minify = require('gulp-clean-css')

const argv = yargs(hideBin(process.argv)).argv
const root = argv.root || '.'
const port = argv.port || 8000
const host = argv.host || 'localhost'

const banner = `/*!
* reveal.js ${pkg.version}
* ${pkg.homepage}
* MIT licensed
*
* Copyright (C) 2011-2023 Hakim El Hattab, https://hakim.se
*/\n`

// Prevents warnings from opening too many test pages
process.setMaxListeners(20)

let babelCorePromise
function babel(options) {
    const { extensions = ['.js'], ...babelOptions } = options

    return {
        name: 'babel-8',
        async transform(code, id) {
            if (!extensions.some(extension => id.endsWith(extension))) return null

            babelCorePromise ||= import('@babel/core')
            const { transformAsync } = await babelCorePromise
            const result = await transformAsync(code, {
                ...babelOptions,
                filename: id,
                sourceMaps: true
            })

            return result ? { code: result.code, map: result.map } : null
        }
    }
}

const babelConfig = {
    ignore: ['node_modules'],
    compact: false,
    extensions: ['.js', '.html'],
    plugins: [
        [
            'polyfill-corejs3',
            {
                method: 'usage-global',
                version: require('core-js/package.json').version
            }
        ],
        'transform-html-import-to-string'
    ],
    presets: [[
        '@babel/preset-env',
        {
            modules: false
        }
    ]]
}

// Our ES module bundle only targets newer browsers with
// module support. Browsers are targeted explicitly instead
// of using the "esmodule: true" target since that leads to
// polyfilling older browsers and a larger bundle.
const babelConfigESM = JSON.parse(JSON.stringify(babelConfig))
babelConfigESM.presets[0][1].targets = { browsers: [
    'last 2 Chrome versions',
    'last 2 Safari versions',
    'last 2 iOS versions',
    'last 2 Firefox versions',
    'last 2 Edge versions'
] }

let cache = {}

gulp.task('js-es5', () => {
    return rollup({
        cache: cache.umd,
        input: 'js/index.js',
        plugins: [
            resolve(),
            commonjs(),
            babel(babelConfig),
            terser()
        ]
    }).then(bundle => {
        cache.umd = bundle.cache
        return bundle.write({
            name: 'Reveal',
            file: './dist/reveal.js',
            format: 'umd',
            banner,
            sourcemap: true
        })
    })
})

gulp.task('js-es6', () => {
    return rollup({
        cache: cache.esm,
        input: 'js/index.js',
        plugins: [
            resolve(),
            commonjs(),
            babel(babelConfigESM),
            terser()
        ]
    }).then(bundle => {
        cache.esm = bundle.cache
        return bundle.write({
            file: './dist/reveal.esm.js',
            format: 'es',
            banner,
            sourcemap: true
        })
    })
})
gulp.task('js', gulp.parallel('js-es5', 'js-es6'))

gulp.task('plugins', () => {
    return Promise.all([
        { name: 'RevealHighlight', input: './plugin/highlight/plugin.js', output: './plugin/highlight/highlight' },
        { name: 'RevealMarkdown', input: './plugin/markdown/plugin.js', output: './plugin/markdown/markdown' },
        { name: 'RevealSearch', input: './plugin/search/plugin.js', output: './plugin/search/search' },
        { name: 'RevealNotes', input: './plugin/notes/plugin.js', output: './plugin/notes/notes' },
        { name: 'RevealZoom', input: './plugin/zoom/plugin.js', output: './plugin/zoom/zoom' },
        { name: 'RevealMath', input: './plugin/math/plugin.js', output: './plugin/math/math' }
    ].map(plugin => {
        return rollup({
            cache: cache[plugin.input],
            input: plugin.input,
            plugins: [
                resolve(),
                commonjs(),
                babel({
                    ...babelConfig,
                    ignore: [/node_modules\/(?!(highlight\.js|marked)\/).*/]
                }),
                terser()
            ]
        }).then(async bundle => {
            cache[plugin.input] = bundle.cache
            await Promise.all([
                bundle.write({
                    file: `${plugin.output}.esm.js`,
                    name: plugin.name,
                    format: 'es'
                }),
                bundle.write({
                    file: `${plugin.output}.js`,
                    name: plugin.name,
                    format: 'umd'
                })
            ])
        })
    }))
})

// A pipeable Sass step using Dart Sass's modern API.
function compileSass() {
    return objectTransform((vinylFile, encoding, callback) => {
        try {
            const result = sass.compileString(vinylFile.contents.toString(), {
                loadPaths: ['css/', 'css/theme/template'],
                url: pathToFileURL(vinylFile.path),
                style: 'expanded'
            })
            const transformedFile = vinylFile.clone()
            transformedFile.extname = '.css'
            transformedFile.contents = Buffer.from(result.css)
            callback(null, transformedFile)
        } catch (error) {
            console.error(vinylFile.path)
            callback(error)
        }
    })
}

gulp.task('css-themes', () => gulp.src(['./css/theme/source/*.{sass,scss}'])
    .pipe(compileSass())
    .pipe(gulp.dest('./dist/theme')))

gulp.task('css-core', async () => {
    const { default: autoprefixer } = await import('gulp-autoprefixer')
    const stream = gulp.src(['css/reveal.scss'])
        .pipe(compileSass())
        .pipe(autoprefixer())
        .pipe(minify({ compatibility: 'ie9' }))
        .pipe(header(banner))
        .pipe(gulp.dest('./dist'))

    await finished(stream)
})

gulp.task('css', gulp.parallel('css-themes', 'css-core'))

gulp.task('qunit', async () => {
    const { createStaticServer } = await import('./scripts/static-server.mjs')
    const serverConfig = {
        root,
        port: 8009,
        host: 'localhost'
    }
    const server = await createStaticServer(serverConfig)
    console.log(`test-server started http://${serverConfig.host}:${serverConfig.port}`.green)

    const testFiles = glob.sync('test/*.html')
    let totalTests = 0
    let failingTests = 0

    try {
        await Promise.all(testFiles.map(filename => qunit.runQunitPuppeteer({
            targetUrl: `http://${serverConfig.host}:${serverConfig.port}/${filename}`,
            timeout: 20000,
            redirectConsole: false,
            puppeteerArgs: ['--allow-file-access-from-files', '--no-sandbox']
        }).then(result => {
            if (result.stats.failed > 0) {
                console.log(`! ${filename} [${result.stats.passed}/${result.stats.total}] in ${result.stats.runtime}ms`.red)
                qunit.printFailedTests(result, console)
            } else {
                console.log(`✔ ${filename} [${result.stats.passed}/${result.stats.total}] in ${result.stats.runtime}ms`.green)
            }

            totalTests += result.stats.total
            failingTests += result.stats.failed
        })))

        if (failingTests > 0) {
            throw new Error(`${failingTests}/${totalTests} tests failed`.red)
        }

        console.log(`✔ Passed ${totalTests} tests`.green.bold)
    } finally {
        await new Promise(resolveServer => server.close(resolveServer))
        console.log('test-server stopped'.green)
    }
})

gulp.task('test', gulp.series('qunit'))

gulp.task('default', gulp.series(gulp.parallel('js', 'css', 'plugins'), 'test'))

gulp.task('build', gulp.parallel('js', 'css', 'plugins'))

gulp.task('package', gulp.series(() =>
    gulp.src(
        [
            './index.html',
            './dist/**',
            './lib/**',
            './images/**',
            './plugin/**',
            './**/*.md'
        ],
        { base: './' }
    )
        .pipe(zip('reveal-js-presentation.zip'))
        .pipe(gulp.dest('./'))
))

gulp.task('serve', async () => {
    const { createStaticServer } = await import('./scripts/static-server.mjs')
    await createStaticServer({ root, port, host })
    console.log(`Presentation server started at http://${host}:${port}`.green)

    gulp.watch(['js/**'], gulp.series('js'))
    gulp.watch(['plugin/**/plugin.js', 'plugin/**/*.html'], gulp.series('plugins'))
    gulp.watch([
        'css/theme/source/*.{sass,scss}',
        'css/theme/template/*.{sass,scss}'
    ], gulp.series('css-themes'))
    gulp.watch([
        'css/*.scss',
        'css/print/*.{sass,scss,css}'
    ], gulp.series('css-core'))
    gulp.watch(['test/*.html'], gulp.series('test'))
})
