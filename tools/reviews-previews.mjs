// 3 homepage reviews designs with horizontal sliding: /preview/rv1/ … /preview/rv3/ (not exported to dist)
// Run: node tools/reviews-previews.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const R = JSON.parse(fs.readFileSync(path.join(root, 'data/reviews.json'), 'utf8')).reviews;
const SV = { homes: 'تنظيف منازل', sofa: 'كنب وسجاد', ac: 'مكيفات', office: 'مكاتب', pest: 'مبيدات', shop: 'محلات', new: 'منازل جديدة' };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const month = d => new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', { month: 'long', year: 'numeric' }).format(new Date(d));
const stars = n => `<span class="rs" aria-label="${n} من 5">${[1, 2, 3, 4, 5].map(i => `<svg class="${i <= n ? '' : 'off'}" aria-hidden="true"><use href="#i-star"/></svg>`).join('')}</span>`;
const avg = (R.reduce((a, r) => a + r.rating, 0) / R.length).toFixed(1);
const sample = '<span class="rx-sample">مثال</span>';
const arrows = `<div class="rx-nav"><button type="button" class="rx-arr" data-dir="-1" aria-label="السابق"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button><button type="button" class="rx-arr" data-dir="1" aria-label="التالي"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>`;
const dots = n => `<div class="rx-dots" aria-hidden="true">${Array.from({ length: n }, (_, i) => `<i${i ? '' : ' class="on"'}></i>`).join('')}</div>`;

// shared slider: snap track, arrows, dots, swipe (native scroll); RTL aware
const sliderJS = `
(()=>{document.querySelectorAll('[data-rx]').forEach(w=>{const t=w.querySelector('.rx-track'),it=[...t.children],ds=[...w.querySelectorAll('.rx-dots i')];
const step=()=>it[0].getBoundingClientRect().width+parseFloat(getComputedStyle(t).columnGap||getComputedStyle(t).gap||0);
w.querySelectorAll('.rx-arr').forEach(b=>b.addEventListener('click',()=>{t.scrollBy({left:-(+b.dataset.dir)*step(),behavior:'smooth'})}));
const cur=()=>{const r=t.getBoundingClientRect();let k=0,b=1e9;it.forEach((e,i)=>{const d=Math.abs(e.getBoundingClientRect().right-r.right);if(d<b){b=d;k=i}});return k};
const sync=()=>{const k=cur();ds.forEach((d,i)=>d.classList.toggle('on',i===k));it.forEach((e,i)=>e.classList.toggle('is-cur',i===k));w.style.setProperty('--k',k)};
t.addEventListener('scroll',()=>requestAnimationFrame(sync),{passive:true});ds.forEach((d,i)=>d.addEventListener('click',()=>it[i].scrollIntoView({behavior:'smooth',block:'nearest',inline:'start'})));
if(w.dataset.auto&&!matchMedia('(prefers-reduced-motion: reduce)').matches){let h=0;w.addEventListener('pointerenter',()=>h=1);w.addEventListener('pointerleave',()=>h=0);setInterval(()=>{if(h)return;const k=cur();(it[k+1]||it[0]).scrollIntoView({behavior:'smooth',block:'nearest',inline:'start'})},+w.dataset.auto)}
sync()})})();`;

const baseCSS = `
.rx-sample{font-size:11px;font-weight:700;color:#8A5A00;background:#FFE8A8;border-radius:999px;padding:1px 8px}
.rs{display:inline-flex;gap:2px}.rs svg{width:16px;height:16px;color:#F2B705}.rs svg.off{color:#D5DBE6}
.rx-track{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.rx-track::-webkit-scrollbar{display:none}
.rx-track>*{scroll-snap-align:start;flex:none}
.rx-nav{display:flex;gap:8px}
.rx-arr{width:46px;height:46px;border-radius:50%;border:1.5px solid var(--line);background:#fff;color:var(--navy);display:grid;place-items:center;cursor:pointer;transition:background .2s,border-color .2s,transform .15s}
.rx-arr:hover{border-color:var(--blue);color:var(--blue)}.rx-arr:active{transform:scale(.94)}
.rx-arr svg{width:20px;height:20px}
.rx-dots{display:flex;gap:6px;justify-content:center}
.rx-dots i{width:8px;height:8px;border-radius:99px;background:#C9D6E6;transition:width .3s,background .3s;cursor:pointer}
.rx-dots i.on{width:26px;background:var(--blue)}
.pv-bar{position:sticky;top:0;z-index:99;background:#FFE8A8;color:#5A3D00;text-align:center;font-weight:800;font-size:13px;padding:5px 10px}`;

