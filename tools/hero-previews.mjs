// Builds 3 homepage-hero directions as preview pages: /preview/hero-a/, /preview/hero-b/, /preview/hero-c/
// Each is the real homepage with only the hero swapped. Not exported to dist. Run: node tools/hero-previews.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const icons = fs.readFileSync(path.join(root, 'pages/partials/icons.svg'), 'utf8');
const start = home.indexOf('  <section class="hero"');
const end = home.indexOf('</section>', start) + '</section>'.length;

const WA = 'https://wa.me/966550771338?text=' + encodeURIComponent('السلام عليكم، أبغى أحجز خدمة تنظيف');
const IMG = `<img src="/assets/img/hero-tech.webp" srcset="/assets/img/hero-tech-600.webp 600w, /assets/img/hero-tech-960.webp 960w, /assets/img/hero-tech.webp 1536w" sizes="(max-width: 900px) 100vw, 50vw" width="1536" height="1024" alt="فني من وهج بزي وهج الأزرق ينظف زجاج نافذة في الرياض" fetchpriority="high"`;
const spark = '<svg aria-hidden="true"><use href="#i-spark"/></svg>';

const variants = {
  a: {
    name: 'A: «من العتمة للوهج» بنفس أسلوب صفحات الخدمات',
    css: `
.hp-a .hp-frame{position:relative;border-radius:28px 28px 28px 120px;overflow:hidden;aspect-ratio:4/4.3;box-shadow:0 0 0 3px #131833,0 0 0 5px rgba(150,204,138,.7),0 30px 80px -20px rgba(0,0,0,.7)}
.hp-a .hp-frame img{width:100%;height:100%;object-fit:cover;object-position:66% 30%}
.hp-a .s-art{width:min(500px,100%)}
.hp-a .o-hero__sp{position:absolute;color:#96CC8A;z-index:2}
.hp-a .o-hero__sp svg{width:100%;height:100%;display:block}
.hp-a .sp1{width:46px;height:46px;top:-16px;inset-inline-start:-14px}.hp-a .sp2{width:22px;height:22px;top:40px;inset-inline-start:30px;color:#7FB6E6}
@media (prefers-reduced-motion:no-preference){.hp-a .o-hero__sp{animation:o-tw 2.6s ease-in-out infinite}.hp-a .sp2{animation-delay:-1.3s}}
@media (max-width:900px){.hp-a .s-art{width:min(340px,90vw)}.hp-a .o-cta{display:flex}.hp-a .o-cta .btn--ghost{display:none}}`,
    html: `  <section class="o-hero hp-a" aria-labelledby="hero-h">
    <div class="wrap">
      <div class="o-grid">
        <p class="o-status"><span class="o-dot" aria-hidden="true"></span><svg class="ico" id="o-tod" aria-hidden="true"><use href="#i-sun"/></svg><b id="o-greet">أهلاً</b><span>راسلنا ونرد عليك بالسعر والموعد</span></p>
        <h1 id="hero-h">شركة تنظيف بالرياض <span class="g1">تعيد لمكانك وهجه</span></h1>
        <p class="tw">ننظف <b id="tw" data-words='["البيوت والفلل","الكنب والمجالس","المكيفات","المكاتب والشركات","المحلات والواجهات","البيوت الجديدة"]'>البيوت والفلل</b><span class="caret" aria-hidden="true"></span></p>
        <div class="o-stage">
          <div class="s-art">
            <div class="hp-frame">${IMG}></div>
            <span class="o-hero__sp sp1">${spark}</span><span class="o-hero__sp sp2">${spark}</span>
            <span class="fchip fchip--a"><svg class="ico" aria-hidden="true"><use href="#s-sofa"/></svg><span>كنب من <b>99 ريال</b></span></span>
            <span class="fchip fchip--b"><svg class="ico" aria-hidden="true"><use href="#i-pin"/></svg><span>كل <b>أحياء الرياض</b></span></span>
            <span class="fchip fchip--c"><svg class="ico" aria-hidden="true"><use href="#i-spark"/></svg><span>قسّط مع <b>تابي وتمارا</b></span></span>
          </div>
        </div>
        <p class="o-lead">تنظيف منازل وفلل ومكاتب ومحلات، وغسيل كنب ومجالس، وتنظيف مكيفات ورش مبيدات، بطاقم متخصص في جميع أحياء الرياض.</p>
        <div class="o-cta">
          <a class="btn btn--wa" href="${WA}"><svg class="ico"><use href="#i-wa"/></svg>احجز عبر واتساب</a>
          <a class="btn btn--ghost" href="/price-calculator/"><svg class="ico"><use href="#i-calc"/></svg>احسب السعر</a>
        </div>
        <div class="o-pay">قسّط فاتورتك مع<img src="/assets/old/tabby.png" alt="تابي"><img src="/assets/old/tamara.png" alt="تمارا"></div>
      </div>
    </div>
  </section>`,
  },
  b: {
    name: 'B: «المسحة» الصورة تتنضف قدامك',
    css: `
.hp-b{position:relative;min-height:calc(100svh - 116px);display:flex;align-items:center;overflow:hidden;isolation:isolate;background:#131833}
.hp-b__img,.hp-b__dirt{position:absolute;inset:0;z-index:-2}
.hp-b__img img,.hp-b__dirt img{width:100%;height:100%;object-fit:cover;object-position:60% 35%}
.hp-b__dirt{z-index:-1;clip-path:inset(0 0 0 0)}
.hp-b__dirt img{filter:sepia(.55) saturate(.5) brightness(.62) contrast(.9)}
.hp-b__dirt::after{content:"";position:absolute;inset:0;background:radial-gradient(160px 60px at 40% 30%,rgba(110,95,70,.5),transparent),radial-gradient(220px 80px at 70% 70%,rgba(110,95,70,.45),transparent),rgba(120,100,70,.25)}
.hp-b__line{position:absolute;top:0;bottom:0;width:3px;left:0;background:linear-gradient(transparent,#fff,transparent);box-shadow:0 0 24px 6px rgba(150,204,138,.6);z-index:0;opacity:0}
.hp-b__line svg{position:absolute;top:46%;left:50%;width:44px;height:44px;margin:-22px 0 0 -22px;color:#96CC8A}
.hp-b__shade{position:absolute;inset:0;z-index:0;background:linear-gradient(to left,transparent 35%,rgba(19,24,51,.55) 55%,rgba(19,24,51,.92) 78%)}
.hp-b>.wrap{width:100%}
.hp-b__panel{position:relative;z-index:1;margin-inline-start:auto;max-width:560px;color:#fff;padding-block:48px}
.hp-b h1{font-size:clamp(36px,4.4vw,58px);font-weight:800;line-height:1.2}
.hp-b h1 span{color:#96CC8A}
.hp-b__lead{color:#DCE3F2;font-size:18px;margin-top:14px;max-width:44ch}
.hp-b__cta{display:flex;gap:12px;margin-top:26px;flex-wrap:wrap}
.hp-b__cta .btn--ghost{background:rgba(255,255,255,.08);color:#fff;border-color:rgba(255,255,255,.35)}
.hp-b__facts{list-style:none;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:30px}
.hp-b__facts li{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:12px 10px;text-align:center}
.hp-b__facts b{display:block;font-size:20px;font-weight:800;color:#fff}
.hp-b__facts small{font-size:12.5px;color:#AEB9D4}
@media (prefers-reduced-motion:no-preference){
  .hp-b__dirt{animation:hpb-wipe 2.2s .5s cubic-bezier(.6,0,.3,1) forwards}
  .hp-b__line{animation:hpb-line 2.2s .5s cubic-bezier(.6,0,.3,1) forwards}
  .hp-b__panel>*{opacity:0;transform:translateY(12px);animation:rise .7s ease forwards}
  .hp-b__panel>*:nth-child(2){animation-delay:.1s}.hp-b__panel>*:nth-child(3){animation-delay:.2s}.hp-b__panel>*:nth-child(4){animation-delay:.3s}
}
@media (prefers-reduced-motion:reduce){.hp-b__dirt{clip-path:inset(0 0 0 100%)}}
@keyframes hpb-wipe{to{clip-path:inset(0 0 0 100%)}}
@keyframes hpb-line{0%{left:0;opacity:1}90%{opacity:1}100%{left:100%;opacity:0}}
@media (max-width:900px){
  .hp-b{flex-direction:column;align-items:stretch;min-height:0}
  .hp-b__img,.hp-b__dirt,.hp-b__line{position:absolute;inset:0 0 auto 0;height:300px}
  .hp-b__shade{inset:0 0 auto 0;height:300px;background:linear-gradient(transparent 55%,#131833)}
  .hp-b__panel{margin:0;padding:260px 0 28px;text-align:center;max-width:none}
  .hp-b__lead{margin-inline:auto;font-size:16px}
  .hp-b__cta{flex-direction:column}.hp-b__cta .btn{width:100%}
  .hp-b__facts{grid-template-columns:1fr 1fr}
}`,
    html: `  <section class="hp-b" aria-labelledby="hero-h">
    <div class="hp-b__img" aria-hidden="true">${IMG.replace('alt="', 'alt="" data-alt="')}></div>
    <div class="hp-b__dirt" aria-hidden="true">${IMG.replace('alt="', 'alt="" data-alt="').replace(' fetchpriority="high"', '')}></div>
    <span class="hp-b__line" aria-hidden="true">${spark}</span>
    <div class="hp-b__shade" aria-hidden="true"></div>
    <div class="wrap">
      <div class="hp-b__panel">
        <h1 id="hero-h">شركة تنظيف بالرياض <span>تعيد لمكانك وهجه</span></h1>
        <p class="hp-b__lead">من البيوت والمجالس إلى المكاتب والمكيفات: طاقم متخصص يوصلك في كل أحياء الرياض، والنتيجة تشوفها بعينك.</p>
        <div class="hp-b__cta">
          <a class="btn btn--wa" href="${WA}"><svg class="ico"><use href="#i-wa"/></svg>احجز عبر واتساب</a>
          <a class="btn btn--ghost" href="/price-calculator/"><svg class="ico"><use href="#i-calc"/></svg>احسب السعر</a>
        </div>
        <ul class="hp-b__facts">
          <li><b>7</b><small>خدمات تنظيف</small></li>
          <li><b>99 ريال</b><small>عروض الكنب تبدأ من</small></li>
          <li><b>كل الأحياء</b><small>نخدم الرياض كاملة</small></li>
          <li><b>تابي وتمارا</b><small>قسّط فاتورتك</small></li>
        </ul>
      </div>
    </div>
  </section>`,
  },
  c: {
    name: 'C: «اختر مكانك وشوف السعر»',
    css: `
.hp-c .hero__text h1{font-size:clamp(34px,4.2vw,54px)}
.hp-c h1 .hp-c__q{display:block;color:#2C70A8}
.hp-c__chips{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}
.hp-c__chip{display:inline-flex;align-items:center;gap:8px;min-height:48px;padding:0 16px;border:1.5px solid var(--line);border-radius:14px;background:#fff;font-family:inherit;font-weight:700;font-size:15.5px;color:var(--navy);cursor:pointer;transition:border-color .2s,background .2s,transform .15s}
.hp-c__chip svg{width:20px;height:20px;color:var(--blue)}
.hp-c__chip:hover{border-color:#9EC2E6}
.hp-c__chip:active{transform:scale(.97)}
.hp-c__chip[aria-pressed="true"]{border-color:var(--blue);background:#EDF5FC;box-shadow:inset 0 0 0 1px var(--blue)}
.hp-c__res{margin-top:18px;background:#fff;border:1px solid var(--line);border-radius:18px;padding:18px 20px;display:grid;gap:12px;box-shadow:0 20px 44px -30px rgba(31,37,64,.5)}
.hp-c__price{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap}
.hp-c__price span{color:var(--muted);font-weight:600}
.hp-c__price b{font-size:28px;font-weight:800;color:var(--ink)}
.hp-c__price a{font-weight:700;color:var(--blue);font-size:14.5px}
.hp-c__res .btn{width:100%}
.hp-c__pay{display:flex;align-items:center;justify-content:center;gap:8px;font-size:13.5px;color:var(--muted);font-weight:600}
.hp-c__pay img{height:24px;border-radius:6px}
@media (max-width:900px){.hp-c .hero__text{text-align:center}.hp-c__chips{justify-content:center}.hp-c__chip{flex:1 1 calc(50% - 10px);justify-content:center}}`,
    html: `  <section class="hero hp-c" aria-labelledby="hero-h">
    <div class="wrap hero__grid">
      <div class="hero__text">
        <h1 id="hero-h">شركة تنظيف بالرياض <span class="hp-c__q">وش تبي ننظف اليوم؟</span></h1>
        <p class="hero__lead">اختر المكان، وشوف السعر، واحجز على واتساب برسالة جاهزة.</p>
        <div class="hp-c__chips" role="group" aria-label="اختر المكان">
          <button type="button" class="hp-c__chip" aria-pressed="true" data-k="villa"><svg><use href="#s-door"/></svg>فيلا أو شقة</button>
          <button type="button" class="hp-c__chip" aria-pressed="false" data-k="sofa"><svg><use href="#s-sofa"/></svg>كنب ومجالس</button>
          <button type="button" class="hp-c__chip" aria-pressed="false" data-k="ac"><svg><use href="#s-ac"/></svg>مكيفات</button>
          <button type="button" class="hp-c__chip" aria-pressed="false" data-k="office"><svg><use href="#s-desk"/></svg>مكتب أو محل</button>
        </div>
        <div class="hp-c__res" aria-live="polite">
          <div class="hp-c__price"><span id="hpc-l">السعر حسب المساحة</span><b id="hpc-p">احسبه في دقيقة</b><a id="hpc-calc" href="/price-calculator/?s=homes">احسب بالتفصيل</a></div>
          <a class="btn btn--wa" id="hpc-wa" href="${WA}"><svg class="ico"><use href="#i-wa"/></svg>احجز عبر واتساب</a>
          <div class="hp-c__pay">قسّط مع<img src="/assets/old/tabby.png" alt="تابي"><img src="/assets/old/tamara.png" alt="تمارا"></div>
        </div>
      </div>
      <div class="media">
        <div class="media__frame">${IMG}><span class="glint" aria-hidden="true"></span></div>
        <span class="spark spark--a" aria-hidden="true">${spark}</span>
        <span class="spark spark--b" aria-hidden="true">${spark}</span>
        <span class="spark spark--c" aria-hidden="true">${spark}</span>
      </div>
    </div>
  </section>
  <script>
  (() => {
    const D = { villa: ['السعر حسب المساحة', 'احسبه في دقيقة', 'homes', 'تنظيف فيلا أو شقة'], sofa: ['عروض الكنب تبدأ من', '99 ريال', 'sofa', 'غسيل كنب ومجالس'], ac: ['غسيل 3 مكيفات', '99 ريال', 'ac', 'غسيل مكيفات'], office: ['السعر حسب المساحة', 'احسبه في دقيقة', 'office', 'تنظيف مكتب أو محل'] };
    document.querySelector('.hp-c__chips').addEventListener('click', e => {
      const b = e.target.closest('.hp-c__chip'); if (!b) return;
      document.querySelectorAll('.hp-c__chip').forEach(c => c.setAttribute('aria-pressed', String(c === b)));
      const [l, p, s, w] = D[b.dataset.k];
      document.getElementById('hpc-l').textContent = l; document.getElementById('hpc-p').textContent = p;
      document.getElementById('hpc-calc').href = '/price-calculator/?s=' + s;
      document.getElementById('hpc-wa').href = 'https://wa.me/966550771338?text=' + encodeURIComponent('السلام عليكم، أبغى ' + w);
    });
  })();
  </script>`,
  },
};

for (const [k, v] of Object.entries(variants)) {
  let html = home.slice(0, start) + v.html + home.slice(end);
  html = html
    .replace('</head>', `<link rel="stylesheet" href="/assets/service.css">\n<script src="/assets/service.js" defer></script>\n<meta name="robots" content="noindex">\n<style>${v.css}\n.pv-bar{position:sticky;top:0;z-index:99;background:#FFE8A8;color:#5A3D00;text-align:center;font-weight:800;font-size:14px;padding:6px 12px}\n</style>\n</head>`)
    .replace('<a class="skip"', `<div class="pv-bar">معاينة ${v.name}</div>\n${icons}\n<a class="skip"`);
  const out = path.join(root, 'preview', `hero-${k}`, 'index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  console.log('built preview/hero-' + k + '/index.html');
}
