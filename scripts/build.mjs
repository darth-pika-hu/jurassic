import { build } from 'esbuild';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.resolve(projectRoot, 'static/js/dist');

const entries = [
  { input: path.resolve(projectRoot, 'src/jurassicSystems/index.js'), name: 'jurassicSystems' },
  { input: path.resolve(projectRoot, 'src/theKing/index.js'), name: 'theKing' },
];

const variants = [
  { format: 'esm', target: 'es2020', suffix: 'modern' },
  { format: 'iife', target: 'es2018', suffix: 'legacy' },
];

async function ensureDir(directory) {
  await fs.mkdir(directory, { recursive: true });
}

function withHash(filename, contents) {
  const hash = createHash('sha256').update(contents).digest('hex').slice(0, 8);
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  return `${base}.${hash}${ext}`;
}

async function writeFile(filePath, contents) {
  await fs.writeFile(filePath, contents, 'utf8');
}

async function run() {
  await ensureDir(distDir);
  const manifest = {};

  for (const entry of entries) {
    for (const variant of variants) {
      const result = await build({
        entryPoints: [entry.input],
        bundle: true,
        minify: true,
        target: variant.target,
        format: variant.format,
        platform: 'browser',
        sourcemap: false,
        write: false,
        legalComments: 'none',
        logLevel: 'info',
      });

      const outputFile = result.outputFiles[0];
      const hashedName = withHash(`${entry.name}.${variant.suffix}.js`, outputFile.text);
      const destination = path.join(distDir, hashedName);
      await writeFile(destination, outputFile.text);
      manifest[`${entry.name}.${variant.suffix}`] = `/js/dist/${hashedName}`;
    }
  }

  await writeFile(
    path.join(distDir, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
