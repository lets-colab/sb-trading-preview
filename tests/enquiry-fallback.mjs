// Regression gate: no-JavaScript users must never submit personal details via query string.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const rifat = readFileSync(new URL('../assets/rifat.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const form = html.match(/<form\s+class="form"\s+id="enquiryForm"[^>]*>/)?.[0] || '';
assert.ok(form, 'plain enquiry form exists');
assert.match(form, /\bmethod="post"/, 'form never falls back to GET when scripting is unavailable');
assert.match(form, /\baction="#enquire"/, 'form has explicit, non-external submit target');
const noScriptStyle = html.match(/<noscript><style>([\s\S]*?)<\/style><\/noscript>/)?.[1] || '';
assert.match(noScriptStyle, /#enquiryForm/, 'no-JS fallback suppresses a non-operational form');
const fallback = html.match(/<noscript><p class="lede no-js-enquiry">([\s\S]*?)<\/p><\/noscript>/)?.[1] || '';
assert.match(fallback, /https:\/\/wa\.me\/8801878707910/, 'no-JS buyer has working direct contact route');
assert.doesNotMatch(fallback, /form (works|can be sent|is available)/i, 'no fabricated no-JS form delivery claim');
const hero = html.match(/<div class="beat beat-hero"[\\s\\S]*?<p class="lede">([^<]+)<\\/p>/)?.[1] || '';
for (const family of ['Bamboo', 'banana fibre yarn', 'banana bark and leaves']) {
  assert.ok(hero.toLowerCase().includes(family.toLowerCase()), 'hero identifies product family: ' + family);
}
assert.match(html, /<div class="hero-actions">\s*<a[^>]*href="#explore"/, 'first-viewport hero has a direct Products shortcut');
assert.match(css, /\.hero-actions\s*\{/, 'fast path has explicit visible layout');
assert.match(html, /id="rifatAiTag"[^>]*\bhidden\b/, 'AI badge is not shown until runtime confirmation');
assert.match(rifat, /rifatAiTag/, 'AI badge updates when actual mode changes');
console.log('No-JS enquiry privacy and direct-buyer-path contract: PASS');
