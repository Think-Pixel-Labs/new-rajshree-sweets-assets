#!/usr/bin/env node

const fs = require('fs/promises')
const path = require('path')
const sharp = require('sharp')

const rootDir = __dirname
const ignoredDirs = new Set(['.git', 'node_modules'])
const numericJpgPattern = /^\d+\.jpe?g$/i

const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run')
const qualityArg = process.argv.find((arg) => arg.startsWith('--quality='))
const quality = qualityArg ? Number(qualityArg.split('=')[1]) : 82

if (!Number.isInteger(quality) || quality < 1 || quality > 100) {
    console.error('Invalid --quality value. Use an integer from 1 to 100.')
    process.exit(1)
}

async function pathExists(filePath) {
    try {
        await fs.access(filePath)
        return true
    } catch {
        return false
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

        if (!(await pathExists(outputPath))) {
            jobs.push({ inputPath: entryPath, outputPath })
        }
    }

    return jobs
}

async function main() {
    const jobs = await findMissingWebpJobs(rootDir)

    if (jobs.length === 0) {
        console.log('All numeric JPG images already have matching WebP files.')
        return
    }

    console.log(
        `${dryRun ? 'Would create' : 'Creating'} ${jobs.length} WebP file${jobs.length === 1 ? '' : 's'} at quality ${quality}.`
    )

    for (const { inputPath, outputPath } of jobs) {
        const relativeInput = path.relative(rootDir, inputPath)
        const relativeOutput = path.relative(rootDir, outputPath)

        if (dryRun) {
            console.log(`${relativeInput} -> ${relativeOutput}`)
            continue
        }

        await sharp(inputPath).rotate().webp({ quality, effort: 5 }).toFile(outputPath)
        console.log(`${relativeInput} -> ${relativeOutput}`)
    }
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
