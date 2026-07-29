// Copies the static site into www/, the folder Capacitor wraps into the native
// app shell. Excludes api/ (Vercel-only, not part of the app bundle) and anything
// containing secrets (.env*, node_modules, .git).
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'www');

const includes = [
  'index.html',
  'offline.html',
  'manifest.json',
  'sw.js',
  'icons',
  'delicate-skin-and-care_assets',
];

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const name of includes) {
  const src = path.join(root, name);
  if (!fs.existsSync(src)) continue;
  fs.cpSync(src, path.join(outDir, name), { recursive: true });
}

console.log(`Copied ${includes.length} entries into www/`);
