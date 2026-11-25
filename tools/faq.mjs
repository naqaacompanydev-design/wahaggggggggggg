// Generates pages/faq.html: general questions + every service page's FAQ (deduplicated), grouped,
// with FAQPage schema. Run: node tools/faq.mjs && node tools/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { services, SITE } from './services-data.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

// general groups come from data/faq.json (edited in the admin); each service's own questions are added after them
const groups = JSON.parse(fs.readFileSync(path.join(root, 'data', 'faq.json'), 'utf8')).groups
  .map(g => ({ ...g, qa: (g.qa || []).filter(x => x.q && x.a).map(x => [x.q, x.a]) })).filter(g => g.qa.length);
const seen = new Set(groups.flatMap(g => g.qa.map(([q]) => q)));
const generic = /^(كيف أحجز|كيف أطلب|هل يمكن تقسيط|هل تخدمون جميع|هل تحضرون المعدات)/;
for (const s of services) {
  const qa = s.faq.filter(([q]) => !seen.has(q) && !generic.test(q));
  qa.forEach(([q]) => seen.add(q));
  if (qa.length) groups.push({ id: s.slug, name: s.short, icon: s.items[0][3], href: `/services/${s.slug}/`, qa });
}
const total = groups.reduce((a, g) => a + g.qa.length, 0);

const ld = { '@context': 'https://schema.org', '@graph': [
  { '@type': 'FAQPage', mainEntity: groups.flatMap(g => g.qa.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } }))) },
  { '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: `${SITE}/` },
    { '@type': 'ListItem', position: 2, name: 'الأسئلة الشائعة', item: `${SITE}/faq/` }] },
]};

const html = `<!--meta
${JSON.stringify({ out: 'faq/index.html', title: 'الأسئلة الشائعة | وهج لخدمات التنظيف بالرياض', description: `إجابات ${total} سؤال عن خدمات وهج للتنظيف بالرياض: الحجز والأسعار والتقسيط، تنظيف المنازل، غسيل الكنب، المكيفات، المبيدات وغيرها.`, canonical: `${SITE}/faq/`, current: '/faq/' })}
-->
<!--head-->
<link rel="stylesheet" href="/assets/service.css">
<link rel="stylesheet" href="/assets/calc.css">
<script type="application/ld+json">
${JSON.stringify(ld)}
</script>
<!--/head-->
<!--body-->
<main id="main" class="faq-page">
  <!--ICONS-->
  <section class="c-top fq-top" aria-labelledby="fq-h">
    <svg class="ab-spark ab-spark--a" aria-hidden="true"><use href="#i-spark"/></svg>
    <svg class="ab-spark ab-spark--b" aria-hidden="true"><use href="#i-spark"/></svg>
    <div class="wrap">
      <nav aria-label="مسار التنقل"><ol class="crumbs"><li><a href="/">الرئيسية</a></li><li><span aria-current="page">الأسئلة الشائعة</span></li></ol></nav>
      <h1 id="fq-h">الأسئلة الشائعة <span class="g1">عن خدمات وهج</span></h1>
      <p class="c-lead">${total} سؤال وجواب عن الحجز والأسعار وكل خدمة. ابحث عن سؤالك أو اختر القسم.</p>
      <label class="fq-search"><svg class="ico" aria-hidden="true"><use href="#s-search"/></svg><span class="sr-only">ابحث في الأسئلة</span><input id="fq-q" type="search" placeholder="مثال: تقسيط، مكيفات، بقع الكنب" autocomplete="off"></label>
    </div>
  </section>

  <section class="c-body fq-body">
    <div class="wrap">
      <div class="fq-chips" role="group" aria-label="أقسام الأسئلة">
        <button type="button" class="chip" aria-pressed="true" data-g="all">الكل<span>${total}</span></button>
        ${groups.map(g => `<button type="button" class="chip" aria-pressed="false" data-g="${g.id}">${g.name}<span>${g.qa.length}</span></button>`).join('\n        ')}
      </div>
      <p class="fq-count" id="fq-count" aria-live="polite"></p>
      ${groups.map(g => `<section class="fq-group" data-group="${g.id}" aria-labelledby="g-${g.id}">
        <div class="fq-gh"><span class="fq-gi"><svg><use href="#${g.icon}"/></svg></span><h2 id="g-${g.id}">${g.name}</h2>${g.href ? `<a class="link" href="${g.href}">صفحة الخدمة<svg class="ico"><use href="#i-arrow"/></svg></a>` : ''}</div>
        <div class="faq">
          ${g.qa.map(([q, a]) => `<details><summary>${esc(q)}<span class="pm" aria-hidden="true"></span></summary><p>${esc(a)}</p></details>`).join('\n          ')}
        </div>
      </section>`).join('\n      ')}
      <div class="empty fq-empty" id="fq-empty" hidden>
        <svg class="ico"><use href="#s-search"/></svg><b>ما لقينا سؤال بهذي الكلمات</b><p>جرّب كلمة ثانية، أو اسألنا مباشرة ونرد عليك.</p>
        <a class="btn btn--wa" href="https://wa.me/966550771338"><svg class="ico"><use href="#i-wa"/></svg>اسألنا على واتساب</a>
      </div>
    </div>
  </section>

  <section class="section" aria-labelledby="band-h">
    <div class="wrap">
      <div class="band">
        <svg class="band__spark" aria-hidden="true"><use href="#i-spark"/></svg>
        <div><h2 id="band-h">ما لقيت جواب سؤالك؟</h2><p>راسلنا على واتساب ونرد عليك.</p></div>
        <div class="band__cta">
          <a class="btn btn--wa" href="https://wa.me/966550771338"><svg class="ico"><use href="#i-wa"/></svg>اسألنا على واتساب</a>
          <a class="btn btn--ghost" href="tel:0550771338"><svg class="ico"><use href="#i-phone"/></svg><span dir="ltr">0550771338</span></a>
        </div>
      </div>
    </div>
  </section>
</main>
<script>
(() => {
  const q = document.getElementById('fq-q'), chips = document.querySelector('.fq-chips');
  const groups = [...document.querySelectorAll('.fq-group')];
  let g = 'all';
  const norm = s => s.toLowerCase().replace(/[\\u064B-\\u0652]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
  function apply() {
    const words = norm(q.value.trim()).split(/\\s+/).filter(Boolean);
    let shown = 0;
    groups.forEach(sec => {
      let n = 0;
      const inGroup = g === 'all' || sec.dataset.group === g;
      sec.querySelectorAll('details').forEach(d => {
        const t = norm(d.textContent);
        const ok = inGroup && words.every(w => t.includes(w));
        d.hidden = !ok; if (ok) n++;
        if (words.length && ok) d.open = true;
      });
      sec.hidden = !n; shown += n;
    });
    document.getElementById('fq-empty').hidden = shown > 0;
    document.getElementById('fq-count').textContent = words.length || g !== 'all' ? \`\${shown} سؤال\` : '';
  }
  q.addEventListener('input', apply);
  chips.addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    g = b.dataset.g;
    chips.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(c === b)));
    apply();
  });
  const first = document.querySelector('.fq-group details'); if (first) first.open = true;
})();
</script>
<!--/body-->
`;
fs.writeFileSync(path.join(root, 'pages', 'faq.html'), html);
console.log('wrote pages/faq.html with', total, 'questions in', groups.length, 'groups');
