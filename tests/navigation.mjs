import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const nav = html.match(/<nav class="nav" id="mainNav"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
assert.ok(nav, 'main navigation exists');
const links = [...nav.matchAll(/<a href="#([^"]+)">([^<]+)<\/a>/g)].map(m => ({ destination: m[1], label: m[2].trim() }));
assert.deepEqual(links, [
  { destination: 'about', label: 'About Us' },
  { destination: 'explore', label: 'Products' },
  { destination: 'contact', label: 'Contact Us' }
], 'main navigation preserves client-specified three destinations');
for (const { destination } of links) {
  assert.match(html, new RegExp('<section[^>]*\\bid="' + destination + '"'), '#' + destination + ' points to a real section');
}
assert.match(html, /<h2 id="h-about"/, 'About Us has an accessible heading');
assert.match(html, /<section[^>]*id="contact"[\s\S]*?<\/section>/, 'Contact Us has its own distinct contact section');
assert.match(html, /<a[^>]*href="https:\/\/wa\.me\/8801878707910"/, 'confirmed SB Trading WhatsApp remains directly accessible');
for (const element of ['id="film"', 'id="explore"', 'id="enquire"', 'id="rifat"', 'id="soundToggle"', 'id="productSheet"']) assert.ok(html.includes(element), element + ' remains');
console.log('Navigation contract: PASS');