const head = (extra = '') => `<div class="rx-head"><div><h2 id="rev-h">آراء عملائنا</h2><p>تجارب عملاء وهج في أحياء الرياض.</p></div>${extra}</div>`;
const V = {
  rv1: {
    name: '1: كروت تتسحب بالعرض',
    css: `
.rv1{background:var(--surface);padding-block:clamp(64px,8vw,100px);overflow:hidden}
.rx-head{display:flex;justify-content:space-between;align-items:end;gap:20px;margin-bottom:28px}
.rx-head h2{font-size:clamp(28px,3.4vw,42px);font-weight:800}.rx-head p{color:var(--muted);margin-top:6px}
.rv1__sum{display:flex;align-items:center;gap:14px}
.rv1__avg{font-size:44px;font-weight:800;line-height:1;color:var(--ink)}
.rv1__sum small{display:block;color:var(--muted);font-size:13px;margin-top:4px}
.rv1 .rx-track{gap:18px;padding:6px 2px 18px;margin-inline:-2px}
.rv1__c{width:calc((100% - 36px)/3);background:#fff;border:1px solid var(--line);border-radius:22px;padding:24px;display:flex;flex-direction:column;gap:14px;position:relative;transition:transform .3s,box-shadow .3s}
.rv1__c:hover{transform:translateY(-3px);box-shadow:0 22px 40px -28px rgba(31,37,64,.45)}
.rv1__q{position:absolute;top:14px;inset-inline-end:20px;font-size:70px;line-height:1;font-weight:800;color:#E3EEF8;font-family:Georgia,serif}
.rv1__top{display:flex;align-items:center;gap:10px}
.rv1__tag{font-size:12.5px;font-weight:700;color:var(--blue);background:#EDF5FC;border-radius:999px;padding:3px 10px}
.rv1__c p{font-size:16px;line-height:1.9;color:var(--ink);flex:1}
.rv1__who{display:flex;align-items:center;gap:10px;padding-top:14px;border-top:1px solid var(--line)}
.rv1__av{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#2C70A8,#96CC8A);color:#fff;display:grid;place-items:center;font-weight:800}
.rv1__who b{display:block;font-size:15px}.rv1__who small{color:var(--muted);font-size:13px}
.rv1__foot{display:flex;justify-content:space-between;align-items:center;margin-top:6px}
@media (max-width:900px){.rx-head{flex-direction:column;align-items:center;text-align:center}.rv1__c{width:84%;padding:20px}.rv1 .rx-track{scroll-padding-inline:8%;padding-inline:8%;margin-inline:-16px}.rv1__foot{flex-direction:column;gap:16px}}`,
    html: `<section class="rv1" id="reviews" aria-labelledby="rev-h"><div class="wrap" data-rx>
  ${head(`<div class="rv1__sum"><div class="rv1__avg">${avg}</div><div>${stars(5)}<small>من ${R.length} تقييمات</small></div></div>`)}
  <div class="rx-track">${R.map(r => `<article class="rv1__c"><span class="rv1__q" aria-hidden="true">”</span><div class="rv1__top">${stars(r.rating)}<span class="rv1__tag">${SV[r.service]}</span></div><p>${esc(r.text)}</p><div class="rv1__who"><span class="rv1__av">و</span><span><b>${esc(r.name)} ${sample}</b><small>${esc(r.area)} · ${month(r.date)}</small></span></div></article>`).join('')}</div>
  <div class="rv1__foot">${dots(R.length)}${arrows}</div>
</div></section>`,
  },
  rv2: {
    name: '2: تقييم كبير واحد في كل مرة',
    css: `
.rv2{background:#131833;color:#fff;padding-block:clamp(64px,8vw,104px);position:relative;overflow:hidden;isolation:isolate}
.rv2::before{content:"";position:absolute;inset:0;z-index:-1;background:radial-gradient(600px 380px at 85% 10%,rgba(44,112,168,.35),transparent 70%),radial-gradient(500px 340px at 10% 90%,rgba(150,204,138,.18),transparent 70%)}
.rv2__grid{display:grid;grid-template-columns:300px minmax(0,1fr);gap:clamp(32px,5vw,72px);align-items:center}
.rv2 h2{font-size:clamp(28px,3.4vw,42px);font-weight:800}.rv2 .rx-head p{color:#AEB9D4;margin-top:6px}
.rv2__score{margin-top:26px;display:flex;align-items:center;gap:14px}
.rv2__score b{font-size:56px;font-weight:800;line-height:1}
.rv2__score small{display:block;color:#AEB9D4;font-size:13px;margin-top:4px}
.rv2 .rs svg.off{color:rgba(255,255,255,.2)}
.rv2__bars{margin-top:18px;display:grid;gap:6px;max-width:260px}
.rv2__bars div{display:flex;align-items:center;gap:8px;font-size:12.5px;color:#AEB9D4}
.rv2__bars i{flex:1;height:6px;border-radius:9px;background:rgba(255,255,255,.12);overflow:hidden}
.rv2__bars i b{display:block;height:100%;background:linear-gradient(to left,#2C70A8,#96CC8A);border-radius:9px}
.rv2 .rx-track{gap:0}
.rv2__s{width:100%;padding-inline:4px}
.rv2__s blockquote{font-size:clamp(22px,2.4vw,32px);font-weight:700;line-height:1.7;text-wrap:balance}
.rv2__s blockquote::before{content:"”";display:block;font-size:90px;line-height:.6;color:#96CC8A;font-family:Georgia,serif;margin-bottom:10px}
.rv2__meta{display:flex;align-items:center;gap:12px;margin-top:22px;color:#C9D3EA;font-size:14.5px;flex-wrap:wrap}
.rv2__meta .tag{background:rgba(150,204,138,.15);color:#96CC8A;border-radius:999px;padding:3px 12px;font-weight:700;font-size:13px}
.rv2__ctl{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:30px}
.rv2 .rx-arr{background:transparent;border-color:rgba(255,255,255,.25);color:#fff}.rv2 .rx-arr:hover{border-color:#96CC8A;color:#96CC8A}
.rv2__prog{flex:1;height:3px;background:rgba(255,255,255,.12);border-radius:3px;overflow:hidden}
.rv2__prog b{display:block;height:100%;width:calc((var(--k,0) + 1) / ${R.length} * 100%);background:#96CC8A;transition:width .4s}
.rv2__count{font-weight:800;font-variant-numeric:tabular-nums;color:#C9D3EA}
@media (max-width:900px){.rv2__grid{grid-template-columns:1fr;text-align:center}.rv2__score,.rv2__meta{justify-content:center}.rv2__bars{margin-inline:auto}.rv2__s blockquote::before{margin-inline:auto}}`,
    html: `<section class="rv2" id="reviews" aria-labelledby="rev-h"><div class="wrap rv2__grid">
  <div class="rx-head"><div><h2 id="rev-h">آراء عملائنا</h2><p>تجارب عملاء وهج في أحياء الرياض.</p>
    <div class="rv2__score"><b>${avg}</b><div>${stars(5)}<small>من ${R.length} تقييمات</small></div></div>
    <div class="rv2__bars">${[5, 4, 3].map(n => { const c = R.filter(r => r.rating === n).length; return `<div><span>${n}★</span><i><b style="width:${c / R.length * 100}%"></b></i><span>${c}</span></div>`; }).join('')}</div></div></div>
  <div data-rx data-auto="5000">
    <div class="rx-track">${R.map(r => `<figure class="rv2__s"><blockquote>${esc(r.text)}</blockquote><figcaption class="rv2__meta">${stars(r.rating)}<b>${esc(r.name)}</b>${sample}<span>${esc(r.area)}</span><span class="tag">${SV[r.service]}</span></figcaption></figure>`).join('')}</div>
    <div class="rv2__ctl"><span class="rv2__count"><span class="rv2__k">1</span> / ${R.length}</span><div class="rv2__prog"><b></b></div>${arrows}</div>
  </div>
</div></section>`,
    js: `(()=>{const w=document.querySelector('.rv2 [data-rx]'),k=w&&w.querySelector('.rv2__k');if(!w)return;new MutationObserver(()=>{k.textContent=(+getComputedStyle(w).getPropertyValue('--k')||0)+1}).observe(w,{attributes:true,attributeFilter:['style']})})();`,
  },
  rv3: {
    name: '3: محادثات واتساب',
    css: `
.rv3{background:linear-gradient(180deg,#fff,#EEF6EC);padding-block:clamp(64px,8vw,100px);overflow:hidden}
.rx-head{display:flex;justify-content:space-between;align-items:end;gap:20px;margin-bottom:28px}
.rx-head h2{font-size:clamp(28px,3.4vw,42px);font-weight:800}.rx-head p{color:var(--muted);margin-top:6px}
.rv3 .rx-track{gap:22px;padding:10px 4px 26px}
.rv3__ph{width:300px;border-radius:34px;background:#1F2540;padding:10px;box-shadow:0 30px 50px -30px rgba(31,37,64,.55);transition:transform .35s}
.rv3__ph.is-cur{transform:translateY(-6px)}
.rv3__scr{border-radius:26px;overflow:hidden;background:#E9E2D6;background-image:radial-gradient(rgba(0,0,0,.035) 1px,transparent 1px);background-size:14px 14px;height:400px;display:flex;flex-direction:column}
.rv3__bar{background:#1E6E4E;color:#fff;display:flex;align-items:center;gap:10px;padding:12px 14px}
.rv3__bar span:first-child{width:34px;height:34px;border-radius:50%;background:#fff;display:grid;place-items:center;overflow:hidden}
.rv3__bar img{width:28px;height:auto}
.rv3__bar b{display:block;font-size:14px}.rv3__bar small{font-size:11.5px;opacity:.8}
.rv3__msgs{flex:1;display:flex;flex-direction:column;gap:8px;padding:14px 12px}
.rv3__m{max-width:86%;padding:8px 10px 18px;border-radius:12px;font-size:14px;line-height:1.7;position:relative;box-shadow:0 1px 1px rgba(0,0,0,.08)}
.rv3__m time{position:absolute;bottom:3px;inset-inline-end:8px;font-size:10.5px;color:#7A8796}
.rv3__in{align-self:flex-start;background:#fff;border-start-start-radius:3px}
.rv3__out{align-self:flex-end;background:#D9FDD3;border-start-end-radius:3px}
.rv3__stars{align-self:flex-start;background:#fff;border-radius:12px;padding:6px 10px;display:flex;gap:6px;align-items:center;font-size:12.5px;color:var(--muted)}
.rv3__who{text-align:center;margin-top:12px;font-size:13.5px;color:var(--muted)}
.rv3__who b{color:var(--ink)}
.rv3__foot{display:flex;justify-content:space-between;align-items:center}
@media (max-width:900px){.rx-head{flex-direction:column;align-items:center;text-align:center}.rv3 .rx-track{padding-inline:calc(50% - 150px);margin-inline:-16px;scroll-snap-type:x mandatory}.rv3__ph{scroll-snap-align:center}.rv3__foot{flex-direction:column;gap:16px}}`,
    html: `<section class="rv3" id="reviews" aria-labelledby="rev-h"><div class="wrap" data-rx>
  ${head(`<div>${stars(5)} <b style="font-size:20px">${avg}</b> <small style="color:var(--muted)">من ${R.length} تقييمات</small></div>`)}
  <div class="rx-track">${R.map((r, i) => `<div class="rv3__ph"><div class="rv3__scr">
      <div class="rv3__bar"><span><img src="/assets/logo.webp" alt=""></span><span><b>وهج لخدمات التنظيف</b><small>متصل</small></span></div>
      <div class="rv3__msgs">
        <div class="rv3__m rv3__out">شكراً لاختيارك وهج 🌟 كيف كانت خدمة ${SV[r.service]}؟<time>${9 + (i % 3)}:1${i}</time></div>
        <div class="rv3__m rv3__in">${esc(r.text)}<time>${9 + (i % 3)}:2${i}</time></div>
        <div class="rv3__stars">${stars(r.rating)}<span>تقييم العميل</span></div>
      </div></div>
    <p class="rv3__who"><b>${esc(r.name)}</b> ${sample} · ${esc(r.area)}</p></div>`).join('')}</div>
  <div class="rv3__foot">${dots(R.length)}${arrows}</div>
</div></section>`,
  },
};

const s = home.indexOf('  <section class="section section--tint" id="reviews"');
const e = home.indexOf('</section>', s) + '</section>'.length;
if (s < 0) throw new Error('reviews section not found');
for (const [k, v] of Object.entries(V)) {
  const html = (home.slice(0, s) + v.html + home.slice(e))
    .replace('</head>', `<meta name="robots" content="noindex">\n<style>${baseCSS}${v.css}</style>\n</head>`)
    .replace('<a class="skip"', `<div class="pv-bar">معاينة آراء العملاء ${v.name}</div>\n<a class="skip"`)
    .replace('</body>', `<script>${sliderJS}${v.js || ''}</script>\n</body>`);
  const out = path.join(root, 'preview', k, 'index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  console.log('wrote', k);
}
