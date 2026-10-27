// Temporary: find a WoW 1.12 client on archive.org and print its file list.
const queries = [
  '"world of warcraft" AND (1.12 OR "1.12.1" OR vanilla) AND mediatype:software',
  'title:(wow 1.12)',
  'title:("world of warcraft" client)',
  '(wow OR "world of warcraft") AND (5875 OR "1.12.1")',
];
const seen = new Set();
for (const q of queries) {
  const u = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)}&fl[]=identifier&fl[]=title&fl[]=item_size&rows=60&output=json`;
  try {
    const r = await (await fetch(u)).json();
    for (const d of r.response.docs) {
      if (seen.has(d.identifier)) continue;
      seen.add(d.identifier);
      console.log(`ITEM ${d.identifier} | ${d.title} | ${((d.item_size ?? 0) / 1e9).toFixed(2)} GB`);
    }
  } catch (e) { console.log('search failed', q, e.message); }
}
for (const id of seen) {
  try {
    const m = await (await fetch(`https://archive.org/metadata/${id}`)).json();
    const files = (m.files ?? []).filter((f) => /\.(zip|7z|rar|mpq|exe|iso|tar|gz)$/i.test(f.name) && +f.size > 5e7);
    for (const f of files) console.log(`FILE ${id} :: ${f.name} :: ${(f.size / 1e9).toFixed(2)} GB`);
  } catch (e) { console.log('meta failed', id); }
}
