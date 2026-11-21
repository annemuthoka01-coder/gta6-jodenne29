// ============================================================================
// Cielo Heat - Production Build Script (main.ts)
// Packages game assets, validates bounty caps, and generates dossier.json.
// ============================================================================

import { existsSync, mkdirSync, readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const MAX_SCREENSHOTS = 4;
const MAX_SCREENSHOT_BYTES = 262144;
const MAX_GAME_FILES = 993;
const MAX_GAME_BYTES = 50331648;
const MAX_PATH_BYTES = 1000;

function listRecursive(dir: string, base: string = dir): string[] {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listRecursive(full, base));
    } else if (entry.isFile()) {
      files.push(relative(base, full).replace(/\\/g, '/'));
    }
  }
  return files.sort();
}

function copyDirFiles(srcDir: string, outDir: string): { count: number; bytes: number; paths: string[] } {
  if (!existsSync(srcDir)) return { count: 0, bytes: 0, paths: [] };
  const relPaths = listRecursive(srcDir);
  let totalBytes = 0;
  for (const rel of relPaths) {
    const srcPath = join(srcDir, rel);
    const destPath = join(outDir, rel);
    const pathBytes = Buffer.byteLength(rel, 'utf8');
    if (pathBytes > MAX_PATH_BYTES) {
      throw new Error(`Path length ${pathBytes} bytes exceeds maximum ${MAX_PATH_BYTES}: ${rel}`);
    }
    const stats = statSync(srcPath);
    const destDir = join(outDir, relative(outDir, destPath), '..');
    mkdirSync(destDir, { recursive: true });
    const content = readFileSync(srcPath);
    writeFileSync(destPath, content);
    const writtenStats = statSync(destPath);
    if (writtenStats.size !== stats.size) {
      throw new Error(`Size mismatch copying ${rel}: source ${stats.size} != written ${writtenStats.size}`);
    }
    totalBytes += stats.size;
  }
  return { count: relPaths.length, bytes: totalBytes, paths: relPaths };
}

function main() {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
  const repoDir = fileURLToPath(new URL('.', import.meta.url));

  const screenshotsDir = join(repoDir, 'screenshots');
  if (existsSync(screenshotsDir)) {
    const shotFiles = listRecursive(screenshotsDir);
    if (shotFiles.length > MAX_SCREENSHOTS) {
      throw new Error(`Too many screenshots: ${shotFiles.length} (max ${MAX_SCREENSHOTS})`);
    }
    for (const f of shotFiles) {
      const size = statSync(join(screenshotsDir, f)).size;
      if (size > MAX_SCREENSHOT_BYTES) {
        throw new Error(`Screenshot ${f} size ${size} exceeds max ${MAX_SCREENSHOT_BYTES}`);
      }
    }
  }

  const gameDir = join(repoDir, 'game');
  const gameFiles = listRecursive(gameDir);
  if (gameFiles.length > MAX_GAME_FILES) {
    throw new Error(`Too many game files: ${gameFiles.length} (max ${MAX_GAME_FILES})`);
  }
  for (const f of gameFiles) {
    const pathBytes = Buffer.byteLength(f, 'utf8');
    if (pathBytes > MAX_PATH_BYTES) {
      throw new Error(`Game file path length ${pathBytes} exceeds max ${MAX_PATH_BYTES}: ${f}`);
    }
  }

  mkdirSync(outDir, { recursive: true });
  const gameResult = copyDirFiles(gameDir, join(outDir, 'game'));
  if (gameResult.bytes > MAX_GAME_BYTES) {
    throw new Error(`Total game bytes ${gameResult.bytes} exceeds max ${MAX_GAME_BYTES}`);
  }

  let screenshotCount = 0;
  if (existsSync(screenshotsDir)) {
    const shotResult = copyDirFiles(screenshotsDir, join(outDir, 'screenshots'));
    screenshotCount = shotResult.count;
  }

  const dossierOptions = {
    text_max_bytes: 163840,
    screenshots: { max: MAX_SCREENSHOTS, max_bytes: MAX_SCREENSHOT_BYTES },
    game_max_files: MAX_GAME_FILES,
    game_max_bytes: MAX_GAME_BYTES,
    game_path_max_bytes: MAX_PATH_BYTES
  };

  const dossierJson = buildDossier(outDir, dossierOptions);
  const dossierPath = join(outDir, 'dossier.json');
  writeFileSync(dossierPath, dossierJson, 'utf8');
  const dossierSize = statSync(dossierPath).size;

  console.log(`Cielo Heat build complete:`);
  console.log(`- Game files: ${gameResult.count}`);
  console.log(`- Game bytes: ${gameResult.bytes}`);
  console.log(`- Screenshots: ${screenshotCount}`);
  console.log(`- Dossier size: ${dossierSize} bytes`);
}

main();
