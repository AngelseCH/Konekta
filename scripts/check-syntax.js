import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDirectories = ['backend', 'frontend'];
const sourceExtensions = new Set(['.js', '.mjs']);
const files = [];

const collectFiles = (directory) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectFiles(entryPath);
    else if (sourceExtensions.has(path.extname(entry.name))) files.push(entryPath);
  }
};

for (const directory of sourceDirectories) collectFiles(path.join(root, directory));

let hasErrors = false;
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    hasErrors = true;
    process.stderr.write(result.stderr || result.stdout);
  }
}

if (hasErrors) process.exitCode = 1;
else console.log(`Syntax check passed for ${files.length} JavaScript modules.`);
