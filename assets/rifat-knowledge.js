// Rifat's knowledge base: what Rifat may say about SB Trading and its materials, one short entry per topic.
// Used in two places: the Cloudflare Pages Function (src/rifat-fn.js bundles it; Claude reads it through the
// search_knowledge tool, and an optional Supabase table can add entries without a redeploy), and the page's guided mode
// (assets/rifat.js answers a buyer's question from it when the AI is not connected).
// Every entry states either what the website already states about SB Trading, or well-established general history of
// the materials. Nothing here confirms prices, minimum orders, stock, lead times, ports, shipping terms or certifications:
// SB Trading's team confirms those with the quotation. Add or correct entries here (or in Supabase) as SB Trading confirms facts.
export const KNOWLEDGE = [
  { id: 'company', topic: 'About SB Trading', keywords: 'sb trading who company about business supplier bangladesh what do you do',
    text: 'SB Trading supplies forestry and agricultural products to business buyers: bamboo, banana fibre yarn, and banana bark and leaves. Three families and nine products, supplied from Bangladesh.' },
  { id: 'range', topic: 'The range', keywords: 'range products catalogue families what sell supply list nine three',
    text: 'There are three families and nine products. Bamboo: bamboo poles, bamboo splits, ski poles and woven mats. Banana fibre yarn: Grade A banana silk, Grade B standard banana fibre yarn and Grade C industrial banana fibre yarn. Banana bark and leaves: banana bark and banana leaves. The names and grades are still being confirmed by SB Trading.' },
  { id: 'bamboo', topic: 'Bamboo products', keywords: 'bamboo poles splits ski poles woven mats cane diameter length treatment',
    text: 'The bamboo family is bamboo poles, bamboo splits, ski poles and woven mats. Diameters, lengths, split widths, treatment and weave are confirmed by SB Trading with the quotation. "Ski poles" is a product label SB Trading has not confirmed yet.' },
  { id: 'fibre', topic: 'Banana fibre yarn', keywords: 'banana fibre fiber yarn grade a b c silk standard industrial thread spun',
    text: 'Banana fibre yarn comes in three grades: Grade A banana silk (the finest), Grade B standard banana fibre yarn, and Grade C industrial banana fibre yarn. Specifications for each grade are confirmed with the quotation.' },
  { id: 'bark-leaves', topic: 'Banana bark and leaves', keywords: 'banana bark leaves leaf sheath packed packing bags plates wrapping',
    text: 'The third family is banana bark and banana leaves. SB Trading photographs its banana leaves folded and packed in clear bags; packing, sizes and availability are confirmed with the quotation.' },
  { id: 'ordering', topic: 'How ordering works', keywords: 'order ordering process how buy steps quotation quote procedure works',
    text: 'Ordering works in three steps. Tell SB Trading what you need: the product, the quantity and where it should be delivered (I can put that together with you). SB Trading\'s team replies with a quotation: price, specification and shipping options. Then you confirm samples or the order and agree the details with the team before anything is shipped.' },
  { id: 'samples', topic: 'Samples', keywords: 'sample samples trial test small first',
    text: 'You can ask for samples first: say so in your enquiry, and SB Trading\'s team confirms what they can send when they reply.' },
  { id: 'unconfirmed', topic: 'What the team confirms', keywords: 'price prices cost moq minimum order lead time delivery shipping incoterms fob cif port certification certificate stock availability origin',
    text: 'Prices, minimum order quantities, stock, lead times, origin and export ports, shipping terms and certifications all come from SB Trading\'s team with the quotation. I can make sure your question reaches them in your enquiry.' },
  { id: 'contact', topic: 'Contacting SB Trading', keywords: 'contact whatsapp phone number call reach team email talk human person',
    text: 'SB Trading\'s team works on WhatsApp at +880 1878-707910. Once your enquiry is ready, the Send on WhatsApp button opens it there with everything filled in; nothing is sent until you press send.' },
  { id: 'rifat', topic: 'About Rifat', keywords: 'rifat who are you ai bot robot human real person assistant',
    text: 'I am Rifat, SB Trading\'s AI assistant, not a person. I answer questions about the range, prepare your enquiry and hand it to SB Trading\'s team on WhatsApp. The team replies to the enquiry, not me.' },
  { id: 'history-bamboo', topic: 'The story of bamboo', keywords: 'bamboo history story grass grow fast sustainable regrow roots tradition',
    text: 'In Bangladesh, bamboo has held up homes, bridges and boats for generations. It is a grass, not a tree, and some kinds can grow close to a metre in a day. Cut, it grows back from the same roots.' },
  { id: 'history-fibre', topic: 'The story of banana fibre', keywords: 'banana fibre history story waste stem pseudostem okinawa weaving sustainable',
    text: 'A banana plant fruits only once; after the harvest its stem is usually left to rot. Inside its sheaths run long, strong fibres that weavers across Asia have drawn out for centuries; in Okinawa, banana-fibre cloth has been prized for hundreds of years. Spun into yarn, it is grown from what would have been waste.' },
  { id: 'history-leaves', topic: 'The story of banana leaves and bark', keywords: 'banana leaf leaves bark history story plates wrapping paper craft biodegradable',
    text: 'Banana leaves have served as plates and wrapping across South Asia for generations, and return to the soil after use. The dried outer sheath of the stem, its bark, is used for craft, packaging and handmade paper.' },
];

const STOP = new Set('a an the of to and or in on for is are do does you your i me my we our it its can what how which who with about from that this be have has at by please tell'.split(' '));
const words = (s) => String(s).toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w));
const stem = (w) => w.replace(/(ies|es|s|ing|ed)$/, '');

/** Ranks entries for a question: keyword hits count 2, topic and text hits 1. Returns [{ ...entry, score }], best first. */
export function searchKnowledge(query, n = 3, extra = []) {
  const q = [...new Set(words(query).map(stem))];
  if (!q.length) return [];
  return [...KNOWLEDGE, ...extra].map((e) => {
    const kw = new Set(words(e.keywords || '').map(stem)), body = new Set(words(`${e.topic} ${e.text}`).map(stem));
    const score = q.reduce((sum, w) => sum + (kw.has(w) ? 2 : body.has(w) ? 1 : 0), 0);
    return { ...e, score };
  }).filter((e) => e.score > 0).sort((a, b) => b.score - a.score).slice(0, n);
}
