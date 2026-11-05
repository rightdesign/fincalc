import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('..', import.meta.url);

test('the build writes the site entry page into dist/', () => {
  execFileSync(process.execPath, ['scripts/build.mjs'], { cwd: root, stdio: 'pipe' });
  assert.ok(existsSync(new URL('dist/index.html', root)));
});

test('the entry page links the stylesheet and script, and both are built', () => {
  execFileSync(process.execPath, ['scripts/build.mjs'], { cwd: root, stdio: 'pipe' });
  const html = readFileSync(new URL('dist/index.html', root), 'utf8');
  for (const asset of ['styles.css', 'app.js']) {
    assert.ok(html.includes(asset), `index.html references ${asset}`);
    assert.ok(existsSync(new URL(`dist/${asset}`, root)), `dist/${asset} exists`);
  }
  assert.ok(html.includes('id="calculator"'));
});
