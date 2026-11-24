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

  const saved = load('wahaj-calc') || {};
  const S = { step: 1, open: null, draft: {}, editing: -1, cart: (saved.cart || []).filter(c => svc(c.sid)), date: null, period: null, coupon: saved.coupon || null, cpErr: '' };
  const save = () => keep('wahaj-calc', { cart: S.cart, coupon: S.coupon });

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
    const sub = lines.reduce((a, l) => a + l.amount, 0);
    const total = sub > 0 ? Math.max(sub, s.min) : 0;
    return { lines, sub, total, minApplied: sub > 0 && sub < s.min };
  }
  const cartSub = () => S.cart.reduce((a, c) => a + price(svc(c.sid), c.v).total, 0);
  const inst = n => Math.ceil(n / 4);

  // ---------- coupons ----------
  const normCode = v => String(v || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\s+/g, '').toUpperCase();
  function coupon() {
    if (!S.coupon) return null;
    const c = (P.coupons || []).find(x => x.code === S.coupon);
    if (!c) return null;
    const base = S.cart.filter(x => !c.services || c.services.includes(x.sid)).reduce((a, x) => a + price(svc(x.sid), x.v).total, 0);
    const sub = cartSub();
    if (c.services && !base) return { ok: false, c, msg: `الكوبون خاص بـ${c.services.map(id => svc(id)?.name).join(' أو ')}. أضفها لطلبك ويتطبّق الخصم.` };
    if (sub < (c.min || 0)) return { ok: false, c, msg: `الكوبون يشتغل على الطلبات من ${fmt(c.min)} ريال. باقي لك ${fmt(c.min - sub)} ريال.` };
    let off = c.type === 'percent' ? base * c.value / 100 : c.value;
    if (c.max) off = Math.min(off, c.max);
    return { ok: true, c, off: Math.min(Math.round(off), base) };
  }
  function totals() { const sub = cartSub(), cp = coupon(), off = cp?.ok ? cp.off : 0; return { sub, off, total: sub - off, cp }; }

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
  function renderCoupons() { ['side', 'cart'].forEach(w => { const el = $(`#cp-${w}-box`); if (el) el.innerHTML = couponBox(w); }); }
  function applyCode(raw) {
    const code = normCode(raw);
    S.cpErr = '';
    if (!code) { S.cpErr = 'اكتب كود الخصم.'; }
    else if (!(P.coupons || []).some(c => c.code === code)) { S.coupon = null; S.cpErr = `الكود «${code}» غير صحيح أو انتهى.`; }
    else S.coupon = code;
    save(); renderAll();
  }

  // ---------- step 1: categories + service panel ----------
  function renderCats() {
    $('#c-cats').innerHTML = P.services.map(s => `
      <button class="cat" type="button" data-open="${s.id}">
        <span class="cat__ic"><svg><use href="#${s.icon}"/></svg></span>
        <span class="cat__name">${esc(s.name)}</span>
        <span class="cat__desc">${esc(s.desc)}</span>
        <span class="cat__from">من <b>${fmt(s.min)}</b> ريال</span>
        ${S.cart.some(c => c.sid === s.id) ? '<span class="cat__in">في سلتك</span>' : ''}
      </button>`).join('');
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

  function renderPanel() {
    const s = svc(S.open);
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
    const s = svc(S.open), r = price(s, S.draft);
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
    $('#c-cats').hidden = true; $('#c-panel').hidden = false;
    if (S.step !== 1) go(1, true);
    renderPanel();
    $('#c-panel').scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  function closePanel() { S.open = null; S.editing = -1; $('#c-panel').hidden = true; $('#c-cats').hidden = false; renderCats(); }

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
        <div class="ci-act"><button type="button" class="link" data-edit="${i}">تعديل</button><button type="button" class="link link--danger" data-del="${i}">حذف</button></div></article>`;
    }).join('')
      + (pairs.length ? `<div class="xs"><p>خدمات تكمّل طلبك</p><div>${pairs.map(id => { const s = svc(id); return `<button type="button" class="xs__b" data-open="${id}"><span class="cat__ic"><svg><use href="#${s.icon}"/></svg></span><span><b>${esc(s.name)}</b><small>من ${fmt(s.min)} ريال</small></span><i aria-hidden="true">+</i></button>`; }).join('')}</div></div>` : '')
      + box
      + `<div class="cart-sum">${t.off ? `<div><span>المجموع</span><span>${fmt(t.sub)} ريال</span></div><div class="cart-sum__off"><span>خصم الكوبون</span><span>− ${fmt(t.off)} ريال</span></div>` : ''}<div class="cart-sum__total"><span>الإجمالي التقريبي</span><b>${fmt(t.total)} ريال</b></div><small>أو 4 دفعات × ${fmt(inst(t.total))} ريال مع تابي وتمارا</small></div>`;
    renderCoupons();
  }

  // ---------- step 3: date ----------
  const riyadhHour = () => +new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Riyadh' }).format(new Date());
  function renderDate() {
    const days = [], now = new Date(), h = riyadhHour();
    const start = h >= 19 ? 1 : 0; // too late to book today
    for (let d = start; d < start + 10; d++) {
      const t = new Date(now.getTime() + d * 864e5);
      const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(t);
      const wd = d === 0 ? 'اليوم' : d === 1 ? 'بكرة' : new Intl.DateTimeFormat('ar-SA-u-nu-latn', { weekday: 'long', timeZone: 'Asia/Riyadh' }).format(t);
      const dm = new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', { day: 'numeric', month: 'short', timeZone: 'Asia/Riyadh' }).format(t);
      days.push({ key, wd, dm, today: d === 0 });
    }
    if (S.date && !days.some(d => d.key === S.date)) S.date = null;
    $('#c-days').innerHTML = days.map(d => `<button type="button" class="day" role="radio" aria-checked="${S.date === d.key}" data-day="${d.key}" data-today="${d.today}" data-label="${esc(d.wd + ' ' + d.dm)}"><b>${esc(d.wd)}</b><span>${esc(d.dm)}</span></button>`).join('');
    const amGone = S.date && days.find(d => d.key === S.date)?.today && h >= 11;
    if (amGone && S.period === 'am') S.period = null;
    root.querySelectorAll('[data-period]').forEach(b => {
      const off = amGone && b.dataset.period === 'am';
      b.disabled = !!off; b.classList.toggle('is-off', !!off);
      b.setAttribute('aria-checked', String(S.period === b.dataset.period));
    });
    $('#c-amnote').hidden = !amGone;
  }

  // ---------- step 4: details ----------
  function renderDetails() {
    const sel = $('#c-district');
    if (sel.options.length < 2) sel.innerHTML = '<option value="">اختر الحي</option>' + P.districts.map(d => `<option>${esc(d)}</option>`).join('');
    const me = load('wahaj-calc-me') || {};
    if (!$('#c-name').value && me.name) $('#c-name').value = me.name;
    if (!sel.value && me.district) sel.value = me.district;
    if (!$('#c-notes').value && me.notes) $('#c-notes').value = me.notes;
    const t = totals();
    $('#c-review').innerHTML = `<div><span>الخدمات</span><b>${S.cart.map(c => esc(svc(c.sid).name)).join('، ')}</b></div>
      <div><span>الموعد</span><b>${esc(S.dateLabel || '')} · ${S.period === 'am' ? 'صباحي' : 'مسائي'}</b></div>
      ${t.off ? `<div><span>خصم الكوبون <b dir="ltr">${esc(t.cp.c.code)}</b></span><b class="off">− ${fmt(t.off)} ريال</b></div>` : ''}
      <div><span>الإجمالي التقريبي</span><b>${fmt(t.total)} ريال</b></div>`;
  }
  function message() {
    const t = totals();
    const L = ['السلام عليكم، أبغى أحجز من حاسبة أسعار وهج:'];
    S.cart.forEach(c => { const s = svc(c.sid), r = price(s, c.v); L.push(`• ${s.name}: ${r.lines.map(l => `${l.label} ${l.detail}`).join('، ')} = ${fmt(r.total)} ريال`); });
    if (t.off) { L.push(`المجموع: ${fmt(t.sub)} ريال`); L.push(`كوبون الخصم: ${t.cp.c.code} (− ${fmt(t.off)} ريال)`); }
    L.push(`الإجمالي التقريبي: ${fmt(t.total)} ريال`);
    L.push(`الموعد: ${S.dateLabel} - ${S.period === 'am' ? 'صباحي' : 'مسائي'}`);
    L.push(`الاسم: ${$('#c-name').value.trim()}`);
    L.push(`الحي: ${$('#c-district').value}`);
    const n = $('#c-notes').value.trim(); if (n) L.push(`ملاحظات: ${n}`);
    L.push('(السعر تقريبي ويتأكد قبل البدء)');
    return L.join('\n');
  }

  // ---------- navigation + summary ----------
  const labels = { 1: 'الخدمات', 2: 'السلة', 3: 'الموعد', 4: 'بياناتك' };
  function canGo(n) { if (n > 2 && !S.cart.length) return false; if (n >= 4 && !(S.date && S.period)) return false; return true; }
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
      + (t.off ? `<li class="side-off"><span>خصم <b dir="ltr">${esc(t.cp.c.code)}</b></span><b>− ${fmt(t.off)}</b></li>` : '') : '<li class="muted">ما اخترت خدمات للحين</li>';
    root.querySelectorAll('[data-total]').forEach(e => { e.textContent = `${fmt(t.total)} ريال`; });
    $('#side-inst').textContent = t.total ? `أو 4 دفعات × ${fmt(inst(t.total))} ريال` : '';
    root.querySelectorAll('[data-next]').forEach(b => { b.innerHTML = S.step === 4 ? `<svg class="ico"><use href="#i-wa"/></svg>${nextLabel()}` : nextLabel(); b.classList.toggle('btn--wa', S.step === 4); b.classList.toggle('btn--primary', S.step !== 4); });
    root.querySelector('.c-bar').hidden = false;
    renderCoupons();
  }
  function renderAll() { if (S.step === 2) renderCart(); if (S.step === 4) renderDetails(); renderSide(); }
  function next() {
    const err = $('#side-err'); err.hidden = true;
    const say = t => { err.textContent = t; err.hidden = false; root.querySelectorAll('[data-bar-err]').forEach(e => { e.textContent = t; e.hidden = false; }); };
    root.querySelectorAll('[data-bar-err]').forEach(e => { e.hidden = true; });
    if (S.step === 1) { if (S.open && price(svc(S.open), S.draft).sub > 0) addToCart(); if (!S.cart.length) return say('اختر خدمة وأضفها للطلب أول.'); return go(2); }
    if (S.step === 2) { if (!S.cart.length) return say('سلتك فاضية، اختر خدمة أول.'); return go(3); }
    if (S.step === 3) { if (!S.date) return say('اختر اليوم المناسب.'); if (!S.period) return say('اختر الفترة: صباحي أو مسائي.'); return go(4); }
    if (S.step === 4) {
      const name = $('#c-name'), dis = $('#c-district');
      $('#err-name').hidden = !!name.value.trim(); $('#err-district').hidden = !!dis.value;
      if (!name.value.trim()) { name.focus(); return say('اكتب اسمك.'); }
      if (!dis.value) { dis.focus(); return say('اختر الحي.'); }
      window.open(`https://wa.me/${P.whatsapp}?text=${encodeURIComponent(message())}`, '_blank', 'noopener');
      $('#c-sent').hidden = false;
    }
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
    if (t.hasAttribute('data-add')) { if (addToCart()) go(2); return; }
    if (t.dataset.goto) return go(+t.dataset.goto);
    if (t.dataset.edit) return openService(S.cart[+t.dataset.edit].sid, +t.dataset.edit);
    if (t.dataset.del) { S.cart.splice(+t.dataset.del, 1); save(); return renderAll(); }
    if (t.dataset.cpTry) return applyCode(t.dataset.cpTry);
    if (t.hasAttribute('data-cp-del')) { S.coupon = null; S.cpErr = ''; save(); return renderAll(); }
    if (t.dataset.day) { S.date = t.dataset.day; S.dateLabel = t.dataset.label; return renderDate(); }
    if (t.dataset.period) { S.period = t.dataset.period; return renderDate(); }
    if (t.hasAttribute('data-next')) return next();
    if (t.dataset.prog) { const n = +t.dataset.prog; if (n < S.step || canGo(n)) go(n); }
  });
  root.addEventListener('submit', e => { const f = e.target.closest('[data-cp-form]'); if (!f) return; e.preventDefault(); applyCode(f.elements.code.value); });
  const rememberMe = () => keep('wahaj-calc-me', { name: $('#c-name').value.trim(), district: $('#c-district').value, notes: $('#c-notes').value.trim() });
  root.addEventListener('input', e => {
    const a = e.target.dataset.area;
    if (a) { S.draft[a] = Math.max(0, Math.floor(+e.target.value || 0)); $('#pn-err').hidden = true; updatePanel(); }
    if (e.target.id === 'c-name') $('#err-name').hidden = true;
    if (['c-name', 'c-notes'].includes(e.target.id)) rememberMe();
  });
  root.addEventListener('change', e => { if (e.target.id === 'c-district') { $('#err-district').hidden = true; rememberMe(); } });

  // deep links: ?s=ac opens a service, ?coupon=CODE applies a coupon
  const q = new URLSearchParams(location.search);
  if (q.get('coupon')) { const c = normCode(q.get('coupon')); if ((P.coupons || []).some(x => x.code === c)) { S.coupon = c; save(); } }
  renderCats();
  go(1, true);
  if (q.get('s') && svc(q.get('s'))) openService(q.get('s'));
})();
