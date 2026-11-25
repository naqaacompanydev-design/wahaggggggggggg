// Admin page editor, build side.
// 1) Applies the client's text and image edits (data/content.json) to every exported page in <dir>.
// 2) Writes an editable copy of every page to <dir>/_edit/ (same page + markers + the editor script),
//    and <dir>/_edit/pages.json (the page list the admin shows).
// Every text run and <img> in the page body gets a stable key by its order:
//   s… = shared header/footer (same on every page), p… = this page's own content.
// Each edit also stores a fingerprint of the original text, so if a developer later changes the page,
// an old edit is skipped instead of landing on the wrong text.
// Run: node tools/content.mjs dist        (build-all.mjs runs it after exporting dist/)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const V = Date.now().toString(36); // cache-busting for the editor files
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const RAW = new Set(['script', 'style', 'textarea', 'title', 'noscript']);
const SKIP = new Set(['svg', 'template', 'select', 'datalist', 'head', 'iframe', 'pre', 'code']);

export const hash = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };
const escText = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// A small HTML scanner: finds text runs (with their parent tag) and <img> tags outside scripts, svg, etc.
export function scan(html) {
  const lower = html.toLowerCase();
  const texts = [], imgs = [], stack = [];
  let skip = 0, i = 0;
  const n = html.length;
  while (i < n) {
    const lt = html.indexOf('<', i);
    const end = lt < 0 ? n : lt;
    if (end > i && !skip && html.slice(i, end).trim()) texts.push({ s: i, e: end, parent: stack[stack.length - 1] || null });
    if (lt < 0) break;
    if (html.startsWith('<!--', lt)) { const c = html.indexOf('-->', lt + 4); i = c < 0 ? n : c + 3; continue; }
    if (html[lt + 1] === '!' || html[lt + 1] === '?') { const g = html.indexOf('>', lt); i = g < 0 ? n : g + 1; continue; }
    if (html[lt + 1] === '/') {
      const g = html.indexOf('>', lt);
      const name = html.slice(lt + 2, g).trim().toLowerCase();
      for (let k = stack.length - 1; k >= 0; k--) {
        if (stack[k].name === name) { for (const r of stack.splice(k)) if (r.skip) skip--; break; }
      }
      i = g < 0 ? n : g + 1;
      continue;
    }
    const m = /^<([a-zA-Z][\w:-]*)/.exec(html.slice(lt, lt + 40));
    if (!m) { i = lt + 1; continue; }
    const name = m[1].toLowerCase();
    let j = lt + m[0].length, q = null;
    for (; j < n; j++) { const c = html[j]; if (q) { if (c === q) q = null; } else if (c === '"' || c === "'") q = c; else if (c === '>') break; }
    const tag = { name, s: lt, e: j + 1, self: html[j - 1] === '/' };
    if (name === 'img' && !skip) imgs.push(tag);
    i = j + 1;
    if (RAW.has(name)) { const c = lower.indexOf('</' + name, i); i = c < 0 ? n : c; continue; }
    if (VOID.has(name) || tag.self) continue;
    tag.skip = SKIP.has(name);
    if (tag.skip) skip++;
    stack.push(tag);
  }
  return { texts, imgs };
}

const attr = (tag, html, a) => { const m = new RegExp(`\\s${a}="([^"]*)"`).exec(html.slice(tag.s, tag.e)); return m ? m[1] : null; };

