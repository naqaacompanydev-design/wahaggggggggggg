// One command for everything: generate pages, build them, and export a clean /dist for Vercel.
// Run locally:  node tools/build-all.mjs        (Vercel runs it too, see vercel.json)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://www.wahjclean.sa';
const run = f => execFileSync(process.execPath, [path.join(root, 'tools', f)], { stdio: 'inherit', cwd: root });

// 1) generate page sources, 2) build them with the shared header/footer
for (const f of ['services.mjs', 'faq.mjs', 'legal.mjs', 'data-pages.mjs', 'build.mjs']) run(f);

// 3) export only what the site serves
const dist = path.join(root, 'dist');
fs.rmSync(dist, { recursive: true, force: true });
const SKIP = new Set(['dist', 'pages', 'tools', 'shots', '.taste-skill', '.claude', '.git', 'node_modules',
  'README.md', 'README-site.txt', 'README-admin.txt', 'vercel.json', 'api', '_edit', 'firestore.rules', '.gitignore', 'package.json', 'credits.json', 'deliver', 'preview']);
const copy = (from, to) => {
  for (const d of fs.readdirSync(from, { withFileTypes: true })) {
    if (SKIP.has(d.name) || d.name.endsWith('.zip')) continue;
    const a = path.join(from, d.name), b = path.join(to, d.name);
    if (d.isDirectory()) { fs.mkdirSync(b, { recursive: true }); copy(a, b); }
    else fs.copyFileSync(a, b);
  }
};
fs.mkdirSync(dist);
copy(root, dist);

// 3b) apply the client's edits from the admin (data/content.json) and write the editable copies (dist/_edit/)
execFileSync(process.execPath, [path.join(root, 'tools', 'content.mjs'), dist], { stdio: 'inherit', cwd: root });
// 3c) general settings from the admin (numbers, email, social links, colours, logo, installments)
execFileSync(process.execPath, [path.join(root, 'tools', 'settings.mjs'), dist], { stdio: 'inherit', cwd: root });

// 4) sitemap.xml from every indexable page in dist
const pages = [];
const walk = dir => {
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) walk(p);
    else if (d.name === 'index.html') {
      const html = fs.readFileSync(p, 'utf8');
      if (/<meta name="robots" content="noindex/.test(html)) continue;
      const rel = path.relative(dist, path.dirname(p)).split(path.sep).join('/');
      pages.push(rel ? `${SITE}/${rel}/` : `${SITE}/`);
    }
  }
};
walk(dist);
const today = new Date().toISOString().slice(0, 10);
const prio = u => u === `${SITE}/` ? '1.0' : /riyadh-cleaning-company|\/services\/[^/]+\/$/.test(u) ? '0.9' : /price-calculator|offers|services\/$/.test(u) ? '0.8' : '0.6';
fs.writeFileSync(path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.sort().map(u => `  <url><loc>${u}</loc><lastmod>${today}</lastmod><priority>${prio(u)}</priority></url>`).join('\n')}\n</urlset>\n`);
console.log(`\nexported dist/ with ${pages.length} pages in sitemap.xml`);
