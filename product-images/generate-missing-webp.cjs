#!/usr/bin/env node

const fs = require('fs/promises')
const path = require('path')
const readline = require('readline/promises')
const sharp = require('sharp')

const rootDir = __dirname
const ignoredDirs = new Set(['.git', 'node_modules'])
const numericJpgPattern = /^\d+\.jpe?g$/i
const numericImagePattern = /^\d+\.(jpe?g|webp)$/i

const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run')
const overwrite = args.has('--overwrite')
const overwriteCovers = overwrite || args.has('--overwrite-covers')
const onlyCovers = args.has('--only-covers')
const askDimensions = args.has('--ask-dimensions')
const createCovers = args.has('--create-covers')
const qualityArg = process.argv.find((arg) => arg.startsWith('--quality='))
const quality = qualityArg ? Number(qualityArg.split('=')[1]) : 82
const widthArg = process.argv.find((arg) => arg.startsWith('--width='))
const heightArg = process.argv.find((arg) => arg.startsWith('--height='))
const coverWidthArg = process.argv.find((arg) => arg.startsWith('--cover-width='))
const coverHeightArg = process.argv.find((arg) => arg.startsWith('--cover-height='))
const fitArg = process.argv.find((arg) => arg.startsWith('--fit='))
const coverFitArg = process.argv.find((arg) => arg.startsWith('--cover-fit='))
const productsArg = process.argv.find((arg) => arg.startsWith('--products='))
const coverProductsArg = process.argv.find((arg) => arg.startsWith('--cover-products='))

let resizeWidth = widthArg ? Number(widthArg.split('=')[1]) : null
let resizeHeight = heightArg ? Number(heightArg.split('=')[1]) : null
let coverWidth = coverWidthArg ? Number(coverWidthArg.split('=')[1]) : null
let coverHeight = coverHeightArg ? Number(coverHeightArg.split('=')[1]) : null
const fit = fitArg ? fitArg.split('=')[1] : 'inside'
const coverFit = coverFitArg ? coverFitArg.split('=')[1] : 'cover'
const productFilter = parseProductList(productsArg, '--products=')
const coverProducts = parseProductList(coverProductsArg, '--cover-products=') ?? productFilter

function parseProductList(arg, prefix) {
    return arg
    ? new Set(
          arg
              .slice(prefix.length)
              .split(',')
              .map((name) => name.trim())
              .filter(Boolean)
      )
    : null
}

if (!Number.isInteger(quality) || quality < 1 || quality > 100) {
    console.error('Invalid --quality value. Use an integer from 1 to 100.')
    process.exit(1)
}

for (const [name, value] of [
    ['--width', resizeWidth],
    ['--height', resizeHeight],
    ['--cover-width', coverWidth],
    ['--cover-height', coverHeight]
]) {
    if (value !== null && (!Number.isInteger(value) || value < 1)) {
        console.error(`Invalid ${name} value. Use a positive integer.`)
        process.exit(1)
    }
}

for (const [name, value] of [
    ['--fit', fit],
    ['--cover-fit', coverFit]
]) {
    if (!['cover', 'contain', 'fill', 'inside', 'outside'].includes(value)) {
        console.error(`Invalid ${name} value. Use cover, contain, fill, inside, or outside.`)
        process.exit(1)
    }
}

async function pathExists(filePath) {
    try {
        await fs.access(filePath)
        return true
    } catch {
        return false
    }
}

async function askForDimensions() {
    if (!askDimensions || widthArg || heightArg) {
        return
    }

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })

    try {
        const widthAnswer = (await rl.question('Output width in px (blank = original width): ')).trim()
        const heightAnswer = (
            await rl.question('Output height in px (blank = original height): ')
        ).trim()

        resizeWidth = widthAnswer ? Number(widthAnswer) : null
        resizeHeight = heightAnswer ? Number(heightAnswer) : null

        if (
            (resizeWidth !== null && (!Number.isInteger(resizeWidth) || resizeWidth < 1)) ||
            (resizeHeight !== null && (!Number.isInteger(resizeHeight) || resizeHeight < 1))
        ) {
            throw new Error('Invalid dimensions. Use positive integers or leave blank.')
        }
    } finally {
        rl.close()
    }
}

