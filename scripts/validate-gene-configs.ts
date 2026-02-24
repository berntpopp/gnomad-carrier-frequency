/**
 * Gene config validation script — validates all JSON files in configs/genes/
 * against GeneConfigSchema from packages/core/src/gene-config/schema.ts.
 *
 * Usage: bun scripts/validate-gene-configs.ts
 *
 * Exits 0 if all configs are valid, exits 1 if any fail validation.
 * Bun runs TypeScript natively — no build step required.
 */

import { readdir, readFile } from 'fs/promises'
import { join, basename, extname } from 'path'
import { GeneConfigSchema } from '../packages/core/src/gene-config/schema.ts'

const configsDir = join(import.meta.dir, '../configs/genes')

async function main(): Promise<void> {
  let files: string[]
  try {
    files = await readdir(configsDir)
  } catch {
    console.error(`Could not read configs directory: ${configsDir}`)
    process.exit(1)
  }

  const jsonFiles = files.filter((f) => extname(f).toLowerCase() === '.json')

  if (jsonFiles.length === 0) {
    console.log('No JSON files found in configs/genes/ — nothing to validate.')
    process.exit(0)
  }

  let hasErrors = false

  for (const filename of jsonFiles.sort()) {
    const filepath = join(configsDir, filename)
    const fileBase = basename(filename, '.json')

    // Parse JSON
    let raw: unknown
    try {
      const content = await readFile(filepath, 'utf-8')
      raw = JSON.parse(content)
    } catch (err) {
      console.error(`FAIL: ${filename}`)
      console.error(`  [parse error] ${err instanceof Error ? err.message : String(err)}`)
      hasErrors = true
      continue
    }

    // Validate against schema
    const result = GeneConfigSchema.safeParse(raw)

    if (!result.success) {
      console.error(`FAIL: ${filename}`)
      for (const issue of result.error.issues) {
        const path = issue.path.length > 0 ? issue.path.join('.') : '(root)'
        console.error(`  [${path}] ${issue.message}`)
      }
      hasErrors = true
      continue
    }

    const config = result.data
    const profileCount = config.profiles.length
    const defaultProfile = config.profiles.find((p) => p.isDefault)
    const defaultName = defaultProfile?.displayName ?? '(unknown)'

    // Validate filename convention: filename should match geneSymbol
    if (fileBase.toUpperCase() !== config.geneSymbol.toUpperCase()) {
      console.warn(
        `WARNING: ${filename} — filename "${fileBase}" does not match geneSymbol "${config.geneSymbol}"`,
      )
    }

    console.log(`OK: ${filename} - ${profileCount} profile(s), default: "${defaultName}"`)
  }

  if (hasErrors) {
    console.error(`\nValidation failed. Fix the errors above and re-run.`)
    process.exit(1)
  } else {
    console.log('\nAll gene configs valid.')
  }
}

main()
