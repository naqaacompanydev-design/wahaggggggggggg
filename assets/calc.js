// Wahaj price calculator: services -> cart -> date -> details -> WhatsApp. Prices from /data/pricing.json.
(async () => {
  const root = document.querySelector('.calc-page');
  if (!root) return;
  const $ = s => root.querySelector(s);
  const fmt = n => new Intl.NumberFormat('en-US').format(Math.round(n));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  let P;
  try { P = await (await fetch('/data/pricing.json', { cache: 'no-store' })).json(); }
  catch { $('#c-cats').innerHTML = '<p class="c-err">تعذّر تحميل الأسعار. حدّث الصفحة أو راسلنا على واتساب.</p>'; return; }
  const svc = id => P.services.find(s => s.id === id);

  const S = { step: 1, open: null, draft: {}, editing: -1, cart: [], date: null, period: null };
  try { const saved = JSON.parse(localStorage.getItem('wahaj-calc') || 'null'); if (saved?.cart) S.cart = saved.cart; } catch {}
  const save = () => { try { localStorage.setItem('wahaj-calc', JSON.stringify({ cart: S.cart })); } catch {} };

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
  const cartTotal = () => S.cart.reduce((a, c) => a + price(svc(c.sid), c.v).total, 0);

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

  function renderPanel() {
    const s = svc(S.open);
    const unit = it => it.type === 'qty' || it.type === 'bundle' ? `${fmt(it.price)} ريال ${it.unit}${it.type === 'bundle' ? ` · ${it.unit.includes('كل') ? '' : ''}` : ''}` : it.type === 'area' ? `${fmt(it.rate)} ${it.unit}` : it.unit || '';
    $('#c-panel').innerHTML = `
      <div class="pn-head">
        <button type="button" class="pn-back" data-back aria-label="رجوع للخدمات"><svg class="ico"><use href="#i-arrow"/></svg></button>
        <span class="cat__ic"><svg><use href="#${s.icon}"/></svg></span>
        <div><h2 id="pn-h">${esc(s.name)}</h2><p>اختر اللي تبيه، والسعر يتحسب قدامك.</p></div>
      </div>
      <ul class="pn-items">${s.items.map(it => `
        <li class="pn-item pn-item--${it.type}">
          <div class="pn-txt"><b>${esc(it.label)}</b><small>${esc(it.type === 'bundle' ? `${fmt(it.price)} ريال للمكيف · ${it.unit}` : it.type === 'pkg' ? (it.note || 'اختر خيار واحد') : unit(it))}</small></div>
          ${control(it, S.draft[it.id])}
        </li>`).join('')}</ul>
      <div class="pn-foot">
        <div class="pn-sum"><span>سعر الخدمة</span><b id="pn-total">0 ريال</b><small id="pn-min"></small></div>
        <p class="c-err" id="pn-err" hidden>اختر خدمة واحدة على الأقل.</p>
        <button type="button" class="btn btn--primary" data-add>${S.editing > -1 ? 'حدّث الطلب' : 'أضف للطلب'}</button>
      </div>`;
    updatePanel();
  }
  function updatePanel() {
    const s = svc(S.open), r = price(s, S.draft);
    $('#pn-total').textContent = `${fmt(r.total)} ريال`;
    // live total in the summary/bottom bar: cart without this service + what is being picked now
    const rest = S.cart.reduce((a, c, i) => (c.sid === S.open || i === S.editing) ? a : a + price(svc(c.sid), c.v).total, 0);
    root.querySelectorAll('[data-total]').forEach(e => { e.textContent = `${fmt(rest + r.total)} ريال`; });
    $('#pn-min').textContent = r.minApplied ? `الحد الأدنى لهذه الخدمة ${fmt(s.min)} ريال` : '';
    root.querySelectorAll('[data-pkg]').forEach(b => b.setAttribute('aria-checked', String(S.draft[b.dataset.pkg] === +b.dataset.i)));
    root.querySelectorAll('.pn-item').forEach((li, i) => {
      const it = s.items[i], x = S.draft[it.id];
      const out = li.querySelector('output'); if (out) out.textContent = x || 0;
      li.classList.toggle('is-on', it.type === 'pkg' ? x > -1 && x != null : !!x);
    });
  }
  function openService(id, editIndex = -1) {
    S.open = id; S.editing = editIndex;
    S.draft = editIndex > -1 ? { ...S.cart[editIndex].v } : {};
    $('#c-cats').hidden = true; $('#c-panel').hidden = false;
    renderPanel(); go(1, true);
    $('#c-panel').scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  function closePanel() { S.open = null; S.editing = -1; $('#c-panel').hidden = true; $('#c-cats').hidden = false; renderCats(); }

  // ---------- step 2: cart ----------
  function renderCart() {
    if (!S.cart.length) {
      $('#c-cart').innerHTML = `<div class="empty"><svg class="ico"><use href="#i-calc"/></svg><b>سلتك فاضية</b><p>اختر خدمة وحدد التفاصيل عشان يطلع لك السعر.</p><button type="button" class="btn btn--primary" data-goto="1">اختر خدمة</button></div>`;
      return;
    }
    $('#c-cart').innerHTML = S.cart.map((c, i) => {
      const s = svc(c.sid), r = price(s, c.v);
      return `<article class="cart-item"><div class="ci-head"><span class="cat__ic"><svg><use href="#${s.icon}"/></svg></span><h3>${esc(s.name)}</h3><b>${fmt(r.total)} ريال</b></div>
        <ul>${r.lines.map(l => `<li><span>${esc(l.label)} <small>${esc(l.detail)}</small></span><span>${fmt(l.amount)}</span></li>`).join('')}${r.minApplied ? `<li class="ci-min"><span>تطبيق الحد الأدنى للخدمة</span><span>${fmt(s.min)}</span></li>` : ''}</ul>
        <div class="ci-act"><button type="button" class="link" data-edit="${i}">تعديل</button><button type="button" class="link link--danger" data-del="${i}">حذف</button></div></article>`;
    }).join('') + `<button type="button" class="add-more" data-goto="1"><span>+</span>أضف خدمة ثانية</button>`;
  }

  // ---------- step 3: date ----------
  function renderDate() {
    const days = [];
    const now = new Date();
    for (let d = 0; d < 10; d++) {
      const t = new Date(now.getTime() + d * 864e5);
      const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(t);
      const wd = d === 0 ? 'اليوم' : d === 1 ? 'بكرة' : new Intl.DateTimeFormat('ar-SA-u-nu-latn', { weekday: 'long', timeZone: 'Asia/Riyadh' }).format(t);
      const dm = new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', { day: 'numeric', month: 'short', timeZone: 'Asia/Riyadh' }).format(t);
      days.push({ key, wd, dm });
    }
    $('#c-days').innerHTML = days.map(d => `<button type="button" class="day" role="radio" aria-checked="${S.date === d.key}" data-day="${d.key}" data-label="${esc(d.wd + ' ' + d.dm)}"><b>${esc(d.wd)}</b><span>${esc(d.dm)}</span></button>`).join('');
    root.querySelectorAll('[data-period]').forEach(b => b.setAttribute('aria-checked', String(S.period === b.dataset.period)));
  }

  // ---------- step 4: details ----------
  function renderDetails() {
    const sel = $('#c-district');
    if (!sel.options.length || sel.options.length < 2) sel.innerHTML = '<option value="">اختر الحي</option>' + P.districts.map(d => `<option>${esc(d)}</option>`).join('');
    $('#c-review').innerHTML = `<div><span>الخدمات</span><b>${S.cart.map(c => esc(svc(c.sid).name)).join('، ')}</b></div>
      <div><span>الموعد</span><b>${esc(S.dateLabel || '')} · ${S.period === 'am' ? 'صباحي' : 'مسائي'}</b></div>
      <div><span>الإجمالي التقريبي</span><b>${fmt(cartTotal())} ريال</b></div>`;
  }
  function message() {
    const L = ['السلام عليكم، أبغى أحجز من حاسبة أسعار وهج:'];
    S.cart.forEach(c => { const s = svc(c.sid), r = price(s, c.v); L.push(`• ${s.name}: ${r.lines.map(l => `${l.label} ${l.detail}`).join('، ')} = ${fmt(r.total)} ريال`); });
    L.push(`الإجمالي التقريبي: ${fmt(cartTotal())} ريال`);
    L.push(`الموعد: ${S.dateLabel} - ${S.period === 'am' ? 'صباحي' : 'مسائي'}`);
    L.push(`الاسم: ${$('#c-name').value.trim()}`);
    L.push(`الحي: ${$('#c-district').value}`);
    const n = $('#c-notes').value.trim(); if (n) L.push(`ملاحظات: ${n}`);
    L.push('(السعر تقريبي ويتأكد قبل البدء)');
    return L.join('\n');
  }

  // ---------- navigation + summary ----------
  const labels = { 1: 'الخدمات', 2: 'السلة', 3: 'الموعد', 4: 'بياناتك' };
  function canGo(n) { if (n >= 2 && !S.cart.length && n > 2) return false; if (n >= 4 && !(S.date && S.period)) return false; return true; }
  function go(n, keep) {
    if (!canGo(n)) return;
    S.step = n;
    root.querySelectorAll('.c-step').forEach(el => { el.hidden = +el.dataset.step !== n; });
    root.querySelectorAll('.prog li').forEach((li, i) => { li.classList.toggle('is-on', i + 1 === n); li.classList.toggle('is-done', i + 1 < n); });
    root.querySelector('.prog').style.setProperty('--p', String((n - 1) / 3));
    $('#c-steplabel').textContent = `الخطوة ${n} من 4 · ${labels[n]}`;
    if (n === 1 && !keep) closePanel();
    if (n === 2) renderCart();
    if (n === 3) renderDate();
    if (n === 4) renderDetails();
    renderSide();
    if (!keep) root.querySelector('.c-top').scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  function nextLabel() { return S.step === 1 ? 'كمّل الحجز' : S.step === 2 ? 'التالي: الموعد' : S.step === 3 ? 'التالي: بياناتك' : 'أرسل الطلب على واتساب'; }
  function renderSide() {
    const total = cartTotal(), count = S.cart.length;
    $('#c-count').textContent = count;
    $('#side-lines').innerHTML = count ? S.cart.map(c => { const s = svc(c.sid); return `<li><span>${esc(s.name)}</span><b>${fmt(price(s, c.v).total)}</b></li>`; }).join('') : '<li class="muted">ما اخترت خدمات للحين</li>';
    root.querySelectorAll('[data-total]').forEach(e => { e.textContent = `${fmt(total)} ريال`; });
    root.querySelectorAll('[data-next]').forEach(b => { b.innerHTML = S.step === 4 ? `<svg class="ico"><use href="#i-wa"/></svg>${nextLabel()}` : nextLabel(); b.classList.toggle('btn--wa', S.step === 4); b.classList.toggle('btn--primary', S.step !== 4); });
    root.querySelector('.c-bar').hidden = false;
  }
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
    const t = e.target.closest('button,[data-goto]'); if (!t) return;
    if (t.dataset.open) return openService(t.dataset.open);
    if (t.hasAttribute('data-back')) return closePanel();
    if (t.dataset.stepId) {
      const it = svc(S.open).items.find(x => x.id === t.dataset.stepId);
      S.draft[it.id] = Math.max(0, (+S.draft[it.id] || 0) + +t.dataset.d);
      if (it.type === 'area') root.querySelector(`[data-area="${it.id}"]`).value = S.draft[it.id] || '';
      $('#pn-err').hidden = true; return updatePanel();
    }
    if (t.dataset.pkg) { const k = t.dataset.pkg, i = +t.dataset.i; S.draft[k] = S.draft[k] === i ? -1 : i; $('#pn-err').hidden = true; return updatePanel(); }
    if (t.hasAttribute('data-add')) { if (addToCart()) go(2); return; }
    if (t.dataset.goto) return go(+t.dataset.goto);
    if (t.dataset.edit) { const c = S.cart[+t.dataset.edit]; go(1, true); return openService(c.sid, +t.dataset.edit); }
    if (t.dataset.del) { S.cart.splice(+t.dataset.del, 1); save(); renderCart(); return renderSide(); }
    if (t.dataset.day) { S.date = t.dataset.day; S.dateLabel = t.dataset.label; return renderDate(); }
    if (t.dataset.period) { S.period = t.dataset.period; return renderDate(); }
    if (t.hasAttribute('data-next')) return next();
    if (t.dataset.prog) { const n = +t.dataset.prog; if (n < S.step || canGo(n)) go(n); }
  });
  root.addEventListener('input', e => {
    const a = e.target.dataset.area;
    if (a) { S.draft[a] = Math.max(0, Math.floor(+e.target.value || 0)); $('#pn-err').hidden = true; updatePanel(); }
    if (e.target.id === 'c-name') $('#err-name').hidden = true;
    if (e.target.id === 'c-district') $('#err-district').hidden = true;
  });
  root.addEventListener('change', e => { if (e.target.id === 'c-district') $('#err-district').hidden = true; });

  // deep link: /price-calculator/?s=ac opens that service
  renderCats();
  go(1, true);
  const pre = new URLSearchParams(location.search).get('s');
  if (pre && svc(pre)) openService(pre);
})();