async function findMissingWebpJobs(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const jobs = []

    for (const entry of entries) {
        const entryPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
            if (!ignoredDirs.has(entry.name)) {
                jobs.push(...(await findMissingWebpJobs(entryPath)))
            }
            continue
        }

        if (!entry.isFile() || !numericJpgPattern.test(entry.name)) {
            continue
        }

        const parsed = path.parse(entryPath)
        const outputPath = path.join(parsed.dir, `${parsed.name}.webp`)

        if (!onlyCovers && (overwrite || !(await pathExists(outputPath)))) {
            jobs.push({
                inputPath: entryPath,
                outputPath,
                width: resizeWidth,
                height: resizeHeight,
                fit,
                type: 'numeric'
            })
        }
    }

    return jobs
}

async function findFirstNumericImage(dir, excludedPath = null) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const files = entries
        .filter((entry) => {
            if (!entry.isFile() || !numericImagePattern.test(entry.name)) return false
            return path.join(dir, entry.name) !== excludedPath
        })
        .map((entry) => entry.name)
        .sort((a, b) => {
            const aIsJpg = /\.jpe?g$/i.test(a)
            const bIsJpg = /\.jpe?g$/i.test(b)
            if (aIsJpg !== bIsJpg) return aIsJpg ? -1 : 1
            return Number.parseInt(a, 10) - Number.parseInt(b, 10)
        })

    if (files.length > 0) {
        return path.join(dir, files[0])
    }

    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
        if (!entry.isDirectory() || ignoredDirs.has(entry.name)) {
            continue
        }

        const found = await findFirstNumericImage(path.join(dir, entry.name), excludedPath)
        if (found) return found
    }

    return null
}

async function findCoverJobs() {
    if (!createCovers) {
        return []
    }

    const entries = await fs.readdir(rootDir, { withFileTypes: true })
    const jobs = []

    for (const entry of entries) {
        if (!entry.isDirectory() || ignoredDirs.has(entry.name)) {
            continue
        }

        if (coverProducts && !coverProducts.has(entry.name)) {
            continue
        }

        const productDir = path.join(rootDir, entry.name)
        const outputPath = path.join(productDir, '1.webp')

        if (!overwriteCovers && (await pathExists(outputPath))) {
            continue
        }

        const inputPath = await findFirstNumericImage(productDir, outputPath)
        if (!inputPath) {
            continue
        }

        jobs.push({
            inputPath,
            outputPath,
            width: coverWidth ?? resizeWidth,
            height: coverHeight ?? coverWidth ?? resizeHeight ?? resizeWidth,
            fit: coverFit,
            type: 'cover'
        })
    }

    return jobs
}

async function writeWebp({ inputPath, outputPath, width, height, fit: resizeFit }) {
    let pipeline = sharp(inputPath).rotate()

    if (width || height) {
        pipeline = pipeline.resize({
            width: width || undefined,
            height: height || undefined,
            fit: resizeFit,
            withoutEnlargement: true
        })
    }

    if (inputPath === outputPath) {
        const tempPath = path.join(
            path.dirname(outputPath),
            `.${path.basename(outputPath)}.${Date.now()}.tmp`
        )
        await pipeline.webp({ quality, effort: 5 }).toFile(tempPath)
        await fs.rename(tempPath, outputPath)
        return
    }

    await pipeline.webp({ quality, effort: 5 }).toFile(outputPath)
}

async function main() {
    await askForDimensions()
    const numericJobs = productFilter
        ? (
              await Promise.all(
                  [...productFilter].map(async (productName) => {
                      const productDir = path.join(rootDir, productName)
                      if (!(await pathExists(productDir))) {
                          console.warn(`Skipping missing product folder: ${productName}`)
                          return []
                      }
                      return findMissingWebpJobs(productDir)
                  })
              )
          ).flat()
        : await findMissingWebpJobs(rootDir)

    const jobs = [...numericJobs, ...(await findCoverJobs())]

    if (jobs.length === 0) {
        console.log('All requested WebP files already exist.')
        return
    }

    console.log(
        `${dryRun ? 'Would create' : 'Creating'} ${jobs.length} WebP file${jobs.length === 1 ? '' : 's'} at quality ${quality}.`
    )

    for (const job of jobs) {
        const { inputPath, outputPath, width, height, type } = job
        const relativeInput = path.relative(rootDir, inputPath)
        const relativeOutput = path.relative(rootDir, outputPath)
        const resizeLabel = width || height ? ` (${width || 'auto'}x${height || 'auto'}, ${type})` : ''

        if (dryRun) {
            console.log(`${relativeInput} -> ${relativeOutput}${resizeLabel}`)
            continue
        }

        await writeWebp(job)
        console.log(`${relativeInput} -> ${relativeOutput}${resizeLabel}`)
    }
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
