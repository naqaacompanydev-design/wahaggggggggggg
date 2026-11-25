// Phone preview: original hero without the slogan + service "story" circles. Writes /preview/story-a/ and /preview/story-b/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const SV = [
  ['المنازل والفلل', '/services/home-villa-cleaning/', '6a53ab878becf.png'],
  ['الكنب والسجاد', '/services/sofa-carpet-cleaning/', '6a53aaa518e00.png'],
  ['المكيفات', '/services/ac-cleaning/', '6a53b95818aec.png'],
  ['المكاتب', '/services/office-cleaning/', '6a53b70f7270b.png'],
  ['المحلات', '/services/shop-cleaning/', '6a53bc0dab095.png'],
  ['رش المبيدات', '/services/pest-control/', '6a53b8666269b.png'],
  ['البيوت الجديدة', '/services/post-construction-cleaning/', '6a53a8d368e32.png'],
];
const ring = `<nav class="st-ring" aria-label="خدماتنا">${SV.map(([n, u, f], i) => `<a href="${u}"${i ? '' : ' class="on"'}><span><img src="/assets/old/${f}" alt="" width="62" height="62"></span>${n}</a>`).join('')}</nav>`;
const css = `<style>
.st-ring{display:none}
@media (max-width:900px){
.st-ring{display:flex;gap:12px;overflow-x:auto;margin:0 -16px 18px;padding:2px 16px 6px;scrollbar-width:none;scroll-snap-type:x proximity}
.st-ring::-webkit-scrollbar{display:none}
.st-ring a{flex:0 0 auto;display:grid;justify-items:center;gap:6px;width:70px;font-size:12px;font-weight:700;line-height:1.3;color:var(--navy);text-align:center;scroll-snap-align:start}
.st-ring span{width:66px;height:66px;border-radius:50%;padding:3px;background:linear-gradient(135deg,#2C70A8,#96CC8A)}
.st-ring a.on span{animation:st-pulse 2.4s ease-in-out infinite}
.st-ring img{width:100%;height:100%;border-radius:50%;object-fit:cover;border:3px solid #fff}
@keyframes st-pulse{50%{box-shadow:0 0 0 4px rgba(150,204,138,.35)}}
.hero{padding-top:18px}
.hero__grid>*{min-width:0}
}
.pv-bar{position:sticky;top:0;z-index:99;background:#FFE8A8;color:#5A3D00;text-align:center;font-weight:800;font-size:13px;padding:5px 10px}
</style>`;
const variants = {
  'story-a': ['أ: بدون العنوان كله', '<h1 id="hero-h" class="sr-only">شركة تنظيف بالرياض</h1>'],
  'story-b': ['ب: «شركة تنظيف بالرياض» بس', '<h1 id="hero-h" data-in="2">شركة تنظيف بالرياض</h1>'],
};
for (const [k, [name, h1]] of Object.entries(variants)) {
  const html = home
    .replace(/<h1 id="hero-h" data-in="2">[\s\S]*?<\/h1>/, ring + '\n        ' + h1)
    .replace('</head>', `<meta name="robots" content="noindex">\n${css}\n<style>.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}</style>\n</head>`)
    .replace('<a class="skip"', `<div class="pv-bar">معاينة ${name}</div>\n<a class="skip"`);
  const out = path.join(root, 'preview', k, 'index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  console.log('wrote', k);
}
