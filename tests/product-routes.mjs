import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const cases = [
  ['bamboo-poles', 'Bamboo poles'],
  ['bamboo-splits', 'Bamboo splits'],
  ['ski-poles', 'Ski poles'],
  ['woven-mats', 'Woven mats'],
  ['grade-a-banana-silk', 'Grade A: banana silk'],
  ['grade-b-standard-banana-fibre-yarn', 'Grade B: standard banana fibre yarn'],
  ['grade-c-industrial-banana-fibre-yarn', 'Grade C: industrial banana fibre yarn'],
  ['banana-bark', 'Banana bark'],
  ['banana-leaves', 'Banana leaves'],
];

const root = new URL('../', import.meta.url).pathname;
const home = readFileSync(join(root, 'index.html'), 'utf8');
const site = readFileSync(join(root, 'site.js'), 'utf8');
assert.equal((home.match(/class="product"/g) ?? []).length, 9, 'nine catalog links remain');
assert.equal((home.match(/<a[^>]*class="product"/g) ?? []).length, 9, 'all nine product labels are actual links without JS');
for (const [slug, title] of cases) {
  const path = join(root, 'products', slug, 'index.html');
  assert.ok(existsSync(path), 'addressable static page exists: ' + slug);
  const s = readFileSync(path, 'utf8');
  assert.ok(s.includes('<h1>' + title + '</h1>'), slug + ' has correct product heading');
  assert.ok(s.includes('<title>' + title + ' | SB Trading</title>'), slug + ' has a distinct page title');
  assert.match(s, /<meta name="robots" content="noindex,nofollow">/, 'review page is not indexed');
  assert.ok(s.includes('../../index.html?product=' + encodeURIComponent(title) + '#enquire'), slug + ' enquiry preserves the selected product');
  assert.ok(s.includes('../../index.html#explore'), slug + ' has a return path to the main catalogue');
  assert.ok(home.includes('href="products/' + slug + '/"'), slug + ' is linked from the homepage');
  assert.ok(s.includes('../../assets/img/sb-mark.webp'), slug + ' uses supplied logo');
}
assert.match(site, /new URLSearchParams\(location\.search\)/, 'homepage recognizes query parameters');
assert.match(site, /rifat\.setEnquiry\(\{ product: selectedProduct \}\)/, 'returning from detail preselects exact product');
assert.match(site, /\$\$\('\.product'\)\.some\(/, 'query deep-link validation scans the full catalogue, not a single element');
assert.match(site, /e\.preventDefault\(\)/, 'JS quick-view overrides link navigation while available');
for (const slug of ['ski-poles', 'woven-mats', 'banana-bark']) {
  assert.ok(home.includes('href="products/' + slug + '/" class="product" data-img=""'), slug + ' must not show misleading substitute photo in modal');
}
assert.match(home, /id="sheetPhotoUnavailable"/, 'modal has an accessible missing-photo state');
assert.match(site, /photoPending\.hidden = hasPhoto/, 'modal shows provenance-safe missing-photo state');
console.log('Product-route contract: PASS (9 direct pages, no-JS links, enquiry handoff)');
