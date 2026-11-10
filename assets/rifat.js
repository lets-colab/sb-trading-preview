// Rifat: SB Trading's enquiry assistant on the page.
// Two modes share one conversation, one enquiry ("Your enquiry") and one WhatsApp hand-off:
//   ai    - when /api/rifat reports an API key (Cloudflare Pages Function -> Claude), Rifat answers in its own words
//           and the function returns the enquiry fields it recorded.
//   guide - otherwise (no key, local preview, network error): a step-by-step guide, labelled as such.
// Nothing is sent anywhere until the buyer presses "Send on WhatsApp", which opens WhatsApp with the text filled in.
export const PRODUCTS = [
  'Bamboo poles', 'Bamboo splits', 'Ski poles', 'Woven mats',
  'Grade A: banana silk', 'Grade B: standard banana fibre yarn', 'Grade C: industrial banana fibre yarn',
  'Banana bark', 'Banana leaves', 'Not sure yet',
];
const LABELS = { product: 'Product', quantity: 'Quantity', country: 'Deliver to', name: 'Name', email: 'Email', company: 'Company', notes: 'Requirements' };
const REQUIRED = ['product', 'country', 'name', 'email'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const STEPS = [
  { key: 'product', ask: 'Which product are you interested in?', chips: PRODUCTS },
  { key: 'quantity', ask: 'Roughly how much do you need? For example “5 tonnes” or “one 40 ft container”.', chips: ['One 20 ft container', 'One 40 ft container', 'Samples first', 'Not sure yet'] },
  { key: 'country', ask: 'Which country should it be delivered to?' },
  { key: 'name', ask: 'Thank you. What is your name?' },
  { key: 'email', ask: 'And your business email, so SB Trading’s team can reply with the quotation?' },
  { key: 'company', ask: 'Which company are you buying for?', chips: ['Skip'] },
  { key: 'notes', ask: 'Anything else the team should know? Sizes, grade, packing or a delivery date.', chips: ['Nothing else'] },
];
const TEAM_ONLY = /\b(price|prices|cost|rate|quote|moq|minimum|lead ?time|deliver(y)? time|ship|shipping|incoterm|fob|cif|certif|stock|available|availability|origin|port)\b/i;

export function matchProduct(text) {
  const t = text.toLowerCase();
  const exact = PRODUCTS.find((p) => p.toLowerCase() === t);
  if (exact) return exact;
  if (/not sure|unsure|don.?t know/.test(t)) return 'Not sure yet';
  if (/ski/.test(t)) return 'Ski poles';
  if (/mat/.test(t)) return 'Woven mats';
  if (/split/.test(t)) return 'Bamboo splits';
  if (/pole|bamboo/.test(t)) return 'Bamboo poles';
  if (/silk|grade ?a\b/.test(t)) return 'Grade A: banana silk';
  if (/industrial|grade ?c\b/.test(t)) return 'Grade C: industrial banana fibre yarn';
  if (/standard|grade ?b\b|yarn|fib(re|er)/.test(t)) return 'Grade B: standard banana fibre yarn';
  if (/bark/.test(t)) return 'Banana bark';
  if (/lea(f|ves)/.test(t)) return 'Banana leaves';
  return null;
}
export function parseQuantity(text) {
  const t = text.toLowerCase().replace(/,/g, '');
  const words = { one: 1, a: 1, an: 1, two: 2, three: 3, four: 4, five: 5, ten: 10 };
  const m = t.match(/(\d+(?:\.\d+)?|\b(?:one|a|an|two|three|four|five|ten)\b)\s*(?:x\s*)?([a-z0-9 ]*)/);
  if (!m) return null;
  const n = Number.isNaN(Number(m[1])) ? words[m[1]] : Number(m[1]);
  if (!(n > 0)) return null;
  const rest = m[2] || '';
  let unit = null;
  if (/40/.test(rest) && /container|ft|feet|hc/.test(rest)) unit = '40 ft containers';
  else if (/20/.test(rest) && /container|ft|feet/.test(rest)) unit = '20 ft containers';
  else if (/container/.test(rest)) unit = '40 ft containers';
  else if (/^\s*(t|ton|tons|tonne|tonnes|mt)\b/.test(rest)) unit = 'tonnes';
  else if (/^\s*(kg|kgs|kilo)/.test(rest)) unit = 'kg';
  else if (/^\s*(pc|pcs|piece|pieces|units?|bundles?)/.test(rest)) unit = 'pieces';
  return unit ? { quantity: n, unit } : null;
}
export function quantityText(e) {
  if (e.quantity) return `${e.quantity} ${e.unit || ''}`.trim();
  return e.quantityText || '';
}
export function summaryText(e) {
  const lines = ['Quotation enquiry for SB Trading (prepared with Rifat on the website)'];
  for (const k of Object.keys(LABELS)) {
    const v = k === 'quantity' ? quantityText(e) : e[k];
    if (v) lines.push(`${LABELS[k]}: ${v}`);
  }
  return lines.join('\n');
}
const isReady = (e) => REQUIRED.every((k) => e[k]);

export function createRifat({ root, whatsapp = '', cue = () => {}, reduced = false, endpoint = 'api/rifat' }) {
  const $ = (s) => root.querySelector(s);
  const log = $('#rifatLog'), chips = $('#rifatChips'), form = $('#rifatForm'), input = $('#rifatInput');
  const modeLabel = $('#rifatMode'), list = $('#ticketList'), wa = $('#waSend'), copyBtn = $('#copyEnquiry'), note = $('#ticketNote');
  const number = String(whatsapp).replace(/\D/g, '');
  let mode = 'guide', enquiry = {}, skipped = new Set(), history = [], busy = false, changing = null, started = false;

  // ---------------------------------------------------------------- rendering
  function renderTicket(changed = []) {
    list.replaceChildren();
    for (const [k, label] of Object.entries(LABELS)) {
      const v = k === 'quantity' ? quantityText(enquiry) : enquiry[k];
      const dt = document.createElement('dt'); dt.textContent = label;
      const dd = document.createElement('dd');
      dd.textContent = v || (REQUIRED.includes(k) ? 'needed' : 'optional');
      if (!v) dd.className = 'empty';
      if (v && changed.includes(k)) dd.classList.add('new');
      list.append(dt, dd);
    }
    const ready = isReady(enquiry);
    const canSend = ready && number;
    wa.setAttribute('aria-disabled', String(!canSend));
    wa.href = canSend ? `https://wa.me/${number}?text=${encodeURIComponent(summaryText(enquiry))}` : '#enquire';
    if (canSend) { wa.target = '_blank'; wa.rel = 'noopener'; } else { wa.removeAttribute('target'); }
  }
  function say(text, who = 'r') {
    const el = document.createElement('p');
    el.className = `msg ${who}`;
    el.textContent = text;
    log.append(el);
    log.scrollTop = log.scrollHeight;
    if (who === 'r') cue('reply', el);
    return el;
  }
  function typing(on) {
    let el = log.querySelector('.typing');
    if (on && !el) { el = document.createElement('p'); el.className = 'msg r typing'; el.setAttribute('aria-label', 'Rifat is typing'); el.innerHTML = '<i></i><i></i><i></i>'; log.append(el); log.scrollTop = log.scrollHeight; }
    if (!on && el) el.remove();
    if (on) root.setAttribute('data-busy', ''); else root.removeAttribute('data-busy');
  }
  function offer(list) {
    chips.replaceChildren(...(list || []).map((label) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = label;
      b.addEventListener('click', () => submit(label));
      return b;
    }));
  }
  const pause = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));
  async function rifatSays(text, chipList) {
    typing(true);
    await pause(Math.min(1100, 380 + text.length * 6));
    typing(false);
    say(text);
    offer(chipList);
  }
  function merge(fields) {
    const changed = [];
    for (const [k, v] of Object.entries(fields)) {
      if (v === undefined || v === null || v === '') continue;
      if (enquiry[k] !== v) { enquiry[k] = v; changed.push(k); }
    }
    if (changed.includes('quantity')) delete enquiry.quantityText;
    if (changed.length) { renderTicket(changed); cue('tick', list); }
    return changed;
  }

  // ---------------------------------------------------------------- guided mode
  const nextStep = () => STEPS.find((s) => !(s.key === 'quantity' ? quantityText(enquiry) : enquiry[s.key]) && !skipped.has(s.key));
  async function askNext(prefix = '') {
    const step = changing ? STEPS.find((s) => s.key === changing) : nextStep();
    if (!step) {
      const text = number
        ? 'Your enquiry is ready. Check it under “Your enquiry”, then send it to SB Trading’s team on WhatsApp, or copy it.'
        : 'Your enquiry is ready. Check it under “Your enquiry”. SB Trading’s WhatsApp number is added once confirmed; until then, copy the enquiry.';
      return rifatSays(prefix + text, [number ? 'Send on WhatsApp' : 'Copy enquiry', 'Change something']);
    }
    return rifatSays(prefix + step.ask, step.chips);
  }
  function answerStep(key, text) {
    const t = text.trim();
    if (key === 'product') { const p = matchProduct(t); return p ? { product: p } : null; }
    if (key === 'quantity') {
      if (/^one 20 ft container$/i.test(t)) return { quantity: 1, unit: '20 ft containers' };
      if (/^one 40 ft container$/i.test(t)) return { quantity: 1, unit: '40 ft containers' };
      if (/samples/i.test(t)) return { quantityText: 'Samples first' };
      if (/not sure/i.test(t)) return { skip: true };
      return parseQuantity(t) || { quantityText: t.slice(0, 80) };
    }
    if (key === 'email') return EMAIL.test(t) ? { email: t } : null;
    if (key === 'company' && /^skip$/i.test(t)) return { skip: true };
    if (key === 'notes' && /^(nothing( else)?|no|none)$/i.test(t)) return { skip: true };
    return { [key]: t.slice(0, key === 'notes' ? 600 : 120) };
  }
  async function guide(text) {
    if (/^send on whatsapp$/i.test(text)) { if (number && isReady(enquiry)) { wa.click(); return rifatSays('WhatsApp is opening with your enquiry filled in. Send it there, and SB Trading’s team replies on WhatsApp.'); } }
    if (/^copy enquiry$/i.test(text)) { await copy(); return rifatSays('Copied. Paste it into an email or message to SB Trading.', ['Change something']); }
    if (/^change something$/i.test(text)) { changing = null; return rifatSays('What would you like to change?', Object.values(LABELS)); }
    const labelKey = Object.keys(LABELS).find((k) => LABELS[k].toLowerCase() === text.toLowerCase());
    if (labelKey && !nextStep() && !changing) { changing = labelKey; skipped.delete(labelKey); return askNext(); }

    const step = changing ? STEPS.find((s) => s.key === changing) : nextStep();
    if (!step) return askNext();
    if (TEAM_ONLY.test(text) && /\?|^(what|how|can|do|is|are)\b/i.test(text)) {
      return askNext('SB Trading’s team confirms prices, minimum orders, shipping, lead times and certifications with the quotation, so I can’t answer that myself. I can make sure your question reaches them. ');
    }
    const got = answerStep(step.key, text);
    if (!got) {
      if (step.key === 'email') return rifatSays('That doesn’t look like an email address. Could you check it? For example name@company.com.');
      return rifatSays('I didn’t catch which product. Choose one below, or “Not sure yet”.', step.chips);
    }
    if (got.skip) skipped.add(step.key);
    else if (got.quantityText) { delete enquiry.quantity; delete enquiry.unit; enquiry.quantityText = got.quantityText; renderTicket(['quantity']); cue('tick', list); }
    else merge(got);
    changing = null;
    return askNext();
  }

  // ---------------------------------------------------------------- AI mode
  async function ai(text) {
    history.push({ role: 'user', text });
    typing(true);
    try {
      const res = await fetch(endpoint, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: history.slice(-24), enquiry }),
      });
      if (!res.ok) throw new Error(`Rifat ${res.status}`);
      const data = await res.json();
      typing(false);
      merge(data.enquiry || {});
      history.push({ role: 'assistant', text: data.reply });
      say(data.reply);
      offer(data.ready ? [number ? 'Send on WhatsApp' : 'Copy enquiry'] : []);
    } catch (e) {
      typing(false);
      history.pop();
      setMode('guide');
      await askNext('I’ve lost my connection to the AI service, so I’ll continue as a guided enquiry. ');
    }
  }

  // ---------------------------------------------------------------- input
  async function submit(raw) {
    const text = String(raw).trim();
    if (!text || busy) return;
    busy = true;
    offer([]);
    say(text, 'u');
    cue('send', form);
    try {
      if (mode === 'ai' && !/^(send on whatsapp|copy enquiry)$/i.test(text)) await ai(text);
      else await guide(text);
    } finally { busy = false; }
  }
  form.addEventListener('submit', (e) => { e.preventDefault(); const v = input.value; input.value = ''; submit(v); });
  wa.addEventListener('click', (e) => {
    if (wa.getAttribute('aria-disabled') === 'true') {
      e.preventDefault();
      note.textContent = !isReady(enquiry)
        ? 'Rifat needs the product, destination country, your name and email first.'
        : 'SB Trading’s WhatsApp number is added once confirmed. Until then, copy the enquiry.';
    } else cue('send', wa);
  });
  async function copy() {
    const text = summaryText(enquiry);
    try { await navigator.clipboard.writeText(text); note.textContent = 'Enquiry copied.'; }
    catch (e) { // clipboard blocked: select the text so the buyer can copy it by hand
      const area = document.createElement('textarea'); area.value = text; area.setAttribute('aria-label', 'Enquiry text'); area.rows = 8;
      note.replaceChildren(area); area.select();
    }
    cue('tick', copyBtn);
  }
  copyBtn.addEventListener('click', copy);
  $('#rifatRestart').addEventListener('click', () => { enquiry = {}; skipped = new Set(); history = []; changing = null; log.replaceChildren(); note.textContent = ''; renderTicket(); greet(); });

  // ---------------------------------------------------------------- start
  function setMode(m) {
    mode = m;
    root.dataset.mode = m;
    modeLabel.textContent = m === 'ai' ? 'AI assistant · online' : 'Guided mode · AI not connected yet';
  }
  async function greet() {
    if (mode === 'ai') {
      return rifatSays('Hello, I’m Rifat, SB Trading’s AI assistant. Ask me about the bamboo, banana fibre yarn or banana bark and leaves, or tell me what you need and I’ll prepare your enquiry. Prices, stock and lead times come from SB Trading’s team.',
        ['What do you supply?', 'I need a quotation']);
    }
    return askNext('Hello, I’m Rifat. On this preview the AI is not connected yet, so I’ll guide you through a few questions and prepare your enquiry for SB Trading’s team. ');
  }
  async function start() {
    if (started) return;
    started = true;
    try {
      const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 2500);
      const res = await fetch(endpoint, { signal: ctrl.signal }); clearTimeout(t);
      const data = res.ok && /json/.test(res.headers.get('content-type') || '') ? await res.json() : null;
      setMode(data?.ai ? 'ai' : 'guide');
    } catch (e) { setMode('guide'); } // no function on this host (local preview): guided mode
    await greet();
  }
  setMode('guide');
  renderTicket();
  // Rifat starts when the section approaches, so the greeting is seen, not missed.
  new IntersectionObserver((entries, obs) => { if (entries.some((e) => e.isIntersecting)) { obs.disconnect(); start(); } }, { rootMargin: '0px 0px 30% 0px' }).observe(root);

  return {
    async askAbout(product) {
      const p = matchProduct(product) || null;
      if (p) merge({ product: p });
      if (!started) return start(); // the greeting carries on from the next missing detail
      await pause(600);
      if (mode === 'ai') return rifatSays(`You were looking at ${product}. I’ve added it to your enquiry. What would you like to know, or how much do you need?`);
      return askNext(`You were looking at ${product}. I’ve added it to your enquiry. `);
    },
    setEnquiry(fields) {
      const { quantity, unit, ...rest } = fields;
      merge(quantity ? { ...rest, quantity, unit } : rest);
      note.textContent = number ? '' : 'SB Trading’s WhatsApp number is added once confirmed. Until then, copy the enquiry.';
    },
  };
}
