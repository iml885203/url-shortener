// Verify the installed snapshot locally. No upstream repository access is needed.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const receipt = JSON.parse(await readFile(resolve(root, 'ui-source.json'), 'utf8'));
if (receipt.schemaVersion !== 1) throw new Error('Unsupported UI receipt version');
for (const [unit, value] of Object.entries(receipt.units)) {
  if (!/^neutral-ui-[a-f0-9]{16}$/.test(value.snapshot)) throw new Error('Invalid snapshot');
  for (const [name, expected] of Object.entries(value.files)) {
    const path = resolve(root, name);
    if (!path.startsWith(root + sep)) throw new Error('Invalid receipt path');
    const actual = createHash('sha256').update(await readFile(path)).digest('hex');
    if (actual !== expected) throw new Error(`${name}: differs from the recorded snapshot; review before accepting a new baseline`);
  }
  console.log(`${unit}: ${value.snapshot} verified`);
}
