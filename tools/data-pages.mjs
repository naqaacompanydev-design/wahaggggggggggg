// Pages that come from the admin's data, generated before build.mjs:
// 1) one page per blog post in data/posts.json  -> pages/posts/<slug>.html  (served at /blog/<slug>/)
// 2) the offers page's Google data (OfferCatalog) from data/offers.json, so prices in search match the site.
// Post body format (written in the admin): a line starting with "## " is a heading, "- " a list item, other lines are paragraphs.
// Run: node tools/data-pages.mjs && node tools/build.mjs        (build-all.mjs runs it)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://www.wahjclean.sa';
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const read = f => { try { return JSON.parse(fs.readFileSync(path.join(root, 'data', f), 'utf8')); } catch { return null; } };
const today = new Date().toISOString().slice(0, 10);

// ---------- blog posts ----------
function body(text) {
  const out = []; let list = null;
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim();
    if (/^-\s+/.test(line)) { (list ||= []).push(`<li>${esc(line.replace(/^-\s+/, ''))}</li>`); continue; }
    if (list) { out.push(`<ul>${list.join('')}</ul>`); list = null; }
    if (!line) continue;
    if (/^##\s+/.test(line)) out.push(`<h2>${esc(line.replace(/^##\s+/, ''))}</h2>`);
    else out.push(`<p>${esc(line)}</p>`);
  }
  if (list) out.push(`<ul>${list.join('')}</ul>`);
  return out.join('\n        ');
}
const D = read('posts.json') || { categories: {}, posts: [] };
const dir = path.join(root, 'pages', 'posts');
fs.rmSync(dir, { recursive: true, force: true });
const live = (D.posts || []).filter(p => !p.draft && /^[a-z0-9-]{2,80}$/.test(p.slug || '') && p.title && p.date <= today);
if (live.length) fs.mkdirSync(dir, { recursive: true });
// built pages of posts that were deleted or set back to draft
const built = path.join(root, 'blog');
if (fs.existsSync(built)) for (const x of fs.readdirSync(built, { withFileTypes: true })) if (x.isDirectory() && !live.some(p => p.slug === x.name)) fs.rmSync(path.join(built, x.name), { recursive: true, force: true });
const fmt = d => new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d));
for (const p of live) {
  const url = `${SITE}/blog/${p.slug}/`, cat = (D.categories || {})[p.category] || 'المدونة';
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'BlogPosting', headline: p.title, description: p.excerpt || '', datePublished: p.date, image: p.image ? SITE + p.image : undefined, author: { '@type': 'Organization', name: 'وهج لخدمات التنظيف' }, mainEntityOfPage: url },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'المدونة', item: `${SITE}/blog/` },
      { '@type': 'ListItem', position: 3, name: p.title, item: url }] }] };
  const meta = { out: `blog/${p.slug}/index.html`, title: `${p.title} | مدونة وهج`, description: p.excerpt || p.title, canonical: url, current: '/blog/' };
  fs.writeFileSync(path.join(dir, `${p.slug}.html`), `<!--meta
${JSON.stringify(meta)}
-->
<!--head-->
<link rel="stylesheet" href="/assets/service.css">
<link rel="stylesheet" href="/assets/calc.css">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
<style>
.post{max-width:760px;margin-inline:auto;padding-block:36px 64px}
.post__img{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:22px;margin-bottom:26px;background:var(--surface)}
.post__body{font-size:18px;line-height:2}
.post__body h2{font-size:clamp(22px,2.4vw,28px);font-weight:800;margin:30px 0 10px;color:var(--navy)}
.post__body p{margin-bottom:14px}
.post__body ul{list-style:disc;margin:0 0 16px;padding-inline-start:22px}
.post__body li{margin-bottom:6px}
.post__cta{margin-top:34px;padding:22px;border-radius:20px;background:var(--surface);display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between}
.post__cta b{font-size:18px}
</style>
<!--/head-->
<!--body-->
<main id="main" class="blog-page">
  <!--ICONS-->
  <section class="c-top fq-top" aria-labelledby="po-h">
    <div class="wrap">
      <nav aria-label="مسار التنقل"><ol class="crumbs"><li><a href="/">الرئيسية</a></li><li><a href="/blog/">المدونة</a></li><li><span aria-current="page">${esc(cat)}</span></li></ol></nav>
      <h1 id="po-h">${esc(p.title)}</h1>
      <p class="c-lead">${esc(cat)} · ${fmt(p.date)} · ${Number(p.minutes) || 3} دقائق قراءة</p>
    </div>
  </section>
  <section class="c-body">
    <div class="wrap">
      <article class="post">
        ${p.image ? `<img class="post__img" src="${esc(p.image)}" alt="${esc(p.title)}">` : ''}
        <div class="post__body">
        ${body(p.body)}
        </div>
        <div class="post__cta"><b>تبي بيتك يلمع؟</b><a class="btn btn--primary" href="/price-calculator/">احسب سعر التنظيف</a></div>
      </article>
    </div>
  </section>
</main>
<!--/body-->
`);
}
console.log(`data-pages: ${live.length} blog posts`);

// ---------- offers: Google data on the offers page ----------
const O = read('offers.json');
const op = path.join(root, 'pages', 'offers.html');
if (O && fs.existsSync(op)) {
  const offers = (O.offers || []).filter(o => !o.hidden && (!o.until || o.until >= today));
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'OfferCatalog', name: 'عروض وهج لخدمات التنظيف', url: `${SITE}/offers/`, itemListElement: offers.map(o => ({ '@type': 'Offer', name: o.title, price: String(o.price), priceCurrency: 'SAR', ...(o.until ? { priceValidUntil: o.until } : {}) })) },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'العروض', item: `${SITE}/offers/` }] }] };
  const h = fs.readFileSync(op, 'utf8');
  const out = h.replace(/(<!--head-->[\s\S]*?<script type="application\/ld\+json">)[\s\S]*?(<\/script>)/, `$1\n${JSON.stringify(ld).replace(/</g, '\\u003c')}\n$2`);
  if (out !== h) fs.writeFileSync(op, out);
}
