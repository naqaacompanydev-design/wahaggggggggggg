// Generates pages/services/<slug>.html for every service in services-data.mjs, then run build.mjs.
// Run: node tools/services.mjs && node tools/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { services, SITE } from './services-data.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scene = k => fs.readFileSync(path.join(root, 'pages/scenes', `${k}.svg`), 'utf8').trim();
const j = v => JSON.stringify(v);

const ICONS = fs.readFileSync(path.join(root, 'pages/partials/icons.svg'), 'utf8').trim();

const CHIPS = {
  'home-villa-cleaning': [['s-shield','تنظيف شامل <b>وتعقيم</b>'],['i-pin','كل <b>أحياء الرياض</b>'],['i-spark','قسّط مع <b>تابي وتمارا</b>']],
  'sofa-carpet-cleaning': [['s-sofa','كنب من <b>99 ريال</b>'],['s-majlis','مجلس كامل <b>149 ريال</b>'],['s-drop','غسيل <b>وتجفيف وتعطير</b>']],
  'office-cleaning': [['s-desk','مكاتب <b>وشركات</b>'],['s-shield','تعقيم <b>الأسطح</b>'],['i-clock','وقت يناسب <b>دوامكم</b>']],
  'ac-cleaning': [['s-ac','3 مكيفات <b>بـ 99 ريال</b>'],['s-filter','غسيل <b>الفلاتر</b>'],['s-wind','هواء <b>أنظف</b>']],
  'pest-control': [['s-shield','مبيدات <b>آمنة ومعتمدة</b>'],['s-bug','صراصير <b>ونمل وبق</b>'],['i-pin','كل <b>أحياء الرياض</b>']],
  'shop-cleaning': [['s-glass','واجهات <b>زجاجية</b>'],['s-door','تنظيف <b>قبل الافتتاح</b>'],['i-pin','كل <b>أحياء الرياض</b>']],
  'post-construction-cleaning': [['s-paint','إزالة <b>بقايا الدهان</b>'],['s-floor','تلميع <b>البلاط</b>'],['s-door','جاهز <b>للسكن</b>']],
};

