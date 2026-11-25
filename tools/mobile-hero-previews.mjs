// 5 phone-only homepage hero proposals: /preview/m1/ … /preview/m5/
// Desktop keeps the current hero; on phones the proposal replaces it. Not exported to dist.
// Run: node tools/mobile-hero-previews.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const WA = 'https://wa.me/966550771338?text=' + encodeURIComponent('السلام عليكم، أبغى أحجز خدمة تنظيف');
const HERO = `<img src="/assets/img/hero-tech-960.webp" width="960" height="640" alt="فني من وهج بزي وهج الأزرق ينظف زجاج نافذة في الرياض" fetchpriority="high">`;
const PAY = `<span class="mh-pay"><img src="/assets/old/tabby.png" alt="تابي"><img src="/assets/old/tamara.png" alt="تمارا"></span>`;
const SV = [
  ['المنازل والفلل', '/services/home-villa-cleaning/', '6a53ab878becf.png'],
  ['الكنب والسجاد', '/services/sofa-carpet-cleaning/', '6a53aaa518e00.png'],
  ['المكيفات', '/services/ac-cleaning/', '6a53b95818aec.png'],
  ['المكاتب', '/services/office-cleaning/', '6a53b70f7270b.png'],
  ['رش المبيدات', '/services/pest-control/', '6a53b8666269b.png'],
  ['المحلات', '/services/shop-cleaning/', '6a53bc0dab095.png'],
];
const img = f => `/assets/old/${f}`;
const wa = (t = 'احجز عبر واتساب') => `<a class="mh-btn mh-btn--wa" href="${WA}"><svg class="ico" aria-hidden="true"><use href="#i-wa"/></svg>${t}</a>`;

const base = `
@media (min-width:901px){.mh{display:none}}
@media (max-width:900px){
.hp-a,.hp-a+svg{display:none}
.mh{position:relative;overflow:hidden}
.mh h1{font-weight:800;letter-spacing:0}
.mh-btn{display:flex;align-items:center;justify-content:center;gap:10px;height:54px;border-radius:16px;font-weight:800;font-size:17px;width:100%}
.mh-btn .ico{width:22px;height:22px}
.mh-btn--wa{background:#1F8A4C;color:#fff;box-shadow:0 10px 24px -12px rgba(31,138,76,.9)}
.mh-btn--wa:active{transform:scale(.98)}
.mh-pay{display:inline-flex;gap:8px;align-items:center}
.mh-pay img{height:30px;width:auto;background:#fff;border-radius:8px;padding:3px 7px}
}
.pv-bar{position:sticky;top:0;z-index:99;background:#FFE8A8;color:#5A3D00;text-align:center;font-weight:800;font-size:13px;padding:5px 10px}
@media (prefers-reduced-motion:reduce){.mh *{animation:none!important;transition:none!important}}`;

