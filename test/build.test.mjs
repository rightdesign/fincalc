import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('..', import.meta.url);

test('the build writes the site entry page into dist/', () => {
  execFileSync(process.execPath, ['scripts/build.mjs'], { cwd: root, stdio: 'pipe' });
  assert.ok(existsSync(new URL('dist/index.html', root)));
});
