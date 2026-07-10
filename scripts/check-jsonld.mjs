import fs from 'node:fs';
import path from 'node:path';

function walk(d) {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

const files = walk('dist').filter((f) => f.endsWith('.html'));
let total = 0, bad = 0;
const re = /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = re.exec(html))) {
    total++;
    try { JSON.parse(m[1]); }
    catch (e) { bad++; console.log('INVALID JSON-LD in', f, '->', e.message); }
  }
}
console.log(`HTML files: ${files.length} | JSON-LD blocks: ${total} | invalid: ${bad}`);