const V = {
  m1: {
    name: '1: الصورة كاملة',
    css: `
.m1{height:calc(100svh - 64px - 72px - 26px);min-height:560px;background:#131833;color:#fff}
.m1 .m1-img{position:absolute;inset:0}
.m1 .m1-img img{width:100%;height:100%;object-fit:cover;object-position:64% 30%;animation:m1zoom 9s ease-out both}
@keyframes m1zoom{from{transform:scale(1.12)}to{transform:scale(1)}}
.m1::after{content:"";position:absolute;inset:0;background:linear-gradient(to top,#131833 8%,rgba(19,24,51,.85) 36%,rgba(19,24,51,0) 62%)}
.m1-in{position:absolute;inset-inline:16px;bottom:18px;z-index:2;display:grid;gap:14px}
.m1 h1{font-size:38px;line-height:1.2}
.m1 h1 b{display:block;color:#96CC8A;min-height:1.2em}
.m1-row{display:flex;align-items:center;justify-content:space-between;font-size:13px;font-weight:700;color:#C9D3EA}
.m1-pin{position:absolute;top:14px;inset-inline-start:14px;z-index:2;display:inline-flex;gap:6px;align-items:center;background:rgba(19,24,51,.7);backdrop-filter:blur(8px);border-radius:999px;padding:6px 12px;font-size:12.5px;font-weight:700}
.m1-pin i{width:8px;height:8px;border-radius:50%;background:#5BD68A;box-shadow:0 0 0 4px rgba(91,214,138,.25)}`,
    html: `<section class="mh m1" aria-labelledby="mh-h">
  <div class="m1-img">${HERO}</div>
  <span class="m1-pin"><i></i>فريقنا شغّال اليوم في الرياض</span>
  <div class="m1-in">
    <h1 id="mh-h">ننظف <b class="mh-tw" data-words='["البيوت والفلل","الكنب والمجالس","المكيفات","المكاتب والشركات","المحلات والواجهات"]'>البيوت والفلل</b></h1>
    ${wa()}
    <div class="m1-row"><span>قسّط بدون فوائد</span>${PAY}</div>
  </div>
</section>`,
  },
  m2: {
    name: '2: اختار خدمتك',
    css: `
.m2{background:#fff;padding:22px 16px 20px;color:#1E2546}
.m2 h1{font-size:30px;line-height:1.3;color:#1E2546}
.m2 p.m2-sub{margin-top:6px;color:#5C6684;font-size:15px}
.m2-grid{margin-top:18px;display:grid;grid-template-columns:1fr 1fr;gap:10px}
.m2-grid a{position:relative;display:block;height:118px;border-radius:18px;overflow:hidden;isolation:isolate}
.m2-grid a:first-child{grid-column:span 2;height:150px}
.m2-grid img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2}
.m2-grid a::after{content:"";position:absolute;inset:0;background:linear-gradient(to top,rgba(30,37,70,.88),rgba(30,37,70,0) 60%);z-index:-1}
.m2-grid span{position:absolute;bottom:10px;inset-inline:12px;color:#fff;font-weight:800;font-size:15.5px;display:flex;justify-content:space-between;align-items:center}
.m2-grid span svg{width:16px;height:16px}
.m2-foot{margin-top:14px;display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:700;color:#5C6684}`,
    html: `<section class="mh m2" aria-labelledby="mh-h">
  <h1 id="mh-h">وش تبي ننظف اليوم؟</h1>
  <p class="m2-sub">اختار الخدمة ونرد عليك بالسعر والموعد.</p>
  <div class="m2-grid">
    ${SV.filter((_, i) => i !== 4).map(([n, u, f]) => `<a href="${u}"><img src="${img(f)}" alt="" loading="eager"><span>${n}<svg aria-hidden="true"><use href="#i-arrow"/></svg></span></a>`).join('\n    ')}
  </div>
  <div class="m2-foot"><span>قسّط فاتورتك مع</span>${PAY}</div>
</section>`,
  },
  m3: {
    name: '3: قبل وبعد (اسحب)',
    css: `
.m3{background:linear-gradient(180deg,#EAF3FB,#fff 70%);padding:22px 16px 20px;text-align:center;color:#1E2546}
.m3 h1{font-size:32px;line-height:1.25}
.m3 h1 span{color:#2C70A8}
.m3-ba{--x:50%;position:relative;margin-top:16px;height:400px;border-radius:24px;overflow:hidden;touch-action:pan-y;user-select:none;box-shadow:0 24px 48px -24px rgba(44,112,168,.6)}
.m3-ba img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:64% 30%;pointer-events:none}
.m3-dirty{position:absolute;inset:0;clip-path:inset(0 0 0 var(--x))}
.m3-dirty img{filter:sepia(.9) saturate(.5) brightness(.62) contrast(.85) blur(1px)}
.m3-dirty::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 30% 40%,rgba(110,84,40,.35),transparent 40%),radial-gradient(circle at 70% 70%,rgba(90,70,40,.3),transparent 35%)}
.m3-line{position:absolute;top:0;bottom:0;left:var(--x);width:3px;background:#fff;transform:translateX(-50%)}
.m3-knob{position:absolute;top:50%;left:var(--x);width:48px;height:48px;border-radius:50%;background:#fff;transform:translate(-50%,-50%);display:grid;place-items:center;color:#2C70A8;font-weight:900;font-size:18px;box-shadow:0 8px 20px rgba(0,0,0,.3)}
.m3-tag{position:absolute;top:12px;background:rgba(19,24,51,.75);color:#fff;font-size:12.5px;font-weight:800;border-radius:999px;padding:4px 12px}
.m3-tag--a{right:12px}.m3-tag--b{left:12px;background:#96CC8A;color:#1E2546}
.m3-hint{margin-top:10px;font-size:13px;color:#5C6684;font-weight:600}
.m3 .mh-btn{margin-top:14px}
.m3-pay{margin-top:12px;display:flex;justify-content:center;gap:10px;align-items:center;font-size:13px;font-weight:700;color:#5C6684}`,
    html: `<section class="mh m3" aria-labelledby="mh-h">
  <h1 id="mh-h">الفرق يبان <span>من أول زيارة</span></h1>
  <div class="m3-ba" id="m3ba">
    ${HERO}
    <div class="m3-dirty" aria-hidden="true">${HERO.replace('fetchpriority="high"', '')}</div>
    <span class="m3-line"></span><span class="m3-knob" aria-hidden="true">⇆</span>
    <span class="m3-tag m3-tag--a">قبل</span><span class="m3-tag m3-tag--b">بعد وهج</span>
  </div>
  <p class="m3-hint">اسحب الخط وشوف الفرق</p>
  ${wa()}
  <div class="m3-pay"><span>قسّط مع</span>${PAY}</div>
</section>`,
    js: `(()=>{const b=document.getElementById('m3ba');if(!b)return;const set=e=>{const r=b.getBoundingClientRect();const x=Math.min(95,Math.max(5,((e.touches?e.touches[0].clientX:e.clientX)-r.left)/r.width*100));b.style.setProperty('--x',x+'%')};let d=0;b.addEventListener('pointerdown',e=>{d=1;set(e)});addEventListener('pointerup',()=>d=0);b.addEventListener('pointermove',e=>d&&set(e));b.addEventListener('touchmove',set,{passive:true});
if(!matchMedia('(prefers-reduced-motion: reduce)').matches){let t=0;const id=setInterval(()=>{t+=.05;b.style.setProperty('--x',(50+28*Math.sin(t))+'%');if(t>6.3){clearInterval(id);b.style.setProperty('--x','50%')}},30);b.addEventListener('pointerdown',()=>clearInterval(id),{once:true})}})();`,
  },
  m4: {
    name: '4: كوبونات العروض',
    css: `
.m4{background:#2C70A8;background:linear-gradient(160deg,#2C70A8,#3D4770);padding:22px 0 20px;color:#fff}
.m4 h1{font-size:30px;line-height:1.3;padding-inline:16px}
.m4 p.m4-sub{padding-inline:16px;margin-top:6px;color:#D6E4F5;font-size:15px}
.m4-rail{margin-top:18px;display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;padding:4px 16px 8px;scrollbar-width:none}
.m4-rail::-webkit-scrollbar{display:none}
.m4-t{flex:0 0 82%;scroll-snap-align:center;background:#fff;color:#1E2546;border-radius:20px;position:relative;overflow:hidden}
.m4-t img{width:100%;height:150px;object-fit:cover;display:block}
.m4-t .m4-b{padding:14px 16px 16px;border-top:2px dashed #D5DDEB;position:relative}
.m4-t .m4-b::before,.m4-t .m4-b::after{content:"";position:absolute;top:-12px;width:22px;height:22px;border-radius:50%;background:#2F65A0}
.m4-t .m4-b::before{left:-11px}.m4-t .m4-b::after{right:-11px}
.m4-t h2{font-size:16.5px;font-weight:800;line-height:1.45}
.m4-p{display:flex;align-items:baseline;gap:6px;margin-top:8px}
.m4-p b{font-size:40px;font-weight:800;color:#2C70A8;line-height:1}
.m4-p span{font-weight:700;color:#5C6684}
.m4-p s{margin-inline-start:auto;color:#96A0B8;font-weight:600}
.m4-dots{display:flex;justify-content:center;gap:6px;margin-top:6px}
.m4-dots i{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.4)}.m4-dots i:first-child{width:20px;border-radius:4px;background:#96CC8A}
.m4-cta{padding:14px 16px 0;display:grid;gap:12px}
.m4-pay{display:flex;justify-content:center;gap:10px;align-items:center;font-size:13px;font-weight:700;color:#D6E4F5}`,
    html: `<section class="mh m4" aria-labelledby="mh-h">
  <h1 id="mh-h">عروض تنظيف الرياض هذا الشهر</h1>
  <p class="m4-sub">اسحب وشوف العروض، واحجز اللي يناسبك.</p>
  <div class="m4-rail">
    <article class="m4-t"><img src="${img('6a53aaa518e00.png')}" alt=""><div class="m4-b"><h2>غسيل وتجفيف وتعطير طقم كنب 5 أشخاص</h2><div class="m4-p"><b>99</b><span>ريال</span></div></div></article>
    <article class="m4-t"><img src="${img('6a53b95818aec.png')}" alt=""><div class="m4-b"><h2>غسيل 3 مكيفات سبليت</h2><div class="m4-p"><b>99</b><span>ريال</span></div></div></article>
    <article class="m4-t"><img src="${img('6a53ab878becf.png')}" alt=""><div class="m4-b"><h2>غسيل مجلس كامل للمساحات 4×4 و 5×4</h2><div class="m4-p"><b>149</b><span>ريال</span></div></div></article>
  </div>
  <div class="m4-dots" aria-hidden="true"><i></i><i></i><i></i></div>
  <div class="m4-cta">${wa('احجز العرض عبر واتساب')}<div class="m4-pay"><span>قسّط بدون فوائد</span>${PAY}</div></div>
</section>`,
  },
  m5: {
    name: '5: ستوريز الخدمات',
    css: `
.m5{background:#fff;padding:16px 0 20px;color:#1E2546}
.m5-ring{display:flex;gap:14px;overflow-x:auto;padding:0 16px 4px;scrollbar-width:none}
.m5-ring::-webkit-scrollbar{display:none}
.m5-ring a{flex:0 0 auto;display:grid;justify-items:center;gap:6px;font-size:12px;font-weight:700;width:66px;text-align:center;color:#3D4770}
.m5-ring span{width:62px;height:62px;border-radius:50%;padding:3px;background:linear-gradient(135deg,#2C70A8,#96CC8A)}
.m5-ring a.on span{box-shadow:0 0 0 3px #fff,0 0 0 5px #96CC8A}
.m5-ring img{width:100%;height:100%;border-radius:50%;object-fit:cover;border:3px solid #fff}
.m5-story{position:relative;margin:14px 16px 0;height:430px;border-radius:26px;overflow:hidden;background:#131833;color:#fff}
.m5-story img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:opacity .5s}
.m5-story::after{content:"";position:absolute;inset:0;background:linear-gradient(to top,rgba(19,24,51,.95) 10%,rgba(19,24,51,0) 55%),linear-gradient(to bottom,rgba(19,24,51,.5),transparent 22%)}
.m5-bars{position:absolute;top:12px;inset-inline:12px;display:flex;gap:4px;z-index:2}
.m5-bars i{flex:1;height:3px;border-radius:2px;background:rgba(255,255,255,.35);overflow:hidden}
.m5-bars i b{display:block;height:100%;width:0;background:#fff}
.m5-bars i.done b{width:100%}
.m5-bars i.on b{animation:m5bar 3.2s linear forwards}
@keyframes m5bar{to{width:100%}}
.m5-who{position:absolute;top:24px;inset-inline-start:12px;z-index:2;display:flex;align-items:center;gap:8px;font-weight:800;font-size:13px}
.m5-who img{position:static;width:30px;height:30px;border-radius:50%;background:#fff;object-fit:contain;padding:2px}
.m5-cap{position:absolute;bottom:16px;inset-inline:16px;z-index:2;display:grid;gap:12px}
.m5-cap h1{font-size:30px;line-height:1.25}
.m5-cap h1 b{display:block;color:#96CC8A}
.m5-pay{display:flex;justify-content:center;gap:10px;align-items:center;margin-top:12px;font-size:13px;font-weight:700;color:#5C6684}`,
    html: `<section class="mh m5" aria-labelledby="mh-h">
  <div class="m5-ring">
    ${SV.map(([n, u, f], i) => `<a href="${u}"${i ? '' : ' class="on"'}><span><img src="${img(f)}" alt=""></span>${n}</a>`).join('\n    ')}
  </div>
  <div class="m5-story" id="m5s">
    ${SV.map(([n, u, f], i) => `<img src="${i ? img(f) : '/assets/img/hero-tech-960.webp'}" alt="" style="opacity:${i ? 0 : 1}" data-n="${n}">`).join('')}
    <div class="m5-bars">${SV.map((_, i) => `<i${i ? '' : ' class="on"'}><b></b></i>`).join('')}</div>
    <div class="m5-who"><img src="/assets/logo.webp" alt="">وهج لخدمات التنظيف</div>
    <div class="m5-cap"><h1 id="mh-h">ننظف <b id="m5n">المنازل والفلل</b></h1>${wa()}</div>
  </div>
  <div class="m5-pay"><span>قسّط فاتورتك مع</span>${PAY}</div>
</section>`,
    js: `(()=>{const s=document.getElementById('m5s');if(!s||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const im=[...s.querySelectorAll(':scope>img')],bars=[...s.querySelectorAll('.m5-bars i')],ring=[...document.querySelectorAll('.m5-ring a')],n=document.getElementById('m5n');let k=0;setInterval(()=>{bars[k].className='done';im[k].style.opacity=0;ring[k].classList.remove('on');k=(k+1)%im.length;if(!k)bars.forEach(b=>b.className='');im[k].style.opacity=1;bars[k].className='on';ring[k].classList.add('on');n.textContent=im[k].dataset.n},3200)})();`,
  },
};

const typer = `(()=>{document.querySelectorAll('.mh-tw').forEach(async el=>{const w=JSON.parse(el.dataset.words);if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const z=t=>new Promise(r=>setTimeout(r,t));let i=0;for(;;){await z(1800);const c=w[i];for(let k=c.length;k>=0;k--){el.textContent=c.slice(0,k)||'\\u200b';await z(30)}i=(i+1)%w.length;for(let k=1;k<=w[i].length;k++){el.textContent=w[i].slice(0,k);await z(65)}}})})();`;

const at = home.indexOf('  <section class="o-hero hp-a"');
if (at < 0) throw new Error('hero not found');
for (const [k, v] of Object.entries(V)) {
  const html = (home.slice(0, at) + v.html + '\n' + home.slice(at))
    .replace('</head>', `<meta name="robots" content="noindex">\n<style>${base}${v.css}</style>\n</head>`)
    .replace('<a class="skip"', `<div class="pv-bar">اقتراح ${v.name}</div>\n<a class="skip"`)
    .replace('</body>', `<script>${typer}${v.js || ''}</script>\n</body>`);
  const out = path.join(root, 'preview', k, 'index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  console.log('wrote', path.relative(root, out));
}
