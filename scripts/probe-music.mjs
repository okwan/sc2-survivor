// Temporary (branch builds only): looks for archive.org items that carry StarCraft's music.
const q = encodeURIComponent('(title:starcraft OR title:"brood war") AND mediatype:(software OR audio OR data)');
const s = await (await fetch(`https://archive.org/advancedsearch.php?q=${q}&fl[]=identifier&fl[]=title&rows=120&output=json`)).json();
const ids = s.response.docs.map((d) => [d.identifier, d.title]);
console.log('probe: items ' + ids.map(([i, t]) => `${i} (${t})`).join(' | '));
for (const [id] of ids) {
  try {
    const m = await (await fetch(`https://archive.org/metadata/${id}`)).json();
    const files = (m.files ?? []).filter((f) => /install\.exe|\.iso$|\.bin$|\.cue$|\.7z$|\.zip$|\.rar$|music|\.wav$|\.ogg$|\.mp3$|\.mpq$/i.test(f.name));
    if (files.length) console.log(`probe: ${id}: ` + files.slice(0, 40).map((f) => `${f.name} ${f.size ?? ''}`).join(' ; '));
  } catch (e) {
    console.log(`probe: ${id} failed ${e.message}`);
  }
}