// Returns the page with edits applied; with edit=true it also adds the editor markers and script.
export function render(html, { pageId, shell = {}, page = {}, edit = false }) {
  const body = html.indexOf('<body');
  const ps = html.indexOf('<!--page-->'), pe = html.indexOf('<!--/page-->');
  const zone = pos => pos < body ? null : (ps > -1 && pos > ps && (pe < 0 || pos < pe)) ? 'p' : 's';
  const { texts, imgs } = scan(html);
  const ops = [], marks = new Map(), cnt = { s: 0, p: 0, si: 0, pi: 0 };

  for (const t of texts) {
    const z = zone(t.s); if (!z) continue;
    const key = z + cnt[z]++;
    const raw = html.slice(t.s, t.e), core = raw.trim(), o = hash(core);
    const ov = (z === 's' ? shell : page)[key];
    if (ov && ov.o === o && typeof ov.t === 'string') {
      const lead = raw.match(/^\s*/)[0], trail = raw.match(/\s*$/)[0];
      ops.push({ s: t.s, e: t.e, rep: lead + escText(ov.t) + trail });
    }
    if (edit && t.parent) { const l = marks.get(t.parent) || []; l.push(`${key}:${o}`); marks.set(t.parent, l); }
  }
  for (const im of imgs) {
    const z = zone(im.s); if (!z) continue;
    const key = z + 'i' + cnt[z + 'i']++;
    const src = attr(im, html, 'src') || '', o = hash(src);
    const ov = (z === 's' ? shell : page)[key];
    let tag = html.slice(im.s, im.e);
    if (ov && ov.o === o) {
      if (ov.src) tag = tag.replace(/\ssrc="[^"]*"/, ` src="${escAttr(ov.src)}"`).replace(/\s(srcset|sizes)="[^"]*"/g, '');
      if (typeof ov.alt === 'string') tag = /\salt="/.test(tag) ? tag.replace(/\salt="[^"]*"/, ` alt="${escAttr(ov.alt)}"`) : tag.replace(/^<img/, `<img alt="${escAttr(ov.alt)}"`);
    }
    if (edit) tag = tag.replace(/^<img/, `<img data-ik="${key}:${o}"`);
    if (tag !== html.slice(im.s, im.e)) ops.push({ s: im.s, e: im.e, rep: tag });
  }
  if (edit) for (const [tag, keys] of marks) {
    const at = html[tag.e - 2] === '/' ? tag.e - 2 : tag.e - 1;
    ops.push({ s: at, e: at, rep: ` data-tk="${keys.join(' ')}"` });
  }
  ops.sort((a, b) => b.s - a.s || b.e - a.e);
  let out = html;
  for (const op of ops) out = out.slice(0, op.s) + op.rep + out.slice(op.e);
  if (edit) {
    out = out.replace(/<html([^>]*)>/, `<html$1 data-edit-page="${escAttr(pageId)}">`)
      .replace('</head>', `<meta name="robots" content="noindex">\n<link rel="stylesheet" href="/assets/admin-edit.css?v=${V}">\n</head>`)
      .replace('</body>', `<script src="/assets/admin-edit.js?v=${V}"></script>\n</body>`);
  }
  return out;
}

// ---------- run over an exported folder ----------
function run(dir) {
  const content = JSON.parse(fs.readFileSync(path.join(root, 'data', 'content.json'), 'utf8'));
  const files = [];
  const walk = d => {
    for (const x of fs.readdirSync(d, { withFileTypes: true })) {
      if (x.name === '_edit' || x.name === 'admin' || x.name === 'preview') continue;
      const p = path.join(d, x.name);
      if (x.isDirectory()) walk(p);
      else if (x.name === 'index.html' || (d === dir && x.name === '404.html')) files.push(p);
    }
  };
  walk(dir);
  const list = [];
  for (const f of files) {
    const html = fs.readFileSync(f, 'utf8');
    const rel = path.relative(dir, f).split(path.sep).join('/');
    const pageId = rel === '404.html' ? '/404/' : '/' + rel.replace(/index\.html$/, '');
    const lang = /<html[^>]*lang="en"/.test(html) ? 'en' : 'ar';
    const opts = { pageId, shell: (content.shell || {})[lang] || {}, page: (content.pages || {})[pageId] || {} };
    fs.writeFileSync(f, render(html, opts));
    const out = path.join(dir, '_edit', rel);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, render(html, { ...opts, edit: true }));
    const title = (/<title>([\s\S]*?)<\/title>/.exec(html) || [, pageId])[1].split('|')[0].trim();
    list.push({ id: pageId, title, lang, edit: '/_edit/' + rel.replace(/index\.html$/, '') });
  }
  list.sort((a, b) => a.id.length - b.id.length || a.id.localeCompare(b.id));
  fs.writeFileSync(path.join(dir, '_edit', 'pages.json'), JSON.stringify(list, null, 1));
  // the admin page loads its files fresh after every publish
  const adm = path.join(dir, 'admin', 'index.html');
  if (fs.existsSync(adm)) fs.writeFileSync(adm, fs.readFileSync(adm, 'utf8').replace(/(\/assets\/admin(?:-config|-data|-lists|-sales|-team)?\.(?:css|js))"/g, `$1?v=${V}"`));
  console.log(`content: applied edits to ${files.length} pages, wrote _edit/ copies`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) run(path.resolve(process.argv[2] || path.join(root, 'dist')));