for (const s of services) {
  const url = `${SITE}/services/${s.slug}/`;
  const wa = `https://wa.me/966550771338?text=${encodeURIComponent(s.wa)}`;
  const ld = {
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'Service', name: `${s.short} بالرياض`, serviceType: s.short, provider: { '@type': 'HouseCleaningService', name: 'وهج لخدمات التنظيف', telephone: '+966550771338', url: `${SITE}/` }, areaServed: { '@type': 'City', name: 'الرياض' } },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'خدماتنا', item: `${SITE}/services/` },
        { '@type': 'ListItem', position: 3, name: s.short, item: url }] },
      { '@type': 'FAQPage', mainEntity: s.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    ],
  };
  const [f0] = s.items;
  const others = services.filter(o => o.slug !== s.slug).map(o =>
    `<a class="other" href="/services/${o.slug}/"><img src="/assets/old/${o.img}" alt="" loading="lazy">${o.short}</a>`).join('\n        ');

  const html = `<!--meta
${j({ out: `services/${s.slug}/index.html`, title: s.metaTitle, description: s.description, canonical: url, current: '/services/' })}
-->
<!--head-->
<link rel="stylesheet" href="/assets/service.css">
<script src="/assets/service.js" defer></script>
<script type="application/ld+json">
${j(ld)}
</script>
<!--/head-->
<!--body-->
<main id="main">
  ${ICONS}
  <section class="o-hero" aria-labelledby="hero-h">
    <div class="wrap">
      <nav aria-label="مسار التنقل"><ol class="crumbs"><li><a href="/">الرئيسية</a></li><li><a href="/services/">خدماتنا</a></li><li><span aria-current="page">${s.short}</span></li></ol></nav>
      <div class="o-grid">
        <p class="o-status"><span class="o-dot" aria-hidden="true"></span><svg class="ico" id="o-tod" aria-hidden="true"><use href="#i-sun"/></svg><b id="o-greet">أهلاً</b><span>راسلنا ونرد عليك بالسعر والموعد</span></p>
        <h1 id="hero-h">${s.h1[0]} <span class="g1">${s.h1[1]}</span> <span class="g2">${s.h1[2]}</span></h1>
        <p class="tw">ننظف <b id="tw" data-words='${j(s.items.map(x => x[2]))}'>${f0[2]}</b><span class="caret" aria-hidden="true"></span></p>
        <div class="o-stage">
          <div class="s-art">
            <div class="scene ${s.scene === 'home' ? 'sc-home' : `sc-gen sc-${s.scene}`}" aria-hidden="true">${scene(s.scene)}</div>
            ${CHIPS[s.slug].map(([ic, txt], i) => `<span class="fchip fchip--${'abc'[i]}"><svg class="ico" aria-hidden="true"><use href="#${ic}"/></svg><span>${txt}</span></span>`).join('')}
          </div>
        </div>
        <p class="o-lead">${s.lead}</p>
        <div class="o-cta">
          <a class="btn btn--wa" href="${wa}"><svg class="ico"><use href="#i-wa"/></svg>احجز عبر واتساب</a>
          <a class="btn btn--ghost" href="tel:0550771338"><svg class="ico"><use href="#i-phone"/></svg>اتصل: <span dir="ltr">0550771338</span></a>
        </div>
        <div class="o-pay">قسّط فاتورتك مع<img src="/assets/img/tabby.webp" width="288" height="88" alt="تابي"><img src="/assets/img/tamara.webp" width="288" height="88" alt="تمارا"></div>
      </div>
    </div>
  </section>

  <section class="section" aria-labelledby="about-h">
    <div class="wrap about">
      <div class="about__text">
        <h2 id="about-h">نبذة عن خدمة ${s.short} بالرياض</h2>
        ${s.about.map(p => `<p>${p}</p>`).join('\n        ')}
        <ul class="about__tags" aria-label="كلمات مرتبطة">${s.tags.map(t => `<li>${t}</li>`).join('')}</ul>
      </div>
      <figure class="about__img"><img src="/assets/old/${s.img}" alt="${s.imgAlt}" loading="lazy"></figure>
    </div>
  </section>

  <section class="section section--tint" aria-labelledby="incl-h">
    <div class="wrap incl">
      <div class="incl__side">
        <h2 id="incl-h">${s.inclH}</h2>
        <p>${s.inclP}</p>
        <a class="btn btn--wa" href="${wa}"><svg class="ico"><use href="#i-wa"/></svg>${s.inclBtn}</a>
      </div>
      <div class="rooms">
        ${s.rooms.map(([t, ic, li]) => `<div class="room"><h3><svg class="ico"><use href="#${ic}"/></svg>${t}</h3><ul>${li.map(x => `<li><svg class="ico"><use href="#i-check"/></svg>${x}</li>`).join('')}</ul></div>`).join('\n        ')}
      </div>
    </div>
  </section>

  <section class="section" aria-labelledby="steps-h">
    <div class="wrap">
      <div class="head" style="justify-content:center;text-align:center"><div><h2 id="steps-h">${s.stepsH}</h2><p style="margin-inline:auto">أربع خطوات من أول رسالة إلى مكان نظيف.</p></div></div>
      <ol class="steps">
        <li class="step"><span class="step__n">1</span><h3>راسلنا على واتساب</h3><p>${s.step1}</p></li>
        <li class="step"><span class="step__n">2</span><h3>نحدد السعر والموعد</h3><p>نرد عليك بالسعر ونتفق على الوقت المناسب.</p></li>
        <li class="step"><span class="step__n">3</span><h3>يصلك الفريق</h3><p>فريق متخصص بمعداته وموادّه في الموعد.</p></li>
        <li class="step"><span class="step__n">4</span><h3>تستلم المكان نظيف</h3><p>نراجع معك كل زاوية قبل ما نطلع.</p></li>
      </ol>
    </div>
  </section>

  <section class="section section--tint" aria-labelledby="areas-h">
    <div class="wrap">
      <div class="head"><div><h2 id="areas-h">${s.areasH}</h2><p>نوصل لك أينما كنت في الرياض.</p></div></div>
      <div class="areas">
        <div class="area"><h3><svg class="ico"><use href="#i-pin"/></svg>شمال الرياض</h3><ul><li>الملقا</li><li>النرجس</li><li>الياسمين</li><li>حطين</li><li>الصحافة</li><li>العقيق</li><li>القيروان</li><li>الربيع</li><li>النخيل</li><li>الغدير</li></ul></div>
        <div class="area"><h3><svg class="ico"><use href="#i-pin"/></svg>شرق الرياض</h3><ul><li>الروضة</li><li>قرطبة</li><li>اليرموك</li><li>النسيم</li><li>الريان</li><li>الحمراء</li><li>المونسية</li><li>الرمال</li></ul></div>
        <div class="area"><h3><svg class="ico"><use href="#i-pin"/></svg>وسط الرياض</h3><ul><li>العليا</li><li>السليمانية</li><li>الملز</li><li>المربع</li><li>الورود</li><li>الملك فهد</li><li>المروج</li></ul></div>
        <div class="area"><h3><svg class="ico"><use href="#i-pin"/></svg>غرب الرياض</h3><ul><li>عرقة</li><li>السويدي</li><li>ظهرة لبن</li><li>البديعة</li><li>لبن</li><li>نمار</li><li>الحزم</li></ul></div>
        <div class="area"><h3><svg class="ico"><use href="#i-pin"/></svg>جنوب الرياض</h3><ul><li>الشفا</li><li>العزيزية</li><li>الدار البيضاء</li><li>بدر</li><li>المروة</li><li>العريجاء</li></ul></div>
      </div>
    </div>
  </section>

  <section class="section" aria-labelledby="faq-h">
    <div class="wrap faq">
      <h2 id="faq-h">${s.faqH}</h2>
      ${s.faq.map(([q, a], i) => `<details${i ? '' : ' open'}><summary>${q}<span class="pm" aria-hidden="true"></span></summary><p>${a}</p></details>`).join('\n      ')}
    </div>
  </section>

  <section class="section section--tint" aria-labelledby="oth-h">
    <div class="wrap">
      <div class="head"><div><h2 id="oth-h">خدمات تنظيف أخرى من وهج</h2></div><a class="link" href="/services/">كل الخدمات<svg class="ico"><use href="#i-arrow"/></svg></a></div>
      <div class="others">
        ${others}
      </div>
    </div>
  </section>

  <section class="section" aria-labelledby="band-h">
    <div class="wrap">
      <div class="band">
        <svg class="band__spark" aria-hidden="true"><use href="#i-spark"/></svg>
        <div><h2 id="band-h">${s.band[0]}</h2><p>${s.band[1]}</p></div>
        <div class="band__cta">
          <a class="btn btn--wa" href="${wa}"><svg class="ico"><use href="#i-wa"/></svg>احجز عبر واتساب</a>
          <a class="btn btn--ghost" href="tel:0550771338"><svg class="ico"><use href="#i-phone"/></svg><span dir="ltr">0550771338</span></a>
        </div>
      </div>
    </div>
  </section>
</main>
<!--/body-->
`;
  fs.writeFileSync(path.join(root, 'pages/services', `${s.slug}.html`), html);
  console.log('wrote pages/services/' + s.slug + '.html');
}
