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

test('the entry page publishes the methodology and a not-financial-advice disclaimer', () => {
  execFileSync(process.execPath, ['scripts/build.mjs'], { cwd: root, stdio: 'pipe' });
  const html = readFileSync(new URL('dist/index.html', root), 'utf8');
  assert.ok(html.includes('id="methodology"'));
  for (const topic of [
    'Mortgage',
    'Principal is not a cost',
    'Nominal or real',
    'Withdrawals',
    'do <strong>not</strong> track',
  ]) {
    assert.ok(html.includes(topic), `methodology covers ${topic}`);
  }
  assert.ok(html.includes('Not financial advice'));
});

test('the mortgage page shows field help only on demand, behind a "?" button', () => {
  const src = readFileSync(new URL('site/mortgage-app.js', root), 'utf8');
  assert.ok(src.includes("hint.className = 'hint'"));
  assert.ok(!src.includes("'hint-text open'"), 'help text starts closed');
});

test('the mortgage page explains ARM terms and how ARMs work', () => {
  const html = readFileSync(new URL('site/mortgage.html', root), 'utf8');
  assert.ok(html.includes('id="arm-guide"') && html.includes('id="arm-basics"'));
  for (const term of [
    'Index',
    'Margin',
    'Initial adjustment cap',
    'Periodic (subsequent) adjustment cap',
    'Lifetime cap',
    'Floor',
    'Payment shock',
    'Who an ARM may suit',
  ]) {
    assert.ok(html.includes(term), `ARM education covers ${term}`);
  }
});
