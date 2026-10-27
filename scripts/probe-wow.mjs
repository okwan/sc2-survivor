// Temporary: list the MPQs inside candidate WoW 1.12 archives on archive.org (server-side listing).
const cands = [
  'nostalrius-wow-classic/Nostalrius-WoW-Classic.zip',
  'World_of_Warcraft_Client_and_Installation_Archive/ISO/WoW-1.12.1_install.rar',
];
for (const c of cands) {
  const u = `https://archive.org/download/${c.split('/').map(encodeURIComponent).join('/')}/`;
  try {
    const r = await fetch(u);
    const t = await r.text();
    console.log(`LIST ${c} -> ${r.status} ${r.url} (${t.length} bytes)`);
    const rows = [...t.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    for (const row of rows) if (/mpq|\.exe|wow|\.ttf|realmlist/i.test(row)) console.log(`  ${row}`);
    if (!rows.length) console.log(t.slice(0, 1500));
  } catch (e) {
    console.log(`LIST ${c} failed ${e.message}`);
  }
}
