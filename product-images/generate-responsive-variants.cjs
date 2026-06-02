#!/usr/bin/env node
/**
 * Generates thumb/, card/, and detail/ WebP variants for every numeric product image set.
 *
 * Usage:
 *   node generate-responsive-variants.cjs
 *   node generate-responsive-variants.cjs --overwrite
 *   node generate-responsive-variants.cjs --dry-run
 */

const fs = require('fs/promises')
const path = require('path')
const sharp = require('sharp')

const rootDir = __dirname
const ignoredDirs = new Set(['.git', 'node_modules', 'thumb', 'card', 'detail'])
const numericSourcePattern = /^(\d+)\.(jpe?g|webp)$/i

const TIERS = {
    thumb: { width: 400, quality: 76 },
    card: { width: 640, quality: 78 },
    detail: { width: 1200, quality: 82 }
}

const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run')
const overwrite = args.has('--overwrite')

async function pathExists(filePath) {
    try {
        await fs.access(filePath)
        return true
    } catch {
        return false
    }
}

async function listNumericSources(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const byIndex = new Map()

    for (const entry of entries) {
        if (!entry.isFile()) continue
        const match = entry.name.match(numericSourcePattern)
        if (!match) continue
        const index = Number(match[1])
        const ext = match[2].toLowerCase()
        const fullPath = path.join(dir, entry.name)
        const stat = await fs.stat(fullPath)
        const rank = ext === 'jpg' || ext === 'jpeg' ? 2 : 1
        const existing = byIndex.get(index)
        if (
            !existing ||
            rank > existing.rank ||
            (rank === existing.rank && stat.size > existing.size)
        ) {
            byIndex.set(index, { inputPath: fullPath, rank, size: stat.size })
        }
    }

    return [...byIndex.entries()].sort((a, b) => a[0] - b[0])
}

async function writeTierVariant({ inputPath, outputPath, width, quality }) {
    let pipeline = sharp(inputPath).rotate()
    pipeline = pipeline.resize({
        width,
        withoutEnlargement: true
    })
    await pipeline.webp({ quality, effort: 5 }).toFile(outputPath)
}

async function processImageSet(dir) {
    const sources = await listNumericSources(dir)
    if (!sources.length) return { written: 0, skipped: 0 }

    let written = 0
    let skipped = 0

    for (const [index, { inputPath }] of sources) {
        for (const [tierName, { width, quality }] of Object.entries(TIERS)) {
            const tierDir = path.join(dir, tierName)
            const outputPath = path.join(tierDir, `${index}.webp`)

            if (!overwrite && (await pathExists(outputPath))) {
                skipped += 1
                continue
            }

            if (dryRun) {
                console.log(
                    `[dry-run] ${path.relative(rootDir, inputPath)} -> ${path.relative(rootDir, outputPath)} (${width}px q${quality})`
                )
                written += 1
                continue
            }

            await fs.mkdir(tierDir, { recursive: true })
            await writeTierVariant({ inputPath, outputPath, width, quality })
            written += 1
        }
    }

    return { written, skipped }
}

async function walk(dir) {
    let totals = { written: 0, skipped: 0, sets: 0 }

    const entries = await fs.readdir(dir, { withFileTypes: true })
    const numericSources = await listNumericSources(dir)

    if (numericSources.length > 0) {
        const result = await processImageSet(dir)
        totals.written += result.written
        totals.skipped += result.skipped
        totals.sets += 1
    }

    for (const entry of entries) {
        if (!entry.isDirectory() || ignoredDirs.has(entry.name)) continue
        const child = path.join(dir, entry.name)
        const childTotals = await walk(child)
        totals.written += childTotals.written
        totals.skipped += childTotals.skipped
        totals.sets += childTotals.sets
    }

    return totals
}

async function main() {
    console.log(
        `Generating responsive WebP tiers (thumb/card/detail)${dryRun ? ' [dry-run]' : ''}${overwrite ? ' [overwrite]' : ''}…`
    )
    const totals = await walk(rootDir)
    console.log(
        `Done. Image sets: ${totals.sets}, files written: ${totals.written}, skipped (already exist): ${totals.skipped}`
    )
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
