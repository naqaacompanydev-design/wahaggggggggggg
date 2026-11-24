// Builds every page in /pages using index.html as the shared shell (top bar, nav, drawer, footer).
// Run: node tools/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shell = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const [before, rest] = shell.split('<!--page-->');
const after = rest.split('<!--/page-->')[1];

const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(d =>
    d.isDirectory() ? walk(path.join(dir, d.name)) : d.name.endsWith('.html') ? [path.join(dir, d.name)] : []);
}

for (const file of walk(path.join(root, 'pages'))) {
  const src = fs.readFileSync(file, 'utf8');
  const meta = JSON.parse(src.match(/<!--meta([\s\S]*?)-->/)[1]);
  const head = (src.match(/<!--head-->([\s\S]*?)<!--\/head-->/) || [, ''])[1];
  const body = src.match(/<!--body-->([\s\S]*?)<!--\/body-->/)[1]
    .replace('<!--ICONS-->', fs.readFileSync(path.join(root, 'pages/partials/icons.svg'), 'utf8').trim());

  let top = before
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${meta.title}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(meta.description)}">`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${meta.canonical}">`)
    // only the homepage has an English twin, so inner pages carry no hreflang pair
    .replace(/<link rel="alternate" hreflang="(ar|en|x-default)" href="[^"]*">\n?/g, '')
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(meta.title)}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(meta.description)}">`)
    .replace(' aria-current="page"', '')
    .replace('</head>', `${head.trim()}\n</head>`);
  if (meta.current) top = top.replace(`class="nav__link" href="${meta.current}"`, `class="nav__link" href="${meta.current}" aria-current="page"`);

  // cache-bust shared files so phones always load the latest design
  const v = Date.now().toString(36);
  top = top.replace(/(\/assets\/(?:site|service|calc)\.(?:css|js))(\?v=\w+)?"/g, `$1?v=${v}"`);
  const out = path.join(root, meta.out);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${top}<!--page-->\n${body.trim()}\n<!--/page-->${after}`);
  console.log('built', meta.out);
}
