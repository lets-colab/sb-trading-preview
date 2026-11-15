-- Rifat's knowledge table for Supabase (optional). Run once in the Supabase SQL editor, then set SUPABASE_URL and
-- SUPABASE_ANON_KEY as encrypted variables on the Cloudflare Pages project. Rifat's function reads this table with the
-- anon key (read-only), merged with the knowledge bundled in assets/rifat-knowledge.js. Add only facts SB Trading has
-- confirmed; edit rows in the Supabase table editor and Rifat picks them up within a minute, without a redeploy.
create table if not exists public.rifat_knowledge (
  id text primary key,
  topic text not null,
  keywords text not null default '',
  text text not null,
  updated_at timestamptz not null default now()
);
alter table public.rifat_knowledge enable row level security;
drop policy if exists "rifat reads knowledge" on public.rifat_knowledge;
create policy "rifat reads knowledge" on public.rifat_knowledge for select to anon using (true);
-- no insert, update or delete policy for anon: only the project owner edits the knowledge

insert into public.rifat_knowledge (id, topic, keywords, text) values
  ('company', 'About SB Trading', 'sb trading who company about business supplier bangladesh what do you do', 'SB Trading supplies forestry and agricultural products to business buyers: bamboo, banana fibre yarn, and banana bark and leaves. Three families and nine products, supplied from Bangladesh.'),
  ('range', 'The range', 'range products catalogue families what sell supply list nine three', 'There are three families and nine products. Bamboo: bamboo poles, bamboo splits, ski poles and woven mats. Banana fibre yarn: Grade A banana silk, Grade B standard banana fibre yarn and Grade C industrial banana fibre yarn. Banana bark and leaves: banana bark and banana leaves. The names and grades are still being confirmed by SB Trading.'),
  ('bamboo', 'Bamboo products', 'bamboo poles splits ski poles woven mats cane diameter length treatment', 'The bamboo family is bamboo poles, bamboo splits, ski poles and woven mats. Diameters, lengths, split widths, treatment and weave are confirmed by SB Trading with the quotation. "Ski poles" is a product label SB Trading has not confirmed yet.'),
  ('fibre', 'Banana fibre yarn', 'banana fibre fiber yarn grade a b c silk standard industrial thread spun', 'Banana fibre yarn comes in three grades: Grade A banana silk (the finest), Grade B standard banana fibre yarn, and Grade C industrial banana fibre yarn. Specifications for each grade are confirmed with the quotation.'),
  ('bark-leaves', 'Banana bark and leaves', 'banana bark leaves leaf sheath packed packing bags plates wrapping', 'The third family is banana bark and banana leaves. SB Trading photographs its banana leaves folded and packed in clear bags; packing, sizes and availability are confirmed with the quotation.'),
  ('ordering', 'How ordering works', 'order ordering process how buy steps quotation quote procedure works', 'Ordering works in three steps. Tell SB Trading what you need: the product, the quantity and where it should be delivered (I can put that together with you). SB Trading''s team replies with a quotation: price, specification and shipping options. Then you confirm samples or the order and agree the details with the team before anything is shipped.'),
  ('samples', 'Samples', 'sample samples trial test small first', 'You can ask for samples first: say so in your enquiry, and SB Trading''s team confirms what they can send when they reply.'),
  ('unconfirmed', 'What the team confirms', 'price prices cost moq minimum order lead time delivery shipping incoterms fob cif port certification certificate stock availability origin', 'Prices, minimum order quantities, stock, lead times, origin and export ports, shipping terms and certifications all come from SB Trading''s team with the quotation. I can make sure your question reaches them in your enquiry.'),
  ('contact', 'Contacting SB Trading', 'contact whatsapp phone number call reach team email talk human person', 'SB Trading''s team works on WhatsApp at +880 1878-707910. Once your enquiry is ready, the Send on WhatsApp button opens it there with everything filled in; nothing is sent until you press send.'),
  ('rifat', 'About Rifat', 'rifat who are you ai bot robot human real person assistant', 'I am Rifat, SB Trading''s AI assistant, not a person. I answer questions about the range, prepare your enquiry and hand it to SB Trading''s team on WhatsApp. The team replies to the enquiry, not me.'),
  ('history-bamboo', 'The story of bamboo', 'bamboo history story grass grow fast sustainable regrow roots tradition', 'In Bangladesh, bamboo has held up homes, bridges and boats for generations. It is a grass, not a tree, and some kinds can grow close to a metre in a day. Cut, it grows back from the same roots.'),
  ('history-fibre', 'The story of banana fibre', 'banana fibre history story waste stem pseudostem okinawa weaving sustainable', 'A banana plant fruits only once; after the harvest its stem is usually left to rot. Inside its sheaths run long, strong fibres that weavers across Asia have drawn out for centuries; in Okinawa, banana-fibre cloth has been prized for hundreds of years. Spun into yarn, it is grown from what would have been waste.'),
  ('history-leaves', 'The story of banana leaves and bark', 'banana leaf leaves bark history story plates wrapping paper craft biodegradable', 'Banana leaves have served as plates and wrapping across South Asia for generations, and return to the soil after use. The dried outer sheath of the stem, its bark, is used for craft, packaging and handmade paper.')
on conflict (id) do update set topic = excluded.topic, keywords = excluded.keywords, text = excluded.text, updated_at = now();
