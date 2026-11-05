// Builds the static site: site/ is copied to dist/ as is. dist/ is what the
// Pages workflow uploads.
import { cpSync, rmSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const dist = new URL('dist/', root);

rmSync(dist, { recursive: true, force: true });
cpSync(new URL('site/', root), dist, { recursive: true });
console.log('built site/ into dist/');
