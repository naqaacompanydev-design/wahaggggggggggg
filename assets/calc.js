// Wahaj price calculator: services -> cart -> date -> details -> WhatsApp. Prices, presets and coupons from /data/pricing.json.
(async () => {
  const root = document.querySelector('.calc-page');
  if (!root) return;
  const $ = s => root.querySelector(s);
  const fmt = n => new Intl.NumberFormat('en-US').format(Math.round(n));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const load = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
  const keep = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  let P;
  try { P = await (await fetch('/data/pricing.json', { cache: 'no-store' })).json(); }
  catch { $('#c-cats').innerHTML = '<p class="c-err">تعذّر تحميل الأسعار. حدّث الصفحة أو راسلنا على واتساب.</p>'; return; }
  const svc = id => P.services.find(s => s.id === id);
  // gift occasions and ready-made card messages, shared with /gift/ and /gift/card/
  let G = { occasions: [] };
  try { G = await (await fetch('/data/gift.json', { cache: 'no-store' })).json(); } catch {}

  const saved = load('wahaj-calc') || {};
  const S = { step: 1, open: null, draft: {}, editing: -1, cart: (saved.cart || []).filter(c => svc(c.sid) && svc(c.sid).mode !== 'inspect'), date: null, period: null, coupon: saved.coupon || null, cpDef: saved.cpDef || null, cpErr: '', gcard: saved.gcard || null, gcErr: '', gcOpen: false, gift: { on: false, later: false, occ: null, hide: true } };
  // saved on this device, so "طلباتي" in the nav can show the order on any page, even after leaving the site
  const save = () => {
    const t = totals();
    const sum = { items: S.cart.map(c => { const s = svc(c.sid); return { n: s.name, ic: s.icon, t: price(s, c.v).total }; }), sub: t.sub, off: t.off, total: t.total, code: t.off ? S.coupon : null, at: Date.now() };
    keep('wahaj-calc', { cart: S.cart, coupon: S.coupon, cpDef: S.cpDef, gcard: S.gcard, sum });
    try { window.dispatchEvent(new CustomEvent('wahaj:orders')); } catch {}
  };

  // ---------- pricing ----------
  function price(s, v) {
    const lines = [];
    for (const it of s.items) {
      const x = v[it.id];
      if (x == null || x === '' || x < 0 || (it.type !== 'pkg' && !x)) continue;
      let amount = 0, detail = '';
      if (it.type === 'qty') { amount = x * it.price; detail = `× ${x}`; }
      if (it.type === 'pkg') { const o = it.options[x]; if (!o) continue; amount = o.price; detail = o.label; }
      if (it.type === 'tier') { amount = it.first + (x - 1) * it.next; detail = `× ${x}`; }
      if (it.type === 'area') { amount = x * it.rate; detail = `${x} م²`; }
      if (it.type === 'bundle') { amount = Math.floor(x / it.every) * it.bundle + (x % it.every) * it.price; detail = `× ${x}`; }
      lines.push({ label: it.label, detail, amount });
    }
    // quick-question answers that add to the price (e.g. cabinets cleaned inside)
    for (const q of s.questions || []) {
      const a = v._q?.[q.id];
      if (a == null || !q.add?.[a]) continue;
      lines.push({ label: q.label || q.q, detail: q.options[a], amount: q.add[a] });
    }
    const sub = lines.reduce((a, l) => a + l.amount, 0);
    const total = sub > 0 ? Math.max(sub, s.min) : 0;
    return { lines, sub, total, minApplied: sub > 0 && sub < s.min };
  }
  // every answered quick question, as "question: answer" (for the cart and the WhatsApp message)
  const answers = (s, v) => (s.questions || []).filter(q => v._q?.[q.id] != null).map(q => ({ q: q.label || q.q.replace(/[؟?]$/, ''), a: q.options[v._q[q.id]] }));
  const inspect = s => s.mode === 'inspect';
  const cartSub = () => S.cart.reduce((a, c) => a + price(svc(c.sid), c.v).total, 0);
  const inst = n => Math.ceil(n / 4);

  // ---------- coupons ----------
  const normCode = v => String(v || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\s+/g, '').toUpperCase();
  function coupon() {
    if (!S.coupon) return null;
    const c = S.cpDef && S.cpDef.code === S.coupon ? S.cpDef : null;
    if (!c) return null;
    const base = S.cart.filter(x => !c.services || c.services.includes(x.sid)).reduce((a, x) => a + price(svc(x.sid), x.v).total, 0);
    const sub = cartSub();
    if (c.services && !base) return { ok: false, c, msg: `الكوبون خاص بـ${c.services.map(id => svc(id)?.name).join(' أو ')}. أضفها لطلبك ويتطبّق الخصم.` };
    if (sub < (c.min || 0)) return { ok: false, c, msg: `الكوبون يشتغل على الطلبات من ${fmt(c.min)} ريال. باقي لك ${fmt(c.min - sub)} ريال.` };
    let off = c.type === 'percent' ? base * c.value / 100 : c.value;
    if (c.max) off = Math.min(off, c.max);
    return { ok: true, c, off: Math.min(Math.round(off), base) };
  }
  // gift card balance pays what is left after the coupon
  function totals() {
    const sub = cartSub(), cp = coupon(), off = cp?.ok ? cp.off : 0;
    const gift = S.gcard && sub ? Math.min(S.gcard.balance, sub - off) : 0;
    return { sub, off, gift, total: sub - off - gift, cp };
  }

  // ---------- server checks (coupons, gift cards, orders) ----------
  // Without the server (local preview, or before the admin is connected) the demo data on this device is used.
  const dbLocal = col => load(`wahaj-db-${col}`) || {};
  const todayISO = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
  async function api(path, body) {
    try {
      const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => null);
      if (!j || j.error === 'not-configured') return { offline: true };
      return r.ok ? j : { error: j.error || 'حصل خطأ' };
    } catch { return { offline: true }; }
  }
  async function lookupCoupon(code) {
    const r = await api('/api/coupon', { code });
    if (!r.offline) return r.ok ? { def: r.coupon } : { err: r.error };
    const c = dbLocal('coupons')[code];
    if (c) {
      const d = todayISO();
      if (c.active === false || (c.end && d > c.end) || (c.start && d < c.start) || (c.maxUses && (c.uses || 0) >= c.maxUses)) return { err: `«${code}»: الكود غير صحيح أو انتهى.` };
      return { def: { code, type: c.type, value: c.value, max: c.max || null, min: c.min || 0, services: c.services && c.services.length ? c.services : null, label: c.label || '' } };
    }
    const p = (P.coupons || []).find(x => x.code === code);
    return p ? { def: p } : { err: `الكود «${code}» غير صحيح أو انتهى.` };
  }
  async function lookupGift(code) {
    const r = await api('/api/gift', { code });
    if (!r.offline) return r.ok ? { g: r.gift } : { err: r.error };
    const g = dbLocal('giftcards')[code];
    if (!g || g.status === 'void') return { err: 'الكود غير صحيح.' };
    if (g.expires && todayISO() > g.expires) return { err: 'الكارت انتهت صلاحيته.' };
    if (!(g.balance > 0)) return { err: 'رصيد الكارت خلص.' };
    return { g: { code, balance: g.balance, to: g.to || '' } };
  }
  const orderId = () => 'W-' + Array.from(crypto.getRandomValues(new Uint8Array(6)), b => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');

  function couponBox(where) {
    const cp = coupon();
    if (cp?.ok) return `<div class="cp cp--ok"><svg class="ico" aria-hidden="true"><use href="#i-check"/></svg><div><b dir="ltr">${esc(cp.c.code)}</b><small>${esc(cp.c.label)} · وفّرت ${fmt(cp.off)} ريال</small></div><button type="button" class="link" data-cp-del>إزالة</button></div>`;
    const msg = S.cpErr || (cp && !cp.ok ? cp.msg : '');
    return `<form class="cp" data-cp-form novalidate>
      <label class="cp__lbl" for="cp-${where}"><svg class="ico" aria-hidden="true"><use href="#i-spark"/></svg>عندك كوبون خصم؟</label>
      <div class="cp__row"><input id="cp-${where}" name="code" type="text" dir="ltr" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="اكتب الكود" value="${esc(S.coupon || '')}"><button class="btn btn--ghost" type="submit">طبّق</button></div>
      ${msg ? `<p class="c-err" role="alert">${esc(msg)}</p>` : ''}
      ${P.demo && P.coupons?.length ? `<p class="cp__demo">للتجربة: ${P.coupons.map(c => `<button type="button" class="cp__try" data-cp-try="${esc(c.code)}" dir="ltr">${esc(c.code)}</button>`).join(' ')}</p>` : ''}
    </form>`;
  }
  function giftBox(where) {
    if (S.gcard) return `<div class="cp cp--ok cp--gift"><span class="gc-ic" aria-hidden="true">🎁</span><div><b dir="ltr">${esc(S.gcard.code)}</b><small>كارت إهداء · رصيده ${fmt(S.gcard.balance)} ريال</small></div><button type="button" class="link" data-gc-del>إزالة</button></div>`;
    if (!S.gcOpen && !S.gcErr) return `<button type="button" class="gc-open" data-gc-open>🎁 عندك كارت إهداء؟</button>`;
    return `<form class="cp" data-gc-form novalidate>
      <label class="cp__lbl" for="gc-${where}"><span aria-hidden="true">🎁</span>كود كارت الإهداء</label>
      <div class="cp__row"><input id="gc-${where}" name="code" type="text" dir="ltr" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="WG-XXXX-XXXX"><button class="btn btn--ghost" type="submit">طبّق</button></div>
      ${S.gcErr ? `<p class="c-err" role="alert">${esc(S.gcErr)}</p>` : ''}
    </form>`;
  }
  function renderCoupons() { ['side', 'cart'].forEach(w => { const el = $(`#cp-${w}-box`); if (el) el.innerHTML = couponBox(w) + giftBox(w); }); }
  async function applyGift(raw) {
    const code = normCode(raw); S.gcErr = '';
    if (!code) { S.gcErr = 'اكتب كود الكارت.'; return renderAll(); }
    const r = await lookupGift(code);
    if (r.err) { S.gcard = null; S.gcErr = r.err; } else { S.gcard = r.g; S.gcOpen = false; }
    save(); renderAll();
  }
  function applyCode(raw) {
    const code = normCode(raw);
    S.cpErr = '';
    if (!code) { S.cpErr = 'اكتب كود الخصم.'; save(); return renderAll(); }
    return lookupCoupon(code).then(r => {
      if (r.err) { S.coupon = null; S.cpDef = null; S.cpErr = r.err; } else { S.coupon = code; S.cpDef = r.def; }
      save(); renderAll();
    });
  }

  // ---------- step 1: categories + service panel ----------
  function renderCats() {
    const inCart = id => S.cart.find(c => c.sid === id);
    $('#c-cats').innerHTML = P.services.map(s => {
      const c = inCart(s.id);
      return `
      <button class="cat${c ? ' cat--in' : ''}" type="button" data-open="${s.id}">
        <span class="cat__ic"><svg><use href="#${s.icon}"/></svg></span>
        <span class="cat__name">${esc(s.name)}</span>
        <span class="cat__desc">${esc(s.desc)}</span>
        ${c ? `<span class="cat__from"><b>${fmt(price(s, c.v).total)}</b> ريال</span><span class="cat__in"><svg class="ico" aria-hidden="true"><use href="#i-check"/></svg>في طلبك</span>`
            : inspect(s) ? `<span class="cat__from"><b>بالمعاينة</b></span>`
            : `<span class="cat__from">من <b>${fmt(s.min)}</b> ريال</span>`}
      </button>`;
    }).join('');
    renderMix();
  }

  // the combined order: every service picked so far, one total
  function renderMix() {
    const n = S.cart.length, t = totals();
    $('#c-cats-h').textContent = n ? 'تبي تضيف خدمة ثانية؟' : 'وش تبي ننظف؟';
    $('#c-hint').hidden = !!n;
    $('#c-mix').innerHTML = n ? `<div class="mix">
      <div class="mix__head"><b>طلبك المجمّع</b><span>${n === 1 ? 'خدمة وحدة' : n === 2 ? 'خدمتين' : `${n} خدمات`}</span></div>
      <ul>${S.cart.map((c, i) => { const s = svc(c.sid); return `<li><span class="cat__ic"><svg><use href="#${s.icon}"/></svg></span><span class="mix__n">${esc(s.name)}</span><b>${fmt(price(s, c.v).total)} ريال</b><button type="button" class="mix__x" data-del="${i}" aria-label="احذف ${esc(s.name)}">×</button></li>`; }).join('')}</ul>
      ${t.off ? `<div class="mix__off"><span>خصم الكوبون</span><span>− ${fmt(t.off)} ريال</span></div>` : ''}${t.gift ? `<div class="mix__off"><span>كارت الإهداء</span><span>− ${fmt(t.gift)} ريال</span></div>` : ''}
      <div class="mix__total"><span>الإجمالي لكل الخدمات</span><b>${fmt(t.total)} ريال</b></div>
      <p class="mix__note">اختر خدمة ثانية من تحت وتنضاف لنفس الطلب، أو اضغط «كمّل الحجز».</p>
    </div>` : '';
  }

  function control(it, x) {
    if (it.type === 'pkg') return `<div class="opts" role="radiogroup" aria-label="${esc(it.label)}">${it.options.map((o, i) => `
      <button type="button" class="opt" role="radio" aria-checked="${x === i}" data-pkg="${it.id}" data-i="${i}"><span>${esc(o.label)}</span><b>${fmt(o.price)} ريال</b></button>`).join('')}</div>`;
    if (it.type === 'area') return `<div class="area-in"><button type="button" class="stp" data-step-id="${it.id}" data-d="-5" aria-label="أنقص 5 أمتار">−</button>
      <label><input type="number" inputmode="numeric" min="0" step="1" value="${x || ''}" placeholder="0" data-area="${it.id}" aria-label="${esc(it.label)} بالمتر"><span>م²</span></label>
      <button type="button" class="stp stp--on" data-step-id="${it.id}" data-d="5" aria-label="زد 5 أمتار">+</button></div>`;
    return `<div class="stepper"><button type="button" class="stp" data-step-id="${it.id}" data-d="-1" aria-label="أنقص ${esc(it.label)}">−</button><output>${x || 0}</output><button type="button" class="stp stp--on" data-step-id="${it.id}" data-d="1" aria-label="زد ${esc(it.label)}">+</button></div>`;
  }
  const unitText = it => it.type === 'bundle' ? `${fmt(it.price)} ريال للمكيف · ${it.unit}` : it.type === 'pkg' ? (it.note || 'اختر خيار واحد') : it.type === 'area' ? `${fmt(it.rate)} ${it.unit}` : it.type === 'qty' ? `${fmt(it.price)} ريال ${it.unit}` : it.unit || '';

  function questionsBlock(s) {
    if (!s.questions?.length) return '';
    return `<div class="qs"><p class="qs__h">أسئلة سريعة <small>اختياري، يساعدنا نجهّز لك صح</small></p>${s.questions.map(q => `
      <div class="qs__q"><b>${esc(q.q)}</b><div class="qs__o" role="group" aria-label="${esc(q.q)}">${q.options.map((o, i) => `<button type="button" class="qs__b" data-q="${q.id}" data-i="${i}" aria-pressed="${S.draft._q?.[q.id] === i}">${esc(o)}${q.add?.[i] ? `<small>+${fmt(q.add[i])} ريال</small>` : ''}</button>`).join('')}</div></div>`).join('')}</div>`;
  }

  // a service priced by inspection: answer a few questions, then ask for a visit on WhatsApp or call for a price
  function renderInspect(s) {
    const tel = P.phone || `+${P.whatsapp}`;
    $('#c-panel').innerHTML = `
      <div class="pn-head">
        <button type="button" class="pn-back" data-back aria-label="رجوع للخدمات"><svg class="ico"><use href="#i-arrow"/></svg></button>
        <span class="cat__ic"><svg><use href="#${s.icon}"/></svg></span>
        <div><h2 id="pn-h">${esc(s.name)}</h2><p>السعر يتحدد بعد معاينة المكان أو مكالمة سريعة.</p></div>
      </div>
      <div class="insp"><svg class="ico" aria-hidden="true"><use href="#i-spark"/></svg><p>التنظيف بعد البناء والترميم يختلف حسب المساحة وكمية بقايا الدهان والأسمنت، عشان كذا ما نعطي سعر ثابت. جاوب الأسئلة تحت، واطلب معاينة على واتساب أو اتصل وحدد السعر بالهاتف.</p></div>
      ${questionsBlock(s)}
      <div class="pn-foot insp__act">
        <button type="button" class="btn btn--wa" data-insp><svg class="ico" aria-hidden="true"><use href="#i-wa"/></svg>اطلب معاينة على واتساب</button>
        <a class="btn btn--ghost" href="tel:${esc(tel)}"><svg class="ico" aria-hidden="true"><use href="#i-phone"/></svg>حدد السعر بالهاتف</a>
      </div>`;
  }
  function inspectMessage(s) {
    const L = [`السلام عليكم، أبغى أطلب معاينة لخدمة «${s.name}».`];
    answers(s, S.draft).forEach(x => L.push(`${x.q}: ${x.a}`));
    L.push('متى يناسبكم تجون للمعاينة؟');
    return L.join('\n');
  }

  function renderPanel() {
    const s = svc(S.open);
    if (inspect(s)) return renderInspect(s);
    $('#c-panel').innerHTML = `
      <div class="pn-head">
        <button type="button" class="pn-back" data-back aria-label="رجوع للخدمات"><svg class="ico"><use href="#i-arrow"/></svg></button>
        <span class="cat__ic"><svg><use href="#${s.icon}"/></svg></span>
        <div><h2 id="pn-h">${esc(s.name)}</h2><p>اختر اللي تبيه، والسعر يتحسب قدامك.</p></div>
      </div>
      ${s.presets ? `<div class="presets"><span>اختيار سريع</span><div>${s.presets.map((p, i) => `<button type="button" class="preset" data-preset="${i}">${esc(p.label)}</button>`).join('')}</div></div>` : ''}
      <ul class="pn-items">${s.items.map(it => `
        <li class="pn-item pn-item--${it.type}">
          <div class="pn-txt"><b>${esc(it.label)}</b><small>${esc(unitText(it))}</small></div>
          ${control(it, S.draft[it.id])}
        </li>`).join('')}</ul>
      ${questionsBlock(s)}
      <div class="pn-foot">
        <p class="tip" id="pn-tip" hidden></p>
        <div class="pn-sum"><span>سعر الخدمة</span><b id="pn-total">0 ريال</b><small id="pn-inst"></small></div>
        <p class="c-err" id="pn-err" hidden>اختر خدمة واحدة على الأقل.</p>
        <button type="button" class="btn btn--primary" data-add>${S.editing > -1 ? 'حدّث الطلب' : 'أضف للطلب'}</button>
      </div>`;
    updatePanel();
  }

  // one smart hint at a time: what would save money or add value right now
  function tip(s, v, r) {
    for (const it of s.items) {
      const x = +v[it.id] || 0;
      if (it.type === 'bundle' && x > 0 && x % it.every === it.every - 1) {
        const plus = price(s, { ...v, [it.id]: x + 1 }).total - r.total;
        return plus <= 0 ? `تقدر تضيف ${it.label} واحد زيادة بدون ما يتغير السعر، لأنه يكمل عرض ${it.every} بـ ${fmt(it.bundle)} ريال.`
          : `أضف ${it.label} واحد بـ ${fmt(plus)} ريال بس، وتكمل عرض ${it.every} بـ ${fmt(it.bundle)} ريال.`;
      }
      if (it.type === 'tier' && x === 1) return `الثاني من «${it.label.split(' (')[0]}» بـ ${fmt(it.next)} ريال بدل ${fmt(it.first)}.`;
      if (it.type === 'pkg' && v[it.id] != null && v[it.id] > -1 && it.options[x + 1]) {
        return `بـ ${fmt(it.options[x + 1].price - it.options[x].price)} ريال زيادة بس، تاخذ «${it.options[x + 1].label}».`;
      }
    }
    if (r.minApplied) {
      const room = s.min - r.sub;
      const fit = s.items.filter(it => it.type === 'qty' && it.price <= room).sort((a, b) => b.price - a.price)[0];
      return fit ? `الحد الأدنى للخدمة ${fmt(s.min)} ريال، فعندك ${fmt(room)} ريال تقدر تضيف فيها «${fit.label}» بدون ما يزيد السعر.`
        : `الحد الأدنى للخدمة ${fmt(s.min)} ريال، وعندك ${fmt(room)} ريال تقدر تستغلها في إضافات بنفس السعر.`;
    }
    return '';
  }

  function updatePanel() {
    const s = svc(S.open);
    root.querySelectorAll('[data-q]').forEach(b => b.setAttribute('aria-pressed', String(S.draft._q?.[b.dataset.q] === +b.dataset.i)));
    if (inspect(s)) return;
    const r = price(s, S.draft);
    $('#pn-total').textContent = `${fmt(r.total)} ريال`;
    $('#pn-inst').textContent = r.total ? `أو 4 دفعات × ${fmt(inst(r.total))} ريال مع تابي وتمارا` : '';
    const t = r.sub ? tip(s, S.draft, r) : '';
    const tp = $('#pn-tip'); tp.hidden = !t; if (t) tp.innerHTML = `<svg class="ico" aria-hidden="true"><use href="#i-spark"/></svg><span>${esc(t)}</span>`;
    const rest = S.cart.reduce((a, c, i) => (c.sid === S.open || i === S.editing) ? a : a + price(svc(c.sid), c.v).total, 0);
    root.querySelectorAll('[data-total]').forEach(e => { e.textContent = `${fmt(rest + r.total)} ريال`; });
    root.querySelectorAll('[data-pkg]').forEach(b => b.setAttribute('aria-checked', String(S.draft[b.dataset.pkg] === +b.dataset.i)));
    root.querySelectorAll('.pn-item').forEach((li, i) => {
      const it = s.items[i], x = S.draft[it.id];
      const out = li.querySelector('output'); if (out) out.textContent = x || 0;
      li.classList.toggle('is-on', it.type === 'pkg' ? x > -1 && x != null : !!x);
    });
  }
  function openService(id, editIndex = -1) {
    if (editIndex === -1) { const i = S.cart.findIndex(c => c.sid === id); if (i > -1) editIndex = i; }
    S.open = id; S.editing = editIndex;
    S.draft = editIndex > -1 ? { ...S.cart[editIndex].v } : {};
    $('#c-cats').hidden = true; $('#c-mix').hidden = true; $('#c-hint').hidden = true; $('#c-panel').hidden = false;
    if (S.step !== 1) go(1, true);
    renderPanel();
    $('#c-panel').scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  function closePanel() { S.open = null; S.editing = -1; $('#c-panel').hidden = true; $('#c-cats').hidden = false; $('#c-mix').hidden = false; renderCats(); }

  // ---------- step 2: cart ----------
  function renderCart() {
    const box = `<div class="cp-wrap" id="cp-cart-box"></div>`;
    if (!S.cart.length) {
      $('#c-cart').innerHTML = `<div class="empty"><svg class="ico"><use href="#i-calc"/></svg><b>سلتك فاضية</b><p>اختر خدمة وحدد التفاصيل عشان يطلع لك السعر.</p><button type="button" class="btn btn--primary" data-goto="1">اختر خدمة</button></div>`;
      return;
    }
    const t = totals();
    const pairs = [...new Set(S.cart.flatMap(c => svc(c.sid).pairs || []))].filter(id => svc(id) && !S.cart.some(c => c.sid === id)).slice(0, 3);
    $('#c-cart').innerHTML = S.cart.map((c, i) => {
      const s = svc(c.sid), r = price(s, c.v);
      return `<article class="cart-item"><div class="ci-head"><span class="cat__ic"><svg><use href="#${s.icon}"/></svg></span><h3>${esc(s.name)}</h3><b>${fmt(r.total)} ريال</b></div>
        <ul>${r.lines.map(l => `<li><span>${esc(l.label)} <small>${esc(l.detail)}</small></span><span>${fmt(l.amount)}</span></li>`).join('')}${r.minApplied ? `<li class="ci-min"><span>تطبيق الحد الأدنى للخدمة</span><span>${fmt(s.min)}</span></li>` : ''}</ul>
        ${(() => { const a = answers(s, c.v); return a.length ? `<p class="ci-ans">${a.map(x => `<span>${esc(x.q)}: <b>${esc(x.a)}</b></span>`).join('')}</p>` : ''; })()}
        <div class="ci-act"><button type="button" class="link" data-edit="${i}">تعديل</button><button type="button" class="link link--danger" data-del="${i}">حذف</button></div></article>`;
    }).join('')
      + (pairs.length ? `<div class="xs"><p>خدمات تكمّل طلبك</p><div>${pairs.map(id => { const s = svc(id); return `<button type="button" class="xs__b" data-open="${id}"><span class="cat__ic"><svg><use href="#${s.icon}"/></svg></span><span><b>${esc(s.name)}</b><small>${inspect(s) ? 'السعر بالمعاينة' : `من ${fmt(s.min)} ريال`}</small></span><i aria-hidden="true">+</i></button>`; }).join('')}</div></div>` : '')
      + box
      + `<div class="cart-sum">${t.gift ? `<div class="cart-sum__off"><span>كارت الإهداء</span><span>− ${fmt(t.gift)} ريال</span></div>` : ''}${t.off ? `<div><span>المجموع</span><span>${fmt(t.sub)} ريال</span></div><div class="cart-sum__off"><span>خصم الكوبون</span><span>− ${fmt(t.off)} ريال</span></div>` : ''}<div class="cart-sum__total"><span>الإجمالي التقريبي</span><b>${fmt(t.total)} ريال</b></div><small>أو 4 دفعات × ${fmt(inst(t.total))} ريال مع تابي وتمارا</small></div>`;
    renderCoupons();
  }

  // ---------- step 3: date ----------
  const riyadhHour = () => +new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Riyadh' }).format(new Date());
  function renderDate() {
    const days = [], now = new Date(), h = riyadhHour();
    const H = P.hours || {}; // booking hours from the admin
    const start = h >= (H.todayUntil ?? 19) ? 1 : 0; // too late to book today
    for (let d = start; d < start + 10; d++) {
      const t = new Date(now.getTime() + d * 864e5);
      const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(t);
      const wd = d === 0 ? 'اليوم' : d === 1 ? 'بكرة' : new Intl.DateTimeFormat('ar-SA-u-nu-latn', { weekday: 'long', timeZone: 'Asia/Riyadh' }).format(t);
      const dm = new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', { day: 'numeric', month: 'short', timeZone: 'Asia/Riyadh' }).format(t);
      days.push({ key, wd, dm, today: d === 0 });
    }
    if (S.date && !days.some(d => d.key === S.date)) S.date = null;
    $('#c-days').innerHTML = days.map(d => `<button type="button" class="day" role="radio" aria-checked="${S.date === d.key}" data-day="${d.key}" data-today="${d.today}" data-label="${esc(d.wd + ' ' + d.dm)}"><b>${esc(d.wd)}</b><span>${esc(d.dm)}</span></button>`).join('');
    const amGone = S.date && days.find(d => d.key === S.date)?.today && h >= ((P.hours || {}).amUntil ?? 11);
    if (amGone && S.period === 'am') S.period = null;
    root.querySelectorAll('[data-period]').forEach(b => {
      const off = amGone && b.dataset.period === 'am';
      b.disabled = !!off; b.classList.toggle('is-off', !!off);
      b.setAttribute('aria-checked', String(S.period === b.dataset.period));
    });
    $('#c-amnote').hidden = !amGone;
  }

  // ---------- step 4: details ----------
  // Saudi national short address: 4 letters + 4 digits (e.g. RRRD2929), Arabic digits accepted
  const normShort = v => String(v || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[\s-]+/g, '').toUpperCase();
  const okShort = v => !v || /^[A-Z]{4}\d{4}$/.test(v);
  const city = () => $('#c-city').value === 'أخرى' ? $('#c-city-other').value.trim() : $('#c-city').value;
  function renderDetails() {
    const dl = $('#c-dlist');
    if (!dl.options.length) dl.innerHTML = P.districts.filter(d => d !== 'حي آخر').map(d => `<option value="${esc(d)}">`).join('');
    const me = load('wahaj-calc-me') || {};
    if (!$('#c-name').value && me.name) $('#c-name').value = me.name;
    // a gift goes to someone else's address, so only the visitor's name is filled in
    const mine = !S.gift.on;
    if (mine && me.city && $('#c-city').value === 'الرياض' && me.city !== 'الرياض') { $('#c-city').value = 'أخرى'; $('#c-city-other').value = me.city; }
    $('#c-city-other').hidden = $('#c-city').value !== 'أخرى';
    if (mine && !$('#c-district').value && me.district) $('#c-district').value = me.district;
    if (mine && !$('#c-short').value && me.short) $('#c-short').value = me.short;
    if (!$('#c-notes').value && me.notes) $('#c-notes').value = me.notes;
    const t = totals();
    giftUI();
    $('#c-review').innerHTML = `${S.gift.on ? `<div class="rv-gift"><span>🎁 إهداء إلى</span><b>${esc($('#g-to').value.trim() || '…')}</b></div>` : ''}
      <div><span>الخدمات</span><b>${S.cart.map(c => esc(svc(c.sid).name)).join('، ')}</b></div>
      <div><span>الموعد</span><b>${giftLater() ? 'يحدده المُهدى له' : `${esc(S.dateLabel || '')} · ${S.period === 'am' ? 'صباحي' : 'مسائي'}`}</b></div>
      ${t.off ? `<div><span>خصم الكوبون <b dir="ltr">${esc(t.cp.c.code)}</b></span><b class="off">− ${fmt(t.off)} ريال</b></div>` : ''}${t.gift ? `<div><span>كارت الإهداء <b dir="ltr">${esc(S.gcard.code)}</b></span><b class="off">− ${fmt(t.gift)} ريال</b></div>` : ''}
      <div><span>الإجمالي التقريبي</span><b>${fmt(t.total)} ريال</b></div>`;
  }
  // ---------- gift ----------
  const giftLater = () => S.gift.on && S.gift.later;
  const occ = () => G.occasions.find(o => o.id === S.gift.occ);
  // Saudi mobile: 05XXXXXXXX (accepts +966 / 00966 / 966 and Arabic digits)
  const normPhone = v => { let p = String(v || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^\d]/g, ''); p = p.replace(/^(00966|966)/, '0'); if (/^5\d{8}$/.test(p)) p = '0' + p; return p; };
  const okPhone = v => /^05\d{8}$/.test(normPhone(v));
  function giftUI() {
    const on = S.gift.on;
    $('#g-ribbon').hidden = !on;
    $('#g-on').checked = on;
    $('#g-body').hidden = !on;
    $('#c-gift').classList.toggle('is-on', on);
    $('#g-later').hidden = !on;
    const lb = root.querySelector('[data-gift-later]'); lb.setAttribute('aria-pressed', String(S.gift.later)); lb.classList.toggle('is-on', S.gift.later);
    $('#c-name-l').textContent = on ? 'اسمك (صاحب الإهداء)' : 'الاسم';
    root.querySelector('label[for="c-city"]').textContent = on ? 'مدينة المُهدى له' : 'المدينة';
    $('#c-district').previousElementSibling.textContent = on ? 'حي المُهدى له' : 'الحي';
    // the visitor's own location is not where the gift goes
    root.querySelector('[data-geo]').closest('.field').hidden = on;
    if (!on) return;
    $('#g-occ').innerHTML = G.occasions.map(o => `<button type="button" class="qs__b" role="radio" aria-checked="${S.gift.occ === o.id}" aria-pressed="${S.gift.occ === o.id}" data-gocc="${o.id}"><span aria-hidden="true">${o.emoji}</span>${esc(o.label)}</button>`).join('');
    const o = occ();
    $('#g-ready').innerHTML = o ? `<small>رسائل جاهزة:</small>${o.ready.map((r, i) => `<button type="button" class="g-ready__b" data-gready="${i}">${esc(r)}</button>`).join('')}` : '';
    const dateTxt = S.date && S.period ? `${esc(S.dateLabel)} · ${S.period === 'am' ? 'صباحي' : 'مسائي'}` : 'أنا أحدد الموعد';
    $('#g-when').innerHTML = `<button type="button" class="qs__b" role="radio" aria-pressed="${!S.gift.later}" aria-checked="${!S.gift.later}" data-gwhen="date">${dateTxt}</button>
      <button type="button" class="qs__b" role="radio" aria-pressed="${S.gift.later}" aria-checked="${S.gift.later}" data-gwhen="later">المُهدى له يختار الموعد</button>`;
    $('#g-hide').checked = S.gift.hide;
  }
  function setGift(on) {
    S.gift.on = on;
    if (!on) S.gift.later = false;
    if (on && S.step === 4) {
      // the saved address belongs to the visitor, not to the person receiving the gift
      const me = load('wahaj-calc-me') || {};
      if ($('#c-district').value === (me.district || '')) $('#c-district').value = '';
      if (normShort($('#c-short').value) === (me.short || '')) $('#c-short').value = '';
      $('#c-city').value = 'الرياض'; $('#c-city-other').hidden = true;
    }
    giftUI(); renderSide();
    if (S.step === 4) renderDetails();
  }
  function cardUrl() {
    const o = new URLSearchParams();
    o.set('f', $('#c-name').value.trim()); o.set('t', $('#g-to').value.trim());
    if (S.gift.occ) o.set('o', S.gift.occ);
    // a ready-made message travels as its number, so the link stays short
    const m = $('#g-msg').value.trim(), ri = occ() ? occ().ready.indexOf(m) : -1;
    if (ri > -1) o.set('r', ri); else if (m) o.set('m', m);
    o.set('s', S.cart.map(c => svc(c.sid).name).join('|'));
    if (giftLater()) o.set('w', 'later'); else o.set('d', `${S.dateLabel} · ${S.period === 'am' ? 'صباحي' : 'مسائي'}`);
    return `${location.origin}/gift/card/?${o}`;
  }
  function giftDone() {
    const to = $('#g-to').value.trim(), from = $('#c-name').value.trim(), url = cardUrl();
    const ph = normPhone($('#g-phone').value);
    const txt = `${to}، لك هدية من ${from} 🎁\nافتح كارتك من هنا:\n${url}`;
    const box = $('#g-done');
    box.innerHTML = `<div class="g-done__h"><span class="g-done__ic" aria-hidden="true">🎁</span><div><b>كارت الإهداء جاهز</b><small>بعد ما ترسل الطلب لنا، أرسل الكارت لـ ${esc(to)} يفرح فيه. وإذا تبيها مفاجأة، قول لنا في واتساب ونرسله له نحن قبل الموعد.</small></div></div>
      <div class="g-done__a">
        <a class="btn btn--wa" href="https://wa.me/966${ph.slice(1)}?text=${encodeURIComponent(txt)}" target="_blank" rel="noopener"><svg class="ico"><use href="#i-wa"/></svg>أرسل الكارت لـ ${esc(to)}</a>
        <a class="btn btn--ghost" href="${esc(url)}" target="_blank" rel="noopener">شوف الكارت</a>
        <button type="button" class="btn btn--ghost" data-gcopy>انسخ رابط الكارت</button>
      </div>`;
    box.dataset.url = url;
    box.hidden = false;
  }

  function message() {
    const t = totals();
    if (S.gift.on) return giftMessage(t);
    const L = [`رقم الطلب: ${S.orderId}`, 'السلام عليكم، أبغى أحجز من حاسبة أسعار وهج:'];
    S.cart.forEach(c => {
      const s = svc(c.sid), r = price(s, c.v);
      L.push(`• ${s.name}: ${r.lines.map(l => `${l.label} ${l.detail}`).join('، ')} = ${fmt(r.total)} ريال`);
      answers(s, c.v).filter(x => !r.lines.some(l => l.label === x.q)).forEach(x => L.push(`   - ${x.q}: ${x.a}`));
    });
    if (t.off || t.gift) L.push(`المجموع: ${fmt(t.sub)} ريال`);
    if (t.off) L.push(`كوبون الخصم: ${t.cp.c.code} (− ${fmt(t.off)} ريال)`);
    if (t.gift) L.push(`كارت إهداء: ${S.gcard.code} (− ${fmt(t.gift)} ريال)`);
    L.push(`الإجمالي التقريبي: ${fmt(t.total)} ريال`);
    L.push(`الموعد: ${S.dateLabel} - ${S.period === 'am' ? 'صباحي' : 'مسائي'}`);
    L.push(`الاسم: ${$('#c-name').value.trim()}`);
    L.push(`العنوان: ${city()}، حي ${$('#c-district').value.trim().replace(/^حي\s+/, '')}`);
    const sh = normShort($('#c-short').value); if (sh) L.push(`العنوان الوطني المختصر: ${sh}`);
    if (S.geo) L.push(`الموقع على الخريطة: https://maps.google.com/?q=${S.geo.lat},${S.geo.lng}`);
    const n = $('#c-notes').value.trim(); if (n) L.push(`ملاحظات: ${n}`);
    L.push('(السعر تقريبي ويتأكد قبل البدء)');
    return L.join('\n');
  }
  function giftMessage(t) {
    const o = occ();
    const L = ['🎁 طلب إهداء', `رقم الطلب: ${S.orderId}`, 'السلام عليكم، أبغى أهدي خدمة تنظيف من حاسبة أسعار وهج:'];
    S.cart.forEach(c => {
      const s = svc(c.sid), r = price(s, c.v);
      L.push(`• ${s.name}: ${r.lines.map(l => `${l.label} ${l.detail}`).join('، ')} = ${fmt(r.total)} ريال`);
      answers(s, c.v).filter(x => !r.lines.some(l => l.label === x.q)).forEach(x => L.push(`   - ${x.q}: ${x.a}`));
    });
    if (t.off || t.gift) L.push(`المجموع: ${fmt(t.sub)} ريال`);
    if (t.off) L.push(`كوبون الخصم: ${t.cp.c.code} (− ${fmt(t.off)} ريال)`);
    if (t.gift) L.push(`كارت إهداء: ${S.gcard.code} (− ${fmt(t.gift)} ريال)`);
    L.push(`الإجمالي التقريبي: ${fmt(t.total)} ريال`);
    L.push(giftLater() ? 'الموعد: يحدده المُهدى له (تواصلوا معه لاختيار الموعد)' : `الموعد: ${S.dateLabel} - ${S.period === 'am' ? 'صباحي' : 'مسائي'}`);
    L.push('', `صاحب الإهداء (الدفع عليه): ${$('#c-name').value.trim()}`);
    L.push(`المُهدى له: ${$('#g-to').value.trim()}`);
    L.push(`جوال المُهدى له: ${normPhone($('#g-phone').value)}`);
    L.push(`عنوان المُهدى له: ${city()}، حي ${$('#c-district').value.trim().replace(/^حي\s+/, '')}`);
    const sh = normShort($('#c-short').value); if (sh) L.push(`العنوان الوطني المختصر: ${sh}`);
    if (o) L.push(`المناسبة: ${o.label}`);
    const m = $('#g-msg').value.trim(); if (m) L.push(`رسالة الكارت: «${m}»`);
    if (S.gift.hide) L.push('السعر: لا تذكروه للمُهدى له');
    L.push(`رابط كارت الإهداء: ${cardUrl()}`);
    const n = $('#c-notes').value.trim(); if (n) L.push(`ملاحظات: ${n}`);
    L.push('(السعر تقريبي ويتأكد قبل البدء)');
    return L.join('\n');
  }

  // ---------- navigation + summary ----------
  const labels = { 1: 'الخدمات', 2: 'السلة', 3: 'الموعد', 4: 'بياناتك' };
  function canGo(n) { if (n > 2 && !S.cart.length) return false; if (n >= 4 && !(S.date && S.period) && !giftLater()) return false; return true; }
  function go(n, stay) {
    if (!canGo(n)) return;
    S.step = n;
    root.querySelectorAll('.c-step').forEach(el => { el.hidden = +el.dataset.step !== n; });
    root.querySelectorAll('.prog li').forEach((li, i) => { li.classList.toggle('is-on', i + 1 === n); li.classList.toggle('is-done', i + 1 < n); });
    root.style.setProperty('--p', String((n - 1) / 3));
    $('#c-steplabel').textContent = `الخطوة ${n} من 4 · ${labels[n]}`;
    $('#c-barstep').textContent = `الخطوة ${n} من 4 · ${labels[n]}`;
    if (n === 1 && !stay) closePanel();
    if (n === 2) renderCart();
    if (n === 3) renderDate();
    if (n === 4) renderDetails();
    renderSide();
    if (!stay) root.querySelector('.c-body').scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  function nextLabel() { return S.step === 1 ? 'كمّل الحجز' : S.step === 2 ? 'التالي: الموعد' : S.step === 3 ? 'التالي: بياناتك' : 'أرسل على واتساب'; }
  function renderSide() {
    const t = totals(), count = S.cart.length;
    $('#c-count').textContent = count;
    $('#side-lines').innerHTML = count ? S.cart.map(c => { const s = svc(c.sid); return `<li><span>${esc(s.name)}</span><b>${fmt(price(s, c.v).total)}</b></li>`; }).join('')
      + (t.off ? `<li class="side-off"><span>خصم <b dir="ltr">${esc(t.cp.c.code)}</b></span><b>− ${fmt(t.off)}</b></li>` : '') + (t.gift ? `<li class="side-off"><span>كارت إهداء</span><b>− ${fmt(t.gift)}</b></li>` : '') : '<li class="muted">ما اخترت خدمات للحين</li>';
    root.querySelectorAll('[data-total]').forEach(e => { e.textContent = `${fmt(t.total)} ريال`; });
    $('#side-inst').textContent = t.total ? `أو 4 دفعات × ${fmt(inst(t.total))} ريال` : '';
    root.querySelectorAll('[data-next]').forEach(b => { b.innerHTML = S.step === 4 ? `<svg class="ico"><use href="#i-wa"/></svg>${nextLabel()}` : nextLabel(); b.classList.toggle('btn--wa', S.step === 4); b.classList.toggle('btn--primary', S.step !== 4); });
    root.querySelector('.c-bar').hidden = false;
    renderCoupons();
    if (S.step === 1 && !S.open) renderMix();
  }
  function renderAll() { if (S.step === 2) renderCart(); if (S.step === 4) renderDetails(); renderSide(); }
  function next() {
    const err = $('#side-err'); err.hidden = true;
    const say = t => { err.textContent = t; err.hidden = false; root.querySelectorAll('[data-bar-err]').forEach(e => { e.textContent = t; e.hidden = false; }); };
    root.querySelectorAll('[data-bar-err]').forEach(e => { e.hidden = true; });
    if (S.step === 1) { if (S.open && price(svc(S.open), S.draft).sub > 0) addToCart(); if (!S.cart.length) return say('اختر خدمة وأضفها للطلب أول.'); return go(2); }
    if (S.step === 2) { if (!S.cart.length) return say('سلتك فاضية، اختر خدمة أول.'); return go(3); }
    if (S.step === 3) { if (giftLater()) return go(4); if (!S.date) return say('اختر اليوم المناسب.'); if (!S.period) return say('اختر الفترة: صباحي أو مسائي.'); return go(4); }
    if (S.step === 4) {
      const name = $('#c-name'), dis = $('#c-district'), sh = $('#c-short'), co = $('#c-city-other');
      sh.value = normShort(sh.value);
      $('#err-name').hidden = !!name.value.trim(); $('#err-district').hidden = !!dis.value.trim();
      $('#err-short').hidden = okShort(sh.value); $('#err-city').hidden = !!city();
      if (!name.value.trim()) { name.focus(); return say('اكتب اسمك.'); }
      if (!city()) { co.focus(); return say('اكتب اسم المدينة.'); }
      if (!dis.value.trim()) { dis.focus(); return say('اكتب الحي.'); }
      if (!okShort(sh.value)) { sh.focus(); return say('العنوان المختصر 4 حروف إنجليزي و4 أرقام، مثال: RRRD2929'); }
      if (S.gift.on) {
        const to = $('#g-to'), ph = $('#g-phone');
        $('#err-gto').hidden = !!to.value.trim(); $('#err-gphone').hidden = okPhone(ph.value);
        if (!to.value.trim()) { to.focus(); return say('اكتب اسم المُهدى له.'); }
        if (!okPhone(ph.value)) { ph.focus(); return say('اكتب جوال المُهدى له، مثال: 0551234567'); }
      }
      if (!giftLater() && !(S.date && S.period)) { go(3); return say('اختر الموعد أول.'); }
      S.orderId = orderId();
      window.open(`https://wa.me/${P.whatsapp}?text=${encodeURIComponent(message())}`, '_blank', 'noopener');
      recordOrder();
      $('#c-sent').hidden = false;
      if (S.gift.on) giftDone();
    }
  }
  // the order is also kept for the admin («الطلبات»); WhatsApp has already opened, so nothing waits for this
  async function recordOrder() {
    const t = totals();
    const o = {
      id: S.orderId, source: S.gift.on ? 'gift' : 'calc',
      items: S.cart.map(c => { const s = svc(c.sid), r = price(s, c.v); return { sid: s.id, n: s.name, t: r.total, d: r.lines.map(l => `${l.label} ${l.detail}`).join('، ') }; }),
      coupon: t.off ? S.coupon : '', gift: t.gift ? S.gcard.code : '',
      date: giftLater() ? 'يحدده المُهدى له' : S.dateLabel, period: giftLater() ? '' : S.period === 'am' ? 'صباحي' : 'مسائي',
      name: $('#c-name').value.trim(), city: city(), district: $('#c-district').value.trim(), short: normShort($('#c-short').value), notes: $('#c-notes').value.trim(),
      map: S.geo ? `https://maps.google.com/?q=${S.geo.lat},${S.geo.lng}` : '',
      giftTo: S.gift.on ? { name: $('#g-to').value.trim(), phone: normPhone($('#g-phone').value), occasion: (occ() || {}).label || '', message: $('#g-msg').value.trim() } : null
    };
    const r = await api('/api/order', o);
    if (!r.offline) { S.gcard = null; save(); renderSide(); return; } // the balance was used on this order
    // demo: keep it on this device, and count the coupon and gift card like the server would
    const all = dbLocal('orders'), sub = o.items.reduce((a, x) => a + x.t, 0);
    all[o.id] = { ...o, status: 'new', createdAt: new Date().toISOString(), sub, couponCode: o.coupon, off: t.off, giftCode: o.gift, giftUsed: t.gift, total: t.total };
    keep('wahaj-db-orders', all);
    if (o.coupon) { const cs = dbLocal('coupons'); if (cs[o.coupon]) { cs[o.coupon].uses = (cs[o.coupon].uses || 0) + 1; cs[o.coupon].totalOff = (cs[o.coupon].totalOff || 0) + t.off; keep('wahaj-db-coupons', cs); } }
    if (o.gift) { const gs = dbLocal('giftcards'); const g = gs[o.gift]; if (g) { g.balance = Math.round((g.balance - t.gift) * 100) / 100; g.used = [...(g.used || []), { order: o.id, amount: t.gift, at: new Date().toISOString() }]; keep('wahaj-db-giftcards', gs); } }
    S.gcard = null; save(); renderSide();
  }

  function addToCart() {
    const s = svc(S.open), r = price(s, S.draft);
    if (!r.sub) { $('#pn-err').hidden = false; return false; }
    const entry = { sid: S.open, v: { ...S.draft } };
    if (S.editing > -1) S.cart[S.editing] = entry;
    else { const i = S.cart.findIndex(c => c.sid === S.open); if (i > -1) S.cart[i] = entry; else S.cart.push(entry); }
    save(); closePanel(); return true;
  }

  // ---------- events ----------
  root.addEventListener('click', e => {
    const t = e.target.closest('button,[data-goto]'); if (!t || t.disabled) return;
    if (t.dataset.open) return openService(t.dataset.open);
    if (t.hasAttribute('data-back')) return closePanel();
    if (t.dataset.preset) { S.draft = { ...svc(S.open).presets[+t.dataset.preset].v }; $('#pn-err').hidden = true; renderPanel(); root.querySelectorAll('.preset')[+t.dataset.preset]?.classList.add('is-on'); return; }
    if (t.dataset.stepId) {
      const it = svc(S.open).items.find(x => x.id === t.dataset.stepId);
      S.draft[it.id] = Math.max(0, (+S.draft[it.id] || 0) + +t.dataset.d);
      if (it.type === 'area') root.querySelector(`[data-area="${it.id}"]`).value = S.draft[it.id] || '';
      $('#pn-err').hidden = true; return updatePanel();
    }
    if (t.dataset.pkg) { const k = t.dataset.pkg, i = +t.dataset.i; S.draft[k] = S.draft[k] === i ? -1 : i; $('#pn-err').hidden = true; return updatePanel(); }
    if (t.dataset.q) { const k = t.dataset.q, i = +t.dataset.i, qa = { ...(S.draft._q || {}) }; if (qa[k] === i) delete qa[k]; else qa[k] = i; S.draft._q = qa; return updatePanel(); }
    if (t.hasAttribute('data-insp')) return window.open(`https://wa.me/${P.whatsapp}?text=${encodeURIComponent(inspectMessage(svc(S.open)))}`, '_blank', 'noopener');
    if (t.hasAttribute('data-geo')) {
      const st = $('#c-geo-st');
      if (!navigator.geolocation) { st.textContent = 'جهازك ما يدعم تحديد الموقع. اكتب الحي والعنوان المختصر.'; return; }
      st.textContent = 'جارٍ تحديد موقعك…';
      navigator.geolocation.getCurrentPosition(
        p => { S.geo = { lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) }; st.textContent = 'تم تحديد موقعك، ويوصلنا رابطه مع الطلب.'; t.classList.add('is-on'); },
        () => { st.textContent = 'ما قدرنا نحدد موقعك. تأكد إنك سمحت للمتصفح، أو اكتب الحي والعنوان المختصر.'; },
        { enableHighAccuracy: true, timeout: 12000 });
      return;
    }
    if (t.hasAttribute('data-add')) {
      // stay on the services list so the visitor can combine another service into the same order
      if (addToCart()) { renderSide(); const m = $('#c-mix'); m.scrollIntoView({ block: 'start', behavior: 'smooth' }); m.querySelector('.mix')?.classList.add('is-new'); }
      return;
    }
    if (t.dataset.goto) return go(+t.dataset.goto);
    if (t.dataset.edit) return openService(S.cart[+t.dataset.edit].sid, +t.dataset.edit);
    if (t.dataset.del) { S.cart.splice(+t.dataset.del, 1); save(); if (S.step === 1) renderCats(); return renderAll(); }
    if (t.dataset.cpTry) return applyCode(t.dataset.cpTry);
    if (t.hasAttribute('data-cp-del')) { S.coupon = null; S.cpDef = null; S.cpErr = ''; save(); return renderAll(); }
    if (t.hasAttribute('data-gc-open')) { S.gcOpen = true; renderAll(); return root.querySelector('[data-gc-form] input')?.focus(); }
    if (t.hasAttribute('data-gc-del')) { S.gcard = null; S.gcErr = ''; save(); return renderAll(); }
    if (t.dataset.day) { S.date = t.dataset.day; S.dateLabel = t.dataset.label; return renderDate(); }
    if (t.dataset.period) { S.period = t.dataset.period; return renderDate(); }
    if (t.hasAttribute('data-gift-off')) return setGift(false);
    if (t.hasAttribute('data-gift-later')) { S.gift.later = !S.gift.later; giftUI(); if (S.gift.later) go(4); return; }
    if (t.dataset.gocc) { S.gift.occ = S.gift.occ === t.dataset.gocc ? null : t.dataset.gocc; const o = occ(), m = $('#g-msg'); if (o && (!m.value.trim() || G.occasions.some(x => x.ready.includes(m.value.trim())))) m.value = o.ready[0]; return giftUI(); }
    if (t.dataset.gready) { $('#g-msg').value = occ().ready[+t.dataset.gready]; return; }
    if (t.dataset.gwhen) { if (t.dataset.gwhen === 'later') { S.gift.later = true; giftUI(); return renderDetails(); } S.gift.later = false; if (!(S.date && S.period)) return go(3); giftUI(); return renderDetails(); }
    if (t.hasAttribute('data-gcopy')) { const u = $('#g-done').dataset.url; (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => { t.textContent = 'تم النسخ ✓'; }, () => { prompt('انسخ الرابط:', u); }); return; }
    if (t.hasAttribute('data-next')) return next();
    if (t.dataset.prog) { const n = +t.dataset.prog; if (n < S.step || canGo(n)) go(n); }
  });
  root.addEventListener('submit', e => {
    const f = e.target.closest('[data-cp-form]'), g = e.target.closest('[data-gc-form]');
    if (f) { e.preventDefault(); applyCode(f.elements.code.value); }
    if (g) { e.preventDefault(); applyGift(g.elements.code.value); }
  });
  // with a gift on, the address fields hold the recipient's address, so only the visitor's name is remembered
  const rememberMe = () => { const me = load('wahaj-calc-me') || {}; keep('wahaj-calc-me', S.gift.on ? { ...me, name: $('#c-name').value.trim() } : { name: $('#c-name').value.trim(), city: city(), district: $('#c-district').value.trim(), short: normShort($('#c-short').value), notes: $('#c-notes').value.trim() }); };
  root.addEventListener('input', e => {
    const a = e.target.dataset.area;
    if (a) { S.draft[a] = Math.max(0, Math.floor(+e.target.value || 0)); $('#pn-err').hidden = true; updatePanel(); }
    const id = e.target.id;
    if (id === 'c-name') $('#err-name').hidden = true;
    if (id === 'c-district') $('#err-district').hidden = true;
    if (id === 'c-city-other') $('#err-city').hidden = true;
    if (id === 'c-short') $('#err-short').hidden = true;
    if (id === 'g-to') { $('#err-gto').hidden = true; if (S.step === 4) $('#c-review .rv-gift b') && ($('#c-review .rv-gift b').textContent = e.target.value.trim() || '…'); }
    if (id === 'g-phone') $('#err-gphone').hidden = true;
    if (['c-name', 'c-notes', 'c-district', 'c-short', 'c-city-other'].includes(id)) rememberMe();
  });
  root.addEventListener('change', e => {
    if (e.target.id === 'g-on') return setGift(e.target.checked);
    if (e.target.id === 'g-hide') S.gift.hide = e.target.checked;
    if (e.target.id === 'g-phone') { const p = normPhone(e.target.value); if (p) e.target.value = p; $('#err-gphone').hidden = !e.target.value || okPhone(e.target.value); }
    if (e.target.id === 'c-city') { $('#c-city-other').hidden = e.target.value !== 'أخرى'; if (e.target.value === 'أخرى') $('#c-city-other').focus(); rememberMe(); }
    if (e.target.id === 'c-short') { e.target.value = normShort(e.target.value); $('#err-short').hidden = okShort(e.target.value); rememberMe(); }
  });

  // deep links: ?s=ac opens a service, ?coupon=CODE applies a coupon
  const q = new URLSearchParams(location.search);
  if (q.get('gc')) applyGift(q.get('gc'));
  if (q.get('coupon')) applyCode(q.get('coupon'));
  else if (S.coupon) lookupCoupon(S.coupon).then(r => { if (r.err) { S.coupon = null; S.cpDef = null; } else S.cpDef = r.def; save(); renderAll(); }); // the code may have ended since the last visit
  if (S.gcard) lookupGift(S.gcard.code).then(r => { S.gcard = r.err ? null : r.g; save(); renderAll(); });
  // ?gift=1 (from /gift/) starts a gift order, ?occ=bride preselects the occasion
  if (q.get('gift')) { S.gift.on = true; const oc = G.occasions.find(o => o.id === q.get('occ')); if (oc) { S.gift.occ = oc.id; $('#g-msg').value = oc.ready[0]; } }
  giftUI();
  renderCats();
  go(1, true);
  save(); // refresh the saved summary (prices may have changed since the last visit)
  if (q.get('s') && svc(q.get('s'))) openService(q.get('s'));
  else if (q.get('go') === 'cart' && S.cart.length) go(2);
})();
