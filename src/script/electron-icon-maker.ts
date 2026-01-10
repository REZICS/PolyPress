#!/usr/bin/env node

/**
 * Icon generation CLI for Electron
 *
 * Modify from https://github.com/jaretburkett/electron-icon-maker
 */

import path from 'path';
import fs from 'fs/promises';
import {existsSync} from 'fs';
import sharp from 'sharp';
import args from 'args';
import icongen from 'icon-gen';

/**
 * Supported PNG icon sizes
 */
const PNG_SIZES = [16, 24, 32, 48, 64, 128, 256, 512, 1024] as const;

type PngSize = (typeof PNG_SIZES)[number];

/**
 * CLI flags definition
 */
args
  .option('input', 'Input PNG file. Recommended (1024x1024)', './icon.png')
  .option('output', 'Folder to output icons', './');

interface CliFlags {
  input: string;
  output: string;
}

/**
 * Resolve output directories
 */
function resolveDirs(output: string, name: string = '') {
  const base = output.endsWith(path.sep) ? output : output + path.sep;
  const iconsDir = path.join(base, 'icons', name);
  return {
    base,
    iconsDir,
    pngDir: path.join(iconsDir, 'png'),
    macDir: path.join(iconsDir, 'mac'),
    winDir: path.join(iconsDir, 'win'),
  };
}

/**
 * Ensure directory exists
 */
async function ensureDir(dir: string): Promise<void> {
  if (!existsSync(dir)) {
    await fs.mkdir(dir, {recursive: true});
  }
}

async function isDirectory(targetPath: string): Promise<boolean> {
  const st = await fs.stat(targetPath);
  return st.isDirectory();
}

function isPicFile(fileName: string): boolean {
  return (
    fileName.toLowerCase().endsWith('.png') ||
    fileName.toLowerCase().endsWith('.svg')
  );
}

async function listPngFilesInDir(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, {withFileTypes: true});
  return entries
    .filter(e => e.isFile() && isPicFile(e.name))
    .map(e => path.join(dir, e.name));
}

/**
 * Create a resized PNG
 */
async function createPNG(
  input: string,
  outputDir: string,
  size: PngSize,
): Promise<void> {
  const fileName = path.join(outputDir, `${size}`);
  const file = `${fileName}.png`;
  await sharp(input).resize({width: size, height: size}).toFile(file);
  console.log(`Created ${file}`);
}

/**
 * Generate all PNG sizes
 */
async function generatePNGs(input: string, pngDir: string): Promise<void> {
  await ensureDir(pngDir);
  for (const size of PNG_SIZES) {
    await createPNG(input, pngDir, size);
  }
}

/**
 * Generate macOS and Windows icons
 */
async function generatePlatformIcons(
  pngDir: string,
  macDir: string,
  winDir: string,
): Promise<void> {
  await ensureDir(macDir);
  await ensureDir(winDir);

  await icongen(pngDir, macDir, {
    report: true,
    icns: {
      name: 'icon',
      sizes: [16, 32, 64, 128, 256, 512, 1024],
    },
  });

  await icongen(pngDir, winDir, {
    report: true,
    ico: {
      name: 'icon',
      sizes: [16, 24, 32, 48, 64, 128, 256],
    },
  });
}

/**
 * Rename PNGs to Electron format (NxN.png)
 */
async function renamePNGs(pngDir: string): Promise<void> {
  for (const size of PNG_SIZES) {
    const from = path.join(pngDir, `${size}.png`);
    const to = path.join(pngDir, `${size}x${size}.png`);
    await fs.rename(from, to);
    console.log(`Renamed ${size}.png → ${size}x${size}.png`);
  }
}

async function worker(input: string, dirs: ReturnType<typeof resolveDirs>) {
  const {iconsDir, pngDir, macDir, winDir} = dirs;
  await ensureDir(iconsDir);

  console.log('Generating PNG icons…');
  await generatePNGs(input, pngDir);

  console.log('Generating platform icons…');
  await generatePlatformIcons(pngDir, macDir, winDir);

  console.log('Renaming PNGs for Electron…');
  await renamePNGs(pngDir);
}

async function generateOne(
  inputPng: string,
  output: string,
  name: string = '',
): Promise<void> {
  const dirs = resolveDirs(output, name);
  await worker(inputPng, dirs);
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const flags = args.parse(process.argv) as CliFlags;

  const input = path.resolve(process.cwd(), flags.input);
  const output = path.resolve(process.cwd(), flags.output);

  if (await isDirectory(input)) {
    const picFiles = await listPngFilesInDir(input);
    if (picFiles.length === 0) {
      throw new Error(`No .png or .svg files found in directory: ${input}`);
    }

    for (const picFile of picFiles) {
      const name = path.basename(picFile, path.extname(picFile));
      console.log(`\n=== ${name} ===`);
      // folder logic: output adds a name folder: output/icons/<name>/...
      await generateOne(picFile, output, name);
    }
  } else {
    // If input is a file, behave like single (no name folder)
    await generateOne(input, output);
  }

  console.log('\nALL DONE');
}

/**
 * Run
 */
main().catch(err => {
  console.error(err);
  process.exit(1);
});
